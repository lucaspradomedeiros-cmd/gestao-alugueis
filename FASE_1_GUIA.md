# Fase 1: Carregamento de Dados do Google Drive

## Objetivo
Implementar um módulo separado (`drive-loader.js`) que gerencia carregamento e sincronização de dados com Google Drive, sem modificar o código existente do index.html.

## Arquitetura

### Fluxo de Carregamento
```
Startup
  ↓
drive-loader.js: loadFromDrive()
  ├─ Procura por dados.json (nova estrutura)
  ├─ Se não encontrar, procura por gestao_alugueis_dados.json (legacy)
  ├─ Se encontrar, faz download e aplica dados
  └─ Se não encontrar, carrega do localStorage
  ↓
window.DRIVE_DATA ← Dados disponíveis para aplicação
  ↓
index.html: Usa window.DRIVE_DATA e localStorage conforme necessário
```

### Responsabilidades

| Componente | Responsabilidade |
|------------|------------------|
| **drive-loader.js** | Carregar/salvar dados do Drive, sincronizar com localStorage |
| **index.html** | Consumir dados via `window.DRIVE_DATA`, manter lógica de UI |
| **dados.json** | Armazenamento primário no Google Drive |
| **localStorage** | Cache local (90KB limit) |

## Mudanças Necessárias no index.html

### 1. Incluir drive-loader.js
```html
<!-- No <head>, antes de outros scripts -->
<script src="drive-loader.js"></script>
```

### 2. Inicializar DRIVE_LOADER após Google API estar pronto
```javascript
// Na função que atualmente faz gapi.load (por volta da linha 7230)
function initGoogleAuth() {
  gapi.load('client:auth2', async () => {
    // ... código existente ...

    // NOVO: Chamar DRIVE_LOADER.init()
    await DRIVE_LOADER.init();
    
    // Continuar com inicialização normal
    loadFromStorage();
  });
}
```

### 3. Usar dados do DRIVE_DATA quando disponível
```javascript
// Ao invés de usar 'tenants' diretamente do arquivo,
// preferir window.DRIVE_DATA.tenants se disponível

const getTenants = () => window.DRIVE_DATA?.tenants || tenants;
const getCondoHistory = () => window.DRIVE_DATA?.condoHistory || condoHistory;
```

### 4. Integrar com callbacks de Drive
```javascript
// Chamar quando usuário conecta ao Drive
function onDriveConnected() {
  driveConnected = true;
  DRIVE_LOADER.onDriveConnected();
  updateSaveStatus('☁ Drive conectado', 'var(--blue)');
}

// Chamar quando usuário desconecta
function onDriveDisconnected() {
  driveConnected = false;
  DRIVE_LOADER.onDriveDisconnected();
  updateSaveStatus('💾 Drive desconectado', 'var(--text-faint)');
}
```

## Benefícios

✅ **Separação de responsabilidades** - Dados isolados do código
✅ **Reutilizável** - drive-loader.js pode ser usado em outros projetos
✅ **Testável** - Módulo independente com API clara
✅ **Compatível** - Funciona com código existente sem quebras
✅ **Versionável** - Dados com schema versionado
✅ **Extensível** - Pronto para Fase 2 (sincronização bidirecional)

## API do DRIVE_LOADER

### Métodos Públicos

```javascript
// Inicializar e carregar dados
await DRIVE_LOADER.init()
// Returns: boolean

// Carregar do Drive
await DRIVE_LOADER.loadFromDrive()
// Returns: boolean

// Carregar do localStorage
DRIVE_LOADER.loadFromLocalStorage()
// Returns: boolean

// Salvar dados no Drive
await DRIVE_LOADER.uploadFile(data, fileName)
// Returns: boolean

// Salvar no localStorage
DRIVE_LOADER.saveToLocalStorage(data)
// Returns: boolean

// Obter status de sincronização
DRIVE_LOADER.getStatus()
// Returns: { connected, lastSync, syncing, fileId, dataAvailable }

// Obter dados carregados
DRIVE_LOADER.getData()
// Returns: window.DRIVE_DATA object

// Callbacks de conectividade
DRIVE_LOADER.onDriveConnected()
DRIVE_LOADER.onDriveDisconnected()
```

### Dados Disponíveis

```javascript
window.DRIVE_DATA = {
  version: "1.0.0",
  schema_version: 4,
  exported_at: "2026-04-08T19:06:37Z",
  tenants: [...],           // Array de inquilinos
  condoHistory: [...],      // Histórico de condomínio
  condominios: [...],       // Imóveis/condomínios
  imoveis: [...],           // Imóveis (financeiro)
  despesasEscritorio: [...],
  receitasEscritorio: [...],
  clientesAdv: [...]        // Clientes do advogado
}
```

## Plano de Implementação

### Fase 1a: Integração Básica (hoje)
- [x] Criar drive-loader.js
- [ ] Incluir em index.html
- [ ] Testar carregamento com dados.json
- [ ] Validar fallback para localStorage

### Fase 1b: Validação (próximo)
- [ ] Testar com conexão Drive
- [ ] Testar sem conexão Drive
- [ ] Verificar performance
- [ ] Adicionar tratamento de erros robusto

### Fase 1c: Integração Completa (futuro)
- [ ] Remover código duplicado de loadFromDrive no index.html
- [ ] Consolidar lógica de save
- [ ] Adicionar logging estruturado

## Migração de Dados

### Para Usuários Existentes

O drive-loader.js implementa fallback automático:
1. Procura por `dados.json` (novo)
2. Se não encontrar, procura por `gestao_alugueis_dados.json` (legacy)
3. Se não encontrar, usa localStorage

**Resultado:** Nenhuma ação necessária do usuário - dados antigos continuam funcionando.

## Próximas Fases

**Fase 2:** Sincronização bidirecional
- Detectar mudanças locais
- Upload automático de mudanças
- Merge strategy para conflitos
- Offline mode

**Fase 3:** Refatoração completa
- Separar dados do código
- Remover dados hardcoded do index.html
- Usar apenas window.DRIVE_DATA como fonte

## Troubleshooting

### "Google Drive API não inicializada"
- Verifique se gapi.load foi chamado antes de DRIVE_LOADER.init()
- Confirme que GAPI_CLIENT_ID está correto

### "Arquivo não encontrado no Drive"
- Primeira execução é normal - crie o arquivo via UI
- Ou execute: `DRIVE_LOADER.uploadFile(window.DRIVE_DATA)`

### "localStorage é null"
- Verifique se localStorage está disponível (não em modo privado)
- Verifique quota (limite de 90KB)

## Commits e Versionamento

```
Fase 1a: feat: Fase 1a — drive-loader.js básico
Fase 1b: feat: Fase 1b — Validação e testes
Fase 1c: feat: Fase 1c — Integração completa com index.html
```
