describe('CRUD Imóveis', () => {
  beforeEach(() => {
    cy.visitApp()
    cy.navigateTo('imoveis')
  })

  it('renders imoveis page', () => {
    cy.get('#page-imoveis').should('have.class', 'active')
    cy.get('#imoveis-grid, [id*="imovel"]').should('exist')
  })

  it('opens add imovel modal via button', () => {
    cy.get('[onclick="openAddImovel()"], [onclick*="novoImovel"]').first().click()
    cy.assertModalOpen('imovel-modal-overlay')
  })

  it('closes add imovel modal', () => {
    cy.get('[onclick="openAddImovel()"], [onclick*="novoImovel"]').first().click()
    cy.assertModalOpen('imovel-modal-overlay')
    cy.get('[onclick*="closeAddImovel"], [onclick="closeOverlay(\'imovel-modal-overlay\')"]').first().click()
    cy.assertModalClosed('imovel-modal-overlay')
  })

  it('creates a new imovel', () => {
    cy.get('[onclick="openAddImovel()"], [onclick*="novoImovel"]').first().click()
    cy.get('#im-nome').clear().type('Casa E2E Teste')
    cy.get('#im-tipo').then(el => {
      if (el.length) cy.get('#im-tipo').select('Casa')
    })
    cy.get('#im-end').clear().type('Rua dos Testes, 42')
    cy.get('#im-prop-nome').clear().type('Proprietário Test')
    cy.get('[onclick="saveImovel()"]').click()
    cy.get('@alert').should('have.been.called')
    cy.assertModalClosed('imovel-modal-overlay')
    cy.get('#page-imoveis').should('contain.text', 'Casa E2E Teste')
  })

  it('validates required fields on imovel save', () => {
    cy.get('[onclick="openAddImovel()"], [onclick*="novoImovel"]').first().click()
    cy.get('[onclick="saveImovel()"]').click()
    cy.get('@alert').should('have.been.called')
  })

  it('localStorage updated after imovel creation', () => {
    cy.get('[onclick="openAddImovel()"], [onclick*="novoImovel"]').first().click()
    cy.get('#im-nome').clear().type('Imovel Storage Test')
    cy.get('#im-end').clear().type('Endereço Teste')
    cy.get('#im-prop-nome').clear().type('Proprietário')
    cy.get('[onclick="saveImovel()"]').click()
    cy.window().then(win => {
      const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
      expect(data.imoveis).to.be.an('array')
      expect(data.imoveis.length).to.be.greaterThan(0)
    })
  })
})
