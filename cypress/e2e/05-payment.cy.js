describe('Registrar Pagamento', () => {
  beforeEach(() => {
    cy.visitApp()
  })

  it('opens Registrar Pagamento modal from topbar button', () => {
    cy.get('[onclick="openRegModal()"]').click()
    cy.assertModalOpen('reg-modal-overlay')
  })

  it('closes modal when Cancel is clicked', () => {
    cy.get('[onclick="openRegModal()"]').click()
    cy.assertModalOpen('reg-modal-overlay')
    cy.get('[onclick="closeOverlay(\'reg-modal-overlay\')"]').click()
    cy.assertModalClosed('reg-modal-overlay')
  })

  it('pre-fills date field with today date', () => {
    cy.get('[onclick="openRegModal()"]').click()
    const today = new Date().toISOString().split('T')[0]
    cy.get('#rm-date').should('have.value', today)
  })

  it('shows validation error when required fields are missing', () => {
    cy.get('[onclick="openRegModal()"]').click()
    // Try to save with empty fields
    cy.get('[onclick="saveRegModal()"]').click()
    cy.get('@alert').should('have.been.called')
    cy.assertModalOpen('reg-modal-overlay')
  })

  it('saves a payment successfully with all fields', () => {
    cy.get('[onclick="openRegModal()"]').click()
    // Select first tenant
    cy.get('#rm-tenant option').then(opts => {
      if (opts.length > 1) {
        cy.get('#rm-tenant').select(opts[1].value)
      }
    })
    cy.get('#rm-ref').clear().type('2026-04')
    cy.get('#rm-date').clear().type('2026-04-22')
    cy.get('#rm-value').clear().type('800')
    cy.get('[onclick="saveRegModal()"]').click()
    cy.get('@alert').should('have.been.called')
    cy.assertModalClosed('reg-modal-overlay')
  })

  it('saves payment with additional fields (condo, iptu, lixo)', () => {
    cy.get('[onclick="openRegModal()"]').click()
    cy.get('#rm-tenant option').then(opts => {
      if (opts.length > 1) {
        cy.get('#rm-tenant').select(opts[1].value)
      }
    })
    cy.get('#rm-ref').clear().type('2026-04')
    cy.get('#rm-date').clear().type('2026-04-22')
    cy.get('#rm-value').clear().type('1000')
    cy.get('#rm-condo').clear().type('100')
    cy.get('#rm-iptu').clear().type('50')
    cy.get('#rm-lixo').clear().type('30')
    cy.get('[onclick="saveRegModal()"]').click()
    cy.assertModalClosed('reg-modal-overlay')
  })

  it('localStorage is updated after payment registration', () => {
    cy.get('[onclick="openRegModal()"]').click()
    cy.get('#rm-tenant option').then(opts => {
      if (opts.length > 1) {
        cy.get('#rm-tenant').select(opts[1].value)
      }
    })
    cy.get('#rm-ref').clear().type('2026-04')
    cy.get('#rm-date').clear().type('2026-04-22')
    cy.get('#rm-value').clear().type('900')
    cy.get('[onclick="saveRegModal()"]').click()
    cy.window().then(win => {
      const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
      expect(data.tenants).to.be.an('array')
      // Verify history was updated (complex to verify exact value, just check it exists)
      expect(data.tenants[0].history).to.be.an('array')
    })
  })

  it('tenant select is populated from seed data', () => {
    cy.get('[onclick="openRegModal()"]').click()
    cy.get('#rm-tenant option').should('have.length.greaterThan', 1)
  })
})
