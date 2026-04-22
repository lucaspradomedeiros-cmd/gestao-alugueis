describe('CRUD Locatários', () => {
  beforeEach(() => {
    cy.visitApp()
  })

  it('renders tenant cards on dashboard with correct status classes', () => {
    cy.get('#dash-cards').should('be.visible')
    cy.get('.tenant-card').should('have.length', 3)
    // Seed has tenant id=1 (pago), id=2 (pendente), id=3 (inadimplente)
    cy.get('.tenant-card.s-pago').should('exist')
    cy.get('.tenant-card.s-pendente').should('exist')
    cy.get('.tenant-card.s-inadimplente').should('exist')
  })

  it('displays tenant name and unit on card', () => {
    cy.get('#dash-cards .tenant-card').first().then(card => {
      const name = card.find('.card-name').text()
      const unit = card.find('.card-unit').text()
      expect(name).to.not.be.empty
      expect(unit).to.not.be.empty
    })
  })

  it('opens add tenant modal from topbar button', () => {
    cy.get('[onclick="openAddTenant()"]').click()
    cy.assertModalOpen('add-tenant-overlay')
    cy.get('.modal-title, #add-tenant-title').should('contain.text', 'Novo')
  })

  it('closes add tenant modal via cancel button', () => {
    cy.get('[onclick="openAddTenant()"]').click()
    cy.assertModalOpen('add-tenant-overlay')
    cy.get('[onclick="closeAddTenant()"]').click()
    cy.assertModalClosed('add-tenant-overlay')
  })

  it('creates a new tenant and renders it in dashboard', () => {
    cy.get('[onclick="openAddTenant()"]').click()
    cy.get('#f-unit-sel option').first().then(opt => {
      cy.get('#f-unit-sel').select(opt.val())
    })
    cy.get('#f-name').clear().type('Novo Locatário Cypress')
    cy.get('#f-tel').clear().type('67 9999-0001')
    cy.get('#f-rent').clear().type('950')
    cy.get('#f-start').clear().type('2026-01-01')
    cy.get('#f-vencto').clear().type('10')
    cy.get('#save-tenant-btn').click()
    cy.get('@alert').should('have.been.called')
    cy.assertModalClosed('add-tenant-overlay')
    // New tenant appears in dashboard
    cy.get('#dash-cards').should('contain.text', 'Novo Locatário Cypress')
  })

  it('validates required fields before saving tenant', () => {
    cy.get('[onclick="openAddTenant()"]').click()
    // Try to save without filling required fields
    cy.get('#save-tenant-btn').click()
    cy.get('@alert').should('have.been.called')
    cy.assertModalOpen('add-tenant-overlay')
  })

  it('opens edit tenant modal from tenants page', () => {
    cy.navigateTo('tenants')
    cy.get('.tenant-card').first().then(card => {
      card.find('[onclick*="openEditTenant"]').click()
    })
    cy.assertModalOpen('add-tenant-overlay')
    cy.get('.modal-title, #add-tenant-title').should('contain.text', 'Editar')
  })

  it('updates tenant name and persists to localStorage', () => {
    cy.navigateTo('tenants')
    cy.get('.tenant-card').first().then(card => {
      card.find('[onclick*="openEditTenant"]').click()
    })
    cy.get('#f-name').clear().type('Nome Atualizado Cypress')
    cy.get('#save-tenant-btn').click()
    cy.get('@alert').should('have.been.called')
    cy.assertModalClosed('add-tenant-overlay')
    cy.get('#dash-cards').should('contain.text', 'Nome Atualizado Cypress')
  })

  it('localStorage is updated after tenant changes', () => {
    cy.get('[onclick="openAddTenant()"]').click()
    cy.get('#f-unit-sel option').first().then(opt => {
      cy.get('#f-unit-sel').select(opt.val())
    })
    cy.get('#f-name').clear().type('Teste LocalStorage')
    cy.get('#f-tel').clear().type('67 9876-5432')
    cy.get('#f-rent').clear().type('1000')
    cy.get('#f-start').clear().type('2026-01-01')
    cy.get('#f-vencto').clear().type('15')
    cy.get('#save-tenant-btn').click()
    cy.window().then(win => {
      const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
      expect(data.tenants).to.be.an('array')
      expect(data.tenants.length).to.equal(4) // Original 3 + 1 new
    })
  })
})
