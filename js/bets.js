/* ---------- Markets (Kalshi-style) ----------
   Its own page. Every market is a Yes/No question priced from 1 to 99 coins; a contract pays 100 coins if you're right
   and nothing if you're wrong, so the price reads as the percent chance. Sell any time before it settles.
   Markets come in events (one question with several answers, like "Who will win the tournament?"). Categories:
   Tournament now; Ranked, Elimination, Leaderboards and You come next.
   Chances never look at anyone's own study history (real people change their habits). They use only what's on the board:
   ratings, minutes so far today, and how much of a typical study day is left (one fixed day-curve, the same for everyone).
   A player's expected day comes from their rank band and rating. Buy prices sit 2 coins above the chance, sell 2 below.
   Trading on a round closes at 11 PM; a market closes early only when its answer can no longer change. You can't trade
   against yourself: anything about you can only be bought on your side, and while you're still in a bracket you can't
   trade on how the rest of it goes for the players who could meet you.
   Positions live in the coin store (CO.bets) and sync with it. */

const BT_MAX = 5000, BT_SPREAD = 2, BT_CLOSE = 23 * 60, BT_SIMS = 1200;
const BT_BAND_DAY = [110, 160, 220];
const BT_W = [5, 3, 1, 1, 1, 1, 1, 2, 3, 5, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 6, 5];
const BT_WS = BT_W.reduce((a, b) => a + b, 0);
function btLeft(at){ if (at == null) return 1; const h = Math.floor(at / 60), part = 1 - (at % 60) / 60; let s = BT_W[h] * part; for (let i = h + 1; i < 24; i++) s += BT_W[i]; return s / BT_WS; }
const btPhi = x => { const t = 1 / (1 + .3275911 * Math.abs(x) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x / 2); return x >= 0 ? (1 + y) / 2 : (1 - y) / 2; };
const btClamp = p => Math.min(.995, Math.max(.005, p));
const btBets = () => { if (!CO.bets || typeof CO.bets !== 'object') CO.bets = {}; return CO.bets; };
function btNet(){ let n = 0; Object.values(btBets()).forEach(b => { n += (b.pay || 0) - (b.cost || 0); }); return n; }
const btNowMin = now => { const d = new Date(now); return d.getHours() * 60 + d.getMinutes(); };
const btWeek = now => tnSignupWeek(now) || tnWeekOf(now);
function btEntry(wk, band, div){
  const own = tnEntry(wk);
  if (own && own.band === band && ((own.div || 0) === (div || 0) || !own.div)) return own;
  return tnDivEntry(wk, band, div || tnDefDiv(wk, band));
}
function btRound(e, now){ const today = dayKey(now); for (let k = 0; k < 5; k++) if (tnDayKey(e.wk, k) >= today) return k; return null; }
const tnBandMid = band => { const [lo, hi] = tnBandRange(band); return lo > -1e8 && hi < 1e8 ? (lo + hi) / 2 : lo > -1e8 ? lo + 300 : hi - 300; };

/* ---- the one model: a player's minutes still to come today ---- */
const btDay = (e, p) => BT_BAND_DAY[e.band] * Math.pow(2, (p.r - tnBandMid(e.band)) / 800);
function btDist(e, p, at){ const fr = btLeft(at), D = btDay(e, p); return {mu: D * fr, sd: Math.max(6, .75 * D * fr), L: at == null ? 1440 : 1440 - at}; }
const btGE = (d, x) => x <= 0 ? 1 : x > d.L ? 0 : 1 - btPhi((x - d.mu) / d.sd);            // P(still to come >= x)
const btPair = (da, db) => ({mu: da.mu - db.mu, sd: Math.sqrt(da.sd * da.sd + db.sd * db.sd)});

/* ---- many tournaments played out from where this one stands (winner, reaching rounds, today's top studier, upsets) ---- */
const btSimCache = new Map();
function btSim(e, B, now, N = BT_SIMS){
  const key = `${e.wk}|${e.band}|${e.div || 0}|${Math.floor(now / 300000)}|${N}`; if (btSimCache.has(key)) return btSimCache.get(key);
  if (btSimCache.size > 60) btSimCache.clear();
  const today = dayKey(now), nm = btNowMin(now), rnd = mulberry32(fdHash(key));
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const draw = (p, cur, at) => { const d = btDist(e, p, at); return cur + Math.round(Math.min(d.L, Math.max(0, d.mu + d.sd * gauss()))); };
  let kLive = -1; for (let k = 0; k < 5; k++) if (tnDayKey(e.wk, k) === today) kLive = k;
  const inc = (m, w) => m.set(w, (m.get(w) || 0) + 1);
  const res = {N, champ: new Map(), reach: [new Map(), new Map(), new Map(), new Map(), new Map()], top: new Map(), ups: new Array(17).fill(0)};
  for (let s = 0; s < N; s++){
    let cur = null;
    for (let k = 0; k < 5; k++){
      const ms = B.rounds[k], next = []; let ups = 0, best = null, bestM = -1;
      for (let i = 0; i < ms.length; i++){
        const m = ms[i], a = k ? cur[2 * i] : m.a, b = k ? cur[2 * i + 1] : m.b;
        if (a) inc(res.reach[k], a.w); if (b) inc(res.reach[k], b.w);
        if (!a || !b){ next.push(a || b || null); continue; }
        const same = m.a && m.b && m.a.w === a.w && m.b.w === b.w;
        if (same && (m.st === 'done' || m.st === 'bye')){ next.push(m.win); continue; }
        const live = k === kLive && same && m.st === 'live';
        const fa = draw(a, live ? m.ma || 0 : 0, live ? nm : null), fb = draw(b, live ? m.mb || 0 : 0, live ? nm : null), w = tnDecide(a, b, fa, fb);
        next.push(w);
        if (k === kLive){ if (w.seed > (w === a ? b : a).seed) ups++; [[a, fa], [b, fb]].forEach(([p, f]) => { if (f > bestM || (f === bestM && p.seed < best.seed)){ best = p; bestM = f; } }); }
      }
      if (k === kLive){ res.ups[Math.min(16, ups)]++; if (best) inc(res.top, best.w); }
      cur = next;
    }
    if (cur[0]) inc(res.champ, cur[0].w);
  }
  btSimCache.set(key, res); return res;
}

/* ---- markets ----
   q: {mk, wk, band, div, k, a, b, w, T, M, r, N}. Yes means:
     match  a beats b on day k            min    w studies T+ minutes on day k        out    w wins the tournament
     reach  w plays in round r            margin w beats their opponent by M+ min     total  a and b together study T+ min
     ff     w forfeits (under 10 min)     top    w studies the most of anyone on day k (ties: higher seed)
     ups    N or more upsets on day k     h2h    a studies more than b on day k (ties: higher seed) */
const BT_ROUNDS_REACH = {2: 'Quarterfinals', 3: 'Semifinals', 4: 'Final'};
function btCtx(q, now){ const e = btEntry(q.wk, q.band, q.div); if (!e) return null; const B = tnBracket(e, now); return {e, B, now, nm: btNowMin(now), today: dayKey(now)}; }
const btFindM = (B, k, f) => B.rounds[k] && B.rounds[k].find(m => m.a && m.b && f(m));
const btPlayer = (B, w) => B.ps.find(p => p.w === w);
const btCurMin = (c, k, w) => tnDayKey(c.e.wk, k) > c.today ? 0 : tnMin(c.e, w, k, c.now);
// {p} chance of Yes, or {done: true|false} when the answer is in, or {closed} when it can't be traded
function btPrice(q, now){
  const c = btCtx(q, now); if (!c) return {closed: 'Not found'};
  const {e} = c, close = q.k != null ? (tnDayKey(e.wk, q.k) === c.today && c.nm >= BT_CLOSE) : (tnDayKey(e.wk, 4) === c.today && c.nm >= BT_CLOSE);
  let r = btEval(q, c);
  if (r.done == null && close) r = {...r, closed: 'Closed at 11 PM'};
  if (r.done != null) r.closed = 'Answer is in';
  return r;
}
function btEval(q, c){
  const {e, B} = c;
  switch (q.mk){
    case 'out': { if (B.champ) return {done: B.champ.w === q.w}; if (btGone(B, q.w)) return {done: false}; const S = btSim(e, B, c.now); return {p: btClamp((S.champ.get(q.w) || 0) / S.N)}; }
    case 'reach': { if (B.rounds[q.r].some(m => m.a && m.a.w === q.w || m.b && m.b.w === q.w)) return {done: true}; if (btGone(B, q.w)) return {done: false}; const S = btSim(e, B, c.now); return {p: btClamp((S.reach[q.r].get(q.w) || 0) / S.N)}; }
    case 'ups': case 'top': {
      const dk = tnDayKey(e.wk, q.k); if (dk < c.today) return {done: q.mk === 'ups' ? btUpsets(B, q.k) >= q.N : btTopOf(B, q.k) === q.w};
      const S = btSim(e, B, c.now);
      if (q.mk === 'top') return {p: btClamp((S.top.get(q.w) || 0) / S.N)};
      let n = 0; for (let i = q.N; i < S.ups.length; i++) n += S.ups[i]; return {p: btClamp(n / S.N)};
    }
  }
  // the rest are about one match, or one or two players, on one day
  const dk = tnDayKey(e.wk, q.k), at = dk === c.today ? c.nm : null, done = dk < c.today;
  const side = (p, cur) => ({p, cur: done || at != null ? cur || 0 : 0, d: btDist(e, p, at)});
  if (q.mk === 'h2h'){
    const pa = btPlayer(B, q.a), pb = btPlayer(B, q.b); if (!pa || !pb) return {closed: 'Not available'};
    const A = side(pa, btCurMin(c, q.k, q.a)), Bq = side(pb, btCurMin(c, q.k, q.b)), rule = (x, y, fx, fy) => fx > fy ? x : fy > fx ? y : x.seed < y.seed ? x : y;
    if (done) return {done: rule(pa, pb, A.cur, Bq.cur) === pa};
    if (at != null){ if (rule(pa, pb, A.cur, Bq.cur + A.d.L) === pa) return {done: true}; if (rule(pa, pb, A.cur + A.d.L, Bq.cur) === pb) return {done: false}; }
    const D = btPair(A.d, Bq.d); return {p: btClamp(btPhi((A.cur - Bq.cur + D.mu) / D.sd))};
  }
  const m = q.mk === 'match' || q.mk === 'total' ? btFindM(B, q.k, x => x.a.w === q.a && x.b.w === q.b) : btFindM(B, q.k, x => x.a.w === q.w || x.b.w === q.w);
  if (!m || m.st === 'bye') return {closed: 'Not available'};
  if (q.mk === 'match'){
    const A = side(m.a, m.ma), Bq = side(m.b, m.mb);
    if (done) return {done: tnDecide(m.a, m.b, A.cur, Bq.cur) === m.a};
    if (at != null){ if (tnDecide(m.a, m.b, A.cur, Bq.cur + A.d.L) === m.a) return {done: true}; if (tnDecide(m.a, m.b, A.cur + A.d.L, Bq.cur) === m.b) return {done: false}; }
    const D = btPair(A.d, Bq.d); return {p: btClamp(btPhi((A.cur - Bq.cur + D.mu) / D.sd))};
  }
  if (q.mk === 'total'){
    const A = side(m.a, m.ma), Bq = side(m.b, m.mb), cur = A.cur + Bq.cur; if (cur >= q.T) return {done: true}; if (done || cur + 2 * A.d.L < q.T) return {done: false};
    return {p: btClamp(1 - btPhi((q.T - cur - A.d.mu - Bq.d.mu) / Math.sqrt(A.d.sd ** 2 + Bq.d.sd ** 2)))};
  }
  const mine = m.a.w === q.w, P = side(mine ? m.a : m.b, mine ? m.ma : m.mb), O = side(mine ? m.b : m.a, mine ? m.mb : m.ma);
  if (q.mk === 'min'){ if (P.cur >= q.T) return {done: true}; if (done || P.cur + P.d.L < q.T) return {done: false}; return {p: btClamp(btGE(P.d, q.T - P.cur))}; }
  if (q.mk === 'ff'){ if (P.cur >= 10) return {done: false}; if (done || P.cur + P.d.L < 10) return {done: true}; return {p: btClamp(1 - btGE(P.d, 10 - P.cur))}; }
  if (q.mk === 'margin'){
    const lead = P.cur - O.cur;
    if (done) return {done: tnDecide(P.p, O.p, P.cur, O.cur) === P.p && lead >= q.M};
    if (lead - O.d.L >= q.M) return {done: true}; if (lead + P.d.L < q.M) return {done: false};
    const D = btPair(P.d, O.d); return {p: btClamp(1 - btPhi((q.M - lead - D.mu) / D.sd))};
  }
  return {closed: 'Unknown'};
}
const btGone = (B, w) => B.rounds.some(ms => ms.some(m => m.st === 'done' && m.win && m.a && m.b && (m.a.w === w || m.b.w === w) && m.win.w !== w));
function btUpsets(B, k){ let n = 0; B.rounds[k].forEach(m => { if (m.a && m.b && m.st === 'done' && m.win){ const l = m.win === m.a ? m.b : m.a; if (m.win.seed > l.seed) n++; } }); return n; }
function btTopOf(B, k){ let best = null, bm = -1; B.rounds[k].forEach(m => { if (!m.a || !m.b || m.st === 'bye') return; [[m.a, m.ma], [m.b, m.mb]].forEach(([p, f]) => { if (f > bm || (f === bm && p.seed < best.seed)){ best = p; bm = f; } }); }); return best ? best.w : null; }
const btBuy = p => Math.min(99, Math.max(1, Math.round(p * 100) + BT_SPREAD));
const btSell = p => Math.min(99, Math.max(0, Math.round(p * 100) - BT_SPREAD));

/* ---- words ---- */
const btName = w => w === ME ? 'You' : bot(w).name;
function btTitle(q){
  const d = TN_DAYS[q.k];
  switch (q.mk){
    case 'match': return `${btName(q.a)} vs ${btName(q.b)}`;
    case 'out': return `${btName(q.w)} wins the tournament`;
    case 'reach': return `${btName(q.w)} reaches the ${BT_ROUNDS_REACH[q.r]}`;
    case 'min': return `${btName(q.w)}: ${q.T}+ minutes on ${d}`;
    case 'margin': return `${btName(q.w)} wins by ${q.M}+ minutes`;
    case 'total': return `${btName(q.a)} + ${btName(q.b)}: ${q.T}+ minutes together`;
    case 'ff': return `${btName(q.w)} forfeits on ${d}`;
    case 'top': return `${btName(q.w)} studies the most on ${d}`;
    case 'ups': return `${q.N}+ upsets on ${d}`;
    case 'h2h': return `${btName(q.a)} studies more than ${btName(q.b)} on ${d}`;
  }
  return '';
}
function btRules(q){
  const d = TN_DAYS[q.k], day = `on ${d} (Focus minutes, midnight to midnight)`, early = ' It settles early the moment the answer can’t change. Trading closes at 11 PM.';
  switch (q.mk){
    case 'match': return `Yes if ${btName(q.a)} beats ${btName(q.b)} ${day}. Under 10 minutes is a forfeit; a tie or a double forfeit goes to the higher seed.${early}`;
    case 'out': return `Yes if ${btName(q.w)} wins Friday’s final. Settles No as soon as they’re knocked out.`;
    case 'reach': return `Yes as soon as ${btName(q.w)} has a match in the ${BT_ROUNDS_REACH[q.r]}. Settles No if they’re knocked out first.`;
    case 'min': return `Yes if ${btName(q.w)} has ${q.T} or more minutes ${day}.${early}`;
    case 'margin': return `Yes if ${btName(q.w)} wins their match ${day} with at least ${q.M} more minutes than their opponent.${early}`;
    case 'total': return `Yes if ${btName(q.a)} and ${btName(q.b)} have ${q.T} or more minutes between them ${day}.${early}`;
    case 'ff': return `Yes if ${btName(q.w)} ends the day with under 10 minutes ${day}.${early}`;
    case 'top': return `Yes if ${btName(q.w)} has the most minutes of everyone playing ${day}. A tie goes to the higher seed. Trading closes at 11 PM.`;
    case 'ups': return `Yes if ${q.N} or more matches ${day} are won by the lower seed. Trading closes at 11 PM.`;
    case 'h2h': return `Yes if ${btName(q.a)} has more minutes than ${btName(q.b)} ${day}. They aren’t playing each other; a tie goes to the higher seed.${early}`;
  }
  return '';
}

/* ---- you can't trade against yourself ---- */
function btBlocked(q, side, B){
  const yes = side === 'y';
  if (q.w === ME || q.a === ME || q.b === ME){
    if (q.mk === 'match' || q.mk === 'h2h') return yes === (q.a === ME) ? null : 'You can’t bet against yourself';
    if (q.mk === 'ff') return yes ? 'You can’t bet on yourself forfeiting' : null;
    return yes ? null : 'You can only back yourself';
  }
  if (!B || !B.me || B.outIn != null || B.place) return null;
  if (['out', 'reach', 'top', 'ups'].includes(q.mk)) return 'Not while you’re still in this bracket';
  const m = q.k != null ? btFindM(B, q.k, x => x.a.w === ME || x.b.w === ME) : null, opp = m ? (m.a.w === ME ? m.b.w : m.a.w) : null;
  if (opp != null && (q.w === opp || q.a === opp || q.b === opp)) return 'Not on your opponent';
  return null;
}

/* ---- trading and settling ---- */
function btTrade(q, side, coins, seen){
  const now = Date.now(), r = btPrice(q, now);
  if (r.closed) return {err: `This market is closed (${r.closed.toLowerCase()}).`};
  const c = btCtx(q, now), why = btBlocked(q, side, c && c.B); if (why) return {err: why};
  const price = side === 'y' ? btBuy(r.p) : btBuy(1 - r.p);
  if (seen && seen !== price) return {moved: price};
  coins = Math.floor(+coins || 0);
  if (coins > BT_MAX) return {err: `The most you can spend at once is ${BT_MAX.toLocaleString()} coins.`};
  const n = Math.floor(coins / price); if (n < 1) return {err: `One contract costs ${price} coins.`};
  const cost = n * price, bal = coTotals().balance; if (cost > bal) return {err: `You only have ${bal.toLocaleString()} coins.`};
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  btBets()[id] = {id, t: now, ...q, side, n, price, cost, st: 'open', pay: 0};
  saveCo(); if (typeof coRender === 'function') coRender();
  return {ok: id, n, cost};
}
function btSellPos(id){
  const b = btBets()[id]; if (!b || b.st !== 'open') return {err: 'That position is already settled.'};
  const r = btPrice(b, Date.now()); if (r.closed || r.p == null) return {err: 'This market can’t be sold right now.'};
  b.st = 'sold'; b.pay = b.n * (b.side === 'y' ? btSell(r.p) : btSell(1 - r.p)); b.ts = Date.now();
  saveCo(); if (typeof coRender === 'function') coRender(); return {ok: b.pay};
}
function btSettle(now = Date.now()){
  let won = 0, changed = false;
  Object.values(btBets()).forEach(b => {
    if (b.st !== 'open') return;
    let r; try { r = btPrice(b, now); } catch(_){ return; }
    if (r.closed === 'Not available' && b.k != null && tnDayKey(b.wk, b.k) < dayKey(now)){ b.st = 'void'; b.pay = b.cost; changed = true; return; }
    if (r.done == null) return;
    const right = (b.side === 'y') === r.done; b.st = right ? 'won' : 'lost'; b.pay = right ? b.n * 100 : 0; b.ts = now; changed = true; if (right) won += b.pay;
  });
  if (changed){ saveCo(); if (typeof coRender === 'function') coRender(); if (typeof mkRender === 'function' && !document.hidden) mkRender(); }
  if (won){ if (typeof coPop === 'function') coPop(won); toast(`A market settled your way · +${won.toLocaleString()} coins`); }
  return changed;
}

/* ---- icons ---- */
const MK_IC = {
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  trophy: '<path d="M7 4h10v4.5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4M12 13.5V17M8.5 20h7M10 17h4"/>',
  vs: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5L13 3h3v3l-3.5 3.5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', ruler: '<path d="M3 17l14-14 4 4L7 21z"/><path d="M8 12l2 2M11 9l2 2M14 6l2 2"/>',
  sum: '<path d="M18 5H6l6 7-6 7h12"/>', off: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>', wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 18l-6-6 6-6"/>', out: '<path d="M14 4h6v6M20 4l-9 9M10 6H5v13h13v-5"/>', undo: '<path d="M4 10h11a5 5 0 0 1 0 10h-3M4 10l4-4M4 10l4 4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
};
const mkIc = (k, cls = '') => `<svg class="mk-ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MK_IC[k] || ''}</svg>`;
const MK_KIND_IC = {match: 'vs', out: 'trophy', reach: 'flag', min: 'clock', margin: 'ruler', total: 'sum', ff: 'off', top: 'star', ups: 'bolt', h2h: 'swap'};

/* ---- events: the questions on the board ---- */
// each event: {id, cat, ic, title, sub, closes, two, rows: [{q, label, av, side}], more}; a 'two' event is one market shown as its two answers
function mkTourneyEvents(now){
  const v = btView(now); let e; try { e = btEntry(v.wk, v.band, v.div); } catch(_){ return []; } if (!e) return [];
  const B = tnBracket(e, now), k = btRound(e, now); if (k == null) return [];
  const base = {wk: e.wk, band: e.band, div: e.div || v.div || 0}, today = dayKey(now);
  const close = d => { const x = new Date(tnDayKey(e.wk, d) + 'T00:00'); x.setMinutes(BT_CLOSE); return x.getTime(); };
  const tag = `${TN_ROUNDS[k]}${tnDayKey(e.wk, k) === today ? ' · live' : ' · ' + TN_DAYS[k]}`, ev = [], id = s => `t|${e.wk}|${e.band}|${base.div}|${s}`;
  const ms = B.rounds[k].filter(m => m.a && m.b && m.st !== 'bye'), ps = []; ms.forEach(m => ps.push(m.a, m.b));
  const av = w => tnAv(w);
  ms.forEach(m => {
    const q = {...base, mk: 'match', k, a: m.a.w, b: m.b.w};
    ev.push({id: id('m' + m.a.w + '_' + m.b.w), ic: 'vs', title: `${btName(m.a.w)} vs ${btName(m.b.w)}`, sub: `${tag} · seeds ${m.a.seed} and ${m.b.seed}`, closes: close(k), two: true,
      rows: [{q, label: btName(m.a.w), av: av(m.a.w), side: 'y'}, {q, label: btName(m.b.w), av: av(m.b.w), side: 'n'}],
      more: [...[30, 60, 90].flatMap(M => [m.a, m.b].map(p => ({q: {...base, mk: 'margin', k, w: p.w, M}, label: `${btName(p.w)} wins by ${M}+`, av: av(p.w)}))),
        ...[120, 180, 240, 300, 360].map(T => ({q: {...base, mk: 'total', k, a: m.a.w, b: m.b.w, T}, label: `${T}+ minutes together`}))]});
  });
  ev.push({id: id('win'), ic: 'trophy', title: 'Who will win the tournament?', sub: `${TN_BANDS[e.band][2]} · ${tnRange(e.wk)}`, closes: close(4), rows: btAlive(B).map(p => ({q: {...base, mk: 'out', w: p.w}, label: btName(p.w), av: av(p.w)}))});
  [4, 3, 2].filter(r => r > k).forEach(r => ev.push({id: id('r' + r), ic: 'flag', title: `Who will reach the ${BT_ROUNDS_REACH[r]}?`, sub: TN_BANDS[e.band][2], closes: close(r - 1), rows: btAlive(B).map(p => ({q: {...base, mk: 'reach', r, w: p.w}, label: btName(p.w), av: av(p.w)}))}));
  ev.push({id: id('top' + k), ic: 'star', title: `Who will study the most on ${TN_DAYS[k]}?`, sub: tag, closes: close(k), rows: ps.map(p => ({q: {...base, mk: 'top', k, w: p.w}, label: btName(p.w), av: av(p.w)}))});
  ev.push({id: id('ups' + k), ic: 'bolt', title: `How many upsets on ${TN_DAYS[k]}?`, sub: `${tag} · the lower seed winning`, closes: close(k), rows: [1, 2, 3, 4, 6, 8].filter(n => n <= ms.length).map(N => ({q: {...base, mk: 'ups', k, N}, label: `${N}+ upset${N === 1 ? '' : 's'}`}))});
  ev.push({id: id('ff' + k), ic: 'off', title: `Who will forfeit on ${TN_DAYS[k]}?`, sub: `${tag} · under 10 minutes`, closes: close(k), rows: ps.map(p => ({q: {...base, mk: 'ff', k, w: p.w}, label: btName(p.w), av: av(p.w)}))});
  ps.forEach(p => ev.push({id: id('min' + p.w), ic: 'clock', title: `How many minutes will ${btName(p.w)} study on ${TN_DAYS[k]}?`, sub: tag, closes: close(k), rows: [30, 60, 90, 120, 180, 240, 300, 360].map(T => ({q: {...base, mk: 'min', k, w: p.w, T}, label: `${T}+ minutes`}))}));
  for (let i = 0; i + 1 < ms.length; i += 2){ const x = ms[i].a.seed < ms[i].b.seed ? ms[i].a : ms[i].b, y = ms[i + 1].a.seed < ms[i + 1].b.seed ? ms[i + 1].a : ms[i + 1].b, q = {...base, mk: 'h2h', k, a: x.w, b: y.w};
    ev.push({id: id('h' + x.w + '_' + y.w), ic: 'swap', title: `${btName(x.w)} or ${btName(y.w)}: who studies more?`, sub: `${tag} · not playing each other`, closes: close(k), two: true, rows: [{q, label: btName(x.w), av: av(x.w), side: 'y'}, {q, label: btName(y.w), av: av(y.w), side: 'n'}]}); }
  ev.forEach(x => { x.cat = 'tour'; });
  return ev;
}
const btAlive = B => { const gone = new Set(); B.rounds.forEach(ms => ms.forEach(m => { if (m.st === 'done' && m.win && m.a && m.b) gone.add((m.win === m.a ? m.b : m.a).w); })); return B.ps.filter(p => !gone.has(p.w)); };
const MK_CATS = [['trend', 'Trending', 'trend'], ['soon', 'Ending soon', 'clock'], ['tour', 'Tournament', 'trophy'], ['pos', 'Portfolio', 'wallet']];
function mkEvents(now){ return mkTourneyEvents(now); }

/* ---- the Markets page ---- */
const BT = {band: null, div: null};
const MK = {cat: 'trend', view: null, sel: null, pick: null, coins: 100, msg: '', q: '', more: false};
let MK_SNAP = store.get('fb.mksnap', {day: '', p: {}});
function btView(now){
  const wk = btWeek(now), own = tnEntry(wk), band = BT.band != null ? BT.band : own ? own.band : tnMyBand();
  return {wk, band, div: BT.div != null ? BT.div : own && own.band === band ? own.div || 0 : tnDefDiv(wk, band)};
}
const btKey = q => [q.mk, q.wk, q.band, q.div, q.k, q.a, q.b, q.w, q.T, q.M, q.r, q.N].join('|');
// how far a chance has moved since you first saw it today (kept on this device)
function mkMove(key, p){
  const day = dayKey(Date.now()); if (MK_SNAP.day !== day) MK_SNAP = {day, p: {}};
  if (MK_SNAP.p[key] == null){ MK_SNAP.p[key] = p; clearTimeout(mkMove.t); mkMove.t = setTimeout(() => store.set('fb.mksnap', MK_SNAP), 500); return 0; }
  return Math.round((p - MK_SNAP.p[key]) * 100);
}
const mkPct = p => { const n = Math.round(p * 100); return n < 1 ? '<1%' : n > 99 ? '>99%' : n + '%'; };
const mkMoveHtml = d => d ? `<i class="mk-mv ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</i>` : '';
const mkClock = t => { const d = new Date(t); return dayKey(Date.now()) === dayKey(t) ? d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}) : d.toLocaleDateString([], {weekday: 'short'}) + ' ' + d.toLocaleTimeString([], {hour: 'numeric'}); };
const mkRowKey = row => btKey(row.q) + (row.side || '');
function mkRowPrice(row, now){
  const r = btPrice(row.q, now), c = btCtx(row.q, now);
  return {r, yp: r.p != null ? (row.side === 'n' ? 1 - r.p : r.p) : null, B: c && c.B};
}
function mkBuyBtn(row, btnSide, info, evId){
  // a two-answer event buys each answer's own side; a normal row has Yes and No
  const q = row.q, s = row.side ? row.side : btnSide, p = info.r.p != null ? (s === 'y' ? info.r.p : 1 - info.r.p) : null;
  const why = btBlocked(q, s, info.B), cls = row.side ? 'yes' : btnSide === 'y' ? 'yes' : 'no', ic = row.side || btnSide === 'y' ? 'check' : 'x';
  const on = MK.pick && MK.pick.key === btKey(q) && MK.pick.side === s, label = row.side ? 'Buy' : btnSide === 'y' ? 'Yes' : 'No';
  if (info.r.closed || why || p == null) return `<button class="mk-buy ${cls}" disabled title="${esc(why || info.r.closed || '')}">${mkIc(ic)}${label}<b>–</b></button>`;
  return `<button class="mk-buy ${cls}${on ? ' on' : ''}" data-mk="pick" data-ev="${esc(evId)}" data-q='${esc(JSON.stringify(q))}' data-side="${s}">${mkIc(ic)}${label}<b>${btBuy(p)}¢</b></button>`;
}
function mkLine(ev, row, now, big){
  const info = mkRowPrice(row, now), mv = info.yp != null ? mkMove(mkRowKey(row), info.yp) : 0;
  const pct = info.yp != null ? mkPct(info.yp) : info.r.done != null ? (info.r.done === (row.side !== 'n') ? 'Yes' : 'No') : '–';
  const lab = big ? `<button class="mk-rl" data-mk="sel" data-k="${esc(mkRowKey(row))}">${row.av || ''}<span>${esc(row.label)}</span></button>` : `<span class="mk-rl">${row.av || ''}<span>${esc(row.label)}</span></span>`;
  return `<li class="${big && mkRowKey(row) === MK.sel ? 'sel' : ''}">${lab}<span class="mk-pct">${pct}${mkMoveHtml(mv)}</span><span class="mk-bb">${mkBuyBtn(row, 'y', info, ev.id)}${row.side ? '' : mkBuyBtn(row, 'n', info, ev.id)}</span></li>`;
}
function mkCardHtml(ev, now){
  const rows = ev.two ? ev.rows : ev.rows.map(row => ({row, info: mkRowPrice(row, now)})).filter(x => x.info.r.p != null).sort((a, b) => b.info.yp - a.info.yp).slice(0, 3).map(x => x.row);
  const n = (ev.two ? 1 : ev.rows.length) + (ev.more ? ev.more.length : 0);
  return `<div class="mk-card" data-mk="open" data-ev="${esc(ev.id)}" role="button" tabindex="0"><div class="mk-ct"><span class="mk-cic">${mkIc(ev.ic)}</span><span class="mk-cat">${esc(ev.sub)}</span></div>
    <b class="mk-title">${esc(ev.title)}</b><ul class="mk-rows">${rows.map(row => mkLine(ev, row, now, false)).join('') || '<li class="hint">Nothing left to trade here.</li>'}</ul>
    <div class="mk-cf"><span>${mkIc('clock')}Closes ${mkClock(ev.closes)}</span><span>${n} market${n === 1 ? '' : 's'}</span></div></div>`;
}
function mkSpark(pts){
  if (pts.length < 2) return '<p class="hint mk-nochart">The chart fills in as the day goes on.</p>';
  const W = 600, H = 170, x = i => (i / (pts.length - 1) * W).toFixed(1), y = p => (H - 6 - p * (H - 12)).toFixed(1);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(p)).join(''), last = pts[pts.length - 1];
  return `<div class="mk-chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 ${y(.5)}H${W}" class="mid"/><path d="${d}L${W} ${H}L0 ${H}Z" class="area"/><path d="${d}" class="ln"/></svg>
    <span class="mk-ax"><span>12 AM</span><span>now · ${mkPct(last)}</span></span></div>`;
}
// the chance through today, one point an hour, from the same model fed the board as it stood then
function mkHistory(q, side, now){
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0); const pts = [], nm = btNowMin(now);
  for (let h = 0; h * 60 < nm; h++){ let r; try { r = btPrice(q, d0.getTime() + h * 3600000 + 60000); } catch(_){ continue; } if (r.p != null) pts.push(side === 'n' ? 1 - r.p : r.p); }
  const r = btPrice(q, now); if (r.p != null) pts.push(side === 'n' ? 1 - r.p : r.p);
  return pts;
}
function mkTicketHtml(){
  const pk = MK.pick; if (!pk) return `<div class="mk-ticket empty">${mkIc('grid')}<p>Pick an answer to buy it here.</p></div>`;
  const r = btPrice(pk.q, Date.now()); if (r.closed || r.p == null) return `<div class="mk-ticket empty"><p>That market just closed.</p></div>`;
  const price = pk.side === 'y' ? btBuy(r.p) : btBuy(1 - r.p), coins = Math.max(0, Math.floor(+MK.coins || 0)), n = Math.floor(coins / price);
  const two = pk.q.mk === 'match' || pk.q.mk === 'h2h', what = two ? btName(pk.side === 'y' ? pk.q.a : pk.q.b) : pk.side === 'y' ? 'Yes' : 'No';
  return `<form class="mk-ticket"><div class="mk-tt">${mkIc(pk.side === 'y' || two ? 'check' : 'x', pk.side === 'y' || two ? 'yes' : 'no')}<span>Buy <b>${esc(what)}</b><small>${esc(btTitle(pk.q))}</small></span></div>
    <div class="mk-tp"><span>Price</span><b>${price}¢</b></div>
    <label class="mk-tc"><span>Coins</span><input type="number" min="${price}" max="${BT_MAX}" step="1" value="${coins || ''}" inputmode="numeric" data-mk="coins"></label>
    <span class="mk-quick">${[100, 500, 1000, 5000].map(v => `<button type="button" class="small-btn" data-mk="amt" data-v="${v}">${v.toLocaleString()}</button>`).join('')}</span>
    <div class="mk-tsum" data-mk-sum><span><span>Contracts</span><b>${n.toLocaleString()}</b></span><span><span>Cost</span><b>${(n * price).toLocaleString()}</b></span><span><span>Pays if right</span><b class="win">${(n * 100).toLocaleString()}</b></span></div>
    <button class="btn primary mk-go" data-price="${price}">${mkIc('check')}Buy ${esc(what)}</button><button type="button" class="small-btn" data-mk="cancel">Cancel</button>
    ${MK.msg ? `<p class="mk-msg">${esc(MK.msg)}</p>` : ''}<p class="hint">Up to ${BT_MAX.toLocaleString()} coins a trade. Each contract pays 100 coins if you’re right.</p></form>`;
}
function mkDetailHtml(ev, now){
  const all = ev.rows.concat(MK.more && ev.more ? ev.more : []);
  const sel = all.find(r => mkRowKey(r) === MK.sel) || all[0]; MK.sel = mkRowKey(sel);
  return `<div class="mk-detail"><div class="mk-main"><button class="small-btn mk-back" data-mk="back">${mkIc('back')}All markets</button>
    <div class="mk-dh"><span class="mk-cic lg">${mkIc(ev.ic)}</span><div><small>${esc(ev.sub)}</small><h2>${esc(ev.title)}</h2><small class="mk-cl">${mkIc('clock')}Closes ${mkClock(ev.closes)}</small></div></div>
    <div class="card mk-dchart"><div class="mk-sl">${sel.av || ''}<b>${esc(sel.label)}</b><small>chance today</small></div>${mkSpark(mkHistory(sel.q, sel.side || 'y', now))}</div>
    <ul class="mk-rows big">${all.map(row => mkLine(ev, row, now, true)).join('')}</ul>
    ${ev.more && ev.more.length ? `<button class="small-btn mk-moreb" data-mk="more">${mkIc('grid')}${MK.more ? 'Fewer markets' : `More on this match: margins and totals (${ev.more.length})`}</button>` : ''}
    <div class="card mk-rules"><b>Rules</b><p>${esc(btRules(sel.q))}</p><p class="hint">Chances use only ratings, minutes so far today and how much of the day is left, never anyone’s study history.</p></div></div>
    <aside class="mk-side">${mkTicketHtml()}</aside></div>`;
}
function mkPortfolioHtml(now){
  const all = Object.values(btBets()).sort((a, b) => b.t - a.t), open = all.filter(b => b.st === 'open'), done = all.filter(b => b.st !== 'open').slice(0, 40);
  const net = all.filter(b => b.st !== 'open').reduce((n, b) => n + (b.pay || 0) - (b.cost || 0), 0);
  let value = 0;
  const row = b => {
    let right;
    if (b.st === 'open'){ const r = btPrice(b, now), each = r.p != null && !r.closed ? (b.side === 'y' ? btSell(r.p) : btSell(1 - r.p)) : null; if (each != null) value += b.n * each;
      right = `<span class="mk-pv">${each != null ? `<b>${(b.n * each).toLocaleString()}</b><small>value now</small>` : '<small>settling</small>'}</span>${each != null ? `<button class="small-btn" data-mk="sell" data-id="${b.id}">${mkIc('out')}Sell</button>` : ''}`; }
    else right = `<i class="mk-st ${b.st}">${mkIc(b.st === 'won' ? 'check' : b.st === 'lost' ? 'x' : b.st === 'sold' ? 'out' : 'undo')}${b.st === 'won' ? `Won ${b.pay.toLocaleString()}` : b.st === 'sold' ? `Sold ${b.pay.toLocaleString()}` : b.st === 'void' ? 'Refunded' : 'Lost'}</i>`;
    const what = b.mk === 'match' || b.mk === 'h2h' ? btName(b.side === 'y' ? b.a : b.b) : b.side === 'y' ? 'Yes' : 'No';
    return `<li class="mk-pos"><span class="mk-cic">${mkIc(MK_KIND_IC[b.mk] || 'grid')}</span><span class="mk-pt"><b>${esc(what)}</b> · ${esc(btTitle(b))}<small>${b.n.toLocaleString()} at ${b.price}¢ · cost ${b.cost.toLocaleString()} · pays ${(b.n * 100).toLocaleString()}</small></span>${right}</li>`;
  };
  const openH = open.map(row).join(''), doneH = done.map(row).join('');
  return `<div class="mk-pf"><div class="mk-pfs"><span>${mkIc('wallet')}<b>${coTotals().balance.toLocaleString()}</b><small>coins to spend</small></span><span>${mkIc('grid')}<b>${value.toLocaleString()}</b><small>open positions are worth</small></span><span>${mkIc('trend')}<b class="${net >= 0 ? 'win' : 'lose'}">${net >= 0 ? '+' : ''}${net.toLocaleString()}</b><small>won or lost on settled markets</small></span></div>
    ${open.length ? `<div class="mk-sh">Open · ${open.length}</div><ul class="mk-list">${openH}</ul>` : ''}${done.length ? `<div class="mk-sh">Settled</div><ul class="mk-list">${doneH}</ul>` : ''}
    ${all.length ? '' : `<div class="mk-empty">${mkIc('wallet')}<p>No positions yet. Buy an answer on any market.</p></div>`}</div>`;
}
function mkRender(){
  const box = $('#mkBody'); if (!box || $('#page-markets').hidden) return;
  if (typeof RK_READY === 'undefined' || !RK_READY){ if (!box.firstChild) box.innerHTML = '<p class="hint">Loading markets…</p>'; return; }
  const now = Date.now(); let evs = []; try { evs = mkEvents(now); } catch(err){ console.error('markets', err); }
  const bal = coTotals().balance, nOpen = Object.values(btBets()).filter(b => b.st === 'open').length;
  let html = `<div class="mk-top"><div class="mk-h1"><span class="mk-cic lg">${mkIc('trend')}</span><div><b>Trade Yes or No on what happens next</b><small>Each contract pays 100 coins if you’re right. Sell any time before it settles.</small></div></div>
    <span class="mk-bal"><svg class="co-ic" viewBox="0 0 24 24" aria-hidden="true">${CO_IC}</svg>${bal.toLocaleString()}</span></div>
    <div class="mk-bar"><div class="mk-cats" role="tablist">${MK_CATS.map(([k, l, ic]) => `<button data-mk="cat" data-v="${k}" aria-selected="${MK.cat === k && !MK.view}">${mkIc(ic)}${l}${k === 'pos' && nOpen ? ` <i class="mk-n">${nOpen}</i>` : ''}</button>`).join('')}</div>
      <label class="mk-search">${mkIc('search')}<input type="search" placeholder="Search players or questions" value="${esc(MK.q)}" data-mk="search"></label></div>`;
  if (MK.view){ const ev = evs.find(x => x.id === MK.view); if (ev){ domMorph(box, html + mkDetailHtml(ev, now)); return; } MK.view = null; }
  if (MK.cat === 'pos'){ domMorph(box, html + mkPortfolioHtml(now)); return; }
  let list = evs;
  if (MK.q){ const s = MK.q.toLowerCase(); list = list.filter(ev => (ev.title + ' ' + ev.rows.map(r => r.label).join(' ')).toLowerCase().includes(s)); }
  const score = ev => ev.rows.reduce((n, r) => { const i = mkRowPrice(r, now); return Math.max(n, i.yp != null ? Math.abs(mkMove(mkRowKey(r), i.yp)) + (i.yp > .15 && i.yp < .85 ? 3 : 0) + (ev.two ? 2 : 0) : 0); }, 0);
  if (MK.cat === 'soon') list = list.slice().sort((a, b) => a.closes - b.closes);
  else if (MK.cat === 'trend') list = list.map(ev => [ev, score(ev)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const v = btView(now), own = tnEntry(v.wk);
  if (MK.cat === 'tour') html += `<div class="mk-where">${mkIc('trophy')}<span>Bracket</span>${TN_BANDS.map((b, i) => `<button class="chip${i === v.band ? ' on' : ''}" data-mk="band" data-v="${i}">${esc(b[2])}</button>`).join('')}
      <form class="mk-divf"><label>Division <input type="number" min="1" max="${tnDivCount(v.band, v.wk)}" value="${v.div || ''}" inputmode="numeric"></label><button class="small-btn">Go</button>${own ? '<button type="button" class="small-btn" data-mk="mine">Mine</button>' : ''}</form></div>`;
  const shown = MK.cat === 'tour' ? list : list.slice(0, 24);
  html += shown.length ? `<div class="mk-grid">${shown.map(ev => mkCardHtml(ev, now)).join('')}</div>` : `<div class="mk-empty">${mkIc('grid')}<p>${MK.q ? 'No markets match that.' : 'No markets open right now. Tournament rounds run Monday to Friday, and Monday’s opens on the weekend.'}</p></div>`;
  html += `<p class="hint mk-foot">Ranked, Elimination, Leaderboards and You markets are coming next. Chances use only ratings, minutes so far today and how much of the day is left.</p>`;
  domMorph(box, html);
}
// the Tournament page links here
function btCardHtml(){ return `<div class="card mk-promo"><span class="mk-cic lg">${mkIc('trend')}</span><div><b>Markets on this tournament</b><small>Trade Yes or No on matches, minutes, upsets and who wins it all.</small></div><button class="btn primary sm" data-mk-go="tour">Open Markets</button></div>`; }

document.addEventListener('click', ev => {
  const go = ev.target.closest && ev.target.closest('[data-mk-go]'); if (go){ ev.preventDefault(); MK.cat = go.dataset.mkGo; MK.view = null; showPage('markets'); return; }
  const a = ev.target.closest && ev.target.closest('[data-mk]'); if (!a || !a.closest('#mkBody')) return;
  const k = a.dataset.mk; if (k === 'coins' || k === 'search') return;
  ev.preventDefault();
  if (k === 'cat'){ MK.cat = a.dataset.v; MK.view = null; MK.pick = null; }
  else if (k === 'open'){ MK.view = a.dataset.ev; MK.sel = null; MK.more = false; MK.pick = null; window.scrollTo(0, 0); }
  else if (k === 'back'){ MK.view = null; MK.pick = null; }
  else if (k === 'sel') MK.sel = a.dataset.k;
  else if (k === 'more') MK.more = !MK.more;
  else if (k === 'pick'){ const q = JSON.parse(a.dataset.q), key = btKey(q), side = a.dataset.side, two = q.mk === 'match' || q.mk === 'h2h';
    if (MK.view !== a.dataset.ev){ MK.view = a.dataset.ev; MK.more = false; window.scrollTo(0, 0); }
    MK.sel = key + (two ? side : ''); MK.pick = MK.pick && MK.pick.key === key && MK.pick.side === side ? null : {key, side, q}; MK.msg = ''; }
  else if (k === 'amt') MK.coins = +a.dataset.v;
  else if (k === 'cancel'){ MK.pick = null; MK.msg = ''; }
  else if (k === 'sell'){ const r = btSellPos(a.dataset.id); toast(r.err || `Sold for ${r.ok.toLocaleString()} coins`); }
  else if (k === 'band'){ BT.band = +a.dataset.v; BT.div = null; }
  else if (k === 'mine'){ BT.band = null; BT.div = null; }
  mkRender();
});
document.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('.mk-card')){ ev.preventDefault(); ev.target.click(); } });
document.addEventListener('input', ev => {
  const s = ev.target.closest && ev.target.closest('[data-mk="search"]'); if (s){ MK.q = s.value; clearTimeout(mkRender.t); mkRender.t = setTimeout(() => { mkRender(); const i = $('#mkBody [data-mk="search"]'); if (i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); return; }
  const i = ev.target.closest && ev.target.closest('[data-mk="coins"]'); if (!i || !MK.pick) return;
  MK.coins = Math.floor(+i.value || 0); const r = btPrice(MK.pick.q, Date.now()); if (r.p == null) return;
  const price = MK.pick.side === 'y' ? btBuy(r.p) : btBuy(1 - r.p), n = Math.floor(MK.coins / price), bs = document.querySelectorAll('[data-mk-sum] b');
  if (bs.length === 3){ bs[0].textContent = n.toLocaleString(); bs[1].textContent = (n * price).toLocaleString(); bs[2].textContent = (n * 100).toLocaleString(); }
});
document.addEventListener('submit', ev => {
  const f = ev.target.closest && ev.target.closest('#mkBody form'); if (!f) return;
  ev.preventDefault();
  if (f.classList.contains('mk-divf')){ const n = Math.floor(+f.querySelector('input').value || 0), v = btView(Date.now()); if (n >= 1 && n <= tnDivCount(v.band, v.wk)){ BT.div = n; BT.band = v.band; } mkRender(); return; }
  if (!MK.pick) return;
  const r = btTrade(MK.pick.q, MK.pick.side, MK.coins, +f.querySelector('[data-price]').dataset.price);
  if (r.moved) MK.msg = `The price moved to ${r.moved}¢. Press Buy again to take it.`;
  else if (r.err) MK.msg = r.err;
  else { toast(`Bought ${r.n.toLocaleString()} contract${r.n === 1 ? '' : 's'} for ${r.cost.toLocaleString()} coins`); MK.pick = null; MK.msg = ''; }
  mkRender();
});
{ const _s = onPageShown; onPageShown = function(name){ const x = _s.apply(this, arguments); if (name === 'markets'){ try { btSettle(); } catch(e){ console.error(e); } mkRender(); } return x; }; }
setInterval(() => { if (typeof RK_READY === 'undefined' || !RK_READY || document.hidden) return; try { btSettle(); } catch(e){ console.error('markets', e); } const pg = $('#page-markets'); if (pg && !pg.hidden && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#mkBody form, .mk-search'))) mkRender(); }, 60000);
(function btStart(){ if (typeof RK_READY === 'undefined' || !RK_READY) return setTimeout(btStart, 3000); try { btSettle(); } catch(e){ console.error('markets', e); } })();
