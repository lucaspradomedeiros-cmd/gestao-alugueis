// ============================================================
// IMOVEL MANAGEMENT
// ============================================================

function renderImoveis(){
  const grid = document.getElementById('imoveis-grid');
  const cnt  = document.getElementById('imoveis-count');
  if(!grid) return;
  cnt.textContent = `${imoveis.length} imóvel(is)`;

  if(!imoveis.length){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">
      Nenhum imóvel cadastrado. <button class="btn btn-primary" style="margin-left:10px;" onclick="openAddImovel()">+ Cadastrar primeiro imóvel</button></div>`;
    return;
  }

  grid.innerHTML = imoveis.map(im=>{
    const condoNome = im.gestao==='condominio'
      ? (condominios.find(c=>c.id===im.condoId)?.nome||'—') : null;
    const despAtivas = (im.despesas||[]).filter(d=>d.ativo).length;
    const despInqui  = (im.despesas||[]).filter(d=>d.ativo&&d.resp==='inquilino').length;
    const despProp   = (im.despesas||[]).filter(d=>d.ativo&&d.resp==='proprietario').length;
    const tenant = tenants.find(t=>t.imovelId===im.id && !t.vago);
    const tenantInfo = tenant
      ? `<div style="font-size:11px;color:var(--green);margin-top:4px;">👤 ${tenant.name.split(' ')[0]} · ${fmtBRL(tenant.rent)}/mês</div>`
      : `<div style="font-size:11px;color:var(--text-faint);margin-top:4px;">Sem inquilino vinculado</div>`;

    return `<div class="imovel-card ${im.gestao}" onclick="openIdet(${im.id})">
      <div class="imovel-header">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <div class="imovel-icon" style="background:${im.gestao==='condominio'?'var(--green-bg)':'var(--blue-bg)'};">
            ${{Apartamento:'🏢',Casa:'🏠','Sala Comercial':'🏪',Galpão:'🏭',Terreno:'🌿',Outro:'🏗'}[im.tipo]||'🏠'}
          </div>
          <div>
            <div class="imovel-title">${im.nome}</div>
            <div class="imovel-sub">${im.tipo}${im.endereco?' · '+im.endereco.substring(0,30)+(im.endereco.length>30?'…':''):''}</div>
          </div>
        </div>
        <span class="imovel-tag ${im.gestao==='condominio'?'condo':'auto'}">${im.gestao==='condominio'?'Condomínio':'Autônomo'}</span>
      </div>
      ${im.gestao==='condominio'
        ? `<div style="font-size:12px;color:var(--green);margin-bottom:8px;">🏘 ${condoNome}${im.condoUnit?' · '+im.condoUnit:''}</div>`
        : `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">📋 ${despAtivas} despesa(s) ativa(s) · ${despInqui} inquilino · ${despProp} proprietário</div>`}
      ${im.propNome?`<div style="font-size:11px;color:var(--text-muted);">🔑 Prop.: ${im.propNome}</div>`:''}
      ${tenantInfo}
    </div>`;
  }).join('');
}

function openAddImovel(){
  editingImovelId = null;
  document.getElementById('imovel-modal-title').textContent = 'Novo Imóvel';
  document.getElementById('im-nome').value = '';
  document.getElementById('im-tipo').value = 'Apartamento';
  document.getElementById('im-end').value = '';
  document.getElementById('im-prop-nome').value = '';
  document.getElementById('im-prop-tel').value = '';
  document.getElementById('im-autonomo').checked = true;
  document.getElementById('im-delete-row').style.display = 'none';
  onImovelGestaoChange();
  openOverlay('imovel-modal-overlay');
}

function openEditImovel(id){
  const im = getImovel(id);
  if(!im) return;
  editingImovelId = id;
  document.getElementById('imovel-modal-title').textContent = 'Editar Imóvel';
  document.getElementById('im-nome').value  = im.nome;
  document.getElementById('im-tipo').value  = im.tipo;
  document.getElementById('im-end').value   = im.endereco||'';
  document.getElementById('im-prop-nome').value = im.propNome||'';
  document.getElementById('im-prop-tel').value  = im.propTel||'';
  if(im.gestao==='condominio'){
    document.getElementById('im-condo-radio').checked = true;
  } else {
    document.getElementById('im-autonomo').checked = true;
  }
  document.getElementById('im-delete-row').style.display = 'block';
  document.getElementById('im-prop-cpf').value=im.propCpf||'';document.getElementById('im-prop-rg').value=im.propRg||'';document.getElementById('im-prop-rg-orgao').value=im.propRgOrgao||'';document.getElementById('im-prop-pix').value=im.propPix||'';document.getElementById('im-matricula').value=im.matricula||'';document.getElementById('im-cartorio').value=im.cartorio||'';document.getElementById('im-area').value=im.area||'';document.getElementById('im-descricao').value=im.descricao||'';
  onImovelGestaoChange();
  if(im.gestao==='condominio'){
    setTimeout(()=>{
      document.getElementById('im-condo-id').value = im.condoId||'';
      onImovelCondoChange();
      setTimeout(()=>{ document.getElementById('im-condo-unit').value = im.condoUnit||''; },0);
    },0);
  }
  openOverlay('imovel-modal-overlay');
}

function onImovelGestaoChange(){
  const isCondo = document.getElementById('im-condo-radio').checked;
  const row = document.getElementById('im-condo-sel-row');
  row.style.display = isCondo ? 'block' : 'none';
  if(isCondo){
    const sel = document.getElementById('im-condo-id');
    sel.innerHTML = condominios.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
    sel.onchange = onImovelCondoChange;
    onImovelCondoChange();
  }
}

function onImovelCondoChange(){
  const cid = document.getElementById('im-condo-id').value;
  const c = condominios.find(x=>x.id===cid);
  const usel = document.getElementById('im-condo-unit');
  usel.innerHTML = (c?.units||[]).map(u=>`<option value="${u}">${u}</option>`).join('');
}

function saveImovel(){
  const nome = document.getElementById('im-nome').value.trim();
  if(!nome){ alert('Informe o nome/identificação do imóvel.'); return; }
  const isCondo = document.getElementById('im-condo-radio').checked;

  if(editingImovelId){
    const im = getImovel(editingImovelId);
    im.nome     = nome;
    im.tipo     = document.getElementById('im-tipo').value;
    im.endereco = document.getElementById('im-end').value.trim();
    im.propNome = document.getElementById('im-prop-nome').value.trim();
    im.propTel  = document.getElementById('im-prop-tel').value.trim();
    im.propCpf=document.getElementById('im-prop-cpf').value.trim();im.propRg=document.getElementById('im-prop-rg').value.trim();im.propRgOrgao=document.getElementById('im-prop-rg-orgao').value.trim();im.propPix=document.getElementById('im-prop-pix').value.trim();im.matricula=document.getElementById('im-matricula').value.trim();im.cartorio=document.getElementById('im-cartorio').value.trim();im.area=document.getElementById('im-area').value;im.descricao=document.getElementById('im-descricao').value.trim();
    im.gestao   = isCondo ? 'condominio' : 'autonomo';
    if(isCondo){
      im.condoId   = document.getElementById('im-condo-id').value;
      im.condoUnit = document.getElementById('im-condo-unit').value;
    } else {
      delete im.condoId; delete im.condoUnit;
    }
  } else {
    const newId = imoveis.length ? Math.max(...imoveis.map(x=>x.id))+1 : 1;
    imoveis.push({
      id: newId,
      nome, tipo: document.getElementById('im-tipo').value,
      endereco: document.getElementById('im-end').value.trim(),
      propNome: document.getElementById('im-prop-nome').value.trim(),
      propTel:  document.getElementById('im-prop-tel').value.trim(),
      propCpf:document.getElementById('im-prop-cpf').value.trim(),propRg:document.getElementById('im-prop-rg').value.trim(),propRgOrgao:document.getElementById('im-prop-rg-orgao').value.trim(),propPix:document.getElementById('im-prop-pix').value.trim(),matricula:document.getElementById('im-matricula').value.trim(),cartorio:document.getElementById('im-cartorio').value.trim(),area:document.getElementById('im-area').value,descricao:document.getElementById('im-descricao').value.trim(),
      gestao:   isCondo ? 'condominio' : 'autonomo',
      condoId:  isCondo ? document.getElementById('im-condo-id').value   : undefined,
      condoUnit:isCondo ? document.getElementById('im-condo-unit').value : undefined,
      despesas: []
    });
  }
  closeOverlay('imovel-modal-overlay');
  renderImoveis();
  if(typeof SYNC_ENGINE !== 'undefined'){
    const imovelIdx = imoveis.findIndex(x => x.id === (editingImovelId || imoveis[imoveis.length-1]?.id));
    if(imovelIdx >= 0){
      SYNC_ENGINE.onChange(`imoveis.${imovelIdx}.nome`, '', imoveis[imovelIdx].nome);
    }
  }
  saveToStorage();
}

function deleteImovel(){
  if(!confirm('Excluir este imóvel e todas as suas despesas?')) return;
  imoveis = imoveis.filter(x=>x.id!==editingImovelId);
  closeOverlay('imovel-modal-overlay');
  renderImoveis();
  saveToStorage();
}
