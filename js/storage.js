// ============================================================
// STORAGE LAYER — Persistence & Drive Sync
// ============================================================

const STORAGE_KEY = 'gestao_alugueis_v1';

// ── localStorage ──────────────────────────────────────────────
function getPayload(){
  condoHistories[activeCondoId] = [...condoHistory];
  return { tenants, condoHistory, condominios, condoHistories, activeCondoId, imoveis, despesasEscritorio, receitasEscritorio, clientesAdv, savedAt: new Date().toISOString(), version: 4 };
}

function applyPayload(data){
  if(!data || !data.tenants) return false;
  tenants = data.tenants;
  if(data.condoHistory) condoHistory = data.condoHistory;
  if(data.imoveis) imoveis = data.imoveis;
  if(data.despesasEscritorio) despesasEscritorio = data.despesasEscritorio;
  if(data.receitasEscritorio) receitasEscritorio = data.receitasEscritorio;
  if(data.clientesAdv) clientesAdv = data.clientesAdv;
  if(data.condominios && data.condominios.length) condominios = data.condominios;
  if(data.condoHistories){
    condoHistories = data.condoHistories;
    const actId = data.activeCondoId||condominios[0]?.id||'c1';
    activeCondoId = actId;
    condoHistory = condoHistories[actId]||condoHistory;
    const c = condominios.find(x=>x.id===actId)||condominios[0];
    if(c){ CONDO_UNITS.length=0; c.units.forEach(u=>CONDO_UNITS.push(u)); }
  }
  return true;
}

function updateSaveStatus(msg, color='var(--text-faint)'){
  const el = document.getElementById('save-status');
  if(el){ el.textContent = msg; el.style.color = color; }
}

function saveToLocalStorage(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getPayload()));
    const now = new Date();
    updateSaveStatus(`💾 Salvo às ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`, 'var(--green)');
    setTimeout(()=>updateSaveStatus(driveConnected?'☁ Drive conectado':'💾 Local', driveConnected?'var(--blue)':'var(--text-faint)'), 3000);
  } catch(e){ console.warn('localStorage indisponível:', e); }
}

function loadFromLocalStorage(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    if(applyPayload(data)){
      if(data.savedAt){
        const d = new Date(data.savedAt);
        updateSaveStatus(`Último save: ${d.toLocaleDateString('pt-BR')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
      }
      return true;
    }
  } catch(e){ console.warn('Erro ao carregar localStorage:', e); }
  return false;
}

// ── Google Drive ──────────────────────────────────────────────
// Drive é a fonte principal. localStorage serve como cache local.
function saveToStorage(){
  saveToLocalStorage();
  if(driveConnected){
    clearTimeout(_driveDebounce);
    _driveDebounce = setTimeout(saveToDrive, 3000);
  } else {
    updateSaveStatus('⚠ Drive desconectado — dados salvos apenas localmente', 'var(--amber)');
    setTimeout(()=>updateSaveStatus('Conecte o Drive para salvar na nuvem','var(--amber)'), 4000);
  }
}

async function saveToDrive(){
  if(!driveConnected) return;
  try {
    updateSaveStatus('☁ Salvando no Drive…', 'var(--blue)');
    const payload = getPayload();
    const success = await DRIVE_LOADER.uploadFile(payload);
    if(success){
      const now = new Date();
      updateSaveStatus(`☁ Drive salvo às ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`, 'var(--blue)');
    } else {
      updateSaveStatus('⚠ Erro ao salvar no Drive', 'var(--red)');
    }
  } catch(e){ console.warn('Erro ao salvar no Drive:', e); updateSaveStatus('⚠ Erro ao salvar no Drive', 'var(--red)'); }
}

async function loadFromDrive(){
  try {
    updateSaveStatus('☁ Carregando do Drive…', 'var(--blue)');
    const success = await DRIVE_LOADER.loadFromDrive();
    if(success && window.DRIVE_DATA){
      // Aplicar dados carregados do Drive
      if(applyPayload(window.DRIVE_DATA)){
        if(window.DRIVE_DATA.savedAt){
          const d = new Date(window.DRIVE_DATA.savedAt);
          updateSaveStatus(`☁ Drive: ${d.toLocaleDateString('pt-BR')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`, 'var(--blue)');
        }
        hydrateEntries(); renderDashboard(); renderCondoSwitcher(); renderCondoInfoBar();
        return true;
      }
    } else if(!success){
      // Drive não tem arquivo ainda — envia os dados atuais
      console.log('[loadFromDrive] Nenhum arquivo no Drive. Enviando dados iniciais…');
      await saveToDrive();
      updateSaveStatus('☁ Dados enviados ao Drive (primeira vez)', 'var(--green)');
      return true;
    }
  } catch(e){ console.warn('[loadFromDrive] Erro:', e); updateSaveStatus('⚠ Erro ao carregar do Drive', 'var(--red)'); }
  return false;
}

function onDriveConnected(){
  driveConnected = true;
  DRIVE_LOADER.onDriveConnected();
  if(typeof SYNC_ENGINE !== 'undefined'){
    SYNC_ENGINE.onDriveConnected();
  }
  updateSaveStatus('☁ Drive conectado', 'var(--blue)');
  const btn = document.getElementById('btn-drive-connect');
  if(btn){ btn.innerHTML = '<span class="icon">☁</span> Drive ativo'; btn.style.color='var(--green)'; btn.style.background='var(--green-bg)'; btn.style.fontWeight='600'; }
  loadFromDrive();
  // Auto-save periódico a cada 2 minutos
  setInterval(()=>{ if(driveConnected){ clearTimeout(_driveDebounce); saveToDrive(); } }, 2*60*1000);
  // Salva ao fechar/recarregar a aba
  window.addEventListener('beforeunload', ()=>{ if(driveConnected) saveToDrive(); });
}

function onDriveDisconnected(){
  driveConnected = false;
  if(typeof SYNC_ENGINE !== 'undefined'){
    SYNC_ENGINE.onDriveDisconnected();
  }
  updateSaveStatus('💾 Desconectado - Dados salvos localmente', 'var(--text-faint)');
}

function updateSyncStatus(){
  if(typeof SYNC_ENGINE === 'undefined') return;
  const status = SYNC_ENGINE.getStatus();
  const statusEl = document.getElementById('sync-status');
  if(!statusEl) return;
  let indicator = '⏳';
  let text = 'Sincronizando...';
  let color = 'var(--blue)';
  if(status.offline) {
    indicator = '📱';
    text = `Offline (${status.queueLength} mudança${status.queueLength !== 1 ? 's' : ''})`;
    color = 'var(--amber)';
  } else if(status.synced) {
    indicator = '✓';
    const age = SYNC_ENGINE.getLastSyncAge();
    if(age) {
      const seconds = Math.floor(age / 1000);
      if(seconds < 60) {
        text = `Sincronizado há ${seconds}s`;
      } else {
        const minutes = Math.floor(seconds / 60);
        text = `Sincronizado há ${minutes}m`;
      }
    } else {
      text = 'Sincronizado';
    }
    color = 'var(--green)';
  } else if(status.state === 'ERROR') {
    indicator = '⚠';
    text = 'Erro na sincronização';
    color = 'var(--red)';
  }
  statusEl.innerHTML = `<span style="font-size: 16px; margin-right: 6px;">${indicator}</span><span>${text}</span>`;
  statusEl.style.color = color;
}

// ── INIT: Startup sequence (runs when DOM is ready) ────────────────────────────────────
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

function initializeApp(){
  const _hadSavedData = loadFromLocalStorage();
  if(!condoHistories['c1'] || !condoHistories['c1'].length) condoHistories['c1'] = [...condoHistory];
  tenants.forEach(t=>{ if(!t.condoId) t.condoId = 'c1'; });
  hydrateEntries();
  renderDashboard();
  renderCondoSwitcher();
  renderCondoInfoBar();
  if(!_hadSavedData) saveToStorage();

  // Aviso de Drive desconectado após 5s (tempo para auto-reconectar)
  setTimeout(()=>{
    if(!driveConnected) updateSaveStatus('⚠ Drive desconectado — clique em "Conectar Drive"', 'var(--amber)');
  }, 5000);
}
