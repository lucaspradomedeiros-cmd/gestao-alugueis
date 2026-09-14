# Plano de Melhorias — Gestão de Aluguéis

**Data:** 12/09/2026 (atualizado)
**Autor:** Claude Code (Sonnet 5), a pedido de Lucas
**Status:** Nenhum item deste plano foi implementado ainda — é só o plano.

> Este documento nasceu de uma revisão completa do código (auth, motor financeiro,
> storage/sync, WhatsApp, geração de documentos) cruzada com o histórico real de
> 128 commits do projeto. Onde a documentação antiga (`PROJETO_CONTEXTO.md`,
> `ROADMAP.md`, `Claude.md`, os `FASE_*.md`) diz uma coisa e o código faz outra,
> este plano confia no código.
>
> **Como usar:** trate este arquivo como a fonte única de "o que falta fazer"
> daqui pra frente. Ao concluir um item, marque `[x]` aqui — não crie um novo
> `FASE_N_RESULTADO.md` pra cada coisa (foi assim que a documentação virou uma
> bagunça de 3 numerações de fase diferentes reaproveitando os mesmos números).
> Os documentos antigos continuam valendo como *histórico* do que já foi feito,
> não como guia do que fazer agora.

---

## 0. Confiança e Confiabilidade — PRIORIDADE MÁXIMA, antes até de features

**Diagnóstico da causa real do abandono do projeto (registrado 12/09/2026):**
o projeto ficou 4 meses parado (04/05 → 12/09). O usuário confirmou o motivo:
a planilha continua parecendo mais confiável e fácil de usar, apesar de mais
manual — mas ele reconhece que precisa de algo melhor que a planilha.

O git log explica o gatilho exato: **o último dia de atividade antes da pausa
de 4 meses foi uma sessão inteira depurando um bug onde o dashboard não
renderizava os dados corretamente** (5 commits de debug em sequência,
terminando em "remove all debug logging, clean up code"). Uma planilha nunca
"não renderiza" — você sempre vê exatamente o que está lá. O app quebrou,
numa hora decisiva, a confiança básica de "os números na tela são os números
reais". Depois disso, ninguém confia seu único controle financeiro a uma
ferramenta que já mentiu uma vez — mesmo com o bug corrigido depois.

**Isso muda a prioridade de tudo:** não adianta adicionar feature nenhuma
(WhatsApp em lote, IA, PWA) numa ferramenta em que a confiança básica ainda
não foi reconquistada. Antes de qualquer coisa da seção 5 em diante:

- [ ] **Validar a confiabilidade de verdade**, não confiar no commit "debug:
      remove all debug logging" como prova de que o bug do dashboard está
      mesmo resolvido. Testar ativamente: os dados batem com a realidade toda
      vez que abre? O dashboard sempre mostra o número certo, sem precisar de
      F5 ou truque nenhum?
- [ ] **Rodar em paralelo com a planilha por um período definido** (sugestão:
      1-2 meses) antes de trocar de vez — registrar pagamentos/lançamentos
      nos dois, comparar se os totais batem. Só migrar de fato depois de ver
      funcionar direito, sessão após sessão, sem susto.
- [ ] **Reduzir a fricção que a planilha não tem.** Cada tela de login, cada
      "conectando ao Drive…", cada indicador de status de sync é atrito que a
      planilha nunca teve. Mapear onde o app pede mais cliques/espera do que
      simplesmente abrir um arquivo, e cortar o que der.
- [ ] Enquanto a confiança não estiver reconquistada, **não prometer a si
      mesmo mais uma "próxima fase"** que também vai ficar meses parada — se
      o teste em paralelo não convencer depois de um tempo razoável, é sinal
      honesto de que vale considerar simplificar o projeto (menos automação,
      mais parecido com o que a planilha já faz bem) em vez de insistir em
      mais camada de sofisticação.

### Incidente real (12/09/2026): Drive sobrescreveu dados locais mais novos

Aconteceu ao vivo, durante esta mesma sessão de trabalho: o cadastro de
salas/locatários feito no app foi perdido ao **conectar a conta do Google**
depois de já ter dados novos salvos localmente. Causa raiz: o app sempre
aplicava o que estava no Drive por cima do estado atual, sem comparar datas
— e ainda disparava esse carregamento por 3 caminhos concorrentes ao mesmo
tempo (`DRIVE_LOADER.onDriveConnected()`, `SYNC_ENGINE.onDriveConnected()`
e a chamada direta em `onDriveConnected()`), reforçando a sobrescrita.

**Corrigido no mesmo dia, commit `2104130`:** `applyData()` agora compara
`savedAt` local vs. Drive e, se o local for mais novo, não sobrescreve —
pergunta ao usuário (manter local e enviar ao Drive, ou descartar e usar o
Drive). As 3 chamadas concorrentes agora são coalescidas numa só requisição.

Dado perdido nesse incidente específico: cadastro de salas/locatários feito
na sessão anterior (não havia registro do JSON puro fora do app para
restaurar, apenas os dados documentados nesta seção abaixo). Usuário optou
por recadastrar manualmente depois, sem tentar recuperação forçada.

✅ **Segundo achado do mesmo incidente, corrigido em 13/09/2026 (commit
`a58f92e`):** investigando mais fundo, `sync-engine.js` (`SYNC_ENGINE`) não
era código morto — `onChange()` está espalhado em ~20 pontos do código
(index.html, tenant-modal.js, imovel.js, tenant-ui.js, payment-modal.js) e
seu `_sync()` debounced disparava um **segundo caminho de upload pro Drive**,
paralelo ao de `storage.js`/`saveToDrive()`, escrevendo no mesmo arquivo com
um snapshot (`DRIVE_LOADER.getData()`) e um `savedAt` desatualizado — o que
colidia diretamente com a proteção de conflito por data adicionada horas
antes. Corrigido com a menor mudança possível: o upload real dentro de
`_sync()` foi desativado (mantendo o rastreamento local de `onChange`/fila
intacto, sem tocar nos ~20 call sites). Confirmado que `updateSyncStatus()`
(o indicador de status que dependeria de `SYNC_ENGINE.getStatus()`) nunca é
chamado em lugar nenhum — dead code, não impactado pela mudança.

⚠️ **Pendência ainda aberta (limpeza de arquitetura, não urgente):** remover
`sync-engine.js` e os ~20 call sites de `onChange()` por completo. Hoje ele
só faz rastreamento local inofensivo (fila nunca foi realmente enviada de
verdade — `uploadQueue()` já era só simulado, `// Simular envio`). Ver
seção 3 (dead code).

### ✅ CONCLUÍDO em 13/09/2026 — Reconexão silenciosa do Drive (fricção real reportada pelo usuário)

Usuário reclamou: "muito chato ficar conectando ao Drive, sempre mostra
aviso de app não verificado" — exatamente o tipo de fricção que a seção 0
já mapeava ("cada 'conectando ao Drive…' é atrito que a planilha nunca
teve"). Achado real (commit 6237364): `gisLoaded()` já lia
`localStorage['ga_drive_token']` pra tentar reconectar sem popup, mas
**nada nunca escrevia esse token** — o recurso existia pela metade. Além
disso, `connectDrive()` forçava `prompt: 'consent'` sempre, obrigando a
tela cheia do Google mesmo com sessão válida.

Corrigido: o callback do OAuth agora salva o token com expiração; o botão
não força mais 'consent'. **Testado ao vivo e confirmado funcionando**:
numa aba nova, login só com senha do app + reload — reconectou ao Drive
sozinho, sem clicar em nada e sem popup do Google (`driveConnected: true`,
16 registros carregados certinho).

### ✅ CONCLUÍDO em 14/09/2026 — Busca/filtro em Locatários + distinção Vago x Encerrado

Reportado pelo usuário: depois de reocupar Apto 1/3/5 (Izabelly/Jorge/
Thainara), o Painel Geral continuava mostrando "APTO 1 — Vago — Sem
locatário ativo" mesmo já ocupado — o card "Vago" é renderizado por
REGISTRO de inquilino, não por unidade, e o registro antigo (Rafael, ainda
existe pra preservar histórico) continuava aparecendo como se a unidade
estivesse disponível.

Fix imediato (commit f7243bf): esconder o card fantasma quando a unidade já
tem outro inquilino ativo. Discussão com o usuário levou a algo melhor:
"Vago tem que ser realmente vago. Os outros seriam Baixados ou Encerrados"
(commit 9f351cd):

- Novo helper `categoriaTenant(t)`: `'ativo'` | `'vago'` (unidade realmente
  sem ninguém, ex: Apto 8/Thais) | `'encerrado'` (locação encerrada mas a
  unidade já foi reocupada, ex: Rafael/Ana Carla/Gabriely).
- Locatários ganhou busca (nome/unidade) + filtro de status (Ativos
  [padrão] / Vagos / Encerrados / Todos) — testado ao vivo, contagens
  batendo exato (12 ativos, 3 encerrados, 1 vago, de 16 total).
- Card "Encerrado": cinza, opacidade reduzida, nome real visível (antes
  ficava escondido atrás de "Imóvel disponível"), badge "Encerrado" + data,
  clicável pro histórico completo — testado, abre certo.
- Painel Geral não ganhou busca/filtro (não é o lugar) — só parou de
  mostrar "encerrado" (mantém "vago" de verdade, que é informação
  acionável: dá pra alugar).

### ✅ CONCLUÍDO em 14/09/2026 — Locatários: filtro por condomínio, exportar/imprimir, e bug grave de dívida invisível

Continuação da sessão de busca/filtro em Locatários:
- Filtro por condomínio/imóvel (dinâmico, pega condomínios novos sem
  mexer no código — pensando em gerenciar mais de um no futuro) +
  botão "🖨 Exportar/Imprimir" (mesma lista filtrada da tela, janela
  nova, imprime/salva PDF sob demanda).

**🔴 Achado grave (partiu de uma pergunta do usuário sobre o card do
Erivan):** `getTenantFinancials()` — que define o status (pill) e o
"TOTAL DEVIDO" de todo card de leitura (Painel Geral + Locatários) —
sempre olhava só o ÚLTIMO mês do histórico do inquilino. Se esse último
mês fosse "futuro" ou "pago", uma dívida real de um mês ANTERIOR
(parcial/inadimplente/pendente) ficava **completamente invisível**, sem
entrar no contador de Inadimplentes nem no valor "em aberto" do Painel
Geral.

Verificação em TODOS os inquilinos (pedido explícito do usuário) achou
3 casos reais, não só o que ele notou:
- Erivan: setembro/2026 parcial (R$700 faltando) escondido atrás de
  outubro/futuro.
- **Fernanda Duarte: abril/2026 nunca pago (R$827,76 base), escondido
  atrás de setembro/futuro — invisível havia 5 meses**, mesmo com
  maio-agosto pagos normalmente depois.
- **Lorenza: mesma situação, abril/2026 nunca pago (R$883,34 base).**

Corrigido: `getTenantFinancials()` agora usa o mesmo helper `getOpenEntry()`
(prioriza dívida real sobre mês futuro) já criado pro fix anterior do
card editável. `statusOf()` é só um wrapper dessa função, se beneficia
automático.

Confirmado ao vivo após o fix: Fernanda e Lorenza agora aparecem como
"inadimplente" (R$946,96 e R$1.010,54, já com multa/juros acumulados
nesses meses), Erivan como "parcial" (R$823,20). Painel Geral: contador
de Inadimplentes 0→2, "em aberto" R$0→R$2.780,70, badge de Alertas 0→3.

✅ **Resolvido pelo usuário (14/09/2026):** confirmado que abril já
tinha sido pago por fora do app, na data do vencimento — registrado
`applyPayment()` de R$827,76 (Fernanda) e R$883,34 (Lorenza), ambos em
05/05/2026 (data do vencimento, sem atraso, sem multa/juros). Ambas
voltaram a status "futuro" normal. Confirmado com reload após salvar.

### ✅ CONCLUÍDO em 14/09/2026 — Camargo zerada + auditoria Izabelly/Jorge/Thainara

Pedido do usuário ao verificar o card da Camargo (que mostrava "Pago"
incorretamente — na real ela nunca teve cobrança de setembro gerada, o
app só olhava o último registro real, de maio, já quitado):

- **Camargo**: histórico inteiro zerado a pedido do usuário — ficou só
  um registro, setembro/2026, R$1.000,00, vencimento 05/09, pendente.
  Status ao vivo: inadimplente (9 dias de atraso).
- **Auditoria pedida pelo usuário** (Izabelly/Jorge/Thainara) — script
  varreu TODO o app procurando entradas com status "futuro" mas venc já
  vencido e saldo não quitado. Achados, confirmados isolados a esses 3
  (mais ninguém no app tem esse padrão):
  - Izabelly e Jorge: cobrança de julho/2026 (R$1.043,55 cada) **indevida**
    — mesmo problema do achado anterior com junho (ainda não eram
    inquilinos no mês inteiro). Removida.
  - Thainara: junho (R$995,95) e julho (R$993,55) eram dívida REAL (ela
    começou 01/06, mês cheio) — usuário confirmou que já foram pagos por
    fora, na data do vencimento, valor cheio. Registrados via
    `applyPayment()`.

Confirmado com reload após salvar: Camargo inadimplente (correto),
Izabelly/Jorge só com agosto(pago)+setembro(futuro), Thainara com
junho/julho/agosto todos pagos + setembro futuro.

⚠️ **Nota técnica registrada:** o campo `status` de uma cobrança não se
recalcula sozinho com o tempo — só muda quando alguém tenta registrar um
pagamento nela. Por isso uma cobrança criada como "futuro" pode passar
do vencimento e continuar rotulada "futuro" indefinidamente, escondendo
dívida real, até alguém mexer nela. Hoje resolvido caso a caso (auditoria
manual); zero casos assim restantes no momento, mas pode voltar a
acontecer com cobranças novas — vale considerar no futuro uma rotina que
recalcule o status de tudo periodicamente, em vez de só sob demanda.

### 🔴 ACHADO GRAVE (14/09/2026) — Save no Drive podia falhar silenciosamente

O usuário desconfiou que a correção da Camargo/Izabelly/Jorge/Thainara não
tinha ido pro Drive de verdade — e tinha razão. Achado: `saveToDrive()`
nunca retornava nada (sempre `undefined`, inclusive quando dava certo) —
só atualizava o texto de status na tela por conta própria. A resolução de
conflito (do mesmo dia, mais cedo) fazia `await saveToDrive()` e
IMEDIATAMENTE mostrava "Conflito resolvido — dados locais enviados ao
Drive" sem checar se o upload realmente aconteceu. Resultado: pelo menos
uma correção real ficou só no localStorage de uma aba, nunca chegou no
Drive, e a mensagem de sucesso escondeu isso completamente.

**Corrigido (commit 315d3e6):** `saveToDrive()` agora retorna true/false
refletindo o resultado real do upload; a resolução de conflito usa esse
retorno pra decidir a mensagem (só afirma sucesso se realmente aconteceu).

**Reaplicado e verificado de forma inequívoca** (não só reload — olhando
direto `window.DRIVE_DATA`, populado só pelo download real da API, sem
passar pelo cache local): Camargo (setembro pendente), Izabelly/Jorge
(sem a cobrança indevida de julho), Thainara (junho/julho pagos) — todos
confirmados persistidos no arquivo do Drive de verdade.

⚠️ **Lição pro processo:** daqui pra frente, depois de qualquer edição
direto via console/script (não pela UI), sempre chamar `saveToLocalStorage()`
explicitamente ANTES de `saveToDrive()` (o simples `await saveToDrive()`
sozinho não garante que o savedAt local está atualizado, o que pode fazer
o Drive "vencer" um reconnect seguinte e reverter a edição em memória sem
avisar). E sempre verificar `window.DRIVE_DATA` depois de salvar — não só
o texto de status na tela, que já mentiu uma vez.

## 1. Segurança (fazer de qualquer forma — é grátis e rápido, mas não é o que decide se o projeto vinga)

- [x] **Remover o backdoor de senha em `js/auth.js`** — corrigido em
      12/09/2026, commit `a795c9e`. Removida a constante `PASSWORD = '2'` e o
      fallback que aceitava essa senha em texto puro quando `crypto.subtle`
      falhava; agora sem `crypto.subtle` o login falha com segurança (nega
      acesso) em vez de aceitar senha fixa.
- [ ] Trocar a senha de acesso por algo mais longo/complexo, já que ela é a
      única barreira protegendo o cache local (`localStorage`), que agora
      inclui CPF (ver decisão da seção 2).
- [ ] Considerar criptografar o payload do `localStorage` (ou ao menos os
      campos de CPF) já que a decisão abaixo aumentou a sensibilidade do que
      fica cacheado sem proteção extra no disco do computador.

## 2. Decisão de dados já tomada (registro)

- [x] **CPF liberado para armazenamento** — decisão do proprietário em
      12/09/2026: uso é estritamente pessoal, só Lucas tem acesso ao app
      finalizado, sem terceiros. Reverte a exclusão de CPF documentada
      anteriormente. Já aplicado em `PROJETO_CONTEXTO.md` (commit `ab7c32c`).
      Isso desbloqueia o módulo de contrato (que já usa CPF — ver seção 6).

## 3. Dados e Código (arquitetura)

- [ ] Corrigir `schema.json`: multa é **10%** (não 5%), status reais são
      `pago / futuro / pendente / inadimplente / parcial / vago` (não `atraso`)
      — hoje o schema não bate com o código real de `tenant-financials.js`.
- [ ] Terminar a separação dados/código do `index.html` (ainda 7.241 linhas).
      Hoje está pela metade: UI modularizada em `js/` (18 arquivos), mas dados
      ainda meio misturados no HTML. Nem monólito puro, nem separado de vez.
- [ ] Remover código morto em `getTenantFinancials()` (`js/tenant-financials.js`)
      — checagem `if(!late && last.status==='futuro')` é inalcançável, o mesmo
      caso já retorna antes na função.
- [ ] Confirmar se o "travamento" do recálculo de condomínio em meses futuros
      (só recalcula enquanto `h.condo===0`) é intencional. Se um lançamento
      passado for corrigido depois que meses futuros já consumiram o valor
      errado, hoje não há re-sincronização automática.
- [x] `clientes-adv` + `financeiro.js` (controle financeiro do escritório de
      advocacia) misturados no mesmo app/dados de `gestao-alugueis` — NÃO É
      SCOPE CREEP ACIDENTAL. Usuário confirmou (12/09): é intencional, ele
      administra as duas coisas (aluguéis + escritório) e quer controle
      financeiro unificado num lugar só. Mantido como está.
- [ ] Ainda vale, dentro dessa decisão: manter os dados de aluguel e os do
      escritório bem organizados internamente (namespaces/seções claras no
      JSON), mesmo compartilhando app/sessão/login — separação de
      responsabilidades no código não exige separar em apps diferentes.

## 4. Estética e Design

O sistema de cores já está bem feito (tokens semânticos, validado WCAG AA,
consistente claro/escuro) — não mexer na paleta.

- [ ] Testar em dispositivo real (iPhone, Android, iPad) — nunca foi validado
      fora do emulador de navegador, apesar de meses de trabalho em CSS mobile.
- [ ] Considerar trocar emoji usados como ícone de UI (💾☁⚠) por um pequeno
      set de SVG inline — emoji renderiza diferente por SO/fonte.
- [ ] Testar impressão de recibo em diálogo real de impressão mobile
      (iOS/Android) — só validado em desktop até agora.

## 5. Funcionalidades (SÓ depois da seção 0 estar resolvida)

**Já existe e funciona:** motor financeiro completo (multa/juros/carry-over),
múltiplos condomínios + imóveis autônomos, recibo (texto + impressão).

- [ ] Dashboard financeiro consolidado (receita total vs. inadimplência)
- [ ] Reajuste automático por índice (IGP-M/IPCA) — hoje é manual
- [ ] Histórico de ex-inquilinos por unidade (hoje só mostra o atual)
- [ ] Log de auditoria (quem alterou o quê, quando) — útil mesmo com um único
      usuário, ajuda a rastrear erro de digitação
- [ ] Mecanismo de exclusão de dados (apagar inquilino/cliente por completo)

## 6. WhatsApp (SÓ depois da seção 0 estar resolvida)

**Estado real:** `js/whatsapp.js` monta a mensagem de cobrança (com
detalhamento de multa/juros dia-a-dia) e abre link `wa.me` — manual, um
inquilino por vez, sem automação.

- [ ] Envio em lote (todos os inadimplentes de uma vez) — baixo custo, só
      iterar e abrir múltiplos links `wa.me`
- [ ] Template de lembrete pré-vencimento (não só cobrança de atraso) —
      reaproveita `buildWpp()` existente
- [ ] **Não fazer:** integração com WhatsApp Business API — custo mensal +
      aprovação da Meta, desproporcional para 8 unidades. O `wa.me` manual
      já resolve bem.

## 7. Geração de Documentos

**Achado importante:** já está muito mais pronto do que a documentação antiga
admite. `gerarContratoAluguel()` / `docxBuildContrato()` (`js/doc-gen.js`) já
geram contrato de locação completo (12 cláusulas, trata Fiadores/Seguro
Fiança/Pagamento Antecipado/Sem Garantia, valida campos faltantes antes de
gerar). O módulo de advocacia (procuração, honorários, hipossuficiência,
recibo) também está implementado e funcional.

- [ ] Atualizar `PROJETO_CONTEXTO.md` seção 18 — não está "planejado, não
      iniciado", já existe e funciona. Corrigido nesta sessão? Conferir.
- [ ] Salvar documentos gerados no Drive (hoje só faz download local) e
      vincular ao histórico do inquilino/cliente
- [ ] Assinatura eletrônica (QR code ou link pra Clicksign/D4Sign) — avaliar
      se o custo recorrente compensa para 8 unidades antes de implementar

## 8. Testes e Qualidade

- [ ] Levantar o que os testes Cypress existentes realmente cobrem — se não
      tocam no motor financeiro (multa/juros/carry-over), é ali que a
      prioridade deveria estar, não em fluxo de UI
- [ ] Teste automatizado da geração de contrato: gerar `.docx` de um inquilino
      de teste e validar que abre sem erro com os campos certos

## 9. Documentação e Processo

- [ ] Consolidar os 12+ `FASE_*.md` + `ROADMAP.md` + `Claude.md` +
      `PROJETO_CONTEXTO.md` — mover o que já foi implementado para uma pasta
      `docs/historico/`, manter só este `PLANO_MELHORIAS.md` como guia ativo
- [ ] Adotar uma numeração de fase única daqui pra frente (3 esquemas
      diferentes já reaproveitaram os mesmos números e causaram confusão real)
- [ ] Ritual de fim de sessão: antes de encerrar, atualizar este documento —
      evita descobrir meses depois que algo "planejado" já estava pronto

---

## Ordem recomendada de execução

1. **Confiança e confiabilidade** (seção 0) — é isso que decide se o projeto
   vinga ou continua como está agora, esquecido em favor da planilha
2. **Segurança** (seção 1) — em paralelo, rápido, resolve o maior risco
3. **Corrigir documentação técnica** (`schema.json` + seção 18 do
   `PROJETO_CONTEXTO.md`) — rápido, evita decisão errada em sessão futura
4. **Consolidar docs** (seção 9) — uma tarde, paga dividendo em toda sessão
   futura
5. Só depois de validar a seção 0 de verdade: terminar separação dados/código
   (seção 3), dashboard financeiro, WhatsApp em lote, reajuste automático —
   na ordem que fizer mais sentido pro uso real


---

## 10. Dados Reais Levantados (12/09/2026) — pronto pra virar cadastro

Levantamento completo feito nesta sessão: cruzando a planilha
"Controle de Pagamentos e Condominio 2025.xlsx" (fonte confiável do usuário),
contratos no Paperless e no filesystem do T110, e confirmação direta do
usuário onde a documentação não bastou. **Escopo desta fase: só controle de
aluguéis.** Despesas/receitas do escritório ficam para uma fase seguinte.

### Santa Nonna I — 7 apartamentos (condomínio, rateio entre 8 unidades + taxa adm. 10%)
⚠️ Apto 8 (Thais) sai dia 15/09/2026 — NÃO cadastrar agora, fica vago até novo inquilino.

| Apto | Inquilino | Aluguel | Garantia | Telefone |
|---|---|---|---|---|
| 1 | Izabelly Tertuliano Santana | R$ 900,00 | Fiador | 9801-1411 |
| 2 | Evelin Marcelly Caoni Soligo | R$ 652,48 | Fiadores | 67 9841-3611 |
| 3 | Jorge Willian Francisco de Souza | R$ 900,00 | Fiador | 99651-6303 |
| 4 | Adriano Ramoa Andrade | R$ 850,00 | Fiadores | 99868-0602 |
| 5 | Thainara | R$ 850,00 | Adiantado | 99123-7272 |
| 6 | Fernanda Duarte | R$ 704,36 | Seguro | 67 9310-1119 |
| 7 | Lorenza (Malharia Sol de Verão) | R$ 763,06 | Fiadores | 67 9961-9424 |

Taxa de administração do condomínio: 10% sobre despesas rateadas (energia,
água, taxa de lixo, IPTU, limpeza) — variável mês a mês (~R$70-100/mês,
R$77,13 em julho/2026, média histórica ~R$72,71).

⚠️ Contratos de Evelin, Fernanda e Lorenza aparecem com vigência já vencida
na planilha (2024/2023/jun-2026). **Confirmado pelo usuário: prazo
indeterminado (prorrogação automática)** — valor do aluguel continua sendo
atualizado conforme data de aniversário/reajuste do contrato, não precisa
tratar como pendência de renovação.

### Santa Nonna II — 2 kitinets (SEM condomínio, imóveis autônomos)
Endereço: Rua Cider Cerzózimo de Souza, nº 1360, Jardim Tropical, Dourados/MS,
CEP 79820-030.

| Unidade | Situação | Detalhes |
|---|---|---|
| Kitnet 01 | Ocupada pela mãe do usuário, **sem cobrança de aluguel** | Usuário paga integralmente IPTU, taxa de lixo, esgoto, água e energia. Fica fora do controle de ALUGUÉIS desta fase (é despesa, não receita) — registrar quando entrar a fase de despesas/imóveis. |
| Kitnet 02 (= "Casa 02" no contrato) | **Alugada — Francisco Erivan Mota** | R$ 1.200,00/mês, vigência 01/07/2026-01/07/2029 (36 meses), vencimento dia 10 ("paga e mora"), garantia Fiador, reajuste anual IPCA. Multa/juros desse contrato usam **2% a.m.** (diferente do padrão 1% dos outros, confirmado intencional pelo usuário). Telefone: +55 67 9625-6769 |

Vagas de garagem do Santa Nonna II: existem, nenhuma alugada atualmente —
fora de escopo, possível receita futura.

### 4 Salas comerciais (escritório, SEM rateio na prática apesar do contrato)
Todos os contratos escritos preveem energia+limpeza rateados entre salas
(IPTU/água/internet inclusos no aluguel) — **usuário confirmou que isso não é
cobrado na prática hoje**, valor é fixo e simples. Modelar como imóvel
autônomo puro, sem componente de despesas.

| Sala | Inquilino | Valor | Telefone | Contrato encontrado? |
|---|---|---|---|---|
| 02 | Rodrigo | R$ 1.000,00/mês | +55 67 9833-5920 | ❌ Não encontrado em nenhum sistema (Paperless/T110/Lucas-linux) — sem contrato escrito localizado |
| 03 | Camargo (Allison Tailan de Camargo, via CMG Soluções LTDA) | R$ 1.000,00/mês | +55 67 9319-7590 | ✅ Sim (valor do contrato original R$750 desatualizado — usar o valor real informado pelo usuário) |
| 04 | Cristiano José Dundi | R$ 750,00/mês | +55 67 8143-0498 | ✅ Sim (valor do contrato original R$650 desatualizado — usar o valor real) |
| 05 | Vagno Nunes de Oliveira (+55 67 9150-4435) + João Pedro Caseiro Oliveira (+55 67 9952-8595) | R$ 750,00/mês (total, conjunto) | ambos acima | ✅ Sim — **cadastrar como ÚNICO registro** (confirmado pelo usuário), não dois separados |

✅ Telefones de todas as unidades confirmados pelo usuário (12/09/2026) — nenhuma pendência de contato restante.

### Total de aluguéis (base, sem repasses de condomínio/IPTU)
Santa Nonna I (7 aptos) R$ 5.619,90 + Santa Nonna II R$ 1.200,00 + Salas
R$ 3.500,00 = **R$ 10.319,90/mês**. Com a taxa de administração do
condomínio (10% variável) somada: **~R$ 10.397,03/mês** (base julho/2026).

### Pendências antes do cadastro efetivo
- [x] Telefones de: Erivan, Rodrigo, Camargo, Cristiano, Vagno, João — CONFIRMADOS 12/09/2026 (ver tabelas acima)
- [x] Juros de 2% a.m. no contrato do Erivan (vs 1% padrão dos demais) — CONFIRMADO pelo usuário (12/09): é intencional, usar 2% conforme contrato só para essa unidade (Kitnet 02/Santa Nonna II).
- [ ] Decidir se os contratos das Salas devem ser atualizados pra bater com a prática real (sem rateio) ou deixar como está
- [ ] Contrato da Sala 02 (Rodrigo) não existe por escrito em lugar nenhum — considerar formalizar
- [ ] Total de unidades a cadastrar nesta fase: **12** (7 Santa Nonna I + 1 Santa Nonna II/Kitnet 02 + 4 Salas — Kitnet 01 fica fora por não ter receita)


---

## 11. Progresso Real de Cadastro (12/09/2026) — feito direto no app em produção

Diferente do que o `dados.json` do git sugeria, o Drive já tinha dados mais
atuais que o snapshot commitado. Ao abrir o app de verdade
(gestao.vpadvogados.com.br) pra cadastrar os dados da seção 10, descobri:

**Já estava correto no Drive (não mexido):** Sala 02 (Rodrigo, R$1.000),
Sala 03 (Camargo, R$1.000), Sala 04 (Dundi, R$750), Apto 2/4/6/7/8
(Evelin/Adriano/Fernanda/Lorenza/Thais).

**Cadastrado hoje, pela interface real do app (não editando arquivo por
trás):**
- [x] Unidade "Sala 05" criada (grupo Escritório Salas: 4→5 unidades)
- [x] Locatário Sala 05: Vagno Nunes de Oliveira e João Pedro Caseiro
      Oliveira, R$750, sem garantia, vencimento dia 20
- [x] Grupo "Residencial Santa Nonna II" (SN2) criado do zero, endereço
      Rua Cider Cerzózimo de Souza 1360, Jardim Tropical, Dourados/MS,
      unidade "Casa 02", sem rateio de despesas (autônomo)
- [x] Locatário Casa 02: Francisco Erivan Mota, R$1.200, fiadores,
      vencimento dia 10, início 01/07/2026, término 01/07/2029

**App confirmado com 13 locatários no total após o cadastro.**

### ✅ CONCLUÍDO em 13/09/2026 — Apto 1/3/5 trocados, app 100% reconciliado com a planilha

A feature "Encerrar Locação" (seção acima, commit c0c6333) foi construída,
testada ao vivo (Thais/Apto 8) e usada aqui pra resolver isso de vez.
Executado direto no app em produção (via console JS autenticado, mesma
lógica de `saveTenant()`/`encerrarLocacao()` do código-fonte — não editando
o JSON do Drive por fora):

- [x] Rafael (Apto 1), Ana Carla (Apto 3), Gabriely (Apto 5) → `vago=true`,
      histórico 100% preservado (dívida do Rafael continua intacta).
- [x] Izabelly Tertuliano Santana cadastrada (Apto 1, R$900, Fiador, início
      25/07/2026).
- [x] Jorge Willian Francisco de Souza cadastrado (Apto 3, R$900, Fiador,
      início 09/07/2026).
- [x] Thainara cadastrada (Apto 5, R$850, Adiantado, início 01/06/2026).
- [x] Sala 05 (Vagno+João, R$750, registro único) e Casa 02/Santa Nonna II
      (Francisco Erivan Mota, R$1.200, fiador, juros 2% a.m.) recadastrados
      — eram os 2 perdidos no incidente de sync do Drive (12/09).
- [x] Reajuste de junho/2026 aplicado: Fernanda R$666,88→R$704,36, Lorenza
      R$722,46→R$763,06 (conferido na planilha, estava desatualizado no app).
- [x] Achado e esclarecido: aba "Sala 02 - Ligia" na planilha é uma
      inquilina ANTERIOR (contrato terminou 18/06/2025, ficou bem
      inadimplente) — Rodrigo é o atual, confirmado pelo usuário. Planilha
      só não foi atualizada, mesmo padrão do caso Darlei→Erivan.
- [x] **NOVA FEATURE necessária pro Erivan:** taxa de juros por inquilino
      (`jurosRatePctMes`, commit 8b9ed30) — antes o app só tinha 1% global
      pra todo mundo; Erivan agora calcula 2% corretamente, resto do app
      continua em 1% sem mudança de comportamento.

**App confirmado com 16 registros totais, 12 ativos, batendo exatamente com
a receita mensal alvo do levantamento (R$10.319,90) e a lista de 12 unidades
da seção 10.** Verificado com reload completo (dado persistiu no Drive de
verdade, não só na tela).

### ✅ CONCLUÍDO em 13/09/2026 — Condomínio relançado e pagamentos de setembro registrados

**Achado antes de registrar qualquer pagamento:** o rateio do condomínio do
Santa Nonna I não era lançado desde abril/2026 (5 meses faltando), o que
travava o histórico de TODOS os inquilinos do condomínio em maio — inclusive
impedia qualquer cobrança de aparecer pra Izabelly/Jorge/Thainara (recém
cadastrados). Relançado maio, junho e julho/2026 (dados reais da aba
"Condomínio Geral" da planilha, água+energia+limpeza+IPTU), o que gerou
automaticamente as cobranças de junho/julho/agosto pra todo mundo do
condomínio.

**✅ RESOLVIDO em 13/09/2026 (conclusão invertida da análise inicial):**
achada divergência sistemática de ~R$5,22-5,23/mês entre o rateio do app
(`condoCalc()`) e a planilha — a planilha soma o IPTU dentro do total
rateado antes de dividir por 8 e taxar 10%; o app cobra o IPTU à parte,
valor cheio, individual por unidade, sem incluir no rateio nem taxar.

Numa primeira análise (12-13/09), corrigi manualmente maio-agosto/2026 (28
lançamentos, 7 inquilinos × 4 meses) pra bater com a planilha, assumindo
que ela estava certa. **Decisão final do usuário, revertendo essa
suposição:** IPTU é imposto individual repassado (cada unidade já tem sua
própria parcela, não é despesa compartilhada como água/limpeza), então não
faz sentido ratear ele entre os 8 condôminos nem cobrar taxa de
administração em cima — **o app estava certo, a planilha tem o erro**
(soma + taxa indevida sobre IPTU).

**Decisões tomadas:**
- Maio-agosto: valores corrigidos (mais altos) **mantidos como estão** —
  já foram efetivamente cobrados e recebidos dos inquilinos nesses valores,
  reverter agora não traria o dinheiro de volta, só geraria confusão.
- Setembro/2026 em diante: **NÃO corrigido** — o valor original do app
  (R$122,34, sem IPTU no rateio) é o correto, fica como está.
- Recomendado ao usuário corrigir a própria fórmula da planilha (parar de
  somar+taxar IPTU no rateio) para consistência dali pra frente.
- Nenhuma mudança de código necessária — `condoCalc()`/`saveCondoMonth()`
  já calculam do jeito certo.

**Pagamentos de setembro/2026 registrados** (dados passados pelo usuário em
chat, aplicados via `applyPayment()` real — não edição direta de JSON):
Izabelly R$1.044,06 (04/09), Evelin R$796,54 (02/09), Jorge R$1.044,06
(04/09), Adriano R$994,06 (04/09), Thainara R$994,06 (01/09), Fernanda
R$848,42 (05/09), Lorenza R$907,12 (04/09), Rodrigo R$1.000,00 (01/09),
Cristiano R$750,00 (04/09), Vagno/Sala05 R$750,00 (02/09), Erivan **parcial**
R$500,00 de R$1.200,00 (05/09, antes do vencimento dia 10 — sem multa/juros).
Camargo: sem pagamento (Pendente, confirmado pelo usuário, nada alterado).

**Thais** (já vago): por decisão do usuário, tratada como **sempre R$600,00
cheio, paga em dia (dia 05)** em todos os meses em aberto — maio, junho,
julho e agosto/2026 — ignorando os valores maiores que a planilha mostrava
pra junho em diante (reajuste que na prática não chegou a valer pra ela).
Campo `rent` mantido em R$600,00.

Todos os lançamentos confirmados com reload completo após salvar (persistiu
no Drive de verdade).

**✅ Achado e corrigido na sequência (mesma sessão):** maio, junho e julho de
Evelin/Adriano/Fernanda/Lorenza NÃO estavam marcados como pagos no app,
apesar de a planilha confirmar que sim (só agosto tinha sido registrado até
esse ponto). Corrigido cruzando cada linha da planilha por VALOR e
VENCIMENTO (não pelo texto da coluna "Período", que tem pelo menos um erro
confirmado — a aba do Adriano tem o rótulo do período trocado, mas o
vencimento e o valor batem certinho com o padrão dos demais). Os 12
lançamentos (4 inquilinos × 3 meses) aplicados via `applyPayment()` real,
com overrides de condomínio/IPTU quando necessário pra bater exato com o
valor histórico realmente cobrado.

**✅ CONCLUÍDO em 13/09/2026:** agosto lançado (água R$480,04, energia
R$79,71 — valores repassados pelo usuário direto das contas SANESUL/
ENERGISA, não da planilha). Achado no processo: a conta da SANESUL rotulada
"08/2026" (R$309,35) na verdade é o consumo de **julho** cobrado em agosto
— bate exato com o valor que já tinha sido usado pra julho — enquanto a
ENERGISA rotula pelo mês de consumo real (sem esse atraso). Confirmado com
o usuário antes de lançar, para não duplicar/errar o mês. Setembro gerado
com sucesso pros 7 inquilinos do condomínio (status "futuro", ainda não
vencido), persistido e confirmado com reload.

⚠️ Nota: o valor de condomínio de setembro (R$122,34) foi calculado pela
fórmula atual do app (`condoCalc()`), que ainda tem a diferença de
modelagem do IPTU já documentada acima (não corrigida no código). Não há
planilha de setembro pra comparar ainda — se a diferença se confirmar
quando os pagamentos de fato acontecerem, vai precisar do mesmo tipo de
ajuste manual feito em maio-agosto.

### Achado técnico do teste ao vivo (relevante pra seção 0)
Ao salvar formulários (Novo Condomínio, Novo Locatário, Editar Condomínio),
o app dispara `alert()`/`confirm()` **nativos do navegador** em pelo menos
alguns fluxos de salvamento. Isso não afeta um usuário humano normal (é só
um popup pra clicar OK), mas trava qualquer automação/script. Não é o mesmo
tipo de falha que causou o abandono de 4 meses (aquele quebrava o que a TELA
MOSTRAVA pra um humano de verdade) — mas ainda assim, **alerta nativo é UX
datada**; trocar por notificação in-page é melhoria de qualidade, não
urgente.

- [ ] Trocar `alert()`/`confirm()` nativos por notificação in-page nos fluxos
      de salvamento (achado de baixa prioridade, cosmético/UX, não bloqueia
      uso real).

### Validação real de confiabilidade (seção 0) — resultado desta sessão
Login funcionou normal (só um delay inicial de alguns segundos, sem erro).
Painel Geral renderizou os dados corretos na primeira tentativa (11→13
locatários, valores batendo). **Não se repetiu o bug do dashboard não
renderizar** que causou o abandono original — é um sinal positivo, mas uma
sessão de teste não é suficiente pra declarar confiabilidade restabelecida;
o item da seção 0 (uso em paralelo com a planilha por 1-2 meses) continua
sendo o critério real antes de confiar 100%.

## 12. App Mobile (SÓ quando o app estiver mais maduro — usuário pediu pra
       guardar a ideia e lembrar depois, 14/09/2026)
Usuário perguntou se o projeto poderia virar um app de celular no futuro.
Resposta registrada aqui pra retomar quando fizer sentido (não antes da
seção 0 estar resolvida — mesma regra do item 6/WhatsApp):

- [ ] **PWA (recomendado como primeiro passo)** — adicionar `manifest.json`
      + service worker simples. Ganha: ícone na tela inicial, abre em tela
      cheia (sem barra de endereço), funciona offline pro app em si (dados
      continuam vindo do Drive). Sem custo, sem loja de app, reaproveita
      100% do código atual. Esforço baixo (~horas, não dias).
- [ ] **App nativo via Capacitor** (passo 2, opcional) — empacota o mesmo
      código web num app instalável de verdade (.apk), publicável na Play
      Store se quiser. Reaproveita quase tudo do código. Resolveria de vez
      a limitação atual de não conseguir anexar o PDF do extrato direto no
      WhatsApp (via a folha de compartilhar nativa do celular, em vez de só
      texto). Custo: Play Store US$25 único (Apple US$99/ano, dispensável
      se for só uso pessoal Android).
- [ ] **Não fazer:** reescrita nativa (React Native/Flutter) — esforço alto
      sem ganho real pra um app de usuário único.

**Recomendação registrada:** PWA primeiro (barato, rápido, resolve a maior
parte do "parecer um app"); Capacitor só se algum dia a limitação do
WhatsApp/PDF incomodar de verdade ou quiser instalar via ícone de loja.


## 14/09/2026 — Aba antiga sobrescrevendo o Drive + overflow no celular

### Achado grave: aba antiga esquecida sobrescrevia o Drive silenciosamente
Depois de corrigir e verificar (via `window.DRIVE_DATA`) o bug do
`saveToDrive()` que não retornava sucesso/falha (ver seção anterior), o
usuário reportou: "encontrei um problema maior, loguei no asus, no
navegador e puxou coisa diferente do drive." Investigando, e confirmado
pelo próprio usuário ("Pode ser isso, uma aba velha salvando, pois não
puxou a alteração do erivan"): o **autosave periódico** (`onDriveConnected()`
em `js/storage.js`, `setInterval(...saveToDrive..., 2*60*1000)`) e o save no
`beforeunload` chamavam `saveToDrive()` **sem checar nada antes** — uma aba
antiga esquecida aberta (outro navegador/dispositivo/celular) sobrescrevia o
Drive com sua cópia desatualizada a cada 2 minutos, apagando silenciosamente
qualquer edição feita em outro lugar nesse meio tempo. Foi assim que a
correção do pagamento parcial do Erivan sumiu depois de já salva e
verificada.

**Corrigido (commit `bf20032`):**
- `DRIVE_LOADER` passa a rastrear `lastKnownDriveSavedAt` (do último load ou
  save bem-sucedido) e ganhou `checkRemoteSavedAt()` pra conferir o savedAt
  atual do Drive sem aplicar os dados.
- `saveToDrive()` agora confere isso antes de sobrescrever: se o Drive mudou
  sem esta aba saber e **não há edição pendente nela** (`_dirtyLocalEdit`),
  recarrega do Drive silenciosamente em vez de sobrescrever (autocura,
  ninguém perde nada); se há edição pendente de verdade, trata como conflito
  genuíno (mesma UI de sempre, `confirm()`).
- Lógica de resolução de conflito extraída para `resolveDriveConflict()`,
  reaproveitada por `loadFromDrive()` e pelo novo caminho de conflito em
  `saveToDrive()`.
- Verificado após o fix: aba real reconectada ao Drive confirmou Erivan
  ainda "parcial" (R$500 pago) e Camargo ainda "inadimplente" (R$1.000
  pendente) — os dados corretos se mantiveram.

### Overflow horizontal no celular — 3 causas raiz diferentes
Usuário relatou rolagem lateral indevida no menu principal do celular.
Investigado com um iframe de teste simulando larguras de celular (320-390px)
direto na produção. Achadas e corrigidas 3 causas diferentes, em 3 commits:

1. **`bf20032`/`c1fff1d`** — campos de data lado a lado nos modais (`.mrow`,
   grid de 2 colunas) não encolhiam o suficiente em telas estreitas
   (input nativo `type="month"`/`type="date"` tem largura mínima),
   estourando a largura do modal pra fora da tela. Empilhado em 1 coluna no
   celular (`.mrow{grid-template-columns:1fr !important}`), mais uma trava
   geral `html,body{overflow-x:hidden}` como rede de segurança.

2. **`c1fff1d`** — barra de navegação inferior (`.bottom-tab`, fixa) fica
   mais alta em celulares com barra de gestos/notch
   (`env(safe-area-inset-bottom)`), mas o espaço reservado embaixo do
   conteúdo (`.main{padding-bottom:72px}`) era um valor fixo que não
   considerava isso — cobria o final de listas longas (ex: seção "Situação
   atual" no Painel Geral), tornando-as inacessíveis mesmo rolando até o
   fim. Reportado pelo usuário como "situação atual para baixo fica fora da
   tela". Corrigido somando a área segura real:
   `padding-bottom: calc(64px + env(safe-area-inset-bottom) + 12px)`.

3. **`799bd18`/`710623c`** — a causa mais séria, achada com o usuário
   mostrando exatamente onde: o card do inquilino no Painel Geral
   ("Situação atual") cortava a coluna de valores (ex: "Condomínio
   (Agosto/2026)" aparecia sem o valor visível, cortado na borda). Raiz:
   `.tenant-card` é item de grid dentro de `.tenants-grid`, e por padrão um
   item de grid **não encolhe abaixo do seu conteúdo mínimo**
   (`min-width:auto`) — algum texto interno não quebrava linha, e isso
   empurrava o CARD INTEIRO pra fora da largura da tela (não só a grade
   interna Aluguel/Condomínio/IPTU, que também foi empilhada em 1 coluna
   via `.cobr-2col` no commit anterior, mas sozinho não bastou). Corrigido
   com `min-width:0` em `.tenants-grid`, `.tenant-card` e nas linhas de
   `.cobr-2col`. Validado com um iframe de teste em 375px direto na
   produção antes e depois de cada tentativa — só a combinação dos dois
   fixes (empilhar + min-width:0) resolveu de fato; confirmado por
   screenshot com o card completo e legível.

**Lição pro processo:** overflow em CSS Grid/Flexbox quase sempre precisa de
`min-width:0` explícito no item que deveria encolher — o padrão do browser
(`min-width:auto`) prioriza mostrar o conteúdo inteiro sem quebrar linha,
mesmo que isso estoure o container. Testar com um iframe apontando pra
produção (em vez de tentar redimensionar a janela do Chrome, que não
funcionou neste ambiente) foi o jeito mais rápido de reproduzir e validar
sem precisar do celular físico a cada tentativa.


## 14/09/2026 (continuação) — Extrato do inquilino no celular

Usuário: "quando abro o extrato completo do inquilino ele fica complicado
de enquadrar no tamanho dada a quantidade de informações... dá pra melhorar
um pouquinho?" Dois ajustes, ambos testados ao vivo (injeção de CSS num
iframe apontando pra produção) antes de publicar:

1. **`f457b24`** — botões de ação do cabeçalho (Enviar cobrança, Registrar
   pgto, Emitir recibo, Contrato, Encerrar Locação) ficavam espremidos numa
   linha só: o container `#d-badges` era `display:flex` sem `flex-wrap`
   (o container irmão `#id-badges`, de imóveis, já tinha isso — só faltou
   aqui). Adicionado `flex-wrap:wrap`.

2. **`bf6bfa3`** — tabela do extrato (Referência, Aluguel, Encargos,
   Multa/Juros, Total, Pagamento, Status — 7 colunas) ilegível no celular
   mesmo com fonte reduzida. Convertida pro padrão clássico de "tabela
   responsiva": no mobile, cada linha (mês) vira um cartão empilhado com o
   rótulo ao lado do valor (via `data-label` + `::before`), em vez de
   colunas espremidas. Desktop inalterado (só vale `<=760px`).


## 14/09/2026 — v2.1.0 marcada como versão estável

A pedido do usuário, `v2.1.0` (commit `29d2216`) foi marcada como o
checkpoint estável atual, pra reversão/downgrade rápido em caso de problema
futuro. Tag git anotada criada e publicada:

```
git tag -a v2.1.0 29d2216
git push origin v2.1.0
```

**Para reverter pra esta versão**, se algo quebrar depois:
```
git checkout v2.1.0 -- .    # traz os arquivos desta versão pro working dir
# ou, pra descartar tudo que veio depois dela:
git reset --hard v2.1.0
git push --force origin main   # ⚠ reescreve o histórico remoto, usar com cuidado
```


## 14/09/2026 (continuação 2) — Despesas/Condomínio no celular + robustez + extrato em PDF/WhatsApp

- **`9a4d2e1`** — mesmo bug de `flex-wrap` ausente (visto em `#d-badges`) achado
  também nas abas de "Despesas do Escritório" (Despesas/Receitas/A Receber/
  Resultado/Comparativo) — corrigido.
- **`4ef6d0d`** — mesma causa raiz do card de inquilino (`min-width:auto`
  padrão do CSS Grid) achada no menu Condomínio: `.condo-layout` empurrava o
  card "Despesas do mês de referência" pra fora da tela no celular (botão
  "Salvar lançamento" e valores cortados). Corrigido com `min-width:0`.
- **`0b346a0`** — a pedido do usuário ("gostei muito do extrato... vamos
  fazer o mesmo no condomínio"), histórico de condomínio (`#condo-hist-body`)
  também convertido pro formato de cartão empilhado no celular, mesmo padrão
  do extrato do inquilino — escopado só a esse elemento pra não afetar outras
  tabelas que reaproveitam a classe `.rrow` (relatório de receitas, lista de
  garantias).
- **`be052a7`** — achado ao testar o card do condomínio: "Por apto" podia
  mostrar `R$ ∞` (divisão por zero). Causa: `CONDO_UNITS` só era populado
  dentro de um bloco condicionado à existência de `condoHistories` no
  payload carregado — um cache/payload sem esse campo deixava a lista de
  unidades vazia. Reproduzido no navegador de teste (cache incompleto), não
  confirmado no uso real (Drive sempre carrega o payload completo), mas é
  uma fragilidade real corrigida: `CONDO_UNITS` agora é populado sempre que
  há `condominios` carregados, independente de `condoHistories` existir.
- **`b827e08`** — a pedido do usuário, dois botões novos no extrato do
  inquilino (barra "Extrato — [período]"): **"🖨 Imprimir / PDF"** (janela
  nova com o extrato formatado + botão manual de impressão, mesmo padrão de
  `printTenantsList()`; "Salvar como PDF" funciona nativamente no diálogo de
  impressão do navegador) e **"📲 Enviar resumo"** (modal com prévia
  editável, mesmo padrão de "Enviar cobrança"; monta um resumo de WhatsApp
  com totais e, se o período tiver ≤6 meses, a lista mês a mês — períodos
  maiores mostram só o resumo, pra não virar uma mensagem gigante). Nota
  técnica registrada: não é possível anexar um PDF automaticamente num link
  `wa.me`, só texto — por isso o "enviar" é sempre um resumo em texto, não o
  PDF em si. Ambos respeitam o período já selecionado nas abas do extrato.
  Testado ao vivo com clique real (via `computer` tool, não `javascript_tool`
  — `window.open()` chamado via script não conta como gesto do usuário e é
  bloqueado pelo navegador) — confirmado funcionando com a Evelin (histórico
  de 53 meses): período curto lista mês a mês, "Todo o período" mostra só o
  resumo de totais.


## 14/09/2026 (continuação 3) — Vencimento do aluguel usava config errada (condomínio em vez do contrato)

Usuário reportou: "achei uma inconsistência... o aluguel do Vagno e João,
Cristiano, Rodrigo e Camargo tem pagamento adiantado, e o vencimento de
05/09 era pra pagar setembro." Investigado a fundo, achado real e corrigido.

**Causa raiz:** o vencimento do ALUGUEL (`h.venc`) usava `getCondoVencYM()`
— função pensada pra cobrança de CONDOMÍNIO (faz sentido a despesa de água/
luz de um mês só ser sabida e cobrada no mês seguinte), aplicada por engano
também ao vencimento do aluguel, que é regra do CONTRATO de cada inquilino
(não tem nada a ver com o condomínio). Como o padrão da função é "mês
seguinte", isso empurrava o vencimento do aluguel pra frente pra qualquer
inquilino vinculado a um condomínio com essa config — o que incluía
praticamente todo mundo.

**Regra confirmada com o usuário (mista, por inquilino, não por condomínio):**
- Mesmo mês: Izabelly, Thainara, Jorge, Erivan, Adriano, Rodrigo, Camargo,
  Cristiano, Vagno/João
- Mês seguinte: Evelin, Fernanda Duarte, Lorenza

**Corrigido (commit `643fd97`):** nova função `getRentVencYM(t, ref)`, por
inquilino (`t.vencMesSeguinte`), padrão "mesmo mês" quando não especificado
— substituída em todos os 5 pontos que calculavam vencimento de aluguel
(`hydrateEntries()`, `buildMonthEntry()`, `openWpp()` e sua cópia morta em
`js/whatsapp.js`, gerador de cobrança em lote do condomínio).
`getCondoVencYM()` não foi tocada — continua só pra cobrança de condomínio
em si, que o usuário confirmou valer igual pra todos.

**Dados corrigidos** (via script no navegador, `saveToLocalStorage()` antes
de `saveToDrive()`, verificado com download direto do Drive depois — lição
de 14/09 aplicada à risca): `vencMesSeguinte:true` em Evelin/Fernanda/
Lorenza (histórico deles desde 2022 já estava certo, só faltava a flag pra
continuar certo dali pra frente); vencimento corrigido pra mesmo mês em
Rodrigo, Cristiano, Vagno/João, Izabelly, Jorge, Thainara e Adriano
(incluindo Maio-Agosto/2026 do Adriano, que também estavam com o mês
deslocado). Formato de `ref` com espaço extra ("2026 - 05") normalizado
pra "2026-05" no Rodrigo/Cristiano — achado incidental, provavelmente de um
código de geração antigo.

**Armadilha real durante a correção:** a primeira tentativa de salvar
rodou `hydrateEntries()` numa aba que ainda tinha o código ANTIGO carregado
(a aba estava aberta desde antes do deploy do fix) — isso recalculou as
entradas `'futuro'` de Izabelly/Jorge/Thainara/Adriano de volta pro padrão
errado bem na hora de salvar. Resolvido recarregando a página (pegando o
código novo) antes de reaplicar. **Lição adicional:** depois de publicar
uma correção de código, sempre recarregar a aba de trabalho antes de rodar
qualquer função que dependa desse código novo — não basta o deploy ter
saído, a aba em uso também precisa estar com a versão nova carregada.

**Pagamento de Setembro do Adriano registrado** (não existia no app, apesar
de já pago na vida real): R$994,06 em 04/09/2026 — Aluguel R$850,00 + IPTU
R$38,00 + Condomínio (ref. Agosto/2026) R$106,06. Nota: essa parcela de
condomínio (R$106,06) é diferente da dos outros inquilinos do Santa Nonna I
no mesmo mês (R$122,34 pra todos os outros) — valor informado diretamente
pelo usuário, não investigado o porquê da diferença (pode ser legítimo,
não foi levantado como dúvida pelo usuário).

**Erro cometido e corrigido durante o processo:** uma chamada a
`applyPayment(4, '2026-09', '2026-09-04', 994.06)` sem passar os parâmetros
opcionais de override (condo/iptu/lixo/multa/juros) como `null` explícito
zerou esses campos por engano — `applyPayment()` trata `undefined` como
"tem override, aplica" (só `null`/`''` são tratados como "sem override").
Recuperado comparando com o rateio de condomínio dos outros inquilinos do
mesmo condomínio no mesmo mês (que resultou coincidir por acaso — o valor
real, dado depois pelo usuário, era diferente). **Lição de API:** chamar
`applyPayment()` sem os overrides opcionais deve passar `null` explicitamente
para cada um, nunca omitir os argumentos.


## 14/09/2026 (continuação 4) — Confusão do valor de condomínio de Setembro (SN1), resolvida

Depois da correção de vencimento, o usuário notou uma inconsistência maior:
o valor de condomínio da cobrança de Setembro. Investigação com vários
erros meus no caminho, registrados aqui pra não repetir.

**Contexto que gerou a confusão:** o app calcula o rateio de condomínio
EXCLUINDO o IPTU da base que recebe 10% de taxa de administração — essa
fórmula já tinha sido confirmada correta numa sessão anterior (12/09,
"não posso cobrar 10% sobre o IPTU né"). A planilha real do usuário, por
outro lado, INCLUI o IPTU nessa base — dá um valor diferente. As duas
existem em paralelo: o app usa a própria fórmula, não replica a planilha.

**Meus dois erros, na ordem:**
1. Calculei o rateio de Agosto (que entra no aluguel de Setembro, regra
   "mês anterior") usando a fórmula do app → **R$122,34**. Certo em si, mas
   apliquei antes de confirmar com o usuário.
2. Quando o usuário contou que o Adriano tinha pago Setembro com
   "condomínio referente a Agosto, R$106,06", apliquei R$106,06 nos outros
   6 inquilinos também — **errado**: R$106,06 é o valor de Julho (que entra
   no aluguel de AGOSTO, não Setembro), confirmado comparando com a
   planilha real do usuário (colada na conversa). Essa tentativa de salvar
   falhou por um erro técnico antes de persistir — sorte, evitou ter que
   desfazer mais uma correção errada.

**Investigação que resolveu:** comparando os pagamentos JÁ FEITOS (não os
em aberto) dos 7 inquilinos ativos do Santa Nonna I, achei um padrão real e
consistente: todos pagaram o aluguel de referência Agosto com condomínio
R$106,06, entre 01-05/09 — isso está certo (R$106,06 = Julho, entra em
Agosto). A única cobrança que usou R$106,06 indevidamente foi a de
SETEMBRO do Adriano — reaproveitou por engano o número que tinha acabado
de ser usado pra fechar Agosto, um deslize pontual, não um padrão.

**Decisão final do usuário:** Setembro leva R$122,34 (fórmula do app, sem
IPTU na taxa — não a da planilha). Agosto fica como está, R$106,06, já
pago por todos. O registro do Adriano (Setembro pago com R$106,06 em vez
de R$122,34) **não foi alterado** — é uma transação real já fechada.

**Estado final, verificado com download direto do Drive:** Evelin, Fernanda,
Lorenza, Izabelly, Jorge, Thainara — Setembro `condo=122.34`, status
`futuro` (em aberto, correto). Adriano — Setembro `condo=106.06`, status
`pago` `994.06` (mantido). Nenhuma edição foi necessária nessa rodada final
— o estado já batia com a decisão do usuário.

**Lição de processo:** antes de aplicar qualquer valor calculado por mim
(fórmula do app, planilha, ou o que for) em dados financeiros reais de
mais de um inquilino, **perguntar primeiro**, mesmo quando a conta parece
bater — esse foi o erro raiz: calculei sozinho duas vezes antes de
confirmar, e errei as duas.


## 14/09/2026 (continuação 5) — Mês de Maio/2026 do Adriano nunca foi lançado, cascata de meses mal rotulados

Continuação direta da investigação do condomínio de Setembro: o usuário
trouxe a planilha pessoal completa do Adriano (junho/2025 até outubro/2026)
e, comparando linha por linha com o app, achou a causa raiz de verdade.

**O que estava errado:** de jun/2025 a abr/2026, o histórico do Adriano no
app batia perfeitamente com a planilha. A partir daí, **Maio/2026 nunca foi
lançado** — sumiu — e toda cobrança seguinte ficou com o rótulo (`ref`) um
mês atrasado em relação à realidade:

| App mostrava (rótulo errado) | Na verdade era |
|---|---|
| `ref: 2026-05` | Junho |
| `ref: 2026-06` | Julho |
| `ref: 2026-07` | Agosto |
| `ref: 2026-08` | Setembro |

A entrada `ref: 2026-09` que eu tinha criado momentos antes (quando o
usuário relatou o pagamento de Setembro) era, na prática, uma **duplicata**
do que já existia — só que mal rotulado como Agosto.

**Corrigido (dados, via script no navegador — Drive conectado por clique
real do usuário, mesmo processo de sempre: `saveToLocalStorage()` antes de
`saveToDrive()`, verificado com download direto do Drive depois):**
1. Removida a duplicata (`ref: 2026-09` criado por engano).
2. Renomeados os 4 rótulos: Maio→Junho, Junho→Julho, Julho→Agosto,
   Agosto→Setembro (e o campo `venc` de cada um recalculado pro novo mês).
3. Lançado Maio/2026, que estava faltando: Aluguel R$850 + IPTU R$38 +
   Condomínio R$97,88 = R$985,88, pago em 05/05/2026 — valores exatos da
   planilha do usuário.

**Verificado:** histórico final do Adriano (16 lançamentos) bate 100% com
a planilha pessoal dele, mês a mês, confirmado com download direto do
Drive (não só cache local).

**Pendência aberta, não investigada ainda:** não foi verificado se esse
mesmo tipo de "mês faltando, cascata de rótulos errados" acontece com
outros inquilinos — só o Adriano foi auditado a fundo porque foi o caso
que o usuário trouxe pra investigar. Vale considerar uma auditoria
sistemática (comparar `ref` sequencial de cada inquilino ativo, procurando
buracos no histórico) numa sessão futura.


## 14/09/2026 (continuação 6) — Auditoria completa do Santa Nonna I com as planilhas reais do usuário

O usuário trouxe as planilhas pessoais de pagamento de Izabelly, Evelin,
Jorge, Thainara e Lorenza (além da do Adriano já usada antes) e a planilha
geral "Condomínio Geral", permitindo uma auditoria definitiva, ref por ref,
de todo o Santa Nonna I — em vez de eu tentar recalcular/adivinhar sozinho
(erro cometido duas vezes antes nesta mesma sessão).

### Achado 1: o valor de Setembro é R$127,57, não R$122,34 (reverte decisão anterior)
Com o IPTU incluído na base que recebe 10% de taxa de administração (fórmula
da planilha, não a do app), Agosto fecha em R$106,06 (já confirmado, bate com
pagamentos reais) e Setembro em **R$127,57** — confirmado por **5 fontes
independentes**: planilha geral "Condomínio Geral" e as planilhas pessoais
de Adriano, Izabelly, Evelin e Lorenza, todas com o mesmo número. A decisão
anterior desta mesma sessão ("vamos lançar 122,34") foi tomada antes de eu
ter acesso a essas planilhas e está revertida.

### Achado 2: Izabelly e Jorge são "mês seguinte", não "mesmo mês"
A informação original do usuário ("Izabelly - Thainara - Jorge = mesmo mês")
estava parcialmente errada — confirmado pelas planilhas pessoais deles:
Izabelly e Jorge vencem no mês seguinte (igual Evelin/Fernanda/Lorenza);
só a Thainara é realmente "mesmo mês". `vencMesSeguinte` revertido pra
`true` nos dois, vencimentos de Agosto/Setembro recalculados.

### Achado 3: Thainara tinha o mesmo bug do Adriano — mês faltando
Auditoria comparando `ref` sequencial com a planilha dela revelou: faltava
**Junho/2026** (o primeiro mês dela, sem condomínio ainda, R$888,00, pago
com 5 dias de atraso) — e tudo depois ficou rotulado um mês atrasado
(Julho→"ref:06", Agosto→"ref:07", Setembro→"ref:08", Outubro→"ref:09").
Corrigido do mesmo jeito que o Adriano: renomeadas as 4 entradas, lançado
Junho que faltava, e a entrada que virou Outubro ajustada pro valor real
da planilha (R$127,57).

### Auditoria automática nos demais (buraco de sequência)
Rodado um script comparando a sequência de `ref` de todos os inquilinos
ativos do SN1 — **nenhum outro buraco encontrado**. Evelin, Fernanda e
Lorenza tiveram o histórico de 2026 inteiro comparado ref-a-ref com as
planilhas pessoais delas e bateram perfeitamente, sem nenhum desvio — só o
Adriano e a Thainara tinham esse bug específico.

### Estado final (verificado com download direto do Drive):
| Unidade | Regra vencimento | Setembro (ou próxima cobrança em aberto) |
|---|---|---|
| Evelin, Fernanda, Lorenza | mês seguinte (já correto) | R$127,57, venc 05/10 |
| Izabelly, Jorge | mês seguinte (revertido hoje) | R$127,57, venc 05/10 |
| Thainara | mesmo mês (correto) | Outubro R$127,57, venc 05/10 (mês faltando corrigido) |
| Adriano | mesmo mês (correto) | Setembro R$106,06 já pago (transação fechada, não mexida) |
| Camargo | mesmo mês (correto) | Setembro R$1.000,00 pendente (sem condomínio, Sala) |

**Lição de processo, reforçada:** só a planilha real do usuário resolveu de
forma definitiva o que três tentativas minhas de calcular sozinho (122,34,
depois 106,06, depois 122,34 de novo) não conseguiram. Nas próximas vezes,
pedir a planilha/fonte real ANTES de aplicar qualquer valor calculado em
dados financeiros de mais de um inquilino, em vez de perguntar "posso
aplicar X" depois de já ter calculado X sozinho.
