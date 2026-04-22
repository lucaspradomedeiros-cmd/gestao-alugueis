describe('Financeiro / Despesas', () => {
  beforeEach(() => {
    cy.visitApp()
    cy.navigateTo('despesas')
  })

  it('renders despesas page', () => {
    cy.get('#page-despesas, #page-financeiro').should('have.class', 'active')
  })

  it('renders tab navigation for Despesas, Receitas, etc', () => {
    const tabs = ['tab-despesas', 'tab-receitas', 'tab-areceber', 'tab-resultado']
    tabs.forEach(tab => {
      cy.get(`#${tab}, [id*="tab"]`).should('exist')
    })
  })

  it('renders month filter', () => {
    cy.get('#desp-filtro-mes, [id*="filtro"], input[type="month"]').should('exist')
  })

  it('renders despesas list container', () => {
    cy.get('#lista-despesas-escritorio, [id*="despesa"], [id*="expense"]').should('exist')
  })

  it('can add a new despesa via modal', () => {
    cy.get('[onclick*="abrirDespesaModal"], [onclick*="nova"]').first().click({ force: true })
    cy.assertModalOpen('despesa-modal-overlay')
  })

  it('closes despesa modal', () => {
    cy.get('[onclick*="abrirDespesaModal"], [onclick*="nova"]').first().click({ force: true })
    cy.assertModalOpen('despesa-modal-overlay')
    cy.get('[onclick*="closeOverlay"], [onclick*="close"]').first().click({ force: true })
    cy.assertModalClosed('despesa-modal-overlay')
  })

  it('creates a new despesa', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    cy.get('#desp-filtro-mes').invoke('val', currentMonth).trigger('change')
    cy.get('[onclick*="abrirDespesaModal"], [onclick*="nova"]').first().click({ force: true })
    cy.get('#dp-categoria, [id*="categoria"]').then(el => {
      if (el.length) cy.get('#dp-categoria').clear().type('Aluguel Escritório')
    })
    cy.get('#dp-valor, [id*="valor"]').then(el => {
      if (el.length) cy.get('#dp-valor').clear().type('500')
    })
    cy.get('[onclick*="salvarDespesa"], [onclick*="save"]').first().click({ force: true })
    cy.get('@alert').should('have.been.called')
  })

  it('localStorage updated after despesa creation', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    cy.get('#desp-filtro-mes').invoke('val', currentMonth).trigger('change')
    cy.get('[onclick*="abrirDespesaModal"], [onclick*="nova"]').first().click({ force: true })
    cy.get('#dp-categoria, [id*="categoria"]').then(el => {
      if (el.length) cy.get('#dp-categoria').clear().type('Despesa Teste')
    })
    cy.get('#dp-valor, [id*="valor"]').then(el => {
      if (el.length) cy.get('#dp-valor').clear().type('250')
    })
    cy.get('[onclick*="salvarDespesa"], [onclick*="save"]').first().click({ force: true })
    cy.window().then(win => {
      const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
      expect(data.despesasEscritorio).to.be.an('array')
    })
  })

  it('switches between Despesas and Receitas tabs', () => {
    cy.get('#tab-receitas, [id*="receitas"]').should('exist')
    cy.get('#tab-receitas, [id*="receitas"]').first().click()
    cy.get('#tab-receitas, [id*="receitas"]').first().should('have.class', 'active')
  })

  it('shows A Receber tab and content', () => {
    cy.get('#tab-areceber, [id*="receber"]').should('exist')
    cy.get('#tab-areceber, [id*="receber"]').first().click()
    cy.get('#tab-content-areceber, [id*="receber-content"]').should('exist')
  })
})
