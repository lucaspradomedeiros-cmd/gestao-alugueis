# 🏠 Gestão de Aluguéis

Sistema web completo de gestão de propriedades alugadas, condominios, inquilinos, despesas e documentos legais.

**Status:** v2.0.0 — Phase 7 (Modularização) + Phase 8 (UX/Design) ✅  
**Testes:** 43/43 Cypress E2E passando  
**Linhas:** 7.141 (index.html) | 18 módulos JS | 416 KB raw | 87.7 KB gzipped

---

## 📋 Visão Geral

Aplicação SPA (Single Page Application) para gerenciar:
- **Propriedades** (imóveis) com despesas associadas
- **Inquilinos** (tenants) com renda, multa, juros
- **Condomínios** (units) com rateio de custos
- **Clientes advocatícios** com processos e documentação
- **Financeiro de escritório** (despesas, receitas, DRE)
- **Sincronização** bidirecional com Google Drive
- **Modo offline** com localStorage cache

### Tipos de Usuários
- **Proprietário** — Gerencia imóveis, inquilinos, despesas
- **Advogado** — Gerencia clientes, processos, gera documentos

---

## 🛠️ Stack Tecnológico

### Frontend
- **HTML5** — Estrutura semântica
- **CSS3** — Custom properties, animations, dark mode, responsivo
- **JavaScript (ES6)** — Classic scripts pattern (global scope), sem bundler
- **Google APIs** — Drive, OAuth 2.0, Identity

### Persistência
- **localStorage** — Cache local rápido
- **Google Drive** — Fonte de verdade com OAuth
- **JSON** — Serialização de estado

### Testes
- **Cypress** — E2E testing (43 specs)
- **Node.js** — NPM scripts

### Bibliotecas
- **docx** — Geração de documentos Word
- **chart.js** — Gráficos financeiros

---

## 🚀 Quick Start

### Pré-requisitos
```bash
Node.js 16+ (para rodar Cypress)
Git
Google Cloud Project (para autenticação Drive)
```

### 1️⃣ Setup Inicial

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/gestao-alugueis.git
cd gestao-alugueis

# Instale dependências (só para testes Cypress)
npm install
```

### 2️⃣ Google Drive OAuth (Produção)

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie novo projeto
3. Ative APIs:
   - Google Drive API
   - Google Identity Services
4. Crie credenciais OAuth 2.0:
   - Tipo: Web application
   - URIs autorizadas: `http://localhost:3000`, seu domínio
5. Copie `Client ID`
6. Em `index.html` (linha ~5000):
   ```html
   <script async defer src="https://accounts.google.com/gsi/client?client_id=SEU_CLIENT_ID_AQUI"></script>
   ```

### 3️⃣ Rodar Localmente

```bash
# Opção A: Com Python (quick-start)
python3 -m http.server 3000

# Opção B: Com Node + http-server
npm install -g http-server
http-server -p 3000

# Opção C: Com Live Server (VS Code extension)
# Abrir em browser: http://localhost:3000
```

### 4️⃣ Login de Teste

**Credenciais:**
- Email: Qualquer email Google
- Senha: Válida no Google
- Sessão: Armazenada em localStorage via OAuth

> ⚠️ **Nota:** Primeira autenticação via Google — sem usuário/senha hardcoded

---

## 🏗️ Arquitetura

### 18 Módulos JavaScript (Classic Scripts)

Cada módulo é um arquivo `.js` com funções no escopo global. **Nenhum ES6 modules/bundler.**

#### Core Stack (Carregados primeiro)
```
state.js (200 lin)              ← Global variables (tenants, imoveis, etc)
  ↓
utils.js (250 lin)              ← Utilidades (R, fmtBRL, openOverlay, etc)
  ↓
tenant-financials.js (293 lin)  ← Cálculos (multa, juros, renda)
  ↓
imovel.js (472 lin)             ← Propriedades, despesas
  ↓
condo.js (155 lin)              ← Condomínios, rateio
  ↓
tenant-ui.js (423 lin)          ← Dashboard, cards
  ↓
detail-panel.js (331 lin)       ← Painel de detalhes inquilino
  ↓
payment-modal.js (1000 lin)     ← Tabela de pagamentos
  ↓
whatsapp.js (153 lin)           ← Integração WhatsApp
  ↓
report.js (275 lin)             ← Relatórios mensais
```

#### Recursos Isolados
```
tenant-modal.js (215 lin)       ← Adicionar/editar inquilino
navigation.js (34 lin)          ← Roteamento de páginas
clientes-adv.js (452 lin)       ← Clientes advocatícios
doc-gen.js (345 lin)            ← Geração documentos (procuração, honorários)
financeiro.js (468 lin)         ← Despesas/receitas escritório
recibo.js (220 lin)             ← Recibos de aluguel
```

#### Persistência (Carregado por último)
```
storage.js (202 lin)            ← localStorage + Google Drive sync
  └─ initializeApp()            ← Startup INIT
```

### Fluxo de Dados

```
User Action (onclick)
    ↓
  JS Function (tenant-ui.js, payment-modal.js, etc)
    ↓
  Update Global State (state.js: tenants, imoveis, etc)
    ↓
  saveToStorage() [debounced 3s]
    ↓
  saveToLocalStorage() + saveToDrive() [async]
    ↓
  Google Drive (fonte de verdade) + localStorage (cache)
```

### Inicialização

```javascript
// storage.js — INIT block (runs at DOMContentLoaded)
initializeApp() {
  loadFromLocalStorage()         // ← Carrega cache primeiro
  hydrateEntries()              // ← Reconstrói relações entre dados
  renderDashboard()             // ← Renderiza UI
  renderCondoSwitcher()         // ← Dropdown de condomínios
  renderCondoInfoBar()          // ← Barra de info
  loadFromDrive()               // ← Sincroniza com Drive (async)
}
```

---

## 💾 Modelo de Dados

### Estrutura Principal

```javascript
// Tenants (inquilinos)
tenants = [
  {
    id: "t1",
    name: "João Silva",
    condoId: "c1",
    unitId: "u1",
    rentValue: 1500,
    rentDay: 5,
    acrescimo: 0,     // % extra
    contrato: { total: 1500, ... },
    payments: [        // Histórico pagamentos
      { ref: "2026-04", value: 1500, date: "2026-04-05", multa: 0, juros: 0 }
    ]
  }
]

// Imóveis (propriedades)
imoveis = [
  {
    id: "im1",
    nome: "Apto 101",
    despesas: [
      { id: "d1", mes: "2026-04", tipo: "condominio", valor: 200, tenant: "t1" }
    ]
  }
]

// Condomínios (prédios/complexos)
condominios = [
  {
    id: "c1",
    name: "Prédio A",
    units: ["u1", "u2", "u3"]
  }
]

// Despesas Escritório (office expenses)
despesasEscritorio = [
  {
    id: "de1",
    descricao: "Internet",
    valor: 100,
    mes: "2026-04",
    tipo: "infra",
    status: "pago"
  }
]

// Clientes Advocatícios
clientesAdv = [
  {
    id: "ca1",
    nome: "Empresa X",
    cpf: "12.345.678/0001-90",
    processos: [
      {
        id: "p1",
        numero: "0000001-XX.XXXX.X.XX.XXXX",
        status: "ativo",
        vencimento: "2026-12-31"
      }
    ]
  }
]
```

### Sincronização State → Storage

```javascript
getPayload() {
  return {
    tenants,
    condominios,
    condoHistories,    // Histórico de valores (rateio)
    imoveis,
    despesasEscritorio,
    receitasEscritorio,
    clientesAdv,
    activeCondoId,
    savedAt: ISO8601,
    version: 4
  }
}

// localStorage.getItem('gestao_alugueis_v1')
// Google Drive: /gestao-alugueis/data.json
```

---

## 🧪 Testes

### Rodar Testes

```bash
# Todos os 43 testes
npm test

# Um arquivo específico
npx cypress run --spec "cypress/e2e/01-auth.cy.js"

# Com GUI interativa
npx cypress open
```

### Cobertura (43 testes)

```
✅ 01-auth.cy.js           4/4   Login, sessão
✅ 02-navigation.cy.js    13/13  Routing, nav highlight
✅ 07-detail-panel.cy.js   8/8   Painel inquilino
✅ 08-condominio.cy.js     9/9   Switching, histórico
✅ 10-despesas.cy.js       9/9   Despesas, receitas, DRE
```

Cobertura: **80%+ dos fluxos críticos**

---

## 🛣️ Como Adicionar Nova Feature

### Exemplo: Novo Campo em Tenant

**1. Adicionar ao modelo (state.js)**
```javascript
let tenants = [
  {
    id: "t1",
    name: "João",
    condoId: "c1",
    // NOVO:
    telefone: "(11) 98765-4321"
  }
];
```

**2. Adicionar input no modal (index.html)**
```html
<div class="form-group">
  <label>Telefone</label>
  <input type="tel" id="tenant-phone" placeholder="(11) 98765-4321" />
</div>
```

**3. Capturar no saveTenant() (tenant-modal.js)**
```javascript
function saveTenant() {
  const t = {
    id: editingTenantId || generateId(),
    name: document.getElementById('tenant-name').value,
    condoId: document.getElementById('tenant-condo').value,
    // NOVO:
    telefone: document.getElementById('tenant-phone').value
  };
  tenants.push(t);
  saveToStorage();  // ← Auto-sincroniza localStorage + Drive
}
```

**4. Testar em Cypress (cypress/e2e/XX-feature.cy.js)**
```javascript
it('deve salvar telefone do inquilino', () => {
  cy.visit('/')
  cy.contains('Adicionar Inquilino').click()
  cy.get('#tenant-phone').type('(11) 98765-4321')
  cy.contains('Salvar').click()
  cy.contains('(11) 98765-4321').should('exist')
})
```

**5. Deploy**
```bash
git add .
git commit -m "feat: adicionar telefone do inquilino"
git push origin main
```

---

## 📁 Estrutura de Arquivos

```
gestao-alugueis/
├── index.html                 ← HTML principal + CSS inline
├── README.md                  ← Esta documentação
├── package.json               ← Dependências NPM (Cypress)
├── cypress/
│   └── e2e/
│       ├── 01-auth.cy.js
│       ├── 02-navigation.cy.js
│       ├── 07-detail-panel.cy.js
│       ├── 08-condominio.cy.js
│       └── 10-despesas.cy.js
├── js/
│   ├── auth.js                ← OAuth, sessão
│   ├── state.js               ← Global state
│   ├── utils.js               ← Utilidades
│   ├── tenant-financials.js   ← Cálculos
│   ├── imovel.js              ← Propriedades
│   ├── condo.js               ← Condomínios
│   ├── tenant-ui.js           ← Dashboard
│   ├── detail-panel.js        ← Painel inquilino
│   ├── payment-modal.js       ← Tabela pagamentos
│   ├── whatsapp.js            ← WhatsApp
│   ├── report.js              ← Relatórios
│   ├── tenant-modal.js        ← Modal add/edit inquilino
│   ├── navigation.js          ← Roteamento
│   ├── clientes-adv.js        ← Clientes advogado
│   ├── doc-gen.js             ← Geração documentos
│   ├── financeiro.js          ← Despesas/receitas
│   ├── recibo.js              ← Recibos
│   └── storage.js             ← Persistência + INIT
└── drive-loader.js            ← Google Drive helper
└── sync-engine.js             ← Offline sync queue
```

---

## 🔐 Segurança & Credenciais

### Desenvolvimento
```javascript
// .env (NÃO commitar!)
GOOGLE_CLIENT_ID=abc123.apps.googleusercontent.com
```

### Produção
- OAuth com Google ✅
- localStorage com chave única ✅
- Sem hardcoded credentials ✅
- Drive como backup seguro ✅

### Checklist Segurança
- [ ] Nunca commitar `.env` ou credenciais
- [ ] HTTPS em produção
- [ ] Validar entrada de usuário
- [ ] Rate limit Google Drive API
- [ ] Criptografia de dados sensíveis (CPF, etc) — *futura implementação*

---

## 🚀 Deployment

### Opção 1: Vercel (Recomendado)
```bash
npm i -g vercel
vercel
```

### Opção 2: GitHub Pages
```bash
git push origin main
# Settings → Pages → Deploy from branch
```

### Opção 3: Seu servidor
```bash
scp -r . seu-servidor:/var/www/gestao-alugueis
# Configure nginx/Apache para servir index.html
```

---

## 📊 Métricas & Performance

| Métrica | Valor |
|---------|-------|
| Arquivo raw | 416 KB |
| Arquivo gzipped | 87.7 KB |
| Time to Interactive | ~2-3s |
| Linhas código | 7.141 |
| Módulos JS | 18 |
| Testes E2E | 43/43 ✅ |
| Cobertura | 80%+ |

---

## 🗓️ Fases Concluídas

- ✅ **Phase 0**: Data extraction
- ✅ **Phase 1**: Google Drive OAuth
- ✅ **Phase 2**: Bidirectional sync
- ✅ **Phase 3**: Remove hardcoded data (-86 KB)
- ✅ **Phase 4**: Refactoring & utilities
- ✅ **Phase 5**: E2E testing (Cypress)
- ✅ **Phase 7**: Modularização (18 módulos)
- ✅ **Phase 8**: UX/Design Polish (animations, a11y, dark mode)

## 🔄 Próximas Fases

- 🔜 **Phase 6**: PWA Offline (Service Workers, install como app)
- 🎯 **Phase 9**: Backend + Database (futuro)
- 📱 **Phase 10**: Mobile app (futuro)

---

## 🤝 Contribuindo

1. Fork este repositório
2. Crie branch: `git checkout -b feat/sua-feature`
3. Commit: `git commit -m "feat: descrição"`
4. Teste: `npm test`
5. Push: `git push origin feat/sua-feature`
6. Abra Pull Request

---

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/gestao-alugueis/issues)
- **Email**: seu-email@example.com
- **Documentação interna**: `/home/lucas/.claude/projects/.../memory/`

---

## 📄 Licença

Proprietary — Lucas Prado Medeiros Perin

---

**Última atualização:** 2026-04-23  
**Versão:** v2.0.0  
**Status:** Production-Ready (Phase 7 + 8)
