# Fase 2b: Integração do Sync-Engine

## 🎯 Objetivo

Integrar `sync-engine.js` com `drive-loader.js` e `index.html` para sincronização automática bidirecional.

## 📋 Etapas

### 1️⃣ Incluir sync-engine.js no HTML

**Local:** `<head>` do index.html, após drive-loader.js

```html
<!-- Linha ~525 -->
<script src="https://cdn.jsdelivr.net/npm/docx@8/build/index.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<!-- Fase 1: Módulo de carregamento de dados do Google Drive -->
<script src="drive-loader.js"></script>
<!-- Fase 2: Motor de sincronização bidirecional -->
<script src="sync-engine.js"></script>
</head>
```

### 2️⃣ Inicializar SYNC_ENGINE após DRIVE_LOADER

**Local:** Função `gapiLoaded()` (linha ~7246)

**Antes:**
```javascript
function gapiLoaded(){
  gapi.load('client', async ()=>{
    await gapi.client.init({ discoveryDocs: [...] });

    // Fase 1b: Inicializar DRIVE_LOADER
    console.log('[init] Carregando dados via DRIVE_LOADER...');
    await DRIVE_LOADER.init();
    console.log('[init] Status:', DRIVE_LOADER.getStatus());

    gapiReady = true;
  });
}
```

**Depois:**
```javascript
function gapiLoaded(){
  gapi.load('client', async ()=>{
    await gapi.client.init({ discoveryDocs: [...] });

    // Fase 1b: Inicializar DRIVE_LOADER
    console.log('[init] Carregando dados via DRIVE_LOADER...');
    await DRIVE_LOADER.init();
    console.log('[init] Status:', DRIVE_LOADER.getStatus());

    // Fase 2a: Inicializar SYNC_ENGINE
    console.log('[init] Carregando sincronização...');
    await SYNC_ENGINE.init(DRIVE_LOADER, window.DRIVE_DATA);
    console.log('[init] Sincronização pronta');

    gapiReady = true;
  });
}
```

### 3️⃣ Conectar onDriveConnected com SYNC_ENGINE

**Local:** Função `onDriveConnected()` (linha ~7225)

**Antes:**
```javascript
function onDriveConnected(){
  driveConnected = true;

  // Fase 1b: Notificar DRIVE_LOADER
  DRIVE_LOADER.onDriveConnected();

  updateSaveStatus('☁ Drive conectado', 'var(--blue)');
  // ... resto do código
}
```

**Depois:**
```javascript
function onDriveConnected(){
  driveConnected = true;

  // Fase 1b: Notificar DRIVE_LOADER
  DRIVE_LOADER.onDriveConnected();

  // Fase 2a: Notificar SYNC_ENGINE
  SYNC_ENGINE.onDriveConnected();

  updateSaveStatus('☁ Drive conectado', 'var(--blue)');
  // ... resto do código
}
```

### 4️⃣ Adicionar Callback de Desconexão

**Local:** Função `gisLoaded()` (linha ~7259) ou criar nova

**Adicionar:**
```javascript
function onDriveDisconnected(){
  driveConnected = false;
  SYNC_ENGINE.onDriveDisconnected();
  updateSaveStatus('💾 Desconectado - Dados salvos localmente', 'var(--text-faint)');
}

// Na função gisLoaded, adicionar listener:
// gapi.auth2.getAuthInstance().signOut().then(() => {
//   onDriveDisconnected();
// });
```

### 5️⃣ Registrar Mudanças com onChange()

Para cada mudança de dados, chamar `SYNC_ENGINE.onChange()`:

**Exemplos de integração:**

#### A. Salvamento de Inquilino
```javascript
// Função saveCardCobr (linha ~4080 aprox)
function saveCardCobr(){
  // ... código existente ...
  
  // Adicionar:
  const oldTenant = JSON.parse(JSON.stringify(currentTenant));
  
  // ... fazer mudanças ...
  
  // Registrar mudança
  SYNC_ENGINE.onChange(
    `tenants.${currentTenant.id}.name`,
    oldTenant.name,
    currentTenant.name
  );
  
  // ... resto do código
}
```

#### B. Salvamento de Entrada de Pagamento
```javascript
function savePaymentEntry(){
  // ... código existente ...
  
  // Registrar mudança
  SYNC_ENGINE.onChange(
    `tenants.${tenantId}.history.${monthIndex}.status`,
    oldStatus,
    newStatus
  );
  
  // ... resto do código
}
```

#### C. Salvamento de Condomínio
```javascript
function saveCondoMonth(){
  // ... código existente ...
  
  // Registrar mudança
  SYNC_ENGINE.onChange(
    `condoHistory.${monthIndex}.agua`,
    oldValue,
    newValue
  );
  
  // ... resto do código
}
```

### 6️⃣ Mostrar Status de Sincronização na UI

**Adicionar indicador visual:**

```html
<!-- Adicionar no HTML, na sidebar ou barra de status -->
<div id="sync-status" style="padding: 8px; border-radius: 4px; margin-top: 8px;">
  <span id="sync-indicator">⏳</span>
  <span id="sync-text">Sincronizando...</span>
</div>
```

**Atualizar status em tempo real:**

```javascript
// Nova função
function updateSyncStatus(){
  const status = SYNC_ENGINE.getStatus();
  const indicator = document.getElementById('sync-indicator');
  const text = document.getElementById('sync-text');
  
  if(status.offline) {
    indicator.textContent = '📱';
    text.textContent = `Offline (${status.queueLength} mudanças)`;
  } else if(status.syncing) {
    indicator.textContent = '⏳';
    text.textContent = 'Sincronizando...';
  } else if(status.synced) {
    indicator.textContent = '✓';
    const age = SYNC_ENGINE.getLastSyncAge();
    const seconds = Math.floor(age / 1000);
    text.textContent = `Sincronizado há ${seconds}s`;
  } else {
    indicator.textContent = '⚠';
    text.textContent = 'Erro na sincronização';
  }
}

// Chamar periodicamente
setInterval(updateSyncStatus, 1000);
```

### 7️⃣ Consolidar saveToDrive() com SYNC_ENGINE

**Opção 1: Usar SYNC_ENGINE diretamente**

```javascript
// Remover lógica de save manual
// async function saveToDrive(){ ... } ← pode ser mantido como wrapper

// Agora é:
async function saveToDrive(){
  // SYNC_ENGINE cuida de tudo automaticamente
  // Esta função pode ser removida ou deixada vazia
  console.log('[app] Sync automático ativo via SYNC_ENGINE');
}
```

**Opção 2: Manter saveToDrive como fallback**

```javascript
async function saveToDrive(){
  // Para casos onde precisamos forçar sincronização
  if(!SYNC_ENGINE.isSyncing()){
    await SYNC_ENGINE.uploadQueue();
  }
}
```

## 📝 Checklist de Integração

- [ ] Incluir sync-engine.js no HTML (linha ~525)
- [ ] Inicializar SYNC_ENGINE em gapiLoaded() 
- [ ] Conectar onDriveConnected() com SYNC_ENGINE.onDriveConnected()
- [ ] Criar onDriveDisconnected() e conectar
- [ ] Registrar mudanças com SYNC_ENGINE.onChange() em:
  - [ ] saveCardCobr()
  - [ ] savePaymentEntry()
  - [ ] saveCondoMonth()
  - [ ] saveDespesa()
  - [ ] saveImovel()
  - [ ] Outras funções de save
- [ ] Adicionar indicador visual de sincronização
- [ ] Testar sincronização online
- [ ] Testar offline mode
- [ ] Testar merge de conflitos

## 🧪 Testes Pós-Integração

### Teste 1: Sincronização Online
```
1. Abrir aplicação com Drive conectado
2. Fazer mudança (ex: editar nome de inquilino)
3. Aguardar 3 segundos (debounce)
4. Verificar: [SyncEngine] Sincronizado em Xms
5. Abrir Google Drive → dados.json deve ter mudança
```

### Teste 2: Offline Mode
```
1. Desligar Internet (ou simular)
2. Fazer mudança
3. Verificar: Mudança em fila local
4. Verificar: [SyncEngine] OFFLINE
5. Reconectar
6. Verificar: Fila processada automaticamente
```

### Teste 3: Merge de Conflitos
```
1. Criar conflito (modificar local vs Drive)
2. Reconectar ao Drive
3. Verificar: [SyncEngine] Merge: Drive wins
4. Verificar: Local data atualizada
```

### Teste 4: Múltiplas Mudanças
```
1. Fazer 5-10 mudanças rápidas
2. Debounce agrupa
3. Fila tem 5-10 itens
4. Após sincronização, fila limpa
5. Não há items duplicados
```

## 📊 Métricas para Monitorar

Após integração, monitorar:
- **Taxa de sincronização bem-sucedida** (meta: > 99%)
- **Tempo médio de sincronização** (meta: < 1s)
- **Tamanho médio da fila** (meta: < 5 itens)
- **Conflitos por dia** (objetivo: 0)
- **Falhas de merge** (objetivo: 0)

## 🔄 Próximos Passos

Após integração:
1. **Fase 2b:** Testes de integração
2. **Fase 2c:** Otimizações (se necessário)
3. **Fase 2d:** Documentação final
4. **Fase 3:** Refatoração HTML

---

**Status:** Pronto para integração
