// ============================================================
// REGISTER PAYMENT MODAL (global)
// ============================================================

function openRegModal(presetId){
  const sel=document.getElementById('rm-tenant');
  // 14/09/2026: sincronizado com index.html — ex-inquilino com saldo
  // devedor (ou o presetId do botão do card) agora entra na lista.
  const comSaldo = t => t.vago && R2(t.history.reduce((s,h)=>s+Math.max(0, R(h.valorCobrado)-R(h.valorPago)), 0))>0.01;
  const opts = tenants.filter(t=>!t.vago || t.id===presetId || comSaldo(t));
  sel.innerHTML=opts.map(t=>`<option value="${t.id}">${t.unit} — ${t.name.split(' ')[0]}${t.vago?' (encerrado)':''}</option>`).join('');
  if(presetId){
    sel.value=presetId;
    regFromDetId=presetId;
  }
  document.getElementById('rm-date').value=TODAY.toISOString().split('T')[0];
  onRegTenantChange();
  openOverlay('reg-modal-overlay');
}

function openRegFromDet(id){
  openRegModal(id);
}

function onRegTenantChange(){
  const tid=parseInt(document.getElementById('rm-tenant').value);
  const t=tenants.find(x=>x.id===tid);
  if(!t) return;
  const fin=getTenantFinancials(t);

  // 14/09/2026: sincronizado com index.html — ex-inquilino (vago) usa o
  // mês mais antigo com saldo em aberto, não "próximo mês" (não se aplica).
  let ref, entry;
  if(t.vago){
    const sorted=[...t.history].sort((a,b)=>a.ref.localeCompare(b.ref));
    const aberto=sorted.find(h=>R2(R(h.valorCobrado)-R(h.valorPago))>0.01);
    entry=aberto || sorted[sorted.length-1] || buildMonthEntry(t, TODAY.toISOString().slice(0,7));
    ref=entry.ref;
  } else {
    const last=t.history[t.history.length-1];
    ref=last?last.ref:'';
    if(last && last.status==='pago'){
      // suggest next month
      ref=nextMonth(last.ref);
    }
    entry=t.history.find(h=>h.ref===ref)||buildMonthEntry(t,ref);
  }
  document.getElementById('rm-ref').value=ref;

  // Pre-fill amounts from entry
  document.getElementById('rm-value').value='';
  document.getElementById('rm-condo').value=entry.condo||'';
  document.getElementById('rm-iptu').value=entry.iptu||'';
  document.getElementById('rm-lixo').value=entry.lixo||'';
  document.getElementById('rm-multa').value=(R(entry.multa)+R(entry.pendingMulta))||'';
  document.getElementById('rm-juros').value=(R(entry.juros)+R(entry.pendingJuros))||'';

  // 14/09/2026: pré-seleciona a forma de pagamento mais recente do inquilino
  const formaSel=document.getElementById('rm-forma');
  if(formaSel){
    const ultimaForma=[...t.history].reverse().find(h=>h.forma)?.forma;
    formaSel.value=ultimaForma||'PIX';
  }

  // Show saldo box
  const box=document.getElementById('rm-saldo-box');
  if(t.vago){
    const saldoTotal=R2(t.history.reduce((s,h)=>s+Math.max(0, R(h.valorCobrado)-R(h.valorPago)), 0));
    if(saldoTotal>0.01){
      box.innerHTML=`<div style="font-size:11px;font-weight:600;color:var(--amber);margin-bottom:6px;">⚠ Ex-inquilino — saldo devedor acumulado</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
          <div><div style="color:var(--text-faint);font-size:10px;">MÊS SELECIONADO (${monthName(ref)})</div><div style="font-weight:600;">${fmtBRL(R2(R(entry.valorCobrado)-R(entry.valorPago)))}</div></div>
          <div><div style="color:var(--text-faint);font-size:10px;">TOTAL DEVIDO (TODOS OS MESES)</div><div style="font-weight:600;color:var(--red);">${fmtBRL(saldoTotal)}</div></div>
        </div>`;
    } else {
      box.innerHTML=`<div style="font-size:12px;color:var(--green);">✓ Sem saldo devedor registrado (ex-inquilino)</div>`;
    }
  } else if(fin.totalDue && (fin.status==='inadimplente'||fin.status==='parcial')){
    box.innerHTML=`<div style="font-size:11px;font-weight:600;color:var(--amber);margin-bottom:6px;">Débito em aberto — ${monthName(ref)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px;">
        <div><div style="color:var(--text-faint);font-size:10px;">BASE</div><div style="font-weight:600;">${fmtBRL(fin.base)}</div></div>
        <div><div style="color:var(--text-faint);font-size:10px;">MULTA+JUROS</div><div style="font-weight:600;color:var(--red);">${fmtBRL(R(fin.multaHoje)+R(fin.jurosHoje))}</div></div>
        <div><div style="color:var(--text-faint);font-size:10px;">TOTAL HOJE</div><div style="font-weight:600;color:var(--red);">${fmtBRL(fin.totalDue)}</div></div>
      </div>`;
  } else {
    box.innerHTML=`<div style="font-size:12px;color:var(--green);">✓ Sem débitos anteriores — ${monthName(ref)} · Total: ${fmtBRL(R(entry.aluguel)+R(entry.condo)+R(entry.iptu)+R(entry.lixo))}</div>`;
  }

  // 14/09/2026: sincronizado com index.html.
  const avanc=document.getElementById('rm-avancado');
  if(avanc){ avanc.style.display='none'; }
  const avancToggle=document.getElementById('rm-avancado-toggle');
  if(avancToggle){ avancToggle.textContent='⚙ Ajustar valores do mês (avançado)'; }
  const extrasNovasEl=document.getElementById('rm-extras-novas');
  if(extrasNovasEl){ extrasNovasEl.innerHTML=''; }
  renderRegExtrasExistentes(entry);
  onRegValueChange();
}

function renderRegExtrasExistentes(entry){
  const el=document.getElementById('rm-extras-existentes');
  if(!el) return;
  const extras=entry.extras||[];
  el.innerHTML = extras.length
    ? extras.map(ex=>`• ${ex.descricao||'(sem descrição)'} — ${fmtBRL(ex.valor)}`).join('<br>')
    : '<span style="color:var(--text-faint);">Nenhuma cobrança extra lançada neste mês ainda.</span>';
}

function addRegExtra(){
  let i=0;
  while(document.getElementById(`rm-extra-row-${i}`)) i++;
  const container=document.getElementById('rm-extras-novas');
  if(!container) return;
  const row=document.createElement('div');
  row.id=`rm-extra-row-${i}`;
  row.style.cssText='display:grid;grid-template-columns:1fr 90px 22px;gap:4px;margin-bottom:4px;align-items:center;';
  row.innerHTML=`
    <input class="cobr-inp" style="text-align:left;" type="text" placeholder="Descrição (ex: Conserto do portão)" id="rm-extra-desc-${i}" oninput="onRegValueChange()">
    <input class="cobr-inp" type="number" placeholder="0,00" id="rm-extra-val-${i}" step="0.01" oninput="onRegValueChange()">
    <button style="border:none;background:var(--red-bg);color:var(--red);border-radius:var(--radius-sm);cursor:pointer;font-size:13px;" onclick="this.parentElement.remove();onRegValueChange();">×</button>`;
  container.appendChild(row);
  row.querySelector('input[type=text]').focus();
}

function _regExtrasNovasTotal(){
  let i=0, total=0;
  while(document.getElementById(`rm-extra-row-${i}`)){
    total += R(document.getElementById(`rm-extra-val-${i}`)?.value);
    i++;
  }
  return R2(total);
}

function toggleRegAvancado(){
  const el=document.getElementById('rm-avancado');
  const toggle=document.getElementById('rm-avancado-toggle');
  if(!el) return;
  const abrindo = el.style.display==='none';
  el.style.display = abrindo ? 'block' : 'none';
  if(toggle) toggle.textContent = abrindo ? '⚙ Ocultar valores avançados' : '⚙ Ajustar valores do mês (avançado)';
}

function onRegValueChange(){
  const tid=parseInt(document.getElementById('rm-tenant')?.value);
  const t=tenants.find(x=>x.id===tid);
  const ref=document.getElementById('rm-ref')?.value;
  const preview=document.getElementById('rm-preview-box');
  if(!t || !ref || !preview) return;
  const entry=t.history.find(h=>h.ref===ref);
  if(!entry){ preview.innerHTML=''; return; }

  const condo = document.getElementById('rm-condo')?.value;
  const iptu  = document.getElementById('rm-iptu')?.value;
  const lixo  = document.getElementById('rm-lixo')?.value;
  const multaOv = document.getElementById('rm-multa')?.value;
  const jurosOv = document.getElementById('rm-juros')?.value;
  const dataPag = document.getElementById('rm-date')?.value;

  const baseAluguel = R(entry.aluguel)
    + (condo!==''&&condo!=null ? R(condo) : R(entry.condo))
    + (iptu!==''&&iptu!=null ? R(iptu) : R(entry.iptu))
    + (lixo!==''&&lixo!=null ? R(lixo) : R(entry.lixo));

  // 14/09/2026: sincronizado com index.html — simula o mesmo cálculo de
  // multa/juros que applyPayment() faria (sem gravar nada), pra prévia
  // bater exato quando o pagamento é tardio e ainda não houve avaliação.
  let multa = (multaOv!==''&&multaOv!=null) ? R(multaOv) : R(entry.multa);
  let juros = (jurosOv!==''&&jurosOv!=null) ? R(jurosOv) : R(entry.juros);
  if((multaOv===''||multaOv==null) && (jurosOv===''||jurosOv==null) && R(entry.multa)===0 && dataPag && entry.venc && dataPag>entry.venc){
    const daysLate = daysDiff(entry.venc, dataPag);
    const sim = calcPenalties(baseAluguel, daysLate, false, jurosRateDiario(t));
    multa = sim.multa; juros = sim.juros;
  }
  const extrasExistentes = (entry.extras||[]).reduce((s,ex)=>s+R(ex.valor),0);
  const extrasNovas = _regExtrasNovasTotal();
  const totalCobrado = R2(baseAluguel + multa + juros + R(entry.pendingMulta) + R(entry.pendingJuros) + extrasExistentes + extrasNovas);

  const valorDigitado = R(document.getElementById('rm-value')?.value);
  const pagoDepois = R2(R(entry.valorPago) + valorDigitado);
  const saldoDepois = R2(totalCobrado - pagoDepois);
  const statusDepois = pagoDepois >= totalCobrado-0.01 ? 'Pago' : (pagoDepois>0 ? 'Parcial' : 'Pendente');
  const corStatus = statusDepois==='Pago' ? 'var(--green)' : (statusDepois==='Parcial' ? 'var(--amber)' : 'var(--red)');

  const extrasLinha = (extrasExistentes+extrasNovas)>0.009
    ? `<div style="color:var(--text-faint);font-size:11px;margin-bottom:4px;">inclui ${fmtBRL(extrasExistentes+extrasNovas)} de outras cobranças</div>` : '';

  preview.innerHTML = `
    <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Depois deste pagamento</div>
    ${extrasLinha}
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <div><div style="font-size:10px;color:var(--text-faint);">TOTAL DO MÊS</div><div style="font-weight:600;">${fmtBRL(totalCobrado)}</div></div>
      <div><div style="font-size:10px;color:var(--text-faint);">FICA PAGO</div><div style="font-weight:600;">${fmtBRL(pagoDepois)}</div></div>
      <div><div style="font-size:10px;color:var(--text-faint);">SALDO</div><div style="font-weight:600;color:${saldoDepois>0.009?'var(--red)':'var(--green)'};">${fmtBRL(saldoDepois)}</div></div>
      <div><div style="font-size:10px;color:var(--text-faint);">STATUS</div><div style="font-weight:600;color:${corStatus};">${statusDepois}</div></div>
    </div>`;
}

function saveRegModal(){
  const tid=parseInt(document.getElementById('rm-tenant').value);
  const ref=document.getElementById('rm-ref').value;
  const date=document.getElementById('rm-date').value;
  const value=document.getElementById('rm-value').value;
  if(!ref||!date||!value){alert('Preencha Referência, Data e Valor Pago.');return;}
  const t=tenants.find(x=>x.id===tid);
  // Garante que a entry do mês já exista e esteja no histórico ANTES de
  // lançar as cobranças extras abaixo (sincronizado com index.html).
  let entry = t?.history.find(h=>h.ref===ref);
  if(t && !entry){
    entry = buildMonthEntry(t, ref);
    t.history.push(entry);
    t.history.sort((a,b)=>a.ref.localeCompare(b.ref));
  }
  const oldStatus = entry ? entry.status : null;
  const oldValorPago = entry ? entry.valorPago : 0;

  // 14/09/2026: sincronizado com index.html — cobrança extra lançada
  // direto neste modal, aplicada antes de applyPayment().
  if(entry){
    let i=0;
    while(document.getElementById(`rm-extra-row-${i}`)){
      const desc=document.getElementById(`rm-extra-desc-${i}`)?.value?.trim();
      const val=R(document.getElementById(`rm-extra-val-${i}`)?.value);
      if(desc && val>0){
        if(!entry.extras) entry.extras=[];
        entry.extras.push({descricao:desc, valor:val});
        logAudit(`Cobrança extra ADICIONADA — ${t.unit} (${t.name}) — ${ref} — "${desc}" ${fmtBRL(val)} (lançada direto no Registrar Pagamento)`, {tipo:'extra_adicionada', tenantId:tid, ref});
      }
      i++;
    }
  }

  applyPayment(tid,ref,date,value,
    document.getElementById('rm-condo').value,
    document.getElementById('rm-iptu').value,
    document.getElementById('rm-lixo').value,
    document.getElementById('rm-multa').value,
    document.getElementById('rm-juros').value,
    document.getElementById('rm-obs').value,
    document.getElementById('rm-forma').value);

  // Registrar mudança de pagamento
  if(t && entry && oldStatus){
    const updatedEntry = t.history.find(h=>h.ref===ref);
    if(updatedEntry){
      SYNC_ENGINE.onChange(`tenants.${tid}.history.${ref}.status`, oldStatus, updatedEntry.status);
      SYNC_ENGINE.onChange(`tenants.${tid}.history.${ref}.valorPago`, oldValorPago, updatedEntry.valorPago);
    }
  }

  closeOverlay('reg-modal-overlay');
  saveToStorage();
  alert(`✓ Pagamento de ${t?.unit} registrado!\nStatus: ${statusOf(t)}`);
  if(regFromDetId){openDet(regFromDetId);regFromDetId=null;}
}

// ============================================================
// REGISTER PAYMENT (core logic)
// ============================================================

function applyPayment(tenantId, ref, dataPagamento, valorPago, condoOverride, iptuOverride, lixoOverride, multaOverride, jurosOverride, obs, forma){
  const t = tenants.find(x=>x.id===tenantId);
  if(!t) return;

  let entry = t.history.find(h=>h.ref===ref);
  if(!entry){
    entry = buildMonthEntry(t, ref);
    t.history.push(entry);
    t.history.sort((a,b)=>a.ref.localeCompare(b.ref));
  }

  // 14/09/2026: sincronizado com index.html — guarda a forma de pagamento
  // usada, pra pré-selecionar da próxima vez pra esse inquilino.
  if(forma) entry.forma = forma;

  // Override amounts if provided
  if(condoOverride!==null && condoOverride!=='') entry.condo = R(condoOverride);
  if(iptuOverride!==null && iptuOverride!=='')   entry.iptu  = R(iptuOverride);
  if(lixoOverride!==null && lixoOverride!=='')   entry.lixo  = R(lixoOverride);
  if(multaOverride!==null && multaOverride!=='') entry.multa = R(multaOverride);
  if(jurosOverride!==null && jurosOverride!=='') entry.juros = R(jurosOverride);

  // 14/09/2026: sincronizado com index.html — inclui extras no total,
  // que antes sumiam do valorCobrado ao registrar um pagamento.
  // 14/09/2026 (2ª parte): sincronizado com index.html — multa/juros só
  // incidem sobre baseAluguel (sem extras), nunca sobre reparo/acordo.
  const extrasTotal = (entry.extras||[]).reduce((s,ex)=>s+R(ex.valor),0);
  const baseAluguel = R(entry.aluguel)+R(entry.condo)+R(entry.iptu)+R(entry.lixo);
  const totalDue = R2(baseAluguel + extrasTotal + R(entry.multa) + R(entry.juros) + R(entry.pendingMulta) + R(entry.pendingJuros));

  const _auditValorPagoAntes = entry.valorPago;
  const _auditStatusAntes = entry.status;

  entry.valorCobrado = totalDue;
  entry.valorPago   += R(valorPago);
  entry.dataPagamento = dataPagamento;
  if(obs) entry.obs = obs;

  // Histórico de pagamentos do mês (13/09/2026): registra cada pagamento
  // individualmente (data+valor), preservando valorPago/dataPagamento (soma
  // e data mais recente) já usados em todo o resto do app pra não quebrar
  // nada. Só passa a existir de fato quando há mais de um pagamento no mês
  // (ex: pagamento parcial completado depois em outra data).
  if(!entry.pagamentos) entry.pagamentos = [];
  entry.pagamentos.push({data: dataPagamento, valor: R(valorPago)});

  // Determine status
  const vencDate = entry.venc;
  const late = dataPagamento > vencDate;
  const daysLate = late ? daysDiff(vencDate, dataPagamento) : 0;

  if(entry.valorPago >= totalDue - 0.01){
    entry.status = 'pago';
    // If paid late, compute actual penalties and note them
    if(late && entry.multa===0){
      const {multa, juros} = calcPenalties(baseAluguel, daysLate, false, jurosRateDiario(t));
      entry.multa = multa; entry.juros = juros;
      entry.valorCobrado = R2(baseAluguel+extrasTotal+multa+juros+R(entry.pendingMulta)+R(entry.pendingJuros));
    }
    // 14/09/2026: sincronizado com index.html — excedente vira crédito
    // automático no próximo mês em aberto (inquilino ativo).
    const excedente = R2(entry.valorPago - entry.valorCobrado);
    if(excedente > 0.01){
      entry.valorPago = entry.valorCobrado;
      if(t.vago){
        entry.obs = (entry.obs ? entry.obs+' | ' : '') + `Pago R$ ${excedente.toFixed(2)} a mais (ex-inquilino, sem mês futuro pra creditar)`;
      } else {
        _creditarProximoMes(t, ref, excedente);
      }
    }
  } else if(entry.valorPago > 0){
    entry.status = 'parcial';
    // Roll penalties to next month
    _rollPenalties(t, ref, baseAluguel, daysLate);
  } else {
    entry.status = dataPagamento > vencDate ? 'inadimplente' : 'pendente';
    _rollPenalties(t, ref, baseAluguel, daysLate);
  }

  // 14/09/2026: sincronizado com index.html.
  logAudit(
    `Pagamento registrado — ${t.unit} (${t.name}) — ${ref} — R$ ${R(valorPago).toFixed(2)} (valor pago no mês: R$ ${_auditValorPagoAntes.toFixed(2)} → R$ ${entry.valorPago.toFixed(2)}, status: ${_auditStatusAntes} → ${entry.status})`,
    { tipo:'pagamento', tenantId, ref }
  );

  renderDashboard();
}

// 14/09/2026: sincronizado com index.html.
function _creditarProximoMes(t, ref, valor){
  const nxtRef = nextMonth(ref);
  let nxt = t.history.find(h=>h.ref===nxtRef);
  if(!nxt){
    nxt = buildMonthEntry(t, nxtRef);
    t.history.push(nxt);
    t.history.sort((a,b)=>a.ref.localeCompare(b.ref));
    logAudit(`Mês criado automaticamente pelo sistema — ${t.unit} (${t.name}) — ${nxtRef} — pra receber crédito de R$ ${R2(valor).toFixed(2)} que sobrou de ${ref}`, { tipo:'mes_automatico', tenantId: t.id, ref: nxtRef });
  }
  if(!nxt.pagamentos) nxt.pagamentos = [];
  nxt.pagamentos.push({data: TODAY.toISOString().split('T')[0], valor: R2(valor), credito: true});
  nxt.valorPago = R2(R(nxt.valorPago) + valor);
  const nxtExtrasTotal = (nxt.extras||[]).reduce((s,ex)=>s+R(ex.valor),0);
  nxt.valorCobrado = R2(R(nxt.aluguel)+R(nxt.condo)+R(nxt.iptu)+R(nxt.lixo)+R(nxt.multa)+R(nxt.juros)+R(nxt.pendingMulta)+R(nxt.pendingJuros)+nxtExtrasTotal);
  if(nxt.valorPago >= nxt.valorCobrado - 0.01){
    nxt.status = 'pago';
    if(!nxt.dataPagamento) nxt.dataPagamento = TODAY.toISOString().split('T')[0];
    const sobra = R2(nxt.valorPago - nxt.valorCobrado);
    if(sobra > 0.01){
      nxt.valorPago = nxt.valorCobrado;
      _creditarProximoMes(t, nxtRef, sobra);
    }
  } else if(nxt.valorPago > 0){
    nxt.status = 'parcial';
  }
}

function _rollPenalties(t, ref, base, daysLate){
  const entry = t.history.find(h=>h.ref===ref);
  if(!entry) return;
  const {multa, juros} = calcPenalties(base, daysLate, R(entry.multa)>0, jurosRateDiario(t));
  entry.multa = R(entry.multa)||multa;
  entry.juros = juros;

  // 14/09/2026: sincronizado com index.html — pra ex-inquilino (vago),
  // não cria cobrança nova de mês seguinte, só mantém multa/juros no
  // próprio mês.
  if(t.vago){
    const extrasTotal=(entry.extras||[]).reduce((s,ex)=>s+R(ex.valor),0);
    entry.valorCobrado=R2(base+R(entry.multa)+R(entry.juros)+R(entry.pendingMulta)+R(entry.pendingJuros)+extrasTotal);
    return;
  }

  // Find or create next month entry and carry over
  const nxtRef = nextMonth(ref);
  let nxt = t.history.find(h=>h.ref===nxtRef);
  if(!nxt){
    nxt = buildMonthEntry(t, nxtRef);
    t.history.push(nxt);
    t.history.sort((a,b)=>a.ref.localeCompare(b.ref));
    logAudit(`Mês criado automaticamente pelo sistema — ${t.unit} (${t.name}) — ${nxtRef} — multa/juros de ${ref} rolada pra cá`, { tipo:'mes_automatico', tenantId: t.id, ref: nxtRef });
  }
  nxt.pendingMulta = R2(R(entry.pendingMulta) + R(entry.multa));
  nxt.pendingJuros = R2(R(entry.pendingJuros) + juros);
  const nxtExtrasTotal = (nxt.extras||[]).reduce((s,ex)=>s+R(ex.valor),0);
  nxt.valorCobrado = R2(R(nxt.aluguel)+R(nxt.condo)+R(nxt.iptu)+R(nxt.lixo)+R(nxt.multa)+R(nxt.juros)+R(nxt.pendingMulta)+R(nxt.pendingJuros)+nxtExtrasTotal);
}

// ============================================================
// EDIT / UNDO PAYMENT
// ============================================================

function _resetPaymentEntry(t, ref){
  const entry = t.history.find(h=>h.ref===ref);
  if(!entry) return;
  const propagatedMulta = R(entry.multa);
  const propagatedJuros = R(entry.juros);

  entry.valorPago = 0;
  entry.dataPagamento = null;
  entry.multa = 0;
  entry.juros = 0;
  entry.obs = '';
  // 14/09/2026: sincronizado com index.html — reset completo zera o log
  // de pagamentos também, senão cada edição acumula entrada fantasma.
  entry.pagamentos = [];
  const todayRef = TODAY.toISOString().slice(0,7);
  entry.status = ref <= todayRef ? 'pendente' : 'futuro';

  // Desfaz carry-over de multa/juros no mês seguinte
  const nxtRef = nextMonth(ref);
  const nxt = t.history.find(h=>h.ref===nxtRef);
  if(nxt && (propagatedMulta>0 || propagatedJuros>0)){
    nxt.pendingMulta = R2(Math.max(0, R(nxt.pendingMulta) - propagatedMulta));
    nxt.pendingJuros = R2(Math.max(0, R(nxt.pendingJuros) - propagatedJuros));
    nxt.valorCobrado = R2(R(nxt.aluguel)+R(nxt.condo)+R(nxt.iptu)+R(nxt.lixo)+R(nxt.multa)+R(nxt.juros)+R(nxt.pendingMulta)+R(nxt.pendingJuros));
  }
}

function openEditPayModal(tenantId, ref){
  const t = tenants.find(x=>x.id===tenantId);
  if(!t) return;
  const entry = t.history.find(h=>h.ref===ref);
  if(!entry) return;

  editPayTenantId = tenantId;
  editPayRef = ref;

  document.getElementById('ep-ref').value = ref;
  document.getElementById('ep-date').value = entry.dataPagamento || TODAY.toISOString().split('T')[0];
  document.getElementById('ep-value').value = entry.valorPago || '';
  document.getElementById('ep-condo').value = entry.condo || '';
  document.getElementById('ep-iptu').value = entry.iptu || '';
  document.getElementById('ep-lixo').value = entry.lixo || '';
  document.getElementById('ep-multa').value = (R(entry.multa)+R(entry.pendingMulta)) || '';
  document.getElementById('ep-juros').value = (R(entry.juros)+R(entry.pendingJuros)) || '';
  document.getElementById('ep-obs').value = entry.obs || '';
  document.getElementById('ep-info-box').innerHTML =
    `<strong>${t.unit} — ${t.name}</strong> &nbsp;·&nbsp; ${monthName(ref)} &nbsp;·&nbsp; Cobrado: ${fmtBRL(entry.valorCobrado)} &nbsp;·&nbsp; Pago: ${fmtBRL(entry.valorPago)}`;

  openOverlay('edit-pay-overlay');
}

function closeEditPayModal(){
  closeOverlay('edit-pay-overlay');
  editPayTenantId = null;
  editPayRef = null;
}

function saveEditPayModal(){
  const tid = editPayTenantId;
  const ref = editPayRef;
  if(!tid || !ref) return;
  const t = tenants.find(x=>x.id===tid);
  if(!t) return;

  const date = document.getElementById('ep-date').value;
  const value = document.getElementById('ep-value').value;
  if(!date || !value){ alert('Preencha Data e Valor Pago.'); return; }

  const entry = t.history.find(h=>h.ref===ref);
  const oldStatus = entry ? entry.status : null;
  const oldValorPago = entry ? entry.valorPago : 0;

  _resetPaymentEntry(t, ref);
  applyPayment(tid, ref, date, value,
    document.getElementById('ep-condo').value,
    document.getElementById('ep-iptu').value,
    document.getElementById('ep-lixo').value,
    document.getElementById('ep-multa').value,
    document.getElementById('ep-juros').value,
    document.getElementById('ep-obs').value);

  // Registrar mudança de pagamento
  const updatedEntry = t.history.find(h=>h.ref===ref);
  if(updatedEntry && oldStatus){
    SYNC_ENGINE.onChange(`tenants.${tid}.history.${ref}.status`, oldStatus, updatedEntry.status);
    SYNC_ENGINE.onChange(`tenants.${tid}.history.${ref}.valorPago`, oldValorPago, updatedEntry.valorPago);
  }

  // 14/09/2026: sincronizado com index.html.
  if(updatedEntry){
    logAudit(`Pagamento EDITADO — ${t.unit} (${t.name}) — ${ref} — valor pago: R$ ${R(oldValorPago).toFixed(2)} → R$ ${R(updatedEntry.valorPago).toFixed(2)}, status: ${oldStatus} → ${updatedEntry.status}`, { tipo:'pagamento_editado', tenantId: tid, ref });
  }

  saveToStorage();
  closeEditPayModal();
  renderDashboard();
  renderDet();
}

function desfazerPagamento(tenantId, ref){
  const t = tenants.find(x=>x.id===tenantId);
  if(!t) return;
  const entry = t.history.find(h=>h.ref===ref);
  if(!entry || !entry.dataPagamento) return;
  if(!confirm(`Desfazer pagamento de ${monthName(ref)} — ${t.unit}?\n\nIsso zerará o valor pago e retornará o mês para "Pendente".`)) return;

  const _auditValorPagoAntes = entry.valorPago;
  const _auditStatusAntes = entry.status;
  _resetPaymentEntry(t, ref);
  logAudit(`Pagamento DESFEITO — ${t.unit} (${t.name}) — ${ref} — valor pago: R$ ${R(_auditValorPagoAntes).toFixed(2)} → R$ 0,00, status: ${_auditStatusAntes} → ${entry.status}`, { tipo:'pagamento_desfeito', tenantId, ref });
  saveToStorage();
  renderDashboard();
  renderDet();
}
