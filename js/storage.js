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
    activeCondoId = data.activeCondoId||condominios[0]?.id||'c1';
    condoHistory = condoHistories[activeCondoId]||condoHistory;
  } else if(data.activeCondoId){
    activeCondoId = data.activeCondoId;
  }
  // 14/09/2026: popular CONDO_UNITS sempre que houver condominios carregados,
  // independente de condoHistories existir no payload — achado real: um
  // payload/cache sem esse campo deixava CONDO_UNITS vazio, e o histórico de
  // condomínio dividia por zero ("Por apto" mostrava "R$ ∞").
  if(condominios.length){
    const c = condominios.find(x=>x.id===activeCondoId)||condominios[0];
    if(c && c.units){ CONDO_UNITS.length=0; c.units.forEach(u=>CONDO_UNITS.push(u)); }
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
  _dirtyLocalEdit = true;
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
  // 14/09/2026: antes não retornava nada (sempre undefined), então quem
  // chamava (ex: resolução de conflito) nunca sabia se o save realmente
  // funcionou — achado real: um "Conflito resolvido — dados locais
  // enviados ao Drive" apareceu na tela mesmo o upload tendo falhado por
  // baixo dos panos, e os dados corrigidos nunca chegaram no Drive de
  // verdade. Agora retorna true/false refletindo o resultado real.
  if(!driveConnected) return false;
  try {
    // 14/09/2026: achado real — uma aba antiga esquecida aberta (outro
    // navegador/dispositivo) ficava sobrescrevendo o Drive com sua cópia
    // desatualizada a cada autosave periódico (2 em 2 min), sem checar nada
    // antes. Isso apagou silenciosamente uma correção feita em outro lugar
    // (Erivan). Agora, antes de sobrescrever, confere se o Drive mudou desde
    // a última vez que ESTA aba sincronizou com ele.
    if(DRIVE_LOADER.lastKnownDriveSavedAt){
      const remoteSavedAt = await DRIVE_LOADER.checkRemoteSavedAt();
      if(remoteSavedAt && remoteSavedAt !== DRIVE_LOADER.lastKnownDriveSavedAt){
        if(!_dirtyLocalEdit){
          // Drive mudou, mas esta aba não tem edição pendente de verdade
          // (autosave periódico numa aba parada, ou fechamento de aba sem
          // ter mexido em nada). Em vez de sobrescrever, adota os dados
          // novos do Drive silenciosamente — ninguém perde nada.
          console.log('[saveToDrive] Drive mudou e esta aba não tem edição pendente — recarregando do Drive em vez de sobrescrever.');
          await loadFromDrive();
          return false; // não foi um save — foi uma auto-atualização
        } else {
          // Drive mudou E esta aba tem edição de verdade pendente — conflito
          // genuíno, deixa o usuário decidir (mesma UI de sempre).
          console.warn('[saveToDrive] Drive mudou E esta aba tem edição pendente — tratando como conflito.');
          const drive = await DRIVE_LOADER.downloadFile(DRIVE_LOADER.driveFileId);
          DRIVE_LOADER.conflict = { local: getPayload(), drive };
          return await resolveDriveConflict();
        }
      }
    }
    updateSaveStatus('☁ Salvando no Drive…', 'var(--blue)');
    const payload = getPayload();
    const success = await DRIVE_LOADER.uploadFile(payload);
    if(success){
      _dirtyLocalEdit = false;
      const now = new Date();
      updateSaveStatus(`☁ Drive salvo às ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`, 'var(--blue)');
      return true;
    } else {
      updateSaveStatus('⚠ Erro ao salvar no Drive', 'var(--red)');
      return false;
    }
  } catch(e){ console.warn('Erro ao salvar no Drive:', e); updateSaveStatus('⚠ Erro ao salvar no Drive', 'var(--red)'); return false; }
}

// 14/09/2026: lógica de resolução de conflito extraída pra função própria —
// antes só existia inline dentro de loadFromDrive(); agora saveToDrive()
// também precisa dela (conflito genuíno detectado no meio de um autosave).
async function resolveDriveConflict(){
  const conflict = DRIVE_LOADER.conflict || {};
  const local = conflict.local, drive = conflict.drive;
  const fmt = iso => {
    if(!iso) return '(sem data)';
    const d = new Date(iso);
    return `${d.toLocaleDateString('pt-BR')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const manterLocal = confirm(
    `⚠ CONFLITO DE DADOS\n\n` +
    `Os dados salvos neste navegador (${fmt(local && local.savedAt)}) são mais recentes que os do Google Drive (${fmt(drive && drive.savedAt)}).\n\n` +
    `Isso costuma acontecer quando você edita dados sem o Drive conectado, ou quando outra aba/dispositivo salvou por cima.\n\n` +
    `OK = manter os dados deste navegador e enviá-los ao Drive agora (recomendado).\n` +
    `Cancelar = descartar os dados deste navegador e usar os do Drive.`
  );
  let ok;
  if(manterLocal && local){
    applyPayload(local);
    hydrateEntries(); renderDashboard(); renderCondoSwitcher(); renderCondoInfoBar(); renderTenants();
    const success = await DRIVE_LOADER.uploadFile(getPayload());
    if(success){
      _dirtyLocalEdit = false;
      updateSaveStatus('☁ Conflito resolvido — dados locais enviados ao Drive', 'var(--green)');
    } else {
      updateSaveStatus('⚠ Conflito NÃO resolvido — falha ao enviar ao Drive, tente salvar de novo', 'var(--red)');
    }
    ok = success;
  } else if(drive){
    DRIVE_LOADER.saveToLocalStorage(drive);
    applyPayload(drive);
    hydrateEntries(); renderDashboard(); renderCondoSwitcher(); renderCondoInfoBar(); renderTenants();
    DRIVE_LOADER.lastKnownDriveSavedAt = drive.savedAt || null;
    _dirtyLocalEdit = false;
    updateSaveStatus('☁ Conflito resolvido — dados do Drive aplicados', 'var(--amber)');
    ok = true;
  } else {
    ok = false;
  }
  DRIVE_LOADER.conflict = null;
  return ok;
}

async function loadFromDrive(){
  try {
    updateSaveStatus('☁ Carregando do Drive…', 'var(--blue)');
    const success = await DRIVE_LOADER.loadFromDrive();

    if(success === 'conflict'){
      await resolveDriveConflict();
      return true;
    }

    if(success && window.DRIVE_DATA){
      // Aplicar dados carregados do Drive
      if(applyPayload(window.DRIVE_DATA)){
        if(window.DRIVE_DATA.savedAt){
          const d = new Date(window.DRIVE_DATA.savedAt);
          updateSaveStatus(`☁ Drive: ${d.toLocaleDateString('pt-BR')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`, 'var(--blue)');
        }
        hydrateEntries(); renderDashboard(); renderCondoSwitcher(); renderCondoInfoBar(); renderTenants();
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
  // NÃO salvar dados vazios na primeira inicialização — Drive carregará os dados
  // if(!_hadSavedData) saveToStorage();

  // Aviso de Drive desconectado após 5s (tempo para auto-reconectar)
  setTimeout(()=>{
    if(!driveConnected) updateSaveStatus('⚠ Drive desconectado — clique em "Conectar Drive"', 'var(--amber)');
  }, 5000);
}
