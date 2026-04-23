describe('Detail Panel', () => {
  beforeEach(() => cy.visitApp())

  it('opens detail panel on card click', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#det-overlay').should('have.class', 'open')
  })

  it('shows tenant info in header', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#d-unit, [id*="detail"]').should('exist')
  })

  it('has period tabs', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#tab-todos, #tab-6m, #tab-ano').should('exist')
  })

  it('switches between tabs', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#tab-6m').click()
    cy.get('#tab-6m').should('have.class', 'active')
  })

  it('shows payment history', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#det-body').should('exist')
  })

  it('closes panel via close button', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('.det-close, [onclick*="closeOverlay"]').first().click()
    cy.get('#det-overlay').should('not.have.class', 'open')
  })

  it('closes panel via backdrop', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#det-overlay').click({ force: true })
    cy.get('#det-overlay').should('not.have.class', 'open')
  })

  it('custom period tab exists', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#tab-custom').should('exist')
  })
})
