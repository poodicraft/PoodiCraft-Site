/* ============================================================
   PoodiCraft — המלצות (Firebase Auth + Firestore)
   - כניסה/הרשמה עם Google או מייל+סיסמה
   - כל משתמש יכול לכתוב המלצות, לערוך ולמחוק את שלו
   - בעל האתר (OWNER_EMAIL ב-firebase-config.js) יכול למחוק כל המלצה
   הרשאות אמיתיות נאכפות בשרת דרך firestore.rules — הקוד כאן רק מציג/מסתיר כפתורים.
   ============================================================ */
(function () {
  const root = document.getElementById('reviews');
  if (!root) return;

  const MAX_LEN = 600;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- Not configured yet → friendly notice instead of a broken section ----
  if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.apiKey || typeof firebase === 'undefined') {
    root.innerHTML = `
      <div class="reviews-setup">
        <strong>ההמלצות עוד לא מחוברות ל-Firebase.</strong>
        <span>ממלאים את <code>firebase-config.js</code> לפי ההוראות שבתוך הקובץ, והקטע הזה מתחיל לעבוד.</span>
      </div>`;
    return;
  }

  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();
  auth.useDeviceLanguage();
  const col = db.collection('reviews');

  const isOwner = (u) => !!u && !!u.email && u.emailVerified && u.email.toLowerCase() === String(OWNER_EMAIL).toLowerCase();
  const displayName = (u) => (u.displayName || (u.email ? u.email.split('@')[0] : 'משתמש')).trim().slice(0, 60);

  // ---- Layout -----------------------------------------------------------
  root.innerHTML = `
    <div class="reviews-bar" id="reviewsBar"></div>
    <div class="reviews-compose" id="reviewsCompose"></div>
    <div class="reviews-list" id="reviewsList"><p class="reviews-empty">טוען המלצות…</p></div>
  `;
  const bar = root.querySelector('#reviewsBar');
  const compose = root.querySelector('#reviewsCompose');
  const list = root.querySelector('#reviewsList');

  const starSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
  const starsHtml = (n) => `<span class="stars" aria-label="${n} מתוך 5">${[1,2,3,4,5].map(i => `<i class="${i <= n ? 'on' : ''}">${starSvg}</i>`).join('')}</span>`;
  const starPicker = (n, name) => `<div class="star-pick" data-name="${name}">${[1,2,3,4,5].map(i => `<button type="button" class="${i <= n ? 'on' : ''}" data-v="${i}" aria-label="${i} כוכבים">${starSvg}</button>`).join('')}</div>`;
  const avatar = (name, photo, owner) => photo
    ? `<img class="rv-avatar" src="${esc(photo)}" alt="" referrerpolicy="no-referrer">`
    : `<span class="rv-avatar rv-avatar-letter ${owner ? 'owner' : ''}">${esc((name || '?').trim().charAt(0).toUpperCase())}</span>`;
  const fmtDate = (ts) => { try { return ts.toDate().toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };

  function wireStarPicker(el) {
    el.querySelectorAll('.star-pick').forEach(p => {
      p.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        const v = +b.dataset.v;
        p.dataset.value = v;
        p.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.v <= v));
      });
    });
  }
  const pickedStars = (el) => +(el.querySelector('.star-pick').dataset.value || 0);

  // ---- Auth bar + compose form ----------------------------------------------
  let currentUser = null;
  function renderTop() {
    const u = currentUser;
    if (!u) {
      bar.innerHTML = `
        <p class="reviews-hint">רוצים להשאיר המלצה? צריך להתחבר (לוקח שנייה).</p>
        <div class="reviews-auth-btns">
          <button type="button" class="btn btn-primary" data-auth="login">התחברות / הרשמה</button>
        </div>`;
      compose.innerHTML = '';
      bar.querySelector('[data-auth="login"]').addEventListener('click', () => openAuth('login'));
      return;
    }
    const owner = isOwner(u);
    bar.innerHTML = `
      <div class="reviews-user">
        ${avatar(displayName(u), u.photoURL, owner)}
        <div>
          <strong>${esc(displayName(u))}${owner ? ' <span class="rv-badge">בעל האתר</span>' : ''}</strong>
          <small>${esc(u.email || '')}</small>
        </div>
      </div>
      <button type="button" class="btn btn-ghost btn-small-ghost" id="signOutBtn">התנתקות</button>`;
    bar.querySelector('#signOutBtn').addEventListener('click', () => auth.signOut());

    compose.innerHTML = `
      <form class="rv-form" id="rvForm">
        <label class="rv-label">הדירוג שלכם</label>
        ${starPicker(5, 'new')}
        <label class="rv-label" for="rvText">ההמלצה</label>
        <textarea id="rvText" maxlength="${MAX_LEN}" rows="4" placeholder="איך היה לעבוד איתי? מה יצא? ספרו בכמה משפטים…" required></textarea>
        <div class="rv-form-foot">
          <span class="rv-count"><span id="rvCount">0</span>/${MAX_LEN}</span>
          <button type="submit" class="btn btn-primary" id="rvSubmit">פרסום ההמלצה</button>
        </div>
        <p class="rv-error" id="rvError" hidden></p>
      </form>`;
    wireStarPicker(compose);
    compose.querySelector('.star-pick').dataset.value = 5;
    const ta = compose.querySelector('#rvText');
    ta.addEventListener('input', () => compose.querySelector('#rvCount').textContent = ta.value.length);
    compose.querySelector('#rvForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = compose.querySelector('#rvError');
      const btn = compose.querySelector('#rvSubmit');
      const text = ta.value.trim();
      const stars = pickedStars(compose);
      if (text.length < 3) { err.textContent = 'כתבו לפחות כמה מילים.'; err.hidden = false; return; }
      if (!stars) { err.textContent = 'בחרו דירוג.'; err.hidden = false; return; }
      btn.disabled = true; err.hidden = true;
      try {
        await col.add({
          uid: u.uid,
          name: displayName(u),
          photo: u.photoURL || '',
          text, stars,
          ownerPost: owner,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: null
        });
        ta.value = ''; compose.querySelector('#rvCount').textContent = '0';
      } catch (ex) {
        err.textContent = 'לא הצלחנו לפרסם: ' + friendly(ex); err.hidden = false;
      }
      btn.disabled = false;
    });
  }

  // ---- Reviews list (live) --------------------------------------------------
  let editingId = null;
  let docs = [];
  col.orderBy('createdAt', 'desc').limit(100).onSnapshot((snap) => {
    docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderList();
  }, (err) => {
    list.innerHTML = `<p class="reviews-empty">לא ניתן לטעון המלצות כרגע (${esc(friendly(err))}).</p>`;
  });

  function renderList() {
    const u = currentUser;
    if (!docs.length) { list.innerHTML = '<p class="reviews-empty">עוד אין המלצות — תהיו הראשונים.</p>'; return; }
    list.innerHTML = docs.map(r => {
      const mine = u && r.uid === u.uid;
      const canDelete = mine || isOwner(u);
      const ownerPost = !!r.ownerPost;
      if (editingId === r.id && mine) {
        return `
          <article class="rv-card editing" data-id="${r.id}">
            <div class="rv-head">${avatar(r.name, r.photo, ownerPost)}<div><strong>${esc(r.name)}</strong><small>עריכה</small></div></div>
            ${starPicker(r.stars, 'edit')}
            <textarea class="rv-edit-text" maxlength="${MAX_LEN}" rows="4">${esc(r.text)}</textarea>
            <div class="rv-actions">
              <button type="button" class="btn btn-primary" data-act="save">שמירה</button>
              <button type="button" class="btn btn-ghost" data-act="cancel">ביטול</button>
            </div>
            <p class="rv-error" hidden></p>
          </article>`;
      }
      return `
        <article class="rv-card" data-id="${r.id}">
          <div class="rv-head">
            ${avatar(r.name, r.photo, ownerPost)}
            <div>
              <strong>${esc(r.name)}${ownerPost ? ' <span class="rv-badge">בעל האתר</span>' : ''}</strong>
              <small>${fmtDate(r.createdAt)}${r.updatedAt ? ' · נערך' : ''}</small>
            </div>
            ${starsHtml(r.stars)}
          </div>
          <p class="rv-text">${esc(r.text)}</p>
          ${(mine || canDelete) ? `
          <div class="rv-actions">
            ${mine ? '<button type="button" class="rv-link" data-act="edit">עריכה</button>' : ''}
            ${canDelete ? `<button type="button" class="rv-link danger" data-act="delete">${mine ? 'מחיקה' : 'מחיקה (בעל האתר)'}</button>` : ''}
            <span class="rv-confirm" hidden>למחוק? <button type="button" class="rv-link danger" data-act="delete-yes">כן, למחוק</button> <button type="button" class="rv-link" data-act="delete-no">לא</button></span>
          </div>` : ''}
        </article>`;
    }).join('');
    wireStarPicker(list);
    list.querySelectorAll('.star-pick').forEach(p => { p.dataset.value = p.querySelectorAll('button.on').length; });
  }

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const card = btn.closest('.rv-card'); const id = card.dataset.id;
    const act = btn.dataset.act;
    if (act === 'edit') { editingId = id; renderList(); }
    if (act === 'cancel') { editingId = null; renderList(); }
    if (act === 'delete') { card.querySelector('.rv-confirm').hidden = false; btn.hidden = true; }
    if (act === 'delete-no') { renderList(); }
    if (act === 'delete-yes') {
      try { await col.doc(id).delete(); }
      catch (ex) { alert('המחיקה נכשלה: ' + friendly(ex)); }
    }
    if (act === 'save') {
      const text = card.querySelector('.rv-edit-text').value.trim();
      const stars = pickedStars(card);
      const err = card.querySelector('.rv-error');
      if (text.length < 3 || !stars) { err.textContent = 'כתבו לפחות כמה מילים ובחרו דירוג.'; err.hidden = false; return; }
      btn.disabled = true;
      editingId = null;                       // leave edit mode before the live update arrives
      try {
        await col.doc(id).update({ text, stars, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        renderList();
      } catch (ex) {
        editingId = id; renderList();
        const e2 = list.querySelector(`.rv-card[data-id="${id}"] .rv-error`);
        if (e2) { e2.textContent = 'השמירה נכשלה: ' + friendly(ex); e2.hidden = false; }
      }
    }
  });

  // ---- Auth window ----------------------------------------------------------
  const modal = document.createElement('div');
  modal.className = 'modal auth-modal';
  modal.id = 'authModal';
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
  document.body.appendChild(modal);
  const closeAuth = () => { modal.classList.remove('open'); document.body.style.overflow = ''; };
  modal.addEventListener('click', (e) => { if (e.target === modal) closeAuth(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAuth(); });

  function openAuth(mode) {
    const isLogin = mode !== 'signup';
    modal.innerHTML = `
      <div class="modal-card auth-card">
        <button type="button" class="modal-close" aria-label="סגירה">&times;</button>
        <h3>${isLogin ? 'התחברות' : 'הרשמה'}</h3>
        <button type="button" class="btn btn-ghost auth-google" id="googleBtn">
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.6C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"/></svg>
          ${isLogin ? 'כניסה עם Google' : 'הרשמה עם Google'}
        </button>
        <div class="auth-sep"><span>או עם מייל</span></div>
        <form class="auth-form" id="authForm">
          ${isLogin ? '' : '<input type="text" id="authName" placeholder="השם שיוצג" maxlength="60" required autocomplete="name">'}
          <input type="email" id="authEmail" placeholder="מייל" required autocomplete="email">
          <input type="password" id="authPass" placeholder="סיסמה (לפחות 6 תווים)" minlength="6" required autocomplete="${isLogin ? 'current-password' : 'new-password'}">
          <button type="submit" class="btn btn-primary" id="authSubmit">${isLogin ? 'התחברות' : 'הרשמה'}</button>
          <p class="rv-error" id="authError" hidden></p>
        </form>
        <div class="auth-foot">
          ${isLogin
            ? '<button type="button" class="rv-link" data-mode="signup">אין לכם חשבון? הרשמה</button><button type="button" class="rv-link" id="resetBtn">שכחתי סיסמה</button>'
            : '<button type="button" class="rv-link" data-mode="login">כבר יש חשבון? התחברות</button>'}
        </div>
      </div>`;
    modal.classList.add('open'); document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-close').addEventListener('click', closeAuth);
    modal.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => openAuth(b.dataset.mode)));
    const err = modal.querySelector('#authError');
    const showErr = (ex) => { err.textContent = friendly(ex); err.hidden = false; };

    modal.querySelector('#googleBtn').addEventListener('click', async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      try { await auth.signInWithPopup(provider); closeAuth(); }
      catch (ex) {
        if (ex.code === 'auth/popup-blocked' || ex.code === 'auth/operation-not-supported-in-this-environment') {
          try { await auth.signInWithRedirect(provider); } catch (ex2) { showErr(ex2); }
        } else if (ex.code !== 'auth/popup-closed-by-user' && ex.code !== 'auth/cancelled-popup-request') showErr(ex);
      }
    });

    modal.querySelector('#authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = modal.querySelector('#authEmail').value.trim();
      const pass = modal.querySelector('#authPass').value;
      const submit = modal.querySelector('#authSubmit');
      submit.disabled = true; err.hidden = true;
      try {
        if (isLogin) {
          await auth.signInWithEmailAndPassword(email, pass);
        } else {
          const name = modal.querySelector('#authName').value.trim();
          const cred = await auth.createUserWithEmailAndPassword(email, pass);
          await cred.user.updateProfile({ displayName: name });
          await cred.user.reload();
          currentUser = auth.currentUser; renderTop(); renderList();
        }
        closeAuth();
      } catch (ex) { showErr(ex); }
      submit.disabled = false;
    });

    const reset = modal.querySelector('#resetBtn');
    if (reset) reset.addEventListener('click', async () => {
      const email = modal.querySelector('#authEmail').value.trim();
      if (!email) { showErr({ code: 'need-email' }); return; }
      try { await auth.sendPasswordResetEmail(email); err.textContent = 'שלחנו מייל לאיפוס הסיסמה.'; err.hidden = false; err.classList.add('ok'); }
      catch (ex) { showErr(ex); }
    });
  }

  auth.getRedirectResult().catch(() => {});
  auth.onAuthStateChanged((u) => { currentUser = u; editingId = null; renderTop(); renderList(); });

  // ---- Hebrew error messages --------------------------------------------------
  function friendly(ex) {
    const code = (ex && ex.code) || '';
    const map = {
      'auth/invalid-email': 'המייל לא תקין.',
      'auth/user-not-found': 'אין חשבון עם המייל הזה.',
      'auth/wrong-password': 'סיסמה שגויה.',
      'auth/invalid-credential': 'מייל או סיסמה שגויים.',
      'auth/invalid-login-credentials': 'מייל או סיסמה שגויים.',
      'auth/email-already-in-use': 'כבר יש חשבון עם המייל הזה — נסו להתחבר.',
      'auth/weak-password': 'הסיסמה חלשה מדי (לפחות 6 תווים).',
      'auth/too-many-requests': 'יותר מדי ניסיונות. נסו שוב עוד כמה דקות.',
      'auth/network-request-failed': 'אין חיבור לאינטרנט.',
      'auth/unauthorized-domain': 'הדומיין של האתר לא מאושר ב-Firebase (Authentication → Settings → Authorized domains).',
      'auth/operation-not-allowed': 'שיטת הכניסה הזו לא מופעלת ב-Firebase (Authentication → Sign-in method).',
      'auth/popup-blocked': 'הדפדפן חסם את חלון הכניסה.',
      'permission-denied': 'אין הרשאה (בדקו את firestore.rules).',
      'need-email': 'כתבו את המייל בשדה ואז לחצו "שכחתי סיסמה".'
    };
    return map[code] || (ex && ex.message) || 'משהו השתבש.';
  }
})();
