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

## 1. Segurança (fazer de qualquer forma — é grátis e rápido, mas não é o que decide se o projeto vinga)

- [ ] **Remover o backdoor de senha em `js/auth.js`** — `const PASSWORD = '2'`
      e o fallback que aceita essa senha em texto puro quando `crypto.subtle`
      falha. Produção é 100% HTTPS (GitHub Pages), então esse fallback nunca é
      necessário ali — só risco.
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
- [ ] Decidir o que fazer com `clientes-adv` (módulo de advocacia) misturado
      no mesmo app/dados de `gestao-alugueis` — manter junto de propósito (só
      um usuário mesmo) ou isolar em namespace de dados próprio.

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
