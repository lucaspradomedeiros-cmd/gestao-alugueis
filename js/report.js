// ============================================================
// REPORT — Dashboard reports and summaries
// ============================================================

function showReportTab(tab){
  activeReportTab = tab;
  ['receitas','imovel','repasse'].forEach(t=>{
    document.getElementById(`rtab-${t}`)?.classList.toggle('active', t===tab);
    const el = document.getElementById(`report-tab-${t}`);
    if(el) el.style.display = t===tab ? 'block' : 'none';
  });
  const printBtn = document.getElementById('btn-print-report');
  if(printBtn) printBtn.style.display = (tab==='imovel'||tab==='repasse') ? 'inline-flex' : 'none';
  if(tab==='receitas') renderReport();
  if(tab==='imovel')   renderReportImovel();
  if(tab==='repasse')  renderReportRepasse();
}

function renderReport(){
  const c=document.getElementById('report-table');
  const ativos=tenants.filter(t=>!t.vago);
  const total=ativos.reduce((s,t)=>s+R(t.rent),0);
  let rows=`<div class="rrow rhdr"><div style="flex:2">Imóvel</div><div style="flex:1;text-align:right">Aluguel</div><div style="flex:1;text-align:right">Status</div><div style="flex:1;text-align:right">Garantia</div></div>`;
  tenants.forEach(t=>{
    const st=statusOf(t);
    const stTxt={pago:'Em dia',pendente:'Pendente',inadimplente:'Inadimplente',parcial:'Parcial',futuro:'A vencer',vago:'Vago'}[st]||st;
    rows+=`<div class="rrow" style="${t.vago?'opacity:.5':'cursor:pointer'}" onclick="${t.vago?'':' openDet('+t.id+')'}"><div style="flex:2;font-weight:500">${t.unit} — ${t.name.split(' ').slice(0,2).join(' ')}</div><div style="flex:1;text-align:right">${t.vago?'—':fmtBRL(t.rent)}</div><div style="flex:1;text-align:right"><span class="s-badge s-${st}">${stTxt}</span></div><div style="flex:1;text-align:right;font-size:12px;color:var(--text-muted)">${t.garantia}</div></div>`;
  });
  rows+=`<div class="rrow" style="background:var(--green-bg);font-weight:600;"><div style="flex:2">Total Mensal</div><div style="flex:1;text-align:right;color:var(--green);">${fmtBRL(total)}</div><div style="flex:2"></div></div>`;
  c.innerHTML=rows;
}

function renderReportImovel(){
  const el = document.getElementById('report-tab-imovel');
  if(!el) return;
  const todayRef = `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`;

  if(!imoveis.length){
    el.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-muted);">Nenhum imóvel cadastrado. <a style="color:var(--green);cursor:pointer;" onclick="showPage('imoveis')">Cadastre imóveis primeiro →</a></div>`;
    return;
  }

  el.innerHTML = imoveis.map(im=>{
    const tenant = tenants.find(t=>t.imovelId===im.id && !t.vago);
    const despesas = (im.despesas||[]).filter(d=>d.ativo);
    const despInq  = despesas.filter(d=>d.resp==='inquilino');
    const despProp = despesas.filter(d=>d.resp==='proprietario');
    const despImob = despesas.filter(d=>d.resp==='imobiliaria');

    const vlrMes = d => R(d.recorr==='parcelado' ? d.valorParcela : d.valor);
    const totalInq  = despInq.reduce((s,d)=>s+vlrMes(d),0);
    const totalProp = despProp.reduce((s,d)=>s+vlrMes(d),0);
    const totalImob = despImob.reduce((s,d)=>s+vlrMes(d),0);

    const condoNome = im.gestao==='condominio'
      ? (condominios.find(c=>c.id===im.condoId)?.nome||'—') : 'Autônomo';

    const mkRows = (list, color) => list.length ? list.map(d=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
        <span>${despCatIcon(d.cat)} ${d.desc}
          ${d.recorr==='parcelado'?`<span style="font-size:10px;color:var(--text-faint);"> · ${d.parcelas}x</span>`:''}
          ${d.recorr==='mensal'?`<span style="font-size:10px;color:var(--text-faint);"> · mensal</span>`:''}
        </span>
        <span style="font-weight:600;color:${color};">${fmtBRL(vlrMes(d))}/mês</span>
      </div>`).join('') : `<div style="font-size:11px;color:var(--text-faint);padding:4px 0;">Nenhuma</div>`;

    return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
        <div>
          <div style="font-family:'DM Serif Display',serif;font-size:16px;">${im.nome}</div>
          <div style="font-size:12px;color:var(--text-muted);">${im.tipo} · ${condoNome}${im.endereco?' · '+im.endereco:''}</div>
          ${im.propNome?`<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">🔑 Prop.: ${im.propNome}${im.propTel?' · '+im.propTel:''}</div>`:''}
        </div>
        <div style="text-align:right;">
          ${tenant?`<div style="font-size:12px;font-weight:600;color:var(--green);">👤 ${tenant.name.split(' ')[0]} · ${fmtBRL(tenant.rent)}/mês</div>`:'<div style="font-size:12px;color:var(--text-faint);">Sem inquilino</div>'}
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${despesas.length} despesa(s) ativa(s)</div>
        </div>
      </div>
      ${im.gestao==='condominio'
        ? `<div style="background:var(--green-bg);border:1px solid var(--green-light);border-radius:var(--radius-sm);padding:10px 14px;font-size:12px;color:var(--green);">🏘 Despesas gerenciadas pelo condomínio <strong>${condoNome}</strong>.</div>`
        : `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div style="border:1px solid var(--green-light);border-radius:var(--radius-sm);padding:12px;">
              <div style="font-size:10px;font-weight:600;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Inquilino · ${fmtBRL(totalInq)}/mês</div>
              ${mkRows(despInq,'var(--green)')}
            </div>
            <div style="border:1px solid var(--blue-light);border-radius:var(--radius-sm);padding:12px;">
              <div style="font-size:10px;font-weight:600;color:var(--blue);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Proprietário · ${fmtBRL(totalProp)}/mês</div>
              ${mkRows(despProp,'var(--blue)')}
            </div>
            <div style="border:1px solid var(--amber-light);border-radius:var(--radius-sm);padding:12px;">
              <div style="font-size:10px;font-weight:600;color:var(--amber);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Imobiliária · ${fmtBRL(totalImob)}/mês</div>
              ${mkRows(despImob,'var(--amber)')}
            </div>
          </div>`
      }
    </div>`;
  }).join('');
}

function renderReportRepasse(){
  const el = document.getElementById('report-tab-repasse');
  if(!el) return;
  const todayRef = `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`;

  // Group tenants by proprietário (via imovel)
  const proprietarios = {};

  tenants.filter(t=>!t.vago).forEach(t=>{
    const im = t.imovelId ? getImovel(t.imovelId) : null;
    const propNome = im?.propNome || 'Proprietário não identificado';
    const propTel  = im?.propTel  || '';
    const key = propNome;
    if(!proprietarios[key]) proprietarios[key] = { nome:propNome, tel:propTel, imoveis:[] };

    const aluguel    = R(t.rent);
    const comissao   = R2(aluguel * TAX); // 10%
    const last       = t.history[t.history.length-1];
    const stObj      = getTenantFinancials(t);
    const statusTxt  = {pago:'Pago',pendente:'Pendente',inadimplente:'Inadimplente',parcial:'Parcial',futuro:'A vencer'}[stObj.status]||stObj.status;
    const pago       = last ? R(last.valorPago) : 0;

    // Despesas do proprietário
    const despProp   = im && im.gestao==='autonomo'
      ? getDespesasAtivas(im.id, todayRef).filter(d=>d.resp==='proprietario') : [];
    const totalDespProp = despProp.reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);

    const repasse = R2(aluguel - comissao - totalDespProp);

    proprietarios[key].imoveis.push({
      imNome: im?.nome || t.unit, tenant:t, aluguel, comissao,
      despProp, totalDespProp, repasse, statusTxt, pago
    });
  });

  if(!Object.keys(proprietarios).length){
    el.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-muted);">Nenhum locatário ativo. Cadastre locatários vinculados a imóveis com proprietário.</div>`;
    return;
  }

  el.innerHTML = Object.values(proprietarios).map(prop=>{
    const totalAluguel  = prop.imoveis.reduce((s,x)=>s+x.aluguel,0);
    const totalComissao = prop.imoveis.reduce((s,x)=>s+x.comissao,0);
    const totalDesp     = prop.imoveis.reduce((s,x)=>s+x.totalDespProp,0);
    const totalRepasse  = prop.imoveis.reduce((s,x)=>s+x.repasse,0);

    const rows = prop.imoveis.map(x=>{
      const despRows = x.despProp.length
        ? x.despProp.map(d=>`<div style="font-size:10px;color:var(--blue);padding-left:8px;">↳ ${d.desc}: − ${fmtBRL(d.recorr==='parcelado'?d.valorParcela:d.valor)}</div>`).join('')
        : '';
      return `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;align-items:start;padding:10px 0;border-bottom:1px solid var(--border);font-size:12px;">
        <div>
          <div style="font-weight:500;">${x.imNome}</div>
          <div style="font-size:11px;color:var(--text-muted);">${x.tenant.name.split(' ').slice(0,2).join(' ')}</div>
          ${despRows}
        </div>
        <div style="text-align:right;">${fmtBRL(x.aluguel)}</div>
        <div style="text-align:right;color:var(--amber);">− ${fmtBRL(x.comissao)}</div>
        <div style="text-align:right;color:var(--blue);">${x.totalDespProp>0?'− '+fmtBRL(x.totalDespProp):'—'}</div>
        <div style="text-align:right;font-weight:600;color:var(--green);">${fmtBRL(x.repasse)}</div>
      </div>`;
    }).join('');

    return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div>
          <div style="font-family:'DM Serif Display',serif;font-size:17px;">🔑 ${prop.nome}</div>
          ${prop.tel?`<div style="font-size:12px;color:var(--text-muted);">${prop.tel}</div>`:''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;">Repasse líquido total</div>
          <div style="font-size:24px;font-weight:300;color:var(--green);">${fmtBRL(totalRepasse)}</div>
          <div style="font-size:11px;color:var(--text-muted);">${prop.imoveis.length} imóvel(is)</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;padding:6px 0;border-bottom:2px solid var(--border);font-size:10px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;">
        <div>Imóvel / Inquilino</div><div style="text-align:right;">Aluguel</div>
        <div style="text-align:right;">Comissão (10%)</div>
        <div style="text-align:right;">Desp. Prop.</div>
        <div style="text-align:right;">Repasse</div>
      </div>
      ${rows}
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;padding:10px 0 0;font-size:13px;font-weight:600;">
        <div>TOTAL</div>
        <div style="text-align:right;">${fmtBRL(totalAluguel)}</div>
        <div style="text-align:right;color:var(--amber);">− ${fmtBRL(totalComissao)}</div>
        <div style="text-align:right;color:var(--blue);">${totalDesp>0?'− '+fmtBRL(totalDesp):'—'}</div>
        <div style="text-align:right;color:var(--green);">${fmtBRL(totalRepasse)}</div>
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;">
        <button class="btn btn-primary" style="font-size:12px;" onclick="printRepasse('${prop.nome}')">🖨 Imprimir repasse</button>
      </div>
    </div>`;
  }).join('');
}

function printRepasse(propNome){
  const todayRef = `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`;
  const prop = (() => {
    const imovelRows = [];
    tenants.filter(t=>!t.vago).forEach(t=>{
      const im = t.imovelId ? getImovel(t.imovelId) : null;
      if((im?.propNome||'Proprietário não identificado')!==propNome) return;
      const aluguel = R(t.rent);
      const comissao = R2(aluguel*TAX);
      const despProp = im && im.gestao==='autonomo'
        ? getDespesasAtivas(im.id,todayRef).filter(d=>d.resp==='proprietario') : [];
      const totalDespProp = despProp.reduce((s,d)=>s+R(d.recorr==='parcelado'?d.valorParcela:d.valor),0);
      imovelRows.push({im,t,aluguel,comissao,despProp,totalDespProp,repasse:R2(aluguel-comissao-totalDespProp)});
    });
    return imovelRows;
  })();

  const totalAluguel  = prop.reduce((s,x)=>s+x.aluguel,0);
  const totalComissao = prop.reduce((s,x)=>s+x.comissao,0);
  const totalDesp     = prop.reduce((s,x)=>s+x.totalDespProp,0);
  const totalRepasse  = prop.reduce((s,x)=>s+x.repasse,0);
  const mes = monthName(`${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}`);

  const rows = prop.map(x=>`
    <tr>
      <td style="padding:8px 6px;border-bottom:1px solid #e2ddd6;">
        <strong>${x.im?.nome||x.t.unit}</strong><br>
        <span style="font-size:11px;color:#7a7268;">${x.t.name}</span>
        ${x.despProp.map(d=>`<br><span style="font-size:10px;color:#1A4F8A;">↳ ${d.desc}: − ${fmtBRL(d.recorr==='parcelado'?d.valorParcela:d.valor)}</span>`).join('')}
      </td>
      <td style="text-align:right;padding:8px 6px;border-bottom:1px solid #e2ddd6;">${fmtBRL(x.aluguel)}</td>
      <td style="text-align:right;padding:8px 6px;border-bottom:1px solid #e2ddd6;color:#8B5E0A;">− ${fmtBRL(x.comissao)}</td>
      <td style="text-align:right;padding:8px 6px;border-bottom:1px solid #e2ddd6;color:#1A4F8A;">${x.totalDespProp>0?'− '+fmtBRL(x.totalDespProp):'—'}</td>
      <td style="text-align:right;padding:8px 6px;border-bottom:1px solid #e2ddd6;font-weight:700;color:#2D6A4F;">${fmtBRL(x.repasse)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Repasse — ${propNome}</title>
  <style>body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1c1a17;margin:0;padding:32px 36px;}
  table{width:100%;border-collapse:collapse;}th{font-size:10px;font-weight:700;color:#7a7268;text-transform:uppercase;letter-spacing:.5px;padding:6px;border-bottom:2px solid #2D6A4F;text-align:right;}th:first-child{text-align:left;}
  .header{margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #2D6A4F;}
  @media print{@page{margin:1.5cm;}}
  </style></head><body>
  <div class="header">
    <div style="font-family:Georgia,serif;font-size:20px;color:#2D6A4F;">Comprovante de Repasse</div>
    <div style="font-size:13px;font-weight:600;margin-top:4px;">${propNome}</div>
    <div style="font-size:12px;color:#7a7268;">Referência: ${mes} · Emitido em ${new Date().toLocaleDateString('pt-BR')}</div>
  </div>
  <table>
    <thead><tr><th style="text-align:left;">Imóvel / Inquilino</th><th>Aluguel</th><th>Comissão (10%)</th><th>Desp. Proprietário</th><th>Repasse Líquido</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="background:#f5f3ee;font-weight:700;">
        <td style="padding:8px 6px;">TOTAL</td>
        <td style="text-align:right;padding:8px 6px;">${fmtBRL(totalAluguel)}</td>
        <td style="text-align:right;padding:8px 6px;color:#8B5E0A;">− ${fmtBRL(totalComissao)}</td>
        <td style="text-align:right;padding:8px 6px;color:#1A4F8A;">${totalDesp>0?'− '+fmtBRL(totalDesp):'—'}</td>
        <td style="text-align:right;padding:8px 6px;color:#2D6A4F;font-size:15px;">${fmtBRL(totalRepasse)}</td>
      </tr>
    </tfoot>
  </table>
  <div style="margin-top:28px;font-size:11px;color:#7a7268;border-top:1px solid #e2ddd6;padding-top:12px;display:flex;justify-content:space-between;">
    <span>Lucas Prado Medeiros Perin · OWNER_CPF</span>
    <span>Gestão de Aluguéis</span>
  </div>
  <scr`+`ipt>window.onload=()=>window.print();</scr`+`ipt>
  </body></html>`;
  const w = window.open('','_blank','width=860,height=700');
  w.document.write(html); w.document.close();
}

function printRelatorioImovel(){
  if(activeReportTab==='repasse') return; // handled per-proprietário
  if(activeReportTab==='imovel'){
    // just print the current page
    window.print();
  }
}
