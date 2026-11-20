/* ---------- followers and following, for you and every player ----------
   Your lists are real (FD.followers / FD.follows). Everyone else's counts come from how high they're ranked and how
   active they are; their lists are a stable sample of real players, with you (and people you follow) in them when it fits. */
const socHash = (a, b, c = 0) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(c + 0x165667b1, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
const SOC_DAY0 = Date.UTC(2026, 10, 1);
// followers by Elo place: top 100 50k–300k, top 1% 1k–25k, top 10% 500–2k, everyone else 50–400 (5–50 if barely active)
const SOC_CURVE = [[1, 226000], [10, 150000], [100, 63000], [101, 18500], [ROSTER_N * .01, 1260], [ROSTER_N * .1, 630], [ROSTER_N * .1 + 1, 300], [ROSTER_N, 62]];
function socCurve(p){
  for (let k = 1; k < SOC_CURVE.length; k++){ const [p1, v1] = SOC_CURVE[k]; if (p <= p1){ const [p0, v0] = SOC_CURVE[k - 1]; const t = p1 === p0 ? 1 : (Math.log(p) - Math.log(p0)) / (Math.log(p1) - Math.log(p0)); return Math.exp(Math.log(v0) + t * (Math.log(v1) - Math.log(v0))); } }
  return 50;
}
const socQuiet = w => BS[w * BF + F.days] < 5;
function socFollowers(w){
  if (w === ME) return FD.followers.length;
  const p = placeOf(w), h = socHash(w, 11), o = w * BF;
  let n = socCurve(p) * (.8 + .4 * h) * (1 + Math.min(BS[o + F.cur], 60) / 600) * (1 + Math.max(0, Date.now() - SOC_DAY0) / 864e5 * .001);
  const top1 = ROSTER_N * .01, top10 = ROSTER_N * .1;
  n = p <= 100 ? clampN(n, 50000, 300000) : p <= top1 ? clampN(n, 1000, 25000) : p <= top10 ? clampN(n, 500, 2000) : socQuiet(w) ? 5 + 45 * h : clampN(n, 50, 400);
  return Math.round(n) + (FD.follows.includes(w) ? 1 : 0);
}
function socFollowing(w){
  if (w === ME) return FD.follows.length;
  const h = socHash(w, 12), q = socHash(w, 13);
  const n = socQuiet(w) ? 5 + 55 * h : clampN(50 + Math.pow(h, 1.6) * 950 + (placeOf(w) <= ROSTER_N * .01 ? 400 * q : 0), 50, 1500);
  return Math.round(n) + (FD.followers.includes(w) ? 1 : 0);
}
// does a player you follow also follow w? (more likely the more popular w is)
const socFollowsBot = (a, w) => a !== w && socHash(a, w, 7) < Math.min(.6, socFollowers(w) / 40000 + .02);
function socFollowedBy(w){
  if (w === ME) return [];
  const pop = socFollowers(w); return FD.follows.filter(a => a !== w && socHash(a, w, 7) < Math.min(.6, pop / 40000 + .02));
}

/* ---- lists: built as you scroll, the same every time ---- */
const SOC_LISTS = new Map();
function socList(w, kind){
  const key = `${w}|${kind}|${FD.follows.length}|${FD.followers.length}`; let L = SOC_LISTS.get(key); if (L) return L;
  if (SOC_LISTS.size > 30) SOC_LISTS.clear();
  if (w === ME){ L = {n: 0, ids: (kind === 'followers' ? FD.followers : FD.follows).slice().reverse(), done: true}; L.n = L.ids.length; SOC_LISTS.set(key, L); return L; }
  const n = kind === 'followers' ? socFollowers(w) : socFollowing(w), ids = [], seen = new Set([w]);
  const push = i => { if (!seen.has(i) && ids.length < n){ seen.add(i); ids.push(i); } };
  if (kind === 'followers'){ if (FD.follows.includes(w)) { seen.add(ME); ids.push(ME); } socFollowedBy(w).forEach(push); }
  else { if (FD.followers.includes(w)){ seen.add(ME); ids.push(ME); } FD.follows.forEach(a => { if (socHash(w, a, 9) < .04) push(a); }); }
  L = {n, ids, seen, k: 0, done: ids.length >= n}; SOC_LISTS.set(key, L); return L;
}
// add up to m more people. Followers lean toward fans below them; following leans toward people near their rank
function socMore(w, kind, L, m){
  if (L.done) return;
  const want = Math.min(L.n, L.ids.length + m), r0 = botRating(w), pos = typeof posOf === 'function' ? posOf(w) : 0, order = sortedBots();
  let guard = 0;
  while (L.ids.length < want && guard++ < m * 40){
    const k = L.k++, u = socHash(w, k, kind === 'followers' ? 21 : 22);
    let i;
    if (kind === 'following' && socHash(w, k, 23) < .55){ const span = 4000, j = clampN(pos + Math.round((u - .5) * 2 * span), 0, ROSTER_N - 1); i = order[j]; }
    else { i = Math.floor(u * ROSTER_N); if (kind === 'followers' && botRating(i) > r0 + 150 && socHash(w, k, 24) < .7) continue; }
    if (L.seen.has(i)) continue; L.seen.add(i); L.ids.push(i);
  }
  if (L.ids.length >= L.n) L.done = true;
}

/* ---- the followers / following window ---- */
const SOCV = {w: null, kind: 'followers', q: '', shown: 0, hits: null, scan: 0};
function socRow(i){
  if (i === ME) return `<li class="soc-row"><button class="soc-who" data-soc-open="me">${myAvatar('md')}<span><b>${esc(myName())}</b><small>you · ${esc(myRk().full)}</small></span></button></li>`;
  const B = bot(i), on = FD.follows.includes(i), fy = FD.followers.includes(i);
  return `<li class="soc-row"><button class="soc-who" data-soc-open="${i}">${avatar(B, 'md')}<span><b>${esc(B.name)}${fy ? ' <i class="soc-fy">Follows you</i>' : ''}</b><small>${esc(B.subject || '')} · ${esc(rkOf(i).full)}</small></span></button>
    <button class="small-btn${on ? '' : ' accent'}" data-fdf="${i}">${on ? 'Following' : 'Follow'}</button></li>`;
}
function socOpen(w, kind){ SOCV.w = w; SOCV.kind = kind; SOCV.q = ''; SOCV.hits = null; SOCV.shown = 40; $('#socModal').hidden = false; socRender(true); const q = $('#socQ'); q && q.focus({preventScroll: true}); }
function socRender(full){
  const w = SOCV.w, L = socList(w, SOCV.kind); if (w !== ME) socMore(w, SOCV.kind, L, SOCV.shown - L.ids.length);
  const nf = socFollowers(w), ng = socFollowing(w), list = SOCV.hits || L.ids.slice(0, SOCV.shown);
  const body = `${list.length ? `<ul class="soc-list">${list.map(socRow).join('')}</ul>` : `<p class="hint">${SOCV.q ? (SOCV.scan ? 'Searching…' : 'No one by that name.') : SOCV.kind === 'followers' ? (w === ME ? 'No followers yet. Post something, or follow people back.' : 'No followers yet.') : (w === ME ? 'You aren’t following anyone yet.' : 'Not following anyone yet.')}</p>`}
    ${SOCV.q && SOCV.scan ? `<p class="hint soc-scan">Searching… ${Math.round(SOCV.scan * 100)}%</p>` : ''}${!SOCV.q && !L.done && list.length < L.n ? '<div class="soc-more" id="socMoreAt"></div>' : ''}`;
  if (full){
    $('#socBody').innerHTML = `<div class="soc-head"><b>${esc(pName(w))}</b></div>
      <div class="pf-tabs soc-tabs" role="tablist"><button data-soc-tab="followers" aria-selected="${SOCV.kind === 'followers'}"><b>${nf.toLocaleString()}</b> followers</button><button data-soc-tab="following" aria-selected="${SOCV.kind === 'following'}"><b>${ng.toLocaleString()}</b> following</button></div>
      <input id="socQ" type="search" placeholder="Search" autocomplete="off" value="${esc(SOCV.q)}"><div id="socList">${body}</div>`;
  } else $('#socList').innerHTML = body;
  socWatch();
}
// load the next page when you scroll near the bottom
let socIO = null;
function socWatch(){
  const el = $('#socMoreAt'); if (socIO) socIO.disconnect(); if (!el) return;
  socIO = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)){ SOCV.shown += 60; socRender(false); } }, {root: $('#socModal .modal-card')}); socIO.observe(el);
}
// search the whole list (a big one is gone through in steps so nothing freezes)
let socSearchTok = 0;
function socSearch(q){
  SOCV.q = q.trim().toLowerCase(); const tok = ++socSearchTok;
  if (!SOCV.q){ SOCV.hits = null; SOCV.scan = 0; return socRender(false); }
  const w = SOCV.w, L = socList(w, SOCV.kind), hits = [], name = i => (i === ME ? myName() : bot(i).name).toLowerCase();
  let at = 0; SOCV.hits = hits; SOCV.scan = .001;
  const step = () => {
    if (tok !== socSearchTok) return;
    const t0 = performance.now();
    while (performance.now() - t0 < 12 && hits.length < 60){
      if (at >= L.ids.length){ if (L.done || w === ME) break; socMore(w, SOCV.kind, L, 2000); if (at >= L.ids.length) break; }
      const i = L.ids[at++]; if (name(i).includes(SOCV.q)) hits.push(i);
    }
    const finished = hits.length >= 60 || (at >= L.ids.length && (L.done || w === ME));
    SOCV.scan = finished ? 0 : Math.max(.001, at / Math.max(1, L.n)); socRender(false);
    if (!finished) setTimeout(step, 0);
  };
  step();
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-soc]'); if (c){ socOpen(c.dataset.socW === 'me' ? ME : +c.dataset.socW, c.dataset.soc); return; }
  if (!$('#socModal') || $('#socModal').hidden) return;
  const t = e.target.closest('[data-soc-tab]'); if (t){ SOCV.kind = t.dataset.socTab; SOCV.q = ''; SOCV.hits = null; SOCV.shown = 40; socSearchTok++; socRender(true); return; }
  const o = e.target.closest('[data-soc-open]'); if (o){ $('#socModal').hidden = true; const w = o.dataset.socOpen === 'me' ? ME : +o.dataset.socOpen; profTab = 'posts'; openFullProfile(w); return; }
  if (e.target.closest('[data-fdf]')) setTimeout(() => { if (!$('#socModal').hidden) socRender(false); }, 0);
  if (e.target === $('#socModal') || e.target.closest('#socModal .x')) $('#socModal').hidden = true;
});
let socQT = null;
document.addEventListener('input', e => { if (e.target.id === 'socQ'){ clearTimeout(socQT); const v = e.target.value; socQT = setTimeout(() => socSearch(v), 180); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#socModal') && !$('#socModal').hidden) $('#socModal').hidden = true; });
