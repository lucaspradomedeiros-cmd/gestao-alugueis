// ============================================================
// WHATSAPP COBRANÇA
// ============================================================

function openWpp(id){
  const t=tenants.find(x=>x.id===id);if(!t||t.vago)return;
  wppTid=id;
  document.getElementById('wpp-info').textContent=`${t.unit} · ${t.name} · ${t.tel}`;

  // Always get a valid entry/ref — even for new tenants without history
  const entry = getEntryForDisplay(t);
  const ref   = entry?.ref || `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`;
  document.getElementById('wpp-ref').value=ref;

  const tCondoId = t.condoId || activeCondoId;
  const vencYM = getCondoVencYM(tCondoId, ref);
  document.getElementById('wpp-venc').value=entry?.venc||`${vencYM}-${String(t.vencDia).padStart(2,'0')}`;
  document.getElementById('wpp-aluguel').value=t.rent||'';

  const im = t.imovelId ? getImovel(t.imovelId) : null;
  if(im && im.gestao==='autonomo'){
    // Always read directly from despesas — never from history
    const despInq = getDespesasAtivas(im.id, ref).filter(d=>d.resp==='inquilino');
    const iptuVal = despInq.filter(d=>d.cat==='iptu').reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);
    const lixoVal = despInq.filter(d=>d.cat==='lixo').reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);
    document.getElementById('wpp-iptu').value  = iptuVal||'';
    document.getElementById('wpp-lixo').value  = lixoVal||'';
    document.getElementById('wpp-condo').value = '';
  } else {
    document.getElementById('wpp-iptu').value  = entry?R(entry.iptu)||'':'';
    document.getElementById('wpp-lixo').value  = entry?R(entry.lixo)||'':'';
    document.getElementById('wpp-condo').value = entry?R(entry.condo)||'':'';
  }

  const fin=getTenantFinancials(t);
  if(fin.totalDue&&(fin.status==='inadimplente'||fin.status==='parcial')){
    document.getElementById('wpp-multa').value=R(fin.multaHoje)||'';
    document.getElementById('wpp-juros').value=R(fin.jurosHoje)||'';
  } else {
    document.getElementById('wpp-multa').value='';
    document.getElementById('wpp-juros').value='';
  }
  buildWpp();
  openOverlay('wpp-overlay');
}

function syncWppEdit(){
  document.getElementById('wpp-edit').value=document.getElementById('wpp-preview').textContent;
}

function useWppEdit(){
  const txt=document.getElementById('wpp-edit').value.trim();
  if(!txt)return;
  // override preview with edited text and update link
  document.getElementById('wpp-preview').textContent=txt;
  const t=tenants.find(x=>x.id===wppTid);
  const tel=t?t.tel.replace(/\D/g,''):'';
  const enc=encodeURIComponent(txt);
  document.getElementById('wpp-link').href=tel&&tel.length>=8?`https://wa.me/55${tel}?text=${enc}`:`https://wa.me/?text=${enc}`;
}

function buildWpp(){
  const t=tenants.find(x=>x.id===wppTid);if(!t)return;
  const ref      = document.getElementById('wpp-ref').value;
  const venc     = document.getElementById('wpp-venc').value;
  const aluguel  = R(document.getElementById('wpp-aluguel').value);
  const multaVal = R(document.getElementById('wpp-multa').value);
  const jurosVal = R(document.getElementById('wpp-juros').value);

  const im = t.imovelId ? getImovel(t.imovelId) : null;

  let iptu=0, lixo=0, condo=0, extras=[], total;

  if(im && im.gestao==='autonomo' && ref){
    // All despesas do inquilino as named lines — no split by category needed
    const linhas = getDespInquilinoLinhas(im.id, ref);
    extras = linhas.map(d=>({descricao:d.desc, valor:d.valor}));
    iptu=0; lixo=0; condo=0;
    total = R2(aluguel + linhas.reduce((s,d)=>s+d.valor,0) + multaVal + jurosVal);
  } else {
    iptu  = R(document.getElementById('wpp-iptu').value);
    lixo  = R(document.getElementById('wpp-lixo').value);
    condo = R(document.getElementById('wpp-condo').value);
    // For condo: get manual extras from DOM or saved entry
    const cardExtras = getCardExtras(t.id);
    extras = cardExtras.length>0 ? cardExtras :
      (t.history.slice().reverse().find(h=>h.status!=='pago')||t.history[t.history.length-1])?.extras||[];
    total = R2(aluguel+iptu+lixo+condo+multaVal+jurosVal+extras.reduce((s,e)=>s+R(e.valor),0));
  }

  const firstName=t.name.split(' ')[0];
  const hora=TODAY.getHours();
  const saud=hora<12?'Bom dia':'Boa tarde';

  let condoRefLabel='—';
  if(ref){const[ry,rm]=ref.split('-');let pm=parseInt(rm)-1,py=parseInt(ry);if(pm<1){pm=12;py--;}condoRefLabel=`${MN[pm]} ${py}`;}

  const lines=[`${saud}, ${firstName}!`,``,`Segue o valor do aluguel referente a ${monthName(ref)}, com vencimento em ${fmtDate(venc)}:`,``];
  lines.push(`Aluguel: ${fmtBRL(aluguel)}`);
  if(iptu>0)  lines.push(`IPTU: ${fmtBRL(iptu)}`);
  if(lixo>0)  lines.push(`Taxa de Lixo: ${fmtBRL(lixo)}`);
  if(condo>0) lines.push(`Condomínio (ref. ${condoRefLabel}): ${fmtBRL(condo)}`);

  // All despesas / extras — each named on its own line
  extras.forEach(ex=>{
    if((ex.descricao||ex.desc) && R(ex.valor)>0)
      lines.push(`${ex.descricao||ex.desc}: ${fmtBRL(R(ex.valor))}`);
  });

  // Detailed penalty lines
  if(multaVal>0 || jurosVal>0){
    lines.push(``);
    lines.push(`--- Encargos por atraso ---`);

    // Try to find the entry to get detailed info
    const entry = t.history.find(h=>h.ref===ref);
    if(entry && (R(entry.pendingMulta)+R(entry.pendingJuros))>0){
      lines.push(`Multa e juros de meses anteriores arrastados: ${fmtBRL(R(entry.pendingMulta)+R(entry.pendingJuros))}`);
    }
    if(multaVal>0){
      const baseRef = R(entry?.aluguel||aluguel)+R(entry?.condo||condo)+R(entry?.iptu||iptu)+R(entry?.lixo||lixo);
      lines.push(`Multa por atraso (10% s/ base ${fmtBRL(baseRef)}): ${fmtBRL(multaVal)}`);
    }
    if(jurosVal>0){
      // calculate days for description
      const vencStr = entry?.venc||venc;
      const todayStr = TODAY.toISOString().split('T')[0];
      const dLate = vencStr ? daysDiff(vencStr, todayStr) : 0;
      lines.push(`Juros de mora (1% a.m., ${dLate>0?dLate+' dias':' pro-rata'} × 0,0333%/dia): ${fmtBRL(jurosVal)}`);
    }
    lines.push(`Subtotal encargos: ${fmtBRL(multaVal+jurosVal)}`);
  }

  lines.push(``);
  lines.push(`*Total a pagar: ${fmtBRL(total)}*`);
  lines.push(``);
  lines.push(`Pagamento em nome de ${PIX_NAME}`);
  lines.push(`PIX: ${PIX_KEY}`);
  lines.push(``);
  lines.push(`Qualquer dúvida estou à disposição. Obrigado! 😊`);

  const msg=lines.join('\n');
  document.getElementById('wpp-preview').textContent=msg;
  const tel=t.tel.replace(/\D/g,'');
  const enc=encodeURIComponent(msg);
  document.getElementById('wpp-link').href=tel&&tel.length>=8?`https://wa.me/55${tel}?text=${enc}`:`https://wa.me/?text=${enc}`;
}

function copyWpp(){
  const edited=document.getElementById('wpp-edit').value.trim();
  const txt=edited||document.getElementById('wpp-preview').textContent;
  navigator.clipboard.writeText(txt).then(()=>{
    const b=document.getElementById('wpp-copy');b.textContent='✓ Copiado!';b.style.color='var(--green)';
    setTimeout(()=>{b.textContent='📋 Copiar';b.style.color='';},2000);
  });
}
