// ============================================================
// TENANT UI — Dashboard & card rendering
// ============================================================

const cardMonthState = {}; // Map of tenantId -> monthIndex in history

function renderDashboard(){
  cardMonthState = {}; // Reset month selection to current month for all cards
  const c=document.getElementById('dash-cards');
  c.innerHTML='';
  tenants.forEach(t=>renderCardDashboard(t,c));
  updateSummary();
  renderDashboardEscritorio();
}

function updateSummary(){
  const ativos = tenants.filter(t=>!t.vago);
  const total  = ativos.reduce((s,t)=>s+R(t.rent),0);
  const inadList = ativos.filter(t=>{ const s=statusOf(t); return s==='inadimplente'||s==='parcial'; });
  const vInad  = inadList.reduce((s,t)=>{ const f=getTenantFinancials(t); return s+(f.totalDue||0); },0);
  const rej    = ativos.filter(t=>{ const d=daysUntilReajuste(t); return d!==null&&d>=0&&d<=60; });
  document.getElementById('sum-receita').textContent = fmtBRL(total);
  document.getElementById('sum-ocup').textContent    = ativos.length;
  document.getElementById('sum-ocup-sub').textContent= `de ${tenants.length} imóveis`;
  document.getElementById('sum-inad').textContent    = inadList.length;
  document.getElementById('sum-inad-sub').textContent= inadList.length>0?`${fmtBRL(vInad)} em aberto`:'Nenhuma inadimplência';
  document.getElementById('sum-rej').textContent     = rej.length;
  document.getElementById('alert-count').textContent = inadList.length+rej.length;
}

function renderCardDashboard(t, container){
  const st = statusOf(t);
  const card = document.createElement('div');
  card.className = `tenant-card s-${st}`;

  if(t.vago){
    card.innerHTML=`<div class="card-header"><div class="card-avatar" style="background:#F0EFEA;color:var(--text-faint);font-size:20px;">🔑</div><div class="card-info"><div class="card-unit">${t.unit}</div><div class="card-name" style="color:var(--text-faint);font-style:italic;">Imóvel disponível</div></div><span class="s-badge s-vago">Vago</span></div><div style="text-align:center;padding:14px 0;color:var(--text-faint);font-size:13px;">Sem locatário ativo</div>`;
    container.appendChild(card); return;
  }

  // Initialize month index for this tenant (current month by default)
  if(!(t.id in cardMonthState)){
    cardMonthState[t.id] = t.history.length - 1; // Start at most recent
  }
  const monthIdx = cardMonthState[t.id];
  const e = monthIdx >= 0 && monthIdx < t.history.length ? t.history[monthIdx] : getEntryForDisplay(t);

  const fin = getTenantFinancials(t);
  const stLabel = STATUS_LABELS[st]||st;
  const condoBadge = (()=>{
    const c = condominios.find(x=>x.id===(t.condoId||activeCondoId));
    return c ? `<span style="font-size:9px;font-weight:600;color:var(--green);background:var(--green-bg);padding:1px 6px;border-radius:10px;margin-left:4px;">${c.apelido||c.nome}</span>` : '';
  })();

  // History dots with navigation
  const histHTML = renderHistDotsNav(t, monthIdx);

  // Penalty bar
  let penaltyBar='';
  if((st==='inadimplente'||st==='parcial') && fin.totalDue){
    penaltyBar=`<div class="card-alert-bar">⚠ Débito total: ${fmtBRL(fin.totalDue)}${fin.daysLate>0?` · ${fin.daysLate}d em atraso`:''}</div>`;
  }

  const cobrRows = getCobrRows(t, e);
  const totalDisp = cobrRows.reduce((s,r)=>s+r.val, 0);
  const vencDisp  = e ? e.venc : '';

  // render as a 2-column grid
  const cobrHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:4px;">${
    cobrRows.map(r=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:11px;color:${r.red?'var(--red)':r.blue?'var(--blue)':'var(--text-muted)'};">${r.lbl}</span>
        <span style="font-size:12px;font-weight:600;color:${r.red?'var(--red)':r.blue?'var(--blue)':'var(--text)'};">${fmtBRL(r.val)}</span>
      </div>`).join('')
  }</div>`;

  card.innerHTML=`
    <div class="card-header">
      <div class="card-avatar">${initials(t.name)}</div>
      <div class="card-info">
        <div class="card-unit">${t.unit}${condoBadge}</div>
        <div class="card-name">${t.name}</div>
        <div class="card-tel">${t.tel}</div>
      </div>
      <span class="s-badge s-${st}">${stLabel}</span>
    </div>
    <div class="card-cobr" style="cursor:default;">
      <div style="font-size:10px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;display:flex;justify-content:space-between;">
        <span>Cobrança — ${e?monthName(e.ref):'—'}</span>
        <span style="font-size:11px;color:var(--text-muted);">venc. ${fmtDate(vencDisp)}</span>
      </div>
      ${cobrHTML}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);margin-top:6px;">
        <div>
          <div style="font-size:10px;color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Total devido</div>
          <div style="font-size:17px;font-weight:600;color:var(--text);">${fmtBRL(totalDisp)}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn-wpp" style="font-size:11px;padding:6px 12px;" onclick="event.stopPropagation();openWpp(${t.id})">📲 Cobrar</button>
          <button class="btn" style="font-size:11px;padding:6px 12px;" onclick="event.stopPropagation();openDet(${t.id},'${e?.ref||''}')" title="Abrir ficha completa">Ver extrato</button>
        </div>
      </div>
    </div>
    <hr class="card-div">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <div style="font-size:10px;color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Histórico de pagamentos</div>
      <div>${histHTML}</div>
    </div>${penaltyBar}`;
  container.appendChild(card);
}

// Returns all billing line items for a tenant for display in cards and dashboard
function getCobrRows(t, e){
  const im  = t.imovelId ? getImovel(t.imovelId) : null;
  const ref = e?.ref || `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`;
  const multaVal = e ? R(e.multa)+R(e.pendingMulta) : 0;
  const jurosVal = e ? R(e.juros)+R(e.pendingJuros) : 0;

  if(im && im.gestao==='autonomo'){
    const linhas = getDespInquilinoLinhas(im.id, ref);
    return [
      {lbl:`Aluguel (${monthName(ref)})`, val:R(t.rent)},
      ...linhas.map(d=>({lbl:d.desc, val:d.valor, blue:true})),
      ...(multaVal>0 ? [{lbl:'Multa', val:multaVal, red:true}] : []),
      ...(jurosVal>0 ? [{lbl:'Juros', val:jurosVal, red:true}] : []),
    ].filter(r=>r.val>0);
  }

  // Condo imovel
  let condoRefLabel='—';
  if(e?.ref){const[ry,rm]=e.ref.split('-');let pm=parseInt(rm)-1,py=parseInt(ry);if(pm<1){pm=12;py--;}condoRefLabel=`${MN[pm]}/${py}`;}
  const extras = (e?.extras||[]);
  return [
    {lbl:`Aluguel (${e?monthName(e.ref):'—'})`,  val:R(t.rent)},
    {lbl:`Condomínio (${condoRefLabel})`,          val:e?R(e.condo):0},
    {lbl:'IPTU',                                   val:e?R(e.iptu):0},
    {lbl:'Taxa de Lixo',                           val:e?R(e.lixo):0},
    ...(multaVal>0 ? [{lbl:'Multa', val:multaVal, red:true}] : []),
    ...(jurosVal>0 ? [{lbl:'Juros', val:jurosVal, red:true}] : []),
    ...extras.map(ex=>({lbl:ex.descricao||'Extra', val:R(ex.valor), blue:true})),
  ].filter(r=>r.val>0);
}

// Garantem uma entrada de exibição válida para o mês atual
function getEntryForDisplay(t){
  const openEntry = t.history.slice().reverse().find(h=>h.status!=='pago') || t.history[t.history.length-1];
  if(openEntry) return openEntry;
  const todayRef = `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`;
  return buildMonthEntry(t, todayRef);
}

// Renderizar grid de dots coloridos do histórico de pagamento
function renderHistDots(t){
  if(!t || !t.history) return '';
  return t.history.slice(-6).map(h=>{
    const m = h.ref.split('-')[1];
    let cls = 'futuro';
    if(h.status==='pago') cls='pago';
    else if(h.status==='parcial') cls='parcial';
    else if(h.status==='inadimplente'||h.status==='pendente') cls='inadimplente';
    const tip = `${monthName(h.ref)}: ${h.status} — ${fmtBRL(h.valorPago)}/${fmtBRL(h.valorCobrado)} · clique para ver extrato`;
    return `<div class="hdot ${cls}" title="${tip}" onclick="event.stopPropagation();openDet(${t.id},'${h.ref}')">${m}</div>`;
  }).join('');
}

// Renderizar dots com navegação < >
function renderHistDotsNav(t, currentIdx){
  if(!t || !t.history || t.history.length === 0) return '';

  const lastIdx = t.history.length - 1;
  const firstIdx = Math.max(0, lastIdx - 5); // Show last 6 months max
  const canGoPrev = currentIdx > firstIdx;
  const canGoNext = currentIdx < lastIdx;

  const dotsHTML = t.history.slice(firstIdx, lastIdx + 1).map((h, idx)=>{
    const absIdx = firstIdx + idx;
    const m = h.ref.split('-')[1];
    let cls = 'futuro';
    if(h.status==='pago') cls='pago';
    else if(h.status==='parcial') cls='parcial';
    else if(h.status==='inadimplente'||h.status==='pendente') cls='inadimplente';
    if(absIdx === currentIdx) cls += ' active';
    const isBold = absIdx === currentIdx ? 'font-weight:600;' : '';
    const tip = `${monthName(h.ref)}: ${h.status} — ${fmtBRL(h.valorPago)}/${fmtBRL(h.valorCobrado)}`;
    return `<div class="hdot ${cls}" title="${tip}" style="${isBold}">${m}</div>`;
  }).join('');

  return `
    <div style="display:flex;align-items:center;gap:4px;">
      <button class="btn-nav-month" onclick="event.stopPropagation();goToPrevMonth(${t.id})" ${canGoPrev?'':'disabled'} title="Mês anterior" style="padding:4px 8px;font-size:14px;border:none;background:var(--border);color:var(--text-muted);cursor:pointer;border-radius:4px;transition:all .2s;${!canGoPrev?'opacity:0.4;cursor:not-allowed;':''}">‹</button>
      <div class="card-history" style="display:flex;gap:3px;">${dotsHTML}</div>
      <button class="btn-nav-month" onclick="event.stopPropagation();goToNextMonth(${t.id})" ${canGoNext?'':'disabled'} title="Próximo mês" style="padding:4px 8px;font-size:14px;border:none;background:var(--border);color:var(--text-muted);cursor:pointer;border-radius:4px;transition:all .2s;${!canGoNext?'opacity:0.4;cursor:not-allowed;':''}">›</button>
    </div>`;
}

// Navigate to previous month in card
function goToPrevMonth(tenantId){
  const tenant = tenants.find(t=>t.id===tenantId);
  if(!tenant) return;
  const lastIdx = tenant.history.length - 1;
  const firstIdx = Math.max(0, lastIdx - 5);
  if(cardMonthState[tenantId] > firstIdx){
    cardMonthState[tenantId]--;
    renderDashboard();
  }
}

// Navigate to next month in card
function goToNextMonth(tenantId){
  const tenant = tenants.find(t=>t.id===tenantId);
  if(!tenant) return;
  const lastIdx = tenant.history.length - 1;
  if(cardMonthState[tenantId] < lastIdx){
    cardMonthState[tenantId]++;
    renderDashboard();
  }
}

// ============================================================
// DASHBOARD ESCRITÓRIO (Alerts, Reajustes, Report tabs)
// ============================================================

function renderDashboardEscritorio(){
  renderAlerts();
  renderReajustes();
}

function renderAlerts(){
  const list=document.getElementById('alerts-list');list.innerHTML='';
  const al=[];
  tenants.filter(t=>!t.vago).forEach(t=>{
    const st=statusOf(t);
    const fin=getTenantFinancials(t);
    if(st==='inadimplente'||st==='parcial'){
      al.push({type:'red',icon:'⚠',title:`${t.unit} — ${t.name.split(' ').slice(0,2).join(' ')}`,
        desc:`${st==='parcial'?'Pagamento parcial':'Inadimplente'} · ${fin.daysLate>0?fin.daysLate+' dias em atraso':'venceu hoje'}`,
        value:fmtBRL(fin.totalDue),valueClass:'red',tenant:t});
    }
    if(st==='pendente'){
      const last=t.history[t.history.length-1];
      al.push({type:'amber',icon:'◷',title:`${t.unit} — ${t.name.split(' ').slice(0,2).join(' ')}`,
        desc:`Pendente — ${monthName(last?.ref)} · Venc. ${fmtDate(last?.venc)}`,
        value:fmtBRL(last?.valorCobrado),valueClass:'amber',tenant:t});
    }
    const days=daysUntilReajuste(t);
    if(days!==null&&days>=0&&days<=60){
      al.push({type:'blue',icon:'↑',title:`${t.unit} — Reajuste em ${days} dias`,
        desc:`${t.name.split(' ')[0]} · Aluguel atual ${fmtBRL(t.rent)}`,
        value:fmtDate(t.reajuste),valueClass:'',tenant:t});
    }
  });
  if(!al.length){list.innerHTML='<div style="text-align:center;padding:48px;color:var(--text-muted);">✓ Nenhum alerta no momento</div>';return;}
  al.forEach(a=>{
    const el=document.createElement('div');el.className='alert-item';el.onclick=()=>openDet(a.tenant.id);
    el.innerHTML=`<div class="alert-icon ${a.type}">${a.icon}</div><div class="alert-text"><div class="alert-title">${a.title}</div><div class="alert-desc">${a.desc}</div></div><div class="alert-value ${a.valueClass}">${a.value}</div>`;
    list.appendChild(el);
  });
}

function renderReajustes(){
  const c=document.getElementById('reajustes-list');c.innerHTML='';
  [...tenants].filter(t=>!t.vago).sort((a,b)=>new Date(a.reajuste||'2099')-new Date(b.reajuste||'2099')).forEach(t=>{
    const days=daysUntilReajuste(t);let badge='',urgency='';
    if(days!==null){
      if(days<0){urgency='color:var(--red)';badge=`<span class="pill inadimplente">Vencido ${Math.abs(days)}d</span>`;}
      else if(days<=30){urgency='color:var(--amber)';badge=`<span class="pill parcial">${days} dias</span>`;}
      else if(days<=60){badge=`<span class="pill pago" style="background:var(--blue-bg);color:var(--blue)">${days} dias</span>`;}
      else{badge=`<span class="pill" style="background:var(--bg);color:var(--text-muted)">${days} dias</span>`;}
    }
    const card=document.createElement('div');card.className='rej-card';card.onclick=()=>openDet(t.id);
    card.innerHTML=`<div><div style="font-weight:500">${t.unit} — ${t.name.split(' ').slice(0,2).join(' ')}</div><div style="font-size:11px;color:var(--text-muted);margin-top:1px;">${t.garantia}</div></div><div><div class="card-field-label">Aluguel atual</div><div style="font-size:15px;font-weight:500;margin-top:2px;">${fmtBRL(t.rent)}</div></div><div><div class="card-field-label">Próximo reajuste</div><div style="font-size:13px;margin-top:2px;${urgency}">${fmtDate(t.reajuste)}</div></div><div>${badge}</div>`;
    c.appendChild(card);
  });
}

// TENANTS PAGE
function renderTenants(){
  const c=document.getElementById('tenants-cards');c.innerHTML='';
  tenants.forEach(t=>renderCard(t,c));
  document.getElementById('tenants-count').textContent=`${tenants.length} locatários`;
}

// READ-ONLY card for Painel Geral
function renderCard(t, container){
  const st = statusOf(t);
  const card = document.createElement('div');
  card.className = `tenant-card s-${st}`;

  if(t.vago){
    card.innerHTML=`<div class="card-header"><div class="card-avatar" style="background:#F0EFEA;color:var(--text-faint);font-size:20px;">🔑</div><div class="card-info"><div class="card-unit">${t.unit}</div><div class="card-name" style="color:var(--text-faint);font-style:italic;">Imóvel disponível</div></div><span class="s-badge s-vago">Vago</span></div><div style="text-align:center;padding:16px 0;color:var(--text-faint);font-size:13px;">Sem locatário ativo</div>`;
    container.appendChild(card); return;
  }

  const fin = getTenantFinancials(t);
  const stLabel=STATUS_LABELS[st]||st;

  // find the latest non-paid entry, or the last entry
  const openEntry = t.history.slice().reverse().find(h=>h.status!=='pago') || t.history[t.history.length - 1];

  // History dots (last 6) — clickable, show extrato for that month
  const histHTML = renderHistDots(t);

  // penalty bar
  let penaltyBar='';
  if((st==='inadimplente'||st==='parcial') && fin.totalDue){
    penaltyBar=`<div class="card-alert-bar">⚠ Débito total: ${fmtBRL(fin.totalDue)}${fin.daysLate>0?` · ${fin.daysLate}d em atraso`:''}</div>`;
  }

  // --- COBRANÇA BLOCK ---
  const e = getEntryForDisplay(t);
  const im = t.imovelId ? getImovel(t.imovelId) : null;
  const ref = e?.ref || `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`;

  // For autonomous imovel, always pull fresh despesas
  let condoDisp, iptuDisp, lixoDisp, extrasDisp;
  if(im && im.gestao==='autonomo'){
    const despInq = getDespesasAtivas(im.id, ref).filter(d=>d.resp==='inquilino');
    iptuDisp    = despInq.filter(d=>d.cat==='iptu').reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);
    lixoDisp    = despInq.filter(d=>d.cat==='lixo').reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);
    condoDisp   = 0;
    extrasDisp  = despInq.filter(d=>d.cat!=='iptu'&&d.cat!=='lixo')
                         .map(d=>({descricao:d.desc, valor:R(d.recorr==='parcelado'?d.valorParcela:d.valor)}));
  } else {
    condoDisp   = e ? R(e.condo)  : 0;
    iptuDisp    = e ? R(e.iptu)   : 0;
    lixoDisp    = e ? R(e.lixo)   : 0;
    extrasDisp  = (e?.extras||[]);
  }

  const multaDisp  = e ? R(e.multa)+R(e.pendingMulta) : 0;
  const jurosDisp  = e ? R(e.juros)+R(e.pendingJuros) : 0;
  const extrasTotal = extrasDisp.reduce((s,ex)=>s+R(ex.valor),0);
  const totalDisp  = R2(R(t.rent)+condoDisp+iptuDisp+lixoDisp+multaDisp+jurosDisp+extrasTotal);
  const vencDisp   = e ? e.venc : '';

  // condomínio ref = mês anterior ao aluguel
  let condoRefLabel = '—';
  if(ref){
    const[ry,rm]=ref.split('-');
    let pm=parseInt(rm)-1, py=parseInt(ry);
    if(pm<1){pm=12;py--;}
    condoRefLabel=`${MN[pm]}/${py}`;
  }

  const condoBadgeR = (()=>{
    const c = condominios.find(x=>x.id===(t.condoId||activeCondoId));
    return c ? `<span style="font-size:9px;font-weight:600;color:var(--green);background:var(--green-bg);padding:1px 6px;border-radius:10px;margin-left:4px;">${c.apelido||c.nome}</span>` : '';
  })();

  // Build the cobrança fields block differently for autonomous imovel vs condo
  let cobrBlock;
  if(im && im.gestao==='autonomo'){
    const linhas = getDespInquilinoLinhas(im.id, ref);
    const despRows = linhas.map(d=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:var(--blue-bg);border-radius:5px;margin-bottom:3px;">
        <span style="font-size:11px;color:var(--blue);font-weight:500;">${despCatIcon(d.cat)} ${d.desc}</span>
        <span style="font-size:12px;font-weight:600;color:var(--blue);">${fmtBRL(d.valor)}</span>
      </div>`).join('');
    const despTotal = linhas.reduce((s,d)=>s+d.valor,0);
    cobrBlock = `
      <div style="margin-bottom:6px;">
        <div class="cobr-field" style="margin-bottom:6px;">
          <div class="cobr-label">Aluguel <span style="font-weight:400;text-transform:none;">(${monthName(ref)})</span></div>
          <input class="cobr-inp" type="number" value="${R(t.rent)}" id="ci-aluguel-${t.id}" step="0.01" oninput="recalcCard(${t.id})">
        </div>
        ${multaDisp>0||jurosDisp>0?`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
          <div class="cobr-field"><div class="cobr-label" style="color:var(--red);">Multa</div>
            <input class="cobr-inp" style="border-color:var(--red-light);background:var(--red-bg);" type="number" value="${multaDisp||''}" placeholder="0,00" id="ci-multa-${t.id}" step="0.01" oninput="recalcCard(${t.id})"></div>
          <div class="cobr-field"><div class="cobr-label" style="color:var(--red);">Juros</div>
            <input class="cobr-inp" style="border-color:var(--red-light);background:var(--red-bg);" type="number" value="${jurosDisp||''}" placeholder="0,00" id="ci-juros-${t.id}" step="0.01" oninput="recalcCard(${t.id})"></div>
        </div>`:''}
        ${linhas.length?`<div style="font-size:10px;font-weight:600;color:var(--blue);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Despesas do imóvel (inquilino)</div>${despRows}`:''}
        ${!linhas.length?`<div style="font-size:11px;color:var(--text-faint);padding:6px;text-align:center;">Sem despesas lançadas para o inquilino</div>`:''}
      </div>
      <div style="font-size:10px;color:var(--blue);margin-bottom:6px;padding:4px 8px;background:var(--blue-bg);border:1px solid var(--blue-light);border-radius:5px;">
        💡 Edite as despesas na aba <strong>Imóveis</strong>
      </div>`;
  } else {
    cobrBlock = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <div class="cobr-field">
          <div class="cobr-label">Aluguel <span style="font-weight:400;text-transform:none;">(${monthName(ref)})</span></div>
          <input class="cobr-inp" type="number" value="${R(t.rent)}" id="ci-aluguel-${t.id}" step="0.01" oninput="recalcCard(${t.id})">
        </div>
        ${condoDisp>0?`<div class="cobr-field">
          <div class="cobr-label">Condomínio <span style="font-weight:400;text-transform:none;">(${condoRefLabel})</span></div>
          <input class="cobr-inp" type="number" value="${condoDisp||''}" placeholder="0,00" id="ci-condo-${t.id}" step="0.01" oninput="recalcCard(${t.id})">
        </div>`:''}
        ${iptuDisp>0?`<div class="cobr-field"><div class="cobr-label">IPTU</div>
          <input class="cobr-inp" type="number" value="${iptuDisp||''}" placeholder="0,00" id="ci-iptu-${t.id}" step="0.01" oninput="recalcCard(${t.id})"></div>`:''}
        ${lixoDisp>0?`<div class="cobr-field"><div class="cobr-label">Taxa de Lixo</div>
          <input class="cobr-inp" type="number" value="${lixoDisp||''}" placeholder="0,00" id="ci-lixo-${t.id}" step="0.01" oninput="recalcCard(${t.id})"></div>`:''}
        ${multaDisp>0||jurosDisp>0?`
        <div class="cobr-field"><div class="cobr-label" style="color:var(--red);">Multa</div>
          <input class="cobr-inp" style="border-color:var(--red-light);background:var(--red-bg);" type="number" value="${multaDisp||''}" placeholder="0,00" id="ci-multa-${t.id}" step="0.01" oninput="recalcCard(${t.id})"></div>
        <div class="cobr-field"><div class="cobr-label" style="color:var(--red);">Juros</div>
          <input class="cobr-inp" style="border-color:var(--red-light);background:var(--red-bg);" type="number" value="${jurosDisp||''}" placeholder="0,00" id="ci-juros-${t.id}" step="0.01" oninput="recalcCard(${t.id})"></div>`:''}
      </div>
      <div id="ci-extras-${t.id}">
        ${extrasDisp.map((ex,i)=>`
        <div style="display:grid;grid-template-columns:1fr 90px 22px;gap:4px;margin-bottom:4px;" id="ci-extra-row-${t.id}-${i}">
          <input class="cobr-inp" style="text-align:left;" type="text" value="${ex.descricao}" placeholder="Descrição" id="ci-extra-desc-${t.id}-${i}" oninput="recalcCard(${t.id})">
          <input class="cobr-inp" type="number" value="${ex.valor}" placeholder="0,00" id="ci-extra-val-${t.id}-${i}" step="0.01" oninput="recalcCard(${t.id})">
          <button style="border:none;background:var(--red-bg);color:var(--red);border-radius:var(--radius-sm);cursor:pointer;font-size:13px;" onclick="event.stopPropagation();removeExtra(${t.id},${i})">×</button>
        </div>`).join('')}
      </div>
      <button style="display:flex;align-items:center;gap:4px;border:1px dashed var(--border-strong);background:none;border-radius:var(--radius-sm);padding:5px 10px;font-size:11px;color:var(--text-muted);cursor:pointer;width:100%;justify-content:center;margin-bottom:6px;" onclick="event.stopPropagation();addExtra(${t.id})">
        + Adicionar cobrança extra
      </button>`;
  }

  card.innerHTML=`
    <div class="card-header" style="cursor:pointer" onclick="openDet(${t.id})">
      <div class="card-avatar">${initials(t.name)}</div>
      <div class="card-info">
        <div class="card-unit">${t.unit}${condoBadgeR}</div>
        <div class="card-name">${t.name}</div>
        <div class="card-tel">${t.tel}</div>
      </div>
      <span class="s-badge s-${st}">${stLabel}</span>
    </div>
    <div class="card-cobr" id="cobr-${t.id}">
      <div style="font-size:10px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span>Cobrança — ${monthName(ref)}</span>
        <span style="font-size:11px;color:var(--text-muted);">venc. ${fmtDate(vencDisp)}</span>
      </div>
      ${cobrBlock}
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);">
        <div>
          <div style="font-size:10px;color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Total devido</div>
          <div style="font-size:17px;font-weight:600;color:var(--text);" id="ci-total-${t.id}">${fmtBRL(totalDisp)}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn-wpp" style="font-size:11px;padding:6px 12px;" onclick="event.stopPropagation();openWpp(${t.id})">📲 Cobrar</button>
          <button class="btn btn-primary" style="font-size:11px;padding:6px 12px;" onclick="event.stopPropagation();saveCardCobr(${t.id})">💾 Salvar</button>
        </div>
      </div>
    </div>
    <hr class="card-div">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <div style="font-size:10px;color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Últimos 6 meses</div>
      <div class="card-history">${histHTML}</div>
    </div>${penaltyBar}`;
  container.appendChild(card);
}

// ============================================================
// CARD INLINE COBRANÇA
// ============================================================
function getCardExtras(id){
  const t = tenants.find(x=>x.id===id);
  const im = t?.imovelId ? getImovel(t.imovelId) : null;
  if(im && im.gestao==='autonomo'){
    const ref = getEntryForDisplay(t)?.ref ||
      `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`;
    // Return ALL despesas do inquilino as extras (desc + valor)
    return getDespInquilinoLinhas(im.id, ref)
      .map(d=>({ descricao: d.desc, valor: d.valor }));
  }
  // Condo tenants: read from DOM inputs
  const extras=[];
  let i=0;
  while(document.getElementById(`ci-extra-desc-${id}-${i}`)){
    const desc=document.getElementById(`ci-extra-desc-${id}-${i}`).value.trim();
    const val=R(document.getElementById(`ci-extra-val-${id}-${i}`).value);
    if(desc||val>0) extras.push({descricao:desc,valor:val});
    i++;
  }
  return extras;
}

function recalcCard(id){
  const t  = tenants.find(x=>x.id===id);
  const im = t?.imovelId ? getImovel(t.imovelId) : null;
  const aluguel = R(document.getElementById(`ci-aluguel-${id}`)?.value||0);
  const multa   = R(document.getElementById(`ci-multa-${id}`)?.value||0);
  const juros   = R(document.getElementById(`ci-juros-${id}`)?.value||0);
  let total;
  if(im && im.gestao==='autonomo'){
    const ref = getEntryForDisplay(t)?.ref ||
      `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`;
    const despTotal = getDespInquilinoTotal(im.id, ref);
    total = R2(aluguel + despTotal + multa + juros);
  } else {
    const condo = R(document.getElementById(`ci-condo-${id}`)?.value||0);
    const iptu  = R(document.getElementById(`ci-iptu-${id}`)?.value||0);
    const lixo  = R(document.getElementById(`ci-lixo-${id}`)?.value||0);
    const extrasTotal = getCardExtras(id).reduce((s,e)=>s+R(e.valor),0);
    total = R2(aluguel+condo+iptu+lixo+multa+juros+extrasTotal);
  }
  const el = document.getElementById(`ci-total-${id}`);
  if(el) el.textContent = fmtBRL(total);
  if(wppTid===id && document.getElementById('wpp-overlay').classList.contains('open')) buildWpp();
}

function addExtra(id){
  const t=tenants.find(x=>x.id===id);if(!t)return;
  const openEntry=t.history.slice().reverse().find(h=>h.status!=='pago');
  if(openEntry && !openEntry.extras) openEntry.extras=[];

  // count current rows
  let i=0;
  while(document.getElementById(`ci-extra-row-${id}-${i}`)) i++;

  const container=document.getElementById(`ci-extras-${id}`);
  if(!container)return;
  const row=document.createElement('div');
  row.id=`ci-extra-row-${id}-${i}`;
  row.style.cssText='display:grid;grid-template-columns:1fr 90px 22px;gap:4px;margin-bottom:4px;';
  row.innerHTML=`
    <input class="cobr-inp" style="text-align:left;" type="text" placeholder="Descrição (ex: Controle de portão)" id="ci-extra-desc-${id}-${i}" oninput="recalcCard(${id})">
    <input class="cobr-inp" type="number" placeholder="0,00" id="ci-extra-val-${id}-${i}" step="0.01" oninput="recalcCard(${id})">
    <button style="border:none;background:var(--red-bg);color:var(--red);border-radius:var(--radius-sm);cursor:pointer;font-size:13px;" onclick="event.stopPropagation();this.parentElement.remove();recalcCard(${id})">×</button>`;
  container.appendChild(row);
  row.querySelector('input[type=text]').focus();
}

function removeExtra(id, idx){
  const t=tenants.find(x=>x.id===id);if(!t)return;
  const openEntry=t.history.slice().reverse().find(h=>h.status!=='pago');
  if(openEntry&&openEntry.extras) openEntry.extras.splice(idx,1);
  // rebuild the card without full dashboard re-render
  const container=document.getElementById(`ci-extras-${id}`);
  if(!container)return;
  const t2=tenants.find(x=>x.id===id);
  const e=t2.history.slice().reverse().find(h=>h.status!=='pago');
  container.innerHTML=(e&&e.extras&&e.extras.length>0)?e.extras.map((ex,i)=>`
    <div style="display:grid;grid-template-columns:1fr 90px 22px;gap:4px;margin-bottom:4px;" id="ci-extra-row-${id}-${i}">
      <input class="cobr-inp" style="text-align:left;" type="text" value="${ex.descricao}" placeholder="Descrição" id="ci-extra-desc-${id}-${i}" oninput="recalcCard(${id})">
      <input class="cobr-inp" type="number" value="${ex.valor}" placeholder="0,00" id="ci-extra-val-${id}-${i}" step="0.01" oninput="recalcCard(${id})">
      <button style="border:none;background:var(--red-bg);color:var(--red);border-radius:var(--radius-sm);cursor:pointer;font-size:13px;" onclick="event.stopPropagation();removeExtra(${id},${i})">×</button>
    </div>`).join(''):'';
  recalcCard(id);
}

function saveCardCobr(id){
  const t = tenants.find(x=>x.id===id);
  if(!t) return;
  const im = t.imovelId ? getImovel(t.imovelId) : null;

  const aluguel = R(document.getElementById(`ci-aluguel-${id}`)?.value);
  const multa   = R(document.getElementById(`ci-multa-${id}`)?.value||0);
  const juros   = R(document.getElementById(`ci-juros-${id}`)?.value||0);

  let condo, iptu, lixo, extras, total;

  if(im && im.gestao==='autonomo'){
    const ref = getEntryForDisplay(t)?.ref ||
      `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`;
    const linhas = getDespInquilinoLinhas(im.id, ref);
    iptu   = linhas.filter(d=>d.cat==='iptu').reduce((s,d)=>s+d.valor,0);
    lixo   = linhas.filter(d=>d.cat==='lixo').reduce((s,d)=>s+d.valor,0);
    condo  = 0;
    extras = linhas.filter(d=>d.cat!=='iptu'&&d.cat!=='lixo')
                   .map(d=>({descricao:d.desc, valor:d.valor}));
    total  = R2(aluguel+iptu+lixo+extras.reduce((s,e)=>s+R(e.valor),0)+multa+juros);
  } else {
    condo  = R(document.getElementById(`ci-condo-${id}`)?.value||0);
    iptu   = R(document.getElementById(`ci-iptu-${id}`)?.value||0);
    lixo   = R(document.getElementById(`ci-lixo-${id}`)?.value||0);
    extras = getCardExtras(id);
    total  = R2(aluguel+condo+iptu+lixo+multa+juros+extras.reduce((s,e)=>s+R(e.valor),0));
  }

  // update data model
  const openEntry = t.history.slice().reverse().find(h=>h.status!=='pago');
  if(openEntry){
    openEntry.aluguel = aluguel; openEntry.condo=condo; openEntry.iptu=iptu;
    openEntry.lixo=lixo; openEntry.multa=multa; openEntry.juros=juros;
    openEntry.extras=extras; openEntry.valorCobrado=total;
  } else {
    const last=t.history[t.history.length-1];
    const newRef=last?nextMonth(last.ref):'';
    if(!newRef)return;
    const entry=buildMonthEntry(t,newRef);
    entry.aluguel=aluguel;entry.condo=condo;entry.iptu=iptu;entry.lixo=lixo;
    entry.multa=multa;entry.juros=juros;entry.extras=extras;entry.valorCobrado=total;
    t.history.push(entry);t.history.sort((a,b)=>a.ref.localeCompare(b.ref));
  }

  // update total display in the tenants tab card (in-place)
  const totalEl=document.getElementById(`ci-total-${id}`);
  if(totalEl){totalEl.textContent=fmtBRL(total);totalEl.style.color='var(--green)';setTimeout(()=>{totalEl.style.color='';},1800);}

  // refresh the read-only dashboard cards so they reflect the saved values
  renderDashboard();

  // Fase 2c: Registrar mudança de pagamento com SYNC_ENGINE
  if(typeof SYNC_ENGINE !== 'undefined' && openEntry){
    SYNC_ENGINE.onChange(
      `tenants.${t.id}.history.${t.history.indexOf(openEntry)}.aluguel`,
      0,
      openEntry.aluguel
    );
  }

  saveToStorage();
}
