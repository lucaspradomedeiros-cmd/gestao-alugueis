describe('Condomínio Page', () => {
  beforeEach(() => {
    cy.visitApp()
    cy.navigateTo('condominio')
  })

  it('renders condominio page', () => {
    cy.get('#page-condominio').should('have.class', 'active')
  })

  it('renders condo info bar with name and units', () => {
    cy.get('#condo-info-bar, [id*="condo"]').should('exist')
    cy.get('#cib-nome, [id*="condo-name"]').should('not.be.empty')
  })

  it('renders condo switcher tabs', () => {
    cy.get('#condo-switcher').should('exist')
    cy.get('#condo-switcher .condo-tab-btn').should('have.length.greaterThan', 0)
  })

  it('renders expense input fields', () => {
    const fields = ['agua-valor', 'energia-valor', 'limpeza-valor', 'iptu-valor']
    fields.forEach(id => {
      cy.get(`#${id}`).should('exist')
    })
  })

  it('has month selector for condominio data', () => {
    cy.get('#condo-month').should('exist')
  })

  it('saves a condo month entry', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    cy.get('#condo-month').invoke('val', currentMonth).trigger('change')
    cy.get('#agua-valor').clear().type('280')
    cy.get('#energia-valor').clear().type('65')
    cy.get('#limpeza-valor').clear().type('330')
    cy.get('[onclick="saveCondoMonth()"]').click()
    cy.get('@alert').should('have.been.called')
  })

  it('renders condo result display (R$ totals)', () => {
    const resultFields = ['r-agua', 'r-energia', 'r-limpeza', 'r-tot']
    resultFields.forEach(id => {
      cy.get(`#${id}, [id*="result"]`).should('exist')
    })
  })

  it('renders condo history section', () => {
    cy.get('#condo-hist-body, [id*="history"]').should('exist')
  })

  it('localStorage updated after condo month save', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    cy.get('#condo-month').invoke('val', currentMonth).trigger('change')
    cy.get('#agua-valor').clear().type('300')
    cy.get('[onclick="saveCondoMonth()"]').click()
    cy.window().then(win => {
      const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
      expect(data.condoHistory).to.be.an('array')
    })
  })
})
