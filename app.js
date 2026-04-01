/* ============================================================
   Atlas — App JS
   ============================================================ */

// ── Theme Toggle ──────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('atlas-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlas-theme', next);
});

// ── Navbar scroll shadow ──────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// ── Mobile nav toggle ─────────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', open);
});

// Close nav when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ── Region tabs ───────────────────────────────────────────────
document.querySelectorAll('.region-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const region = tab.dataset.region;

    document.querySelectorAll('.region-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.region-panel').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    const panel = document.querySelector(`.region-panel[data-region="${region}"]`);
    if (panel) panel.classList.add('active');
  });
});

// ── Stats counter animation ───────────────────────────────────
function formatNumber(n, target) {
  if (target >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M+';
  if (target >= 1_000)     return (n / 1_000).toFixed(0) + 'K+';
  return n.toString();
}

function animateCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = formatNumber(current, target);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

// Trigger only when stats section enters viewport
const statsSection = document.getElementById('stats');
let statsAnimated = false;
const statsObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !statsAnimated) {
    statsAnimated = true;
    animateCounters();
    statsObserver.disconnect();
  }
}, { threshold: 0.3 });
statsObserver.observe(statsSection);

// ── Search ────────────────────────────────────────────────────
const PLACES = [
  { name: 'Paris, France',           type: 'City',      region: 'Europe'   },
  { name: 'Tokyo, Japan',            type: 'City',      region: 'Asia'     },
  { name: 'New York City, USA',      type: 'City',      region: 'Americas' },
  { name: 'London, UK',              type: 'City',      region: 'Europe'   },
  { name: 'Sydney, Australia',       type: 'City',      region: 'Oceania'  },
  { name: 'Cape Town, South Africa', type: 'City',      region: 'Africa'   },
  { name: 'Rio de Janeiro, Brazil',  type: 'City',      region: 'Americas' },
  { name: 'Barcelona, Spain',        type: 'City',      region: 'Europe'   },
  { name: 'Bali, Indonesia',         type: 'Island',    region: 'Asia'     },
  { name: 'Machu Picchu, Peru',      type: 'Landmark',  region: 'Americas' },
  { name: 'Santorini, Greece',       type: 'Island',    region: 'Europe'   },
  { name: 'Marrakech, Morocco',      type: 'City',      region: 'Africa'   },
  { name: 'Kyoto, Japan',            type: 'City',      region: 'Asia'     },
  { name: 'Cairo, Egypt',            type: 'City',      region: 'Africa'   },
  { name: 'Queenstown, New Zealand', type: 'City',      region: 'Oceania'  },
  { name: 'Great Barrier Reef',      type: 'Landmark',  region: 'Oceania'  },
  { name: 'Serengeti, Tanzania',     type: 'Park',      region: 'Africa'   },
  { name: 'Amazon Rainforest',       type: 'Region',    region: 'Americas' },
  { name: 'Himalayan Mountains',     type: 'Region',    region: 'Asia'     },
  { name: 'Northern Lights, Iceland','type': 'Landmark', region: 'Europe'  },
];

const pinIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
</svg>`;

const searchInput   = document.getElementById('searchInput');
const searchBtn     = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

function renderResults(query) {
  const q = query.trim().toLowerCase();
  searchResults.innerHTML = '';

  if (!q) return;

  const matches = PLACES.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.type.toLowerCase().includes(q) ||
    p.region.toLowerCase().includes(q)
  ).slice(0, 6);

  if (!matches.length) {
    searchResults.innerHTML = `<div class="search-empty">No results found for "<strong>${escapeHtml(query)}</strong>". Try a different search term.</div>`;
    return;
  }

  matches.forEach(place => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
      <div class="search-result-icon">${pinIconSVG}</div>
      <div>
        <div class="search-result-name">${highlightMatch(place.name, q)}</div>
        <div class="search-result-type">${place.type} &middot; ${place.region}</div>
      </div>
    `;
    searchResults.appendChild(item);
  });
}

function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx)) +
    `<mark style="background:rgba(79,70,229,.15);color:var(--color-primary);border-radius:2px;">${escapeHtml(text.slice(idx, idx + query.length))}</mark>` +
    escapeHtml(text.slice(idx + query.length));
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => renderResults(searchInput.value), 200);
});

searchBtn.addEventListener('click', () => renderResults(searchInput.value));
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') renderResults(searchInput.value);
});

// ── Contact form validation ───────────────────────────────────
const contactForm = document.getElementById('contactForm');

function setError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.toggle('error', !!message);
  if (error) error.textContent = message || '';
}

function validateForm() {
  let valid = true;

  const name    = document.getElementById('name').value.trim();
  const email   = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!name) {
    setError('name', 'nameError', 'Please enter your name.');
    valid = false;
  } else {
    setError('name', 'nameError', '');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    setError('email', 'emailError', 'Please enter your email address.');
    valid = false;
  } else if (!emailRegex.test(email)) {
    setError('email', 'emailError', 'Please enter a valid email address.');
    valid = false;
  } else {
    setError('email', 'emailError', '');
  }

  if (!message || message.length < 10) {
    setError('message', 'messageError', 'Message must be at least 10 characters.');
    valid = false;
  } else {
    setError('message', 'messageError', '');
  }

  return valid;
}

contactForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;

  const btn = contactForm.querySelector('button[type="submit"]');
  btn.textContent = 'Sending…';
  btn.disabled = true;

  // Simulate async submission
  setTimeout(() => {
    contactForm.reset();
    btn.textContent = 'Send Message';
    btn.disabled = false;
    document.getElementById('formSuccess').classList.add('visible');
    setTimeout(() => {
      document.getElementById('formSuccess').classList.remove('visible');
    }, 5000);
  }, 1000);
});

// Clear errors on input
['name','email','message'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => el.classList.remove('error'));
});

// ── Scroll reveal for feature cards ──────────────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const delay = (parseInt(el.dataset.index || '0', 10) % 3) * 80;
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, delay);
      revealObserver.unobserve(el);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  card.style.transition = 'opacity 0.45s ease, transform 0.45s ease, box-shadow 0.22s ease, border-color 0.22s ease';
  revealObserver.observe(card);
});
