import './style.css';
import { BRAND, OWNER, IMAGES, SERVICES, WORKS, SKILLS, TOOLS, RATES, STATS, BACKGROUND, CAREER, WISE, CONTACTS } from './config.js';
import { COUNTRIES, flag } from './countries.js';
import { auth, db, googleProvider } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signOut, updateProfile, sendEmailVerification, sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy,
  serverTimestamp, writeBatch, increment,
} from 'firebase/firestore';

/* ================================================================== helpers */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const ownerEmail = OWNER.email.trim().toLowerCase();
const toDate = (ts) => (ts && ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null);
const fmtTime = (ts) => {
  const d = toDate(ts); if (!d) return '';
  return new Date().toDateString() === d.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3400);
}
// A labeled box that shows WHERE to put an image until the file exists
function slot(src, label, cls = '') {
  return `<div class="slot ${cls}"><div class="slot-ph"><span>📷</span><b>Put your image here</b><code>public${esc(label)}</code></div><img src="${esc(src)}" alt="" onerror="this.remove()" /></div>`;
}
const STATUS = {
  inquiry: { label: 'Inquiry', icon: '💬', hint: 'You asked about a project. I will reply soon.' },
  ongoing: { label: 'Ongoing work', icon: '🛠️', hint: 'I am working on your website.' },
  paid: { label: 'Paid', icon: '✅', hint: 'Payment received. Thank you!' },
  completed: { label: 'Handled', icon: '🎉', hint: 'Your project is done.' },
};
const ORDER = ['inquiry', 'ongoing', 'paid', 'completed'];
const stOf = (c) => (STATUS[c?.status] ? c.status : 'inquiry');
function countTo(el, end, dec = 0) {
  if (!el) return;
  const t0 = performance.now(), from = parseFloat(el.dataset.v || '0'); el.dataset.v = end;
  (function step(now) {
    const p = Math.min((now - t0) / 900, 1), v = from + (end - from) * (1 - Math.pow(1 - p, 3));
    el.textContent = v.toFixed(dec); if (p < 1) requestAnimationFrame(step);
  })(t0);
}

/* ================================================================== state */
let user = null, me = null, meLoaded = false, ready = false, isOwner = false, signingUp = false;
let unsubs = [], shown = '', panelOpen = false, feedbacks = [], authMode = 'login', fbRating = 0;
let ownerRetried = false;
let customers = [], activeUid = null, unsubActive = null, regionF = 'all', statusF = 'all';
const isOwnerEmail = () => (user?.email || '').toLowerCase() === ownerEmail;
const needsProfile = () => !!user && !isOwnerEmail() && meLoaded && !(me?.nickname && me?.countryCode);
const nick = () => me?.nickname || user?.displayName || (user?.email || 'Friend').split('@')[0];

/* ================================================================== static content */
function renderStatic() {
  $('#heroWord').innerHTML = [...BRAND.name].map((c, i) => `<span style="--i:${i}">${esc(c)}</span>`).join('');

  $('#aboutPhoto').innerHTML = slot(IMAGES.profile, IMAGES.profile);
  $('#aboutText').innerHTML = `<h3>Hi, I'm ${esc(OWNER.firstName)}</h3><p>${esc(OWNER.intro)}</p>` + OWNER.bio.map((p) => `<p>${esc(p)}</p>`).join('') +
    `<div class="chips">${OWNER.roles.map((r) => `<span>${esc(r)}</span>`).join('')}</div>`;
  $('#services').innerHTML = SERVICES.map((s) => `<div class="glass service tilt reveal"><div class="ico">${s.icon}</div><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></div>`).join('');
  $('#contacts').innerHTML = CONTACTS.map((c) => `<a class="glass contact-card reveal" href="${esc(c.href)}" target="_blank" rel="noopener"><div class="ico">${c.icon}</div><div><small>${esc(c.label)}</small><strong>${esc(c.value)}</strong></div></a>`).join('');

  $('#skillBars').innerHTML = '<h3>What I am good at</h3>' + SKILLS.map((s) => `<div class="bar"><div class="bar-top"><span>${esc(s.name)}</span><span>${s.level}%</span></div><div class="track"><div class="fill" data-w="${s.level}"></div></div></div>`).join('');
  $('#tools').innerHTML = TOOLS.map((t) => `<span>${esc(t)}</span>`).join('');

  const cats = ['All', ...new Set(WORKS.map((w) => w.category))];
  $('#filters').innerHTML = cats.map((c, i) => `<button class="chip-btn ${i ? '' : 'active'}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  $('#worksGrid').innerHTML = WORKS.map((w, i) => `<button class="glass work reveal" data-i="${i}" data-cat="${esc(w.category)}" style="transition-delay:${(i % 3) * 80}ms">
    <div class="slot"><div class="slot-ph"><span>📷</span><b>Put your image here</b><code>public${esc(w.image)}</code></div><img src="${esc(w.image)}" alt="" onerror="this.remove()" /><span class="cat">${esc(w.category)}</span></div>
    <div class="work-info"><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p><div class="tags">${w.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div></div></button>`).join('');

  $('#ratesGrid').innerHTML = RATES.map((r) => `<div class="glass rate tilt reveal ${r.popular ? 'popular' : ''}">${r.popular ? '<span class="pop">Most chosen</span>' : ''}
    <h3>${esc(r.name)}</h3><div class="price">${esc(r.price)}</div><div class="per">${esc(r.per)}</div>
    <ul>${r.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <button class="btn ${r.popular ? 'primary' : ''}" data-plan="${esc(r.name)}">Ask about ${esc(r.name)}</button></div>`).join('');

  $('#bgPhoto').innerHTML = slot(IMAGES.background, IMAGES.background);
  $('#careerPhoto').innerHTML = slot(IMAGES.career, IMAGES.career);
  $('#bgTimeline').innerHTML = BACKGROUND.map((b) => `<div class="glass t-item reveal"><span class="yr">${esc(b.year)}</span><h4>${esc(b.title)}</h4><p>${esc(b.text)}</p></div>`).join('');
  $('#careerTimeline').innerHTML = CAREER.map((b) => `<div class="glass t-item reveal"><span class="yr">${esc(b.year)} · ${esc(b.place)}</span><h4>${esc(b.title)}</h4><p>${esc(b.text)}</p></div>`).join('');

  $('#qrSlot').innerHTML = slot(IMAGES.wiseQr, IMAGES.wiseQr);
  $('#payInfo').innerHTML = `<li><b>Agree on the price</b> with me in the chat first.</li><li>Open <b>Wise</b> (or your banking app) and <b>scan the QR code</b>, or send to the details below.</li><li>${esc(WISE.note)}</li>`;
  $('#wiseBox').innerHTML = `<div><span>Account name</span><strong>${esc(WISE.accountName)}</strong></div><div><span>Wise tag</span><strong>${esc(WISE.handle)}</strong></div><div><span>Wise email</span><strong>${esc(WISE.email)}</strong></div>`;

  $('#panelAvatar').innerHTML = `${esc(initials(OWNER.name))}<img src="${esc(IMAGES.profile)}" alt="" onerror="this.remove()" />`;
  $('#cdOwnerAvatar').innerHTML = $('#panelAvatar').innerHTML;
  $('#footText').textContent = `© ${new Date().getFullYear()} ${BRAND.name} · ${BRAND.tagline}`;
  renderDrawerNav();
}

const PAGES = [
  { id: 'dashboard', icon: '🏠', label: 'My dashboard', who: 'customer' },
  { id: 'owner', icon: '🧭', label: 'Owner dashboard', who: 'owner' },
  { id: 'about', icon: '👋', label: 'Who I am' },
  { id: 'skills', icon: '🧠', label: 'My skills' },
  { id: 'works', icon: '🖼️', label: 'My works' },
  { id: 'rates', icon: '🏷️', label: 'Rates and ratings' },
  { id: 'clients', icon: '⭐', label: 'Satisfied customers and feedback' },
  { id: 'career', icon: '📈', label: 'Background and career' },
  { id: 'payment', icon: '💳', label: 'Payment (Wise QR)' },
];
const VIEWS = ['home', 'auth', ...PAGES.map((p) => p.id)];
function renderDrawerNav() {
  const list = PAGES.filter((p) => !p.who || (p.who === 'owner') === isOwner);
  $('#drawerNav').innerHTML = list.map((p, i) => `<a href="#/${p.id}" data-page="${p.id}" style="--i:${i}" class="${shown === p.id ? 'active' : ''}"><span>${p.icon}</span>${esc(p.label)}</a>`).join('');
}

/* ================================================================== router */
const currentRoute = () => (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
addEventListener('hashchange', route);
function route() {
  if (!ready) return;
  let r = currentRoute();
  if (!user) { if (r !== 'home' && r !== 'auth') r = VIEWS.includes(r) ? 'auth' : 'home'; }
  else if (needsProfile()) r = 'auth';
  else {
    if (r === 'home' || r === 'auth' || !VIEWS.includes(r)) r = isOwner ? 'owner' : 'dashboard';
    if (r === 'owner' && !isOwner) r = 'dashboard';
    if (r === 'dashboard' && isOwner) r = 'owner';
  }
  if (location.hash !== '#/' + r) history.replaceState(null, '', '#/' + r);
  if (r === shown) return;
  shown = r;
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'v-' + r));
  scrollTo(0, 0); closeDrawer();
  $$('#drawerNav a').forEach((a) => a.classList.toggle('active', a.dataset.page === r));
  const page = $('#v-' + r);
  setTimeout(() => $$('.fill', page).forEach((f) => (f.style.width = f.dataset.w + '%')), 150);
  observeReveals(); updateChrome();
  if (r === 'dashboard') markCustomerRead();
}
function updateChrome() {
  const loggedIn = !!user && !needsProfile();
  $('#menuBtn').hidden = !loggedIn;
  $('#chatFab').hidden = !(loggedIn && !isOwner);
  $('#brandLink').setAttribute('href', loggedIn ? (isOwner ? '#/owner' : '#/dashboard') : '#/home');
  if (!loggedIn) closeDrawer();
}
function openDrawer() { $('#drawer').classList.add('open'); $('#scrim').classList.add('open'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open'); }
$('#menuBtn').onclick = openDrawer; $('#drawerClose').onclick = closeDrawer; $('#scrim').onclick = closeDrawer;
$('#drawerLogout').onclick = () => logout();
async function logout() { await signOut(auth); toast('You are logged out.'); }

/* ================================================================== modals */
const openModal = (m) => { m.classList.add('open'); document.body.classList.add('lock'); };
const closeModal = (m) => { m.classList.remove('open'); document.body.classList.remove('lock'); };
$('#workModal').addEventListener('click', (e) => { if (e.target.id === 'workModal' || e.target.closest('[data-close]')) closeModal($('#workModal')); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal($('#workModal')); closeDrawer(); setPanel(false); } });

/* ================================================================== country picker */
function countryPicker(root) {
  root.innerHTML = '<div class="cp"><input type="text" placeholder="Search your country..." autocomplete="off" role="combobox" aria-expanded="false" /><ul class="cp-list" role="listbox" hidden></ul></div>';
  const input = $('input', root), list = $('ul', root);
  let sel = null, idx = -1, items = [];
  function render() {
    const q = input.value.trim().toLowerCase();
    items = COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
    idx = items.length ? 0 : -1;
    list.innerHTML = items.length ? items.map((c, i) => `<li role="option" data-i="${i}" class="${i === idx ? 'on' : ''}">${flag(c.code)}&nbsp; ${esc(c.name)}</li>`).join('') : '<li class="empty">No country found</li>';
  }
  const open = () => { render(); list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.value = sel ? sel.name : (input.value && !sel ? '' : input.value); };
  const choose = (c) => { sel = c; input.value = c.name; list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const mark = () => $$('li', list).forEach((li, i) => { li.classList.toggle('on', i === idx); if (i === idx) li.scrollIntoView({ block: 'nearest' }); });
  input.addEventListener('focus', () => { input.select(); open(); });
  input.addEventListener('input', () => { sel = null; open(); });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) open(); idx = Math.min(idx + 1, items.length - 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, 0); mark(); }
    else if (e.key === 'Enter' && !list.hidden && items[idx]) { e.preventDefault(); choose(items[idx]); }
    else if (e.key === 'Escape') { list.hidden = true; }
  });
  list.addEventListener('mousedown', (e) => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); choose(items[+li.dataset.i]); } });
  return { get value() { return sel; }, set(code) { const c = COUNTRIES.find((x) => x.code === code); if (c) choose(c); }, clear() { sel = null; input.value = ''; } };
}
const picker = countryPicker($('#countryPicker'));

/* ================================================================== auth page */
function setAuthMode(m) {
  authMode = m;
  const profile = m === 'profile', signup = m === 'signup';
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === m));
  $('#authTabs').hidden = profile;
  $('#nickField').hidden = !(signup || profile);
  $('#countryField').hidden = !(signup || profile);
  $('#emailField').hidden = profile; $('#passField').hidden = profile;
  $('#googleBox').hidden = profile; $('#forgot').hidden = m !== 'login';
  $('#authBack').hidden = profile;
  $('#authSubmit').textContent = profile ? 'Save and continue' : signup ? 'Create my account' : 'Log in';
  $('#authTitle').textContent = profile ? 'Almost there!' : signup ? 'Create your account' : 'Welcome back';
  $('#authNote').textContent = profile ? 'Tell me your nickname and country to see all pages.' : signup ? 'Pick a nickname and your country, then you can see everything.' : 'Log in to see my works, rates and chat with me.';
  $('#authPass').autocomplete = signup ? 'new-password' : 'current-password';
  $('#authErr').textContent = '';
}
$$('.tab').forEach((t) => t.addEventListener('click', () => setAuthMode(t.dataset.mode)));
function showAuth(m) { setAuthMode(m); if (currentRoute() === 'auth') { shown = ''; } location.hash = '#/auth'; route(); }
$('#getStarted').onclick = () => showAuth('signup');
$('#authBack').onclick = () => { location.hash = '#/home'; };

const errText = (e) => ({
  'auth/invalid-email': 'That email address does not look right.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/email-already-in-use': 'This email already has an account. Try logging in instead.',
  'auth/invalid-credential': 'Wrong email or password. Check them and try again.',
  'auth/user-not-found': 'No account with this email. Sign up first.',
  'auth/wrong-password': 'Wrong email or password. Check them and try again.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/popup-closed-by-user': '',
  'auth/cancelled-popup-request': '',
  'auth/unauthorized-domain': 'This website address is not allowed yet. Add it in Firebase > Authentication > Settings > Authorized domains.',
  'auth/operation-not-allowed': 'This sign-in method is off. Turn it on in Firebase > Authentication > Sign-in method.',
  'permission-denied': 'Firestore blocked this. Publish the rules from firestore.rules in the Firebase console.',
}[e.code] ?? 'Something went wrong. Please try again.');

$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#authErr'), btn = $('#authSubmit'); err.textContent = '';
  const nickname = $('#authNick').value.trim(), country = picker.value;
  const email = $('#authEmail').value.trim(), pass = $('#authPass').value;
  if (authMode !== 'login') {
    if (nickname.length < 2) { err.textContent = 'Enter a nickname (at least 2 letters).'; return; }
    if (!country) { err.textContent = 'Pick your country from the list.'; return; }
  }
  btn.disabled = true;
  try {
    if (authMode === 'profile') {
      await updateDoc(doc(db, 'users', user.uid), { nickname, country: country.name, countryCode: country.code });
      await updateProfile(user, { displayName: nickname });
      toast(`Welcome, ${nickname}!`);
    } else if (authMode === 'signup') {
      signingUp = true;
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: nickname });
      await ensureUserDoc(cred.user, { nickname, country: country.name, countryCode: country.code });
      if (cred.user.email.toLowerCase() === ownerEmail) await sendEmailVerification(cred.user).catch(() => {});
      signingUp = false;
      toast(`Welcome, ${nickname}!`);
      await handleUser(cred.user);
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
      toast('Logged in. Welcome back!');
    }
    $('#authForm').reset(); picker.clear();
  } catch (ex) { signingUp = false; console.error(ex); err.textContent = errText(ex); }
  btn.disabled = false;
});
$('#googleBtn').addEventListener('click', async () => {
  try { await signInWithPopup(auth, googleProvider); }
  catch (ex) { $('#authErr').textContent = errText(ex); }
});
$('#forgot').addEventListener('click', async () => {
  const email = $('#authEmail').value.trim();
  if (!email) { $('#authErr').textContent = 'Type your email above, then tap "Forgot password?".'; return; }
  try { await sendPasswordResetEmail(auth, email); toast('Password reset email sent.'); }
  catch (ex) { $('#authErr').textContent = errText(ex); }
});

// Creates the customer record once. Status starts as "inquiry"; only the owner can change it.
async function ensureUserDoc(u, extra = {}) {
  const ref = doc(db, 'users', u.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, { uid: u.uid, email: u.email || '', photo: u.photoURL || '', status: 'inquiry', feedbackAllowed: false, createdAt: serverTimestamp(), ...extra });
}

/* ================================================================== top bar user chip */
function renderTop() {
  const a = $('#topRight'), loggedIn = !!user && !needsProfile();
  if (!user) {
    a.innerHTML = '<button class="btn small" id="tLogin">Log in</button><button class="btn small primary" id="tSignup">Sign up</button>';
    $('#tLogin').onclick = () => showAuth('login'); $('#tSignup').onclick = () => showAuth('signup');
    $('#drawerUser').innerHTML = ''; return;
  }
  const name = isOwner ? OWNER.name : nick();
  const av = `${esc(initials(name))}${user.photoURL ? `<img src="${esc(user.photoURL)}" alt="" onerror="this.remove()" />` : ''}`;
  a.innerHTML = `<button class="user-btn" id="userBtn" aria-haspopup="true"><span class="avatar">${av}</span><span>${esc(name)}</span></button>
    <div class="drop glass" id="userDrop"><span class="role">${isOwner ? 'Owner' : 'Customer'}</span><small>${esc(user.email)}</small><button class="btn small wide" id="logoutBtn">Log out</button></div>`;
  $('#userBtn').onclick = (e) => { e.stopPropagation(); $('#userDrop').classList.toggle('open'); };
  $('#logoutBtn').onclick = logout;
  $('#drawerUser').innerHTML = `<span class="avatar">${av}</span><div><strong>${esc(name)}</strong><small>${isOwner ? 'Owner account' : `${flag(me?.countryCode)} ${esc(me?.country || 'Customer')}`}</small></div>`;
  if (!loggedIn) $('#drawerUser').innerHTML = '';
}
document.addEventListener('click', (e) => { if (!e.target.closest('.top-right')) $('#userDrop')?.classList.remove('open'); });

/* ================================================================== session */
const stopAll = () => { unsubs.forEach((u) => u()); unsubs = []; unsubActive?.(); unsubActive = null; };
onAuthStateChanged(auth, (u) => { if (!signingUp) handleUser(u); });

async function handleUser(u) {
  stopAll();
  const wasIn = !!user;
  user = u; me = null; meLoaded = false; shown = ''; activeUid = null; customers = []; panelOpen = false;
  $('#chatPanel').classList.remove('open');
  const emailMatch = !!u && (u.email || '').toLowerCase() === ownerEmail;
  let verified = false;
  if (emailMatch) {
    // A refreshed page can hold an old "not verified" value. Ask Firebase for the fresh one,
    // and use the same token Firestore will check.
    try { await u.reload(); verified = (await u.getIdTokenResult(true)).claims.email_verified === true; }
    catch (e) { console.warn('verify check', e); verified = !!u.emailVerified; }
  }
  isOwner = emailMatch && verified;
  ownerRetried = false;
  $('#verifyBanner').hidden = !(emailMatch && !verified);
  renderDrawerNav();
  if (!u) {
    if (wasIn) { history.replaceState(null, '', '#/home'); setAuthMode('login'); }
    ready = true; renderTop(); updateChrome(); finishBoot(); route(); return;
  }

  try { await ensureUserDoc(u); } catch (e) { console.warn('user doc', e); }
  unsubs.push(onSnapshot(doc(db, 'users', u.uid), (s) => {
    me = s.exists() ? s.data({ serverTimestamps: 'estimate' }) : {};
    meLoaded = true; ready = true;
    renderTop(); onMeChange(); finishBoot(); route(); updateChrome();
    if (needsProfile()) { setAuthMode('profile'); if (!$('#authNick').value) $('#authNick').value = (u.displayName || '').split(' ')[0].slice(0, 24); }
  }, (e) => { console.error(e); me = {}; meLoaded = true; ready = true; toast(errText(e)); finishBoot(); route(); }));

  unsubs.push(onSnapshot(query(collection(db, 'feedback'), orderBy('createdAt', 'desc')), (snap) => {
    feedbacks = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    renderFeedback();
  }, (e) => console.warn('feedback', e)));

  if (isOwner) startOwner(); else startCustomer(u);
}
const finishBoot = () => $('#boot').classList.add('gone');
$('#resendVerify').onclick = async () => { try { await sendEmailVerification(auth.currentUser); toast('Verification email sent.'); } catch { toast('Wait a moment before resending.'); } };
$('#checkVerify').onclick = async () => {
  await auth.currentUser.reload(); await handleUser(auth.currentUser);
  toast(isOwner ? 'Verified. Owner dashboard unlocked.' : 'Not verified yet. Open the link in your email first.');
};

/* ================================================================== sending messages */
async function ownerRetry(fn) {
  try { return await fn(); }
  catch (e) {
    if (e.code !== 'permission-denied') throw e;
    await auth.currentUser?.getIdToken(true);
    return await fn();
  }
}
const ruleHelp = 'Blocked by Firestore rules. Check the owner email in firestore.rules, publish the rules, then log out and log in again.';
async function sendMessage(uid, raw, sender) {
  const text = raw.trim().slice(0, 1000); if (!text) return;
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'users', uid, 'messages')), { text, sender, createdAt: serverTimestamp() });
  const meta = { lastMessage: text.slice(0, 80), lastMessageAt: serverTimestamp() };
  if (sender === 'customer') meta.unreadOwner = increment(1); else meta.unreadCustomer = increment(1);
  batch.set(doc(db, 'users', uid), meta, { merge: true });
  await batch.commit();
}
function renderMsgs(boxes, docs, mySender, emptyText) {
  boxes.filter(Boolean).forEach((box) => {
    box.innerHTML = '';
    if (emptyText) { const s = document.createElement('div'); s.className = 'msg sys'; s.textContent = emptyText; box.append(s); }
    docs.forEach((d) => {
      const m = d.data({ serverTimestamps: 'estimate' });
      const el = document.createElement('div');
      el.className = 'msg ' + (m.sender === mySender ? 'me' : 'them');
      el.textContent = m.text;
      const t = document.createElement('time'); t.textContent = fmtTime(m.createdAt); el.append(t);
      box.append(el);
    });
    box.scrollTop = box.scrollHeight;
  });
}

/* ================================================================== customer side */
const chatVisible = () => panelOpen || shown === 'dashboard';
function startCustomer(u) {
  const q = query(collection(db, 'users', u.uid, 'messages'), orderBy('createdAt', 'asc'));
  unsubs.push(onSnapshot(q, (snap) => {
    renderMsgs([$('#dashMsgs'), $('#panelMsgs')], snap.docs, 'customer', `Hi ${nick()}! Tell me about your project. Only you and ${OWNER.firstName} can read this chat.`);
  }, (e) => { console.error(e); toast(errText(e)); }));
}
function markCustomerRead() {
  if (!user || isOwner || !me?.unreadCustomer) return;
  updateDoc(doc(db, 'users', user.uid), { unreadCustomer: 0 }).catch(() => {});
}
function onMeChange() {
  if (isOwner || !me) return;
  const n = me.unreadCustomer || 0, b = $('#fabBadge');
  if (n && chatVisible()) markCustomerRead();
  b.textContent = n; b.hidden = !n || chatVisible();
  renderCustomerDash(); renderFeedbackForm();
}
function renderCustomerDash() {
  const st = stOf(me), name = nick();
  $('#cdAvatar').innerHTML = `${esc(initials(name))}${user.photoURL ? `<img src="${esc(user.photoURL)}" alt="" onerror="this.remove()" />` : ''}`;
  $('#cdHello').textContent = `Hi, ${name}!`;
  $('#cdWhere').textContent = me?.country ? `${flag(me.countryCode)} ${me.country}` : 'Welcome to Webbins';
  $('#cdChip').className = `status-chip st-${st}`; $('#cdChip').textContent = `${STATUS[st].icon} ${STATUS[st].label}`;
  const at = ORDER.indexOf(st);
  $('#tracker').innerHTML = ORDER.map((k, i) => `<div class="step st-${k} ${i < at ? 'done' : ''} ${i === at ? 'now done' : ''}"><div class="orb">${STATUS[k].icon}</div><strong>${STATUS[k].label}</strong><small>${i === at ? esc(STATUS[k].hint) : ''}</small></div>`).join('');
  const allowed = !!me?.feedbackAllowed;
  $('#fbAction').classList.toggle('locked', !allowed);
  $('#fbActionText').textContent = allowed ? 'I unlocked it for you. Tap to review me.' : 'I will unlock this when your project is done';
}
function setPanel(open) {
  if (isOwner || !user) return;
  panelOpen = open; $('#chatPanel').classList.toggle('open', open);
  if (open) { $('#fabBadge').hidden = true; markCustomerRead(); setTimeout(() => $('#panelInput').focus(), 300); }
}
function openChat(prefill) {
  if (shown === 'dashboard') { $('#chatCard').scrollIntoView({ behavior: 'smooth', block: 'center' }); if (prefill) $('#dashInput').value = prefill; setTimeout(() => $('#dashInput').focus(), 300); }
  else { setPanel(true); if (prefill) $('#panelInput').value = prefill; }
}
$('#chatFab').onclick = () => (panelOpen ? setPanel(false) : openChat());
$('#chatClose').onclick = () => setPanel(false);
document.addEventListener('click', (e) => {
  const o = e.target.closest('[data-open-chat]'); if (o && user && !isOwner) openChat();
  const p = e.target.closest('[data-plan]'); if (p && user && !isOwner) openChat(`Hi! I am interested in the ${p.dataset.plan} plan.`);
  const a = e.target.closest('[data-ask]'); if (a && user && !isOwner) openChat(`Hi! I like your ${a.dataset.ask} project. Can you build something similar for me?`);
});
function bindChat(formSel, inputSel) {
  $(formSel).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!user || isOwner) return;
    const input = $(inputSel), text = input.value; input.value = '';
    try { await sendMessage(user.uid, text, 'customer'); }
    catch (ex) { console.error(ex); input.value = text; toast('Message not sent. Please try again.'); }
  });
}
bindChat('#dashForm', '#dashInput'); bindChat('#panelForm', '#panelInput');
$('#paidBtn').onclick = async () => {
  if (!user || isOwner) { toast('Customers use this button after they pay.'); return; }
  try { await sendMessage(user.uid, 'Hi! I have sent my payment through Wise. Please check and confirm. Thank you!', 'customer'); toast('I told the owner you paid. Wait for confirmation in the chat.'); }
  catch { toast('Could not send. Please try again.'); }
};

/* ================================================================== feedback + ratings */
const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
function renderFeedback() {
  const n = feedbacks.length, avg = n ? feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / n : 0;
  const sat = feedbacks.filter((f) => f.rating >= 4).length + (STATS.extraSatisfied || 0);
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, c: feedbacks.filter((f) => f.rating === s).length }));
  $('#ratingBox').innerHTML = `<div class="big-score"><strong>${n ? avg.toFixed(1) : '–'}</strong><div class="stars">${stars(avg)}</div><small>${n} review${n === 1 ? '' : 's'}</small></div>
    <div class="dist">${dist.map((d) => `<div><span>${d.s}★</span><div class="track"><div class="fill" style="width:${n ? (d.c / n) * 100 : 0}%"></div></div><span>${d.c}</span></div>`).join('')}</div>`;
  $('#clientStats').innerHTML = `<div class="glass stat-card"><span class="bar-c"></span><strong data-k="sat">0</strong><span>Satisfied customers</span></div>
    <div class="glass stat-card"><span class="bar-c" style="--c:#ffd166"></span><strong data-k="avg">0</strong><span>Average rating (out of 5)</span></div>
    <div class="glass stat-card"><span class="bar-c" style="--c:var(--mint)"></span><strong data-k="proj">0</strong><span>Projects delivered</span></div>`;
  countTo($('[data-k=sat]'), sat); countTo($('[data-k=avg]'), avg, 1); countTo($('[data-k=proj]'), STATS.projectsDone || 0);
  $('#fbWall').innerHTML = n ? feedbacks.map((f) => `<article class="glass fb"><header><div class="avatar">${esc(initials(f.nickname))}</div>
    <div><strong>${esc(f.nickname || 'Customer')}</strong><small>${flag(f.countryCode)} ${esc(f.country || '')} · ${fmtTime(f.createdAt)}</small></div><span class="stars">${stars(f.rating)}</span></header>
    <p>${esc(f.text)}</p>${isOwner ? `<button class="del" data-del="${esc(f.id)}">Remove this review</button>` : ''}</article>`).join('')
    : '<div class="glass pad"><p class="sub">No reviews yet. The first one will appear here.</p></div>';
  renderFeedbackForm();
}
$('#fbWall').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-del]'); if (!b || !isOwner) return;
  if (confirm('Remove this review?')) { try { await deleteDoc(doc(db, 'feedback', b.dataset.del)); toast('Review removed.'); } catch { toast('Could not remove it.'); } }
});
function renderFeedbackForm() {
  const card = $('#fbFormCard'); if (!card) return;
  if (isOwner) { card.dataset.sig = 'owner'; card.innerHTML = '<span class="lock-ico">🛡️</span><h3>Owner view</h3><p class="lock">You can remove a review with the button on its card. Use "Allow feedback" in your dashboard to let a customer review you.</p>'; return; }
  const mine = feedbacks.find((f) => f.id === user?.uid);
  const sig = [!!me?.feedbackAllowed, mine?.rating, mine?.text].join('|');
  if (card.dataset.sig === sig) return;
  card.dataset.sig = sig;
  if (!me?.feedbackAllowed && !mine) { card.innerHTML = '<span class="lock-ico">🔒</span><h3>Feedback is locked</h3><p class="lock">After your project, I will unlock feedback for you here. Then you can rate my work and write a review.</p>'; return; }
  if (!me?.feedbackAllowed && mine) { card.innerHTML = `<span class="lock-ico">💚</span><h3>Thank you!</h3><p class="lock">Your review is on the wall: ${stars(mine.rating)}</p>`; return; }
  fbRating = mine?.rating || fbRating || 0;
  card.innerHTML = `<h3>${mine ? 'Edit your review' : 'Rate my work'}</h3><p class="lock" style="margin-bottom:14px">${mine ? 'You can change your review any time.' : 'Your nickname and country will show with your review.'}</p>
    <div class="star-input" id="starInput">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-s="${n}" class="${n <= fbRating ? 'on' : ''}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
    <label class="field"><span>Your feedback</span><textarea id="fbText" maxlength="500" placeholder="How was working with Webbins?">${esc(mine?.text || '')}</textarea></label>
    <p class="err" id="fbErr"></p><button class="btn primary wide" id="fbSubmit">${mine ? 'Update review' : 'Send review'}</button>`;
}
$('#fbFormCard').addEventListener('click', async (e) => {
  const s = e.target.closest('[data-s]');
  if (s) { fbRating = +s.dataset.s; $$('#starInput button').forEach((b) => b.classList.toggle('on', +b.dataset.s <= fbRating)); return; }
  if (!e.target.closest('#fbSubmit')) return;
  const text = $('#fbText').value.trim(), err = $('#fbErr');
  if (!fbRating) { err.textContent = 'Tap the stars to give a rating.'; return; }
  if (text.length < 3) { err.textContent = 'Write a short feedback.'; return; }
  try {
    await setDoc(doc(db, 'feedback', user.uid), { uid: user.uid, nickname: me.nickname, country: me.country, countryCode: me.countryCode, rating: fbRating, text, createdAt: serverTimestamp() });
    toast('Thank you for your review!'); err.textContent = '';
  } catch (ex) { console.error(ex); err.textContent = 'Could not send. Ask me to allow feedback again.'; }
});

/* ================================================================== owner dashboard */
function startOwner() {
  unsubs.push(onSnapshot(collection(db, 'users'), (snap) => {
    customers = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })).filter((c) => (c.email || '').toLowerCase() !== ownerEmail);
    customers.sort((a, b) => (toDate(b.lastMessageAt || b.createdAt)?.getTime() || 0) - (toDate(a.lastMessageAt || a.createdAt)?.getTime() || 0));
    renderOwner();
  }, (e) => {
    if (e.code === 'permission-denied' && !ownerRetried) {
      ownerRetried = true;
      auth.currentUser?.getIdToken(true).then(() => { if (isOwner) startOwner(); });
      return;
    }
    showOwnerError(e);
  }));
}
function showOwnerError(e) {
  console.error(e);
  const msg = e.code === 'permission-denied'
    ? 'Firestore blocked the customer list. Check that the owner email in firestore.rules is exactly your login email, that the rules are published, and that your email is verified. Then log out and log in again.'
    : 'Could not load customers. Check your internet connection and reload the page.';
  $('#custList').innerHTML = `<li class="none">${esc(msg)}</li>`;
  toast('Cannot load customers.');
}
const isLocal = (c) => c.countryCode === 'PH';
function renderOwner() {
  const cnt = (f) => customers.filter(f).length;
  $('#ownerStats').innerHTML = [
    { k: 'all', n: customers.length, l: 'All customers', c: 'var(--violet)', type: 'region' },
    { k: 'local', n: cnt(isLocal), l: '🇵🇭 Local (Philippines)', c: '#ff7a59', type: 'region' },
    { k: 'intl', n: cnt((c) => !isLocal(c)), l: '🌍 International', c: 'var(--cyan)', type: 'region' },
    ...ORDER.map((s) => ({ k: s, n: cnt((c) => stOf(c) === s), l: s === 'inquiry' ? 'Inquiries' : STATUS[s].label, c: `var(--st-${s})`, type: 'status' })),
  ].map((s) => `<button class="glass stat-card ${(s.type === 'region' ? regionF : statusF) === s.k ? 'sel' : ''}" data-${s.type}="${s.k}" style="--c:${s.c}"><span class="bar-c"></span><strong>${s.n}</strong><span>${s.l}</span></button>`).join('');
  $$('#regionSeg button').forEach((b) => b.classList.toggle('active', b.dataset.region === regionF));
  const inRegion = customers.filter((c) => regionF === 'all' || (regionF === 'local') === isLocal(c));
  $('#statusTabs').innerHTML = [['all', 'All'], ...ORDER.map((s) => [s, STATUS[s].label])].map(([k, l]) =>
    `<button class="stab ${statusF === k ? 'active' : ''}" data-status="${k}" style="--c:${k === 'all' ? '#8b6bff' : `var(--st-${k})`}">${l}<b>${k === 'all' ? inRegion.length : inRegion.filter((c) => stOf(c) === k).length}</b></button>`).join('');
  const term = $('#custSearch').value.trim().toLowerCase();
  const list = inRegion.filter((c) => (statusF === 'all' || stOf(c) === statusF) &&
    (!term || [c.nickname, c.country, c.email].some((v) => (v || '').toLowerCase().includes(term))));
  $('#custList').innerHTML = list.length ? list.map((c) => `<li class="cust ${c.id === activeUid ? 'active' : ''} ${c.unreadOwner ? 'unread' : ''}" data-uid="${esc(c.id)}" tabindex="0">
    <div class="avatar">${esc(initials(c.nickname || c.email))}</div>
    <div class="info"><div class="row"><strong>${esc(c.nickname || (c.email || 'Customer').split('@')[0])}</strong><time>${fmtTime(c.lastMessageAt || c.createdAt)}</time></div>
    <div class="meta"><span>${flag(c.countryCode)} ${esc(c.country || 'No country yet')}</span><span class="mini" style="--c:var(--st-${stOf(c)})"></span><span>${STATUS[stOf(c)].label}</span></div>
    <p>${esc(c.lastMessage || 'No messages yet')}</p></div>${c.unreadOwner ? `<span class="n">${c.unreadOwner}</span>` : ''}</li>`).join('')
    : `<li class="none">${customers.length ? 'No customers match these filters.' : 'No customers yet. They appear here when they sign up.'}</li>`;
  const b = $('#chatFab'); if (b) b.hidden = true;
  if (activeUid) renderControls();
}
// stat cards, region and status tabs all filter the same list
document.addEventListener('click', (e) => {
  const r = e.target.closest('[data-region]'), s = e.target.closest('[data-status]');
  if (!isOwner || (!r && !s)) return;
  if (r) regionF = r.dataset.region; if (s) statusF = s.dataset.status;
  renderOwner();
});
$('#custSearch').addEventListener('input', renderOwner);
const pick = (e) => { const li = e.target.closest('.cust'); if (li) openConversation(li.dataset.uid); };
$('#custList').addEventListener('click', pick);
$('#custList').addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(e); });

function renderControls() {
  const c = customers.find((x) => x.id === activeUid); if (!c) return;
  const st = stOf(c);
  $('#oName').textContent = c.nickname || c.email || 'Customer';
  $('#oMeta').textContent = `${flag(c.countryCode)} ${c.country || 'No country yet'} · ${c.email || ''}`;
  $('#oAvatar').textContent = initials(c.nickname || c.email);
  $('#oControls').innerHTML = `<span class="lbl">Status:</span>${ORDER.map((k) => `<button class="sbtn ${st === k ? 'active' : ''}" data-set="${k}" style="--c:var(--st-${k})">${STATUS[k].icon} ${STATUS[k].label}</button>`).join('')}
    <button class="allow ${c.feedbackAllowed ? 'on' : ''}" id="allowBtn">${c.feedbackAllowed ? '✓ Feedback allowed' : 'Allow feedback'}</button>`;
}
$('#oControls').addEventListener('click', async (e) => {
  if (!activeUid) return;
  const c = customers.find((x) => x.id === activeUid); if (!c) return;
  const set = e.target.closest('[data-set]'), allow = e.target.closest('#allowBtn');
  try {
    if (set) { await ownerRetry(() => updateDoc(doc(db, 'users', activeUid), { status: set.dataset.set })); toast(`Marked as ${STATUS[set.dataset.set].label}.`); }
    if (allow) { await ownerRetry(() => updateDoc(doc(db, 'users', activeUid), { feedbackAllowed: !c.feedbackAllowed })); toast(c.feedbackAllowed ? 'Feedback turned off for this customer.' : 'This customer can now leave feedback.'); }
  } catch (ex) { console.error(ex); toast(ex.code === 'permission-denied' ? ruleHelp : 'Could not save. Please try again.'); }
});
function openConversation(uid) {
  if (!customers.find((x) => x.id === uid)) return;
  activeUid = uid; unsubActive?.();
  $('#dashEmpty').hidden = true; $('#ownerChat').hidden = false; $('#ownerGrid').classList.add('show-chat');
  renderControls(); renderOwner();
  const q = query(collection(db, 'users', uid, 'messages'), orderBy('createdAt', 'asc'));
  unsubActive = onSnapshot(q, (snap) => {
    renderMsgs([$('#ownerMsgs')], snap.docs, 'owner', snap.empty ? 'No messages yet. Say hello below.' : '');
    if (snap.docs.length && customers.find((c) => c.id === uid)?.unreadOwner) updateDoc(doc(db, 'users', uid), { unreadOwner: 0 }).catch(() => {});
  });
  setTimeout(() => $('#ownerInput').focus(), 250);
}
$('#ownerBack').onclick = () => $('#ownerGrid').classList.remove('show-chat');
$('#ownerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#ownerInput'), text = input.value; if (!activeUid) return; input.value = '';
  try { await ownerRetry(() => sendMessage(activeUid, text, 'owner')); }
  catch (ex) { console.error(ex); input.value = text; toast(ex.code === 'permission-denied' ? ruleHelp : 'Reply not sent. Please try again.'); }
});

/* ================================================================== works viewer + effects */
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('.chip-btn'); if (!b) return;
  $$('.chip-btn').forEach((x) => x.classList.toggle('active', x === b));
  $$('.work').forEach((w) => w.classList.toggle('hide', b.dataset.cat !== 'All' && w.dataset.cat !== b.dataset.cat));
});
$('#worksGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.work'); if (!card) return;
  const w = WORKS[card.dataset.i];
  $('#workCard').innerHTML = `<button class="icon-btn modal-x" data-close aria-label="Close">✕</button><div class="work-view">
    <div class="slot"><div class="slot-ph"><span>📷</span><b>Put your image here</b><code>public${esc(w.image)}</code></div><img src="${esc(w.image)}" alt="" onerror="this.remove()" /></div>
    <div class="body"><h3>${esc(w.title)}</h3><div class="tags">${w.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div><p>${esc(w.text)}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn primary" href="${esc(w.link)}" target="_blank" rel="noopener">Visit website</a>
    ${isOwner ? '' : `<button class="btn" data-close data-ask="${esc(w.title)}">Ask me about this</button>`}</div></div></div>`;
  openModal($('#workModal'));
});
let io;
function observeReveals() {
  io ||= new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12 });
  $$('.reveal:not(.in)').forEach((el) => io.observe(el));
}
function initEffects() {
  const glow = $('#glow');
  addEventListener('pointermove', (e) => { glow.style.opacity = 1; glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; });
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest?.('.tilt'); if (!t || matchMedia('(hover:none)').matches) return;
    const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    t.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg)`;
  });
  document.addEventListener('pointerout', (e) => { const t = e.target.closest?.('.tilt'); if (t) t.style.transform = ''; });
}

/* ================================================================== go */
renderStatic(); initEffects(); setAuthMode('login'); renderTop();
setTimeout(() => { if (!ready) { ready = true; finishBoot(); route(); } }, 6000); // never hang on a slow connection