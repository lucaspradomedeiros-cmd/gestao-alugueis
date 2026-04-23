// ============================================================
// HYDRATE DATA
// ============================================================
// Hydrate entries that have condo=0 but condoHistory has data for the previous month
// Also ensure all entries have extras:[]
function hydrateEntries(){
  tenants.forEach(t=>{
    if(t.vago) return;
    const im = t.imovelId ? getImovel(t.imovelId) : null;

    // ── Autonomous imovel: refresh all futuro entries from despesas ──
    if(im && im.gestao==='autonomo'){
      t.history.forEach(h=>{
        if(!h.extras) h.extras=[];
        if(h.status!=='futuro') return;
        const despInq = getDespesasAtivas(im.id, h.ref).filter(d=>d.resp==='inquilino');
        const iptuVal  = despInq.filter(d=>d.cat==='iptu').reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);
        const lixoVal  = despInq.filter(d=>d.cat==='lixo').reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);
        h.iptu   = iptuVal;
        h.lixo   = lixoVal;
        h.condo  = 0;
        h.extras = despInq.filter(d=>d.cat!=='iptu'&&d.cat!=='lixo').map(d=>({
          descricao: d.desc,
          valor: R(d.recorr==='parcelado'?d.valorParcela:d.valor)
        }));
        h.valorCobrado = R2(R(h.aluguel)+h.iptu+h.lixo+R(h.multa)+R(h.juros)+R(h.pendingMulta)+R(h.pendingJuros)+totalExtras(h));
      });
      return; // skip condo hydration for this tenant
    }

    // ── Condo imovel: update futuro entries from condo history ──
    const tCondoHistory = getTenantCondoHistory(t);
    const tCondoUnits   = getTenantCondoUnits(t);
    t.history.forEach(h=>{
      if(!h.extras) h.extras=[];
      if(h.status==='futuro' && tCondoUnits.includes(t.unit)){
        const tCondoId = t.condoId || activeCondoId;
        // Sempre recalcula vencimento conforme config do condo (para todas as entradas futuras)
        const vencYM = getCondoVencYM(tCondoId, h.ref);
        h.venc = `${vencYM}-${String(t.vencDia).padStart(2,'0')}`;
        // Só atualiza condo/iptu/lixo se ainda não foram calculados
        if(h.condo===0){
          const[ry,rm]=h.ref.split('-');
          let pm=parseInt(rm)-1, py=parseInt(ry);
          if(pm<1){pm=12;py--;}
          const condoRef=`${py}-${String(pm).padStart(2,'0')}`;
          const ce=tCondoHistory.find(c=>c.ref===condoRef);
          if(ce){
            const tx=getCondoTaxas(tCondoId);
            const sub=R(ce.agua)+R(ce.energia)+R(ce.limpeza)+R(ce.outras);
            const taxaRat=applyTaxa(R(ce.agua),tx.agua)+applyTaxa(R(ce.energia),tx.energia)+applyTaxa(R(ce.limpeza),tx.limpeza)+applyTaxa(R(ce.outras),tx.outras);
            h.condo = R2((sub+taxaRat)/tCondoUnits.length);
            h.iptu  = R2(R(ce.iptu)+applyTaxa(R(ce.iptu),tx.iptu));
            h.lixo  = R2(R(ce.lixo)+applyTaxa(R(ce.lixo),tx.lixo));
            h.valorCobrado = R2(R(h.aluguel)+h.condo+h.iptu+h.lixo+R(h.multa)+R(h.juros)+R(h.pendingMulta)+R(h.pendingJuros)+totalExtras(h));
          }
        }
      }
    });
  });
}

// ============================================================
// FINANCIAL ENGINE
// ============================================================
// Given principal (base debt = aluguel+condo+iptu+lixo) and days overdue,
// compute multa (10% flat, only once) and juros (1%/month, prorated daily)
function calcPenalties(principal, daysLate, multaAlreadyApplied){
  const multa = !multaAlreadyApplied && daysLate > 0 ? R2(principal * MULTA_RATE) : 0;
  const juros = daysLate > 0 ? R2(principal * JUROS_RATE * daysLate) : 0;
  return {multa, juros};
}

// ============================================================
// TENANT FINANCIAL QUERIES
// ============================================================

function getTenantFinancials(t){
  if(t.vago) return {status:'vago'};
  const last = t.history && t.history.length > 0 ? t.history[t.history.length - 1] : null;
  if(!last) return {status:'futuro'};

  // Already paid / futuro
  if(last.status==='pago') return {status:'pago', entry:last};
  if(last.status==='futuro') return {status:'futuro', entry:last};

  // Pendente / inadimplente / parcial
  const vencDate = last.venc;
  const todayStr = TODAY.toISOString().split('T')[0];
  const late = todayStr > vencDate;
  if(!late && last.status==='futuro') return {status:'futuro', entry:last};

  const base = R(last.aluguel)+R(last.condo)+R(last.iptu)+R(last.lixo);
  const remainingDebt = base - R(last.valorPago);
  const daysLate = late ? daysDiff(vencDate, todayStr) : 0;

  // accumulated pending from previous
  const totalPending = R(last.pendingMulta)+R(last.pendingJuros);

  // current penalties on remaining debt
  const multaApplied = R(last.multa) > 0;
  const {multa:multaHoje, juros:jurosHoje} = calcPenalties(base, daysLate, multaApplied);

  const totalDue = remainingDebt + totalPending + (multaApplied ? R(last.multa):multaHoje) + jurosHoje;

  return {
    status: last.status==='parcial' ? 'parcial' : (late ? 'inadimplente' : 'pendente'),
    entry: last,
    base, remainingDebt, daysLate, totalPending,
    multaHoje: multaApplied ? R(last.multa) : multaHoje,
    jurosHoje,
    totalDue: R2(totalDue),
    totalPending
  };
}

// Retorna o ano-mês a usar no vencimento conforme config do condomínio
// Se vencMesSeguinte=true: venc cai no mês após o ref (ex: ref=2026-04 → venc=2026-05)
// Se vencMesSeguinte=false: venc cai no próprio mês do ref (comportamento antigo)
function getCondoVencYM(condoId, ref){
  const c = condominios.find(x=>x.id===condoId);
  const usaProx = c ? c.vencMesSeguinte !== false : true; // padrão: mês seguinte
  if(usaProx) return nextMonth(ref);
  return ref;
}

function getTenantCondoHistory(t){
  if(t.imovelId){ const im=getImovel(t.imovelId); if(im&&im.gestao==='autonomo') return []; }
  const cid = t.condoId || activeCondoId;
  return condoHistories[cid] || (cid===activeCondoId ? condoHistory : []);
}

function getTenantCondoUnits(t){
  if(t.imovelId){ const im=getImovel(t.imovelId); if(im&&im.gestao==='autonomo') return []; }
  const cid = t.condoId || activeCondoId;
  const c = condominios.find(x=>x.id===cid);
  return c ? c.units : CONDO_UNITS;
}

// Build a new monthly entry pre-filled from condo data
// ref = mês do ALUGUEL (vigente, ex: 2026-03)
// condomínio cobrado = mês ANTERIOR ao aluguel (ex: 2026-02)
function buildMonthEntry(t, ref){
  const[ry,rm]=ref.split('-');
  const vencDia=String(t.vencDia).padStart(2,'0');
  const tCondoId = t.condoId || activeCondoId;
  const vencYM = getCondoVencYM(tCondoId, ref);
  const venc=`${vencYM}-${vencDia}`;

  // ── Autonomous imovel: get despesas do inquilino ──
  const im = t.imovelId ? getImovel(t.imovelId) : null;
  if(im && im.gestao==='autonomo'){
    // Imóveis autônomos não seguem config de vencimento do condo: venc = mesmo mês do ref
    const vencAuto = `${ry}-${rm}-${vencDia}`;
    const despInq = getDespesasAtivas(im.id, ref).filter(d=>d.resp==='inquilino');
    const iptuVal = despInq.filter(d=>d.cat==='iptu').reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);
    const lixoVal = despInq.filter(d=>d.cat==='lixo').reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);
    const outrasVal= despInq.filter(d=>d.cat!=='iptu'&&d.cat!=='lixo').reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);
    const total = R2(R(t.rent)+iptuVal+lixoVal+outrasVal);
    const extras = despInq.filter(d=>d.cat!=='iptu'&&d.cat!=='lixo').map(d=>({
      descricao: d.desc, valor: R(d.recorr==='parcelado'?d.valorParcela:d.valor)
    }));
    return {ref, venc:vencAuto, aluguel:R(t.rent), condo:0, iptu:iptuVal, lixo:lixoVal,
      multa:0, juros:0, pendingMulta:0, pendingJuros:0,
      extras, valorCobrado:total, valorPago:0, dataPagamento:null, status:'futuro'};
  }

  // ── Condo imovel: compute rateio ──
  let pm=parseInt(rm)-1, py=parseInt(ry);
  if(pm<1){pm=12;py--;}
  const condoRef=`${py}-${String(pm).padStart(2,'0')}`;
  const tCondoHistory = getTenantCondoHistory(t);
  const tCondoUnits   = getTenantCondoUnits(t);
  const condoEntry = tCondoHistory.find(c=>c.ref===condoRef);
  let condoVal=0, iptuVal=0, lixoVal=0;
  if(condoEntry && tCondoUnits.includes(t.unit)){
    const tCondoId = t.condoId || activeCondoId;
    const tx=getCondoTaxas(tCondoId);
    const sub=(R(condoEntry.agua)+R(condoEntry.energia)+R(condoEntry.limpeza)+R(condoEntry.outras));
    const taxaRateavel=applyTaxa(R(condoEntry.agua),tx.agua)+applyTaxa(R(condoEntry.energia),tx.energia)+applyTaxa(R(condoEntry.limpeza),tx.limpeza)+applyTaxa(R(condoEntry.outras),tx.outras);
    condoVal = R2((sub+taxaRateavel)/tCondoUnits.length);
    iptuVal  = R2(R(condoEntry.iptu)+applyTaxa(R(condoEntry.iptu),tx.iptu));
    lixoVal  = R2(R(condoEntry.lixo)+applyTaxa(R(condoEntry.lixo),tx.lixo));
  }
  const total = R2(R(t.rent)+condoVal+iptuVal+lixoVal);
  return {ref, venc, aluguel:R(t.rent), condo:condoVal, iptu:iptuVal, lixo:lixoVal,
    multa:0, juros:0, pendingMulta:0, pendingJuros:0, extras:[],
    valorCobrado:total, valorPago:0, dataPagamento:null, status:'futuro'};
}

// ============================================================
// TENANT CARD STATUS
// ============================================================
function statusOf(t){
  if(t.vago) return 'vago';
  const fin = getTenantFinancials(t);
  return fin.status;
}
