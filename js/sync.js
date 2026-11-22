/* ---------- sync across devices through a private GitHub gist ----------
   The data lives in one private gist ("Focus Bench sync", file focus-bench-sync.json) on your GitHub account.
   Each device reads it, merges it with what it has, and writes the result back. Nothing else is involved: the
   app talks straight to api.github.com with a token that can only touch gists.

   Merging is per item, so two devices that both changed things keep both sets of changes:
     log      sessions, by time + length + task + activity (an edit is a delete plus an add)
     notes    by id
     settings by top-level setting (theme, timer lengths, music…)
     ranked   by top-level field (rating, match history…); simulation bookkeeping stays on each device
     guides   by guide id; quiz attempt history from both sides is combined
     ach      achievements: earliest unlock, highest counters
   Every item carries the time it last changed on any device (stamps), and deleted items leave a dated marker
   (dead), so a deletion on one device isn't undone by the other. The newest change wins.
   The token is kept in this browser only (fb.sync), never in backups or in the gist. */

const SYNC_FILE = 'focus-bench-sync.json', SYNC_DESC = 'Focus Bench sync', SYNC_API = 'https://api.github.com';
const SYNC_TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=' + encodeURIComponent('Focus Bench sync');
const SYNC_DELAY = 30000, DEAD_DAYS = 180, SYNC_VER = 'Nov 22 · 168';
let syncRemoteSum = null;
const RANKED_LOCAL = new Set(['cur', 'lastSim', 'lastSlice', 'simV', 'rar', 'rv', 'para', 'v', 'bots', 'prev', 'last']);
let SYNC = store.get('fb.sync', {});                     // {token, gist, login, last, err}
let SMETA = store.get('fb.syncMeta', {stamps: {}, dead: {}});
const saveSync = () => store.set('fb.sync', SYNC), saveMeta = () => store.set('fb.syncMeta', SMETA);
let syncSnap = null, syncApplying = false, syncDirty = false, syncBusy = false, syncAgain = false, syncTimer = null, syncState = '';

// a link from another device ("Connect another device") carries the token after #sync=
function takeSyncHash(){
  if (!location.hash.startsWith('#sync=')) return false;
  const t = decodeURIComponent(location.hash.slice(6)).trim();
  history.replaceState(null, '', location.pathname + location.search);
  if (!t || t === SYNC.token) return false;
  SYNC = {token: t}; saveSync(); SYNC.fromLink = true; return true;
}
takeSyncHash();
addEventListener('hashchange', () => { if (takeSyncHash() && syncSnap){ renderSyncPanel(); syncNow(); } });

/* ---- the sections and their items ---- */
const logKey = s => [s.t, s.min, s.task || '', s.tag || ''].join('|');
const SECTIONS = {
  log: {
    items: () => { const o = {}; LOG.forEach(s => { if (s && typeof s.t === 'number') o[logKey(s)] = s; }); return o; },
    put: o => { LOG = Object.values(o).sort((a, b) => a.t - b.t); store.set('fb.log', LOG); }
  },
  notes: {
    items: () => { const o = {}; NOTES.forEach(n => { if (n && n.id) o[n.id] = n; }); return o; },
    put: o => { const order = NOTES.map(n => n.id); NOTES = Object.values(o).sort((a, b) => (order.indexOf(a.id) + 1 || 1e9) - (order.indexOf(b.id) + 1 || 1e9)); saveNotes(); }
  },
  settings: {
    items: () => { const o = {}; Object.keys(P).forEach(k => { o[k] = P[k]; }); return o; },
    put: o => { Object.keys(o).forEach(k => { P[k] = o[k]; }); saveP(); }
  },
  ranked: {
    items: () => { const o = {}; Object.keys(R || {}).forEach(k => { if (!RANKED_LOCAL.has(k)) o[k] = R[k]; }); return o; },
    put: o => { Object.keys(o).forEach(k => { if (!RANKED_LOCAL.has(k)) R[k] = o[k]; }); store.set('fb.ranked', R); }
  },
  chat: {           // the global chat room: messages never change, so it's just the newest CHAT_MAX from every device
    items: () => { const o = {}; if (typeof CHATS !== 'undefined') CHATS.msgs.forEach(m => { if (m && m.id && chatKeep(m)) o[m.id] = m; }); return o; },
    put: o => { CHATS.msgs = Object.values(o).filter(chatKeep).sort((a, b) => a.t - b.t).slice(-CHAT_MAX); saveChat(); }
  },
  dms: {            // direct messages (a challenge's status can change, so stamps decide) and how far you've read each chat
    items: () => { const o = {}; if (typeof DMS === 'undefined') return o;
      DMS.msgs.forEach(m => { if (m && m.id) o[m.id] = m; }); Object.entries(DMS.read || {}).forEach(([w, t]) => { o['r' + w] = {r: t}; });
      Object.entries(DMS.hide || {}).forEach(([w, t]) => { o['h' + w] = {h: t}; }); return o; },
    put: o => { const msgs = [], read = {}, hide = {};
      Object.entries(o).forEach(([k, v]) => { if (/^r\d+$/.test(k) && v && v.r) read[k.slice(1)] = v.r; else if (/^h\d+$/.test(k) && v && v.h) hide[k.slice(1)] = v.h; else if (v && v.id) msgs.push(v); });
      DMS.msgs = msgs.sort((a, b) => a.t - b.t).slice(-DM_MAX); DMS.read = read; DMS.hide = hide; saveDms(); }
  },
  groups: {         // group chats: each group, the newest 300 messages of each, and how far you've read
    items: () => { const o = {}; if (typeof GC === 'undefined') return o;
      Object.values(GC.g).forEach(g => { o['g:' + g.id] = g; });
      const by = {}; GC.msgs.forEach(m => { (by[m.g] = by[m.g] || []).push(m); });
      Object.values(by).forEach(list => list.slice(-300).forEach(m => { o[m.id] = m; }));
      Object.entries(GC.read).forEach(([g, t]) => { o['r:' + g] = {r: t}; }); return o; },
    put: o => { if (typeof GC === 'undefined') return; const g = {}, msgs = [], read = {};
      Object.entries(o).forEach(([k, v]) => { if (!v) return; if (k.startsWith('g:')) g[k.slice(2)] = v; else if (k.startsWith('r:')) read[k.slice(2)] = v.r; else if (v.id) msgs.push(v); });
      // messages older than the newest 300 per group stay as they are on this device
      const have = new Set(msgs.map(m => m.id)); GC.msgs.forEach(m => { if (!have.has(m.id) && g[m.g]) msgs.push(m); });
      Object.values(g).forEach(x => { const old = GC.g[x.id]; if (old){ x.next = old.next; x.busy = 0; } });
      GC.g = g; GC.msgs = msgs.sort((a, b) => a.t - b.t); GC.read = read; saveGc(); if (typeof dcRefresh === 'function') dcRefresh(); }
  },
  feed: {           // your own posts (with their comments), who you follow and who follows you
    items: () => { const o = {}; if (typeof FD === 'undefined' || !FD_READY) return o;
      FD.posts.forEach(p => { if (p.w === -1 && p.id) o['p:' + p.id] = fdSyncPost(p); });
      o.follows = FD.follows.slice().sort((a, b) => a - b); o.followers = FD.followers.slice().sort((a, b) => a - b); return o; },
    put: o => { if (typeof FD === 'undefined' || (typeof CL !== 'undefined' && CL.on && CL.ready)) return; if (!FD_READY){ FD_SYNC_PEND = o; return; } fdSyncPut(o, true); }
  },
  coins: {         // coins: the match ledger (each match once), the highest totals reached, and what's been spent
    items: () => { const o = {}; if (typeof CO === 'undefined') return o;
      Object.entries(CO.led).forEach(([k, x]) => { o['l:' + k] = x; }); Object.entries(CO.hw).forEach(([k, v]) => { o['h:' + k] = v; }); Object.entries(CO.sp).forEach(([k, v]) => { o['s:' + k] = v; }); return o; },
    put: o => { if (typeof CO === 'undefined') return; const led = {}, hw = {}, sp = {};
      Object.entries(o).forEach(([k, v]) => { const n = k.slice(2); if (k[0] === 'l') led[n] = v; else if (k[0] === 'h') hw[n] = Math.max(+v || 0, CO.hw[n] || 0); else if (k[0] === 's') sp[n] = v; });
      CO.led = led; CO.hw = hw; CO.sp = sp; saveCo(); }
  },
  chal: {          // challenges: this period's sets (the same on every device), the daily reroll, and finished ones
    items: () => { const o = {}; if (typeof CHL === 'undefined') return o;
      ['d', 'w', 'm'].forEach(p => { if (CHL.sets[p]) o['set:' + p] = CHL.sets[p]; });
      o.rr = CHL.rr; o.total = CHL.total || 0; o.base = CHL.base || 0;
      Object.entries(CHL.done || {}).forEach(([k, t]) => { o['d:' + k] = t; }); Object.entries(CHL.led || {}).forEach(([k, x]) => { o['l:' + k] = x; }); return o; },
    put: o => { if (typeof CHL === 'undefined') return;
      const done = {}, led = {};
      Object.entries(o).forEach(([k, v]) => { if (k.startsWith('set:')) CHL.sets[k.slice(4)] = v; else if (k.startsWith('d:')) done[k.slice(2)] = v; else if (k.startsWith('l:')) led[k.slice(2)] = v; });
      CHL.done = done; CHL.led = led; if (o.rr) CHL.rr = o.rr; CHL.total = o.total || 0; CHL.base = o.base || 0; chXpSum(); saveChl();
      try { chRender(); lvRender(); } catch(e){} }
  },
  guides: {
    items: () => { const o = {}; GUIDES.forEach(g => { if (g && g.id) o[g.id] = g; }); return o; },
    put: o => { const order = GUIDES.map(g => g.id); GUIDES.length = 0; Object.values(o).sort((a, b) => (order.indexOf(a.id) + 1 || 1e9) - (order.indexOf(b.id) + 1 || 1e9)).forEach(g => GUIDES.push(g)); saveGuidesRaw(); }
  }
};
const STORE_SECTION = {'fb.chal': 'chal', 'fb.coins': 'coins', 'fb.log': 'log', 'fb.notes': 'notes', 'fb.settings': 'settings', 'fb.ranked': 'ranked', 'fb.chat': 'chat', 'fb.dms': 'dms', 'fb.groups': 'groups', 'fb.feed': 'feed'};
let syncFirstDone = false;     // the chat waits for the first sync before filling in a catch-up

// what each section looked like last time, to see which items changed
function takeSnap(sec){ const m = new Map(); Object.entries(SECTIONS[sec].items()).forEach(([k, v]) => m.set(k, JSON.stringify(v))); return m; }
function noteChange(sec){
  if (!syncSnap) return;
  if (sec === 'ach'){ markDirty(); return; }
  if (!syncSnap[sec]){ syncSnap[sec] = takeSnap(sec); return; }
  if (sec === 'feed' && typeof CL !== 'undefined' && CL.on && CL.ready) return;     // the shared feed (Firebase) carries it instead
  const now = Date.now(), before = syncSnap[sec], after = takeSnap(sec);
  syncSnap[sec] = after;
  if (syncApplying) return;
  const st = SMETA.stamps[sec] || (SMETA.stamps[sec] = {}), dd = SMETA.dead[sec] || (SMETA.dead[sec] = {});
  let changed = false;
  after.forEach((v, k) => { if (before.get(k) !== v){ st[k] = now; delete dd[k]; changed = true; } });
  before.forEach((_, k) => { if (!after.has(k)){ if (sec !== 'chat' && sec !== 'dms' && sec !== 'groups') dd[k] = now; delete st[k]; changed = true; } });
  if (changed){ saveMeta(); markDirty(); }
}
// watch every save
const _storeSet = store.set;
store.set = function(k, v){ _storeSet.call(store, k, v); if (STORE_SECTION[k]) noteChange(STORE_SECTION[k]); else if (k === 'fb.ach') noteChange('ach'); };
const saveGuidesRaw = saveGuides;
saveGuides = function(){ saveGuidesRaw(); noteChange('guides'); };

/* ---- building and merging the synced copy ---- */
function buildPayload(){
  const data = {}; Object.keys(SECTIONS).forEach(sec => { data[sec] = SECTIONS[sec].items(); });
  return {app: 'focus-bench-sync', v: 1, at: Date.now(), data, ach: ACH, stamps: SMETA.stamps, dead: SMETA.dead};
}
function mergeGuide(a, b){                     // a is the newer version; keep quiz history from both
  const out = clone(a), bq = new Map((b.quizzes || []).map(q => [q.id, q]));
  (out.quizzes || []).forEach(q => {
    const o = bq.get(q.id); if (!o) return;
    const seen = new Map(); [...(o.hist || []), ...(q.hist || [])].forEach(h => { if (h && h.at && !seen.has(h.at)) seen.set(h.at, h); });
    q.hist = [...seen.values()].sort((x, y) => x.at - y.at).slice(-500);
    q.hist.slice(0, Math.max(0, q.hist.length - 50)).forEach(h => { delete h.it; });
    q.tries = Math.max(q.tries || 0, o.tries || 0);
    if (o.best != null) q.best = q.best == null ? o.best : Math.max(q.best, o.best);
    if ((o.scores || []).length > (q.scores || []).length) q.scores = o.scores;
  });
  return out;
}
function mergeAch(a, b){
  const out = clone(a || {u: {}, c: {}, s: {}}); b = b || {};
  ['u', 'c', 's'].forEach(k => { out[k] = out[k] || {}; });
  Object.entries(b.u || {}).forEach(([k, t]) => { out.u[k] = out.u[k] ? Math.min(out.u[k], t) : t; });
  Object.entries(b.c || {}).forEach(([k, v]) => { out.c[k] = Math.max(out.c[k] || 0, +v || 0); });
  Object.entries(b.s || {}).forEach(([k, v]) => { out.s[k] = [...new Set([...(out.s[k] || []), ...(v || [])])]; });
  out.seeded = !!(out.seeded || b.seeded);
  return out;
}
// when neither side has a recorded change for an item (data from before sync was turned on):
//   settings: the side with more of your study history wins (your main device), since a value that happens
//             to be the default (like the default blue accent) may well be a choice you made; if they're even,
//             a changed value beats a default
//   ranked:   the side with more matches played (then the longer match history) wins
//   guides:   the more recently edited one
// The winner is then stamped, so the decision can't flip back on a later sync.
let tieRankedB = false, tieSettingsB = null;
const isDefault = (k, v) => k in DEFAULTS ? JSON.stringify(DEFAULTS[k]) === JSON.stringify(v) : v == null || v === '' || (Array.isArray(v) && !v.length);
// challenges: both devices end up with the same set (the one rerolled more, else the first one made for the period),
// the reroll counts as used if it was used on either, and totals never go down
function chalMerge(k, va, vb, v){
  if (k.startsWith('set:')){
    if (!va || !vb) return va || vb;
    if (va.k !== vb.k) return va.k > vb.k ? va : vb;
    if ((va.rv || 0) !== (vb.rv || 0)) return (va.rv || 0) > (vb.rv || 0) ? va : vb;
    if ((va.at || 0) !== (vb.at || 0)) return (va.at || 0) && (va.at < vb.at || !vb.at) ? va : vb;
    return JSON.stringify(va) < JSON.stringify(vb) ? va : vb;
  }
  if (k === 'rr'){ if (!va || !vb) return va || vb; if (va.day !== vb.day) return va.day > vb.day ? va : vb; return {day: va.day, used: Math.max(va.used || 0, vb.used || 0)}; }
  if (k === 'total' || k === 'base') return Math.max(va || 0, vb || 0);
  return v;
}
function tieB(sec, k, va, vb){
  if (JSON.stringify(va) === JSON.stringify(vb)) return false;
  if (sec === 'settings') return tieSettingsB !== null ? tieSettingsB : isDefault(k, va) && !isDefault(k, vb);
  if (sec === 'ranked') return tieRankedB;
  if (sec === 'guides') return (vb.updated || 0) > (va.updated || 0);
  return false;
}
function mergePayload(L, Rm){
  { const ra = L.data.ranked || {}, rb = (Rm.data || {}).ranked || {};
    tieRankedB = (rb.played || 0) > (ra.played || 0) || ((rb.played || 0) === (ra.played || 0) && (rb.hist || []).length > (ra.hist || []).length);
    const na = Object.keys(L.data.log || {}).length, nb = Object.keys((Rm.data || {}).log || {}).length;
    tieSettingsB = nb !== na ? nb > na : null; }
  const cut = Date.now() - DEAD_DAYS * 864e5, out = {app: 'focus-bench-sync', v: 1, at: Date.now(), data: {}, stamps: {}, dead: {}};
  Object.keys(SECTIONS).forEach(sec => {
    const a = L.data[sec] || {}, b = (Rm.data || {})[sec] || {}, sa = L.stamps[sec] || {}, sb = (Rm.stamps || {})[sec] || {};
    const da = L.dead[sec] || {}, db = (Rm.dead || {})[sec] || {}, items = {}, st = {}, dd = {};
    Object.keys(da).concat(Object.keys(db)).forEach(k => { const t = Math.max(da[k] || 0, db[k] || 0); if (t > cut) dd[k] = t; });
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => {
      const inA = k in a, inB = k in b, ta = sa[k] || 0, tb = sb[k] || 0;
      let v, t;
      if (inA && inB){
        const useB = tb > ta || (tb === ta && tieB(sec, k, a[k], b[k]));
        v = useB ? b[k] : a[k]; t = Math.max(ta, tb);
        if (!t && sec !== 'log' && JSON.stringify(a[k]) !== JSON.stringify(b[k])) t = Date.now();   // settle the tie for good
        if (sec === 'guides') v = mergeGuide(v, useB ? a[k] : b[k]);
        if (sec === 'chal') v = chalMerge(k, a[k], b[k], v);
      } else if (inA){ v = a[k]; t = ta; } else { v = b[k]; t = tb; }
      const dt = Math.max(da[k] || 0, db[k] || 0);
      if (dt && dt >= t) return;               // deleted after its last change
      items[k] = v; if (t) st[k] = t; delete dd[k];
    });
    if (sec === 'chat'){                       // keep the newest messages only, and only Gemini's and yours
      Object.keys(items).forEach(k => { if (!chatKeep(items[k])){ delete items[k]; delete st[k]; } });
      const keep = Object.values(items).sort((x, y) => y.t - x.t).slice(0, CHAT_MAX), ids = new Set(keep.map(m => m.id));
      Object.keys(items).forEach(k => { if (!ids.has(k)){ delete items[k]; delete st[k]; } });
    }
    out.data[sec] = items; out.stamps[sec] = st; out.dead[sec] = dd;
  });
  out.ach = mergeAch(L.ach, Rm.ach);
  return out;
}
// put merged data into this device; returns true if anything here changed
function applyPayload(M){
  let changed = false;
  syncApplying = true;
  try {
    Object.keys(SECTIONS).forEach(sec => {
      const cur = SECTIONS[sec].items();
      if (JSON.stringify(cur) === JSON.stringify(M.data[sec])) return;
      SECTIONS[sec].put(clone(M.data[sec])); changed = true;
    });
    if (JSON.stringify(ACH) !== JSON.stringify(M.ach)){ Object.keys(M.ach).forEach(k => { ACH[k] = M.ach[k]; }); saveAch(); changed = true; }
    SMETA = {stamps: M.stamps, dead: M.dead}; saveMeta();
  } finally { syncApplying = false; }
  if (changed) syncRerender();
  return changed;
}
function syncRerender(){
  [() => applyLook(), () => renderTimerPane(), () => renderLookSound(), () => renderNotes(), () => renderAll(), () => renderMusic(), () => renderLog(),
   () => { if ($('#task') && document.activeElement !== $('#task')) $('#task').value = P.task || ''; },
   () => renderGuides(), () => renderGuideSlot(), () => renderMatch(), () => renderRankChip(), () => { if (!$('#page-ranked').hidden) renderRanked(); },
   () => { if (typeof renderAwards === 'function' && !$('#page-awards').hidden) renderAwards(); },
   () => { renderChat(); chatBadge(); },
   // matches from your other device change your opponents too: bring the shared world up to date
   () => dailySim().then(ch => { if (!ch) return; renderRankChip(); renderMatch(); if (!$('#page-ranked').hidden) renderRanked(); if (!$('#page-leaders').hidden) renderLeaders(); })]
    .forEach(f => { try { f(); } catch(e){} });
}

/* ---- talking to GitHub ---- */
class SyncErr extends Error { constructor(kind, msg){ super(msg); this.kind = kind; } }
async function gh(path, opts = {}){
  let r;
  try {
    r = await fetch(SYNC_API + path, {...opts, cache: 'no-store', headers: {Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + SYNC.token, ...(opts.body ? {'Content-Type': 'application/json'} : {})}});
  } catch(e){ throw new SyncErr('offline', "Couldn't reach GitHub."); }
  if (r.status === 401) throw new SyncErr('token', 'GitHub rejected the token. It may have expired or been deleted.');
  if (r.status === 404) throw new SyncErr('missing', 'Not found.');
  if (r.status === 403 || r.status === 429) throw new SyncErr('limit', 'GitHub is limiting requests right now. Sync will try again later.');
  if (r.status === 409) throw new SyncErr('conflict', 'Another device was syncing at the same moment. Trying again in a few seconds.');
  if (!r.ok) throw new SyncErr('other', `GitHub returned an error (${r.status}).`);
  return r.status === 204 ? null : r.json();
}
async function findGist(){
  for (let page = 1; page <= 5; page++){
    const list = await gh(`/gists?per_page=100&page=${page}`);
    const g = list.find(x => x.files && x.files[SYNC_FILE]); if (g) return g.id;
    if (list.length < 100) return null;
  }
  return null;
}
async function readGist(){
  const g = await gh('/gists/' + SYNC.gist), f = g.files && g.files[SYNC_FILE];
  if (!f) return null;
  let text = f.content;
  if (f.truncated){ try { text = await (await fetch(f.raw_url, {cache: 'no-store'})).text(); } catch(e){ throw new SyncErr('offline', "Couldn't download the synced data."); } }
  try { const d = JSON.parse(text); return d && d.app === 'focus-bench-sync' ? d : null; } catch(e){ return null; }
}
const writeGist = P_ => gh('/gists/' + SYNC.gist, {method: 'PATCH', body: JSON.stringify({files: {[SYNC_FILE]: {content: JSON.stringify(P_)}}})});
async function createGist(P_){
  const g = await gh('/gists', {method: 'POST', body: JSON.stringify({description: SYNC_DESC, public: false, files: {[SYNC_FILE]: {content: JSON.stringify(P_)}}})});
  return g.id;
}

/* ---- running a sync ---- */
function markDirty(){ if (!SYNC.token) return; syncDirty = true; clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(), SYNC_DELAY); }
async function syncNow(manual){
  if (!SYNC.token || !syncSnap) return;
  if (syncBusy){ syncAgain = true; return; }
  syncBusy = true; syncState = 'busy'; renderSyncPanel();
  clearTimeout(syncTimer);
  let pulled = false;
  try {
    if (!SYNC.login){ const u = await gh('/user'); SYNC.login = u.login; }
    if (!SYNC.gist) SYNC.gist = await findGist();
    let remote = null;
    if (SYNC.gist){
      try { remote = await readGist(); } catch(e){ if (e.kind !== 'missing') throw e; SYNC.gist = null; }
    }
    const local = buildPayload();      // built after the download, so a change made while it ran is included
    syncDirty = false;
    if (remote) syncRemoteSum = syncSummary(remote.data);
    if (!SYNC.gist){ SYNC.gist = await createGist(local); }
    else {
      const merged = remote ? mergePayload(local, remote) : local;
      pulled = remote ? applyPayload(merged) : false;
      const same = remote && JSON.stringify([remote.data, remote.ach, remote.dead]) === JSON.stringify([merged.data, merged.ach, merged.dead]);
      if (!same) await writeGist(merged);
    }
    SYNC.last = Date.now(); SYNC.err = null; syncState = '';
    syncRemoteSum = syncSummary(buildPayload().data);
    if (SYNC.fromLink){ delete SYNC.fromLink; toast(`Sync is on. Connected as ${SYNC.login}.`); }
    else if (manual) toast(pulled ? 'Synced. Brought in changes from your other devices.' : 'Synced.');
  } catch(e){
    syncDirty = true;
    SYNC.err = e.kind === 'offline' || e.kind === 'conflict' ? (e.kind === 'conflict' ? '' : 'offline') : e.message; syncState = '';
    if (e.kind === 'token' && SYNC.fromLink){ delete SYNC.fromLink; toast("That sync link's token didn't work."); }
    else if (manual && e.kind !== 'conflict') toast(e.message);
    if (e.kind === 'conflict') syncTimer = setTimeout(() => syncNow(), 8000 + Math.random() * 7000);
    else if (e.kind === 'offline' || e.kind === 'limit') syncTimer = setTimeout(() => syncNow(), 5 * 60000);
  } finally {
    saveSync(); syncBusy = false; syncFirstDone = true; renderSyncPanel();
    if (syncAgain){ syncAgain = false; syncTimer = setTimeout(() => syncNow(), 2000); }
  }
}
// start once guides have loaded (they come from IndexedDB a moment after the page)
(function syncStart(){
  if (typeof guidesReady === 'undefined' || !guidesReady){ setTimeout(syncStart, 200); return; }
  if (typeof CHATS === 'undefined'){ setTimeout(syncStart, 200); return; }
  syncSnap = {}; Object.keys(SECTIONS).forEach(sec => { syncSnap[sec] = takeSnap(sec); });
  renderSyncPanel();
  if (SYNC.token) syncNow();
})();
document.addEventListener('visibilitychange', () => {
  if (!SYNC.token || !syncSnap) return;
  if (document.hidden){ if (syncDirty) syncNow(); }
  else if (!SYNC.last || Date.now() - SYNC.last > 60000) syncNow();
});
addEventListener('online', () => { if (SYNC.token && syncDirty) syncNow(); });
setInterval(() => { if (SYNC.token && !document.hidden && (!SYNC.last || Date.now() - SYNC.last > 10 * 60000)) syncNow(); }, 60000);

/* ---- the Sync panel in Settings ---- */
// a short side-by-side of this device and the synced copy, so it's easy to see whether they match
function syncSummary(d){
  const r = d.ranked || {}, st = d.settings || {};
  return {sessions: Object.keys(d.log || {}).length, guides: Object.keys(d.guides || {}).length, played: r.played || 0, mmr: r.mmr || 1000, theme: (THEMES[st.theme] || {}).name || st.theme || 'Match device', accent: st.accent || 'cobalt'};
}
function syncCompare(){
  const a = syncSummary(buildPayload().data), b = syncRemoteSum;
  const row = (label, f) => `<tr><th>${label}</th><td>${esc(String(f(a)))}</td><td>${b ? esc(String(f(b))) : '–'}</td></tr>`;
  return `<details class="sync-cmp"><summary>Compare this device with the synced copy</summary><table>
    <tr><th></th><td><b>This device</b></td><td><b>Synced copy</b></td></tr>
    ${row('Sessions', x => x.sessions)}${row('Study guides', x => x.guides)}${row('Ranked matches', x => x.played)}${row('Rating', x => x.mmr.toLocaleString() + ' Elo')}${row('Theme', x => x.theme)}${row('Accent', x => x.accent)}
  </table><p class="hint">App version ${SYNC_VER}. If this says an older version than your other device, close the tab and reopen the site.</p></details>`;
}
let syncShowQR = false;
function syncAgo(t){
  if (!t) return 'not yet';
  const s = Math.round((Date.now() - t) / 1000);
  return s < 45 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} hr ago` : new Date(t).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}
const syncLink = () => `${location.origin}${location.pathname}#sync=${encodeURIComponent(SYNC.token)}`;
function renderSyncPanel(){
  const el = $('#syncBody'); if (!el) return;
  if (!SYNC.token){
    el.innerHTML = `<p class="lead">Keep your sessions, study guides, quizzes, notes, achievements, ranked stats and settings the same on every device. Your data is saved to a private gist on your GitHub account.</p>
      <ol class="sync-steps">
        <li><b>Make a token.</b> <a class="small-btn" href="${SYNC_TOKEN_URL}" target="_blank" rel="noopener">Create a GitHub token ↗</a>
          <small class="hint">Everything is filled in. Pick an expiration, click <b>Generate token</b> at the bottom, and copy the code it shows (it starts with <code>ghp_</code>). It can only read and write your gists.</small></li>
        <li><b>Paste it here.</b><span class="sync-row"><input type="password" id="syncTok" placeholder="ghp_…" autocomplete="off" spellcheck="false" aria-label="GitHub token"><button class="small-btn accent" id="syncConnect">Connect</button></span></li>
        <li><b>Your other devices:</b> once this one is connected, use <b>Connect another device</b> to scan a QR code, or paste the same token there.</li>
      </ol>`;
    return;
  }
  const st = syncState === 'busy' ? 'Syncing…' : SYNC.err === 'offline' ? 'Offline. Changes will sync when you’re back online.' : SYNC.err ? SYNC.err : `Synced ${syncAgo(SYNC.last)}`;
  el.innerHTML = `<div class="sync-status ${SYNC.err && SYNC.err !== 'offline' ? 'bad' : ''}"><span class="sync-dot${syncState === 'busy' ? ' busy' : SYNC.err ? ' off' : ''}"></span><span><b>${esc(st)}</b><small>${SYNC.login ? `GitHub account: ${esc(SYNC.login)}` : 'Connecting…'}${syncDirty && !SYNC.err && syncState !== 'busy' ? ' · changes waiting to sync' : ''}</small></span></div>
    <p class="hint">Changes sync about 30 seconds after you make them, when you leave the page, and whenever you open the app.</p>
    <div class="confirm"><button class="small-btn" id="syncNowBtn" ${syncState === 'busy' ? 'disabled' : ''}>Sync now</button><button class="small-btn" id="syncQR" aria-expanded="${syncShowQR}">${syncShowQR ? 'Hide' : 'Connect another device'}</button><button class="small-btn" id="syncOff">Turn off sync</button></div>
    ${syncCompare()}
    <div class="sync-push"><button class="link-btn" id="syncPushSet">Use this device's settings on all devices</button><small class="hint">Style, timer, sounds and activities. Your other devices switch to them the next time they sync.</small></div>
    ${SYNC.err && SYNC.err !== 'offline' && /token/i.test(SYNC.err) ? `<p class="hint">Make a new token and paste it below. <a href="${SYNC_TOKEN_URL}" target="_blank" rel="noopener">Create a GitHub token ↗</a></p><span class="sync-row"><input type="password" id="syncTok" placeholder="ghp_…" autocomplete="off" spellcheck="false" aria-label="New GitHub token"><button class="small-btn accent" id="syncConnect">Use this token</button></span>` : ''}
    ${syncShowQR ? `<div class="sync-qr"><div class="sync-qr-img" id="syncQRImg" aria-label="QR code for connecting another device">Loading…</div>
      <div><p><b>Scan this with your phone's camera.</b> It opens Focus Bench and turns on sync there. Or open the link on any other device.</p>
      <div class="confirm"><button class="small-btn" id="syncCopyLink">Copy link</button></div>
      <p class="hint">The code contains your token, so anyone who scans it can see your synced data. Don't share it.</p></div></div>` : ''}`;
  if (syncShowQR) drawSyncQR();
}
function loadQRLib(){
  return window.qrcode ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/qrcode.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
function drawSyncQR(){
  loadQRLib().then(() => {
    const box = $('#syncQRImg'); if (!box) return;
    const q = qrcode(0, 'M'); q.addData(syncLink()); q.make();
    box.innerHTML = q.createSvgTag({cellSize: 4, margin: 3, scalable: true});
  }).catch(() => { const box = $('#syncQRImg'); if (box) box.textContent = "Couldn't draw the code. Use Copy link instead."; });
}
async function syncConnect(){
  const inp = $('#syncTok'), t = inp ? inp.value.trim() : '';
  if (!/^(ghp_|github_pat_)[A-Za-z0-9_]{20,}$/.test(t)){ toast('That doesn’t look like a GitHub token. It should start with ghp_.'); return; }
  const btn = $('#syncConnect'); if (btn){ btn.disabled = true; btn.textContent = 'Connecting…'; }
  const keep = SYNC; SYNC = {token: t};
  try {
    const u = await gh('/user'); SYNC.login = u.login;
    saveSync(); renderSyncPanel(); await syncNow();
    if (SYNC.err && SYNC.err !== 'offline') throw new SyncErr('other', SYNC.err);
    toast(`Sync is on. Connected as ${SYNC.login}.`);
  } catch(e){
    SYNC = keep && keep.token ? keep : {}; saveSync(); renderSyncPanel();
    toast(e.kind === 'token' ? 'GitHub didn’t accept that token. Check you copied all of it.' : e.message);
  }
}
$('#page-settings').addEventListener('click', e => {
  const b = e.target.closest('#syncConnect, #syncNowBtn, #syncQR, #syncOff, #syncCopyLink, #syncPushSet'); if (!b) return;
  if (b.id === 'syncPushSet'){
    if (!b.dataset.sure){ b.dataset.sure = 1; b.textContent = 'Click again to send these settings to every device'; setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.textContent = "Use this device's settings on all devices"; } }, 4000); return; }
    // mark every setting as just changed here, so it beats every other device's copy
    const now = Date.now(), st = SMETA.stamps.settings || (SMETA.stamps.settings = {});
    Object.keys(P).forEach(k => { st[k] = now; if (SMETA.dead.settings) delete SMETA.dead.settings[k]; });
    saveMeta(); syncDirty = true;
    syncNow().then(() => toast(SYNC.err ? SYNC.err : 'Done. Your other devices switch to these settings the next time they sync (reopen the app there).'));
    return;
  }
  if (b.id === 'syncConnect') syncConnect();
  else if (b.id === 'syncNowBtn') syncNow(true);
  else if (b.id === 'syncQR'){ syncShowQR = !syncShowQR; renderSyncPanel(); }
  else if (b.id === 'syncCopyLink'){ try { navigator.clipboard.writeText(syncLink()).then(() => toast('Link copied. Open it on your other device.'), () => toast("Couldn't copy here.")); } catch(err){ toast("Couldn't copy here."); } }
  else if (b.id === 'syncOff'){
    if (!b.dataset.sure){ b.dataset.sure = 1; b.textContent = 'Click again to turn off'; b.classList.add('danger'); setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.textContent = 'Turn off sync'; b.classList.remove('danger'); } }, 3500); return; }
    if (syncDirty) syncNow();
    SYNC = {}; saveSync(); syncShowQR = false; clearTimeout(syncTimer); renderSyncPanel();
    toast('Sync is off on this device. Your data stays here and in your gist.');
  }
});
$('#page-settings').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'syncTok') syncConnect(); });
setInterval(() => { if (SYNC.token && !$('#page-settings').hidden && syncState !== 'busy' && !syncShowQR) renderSyncPanel(); }, 30000);

/* ---- keeping open tabs in step ----
   Every tab keeps its own copy of your data in memory. Without this, an old tab left open would save its
   outdated copy over a change made in another tab (pick blue in one tab, and an old tab still showing the
   custom color writes it back the next time it saves anything). When another tab saves, this one reloads it. */
addEventListener('storage', e => {
  if (!e.key || e.newValue == null) return;
  let v; try { v = JSON.parse(e.newValue); } catch(err){ return; }
  syncApplying = true;
  try {
    if (e.key === 'fb.settings'){ P = merge(clone(DEFAULTS), v); if (syncSnap) syncSnap.settings = takeSnap('settings'); }
    else if (e.key === 'fb.log'){ LOG = Array.isArray(v) ? v : LOG; if (syncSnap) syncSnap.log = takeSnap('log'); }
    else if (e.key === 'fb.notes'){ NOTES = Array.isArray(v) ? v : NOTES; if (syncSnap) syncSnap.notes = takeSnap('notes'); }
    else if (e.key === 'fb.ach'){ Object.keys(v || {}).forEach(k => { ACH[k] = v[k]; }); }
    else if (e.key === 'fb.syncMeta'){ SMETA = v && v.stamps ? v : SMETA; return; }
    else if (e.key === 'fb.sync'){ SYNC = v || {}; renderSyncPanel(); return; }
    else return;
  } finally { syncApplying = false; }
  syncRerender();
});
