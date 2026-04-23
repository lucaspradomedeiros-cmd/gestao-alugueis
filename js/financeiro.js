// ============================================================
// DESPESAS + RECEITAS DO ESCRITÓRIO
// ============================================================

const DESP_TIPO_LABEL = {fixa:'Fixa',variavel:'Variável',pessoal:'Pessoal',outra:'Outra'};
const REC_TIPO_LABEL={honorario:'Honorários',consultoria:'Consulta',aluguel_sala:'Aluguel Sala',acordo:'Acordo/Êxito',outra:'Outra'};

function renderFinanceiro(){
  const filtroEl=document.getElementById('desp-filtro-mes');
  if(filtroEl&&!filtroEl.value){
    const h=new Date();
    filtroEl.value=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0');
  }
  showFinTab(_finTab||'despesas');
}

// ── DESPESAS ────────────────────────────────────────────────
function dpStatusChange(){
  const status=document.getElementById('dp-status').value;
  const wrap=document.getElementById('dp-data-pgto-wrap');
  if(wrap) wrap.style.display=status==='pago'?'block':'none';
}

function abrirDespesaModal(id){
  _editandoDespId = id || null;
  document.getElementById('despesa-modal-titulo').textContent = id ? 'Editar Despesa' : 'Nova Despesa';
  document.getElementById('dp-btn-excluir').style.display = id ? 'inline-flex' : 'none';
  const hoje = new Date().toISOString().split('T')[0];
  if(!id){
    document.getElementById('dp-categoria').value = 'Aluguel';
    document.getElementById('dp-tipo').value = 'fixa';
    document.getElementById('dp-descricao').value = '';
    document.getElementById('dp-valor').value = '';
    document.getElementById('dp-status').value = 'pago';
    document.getElementById('dp-vencimento').value = hoje;
    document.getElementById('dp-data').value = hoje;
    document.getElementById('dp-recorrente').checked = false;
  } else {
    const d = despesasEscritorio.find(x=>x.id===id);
    if(d){
      document.getElementById('dp-categoria').value = d.categoria||'Outra';
      document.getElementById('dp-tipo').value = d.tipo||'outra';
      document.getElementById('dp-descricao').value = d.descricao||'';
      document.getElementById('dp-valor').value = d.valor||'';
      document.getElementById('dp-status').value = d.status||'pago';
      document.getElementById('dp-vencimento').value = d.dataVencimento||d.data||'';
      document.getElementById('dp-data').value = d.data||'';
      document.getElementById('dp-recorrente').checked = d.recorrente||false;
    }
  }
  dpStatusChange();
  openOverlay('despesa-modal-overlay');
}
function fecharDespesaModal(){closeOverlay('despesa-modal-overlay');}

function salvarDespesa(){
  const valor=document.getElementById('dp-valor').value.trim();
  const data=document.getElementById('dp-data').value;
  if(!valor){gaToast('Informe o valor.','error');return;}
  if(!data){gaToast('Informe a data.','error');return;}
  const desp={
    id:_editandoDespId||('desp_'+Date.now()),
    categoria:document.getElementById('dp-categoria').value,
    tipo:document.getElementById('dp-tipo').value,
    descricao:document.getElementById('dp-descricao').value.trim(),
    valor:valor.replace(/[^0-9,.]/g,'').replace(',','.'),
    status:document.getElementById('dp-status').value,
    dataVencimento:document.getElementById('dp-vencimento').value,
    data,
    recorrente:document.getElementById('dp-recorrente').checked,
  };
  if(desp.status==='pago'){
    desp.dataPagamento=document.getElementById('dp-data-pgto').value;
  }
  if(_editandoDespId){
    const idx=despesasEscritorio.findIndex(x=>x.id===_editandoDespId);
    if(idx>=0){desp.criadoEm=despesasEscritorio[idx].criadoEm;despesasEscritorio[idx]=desp;}
  } else {
    desp.criadoEm=Date.now();
    despesasEscritorio.push(desp);
  }
  saveToStorage();
  fecharDespesaModal();
  renderDespesas();
  renderDashboardEscritorio();
  gaToast(_editandoDespId?'Despesa atualizada!':'Despesa lançada!');
}

function excluirDespesa(){
  if(!_editandoDespId) return;
  if(!confirm('Excluir esta despesa?')) return;
  despesasEscritorio=despesasEscritorio.filter(x=>x.id!==_editandoDespId);
  saveToStorage();
  fecharDespesaModal();
  renderDespesas();
  renderDashboardEscritorio();
  gaToast('Despesa removida.');
}

function renderDespesas(){
  const mesF=getMesFiltro();
  const lista=despesasEscritorio.filter(d=>(d.dataVencimento||d.data||'').startsWith(mesF));
  lista.sort((a,b)=>(a.dataVencimento||a.data||'').localeCompare(b.dataVencimento||b.data||''));
  let totPago=0,totApagar=0;
  lista.forEach(d=>{const v=parseFloat(d.valor||0);if((d.status||'pago')==='pago')totPago+=v;else totApagar+=v;});
  const totEl=document.getElementById('desp-totais');
  if(totEl){
    totEl.innerHTML=[
      totPago?`<span class="desp-total-chip" style="background:var(--green-bg);border-color:var(--green-light);color:var(--green);">✅ Pago: ${fmtBRL(totPago)}</span>`:'',
      totApagar?`<span class="desp-total-chip" style="background:var(--amber-bg);border-color:var(--amber-light);color:var(--amber);">⏳ A Pagar: ${fmtBRL(totApagar)}</span>`:'',
      (totPago+totApagar)?`<span class="desp-total-chip" style="background:var(--surface);border-color:var(--border-strong);font-weight:700;">Total: ${fmtBRL(totPago+totApagar)}</span>`:'',
    ].filter(Boolean).join('');
  }
  const el=document.getElementById('lista-despesas-escritorio');
  if(!el) return;
  if(!lista.length){el.innerHTML='<div class="desp-empty">Nenhuma despesa neste mês.</div>';return;}
  el.innerHTML=lista.map(d=>{
    const v=parseFloat(d.valor||0);
    const status=d.status||'pago';
    const dataFmt=new Date((d.dataVencimento||d.data)+'T12:00:00').toLocaleDateString('pt-BR');
    const pillTxt=status==='pago'?'✅ Pago':'⏳ A Pagar';
    return `<div class="desp-item">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:13px;">${d.categoria}${d.descricao?' <span style="font-weight:400;color:var(--text-muted);">— '+d.descricao+'</span>':''}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${dataFmt} · ${DESP_TIPO_LABEL[d.tipo]||d.tipo}</div>
      </div>
      <span class="status-pill ${status}">${pillTxt}</span>
      <div style="font-weight:700;font-size:14px;min-width:90px;text-align:right;color:var(--red);">−${fmtBRL(v)}</div>
      <button class="btn" style="font-size:12px;padding:6px 10px;" onclick="abrirDespesaModal('${d.id}')">✏️</button>
    </div>`;
  }).join('');
}

// ── RECEITAS ────────────────────────────────────────────────
function abrirReceitaModal(id){
  _editandoRecId=id||null;
  document.getElementById('receita-modal-titulo').textContent=id?'Editar Receita':'Nova Receita';
  document.getElementById('rp-btn-excluir').style.display=id?'inline-flex':'none';
  const hoje=new Date().toISOString().split('T')[0];
  if(!id){
    document.getElementById('rp-tipo').value='honorario';
    document.getElementById('rp-status').value='recebido';
    document.getElementById('rp-descricao').value='';
    document.getElementById('rp-cliente').value='';
    document.getElementById('rp-valor').value='';
    document.getElementById('rp-data').value=hoje;
  } else {
    const r=receitasEscritorio.find(x=>x.id===id);
    if(r){
      document.getElementById('rp-tipo').value=r.tipo||'honorario';
      document.getElementById('rp-status').value=r.status||'recebido';
      document.getElementById('rp-descricao').value=r.descricao||'';
      document.getElementById('rp-cliente').value=r.clienteNome||'';
      document.getElementById('rp-valor').value=r.valor||'';
      document.getElementById('rp-data').value=r.data||hoje;
    }
  }
  openOverlay('receita-modal-overlay');
}
function fecharReceitaModal(){closeOverlay('receita-modal-overlay');}
function salvarReceita(){
  const valor=document.getElementById('rp-valor').value.trim();
  const data=document.getElementById('rp-data').value;
  if(!valor){gaToast('Informe o valor.','error');return;}
  if(!data){gaToast('Informe a data.','error');return;}
  const rec={
    id:_editandoRecId||('rec_'+Date.now()),
    tipo:document.getElementById('rp-tipo').value,
    status:document.getElementById('rp-status').value,
    descricao:document.getElementById('rp-descricao').value.trim(),
    clienteNome:document.getElementById('rp-cliente').value.trim(),
    valor:valor.replace(/[^0-9,.]/g,'').replace(',','.'),
    data,
  };
  if(_editandoRecId){
    const idx=receitasEscritorio.findIndex(x=>x.id===_editandoRecId);
    if(idx>=0){rec.criadoEm=receitasEscritorio[idx].criadoEm;receitasEscritorio[idx]=rec;}
  } else {
    rec.criadoEm=Date.now();
    receitasEscritorio.push(rec);
  }
  saveToStorage();
  fecharReceitaModal();
  renderReceitas();
  renderDashboardEscritorio();
  gaToast(_editandoRecId?'Receita atualizada!':'Receita lançada!');
}
function excluirReceita(){
  if(!_editandoRecId) return;
  if(!confirm('Excluir esta receita?')) return;
  receitasEscritorio=receitasEscritorio.filter(x=>x.id!==_editandoRecId);
  saveToStorage();
  fecharReceitaModal();
  renderReceitas();
  renderDashboardEscritorio();
  gaToast('Receita removida.');
}

function renderReceitas(){
  const mesF=getMesFiltro();
  const lista=receitasEscritorio.filter(r=>r.data&&r.data.startsWith(mesF));
  lista.sort((a,b)=>a.data.localeCompare(b.data));
  let totRecebido=0,totAReceber=0;
  lista.forEach(r=>{const v=parseFloat(r.valor||0);if((r.status||'recebido')==='recebido')totRecebido+=v;else totAReceber+=v;});
  const totEl=document.getElementById('rec-totais');
  if(totEl){
    totEl.innerHTML=[
      totRecebido?`<span class="desp-total-chip" style="background:var(--green-bg);border-color:var(--green-light);color:var(--green);">✅ Recebido: ${fmtBRL(totRecebido)}</span>`:'',
      totAReceber?`<span class="desp-total-chip" style="background:var(--blue-bg);border-color:#B3D4F8;color:var(--blue);">⏳ A Receber: ${fmtBRL(totAReceber)}</span>`:'',
      (totRecebido+totAReceber)?`<span class="desp-total-chip" style="background:var(--surface);border-color:var(--border-strong);font-weight:700;">Total: ${fmtBRL(totRecebido+totAReceber)}</span>`:'',
    ].filter(Boolean).join('');
  }
  const el=document.getElementById('lista-receitas-escritorio');
  if(!el) return;
  if(!lista.length){el.innerHTML='<div class="desp-empty">Nenhuma receita neste mês.</div>';return;}
  el.innerHTML=lista.map(r=>{
    const v=parseFloat(r.valor||0);
    const status=r.status||'recebido';
    const dataFmt=new Date(r.data+'T12:00:00').toLocaleDateString('pt-BR');
    const pillTxt=status==='recebido'?'✅ Recebido':'⏳ A Receber';
    return `<div class="rec-item">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:13px;">${REC_TIPO_LABEL[r.tipo]||r.tipo}${r.descricao?' <span style="font-weight:400;color:var(--text-muted);">— '+r.descricao+'</span>':''}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${dataFmt}${r.clienteNome?' · '+r.clienteNome:''}</div>
      </div>
      <span class="status-pill ${status}">${pillTxt}</span>
      <div style="font-weight:700;font-size:14px;min-width:90px;text-align:right;color:var(--green);">${fmtBRL(v)}</div>
      <button class="btn" style="font-size:12px;padding:6px 10px;" onclick="abrirReceitaModal('${r.id}')">✏️</button>
    </div>`;
  }).join('');
}

// ── A RECEBER ─────────────────────────────────────────────────
function setAReceberFiltro(f){
  _areceberFiltro=f;
  ['todas','vencidas','mes','30d','custom'].forEach(x=>{
    const b=document.getElementById('arf-'+x);
    if(b) b.classList.toggle('active',x===f);
  });
  const cp=document.getElementById('areceber-periodo-custom');
  if(cp) cp.style.display=f==='custom'?'flex':'none';
  renderAReceber();
}

function _coletarPendentes(){
  const hojeStr=new Date().toISOString().split('T')[0];
  const pendentes=[];
  clientesAdv.forEach(c=>{
    const blocos=[];
    if(c.contrato) blocos.push({nome:'Contrato de Honorários',parcelas:c.contrato.parcelas||[]});
    (c.servicos||[]).forEach(sv=>blocos.push({nome:sv.tipo||'Serviço Avulso',parcelas:sv.parcelas||[]}));
    blocos.forEach(b=>{
      b.parcelas.forEach((p,i)=>{
        if(!p.pago && p.vencimento){
          pendentes.push({
            clienteNome:c.nome,clienteId:c.id,
            blocoNome:b.nome,parcelaLabel:`${i+1}ª parcela`,
            valor:parseFloat(p.valor||0),vencimento:p.vencimento,
            atrasada:p.vencimento<hojeStr,
          });
        }
      });
    });
  });
  pendentes.sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  return pendentes;
}

function renderAReceber(){
  const el=document.getElementById('lista-areceber');
  if(!el) return;
  const hojeStr=new Date().toISOString().split('T')[0];
  const pendentes=_coletarPendentes();

  const em30=new Date(); em30.setDate(em30.getDate()+30);
  const em30Str=em30.toISOString().split('T')[0];
  const mesAtual=hojeStr.substring(0,7);
  const f=_areceberFiltro||'todas';
  let filtrados=pendentes;
  if(f==='vencidas') filtrados=pendentes.filter(p=>p.atrasada);
  else if(f==='mes') filtrados=pendentes.filter(p=>p.vencimento.startsWith(mesAtual));
  else if(f==='30d') filtrados=pendentes.filter(p=>p.vencimento>=hojeStr&&p.vencimento<=em30Str);
  else if(f==='custom'){
    const de=document.getElementById('arf-de')?.value;
    const ate=document.getElementById('arf-ate')?.value;
    if(de) filtrados=filtrados.filter(p=>p.vencimento>=de+'-01');
    if(ate){
      const [ay,am]=ate.split('-').map(Number);
      const ultimo=String(new Date(ay,am,0).getDate()).padStart(2,'0');
      filtrados=filtrados.filter(p=>p.vencimento<=ate+'-'+ultimo);
    }
  }

  const total=filtrados.reduce((s,p)=>s+p.valor,0);
  const totalAtras=filtrados.filter(p=>p.atrasada).reduce((s,p)=>s+p.valor,0);
  const totalAVencer=total-totalAtras;
  const totEl=document.getElementById('areceber-totais');
  if(totEl){
    totEl.innerHTML=filtrados.length?[
      `<span class="desp-total-chip" style="background:var(--blue-bg);border-color:#B3D4F8;color:var(--blue);">${filtrados.length} parcela${filtrados.length!==1?'s':''} — ${fmtBRL(total)}</span>`,
      totalAtras?`<span class="desp-total-chip" style="background:var(--red-bg);border-color:var(--red-light);color:var(--red);">⚠️ Atrasadas: ${fmtBRL(totalAtras)}</span>`:'',
      (totalAVencer&&totalAtras)?`<span class="desp-total-chip" style="background:var(--surface);border-color:var(--border-strong);">A vencer: ${fmtBRL(totalAVencer)}</span>`:'',
    ].filter(Boolean).join(''):'';
  }

  if(!filtrados.length){
    el.innerHTML=`<div class="desp-empty">${pendentes.length?'Nenhum resultado para este filtro.':'Nenhum honorário pendente. Todos os clientes em dia! ✅'}</div>`;
    return;
  }
  el.innerHTML=filtrados.map(p=>{
    const vencFmt=new Date(p.vencimento+'T12:00:00').toLocaleDateString('pt-BR');
    return `<div class="areceber-item" style="${p.atrasada?'border-color:var(--red-light);background:var(--red-bg);':''}">
      <div style="flex:1;">
        <div style="font-weight:600;font-size:13px;">${p.clienteNome}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${p.blocoNome} · ${p.parcelaLabel}</div>
      </div>
      <span style="font-size:11px;color:${p.atrasada?'var(--red)':'var(--text-muted)'};">${p.atrasada?'⚠️ Venceu em ':'Vence em '}${vencFmt}</span>
      <div style="font-weight:700;font-size:14px;color:var(--blue);min-width:90px;text-align:right;">${fmtBRL(p.valor)}</div>
      <button class="btn" style="font-size:11px;padding:5px 10px;" onclick="showPage('clientes');setTimeout(()=>abrirFichaAdv('${p.clienteId}'),100)">Ver ficha</button>
    </div>`;
  }).join('');
}

// ── RESULTADO ─────────────────────────────────────────────────
function getMesFiltro(){
  const el=document.getElementById('desp-filtro-mes');
  if(el) return el.value;
  const h=new Date();
  return h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0');
}

function _calcResultadoMes(mesF){
  const despsDoMes=despesasEscritorio.filter(d=>(d.dataVencimento||d.data||'').startsWith(mesF));
  const totDesp=despsDoMes.reduce((s,d)=>s+parseFloat(d.valor||0),0);
  const totDespPago=despsDoMes.filter(d=>(d.status||'pago')==='pago').reduce((s,d)=>s+parseFloat(d.valor||0),0);
  const totDespApagar=despsDoMes.filter(d=>(d.status||'pago')==='a_pagar').reduce((s,d)=>s+parseFloat(d.valor||0),0);
  const recsDoMes=receitasEscritorio.filter(r=>r.data&&r.data.startsWith(mesF));
  const recsRecebidas=recsDoMes.filter(r=>(r.status||'recebido')==='recebido');
  const recsAReceber=recsDoMes.filter(r=>(r.status||'recebido')==='a_receber');
  const totRecRecebido=recsRecebidas.reduce((s,r)=>s+parseFloat(r.valor||0),0);
  const totRecAReceber=recsAReceber.reduce((s,r)=>s+parseFloat(r.valor||0),0);
  const honDetalhes=[];
  let totHonClientes=0;
  clientesAdv.forEach(c=>{
    if(c.contrato){
      (c.contrato.parcelas||[]).forEach((p,i)=>{
        if(p.pago&&p.dataPagamento&&p.dataPagamento.startsWith(mesF)){
          const v=parseFloat(p.valorPago||p.valor||0);
          totHonClientes+=v;
          honDetalhes.push({nome:c.nome,tipo:'Contrato de Honorários',parcela:`${i+1}ª parcela`,valor:v});
        }
      });
    }
    (c.servicos||[]).forEach(sv=>{
      (sv.parcelas||[]).forEach((p,i)=>{
        if(p.pago&&p.dataPagamento&&p.dataPagamento.startsWith(mesF)){
          const v=parseFloat(p.valorPago||p.valor||0);
          totHonClientes+=v;
          honDetalhes.push({nome:c.nome,tipo:sv.tipo||'Serviço',parcela:`${i+1}ª parcela`,valor:v});
        }
      });
    });
  });
  return {despsDoMes,totDesp,totDespPago,totDespApagar,recsRecebidas,recsAReceber,totRecRecebido,totRecAReceber,honDetalhes,totHonClientes};
}

function renderResultado(){
  const el=document.getElementById('resultado-mensal');
  if(!el) return;
  const mesF=getMesFiltro();
  const [ano,mes]=mesF.split('-').map(Number);
  const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const mesNome=`${meses[mes-1]}/${ano}`;
  const {despsDoMes,totDesp,totDespPago,totDespApagar,recsRecebidas,recsAReceber,totRecRecebido,totRecAReceber,honDetalhes,totHonClientes}=_calcResultadoMes(mesF);

  const saldoPrevisto=totRecRecebido+totRecAReceber+totHonClientes-totDesp;
  const saldoRealizado=totRecRecebido+totHonClientes-totDespPago;
  const cor=v=>v>=0?'var(--green)':'var(--red)';
  const det=_resultadoDetalhado;

  const porCat={};
  despsDoMes.forEach(d=>{porCat[d.categoria]=(porCat[d.categoria]||0)+parseFloat(d.valor||0);});
  const catRows=Object.entries(porCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
    `<div class="resultado-row" style="background:var(--bg);padding:7px 14px;"><span>${k}</span><span style="color:var(--red);">−${fmtBRL(v)}</span></div>`
  ).join('');

  const recDetalheRows=det?recsRecebidas.map(r=>{
    const label=`${REC_TIPO_LABEL[r.tipo]||r.tipo}${r.descricao?' — '+r.descricao:''}`;
    const sub=r.clienteNome?` · ${r.clienteNome}`:'';
    return `<div class="resultado-detalhe"><span>${label}${sub}</span><span style="color:var(--green);">+${fmtBRL(parseFloat(r.valor||0))}</span></div>`;
  }).join(''):'';
  const honDetalheRows=det?honDetalhes.map(h=>
    `<div class="resultado-detalhe"><span>${h.nome} — ${h.tipo} (${h.parcela})</span><span style="color:var(--green);">+${fmtBRL(h.valor)}</span></div>`
  ).join(''):'';

  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;" class="dre-no-print">
      <div style="font-size:16px;font-weight:700;">📊 Resultado — ${mesNome}</div>
      <button class="btn" style="font-size:11px;padding:5px 12px;margin-left:auto;" onclick="_resultadoDetalhado=!_resultadoDetalhado;renderResultado();">${det?'📋 Resumido':'🔍 Detalhado'}</button>
      <button class="btn" style="font-size:11px;padding:5px 12px;" onclick="imprimirDRE()">🖨 Imprimir</button>
    </div>
    <div style="font-size:16px;font-weight:700;margin-bottom:16px;display:none;" class="dre-print-only">📊 Resultado — ${mesNome}</div>

    <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Receitas</div>
    <div class="resultado-row receita"><span>💰 Receitas manuais (recebidas)</span><span style="color:var(--green);">+${fmtBRL(totRecRecebido)}</span></div>
    ${recDetalheRows}
    ${totHonClientes?`<div class="resultado-row receita"><span>⚖️ Honorários de clientes (recebidos)</span><span style="color:var(--green);">+${fmtBRL(totHonClientes)}</span></div>${honDetalheRows}`:''}

    <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;margin-top:16px;">Despesas</div>
    ${catRows||'<div class="desp-empty" style="padding:12px;">Nenhuma despesa neste mês.</div>'}

    <div style="border-top:2px solid var(--border);margin-top:14px;padding-top:14px;">
      <div class="resultado-row saldo"><span>Saldo realizado (pago vs. recebido)</span><span style="color:${cor(saldoRealizado)};">${saldoRealizado>=0?'+':''}${fmtBRL(saldoRealizado)}</span></div>
      ${totDespApagar||totRecAReceber?`<div class="resultado-row" style="background:var(--bg);border:1px dashed var(--border);"><span style="color:var(--text-muted);">Saldo previsto (incluindo pendentes)</span><span style="color:${cor(saldoPrevisto)};font-weight:600;">${saldoPrevisto>=0?'+':''}${fmtBRL(saldoPrevisto)}</span></div>`:''}
    </div>
    <div style="font-size:11px;color:var(--text-faint);margin-top:12px;">
      * Honorários de clientes computados a partir dos pagamentos confirmados nas fichas.
    </div>
  `;
}

function imprimirDRE(){
  const mesF=getMesFiltro();
  const [ano,mes]=mesF.split('-').map(Number);
  const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesNome=`${meses[mes-1]} de ${ano}`;
  const {totRecRecebido,totRecAReceber,recsRecebidas,recsAReceber,honDetalhes,totHonClientes,despsDoMes,totDespPago,totDespApagar}=_calcResultadoMes(mesF);
  const saldoRealizado=totRecRecebido+totHonClientes-totDespPago;
  const saldoPrevisto=totRecRecebido+totRecAReceber+totHonClientes-(totDespPago+totDespApagar);
  const fmtV=v=>(v>=0?'+ ':'− ')+fmtBRL(Math.abs(v));
  const porCat={};
  despsDoMes.forEach(d=>{porCat[d.categoria]=(porCat[d.categoria]||0)+parseFloat(d.valor||0);});

  const linhasRec=[
    ...recsRecebidas.map(r=>`<tr><td>${REC_TIPO_LABEL[r.tipo]||r.tipo}${r.descricao?' — '+r.descricao:''}${r.clienteNome?' ('+r.clienteNome+')':''}</td><td class="val verde">+ ${fmtBRL(parseFloat(r.valor||0))}</td></tr>`),
    ...honDetalhes.map(h=>`<tr><td>${h.nome} — ${h.tipo} (${h.parcela})</td><td class="val verde">+ ${fmtBRL(h.valor)}</td></tr>`),
    ...recsAReceber.map(r=>`<tr style="opacity:.65"><td>⏳ ${REC_TIPO_LABEL[r.tipo]||r.tipo}${r.descricao?' — '+r.descricao:''}${r.clienteNome?' ('+r.clienteNome+')':''} [a receber]</td><td class="val verde">+ ${fmtBRL(parseFloat(r.valor||0))}</td></tr>`),
  ].join('');
  const linhasDesp=Object.entries(porCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
    `<tr><td>${k}</td><td class="val vermelho">− ${fmtBRL(v)}</td></tr>`
  ).join('');

  const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>DRE — ${mesNome}</title>
  <style>
    body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#1C1A17;margin:0;padding:32px;}
    h1{font-size:18px;margin:0 0 4px;}
    .sub{color:#888;font-size:12px;margin-bottom:24px;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;}
    th{background:#F5F3EE;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#666;}
    td{padding:8px 12px;border-bottom:1px solid #EEE;}
    .val{text-align:right;font-weight:600;}
    .verde{color:#2A9D3A;}.vermelho{color:#D93025;}
    .saldo-box{background:#F5F3EE;border-radius:8px;padding:14px 16px;display:flex;justify-content:space-between;font-weight:700;font-size:14px;}
    .saldo-prev{border:1px dashed #CCC;border-radius:8px;padding:10px 16px;display:flex;justify-content:space-between;font-size:13px;margin-top:8px;color:#555;}
    @media print{body{padding:16px;}}
  </style></head><body>
  <h1>📊 DRE — Resultado Financeiro</h1>
  <div class="sub">${mesNome} · Escritório Lucas Prado Medeiros</div>
  <table><thead><tr><th>Receita</th><th style="text-align:right;">Valor</th></tr></thead><tbody>${linhasRec||'<tr><td colspan="2" style="color:#AAA;">Nenhuma receita registrada.</td></tr>'}</tbody></table>
  <table><thead><tr><th>Despesa</th><th style="text-align:right;">Valor</th></tr></thead><tbody>${linhasDesp||'<tr><td colspan="2" style="color:#AAA;">Nenhuma despesa registrada.</td></tr>'}</tbody></table>
  <div class="saldo-box"><span>Saldo realizado</span><span class="${saldoRealizado>=0?'verde':'vermelho'}">${fmtV(saldoRealizado)}</span></div>
  ${totDespApagar||totRecAReceber?`<div class="saldo-prev"><span>Saldo previsto (incluindo pendentes)</span><span>${fmtV(saldoPrevisto)}</span></div>`:''}
  <p style="font-size:11px;color:#AAA;margin-top:24px;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
  <scr`+`ipt>window.onload=()=>window.print();</scr`+`ipt></body></html>`;

  const w=window.open('','_blank','width=820,height=700');
  if(w){w.document.write(html);w.document.close();}
}
