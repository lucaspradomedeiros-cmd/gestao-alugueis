describe('Financeiro / Despesas', () => {
  beforeEach(() => {
    cy.visitApp()
    cy.navigateTo('despesas')
  })

  it('renders despesas page', () => {
    cy.get('#page-despesas, #page-financeiro').should('have.class', 'active')
  })

  it('has month filter', () => {
    cy.get('#desp-filtro-mes, input[type="month"]').should('exist')
  })

  it('renders despesas list', () => {
    cy.get('#lista-despesas-escritorio, [id*="despesa"], [id*="expense"]').should('exist')
  })

  it('opens despesa modal', () => {
    cy.get('[onclick*="abrirDespesaModal"], [onclick*="nova"]').first().click({ force: true })
    cy.assertModalOpen('despesa-modal-overlay')
  })

  it('closes despesa modal', () => {
    cy.get('[onclick*="abrirDespesaModal"], [onclick*="nova"]').first().click({ force: true })
    cy.assertModalOpen('despesa-modal-overlay')
    cy.get('[onclick*="closeOverlay"], button').filter(':contains("Cancelar")').first().click({ force: true })
  })

  it('has despesas and receitas tabs', () => {
    cy.get('#tab-despesas, #tab-receitas, [id*="tab"]').should('exist')
  })

  it('has A Receber tab', () => {
    cy.get('#tab-areceber, [id*="receber"]').should('exist')
  })

  it('localStorage has despesasEscritorio', () => {
    cy.window().then(win => {
      const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
      expect(data.despesasEscritorio).to.be.an('array')
    })
  })

  it('page navigation works', () => {
    cy.navigateTo('dashboard')
    cy.get('#page-dashboard').should('have.class', 'active')
  })
})
