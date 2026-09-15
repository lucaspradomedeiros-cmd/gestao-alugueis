// ============================================================
// RECIBOS DE PAGAMENTO
// ============================================================
// 15/09/2026: sombreado pelas definições equivalentes em index.html (ver
// nota da seção 3 do PLANO_MELHORIAS.md) — mantido em paridade.

function openRecibo(id){
  const t = tenants.find(x=>x.id===id);
  // 14/09/2026: achado real (usuário, "botão emitir recibo está quebrado")
  // — o botão sempre aparece no cabeçalho da ficha, pra qualquer inquilino,
  // mas essa guarda recusava silenciosamente quando era ex-inquilino
  // (vago). Removida a restrição.
  if(!t) return;
  reciboTid = id;
  document.getElementById('recibo-info').textContent = `${t.unit} · ${t.name}`;

  const pago = [...t.history].reverse().find(h=>h.status==='pago'||h.status==='parcial');
  const ref = pago ? pago.ref : '';
  document.getElementById('rb-ref').value = ref;
  document.getElementById('rb-data').value = pago?.dataPagamento || TODAY.toISOString().split('T')[0];
  document.getElementById('rb-valor').value = pago ? R(pago.valorPago) : '';
  buildRecibo();
  openOverlay('recibo-overlay');
}

// 14/09/2026: resolve o prédio/endereço de verdade pelo condoId/imovelId
// do inquilino — antes vinha cravado "Residencial Santa Nonna I" sempre.
function getReciboLocal(t){
  if(t.condoId){
    const c = condominios.find(x=>x.id===t.condoId);
    if(c) return { nome: c.nome||'—', endereco: c.endereco||'' };
  }
  if(t.imovelId){
    const im = getImovel(t.imovelId);
    if(im) return { nome: im.nome||'—', endereco: im.endereco||'' };
  }
  return { nome: t.unit||'—', endereco:'' };
}

// 14/09/2026: dados centralizados pras 3 saídas (prévia visual, mensagem
// WhatsApp, PDF) — pedido do usuário de "mais detalhes" (CPF/endereço do
// locatário, valor por extenso).
function getReciboDados(){
  const t = tenants.find(x=>x.id===reciboTid);
  if(!t) return null;

  const ref   = document.getElementById('rb-ref').value;
  const data  = document.getElementById('rb-data').value;
  const valor = R(document.getElementById('rb-valor').value);
  const forma = document.getElementById('rb-forma').value;
  const entry = t.history.find(h=>h.ref===ref);

  const itens = [];
  if(entry){
    if(R(entry.aluguel)>0) itens.push(['Aluguel', R(entry.aluguel)]);
    if(R(entry.condo)>0)   itens.push([`Condomínio (ref. ${prevMonthLabel(ref)})`, R(entry.condo)]);
    if(R(entry.iptu)>0)    itens.push(['IPTU', R(entry.iptu)]);
    if(R(entry.lixo)>0)    itens.push(['Taxa de Lixo', R(entry.lixo)]);
    const pen = R(entry.multa)+R(entry.juros)+R(entry.pendingMulta)+R(entry.pendingJuros);
    if(pen>0)              itens.push(['Multa/Juros por atraso', pen]);
    (entry.extras||[]).forEach(ex=>{
      if(ex.descricao||R(ex.valor)>0) itens.push([ex.descricao||'Cobrança extra', R(ex.valor)]);
    });
  }

  const enderecoLoc = [t.endLoc, t.bairroLoc, t.cidadeUf, t.cepLoc?('CEP '+t.cepLoc):''].filter(Boolean).join(', ');
  const local = getReciboLocal(t);
  const reciboNum = `${ref ? ref.replace('-','') : 'XXXXXX'}-${String(t.id).padStart(2,'0')}`;
  const dataFmt = data ? fmtDate(data) : '—';

  return { t, ref, data, dataFmt, valor, forma, entry, itens, enderecoLoc, local, reciboNum };
}

function buildRecibo(){
  const d = getReciboDados();
  if(!d) return;
  document.getElementById('recibo-preview').innerHTML = renderReciboFormalHTML(d, false);
  document.getElementById('recibo-wpp-preview').textContent = buildReciboTextoWpp(d);
}

// 14/09/2026: prévia visual e PDF usam o MESMO HTML — antes a prévia era
// uma "caixa" ASCII com alinhamento por espaço (só funciona em fonte
// monoespaçada; o container usa DM Sans, proporcional — ficava torta).
function renderReciboFormalHTML(d, paraImpressao){
  const { t, dataFmt, valor, forma, itens, enderecoLoc, local, reciboNum, ref } = d;
  const itensHtml = itens.map(([l,v])=>`
    <tr><td style="padding:5px 0;border-bottom:1px solid #eee;">${l}</td><td style="padding:5px 0;border-bottom:1px solid #eee;text-align:right;font-weight:500;">${fmtBRL(v)}</td></tr>`).join('');
  return `
    <div style="text-align:center;margin-bottom:10px;">
      <div style="font-weight:700;font-size:${paraImpressao?'20px':'14px'};">RECIBO DE PAGAMENTO</div>
      <div style="font-size:12px;color:#666;">${local.nome}${local.endereco?' · '+local.endereco:''}</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:12px;border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:6px 0;margin-bottom:10px;">
      <span><b>Recibo nº:</b> ${reciboNum}</span>
      <span><b>Data:</b> ${dataFmt}</span>
    </div>
    <div style="font-size:12px;line-height:1.9;margin-bottom:10px;">
      <div><b>Locatário:</b> ${t.name}${t.cpf?' — CPF '+t.cpf:''}</div>
      ${enderecoLoc?`<div><b>Endereço:</b> ${enderecoLoc}</div>`:''}
      <div><b>Imóvel alugado:</b> ${t.unit}</div>
      <div><b>Referência:</b> ${monthName(ref)}</div>
    </div>
    <div style="font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Discriminação</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;">${itensHtml}</table>
    <div style="background:#eaf4ee;border:1px solid #cfe6da;border-radius:6px;padding:10px 12px;margin-bottom:10px;">
      <div style="font-size:14px;font-weight:700;color:#2D6A4F;">VALOR PAGO: ${fmtBRL(valor)}</div>
      <div style="font-size:11px;color:#4a7d63;">(${valorExtensoDoc(valor)})</div>
      <div style="font-size:12px;margin-top:4px;">Forma: ${forma}</div>
    </div>
    <p style="font-size:12px;color:#555;line-height:1.6;margin-bottom:10px;">Recebo a quantia acima referente ao período mencionado, dando plena quitação do débito correspondente.</p>
    <div style="font-size:12px;color:#555;margin-bottom:${paraImpressao?'40px':'16px'};">${OWNER_CIDADE}, ${dataFmt}</div>
    <div style="text-align:center;font-size:12px;">
      <div style="border-top:1px solid #333;width:240px;margin:0 auto 6px;"></div>
      <div style="font-weight:500;">Lucas Prado Medeiros Perin</div>
      <div style="color:#666;font-size:11px;">CPF: 702.738.471-04 · Locador</div>
    </div>`;
}

// 14/09/2026: mensagem pra WhatsApp — sem alinhamento por espaço (não é
// monoespaçado lá). Só *negrito* (suportado nativamente) e •tópicos.
function buildReciboTextoWpp(d){
  const { t, dataFmt, valor, forma, itens, local, reciboNum, ref } = d;
  const linhas = [
    `🧾 *RECIBO DE PAGAMENTO*`,
    `${local.nome}${local.endereco?' — '+local.endereco:''}`,
    ``,
    `*Recibo nº:* ${reciboNum}`,
    `*Data:* ${dataFmt}`,
    ``,
    `*Locatário:* ${t.name}`,
    `*Imóvel:* ${t.unit}`,
    `*Referência:* ${monthName(ref)}`,
    ``,
    `*Discriminação:*`,
    ...itens.map(([l,v])=>`• ${l}: ${fmtBRL(v)}`),
    ``,
    `*Valor pago:* ${fmtBRL(valor)}`,
    `(${valorExtensoDoc(valor)})`,
    `*Forma:* ${forma}`,
    ``,
    `Recebo a quantia acima referente ao período mencionado, dando plena quitação do débito correspondente.`,
    ``,
    `${OWNER_CIDADE}, ${dataFmt}.`,
    ``,
    `_Lucas Prado Medeiros Perin — Locador_`,
    `CPF: 702.738.471-04`,
  ];
  return linhas.join('\n');
}

function prevMonthLabel(ref){
  if(!ref) return '—';
  const[y,m]=ref.split('-');
  let pm=parseInt(m)-1,py=parseInt(y);
  if(pm<1){pm=12;py--;}
  return `${MN[pm]}/${py}`;
}

function copyRecibo(){
  const d = getReciboDados();
  if(!d) return;
  const txt = buildReciboTextoWpp(d);
  navigator.clipboard.writeText(txt).then(()=>{
    const b=document.getElementById('rb-copy');
    b.textContent='✓ Copiado!';b.style.color='var(--green)';
    setTimeout(()=>{b.textContent='📋 Copiar mensagem';b.style.color='';},2000);
  });
}

function printRecibo(){
  const d = getReciboDados();
  if(!d) return;
  const { t, dataFmt, valor, forma, itens, enderecoLoc, local, reciboNum, ref } = d;

  const itensTr = itens.map(([l,v])=>`
    <tr>
      <td style="padding:7px 12px;border-bottom:1px solid #e8e4dd;">${l}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e8e4dd;text-align:right;font-weight:500;">${fmtBRL(v)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8">
  <title>Recibo ${reciboNum} — ${t.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'DM Sans',sans-serif;background:#f5f3ee;color:#1C1A17;font-size:13px;padding:40px;}
    .page{background:#fff;max-width:640px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.12);}
    .header{background:#2D6A4F;color:#fff;padding:28px 32px;}
    .header-title{font-family:'DM Serif Display',serif;font-size:24px;letter-spacing:-.5px;margin-bottom:4px;}
    .header-sub{font-size:12px;opacity:.8;}
    .header-num{font-size:11px;opacity:.7;margin-top:8px;}
    .section{padding:20px 32px;border-bottom:1px solid #e8e4dd;}
    .section-title{font-size:10px;font-weight:600;color:#7a7268;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px;}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
    .info-item label{font-size:10px;color:#7a7268;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:2px;}
    .info-item span{font-size:13px;font-weight:500;}
    .info-item.full{grid-column:1/-1;}
    table{width:100%;border-collapse:collapse;}
    .total-row td{padding:10px 12px;font-weight:600;font-size:14px;background:#eaf4ee;color:#2D6A4F;}
    .extenso{font-size:11px;color:#4a7d63;padding:0 12px 10px;background:#eaf4ee;}
    .footer{padding:24px 32px;display:flex;justify-content:space-between;align-items:flex-end;}
    .signature{text-align:center;}
    .signature-line{border-top:1px solid #1C1A17;width:220px;margin:0 auto 6px;}
    .signature-name{font-size:12px;font-weight:500;}
    .signature-cpf{font-size:11px;color:#7a7268;}
    .stamp{background:#eaf4ee;border:2px solid #2D6A4F;border-radius:8px;padding:10px 16px;text-align:center;}
    .stamp-label{font-size:9px;font-weight:600;color:#2D6A4F;text-transform:uppercase;letter-spacing:.8px;}
    .stamp-value{font-size:16px;font-weight:700;color:#2D6A4F;}
    @media print{body{padding:0;background:#fff;}.page{box-shadow:none;border-radius:0;max-width:100%;}}
  </style>
  </head><body>
  <div class="page">
    <div class="header">
      <div class="header-title">Recibo de Pagamento</div>
      <div class="header-sub">${local.nome}${local.endereco?' · '+local.endereco:''}</div>
      <div class="header-num">Nº ${reciboNum}</div>
    </div>
    <div class="section">
      <div class="section-title">Dados do locatário</div>
      <div class="info-grid">
        <div class="info-item"><label>Nome</label><span>${t.name}</span></div>
        <div class="info-item"><label>CPF</label><span>${t.cpf||'—'}</span></div>
        ${enderecoLoc?`<div class="info-item full"><label>Endereço</label><span>${enderecoLoc}</span></div>`:''}
        <div class="info-item"><label>Imóvel alugado</label><span>${t.unit}</span></div>
        <div class="info-item"><label>Referência</label><span>${monthName(ref)}</span></div>
        <div class="info-item"><label>Data do pagamento</label><span>${dataFmt}</span></div>
        <div class="info-item"><label>Forma de pagamento</label><span>${forma}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Discriminação</div>
      <table>
        <tbody>${itensTr}</tbody>
        <tr class="total-row">
          <td>Total pago</td>
          <td style="text-align:right;">${fmtBRL(valor)}</td>
        </tr>
      </table>
      <div class="extenso">(${valorExtensoDoc(valor)})</div>
    </div>
    <div class="footer">
      <div>
        <p style="font-size:12px;color:#7a7268;max-width:280px;line-height:1.6;">
          Recebo a quantia acima referente ao período mencionado,
          dando plena quitação do débito correspondente.
        </p>
        <p style="font-size:11px;color:#7a7268;margin-top:8px;">${OWNER_CIDADE}, ${dataFmt}</p>
      </div>
      <div style="text-align:center;">
        <div class="stamp">
          <div class="stamp-label">Valor quitado</div>
          <div class="stamp-value">${fmtBRL(valor)}</div>
        </div>
      </div>
    </div>
    <div style="padding:0 32px 28px;">
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-name">Lucas Prado Medeiros Perin</div>
        <div class="signature-cpf">CPF: 702.738.471-04 · Locador</div>
      </div>
    </div>
  </div>
  <scr'+'ipt>window.onload=()=>window.print();</'+'script>
  </body></html>`;

  const w = window.open('','_blank','width=700,height=800');
  w.document.write(html);
  w.document.close();
}
