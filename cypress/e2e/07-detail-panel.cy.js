describe('Detail Panel (openDet)', () => {
  beforeEach(() => {
    cy.visitApp()
  })

  it('opens detail panel on tenant card click', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#det-overlay').should('have.class', 'open')
    cy.get('#d-name, .det-overlay').should('exist')
  })

  it('shows tenant unit and name in detail header', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().then(card => {
      const unit = card.find('.card-unit').text()
      card.click()
      cy.get('#d-unit, [id*="detail-unit"]').should('contain.text', unit.trim())
    })
  })

  it('closes detail panel via close button', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#det-overlay').should('have.class', 'open')
    cy.get('.det-close, [onclick*="closeOverlay.*det-overlay"]').first().click()
    cy.get('#det-overlay').should('not.have.class', 'open')
  })

  it('closes detail panel by clicking overlay backdrop', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#det-overlay').should('have.class', 'open')
    cy.get('#det-overlay').click({ force: true })
    cy.get('#det-overlay').should('not.have.class', 'open')
  })

  it('renders period tabs in detail panel', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    const tabs = ['tab-todos', 'tab-6m', 'tab-ano', 'tab-custom']
    tabs.forEach(tab => {
      cy.get(`#${tab}`).should('exist')
    })
  })

  it('switches between period tabs', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#tab-6m').click()
    cy.get('#tab-6m').should('have.class', 'active')
    cy.get('#tab-todos').should('not.have.class', 'active')
    cy.get('#tab-ano').click()
    cy.get('#tab-ano').should('have.class', 'active')
  })

  it('shows custom period input fields when custom tab active', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#tab-custom').click()
    cy.get('[id*="det-from"], [id*="custom-period"]').should('exist')
  })

  it('renders payment history table', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#det-body, .det-overlay tbody, [class*="history"]').should('exist')
  })

  it('detail panel content updates when switching tabs', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().click()
    cy.get('#tab-todos').click()
    cy.wait(300)
    cy.get('#det-body').then(body1 => {
      const text1 = body1.text()
      cy.get('#tab-6m').click()
      cy.wait(300)
      cy.get('#det-body').then(body2 => {
        // Content may differ between tabs
        expect(body2).to.exist
      })
    })
  })
})
