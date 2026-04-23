// ============================================================
// MÓDULO CLIENTES (ADVOCACIA)
// ============================================================

const PROC_STATUS_LABEL = {
  em_andamento:'Em Andamento', aguardando_audiencia:'Aguardando Audiência',
  aguardando_sentenca:'Aguardando Sentença', recurso:'Em Recurso',
  encerrado_favoravel:'Encerrado — Favorável', encerrado_desfavoravel:'Encerrado — Desfavorável',
  arquivado:'Arquivado'
};
const DOC_ICONS = {procuracao:'📜', honorarios:'📋', hipossuficiencia:'📝', recibo:'🧾', contrato_aluguel:'🏠'};
const DOC_NOMES = {procuracao:'Procuração', honorarios:'Contrato de Honorários', hipossuficiencia:'Hipossuficiência', recibo:'Recibo', contrato_aluguel:'Contrato de Aluguel'};

// ── Helpers ──────────────────────────────────────────────
function formatarCPF(input){
  let v=input.value.replace(/\D/g,'').slice(0,11);
  if(v.length>9) v=v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,'$1.$2.$3-$4');
  else if(v.length>6) v=v.replace(/(\d{3})(\d{3})(\d{1,3})/,'$1.$2.$3');
  else if(v.length>3) v=v.replace(/(\d{3})(\d{1,3})/,'$1.$2');
  input.value=v;
}
function cpfValido(cpf){
  cpf=cpf.replace(/\D/g,'');
  if(cpf.length!==11||/^(\d)\1+$/.test(cpf)) return false;
  let s=0,r;
  for(let i=0;i<9;i++) s+=parseInt(cpf[i])*(10-i);
  r=11-(s%11); if(r>=10) r=0; if(r!==parseInt(cpf[9])) return false;
  s=0;
  for(let i=0;i<10;i++) s+=parseInt(cpf[i])*(11-i);
  r=11-(s%11); if(r>=10) r=0;
  return r===parseInt(cpf[10]);
}
function formatarCEP(input){
  let v=input.value.replace(/\D/g,'').slice(0,8);
  if(v.length>5) v=v.replace(/(\d{5})(\d{1,3})/,'$1-$2');
  input.value=v;
}
function validarCPFAdv(){
  const inp=document.getElementById('cla-cpf');
  const hint=document.getElementById('hint-cla-cpf');
  const cpf=inp.value.replace(/\D/g,'');
  if(!cpf){hint.textContent='';hint.className='mhint';return;}
  if(cpfValido(cpf)){hint.textContent='✓ CPF válido';hint.className='mhint ok';}
  else{hint.textContent='✕ CPF inválido';hint.className='mhint err';}
}
async function buscarCEPAdv(){
  const cep=document.getElementById('cla-cep').value.replace(/\D/g,'');
  const hint=document.getElementById('hint-cla-cep');
  if(cep.length!==8) return;
  hint.textContent='⏳ Buscando...'; hint.className='mhint';
  try{
    const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d=await r.json();
    if(d.erro){hint.textContent='✕ CEP não encontrado';hint.className='mhint err';return;}
    if(d.logradouro) document.getElementById('cla-end').value=d.logradouro;
    if(d.bairro) document.getElementById('cla-bairro').value=d.bairro;
    if(d.localidade) document.getElementById('cla-cidade').value=d.localidade;
    if(d.uf) document.getElementById('cla-uf').value=d.uf.toUpperCase();
    hint.textContent=`✓ ${d.localidade}/${d.uf}`;hint.className='mhint ok';
  }catch{hint.textContent='Erro ao buscar CEP';hint.className='mhint err';}
}

// ── Status financeiro ─────────────────────────────────────────
function statusFinAdv(c){
  const blocos=[];
  if(c.contrato) blocos.push(c.contrato.parcelas||[]);
  (c.servicos||[]).forEach(sv=>blocos.push(sv.parcelas||[]));
  const todas=blocos.flat();
  if(!todas.length) return 'sem_contrato';
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  if(todas.some(p=>!p.pago&&new Date(p.vencimento+'T12:00:00')<hoje)) return 'atrasado';
  if(todas.every(p=>p.pago)) return 'quitado';
  return 'em_dia';
}
function badgeFinAdv(c){
  const s=statusFinAdv(c);
  if(s==='atrasado') return '<span class="cli-badge verm">Atrasado</span>';
  if(s==='quitado') return '<span class="cli-badge verde">Quitado</span>';
  if(s==='em_dia') return '<span class="cli-badge ouro">Em dia</span>';
  return '<span class="cli-badge cinza">Sem contrato</span>';
}

// ── Lista de Clientes ─────────────────────────────────────────
function renderClientesAdv(){
  const q=(document.getElementById('busca-clientes-adv')?.value||'').toLowerCase();
  let lista=clientesAdv;
  if(q) lista=lista.filter(c=>(c.nome||'').toLowerCase().includes(q)||(c.cpf||'').includes(q)||(c.cidade||'').toLowerCase().includes(q));
  const el=document.getElementById('lista-clientes-adv');
  if(!el) return;
  const countEl=document.getElementById('clientes-count');
  if(countEl) countEl.textContent=`${clientesAdv.length} cliente${clientesAdv.length!==1?'s':''}`;
  if(!lista.length){
    el.innerHTML=`<div class="empty-state"><div class="icon">👥</div><div class="msg">${q?'Nenhum cliente encontrado.':'Nenhum cliente cadastrado ainda.'}</div>${!q?'<button class="btn btn-primary" onclick="abrirCliModal()">+ Cadastrar Primeiro Cliente</button>':''}</div>`;
    return;
  }
  el.innerHTML=lista.sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')).map(c=>{
    const procs=(c.processos||[]).length;
    return `<div class="cli-card" onclick="abrirFichaAdv('${c.id}')">
      <div class="cli-avatar">${(c.nome||'?')[0]}</div>
      <div class="cli-info">
        <div class="cli-nome">${c.nome}</div>
        <div class="cli-sub">CPF: ${c.cpf||'—'} · ${c.cidade||''}${c.uf?'/'+c.uf:''}</div>
      </div>
      <div class="cli-badges">
        ${procs?`<span class="cli-badge azul">${procs} processo${procs>1?'s':''}</span>`:''}
        ${badgeFinAdv(c)}
      </div>
    </div>`;
  }).join('');
}

// ── Ficha do Cliente ──────────────────────────────────────────
function abrirFichaAdv(id){
  clienteAdvAtualId=id;
  const c=clientesAdv.find(x=>x.id===id);
  if(!c) return;
  document.getElementById('ficha-adv-avatar').textContent=(c.nome||'?')[0];
  document.getElementById('ficha-adv-nome').textContent=c.nome;
  document.getElementById('ficha-adv-sub').textContent=`CPF: ${c.cpf||'—'} · ${c.telefone||'—'} · ${c.email||'—'}`;
  mostrarAbaAdv('dados');
  renderFichaAdvDados(c);
  renderFichaAdvProcessos(c);
  renderFichaAdvFinanceiro(c);
  renderFichaAdvServicos(c);
  renderFichaAdvDocs(c);
  document.getElementById('page-title').textContent=c.nome;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-ficha-adv').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const navEl=document.querySelector(`[onclick="showPage('clientes')"]`);
  if(navEl) navEl.classList.add('active');
}

function mostrarAbaAdv(aba){
  document.querySelectorAll('.adv-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.adv-tab-content').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-adv-'+aba).classList.add('active');
  document.querySelectorAll('.adv-tab').forEach(t=>{
    if(t.getAttribute('onclick')&&t.getAttribute('onclick').includes("'"+aba+"'")) t.classList.add('active');
  });
}

function renderFichaAdvDados(c){
  const rows=[
    ['Nome',c.nome],['Nacionalidade',c.nacionalidade],['Estado Civil',c.estadoCivil],
    ['Profissão',c.profissao||'—'],['CPF',c.cpf||'—'],
    ['RG',c.rg?`${c.rg}${c.rgOrgao?' — '+c.rgOrgao:''}`:'—'],
    ['E-mail',c.email||'—'],['Telefone',c.telefone||'—'],
    ['Endereço',[c.endereco,c.bairro,c.cidade&&c.uf?`${c.cidade}/${c.uf}`:(c.cidade||''),c.cep].filter(Boolean).join(', ')||'—'],
  ];
  document.getElementById('adv-dados-content').innerHTML=
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;">
      ${rows.map(([l,v])=>`<div style="border-bottom:1px solid var(--border);padding:8px 0;">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text-faint);margin-bottom:2px;">${l}</div>
        <div style="font-size:13px;font-weight:500;">${v||'—'}</div>
      </div>`).join('')}
    </div>`;
}

function renderFichaAdvProcessos(c){
  const el=document.getElementById('adv-processos-list');
  if(!el) return;
  const procs=c.processos||[];
  if(!procs.length){el.innerHTML='<div class="empty-state"><div class="icon">⚖️</div><div class="msg">Nenhum processo cadastrado.</div></div>';return;}
  el.innerHTML=procs.map(p=>{
    const ativo=!p.status.startsWith('encerrado')&&p.status!=='arquivado';
    return `<div class="proc-item">
      <div class="proc-header">
        <div class="proc-tipo">⚖️ ${p.tipoAcao}</div>
        <span class="cli-badge ${ativo?'azul':'cinza'}">${PROC_STATUS_LABEL[p.status]||p.status}</span>
        <div class="proc-acoes">
          <button class="btn" style="font-size:12px;padding:5px 9px;" onclick="abrirProcModal('${p.id}')">✏️</button>
        </div>
      </div>
      ${p.numero?`<div style="font-size:12px;color:var(--text-muted);">Nº ${p.numero}</div>`:''}
      ${p.vara?`<div style="font-size:12px;color:var(--text-muted);">${p.vara}${p.comarca?' · '+p.comarca:''}</div>`:''}
      ${p.dataInicio?`<div style="font-size:11px;color:var(--text-faint);margin-top:3px;">Início: ${new Date(p.dataInicio+'T12:00:00').toLocaleDateString('pt-BR')}</div>`:''}
      ${p.obs?`<div style="font-size:12px;color:var(--text-faint);margin-top:4px;font-style:italic;">${p.obs}</div>`:''}
    </div>`;
  }).join('');
}

function renderFichaAdvFinanceiro(c){
  const el=document.getElementById('adv-financeiro-content');
  if(!el) return;
  const temContrato=!!c.contrato, svs=c.servicos||[];
  if(!temContrato&&!svs.length){
    el.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;">
      <div class="empty-state"><div class="icon">💰</div><div class="msg">Nenhum registro financeiro ainda.<br>Lance um Contrato de Honorários ou um Serviço Avulso.</div>
      <button class="btn btn-primary" onclick="abrirContrModal()">+ Lançar Contrato</button></div></div>`;
    return;
  }
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const blocos=[];
  if(temContrato) blocos.push({id:'contrato',icon:'📋',nome:'Contrato de Honorários',parcelas:c.contrato.parcelas||[],totalBase:parseFloat(c.contrato.total)||0});
  svs.forEach(sv=>{
    const t=parseFloat((sv.valorTotal||'0').replace(/[^0-9,.]/g,'').replace(',','.'));
    blocos.push({id:sv.id,icon:'🛎',nome:sv.tipo,sub:sv.descricao,parcelas:sv.parcelas||[],totalBase:t,data:sv.data});
  });
  const totalGeral=blocos.reduce((a,b)=>a+b.totalBase,0);
  const pagoGeral=blocos.reduce((a,b)=>a+b.parcelas.filter(p=>p.pago).reduce((x,p)=>x+parseFloat(p.valorPago||p.valor||0),0),0);
  const pendGeral=totalGeral-pagoGeral;
  const atrasGeral=blocos.reduce((a,b)=>a+b.parcelas.filter(p=>!p.pago&&new Date(p.vencimento+'T12:00:00')<hoje).length,0);

  function blocoHTML(b){
    const pago=b.parcelas.filter(p=>p.pago).reduce((a,p)=>a+parseFloat(p.valorPago||p.valor||0),0);
    const pend=b.totalBase-pago;
    const badge=pend<=0?'<span class="cli-badge verde">Quitado</span>':pago>0?'<span class="cli-badge ouro">Em andamento</span>':'<span class="cli-badge cinza">Pendente</span>';
    const rows=b.parcelas.map((p,i)=>{
      const venc=new Date(p.vencimento+'T12:00:00');
      const atrasado=!p.pago&&venc<hoje;
      const cls=p.pago?'pago':atrasado?'atrasado':'pendente';
      return `<div class="parcela-row ${cls}">
        <div class="p-dot"></div>
        <div class="p-label">${p.label||(i+1)+'ª'}</div>
        <div class="p-data">${venc.toLocaleDateString('pt-BR')}${p.pago?` · Pago em ${new Date(p.dataPagamento+'T12:00:00').toLocaleDateString('pt-BR')} via ${p.forma||''}`:atrasado?' · ⚠ Atrasada':''}</div>
        <div class="p-valor">${fmtBRL(parseFloat(p.valor||0))}</div>
        <div style="display:flex;gap:5px;flex-shrink:0;">
          ${!p.pago
            ?`<button class="btn btn-primary" style="font-size:11px;padding:5px 10px;" onclick="abrirPagModal('${b.id}',${i})">✓ Pagar</button>`
            :`<button class="btn" style="font-size:11px;padding:5px 10px;" onclick="gerarReciboAdv('${b.id}',${i})">🧾 Recibo</button>
              <button class="btn" style="font-size:11px;padding:5px 10px;color:var(--red);" onclick="estornarPagAdv('${b.id}',${i})" title="Estornar">↩</button>`}
        </div>
      </div>`;
    }).join('');
    return `<div class="fin-bloco">
      <div class="fin-bloco-hdr">
        <span class="fb-icon">${b.icon}</span>
        <div style="flex:1;"><div class="fb-nome">${b.nome}</div>${b.sub?`<div style="font-size:11px;color:var(--text-muted);">${b.sub}</div>`:''}${b.data?`<div style="font-size:11px;color:var(--text-faint);">${new Date(b.data+'T12:00:00').toLocaleDateString('pt-BR')}</div>`:''}</div>
        ${badge}
        <div style="text-align:right;margin-left:10px;">
          <div style="font-size:11px;color:var(--text-faint);">Total</div>
          <div class="fb-total">${fmtBRL(b.totalBase)}</div>
          ${pago>0?`<div style="font-size:11px;color:var(--green);">Rec: ${fmtBRL(pago)}</div>`:''}
          ${pend>0?`<div style="font-size:11px;color:var(--red);">Pend: ${fmtBRL(pend)}</div>`:''}
        </div>
      </div>
      <div class="fin-bloco-body">${rows}</div>
    </div>`;
  }

  el.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:14px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <div style="font-weight:600;font-size:14px;">💰 Resumo Financeiro</div>
      <div style="display:flex;gap:8px;">
        <button class="btn" style="font-size:12px;" onclick="abrirContrModal()">+ Contrato</button>
        <button class="btn" style="font-size:12px;" onclick="emitirExtratoAdv()">📊 Extrato</button>
      </div>
    </div>
    <div class="fin-cards">
      <div class="fin-card ouro"><div class="fc-val">${fmtBRL(totalGeral)}</div><div class="fc-lbl">Total</div></div>
      <div class="fin-card verde"><div class="fc-val">${fmtBRL(pagoGeral)}</div><div class="fc-lbl">Recebido</div></div>
      <div class="fin-card ${pendGeral>0?'verm':'verde'}"><div class="fc-val">${fmtBRL(pendGeral)}</div><div class="fc-lbl">Pendente</div></div>
      <div class="fin-card ${atrasGeral>0?'verm':''}"><div class="fc-val">${atrasGeral}</div><div class="fc-lbl">Atrasadas</div></div>
    </div>
  </div>
  ${blocos.map(blocoHTML).join('')}`;
}

function renderFichaAdvServicos(c){
  const el=document.getElementById('adv-servicos-list');
  if(!el) return;
  const svs=c.servicos||[];
  if(!svs.length){el.innerHTML='<div class="empty-state"><div class="icon">🛎</div><div class="msg">Nenhum serviço avulso lançado.</div></div>';return;}
  el.innerHTML=svs.slice().reverse().map(sv=>{
    const total=parseFloat((sv.valorTotal||'0').replace(/[^0-9,.]/g,'').replace(',','.'));
    const pago=(sv.parcelas||[]).filter(p=>p.pago).reduce((a,p)=>a+parseFloat(p.valorPago||p.valor||0),0);
    const pend=total-pago;
    const badge=pend<=0?'<span class="cli-badge verde">Quitado</span>':pago>0?'<span class="cli-badge ouro">Parcial</span>':'<span class="cli-badge cinza">Pendente</span>';
    return `<div class="sv-item">
      <div class="sv-header">
        <div style="flex:1;">
          <div style="font-weight:600;font-size:13px;">🛎 ${sv.tipo}${sv.descricao?' — <span style="font-weight:400;">'+sv.descricao+'</span>':''}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${sv.data?new Date(sv.data+'T12:00:00').toLocaleDateString('pt-BR'):''} · Total: ${fmtBRL(total)} · Recebido: ${fmtBRL(pago)}</div>
        </div>
        <div class="sv-acoes">${badge}<button class="btn" style="font-size:12px;padding:5px 9px;" onclick="abrirSvModal('${sv.id}')">✏️</button></div>
      </div>
    </div>`;
  }).join('');
}

function renderFichaAdvDocs(c){
  const el=document.getElementById('adv-docs-list');
  if(!el) return;
  const docs=(c.documentos||[]).slice().reverse();
  if(!docs.length){el.innerHTML='<div class="empty-state"><div class="icon">📄</div><div class="msg">Nenhum documento gerado ainda.<br><span style="font-size:11px;">A geração de documentos será adicionada na Fase 3.</span></div></div>';return;}
  el.innerHTML=docs.map(d=>`<div class="doc-hist-item">
    <div class="doc-hist-icon">${DOC_ICONS[d.tipo]||'📄'}</div>
    <div class="doc-hist-info">
      <div class="dhi-tipo">${DOC_NOMES[d.tipo]||d.tipo}</div>
      <div class="dhi-data">${new Date(d.geradoEm).toLocaleDateString('pt-BR')} às ${new Date(d.geradoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
    </div>
  </div>`).join('');
}

// ── Modal Cliente ─────────────────────────────────────────────
function abrirCliModal(id){
  _editCliId=id||null;
  document.getElementById('cli-modal-titulo').textContent=id?'Editar Cliente':'Novo Cliente';
  document.getElementById('cla-btn-del').style.display=id?'inline-flex':'none';
  const campos=['nome','cpf','rg','rg-orgao','prof','email','tel','cep','end','bairro','cidade','uf'];
  if(id){
    const c=clientesAdv.find(x=>x.id===id);
    if(c){
      document.getElementById('cla-nome').value=c.nome||'';
      document.getElementById('cla-cpf').value=c.cpf||'';
      document.getElementById('cla-rg').value=c.rg||'';
      document.getElementById('cla-rg-orgao').value=c.rgOrgao||'';
      document.getElementById('cla-prof').value=c.profissao||'';
      document.getElementById('cla-email').value=c.email||'';
      document.getElementById('cla-tel').value=c.telefone||'';
      document.getElementById('cla-cep').value=c.cep||'';
      document.getElementById('cla-end').value=c.endereco||'';
      document.getElementById('cla-bairro').value=c.bairro||'';
      document.getElementById('cla-cidade').value=c.cidade||'';
      document.getElementById('cla-uf').value=c.uf||'';
      document.getElementById('cla-nac').value=c.nacionalidade||'brasileiro(a)';
      document.getElementById('cla-civil').value=c.estadoCivil||'solteiro(a)';
    }
  } else {
    campos.forEach(f=>{ const el=document.getElementById('cla-'+f); if(el) el.value=''; });
    document.getElementById('cla-nac').value='brasileiro(a)';
    document.getElementById('cla-civil').value='solteiro(a)';
  }
  document.getElementById('hint-cla-cpf').textContent='';
  document.getElementById('hint-cla-cep').textContent='';
  openOverlay('cli-modal-overlay');
}
function fecharCliModal(){ closeOverlay('cli-modal-overlay'); }

function salvarClienteAdv(){
  const nome=document.getElementById('cla-nome').value.trim().toUpperCase();
  if(!nome){ gaToast('Informe o nome do cliente.','error'); return; }
  const dados={
    id: _editCliId||('ca_'+Date.now()),
    nome,
    cpf: document.getElementById('cla-cpf').value.trim(),
    rg: document.getElementById('cla-rg').value.trim(),
    rgOrgao: document.getElementById('cla-rg-orgao').value.trim(),
    profissao: document.getElementById('cla-prof').value.trim(),
    email: document.getElementById('cla-email').value.trim(),
    telefone: document.getElementById('cla-tel').value.trim(),
    cep: document.getElementById('cla-cep').value.trim(),
    endereco: document.getElementById('cla-end').value.trim(),
    bairro: document.getElementById('cla-bairro').value.trim(),
    cidade: document.getElementById('cla-cidade').value.trim(),
    uf: document.getElementById('cla-uf').value.trim().toUpperCase(),
    nacionalidade: document.getElementById('cla-nac').value,
    estadoCivil: document.getElementById('cla-civil').value,
  };
  if(_editCliId){
    const idx=clientesAdv.findIndex(x=>x.id===_editCliId);
    if(idx>=0){
      dados.processos=clientesAdv[idx].processos;
      dados.documentos=clientesAdv[idx].documentos;
      dados.contrato=clientesAdv[idx].contrato;
      dados.servicos=clientesAdv[idx].servicos;
      dados.criadoEm=clientesAdv[idx].criadoEm;
      clientesAdv[idx]=dados;
    }
  } else {
    dados.processos=[]; dados.documentos=[]; dados.servicos=[];
    dados.criadoEm=Date.now();
    clientesAdv.push(dados);
  }
  saveToStorage();
  fecharCliModal();
  gaToast(_editCliId?'Cliente atualizado!':'Cliente cadastrado!');
  if(_editCliId&&clienteAdvAtualId===_editCliId) abrirFichaAdv(_editCliId);
  else renderClientesAdv();
}

function excluirClienteAdvModal(){
  const c=clientesAdv.find(x=>x.id===_editCliId);
  if(!c||!confirm(`Excluir cliente "${c.nome}"? Esta ação não pode ser desfeita.`)) return;
  clientesAdv=clientesAdv.filter(x=>x.id!==_editCliId);
  saveToStorage();
  fecharCliModal();
  gaToast('Cliente excluído.');
  showPage('clientes');
}
function excluirClienteAdv(){
  const c=clientesAdv.find(x=>x.id===clienteAdvAtualId);
  if(!c||!confirm(`Excluir cliente "${c.nome}"?`)) return;
  clientesAdv=clientesAdv.filter(x=>x.id!==clienteAdvAtualId);
  saveToStorage();
  gaToast('Cliente excluído.');
  showPage('clientes');
}

// ── Modal Processo ────────────────────────────────────────────
function abrirProcModal(id){
  _editProcId=id||null;
  document.getElementById('proc-modal-titulo').textContent=id?'Editar Processo':'Novo Processo';
  document.getElementById('pra-btn-del').style.display=id?'inline-flex':'none';
  if(id){
    const c=clientesAdv.find(x=>x.id===clienteAdvAtualId);
    const p=(c?.processos||[]).find(x=>x.id===id);
    if(p){
      document.getElementById('pra-tipo').value=p.tipoAcao||'';
      document.getElementById('pra-numero').value=p.numero||'';
      document.getElementById('pra-vara').value=p.vara||'';
      document.getElementById('pra-comarca').value=p.comarca||'';
      document.getElementById('pra-status').value=p.status||'em_andamento';
      document.getElementById('pra-data').value=p.dataInicio||'';
      document.getElementById('pra-obs').value=p.obs||'';
    }
  } else {
    ['pra-tipo','pra-numero','pra-vara','pra-comarca','pra-obs'].forEach(x=>document.getElementById(x).value='');
    document.getElementById('pra-status').value='em_andamento';
    document.getElementById('pra-data').value=new Date().toISOString().split('T')[0];
  }
  openOverlay('proc-modal-overlay');
}
function fecharProcModal(){ closeOverlay('proc-modal-overlay'); }

function salvarProcessoAdv(){
  const tipo=document.getElementById('pra-tipo').value.trim();
  if(!tipo){ gaToast('Informe o tipo de ação.','error'); return; }
  const idx=clientesAdv.findIndex(x=>x.id===clienteAdvAtualId);
  if(idx<0) return;
  const proc={
    id: _editProcId||('pr_'+Date.now()),
    tipoAcao:tipo,
    numero: document.getElementById('pra-numero').value.trim(),
    vara: document.getElementById('pra-vara').value.trim(),
    comarca: document.getElementById('pra-comarca').value.trim(),
    status: document.getElementById('pra-status').value,
    dataInicio: document.getElementById('pra-data').value,
    obs: document.getElementById('pra-obs').value.trim(),
  };
  if(!clientesAdv[idx].processos) clientesAdv[idx].processos=[];
  if(_editProcId){
    const pi=clientesAdv[idx].processos.findIndex(x=>x.id===_editProcId);
    if(pi>=0) clientesAdv[idx].processos[pi]=proc;
  } else { clientesAdv[idx].processos.push(proc); }
  saveToStorage();
  fecharProcModal();
  renderFichaAdvProcessos(clientesAdv[idx]);
  gaToast(_editProcId?'Processo atualizado!':'Processo cadastrado!');
}

function excluirProcessoAdv(){
  if(!_editProcId||!confirm('Excluir este processo?')) return;
  const idx=clientesAdv.findIndex(x=>x.id===clienteAdvAtualId);
  if(idx<0) return;
  clientesAdv[idx].processos=(clientesAdv[idx].processos||[]).filter(p=>p.id!==_editProcId);
  saveToStorage();
  fecharProcModal();
  renderFichaAdvProcessos(clientesAdv[idx]);
  gaToast('Processo excluído.');
}
