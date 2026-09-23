/* ── Universal Create Sheet ─────────────────────────────────
   Intercepts .bnav-post clicks on every page and shows a
   Post / Story picker. On community.html it opens the modals
   directly; on other pages it navigates with a ?create= param.
   ─────────────────────────────────────────────────────────── */
(function () {
  // ── Inject styles ────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #createSheet { position:fixed;inset:0;z-index:600;pointer-events:none; }
    #createSheet.open { pointer-events:all; }
    .cs-backdrop {
      position:absolute;inset:0;
      background:rgba(0,0,0,0);
      transition:background .25s;
    }
    #createSheet.open .cs-backdrop { background:rgba(0,0,0,.65); }
    .cs-panel {
      position:absolute;bottom:0;left:0;right:0;
      background:var(--c-surface,#141417);
      border-radius:20px 20px 0 0;
      padding:12px 0 calc(env(safe-area-inset-bottom,0px) + 24px);
      transform:translateY(100%);
      transition:transform .3s cubic-bezier(.22,.61,.36,1);
    }
    #createSheet.open .cs-panel { transform:translateY(0); }
    .cs-handle {
      width:36px;height:4px;
      background:var(--c-border,#252529);
      border-radius:2px;
      margin:0 auto 18px;
    }
    .cs-title {
      font-family:'Barlow Condensed',sans-serif;
      font-size:22px;font-weight:800;
      letter-spacing:.02em;
      padding:0 20px 10px;
      color:var(--c-text,#F2F2F5);
    }
    .cs-opt {
      display:flex;align-items:center;gap:14px;
      width:100%;padding:13px 20px;
      background:none;border:none;cursor:pointer;
      text-align:left;
      -webkit-tap-highlight-color:transparent;
      transition:background .12s;
    }
    .cs-opt:active { background:rgba(255,255,255,.05); }
    .cs-icon {
      width:48px;height:48px;border-radius:14px;
      display:flex;align-items:center;justify-content:center;
      flex-shrink:0;
    }
    .cs-icon-post {
      background:rgba(228,165,48,.12);
      border:1.5px solid rgba(228,165,48,.28);
      color:var(--c-accent,#E4A530);
    }
    .cs-icon-story {
      background:rgba(150,100,220,.12);
      border:1.5px solid rgba(150,100,220,.28);
      color:#a87be0;
    }
    .cs-opt-info { flex:1; }
    .cs-opt-name {
      font-size:15px;font-weight:600;
      color:var(--c-text,#F2F2F5);
      font-family:'DM Sans',sans-serif;
    }
    .cs-opt-sub {
      font-size:12px;color:var(--c-text-secondary,#8B8B96);
      margin-top:2px;font-family:'DM Sans',sans-serif;
    }
    .cs-chevron { color:var(--c-text-secondary,#8B8B96);flex-shrink:0; }
    .cs-divider {
      height:1px;background:var(--c-border,#252529);
      margin:4px 20px;
    }
  `;
  document.head.appendChild(style);

  // ── Inject HTML ──────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.id = 'createSheet';
  wrap.innerHTML = `
    <div class="cs-backdrop" id="csBackdrop"></div>
    <div class="cs-panel" id="csPanel">
      <div class="cs-handle"></div>
      <div class="cs-title">Create</div>

      <button class="cs-opt" id="csOptPost">
        <div class="cs-icon cs-icon-post">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div class="cs-opt-info">
          <div class="cs-opt-name">Post</div>
          <div class="cs-opt-sub">Photo or video · road, mods, or just a caption</div>
        </div>
        <svg class="cs-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <div class="cs-divider"></div>

      <button class="cs-opt" id="csOptStory">
        <div class="cs-icon cs-icon-story">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
        <div class="cs-opt-info">
          <div class="cs-opt-name">Story</div>
          <div class="cs-opt-sub">Photo · visible for 24 hours</div>
        </div>
        <svg class="cs-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(wrap);

  // ── Logic ────────────────────────────────────────────────
  const onCommunityPage = !!(document.getElementById('newPostOverlay'));

  function openSheet() { wrap.classList.add('open'); }
  function closeSheet() { wrap.classList.remove('open'); }

  window.openCreateSheet = openSheet;

  // Intercept ALL .bnav-post clicks (captures before community.js bubble listener)
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.bnav-post');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    openSheet();
  }, true);

  document.getElementById('csBackdrop').addEventListener('click', closeSheet);

  document.getElementById('csOptPost').addEventListener('click', function () {
    closeSheet();
    if (onCommunityPage && typeof window.openNewPost === 'function') {
      window.openNewPost();
    } else {
      location.href = 'community.html?create=post';
    }
  });

  document.getElementById('csOptStory').addEventListener('click', function () {
    closeSheet();
    if (onCommunityPage && typeof window.openNewStory === 'function') {
      window.openNewStory();
    } else {
      location.href = 'community.html?create=story';
    }
  });
})();
