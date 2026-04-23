// ============================================================
// PURE UTILITY FUNCTIONS
// ============================================================

// Number utilities
function R(v) {
  return typeof v === 'number' ? v : parseFloat(v) || 0;
}

function R2(n) {
  return Math.round(n * 100) / 100;
}

// Formatting utilities
function fmtBRL(v) {
  if (v === null || v === undefined || v === '') return '—';
  return 'R$ ' + R(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function numBRL(v) {
  return R(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function fmtDate(s) {
  if (!s) return '—';
  const p = s.split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  if (p.length === 2) return `${p[1]}/${p[0]}`;
  return s;
}

// Text utilities
function initials(n) {
  const p = n.trim().split(' ').filter(x => x.length > 1);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase();
}

// Date utilities
function monthName(ref) {
  if (!ref) return '—';
  const [y, m] = ref.split('-');
  return `${MN[parseInt(m)]} ${y}`;
}

function nextMonth(ref) {
  const [y, m] = ref.split('-');
  let nm = parseInt(m) + 1;
  let ny = parseInt(y);
  if (nm > 12) {
    nm = 1;
    ny++;
  }
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

function daysUntilReajuste(t) {
  if (!t.reajuste) return null;
  return Math.round((new Date(t.reajuste) - TODAY) / 86400000);
}

function daysDiff(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

// Array/data utilities
function totalExtras(h) {
  return h && h.extras ? h.extras.reduce((s, e) => s + R(e.valor), 0) : 0;
}

// Data model queries
function getImovel(id) {
  return imoveis.find(x => x.id === id);
}

function despCatIcon(cat) {
  return {
    iptu: '🏛',
    lixo: '🗑',
    agua_energia: '💧',
    seguro: '🛡',
    manutencao: '🔧',
    outra: '📌'
  }[cat] || '📌';
}

function respLabel(r) {
  return {
    inquilino: 'Inquilino',
    proprietario: 'Proprietário',
    imobiliaria: 'Imobiliária'
  }[r] || r;
}

// Compute monthly installments that are active for a given ref month
function getDespesasAtivas(imovelId, ref) {
  const im = getImovel(imovelId);
  if (!im || im.gestao !== 'autonomo') return [];
  return (im.despesas || []).filter(d => {
    if (!d.ativo) return false;
    if (d.inicio && ref < d.inicio) return false;
    if (d.recorr === 'unico' && d.inicio && ref !== d.inicio) return false;
    if (d.recorr === 'parcelado') {
      if (d.inicio && ref < d.inicio) return false;
      if (d.fim && ref > d.fim) return false;
    }
    return true;
  });
}

// Get taxa configuration for a condo
function getCondoTaxas(condoId) {
  const c = condominios.find(x => x.id === (condoId || activeCondoId));
  const def = { aplicar: true, pct: 10 };
  const t = c?.taxas || {};
  return {
    agua: { ...def, ...(t.agua || {}) },
    energia: { ...def, ...(t.energia || {}) },
    limpeza: { ...def, ...(t.limpeza || {}) },
    lixo: { ...def, ...(t.lixo || {}) },
    iptu: { ...def, ...(t.iptu || {}) },
    outras: { ...def, ...(t.outras || {}) }
  };
}

// Apply taxa based on configuration
function applyTaxa(valor, cfg) {
  return cfg.aplicar ? R2(valor * (cfg.pct / 100)) : 0;
}
