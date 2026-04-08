# Fase 0: Extração e Estruturação de Dados

## Objetivo
Separar os dados do código HTML, criar um schema versionado e estruturar os dados em JSON limpo.

## Status Atual

### Estrutura de Dados Identificada
O `index.html` armazena os dados em localStorage com a seguinte estrutura (version: 4):

```javascript
getPayload() → {
  tenants,                  // Array de inquilinos com histórico de pagamentos
  condoHistory,            // Histórico de valores de condomínio (array)
  condominios,             // Array de imóveis/condomínios
  condoHistories,          // Map: condominioId → histórico de valores
  activeCondoId,           // ID do condomínio ativo
  imoveis,                 // Array de imóveis (financeiro)
  despesasEscritorio,      // Array de despesas do escritório
  receitasEscritorio,      // Array de receitas do escritório
  clientesAdv,             // Array de clientes do advogado
  savedAt,                 // ISO string de quando foi salvo
  version: 4               // Versão do schema
}
```

### Backup Atual
- ✅ `gestao_alugueis_dados.json.backup.20260408_190404.bak` (47KB)
  - Contém: tenants, condoHistory, exportedAt, version
  - Não contém: imoveis, despesasEscritorio, receitasEscritorio, clientesAdv
  - Data: 2026-03-15 (desatualizado)

### Schema Versionado
- ✅ `schema.json` criado
  - Define estrutura esperada para v1.0.0
  - Inclui validação de tipos
  - Baseado na análise do backup

## Plano de Ação

### Fase 0a: Extração do index.html
1. Procurar por onde estão inicializadas as variáveis globais
2. Extrair `tenants`, `condominios`, `imoveis`, etc.
3. Criar um script de extração que simula o `getPayload()`

### Fase 0b: Validação de Dados
1. Comparar dados extraídos com schema.json
2. Verificar integridade de tipos
3. Identificar campos faltantes ou inconsistentes

### Fase 0c: Estruturação Final
1. Criar `dados.json` (versão "limpa" dos dados)
2. Incluir versionamento e metadados
3. Preparar para próximas fases (Fase 1, 2)

## Próximos Passos
- [ ] Analisar inicialização de variáveis no index.html
- [ ] Extrair dados para arquivo JSON externo
- [ ] Validar contra schema
- [ ] Preparar para refatoração do index.html (Fase 1)

## Notas
- O arquivo atual no Drive está desatualizado (março de 2026)
- Dados em localStorage podem estar mais atualizados
- Precisaremos exportar dados do navegador para ter versão completa
