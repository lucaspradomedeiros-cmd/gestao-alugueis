/**
 * Módulo de Carregamento de Dados do Google Drive
 * Fase 1: Separação de Dados do Código
 *
 * Responsabilidades:
 * - Carregar dados.json do Google Drive (appDataFolder)
 * - Sincronizar com localStorage como cache local
 * - Fornecer API para aplicação consumir dados
 * - Gerenciar status de conectividade
 */

// ── Configuração ───────────────────────────────────────────
const DRIVE_LOADER = {
  // Constantes (compartilhadas com index.html)
  STORAGE_KEY: 'gestao_alugueis_v1',
  DRIVE_DATA_FILE: 'dados.json',           // Nova estrutura
  DRIVE_LEGACY_FILE: 'gestao_alugueis_dados.json', // Compatibilidade

  // Estado
  driveFileId: null,
  driveConnected: false,
  lastSyncTime: null,
  syncInProgress: false,
  retryCount: 0,
  maxRetries: 3,

  // ── Inicialização ──────────────────────────────────────
  async init() {
    console.log('[DriveLoader] Inicializando...');
    try {
      // Tentar carregar do Drive
      const success = await this.loadFromDrive();
      if (!success) {
        console.log('[DriveLoader] Fallback para localStorage');
        this.loadFromLocalStorage();
      }
      return true;
    } catch (e) {
      console.error('[DriveLoader] Erro na inicialização:', e);
      this.loadFromLocalStorage();
      return false;
    }
  },

  // ── Carregamento do Google Drive ────────────────────────
  async loadFromDrive() {
    if (!gapi.client.drive) {
      console.warn('[DriveLoader] Google Drive API não inicializada');
      return false;
    }

    try {
      this.syncInProgress = true;
      console.log('[DriveLoader] Procurando arquivo no Drive...');

      // Procurar por dados.json (nova estrutura)
      let fileId = await this.findFile(this.DRIVE_DATA_FILE);

      // Fallback para arquivo legado
      if (!fileId) {
        console.log('[DriveLoader] Usando arquivo legado...');
        fileId = await this.findFile(this.DRIVE_LEGACY_FILE);
      }

      if (!fileId) {
        console.log('[DriveLoader] Nenhum arquivo encontrado. Primeira inicialização.');
        return false;
      }

      // Carregar arquivo
      const data = await this.downloadFile(fileId);
      if (!data) return false;

      // Validar e aplicar
      if (this.applyData(data)) {
        this.driveFileId = fileId;
        this.lastSyncTime = new Date();
        console.log('[DriveLoader] Dados carregados do Drive com sucesso');
        return true;
      }
    } catch (e) {
      console.error('[DriveLoader] Erro ao carregar do Drive:', e);
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        await this.delay(2000 * this.retryCount);
        return this.loadFromDrive();
      }
    } finally {
      this.syncInProgress = false;
    }

    return false;
  },

  async findFile(fileName) {
    try {
      const res = await gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id,name,modifiedTime)',
        q: `name='${fileName}' and trashed=false`,
        pageSize: 1
      });

      if (res.result.files && res.result.files.length > 0) {
        console.log(`[DriveLoader] Arquivo encontrado: ${fileName}`);
        return res.result.files[0].id;
      }
      return null;
    } catch (e) {
      console.error(`[DriveLoader] Erro ao procurar ${fileName}:`, e);
      return null;
    }
  },

  async downloadFile(fileId) {
    try {
      const res = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      const data = typeof res.result === 'string'
        ? JSON.parse(res.result)
        : res.result;

      return data;
    } catch (e) {
      console.error('[DriveLoader] Erro ao fazer download:', e);
      return null;
    }
  },

  async uploadFile(data, fileName = this.DRIVE_DATA_FILE) {
    if (!this.driveConnected) {
      console.warn('[DriveLoader] Drive não está conectado');
      return false;
    }

    try {
      this.syncInProgress = true;
      const json = JSON.stringify(data, null, 2);
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: this.driveFileId ? undefined : ['appDataFolder']
      };

      const boundary = '-------314159265358979323846';
      const body =
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${json}\r\n` +
        `--${boundary}--`;

      const method = this.driveFileId ? 'PATCH' : 'POST';
      const url = this.driveFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${this.driveFileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

      const res = await gapi.client.request({
        method,
        path: url,
        headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
        body
      });

      if (!this.driveFileId) {
        this.driveFileId = res.result.id;
      }

      this.lastSyncTime = new Date();
      console.log('[DriveLoader] Arquivo salvo no Drive com sucesso');
      return true;
    } catch (e) {
      console.error('[DriveLoader] Erro ao salvar no Drive:', e);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  },

  // ── Carregamento do localStorage ───────────────────────
  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        console.log('[DriveLoader] Nenhum dado em localStorage');
        return false;
      }

      const data = JSON.parse(raw);
      if (this.applyData(data)) {
        console.log('[DriveLoader] Dados carregados de localStorage');
        return true;
      }
    } catch (e) {
      console.error('[DriveLoader] Erro ao carregar localStorage:', e);
    }
    return false;
  },

  saveToLocalStorage(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('[DriveLoader] Dados salvos em localStorage');
      return true;
    } catch (e) {
      console.error('[DriveLoader] Erro ao salvar localStorage:', e);
      return false;
    }
  },

  // ── Aplicação de Dados ─────────────────────────────────
  applyData(data) {
    if (!data || !data.tenants) {
      console.warn('[DriveLoader] Dados inválidos');
      return false;
    }

    try {
      // Validação básica
      if (!Array.isArray(data.tenants)) {
        throw new Error('tenants deve ser um array');
      }

      // Salvar em localStorage como cache
      this.saveToLocalStorage(data);

      // Exposição de dados para aplicação
      window.DRIVE_DATA = {
        version: data.version || '1.0.0',
        schema_version: data.schema_version || 4,
        exported_at: data.exported_at,
        tenants: data.tenants,
        condoHistory: data.condoHistory || [],
        condominios: data.condominios || [],
        imoveis: data.imoveis || [],
        despesasEscritorio: data.despesasEscritorio || [],
        receitasEscritorio: data.receitasEscritorio || [],
        clientesAdv: data.clientesAdv || []
      };

      console.log('[DriveLoader] Dados aplicados com sucesso');
      return true;
    } catch (e) {
      console.error('[DriveLoader] Erro ao aplicar dados:', e);
      return false;
    }
  },

  // ── Utilitários ────────────────────────────────────────
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  getStatus() {
    return {
      connected: this.driveConnected,
      lastSync: this.lastSyncTime,
      syncing: this.syncInProgress,
      fileId: this.driveFileId,
      dataAvailable: !!window.DRIVE_DATA
    };
  },

  getData() {
    return window.DRIVE_DATA || null;
  },

  onDriveConnected() {
    this.driveConnected = true;
    console.log('[DriveLoader] Drive conectado');
    // Sincronizar após conexão
    this.loadFromDrive();
  },

  onDriveDisconnected() {
    this.driveConnected = false;
    console.log('[DriveLoader] Drive desconectado');
  }
};

// Inicializar quando documentofor carregado
document.addEventListener('DOMContentLoaded', () => {
  console.log('[DriveLoader] Aguardando inicialização do Google API...');
  // Será chamado por loadFromDrive() após gapi estar pronto
});
