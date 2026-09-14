// ============================================================
// LOG TÉCNICO / MODO DIAGNÓSTICO (14/09/2026)
// ============================================================
// Diferente do log de auditoria (js/audit-log.js, sempre ativo, dados de
// negócio, sincroniza pelo Drive): este é um log TÉCNICO — erros JS,
// promises rejeitadas sem tratamento, console.error/warn, e telas/modais
// que pedem pra abrir mas o elemento não existe (silenciosamente, hoje).
// Fica DESLIGADO por padrão (só liga quando precisa investigar um bug),
// e guarda só localmente (localStorage) — não é dado do usuário, não vai
// pro Drive nem pro backup. Ver PLANO_MELHORIAS.md seção 13 (continuação).

const DEBUG_LOG_MAX = 200;
const DEBUG_MODE_KEY = 'gestao_alugueis_debug_mode';
const DEBUG_LOG_KEY  = 'gestao_alugueis_debug_log';

function logDebug(tipo, mensagem, detalhes){
  if(!debugMode) return;
  try{
    debugLog.push(Object.assign({ ts: new Date().toISOString(), tipo, mensagem: String(mensagem) }, detalhes||{}));
    if(debugLog.length > DEBUG_LOG_MAX) debugLog.splice(0, debugLog.length - DEBUG_LOG_MAX);
    localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(debugLog));
    _atualizarBadgeDebug();
  }catch(e){
    // Não deixa o próprio log técnico virar fonte de erro — falha calada.
  }
}

function _atualizarBadgeDebug(){
  const badge = document.getElementById('debug-log-badge');
  if(badge) badge.textContent = debugLog.length ? String(debugLog.length) : '';
}

function initDebugMode(){
  try{
    debugMode = localStorage.getItem(DEBUG_MODE_KEY) === '1';
    const savedLog = localStorage.getItem(DEBUG_LOG_KEY);
    if(savedLog) debugLog = JSON.parse(savedLog) || [];
  }catch(e){ debugMode = false; debugLog = []; }

  _syncDebugToggleUI();
  _atualizarBadgeDebug();

  // Captura global — sempre "ligada" no sentido de estar instalada, mas
  // logDebug() só grava de verdade quando debugMode está true. Assim não
  // precisa remover/reinstalar listener nenhum ao ligar/desligar.
  window.addEventListener('error', function(evt){
    logDebug('erro', evt.message, {
      arquivo: evt.filename ? evt.filename.split('/').pop() : undefined,
      linha: evt.lineno, coluna: evt.colno,
      stack: evt.error && evt.error.stack
    });
  });
  window.addEventListener('unhandledrejection', function(evt){
    const r = evt.reason;
    logDebug('promise', (r && r.message) || String(r), { stack: r && r.stack });
  });

  const _origError = console.error.bind(console);
  console.error = function(...args){
    logDebug('console.error', args.map(a => a instanceof Error ? (a.stack||a.message) : (typeof a==='object' ? JSON.stringify(a) : String(a))).join(' '));
    _origError(...args);
  };
  const _origWarn = console.warn.bind(console);
  console.warn = function(...args){
    logDebug('console.warn', args.map(a => a instanceof Error ? (a.stack||a.message) : (typeof a==='object' ? JSON.stringify(a) : String(a))).join(' '));
    _origWarn(...args);
  };
}

function toggleDebugMode(){
  debugMode = !debugMode;
  try{ localStorage.setItem(DEBUG_MODE_KEY, debugMode ? '1' : '0'); }catch(e){}
  _syncDebugToggleUI();
  if(typeof gaToast === 'function'){
    gaToast(debugMode ? '🐞 Modo diagnóstico LIGADO — repita a ação que deu problema, depois abra "Ver log técnico"' : 'Modo diagnóstico desligado');
  }
}

function _syncDebugToggleUI(){
  const btn = document.getElementById('btn-debug-toggle');
  const label = document.getElementById('debug-label');
  if(label) label.textContent = debugMode ? 'Modo diagnóstico (ligado)' : 'Modo diagnóstico';
  if(btn) btn.style.color = debugMode ? 'var(--red)' : '';
}

function _fmtDebugData(iso){
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

function abrirDebugLog(){
  renderDebugLog();
  openOverlay('debug-log-overlay');
}

function renderDebugLog(){
  const lista = document.getElementById('debug-log-lista');
  if(!lista) return;
  const itens = [...(debugLog||[])].reverse();
  const contagem = document.getElementById('debug-log-contagem');
  if(contagem) contagem.textContent = `${itens.length} registro(s)${debugMode?'':' · modo diagnóstico desligado agora'}`;
  if(!itens.length){
    lista.innerHTML = `<div style="font-size:13px;color:var(--text-faint);text-align:center;padding:24px;">Nenhum erro registrado. Ligue o "Modo diagnóstico" no menu e repita a ação que deu problema.</div>`;
    return;
  }
  const corTipo = { erro:'var(--red)', promise:'var(--red)', 'console.error':'var(--red)', 'console.warn':'var(--amber)', tela:'var(--amber)' };
  lista.innerHTML = itens.map(e => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <div style="color:var(--text-faint);font-size:11px;">${_fmtDebugData(e.ts)} · <span style="color:${corTipo[e.tipo]||'var(--text-faint)'};font-weight:600;">${e.tipo}</span>${e.arquivo?` · ${e.arquivo}:${e.linha||''}`:''}</div>
      <div style="font-family:monospace;white-space:pre-wrap;word-break:break-word;">${(e.mensagem||'').replace(/</g,'&lt;')}</div>
    </div>`).join('');
}

function copiarDebugLog(){
  const texto = [...(debugLog||[])].reverse().map(e => `${_fmtDebugData(e.ts)} [${e.tipo}]${e.arquivo?` ${e.arquivo}:${e.linha}`:''} — ${e.mensagem}${e.stack?`\n${e.stack}`:''}`).join('\n\n');
  if(!texto){ if(typeof gaToast==='function') gaToast('Log técnico vazio, nada pra copiar.', 'error'); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto)
      .then(()=>{ if(typeof gaToast==='function') gaToast('Log técnico copiado!'); })
      .catch(()=>{ if(typeof gaToast==='function') gaToast('Não deu pra copiar automaticamente.', 'error'); });
  }
}

function limparDebugLog(){
  if(!confirm('Limpar o log técnico? Isso não afeta o log de auditoria.')) return;
  debugLog = [];
  try{ localStorage.setItem(DEBUG_LOG_KEY, '[]'); }catch(e){}
  _atualizarBadgeDebug();
  renderDebugLog();
}
