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

### Fase 4 — Inteligência Artificial via Claude API (plano futuro)
- [ ] **Script Python — Geração de contratos de aluguel** — lê dados do Drive, chama Claude API, gera `.docx` formatado com `python-docx`. Elimina a complexidade de gerar documentos no browser.
- [ ] **Script Python — Reajuste automático IPCA/IGP-M** — busca índice na API do Banco Central, Claude calcula novo aluguel de cada inquilino e atualiza o JSON do Drive.
- [ ] **Análise financeira DRE com IA** — botão "Analisar com IA" no módulo financeiro envia dados ao Claude e exibe insights e alertas personalizados.
- [ ] **WhatsApp em lote com IA** — Claude monta mensagens personalizadas para cada inquilino com base no histórico de pagamentos.

> **Pré-requisito:** Criar conta em console.anthropic.com, adicionar crédito (~$5 USD, pré-pago) e configurar `ANTHROPIC_API_KEY` no Linux (`~/.bashrc`). Custo estimado: centavos por mês para o volume do projeto. Modelo recomendado: `claude-haiku-4-5`.

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

## 18. Módulo de Geração de Contrato de Aluguel (Planejado)

> **Status:** Planejado — não iniciado  
> **Decisão de sessão:** 03/04/2026  
> **Referência:** módulo equivalente já implementado em `~/Documentos/lp-advocacia/gerar_documentos.js`

---

### 18.1 Visão Geral

Adicionar ao gestao-alugueis a capacidade de gerar contratos de aluguel em formato `.docx` diretamente no browser, sem necessidade de backend ou servidor. A geração ocorre client-side usando a biblioteca `docx` (mesma usada no lp-advocacia), carregada via CDN.

O contrato é gerado a partir dos dados já cadastrados no sistema (imóvel + locatário) complementados pelos novos campos obrigatórios descritos abaixo.

---

### 18.2 Arquitetura Técnica

| Item | Decisão |
|------|---------|
| Geração do .docx | `docx` library via CDN (build UMD para browser) |
| Onde roda | 100% client-side — sem backend, compatível com GitHub Pages |
| Saída | Download direto de arquivo `.docx` via `Blob` + `URL.createObjectURL` |
| Integração | Botão "📄 Gerar Contrato" no painel de detalhe do inquilino (`det-overlay`) |
| Persistência dos novos campos | Junto aos dados existentes no localStorage + Drive |

CDN a usar:
```html
<script src="https://unpkg.com/docx@9/build/index.umd.js"></script>
```

---

### 18.3 Novos Campos Necessários

#### 18.3.1 Formulário de Locatário (`add-tenant-overlay`)

Campos a adicionar ao modal de cadastro/edição de locatário:

| Campo | ID sugerido | Tipo | Obrigatório para contrato |
|-------|-------------|------|--------------------------|
| CPF | `f-cpf` | text (máscara) | Sim |
| RG | `f-rg` | text | Sim |
| Órgão expedidor do RG | `f-rg-orgao` | text | Sim |
| Nacionalidade | `f-nacionalidade` | text (default: "brasileiro(a)") | Sim |
| Estado civil | `f-estado-civil` | select | Sim |
| Profissão | `f-profissao` | text | Sim |
| Endereço do locatário | `f-endereco` | text | Sim |
| Bairro | `f-bairro` | text | Sim |
| Cidade/UF | `f-cidade-uf` | text | Sim |
| CEP | `f-cep` | text (máscara) | Sim |
| E-mail | `f-email` | email | Opcional |

> **Nota:** CPF já era explicitamente excluído por decisão de LGPD anterior. **Revisar essa decisão** antes de implementar, pois CPF é indispensável para o contrato. Alternativa: CPF só é exigido ao gerar o contrato, não fica visível nos cards.

#### 18.3.2 Dados dos Fiadores (quando `garantia === 'Fiadores'`)

Adicionar seção condicional no formulário do locatário para cadastrar até 2 fiadores:

| Campo | Descrição |
|-------|-----------|
| Nome completo | Qualificação |
| CPF | Qualificação |
| RG + órgão | Qualificação |
| Nacionalidade, estado civil, profissão | Qualificação |
| Endereço completo | Qualificação |
| Telefone | Contato |

#### 18.3.3 Formulário de Imóvel (`imovel-modal-overlay`)

Campos a adicionar ao modal de imóvel:

| Campo | ID sugerido | Tipo | Obrigatório para contrato |
|-------|-------------|------|--------------------------|
| CPF do proprietário | `im-prop-cpf` | text (máscara) | Sim |
| RG do proprietário | `im-prop-rg` | text | Sim |
| Órgão expedidor (proprietário) | `im-prop-rg-orgao` | text | Sim |
| Matrícula do imóvel | `im-matricula` | text | Sim |
| Cartório de Registro | `im-cartorio` | text | Sim |
| Área do imóvel (m²) | `im-area` | number | Sim |
| Descrição complementar | `im-descricao` | text | Opcional (ex: "2 quartos, 1 banheiro") |

---

### 18.4 Estrutura do Contrato de Aluguel

O documento `.docx` gerado deve seguir a mesma identidade visual do lp-advocacia:
- Fonte: **Cambria**, 12pt
- Cabeçalho: logo + linha dupla (reutilizar padrão do lp-advocacia)
- Rodapé: endereço + paginação
- Margens: 2,5 cm todos os lados

**Cláusulas previstas:**

| Cláusula | Conteúdo |
|----------|----------|
| I — Das Partes | Qualificação completa do locador (proprietário), locatário e fiadores (se houver) |
| II — Do Objeto | Identificação do imóvel: endereço, tipo, área, matrícula, cartório |
| III — Do Prazo | Data de início, término e renovação automática por prazo indeterminado |
| IV — Do Aluguel | Valor mensal, dia de vencimento, forma de pagamento (PIX/TED) |
| V — Do Reajuste | Periodicidade (anual), índice (IGPM ou IPCA), data do próximo reajuste |
| VI — Das Despesas | Responsabilidade por IPTU, condomínio, água, energia, limpeza |
| VII — Da Garantia | Tipo de garantia conforme cadastro: fiadores (com qualificação) / seguro fiança / pagamento antecipado |
| VIII — Das Obrigações do Locatário | Conservação, vedação de sublocação, comunicação de danos |
| IX — Das Obrigações do Locador | Entrega em condições de uso, manutenção estrutural |
| X — Da Multa e Rescisão | Multa de 3 aluguéis por rescisão antecipada, multa moratória 10% + juros 1%/mês |
| XI — Do Foro | Foro de eleição: Campo Grande/MS |
| XII — Da Assinatura | Local, data, assinaturas do locador, locatário e fiadores (se houver) |

---

### 18.5 Função Principal

```js
// Estrutura da função a implementar
async function gerarContratoAluguel(tenantId) {
  const t   = getTenant(tenantId);          // dados do locatário
  const im  = getImovel(t.imovelId);        // dados do imóvel
  // monta seções com a lib docx
  // cria Blob e dispara download
}
```

Botão de acionamento — adicionar dentro do `det-overlay`, na aba de dados do locatário:
```html
<button class="btn" onclick="gerarContratoAluguel(currentDetTenantId)">
  📄 Gerar Contrato
</button>
```

---

### 18.6 Pré-requisitos antes de Implementar

- [ ] Revisar decisão de LGPD sobre armazenamento de CPF (seção 15)
- [ ] Atualizar dados dos 8 inquilinos ativos com os novos campos (CPF, RG, etc.) — trabalho manual
- [ ] Atualizar dados do imóvel (Residencial Santa Nonna I) com matrícula e cartório
- [ ] Definir dados completos do proprietário (CPF, RG, endereço) para o contrato

---

### 18.7 Impacto no Arquivo e nos Dados

| Item | Estimativa |
|------|-----------|
| Linhas de código adicionadas | ~600–800 (função geradora + helpers) |
| Aumento no tamanho do arquivo | +~50 KB (código) + CDN docx (~500 KB, externo) |
| Novos campos no objeto `tenant` | +11 campos opcionais (retrocompatível) |
| Novos campos no objeto `imovel` | +7 campos opcionais (retrocompatível) |
| Novos campos no objeto `fiador` | Array de até 2 fiadores por locatário |
| Impacto no Drive/localStorage | Aumento leve no payload JSON (~2–5 KB) |

> Todos os novos campos são **opcionais no cadastro geral** — só se tornam obrigatórios no momento de gerar o contrato. O sistema não quebra para inquilinos que não tenham os dados preenchidos: ao clicar em "Gerar Contrato", exibe aviso dos campos em falta.

---

*Documento mantido com assistência de Claude Code (Anthropic) — Sonnet 4.6*
