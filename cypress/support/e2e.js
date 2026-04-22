import './commands'

// ── Suppress uncaught exceptions from app (Google API load failures, etc.) ──
Cypress.on('uncaught:exception', (err) => {
  // Allow the test to continue if Google APIs fail to load in test env
  if (
    err.message.includes('gapi') ||
    err.message.includes('google') ||
    err.message.includes('DRIVE_LOADER') ||
    err.message.includes('SYNC_ENGINE') ||
    err.message.includes('Chart')
  ) {
    return false
  }
  // Let all other real errors propagate and fail the test
  return true
})
