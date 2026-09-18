/* ============================================================
   PoodiCraft — UI sound effects
   Files live in sounds/ (next to this script):
     click.wav – quiet click when something is clicked
     pop.wav   – slightly different click for copy / open / close actions
   (No hover sound on purpose — it gets annoying fast.)
   All three come from Kenney's free "UI Audio" pack (CC0). The full pack is
   in sounds/kenney-ui-audio/ — to try another clip, convert it to .wav and
   save it under one of the names above. Volume is set below.
   Uses plain <audio> elements, so it also works when index.html is opened
   directly from the folder (file://), not only from a web server.
   ============================================================ */
(function () {
  const VOLUME = { click: 0.35, pop: 0.35 };   // 0–1
  const POOL_SIZE = 4;                       // overlapping plays per sound
  const STORAGE_KEY = 'poodi-sound';         // 'off' when the user muted

  // What makes a sound: every link and button, plus the clickable cards/frames
  const CLICK_SEL = [
    'a[href]', 'button', '[role="button"]', 'input[type="button"]', 'input[type="submit"]', 'label', 'summary',
    '.btn', '.logo', '.nav-toggle', '.scroll-hint', '.hero-logo-wrap',
    '.gallery-item', '.video-item', '.project-item', '.channel-card', '.portfolio-card', '.mini-card',
    '.thumb-frame', '.float-card', '.proj-nav-card', '.sound-toggle', '.rv-link', '.star-pick button'
  ].join(', ');
  const POP_SEL   = '#discordBtn, #copyDiscordBtn, .modal-close, .lightbox-close, .gallery-item .thumb-frame, .float-card .thumb-frame, .shots-main';

  // Resolve sounds/ relative to this script
  const base = new URL('sounds/', document.currentScript.src).href;

  let muted = false;
  try { muted = localStorage.getItem(STORAGE_KEY) === 'off'; } catch (e) {}

  // Pre-create a small pool of <audio> elements per sound so quick repeats overlap
  const pools = {};
  for (const name of Object.keys(VOLUME)) {
    pools[name] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const a = new Audio(base + name + '.wav');
      a.preload = 'auto';
      a.load();
      pools[name].push(a);
    }
  }

  let unlocked = false;
  function play(name) {
    if (muted || !unlocked) return;
    const pool = pools[name];
    const a = pool.find(x => x.paused || x.ended) || pool[0];
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = VOLUME[name];
      // Slight random pitch so repeated sounds don't feel mechanical
      a.preservesPitch = false;
      a.mozPreservesPitch = false;
      a.playbackRate = 0.95 + Math.random() * 0.1;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  // Browsers only allow audio after the first user gesture
  const unlock = () => { unlocked = true; };
  ['pointerdown', 'mousedown', 'click', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, unlock, { passive: true, capture: true })
  );

  // ---- Click -------------------------------------------------------------
  // Play on pointerdown (feels instant). If that was missed for any reason
  // (keyboard, touch quirks, synthetic clicks), the click event plays instead.
  let lastEl = null, lastAt = 0;
  function trigger(e, fromClick) {
    const target = e.target instanceof Element ? e.target : e.target && e.target.parentElement;
    if (!target) return;
    const el = target.closest(CLICK_SEL);
    if (!el) return;
    const now = performance.now();
    if (fromClick && el === lastEl && now - lastAt < 500) return;   // already played on pointerdown
    lastEl = el; lastAt = now;
    play(el.matches(POP_SEL) ? 'pop' : 'click');
  }
  document.addEventListener('pointerdown', (e) => { if (e.button === 0) trigger(e, false); }, true);
  document.addEventListener('click', (e) => trigger(e, true), true);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.matches(CLICK_SEL)) {
      lastEl = document.activeElement; lastAt = performance.now();
      play(document.activeElement.matches(POP_SEL) ? 'pop' : 'click');
    }
  });

  // ---- Mute toggle (injected so both pages get it without HTML changes) ----
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-toggle';
  btn.innerHTML =
    '<svg class="on" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>' +
    '<svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.5 2.5V12zM19 12a7 7 0 0 1-1.1 3.8l1.5 1.5A9 9 0 0 0 21 12a9 9 0 0 0-7-8.8v2.1A7 7 0 0 1 19 12zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.3 4.3a7 7 0 0 1-2.3 1.2v2.1a9 9 0 0 0 3.7-1.9l2 2 1.3-1.3L4.3 3zM12 4 9.9 6.1 12 8.2V4z"/></svg>';
  const applyState = () => {
    btn.dataset.muted = muted ? 'true' : 'false';
    btn.title = muted ? 'הפעלת צלילים' : 'השתקת צלילים';
    btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  };
  applyState();
  btn.addEventListener('click', () => {
    muted = !muted;
    try { localStorage.setItem(STORAGE_KEY, muted ? 'off' : 'on'); } catch (e) {}
    applyState();
    if (!muted) setTimeout(() => play('pop'), 30);
  });
  document.body.appendChild(btn);
})();
