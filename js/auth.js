// ── AUTH ─────────────────────────────────────────────────────
const PASS_HASH = '3928a0d0aa4278d86016a7ef568939ec2f7d3eafc77713e6cc5186884f917a33';
const SESSION_KEY = 'ga_auth_v1';
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 horas

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function isAuthenticated() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { hash, expires } = JSON.parse(raw);
    return hash === PASS_HASH && Date.now() < expires;
  } catch { return false; }
}

function saveSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    hash: PASS_HASH,
    expires: Date.now() + SESSION_TTL
  }));
}

async function doLogin() {
  const inp = document.getElementById('login-pass');
  const err = document.getElementById('login-err');
  const val = inp.value;
  if (!val) { inp.classList.add('error'); err.textContent = 'Digite a senha.'; return; }
  const h = await sha256(val);
  if (h === PASS_HASH) {
    saveSession();
    document.getElementById('login-screen').classList.add('hidden');
    inp.value = '';
    err.textContent = '';
  } else {
    inp.classList.add('error');
    err.textContent = 'Senha incorreta. Tente novamente.';
    inp.value = '';
    inp.focus();
  }
}

function checkAuth() {
  if (!isAuthenticated()) {
    document.getElementById('login-screen').classList.remove('hidden');
    setTimeout(() => {
      const inp = document.getElementById('login-pass');
      if (inp) inp.focus();
    }, 100);
  } else {
    document.getElementById('login-screen').classList.add('hidden');
  }
}

window.addEventListener('DOMContentLoaded', checkAuth);
