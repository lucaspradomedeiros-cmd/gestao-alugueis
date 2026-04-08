/**
 * Motor de Sincronização Bidirecional - Fase 2
 * Gerencia sincronização Drive ↔ localStorage com versionamento e merge
 *
 * Features:
 * - Detecção de mudanças (delta tracking)
 * - Versionamento com hash
 * - Debounced save automático
 * - Offline mode com queue
 * - Merge strategy para conflitos
 */

const SYNC_ENGINE = {
  // ── Configuração ───────────────────────────────────────────
  config: {
    debounceMs: 3000,           // Aguardar 3s antes de sincronizar
    maxQueueSize: 100,          // Máximo de itens na fila offline
    mergeStrategy: 'drive-wins', // Drive sobrescreve Local em conflito
    maxRetries: 3,              // Máximo de tentativas de envio
    retryDelayMs: 1000          // Delay entre tentativas
  },

  // ── Estado ────────────────────────────────────────────────
  state: 'IDLE',                // IDLE, DETECTING, VERSIONING, DEBOUNCING, UPLOADING, etc
  version: 0,                   // Versão atual dos dados
  hash: null,                   // Hash SHA-256 dos dados
  lastSyncTime: null,           // Última sincronização bem-sucedida
  queue: [],                    // Fila de mudanças offline
  debounceTimeout: null,        // Timeout do debounce
  driveLoader: null,            // Referência para DRIVE_LOADER
  localData: null,              // Referência para dados locais

  // ── Inicialização ──────────────────────────────────────────
  async init(driveLoader, initialData) {
    console.log('[SyncEngine] Inicializando...');
    this.driveLoader = driveLoader;
    this.localData = initialData || DRIVE_LOADER.getData();

    // Calcular versão inicial
    if (this.localData) {
      this.hash = await this._calculateHash(this.localData);
      this.version = 1;
      console.log(`[SyncEngine] Hash inicial: ${this.hash.slice(0, 8)}...`);
    }

    // Carregar fila persistida
    this._loadQueue();

    // Processar fila se havia itens
    if (this.queue.length > 0) {
      console.log(`[SyncEngine] Fila recuperada: ${this.queue.length} itens`);
    }

    console.log('[SyncEngine] Inicialização completa');
    return true;
  },

  // ── Detecção de Mudanças ───────────────────────────────────
  onChange(path, oldValue, newValue) {
    // Ignorar mudanças de tipo nulo
    if (oldValue === newValue) return;

    const change = {
      path,
      oldValue,
      newValue,
      timestamp: Date.now(),
      userId: 'local-user'
    };

    console.log(`[SyncEngine] Mudança: ${path} (${oldValue} → ${newValue})`);

    // Adicionar à fila e agendar sincronização
    this.queue.push(change);
    this._persistQueue();
    this._scheduleSyncDebounce();
  },

  // ── Versionamento ──────────────────────────────────────────
  async _createVersion(changes) {
    const oldHash = this.hash;
    this.version++;

    // Recalcular hash dos dados atualizados
    const currentData = DRIVE_LOADER.getData() || this.localData;
    this.hash = await this._calculateHash(currentData);

    const version = {
      version: this.version,
      hash: this.hash,
      timestamp: Date.now(),
      changes,
      source: 'local',
      previousHash: oldHash
    };

    console.log(`[SyncEngine] Versão ${this.version} criada (hash: ${this.hash.slice(0, 8)}...)`);
    return version;
  },

  async _calculateHash(data) {
    if (!data) return null;
    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // ── Debounce e Sincronização ───────────────────────────────
  _scheduleSyncDebounce() {
    if (this.state !== 'IDLE') {
      console.log(`[SyncEngine] Já sincronizando (estado: ${this.state})`);
      return;
    }

    this.state = 'DEBOUNCING';

    // Limpar timeout anterior se existir
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    console.log(`[SyncEngine] Debounce: aguardando ${this.config.debounceMs}ms...`);

    this.debounceTimeout = setTimeout(async () => {
      this.state = 'UPLOADING';
      await this._sync();
    }, this.config.debounceMs);
  },

  // ── Sincronização Bidirecional ──────────────────────────────
  async _sync() {
    console.log('[SyncEngine] Iniciando sincronização...');

    try {
      const currentData = DRIVE_LOADER.getData() || this.localData;
      if (!currentData) {
        console.warn('[SyncEngine] Nenhum dado para sincronizar');
        this.state = 'IDLE';
        return;
      }

      // Criar versão com mudanças
      const changes = this.queue.slice(0, 10); // Sincronizar até 10 mudanças por vez
      const version = await this._createVersion(changes);

      // Tentar enviar para Drive
      const startTime = Date.now();
      const success = await DRIVE_LOADER.uploadFile({
        ...currentData,
        _version: this.version,
        _hash: this.hash,
        _syncedAt: new Date().toISOString()
      });

      if (success) {
        const elapsed = Date.now() - startTime;
        console.log(`[SyncEngine] Sincronizado em ${elapsed}ms`);
        this.lastSyncTime = new Date();

        // Remover mudanças sincronizadas da fila
        this.queue = this.queue.slice(changes.length);
        this._persistQueue();

        this.state = 'SYNCED';
        setTimeout(() => { this.state = 'IDLE'; }, 1000);
      } else {
        console.warn('[SyncEngine] Falha ao sincronizar (offline ou erro)');
        this.state = 'OFFLINE';
      }
    } catch (e) {
      console.error('[SyncEngine] Erro na sincronização:', e);
      this.state = 'ERROR';
    }
  },

  // ── Merge de Conflitos ─────────────────────────────────────
  async mergeWithDriveData(driveData) {
    console.log('[SyncEngine] Comparando com dados do Drive...');

    const localData = DRIVE_LOADER.getData() || this.localData;
    if (!localData) return driveData;

    // Se versão do Drive é mais recente
    if (driveData._version && driveData._version > this.version) {
      console.log(`[SyncEngine] Drive é mais recente (v${driveData._version} > v${this.version})`);

      // Merge automático
      const merged = this._merge(localData, driveData);
      this.localData = merged;
      this.version = driveData._version;
      this.hash = driveData._hash;
      this.lastSyncTime = new Date(driveData._syncedAt);

      return merged;
    }

    console.log('[SyncEngine] Dados locais são mais recentes');
    return localData;
  },

  _merge(localData, driveData) {
    console.log('[SyncEngine] Executando merge...');

    if (this.config.mergeStrategy === 'drive-wins') {
      // Drive sobrescreve Local em conflito
      const merged = JSON.parse(JSON.stringify(driveData));
      delete merged._version;
      delete merged._hash;
      delete merged._syncedAt;
      console.log('[SyncEngine] Merge: Drive wins');
      return merged;
    }

    if (this.config.mergeStrategy === 'local-wins') {
      // Local mantém seus valores
      console.log('[SyncEngine] Merge: Local wins');
      return localData;
    }

    // Custom merge (deep merge)
    console.log('[SyncEngine] Merge: Deep merge');
    return this._deepMerge(localData, driveData);
  },

  _deepMerge(local, drive) {
    const result = JSON.parse(JSON.stringify(local));

    Object.keys(drive).forEach(key => {
      if (key.startsWith('_')) return; // Pular metadados

      if (Array.isArray(drive[key])) {
        result[key] = drive[key];
      } else if (typeof drive[key] === 'object' && drive[key] !== null) {
        result[key] = this._deepMerge(local[key] || {}, drive[key]);
      } else {
        result[key] = drive[key];
      }
    });

    return result;
  },

  // ── Modo Offline ───────────────────────────────────────────
  _persistQueue() {
    try {
      const queueJson = JSON.stringify(this.queue);
      localStorage.setItem('_sync_queue', queueJson);
      console.log(`[SyncEngine] Fila persistida: ${this.queue.length} itens`);
    } catch (e) {
      console.warn('[SyncEngine] Erro ao persistir fila:', e);
    }
  },

  _loadQueue() {
    try {
      const raw = localStorage.getItem('_sync_queue');
      if (raw) {
        this.queue = JSON.parse(raw);
        console.log(`[SyncEngine] Fila carregada: ${this.queue.length} itens`);
      }
    } catch (e) {
      console.warn('[SyncEngine] Erro ao carregar fila:', e);
      this.queue = [];
    }
  },

  async uploadQueue() {
    if (this.queue.length === 0) {
      console.log('[SyncEngine] Fila vazia');
      return true;
    }

    console.log(`[SyncEngine] Processando fila: ${this.queue.length} itens`);
    let successCount = 0;

    for (let item of this.queue) {
      try {
        // Simular envio (em produção, seria incrementalizado)
        console.log(`[SyncEngine] Enviando mudança: ${item.path}`);
        successCount++;
        item.status = 'sent';
      } catch (e) {
        console.warn(`[SyncEngine] Falha ao enviar ${item.path}:`, e);
        item.status = 'failed';
      }
    }

    // Remover itens enviados
    this.queue = this.queue.filter(item => item.status !== 'sent');
    this._persistQueue();

    console.log(`[SyncEngine] Fila processada: ${successCount}/${this.queue.length} enviados`);
    return this.queue.length === 0;
  },

  // ── Callbacks do Drive ─────────────────────────────────────
  onDriveConnected() {
    console.log('[SyncEngine] Reconectado ao Drive');
    this.state = 'UPLOADING';

    // Sincronizar dados e fila
    this.uploadQueue().then(() => {
      this._sync();
    });
  },

  onDriveDisconnected() {
    console.log('[SyncEngine] Desconectado do Drive');
    this.state = 'OFFLINE';
  },

  // ── API Pública ────────────────────────────────────────────
  getStatus() {
    return {
      state: this.state,
      version: this.version,
      hash: this.hash ? this.hash.slice(0, 8) + '...' : null,
      lastSync: this.lastSyncTime,
      queueLength: this.queue.length,
      offline: this.state === 'OFFLINE',
      synced: this.state === 'SYNCED'
    };
  },

  getQueue() {
    return this.queue;
  },

  clearQueue() {
    this.queue = [];
    this._persistQueue();
    console.log('[SyncEngine] Fila limpa');
  },

  // ── Utilitários ────────────────────────────────────────────
  getLastSyncAge() {
    if (!this.lastSyncTime) return null;
    return Date.now() - this.lastSyncTime.getTime();
  },

  isOnline() {
    return this.state !== 'OFFLINE';
  },

  isSyncing() {
    return this.state === 'UPLOADING' || this.state === 'DEBOUNCING';
  }
};

console.log('[SyncEngine] Módulo carregado e pronto');
