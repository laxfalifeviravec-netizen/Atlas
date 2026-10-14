/* In-app confirm dialog — window.confirm() is blocked inside the iOS WKWebView app */
(function () {
  const css = document.createElement('style');
  css.textContent = `
  .ac-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:20000;display:flex;align-items:flex-end;opacity:0;transition:opacity .2s}
  .ac-ov.ac-open{opacity:1}
  .ac-box{width:100%;background:var(--c-surface,#141417);border-radius:18px 18px 0 0;padding:20px 16px calc(28px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px;transform:translateY(100%);transition:transform .25s ease}
  .ac-ov.ac-open .ac-box{transform:translateY(0)}
  .ac-msg{font-size:15px;font-weight:600;text-align:center;color:var(--c-text,#EDEBE6);line-height:1.4;padding:0 6px 4px}
  .ac-ok{width:100%;padding:14px;border:none;border-radius:10px;background:#e74c3c;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit}
  .ac-no{width:100%;padding:13px;border:none;border-radius:10px;background:var(--c-bg,#0C0C0F);color:var(--c-text-2,#8A8580);font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}`;
  document.head.appendChild(css);

  window.appConfirm = function (message, label) {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'ac-ov';
      ov.innerHTML = '<div class="ac-box"><p class="ac-msg"></p><button class="ac-ok"></button><button class="ac-no">Cancel</button></div>';
      ov.querySelector('.ac-msg').textContent = message;
      ov.querySelector('.ac-ok').textContent = label || 'Confirm';
      document.body.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add('ac-open'));
      const done = v => { ov.classList.remove('ac-open'); setTimeout(() => ov.remove(), 250); resolve(v); };
      ov.querySelector('.ac-ok').addEventListener('click', () => done(true));
      ov.querySelector('.ac-no').addEventListener('click', () => done(false));
      ov.addEventListener('click', e => { if (e.target === ov) done(false); });
    });
  };

  window.showAppMsg = function (msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:500;z-index:20001;max-width:85%;text-align:center';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  };
})();
