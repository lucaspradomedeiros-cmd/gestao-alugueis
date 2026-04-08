# Testes - Drive Loader

## Checklist de Testes

### Teste 1: Carregamento do localStorage (Offline)
```javascript
// No console do navegador:
> DRIVE_LOADER.loadFromLocalStorage()
// Esperado: true (se houver dados em localStorage)
// Log esperado: "[DriveLoader] Dados carregados de localStorage"
```

### Teste 2: Status de Conexão
```javascript
> DRIVE_LOADER.getStatus()
// Esperado: { connected: false, lastSync: null, syncing: false, fileId: null, dataAvailable: false }
```

### Teste 3: Dados Disponíveis
```javascript
> window.DRIVE_DATA
// Esperado: null (antes de carregar) ou { version, tenants, ... }
```

### Teste 4: Carregamento do Drive (Online)
```javascript
// Com Google Drive conectado:
> DRIVE_LOADER.driveConnected = true
> await DRIVE_LOADER.loadFromDrive()
// Esperado: true
// Log esperado: "[DriveLoader] Arquivo encontrado: dados.json"
// Log esperado: "[DriveLoader] Dados carregados do Drive com sucesso"
```

### Teste 5: Status Após Carregamento
```javascript
> DRIVE_LOADER.getStatus()
// Esperado: { 
//   connected: true, 
//   lastSync: Date, 
//   syncing: false, 
//   fileId: "...", 
//   dataAvailable: true 
// }
```

### Teste 6: Dados Estrutura
```javascript
> DRIVE_LOADER.getData()
// Esperado: {
//   version: "1.0.0",
//   tenants: [Array],
//   condoHistory: [Array],
//   condominios: [Array],
//   ...
// }
```

### Teste 7: Salvamento em Drive
```javascript
const testData = DRIVE_LOADER.getData();
> await DRIVE_LOADER.uploadFile(testData, 'test-dados.json')
// Esperado: true
// Log esperado: "[DriveLoader] Arquivo salvo no Drive com sucesso"
```

### Teste 8: Fallback - Arquivo Legado
// Renomear dados.json temporariamente
```bash
$ mv dados.json dados.json.bak
```

```javascript
> await DRIVE_LOADER.loadFromDrive()
// Esperado: true (carregando arquivo legado gestao_alugueis_dados.json)
// Log: "[DriveLoader] Usando arquivo legado..."
```

```bash
$ mv dados.json.bak dados.json
```

### Teste 9: Sincronização Bidirecional (Preparação)
```javascript
// Simular mudança de dado
const data = DRIVE_LOADER.getData();
data.tenants[0].name = "Teste Modificado";

> await DRIVE_LOADER.uploadFile(data)
// Esperado: true e dados salvos no Drive

> DRIVE_LOADER.loadFromLocalStorage()
// Esperado: true com dado modificado
```

## Performance

### Teste de Velocidade
```javascript
// Medir tempo de carregamento
console.time('load-drive');
await DRIVE_LOADER.loadFromDrive();
console.timeEnd('load-drive');
// Esperado: < 2000ms (2 segundos)

console.time('load-local');
DRIVE_LOADER.loadFromLocalStorage();
console.timeEnd('load-local');
// Esperado: < 100ms
```

## Casos de Erro

### Teste 10: Arquivo Corrompido
```javascript
// Simular arquivo inválido no Drive
localStorage.setItem('gestao_alugueis_v1', '{ broken json }');

> DRIVE_LOADER.loadFromLocalStorage()
// Esperado: false (erro ao fazer parse)
// Log: "[DriveLoader] Erro ao carregar localStorage: SyntaxError"
```

### Teste 11: Dados Inválidos
```javascript
> DRIVE_LOADER.applyData({ notenants: [] })
// Esperado: false
// Log: "[DriveLoader] Dados inválidos"
```

### Teste 12: Sem Permissão no Drive
// Remover permissão de leitura na pasta appDataFolder
```javascript
DRIVE_LOADER.driveConnected = true;
> await DRIVE_LOADER.loadFromDrive()
// Esperado: false e retry automático (3 tentativas)
// Log: "[DriveLoader] Erro ao fazer download: (erro específico)"
```

## Integração com index.html

### Teste 13: Inicializar Antes do index.html
```javascript
// Aguardar drive-loader estar pronto antes de usar tenants
> await DRIVE_LOADER.init()
> const tenants = window.DRIVE_DATA.tenants || window.tenants
// Esperado: dados carregados corretamente
```

### Teste 14: Sincronizar com index.html
```javascript
// Após conectar ao Drive no index.html
> DRIVE_LOADER.onDriveConnected()
> DRIVE_LOADER.getStatus()
// Esperado: { connected: true, ... }
```

## Checklist Final

- [ ] Teste 1: localStorage offline ✓
- [ ] Teste 2: Status inicial ✓
- [ ] Teste 3: Dados nulos ✓
- [ ] Teste 4: Drive online ✓
- [ ] Teste 5: Status após carregamento ✓
- [ ] Teste 6: Estrutura de dados ✓
- [ ] Teste 7: Upload para Drive ✓
- [ ] Teste 8: Fallback arquivo legado ✓
- [ ] Teste 9: Modificação e sincronização ✓
- [ ] Teste 10: Arquivo corrompido ✓
- [ ] Teste 11: Dados inválidos ✓
- [ ] Teste 12: Erro de permissão ✓
- [ ] Teste 13: Integração com index.html ✓
- [ ] Teste 14: Sincronização callbacks ✓
- [ ] Performance < 2s ✓

## Notas

- Todos os testes devem ser executados no console do navegador (F12)
- Manter registro de variações entre navegadores (Chrome, Firefox, Safari)
- Documentar qualquer comportamento inesperado para a Fase 1b
