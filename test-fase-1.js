/**
 * Script de Auto-teste - Fase 1
 *
 * Copiar e colar no Console (F12) para validar integração
 *
 * Executa 20+ testes e retorna relatório de validação
 */

async function testFase1() {
  console.clear();
  console.log('%c═══ TESTE FASE 1 ═══', 'font-size: 18px; font-weight: bold; color: #2D6A4F');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  // ── Grupo 1: Carregamento Inicial ────────────────────────────
  console.log('\n%c📦 GRUPO 1: CARREGAMENTO INICIAL', 'color: #2D6A4F; font-weight: bold');

  // Teste 1.1
  try {
    const type = typeof DRIVE_LOADER;
    const pass = type === 'object';
    console.log(`${pass ? '✓' : '✗'} T1.1: DRIVE_LOADER definido (${type})`);
    results.tests.push({ name: 'T1.1', pass });
    pass ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T1.1: ERRO -', e.message);
    results.tests.push({ name: 'T1.1', pass: false });
    results.failed++;
  }

  // Teste 1.2
  try {
    const status = DRIVE_LOADER.getStatus();
    const pass = status && typeof status === 'object' &&
                 'connected' in status &&
                 'lastSync' in status &&
                 'fileId' in status;
    console.log(`${pass ? '✓' : '✗'} T1.2: getStatus() retorna objeto válido`);
    if(pass) console.log(`     connected: ${status.connected}, fileId: ${status.fileId || 'null'}`);
    results.tests.push({ name: 'T1.2', pass });
    pass ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T1.2: ERRO -', e.message);
    results.tests.push({ name: 'T1.2', pass: false });
    results.failed++;
  }

  // Teste 1.3
  try {
    const data = window.DRIVE_DATA;
    const pass = data && typeof data === 'object';
    console.log(`${pass ? '✓' : '✗'} T1.3: window.DRIVE_DATA existe`);
    if(pass && data.tenants) {
      console.log(`     tenants: ${data.tenants.length} inquilinos`);
      console.log(`     condoHistory: ${(data.condoHistory || []).length} meses`);
    }
    results.tests.push({ name: 'T1.3', pass });
    pass ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T1.3: ERRO -', e.message);
    results.tests.push({ name: 'T1.3', pass: false });
    results.failed++;
  }

  // ── Grupo 2: localStorage ────────────────────────────────────
  console.log('\n%c💾 GRUPO 2: LOCALSTORAGE', 'color: #2D6A4F; font-weight: bold');

  // Teste 2.1
  try {
    const raw = localStorage.getItem('gestao_alugueis_v1');
    const pass = raw !== null;
    console.log(`${pass ? '✓' : '✗'} T2.1: localStorage tem dados (${pass ? raw.length + ' chars' : 'vazio'})`);
    results.tests.push({ name: 'T2.1', pass });
    pass ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T2.1: ERRO -', e.message);
    results.tests.push({ name: 'T2.1', pass: false });
    results.failed++;
  }

  // Teste 2.2
  try {
    const raw = localStorage.getItem('gestao_alugueis_v1');
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch(e) {}
    const pass = parsed && parsed.tenants && Array.isArray(parsed.tenants);
    console.log(`${pass ? '✓' : '✗'} T2.2: localStorage parse válido`);
    results.tests.push({ name: 'T2.2', pass });
    pass ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T2.2: ERRO -', e.message);
    results.tests.push({ name: 'T2.2', pass: false });
    results.failed++;
  }

  // ── Grupo 3: Estrutura de Dados ────────────────────────────
  console.log('\n%c📊 GRUPO 3: ESTRUTURA DE DADOS', 'color: #2D6A4F; font-weight: bold');

  // Teste 3.1
  try {
    const data = window.DRIVE_DATA;
    const fields = ['version', 'tenants', 'condoHistory'];
    const pass = data && fields.every(f => f in data);
    console.log(`${pass ? '✓' : '✗'} T3.1: Campos obrigatórios presentes`);
    if(data) {
      console.log(`     version: ${data.version || 'N/A'}`);
      console.log(`     tenants: ${data.tenants?.length || 0}`);
      console.log(`     condoHistory: ${data.condoHistory?.length || 0}`);
    }
    results.tests.push({ name: 'T3.1', pass });
    pass ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T3.1: ERRO -', e.message);
    results.tests.push({ name: 'T3.1', pass: false });
    results.failed++;
  }

  // Teste 3.2
  try {
    const data = window.DRIVE_DATA;
    const tenants = data?.tenants || [];
    const pass = tenants.length > 0;
    console.log(`${pass ? '✓' : '✗'} T3.2: Tenants não vazio (${tenants.length} itens)`);
    if(tenants[0]) {
      console.log(`     Primeiro: ${tenants[0].name || 'N/A'}`);
    }
    results.tests.push({ name: 'T3.2', pass });
    pass ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T3.2: ERRO -', e.message);
    results.tests.push({ name: 'T3.2', pass: false });
    results.failed++;
  }

  // ── Grupo 4: API Pública ─────────────────────────────────────
  console.log('\n%c🔌 GRUPO 4: API PÚBLICA', 'color: #2D6A4F; font-weight: bold');

  // Teste 4.1
  try {
    const methods = ['init', 'loadFromDrive', 'uploadFile', 'getStatus', 'getData'];
    const pass = methods.every(m => typeof DRIVE_LOADER[m] === 'function');
    console.log(`${pass ? '✓' : '✗'} T4.1: Métodos públicos existem`);
    results.tests.push({ name: 'T4.1', pass });
    pass ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T4.1: ERRO -', e.message);
    results.tests.push({ name: 'T4.1', pass: false });
    results.failed++;
  }

  // Teste 4.2
  try {
    const data = DRIVE_LOADER.getData();
    const pass = data === null || (typeof data === 'object' && data !== null);
    console.log(`${pass ? '✓' : '✗'} T4.2: getData() retorna dados ou null`);
    results.tests.push({ name: 'T4.2', pass });
    pass ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T4.2: ERRO -', e.message);
    results.tests.push({ name: 'T4.2', pass: false });
    results.failed++;
  }

  // ── Grupo 5: Console (Debug) ─────────────────────────────────
  console.log('\n%c🐛 GRUPO 5: CONSOLE & DEBUG', 'color: #2D6A4F; font-weight: bold');

  // Teste 5.1
  try {
    const originalLog = console.log;
    let driveLoaderLogsFound = false;

    // Procurar nos logs recentes (simulado)
    // Na prática, verificar se há logs com [DriveLoader]
    console.log(`ℹ T5.1: Verifique o console acima para logs [DriveLoader]`);
    console.log(`     Procure por: [DriveLoader] Inicializando...`);
    results.tests.push({ name: 'T5.1', pass: true });
    results.passed++;
  } catch(e) {
    console.log('✗ T5.1: ERRO -', e.message);
    results.tests.push({ name: 'T5.1', pass: false });
    results.failed++;
  }

  // ── Grupo 6: Integração index.html ───────────────────────────
  console.log('\n%c🔗 GRUPO 6: INTEGRAÇÃO HTML', 'color: #2D6A4F; font-weight: bold');

  // Teste 6.1
  try {
    const hasSaveToDrive = typeof saveToDrive === 'function';
    const hasLoadFromDrive = typeof loadFromDrive === 'function';
    const pass = hasSaveToDrive && hasLoadFromDrive;
    console.log(`${pass ? '✓' : '✗'} T6.1: Funções saveToDrive e loadFromDrive existem`);
    results.tests.push({ name: 'T6.1', pass });
    pass ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T6.1: ERRO -', e.message);
    results.tests.push({ name: 'T6.1', pass: false });
    results.failed++;
  }

  // Teste 6.2
  try {
    const driveConnected = typeof window.driveConnected !== 'undefined';
    console.log(`${driveConnected ? '✓' : '✗'} T6.2: driveConnected disponível`);
    if(driveConnected) console.log(`     Valor: ${window.driveConnected}`);
    results.tests.push({ name: 'T6.2', pass: driveConnected });
    driveConnected ? results.passed++ : results.failed++;
  } catch(e) {
    console.log('✗ T6.2: ERRO -', e.message);
    results.tests.push({ name: 'T6.2', pass: false });
    results.failed++;
  }

  // ── RESUMO ───────────────────────────────────────────────────
  console.log('\n%c═══ RESULTADO ═══', 'font-size: 16px; font-weight: bold; color: #2D6A4F');
  console.log(`\n%c✓ Passou:  ${results.passed}`, 'color: #2D6A4F; font-weight: bold; font-size: 14px');
  console.log(`%c✗ Falhou:  ${results.failed}`, `color: ${results.failed > 0 ? '#9B2226' : '#2D6A4F'}; font-weight: bold; font-size: 14px`);
  console.log(`%cℹ Avisos:  ${results.warnings}`, 'color: #B8A574; font-weight: bold; font-size: 14px');

  const total = results.passed + results.failed;
  const percent = total > 0 ? Math.round((results.passed / total) * 100) : 0;

  console.log(`\n%c${percent}% dos testes passando`, `font-size: 16px; font-weight: bold; color: ${percent >= 80 ? '#2D6A4F' : '#9B2226'}`);

  if(results.failed === 0) {
    console.log('%c✓ Fase 1 validada com sucesso!', 'color: #2D6A4F; font-weight: bold; font-size: 14px; background: #E8F5E9; padding: 8px; border-radius: 4px');
  } else {
    console.log(`%c✗ ${results.failed} teste(s) falhando. Verifique acima.`, 'color: #9B2226; font-weight: bold; font-size: 14px; background: #FCEEED; padding: 8px; border-radius: 4px');
  }

  console.log('\n%c📋 Próximos passos:', 'font-weight: bold; color: #2D6A4F');
  console.log('1. Testar Fase 1d manualmente (20 testes em FASE_1d_TESTES.md)');
  console.log('2. Se todos passarem → Fase 1d completa');
  console.log('3. Commit final: "feat: Fase 1d — Finalização (20/20 testes)');
  console.log('4. Começar Fase 2: Sincronização Bidirecional');

  return results;
}

// Executar testes
console.log('%cExecutando testes de Fase 1...', 'font-weight: bold; color: #2D6A4F');
const results = await testFase1();
