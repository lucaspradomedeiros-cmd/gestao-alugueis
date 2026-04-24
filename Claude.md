# Claude.md — Gestão de Aluguéis v2

## Status Atual (2026-04-24)

### ✅ Sessão Atual Concluída

**Principal Foco:** Otimização Mobile - Bottom Tab Bar Navigation + Layout Responsivo

#### Mudanças Implementadas:

1. **Bottom Tab Bar Navigation (Mobile)**
   - Criado: `js/bottom-tab.js` — navegação com 5 buttons (4 primários + "Mais")
   - CSS: tab bar fixo no rodapé (64px) em viewports ≤760px
   - Painel "Mais" deslizante com 5 páginas secundárias + 3 atalhos (Drive, Tema, Backup)
   - Desktop: sidebar intacta, sem mudanças
   - Commit: `c59775a` — feat(mobile-nav): implement bottom tab bar

2. **Otimização Mobile — Condomínio & Detail Panel**
   - Redução agressiva de fonts, paddings, margins
   - Table compressão: font 12px → 7-10px em mobile
   - Input padding reduzido para mobile
   - Despesas organizadas em layout vertical (stack) em mobile
   - Grid layout ajustado (2 colunas → 1 coluna mobile)
   - Commits: 
     - `4ded8e1` — style(mobile): optimize detail panel
     - `adb2cd2` — style(mobile): optimize condominio page
     - `243f715` — style(mobile): fix condominio despesas layout
     - `0c9c065` — style(mobile): further reduce condominio sizes
     - `93ec02d` — style(mobile): reduce overall width and alignment

3. **Testes & Ajustes Finais**
   - Regra de medição adicionada e depois removida (b659877)
   - Layout refinado para caber em viewport mobile sem scroll horizontal desnecessário
   - Commit: `30ba3a2` — revert: removed global max-width constraints

### 📱 Mobile Responsiveness

**Viewport Mobile (≤760px):**
- ✅ Bottom tab bar funcional com 4 tabs + "Mais"
- ✅ Sidebar completamente oculta
- ✅ Detalhe panel comprimido para leitura em mobile
- ✅ Página condomínio reorganizada verticalmente
- ✅ Scroll vertical fluido
- ✅ Sem overflow horizontal excessivo

**Desktop (>760px):**
- ✅ Sidebar lateral intacta (240px)
- ✅ Bottom tab bar oculto
- ✅ Layout original preservado

### 🎨 Color System (Sessão Anterior)

- Paleta "Profissional & Corporativo" implementada
- Cores atualizadas: teals, navy, red-orange
- Contraste WCAG AA validado
- Light & Dark mode suportados

---

## 📋 Próximos Passos

**Prioridade Recomendada:**
1. Phase 9 — Testes & Refinamento Mobile (validar em dispositivos reais)
2. Phase 9.5 — Document System (otimizar recibos + completar doc-gen)
3. Phase 10 — PWA & Offline (sincronização robusta)
4. Phase 11 — Deploy Production

### Phase 9 — Testes & Refinamento Mobile (Recomendado)

1. **Testes Funcionais em Dispositivos Reais**
   - [ ] Testar em iPhone 12/13/14/15
   - [ ] Testar em Samsung Galaxy (Android)
   - [ ] Testar em tablet (iPad)
   - [ ] Verificar safe areas (notch, home indicator)

2. **Validação de Performance**
   - [ ] Lighthouse score mobile (target: 90+)
   - [ ] Core Web Vitals check
   - [ ] Bundle size check
   - [ ] Cache behavior validation

3. **Testar Fluxos Críticos em Mobile**
   - [ ] Login/autenticação Google Drive
   - [ ] Carregar dados do Drive
   - [ ] Registrar pagamento (mobile flow)
   - [ ] Novo locatário (modal mobile)
   - [ ] Editar condomínio
   - [ ] Histórico de lançamentos scroll

4. **Refinamentos Menores (se necessário)**
   - [ ] Ajustar se houver feedback de layout
   - [ ] Otimizar touch targets (mínimo 44x44px)
   - [ ] Verificar formulários em mobile

### Phase 9.5 — Document System Optimization (Recomendado)

**Status Atual:**
- ✅ `js/recibo.js` (220 linhas) — Geração de recibos FUNCIONAL
  - Suporta: texto puro, cópia para clipboard, impressão HTML
  - Integrado: botões em histórico de pagamentos
  - Mobile: reformatação automática via media query `@media print`
  
- 🟡 `js/doc-gen.js` (345 linhas) — Geração de documentos PARCIAL
  - Implementado: Contrato Aluguel (template HTML)
  - Implementado: Procuração (template HTML)
  - Pendente: Integração docx library para DOCX export
  - Pendente: Salvar documentos no Google Drive

**Implementação Recomendada:**
1. **Otimizar Recibo para Mobile**
   - [ ] Testar impressão em mobile (iOS print dialog, Android print)
   - [ ] Validar safe areas (notch, home indicator)
   - [ ] Otimizar fuentes/paddings no print preview
   - [ ] Adicionar QR code (opcional)

2. **Completar doc-gen.js — DOCX Export**
   - [ ] Integrar docx library (`npm install docx` ou CDN)
   - [ ] Implementar: DocumentCreator class
   - [ ] Métodos: toPDF(), toDOCX(), toHTML()
   - [ ] Adicionar headers/footers com logo
   - [ ] Testes em mobile print

3. **Criar Sistema de Templates**
   - [ ] Template: Contrato Aluguel (completo com cláusulas)
   - [ ] Template: Procuração (assinatura digital placeholder)
   - [ ] Template: Relatório Mensal (despesas + receitas)
   - [ ] Sistema de variáveis dinâmicas (`{{tenant.name}}`, `{{period}}`, etc.)

4. **Integração Google Drive**
   - [ ] Salvar recibos gerados no Drive
   - [ ] Salvar documentos (DOCX/PDF) em pasta `/Documentos`
   - [ ] Vincular ao histórico do locatário
   - [ ] Adicionar download/preview no detail panel

5. **Formulários & Validação**
   - [ ] Validar campos obrigatórios antes de gerar
   - [ ] Preview antes de salvar
   - [ ] Histórico de documentos gerados (tabela)
   - [ ] Reenomear/reatribuir documentos

### Phase 10 — PWA & Offline (Futuro)

- [ ] Service workers setup
- [ ] Offline-first sync queue
- [ ] App manifest & icons
- [ ] Install prompt

### Phase 11 — Deploy Production

- [ ] Testing em staging
- [ ] Merge para main (se não estiver já)
- [ ] Deploy em production
- [ ] Monitorar erros

---

## 🔧 Instruções para Futuras Sessões

### Começar Trabalho

1. **Hard Refresh sempre em mobile:**
   - Windows/Linux: `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

2. **Testar em Viewport Mobile:**
   - F12 → Device Toggle (canto superior esquerdo)
   - Selecionar dispositivo (ex: iPhone 12)
   - Viewport ≤760px

3. **Verificar Estado Git:**
   ```bash
   git status
   git log --oneline -5
   ```

### Convenções Respeitadas

- ✅ Sem bundler (classic scripts, global scope)
- ✅ 18 módulos JavaScript modularizados
- ✅ CSS inline em `<style>` (sem CSS externo)
- ✅ Responsive: desktop (>760px) + mobile (≤760px)
- ✅ Commits semânticos: `feat:`, `fix:`, `style:`, `docs:`
- ✅ Co-authored por Claude Haiku 4.5

### Não Fazer

- ❌ Não criar novos CSS files (inline only)
- ❌ Não quebrar compatibilidade desktop
- ❌ Não mudar breakpoint 760px sem avisar
- ❌ Não remover módulos sem documentar
- ❌ Não commitar dados hardcoded (usar Drive)

---

## 📊 Arquitetura

```
index.html (7,140+ linhas)
├── CSS inline (em <style>)
│   ├── Colors (CSS vars — 5+ themes)
│   ├── Layout (flex, grid)
│   ├── Responsive (@media 760px breakpoint)
│   ├── Dark mode
│   └── Print media (@media print)
├── HTML (app + pages + modals)
└── Scripts (18+ modules)
    ├── Core
    │   ├── js/auth.js
    │   ├── js/state.js
    │   ├── js/utils.js
    │   └── js/navigation.js
    ├── Mobile
    │   └── js/bottom-tab.js
    ├── Financial
    │   ├── js/tenant-financials.js
    │   ├── js/payment-modal.js
    │   └── js/recibo.js (Geração de recibos)
    ├── Properties
    │   ├── js/condo.js
    │   ├── js/imovel.js
    │   └── js/despesas.js
    ├── Documents
    │   └── js/doc-gen.js (Templates: Contrato, Procuração, Relatório)
    ├── UI
    │   ├── js/tenant-ui.js
    │   ├── js/detail-panel.js
    │   ├── js/report.js
    │   └── js/tenant-modal.js
    ├── Features
    │   ├── js/clientes-adv.js
    │   ├── js/financeiro.js
    │   └── js/whatsapp.js
    └── Storage
        ├── js/storage.js
        └── js/drive-loader.js
```

---

## 🔐 Segurança & Dados

- Google Drive OAuth integrado
- Dados salvos em localStorage (cache)
- Drive é fonte de verdade
- Sync bidirecionais com fila offline
- Sem hardcoding de dados (8 tenants com 321 meses de histórico em Drive)

---

## 📞 Contato & Próximas Reuniões

- **Última atualização:** 2026-04-24
- **Commits nesta sessão:** 15+
- **Branch:** main (sempre)
- **Deploy:** Pronto para testes em mobile real

---

## Checklist Final

**Sessão Atual (2026-04-24):**
- [x] Bottom Tab Bar implementado
- [x] Mobile layout otimizado
- [x] Detalhe panel comprimido
- [x] Condomínio responsivo
- [x] Commits feitos
- [x] Push para remote
- [x] Claude.md criado (checkpoint completo)
- [x] Planos documentados (Phases 9-11)
- [x] Document system incluído nos planos

**Próximas Sessões:**
- [ ] Phase 9: Testes em dispositivos reais (iPhone, Samsung, iPad)
- [ ] Phase 9.5: Otimização document system (recibo mobile + doc-gen DOCX)
- [ ] Phase 10: PWA & Offline (service workers, sync queue)
- [ ] Phase 11: Deploy production
- [ ] Monitoramento pós-deploy

---

**Pronto para continuar!** 🚀
