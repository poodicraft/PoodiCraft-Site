/* ============================================================
   PoodiCraft — site interactions (home page + portfolio page)
   ============================================================ */

// ---- Videos -----------------------------------------------------
// סרטון בכל שורה: קודם הכתובת (או המזהה) מיוטיוב, רווח, ואז שם הסרטון.
// אפשר להדביק כתובת מלאה, גם עם &t=... — הכל מסתדר לבד.
// שורה ריקה או שורה שמתחילה ב-// מתעלמים ממנה. הסדר כאן = הסדר באתר.
const VIDEOS_TEXT = `
uPQi3wbNjps&t=6s        ישראל פארטי עונה 4 - פרק 1 | ההתחלה
ZP-nAIoxpPU             סרטון המועמדות שלי לנייטפול!
D0rElH9-f1s&t=124s      לא תאמינו מה קרה בעולם ההישרדות שלי!
_TXyBGNtEBY&t=6s        סקיי מיינס | פרק 2 | פיקקס נדרייט | חלק ראשון
newda64qUIA&t=206s      אייפיקסל אלווין
SGtp7aUL7as&t=13s       וואן בלוק | פרק 2 | בית - קומה ראשונה
BJ5RZMPSNBQ&t=16s       וואן בלוק | פרק 1
QeW8tXkGk1o&t=15s       סקיי מיינס | פרק 1 | דיימונד פיקקס - חלק 1
`;
const EMPTY_SLOTS = 3; // כמה משבצות ריקות להציג כשאין סרטונים

// Turns the text above into { id, start, title } items.
// Accepts a bare id, "id&t=30s", youtube.com/watch?v=…, youtu.be/…, shorts/…, embed/…
function parseVideos(text) {
  const out = [];
  text.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('//')) return;
    const m = line.match(/^(\S+)\s*(.*)$/);
    if (!m) return;
    const raw = m[1], title = m[2].trim();
    const idMatch = raw.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|^)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/);
    if (!idMatch) return;
    const t = raw.match(/[?&]t=(\d+)/) || raw.match(/[?&]t=(\d+)s/);
    out.push({ id: idMatch[1], start: t ? +t[1] : 0, title });
  });
  return out;
}
const VIDEOS = parseVideos(VIDEOS_TEXT);

// ---- Discord ----------------------------------------------------
const DISCORD_USERNAME = 'PoodiCraft';
const DISCORD_INVITE   = '';   // <- הדביקו כאן את קישור ההזמנה לשרת, למשל 'https://discord.gg/XXXXXXX'
const DISCORD_NOTE     = 'אנא פתחו טיקט בשרת הדיסקורד ואענה לכם בהקדם האפשרי.';

// ---- Projects (משחקים ודברים שיצרתי לערוץ) ---------------------------
// לכל פרויקט יש מספר. בתיקייה projects/:
//   project-1.jpg   – התמונה של הכרטיס (גם .png עובד)
//   project-1.html  – העמוד של הפרויקט (לחיצה על הכרטיס פותחת אותו) — ערכו אותו כרצונכם
// וכך הלאה ל-project-2, project-3 ...
const PROJECT_SLOTS = 6;   // כמה כרטיסים להציג בעמוד הפרויקטים (יש עמוד מוכן לכל אחד)

// הטקסט שמופיע על הכרטיס (רשות). השורה ה-1 שייכת ל-project-1, ה-2 ל-project-2 וכן הלאה.
//   { title: 'שם הפרויקט', desc: 'משפט קצר', tag: 'משחק' },
const PROJECTS = [
  // { title: '', desc: '', tag: '' },
];

(function renderVideos() {
  const grid = document.getElementById('videosGrid');
  if (!grid) return;

  const playIcon = '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg></span>';

  if (VIDEOS.length === 0) {
    for (let i = 0; i < EMPTY_SLOTS; i++) {
      const fig = document.createElement('figure');
      fig.className = 'video-item reveal';
      fig.style.setProperty('--d', (i * 0.05) + 's');
      fig.innerHTML = `
        <div class="thumb-frame empty">
          <span class="thumb-placeholder">הוסיפו סרטון<small>script.js → VIDEOS</small></span>
        </div>`;
      grid.appendChild(fig);
    }
    return;
  }

  VIDEOS.forEach((v, i) => {
    const a = document.createElement('a');
    a.className = 'video-item reveal';
    a.href = `https://www.youtube.com/watch?v=${v.id}` + (v.start ? `&t=${v.start}s` : '');
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.setProperty('--d', (i * 0.05) + 's');
    a.innerHTML = `
      <div class="thumb-frame">
        <img src="https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg" alt="${v.title || ''}" loading="lazy"
             onload="if (this.naturalWidth < 200 && !this.dataset.hq) { this.dataset.hq = 1; this.src = 'https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'; }"
             onerror="if (!this.dataset.hq) { this.dataset.hq = 1; this.src = 'https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'; } else { this.parentNode.classList.add('empty'); }">
        <span class="thumb-placeholder">אין תמונה<small>${v.id}</small></span>
        <div class="play">${playIcon}</div>
      </div>
      ${v.title ? `<p class="video-title">${v.title}</p>` : ''}`;
    grid.appendChild(a);
  });
})();

// ---- Projects page --------------------------------------------------
(function renderProjects() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  const count = Math.max(PROJECT_SLOTS, PROJECTS.length);
  for (let i = 0; i < count; i++) {
    const p = PROJECTS[i] || {};
    const n = i + 1;
    const el = document.createElement('a');
    el.className = 'project-item reveal';
    el.href = `projects/project-${n}.html`;
    el.style.setProperty('--d', (i * 0.05) + 's');
    el.innerHTML = `
      <div class="thumb-frame">
        <img src="projects/project-${n}.jpg" alt="${p.title || 'פרויקט ' + n}" loading="lazy"
             onerror="if (!this.dataset.png) { this.dataset.png = 1; this.src = 'projects/project-${n}.png'; } else { this.parentNode.classList.add('empty'); }">
        <span class="thumb-placeholder">הוסיפו תמונה<small>projects/project-${n}.jpg</small></span>
      </div>
      <div class="project-body">
        ${p.tag ? `<span class="project-tag">${p.tag}</span>` : ''}
        <h3 class="project-title">${p.title || 'פרויקט ' + n}</h3>
        ${p.desc ? `<p class="project-desc">${p.desc}</p>` : ''}
        <span class="project-link">לעמוד הפרויקט ←</span>
      </div>`;
    grid.appendChild(el);
  }
})();

// ---- Floating pixel cubes in the background --------------------
(function spawnCubes() {
  const container = document.getElementById('cubes');
  if (!container) return;
  const count = window.innerWidth < 720 ? 12 : 22;
  for (let i = 0; i < count; i++) {
    const cube = document.createElement('span');
    cube.className = 'cube';
    const size = 8 + Math.random() * 18;
    cube.style.setProperty('--s', size + 'px');
    cube.style.setProperty('--t', (14 + Math.random() * 16) + 's');
    cube.style.setProperty('--delay', (-Math.random() * 30) + 's');
    cube.style.left = Math.random() * 100 + '%';
    container.appendChild(cube);
  }
})();

// ---- Sticky nav style on scroll ---------------------------------
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---- Mobile menu ------------------------------------------------
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
  })
);

// ---- Scroll reveal ----------------------------------------------
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => io.observe(el));

// ---- Cards: 3D tilt + mouse glow (gallery, videos, channel card) ------
document.querySelectorAll('.gallery-item, .video-item, .project-item, .channel-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const rx = ((y / r.height) - 0.5) * -8;
    const ry = ((x / r.width) - 0.5) * 8;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    card.style.setProperty('--mx', x + 'px');
    card.style.setProperty('--my', y + 'px');
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ---- Portfolio hero cards: subtle parallax with mouse -----------
const heroVisual = document.querySelector('.hero-visual');
if (heroVisual && window.matchMedia('(pointer: fine)').matches) {
  const cards = heroVisual.querySelectorAll('.float-card');
  if (cards.length) {
    window.addEventListener('mousemove', (e) => {
      const dx = (e.clientX / window.innerWidth - 0.5);
      const dy = (e.clientY / window.innerHeight - 0.5);
      cards.forEach((c, i) => {
        const depth = (i + 1) * 6;
        c.style.translate = `${dx * depth}px ${dy * depth}px`;
      });
    }, { passive: true });
  }
}

// ---- Lightbox for thumbnails (portfolio page) --------------------
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  document.querySelectorAll('.gallery-item .thumb-frame, .float-card .thumb-frame').forEach(frame => {
    frame.addEventListener('click', () => {
      if (frame.classList.contains('empty')) return; // nothing to show yet
      const img = frame.querySelector('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  const closeLightbox = () => {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  };
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}

// ---- Discord: small window with "copy username" / "my server" --------
const discordBtn = document.getElementById('discordBtn');
if (discordBtn) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'discordModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'discordModalTitle');
  modal.innerHTML = `
    <div class="modal-card">
      <button type="button" class="modal-close" aria-label="סגירה">&times;</button>
      <div class="modal-icon"><svg  viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.2a18.3 18.3 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4a12.9 12.9 0 0 1-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.1-.8-9.6-3.6-13.6zM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg></div>
      <h3 id="discordModalTitle">דיסקורד</h3>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="copyDiscordBtn">
          העתקת שם משתמש — <span dir="ltr">${DISCORD_USERNAME}</span>
          <span class="copied">הועתק!</span>
        </button>
        <a class="btn btn-primary" id="discordServerBtn" href="${DISCORD_INVITE || '#'}" ${DISCORD_INVITE ? 'target="_blank" rel="noopener"' : ''}>
          לשרת הדיסקורד שלי
        </a>
        <p class="modal-note">${DISCORD_NOTE}</p>
        ${DISCORD_INVITE ? '' : '<p class="modal-hint">קישור השרת עוד לא הוגדר — מלאו את DISCORD_INVITE בתחילת script.js</p>'}
      </div>
    </div>`;
  document.body.appendChild(modal);

  const openModal = () => { modal.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeModal = () => { modal.classList.remove('open'); document.body.style.overflow = ''; };
  discordBtn.addEventListener('click', openModal);
  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  const copyBtn = modal.querySelector('#copyDiscordBtn');
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(DISCORD_USERNAME); } catch (e) {}
    copyBtn.classList.add('show-copied');
    setTimeout(() => copyBtn.classList.remove('show-copied'), 1400);
  });
  if (!DISCORD_INVITE) {
    modal.querySelector('#discordServerBtn').addEventListener('click', (e) => e.preventDefault());
  }
}

// ---- Footer year ------------------------------------------------
document.getElementById('year').textContent = new Date().getFullYear();
