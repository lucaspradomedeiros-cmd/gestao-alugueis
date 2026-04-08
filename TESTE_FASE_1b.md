# Teste Prático - Fase 1b

## Como Testar

### 1️⃣ Abrir o Navegador

1. Abra [http://localhost:5000](http://localhost:5000) (ou wherever seu servidor está)
2. Digite a senha para acessar
3. Abra o DevTools: **F12** (ou Cmd+Option+I no Mac)
4. Vá até a aba **Console**

### 2️⃣ Verificar Carregamento do Módulo

No console, execute:

```javascript
typeof DRIVE_LOADER
```

**Esperado:** `"object"`

Se retornar `undefined`, significa que `drive-loader.js` não foi carregado. Verifique:
- Se arquivo existe em `/home/lucas/Documentos/gestao-alugueis/drive-loader.js`
- Se há erro de rede (aba Network do DevTools)

### 3️⃣ Verificar Status Inicial

```javascript
DRIVE_LOADER.getStatus()
```

**Esperado (offline):**
```javascript
{
  connected: false,
  lastSync: null,
  syncing: false,
  fileId: null,
  dataAvailable: false
}
```

### 4️⃣ Verificar Dados Carregados (localStorage)

```javascript
window.DRIVE_DATA
```

**Esperado:**
- Se houver dados em localStorage: objeto com `{ version, tenants, condoHistory, ... }`
- Se não houver: `null` ou `undefined`

Se houver dados:
```javascript
// Verificar quantidade de inquilinos
DRIVE_LOADER.getData().tenants.length

// Verificar primeiro inquilino
DRIVE_LOADER.getData().tenants[0]
```

### 5️⃣ Conectar ao Google Drive

1. Na UI do aplicativo, clique no botão **"☁ Conectar Drive"** (no topo)
2. Aguarde a autenticação do Google
3. Conceda permissão para acessar o Google Drive

### 6️⃣ Verificar Status Após Conectar

```javascript
DRIVE_LOADER.getStatus()
```

**Esperado (online):**
```javascript
{
  connected: true,
  lastSync: Tue Apr 08 2026 19:15:00 GMT-0300 (Brasília Standard Time),
  syncing: false,
  fileId: "1abc2def3ghi4jkl5mno6pqr7stu8vwx",
  dataAvailable: true
}
```

### 7️⃣ Verificar Logs

Na aba **Console**, procure por mensagens com prefixo `[DriveLoader]`:

```
[DriveLoader] Inicializando...
[DriveLoader] Carregando do Drive...
[DriveLoader] Procurando arquivo no Drive...
[DriveLoader] Arquivo encontrado: dados.json
[DriveLoader] Arquivo salvo em localStorage
[DriveLoader] Dados aplicados com sucesso
[DriveLoader] Drive conectado
```

### 8️⃣ Testar Dados Carregados do Drive

```javascript
// Verificar versão
DRIVE_LOADER.getData().version

// Verificar quantidade de inquilinos
DRIVE_LOADER.getData().tenants.length

// Verificar histórico de condomínio
DRIVE_LOADER.getData().condoHistory.length

// Ver primeiro inquilino
DRIVE_LOADER.getData().tenants[0].name
```

### 9️⃣ Testar Salvamento no Drive

```javascript
// Simular mudança de dados (teste seguro)
const data = DRIVE_LOADER.getData();
const oldName = data.tenants[0].name;
data.tenants[0].name = "TESTE_" + new Date().toISOString().slice(11, 19);

// Salvar no Drive
await DRIVE_LOADER.uploadFile(data)
```

**Resultado esperado:**
- `true` se salvou com sucesso
- Logs: `[DriveLoader] Arquivo salvo no Drive com sucesso`

### 🔟 Restaurar Dados (Desfazer Teste)

```javascript
// Recarregar dados originais do localStorage
DRIVE_LOADER.loadFromLocalStorage()
```

## Checklist de Validação

- [ ] `DRIVE_LOADER` está definido
- [ ] `getStatus()` retorna objeto
- [ ] Sem conexão Drive:
  - [ ] `connected: false`
  - [ ] `dataAvailable: false`
- [ ] Com conexão Drive:
  - [ ] `connected: true`
  - [ ] `syncing: false`
  - [ ] `fileId` é uma string
  - [ ] `dataAvailable: true`
- [ ] `window.DRIVE_DATA` tem estrutura:
  - [ ] `version`
  - [ ] `tenants` (array)
  - [ ] `condoHistory` (array)
  - [ ] `condominios` (array)
  - [ ] `imoveis` (array)
- [ ] Logs aparecem no console
- [ ] Upload funciona (arquivo salvo no Drive)
- [ ] Aplicação continua funcionando normalmente

## Possíveis Erros e Soluções

### Erro: "DRIVE_LOADER is not defined"
**Causa:** drive-loader.js não foi carregado
**Solução:** Verifique Network tab (F12 → Network), procure por drive-loader.js

### Erro: "gapi not initialized" em DRIVE_LOADER.init()
**Causa:** DRIVE_LOADER.init() foi chamado antes de gapi estar pronto
**Solução:** Normal na primeira vez, aguarde alguns segundos e recarregue

### Erro: "Arquivo não encontrado no Drive"
**Causa:** Primeira execução - dados.json não existe no Drive ainda
**Solução:** 
- Normal para primeiro acesso
- Próxima vez que salvar via UI, arquivo será criado
- Ou execute: `await DRIVE_LOADER.uploadFile(window.DRIVE_DATA)`

### dados.json está vazio/nulo
**Causa:** localStorage não tem dados
**Solução:**
- Use a UI para importar um backup: Menu → Importar Backup
- Ou faça alguma alteração para gerar dados

### Performance lenta ao carregar
**Causa:** Arquivo grande no Drive
**Solução:** Normal para primeiros 2-3 segundos, aguarde

## Teste de Performance

```javascript
// Medir tempo de carregamento do localStorage
console.time('load-local');
DRIVE_LOADER.loadFromLocalStorage();
console.timeEnd('load-local');
// Esperado: < 100ms

// Medir tempo de carregamento do Drive
console.time('load-drive');
await DRIVE_LOADER.loadFromDrive();
console.timeEnd('load-drive');
// Esperado: < 2000ms
```

## Próximas Fases

Após validar tudo:
- [ ] Fase 1c: Consolidação (remover código duplicado)
- [ ] Fase 2: Sincronização bidirecional
- [ ] Fase 3: Refatoração HTML

## Documentação Relacionada

- `FASE_1_GUIA.md` — API completa
- `drive-loader.js` — Código fonte
- `drive-loader.test.md` — Testes automáticos
