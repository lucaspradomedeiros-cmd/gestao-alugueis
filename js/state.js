// ============================================================
// GLOBAL STATE VARIABLES
// ============================================================

// Imoveis
let imoveis = [];
let despesasEscritorio = [];
let receitasEscritorio = [];
let clientesAdv = [];
let editingImovelId = null;
let editingDespId = null;
let idetImovelId = null;
let idetTab = 'despesas';

// Condomínios
let condominios = [];
let condoHistories = {};
let activeCondoId = 'c1';
let editingCondoId = null;

// Condo units and history
let CONDO_UNITS = [];
let condoHistory = [];

// Tenants
let tenants = [];

// Payment modal
let editPayTenantId = null;
let editPayRef = null;

// Detail panel
let detTenantId = null;
let detPeriod = 'todos';
let detHighRef = null;

// WhatsApp
let regFromDetId = null;
let wppTid = null;

// Reports
let activeReportTab = 'receitas';

// Tenant modal
let editingTenantId = null;

// Clientes ADV
let clienteAdvAtualId = null;
let _editCliId = null;
let _editProcId = null;
let _editSvId = null;
let _pagBlocoId = null;
let _pagIdx = null;

// Document generation
let _gerarDocClienteId = null;

// Toast
let _gaToastTimer = null;

// Despesas/Receitas
let _editandoDespId = null;
let _finTab = 'despesas';
let _editandoRecId = null;
let _areceberFiltro = 'todas';
let _resultadoDetalhado = false;
let _compAno = new Date().getFullYear();
let _compChart = null;

// Recibo
let reciboTid = null;

// Google Drive and API
let driveConnected = false;
let _driveDebounce = null;
let gapiReady = false;
let gisReady = false;
let tokenClient = null;

// ============================================================
// CONSTANTS
// ============================================================

const TODAY = new Date();
const TAX = 0.10; // fallback legado
const MULTA_RATE = 0.10; // 10% flat
const JUROS_RATE = 0.01 / 30; // 1% ao mês = ~0.0333% ao dia

const MN = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const OWNER_NAME = 'Lucas Prado Medeiros Perin';
const OWNER_CPF = 'CPF 702.738.471-04';
const PIX_NAME = OWNER_NAME;
const PIX_KEY = OWNER_CPF;

const STATUS_LABELS = {
  pago: 'Em dia',
  pendente: 'Pendente',
  inadimplente: 'Inadimplente',
  parcial: 'Parcial',
  futuro: 'A vencer',
  vago: 'Vago'
};

const LIMPEZA_PADRAO = 330;
