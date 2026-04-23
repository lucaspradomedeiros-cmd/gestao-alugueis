// ============================================================
// DETAIL PANEL — Tenant financial details & history
// ============================================================

function openDet(id, highlightRef){
  detTenantId = id;
  detHighRef  = highlightRef || null;
  detPeriod   = highlightRef ? 'single' : 'todos';
  renderDet();
  openOverlay('det-overlay');
}

function closeDet(){
  closeOverlay('det-overlay');
  detHighRef=null; detPeriod='todos';
}

function setDetPeriod(period){
  detPeriod = period;
  if(period !== 'single') detHighRef = null;
  // tabs
  ['todos','6m','ano','custom'].forEach(p=>{
    const el = document.getElementById('tab-'+p);
    if(el) el.classList.toggle('active', p===period);
  });
  // custom bar visibility
  const bar = document.getElementById('custom-period-bar');
  if(bar){
    bar.style.display = period==='custom' ? 'flex' : 'none';
    if(period==='custom') initCustomPickers();
  }
  renderDet();
}

function initCustomPickers(){
  // Populate year dropdowns from tenant history range
  const t = tenants.find(x=>x.id===detTenantId);
  const years = new Set();
  if(t) t.history.forEach(h=>{ if(h.ref) years.add(h.ref.split('-')[0]); });
  // also add current year
  years.add(String(TODAY.getFullYear()));
  const sortedYears = [...years].sort();
  ['det-from-y','det-to-y'].forEach(id=>{
    const sel = document.getElementById(id);
    if(!sel) return;
    const cur = sel.value;
    sel.innerHTML = sortedYears.map(y=>`<option value="${y}">${y}</option>`).join('');
    if(cur) sel.value = cur;
  });
  // Set sensible defaults: from = earliest, to = current month
  const earliest = t && t.history.length ? t.history[0].ref : '';
  if(earliest){
    const[ey,em]=earliest.split('-');
    const df=document.getElementById('det-from-m'); if(df) df.value=em;
    const dy=document.getElementById('det-from-y'); if(dy) dy.value=ey;
  }
  const cm=String(TODAY.getMonth()+1).padStart(2,'0');
  const cy=String(TODAY.getFullYear());
  const tm=document.getElementById('det-to-m'); if(tm) tm.value=cm;
  const ty=document.getElementById('det-to-y'); if(ty) ty.value=cy;
}

function applyCustomPeriod(){
  detPeriod='custom';
  renderDet();
}

// --- Sub-functions for renderDet() ---

function renderDetHeader(t, st){
  const stLabel = STATUS_LABELS[st]||st;
  document.getElementById('d-unit').textContent = t.unit;
  document.getElementById('d-name').textContent = t.name;
  document.getElementById('d-badges').innerHTML = `
    <span class="s-badge s-${st}">${stLabel}</span>
    <button class="btn-wpp" onclick="openWpp(${t.id})">📲 Enviar cobrança</button>
    <button class="btn btn-primary" style="font-size:11px;padding:5px 12px;" onclick="openRegFromDet(${t.id})">+ Registrar pgto</button>
    <button class="btn" style="font-size:11px;padding:5px 12px;" onclick="openRecibo(${t.id})">🧾 Emitir recibo</button>
    <button class="btn" style="font-size:11px;padding:5px 12px;" onclick="gerarContratoAluguel(${t.id})">📄 Contrato</button>`;
}

function renderDetDebt(t, st, fin){
  let debtBlock = '';
  if(fin.totalDue && (st==='inadimplente'||st==='parcial')){
    debtBlock=`<div class="penalty-box">
      <div style="font-size:11px;font-weight:600;color:var(--red);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">⚠ Débito em aberto</div>
      ${fin.daysLate>0?`<div class="penalty-row"><span>Dias em atraso</span><span>${fin.daysLate} dias</span></div>`:''}
      <div class="penalty-row"><span>Base (aluguel+cond+iptu+lixo)</span><span>${fmtBRL(fin.base)}</span></div>
      <div class="penalty-row"><span>Pago</span><span>- ${fmtBRL(fin.entry?.valorPago)}</span></div>
      <div class="penalty-row"><span>Saldo devedor</span><span>${fmtBRL(fin.remainingDebt)}</span></div>
      ${fin.multaHoje>0?`<div class="penalty-row"><span>Multa 10%</span><span>${fmtBRL(fin.multaHoje)}</span></div>`:''}
      ${fin.jurosHoje>0?`<div class="penalty-row"><span>Juros (${fin.daysLate}d × 0,0333%/d)</span><span>${fmtBRL(fin.jurosHoje)}</span></div>`:''}
      ${fin.totalPending>0?`<div class="penalty-row"><span>Arrastado meses anteriores</span><span>${fmtBRL(fin.totalPending)}</span></div>`:''}
      <div class="penalty-row total"><span>Total a pagar hoje</span><span>${fmtBRL(fin.totalDue)}</span></div>
    </div>`;
  }
  return debtBlock;
}

function buildDetSummary(filtered){
  if(filtered.length===0) return '';

  const totCobrado  = filtered.reduce((s,h)=>s+R(h.valorCobrado),0);
  const totPago     = filtered.reduce((s,h)=>s+R(h.valorPago),0);
  const totSaldo    = totCobrado - totPago;
  const mesesPagos  = filtered.filter(h=>h.status==='pago').length;
  const mesesInad   = filtered.filter(h=>h.status==='inadimplente'||h.status==='parcial').length;

  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px;">
    <div style="background:var(--green-bg);border:1px solid var(--green-light);border-radius:var(--radius-sm);padding:10px 12px;text-align:center;">
      <div style="font-size:10px;font-weight:600;color:var(--green);text-transform:uppercase;letter-spacing:.5px;">Recebido</div>
      <div style="font-size:16px;font-weight:600;color:var(--green);margin-top:2px;">${fmtBRL(totPago)}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:1px;">${mesesPagos} ${mesesPagos===1?'mês':'meses'} pagos</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;text-align:center;">
      <div style="font-size:10px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;">Cobrado</div>
      <div style="font-size:16px;font-weight:600;margin-top:2px;">${fmtBRL(totCobrado)}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:1px;">${filtered.length} ${filtered.length===1?'mês':'meses'}</div>
    </div>
    <div style="background:${totSaldo>0?'var(--red-bg)':'var(--surface)'};border:1px solid ${totSaldo>0?'var(--red-light)':'var(--border)'};border-radius:var(--radius-sm);padding:10px 12px;text-align:center;">
      <div style="font-size:10px;font-weight:600;color:${totSaldo>0?'var(--red)':'var(--text-faint)'};text-transform:uppercase;letter-spacing:.5px;">Saldo devedor</div>
      <div style="font-size:16px;font-weight:600;color:${totSaldo>0?'var(--red)':'var(--text)'};margin-top:2px;">${fmtBRL(totSaldo)}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:1px;">${mesesInad>0?mesesInad+' mês(es) em aberto':'Em dia'}</div>
    </div>
  </div>`;
}

function buildDetHistory(t, filtered, filteredRev){
  const rows = filteredRev.map(h=>{
    const isHighlighted = h.ref === detHighRef;
    const st2     = h.status;
    const pillCls = st2==='pago'?'pago':st2==='parcial'?'parcial':'inadimplente';
    const stTxt   = {pago:'✓ Pago',parcial:'Parcial',inadimplente:'✗ Inadimp.',pendente:'Pendente',futuro:'A vencer'}[st2]||st2;
    const penalties = R(h.multa)+R(h.juros)+R(h.pendingMulta)+R(h.pendingJuros);
    const rowBg = isHighlighted ? 'background:var(--amber-bg);' : '';

    // Expanded single-month view
    if(detPeriod==='single' && isHighlighted){
      return`<tr style="${rowBg}">
        <td colspan="7" style="padding:0;">
          <div style="padding:14px 10px;">
            <div style="font-size:13px;font-weight:600;margin-bottom:10px;color:var(--text);">${monthName(h.ref)} — Extrato detalhado</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
              <div style="padding:8px 10px;background:var(--surface);border-radius:var(--radius-sm);border:1px solid var(--border);">
                <div style="color:var(--text-faint);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Aluguel</div>
                <div style="font-weight:600;">${fmtBRL(h.aluguel)}</div>
                <div style="color:var(--text-muted);font-size:10px;margin-top:1px;">ref. ${monthName(h.ref)}</div>
              </div>
              ${R(h.condo)>0?`<div style="padding:8px 10px;background:var(--surface);border-radius:var(--radius-sm);border:1px solid var(--border);">
                <div style="color:var(--text-faint);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Condomínio</div>
                <div style="font-weight:600;">${fmtBRL(h.condo)}</div>
                <div style="color:var(--text-muted);font-size:10px;margin-top:1px;">mês anterior</div>
              </div>`:''}
              ${R(h.iptu)>0?`<div style="padding:8px 10px;background:var(--surface);border-radius:var(--radius-sm);border:1px solid var(--border);">
                <div style="color:var(--text-faint);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">IPTU</div>
                <div style="font-weight:600;">${fmtBRL(h.iptu)}</div>
              </div>`:''}
              ${R(h.lixo)>0?`<div style="padding:8px 10px;background:var(--surface);border-radius:var(--radius-sm);border:1px solid var(--border);">
                <div style="color:var(--text-faint);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Taxa de Lixo</div>
                <div style="font-weight:600;">${fmtBRL(h.lixo)}</div>
              </div>`:''}
              ${R(h.multa)>0?`<div style="padding:8px 10px;background:var(--red-bg);border-radius:var(--radius-sm);border:1px solid var(--red-light);">
                <div style="color:var(--red);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Multa (10%)</div>
                <div style="font-weight:600;color:var(--red);">${fmtBRL(h.multa)}</div>
              </div>`:''}
              ${R(h.juros)>0?`<div style="padding:8px 10px;background:var(--red-bg);border-radius:var(--radius-sm);border:1px solid var(--red-light);">
                <div style="color:var(--red);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Juros mora</div>
                <div style="font-weight:600;color:var(--red);">${fmtBRL(h.juros)}</div>
              </div>`:''}
              ${R(h.pendingMulta)+R(h.pendingJuros)>0?`<div style="padding:8px 10px;background:var(--amber-bg);border-radius:var(--radius-sm);border:1px solid var(--amber-light);">
                <div style="color:var(--amber);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Arrastado anterior</div>
                <div style="font-weight:600;color:var(--amber);">${fmtBRL(R(h.pendingMulta)+R(h.pendingJuros))}</div>
              </div>`:''}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:10px 12px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);">
              <div>
                <div style="font-size:10px;color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Total cobrado</div>
                <div style="font-size:16px;font-weight:700;">${fmtBRL(h.valorCobrado)}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:10px;color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Pagamento</div>
                <div style="font-size:13px;font-weight:600;color:${st2==='pago'?'var(--green)':st2==='parcial'?'var(--amber)':'var(--red)'};">${h.dataPagamento?fmtDate(h.dataPagamento)+' · '+fmtBRL(h.valorPago):'—'}</div>
                <div style="margin-top:4px;"><span class="pill ${pillCls}">${stTxt}</span></div>
              </div>
            </div>
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-primary" style="font-size:11px;padding:5px 12px;" onclick="openRegFromDet(${t.id})">+ Registrar pagamento</button>
              ${h.dataPagamento?`
              <button class="btn" style="font-size:11px;padding:5px 10px;color:var(--amber);border-color:var(--amber-light);" onclick="openEditPayModal(${t.id},'${h.ref}')">✏️ Editar pagamento</button>
              <button class="btn" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:var(--red-light);" onclick="desfazerPagamento(${t.id},'${h.ref}')">↩ Desfazer pagamento</button>`:''}
              <button class="btn" style="font-size:11px;padding:5px 10px;" onclick="setDetPeriod('todos')">← Voltar ao extrato completo</button>
            </div>
          </div>
        </td>
      </tr>`;
    }

    return`<tr style="${rowBg}cursor:pointer;" onclick="openDet(${t.id},'${h.ref}')">
      <td>
        <div style="font-weight:500;font-size:12px;">${monthName(h.ref)}</div>
        <div style="font-size:10px;color:var(--text-faint);">venc. ${fmtDate(h.venc)}</div>
      </td>
      <td class="r" style="font-size:12px;">${fmtBRL(h.aluguel)}</td>
      <td class="r" style="font-size:12px;">${R(h.condo)+R(h.iptu)+R(h.lixo)>0?fmtBRL(R(h.condo)+R(h.iptu)+R(h.lixo)):'—'}<br><span style="font-size:10px;color:var(--text-faint);">${R(h.condo)>0?'cond ':''}${R(h.iptu)>0?'iptu ':''}${R(h.lixo)>0?'lixo':''}</span></td>
      <td class="r" style="font-size:12px;color:${penalties>0?'var(--red)':'var(--text-faint)'};">${penalties>0?fmtBRL(penalties):'—'}</td>
      <td class="r" style="font-size:12px;font-weight:600;">${fmtBRL(h.valorCobrado)}</td>
      <td class="r" style="font-size:12px;">${h.dataPagamento?`<div>${fmtDate(h.dataPagamento)}</div><div style="font-size:10px;color:var(--text-faint);">${fmtBRL(h.valorPago)}</div>`:'—'}</td>
      <td class="r" style="white-space:nowrap;">
        <span class="pill ${pillCls}">${stTxt}</span>
        ${(st2==='pago'||st2==='parcial')?`<div style="margin-top:4px;display:flex;gap:3px;justify-content:flex-end;">
          <button onclick="event.stopPropagation();openEditPayModal(${t.id},'${h.ref}')" style="font-size:10px;padding:2px 6px;border:1px solid var(--amber-light);border-radius:4px;background:var(--amber-bg);cursor:pointer;color:var(--amber);" title="Editar pagamento">✏️</button>
          <button onclick="event.stopPropagation();desfazerPagamento(${t.id},'${h.ref}')" style="font-size:10px;padding:2px 6px;border:1px solid var(--red-light);border-radius:4px;background:var(--red-bg);cursor:pointer;color:var(--red);" title="Desfazer pagamento">↩</button>
        </div>`:''}
      </td>
    </tr>`;
  }).join('');

  const totAluguel  = filtered.reduce((s,h)=>s+R(h.aluguel),0);
  const totEncargos = filtered.reduce((s,h)=>s+R(h.condo)+R(h.iptu)+R(h.lixo),0);
  const totPenalties= filtered.reduce((s,h)=>s+R(h.multa)+R(h.juros)+R(h.pendingMulta)+R(h.pendingJuros),0);
  const totCobrado  = filtered.reduce((s,h)=>s+R(h.valorCobrado),0);
  const totPago     = filtered.reduce((s,h)=>s+R(h.valorPago),0);
  const totSaldo    = totCobrado - totPago;

  const footerRow = filtered.length>1 ? `<tr style="background:var(--bg);font-weight:600;font-size:12px;">
    <td>Totais (${filtered.length} meses)</td>
    <td class="r">${fmtBRL(totAluguel)}</td>
    <td class="r">${fmtBRL(totEncargos)}</td>
    <td class="r" style="color:${totPenalties>0?'var(--red)':'var(--text-faint)'};">${totPenalties>0?fmtBRL(totPenalties):'—'}</td>
    <td class="r">${fmtBRL(totCobrado)}</td>
    <td class="r" style="color:var(--green);">${fmtBRL(totPago)}</td>
    <td class="r">${totSaldo>0?`<span class="pill inadimplente">${fmtBRL(totSaldo)}</span>`:`<span class="pill pago">Em dia</span>`}</td>
  </tr>` : '';

  return { rows, footerRow };
}

function filterDetHistory(t){
  const todayStr = TODAY.toISOString().split('T')[0].slice(0,7);
  let filtered = [...t.history];

  if(detPeriod === 'single' && detHighRef){
    filtered = filtered.filter(h=>h.ref===detHighRef);
    ['todos','6m','ano','custom'].forEach(p=>{
      const el=document.getElementById('tab-'+p);
      if(el) el.classList.remove('active');
    });
  } else if(detPeriod === '6m'){
    const cutoff = (() => {
      const[y,m]=todayStr.split('-');
      let nm=parseInt(m)-5,ny=parseInt(y);
      if(nm<1){nm+=12;ny--;}
      return`${ny}-${String(nm).padStart(2,'0')}`;
    })();
    filtered = filtered.filter(h=>h.ref>=cutoff);
  } else if(detPeriod === 'ano'){
    const year = TODAY.getFullYear();
    filtered = filtered.filter(h=>h.ref.startsWith(String(year)));
  } else if(detPeriod === 'custom'){
    const fromM = document.getElementById('det-from-m')?.value;
    const fromY = document.getElementById('det-from-y')?.value;
    const toM   = document.getElementById('det-to-m')?.value;
    const toY   = document.getElementById('det-to-y')?.value;
    const from  = (fromY && fromM) ? `${fromY}-${fromM}` : '';
    const to    = (toY && toM)     ? `${toY}-${toM}`     : '';
    if(from) filtered = filtered.filter(h=>h.ref>=from);
    if(to)   filtered = filtered.filter(h=>h.ref<=to);
  }

  return filtered;
}

function renderDet(){
  const t = tenants.find(x=>x.id===detTenantId);
  if(!t||t.vago) return;

  const st = statusOf(t);
  renderDetHeader(t, st);

  const filtered = filterDetHistory(t);
  const filteredRev = [...filtered].reverse();

  const fin = getTenantFinancials(t);
  const debtBlock = renderDetDebt(t, st, fin);
  const summaryBlock = buildDetSummary(filtered);
  const { rows, footerRow } = buildDetHistory(t, filtered, filteredRev);

  const periodLabel = detPeriod==='single'&&detHighRef ? monthName(detHighRef)
    : detPeriod==='6m' ? 'Últimos 6 meses'
    : detPeriod==='ano' ? `Ano ${TODAY.getFullYear()}`
    : detPeriod==='custom' ? 'Período personalizado'
    : 'Todo o período';

  const condoName = (condominios.find(c=>c.id===(t.condoId||activeCondoId))||condominios[0])?.nome||'—';

  document.getElementById('det-body').innerHTML=`
    ${debtBlock}
    <div class="det-grid">
      <div><div class="fl">Condomínio</div><div class="fv" style="color:var(--green);font-weight:500;">${condoName}</div></div>
      <div><div class="fl">Garantia</div><div class="fv">${t.garantia}</div></div>
      <div><div class="fl">Telefone</div><div class="fv">${t.tel}</div></div>
      <div><div class="fl">Vencimento</div><div class="fv">Todo dia ${t.vencDia}</div></div>
      <div><div class="fl">Início</div><div class="fv">${fmtDate(t.start)}</div></div>
      <div><div class="fl">Término</div><div class="fv">${fmtDate(t.end)}</div></div>
      <div><div class="fl">Aluguel</div><div class="fv">${fmtBRL(t.rent)}</div></div>
      <div><div class="fl">Próximo Reajuste</div><div class="fv">${fmtDate(t.reajuste)}</div></div>
    </div>
    <div style="margin-bottom:18px;">
      <button class="btn" style="font-size:12px;" onclick="closeDet();openEditTenant(${t.id})">✏️ Editar dados do locatário</button>
    </div>
    <div class="det-sec" style="display:flex;align-items:center;justify-content:space-between;">
      <span>Extrato — ${periodLabel}</span>
      <span style="font-size:11px;color:var(--text-muted);font-weight:400;">${filtered.length} registros</span>
    </div>
    ${summaryBlock}
    ${filtered.length===0
      ? `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">Nenhum registro no período selecionado.</div>`
      : `<table class="ptable">
          <thead><tr>
            <th>Referência</th><th class="r">Aluguel</th><th class="r">Encargos</th>
            <th class="r">Multa/Juros</th><th class="r">Total</th><th class="r">Pagamento</th><th class="r">Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          ${footerRow?`<tfoot>${footerRow}</tfoot>`:''}
        </table>`
    }`;
}
