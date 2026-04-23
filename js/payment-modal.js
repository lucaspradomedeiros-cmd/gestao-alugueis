// ============================================================
// REGISTER PAYMENT MODAL (global)
// ============================================================

function openRegModal(presetId){
  const sel=document.getElementById('rm-tenant');
  sel.innerHTML=tenants.filter(t=>!t.vago).map(t=>`<option value="${t.id}">${t.unit} — ${t.name.split(' ')[0]}</option>`).join('');
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
  const last=t.history[t.history.length-1];

  // Set ref to current open month
  let ref=last?last.ref:'';
  if(last && last.status==='pago'){
    // suggest next month
    ref=nextMonth(last.ref);
  }
  document.getElementById('rm-ref').value=ref;

  // Pre-fill amounts from entry
  const entry=t.history.find(h=>h.ref===ref)||buildMonthEntry(t,ref);
  document.getElementById('rm-value').value='';
  document.getElementById('rm-condo').value=entry.condo||'';
  document.getElementById('rm-iptu').value=entry.iptu||'';
  document.getElementById('rm-lixo').value=entry.lixo||'';
  document.getElementById('rm-multa').value=(R(entry.multa)+R(entry.pendingMulta))||'';
  document.getElementById('rm-juros').value=(R(entry.juros)+R(entry.pendingJuros))||'';

  // Show saldo box
  const box=document.getElementById('rm-saldo-box');
  if(fin.totalDue && (fin.status==='inadimplente'||fin.status==='parcial')){
    box.innerHTML=`<div style="font-size:11px;font-weight:600;color:var(--amber);margin-bottom:6px;">Débito em aberto — ${monthName(ref)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px;">
        <div><div style="color:var(--text-faint);font-size:10px;">BASE</div><div style="font-weight:600;">${fmtBRL(fin.base)}</div></div>
        <div><div style="color:var(--text-faint);font-size:10px;">MULTA+JUROS</div><div style="font-weight:600;color:var(--red);">${fmtBRL(R(fin.multaHoje)+R(fin.jurosHoje))}</div></div>
        <div><div style="color:var(--text-faint);font-size:10px;">TOTAL HOJE</div><div style="font-weight:600;color:var(--red);">${fmtBRL(fin.totalDue)}</div></div>
      </div>`;
  } else {
    box.innerHTML=`<div style="font-size:12px;color:var(--green);">✓ Sem débitos anteriores — ${monthName(ref)} · Total: ${fmtBRL(R(entry.aluguel)+R(entry.condo)+R(entry.iptu)+R(entry.lixo))}</div>`;
  }
}

function saveRegModal(){
  const tid=parseInt(document.getElementById('rm-tenant').value);
  const ref=document.getElementById('rm-ref').value;
  const date=document.getElementById('rm-date').value;
  const value=document.getElementById('rm-value').value;
  if(!ref||!date||!value){alert('Preencha Referência, Data e Valor Pago.');return;}
  const t=tenants.find(x=>x.id===tid);
  const entry = t?.history.find(h=>h.ref===ref);
  const oldStatus = entry ? entry.status : null;
  const oldValorPago = entry ? entry.valorPago : 0;

  applyPayment(tid,ref,date,value,
    document.getElementById('rm-condo').value,
    document.getElementById('rm-iptu').value,
    document.getElementById('rm-lixo').value,
    document.getElementById('rm-multa').value,
    document.getElementById('rm-juros').value,
    document.getElementById('rm-obs').value);

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

function applyPayment(tenantId, ref, dataPagamento, valorPago, condoOverride, iptuOverride, lixoOverride, multaOverride, jurosOverride, obs){
  const t = tenants.find(x=>x.id===tenantId);
  if(!t) return;

  let entry = t.history.find(h=>h.ref===ref);
  if(!entry){
    entry = buildMonthEntry(t, ref);
    t.history.push(entry);
    t.history.sort((a,b)=>a.ref.localeCompare(b.ref));
  }

  // Override amounts if provided
  if(condoOverride!==null && condoOverride!=='') entry.condo = R(condoOverride);
  if(iptuOverride!==null && iptuOverride!=='')   entry.iptu  = R(iptuOverride);
  if(lixoOverride!==null && lixoOverride!=='')   entry.lixo  = R(lixoOverride);
  if(multaOverride!==null && multaOverride!=='') entry.multa = R(multaOverride);
  if(jurosOverride!==null && jurosOverride!=='') entry.juros = R(jurosOverride);

  const base = R(entry.aluguel)+R(entry.condo)+R(entry.iptu)+R(entry.lixo);
  const totalDue = R2(base + R(entry.multa) + R(entry.juros) + R(entry.pendingMulta) + R(entry.pendingJuros));

  entry.valorCobrado = totalDue;
  entry.valorPago   += R(valorPago);
  entry.dataPagamento = dataPagamento;
  if(obs) entry.obs = obs;

  // Determine status
  const vencDate = entry.venc;
  const late = dataPagamento > vencDate;
  const daysLate = late ? daysDiff(vencDate, dataPagamento) : 0;

  if(entry.valorPago >= totalDue - 0.01){
    entry.status = 'pago';
    // If paid late, compute actual penalties and note them
    if(late && entry.multa===0){
      const {multa, juros} = calcPenalties(base, daysLate, false);
      entry.multa = multa; entry.juros = juros;
      entry.valorCobrado = R2(base+multa+juros+R(entry.pendingMulta)+R(entry.pendingJuros));
    }
  } else if(entry.valorPago > 0){
    entry.status = 'parcial';
    // Roll penalties to next month
    _rollPenalties(t, ref, base, daysLate);
  } else {
    entry.status = dataPagamento > vencDate ? 'inadimplente' : 'pendente';
    _rollPenalties(t, ref, base, daysLate);
  }

  renderDashboard();
}

function _rollPenalties(t, ref, base, daysLate){
  const entry = t.history.find(h=>h.ref===ref);
  if(!entry) return;
  const {multa, juros} = calcPenalties(base, daysLate, R(entry.multa)>0);
  entry.multa = R(entry.multa)||multa;
  entry.juros = juros;

  // Find or create next month entry and carry over
  const nxtRef = nextMonth(ref);
  let nxt = t.history.find(h=>h.ref===nxtRef);
  if(!nxt){
    nxt = buildMonthEntry(t, nxtRef);
    t.history.push(nxt);
    t.history.sort((a,b)=>a.ref.localeCompare(b.ref));
  }
  nxt.pendingMulta = R2(R(entry.pendingMulta) + R(entry.multa));
  nxt.pendingJuros = R2(R(entry.pendingJuros) + juros);
  nxt.valorCobrado = R2(R(nxt.aluguel)+R(nxt.condo)+R(nxt.iptu)+R(nxt.lixo)+R(nxt.multa)+R(nxt.juros)+R(nxt.pendingMulta)+R(nxt.pendingJuros));
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

  _resetPaymentEntry(t, ref);
  saveToStorage();
  renderDashboard();
  renderDet();
}
