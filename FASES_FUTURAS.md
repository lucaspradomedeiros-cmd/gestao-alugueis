# Fases Futuras — Roteiro de Melhorias (Fase 5+)

**Status:** Documentadas para implementação futura  
**Data:** 2026-04-08  
**Contexto:** Com Fase 4 concluída (refatoração completa), o código está pronto para expansão

---

## Fase 5: Testes E2E Automatizados 🧪

### Objetivo
Implementar testes end-to-end automatizados para validar fluxos críticos de negócio e garantir confiança em refatorações futuras.

### Ferramentas Sugeridas
- **Cypress** (recomendado para aplicações monolíticas) ou
- **Playwright** (alternativa moderna)

### Fluxos a Testar

#### T5.1: Criar Inquilino e Registrar Pagamento
```
1. Abrir modal "Novo Locatário"
2. Preencher: unidade, nome, aluguel, datas
3. Salvar → validar card no dashboard
4. Clicar no card → abrir detalhamento
5. Clicar "+ Registrar pagamento"
6. Preencher data, valor
7. Salvar → validar status muda para "pago"
```

#### T5.2: Sincronização Google Drive
```
1. Fazer mudança local (novo inquilino)
2. Aguardar 2s (sync automático)
3. Validar que SYNC_ENGINE.queue está vazio
4. Recarregar página → dados persistem (localStorage)
5. Limpar localStorage
6. Recarregar → Drive carrega dados corretamente
```

#### T5.3: Filtros de Período
```
1. Abrir detalhamento de inquilino
2. Clicar tab "6 meses"
3. Validar que tabela mostra apenas 6 últimos meses
4. Clicar tab "Ano"
5. Validar que tabela mostra apenas meses do ano atual
6. Usar filtro custom: de JAN/2024 até JUN/2024
7. Validar que tabela mostra apenas esse período
```

#### T5.4: Alertas de Inadimplência
```
1. Criar inquilino com vencimento ontem
2. Não registrar pagamento
3. Dashboard mostra card com badge "Inadimplente" (vermelho)
4. Detalhamento mostra bloco "Débito em aberto" com cálculo de multa/juros
5. Clicar "Enviar cobrança" (WhatsApp) → validar URL
```

#### T5.5: Relatórios (Condomínio, Repasse, Recibo)
```
1. Clicar "Relatório Condomínio" → janela de impressão abre
2. Validar HTML contém dados corretos (nomes, valores)
3. Fechar janela
4. Clicar "Emitir recibo" → PDF abre
5. Validar QR code e dados do recibo
```

### Implementação
```bash
# Instalação
npm install --save-dev cypress

# Estrutura
cypress/
├── e2e/
│   ├── dashboard.cy.js       # T5.1, T5.4
│   ├── sync.cy.js            # T5.2
│   ├── filters.cy.js         # T5.3
│   └── reports.cy.js         # T5.5
├── fixtures/
│   └── tenants.json          # Dados de teste
└── support/
    └── commands.js           # Helpers (login, criar tenant, etc)

# Executar
npx cypress open              # Visual mode
npx cypress run               # Headless (CI/CD)
```

### Métricas de Sucesso
- ✓ 5 fluxos críticos cobertos
- ✓ 80%+ de cobertura de linhas
- ✓ Testes rodam em <2min
- ✓ Zero flakiness (testes consistentes)

---

## Fase 6: PWA Offline (Service Workers) 📱

### Objetivo
Transformar a app em Progressive Web App com sincronização offline → online.

### Features

#### F6.1: Instalação como App
```javascript
// Adicionar em index.html <head>
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#1a1a1a">
<meta name="apple-mobile-web-app-capable" content="yes">

// manifest.json
{
  "name": "Gestão de Aluguel",
  "short_name": "Aluguel",
  "icons": [
    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"}
  ],
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a1a1a"
}
```

Resultado: App instável em mobile → ícone na home screen

#### F6.2: Service Worker (Cache + Sync)
```javascript
// service-worker.js
const CACHE_NAME = 'gestao-v1';
const urlsToCache = ['/', '/index.html', '/drive-loader.js', '/sync-engine.js'];

// Install: cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch: network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  if(event.request.method === 'GET'){
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
```

#### F6.3: Background Sync
```javascript
// No momento de perder conexão, registrar sync
navigator.serviceWorker.ready.then((registration) => {
  registration.sync.register('sync-drive');
});

// Quando voltar online
self.addEventListener('sync', (event) => {
  if(event.tag === 'sync-drive'){
    event.waitUntil(
      SYNC_ENGINE.flush()  // Enviar todas as mudanças pro Drive
    );
  }
});
```

#### F6.4: Indicadores de Status Offline
```javascript
// Mostrar banner quando offline
window.addEventListener('offline', () => {
  document.getElementById('offline-banner').style.display = 'block';
  document.getElementById('offline-banner').textContent = '📡 Modo offline — mudanças serão sincronizadas quando conectar';
});

window.addEventListener('online', () => {
  document.getElementById('offline-banner').style.display = 'none';
  SYNC_ENGINE.flush();  // Sincronizar imediatamente
});
```

### Implementação
```bash
# Registrar Service Worker em index.html
<script>
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW registration failed'));
  }
</script>
```

### Métricas de Sucesso
- ✓ App funciona 100% offline (sem conexão)
- ✓ Mudanças offline sincronizam ao reconectar
- ✓ Instalável em mobile
- ✓ Cache de assets reduz reload time em 70%

---

## Fase 7: Modularização (ES6 Modules) 📦

### Objetivo
Separar `index.html` monolítico (7.5K linhas) em módulos reutilizáveis.

### Estrutura Proposta
```
src/
├── index.html                   # HTML + CSS (sem JS)
├── main.js                      # Entry point (imports todos os módulos)
├── constants.js                 # Constantes globais
├── utils.js                     # Helpers (fmtBRL, fmtDate, monthName, etc)
├── modules/
│   ├── storage.js              # loadFromStorage, saveToStorage, applyPayload
│   ├── sync.js                 # SYNC_ENGINE (bidirectional sync)
│   ├── drive.js                # Drive OAuth + loader
│   ├── dashboard.js            # renderDashboard, renderCardDashboard, updateSummary
│   ├── details.js              # renderDet e sub-funções (4c)
│   ├── modals/
│   │   ├── register-payment.js # Registrar pagamento (modal)
│   │   ├── edit-tenant.js      # Editar locatário
│   │   ├── reports.js          # Relatórios (condomínio, repasse, recibo)
│   │   └── receipts.js         # Gerar recibos
│   ├── periods.js              # Filtros de período, setDetPeriod
│   └── whatsapp.js             # openWpp (integração)
└── styles/                      # CSS separado em módulos
    ├── variables.css            # CSS custom properties
    ├── base.css                 # Normalize, reset
    ├── dashboard.css            # Estilos dashboard
    └── modals.css               # Estilos modais
```

### Exemplo de Módulo

**storage.js**
```javascript
export function saveToStorage(){
  const payload = { tenants, condominios, condoHistory };
  const hash = sha256(JSON.stringify(payload));
  localStorage.setItem('gestao-payload', JSON.stringify({...payload, _hash: hash}));
  localStorage.setItem('gestao-timestamp', new Date().toISOString());
}

export function loadFromStorage(){
  const stored = localStorage.getItem('gestao-payload');
  if(!stored) return false;
  return applyPayload(JSON.parse(stored));
}

export function applyPayload(data){
  // Validação + aplicação
  if(!data || !data.tenants) return false;
  // ...
  return true;
}
```

**dashboard.js**
```javascript
import { tenants, condominios } from './storage.js';
import { fmtBRL, fmtDate } from './utils.js';
import { renderCardDashboard, updateSummary } from './dashboard.js';

export function renderDashboard(){
  const c = document.getElementById('dash-cards');
  c.innerHTML = '';
  tenants.filter(t => !t.vago).forEach(t => {
    renderCardDashboard(t, c);
  });
  updateSummary();
}
```

**main.js** (entry point)
```javascript
import { renderDashboard } from './modules/dashboard.js';
import { renderDet } from './modules/details.js';
import { loadFromStorage } from './modules/storage.js';
import { initDriveLoader } from './modules/drive.js';
import { initSyncEngine } from './modules/sync.js';

// Inicialização
window.addEventListener('DOMContentLoaded', async () => {
  loadFromStorage();
  renderDashboard();
  initDriveLoader();  // Background sync
  initSyncEngine();
});

// Expor globais necessárias
window.renderDet = renderDet;
window.renderDashboard = renderDashboard;
// ... etc
```

### Build (Webpack/Vite)
```bash
# package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^4.0.0"
  }
}

# vite.config.js
export default {
  build: {
    outDir: 'dist',
    minify: 'terser'
  }
};
```

### Métricas de Sucesso
- ✓ Main.js < 50KB (minified)
- ✓ Cada módulo testável independentemente
- ✓ Tree-shaking remove código não usado
- ✓ Manutenção 10x mais fácil

---

## Fase 8: Melhorias de UX/Design 🎨

### Objetivo
Polish visual, acessibilidade e experiência do usuário.

### F8.1: Tema Escuro/Claro
```javascript
// Detectar preferência do sistema
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

// Botão toggle
function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
```

CSS:
```css
:root[data-theme="light"] {
  --bg: #ffffff;
  --text: #000000;
  --border: #e0e0e0;
}

:root[data-theme="dark"] {
  --bg: #1a1a1a;
  --text: #ffffff;
  --border: #333333;
}
```

### F8.2: Notificações (Toast)
```javascript
function showToast(message, type = 'info'){
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// Uso
showToast('✅ Pagamento registrado', 'success');
showToast('⚠️ Erro ao sincronizar', 'error');
```

### F8.3: Animações Suaves
```css
/* Fade in modais */
.modal {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Transições em status */
.card {
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}
```

### F8.4: Acessibilidade (WCAG 2.1 AA)
```html
<!-- Buttons com aria-labels -->
<button onclick="openWpp(${t.id})" aria-label="Enviar cobrança via WhatsApp">📲</button>

<!-- Modais com ARIA -->
<div id="modal" role="dialog" aria-labelledby="modal-title" aria-hidden="true">
  <h2 id="modal-title">Novo Locatário</h2>
  <!-- conteúdo -->
</div>

<!-- Cores com suficiente contraste -->
<!-- Use ferramenta: https://webaim.org/resources/contrastchecker/ -->

<!-- Labels para inputs -->
<label for="tenant-name">Nome do Locatário</label>
<input id="tenant-name" type="text" required>
```

### F8.5: Responsividade Mobile
```css
/* Desktop-first */
.dashboard { display: grid; grid-template-columns: repeat(3, 1fr); }

/* Tablet */
@media (max-width: 1024px) {
  .dashboard { grid-template-columns: repeat(2, 1fr); }
}

/* Mobile */
@media (max-width: 768px) {
  .dashboard { grid-template-columns: 1fr; }
  .modal { width: 90vw; }
}
```

### Métricas de Sucesso
- ✓ Lighthouse score 90+
- ✓ WCAG 2.1 AA compliant
- ✓ 60fps animations
- ✓ Mobile-first responsivo

---

## Resumo das Próximas Fases

| Fase | Tema | Duração Est. | Complexidade | Impacto |
|------|------|--------------|--------------|---------|
| 5 | Testes E2E | 1-2 semanas | Média | Alto (confiança) |
| 6 | PWA Offline | 1 semana | Média | Alto (usabilidade) |
| 7 | Modularização | 2-3 semanas | Alta | Alto (manutenção) |
| 8 | UX/Design | 1-2 semanas | Baixa | Médio (polish) |

---

## Como Usar Este Documento

1. Quando quiser implementar uma fase, leia a seção correspondente
2. Use os exemplos de código como ponto de partida
3. Ajuste conforme necessário para seu contexto
4. Crie commits com prefixo `feat: Fase X —`
5. Documente resultados em `FASE_X_RESULTADO.md`

---

**Status:** Documentado e pronto para implementação  
**Última atualização:** 2026-04-08

