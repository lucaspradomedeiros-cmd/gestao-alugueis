// ============================================================
// NAVIGATION
// ============================================================

const PT = {
  dashboard: 'Painel Geral',
  imoveis: 'Imóveis',
  condominio: 'Condomínio',
  tenants: 'Locatários',
  alerts: 'Alertas',
  reajustes: 'Reajustes',
  report: 'Receitas',
  despesas: 'Despesas do Escritório',
  clientes: 'Clientes',
  'ficha-adv': 'Ficha do Cliente'
};

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const navEl = document.querySelector(`[onclick="showPage('${id}')"]`);
  if(navEl) navEl.classList.add('active');
  else if(id==='ficha-adv'){ const el=document.querySelector(`[onclick="showPage('clientes')"]`); if(el) el.classList.add('active'); }
  document.getElementById('page-title').textContent=PT[id]||id;
  if(id==='imoveis')renderImoveis();
  if(id==='tenants')renderTenants();
  if(id==='alerts')renderAlerts();
  if(id==='reajustes')renderReajustes();
  if(id==='report'){ activeReportTab='receitas'; showReportTab('receitas'); }
  if(id==='condominio')initCondoPage();
  if(id==='despesas')renderFinanceiro();
  if(id==='clientes')renderClientesAdv();
}
