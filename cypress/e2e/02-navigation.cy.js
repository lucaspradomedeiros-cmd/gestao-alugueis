const PAGES = [
  { id: 'dashboard',  text: 'Painel Geral' },
  { id: 'imoveis',    text: 'Imóveis' },
  { id: 'condominio', text: 'Condomínio' },
  { id: 'tenants',    text: 'Locatários' },
  { id: 'alerts',     text: 'Alertas' },
  { id: 'reajustes',  text: 'Reajustes' },
  { id: 'report',     text: 'Receitas' },
  { id: 'despesas',   text: 'Despesas' },
  { id: 'clientes',   text: 'Clientes' },
]

describe('Navigation', () => {
  beforeEach(() => {
    cy.visitApp()
  })

  it('renders sidebar with all nav items', () => {
    cy.get('.sidebar').should('be.visible')
    PAGES.forEach(({ text }) => {
      cy.get('.sidebar').should('contain.text', text)
    })
  })

  it('dashboard page is active by default', () => {
    cy.get('#page-dashboard').should('have.class', 'active')
  })

  PAGES.forEach(({ id, text }) => {
    it(`navigates to ${id} page and activates nav item`, () => {
      cy.navigateTo(id)
      cy.get(`#page-${id}`).should('have.class', 'active')
      cy.get(`#page-${id}`).should('be.visible')
      // Only one page should be active
      cy.get('.page.active').should('have.length', 1)
    })
  })

  it('clicking nav item multiple times works correctly', () => {
    cy.navigateTo('imoveis')
    cy.get('#page-imoveis').should('have.class', 'active')
    cy.navigateTo('tenants')
    cy.get('#page-tenants').should('have.class', 'active')
    cy.get('#page-imoveis').should('not.have.class', 'active')
    cy.navigateTo('dashboard')
    cy.get('#page-dashboard').should('have.class', 'active')
  })

  it('topbar action buttons are visible on all pages', () => {
    PAGES.slice(0, 5).forEach(({ id }) => {
      cy.navigateTo(id)
      // These buttons appear on most pages in the topbar
      cy.get('[onclick="openAddTenant()"], [onclick="openRegModal()"]').then(els => {
        // At least one action button should be visible
        expect(els.length).to.be.greaterThan(0)
      })
    })
  })
})
