/* ---------- shared feed (Firebase) ----------
   With this on, the Feed lives in your own Firestore database, so every device shows the same posts, comments, likes
   and notifications. Only one device writes new things at a time (the one you used most recently: "the writer"); the
   others follow along. Each device keeps its local copy and only reads what changed since it last looked.

   Firestore layout (all under users/<your account>):
     posts/<post id>   {d: the post as JSON, u: when it last changed, by: which device}
     state/feed        {d: follows, followers, likes, notifications, queued jobs… as JSON, u, by}
     state/lead        {dev, at}  which device is the writer, and when it last checked in
   The Firebase library is only loaded once you turn this on. */
const CLOUD_CFG = {
  apiKey: 'AIzaSyBcDs4s56dN3q3pbVEKeo-C5n94EPpFUks',
  authDomain: 'focus-bench-b3998.firebaseapp.com',
  projectId: 'focus-bench-b3998',
  storageBucket: 'focus-bench-b3998.firebasestorage.app',
  messagingSenderId: '24420882126',
  appId: '1:24420882126:web:aaa61852542dd60631229f'
};
let CL = store.get('fb.cloud', {});                                  // {on, email, dev, since, ready, ops: {day, r, w}}
if (!CL.dev){ CL.dev = 'd' + Math.random().toString(36).slice(2, 10); store.set('fb.cloud', CL); }
const saveCl = () => store.set('fb.cloud', CL);
const CLX = {fb: null, app: null, auth: null, db: null, user: null, lead: null, unsub: [], sig: new Map(), stateSig: '', busy: false, err: '', status: 'off'};
const cloudOn = () => !!(CL.on && CLX.user && CL.ready);
// the writer: this device when it's the one in charge (or nobody has checked in for 3 minutes); always true with the shared feed off
function cloudWriter(){
  if (!CL.on || !CL.ready) return true;
  if (!CLX.user || CLX.busy && !CLX.lead) return false;        // still signing back in: wait rather than make a feed of our own
  const L = CLX.lead; if (!L) return false;
  return L.dev === CL.dev || Date.now() - (L.at || 0) > 3 * 60000;
}
function clCount(kind, n = 1){
  const day = dayKey(Date.now()); if (!CL.ops || CL.ops.day !== day) CL.ops = {day, r: 0, w: 0};
  CL.ops[kind] += n; clSaveSoon();
}
let clSaveT = null; const clSaveSoon = () => { clearTimeout(clSaveT); clSaveT = setTimeout(saveCl, 2000); };
const clPath = (...p) => ['users', CLX.user.uid, ...p];

/* ---- loading Firebase and signing in ---- */
function clLoadLib(){
  if (window.FBX) return Promise.resolve();
  return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'js/vendor/firebase.js'; s.onload = ok; s.onerror = () => bad(new Error('Couldn’t load Firebase. Check your connection.')); document.head.appendChild(s); });
}
async function clStart(){
  await clLoadLib();
  if (!CLX.app){
    const F = window.FBX; CLX.fb = F;
    CLX.app = F.initializeApp(CLOUD_CFG); CLX.auth = F.getAuth(CLX.app); CLX.db = F.getFirestore(CLX.app);
    try { await F.getRedirectResult(CLX.auth); } catch(e){ clError(e); }
    F.onAuthStateChanged(CLX.auth, u => { CLX.user = u; if (u){ CL.email = u.email; saveCl(); clConnect(); } else { clDisconnect(); CLX.status = CL.on ? 'signed-out' : 'off'; renderCloud(); } });
  }
}
async function clSignIn(){
  CLX.err = ''; CLX.status = 'signing-in'; renderCloud();
  try {
    await clStart(); const F = CLX.fb, prov = new F.GoogleAuthProvider();
    CL.on = true; saveCl();
    try { await F.signInWithPopup(CLX.auth, prov); }
    catch(e){ if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) await F.signInWithRedirect(CLX.auth, prov); else throw e; }
  } catch(e){ clError(e); }
}
async function clSignOut(){
  clDisconnect(); CL.on = false; CL.ready = false; saveCl();
  try { if (CLX.auth) await CLX.fb.signOut(CLX.auth); } catch(e){}
  CLX.status = 'off'; renderCloud(); toast('Shared feed turned off on this device. Your feed stays as it is here.');
}
function clError(e){
  console.error(e);
  const c = e && e.code || '';
  CLX.err = c === 'permission-denied' ? 'That Google account isn’t allowed by your Firestore rules. Sign in with the email you put in the rules.'
    : c === 'auth/unauthorized-domain' ? 'This site isn’t in Firebase’s Authorized domains yet (Authentication → Settings → Authorized domains).'
    : c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request' ? 'Sign-in was closed before it finished.'
    : c === 'resource-exhausted' ? 'Today’s free Firestore allowance is used up. The shared feed picks up again after midnight Pacific.'
    : (e && e.message) || 'Something went wrong.';
  CLX.status = 'error'; renderCloud();
}
function clDisconnect(){ CLX.unsub.forEach(f => { try { f(); } catch(e){} }); CLX.unsub = []; CLX.lead = null; }

/* ---- connecting: the first time, either upload this device's feed (empty cloud) or switch to the cloud's ---- */
async function clConnect(){
  if (CLX.busy) return; CLX.busy = true; CLX.err = '';
  try {
    while (!FD_READY) await new Promise(r => setTimeout(r, 500));
    const F = CLX.fb, db = CLX.db;
    if (!CL.ready){
      CLX.status = 'setting-up'; renderCloud();
      const any = await F.getDocs(F.query(F.collection(db, ...clPath('posts')), F.limit(1))); clCount('r', Math.max(1, any.size));
      if (any.empty){ await clUploadAll(); toast('Shared feed is on. This device’s feed is now in the cloud.'); }
      else { await clAdopt(); toast('Shared feed is on. This device now shows your shared feed.'); }
      CL.ready = true; CL.since = Date.now() - 60000; saveCl();
    } else await clLoadSigs();
    clListen(); clClaim(true);
    CLX.status = 'on'; renderCloud();
  } catch(e){ clError(e); }
  finally { CLX.busy = false; }
}
// a post as stored: everything but working fields, with all its comments
async function clPostDoc(p){
  if (!p.cm) await fdCm(p);
  const o = {}; for (const k in p) if (k !== 'k' && k[0] !== '_' && k !== 'pv' && k !== 'cn') o[k] = p[k];
  return {d: JSON.stringify(o), u: Date.now(), by: CL.dev};
}
const clSig = p => fdPSig(p) + '#' + (p.cm ? fdCSig(p) : 'x');
const clStateObj = () => { const {posts, ...rest} = FD; return rest; };
async function clUploadAll(){
  const F = CLX.fb, list = FD.posts.slice();
  for (let i = 0; i < list.length; i += 400){
    const b = F.writeBatch(CLX.db), part = list.slice(i, i + 400);
    for (const p of part){ b.set(F.doc(CLX.db, ...clPath('posts', p.id)), await clPostDoc(p)); }
    await b.commit(); clCount('w', part.length);
    part.forEach(p => CLX.sig.set(p.id, clSig(p)));
    CLX.status = `uploading ${Math.min(list.length, i + 400)}/${list.length}`; renderCloud();
  }
  await clPushState(true); clSaveSigs();
}
async function clAdopt(){
  const F = CLX.fb, snap = await F.getDocs(F.collection(CLX.db, ...clPath('posts'))); clCount('r', snap.size);
  const cloud = []; snap.forEach(d => { try { const v = d.data(); if (!v.x) cloud.push(JSON.parse(v.d)); } catch(e){} });
  const ids = new Set(cloud.map(p => p.id)), mine = FD.posts.filter(p => p.w === -1 && !ids.has(p.id));   // your own posts only here get added
  const gone = FD.posts.filter(p => !ids.has(p.id) && p.w !== -1).map(p => p.id);
  FD.posts = cloud.filter(fdCurrent).concat(mine);
  FD_PS.clear(); FD_CS.clear();
  if (gone.length) IDB.setMany(gone.flatMap(id => [['fp:' + id, undefined], ['fc:' + id, undefined]])).catch(console.error);
  cloud.forEach(p => CLX.sig.set(p.id, clSig(p)));
  const st = await F.getDoc(F.doc(CLX.db, ...clPath('state', 'feed'))); clCount('r');
  if (st.exists()) clApplyState(st.data(), true);
  saveFeed(); fdPersist(); renderFeed(); clSaveSigs();
}
async function clLoadSigs(){ try { const m = await IDB.get('cl:sig'); if (m) CLX.sig = new Map(Object.entries(m)); } catch(e){} }
let clSigT = null; function clSaveSigs(){ clearTimeout(clSigT); clSigT = setTimeout(() => IDB.set('cl:sig', Object.fromEntries(CLX.sig)).catch(() => {}), 3000); }

/* ---- following changes from other devices ---- */
function clListen(){
  clDisconnect();
  const F = CLX.fb, db = CLX.db, since = (CL.since || Date.now()) - 5 * 60000;
  CLX.unsub.push(F.onSnapshot(F.query(F.collection(db, ...clPath('posts')), F.where('u', '>', since)), snap => {
    let n = 0; const got = [];
    snap.docChanges().forEach(ch => { n++; if (ch.type === 'removed') return; const v = ch.doc.data(); if (v.by === CL.dev) return; got.push([ch.doc.id, v]); });
    if (n) clCount('r', n);
    if (got.length) clApplyPosts(got);
  }, clError));
  CLX.unsub.push(F.onSnapshot(F.doc(db, ...clPath('state', 'feed')), d => { clCount('r'); if (d.exists()){ const v = d.data(); if (v.by !== CL.dev) clApplyState(v); } }, clError));
  CLX.unsub.push(F.onSnapshot(F.doc(db, ...clPath('state', 'lead')), d => { clCount('r'); const was = cloudWriter(); CLX.lead = d.exists() ? d.data() : null; if (was !== cloudWriter()) renderCloud(); }, clError));
}
function clApplyPosts(list){
  let changed = false;
  list.forEach(([id, v]) => {
    let r; try { r = JSON.parse(v.d); } catch(e){ return; }
    if (!v.x && !fdCurrent(r)) return;                                  // a bot post from before the feed was reset
    const i = FD.posts.findIndex(p => p.id === id), local = i >= 0 ? FD.posts[i] : null;
    if (v.x){ if (local){ FD.posts.splice(i, 1); IDB.setMany([['fp:' + id, undefined], ['fc:' + id, undefined]]).catch(() => {}); changed = true; } return; }
    // comments from both sides (what this device wrote and hasn't sent yet stays)
    if (local && local.cm && r.cm){ const ids = new Set(r.cm.map(c => c.id)); r.cm = r.cm.concat(local.cm.filter(c => !ids.has(c.id))).sort((a, b) => a.t - b.t); }
    const extra = local && local.cm && r.cm ? r.cm.length - (JSON.parse(v.d).cm || []).length : 0;
    if (i >= 0) FD.posts[i] = r; else FD.posts.push(r);
    CLX.sig.set(id, extra > 0 ? 'merge' : clSig(r));              // 'merge': it has comments of ours to send back
    changed = true;
  });
  if (changed){ CL.since = Math.max(CL.since || 0, ...list.map(([, v]) => v.u || 0)); saveCl(); saveFeed(); fdPersistSoon(); clSaveSigs(); renderFeed(); if (typeof fdViewRefresh === 'function' && FDV.view) fdViewRefresh(); }
}
// the rest of the feed: follows, followers, likes, notifications, queued jobs. Likes and notifications from both sides are kept.
function clApplyState(v, first){
  let s; try { s = JSON.parse(v.d); } catch(e){ return; }
  const liked = {...(first ? {} : FD.liked), ...(s.liked || {})}, cliked = {...(first ? {} : FD.cliked || {}), ...(s.cliked || {})};
  const seen = new Set((s.notif || []).map(n => n.t + '|' + n.html));
  const notif = (s.notif || []).concat(first ? [] : FD.notif.filter(n => !seen.has(n.t + '|' + n.html))).sort((a, b) => a.t - b.t).slice(-150);
  Object.keys(s).forEach(k => { if (k !== 'posts') FD[k] = s[k]; });
  FD.liked = liked; FD.cliked = cliked; FD.notif = notif;
  CLX.stateSig = JSON.stringify(clStateObj());
  saveFeed(); renderFeed(); if (typeof fdBadge === 'function') fdBadge();
}

/* ---- sending this device's changes ---- */
async function clPush(){
  if (!cloudOn() || CLX.busy) return;
  CLX.busy = true;
  try {
    const F = CLX.fb, now = Date.now(), list = FD.posts.filter(p => CLX.sig.get(p.id) !== clSig(p));
    for (let i = 0; i < list.length; i += 400){
      const b = F.writeBatch(CLX.db), part = list.slice(i, i + 400);
      for (const p of part) b.set(F.doc(CLX.db, ...clPath('posts', p.id)), await clPostDoc(p));
      await b.commit(); clCount('w', part.length); part.forEach(p => CLX.sig.set(p.id, clSig(p)));
    }
    // posts this device dropped for being old: the writer clears them out of the cloud too
    if (cloudWriter()){
      const keep = new Set(FD.posts.map(p => p.id)), gone = [...CLX.sig.keys()].filter(id => !keep.has(id));
      for (let i = 0; i < gone.length; i += 400){ const b = F.writeBatch(CLX.db), part = gone.slice(i, i + 400); part.forEach(id => b.delete(F.doc(CLX.db, ...clPath('posts', id)))); await b.commit(); clCount('w', part.length); part.forEach(id => CLX.sig.delete(id)); }
    }
    if (list.length) clSaveSigs();
    await clPushState();
    CL.since = Math.max(CL.since || 0, now - 60000); saveCl();
  } catch(e){ clError(e); }
  finally { CLX.busy = false; }
}
async function clPushState(force){
  const sig = JSON.stringify(clStateObj()); if (!force && sig === CLX.stateSig) return;
  await CLX.fb.setDoc(CLX.fb.doc(CLX.db, ...clPath('state', 'feed')), {d: sig, u: Date.now(), by: CL.dev}); clCount('w');
  CLX.stateSig = sig;
}
// the writer is whichever device you used last: using this one takes over (at most every 30 seconds), and the writer checks in every minute
let clLastClaim = 0;
async function clClaim(force){
  if (!cloudOn() || document.hidden) return;
  const now = Date.now(), L = CLX.lead, mine = L && L.dev === CL.dev;
  if (!force && mine && now - (L.at || 0) < 60000) return;
  if (!force && now - clLastClaim < 30000) return;
  clLastClaim = now;
  try { CLX.lead = {dev: CL.dev, at: now}; await CLX.fb.setDoc(CLX.fb.doc(CLX.db, ...clPath('state', 'lead')), CLX.lead); clCount('w'); renderCloud(); } catch(e){ clError(e); }
}
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { if (cloudOn() && CLX.lead && CLX.lead.dev !== CL.dev) clClaim(); }, {passive: true}));
setInterval(() => { if (cloudOn() && !document.hidden && cloudWriter()) clClaim(); }, 60000);
setInterval(() => { clPush(); }, 15000);
document.addEventListener('visibilitychange', () => { if (document.hidden) clPush(); else if (cloudOn()) clClaim(true); });
if (CL.on) setTimeout(() => clStart().catch(clError), 1500);

/* ---- Settings ---- */
function renderCloud(){
  const box = $('#cloudBody'); if (!box) return;
  const ops = CL.ops && CL.ops.day === dayKey(Date.now()) ? CL.ops : {r: 0, w: 0};
  const usage = `<p class="hint">Today on this device: ${ops.r.toLocaleString()} reads of 50,000 · ${ops.w.toLocaleString()} writes of 20,000 (free daily limits, shared by all your devices).</p>`;
  const err = CLX.err ? `<p class="hint" style="color:var(--danger,#d64545)">${esc(CLX.err)}</p>` : '';
  if (!CL.on || !CLX.user){
    box.innerHTML = `<p>See the same feed on every device: posts, comments, likes and notifications live in your own free Firebase database. Only your Google account can open it.</p>
      ${CLX.status === 'signing-in' ? '<p class="hint">Signing in…</p>' : ''}${err}
      <div class="confirm"><button class="small-btn accent" id="clIn">Sign in with Google</button></div>
      <p class="hint">The first device to sign in uploads its feed. Other devices then switch to that shared feed (their own bot posts are replaced; your own posts are kept).</p>`;
    return;
  }
  const w = cloudWriter(), st = CLX.status;
  box.innerHTML = `<p><b>On</b> · signed in as ${esc(CL.email || '')}</p>
    <p class="hint">${st === 'on' ? (w ? 'This device is writing the feed (new posts, comments and notifications). Others follow along.' : 'Another device is writing the feed. This one follows along, and takes over when you use it.') : esc(st)}</p>
    ${err}${usage}
    <div class="confirm"><button class="small-btn" id="clOut">Turn off on this device</button></div>`;
}
document.addEventListener('click', e => {
  if (e.target.closest('#clIn')) clSignIn();
  else if (e.target.closest('#clOut')) clSignOut();
});
setInterval(() => { if (!$('#page-settings') || $('#page-settings').hidden) return; renderCloud(); }, 20000);
renderCloud();
