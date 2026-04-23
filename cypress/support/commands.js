const STORAGE_KEY = 'gestao_alugueis_v1'
const SESSION_KEY = 'ga_auth_v1'
const PASS_HASH   = '3928a0d0aa4278d86016a7ef568939ec2f7d3eafc77713e6cc5186884f917a33'

/**
 * cy.visitApp(options?)
 *
 * Core helper: stubs alert/confirm, injects auth session, seeds localStorage,
 * and intercepts all Google API network calls.
 *
 * options:
 *   skipAuth  {boolean} - default true. If false, does NOT inject session (for auth tests)
 *   seed      {object}  - override fixture data. If omitted, loads cypress/fixtures/seed.json
 */
Cypress.Commands.add('visitApp', (options = {}) => {
  const { skipAuth = true, seed } = options

  // Load seed fixture then visit
  const loadSeed = seed
    ? cy.wrap(seed)
    : cy.fixture('seed.json')

  loadSeed.then((data) => {
    cy.visit('/', {
      onBeforeLoad(win) {
        // ── 1. Stub window.alert (prevents test hangs on alert() calls) ──
        cy.stub(win, 'alert').as('alert')

        // ── 2. Stub window.confirm (auto-accepts all confirmation dialogs) ──
        cy.stub(win, 'confirm').returns(true).as('confirm')

        // ── 3. Inject localStorage data BEFORE app scripts run ──
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

        // ── 4. Inject auth session if skipAuth=true ──
        if (skipAuth) {
          win.sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            hash: PASS_HASH,
            expires: Date.now() + 8 * 60 * 60 * 1000
          }))
        }
      }
    })

    // ── 5. Stub Google Drive / Google APIs (prevent real network calls) ──
    cy.intercept('GET', 'https://apis.google.com/**', { statusCode: 200, body: '' }).as('gapiLoad')
    cy.intercept('GET', 'https://accounts.google.com/**', { statusCode: 200, body: '' }).as('gisLoad')
    cy.intercept('POST', 'https://www.googleapis.com/**', { statusCode: 401, body: {} }).as('driveApi')
    cy.intercept('GET', 'https://www.googleapis.com/**', { statusCode: 401, body: {} }).as('driveRead')
  })
})

/**
 * cy.navigateTo(pageId)
 * Click the sidebar nav item for a given page id.
 * pageId matches showPage() argument: 'imoveis', 'tenants', 'alerts', etc.
 */
Cypress.Commands.add('navigateTo', (pageId) => {
  cy.get(`[onclick="showPage('${pageId}')"]`).first().click()
  cy.get(`#page-${pageId}`).should('have.class', 'active')
})

/**
 * cy.assertModalOpen(overlayId)
 * Assert that a modal overlay is currently visible.
 */
Cypress.Commands.add('assertModalOpen', (overlayId) => {
  cy.get(`#${overlayId}`).should('have.class', 'open')
})

/**
 * cy.assertModalClosed(overlayId)
 * Assert that a modal overlay is currently hidden.
 */
Cypress.Commands.add('assertModalClosed', (overlayId) => {
  cy.get(`#${overlayId}`).should('not.have.class', 'open')
})

/**
 * cy.assertToast(text?)
 * Assert the toast is visible, optionally check text.
 */
Cypress.Commands.add('assertToast', (text) => {
  cy.get('#ga-toast').should('have.class', 'show')
  if (text) cy.get('#ga-toast').should('contain.text', text)
})
