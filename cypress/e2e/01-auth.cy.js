describe('Login Flow', () => {
  it('shows login screen when unauthenticated', () => {
    cy.visit('/')
    cy.get('#login-screen').should('not.have.class', 'hidden')
    cy.get('#login-pass').should('be.visible')
    cy.get('.login-btn').should('be.visible')
  })

  it('bypasses login screen when valid session exists', () => {
    cy.visitApp()   // uses skipAuth:true default
    cy.get('#login-screen').should('have.class', 'hidden')
    cy.get('#page-dashboard').should('have.class', 'active')
  })

  it('shows dashboard immediately after auth bypass', () => {
    cy.visitApp()
    // All main UI should be visible
    cy.get('.topbar').should('be.visible')
    cy.get('.sidebar').should('be.visible')
    cy.get('#page-dashboard').should('be.visible')
  })

  it('localStorage and sessionStorage are injected correctly', () => {
    cy.visitApp()
    cy.window().then(win => {
      const stored = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
      expect(stored).to.have.property('tenants')
      expect(stored).to.have.property('version', 4)

      const sess = JSON.parse(win.sessionStorage.getItem('ga_auth_v1'))
      expect(sess).to.have.property('hash')
      expect(sess).to.have.property('expires')
    })
  })
})
