// ============================================================
// MULTI-CONDOMÍNIO — Data model & management
// ============================================================

function getActiveCondo(){ return condominios.find(c=>c.id===activeCondoId)||condominios[0]; }
function getActiveCondoHistory(){ return condoHistories[activeCondoId]||(condoHistories[activeCondoId]=[]); }

function switchCondo(id){
  condoHistories[activeCondoId] = [...condoHistory];
  activeCondoId = id;
  condoHistory = getActiveCondoHistory();
  const c = getActiveCondo();
  CONDO_UNITS.length = 0;
  c.units.forEach(u=>CONDO_UNITS.push(u));
  renderCondoSwitcher();
  renderCondoInfoBar();
  initCondoPage();
}

function renderCondoSwitcher(){
  const sw = document.getElementById('condo-switcher');
  if(!sw) return;
  sw.innerHTML = condominios.map(c=>`
    <button class="condo-tab-btn ${c.id===activeCondoId?'active':''}" onclick="switchCondo('${c.id}')">${c.apelido||c.nome}</button>
  `).join('') + `<button class="condo-tab-btn add-condo" onclick="openAddCondo()">+ Novo condomínio</button>`;
}

function renderCondoInfoBar(){
  const c = getActiveCondo();
  if(!c || !c.units) return;
  const units = c.units.length;
  document.getElementById('cib-nome').textContent = c.nome;
  document.getElementById('cib-end').textContent = c.endereco||'—';
  document.getElementById('cib-units').textContent = `${units} unidade${units!==1?'s':''}`;
  document.getElementById('condo-section-count').textContent = `${c.nome} · ${units} unidades`;
  document.getElementById('agua-title').textContent = `🚰 Água${c.ucAgua?' — '+c.ucAgua:''}`;
  document.getElementById('energia-title').textContent = `⚡ Energia${c.ucEnergia?' — '+c.ucEnergia:''}`;
}

function openAddCondo(){
  editingCondoId = null;
  document.getElementById('condo-modal-title').textContent = 'Novo Condomínio';
  document.getElementById('cm-nome').value = '';
  document.getElementById('cm-apelido').value = '';
  document.getElementById('cm-end').value = '';
  document.getElementById('cm-uc-agua').value = '';
  document.getElementById('cm-uc-energia').value = '';
  document.getElementById('cm-units').value = '';
  document.getElementById('cm-limpeza').value = '330';
  document.getElementById('cm-venc-prox').checked = true;
  document.getElementById('cm-delete-row').style.display = 'none';
  openOverlay('condo-modal-overlay');
}

function openEditCondo(){
  const c = getActiveCondo();
  editingCondoId = c.id;
  document.getElementById('condo-modal-title').textContent = 'Editar Condomínio';
  document.getElementById('cm-nome').value = c.nome;
  document.getElementById('cm-apelido').value = c.apelido||'';
  document.getElementById('cm-end').value = c.endereco||'';
  document.getElementById('cm-uc-agua').value = c.ucAgua||'';
  document.getElementById('cm-uc-energia').value = c.ucEnergia||'';
  document.getElementById('cm-units').value = c.units.join(', ');
  document.getElementById('cm-limpeza').value = c.limpezaPadrao||LIMPEZA_PADRAO;
  document.getElementById('cm-venc-prox').checked = c.vencMesSeguinte !== false;
  const tx = getCondoTaxas(c.id);
  ['agua','energia','limpeza','lixo','iptu','outras'].forEach(item=>{
    document.getElementById(`cm-tx-${item}-on`).checked = tx[item].aplicar;
    document.getElementById(`cm-tx-${item}-pct`).value  = tx[item].pct;
  });
  document.getElementById('cm-delete-row').style.display = condominios.length>1?'block':'none';
  openOverlay('condo-modal-overlay');
}

function saveCondoModal(){
  const nome = document.getElementById('cm-nome').value.trim();
  if(!nome){ alert('Informe o nome do condomínio.'); return; }
  const unitsRaw = document.getElementById('cm-units').value.trim();
  if(!unitsRaw){ alert('Informe ao menos uma unidade.'); return; }
  const units = unitsRaw.split(',').map(u=>u.trim()).filter(Boolean);
  if(!units.length){ alert('Informe ao menos uma unidade.'); return; }

  const taxasFromModal = {};
  ['agua','energia','limpeza','lixo','iptu','outras'].forEach(item=>{
    taxasFromModal[item] = {
      aplicar: document.getElementById(`cm-tx-${item}-on`).checked,
      pct: parseFloat(document.getElementById(`cm-tx-${item}-pct`).value)||10
    };
  });

  if(editingCondoId){
    const c = condominios.find(x=>x.id===editingCondoId);
    c.nome = nome;
    c.apelido = document.getElementById('cm-apelido').value.trim();
    c.endereco = document.getElementById('cm-end').value.trim();
    c.ucAgua = document.getElementById('cm-uc-agua').value.trim();
    c.ucEnergia = document.getElementById('cm-uc-energia').value.trim();
    c.units = units;
    c.limpezaPadrao = parseFloat(document.getElementById('cm-limpeza').value)||LIMPEZA_PADRAO;
    c.vencMesSeguinte = document.getElementById('cm-venc-prox').checked;
    c.taxas = taxasFromModal;
  } else {
    const newId = condominios.length ? Math.max(...condominios.map(x=>parseInt(x.id.replace('c','')))).toString() : '1';
    condominios.push({
      id: 'c'+(parseInt(newId)+1),
      nome, apelido: document.getElementById('cm-apelido').value.trim(),
      endereco: document.getElementById('cm-end').value.trim(),
      ucAgua: document.getElementById('cm-uc-agua').value.trim(),
      ucEnergia: document.getElementById('cm-uc-energia').value.trim(),
      units, limpezaPadrao: parseFloat(document.getElementById('cm-limpeza').value)||LIMPEZA_PADRAO,
      vencMesSeguinte: document.getElementById('cm-venc-prox').checked,
      taxas: taxasFromModal
    });
  }
  closeOverlay('condo-modal-overlay');
  renderCondoSwitcher();
  saveToStorage();
}

function saveCondoMonth(){
  const c = getActiveCondo();
  if(!c) return;
  const ref = document.getElementById('cm-ref-input').value;
  if(!ref) return;

  let entry = condoHistory.find(h=>h.ref===ref);
  if(!entry){
    entry = {ref, agua:0, energia:0, limpeza:0, outras:0, lixo:0, iptu:0};
    condoHistory.push(entry);
    condoHistory.sort((a,b)=>a.ref.localeCompare(b.ref));
  }

  entry.agua = R(document.getElementById('cm-agua').value);
  entry.energia = R(document.getElementById('cm-energia').value);
  entry.limpeza = R(document.getElementById('cm-limpeza-input').value);
  entry.outras = R(document.getElementById('cm-outras').value);
  entry.lixo = R(document.getElementById('cm-lixo').value);
  entry.iptu = R(document.getElementById('cm-iptu').value);

  hydrateEntries();
  renderDashboard();
  saveToStorage();
}

// ============================================================
// DESPESAS DO CONDOMÍNIO NÃO RATEADAS (15/09/2026)
// Pedido do usuário: um jeito de registrar gasto de manutenção do prédio
// (motor do portão, material de limpeza fora do rateio etc.) que fica
// só pra controle do proprietário — nunca entra no "Lançamento de
// Condomínio" acima nem vira cobrança pro inquilino. Ver index.html pra
// versão live (fonte da verdade) — cópia mantida aqui como referência.
// ============================================================
function getDespesasCondoAtivo(){ return despesasCondo[activeCondoId]||(despesasCondo[activeCondoId]=[]); }
function despCondoCatInfo(cat){
  return {
    manutencao:{icon:'🔧',label:'Manutenção'}, reforma:{icon:'🏗',label:'Reforma'},
    equipamento:{icon:'⚙️',label:'Equipamento'}, seguranca:{icon:'🔒',label:'Segurança'},
    jardinagem:{icon:'🌳',label:'Jardinagem'}, limpeza:{icon:'🧹',label:'Material de limpeza'},
    outra:{icon:'📌',label:'Outra'}
  }[cat] || {icon:'📌',label:'Outra'};
}
function openAddDespesaCondo(){
  editingDespCondoId = null;
  document.getElementById('despcondo-modal-title').textContent = 'Nova Despesa do Condomínio';
  document.getElementById('dc-desc').value = '';
  document.getElementById('dc-cat').value = 'manutencao';
  document.getElementById('dc-valor').value = '';
  document.getElementById('dc-data').value = new Date().toISOString().slice(0,10);
  document.getElementById('dc-obs').value = '';
  openOverlay('despcondo-modal-overlay');
}
function openEditDespesaCondo(despId){
  const d = getDespesasCondoAtivo().find(x=>x.id===despId); if(!d) return;
  editingDespCondoId = despId;
  document.getElementById('despcondo-modal-title').textContent = 'Editar Despesa do Condomínio';
  document.getElementById('dc-desc').value = d.descricao;
  document.getElementById('dc-cat').value  = d.categoria;
  document.getElementById('dc-valor').value = d.valor;
  document.getElementById('dc-data').value = d.data;
  document.getElementById('dc-obs').value = d.obs||'';
  openOverlay('despcondo-modal-overlay');
}
function saveDespesaCondo(){
  const descricao = document.getElementById('dc-desc').value.trim();
  const categoria = document.getElementById('dc-cat').value;
  const valor = R(document.getElementById('dc-valor').value);
  const data = document.getElementById('dc-data').value;
  const obs = document.getElementById('dc-obs').value.trim();
  if(!descricao||!valor||!data){ alert('Preencha descrição, valor e data.'); return; }
  const lista = getDespesasCondoAtivo();
  const _c = getActiveCondo();
  if(editingDespCondoId){
    const d = lista.find(x=>x.id===editingDespCondoId);
    if(d){
      logAudit(`Despesa do condomínio EDITADA — ${_c?.nome||activeCondoId} — "${d.descricao}" ${fmtBRL(d.valor)} → "${descricao}" ${fmtBRL(valor)}`, {tipo:'ajuste_manual', ref:data});
      Object.assign(d, {descricao, categoria, valor, data, obs});
    }
  } else {
    lista.push({id:'dc'+Date.now(), descricao, categoria, valor, data, obs});
    logAudit(`Despesa do condomínio LANÇADA — ${_c?.nome||activeCondoId} — "${descricao}" ${fmtBRL(valor)} (não rateada, por conta do proprietário)`, {tipo:'ajuste_manual', ref:data});
  }
  lista.sort((a,b)=>b.data.localeCompare(a.data));
  closeOverlay('despcondo-modal-overlay');
  saveToStorage();
  renderDespesasCondo();
}
function deleteDespesaCondo(despId){
  const lista = getDespesasCondoAtivo();
  const d = lista.find(x=>x.id===despId); if(!d) return;
  if(!confirm(`Excluir "${d.descricao}" (${fmtBRL(d.valor)})?`)) return;
  const _c = getActiveCondo();
  logAudit(`Despesa do condomínio EXCLUÍDA — ${_c?.nome||activeCondoId} — "${d.descricao}" ${fmtBRL(d.valor)}`, {tipo:'exclusao', ref:d.data});
  lista.splice(lista.indexOf(d),1);
  saveToStorage();
  renderDespesasCondo();
}
function renderDespesasCondo(){
  const resumoEl = document.getElementById('despcondo-resumo');
  const listaEl = document.getElementById('despcondo-lista');
  if(!resumoEl||!listaEl) return;
  const lista = getDespesasCondoAtivo();
  const anoAtual = String(TODAY.getFullYear());
  const totalAno = lista.filter(d=>d.data.slice(0,4)===anoAtual).reduce((s,d)=>s+R(d.valor),0);
  const totalGeral = lista.reduce((s,d)=>s+R(d.valor),0);
  const porCategoria = {};
  lista.forEach(d=>{ porCategoria[d.categoria] = (porCategoria[d.categoria]||0) + R(d.valor); });

  resumoEl.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;">
      <div style="font-size:10px;color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Total em ${anoAtual}</div>
      <div style="font-size:16px;font-weight:700;">${fmtBRL(totalAno)}</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;">
      <div style="font-size:10px;color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Total geral</div>
      <div style="font-size:16px;font-weight:700;">${fmtBRL(totalGeral)}</div>
    </div>
    ${Object.keys(porCategoria).map(cat=>{
      const info = despCondoCatInfo(cat);
      return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;">
        <div style="font-size:10px;color:var(--text-faint);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">${info.icon} ${info.label}</div>
        <div style="font-size:14px;font-weight:600;">${fmtBRL(porCategoria[cat])}</div>
      </div>`;
    }).join('')}
  `;

  if(!lista.length){
    listaEl.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">Nenhuma despesa lançada ainda pra este condomínio.</div>`;
    return;
  }
  const hdr = `<div class="rrow rhdr"><div style="flex:1">Data</div><div style="flex:2">Descrição</div><div style="flex:1.2">Categoria</div><div style="flex:1;text-align:right">Valor</div><div style="flex:.6"></div></div>`;
  const rows = lista.map(d=>{
    const info = despCondoCatInfo(d.categoria);
    return `<div class="rrow" style="cursor:pointer;" onclick="openEditDespesaCondo('${d.id}')">
      <div style="flex:1;font-size:12px;">${fmtDate(d.data)}</div>
      <div style="flex:2;font-size:12px;">${d.descricao}${d.obs?` <span title="${d.obs}" style="cursor:help;color:var(--amber)">💬</span>`:''}</div>
      <div style="flex:1.2;font-size:12px;color:var(--text-muted);">${info.icon} ${info.label}</div>
      <div style="flex:1;text-align:right;font-size:12px;font-weight:600;">${fmtBRL(d.valor)}</div>
      <div style="flex:.6;text-align:right;">
        <button onclick="event.stopPropagation();deleteDespesaCondo('${d.id}')" title="Excluir" style="background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:14px;padding:2px 4px;border-radius:4px;line-height:1;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text-faint)'">✕</button>
      </div>
    </div>`;
  }).join('');
  listaEl.innerHTML = hdr+rows;
}
function printDespesasCondo(){
  const _c = getActiveCondo();
  const lista = getDespesasCondoAtivo();
  const total = lista.reduce((s,d)=>s+R(d.valor),0);
  const linhas = lista.map(d=>{
    const info = despCondoCatInfo(d.categoria);
    return `<tr><td>${fmtDate(d.data)}</td><td>${d.descricao}</td><td>${info.icon} ${info.label}</td><td style="text-align:right;">${fmtBRL(d.valor)}</td></tr>`;
  }).join('');
  const w = window.open('', '_blank', 'width=900,height=700');
  if(!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Despesas do condomínio — ${_c?.nome||''}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a;}
      h1{font-size:18px;margin-bottom:4px;}
      .sub{color:#666;font-size:12px;margin-top:0;margin-bottom:16px;}
      table{width:100%;border-collapse:collapse;font-size:12.5px;}
      th{text-align:left;background:#f5f5f5;padding:6px 8px;border-bottom:2px solid #ddd;}
      td{padding:6px 8px;border-bottom:1px solid #eee;}
      tfoot td{font-weight:700;border-top:2px solid #ddd;border-bottom:none;}
      button{margin-bottom:16px;padding:8px 16px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;}
      @media print{button{display:none;}}
    </style></head><body>
    <button onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
    <h1>Despesas do condomínio (não rateadas) — ${_c?.nome||''}</h1>
    <p class="sub">Gerado em ${new Date().toLocaleString('pt-BR')} — ${lista.length} registro(s) — por conta do proprietário, não cobradas do inquilino</p>
    <table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right;">Valor</th></tr></thead>
    <tbody>${linhas}</tbody>
    <tfoot><tr><td colspan="3">Total</td><td style="text-align:right;">${fmtBRL(total)}</td></tr></tfoot></table>
    </body></html>`);
  w.document.close();
}
