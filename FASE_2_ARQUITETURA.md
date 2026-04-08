# Fase 2: Sincronização Bidirecional — Arquitetura

## 🎯 Objetivo

Implementar um motor de sincronização robusto que:
- Detecta mudanças em dados (delta)
- Versiona alterações (timestamp + hash)
- Resolve conflitos automaticamente
- Funciona offline com fila de mudanças
- Sincroniza ao reconectar

## 🏗️ Arquitetura

### Fluxo de Dados

```
Local Data (Browser)
    ↓
(Usuário modifica)
    ↓
Detector de Mudanças (Delta)
    ↓
Fila de Sincronização (Offline)
    ↓
sync-engine.js (Motor)
    ├─ Online? → Enviar para Drive
    └─ Offline? → Armazenar na fila
    ↓
Google Drive
    ↓
(Outros clientes)
    ↓
Reconectar → Sincronizar Automático
    ↓
Merge de Conflitos (Strategy)
    ↓
Local Data Atualizado
```

### Componentes

#### 1. Detector de Mudanças (Change Detection)
```javascript
// Detectar o que mudou
{
  path: "tenants.0.name",        // Caminho do dado
  oldValue: "Rafael Moura",
  newValue: "Rafael Silva",
  timestamp: 1712600000000,
  userId: "local-user",
  priority: 1                      // 0=baixa, 1=normal, 2=alta
}
```

#### 2. Versionamento (Versioning)
```javascript
{
  version: 1,                      // Versão incremental
  hash: "abc123def456",           // Hash SHA-256 dos dados
  timestamp: 1712600000000,
  changes: [                       // Mudanças dessa versão
    { path: "tenants.0.name", oldValue: "...", newValue: "..." }
  ],
  source: "local" | "drive"       // Origem da mudança
}
```

#### 3. Merge Strategy (Resolução de Conflitos)

**Ordem de Prioridade:**
1. Timestamp (mais recente vence)
2. Sistema (Drive sobrescreve Local em empate)
3. Campo específico (cada tipo tem estratégia)

```javascript
Conflito:
  Local:  version=5, timestamp=1712600000000, name="Rafael Silva"
  Drive:  version=6, timestamp=1712600001000, name="Rafael Moura"
  
Resolução:
  → Drive tem timestamp mais recente
  → Usar valor do Drive
  → Atualizar Local com Drive
  → Log: "Conflito resolvido (Drive venceu)"
```

#### 4. Offline Queue (Fila Offline)

```javascript
// Armazenar mudanças enquanto offline
[
  {
    id: "change_1712600000000",
    action: "update",
    path: "tenants.0.name",
    data: { oldValue: "...", newValue: "..." },
    timestamp: 1712600000000,
    status: "pending" | "sent" | "failed"
  },
  {
    id: "change_1712600001000",
    action: "update",
    path: "tenants.1.tel",
    data: { oldValue: "...", newValue: "..." },
    timestamp: 1712600001000,
    status: "pending"
  }
]
```

### Fluxo de Sincronização

#### Online → Drive
```
1. Usuário modifica dado
   └─ onChange() acionado
   
2. Detect mudança
   └─ Registrar delta (path, oldValue, newValue)
   
3. Versionar
   └─ Criar versão com timestamp + hash
   
4. Debounce (3s)
   └─ Aguardar para agrupar mudanças
   
5. Enviar para Drive
   └─ DRIVE_LOADER.uploadFile(data)
   
6. Salvar versão no localStorage
   └─ Para recuperação se falhar
   
7. UI atualiza
   └─ "Sincronizado às 14:32"
```

#### Drive → Local
```
1. Reconectar ao Drive
   └─ onDriveConnected()
   
2. Comparar versões
   └─ LOCAL version < DRIVE version?
   
3. Se Drive é mais recente
   └─ Fazer merge
   
4. Aplicar mudanças
   └─ Atualizar window.DRIVE_DATA
   
5. Se conflito
   └─ Usar MERGE_STRATEGY
   └─ Drive vence (estratégia padrão)
   
6. Atualizar localStorage
   └─ Persistir estado sincronizado
   
7. UI atualiza
   └─ Rerender com novos dados
```

#### Offline → Online
```
1. Ficar offline
   └─ Mudanças armazenadas em offline queue
   
2. Reconectar
   └─ onDriveConnected()
   
3. Processar fila
   └─ Para cada mudança em order:
      └─ Tentar enviar para Drive
      └─ Se sucesso: marcar como "sent"
      └─ Se falha: manter como "pending"
   
4. Sincronizar dados
   └─ Trazer versão mais recente do Drive
   
5. Resolver conflitos
   └─ Se offline data conflita com Drive
      └─ Usar MERGE_STRATEGY
   
6. Limpar fila
   └─ Remover itens "sent"
   └─ Retentar itens "pending"
```

## 📊 Estado e Transições

```
Sync States:
  IDLE          → Nenhuma operação
  DETECTING     → Detectando mudanças
  VERSIONING   → Criando versão
  DEBOUNCING   → Aguardando para agrupar
  UPLOADING    → Enviando para Drive
  DOWNLOADING  → Baixando do Drive
  MERGING      → Resolvendo conflitos
  SYNCED       → Sincronizado
  ERROR        → Erro na sincronização
  OFFLINE      → Sem conexão Drive

Transições:
  IDLE ──[mudança]──> DETECTING
  DETECTING ──[versioned]──> DEBOUNCING
  DEBOUNCING ──[timeout 3s]──> UPLOADING
  UPLOADING ──[success]──> SYNCED
  UPLOADING ──[error]──> ERROR
  ERROR ──[retry]──> UPLOADING
  UPLOADING ──[no connection]──> OFFLINE
  OFFLINE ──[reconnect]──> DOWNLOADING
  DOWNLOADING ──[merged]──> SYNCED
  SYNCED ──[mudança]──> DETECTING
```

## 🔧 Componentes a Implementar

### 1. sync-engine.js (~500 linhas)

**Classes/Objects:**

```javascript
SyncEngine {
  // Configuração
  config = {
    debounceMs: 3000,
    maxQueueSize: 100,
    mergeStrategy: "drive-wins"
  }

  // Estado
  state = "IDLE"
  version = 0
  hash = null
  queue = []
  
  // Métodos Públicos
  init(driveLoader, localData)
  onChange(path, oldValue, newValue)
  getStatus()
  getQueue()
  uploadQueue()
  onDriveConnected()
  onDataFromDrive(data)
  
  // Métodos Internos
  _detectChange(path, oldValue, newValue)
  _createVersion(changes)
  _calculateHash(data)
  _debounce(fn, ms)
  _merge(localData, driveData)
  _resolveConflict(field, local, drive)
  _persistQueue()
  _loadQueue()
  _processQueue()
}
```

### 2. FASE_2_GUIA.md

Documentação completa com:
- API do sync-engine.js
- Exemplos de uso
- Merge strategy
- Offline mode
- Troubleshooting

### 3. Integração com drive-loader.js

- sync-engine chama DRIVE_LOADER.uploadFile()
- sync-engine recebe dados de DRIVE_LOADER.getData()
- Ambos comunicam via window.DRIVE_STATE

### 4. Integração com index.html

- onChange() listener em inputs/mutações
- Chamar sync-engine.onChange()
- Sincronização automática
- UI mostra status de sincronização

## 🎯 Estratégia de Merge

### Prioridade Padrão: Drive Wins

Em caso de conflito, o valor do Drive sobrescreve o Local.

**Justificativa:** Presume que Drive é a fonte canônica (pode ter sido atualizado por outro usuário).

### Fallback: Last Write Wins

Se timestamps forem muito próximos, o mais recente vence.

### Campo Específico: Custom Strategy

```javascript
MERGE_STRATEGIES = {
  "tenants.*.name": "drive-wins",          // Drive sempre sobrescreve
  "tenants.*.tel": "drive-wins",
  "despesasEscritorio": "merge-arrays",    // Mesclar arrays
  "condominios": "drive-wins",
  "imoveis": "merge-arrays"
}
```

## 📈 Métricas e Logging

**O que rastrear:**
- Número de mudanças por sessão
- Tamanho da fila offline
- Tempo de sincronização
- Conflitos resolvidos
- Taxa de erro

**Logs estruturados:**
```javascript
[SyncEngine] Mudança detectada: tenants.0.name
[SyncEngine] Versão 42 criada (hash: abc123)
[SyncEngine] Debounce: aguardando 3s...
[SyncEngine] Enviando para Drive...
[SyncEngine] Sincronizado em 850ms
[SyncEngine] Conflito resolvido: Drive venceu
[SyncEngine] Fila offline: 3 itens pendentes
[SyncEngine] Reconectado ao Drive
[SyncEngine] Processando fila: 3/3 enviados
```

## 🧪 Testes Necessários

### Testes de Mudança
- [x] Detectar mudança simples
- [x] Detectar múltiplas mudanças
- [x] Detectar mudanças aninhadas
- [x] Ignorar mudanças desnecessárias

### Testes de Versionamento
- [x] Criar versão corretamente
- [x] Incrementar version number
- [x] Hash consistente
- [x] Timestamp válido

### Testes de Sincronização
- [x] Upload online
- [x] Queue offline
- [x] Download do Drive
- [x] Merge de conflitos

### Testes de Offline Mode
- [x] Armazenar fila offline
- [x] Recuperar fila ao reconectar
- [x] Processar fila corretamente
- [x] Limpar fila após sucesso

## 📋 Plano de Implementação

### Fase 2a: sync-engine.js
- [x] Estrutura base
- [ ] Change detection
- [ ] Versioning
- [ ] Debounce
- [ ] Upload

### Fase 2b: Merge Strategy
- [ ] Implementar merge
- [ ] Resolver conflitos
- [ ] Custom strategies

### Fase 2c: Offline Mode
- [ ] Fila offline
- [ ] Persistência
- [ ] Processamento

### Fase 2d: Integração
- [ ] Integrar com drive-loader.js
- [ ] Integrar com index.html
- [ ] Testes práticos

## 🚀 Próximas Fases

**Fase 2a:** sync-engine.js básico (hoje)
**Fase 2b:** Merge strategy (hoje/amanhã)
**Fase 2c:** Offline mode (amanhã)
**Fase 2d:** Integração completa (amanhã)

**Fase 3:** Refatoração HTML (próxima semana)

---

**Status:** Arquitetura definida, pronto para implementação
