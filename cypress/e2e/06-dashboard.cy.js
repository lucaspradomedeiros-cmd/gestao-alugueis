describe('Dashboard', () => {
  beforeEach(() => {
    cy.visitApp()
  })

  it('renders dashboard page by default', () => {
    cy.get('#page-dashboard').should('have.class', 'active')
    cy.get('#dash-cards').should('be.visible')
  })

  it('renders summary card grid with four cards', () => {
    const summaryCards = ['sum-receita', 'sum-ocup', 'sum-inad', 'sum-rej']
    summaryCards.forEach(id => {
      cy.get(`#${id}`).should('exist').should('be.visible')
    })
  })

  it('renders tenant cards in dash-cards container', () => {
    cy.get('#dash-cards .tenant-card').should('have.length.greaterThan', 0)
    cy.get('#dash-cards .tenant-card').first().should('be.visible')
  })

  it('tenant card has required elements: name, unit, phone', () => {
    cy.get('#dash-cards .tenant-card').first().then(card => {
      cy.wrap(card).find('.card-name').should('not.be.empty')
      cy.wrap(card).find('.card-unit').should('not.be.empty')
      cy.wrap(card).find('.card-tel').should('not.be.empty')
    })
  })

  it('tenant card shows status badge', () => {
    cy.get('#dash-cards .tenant-card').first().then(card => {
      cy.wrap(card).find('.s-badge').should('exist')
    })
  })

  it('clicking tenant card header opens detail panel', () => {
    cy.get('#dash-cards .tenant-card').not('.s-vago').first().find('.card-header').click()
    cy.get('#det-overlay').should('have.class', 'open')
  })

  it('tenant card billing section has input fields', () => {
    cy.get('#dash-cards .tenant-card').first().then(card => {
      const tenantId = card.attr('id') || card.find('[id*="ci-"]').first().attr('id').match(/\d+/)[0]
      if (tenantId) {
        cy.get(`#ci-aluguel-${tenantId}`).should('exist')
        cy.get(`#ci-total-${tenantId}`).should('exist')
      }
    })
  })

  it('saveCardCobr updates total display for a tenant', () => {
    cy.get('[id^="ci-aluguel-"]').first().then(el => {
      const id = el.attr('id').replace('ci-aluguel-', '')
      cy.get(`#ci-aluguel-${id}`).clear().type('1200')
      cy.get(`[onclick="saveCardCobr(${id})"]`).click()
      cy.get(`#ci-total-${id}`).should('contain.text', '1.200')
    })
  })

  it('billing card Salvar button calls saveCardCobr', () => {
    cy.get('[id^="ci-aluguel-"]').first().then(el => {
      const id = el.attr('id').replace('ci-aluguel-', '')
      cy.get(`#ci-aluguel-${id}`).clear().type('500')
      cy.get(`[onclick="saveCardCobr(${id})"]`).click()
      cy.get('@alert').should('have.been.called')
    })
  })

  it('has Cobrar (WhatsApp) button on cards', () => {
    cy.get('#dash-cards .tenant-card').first().then(card => {
      const hasWppBtn = card.find('[onclick*="openWpp"]').length > 0 ||
                        card.find('.btn-wpp').length > 0
      expect(hasWppBtn).to.be.true
    })
  })

  it('dashboard re-renders after payment registration', () => {
    const initialCount = cy.get('#dash-cards .tenant-card').then(cards => cards.length)

    cy.get('[onclick="openRegModal()"]').click()
    cy.get('#rm-tenant option').then(opts => {
      if (opts.length > 1) {
        cy.get('#rm-tenant').select(opts[1].value)
      }
    })
    cy.get('#rm-ref').clear().type('2026-04')
    cy.get('#rm-date').clear().type('2026-04-22')
    cy.get('#rm-value').clear().type('800')
    cy.get('[onclick="saveRegModal()"]').click()

    // Cards still exist after payment
    cy.get('#dash-cards .tenant-card').should('have.length.greaterThan', 0)
  })

  it('summary cards show numeric values or dashes', () => {
    cy.get('#sum-receita').then(el => {
      const text = el.text()
      expect(text).to.satisfy(txt => !txt.match(/[a-z]/i) || txt.includes('R$'))
    })
  })
})
