/* Photo viewer — fullscreen with pinch-to-zoom */
(function () {
  const VP_LOCKED = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  const VP_FREE   = 'width=device-width, initial-scale=1.0, viewport-fit=cover';

  let overlay = null;

  function getVP() { return document.querySelector('meta[name="viewport"]'); }

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'pv-overlay';
    overlay.innerHTML =
      '<button id="pv-close" aria-label="Close">✕</button>' +
      '<div id="pv-wrap"><img id="pv-img" /></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#pv-close').addEventListener('click', close);
    overlay.querySelector('#pv-wrap').addEventListener('click', function (e) {
      if (e.target === this) close();
    });
  }

  function open(src) {
    if (!overlay) build();
    overlay.querySelector('#pv-img').src = src;
    overlay.classList.add('pv-open');
    const vp = getVP();
    if (vp) vp.content = VP_FREE;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('pv-open');
    const vp = getVP();
    if (vp) vp.content = VP_LOCKED;
    document.body.style.overflow = '';
  }

  // Delegated listener — opens on any post/carousel image tap
  document.addEventListener('click', function (e) {
    const img = e.target.closest(
      '.carousel-slide img, .post-card-img-wrap > img, .listing-detail-img img'
    );
    if (img && img.src) {
      e.stopPropagation();
      open(img.src);
    }
  });

  // Swipe-down to close
  let touchStartY = 0;
  document.addEventListener('touchstart', function (e) {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!overlay || !overlay.classList.contains('pv-open')) return;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (dy > 80) close();
  }, { passive: true });

  window.openPhotoViewer = open;
  window.closePhotoViewer = close;
})();
