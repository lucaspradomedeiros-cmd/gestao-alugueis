# Fase 1b: Integração do Drive-Loader no index.html

## Status
- [x] drive-loader.js criado
- [ ] Integrado no index.html
- [ ] Testado com Google Drive
- [ ] Documentado

## Mudanças Necessárias no index.html

### 1️⃣ Incluir Script (Linha ~50, no <head>)

**Local:** Antes de qualquer outro script que use Google Drive

```html
<!-- Módulo de carregamento de dados do Google Drive -->
<script src="drive-loader.js"></script>
```

### 2️⃣ Inicializar DRIVE_LOADER (Por volta da linha 7230)

**Buscar a função:**
```javascript
gapi.load('client:auth2', function() {
```

**Modificar para:**
```javascript
gapi.load('client:auth2', async function() {
  // Código existente...
  await gapi.client.init({
    apiKey: API_KEY,
    clientId: GAPI_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.appdata',
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
  });

  // NOVO: Inicializar DRIVE_LOADER
  console.log('[init] Carregando dados via DRIVE_LOADER...');
  await DRIVE_LOADER.init();
  console.log('[init] Status:', DRIVE_LOADER.getStatus());

  // Código existente continua...
  driveConnected = gapi.auth2.getAuthInstance().isSignedIn.get();
  if(!driveConnected){
    updateSaveStatus('⚠ Conecte ao Drive para sincronizar dados','var(--amber)');
  } else {
    onDriveConnected();
  }
  gapi.auth2.getAuthInstance().isSignedIn.listen(onSignInChange);
});
```

### 3️⃣ Atualizar onDriveConnected (Por volta da linha 7223)

**Antes:**
```javascript
function onDriveConnected(){
  driveConnected = true;
  updateSaveStatus('☁ Drive conectado', 'var(--blue)');
  // ...
}
```

**Depois:**
```javascript
function onDriveConnected(){
  driveConnected = true;
  DRIVE_LOADER.onDriveConnected();  // NOVO
  updateSaveStatus('☁ Drive conectado', 'var(--blue)');
  // ...
}
```

### 4️⃣ Atualizar onDriveDisconnected (Se existir, ou criar)

```javascript
function onDriveDisconnected(){
  driveConnected = false;
  DRIVE_LOADER.onDriveDisconnected();  // NOVO
  updateSaveStatus('💾 Desconectado - Dados salvos localmente', 'var(--text-faint)');
}
```

### 5️⃣ Usar Dados do DRIVE_LOADER (Opcional - Próxima Fase)

**Atualmente:** index.html usa variáveis globais `tenants`, `condoHistory`, etc.
**Futuro:** Preferir `window.DRIVE_DATA` quando disponível

Isso será feito na Fase 1c para não quebrar código atual.

## Fluxo de Execução com as Mudanças

```
1. HTML carrega
2. <script src="drive-loader.js"></script>
3. Google API carrega (gapi)
4. gapi.load('client:auth2', async function())
5. DRIVE_LOADER.init() ← Carrega dados do Drive ou localStorage
6. driveConnected verificado
7. onDriveConnected() chamado se conectado
   └─ DRIVE_LOADER.onDriveConnected() sincroniza novamente
8. UI inicializada com dados em window.DRIVE_DATA ou tenants (fallback)
```

## Teste Rápido

### 1. Verificar se módulo está carregado
```javascript
// No console (F12)
> typeof DRIVE_LOADER
"object"

> DRIVE_LOADER.getStatus()
{ connected: false, lastSync: null, syncing: false, fileId: null, dataAvailable: false }
```

### 2. Após conectar ao Drive
```javascript
> DRIVE_LOADER.getStatus()
{ 
  connected: true, 
  lastSync: Tue Apr 08 2026 19:10:00 GMT-0300 (Brasília Standard Time),
  syncing: false,
  fileId: "1abc2def3ghi4jkl5mno6pqr7stu8vwx",
  dataAvailable: true 
}
```

### 3. Verificar dados carregados
```javascript
> window.DRIVE_DATA
{
  version: "1.0.0",
  schema_version: 4,
  exported_at: "2026-04-08T19:06:37Z",
  tenants: Array(12),
  condoHistory: Array(46),
  ...
}
```

## Possíveis Problemas

| Problema | Solução |
|----------|---------|
| "DRIVE_LOADER is not defined" | Verificar se drive-loader.js está antes dos scripts que o usam |
| "gapi not initialized" | DRIVE_LOADER.init() foi chamado antes de gapi.load() completar |
| "Arquivo não encontrado" | Normal na primeira vez - criar dados.json via saveToDrive |
| "Erro de CORS" | Verificar que CLIENT_ID está correto e origem é permitida |

## Commits Esperados

```bash
# Após testar integração:
git add index.html
git commit -m "feat: Fase 1b — Integrar drive-loader.js no index.html

Mudanças:
- Incluir drive-loader.js no <head>
- Inicializar DRIVE_LOADER após gapi estar pronto
- Conectar callbacks onDriveConnected/Disconnected
- Verificar carregamento via console

Testes:
- DRIVE_LOADER.getStatus() retorna dados
- window.DRIVE_DATA preenchido após carregar
- Funciona offline com localStorage
- Sincroniza ao conectar Drive

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

## Próxima Etapa: Fase 1c

Após Fase 1b estar funcionando:
- Remover código duplicado de `loadFromDrive()` no index.html
- Mover lógica de save para usar `DRIVE_LOADER.uploadFile()`
- Consolidar em uma única fonte de sincronização

## Links Úteis

- FASE_1_GUIA.md — API completa do DRIVE_LOADER
- drive-loader.test.md — 14 testes de validação
- FASE_0_PLANO.md — Contexto da Fase 0

## Checklist de Implementação

- [ ] Incluir drive-loader.js no <head> do index.html
- [ ] Inicializar DRIVE_LOADER.init() após gapi.client.init()
- [ ] Atualizar onDriveConnected() e onDriveDisconnected()
- [ ] Testar no navegador (F12 console)
- [ ] Confirmar DRIVE_LOADER.getStatus() retorna dados
- [ ] Testar offline (desligar Drive, recarregar)
- [ ] Testar online (conectar Drive, recarregar)
- [ ] Documentar comportamento observado
- [ ] Fazer commit com todas as mudanças
