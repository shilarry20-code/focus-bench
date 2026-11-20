/* ---------- Feed: an Instagram-style feed for the campus (replaces global chat) ----------
   Posts come from the shared world: session receipts and match results are the players' real sessions and matches,
   rank-ups are real, and pictures are drawn by scenes.js from each player's major, the time of day and the season.
   Gemini writes the captions and comments (one request covers a handful of posts), and it's told what each picture
   shows (sceneDesc), so what people say fits the picture. Likes build up over a few hours, more for popular players.
   You can follow people, like and comment (people answer, later if they're offline), and post your own: pictures you
   put together from the same presets, shares of your sessions, matches and rank-ups, or plain text.
   Posts and comments live in IndexedDB on this device (fp:<id> for a post, fc:<id> for its comments; big comment lists
   load only when needed); follows, notifications and the rest stay in fb.feed. Posts are kept 30 days, plus the all-time
   top 1,000, your own and ones you liked. */
const FD_V = 1;
let FD = store.get('fb.feed', null);
if (!FD || FD.v !== FD_V) FD = {v: FD_V, posts: [], follows: [], followers: [], notif: [], filled: 0, nseen: 0, pend: [], liked: {}};
const saveFeed = () => { if (FD.notif.length > 150) FD.notif = FD.notif.slice(-150); const {posts, ...rest} = FD; store.set('fb.feed', {...rest, posts: FD_READY ? [] : posts}); fdPersistSoon(); };

/* ---- storage: IndexedDB, only what changed ---- */
let FD_READY = false, fdSaveT = null;
const FD_PS = new Map(), FD_CS = new Map();                 // what was last written for each post and its comments
const fdPSig = p => `${p.cap || ''}|${p.del ? 1 : 0}|${p.gen ? 1 : 0}|${p.L}|${p.ln || 0}|${p.cm ? p.cm.length : p.cn || 0}|${p.bg ? 1 : 0}|${p.fg || 0}`;
const fdCSig = p => p.cm ? p.cm.length + ':' + (p.cm.length ? p.cm[p.cm.length - 1].id : '') + ':' + p.cm.filter(c => c.del).length : null;
function fdMeta(p){
  const o = {}; for (const k in p) if (k !== 'cm' && k !== 'k' && k[0] !== '_') o[k] = p[k];
  if (p.cm){ o.cn = p.cm.length; o.pv = fdTree(p.cm.filter(c => !c.del)).slice(-4).map(r => r.c); }
  return o;
}
function fdPersistSoon(){ if (!FD_READY) return; clearTimeout(fdSaveT); fdSaveT = setTimeout(fdPersist, 1200); }
async function fdPersist(){
  if (!FD_READY) return; const list = [];
  FD.posts.forEach(p => {
    const ps = fdPSig(p); if (FD_PS.get(p.id) !== ps){ const m = fdMeta(p); list.push(['fp:' + p.id, m]); FD_PS.set(p.id, ps); }
    const cs = fdCSig(p); if (cs != null && FD_CS.get(p.id) !== cs){ list.push(['fc:' + p.id, p.cm]); FD_CS.set(p.id, cs); p.cb = JSON.stringify(p.cm).length; }
  });
  if (list.length) try { await IDB.setMany(list); } catch(e){ console.error(e); FD_PS.clear(); FD_CS.clear(); }
}
// a post's comments, loading them if they aren't in memory
// a poster only answers people on their own post (no new comments of their own): about one answer for every 8 comments, at least 3
const fdSelfMax = p => Math.max(3, Math.round((p.cm || []).filter(c => !c.del && c.w !== p.w).length / 8));
function fdSelfOk(p, w, re){ return w < 0 || w !== p.w || (re && (p.cm || []).filter(c => c.w === w && !c.del).length < fdSelfMax(p)); }
function fdTidySelf(p){
  if (!p.cm || p.w < 0) return;
  const mine = p.cm.filter(c => c.w === p.w), keep = new Set(mine.filter(c => c.re).sort((a, b) => (b.lk || 0) - (a.lk || 0)).slice(0, fdSelfMax(p)).map(c => c.id));
  const gone = new Set(mine.filter(c => !keep.has(c.id)).map(c => c.id)); if (!gone.size) return;
  let grew = true; while (grew){ grew = false; p.cm.forEach(c => { if (c.re && gone.has(c.re) && !gone.has(c.id)){ gone.add(c.id); grew = true; } }); }
  p.cm = p.cm.filter(c => !gone.has(c.id)); if (p.pv) p.pv = p.pv.filter(c => !gone.has(c.id));
}
async function fdCm(p){ if (p.cm) return p.cm; let cm = []; try { cm = (await IDB.get('fc:' + p.id)) || []; } catch(e){} if (!p.cm){ p.cm = cm; FD_CS.set(p.id, fdCSig(p)); fdTidySelf(p); } return p.cm; }
// keep 30 days, plus the all-time top 1,000, your own posts and ones you liked; big old comment lists leave memory
function fdPrune(){
  if (!FD_READY) return; const now = Date.now(), gone = [];
  const top = new Set(FD.posts.filter(p => !p.del).sort((a, b) => fdLikes(b) - fdLikes(a)).slice(0, 1000).map(p => p.id));
  FD.posts = FD.posts.filter(p => { const keep = p.del ? now - p.t < 864e5 * 2 : (now - p.t < 30 * 864e5 || p.w === -1 || FD.liked[p.id] || top.has(p.id)); if (!keep) gone.push(p.id); return keep; });
  if (gone.length){ gone.forEach(id => { FD_PS.delete(id); FD_CS.delete(id); }); IDB.setMany(gone.flatMap(id => [['fp:' + id, undefined], ['fc:' + id, undefined]])).catch(console.error); }
  FD.posts.forEach(p => { if (p.cm && p.cm.length > 30 && now - p.t > 3 * 864e5 && FDV.view !== p.id && FD_CS.get(p.id) === fdCSig(p)){ p.pv = fdMeta(p).pv; p.cn = p.cm.length; delete p.cm; } });
}
(async function fdLoad(){
  try {
    const metas = (await IDB.all('fp:', 'fp:\uffff')) || [], have = new Set(metas.map(p => p.id));
    const old = FD.posts.filter(p => !have.has(p.id));        // from before the move to IndexedDB
    const now = Date.now();
    await Promise.all(metas.filter(p => now - p.t < 3 * 864e5 || (p.cn || 0) <= 30).map(async p => { try { p.cm = (await IDB.get('fc:' + p.id)) || []; } catch(e){ p.cm = []; } }));
    metas.forEach(p => { FD_PS.set(p.id, fdPSig(p)); if (p.cm) FD_CS.set(p.id, fdCSig(p)); if (p.pv && p.w >= 0) p.pv = p.pv.filter(c => c.w !== p.w || c.re); fdTidySelf(p); });
    FD.posts = metas.concat(old);
  } catch(e){ console.error(e); }
  FD_READY = true; fdPrune(); saveFeed(); fdPersist(); renderFeed();
})();
setInterval(() => { fdPrune(); fdPersistSoon(); }, 10 * 60000);
const fdId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fdHash = s => { let h = 2166136261; for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619); return h >>> 0; };
let FDV = {tab: 'for', top: 'day', shown: 16, open: {}, re: {}, busy: false, composer: null, vn: 30, vexp: {}};

/* ---- who posts ---- */
function fdPool(){
  const pool = [], add = (w, n) => { if (w >= 0 && w < ROSTER_N) for (let k = 0; k < n; k++) pool.push(w); };
  FD.follows.forEach(w => add(w, 5));
  Object.keys(R.rec || {}).map(Number).forEach(w => add(w, isRival(w) ? 3 : 1));
  (R.hist || []).slice(0, 20).forEach(h => add(h.b, 2));
  try { [...new Set(DMS.msgs.map(m => m.w))].forEach(w => add(w, 2)); } catch(e){}
  try { chatWhoOnline().forEach(w => add(w, 1)); } catch(e){}
  const sb = sortedBots();
  for (let k = 0; k < 40; k++) add(sb[Math.floor(Math.pow(Math.random(), 2.2) * 2000)], 1);          // popular players
  const me = posOf(sb[0]) >= 0 ? (() => { let lo = 0, hi = sb.length; while (lo < hi){ const m = (lo + hi) >> 1; if (BS[sb[m] * BF] > R.mmr) lo = m + 1; else hi = m; } return lo; })() : 0;
  for (let k = 0; k < 30; k++) add(sb[clampN(me + Math.floor((Math.random() - .5) * 3000), 0, sb.length - 1)], 1);
  return pool;
}
// likes come from followers: smaller accounts get a bigger share of theirs, big ones far more in total
const fdPopF = f => 4 + f * (.035 + .11 / (1 + f / 900));
const fdPop = w => w === -1 ? fdMyPop() : fdPopF(typeof socFollowers === 'function' ? socFollowers(w) : 100);
function fdMyPop(){ return Math.max(10, fdPopF(FD.followers.length)) + Math.max(0, (R.mmr - 900) / 40); }
// now and then a post takes off
const fdViral = () => { const u = Math.random(); return u < .04 ? 4 + Math.random() * 10 : u < .2 ? 1.5 + Math.random() : 1; };
const fdWorldMin = t => { const d = new Date(worldT(t)); return {dk: dayKey(d.getTime()), m: d.getHours() * 60 + d.getMinutes(), h: d.getHours(), mo: d.getMonth()}; };
// the post itself: a real session or match when there is one around that time, otherwise a picture or a thought
function fdMake(w, t, light){
  const B = bot(w), {dk, m, h, mo} = fdWorldMin(t), r = mulberry32(fdHash(w + ':' + t)), id = fdId();
  const base = {id, w, t, cm: [], L: 0};
  const u = light ? 1 : r();
  if (u < .12){       // a match they just played
    const code = dayIdx(dk) * 1440 + m;
    for (let s = w * M5, e = s + M5; s < e; s++){ const opp = M5_OPP[s]; if (opp < 0) continue; const c = M5_T[s]; if (c <= code && c > code - 90){
      const won = M5_A[s] > M5_B[s], after = M5_R[s], before = after - M5_D[s], up = rankOf(after).i > rankOf(before).i;
      return {...base, type: up && won ? 'rank' : 'match', d: {opp, ys: M5_A[s], ts: M5_B[s], dl: M5_D[s], r: after, rk: rankOf(after).full}}; } }
  }
  if (u < .25){       // a session they just finished
    const day = botDay(w, dk), s = day && day.sessions.filter(x => !x.live && x.b <= m && x.b > m - 60 && x.min >= 25).pop();
    if (s) return {...base, type: 'session', d: {min: s.min, subj: s.subj, mode: s.mode, a: s.a, tot: day.sessions.filter(x => x.b <= s.b).reduce((n, x) => n + x.min, 0)}};
  }
  const mood = h >= 22 || h < 5 ? 'tired' : '';
  return {...base, type: r() < .5 ? 'text' : 'scene', sc: {seed: fdHash(id), hue: B.hue, maj: B.major, hour: h, month: mo, mood, outgoing: emojiHabit(w) === 'often' || r() < .35}};
}
// posts appear at a real-world pace: more in the evening, few at 4 AM
const FD_RATE = [3, 2, 1.4, 1, .8, .8, 1.2, 2.2, 3, 3.4, 3.6, 4, 4.4, 4.4, 4.6, 5, 5.2, 5.6, 6, 6.4, 6.6, 6.4, 5.6, 4.2].map(x => x * 1.3);
// while the world is still catching up, fill with posts that don't need today's matches and sessions (no waiting)
function fdFill(){
  if (!RK_READY) return false; const light = !!simBusy;
  const now = Date.now(), from = Math.max(FD.filled || now - 8 * 3600e3, now - 12 * 3600e3);
  if (now - from < 4 * 60000) return false;
  const pool = fdPool(); let made = 0;
  for (let t = from; t < now && made < 60; ){
    const h = new Date(worldT(t)).getHours(), gap = 3600e3 / FD_RATE[h] * (.4 + Math.random() * 1.2);
    t += gap; if (t >= now) break;
    const w = pool[Math.floor(Math.random() * pool.length)];
    try { const p = fdMake(w, Math.round(t), light); p.L = Math.round(fdPop(w) * ({scene: 1, text: .8, session: .8, match: 1.1, rank: 1.7}[p.type] || 1) * (p.sc && p.sc.outgoing ? 1.2 : 1) * (.45 + Math.random()) * fdViral()); FD.posts.push(p); made++; } catch(e){ console.error(e); }
  }
  FD.filled = now; saveFeed();
  return made > 0;
}
// likes build up over the first hours (longer for big posts)
const fdLikes = p => (p.L ? Math.floor(p.L * (1 - Math.exp(-(Date.now() - p.t) / (2700e3 * (1 + Math.log10(Math.max(1, p.L / 200))))))) : 0) + (FD.liked[p.id] ? 1 : 0);
// how many comments a post should end up with (replies included): 2–5% of its likes; the builder writes toward this
const fdRate = p => .02 + (fdHash(p.id + 'cr') % 1000) / 1000 * .03;
const fdTarget = p => Math.round(fdLikes(p) * fdRate(p));
const fdWritten = p => p.cm ? p.cm.filter(c => !c.del && c.t <= Date.now()).length : (p.cn || 0);
const fdCount = p => Math.max(fdTarget(p), fdWritten(p));
// likes on a comment: set when it's written (older comments get a stable stand-in)
const fdCmLikes = (p, reply) => Math.round(Math.max(0, fdLikes(p) * .004 * Math.exp((Math.random() + Math.random() + Math.random() - 1.5) * 1.6) * (reply ? .25 : 1)));
const fdLk = (c, p) => c.lk != null ? c.lk : Math.floor(Math.max(1, fdLikes(p)) * .006 * Math.pow((fdHash(c.id) % 1000) / 1000, 3) * (c.re ? .3 : 1));
// a comment's heart: tap to like it; the count sits under the heart, like Instagram
const fdCmLiked = c => !!(FD.cliked && FD.cliked[c.id]);
const fdCmCount = (c, p) => fdLk(c, p) + (fdCmLiked(c) ? 1 : 0);
const fdHeart = (c, p) => { const n = fdCmCount(c, p), on = fdCmLiked(c); return `<button class="fd-cheart${on ? ' on' : ''}" data-fda="clike" aria-label="${on ? 'Unlike' : 'Like'} comment" aria-pressed="${on}"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-8.6C1.6 8.4 3.4 5 6.7 5c1.9 0 3.3 1.1 4.3 2.5C12 6.1 13.4 5 15.3 5c3.3 0 5.1 3.4 3.7 6.4C17 15.6 12 20 12 20z"/></svg>${n ? `<small>${fdFmtN(n)}</small>` : ''}</button>`; };
const fdFmtN = n => n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K' : n.toLocaleString();
const fdShownComments = p => (p.cm || p.pv || []).filter(c => c.t <= Date.now() && !c.del);
// which comment an answer belongs under: the latest one by the named person (also catches text that starts with @name)
function fdAnswerTo(p, at, text, me){
  let name = (at || '').trim(); const m = !name && text.match(/^@([\w.]+)\s*/); if (m){ name = m[1]; }
  if (m || name) text = text.replace(new RegExp('^@' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '').trim() || text;
  if (!name) return {re: null, text};
  const nm = name.toLowerCase(), par = p.cm.slice().reverse().find(c => !c.del && (c.w === -1 ? me : bot(c.w).name).toLowerCase() === nm);
  return {re: par ? par.id : null, text};
}
// comments in thread order: each top-level comment, then the answers under it (one level, like Instagram)
function fdThread(cms){
  const by = new Map(cms.map(c => [c.id, c])), root = c => { let x = c, n = 0; while (x.re && by.has(x.re) && n++ < 20) x = by.get(x.re); return x; };
  const out = [], kids = new Map();
  cms.forEach(c => { const r = root(c); if (r === c) return; if (!kids.has(r.id)) kids.set(r.id, []); kids.get(r.id).push(c); });
  cms.forEach(c => { if (root(c) !== c) return; out.push({c, sub: 0}); (kids.get(c.id) || []).sort((a, b) => a.t - b.t).forEach(k => out.push({c: k, sub: 1, to: by.get(k.re)})); });
  return out;
}
const fdNameOf = w => w === -1 ? myName() : bot(w).name;
function fdTree(cms){
  const out = [], idx = new Map(); let cur = null;
  fdThread(cms).forEach(x => { if (!x.sub){ cur = {c: x.c, kids: []}; out.push(cur); idx.set(x.c.id, cur); } else if (cur) cur.kids.push(x); });
  return out;
}

/* ---- what each post is about, in words, for the people writing captions and comments ---- */
function fdAbout(p){
  const who = p.w === -1 ? myName() : bot(p.w).name;
  if (p.type === 'scene') return sceneDesc(fdSpec(p));
  if (p.type === 'session') return `A session receipt card: ${who} just finished ${p.d.min} min of ${p.d.subj} (${MODE_NAMES[p.d.mode] || 'a session'}), ${Math.floor(p.d.tot / 60)}h ${p.d.tot % 60}m today so far.`;
  if (p.type === 'match' || p.type === 'rank'){ const won = p.d.ys > p.d.ts; return `A ranked match result card: ${who} ${won ? 'beat' : 'lost to'} ${p.d.opp === -1 ? myName() : bot(p.d.opp).name}, ${p.d.ys}–${p.d.ts} min, ${p.d.dl > 0 ? '+' : ''}${p.d.dl} Elo${p.type === 'rank' ? `, and it ranked them up to ${p.d.rk}` : ''}.`; }
  if (p.type === 'text') return p.cap ? `A text post (just big words on a colored card, no photo): "${p.cap}"` : 'A text post (just big words on a colored card, no photo).';
  return '';
}
const FD_BG_KINDS = ['solid', 'grad', 'grad', 'radial', 'dots', 'stripes', 'grid', 'lined', 'waves', 'confetti', 'blobs', 'sunset', 'checker', 'duo'];
// which card a text post uses: yours is what you picked; everyone else's comes from the post id
function fdTextBg0(p){ if (p.bg) return p.bg; const h = fdHash(p.id + 'bg'); return {k: FD_BG_KINDS[h % FD_BG_KINDS.length], h: (h >>> 8) % 360, h2: ((h >>> 8) % 360 + 40 + (h >>> 16) % 120) % 360}; }
function fdTextBgNew(){ const h = Math.floor(Math.random() * 360); return {k: FD_BG_KINDS[Math.floor(Math.random() * FD_BG_KINDS.length)], h, h2: (h + 40 + Math.floor(Math.random() * 120)) % 360}; }
function fdTextBgSvg(b, id){
  const g = 'tg' + String(id).replace(/[^a-z0-9]/gi, ''), c1 = scH(b.h, 62, 45), c2 = scH(b.h2, 62, 42), lt = scH(b.h, 70, 93), mid = scH(b.h, 55, 70);
  const lin = (a, z, x2 = 1, y2 = 1) => `<defs><linearGradient id="${g}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${z}"/></linearGradient></defs>`;
  const full = f => rc(0, 0, 300, 300, f, 0);
  let svg = '', ink = 'light';
  switch (b.k){
    case 'solid': svg = full(c1); break;
    case 'grad': svg = lin(c1, c2) + full(`url(#${g})`); break;
    case 'radial': svg = `<defs><radialGradient id="${g}" cx=".3" cy=".25" r=".95"><stop offset="0" stop-color="${scH(b.h, 70, 66)}"/><stop offset="1" stop-color="${scH(b.h2, 55, 30)}"/></radialGradient></defs>` + full(`url(#${g})`); break;
    case 'sunset': svg = lin(scH(b.h, 75, 62), scH(b.h + 50, 70, 45), 0, 1) + full(`url(#${g})`); break;
    case 'dots': svg = full(c1) + Array.from({length: 100}, (_, k) => ci(15 + (k % 10) * 30 + (Math.floor(k / 10) % 2) * 15, 15 + Math.floor(k / 10) * 30, 4, '#fff', ' opacity=".18"')).join(''); break;
    case 'stripes': svg = full(c1) + `<g opacity=".14">${Array.from({length: 14}, (_, k) => `<path d="M${k * 46 - 300} 300 L${k * 46} 0 h22 L${k * 46 - 278} 300z" fill="#fff"/>`).join('')}</g>`; break;
    case 'checker': svg = full(c1) + Array.from({length: 36}, (_, k) => (k + Math.floor(k / 6)) % 2 ? rc((k % 6) * 50, Math.floor(k / 6) * 50, 50, 50, '#fff', 0, ' opacity=".1"') : '').join(''); break;
    case 'grid': ink = 'dark'; svg = full(lt) + `<g stroke="${mid}" stroke-width="1" opacity=".55">${Array.from({length: 15}, (_, k) => `<line x1="${k * 20 + 10}" y1="0" x2="${k * 20 + 10}" y2="300"/><line x1="0" y1="${k * 20 + 10}" x2="300" y2="${k * 20 + 10}"/>`).join('')}</g>`; break;
    case 'lined': ink = 'dark'; svg = full('#fbf8ef') + `<g stroke="#9cc3e6" stroke-width="1.2">${Array.from({length: 13}, (_, k) => `<line x1="0" y1="${40 + k * 22}" x2="300" y2="${40 + k * 22}"/>`).join('')}</g><line x1="38" y1="0" x2="38" y2="300" stroke="#e58a8a" stroke-width="1.5"/>` + [80, 150, 220].map(y => ci(14, y, 6, '#e9e4d6')).join(''); break;
    case 'waves': svg = full(c1) + [0, 1, 2, 3].map(k => `<path d="M0 ${150 + k * 40} q37 -26 75 0 t75 0 t75 0 t75 0 V300 H0z" fill="${k % 2 ? c2 : '#fff'}" opacity="${.12 + k * .05}"/>`).join(''); break;
    case 'confetti': { const r = mulberry32(b.h * 977 + b.h2); svg = full(c1) + Array.from({length: 40}, () => { const x = r() * 300, y = r() * 300, col = ['#fff', '#ffd166', '#06d6a0', '#ef476f', '#118ab2'][Math.floor(r() * 5)]; return r() < .5 ? ci(x, y, 2 + r() * 3, col, ' opacity=".7"') : rc(x, y, 4 + r() * 6, 3, col, 1, ` opacity=".7" transform="rotate(${Math.floor(r() * 180)} ${x.toFixed(0)} ${y.toFixed(0)})"`); }).join(''); break; }
    case 'blobs': svg = full(c1) + ci(40, 50, 90, c2, ' opacity=".55"') + ci(270, 260, 110, scH(b.h + 180, 60, 60), ' opacity=".35"') + ci(250, 40, 50, '#fff', ' opacity=".12"'); break;
    case 'duo': svg = full(c1) + pa('M0 300 L300 0 V300z', c2, ' opacity=".8"'); break;
    default: svg = full(c1);
  }
  return {svg, ink};
}
function fdSpec(p){ if (p.spec) return p.spec; return (p._spec = p._spec || sceneSpec({...p.sc, look: scLook(p.w)})); }
// who comments: people who'd plausibly see it (followers of theirs are everyone near them, people online now)
function fdCommenters(p, n){
  const out = [], seen = new Set([p.w]), add = w => { if (w >= 0 && w < ROSTER_N && !seen.has(w)){ seen.add(w); out.push(w); } };
  let on = []; try { on = chatWhoOnline(); } catch(e){}
  const sb = sortedBots(), at = posOf(p.w === -1 ? sb[0] : p.w);
  for (let k = 0; k < 40 && out.length < n; k++){ const u = Math.random(); add(u < .45 && on.length ? on[Math.floor(Math.random() * on.length)] : sb[clampN(at + Math.floor((Math.random() - .5) * 2000), 0, sb.length - 1)]); }
  return out;
}
const FD_SYS = me => `You write posts and comments for the Feed on Focus Bench, a study app for college students that works like Instagram: players post pictures of where they're studying, session receipts, match results and short thoughts, and others like and comment.
Write like real college students on Instagram: short, casual, lowercase is common, slang is fine, inside jokes about classes, finals, coffee, sleep. Captions are usually a few words to one sentence. Comments are short reactions or questions about the post, and they must fit what the picture actually shows (you'll be told what's in it).
Each person has their own emoji habit ("never", "sometimes" or "often", with their go-to emojis): mostly use their own, sometimes any other face, hand or heart emoji, never the same few for everyone, at most a couple per message.
Don't start a comment with the name of the person it answers. No hashtags. ${me} is the person using the app.
${TALK_RULES}
Answer with JSON: {"messages":[{"from":"<name exactly as listed>","text":"…","replyTo":"…"}]}; replyTo says what each message is: "cap <post id>" for a post's caption (from the poster), "<post id>" for a new comment on it, and "<post id> @<name>" for an answer to that person's comment (answers go under the comment they answer, so never write an answer as a new comment, and don't start the text with @name).`;
async function fdWrite(posts){
  if (!posts.length || !GEM.key || GEM.wait > Date.now()) return false;
  const me = myName(), blocks = [], names = new Map();
  posts.forEach((p, k) => {
    p.k = 'p' + (k + 1);
    const nC = Math.min(6, Math.max(0, Math.round(Math.log2(1 + p.L / 25) * (.5 + Math.random())))), cs = fdCommenters(p, nC);
    p._cs = cs; [p.w, ...cs].forEach(w => { if (w >= 0) names.set(bot(w).name.toLowerCase(), w); });
    const f = chatFacts(p.w);
    blocks.push(`Post ${p.k} by ${f.name} (${f.rank}, ${f.subj}, emojis: ${emojiStyle(p.w)}), posted at ${new Date(p.t).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}.
What it is: ${fdAbout(p)}
${p.type === 'text' ? `Write the post itself as its caption (one or two short sentences). Starting point: ${pickTopic(p.w)}. Take it wherever feels natural for them.` : Math.random() < .3 ? `Write its caption. It can be about the picture or about ${pickTopic(p.w)}.` : 'Write its caption.'}
${cs.length ? `Then one comment each from: ${cs.map(w => { const g = chatFacts(w); return `${g.name} (${g.subj}, emojis: ${emojiStyle(w)})`; }).join('; ')}. One of them can answer another's comment, and ${f.name} can answer one comment.` : 'Nobody comments on this one.'}`);
  });
  const user = `Today is ${new Date().toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}.\n\n${blocks.join('\n\n')}${openerAvoid()}`;
  try {
    const got = await aiCall(FD_SYS(me), user);
    (Array.isArray(got) ? got : []).forEach(x => {
      const w = names.get(String(x && x.from || '').toLowerCase().trim()), to = String(x && x.replyTo || '').trim(); if (w == null) return;
      let text = String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
      text = emotionOnly(stripSegue(text)); if (!text) return;
      const cap = /^cap\s+/i.test(to), [k, at] = to.replace(/^cap\s+/i, '').split(/\s*@\s*/), p = posts.find(q => q.k === k.trim()); if (!p) return;
      if (cap && w === p.w){ if (!p.cap) p.cap = text; return; }
      if (p.cm.length >= 10) return;
      const {re, text: t2} = fdAnswerTo(p, at, text, me);
      if (!fdSelfOk(p, w, re)) return;
      const prev = p.cm.length ? p.cm[p.cm.length - 1].t : p.t;
      p.cm.push({id: p.id + 'c' + p.cm.length, w, t: Math.round(Math.max(prev, p.t) + (2 + Math.random() * 40) * 60000), text: t2.replace(/^\[play\]\s*/i, ''), play: /^\[play\]/i.test(t2), re, lk: fdCmLikes(p, !!re)});
    });
    posts.forEach(p => { p.gen = 1; if (p.cap) noteOpener(p.cap); else p.cap = fdFallbackCap(p); delete p.k; delete p._cs; });
    return true;
  } catch(e){
    if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); if (e.msg) GEM.detail = e.msg; try { saveAI(); } catch(err){}
    posts.forEach(p => { delete p.k; delete p._cs; });
    return false;
  }
}
const FD_CAPS = {scene: ['current situation', 'locked in (allegedly)', 'office for the night', 'the vibes are academic', 'study spot of the day', 'we move', 'send coffee'], text: ['why is the syllabus lying to me', 'one more chapter and then bed. probably', 'who else has an exam tomorrow', 'the library wifi is a social experiment'],
  session: ['done for now', 'that one hurt', 'productive day fr', 'small win'], match: ['gg', 'we take those', 'rematch?', 'good game'], rank: ['new rank unlocked', 'climbing', 'finally']};
function fdFallbackCap(p){ const a = FD_CAPS[p.type] || FD_CAPS.scene; return p.type === 'match' && p.d.ys < p.d.ts ? 'unlucky. next one' : a[fdHash(p.id) % a.length]; }
async function fdWriteVisible(list){
  if (FDV.busy) return; const need = list.filter(p => !p.gen && p.w !== -1).slice(0, 6); if (!need.length) return;
  FDV.busy = true;
  try { const ok = await fdWrite(need); if (!ok) need.forEach(p => { if (!GEM.key){ p.cap = p.cap || fdFallbackCap(p); p.gen = 1; } }); saveFeed(); } finally { FDV.busy = false; }
  renderFeed();
}

/* ---- cards for real moments ---- */
function fdCard(p){
  const who = p.w === -1 ? myName() : bot(p.w).name, hue = p.w === -1 ? 220 : bot(p.w).hue, c1 = scH(hue, 55, 52), c2 = scH(hue + 40, 45, 30);
  const svg = b => `<svg viewBox="0 0 300 300" class="scene" role="img" aria-label="${esc(fdAbout(p))}">${b}</svg>`;
  if (p.type === 'session'){
    const d = p.d, st = new Date(p.t - d.min * 60000), hh = Math.floor(d.min / 60), tot = `${Math.floor(d.tot / 60)}h ${d.tot % 60}m`;
    return svg(rc(0, 0, 300, 300, scH(hue + 180, 18, 30), 0) + rc(70, 30, 160, 230, '#f4f1ea', 4) + pa('M70 255 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 v-15 h-160z', '#f4f1ea')
      + tx(150, 58, 'FOCUS BENCH', 10, '#5f5e5a', ' letter-spacing="2"') + ln(85, 68, 215, 68, '#b4b2a9', 1, ' stroke-dasharray="3 3"')
      + tx(150, 110, hh ? `${hh}h ${d.min % 60}m` : `${d.min} min`, 32, '#2c2c2a') + tx(150, 130, esc(String(d.subj).slice(0, 26)), 11, '#5f5e5a')
      + ln(85, 144, 215, 144, '#b4b2a9', 1, ' stroke-dasharray="3 3"')
      + `<g font-size="11" fill="#444" font-family="ui-sans-serif,system-ui"><text x="88" y="166">Mode</text><text x="212" y="166" text-anchor="end">${esc(MODE_NAMES[d.mode] || 'Focus')}</text><text x="88" y="186">Started</text><text x="212" y="186" text-anchor="end">${st.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}</text><text x="88" y="206">Today</text><text x="212" y="206" text-anchor="end">${tot}</text></g>`
      + tx(150, 236, 'thank you for studying', 9, '#888780'));
  }
  if (p.type === 'match' || p.type === 'rank'){
    const d = p.d, won = d.ys > d.ts, opp = d.opp === -1 ? myName() : bot(d.opp).name, dl = Math.abs(d.dl);
    let b = rc(0, 0, 300, 300, c2, 0) + ci(150, 300, 220, c1, ' opacity=".35"');
    if (p.type === 'rank') b += tx(150, 72, 'RANKED UP', 14, '#fff', ' letter-spacing="3" opacity=".85"') + tx(150, 128, esc(d.rk), 30, '#fff') + ci(150, 190, 34, '#fff', ' opacity=".15"') + pa('M150 165 l9 18 l20 3 l-14 14 l3 20 l-18 -9 l-18 9 l3 -20 l-14 -14 l20 -3z', '#ffe14f') + tx(150, 262, `beat ${esc(opp.slice(0, 20))} · ${d.ys}–${d.ts} min`, 11, '#fff', ' opacity=".85"');
    else b += tx(150, 60, won ? 'VICTORY' : 'DEFEAT', 24, won ? '#ffe14f' : '#ffb4b4', ' letter-spacing="3"') + tx(80, 130, `${d.ys}m`, 34, '#fff') + tx(220, 130, `${d.ts}m`, 34, '#fff', ' opacity=".75"') + tx(150, 125, 'vs', 13, '#fff', ' opacity=".6"')
      + tx(80, 154, esc(who.slice(0, 14)), 11, '#fff') + tx(220, 154, esc(opp.slice(0, 14)), 11, '#fff', ' opacity=".8"') + rc(95, 190, 110, 34, '#fff', 17, ' opacity=".15"') + tx(150, 213, `${won ? '+' : '−'}${dl} Elo`, 16, won ? '#b9f6ca' : '#ffcdd2') + tx(150, 262, esc(rankOf(d.r).full), 11, '#fff', ' opacity=".75"');
    return svg(b);
  }
  // a text post: big words on a color, gradient or pattern card
  const raw = p.cap || '…', size = raw.length > 110 ? 15 : raw.length > 70 ? 18 : raw.length > 35 ? 21 : 25, lines = [], per = size >= 25 ? 16 : size >= 21 ? 19 : size >= 18 ? 23 : 27;
  let cur = ''; raw.split(' ').forEach(w => { if (cur && (cur + ' ' + w).length > per){ lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }); if (cur) lines.push(cur);
  const n = Math.min(9, lines.length), bg = fdTextBgSvg(fdTextBg0(p), p.id), dark = bg.ink === 'dark';
  return svg(bg.svg + lines.slice(0, 9).map((l, k) => tx(150, 150 - (n - 1) * size * .65 + k * size * 1.3 + size * .35, esc(l), size, dark ? '#24221f' : '#fff', ` font-weight="800"${dark ? '' : ' stroke="rgba(0,0,0,.18)" stroke-width="2" paint-order="stroke"'}`)).join(''));
}
const fdMedia = p => p.type === 'scene' ? sceneSvg(fdSpec(p), p.id) : fdCard(p);

/* ---- drawing the feed ---- */
const fdAgo = t => { const s = (Date.now() - t) / 1000; return s < 60 ? 'now' : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; };
const fdWho = w => w === -1 ? `<b>${esc(myName())}</b>` : `<button class="lnk" data-bot="${w}">${esc(bot(w).name)}</button>`;
function fdPostHtml(p){
  const me = p.w === -1, B = me ? null : bot(p.w), cms = fdShownComments(p), open = FDV.open[p.id], likes = fdLikes(p), fol = !me && FD.follows.includes(p.w);
  const roots = cms.filter(c => !c.re || !cms.some(x => x.id === c.re)), show = roots.slice().sort((a, b) => fdLk(b, p) - fdLk(a, p)).slice(0, 2), re = FDV.re[p.id], nc = fdCount(p);
  return `<article class="card fd-post" data-pid="${p.id}">
    <header class="fd-h">${me ? myAvatar('sm') : avatar(B, 'sm')}<span class="fd-who">${fdWho(p.w)}<small>${me ? 'You' : esc(B.subject)} · ${fdAgo(p.t)}</small></span>${me ? `<button class="fd-x" data-fda="del" title="Delete post" aria-label="Delete post">×</button>` : `<button class="small-btn${fol ? '' : ' accent'} fd-fol" data-fda="follow">${fol ? 'Following' : 'Follow'}</button>`}</header>
    <div class="fd-media" data-fda="dbl">${fdMedia(p)}</div>
    <div class="fd-b"><div class="fd-act"><button class="fd-like${FD.liked[p.id] ? ' on' : ''}" data-fda="like" aria-label="Like"><svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.3-9.1C1.2 8.6 3.1 5 6.6 5c2 0 3.4 1.2 4.4 2.6C12 6.2 13.4 5 15.4 5c3.5 0 5.4 3.6 3.9 6.9C19 16.4 12 21 12 21z"/></svg></button><button class="fd-cbtn" data-fda="comments" aria-label="Comments"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/></svg></button></div>
    <div class="fd-likes">${likes.toLocaleString()} like${likes === 1 ? '' : 's'}</div>
    ${p.type !== 'text' && p.cap ? `<p class="fd-cap">${fdWho(p.w)} ${esc(p.cap)}</p>` : !p.cap && !p.gen && !me ? '<p class="fd-cap hint">…</p>' : ''}
    ${nc > show.length ? `<button class="fd-more" data-fda="comments">${nc === 1 ? 'View 1 comment' : `View all ${nc.toLocaleString()} comments`}</button>` : ''}
    ${show.map(c => `<div class="fd-c${c.w === -1 ? ' me' : ''}" data-cid="${c.id}">${fdWho(c.w)} <span>${esc(c.text)}</span><small>${fdAgo(c.t)}${c.w !== -1 ? ` · <button data-fda="reply">Reply</button>` : ''}</small>${fdHeart(c, p)}</div>`).join('')}
    </div></article>`;
}
// tabs and their icons
const FD_TABS = [
  ['for', 'For you', '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.5L12 15l-1.8-4.5L5.5 9l4.7-1.4z"/><path d="M18.5 15l.8 2 2 .8-2 .7-.8 2-.7-2-2-.7 2-.8z"/>'],
  ['following', 'Following', '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.6c3 .1 5 1.9 5.5 5"/>'],
  ['hot', 'Hot', '<path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.6 2.7-5.5 3.6-9.3 1.9 1.2 3 3 3 5 1-.6 1.6-1.8 1.7-3.2 2.4 1.8 4.7 4.5 4.7 7.6C18.5 18.4 16 21 12 21z"/>'],
  ['top', 'Top', '<path d="M7 4h10v4.5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4M12 13.5V17M8.5 20h7M10 17h4"/>'],
  ['new', 'New', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
  ['live', 'Live', '<circle cx="12" cy="12" r="2.2"/><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/>']];
if (FDV.tab === 'you') FDV.tab = 'for';
const FD_TOP = {day: ['Today', 864e5], week: ['This week', 7 * 864e5], month: ['This month', 30 * 864e5], all: ['All time', 0]};
function fdList(){
  const now = Date.now(), vis = FD.posts.filter(p => p.t <= now && !p.del);
  if (FDV.tab === 'following') return vis.filter(p => FD.follows.includes(p.w)).sort((a, b) => b.t - a.t);
  if (FDV.tab === 'act' || FDV.tab === 'live') return [];
  if (FDV.tab === 'new') return vis.sort((a, b) => b.t - a.t);
  // Hot: likes and comments for how old the post is, so something blowing up right now beats a big post from this morning
  if (FDV.tab === 'hot'){ const hs = p => (fdLikes(p) + 3 * fdCount(p)) / Math.pow((now - p.t) / 3600e3 + 2, 1.5); return vis.filter(p => now - p.t < 2 * 864e5).sort((a, b) => hs(b) - hs(a)); }
  if (FDV.tab === 'top'){ const win = FD_TOP[FDV.top][1]; return vis.filter(p => !win || now - p.t < win).sort((a, b) => fdLikes(b) - fdLikes(a)); }
  // For you: newest first, nudged up for people you follow and popular posts
  const sc = p => p.t / 3600e3 + (FD.follows.includes(p.w) ? 1.5 : 0) + Math.log10(1 + p.L) * .35 + (p.w === -1 ? 2 : 0);
  return vis.sort((a, b) => sc(b) - sc(a));
}
// the name in a notification opens their profile
function fdNoteHtml(n){
  if (n.w == null || n.w < 0) return n.html;
  const nm = `<b>${esc(bot(n.w).name)}</b>`;
  return n.html.includes(nm) ? n.html.replace(nm, `<button class="lnk fd-nname" data-bot="${n.w}">${esc(bot(n.w).name)}</button>`) : n.html;
}
document.addEventListener('click', e => { if (!e.target.closest('[data-fdclr]')) return; FD.notif = []; FD.nseen = Date.now(); saveFeed(); fdBadge(); renderFeed(); toast('Notifications cleared.'); });
function fdNotifHtml(){
  const ns = FD.notif.slice(-40).reverse();
  // likes, comments and replies show a small picture of the post; tapping the row opens it with its comments
  const row = n => { const p = n.pid ? FD.posts.find(x => x.id === n.pid && !x.del) : null;
    return `<div class="fd-n${n.t > FD.nseen ? ' new' : ''}${p ? ' go' : ''}"${p ? ` data-open-post="${p.id}" role="button" tabindex="0"` : ''}>${n.w != null && n.w >= 0 ? `<button class="fd-nav" data-bot="${n.w}" aria-label="Open ${esc(bot(n.w).name)}'s profile">${avatar(bot(n.w), 'sm')}</button>` : '<span class="fd-ndot"></span>'}<span>${fdNoteHtml(n)} <small>${fdAgo(n.t)}</small></span>${p ? `<span class="fd-nthumb">${fdMedia(p)}</span>` : ''}</div>`; };
  return `<div class="card fd-notifs"><div class="fd-nhead"><div class="h first">Activity</div>${ns.length ? '<button class="small-btn" data-fdclr>Clear</button>' : ''}</div>${ns.length ? ns.map(row).join('') : '<p class="hint">Likes, comments and new followers show up here.</p>'}</div>`;
}
document.addEventListener('click', e => { const r = e.target.closest('[data-open-post]'); if (!r || e.target.closest('[data-bot]')) return; const p = FD.posts.find(x => x.id === r.dataset.openPost); if (p) fdView(p); });
function renderFeed(){
  fdViewRefresh();
  const el = $('#fdBody'); if (!el || $('#page-feed').hidden) return;
  if (!RK_READY || !FD_READY){ el.innerHTML = '<p class="hint">Loading the feed…</p>'; return; }
  const n = FD.notif.filter(x => x.t > FD.nseen).length;
  $('#fdTabs').innerHTML = '<div class="fd-tabrow">' + FD_TABS.map(([k, t, ic]) => `<button class="ct-btn${FDV.tab === k ? ' on' : ''}" data-fdt="${k}"><svg class="fd-ti" viewBox="0 0 24 24" aria-hidden="true">${ic}</svg>${t}</button>`).join('') + '</div>'
    + `<div class="fd-acts"><button class="fd-act-btn${FDV.tab === 'act' ? ' on' : ''}" data-fdt="act" aria-label="Activity" title="Activity"><svg class="fd-ti" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-9-8.6C1.6 8.4 3.4 5 6.7 5c1.9 0 3.3 1.1 4.2 2.4h2.2C14 6.1 15.4 5 17.3 5c3.3 0 5.1 3.4 3.7 6.4C19 15.6 12 20 12 20z"/></svg>${n ? `<b>${n > 99 ? '99+' : n}</b>` : ''}</button><button class="small-btn accent fd-new" data-fda="compose">New post</button></div>`;
  const list = fdList(), page = list.slice(0, FDV.shown);
  const top = FDV.tab === 'top' ? `<div class="seg fd-topwin" role="group" aria-label="Top posts from">${Object.entries(FD_TOP).map(([k, [l]]) => `<button data-fdtop="${k}" aria-pressed="${FDV.top === k}">${l}</button>`).join('')}</div>` : FDV.tab === 'act' ? fdNotifHtml() : '';
  fdStrip(); fdSideDraw();
  if (FDV.tab === 'live'){ el.innerHTML = `<div id="fdComp">${FDV.composer ? fdComposerHtml() : ''}</div><div class="card lf-card" id="fdLive"><p class="hint">Counting who’s studying…</p></div>`; if (lfFresh(() => renderLive(true))) renderLive(true); return; }
  el.innerHTML = `<div id="fdComp">${FDV.composer ? fdComposerHtml() : ''}</div>` + top + (FDV.tab === 'act' ? '' : page.length ? page.map(fdPostHtml).join('') : `<p class="hint fd-empty">${FDV.tab === 'following' ? 'Follow people from their posts or profiles to see them here.' : 'Nothing yet.'}</p>`)
    + (list.length > FDV.shown ? '<button class="small-btn fd-load" data-fda="more">Show more</button>' : '')
    + (!GEM.key ? '<p class="hint ch-hint">Captions and comments are written once Gemini is set up in <button class="link-btn" data-go="settings" data-sec="set-chat">Settings → Chat</button>.</p>' : '');
  if (FDV.tab === 'act'){ FD.nseen = Date.now(); saveFeed(); fdBadge(); }
  fdWriteVisible(page);
}
function fdBadge(){ const n = FD.notif.filter(x => x.t > FD.nseen).length; document.querySelectorAll('.feed-badge').forEach(b => { b.textContent = n > 99 ? '99+' : n || ''; b.hidden = !n; }); }

/* ---- notifications ---- */
function fdNote(kind, w, html, pid){ FD.notif.push({t: Date.now(), kind, w, html, pid}); saveFeed(); fdBadge(); }

/* ---- following ---- */
function fdFollow(w, on){
  const i = FD.follows.indexOf(w);
  if (on && i < 0){ FD.follows.push(w); const known = (R.rec && R.rec[w]) || DMS.msgs.some(m => m.w === w); if (!FD.followers.includes(w) && Math.random() < (known ? .7 : .35)) FD.pend.push({kind: 'fb', w, due: Date.now() + (5 + Math.random() * 85) * 60000}); }
  if (!on && i >= 0) FD.follows.splice(i, 1);
  saveFeed();
}
const _dmButtons = typeof dmButtons === 'function' ? dmButtons : () => '';
dmButtons = function(w){ const on = FD.follows.includes(w); return `<button class="small-btn${on ? '' : ' accent'}" data-fdf="${w}">${on ? 'Following' : 'Follow'}</button>` + _dmButtons(w); };

/* ---- commenting: people answer you, later if they're offline ---- */
function fdComment(p, text){
  const re = FDV.re[p.id], c = {id: p.id + 'm' + Date.now().toString(36), w: -1, t: Date.now(), text, re: re ? re.cid : null, lk: 0};
  p.cm.push(c); delete FDV.re[p.id];
  if (re){ const r = fdTree(p.cm).find(x => x.c.id === re.cid || x.kids.some(k => k.c.id === re.cid)); if (r) FDV.vexp[r.c.id] = r.kids.length; }
  // who answers: the person you replied to, or the poster (if it isn't you); on your own post, someone in the comments
  let who = re ? re.w : p.w !== -1 ? p.w : (p.cm.filter(x => x.w >= 0).pop() || {}).w;
  if (who != null && who >= 0 && Math.random() < .9) FD.pend.push({kind: 'reply', pid: p.id, cid: c.id, w: who, due: Date.now() + (40 + Math.random() * 200) * 1000});
  saveFeed(); renderFeed(); const i = $('#fdViewBody .fd-form input'); if (i) i.value = ''; fdViewRefresh();
}
async function fdReply(job){
  const p0 = FD.posts.find(x => x.id === job.pid); if (p0) await fdCm(p0);
  const p = p0, mine = p && p.cm.find(x => x.id === job.cid); if (!p || !mine || !GEM.key) return true;
  const me = myName(), B = bot(job.w), f = chatFacts(job.w);
  const thread = p.cm.filter(x => x.t <= Date.now()).slice(-10).map(x => `${x.w === -1 ? me : bot(x.w).name}: ${x.text}`).join('\n');
  const user = `Post ${p.id} by ${p.w === -1 ? me : bot(p.w).name}. What it is: ${fdAbout(p)}${p.cap ? `\nCaption: ${p.cap}` : ''}\nComments so far:\n${thread}\n\n${me} just commented "${mine.text}". Write ${B.name}'s answer (${f.rank}, ${f.subj}, emojis: ${emojiStyle(job.w)}) as one short comment, replyTo "${p.id}". It should answer what ${me} said.${/\b(play|match|1v1|challenge|duel|ranked|game)\b/i.test(mine.text) && R.on ? ` If ${me} is asking to play and ${B.name} would, start the comment with [play].` : ''}`;
  try {
    const got = await aiCall(FD_SYS(me), user), x = (Array.isArray(got) ? got : []).find(m => m && m.text);
    if (!x) return true;
    let text = emotionOnly(stripSegue(stripLeadName(String(x.text).replace(/#\w+/g, '').trim().slice(0, 240), [me]))); const play = /^\[play\]/i.test(text); text = text.replace(/^\[play\]\s*/i, '');
    if (!text) return true;
    p.cm.push({id: p.id + 'r' + Date.now().toString(36), w: job.w, t: Date.now(), text, re: mine.id, lk: fdCmLikes(p, true)});
    const rt = fdTree(p.cm).find(x => x.kids.some(k => k.c.id === mine.id) || x.c.id === mine.id); if (rt) FDV.vexp[rt.c.id] = rt.kids.length;
    fdNote('reply', job.w, `<b>${esc(B.name)}</b> replied: ${esc(text.slice(0, 80))}`, p.id);
    if (play) fdChallenge([job.w]);
    return true;
  } catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); return e.kind !== 'offline' && e.kind !== 'busy' ? true : false; }
}
function fdChallenge(ws){
  if (typeof dmQueue !== 'function' || !R.on || matchBusy()) return;
  ws.slice(0, 2).forEach((w, k) => { if (!pendingCh(w)) dmQueue(w, Date.now() + 4000 + k * 2500, [''], {ch: {mode: 'r', by: 'them'}}); });
}
// your own posts: likes build up, and people comment in a few waves (right away, after a while, hours later)
async function fdEngage(job){
  const p = FD.posts.find(x => x.id === job.pid); if (!p || p.del) return true;
  if (!GEM.key) return true; await fdCm(p);
  const me = myName(), n = job.n === 0 ? 1 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 3);
  if (!n) return true;
  const pool = FD.followers.length ? FD.followers : fdCommenters(p, 6), cs = [];
  for (let k = 0; k < 12 && cs.length < n; k++){ const w = pool[Math.floor(Math.random() * pool.length)]; if (w >= 0 && !cs.includes(w)) cs.push(w); }
  if (!cs.length) return true;
  const ask = /\b(play|match|1v1|challenge|duel|ranked|anyone up)\b/i.test(p.cap || '') && R.on;
  const user = `Post ${p.id} by ${me} (the user). What it is: ${fdAbout(p)}${p.cap ? `\nCaption: ${p.cap}` : ''}\nComments so far:\n${p.cm.filter(x => x.t <= Date.now()).slice(-8).map(x => `${x.w === -1 ? me : bot(x.w).name}: ${x.text}`).join('\n') || '(none)'}\n\nWrite one comment each from: ${cs.map(w => { const f = chatFacts(w); return `${f.name} (${f.rank}, ${f.subj}, emojis: ${emojiStyle(w)})`; }).join('; ')}. replyTo "${p.id}" for a new comment, or "${p.id} @<name>" to answer someone's comment.${ask ? ` ${me} is asking for a match: anyone who'd play starts their comment with [play].` : ''}`;
  try {
    const got = await aiCall(FD_SYS(me), user), names = new Map(cs.map(w => [bot(w).name.toLowerCase(), w])), players = [];
    (Array.isArray(got) ? got : []).forEach((x, k) => { const w = names.get(String(x && x.from || '').toLowerCase().trim()); if (w == null) return;
      let text = emotionOnly(stripSegue(String(x.text || '').replace(/#\w+/g, '').trim().slice(0, 240))); const play = /^\[play\]/i.test(text); text = text.replace(/^\[play\]\s*/i, ''); if (!text) return;
      const at = String(x && x.replyTo || '').split(/\s*@\s*/)[1], a = fdAnswerTo(p, at, text, me); text = a.text;
      p.cm.push({id: p.id + 'e' + Date.now().toString(36) + k, w, t: Date.now() + k * 20000, text, re: a.re, lk: fdCmLikes(p, !!a.re)}); if (play) players.push(w);
      setTimeout(() => { fdNote('comment', w, `<b>${esc(bot(w).name)}</b> commented: ${esc(text.slice(0, 80))}`, p.id); renderFeed(); }, k * 20000); });
    if (players.length) fdChallenge(players);
    saveFeed(); return true;
  } catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); return e.kind !== 'offline' && e.kind !== 'busy'; }
}

/* ---- every minute: people answering, new followers, likes on your posts ---- */
let fdTickBusy = false;
async function fdTick(){
  if (!RK_READY || fdTickBusy) return; fdTickBusy = true;
  try {
    const now = Date.now();
    // first time: people who already know you follow you
    if (!FD.seeded){ FD.seeded = 1; const known = [...new Set([...Object.keys(R.rec || {}).map(Number), ...DMS.msgs.map(m => m.w)])]; known.forEach(w => { if (Math.random() < .35 && !FD.followers.includes(w)) FD.followers.push(w); }); saveFeed(); }
    // jobs that are due (people offline answer once they're back)
    for (const job of FD.pend.slice()){
      if (job.due > now) continue;
      if (job.kind !== 'eng' && job.kind !== 'fb' && !(dmOnline(job.w) || dmStudying(job.w)) && now - job.due < 12 * 3600e3) continue;
      if (job.kind === 'fb'){ if (!FD.followers.includes(job.w)){ FD.followers.push(job.w); fdNote('follow', job.w, `<b>${esc(bot(job.w).name)}</b> followed you back`); } FD.pend.splice(FD.pend.indexOf(job), 1); continue; }
      const done = job.kind === 'reply' ? await fdReply(job) : await fdEngage(job);
      if (done){ const i = FD.pend.indexOf(job); if (i >= 0) FD.pend.splice(i, 1); } else job.due = now + 120000;
      break;                                                   // one request at a time
    }
    // new followers, more often the higher you climb and the more you post
    const rate = .12 + fdMyPop() / 500 + FD.posts.filter(p => p.w === -1 && now - p.t < 864e5).length * .15;
    if (Math.random() < rate / 60){ const pool = fdPool().filter(w => !FD.followers.includes(w)); if (pool.length){ const w = pool[Math.floor(Math.random() * pool.length)]; FD.followers.push(w); if (typeof insFollowed === 'function') insFollowed(); fdNote('follow', w, `<b>${esc(bot(w).name)}</b> started following you`); } }
    // likes on your posts: a note at 1, 5, 10, 25, 50, 100…
    FD.posts.filter(p => p.w === -1 && !p.del).forEach(p => { const n = fdLikes(p) - (FD.liked[p.id] ? 1 : 0), marks = [1, 5, 10, 25, 50, 100, 250, 500, 1000], hit = marks.filter(x => x <= n).pop();
      if (hit && hit > (p.ln || 0)){ p.ln = hit; const w = fdCommenters(p, 1)[0]; fdNote('like', w, hit === 1 ? `<b>${esc(bot(w).name)}</b> liked your post` : `<b>${esc(bot(w).name)}</b> and ${hit - 1} others liked your post`, p.id); } });
    saveFeed();
    if (!$('#page-feed').hidden && Date.now() - (FDV.drawn || 0) > 60000 && !document.activeElement.closest('.fd-form')){ if (fdFill()) {} FDV.drawn = Date.now(); renderFeed(); }
  } catch(e){ console.error(e); } finally { fdTickBusy = false; }
}
setInterval(fdTick, 60000); setTimeout(fdTick, 8000);

/* ---- making your own post ---- */
const FD_MY_LOOK_DEF = {skin: SKIN[2], hair: '#3b2a20', style: 'short', glasses: false, outfit: '#3f6fa0', hood: true};
function fdMyLook(){ return {...FD_MY_LOOK_DEF, ...(FD.look || {})}; }
function fdNewComposer(){
  const now = new Date(worldT(Date.now()));
  const S = sceneSpec({seed: Math.floor(Math.random() * 2 ** 31), hue: 215, maj: 'biz', hour: now.getHours(), month: now.getMonth(), look: fdMyLook(), outgoing: true});
  return {mode: 'pic', S, share: 'session', cap: ''};
}
const fdOpt = (map, cur, none) => (none ? `<option value="">${none}</option>` : '') + Object.entries(map).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${esc(typeof v === 'string' ? v : v.n)}</option>`).join('');
function fdShareItems(){
  const out = {}, last = LOG.length ? LOG[LOG.length - 1] : null;
  if (last){ const dk = dayKey(last.t), tot = LOG.filter(x => dayKey(x.t) === dk).reduce((n, x) => n + x.min, 0); out.session = {label: `Your last session: ${last.min} min${last.task ? ` of ${last.task}` : ''}`, type: 'session', d: {min: last.min, subj: last.task || last.tag || 'Focus', mode: last.mode || 'pomodoro', a: 0, tot}}; }
  const h = (R.hist || []).find(x => !x.open);
  if (h) out.match = {label: `Your last match: ${h.r === 'W' ? 'beat' : 'lost to'} ${bot(h.b).name}`, type: 'match', d: {opp: h.b, ys: h.you, ts: h.them, dl: h.d, r: h.m, rk: rankOf(h.m).full}};
  if (h && h.r === 'W') out.rank = {label: `Your rank: ${myRk().full}`, type: 'rank', d: {opp: h.b, ys: h.you, ts: h.them, dl: h.d, r: R.mmr, rk: myRk().full}};
  return out;
}
function fdComposerHtml(){
  const C = FDV.composer, S = C.S, self = S.angle === 'selfie', L = fdMyLook();
  const sel = (k, map, cur, label, none) => `<label>${label}<select data-fdw="${k}">${fdOpt(map, cur, none)}</select></label>`;
  const props = SC.PROP_KEYS.reduce((m, k) => (m[k] = SC.PROP[k].n, m), {});
  let body = '';
  if (C.mode === 'pic'){
    body = `<div class="fd-build"><div class="fd-prev">${sceneSvg(S, 'prev')}</div><div class="fd-opts">
      <div class="fd-row"><button type="button" class="small-btn" data-fda="rand">Shuffle everything</button></div>
      ${sel('set', SC.SETTING, S.set, 'Where')}${sel('light', SC.LIGHT, S.light, 'Lighting')}${sel('angle', SC.ANGLE, S.angle, 'Camera')}
      ${self ? sel('expr', SC.EXPR, S.expr, 'Face') + sel('pose', SC.POSE, S.pose, 'Pose') + `<label>Hands<select data-fdw="hand">${Object.entries(SC.HAND).map(([k, v]) => { const ok = scHandOk(S.pose, k); return `<option value="${k}"${k === S.hand ? ' selected' : ''}${ok ? '' : ' disabled'}>${esc(v || 'no gesture')}${ok ? '' : ' (hands are busy)'}</option>`; }).join('')}</select></label>`
        + `<details class="fd-look"><summary>How you look</summary>${sel('lk:skin', Object.fromEntries(SKIN.map((c, k) => [c, ['Lightest', 'Light', 'Light-medium', 'Medium', 'Medium-deep', 'Deep', 'Deepest'][k]])), L.skin, 'Skin tone')}${sel('lk:hair', Object.fromEntries(HAIR.map((c, k) => [c, ['Black', 'Dark brown', 'Brown', 'Light brown', 'Dirty blond', 'Blond', 'Red', 'Gray', 'Blue', 'Purple', 'Green', 'White', 'Pink'][k] || c])), L.hair, 'Hair color')}${sel('lk:style', {short: 'Short', long: 'Long', bun: 'Bun', curly: 'Curly', buzz: 'Buzz cut', side: 'Side part', afro: 'Afro', bob: 'Bob', spiky: 'Spiky', pony: 'Ponytail'}, L.style, 'Hair style')}<label class="fd-chk"><input type="checkbox" data-fdw="lk:glasses"${L.glasses ? ' checked' : ''}> Glasses</label></details>`
        : [0, 1, 2, 3, 4, 5].map(k => sel('prop' + k, props, S.props[k] || '', `Thing ${k + 1}`, 'nothing')).join('') + `<label>Note<input data-fdw="cls" maxlength="24" value="${esc(S.cls || '')}" placeholder="what the sticky note says"></label>`}
      ${sel('season', SC.SEASON, S.season || '', 'Season', 'none')}
    </div></div>`;
  } else if (C.mode === 'share'){
    const items = fdShareItems(), keys = Object.keys(items);
    if (!keys.includes(C.share)) C.share = keys[0];
    body = keys.length ? `<div class="fd-share">${keys.map(k => `<label class="fd-shopt"><input type="radio" name="fdsh" data-fdw="share" value="${k}"${k === C.share ? ' checked' : ''}> ${esc(items[k].label)}</label>`).join('')}<div class="fd-prev small">${fdCard({id: 'x', w: -1, type: items[C.share].type, d: items[C.share].d, t: Date.now()})}</div></div>` : '<p class="hint">Finish a session or a match first, then you can share it.</p>';
  }
  return `<div class="card fd-comp"><div class="fd-comp-h"><b>New post</b><button class="fd-x" data-fda="close" aria-label="Close">×</button></div>
    <div class="ct-tabs fd-ctabs">${[['pic', 'Picture'], ['share', 'Share'], ['text', 'Text']].map(([k, t]) => `<button class="ct-btn${C.mode === k ? ' on' : ''}" data-fdm="${k}">${t}</button>`).join('')}</div>
    ${C.mode === 'text' ? `<div class="fd-tprev"><div class="fd-prev">${fdCard({id: 'prevt', w: -1, t: Date.now(), type: 'text', cap: C.cap || 'What’s on your mind?', bg: fdTextBgC(C)})}</div><button type="button" class="small-btn" data-fda="newbg">New background</button></div>` : ''}
    ${body}<textarea data-fdw="cap" maxlength="220" rows="2" placeholder="${C.mode === 'text' ? 'What’s on your mind?' : 'Write a caption…'}">${esc(C.cap)}</textarea>
    <div class="fd-row"><button class="small-btn accent" data-fda="post">Post</button></div></div>`;
}
function fdTextBgC(C){ return C.bg || (C.bg = fdTextBgNew()); }
function fdPublish(){
  const C = FDV.composer, now = Date.now(), cap = (C.cap || '').replace(/\s+/g, ' ').trim();
  let p = {id: fdId(), w: -1, t: now, cm: [], cap, gen: 1, fg: 0};
  if (C.mode === 'pic') p = {...p, type: 'scene', spec: {...C.S, look: C.S.angle === 'selfie' ? fdMyLook() : C.S.look}};
  else if (C.mode === 'share'){ const it = fdShareItems()[C.share]; if (!it) return toast('Nothing to share yet.'); p = {...p, type: it.type, d: it.d}; }
  else { if (!cap) return toast('Write something first.'); p.type = 'text'; p.bg = fdTextBgC(C); }
  p.L = Math.round(fdMyPop() * ({scene: 1, text: .6, session: .8, match: 1.1, rank: 1.8}[p.type] || 1) * (.6 + Math.random() * .8) * (p.spec && p.spec.angle === 'selfie' ? 1.25 : 1));
  FD.posts.push(p);
  [[0, 60 + Math.random() * 120], [1, (20 + Math.random() * 40) * 60], [2, (120 + Math.random() * 120) * 60]].forEach(([n, s]) => FD.pend.push({kind: 'eng', pid: p.id, n, due: now + s * 1000}));
  FDV.composer = null; FDV.tab = 'new'; saveFeed(); renderFeed(); toast('Posted.');
}
// redraw just the composer (keeps the feed below as it is)
function fdComposerRedraw(){ const el = $('#fdComp'); if (el) el.innerHTML = FDV.composer ? fdComposerHtml() : ''; }

/* ---- the post viewer: picture on one side, caption and comments on the other ---- */
const fdViewOpen = () => $('#fdView') && !$('#fdView').hidden && FDV.view;
function fdViewHtml(p){
  const me = p.w === -1, B = me ? null : bot(p.w), cms = fdShownComments(p), likes = fdLikes(p), fol = !me && FD.follows.includes(p.w), re = FDV.re[p.id];
  const av = w => w === -1 ? myAvatar('sm') : avatar(bot(w), 'sm'), nc = fdCount(p);
  // top-level comments: yours first, then the most liked; answers stay folded under each one until you open them
  const tree = p.cm ? fdTree(cms).sort((a, b) => (b.c.w === -1) - (a.c.w === -1) || fdLk(b.c, p) - fdLk(a.c, p)) : [];
  const cmHtml = (c, to) => { const lk = fdLk(c, p); return `<div class="fv-c${c.w === -1 ? ' me' : ''}${to !== 0 ? ' sub' : ''}" data-cid="${c.id}">${av(c.w)}<div>${fdWho(c.w)} <span>${to && to.w !== c.w ? `<b class="fv-at">@${esc(fdNameOf(to.w))}</b> ` : ''}${esc(c.text)}</span><small>${fdAgo(c.t)}${c.w !== -1 ? ' · <button data-fda="reply">Reply</button>' : ''}</small></div>${fdHeart(c, p)}</div>`; };
  return `<div class="fv" data-pid="${p.id}">
    <div class="fv-media fd-media" data-fda="dbl">${fdMedia(p)}</div>
    <div class="fv-side">
      <header class="fd-h">${av(p.w)}<span class="fd-who">${fdWho(p.w)}<small>${me ? 'You' : esc(B.subject)}</small></span>${me ? '' : `<button class="small-btn${fol ? '' : ' accent'} fd-fol" data-fda="follow">${fol ? 'Following' : 'Follow'}</button>`}</header>
      <div class="fv-cms">
        ${p.type !== 'text' && p.cap ? `<div class="fv-c">${av(p.w)}<div>${fdWho(p.w)} <span>${esc(p.cap)}</span><small>${fdAgo(p.t)}</small></div></div>` : ''}
        ${!p.cm ? '<p class="hint fv-none">Loading comments…</p>' : tree.length ? tree.slice(0, FDV.vn).map(r => {
          const k = Math.min(r.kids.length, FDV.vexp[r.c.id] || 0);
          return cmHtml(r.c, 0) + (r.kids.length ? `<div class="fv-kids">${r.kids.slice(0, k).map(x => cmHtml(x.c, x.to)).join('')}
            <button class="fv-vrep" data-fda="vrep" data-root="${r.c.id}" data-n="${r.kids.length}"><i></i>${k >= r.kids.length ? 'Hide replies' : k ? `View ${r.kids.length - k} more repl${r.kids.length - k === 1 ? 'y' : 'ies'}` : `View ${r.kids.length} repl${r.kids.length === 1 ? 'y' : 'ies'}`}</button></div>` : '');
        }).join('') + (tree.length > FDV.vn ? '<button class="fv-morec" data-fda="vmore">View more comments</button>' : '')
          : `<p class="hint fv-none">No comments yet.${me ? '' : ' Start the conversation.'}</p>`}
      </div>
      <div class="fv-foot">
        <div class="fd-act"><button class="fd-like${FD.liked[p.id] ? ' on' : ''}" data-fda="like" aria-label="Like"><svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.3-9.1C1.2 8.6 3.1 5 6.6 5c2 0 3.4 1.2 4.4 2.6C12 6.2 13.4 5 15.4 5c3.5 0 5.4 3.6 3.9 6.9C19 16.4 12 21 12 21z"/></svg></button><button class="fd-cbtn" data-fda="focus" aria-label="Comment"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4A8 8 0 1 1 20 12z"/></svg></button></div>
        <div class="fd-likes">${likes.toLocaleString()} like${likes === 1 ? '' : 's'}${nc ? ` · ${nc.toLocaleString()} comment${nc === 1 ? '' : 's'}` : ''}</div><small class="fv-when">${fdAgo(p.t)}</small>
        <form class="fd-form" data-fda="send">${re ? `<div class="fd-re">Replying to ${esc(re.name)} <button type="button" data-fda="unre" aria-label="Cancel reply">×</button></div>` : ''}<input maxlength="220" placeholder="Add a comment…" aria-label="Add a comment" autocomplete="off"><button class="small-btn accent">Post</button></form>
      </div>
    </div></div>`;
}
function fdView(p, focus){
  if (FDV.view !== p.id){ FDV.vn = 30; FDV.vexp = {}; }
  if (!p.cm) fdCm(p).then(() => fdViewRefresh());
  FDV.view = p.id; $('#fdView').hidden = false; $('#fdViewBody').innerHTML = fdViewHtml(p);
  const box = $('#fdViewBody .fv-cms'); if (box) box.scrollTop = 0;
  if (focus){ const i = $('#fdViewBody .fd-form input'); if (i) i.focus({preventScroll: true}); }
}
// redraw the open viewer without losing what you're typing or where you scrolled
function fdViewRefresh(){
  if (!fdViewOpen()) return; const p = FD.posts.find(x => x.id === FDV.view); if (!p || p.del) return fdViewClose();
  const host = $('#fdViewBody'), i = host.querySelector('.fd-form input'), val = i ? i.value : '', foc = i && document.activeElement === i, box = host.querySelector('.fv-cms');
  const top = box ? box.scrollTop : 0;
  host.innerHTML = fdViewHtml(p);
  const i2 = host.querySelector('.fd-form input'), b2 = host.querySelector('.fv-cms'); if (i2){ i2.value = val; if (foc) i2.focus(); } if (b2) b2.scrollTop = top;
}
function fdViewClose(){ $('#fdView').hidden = true; FDV.view = null; renderFeed(); if (!$('#page-profile').hidden && typeof renderProfilePage === 'function') renderProfilePage(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && fdViewOpen()) fdViewClose(); });

/* ---- taps ---- */
document.addEventListener('click', e => {
  const pg = e.target.closest('#page-feed'), ff = e.target.closest('[data-fdf]');
  if (ff){ const w = +ff.dataset.fdf, on = !FD.follows.includes(w); fdFollow(w, on); ff.textContent = on ? 'Following' : 'Follow'; ff.classList.toggle('accent', !on); renderFeed(); if (!$('#page-profile').hidden && ff.closest('#page-profile')) renderProfilePage(); return; }
  const inView = e.target.closest('#fdView');
  if (inView && (e.target === $('#fdView') || e.target.closest('#fdView > .modal-card > .x'))){ fdViewClose(); return; }
  if (!pg && !inView) return;
  const t = e.target.closest('[data-fdt]'); if (t){ FDV.tab = t.dataset.fdt; FDV.shown = 16; renderFeed(); return; }
  const tw = e.target.closest('[data-fdtop]'); if (tw){ FDV.top = tw.dataset.fdtop; FDV.shown = 16; renderFeed(); return; }
  const m = e.target.closest('[data-fdm]'); if (m){ FDV.composer.mode = m.dataset.fdm; fdComposerRedraw(); return; }
  const a = e.target.closest('[data-fda]'); if (!a) return;
  const act = a.dataset.fda, post = a.closest('[data-pid]'), p = post && FD.posts.find(x => x.id === post.dataset.pid);
  if (act === 'compose'){ FDV.composer = FDV.composer || fdNewComposer(); renderFeed(); $('#fdComp').scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
  if (act === 'close'){ FDV.composer = null; fdComposerRedraw(); return; }
  if (act === 'rand'){ const k = FDV.composer.mode; FDV.composer = {...fdNewComposer(), mode: k, cap: FDV.composer.cap}; fdComposerRedraw(); return; }
  if (act === 'post'){ fdPublish(); return; }
  if (act === 'newbg'){ FDV.composer.bg = fdTextBgNew(); fdComposerRedraw(); return; }
  if (act === 'more'){ FDV.shown += 16; renderFeed(); return; }
  if (!p) return;
  if (act === 'like' || (act === 'dbl' && e.detail === 2)){ if (act === 'dbl' && FD.liked[p.id]) return; FD.liked[p.id] = !FD.liked[p.id]; saveFeed();
    document.querySelectorAll(`[data-pid="${p.id}"]`).forEach(el => { el.querySelector('.fd-like').classList.toggle('on', !!FD.liked[p.id]); const n = fdLikes(p); el.querySelector('.fd-likes').textContent = `${n.toLocaleString()} like${n === 1 ? '' : 's'}`; }); return; }
  if (act === 'follow'){ const on = !FD.follows.includes(p.w); fdFollow(p.w, on); renderFeed(); fdViewRefresh(); return; }
  if (act === 'comments'){ fdView(p, true); return; }
  if (act === 'focus'){ const i = $('#fdViewBody .fd-form input'); if (i) i.focus(); return; }
  if (act === 'reply'){ const c = a.closest('[data-cid]'), cm = (p.cm || p.pv || []).find(x => x.id === c.dataset.cid); if (!cm) return; FDV.re[p.id] = {cid: cm.id, w: cm.w, name: bot(cm.w).name}; if (!inView) return fdView(p, true); fdViewRefresh(); const i = $('#fdViewBody .fd-form input'); if (i) i.focus(); return; }
  if (act === 'unre'){ delete FDV.re[p.id]; fdViewRefresh(); return; }
  if (act === 'clike'){ const el = a.closest('[data-cid]'), c = (p.cm || p.pv || []).find(x => x.id === el.dataset.cid); if (!c) return;
    FD.cliked = FD.cliked || {}; if (FD.cliked[c.id]) delete FD.cliked[c.id]; else FD.cliked[c.id] = 1; saveFeed();
    document.querySelectorAll(`[data-cid="${c.id}"] > .fd-cheart`).forEach(b => { b.outerHTML = fdHeart(c, p); }); return; }
  if (act === 'vmore'){ FDV.vn += 30; fdViewRefresh(); return; }
  if (act === 'vrep'){ const id = a.dataset.root, n = +a.dataset.n, k = FDV.vexp[id] || 0; FDV.vexp[id] = k >= n ? 0 : Math.min(n, k + 10); fdViewRefresh(); return; }
  if (act === 'del'){ if (!confirmDel(p)) return; if (inView) $('#fdView').hidden = true; p.del = 1; FD.pend = FD.pend.filter(j => j.pid !== p.id); saveFeed(); renderFeed(); undoToast && undoToast('Post deleted.', () => { delete p.del; saveFeed(); renderFeed(); }); return; }
});
function confirmDel(){ return true; }
document.addEventListener('submit', e => {
  const f = e.target.closest('.fd-form'); if (!f) return; e.preventDefault();
  const p = FD.posts.find(x => x.id === f.closest('[data-pid]').dataset.pid), i = f.querySelector('input'), text = i.value.replace(/\s+/g, ' ').trim();
  if (p && text){ fdComment(p, text);
    // show what you just wrote
    const c = p.cm && p.cm[p.cm.length - 1], el = c && document.querySelector(`#fdViewBody [data-cid="${c.id}"]`); if (el) el.scrollIntoView({block: 'nearest'}); }
});
// the picture builder: every change redraws the preview
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.fdw; if (!k || !FDV.composer) return;
  const C = FDV.composer, S = C.S, v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (k === 'cap'){ C.cap = v; if (C.mode === 'text'){ const pv = document.querySelector('#fdComp .fd-tprev .fd-prev'); if (pv) pv.innerHTML = fdCard({id: 'prevt', w: -1, t: Date.now(), type: 'text', cap: v || 'What’s on your mind?', bg: fdTextBgC(C)}); } return; }
  if (k === 'share'){ C.share = v; fdComposerRedraw(); return; }
  if (k.startsWith('lk:')){ FD.look = {...fdMyLook(), [k.slice(3)]: v}; S.look = fdMyLook(); saveFeed(); }
  else if (k.startsWith('prop')){ const n = +k.slice(4), a = S.props.slice(); a[n] = v; S.props = a.filter(Boolean); }
  else if (k === 'season') S.season = v || null;
  else S[k] = v;
  if (k === 'angle' && v === 'selfie') S.look = fdMyLook();
  if (k === 'pose' && !scHandOk(S.pose, S.hand)) S.hand = 'none';
  if (k === 'angle' || k === 'pose' || k.startsWith('lk:')) fdComposerRedraw();
  else { const pv = document.querySelector('#fdComp .fd-prev'); if (pv) pv.innerHTML = sceneSvg(S, 'prev'); }
});

/* ---- a player's posts on their profile ---- */
function fdUserPosts(w){ return FD.posts.filter(p => !p.del && p.t <= Date.now() && (w === ME ? p.w === -1 : p.w === w)).sort((a, b) => b.t - a.t); }
document.addEventListener('click', e => { const b = e.target.closest('[data-goto-post]'); if (!b) return; const p = FD.posts.find(x => x.id === b.dataset.gotoPost); if (!p) return;
  if (b.closest('#page-profile')) return fdView(p);
  FDV.tab = 'new'; FDV.shown = Math.max(FDV.shown, fdList().indexOf(p) + 4); showPage('feed'); setTimeout(() => { const el = document.querySelector(`[data-pid="${p.id}"]`); if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'}); }, 80); });

const _fdShown = onPageShown;
// the world may still be catching up when you open the Feed: fill it as soon as it's ready
function fdOpen(){ if ($('#page-feed').hidden) return; if (!RK_READY){ renderFeed(); return setTimeout(fdOpen, 1500); } fdFill(); FDV.drawn = Date.now(); renderFeed(); }
onPageShown = function(name){ if (fdViewOpen()){ $('#fdView').hidden = true; FDV.view = null; } _fdShown(name); if (name === 'feed') fdOpen(); };
if (typeof openProfile === 'function'){ const _fdOP = openProfile; openProfile = function(){ if (fdViewOpen()){ $('#fdView').hidden = true; FDV.view = null; } return _fdOP.apply(this, arguments); }; }
setTimeout(fdBadge, 3000);

/* ---- live, in the Feed: a strip of who's live (like stories), and a side column on wide screens ---- */
function fdStrip(){
  const el = $('#fdStrip'); if (!el || !RK_READY) return;
  if (FDV.tab === 'live' || FDV.tab === 'act'){ el.innerHTML = ''; return; }
  const live = typeof wLiveTop === 'function' ? wLiveTop().slice(0, 6) : [], seen = new Set(), ppl = [];
  const add = w => { if (w >= 0 && !seen.has(w) && botLiveNow(w)){ seen.add(w); ppl.push(w); } };
  FD.follows.forEach(add); Object.keys(R.rec || {}).map(Number).filter(w => isRival(w)).forEach(add);
  if (ppl.length < 8) FD.followers.forEach(add);
  const short = n => n.length > 9 ? n.slice(0, 8) + '…' : n;
  const items = live.map(p => { const top = p.ra >= p.rc ? p.a : p.c, oth = top === p.a ? p.c : p.a;
      return `<button class="fd-st live" data-watch="${p.a}-${p.c}" title="Watch ${esc(bot(p.a).name)} vs ${esc(bot(p.c).name)}"><span class="fd-ring">${avatar(bot(top), 'md')}</span><b class="fd-livetag">LIVE</b><small>${esc(short(bot(top).name))} vs ${esc(short(bot(oth).name))}</small></button>`; })
    .concat(ppl.slice(0, 24).map(w => `<button class="fd-st" data-bot="${w}" title="${esc(bot(w).name)} is studying"><span class="fd-ring">${avatar(bot(w), 'md')}</span><small>${esc(short(bot(w).name))}</small></button>`));
  el.innerHTML = items.length ? `<div class="card fd-strip-card"><div class="fd-strip-h">Live now</div><div class="fd-strip-row">${items.join('')}</div></div>` : '';
}
function fdSideDraw(){
  const el = $('#fdSide'); if (!el || !RK_READY || $('#page-feed').hidden) return;
  el.hidden = FDV.tab === 'live';                                        // the Live tab already shows all of it
  if (el.hidden) return;
  if (getComputedStyle(el).display === 'none') return;                  // narrow screens: no side column
  if (!lfFresh(fdSideDraw)){ el.innerHTML = '<div class="card"><p class="hint">Counting who’s studying…</p></div>'; return; }
  const H = LF.hours, mx = Math.max(1, ...H), {h} = lfNow();
  const bars = Array.from({length: 24}, (_, x) => x > h ? '<span class="fut"><i></i></span>' : `<span class="${x === h ? 'now' : ''}${x < 4 ? ' tl' : x > 19 ? ' tr' : ''}" tabindex="0" data-tip="${x === h ? 'Now' : hourLabel(x)}: ${H[x].toLocaleString()} studying"><i style="--v:${Math.max(.04, H[x] / mx).toFixed(3)}"></i></span>`).join('');
  const tab = LF.tab || 'you', live = typeof wLiveTop === 'function' ? wLiveTop().slice(0, 2) : [];
  const evs = (tab === 'top' ? LF.events.filter(x => x.kind === 'match' && Math.max(x.p.ra, x.p.rc) >= LF.top) : LF.events.filter(x => tab === 'you' ? x.you : x.all)).slice(0, 7);
  el.innerHTML = `<div class="card fd-side-card"><div class="h first lf-h"><span><i class="lf-dot" aria-hidden="true"></i>Studying now</span></div>
      <div class="lf-count"><b>${LF.live.toLocaleString()}</b><span>studying</span></div>
      <div class="lf-bars sm" aria-label="Players studying in each hour today">${bars}</div>
      ${LF.trend.length ? `<div class="fd-chips">${LF.trend.slice(0, 4).map(([s]) => lfSubj(s)).join('')}</div>` : ''}</div>
    <div class="card fd-side-card"><div class="fd-side-hd"><span class="h first">Happening now</span><span class="fd-mini-tabs">${LF_TABS.map(([k, n]) => `<button data-lft="${k}" aria-pressed="${tab === k}">${k === 'you' ? 'For you' : k === 'top' ? 'Top' : 'All'}</button>`).join('')}</span></div>
      ${live.length ? `<ul class="fd-livem">${live.map(p => `<li><span class="lf-dot" aria-hidden="true"></span><span><b>${esc(bot(p.a).name)}</b> vs <b>${esc(bot(p.c).name)}</b></span><button class="small-btn" data-watch="${p.a}-${p.c}">Watch</button></li>`).join('')}</ul>` : ''}
      ${evs.length ? `<ul class="lf-feed sm">${evs.map(ev => ev.kind === 'match' && tab === 'top' ? lfRow(ev) : lfRow(ev)).join('')}</ul>` : '<p class="hint">It’s quiet right now.</p>'}
      <button class="link-btn fd-seeall" data-fdt="live">See all →</button></div>`;
}
setInterval(() => { if (!$('#page-feed').hidden && !document.hidden){ fdStrip(); fdSideDraw(); if (FDV.tab === 'live') renderLive(); } }, 30000);
document.addEventListener('click', e => { if (e.target.closest('#fdSide [data-lft]')) setTimeout(fdSideDraw, 0); });
