/* ============================================================
   Atlas — Pricing Page JS
   ============================================================ */

// ── Theme Toggle ──────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('atlas-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlas-theme', next);
});

// ── Navbar ────────────────────────────────────────────────────
const navbar   = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 10), { passive: true });
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('active');
  });
});

// ── Billing Toggle ────────────────────────────────────────────
const toggleSwitch  = document.getElementById('toggleSwitch');
const labelMonthly  = document.getElementById('labelMonthly');
const labelAnnual   = document.getElementById('labelAnnual');
const proNote       = document.getElementById('proAnnualNote');
const eliteNote     = document.getElementById('eliteAnnualNote');
let isAnnual = false;

function updatePrices() {
  document.querySelectorAll('.price-amount[data-monthly]').forEach(el => {
    const price = isAnnual ? el.dataset.annual : el.dataset.monthly;
    el.textContent = `$${price}`;
  });
  [proNote, eliteNote].forEach(n => { if (n) n.style.display = isAnnual ? 'block' : 'none'; });
  labelMonthly.classList.toggle('selected', !isAnnual);
  labelAnnual.classList.toggle('selected', isAnnual);
}

toggleSwitch.addEventListener('click', () => {
  isAnnual = !isAnnual;
  toggleSwitch.setAttribute('aria-checked', isAnnual);
  updatePrices();
});

// Initialise label state
labelMonthly.classList.add('selected');
updatePrices();

// ── FAQ Accordion ─────────────────────────────────────────────
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    // Close all
    document.querySelectorAll('.faq-question').forEach(b => {
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling.classList.remove('open');
    });
    // Open clicked (unless it was already open)
    if (!expanded) {
      btn.setAttribute('aria-expanded', 'true');
      btn.nextElementSibling.classList.add('open');
    }
  });
});

// ── Back to top ───────────────────────────────────────────────
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── Modals (shared content) ───────────────────────────────────
const MODAL_CONTENT = {
  about: {
    title: 'About Atlas',
    body: `
      <p>Atlas is the definitive guide to America's best driving roads — built by enthusiasts, for enthusiasts.</p>
      <h4>Our Mission</h4>
      <p>There are thousands of incredible roads in America that most drivers will never discover. Atlas exists to change that.</p>
      <h4>What We Build</h4>
      <ul>
        <li>1,200+ mapped and rated driving roads across all 50 states</li>
        <li>Real-time road condition alerts and seasonal closure tracking</li>
        <li>Elevation profiles and technical difficulty ratings</li>
        <li>Community-driven reviews from 85,000+ active drivers</li>
      </ul>
      <p style="margin-top:1.5rem;color:var(--color-text-muted);font-size:0.9rem;">Founded in 2022 &middot; Headquartered in Asheville, NC</p>
    `,
  },
  blog: {
    title: 'Blog',
    body: `
      <div class="modal-blog-list">
        <article class="modal-blog-post">
          <span class="modal-blog-date">March 20, 2026</span>
          <h4>The 10 Best Driving Roads in America for 2026</h4>
          <p>We crunched 4.2 million community reviews to find the roads that consistently blow drivers away.</p>
        </article>
        <article class="modal-blog-post">
          <span class="modal-blog-date">March 5, 2026</span>
          <h4>Beartooth Highway: Everything You Need to Know</h4>
          <p>Opening dates, road conditions, best pullouts, and why Charles Kuralt called it the most beautiful road in America.</p>
        </article>
        <article class="modal-blog-post">
          <span class="modal-blog-date">February 1, 2026</span>
          <h4>Spring Road Season Preview: What's Opening in 2026</h4>
          <p>Going-to-the-Sun, Trail Ridge Road, Beartooth — which high-altitude roads are opening early this year.</p>
        </article>
      </div>
    `,
  },
  privacy: {
    title: 'Privacy Policy',
    body: `<p><em>Effective date: January 1, 2026</em></p><h4>Information We Collect</h4><p>Atlas collects only the information necessary to provide our services, including account data and anonymised usage analytics.</p><h4>We Never Sell Your Data</h4><p>Atlas does not sell, rent, or share your personal information with third parties for marketing purposes.</p><h4>Contact</h4><p>Questions? Email <a href="mailto:privacy@atlas.app">privacy@atlas.app</a>.</p>`,
  },
  terms: {
    title: 'Terms of Service',
    body: `<p><em>Effective date: January 1, 2026</em></p><h4>Acceptance</h4><p>By using Atlas, you agree to these terms. Subscriptions auto-renew until cancelled. You may cancel at any time.</p><h4>Contact</h4><p>Questions? Email <a href="mailto:legal@atlas.app">legal@atlas.app</a>.</p>`,
  },
  cookies: {
    title: 'Cookie Policy',
    body: `<p><em>Effective date: January 1, 2026</em></p><h4>What We Use</h4><table class="modal-table"><thead><tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr></thead><tbody><tr><td>atlas-theme</td><td>Light/dark mode preference</td><td>1 year</td></tr></tbody></table><p>Questions? Email <a href="mailto:privacy@atlas.app">privacy@atlas.app</a>.</p>`,
  },
};

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle   = document.getElementById('modalTitle');
const modalBody    = document.getElementById('modalBody');
const modalClose   = document.getElementById('modalClose');

function openModal(key) {
  const content = MODAL_CONTENT[key];
  if (!content) return;
  modalTitle.textContent = content.title;
  modalBody.innerHTML    = content.body;
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}
function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-modal]').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); openModal(link.dataset.modal); });
});
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal(); });
