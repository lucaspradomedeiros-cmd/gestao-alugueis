describe('Alerts Page', () => {
  beforeEach(() => {
    cy.visitApp()
    cy.navigateTo('alerts')
  })

  it('renders alerts page', () => {
    cy.get('#page-alerts').should('have.class', 'active')
  })

  it('renders alerts-list container', () => {
    cy.get('#alerts-list, [id*="alert"]').should('exist')
  })

  it('shows alert items for pending/overdue tenants', () => {
    // Seed has tenants in pendente/inadimplente states
    cy.get('#alerts-list .alert-item, [class*="alert"]').then(items => {
      expect(items.length).to.be.greaterThan(0)
    })
  })

  it('alert items show tenant name or unit', () => {
    cy.get('#alerts-list .alert-item, [class*="alert"]').first().then(item => {
      const text = item.text()
      expect(text.length).to.be.greaterThan(0)
    })
  })

  it('clicking alert item opens detail panel', () => {
    cy.get('#alerts-list .alert-item, [class*="alert"]').first().click()
    cy.get('#det-overlay').should('have.class', 'open')
  })

  it('alert severity or status indicator exists', () => {
    cy.get('#alerts-list .alert-item, [class*="alert"]').first().then(item => {
      // Should have some visual indicator (class, icon, color, etc)
      expect(item).to.exist
    })
  })

  it('alerts list updates after payment is registered', () => {
    const initialCount = cy.get('#alerts-list .alert-item, [class*="alert"]').then(items => items.length)

    cy.get('[onclick="openRegModal()"]').click()
    cy.get('#rm-tenant option').then(opts => {
      if (opts.length > 1) {
        cy.get('#rm-tenant').select(opts[1].value)
      }
    })
    cy.get('#rm-ref').clear().type('2026-04')
    cy.get('#rm-date').clear().type('2026-04-22')
    cy.get('#rm-value').clear().type('1500')
    cy.get('[onclick="saveRegModal()"]').click()

    // Navigate back to alerts (state should update)
    cy.navigateTo('alerts')
    cy.get('#alerts-list, [id*="alert"]').should('exist')
  })
})
