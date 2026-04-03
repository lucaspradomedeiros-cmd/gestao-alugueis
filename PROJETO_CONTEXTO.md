# Gestão de Aluguéis — Documentação do Projeto

**Proprietário:** Lucas Prado Medeiros Perin  
**Repositório:** [lucaspradomedeiros-cmd/gestao-alugueis](https://github.com/lucaspradomedeiros-cmd/gestao-alugueis)  
**Produção:** [gestao.vpadvogados.com.br](https://gestao.vpadvogados.com.br)  
**Última atualização:** 03/04/2026

---

## 1. Identificação

| Campo | Valor |
|-------|-------|
| Nome | Lucas Prado Medeiros Perin |
| CPF | 702.738.471-04 |
| PIX | 702.738.471-04 |
| Cidade | Campo Grande/MS |
| Email Google | lucas.prado.medeiros@gmail.com |
| Email (Zoho) | vpadvogados.com.br |

---

## 2. Infraestrutura

### GitHub
| Campo | Valor |
|-------|-------|
| Usuário | lucaspradomedeiros-cmd |
| Repositório | gestao-alugueis |
| GitHub Pages | https://lucaspradomedeiros-cmd.github.io/gestao-alugueis |
| Domínio customizado | https://gestao.vpadvogados.com.br |
| Arquivo principal | `index.html` (raiz do repositório) |

### DNS — Registro.br
| Tipo | Nome | Valor |
|------|------|-------|
| A | vpadvogados.com.br | 185.199.108–111.153 (GitHub IPs) |
| CNAME | www | l-prado.github.io |
| CNAME | gestao | lucaspradomedeiros-cmd.github.io |
| MX | vpadvogados.com.br | Zoho Mail |
| TXT | vpadvogados.com.br | SPF Zoho |

### Pasta local (Linux)
```
~/Documentos/gestao-alugueis/
├── index.html                                        ← app completo
├── atualizar.sh                                      ← script de deploy
├── CNAME                                             ← configuração do domínio (não mexer)
├── README.md
├── PROJETO_CONTEXTO.md                               ← este documento
└── Controle de Pagamentos e Condominio 2025.xlsx     ← planilha fonte dos dados
```

### Script de deploy (`atualizar.sh`)
```bash
# Copia index.html de ~/Downloads para o repositório, faz commit e push
~/Documentos/gestao-alugueis/atualizar.sh
```

---

## 3. Segurança e Autenticação

| Item | Valor |
|------|-------|
| Senha de acesso | Aluguel54026113!@ |
| Hash SHA-256 | `3928a0d0aa4278d86016a7ef568939ec2f7d3eafc77713e6cc5186884f917a33` |
| Duração da sessão | 8 horas (sessionStorage) |
| Implementação | `crypto.subtle` SHA-256 (requer HTTPS) |

> ⚠️ **Risco conhecido:** o hash está visível no código-fonte. SHA-256 de senhas curtas pode ser revertido via rainbow tables. Mitigação futura: autenticação via Google OAuth.

---

## 4. Google Drive — Sincronização

| Campo | Valor |
|-------|-------|
| Projeto GCP | gestao-alugueis |
| API | Google Drive API |
| Client ID OAuth | `267608598510-h5f83cjjqe20qc8n9gqtrltvq5n1lb6o.apps.googleusercontent.com` |
| Escopo | `https://www.googleapis.com/auth/drive.appdata` |
| Conta autorizada | lucas.prado.medeiros@gmail.com |
| Arquivo no Drive | `gestao_alugueis_dados.json` |
| Local no Drive | `appDataFolder` (oculto, privado da aplicação) |

### Drive é a fonte principal de dados

```
Abertura do sistema
    └── carrega localStorage (cache instantâneo)
           └── Drive reconecta automaticamente (token salvo)
                  └── carrega dados do Drive → sobrescreve localStorage
```

| Evento | Comportamento |
|--------|--------------|
| Primeira conexão (sem arquivo no Drive) | Envia dados atuais ao Drive automaticamente |
| Qualquer alteração | localStorage imediato + Drive após 3s (debounce) |
| Auto-save | A cada 2 minutos com Drive ativo |
| Fechar aba | Salva no Drive via `beforeunload` |
| Drive desconectado | Aviso em âmbar após 5 segundos |

---

## 5. Arquitetura do App

### Stack
- HTML + CSS + JavaScript puro (sem framework, sem backend)
- Arquivo único `index.html`
- Fontes: DM Serif Display + DM Sans (Google Fonts)
- Scripts externos: apenas Google APIs (`api.js` + `gsi/client`)

### Métricas atuais (03/04/2026)

| Métrica | Valor |
|---------|-------|
| Tamanho do arquivo | 334 KB |
| Total de linhas | ~4.515 |
| Linhas de CSS | ~403 |
| Linhas de JavaScript | ~3.519 |
| Funções JavaScript | 146 (escopo global) |
| `innerHTML` usages | 41 |
| `eval()` | 0 |

### Estrutura interna do código
```
index.html
├── <style> login                   ← CSS tela de login
├── <script> auth                   ← SHA-256, sessionStorage, tela de login
├── <style> app                     ← CSS principal (~403 linhas)
├── HTML estrutural                 ← sidebar, pages, modais
└── <script> app                    ← toda a lógica (~3.519 linhas)
    ├── IMÓVEIS                     ← cadastro, despesas por imóvel
    ├── CONDOMÍNIOS                 ← lançamentos, rateio, multi-condo
    ├── LOCATÁRIOS                  ← cadastro, histórico, pagamentos
    ├── MOTOR FINANCEIRO            ← multa, juros, carry-over, status
    ├── RELATÓRIOS                  ← receitas, repasse proprietário
    ├── ALERTAS & REAJUSTES
    ├── WHATSAPP                    ← mensagem de cobrança
    ├── RECIBO                      ← emissão, impressão/PDF
    └── PERSISTÊNCIA                ← localStorage + Google Drive
```

### Chave de storage
```js
const STORAGE_KEY = 'gestao_alugueis_v1'; // payload versão 3
```

---

## 6. Condomínio

| Campo | Valor |
|-------|-------|
| Nome | Residencial Santa Nonna I |
| Apelido | SN1 |
| ID interno | c1 |
| Endereço | Campo Grande/MS |
| UC Água (SANESUL) | 20576293 |
| UC Energia (ENERGISA) | 10/1207555-2 |
| Unidades | Apto 1 a Apto 8 (8 unidades) |
| Limpeza padrão | R$ 330,00/mês |
| Taxa de administração | 10% por item (água, energia, limpeza, IPTU, lixo, outras) |
| Vencimento | Mês seguinte ao aluguel (configurável) |

---

## 7. Inquilinos Ativos

> Todos os contratos são **prazo indeterminado** após o término contratual original.

| Unidade | Inquilino | Aluguel | Garantia | Telefone | Início | Entradas |
|---------|-----------|---------|----------|----------|--------|----------|
| Apto 1 | Rafael Moura Dornelles | R$ 707,07 | Seguro Fiança | 67 9864-6110 | Jan/2022 | 47 |
| Apto 2 | Evelin Marcelly Caoni Soligo | R$ 652,48 | Fiadores | 67 9841-3611 | Fev/2021 | 47 |
| Apto 3 | Ana Carla Vieira Ferreira | R$ 648,22 | Fiadores | 67 9176-9741 | Dez/2021 | 47 |
| Apto 4 | Adriano Ramoa Andrade | R$ 850,00 | Fiadores | 99868-0602 | Jun/2025 | 13 |
| Apto 5 | Gabriely Vilhalva Mendonça | R$ 722,46 | Fiadores | 67 9864-1720 | Jun/2023 | 36 |
| Apto 6 | Fernanda Duarte | R$ 666,88 | Seguro Fiança | 67 9310-1119 | Jul/2022 | 47 |
| Apto 7 | Lorenza (Malharia Sol de Verão) | R$ 722,46 | Fiadores | 67 9961-9424 | Jun/2023 | 36 |
| Apto 8 | Thais | R$ 600,00 | Sem Garantia | 98137-4705 | Abr/2026 | 1 |

**Total:** 274 entradas de histórico de pagamentos importadas da planilha.

---

## 8. Histórico do Condomínio

| Período | Lançamentos | Origem |
|---------|-------------|--------|
| Jun/2022 a Mar/2026 | 46 meses | Planilha xlsx importada |

---

## 9. Regras de Negócio

| Regra | Detalhe |
|-------|---------|
| Condomínio | Lançamento de Fev/2026 é cobrado junto com aluguel de Mar/2026 |
| IPTU e Taxa de Lixo | Cobrados no mesmo mês de referência do aluguel |
| Vencimento | Configurável por condomínio: mesmo mês ou mês seguinte |
| Multa | 10% flat, aplicada uma única vez no primeiro vencimento em atraso |
| Juros | 1%/mês, pro-rata diária (≈ 0,0333%/dia) |
| Carry-over | Multa e juros não pagos carregam para `pendingMulta`/`pendingJuros` do mês seguinte |
| Pagamento parcial | Status `parcial` quando `valorPago > 0` mas `< valorCobrado` |
| Status possíveis | `pago`, `pendente`, `inadimplente`, `parcial`, `futuro`, `vago` |

---

## 10. Funções-chave do Código

| Função | Papel |
|--------|-------|
| `buildMonthEntry(t, ref)` | Cria entrada mensal com valores calculados |
| `hydrateEntries()` | Atualiza entradas futuras com dados do condo |
| `getEntryForDisplay(t)` | Retorna entrada válida para exibição no card |
| `getCobrRows(t, e)` | Monta linhas de cobrança para cards e WhatsApp |
| `getCondoVencYM(condoId, ref)` | Calcula ano-mês do vencimento conforme config do condo |
| `applyPayment(...)` | Registra pagamento e determina status |
| `_resetPaymentEntry(t, ref)` | Desfaz pagamento zerando valores |
| `saveCondoMonth()` | Salva lançamento do condo e distribui para inquilinos |
| `saveToStorage()` | localStorage imediato + Drive com debounce de 3s |
| `loadFromDrive()` | Carrega do Drive; se vazio, envia dados atuais |
| `onDriveConnected()` | Ativa auto-save periódico e beforeunload |
| `switchCondo(id)` | Troca condomínio ativo |
| `toggleDarkMode()` | Alterna tema, persiste em localStorage |

---

## 11. Alterações desta Sessão de Desenvolvimento (02–03/04/2026)

| Commit | Descrição |
|--------|-----------|
| `7ff5966` | Vencimento configurável por condomínio (mês seguinte ou mesmo mês do ref) |
| `af36acc` | Corrige vencimento nos cards e modal WhatsApp para seguir config do condo |
| `f0eb567` | Modo escuro com toggle na sidebar e persistência por localStorage |
| `df528f6` | Corrige atualização dos cards após editar pagamento (`renderDashboard` ausente) |
| `28e5e94` | Exclusão de lançamento no histórico do condomínio com botão ✕ |
| `d6e945d` | Importação completa da planilha xlsx (274 entradas, 8 inquilinos, 46 meses de condo) |
| `3553d5d` | Drive como fonte principal: debounce, auto-save 2min, beforeunload, first-push |

---

## 12. Diagnóstico Técnico

### Riscos identificados

| Risco | Severidade | Situação |
|-------|-----------|----------|
| Hash de senha visível no código-fonte | **Alta** | Aberto — mitigar com OAuth |
| 146 funções no escopo global | Média | Dívida técnica |
| Dados e código no mesmo arquivo (334 KB) | Média | Planejado separar (Fase 1) |
| 41 usos de `innerHTML` sem input direto | Baixa | Aceitável |
| localStorage limite 5 MB (uso atual ~90 KB) | Baixa | Monitorar |

### Pontos positivos
- Zero dependências além das Google APIs
- Sem `eval()` no código
- Portabilidade total (arquivo único)
- Triple redundância: Drive + localStorage + backup manual `.json`

---

## 13. Roadmap de Melhorias

### Fase 1 — Correções críticas
- [ ] **Separar `dados.json` do `index.html`** — Drive salva só o JSON; código fica no GitHub Pages estático. Resolve o problema de sincronização.
- [ ] Normalizar nomes dos inquilinos (trim, capitalização correta)
- [ ] Autenticação via Google OAuth (elimina hash de senha no código)

### Fase 2 — Melhorias de valor (próximo mês)
- [ ] Extrato / recibo PDF por inquilino (`window.print()` com CSS dedicado)
- [ ] Dashboard financeiro mensal (receita total vs. inadimplência)
- [ ] Reajuste automático IPCA/IGP-M via API do Banco Central (gratuita)
- [ ] Validação de formulários (datas inválidas, valores negativos)
- [ ] Painel de cobranças a vencer nos próximos X dias

### Fase 3 — Evolução estratégica (próximo trimestre)
- [ ] Envio de cobrança WhatsApp em lote (todos os inquilinos de uma vez)
- [ ] Histórico de unidades: ex-inquilinos por apartamento
- [ ] Notificações de vencimento via Web Notifications API (browser nativo)
- [ ] Log de alterações (auditoria: quem alterou o quê e quando)

---

## 14. O que NÃO fazer

| Não fazer | Motivo |
|-----------|--------|
| Adicionar banco de dados (Firebase, Supabase) | Overkill para 8 unidades; cria dependência de serviço pago |
| Migrar para React/Vue | Reescrita total sem benefício proporcional ao porte |
| Múltiplos arquivos JS sem bundler | Piora portabilidade sem ganho real |
| Armazenar CPF ou dados bancários | Eleva obrigações de LGPD desnecessariamente |
| Depender só do localStorage | Pode ser limpo pelo browser sem aviso |

---

## 15. Considerações de LGPD

| Item | Status |
|------|--------|
| Dados no Drive pessoal do proprietário | ✅ Não em servidor de terceiros |
| CPF não armazenado | ✅ |
| Acesso protegido por senha | ✅ (com limitações técnicas) |
| Mecanismo de exclusão de dados | ⚠️ Não implementado |
| Backup `.json` aberto (nome, telefone, histórico financeiro) | ⚠️ Proteger acesso ao arquivo |

---

## 16. Pontos de Atenção Técnicos

- `crypto.subtle` só funciona em **HTTPS** — login não funciona em HTTP puro
- HTTPS do domínio customizado pode demorar até 1h após configurar CNAME no GitHub
- A tag `<style>` do CSS principal deve estar **depois** do `</script>` do login — erro anterior causou layout quebrado
- `condoHistories['c1']` está referenciado em múltiplos pontos — adicionar segundo condomínio exige atenção
- O texto `÷ 8` no card de resultado do condomínio está hardcoded — inconsistente se mudar o nº de unidades

---

## 17. Fluxo de Atualização do App

```
1. Claude edita index.html diretamente no repositório local
2. git add + git commit + git push (feito pelo Claude)
3. GitHub Pages publica automaticamente em ~2 minutos
4. Dados no Drive ficam intactos (separados do código)
```

---

*Documento mantido com assistência de Claude Code (Anthropic) — Sonnet 4.6*
