/* ---------- leaderboards: you and all 682,925 bots, in 11 categories ---------- */
function myTotals(){
  const wk = startOfWeek(new Date()).getTime(), m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
  const byDay = {}; let total = 0, week = 0, month = 0, maxSess = 0;
  LOG.forEach(s => { total += s.min; if (s.t >= wk) week += s.min; if (s.t >= m0.getTime()) month += s.min; maxSess = Math.max(maxSess, s.min); const k = dayKey(s.t); byDay[k] = (byDay[k] || 0) + s.min; });
  const si = streakInfo();
  return {total, week, month, maxSess, maxDay: Math.max(0, ...Object.values(byDay)), days: Object.values(byDay).filter(m => m >= 10).length, cur: si.cur, best: si.best, sessions: LOG.length,
    pts: ACHS.filter(a => ACH.u[a.id]).reduce((n, a) => n + TIERS[a.tier].pts, 0)};
}
const LB = [
  {id:'elo',   name:'Highest Elo',            desc:'Current ranked rating',                 u:'elo', f:F.rating,   me:t => R.mmr},
  {id:'rkw',   name:'Most ranked wins',       desc:'Ranked matches won, all time',          u:'n',   f:null, g:() => rkArrs().w, me:t => R.w},
  {id:'rkp',   name:'Best win rate',          desc:'Ranked win rate · at least 20 rated games', u:'pct', f:null, g:() => rkArrs().p, me:t => myWinP10()},
  {id:'hours', name:'Most hours studied',     desc:'All-time study time',                   u:'min', f:F.total,    me:t => t.total},
  {id:'week',  name:'Hours this week',        desc:'Since Sunday · resets every week',      u:'min', f:F.week,     me:t => t.week},
  {id:'month', name:'Hours this month',       desc:'Since the 1st · resets every month',    u:'min', f:F.month,    me:t => t.month},
  {id:'cur',   name:'Current streak',         desc:'Days in a row with 10+ minutes, still going', u:'d', f:F.cur, me:t => t.cur},
  {id:'best',  name:'Best streak ever',       desc:'Longest run of days in a row',          u:'d',   f:F.best,     me:t => t.best},
  {id:'days',  name:'Most days studied',      desc:'Days with 10+ minutes, all time',       u:'d',   f:F.days,     me:t => t.days},
  {id:'sess',  name:'Longest single session', desc:'The longest one sitting',               u:'min', f:F.maxSess,  me:t => t.maxSess},
  {id:'day',   name:'Biggest single day',     desc:'Most study time in one day',            u:'min', f:F.maxDay,   me:t => t.maxDay},
  {id:'count', name:'Most sessions',          desc:'Focus sessions logged, all time',       u:'n',   f:F.sessions, me:t => t.sessions},
  {id:'elw',   name:'Elimination wins',       desc:'Elimination lobbies won', u:'n', f:null, g:() => elArrs().w, me:t => (R.el && R.el.wins) || 0},
  {id:'el3',   name:'Elimination top 3',      desc:'Elimination lobbies finished in the top 3', u:'n', f:null, g:() => elArrs().t, me:t => (R.el && R.el.top3) || 0},
  {id:'lvl',   name:'Highest level',          desc:'Level from XP: studying, daily goals, ranked wins, challenges and achievements', u:'xp', f:null, g:() => lvArrs().xp, me:t => myXp()},
  {id:'pts',   name:'Achievement points',     desc:'Points from unlocked achievements',     u:'pts', f:null,       me:t => t.pts}
];
const lbFmt = (u, v) => u === 'min' ? (v >= 60 ? `${Math.floor(v / 60).toLocaleString()}h ${v % 60}m` : `${v}m`) : u === 'd' ? `${v.toLocaleString()} day${v === 1 ? '' : 's'}` : u === 'pts' ? `${v.toLocaleString()} pts` : u === 'pct' ? (v ? (v / 10).toFixed(1) + '%' : '–') : u === 'xp' ? `Lv ${lvOf(v)} · ${v.toLocaleString()} XP` : v.toLocaleString();
const botVal = (c, i) => c.g ? c.g()[i] : c.f == null ? (lbPts ? lbPts[i] : 0) : BS[i * BF + c.f];
const lbReady = c => c.f != null || !!c.g || !!lbPts;
/* ranked wins and win rate for everyone, from each player's real win/loss record (RK_EW/RK_EL estimated, RK_LW/RK_LL counted live, in ranked.js) */
let RKA = null;
function rkArrs(){
  rkCounts();
  if (RKA && RKA.v === botsVer && RKA.src === RK_EW) return RKA;
  const N = ROSTER_N, w = new Int32Array(N), p = new Int16Array(N);
  const fill = i => { const g = rkGames(i); w[i] = rkWins(i); p[i] = g >= 20 ? Math.max(1, Math.round(w[i] / g * 1000)) : 0; };
  if (RK_EW){
    for (let i = 0; i < N; i++) fill(i);
    // the players at the top of either board get their visible history put in exactly (a few passes until it settles)
    for (let pass = 0; pass < 4; pass++){
      let changed = 0;
      for (const arr of [p, w]){
        const top = []; for (let i = 0; i < N; i++){ const v = arr[i]; if (top.length < 150 || v > top[top.length - 1][0]){ top.push([v, i]); top.sort((a, b) => b[0] - a[0]); if (top.length > 150) top.pop(); } }
        top.forEach(([, i]) => { if (rkReconcile(i)){ fill(i); changed++; } });
      }
      if (!changed) break;
    }
  }
  return (RKA = {v: botsVer, src: RK_EW, w, p});
}
const myGames = () => R.w + R.l + R.d;
const myWinP10 = () => myGames() >= 20 ? Math.round(R.w / myGames() * 1000) : 0;
const winPct = (w, g) => g ? (Math.round(w / g * 1000) / 10).toFixed(1) + '%' : '–';
// the board only ever shows the top 50 and the few players around you, so instead of sorting all 682,925 players,
// one pass picks those out and counts how many are ahead of you (ties: Elo, then bot number). Cached until the world changes.
const lbSel = {};
function lbPick50(c, me, n){
  const key = `${c.id}|${botsVer}|${c.f == null ? (lbPts ? 1 : 0) : ''}|${me}|${R.mmr}|${n}`; if (lbSel[c.id] && lbSel[c.id].key === key) return lbSel[c.id];
  const top = [], tv = [], above = [], below = [], AB = 5, BE = 6; let mine = 0;
  const better = (v1, e1, i1, v2, e2, i2) => v1 > v2 || (v1 === v2 && (e1 > e2 || (e1 === e2 && i1 < i2)));
  const put = (arr, i, v, e, keep, bestFirst) => {      // a small list kept in rank order (best first), trimmed to keep
    let k = arr.length; arr.push([i, v, e]);
    while (k > 0 && better(v, e, i, arr[k - 1][1], arr[k - 1][2], arr[k - 1][0])){ arr[k] = arr[k - 1]; k--; }
    arr[k] = [i, v, e]; if (arr.length > keep){ if (bestFirst) arr.pop(); else arr.shift(); }
  };
  for (let i = 0; i < ROSTER_N; i++){
    const v = botVal(c, i), e = BS[i * BF];
    if (top.length < n || better(v, e, i, top[top.length - 1][1], top[top.length - 1][2], top[top.length - 1][0])) put(top, i, v, e, n, true);
    if (v > me || (v === me && e > R.mmr)){ mine++; if (above.length < AB || !better(v, e, i, above[0][1], above[0][2], above[0][0])) put(above, i, v, e, AB, false); }
    else if (below.length < BE || better(v, e, i, below[below.length - 1][1], below[below.length - 1][2], below[below.length - 1][0])) put(below, i, v, e, BE, true);
  }
  return (lbSel[c.id] = {key, top: top.map(x => x[0]), above: above.map(x => x[0]), below: below.map(x => x[0]), mine});
}
function lbRanking(c, t){
  const me = c.me(t), S = lbPick50(c, me, Math.max(lbShown, 1)), mine = S.mine;
  const at = k => k === mine ? ROSTER_N : k < mine ? (k < S.top.length && k < mine - S.above.length ? S.top[k] : S.above[k - (mine - S.above.length)]) : (k - mine - 1 < S.below.length ? S.below[k - mine - 1] : S.top[k - 1]);
  const val = k => k === ROSTER_N ? me : botVal(c, k);
  return {at, mine, val, me};
}
const lbAhead = (c, me) => lbPick50(c, me, Math.max(lbShown, 1)).mine;
// your place in every category at once: one pass over everyone instead of one per category
let lbPlaces = null;
function myPlace(c, t){
  const mes = LB.map(x => x.me(t)), key = `${botsVer}|${lbPts ? 1 : 0}|${R.mmr}|${mes.join(',')}`;
  if (!lbPlaces || lbPlaces.key !== key){
    const n = new Int32Array(LB.length), fs = LB.map(x => x.f), gs = LB.map(x => x.g ? x.g() : null), mm = R.mmr;
    for (let i = 0; i < ROSTER_N; i++){ const o = i * BF, e = BS[o];
      for (let k = 0; k < fs.length; k++){ const v = gs[k] ? gs[k][i] : fs[k] == null ? (lbPts ? lbPts[i] : 0) : BS[o + fs[k]], me = mes[k]; if (v > me || (v === me && e > mm)) n[k]++; } }
    lbPlaces = {key, n};
  }
  return lbPlaces.n[LB.indexOf(c)] + 1;
}
const topPct = place => { const p = place / (ROSTER_N + 1) * 100; return p < 1 ? 'top 1%' : `top ${Math.ceil(p)}%`; };
let lbShown = 10, lbJump = false;
function lbRow(k, place, c, val){
  const medal = place <= 3 ? ` m${place}` : '';
  if (k === ROSTER_N){
    const rk = myRk();
    return `<li class="lb-row me${medal}${rk.i === PARAGON_I ? ' para-row' : ''}" data-me tabindex="0"><span class="pl">${place.toLocaleString()}</span>${myAvatar('sm')}<span class="who"><b>${esc(myName())}</b><small>${emblem(rk, 'xs')} ${rk.full}</small></span><span class="val">${lbFmt(c.u, val(k))}</span></li>`;
  }
  const B = BOTS[k], r = BS[k * BF], rk = rkOf(k);
  return `<li class="lb-row${medal}${rk.i === PARAGON_I ? ' para-row' : ''}" data-bot="${k}" tabindex="0"><span class="pl">${place.toLocaleString()}</span>${avatar(B, 'sm')}<span class="who"><b>${esc(B.name)}</b><small>${emblem(rk, 'xs')} ${rk.full} · ${B.style}</small></span><span class="val">${lbFmt(c.u, val(k))}</span></li>`;
}
function renderLeaders(){
  if (!$('#lbList')) return;
  if (!RK_READY){ $('#lbList').innerHTML = `<li class="lb-wait">Loading ${(ROSTER_N + 1).toLocaleString()} players…</li>`; return; }
  const c = LB.find(x => x.id === P.lbCat) || LB[0], t = myTotals();
  $('#lbCats').innerHTML = LB.map(x => `<button data-v="${x.id}" aria-pressed="${x.id === c.id}">${x.name}</button>`).join('');
  $('#lbTitle').textContent = c.name; $('#lbDesc').textContent = c.desc;
  const tm = x => new Date(x).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
  if (!lbReady(c)){ $('#lbList').innerHTML = '<li class="lb-wait">Adding up everyone\'s achievement points…</li>'; ensureBotPoints(() => { if (!$('#page-leaders').hidden) renderLeaders(); }); }
  else {
    const {at, val, mine} = lbRanking(c, t);
    let from = 0, to = lbShown;
    if (lbJump){ from = Math.max(0, mine - 5); to = Math.min(ROSTER_N + 1, mine + 6); }
    let h = '';
    if (lbJump && from > 0) h += lbRow(at(0), 1, c, val) + '<li class="lb-gap">⋯</li>';
    for (let k = from; k < to; k++) h += lbRow(at(k), k + 1, c, val);
    if (!lbJump && mine >= to) h += '<li class="lb-gap">⋯</li>' + lbRow(ROSTER_N, mine + 1, c, val).replace('class="lb-row me', 'class="lb-row me pinned');
    $('#lbList').innerHTML = h;
    $('#lbYou').innerHTML = `You're <b>#${(mine + 1).toLocaleString()}</b> of ${(ROSTER_N + 1).toLocaleString()} · ${topPct(mine + 1)} · ${lbFmt(c.u, val(ROSTER_N))}`;
    $('#lbMore').hidden = lbJump || lbShown >= 50;
    $('#lbJump').textContent = lbJump ? 'Back to the top' : 'Jump to me';
  }
  // your place in every category
  $('#lbMine').innerHTML = LB.map(x => {
    const ready = lbReady(x), place = ready ? myPlace(x, t) : null;
    return `<li><button class="${x.id === c.id ? 'on' : ''}" data-v="${x.id}"><span class="nm">${x.name}</span><span class="mv2">${lbFmt(x.u, x.me(t))}</span><span class="pl2">${place ? `#${place.toLocaleString()} · ${topPct(place)}` : '…'}</span></button></li>`;
  }).join('');
}
function lbPick(e){ const b = e.target.closest('[data-v]'); if (!b) return; P.lbCat = b.dataset.v; saveP(); lbShown = 10; lbJump = false; renderLeaders(); }
$('#lbCats').onclick = lbPick; $('#lbMine').onclick = lbPick;
$('#lbMore').onclick = () => { lbShown = lbShown < 25 ? 25 : 50; renderLeaders(); };
$('#lbJump').onclick = () => { lbJump = !lbJump; renderLeaders(); };
$('#lbList').addEventListener('click', e => { const r = e.target.closest('[data-bot]'); if (r && !e.target.closest('.bdg')) openBot(+r.dataset.bot); });
$('#lbList').addEventListener('keydown', e => { if (e.key === 'Enter'){ const r = e.target.closest('[data-bot]'); if (r) openBot(+r.dataset.bot); } });


// everyone else's Elimination record: a share of their study days, more for players who sit longer than others near them
let ELA = null;
function elArrs(){
  if (ELA && ELA.v === botsVer) return ELA;
  const N = ROSTER_N, w = new Int32Array(N), t = new Int32Array(N);
  for (let i = 0; i < N; i++){
    const o = i * BF, days = BS[o + F.days], h = (Math.imul(i ^ 0x2545f491, 2654435761) >>> 0) / 4294967296;
    const play = days * (.05 + h * .25), edge = clampN(.5 + ((typeof T_SIT !== 'undefined' && T_SIT ? T_SIT[i] : 1) - 1) * 2.5, .15, .9);
    t[i] = Math.round(play * .35 * edge * 1.6); w[i] = Math.round(t[i] * (.22 + .2 * edge));
  }
  return (ELA = {v: botsVer, w, t});
}
