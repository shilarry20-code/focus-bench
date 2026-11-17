/* ---------- leaderboards: you and all 249,999 bots, in 11 categories ---------- */
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
  {id:'hours', name:'Most hours studied',     desc:'All-time study time',                   u:'min', f:F.total,    me:t => t.total},
  {id:'week',  name:'Hours this week',        desc:'Since Sunday · resets every week',      u:'min', f:F.week,     me:t => t.week},
  {id:'month', name:'Hours this month',       desc:'Since the 1st · resets every month',    u:'min', f:F.month,    me:t => t.month},
  {id:'cur',   name:'Current streak',         desc:'Days in a row with 10+ minutes, still going', u:'d', f:F.cur, me:t => t.cur},
  {id:'best',  name:'Best streak ever',       desc:'Longest run of days in a row',          u:'d',   f:F.best,     me:t => t.best},
  {id:'days',  name:'Most days studied',      desc:'Days with 10+ minutes, all time',       u:'d',   f:F.days,     me:t => t.days},
  {id:'sess',  name:'Longest single session', desc:'The longest one sitting',               u:'min', f:F.maxSess,  me:t => t.maxSess},
  {id:'day',   name:'Biggest single day',     desc:'Most study time in one day',            u:'min', f:F.maxDay,   me:t => t.maxDay},
  {id:'count', name:'Most sessions',          desc:'Focus sessions logged, all time',       u:'n',   f:F.sessions, me:t => t.sessions},
  {id:'pts',   name:'Achievement points',     desc:'Points from unlocked achievements',     u:'pts', f:null,       me:t => t.pts}
];
const lbFmt = (u, v) => u === 'min' ? (v >= 60 ? `${Math.floor(v / 60).toLocaleString()}h ${v % 60}m` : `${v}m`) : u === 'd' ? `${v.toLocaleString()} day${v === 1 ? '' : 's'}` : u === 'pts' ? `${v.toLocaleString()} pts` : v.toLocaleString();
const botVal = (c, i) => c.f == null ? (lbPts ? lbPts[i] : 0) : BS[i * BF + c.f];
// each category's bots sorted best first, kept until the bots next change (a native typed-array sort
// on one packed number per bot: value, then Elo, then bot number)
const lbOrders = {};
function lbOrder(c){
  const hit = lbOrders[c.id]; if (hit && hit.ver === botsVer && (c.f != null || hit.pts === lbPts)) return hit.order;
  const keys = new Float64Array(ROSTER_N), SH = 262144;
  for (let i = 0; i < ROSTER_N; i++){ const v = clampN(botVal(c, i), 0, 4e6), e = clampN(BS[i * BF], 0, 8191); keys[i] = -((v * 8192 + e) * SH) + i; }
  keys.sort();
  const order = new Int32Array(ROSTER_N); for (let k = 0; k < ROSTER_N; k++) order[k] = ((keys[k] % SH) + SH) % SH;
  lbOrders[c.id] = {ver: botsVer, pts: lbPts, order}; return order;
}
const lbAhead = (c, me) => { let n = 0; for (let i = 0; i < ROSTER_N; i++){ const v = botVal(c, i); if (v > me || (v === me && BS[i * BF] > R.mmr)) n++; } return n; };
function lbRanking(c, t){
  const me = c.me(t), order = lbOrder(c), mine = lbAhead(c, me);
  const at = k => k < mine ? order[k] : k === mine ? ROSTER_N : order[k - 1];
  const val = k => k === ROSTER_N ? me : botVal(c, k);
  return {at, mine, val, me};
}
const myPlace = (c, t) => lbAhead(c, c.me(t)) + 1;
const topPct = place => { const p = place / (ROSTER_N + 1) * 100; return p < 1 ? 'top 1%' : `top ${Math.ceil(p)}%`; };
let lbShown = 10, lbJump = false;
function lbRow(k, place, c, val){
  const medal = place <= 3 ? ` m${place}` : '';
  if (k === ROSTER_N){
    const rk = myRk();
    return `<li class="lb-row me${medal}${rk.i === PARAGON_I ? ' para-row' : ''}" data-me tabindex="0"><span class="pl">${place.toLocaleString()}</span>${myAvatar('sm')}<span class="who"><b>${esc(myName())}</b><small>${emblem(rk, 'xs')} ${rk.full}</small></span><span class="val">${lbFmt(c.u, val(k))}</span></li>`;
  }
  const B = BOTS[k], r = BS[k * BF], rk = rkOf(k);
  return `<li class="lb-row${medal}${rk.i === PARAGON_I ? ' para-row' : ''}" data-bot="${k}" tabindex="0"><span class="pl">${place.toLocaleString()}</span>${avatar(B, 'sm')}<span class="who"><b>${esc(B.name)} <i class="bot-tag">bot</i></b><small>${emblem(rk, 'xs')} ${rk.full} · ${B.style}</small></span><span class="val">${lbFmt(c.u, val(k))}</span></li>`;
}
function renderLeaders(){
  if (!$('#lbList')) return;
  if (!RK_READY){ $('#lbList').innerHTML = '<li class="lb-wait">Loading 250,000 players…</li>'; return; }
  const c = LB.find(x => x.id === P.lbCat) || LB[0], t = myTotals();
  $('#lbCats').innerHTML = LB.map(x => `<button data-v="${x.id}" aria-pressed="${x.id === c.id}">${x.name}</button>`).join('');
  $('#lbTitle').textContent = c.name; $('#lbDesc').textContent = c.desc;
  const tm = x => new Date(x).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
  if (c.f == null && !lbPts){ $('#lbList').innerHTML = '<li class="lb-wait">Adding up everyone\'s achievement points…</li>'; ensureBotPoints(() => { if (!$('#page-leaders').hidden) renderLeaders(); }); }
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
    const ready = x.f != null || lbPts, place = ready ? myPlace(x, t) : null;
    return `<li><button class="${x.id === c.id ? 'on' : ''}" data-v="${x.id}"><span class="nm">${x.name}</span><span class="mv2">${lbFmt(x.u, x.me(t))}</span><span class="pl2">${place ? `#${place.toLocaleString()} · ${topPct(place)}` : '…'}</span></button></li>`;
  }).join('');
}
function lbPick(e){ const b = e.target.closest('[data-v]'); if (!b) return; P.lbCat = b.dataset.v; saveP(); lbShown = 10; lbJump = false; renderLeaders(); }
$('#lbCats').onclick = lbPick; $('#lbMine').onclick = lbPick;
$('#lbMore').onclick = () => { lbShown = lbShown < 25 ? 25 : 50; renderLeaders(); };
$('#lbJump').onclick = () => { lbJump = !lbJump; renderLeaders(); };
$('#lbList').addEventListener('click', e => { const r = e.target.closest('[data-bot]'); if (r && !e.target.closest('.bdg')) openBot(+r.dataset.bot); });
$('#lbList').addEventListener('keydown', e => { if (e.key === 'Enter'){ const r = e.target.closest('[data-bot]'); if (r) openBot(+r.dataset.bot); } });

