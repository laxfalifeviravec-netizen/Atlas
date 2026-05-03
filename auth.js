/* ============================================================
   Atlas — Authentication (Supabase Auth)
   Depends on: config.js (exposes `db`)
   ============================================================ */

// ── DOM references ────────────────────────────────────────────
const authBtn       = document.getElementById('authBtn');
const authOverlay   = document.getElementById('authOverlay');
const authClose     = document.getElementById('authClose');
const authTabs      = document.querySelectorAll('.auth-tab');
const loginForm     = document.getElementById('loginForm');
const signupForm    = document.getElementById('signupForm');
const loginError    = document.getElementById('loginError');
const signupError   = document.getElementById('signupError');
const userMenu      = document.getElementById('userMenu');
const userEmailEl   = document.getElementById('userEmail');
const logoutBtn     = document.getElementById('logoutBtn');

// ── State ─────────────────────────────────────────────────────
let currentUser = null;

// ── Open / close auth modal ───────────────────────────────────
function openAuth(tab = 'login') {
  authOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  switchTab(tab);
}

function closeAuth() {
  authOverlay.classList.remove('open');
  document.body.style.overflow = '';
  loginError.textContent  = '';
  signupError.textContent = '';
}

authBtn && authBtn.addEventListener('click', () => openAuth('login'));
authClose && authClose.addEventListener('click', closeAuth);
authOverlay && authOverlay.addEventListener('click', e => {
  if (e.target === authOverlay) closeAuth();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && authOverlay && authOverlay.classList.contains('open')) closeAuth();
});

// ── Tab switching ─────────────────────────────────────────────
function switchTab(name) {
  authTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  loginForm.classList.toggle('hidden',  name !== 'login');
  signupForm.classList.toggle('hidden', name !== 'signup');
}

authTabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

// ── Login ─────────────────────────────────────────────────────
loginForm && loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  const email    = loginForm.querySelector('[name="email"]').value.trim();
  const password = loginForm.querySelector('[name="password"]').value;

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = error.message;
  } else {
    closeAuth();
  }
});

// ── Sign-up ───────────────────────────────────────────────────
signupForm && signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  signupError.textContent = '';
  const name     = signupForm.querySelector('[name="name"]').value.trim();
  const email    = signupForm.querySelector('[name="email"]').value.trim();
  const password = signupForm.querySelector('[name="password"]').value;

  if (password.length < 8) {
    signupError.textContent = 'Password must be at least 8 characters.';
    return;
  }

  const { error } = await db.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) {
    signupError.textContent = error.message;
  } else {
    signupError.textContent = '';
    signupForm.reset();
    // Show confirmation message
    signupForm.innerHTML = `
      <div class="auth-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22,4 12,14.01 9,11.01"/>
        </svg>
        <p>Check your email to confirm your account, then sign in.</p>
      </div>`;
  }
});

// ── Logout ────────────────────────────────────────────────────
logoutBtn && logoutBtn.addEventListener('click', async () => {
  await db.auth.signOut();
  userMenu && userMenu.classList.add('hidden');
  authBtn  && authBtn.classList.remove('hidden');
});

// ── Update UI based on session ────────────────────────────────
function setAuthUI(session) {
  currentUser = session?.user ?? null;

  if (currentUser) {
    authBtn  && authBtn.classList.add('hidden');
    userMenu && userMenu.classList.remove('hidden');
    if (userEmailEl) {
      userEmailEl.textContent = currentUser.email;
    }
  } else {
    authBtn  && authBtn.classList.remove('hidden');
    userMenu && userMenu.classList.add('hidden');
  }

  // Fire a custom event so other modules can react
  document.dispatchEvent(new CustomEvent('atlas:authchange', { detail: { user: currentUser } }));
}

// ── Listen for auth state changes (primary source of truth) ──
db.auth.onAuthStateChange((_event, session) => setAuthUI(session));

// ── Boot: seed UI from stored session if listener hasn't fired ─
db.auth.getSession().then(({ data: { session } }) => {
  if (!currentUser) setAuthUI(session);
}).catch(() => {});

// ── Export helper ─────────────────────────────────────────────
function requireAuth(callback) {
  if (currentUser) {
    callback(currentUser);
  } else {
    openAuth('login');
  }
}
