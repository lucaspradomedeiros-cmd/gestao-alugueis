# Roadmap - Separação de Dados e Código

## Status Atual (08/04/2026)

### ✅ Fase 0: Extração e Estruturação de Dados
**Commit:** `990ae0f` - feat: Fase 0 — Extração e Estruturação de Dados

Completado:
- [x] Backup do index.html (518KB)
- [x] Backup do dados.json do Google Drive (47KB)
- [x] Schema versionado (JSON Schema v1.0.0)
- [x] Arquivo consolidado (dados.json - 35.5KB)
- [x] Documentação de plano

**Artefatos:**
```
✓ index.html.backup.20260408_183500.bak (518KB)
✓ gestao_alugueis_dados.json.backup.20260408_190404.bak (47KB)
✓ schema.json (2.6KB) — Validação de tipos
✓ dados.json (35.5KB) — Dados consolidados
✓ FASE_0_PLANO.md — Documentação
```

---

### 🔄 Fase 1: Carregamento do Google Drive
**Status:** 1a COMPLETO | 1b DOCUMENTADO | 1c PLANEJADO

#### 1a: Módulo drive-loader.js
**Commit:** `60509fd` - feat: Fase 1a — Módulo de Carregamento do Google Drive

Completado:
- [x] drive-loader.js (679 linhas)
  - Carregamento de dados.json do Drive
  - Fallback para arquivo legado
  - Sincronização com localStorage
  - API pública clara
- [x] FASE_1_GUIA.md — API e integração
- [x] drive-loader.test.md — 14 testes validação

**Artefatos:**
```
✓ drive-loader.js (679 linhas) — Módulo separado, reutilizável
✓ FASE_1_GUIA.md — API completa e arquitetura
✓ drive-loader.test.md — Testes de validação
```

#### 1b: Integração no index.html
**Commit:** `0107caf` - docs: Fase 1b — Guia de Integração no index.html

Status: DOCUMENTADO, PRONTO PARA IMPLEMENTAÇÃO

Próximos passos:
- [ ] Incluir drive-loader.js no <head>
- [ ] Inicializar DRIVE_LOADER.init() após gapi.client.init()
- [ ] Atualizar onDriveConnected() e onDriveDisconnected()
- [ ] Testar via console (F12)
- [ ] Documentar comportamento observado

**Artefatos:**
```
✓ FASE_1b_INTEGRACAO.md — Guia passo-a-passo
```

#### 1c: Consolidação (Futuro)
Planejado:
- Remover código duplicado de loadFromDrive() no index.html
- Mover lógica de save para DRIVE_LOADER.uploadFile()
- Consolidar em única fonte de sincronização

---

### ⏳ Fase 2: Sincronização Bidirecional Drive ↔ Local
**Status:** PLANEJADO

Escopo:
- [ ] Versioning e tracking de mudanças
- [ ] Merge strategy para conflitos
- [ ] Debounced save automático
- [ ] Offline mode completo
- [ ] Testes de sincronização

**Task:** #3 (Pendente)

---

### ⏳ Fase 3: Refatoração do index.html
**Status:** PLANEJADO

Escopo:
- [ ] Separar dados do código
- [ ] Remover arrays hardcoded
- [ ] Usar apenas window.DRIVE_DATA como fonte
- [ ] Modularizar funções de UI
- [ ] Testes unitários

---

## Arquitetura Final (Após Fase 3)

```
Google Drive (appDataFolder)
  └── dados.json (fonte primária)
       └─ tenants, condominios, imoveis, etc.
       └─ versionado + timestamp

              ↕ (Sincronização Bidirecional)
              
localhost:5000 (Browser)
  ├── drive-loader.js (sincronização)
  │   └── window.DRIVE_DATA (dados em memória)
  │   └── localStorage (cache 90KB)
  │
  └── index.html (UI)
      └── Consome window.DRIVE_DATA
      └── Não modifica dados diretamente
      └── Chama DRIVE_LOADER para save
```

## Benefícios

✅ **Separação clara** — Dados isolados do código
✅ **Versionado** — Schema com versioning
✅ **Sincronizado** — Drive ↔ Local automático
✅ **Resiliente** — Offline mode + fallbacks
✅ **Modular** — drive-loader.js reutilizável
✅ **Testável** — Componentes independentes
✅ **Escalável** — Pronto para mobile/API

## Próximos Passos Imediatos

### Hoje (Fase 1b Integração)
1. Ler FASE_1b_INTEGRACAO.md
2. Aplicar mudanças no index.html
3. Testar no navegador (console)
4. Documentar comportamento
5. Fazer commit

### Amanhã (Fase 1c Consolidação)
1. Remover código duplicado
2. Unificar logica de save
3. Testes finais
4. Commit e review

### Próxima Semana (Fase 2)
1. Implementar versionamento
2. Merge strategy para conflitos
3. Debounced save
4. Offline support completo

## Estatísticas

| Item | Fase 0 | Fase 1 | Fase 2 | Fase 3 | Total |
|------|--------|--------|--------|--------|-------|
| Linhas de código | 2.6K | 0.9K | ? | ? | ~4K+ |
| Arquivos | 3 | 5 | ? | ? | ~10 |
| Commits | 2 | 2 | ? | ? | ~6+ |
| Testes | 0 | 14 | ? | ? | ~30+ |

## Tempo Estimado

- Fase 1b: 1-2 horas (integração + testes)
- Fase 1c: 1 hora (consolidação)
- Fase 2: 4-6 horas (sincronização)
- Fase 3: 3-4 horas (refatoração)

**Total: ~10-15 horas de trabalho**

## Links Úteis

- `FASE_0_PLANO.md` — Contexto da Fase 0
- `FASE_1_GUIA.md` — API do drive-loader.js
- `FASE_1b_INTEGRACAO.md` — Guia de integração
- `drive-loader.test.md` — Testes de validação
- `dados.json` — Dados estruturados
- `schema.json` — Validação de tipos
