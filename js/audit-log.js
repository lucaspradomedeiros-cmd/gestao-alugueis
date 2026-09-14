// ============================================================
// LOG DE AUDITORIA (14/09/2026)
// ============================================================
// Ideia do usuário, motivada pelos incidentes reais da sessão de
// 14/09/2026 (mês fantasma criado sozinho pra ex-inquilino + log de
// pagamentos duplicado numa edição) — ambos só foram descobertos porque
// o usuário reparou visualmente e Claude teve que cruzar dados manualmente
// no console pra diagnosticar. Este log registra pagamentos, exclusões e
// correções automáticas do sistema, pra dar pra auditar sem precisar disso.
// Ver PLANO_MELHORIAS.md seção 13.

// `auditLog` é declarado em js/state.js e viaja junto no payload salvo
// (getPayload()/applyPayload() em js/storage.js) — sincroniza pelo Drive
// como qualquer outro dado do app.

const AUDIT_LOG_MAX = 500;

function logAudit(resumo, dados){
  try{
    auditLog.push(Object.assign({ ts: new Date().toISOString(), resumo }, dados||{}));
    // Mantém só as últimas AUDIT_LOG_MAX entradas — log é uma rede de
    // segurança pra auditoria recente, não um arquivo histórico permanente.
    if(auditLog.length > AUDIT_LOG_MAX) auditLog.splice(0, auditLog.length - AUDIT_LOG_MAX);
  }catch(e){
    console.warn('logAudit falhou (não interrompe a ação que estava sendo registrada):', e);
  }
}

function _fmtAuditData(iso){
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function abrirAuditLog(){
  const busca = document.getElementById('audit-log-busca');
  if(busca) busca.value = '';
  renderAuditLog();
  openOverlay('audit-log-overlay');
}

function renderAuditLog(){
  const buscaEl = document.getElementById('audit-log-busca');
  const busca = (buscaEl && buscaEl.value || '').toLowerCase().trim();
  const lista = document.getElementById('audit-log-lista');
  if(!lista) return;
  const itens = [...(auditLog||[])].reverse().filter(e => !busca || (e.resumo||'').toLowerCase().includes(busca));
  const total = (auditLog||[]).length;
  const contagem = document.getElementById('audit-log-contagem');
  if(contagem) contagem.textContent = busca ? `${itens.length} de ${total} registros` : `${total} registro(s)`;
  if(!itens.length){
    lista.innerHTML = `<div style="font-size:13px;color:var(--text-faint);text-align:center;padding:24px;">Nenhum registro ${busca?'encontrado para essa busca':'ainda — vai se preenchendo conforme você usa o sistema'}.</div>`;
    return;
  }
  lista.innerHTML = itens.map(e => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <div style="color:var(--text-faint);font-size:11px;">${_fmtAuditData(e.ts)}${e.tipo?` · ${e.tipo}`:''}</div>
      <div>${e.resumo}</div>
    </div>`).join('');
}

function copiarAuditLog(){
  const texto = [...(auditLog||[])].reverse().map(e => `${_fmtAuditData(e.ts)} — ${e.resumo}`).join('\n');
  if(!texto){ if(typeof gaToast==='function') gaToast('Log vazio, nada pra copiar.', 'error'); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto)
      .then(()=>{ if(typeof gaToast==='function') gaToast('Log copiado!'); })
      .catch(()=>{ if(typeof gaToast==='function') gaToast('Não deu pra copiar automaticamente.', 'error'); });
  }
}
