# Fase 2: Sincronização Bidirecional — Guia de Uso

## 📖 Visão Geral

O **sync-engine.js** gerencia sincronização automática entre:
- 📱 **Local** (browser localStorage)
- ☁️ **Drive** (Google Drive)

Com suporte para:
- ✅ Detecção automática de mudanças
- ✅ Versionamento com hash
- ✅ Debounced save (agrupa mudanças)
- ✅ Offline mode com fila
- ✅ Merge automático de conflitos

---

## 🚀 Como Usar

### 1️⃣ Incluir Script

```html
<!-- No <head> do index.html, após drive-loader.js -->
<script src="sync-engine.js"></script>
```

### 2️⃣ Inicializar na Aplicação

```javascript
// Após DRIVE_LOADER estar pronto
async function initSync() {
  console.log('[app] Inicializando sincronização...');
  
  await SYNC_ENGINE.init(
    DRIVE_LOADER,                    // Referência ao DRIVE_LOADER
    window.DRIVE_DATA                // Dados iniciais
  );

  console.log('[app] Sincronização pronta');
}

// Chamar após DRIVE_LOADER estar pronto
gapiLoaded() {
  gapi.load('client', async () => {
    // ... código existente ...
    
    // Novo: Inicializar sync
    await initSync();
  });
}
```

### 3️⃣ Detectar Mudanças

Quando o usuário modifica dados, chamar:

```javascript
// Exemplo: usuário modifica nome de inquilino
function saveUserData(tenantId, newName) {
  const oldName = tenants[tenantId].name;
  tenants[tenantId].name = newName;
  
  // Notificar sync-engine
  SYNC_ENGINE.onChange(
    `tenants.${tenantId}.name`,  // Caminho do dado
    oldName,                       // Valor anterior
    newName                        // Novo valor
  );
  
  // UI atualiza
  renderTenants();
}
```

### 4️⃣ Sincronizar Automático

O sync-engine sincroniza automaticamente após 3 segundos de inatividade:

```javascript
// Usuário modifica nome
SYNC_ENGINE.onChange('tenants.0.name', 'Rafael', 'Rafael Silva');

// ... 3 segundos depois ...
// [SyncEngine] Debounce: aguardando 3000ms...
// [SyncEngine] Sincronizado em 850ms
```

### 5️⃣ Verificar Status

```javascript
// Status atual
SYNC_ENGINE.getStatus()
// Resultado:
// {
//   state: "SYNCED",
//   version: 42,
//   hash: "abc123de...",
//   lastSync: Tue Apr 08 2026 14:32:15 GMT,
//   queueLength: 0,
//   offline: false,
//   synced: true
// }

// Idade da última sincronização
SYNC_ENGINE.getLastSyncAge()
// Resultado: 45000 (ms) → 45 segundos atrás

// Está online?
SYNC_ENGINE.isOnline()  // true ou false

// Está sincronizando?
SYNC_ENGINE.isSyncing() // true ou false
```

---

## 🔄 Estados de Sincronização

```
IDLE
  ↓
  (usuário modifica)
  ↓
DETECTING → DEBOUNCING (aguardar 3s)
  ↓
UPLOADING (enviando para Drive)
  ├─ success → SYNCED → IDLE
  ├─ offline → OFFLINE (armazenar em fila)
  └─ error → ERROR (retentar)

OFFLINE (sem conexão Drive)
  ↓
  (reconectar)
  ↓
UPLOADING (processar fila)
  ├─ success → SYNCED → IDLE
  └─ error → OFFLINE (retentar depois)
```

---

## 📊 Estrutura de Dados

### Mudança Detectada

```javascript
{
  path: "tenants.0.name",          // Caminho do dado (dot notation)
  oldValue: "Rafael Moura",        // Valor anterior
  newValue: "Rafael Silva",        // Novo valor
  timestamp: 1712600000000,        // Quando foi modificado
  userId: "local-user"             // Quem fez a mudança
}
```

### Versão (Versionamento)

```javascript
{
  version: 42,                     // Versão incremental
  hash: "abc123def456...",         // Hash SHA-256 dos dados
  timestamp: 1712600000000,        // Quando foi versionado
  changes: [                       // Mudanças dessa versão
    { path: "...", oldValue: "...", newValue: "..." }
  ],
  source: "local",                 // Origem: "local" ou "drive"
  previousHash: "xyz789..."        // Hash anterior (para rollback)
}
```

### Fila Offline

```javascript
[
  {
    id: "change_1712600000000",
    action: "update",
    path: "tenants.0.name",
    data: { oldValue: "...", newValue: "..." },
    timestamp: 1712600000000,
    status: "pending" | "sent" | "failed"
  }
]
```

---

## 🔀 Merge Strategy (Resolução de Conflitos)

### Estratégia Padrão: Drive Wins

Em caso de conflito, o valor do Drive sobrescreve o Local.

**Quando ocorre conflito:**
1. Versão do Drive é mais recente que Local
2. Dados divergem entre Drive e Local
3. Timestamps diferentes

**Resolução:**
```javascript
SYNC_ENGINE.config.mergeStrategy = 'drive-wins'  // Padrão

// Exemplo:
// Local:  tenants[0].name = "Rafael Silva" (version 41)
// Drive:  tenants[0].name = "Rafael Moura" (version 42)
// Resultado: "Rafael Moura" (Drive vence)
```

### Alternativa: Local Wins

```javascript
SYNC_ENGINE.config.mergeStrategy = 'local-wins'

// Local mantém seus valores em conflito
```

### Customizar por Campo

```javascript
// Em futuras versões:
SYNC_ENGINE.setFieldStrategy('tenants.*.tel', 'local-wins')
SYNC_ENGINE.setFieldStrategy('despesasEscritorio', 'merge-arrays')
```

---

## 📱 Offline Mode (Fila de Mudanças)

### Como Funciona

1. **Usuário modifica dados** → Mudança armazenada em fila
2. **Fila persistida** → localStorage (`_sync_queue`)
3. **Offline mode ativo** → Mudanças não são enviadas
4. **Reconectar ao Drive** → Fila processada automaticamente
5. **Merge** → Conflitos resolvidos
6. **Sincronizado** → Fila limpa

### Verificar Fila

```javascript
// Ver itens na fila
SYNC_ENGINE.getQueue()
// [
//   { path: "tenants.0.name", oldValue: "...", newValue: "..." },
//   { path: "tenants.1.tel", oldValue: "...", newValue: "..." }
// ]

// Tamanho da fila
SYNC_ENGINE.getStatus().queueLength  // 2

// Limpar fila manualmente
SYNC_ENGINE.clearQueue()
```

### Recuperação Automática

Se o browser fechar enquanto offline:

```javascript
// Na próxima inicialização:
SYNC_ENGINE.init()
  // Carrega fila persistida automaticamente
  // Se conectado ao Drive, processa fila
```

---

## 🔌 Integração com Eventos

### Detectar Mudanças em Inputs

```javascript
// Adicionar listener a inputs
document.querySelectorAll('input[data-sync]').forEach(input => {
  input.addEventListener('change', (e) => {
    const path = e.target.dataset.sync;
    const oldValue = e.target.dataset.oldValue;
    const newValue = e.target.value;
    
    SYNC_ENGINE.onChange(path, oldValue, newValue);
    e.target.dataset.oldValue = newValue;
  });
});

// HTML:
// <input type="text" data-sync="tenants.0.name" data-old-value="Rafael" />
```

### Callbacks do Drive

```javascript
// Quando conectar ao Drive
function onDriveConnected() {
  SYNC_ENGINE.onDriveConnected();  // Processa fila
}

// Quando desconectar
function onDriveDisconnected() {
  SYNC_ENGINE.onDriveDisconnected();  // Entra em modo offline
}

// Quando receber dados novos do Drive
async function onDriveDataReceived(driveData) {
  const merged = await SYNC_ENGINE.mergeWithDriveData(driveData);
  // Aplicar dados mesclados na UI
}
```

---

## 🧪 Testes

### Teste Manual 1: Sincronização Online

```javascript
// Console (F12)

// 1. Status inicial
SYNC_ENGINE.getStatus()
// { state: 'IDLE', version: 1, ... }

// 2. Simular mudança
SYNC_ENGINE.onChange('tenants.0.name', 'Rafael', 'Rafael Silva')
// [SyncEngine] Mudança: tenants.0.name

// 3. Status após mudança
SYNC_ENGINE.getStatus()
// { state: 'DEBOUNCING', queueLength: 1, ... }

// 4. Aguardar 3 segundos
// [SyncEngine] Sincronizado em 850ms

// 5. Status final
SYNC_ENGINE.getStatus()
// { state: 'SYNCED', version: 2, ... }
```

### Teste Manual 2: Offline Mode

```javascript
// Console

// 1. Desligar Drive (simular)
SYNC_ENGINE.onDriveDisconnected()

// 2. Fazer mudanças
SYNC_ENGINE.onChange('tenants.0.name', 'Rafael', 'João')
SYNC_ENGINE.onChange('tenants.1.tel', '123', '456')

// 3. Verificar fila
SYNC_ENGINE.getQueue()
// [
//   { path: 'tenants.0.name', ... },
//   { path: 'tenants.1.tel', ... }
// ]

// 4. Verificar persistência
localStorage.getItem('_sync_queue')
// String JSON com mudanças

// 5. Reconectar
SYNC_ENGINE.onDriveConnected()
// [SyncEngine] Reconectado ao Drive
// [SyncEngine] Processando fila: 2 itens...

// 6. Fila processada
SYNC_ENGINE.getQueue()  // [] (vazio)
```

### Teste Manual 3: Merge de Conflitos

```javascript
// Console

// 1. Ter dados conflitantes
SYNC_ENGINE.version = 41
SYNC_ENGINE.hash = 'local123'

// 2. Receber dados mais recentes do Drive
const driveData = {
  tenants: [{ name: 'Rafael Moura', tel: '123' }],
  _version: 42,
  _hash: 'drive456'
}

// 3. Fazer merge
const merged = await SYNC_ENGINE.mergeWithDriveData(driveData)
// [SyncEngine] Drive é mais recente (v42 > v41)
// [SyncEngine] Merge: Drive wins

// 4. Verificar resultado
SYNC_ENGINE.getStatus()
// { version: 42, hash: 'drive456...', ... }
```

---

## 📋 API Completa

| Método | Parâmetros | Retorno | Descrição |
|--------|-----------|---------|-----------|
| `init(driveLoader, data)` | DRIVE_LOADER, dados | Promise<bool> | Inicializar sync-engine |
| `onChange(path, oldValue, newValue)` | string, any, any | void | Registrar mudança |
| `getStatus()` | - | object | Status atual |
| `getQueue()` | - | array | Fila de mudanças offline |
| `clearQueue()` | - | void | Limpar fila |
| `uploadQueue()` | - | Promise<bool> | Processar fila |
| `mergeWithDriveData(data)` | object | Promise<object> | Fazer merge com Drive |
| `onDriveConnected()` | - | void | Callback: conectado |
| `onDriveDisconnected()` | - | void | Callback: desconectado |
| `getLastSyncAge()` | - | number\|null | Idade da sincronização (ms) |
| `isOnline()` | - | bool | Online? |
| `isSyncing()` | - | bool | Sincronizando? |

---

## 🐛 Troubleshooting

### "sync-engine.js is not defined"
- Verificar se script está incluído no HTML
- Confirmar se está APÓS drive-loader.js

### "Fila não sincroniza"
- Verificar se Drive está conectado: `DRIVE_LOADER.getStatus().connected`
- Verificar logs do console
- Processar manualmente: `await SYNC_ENGINE.uploadQueue()`

### "Merge não funciona"
- Verificar versões: `SYNC_ENGINE.getStatus().version`
- Verificar hashes: `SYNC_ENGINE.getStatus().hash`
- Verificar strategy: `SYNC_ENGINE.config.mergeStrategy`

### "Dados desapareceram"
- Recuperar do backup: `gestao_alugueis_dados.json.backup.*`
- Verificar localStorage: `localStorage.getItem('gestao_alugueis_v1')`
- Verificar fila: `localStorage.getItem('_sync_queue')`

---

## 🔍 Logging

Todos os eventos são logados no console com prefixo `[SyncEngine]`:

```javascript
[SyncEngine] Inicializando...
[SyncEngine] Hash inicial: abc123de...
[SyncEngine] Fila recuperada: 2 itens
[SyncEngine] Mudança: tenants.0.name (Rafael → João)
[SyncEngine] Debounce: aguardando 3000ms...
[SyncEngine] Versão 42 criada (hash: abc123de...)
[SyncEngine] Iniciando sincronização...
[SyncEngine] Sincronizado em 850ms
[SyncEngine] Reconectado ao Drive
[SyncEngine] Processando fila: 2 itens
```

---

## 📖 Próximas Fases

**Fase 2b:** Integração completa com index.html  
**Fase 2c:** Testes práticos  
**Fase 3:** Refatoração HTML  

---

**Status:** Guia completo para usar sync-engine.js
