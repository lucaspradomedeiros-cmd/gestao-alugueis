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
