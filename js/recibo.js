// ============================================================
// RECIBOS DE PAGAMENTO
// ============================================================

function openRecibo(id){
  const t = tenants.find(x=>x.id===id);
  if(!t||t.vago) return;
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

function buildRecibo(){
  const t = tenants.find(x=>x.id===reciboTid);
  if(!t) return;

  const ref   = document.getElementById('rb-ref').value;
  const data  = document.getElementById('rb-data').value;
  const valor = R(document.getElementById('rb-valor').value);
  const forma = document.getElementById('rb-forma').value;

  const entry = t.history.find(h=>h.ref===ref);

  const itens = [];
  if(entry){
    if(R(entry.aluguel)>0) itens.push(['Aluguel', fmtBRL(R(entry.aluguel))]);
    if(R(entry.condo)>0)   itens.push(['Condomínio (ref. '+prevMonthLabel(ref)+')', fmtBRL(R(entry.condo))]);
    if(R(entry.iptu)>0)    itens.push(['IPTU', fmtBRL(R(entry.iptu))]);
    if(R(entry.lixo)>0)    itens.push(['Taxa de Lixo', fmtBRL(R(entry.lixo))]);
    const pen = R(entry.multa)+R(entry.juros)+R(entry.pendingMulta)+R(entry.pendingJuros);
    if(pen>0)              itens.push(['Encargos (multa/juros)', fmtBRL(pen)]);
    if(entry.extras) entry.extras.forEach(ex=>{
      if(ex.descricao||R(ex.valor)>0) itens.push([ex.descricao||'Cobrança extra', fmtBRL(R(ex.valor))]);
    });
  }

  const maxLbl = Math.max(...itens.map(i=>i[0].length), 20);
  const itensTxt = itens.map(([l,v])=>
    `  ${l.padEnd(maxLbl+2, '.')} ${v}`
  ).join('\n');

  const dataFmt = data ? fmtDate(data) : '—';
  const reciboNum = `${ref ? ref.replace('-','') : 'XXXXXX'}-${String(t.id).padStart(2,'0')}`;

  const lines = [
    `╔${'═'.repeat(58)}╗`,
    `║${'RECIBO DE PAGAMENTO'.padStart(38).padEnd(58)}║`,
    `║${'Residencial Santa Nonna I'.padStart(41).padEnd(58)}║`,
    `║${'Rua Manoel Santiago 272 · Campo Grande/MS'.padStart(49).padEnd(58)}║`,
    `╠${'═'.repeat(58)}╣`,
    `║  Recibo nº: ${reciboNum.padEnd(45)}║`,
    `║  Data:      ${dataFmt.padEnd(45)}║`,
    `╠${'═'.repeat(58)}╣`,
    `║  Locatário: ${t.name.padEnd(45)}║`,
    `║  Imóvel:    ${t.unit.padEnd(45)}║`,
    `║  Referência:${monthName(ref).padEnd(45)}║`,
    `╠${'═'.repeat(58)}╣`,
    `║  DISCRIMINAÇÃO:${' '.repeat(42)}║`,
    `║${' '.repeat(58)}║`,
    ...itensTxt.split('\n').map(l=>`║${l.padEnd(58)}║`),
    `║${' '.repeat(58)}║`,
    `╠${'═'.repeat(58)}╣`,
    `║  VALOR PAGO: ${fmtBRL(valor).padEnd(44)}║`,
    `║  Forma:      ${forma.padEnd(44)}║`,
    `╠${'═'.repeat(58)}╣`,
    `║  Recebo a quantia acima referente ao período   ║`,
    `║  mencionado, dando plena quitação do débito.   ║`,
    `║${' '.repeat(58)}║`,
    `║  Campo Grande/MS, ${dataFmt.padEnd(39)}║`,
    `║${' '.repeat(58)}║`,
    `║  _______________________________________________║`,
    `║  Lucas Prado Medeiros Perin — Locador          ║`,
    `║  CPF: 702.738.471-04                           ║`,
    `╚${'═'.repeat(58)}╝`,
  ];

  document.getElementById('recibo-preview').textContent = lines.join('\n');
}

function prevMonthLabel(ref){
  if(!ref) return '—';
  const[y,m]=ref.split('-');
  let pm=parseInt(m)-1,py=parseInt(y);
  if(pm<1){pm=12;py--;}
  return `${MN[pm]}/${py}`;
}

function copyRecibo(){
  const txt = document.getElementById('recibo-preview').textContent;
  navigator.clipboard.writeText(txt).then(()=>{
    const b=document.getElementById('rb-copy');
    b.textContent='✓ Copiado!';b.style.color='var(--green)';
    setTimeout(()=>{b.textContent='📋 Copiar texto';b.style.color='';},2000);
  });
}

function printRecibo(){
  const t = tenants.find(x=>x.id===reciboTid);
  if(!t) return;
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
    if(pen>0)              itens.push(['Encargos (multa/juros)', pen]);
    if(entry.extras) entry.extras.forEach(ex=>{
      if(ex.descricao||R(ex.valor)>0) itens.push([ex.descricao||'Cobrança extra', R(ex.valor)]);
    });
  }

  const itensTr = itens.map(([l,v])=>`
    <tr>
      <td style="padding:7px 12px;border-bottom:1px solid #e8e4dd;">${l}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e8e4dd;text-align:right;font-weight:500;">${fmtBRL(v)}</td>
    </tr>`).join('');

  const reciboNum = `${ref ? ref.replace('-','') : 'XXXXXX'}-${String(t.id).padStart(2,'0')}`;
  const dataFmt = data ? fmtDate(data) : '—';

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
    table{width:100%;border-collapse:collapse;}
    .total-row td{padding:10px 12px;font-weight:600;font-size:14px;background:#eaf4ee;color:#2D6A4F;}
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
      <div class="header-sub">Residencial Santa Nonna I · Rua Manoel Santiago 272, Campo Grande/MS</div>
      <div class="header-num">Nº ${reciboNum}</div>
    </div>
    <div class="section">
      <div class="section-title">Dados do locatário</div>
      <div class="info-grid">
        <div class="info-item"><label>Nome</label><span>${t.name}</span></div>
        <div class="info-item"><label>Imóvel</label><span>${t.unit}</span></div>
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
    </div>
    <div class="footer">
      <div>
        <p style="font-size:12px;color:#7a7268;max-width:280px;line-height:1.6;">
          Recebo a quantia acima referente ao período mencionado,
          dando plena quitação do débito correspondente.
        </p>
        <p style="font-size:11px;color:#7a7268;margin-top:8px;">Campo Grande/MS, ${dataFmt}</p>
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
