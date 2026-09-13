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

⚠️ **Pendência ainda aberta:** `sync-engine.js` (`SYNC_ENGINE`) continua
coexistindo como sistema de sync redundante/legado (`mergeStrategy:
'drive-wins'` hard-coded, mesma filosofia do bug acima) — não removido ainda
para manter o escopo da correção mínimo. Ver seção 3 (dead code).

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

### ❌ NÃO mexido de propósito — precisa de feature nova primeiro
Apto 1 (Rafael Moura Dornelles), Apto 3 (Ana Carla Vieira Ferreira), Apto 5
(Gabriely Vilhalva Mendonça) — inquilinos já trocaram (Izabelly/Jorge/
Thainara são os atuais) mas o app **não tem função de "encerrar locação/
marcar vago sem perder o histórico"**. Usuário confirmou (12/09): manter o
histórico desses inquilinos, especialmente o do Rafael (dívida real ainda
a cobrar); Ana Carla e Gabriely sem pendência. Sobrescrever o nome no mesmo
registro colaria a dívida do antigo no novo inquilino — errado.

- [ ] **NOVA FUNCIONALIDADE NECESSÁRIA:** "Encerrar locação" — permite marcar
      um locatário como inativo/mudou-se, preservando 100% do histórico
      antigo sob o nome dele, e liberar a unidade pra um cadastro de
      locatário novo. Até essa feature existir, Apto 1/3/5 ficam com dado
      desatualizado no app (mas a planilha continua certa nesse meio-tempo).

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
