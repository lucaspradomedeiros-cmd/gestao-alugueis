// ============================================================
// TENANT MODAL — Add/Edit tenant
// ============================================================

function populateTenantUnitSelectAll(selectedVal){
  const sel = document.getElementById('f-unit-sel');
  sel.innerHTML = '';

  // Group 1: Imóveis autônomos cadastrados
  if(imoveis.filter(im=>im.gestao==='autonomo').length){
    const grp = document.createElement('optgroup');
    grp.label = '🏠 Imóveis Autônomos';
    imoveis.filter(im=>im.gestao==='autonomo').forEach(im=>{
      const opt = document.createElement('option');
      opt.value = `__im__${im.id}`;
      opt.textContent = `${im.nome}${im.endereco?' — '+im.endereco.substring(0,30):''}`;
      if(opt.value===selectedVal) opt.selected = true;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  }

  // Group 2+: one per condo
  condominios.forEach(c=>{
    const grp = document.createElement('optgroup');
    grp.label = `🏘 ${c.nome}`;
    c.units.forEach(u=>{
      const opt = document.createElement('option');
      opt.value = `__condo__${c.id}__${u}`;
      opt.textContent = u;
      if(opt.value===selectedVal) opt.selected = true;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  });

  // Fallback: if nothing selected, select first
  if(!sel.value && sel.options.length) sel.selectedIndex = 0;
  onTenantUnitChange();
}

// Keep old name as alias so openEditTenant still works
function populateTenantCondoSelect(selectedCondoId, selectedUnit, selectedImovelId){
  // Build the composite value for the unified select
  let selectedVal = '';
  if(selectedImovelId) selectedVal = `__im__${selectedImovelId}`;
  else if(selectedCondoId && selectedUnit) selectedVal = `__condo__${selectedCondoId}__${selectedUnit}`;
  populateTenantUnitSelectAll(selectedVal);
}

function onTenantUnitChange(){
  const val = document.getElementById('f-unit-sel')?.value || '';
  const info = document.getElementById('f-unit-info');
  if(!info) return;
  if(val.startsWith('__im__')){
    const imId = parseInt(val.replace('__im__',''));
    const im = getImovel(imId);
    info.innerHTML = im
      ? `<span style="color:var(--blue);">🏠 Imóvel autônomo${im.propNome?' · Prop: '+im.propNome:''}</span>`
      : '';
  } else if(val.startsWith('__condo__')){
    const parts = val.split('__').filter(Boolean);
    const condoId = parts[1];
    const c = condominios.find(x=>x.id===condoId);
    info.innerHTML = c
      ? `<span style="color:var(--green);">🏘 ${c.nome} · Rateio automático de condomínio</span>`
      : '';
  } else {
    info.textContent = '';
  }
}

function onTenantCondoChange(){ onTenantUnitChange(); }

function openAddTenant(){
  editingTenantId = null;
  document.getElementById('add-tenant-title').textContent = 'Novo Locatário';
  document.getElementById('save-tenant-btn').textContent = 'Salvar';
  populateTenantUnitSelectAll('');
  document.getElementById('f-name').value = '';
  document.getElementById('f-tel').value = '';
  document.getElementById('f-rent').value = '';
  document.getElementById('f-start').value = '';
  document.getElementById('f-end').value = '';
  document.getElementById('f-reajuste').value = '';
  document.getElementById('f-vencto').value = '5';
  document.getElementById('f-garantia').value = 'Fiadores';
  // novos campos contrato
  ['f-cpf','f-rg','f-rg-orgao','f-profissao','f-end-loc','f-bairro-loc','f-cidade-uf','f-cep-loc','f-email-loc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const fn=document.getElementById('f-nacionalidade');if(fn)fn.value='brasileiro(a)';
  const fce=document.getElementById('f-estado-civil');if(fce)fce.value='solteiro(a)';
  // fiadores
  ['fi1-nome','fi1-cpf','fi1-rg','fi1-rg-orgao','fi1-prof','fi1-tel','fi1-end','fi2-nome','fi2-cpf','fi2-rg','fi2-rg-orgao','fi2-prof','fi2-tel','fi2-end'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('tenant-contr-fields').style.display='none';
  document.getElementById('tenant-contr-btn').textContent='▶ Dados para Contrato de Aluguel';
  tenantToggleFiadores();
  openOverlay('add-tenant-overlay');
}

function openEditTenant(id){
  const t = tenants.find(x=>x.id===id);
  if(!t) return;
  editingTenantId = id;
  document.getElementById('add-tenant-title').textContent = 'Editar Locatário';
  document.getElementById('save-tenant-btn').textContent = 'Atualizar';
  // Build the correct selectedVal
  let selectedVal = '';
  if(t.imovelId) selectedVal = `__im__${t.imovelId}`;
  else if(t.condoId && t.unit) selectedVal = `__condo__${t.condoId}__${t.unit}`;
  populateTenantUnitSelectAll(selectedVal);
  document.getElementById('f-name').value      = t.name;
  document.getElementById('f-tel').value       = t.tel;
  document.getElementById('f-rent').value      = t.rent;
  document.getElementById('f-start').value     = t.start||'';
  document.getElementById('f-end').value       = t.end||'';
  document.getElementById('f-reajuste').value  = t.reajuste||'';
  document.getElementById('f-vencto').value    = t.vencDia||5;
  document.getElementById('f-garantia').value  = t.garantia||'Fiadores';
  // novos campos contrato
  const mapC=[['f-cpf','cpf'],['f-rg','rg'],['f-rg-orgao','rgOrgao'],['f-profissao','profissao'],['f-end-loc','endLoc'],['f-bairro-loc','bairroLoc'],['f-cidade-uf','cidadeUf'],['f-cep-loc','cepLoc'],['f-email-loc','emailLoc'],['f-nacionalidade','nacionalidade'],];
  mapC.forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.value=t[k]||'';});
  const fce=document.getElementById('f-estado-civil');if(fce)fce.value=t.estadoCivil||'solteiro(a)';
  // fiadores
  const fi=t.fiadores||[];
  const mapF=[[0,['fi1-nome','nome'],['fi1-cpf','cpf'],['fi1-rg','rg'],['fi1-rg-orgao','rgOrgao'],['fi1-civil','estadoCivil'],['fi1-prof','profissao'],['fi1-tel','tel'],['fi1-end','endereco']],[1,['fi2-nome','nome'],['fi2-cpf','cpf'],['fi2-rg','rg'],['fi2-rg-orgao','rgOrgao'],['fi2-civil','estadoCivil'],['fi2-prof','profissao'],['fi2-tel','tel'],['fi2-end','endereco']]];
  mapF.forEach(([idx,...fields])=>{const f=fi[idx]||{};fields.forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.value=f[k]||'';});});
  tenantToggleFiadores();
  openOverlay('add-tenant-overlay');
}

function closeAddTenant(){
  closeOverlay('add-tenant-overlay');
  editingTenantId = null;
}

function saveTenant(){
  const rawUnit = document.getElementById('f-unit-sel').value;
  const name    = document.getElementById('f-name').value||'Locatário';

  // Decode the composite value
  let imovelId = null, condoId = null, unit = '';
  if(rawUnit.startsWith('__im__')){
    imovelId = parseInt(rawUnit.replace('__im__',''));
    const im = getImovel(imovelId);
    unit = im?.nome || rawUnit;
    condoId = null;
  } else if(rawUnit.startsWith('__condo__')){
    // format: __condo__<condoId>__<unit>
    const withoutPrefix = rawUnit.replace('__condo__','');
    const sepIdx = withoutPrefix.indexOf('__');
    condoId = withoutPrefix.substring(0, sepIdx);
    unit    = withoutPrefix.substring(sepIdx + 2);
    imovelId = null;
  } else {
    // fallback: plain unit name (legacy)
    unit = rawUnit;
    condoId = activeCondoId;
  }

  if(editingTenantId){
    const t = tenants.find(x=>x.id===editingTenantId);
    if(!t){ closeAddTenant(); return; }
    const oldName = t.name;
    const oldRent = t.rent;
    t.condoId   = condoId;
    t.imovelId  = imovelId;
    t.unit      = unit;
    t.name      = name;
    t.tel       = document.getElementById('f-tel').value||'—';
    t.rent      = R(document.getElementById('f-rent').value);
    t.start     = document.getElementById('f-start').value;
    t.end       = document.getElementById('f-end').value;
    t.reajuste  = document.getElementById('f-reajuste').value;
    t.garantia  = document.getElementById('f-garantia').value;
    t.vencDia   = parseInt(document.getElementById('f-vencto').value)||5;
    t.cpf=document.getElementById('f-cpf').value||'';t.rg=document.getElementById('f-rg').value||'';t.rgOrgao=document.getElementById('f-rg-orgao').value||'';t.profissao=document.getElementById('f-profissao').value||'';t.endLoc=document.getElementById('f-end-loc').value||'';t.bairroLoc=document.getElementById('f-bairro-loc').value||'';t.cidadeUf=document.getElementById('f-cidade-uf').value||'';t.cepLoc=document.getElementById('f-cep-loc').value||'';t.emailLoc=document.getElementById('f-email-loc').value||'';t.nacionalidade=document.getElementById('f-nacionalidade').value||'brasileiro(a)';t.estadoCivil=document.getElementById('f-estado-civil').value||'solteiro(a)';
    t.fiadores=lerFiadoresForm();

    // Registrar mudanças do inquilino
    if(oldName !== t.name) SYNC_ENGINE.onChange(`tenants.${t.id}.name`, oldName, t.name);
    if(oldRent !== t.rent) SYNC_ENGINE.onChange(`tenants.${t.id}.rent`, oldRent, t.rent);

    closeAddTenant();
    renderDashboard();
    saveToStorage();
    alert(`✓ ${t.name} atualizado!`);
  } else {
    const tenantId = tenants.length ? Math.max(...tenants.map(x=>x.id))+1 : 1;
    const t = {
      id: tenantId,
      condoId, imovelId, unit, name,
      tel:      document.getElementById('f-tel').value||'—',
      rent:     R(document.getElementById('f-rent').value),
      start:    document.getElementById('f-start').value,
      end:      document.getElementById('f-end').value,
      reajuste: document.getElementById('f-reajuste').value,
      garantia: document.getElementById('f-garantia').value,
      vencDia:  parseInt(document.getElementById('f-vencto').value)||5,
      cpf:document.getElementById('f-cpf').value||'',rg:document.getElementById('f-rg').value||'',rgOrgao:document.getElementById('f-rg-orgao').value||'',profissao:document.getElementById('f-profissao').value||'',endLoc:document.getElementById('f-end-loc').value||'',bairroLoc:document.getElementById('f-bairro-loc').value||'',cidadeUf:document.getElementById('f-cidade-uf').value||'',cepLoc:document.getElementById('f-cep-loc').value||'',emailLoc:document.getElementById('f-email-loc').value||'',nacionalidade:document.getElementById('f-nacionalidade').value||'brasileiro(a)',estadoCivil:document.getElementById('f-estado-civil').value||'solteiro(a)',
      fiadores:lerFiadoresForm(),
      history:  []
    };
    tenants.push(t);

    // Registrar novo inquilino
    SYNC_ENGINE.onChange(`tenants.${tenantId}.name`, null, name);

    closeAddTenant();
    renderDashboard();
    saveToStorage();
    const im = imovelId ? getImovel(imovelId) : null;
    const destino = im ? im.nome : (condominios.find(c=>c.id===condoId)?.nome || unit);
    alert(`✓ ${t.name} vinculado a ${destino}!`);
  }
}
