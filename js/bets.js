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

const BT_CLOSE = 23 * 60, BT_SIMS = 1200;
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
function btCtx(q, now){ if (MKX.has(q.mk)) return null; const e = btEntry(q.wk, q.band, q.div); if (!e) return null; const B = tnBracket(e, now); return {e, B, now, nm: btNowMin(now), today: dayKey(now)}; }
const btFindM = (B, k, f) => B.rounds[k] && B.rounds[k].find(m => m.a && m.b && f(m));
const btPlayer = (B, w) => B.ps.find(p => p.w === w);
const btCurMin = (c, k, w) => tnDayKey(c.e.wk, k) > c.today ? 0 : tnMin(c.e, w, k, c.now);
// {p} chance of Yes, or {done: true|false} when the answer is in, or {closed} when it can't be traded
function btFair(q, now){
  if (MKX.has(q.mk)){
    let r = mkEvalX(q, now);
    if (r.done != null) return {...r, closed: 'Answer is in'};
    if (r.close && now >= r.close && !r.closed) r = {...r, closed: 'Closed at 11 PM'};
    return r;
  }
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

/* ---- the market: prices come from trading ----
   btFair is what the crowd can see (ratings, minutes so far, time left). The price is where the crowd trades it to:
   a crowd of players trades every market all day, from what they see plus their own mistakes (they overrate long shots,
   chase moves, and drift), slower overnight but never stopping. Their trades come from the market and the time, so
   every device sees the same prices and trades. Your own trades move the price too, through an automated market maker
   (LMSR): buying pushes it up as you buy, so a big trade costs more per contract, and deep markets (today's matches,
   the winner) move less than thin ones. The crowd trades your push back out over a few hours.
   Each contract also has a 1-coin fee, on buying and on selling. */
const BT_FEE = 1, MK_SLOT = 300000, MK_SLOTS = 288;
const mkSp = x => x > 30 ? x : Math.log1p(Math.exp(x));
const mkSig = L => 1 / (1 + Math.exp(-L)), mkLogit = p => Math.log(p / (1 - p));
const MK_DEEP = new Set(['match', 'out', 'top', 'h2h', 'elw', 'lbw']), MK_THIN = new Set(['ff', 'margin', 'total', 'els', 'elsd', 'ymin', 'ywk', 'rkn', 'rkr']);
const mkDepth = q => MK_DEEP.has(q.mk) ? {b: 500, rate: 2.2, vol: .05} : MK_THIN.has(q.mk) ? {b: 110, rate: .5, vol: .08} : {b: 250, rate: 1.1, vol: .06};
const mkAct = t => Math.max(.35, BT_W[new Date(t).getHours()] / 7);       // how busy trading is at that hour (never below 35%)
// the crowd's mood on one market over the last day, and its trades (no names), in 5-minute slots
const MK_FLOW = new Map();
function mkFlow(key, d, now){
  const s1 = Math.floor(now / MK_SLOT), ck = key + '@' + s1; if (MK_FLOW.has(ck)) return MK_FLOW.get(ck);
  if (MK_FLOW.size > 3000) MK_FLOW.clear();
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0); const day0 = d0.getTime();
  let e = 0, vol = 0; const trades = [], es = [];
  for (let s = s1 - MK_SLOTS + 1; s <= s1; s++){
    const t0 = s * MK_SLOT, act = mkAct(t0), rnd = mulberry32(fdHash(key + '#' + s)), g = gaussOf(rnd);
    e = .97 * e + d.vol * Math.sqrt(act) * g; es.push([t0, e]);
    let k = 0; const L = Math.exp(-d.rate * act); let pr = 1; while ((pr *= rnd()) > L && k < 20) k++;
    for (let j = 0; j < k; j++){
      const t = t0 + rnd() * MK_SLOT, yes = rnd() < mkSig(g * 1.5), n = Math.max(1, Math.round(Math.exp(2.2 + .9 * gaussOf(rnd))));
      if (t > now) continue;
      if (t >= day0) vol += n;
      trades.push({t, yes, n, e});
    }
  }
  const res = {e, es, vol, trades: trades.slice(-40)}; MK_FLOW.set(ck, res); return res;
}
// your push on a price (in log-odds), fading as the crowd trades against it
let MK_IMP = store.get('fb.mkimp', {});
function mkImpact(key, now){ const x = MK_IMP[key]; if (!x) return 0; const v = x[0] * Math.exp(-(now - x[1]) / (3 * 3600e3)); if (Math.abs(v) < .002){ delete MK_IMP[key]; return 0; } return v; }
function mkPush(key, dL, now){ MK_IMP[key] = [mkImpact(key, now) + dL, now]; store.set('fb.mkimp', MK_IMP); }
const mkCrowdL = (fair, e) => Math.max(-4.6, Math.min(4.6, .85 * mkLogit(Math.min(.995, Math.max(.005, fair))) + e));
function btPrice(q, now){
  const r = btFair(q, now);
  if (q.mk === 'combo' || r.p == null) return r;
  const key = btKey(q), d = mkDepth(q), f = mkFlow(key, d, now), L = Math.max(-4.6, Math.min(4.6, mkCrowdL(r.p, f.e) + mkImpact(key, now)));
  return {...r, p: mkSig(L), fair: r.p, L, b: d.b, flow: f};
}
// buying or selling n contracts of one side from a price: what it costs or pays, fee included
function mkQuoteR(r, q, side){
  if (r.p == null) return null;
  const p = side === 'y' ? r.p : 1 - r.p;
  if (q.mk === 'combo') return {p, combo: true, buy: n => n * (Math.min(99, Math.max(1, Math.ceil(p * 100))) + BT_FEE), sell: n => n * Math.max(0, Math.floor(p * 100) - BT_FEE), after: () => p};
  const L = side === 'y' ? r.L : -r.L, b = r.b;
  return {p, b, buy: n => Math.ceil(100 * b * (mkSp(L + n / b) - mkSp(L))) + BT_FEE * n, sell: n => Math.max(0, Math.floor(100 * b * (mkSp(L) - mkSp(L - n / b))) - BT_FEE * n), after: n => mkSig(L + n / b)};
}
const mkQuote = (q, side, now) => mkQuoteR(btPrice(q, now), q, side);
function mkMaxN(Q, coins){ if (!Q || Q.buy(1) > coins) return 0; let lo = 1, hi = 2; while (Q.buy(hi) <= coins && hi < 1e7) hi *= 2; while (hi - lo > 1){ const m = (lo + hi) >> 1; if (Q.buy(m) <= coins) lo = m; else hi = m; } return lo; }

/* ---- words ---- */
const btName = w => w === ME ? 'You' : bot(w).name;
function btTitle(q){
  if (MKX.has(q.mk)) return mkTitleX(q);
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
  if (MKX.has(q.mk)) return mkRulesX(q);
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
  if (MKX.has(q.mk)) return mkBlockedX(q, side);
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
  const Q = mkQuoteR(r, q, side), unit = Q.buy(1);
  if (seen && seen !== unit) return {moved: unit};
  coins = Math.floor(+coins || 0);
  const n = mkMaxN(Q, coins); if (n < 1) return {err: `One contract costs ${unit} coins.`};
  const cost = Q.buy(n), bal = coTotals().balance; if (cost > bal) return {err: `You only have ${bal.toLocaleString()} coins.`};
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  btBets()[id] = {id, t: now, ...q, side, n, price: Math.round(cost / n), cost, st: 'open', pay: 0};
  if (!Q.combo) mkPush(btKey(q), (side === 'y' ? 1 : -1) * n / Q.b, now);
  saveCo(); if (typeof coRender === 'function') coRender();
  return {ok: id, n, cost};
}
function btSellPos(id){
  const b = btBets()[id]; if (!b || b.st !== 'open') return {err: 'That position is already settled.'};
  const r = btPrice(b, Date.now()); if (r.closed || r.p == null) return {err: 'This market can’t be sold right now.'};
  const Q = mkQuoteR(r, b, b.side); b.st = 'sold'; b.pay = Q.sell(b.n); b.ts = Date.now();
  if (!Q.combo) mkPush(btKey(b), (b.side === 'y' ? -1 : 1) * b.n / Q.b, b.ts);
  saveCo(); if (typeof coRender === 'function') coRender(); return {ok: b.pay};
}
function btSettle(now = Date.now()){
  let won = 0, changed = false;
  Object.values(btBets()).forEach(b => {
    if (b.st !== 'open') return;
    let r; try { r = btPrice(b, now); } catch(_){ return; }
    if (r.void){ b.st = 'void'; b.pay = b.cost; b.ts = now; changed = true; return; }
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
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>', elim: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M14 14l5 5M19 14l-5 5"/>',
  bars: '<path d="M8 21V11H3v10zM15 21V4h-6v17zM21 21v-7h-6v7z"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
};
const mkIc = (k, cls = '') => `<svg class="mk-ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MK_IC[k] || ''}</svg>`;
const MK_KIND_IC = {match: 'vs', out: 'trophy', reach: 'flag', min: 'clock', margin: 'ruler', total: 'sum', ff: 'off', top: 'star', ups: 'bolt', h2h: 'swap', rkm: 'vs', rkn: 'star', rkr: 'flag', elw: 'elim', els: 'elim', elsd: 'bolt', lbw: 'bars', ymin: 'user', ywk: 'user', combo: 'layers'};

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
const MK_CATS = [['trend', 'Trending', 'trend'], ['soon', 'Ending soon', 'clock'], ['tour', 'Tournament', 'trophy'], ['rank', 'Ranked', 'shield'], ['elim', 'Elimination', 'elim'], ['lb', 'Leaderboards', 'bars'], ['you', 'You', 'user'], ['pos', 'Portfolio', 'wallet']];
function mkEvents(now){ let a = [], b = []; try { a = mkTourneyEvents(now); } catch(e){ console.error('markets', e); } try { b = mkOtherEvents(now); } catch(e){ console.error('markets', e); } return a.concat(b); }

/* ---- more markets: Ranked, Elimination, Leaderboards, You, and combos ----
   Same rule as the tournament: chances come from ratings, what's on the board right now and how much time is left,
   never from anyone's own habits or anything hidden (a bot's planned sitting, an Elimination game worked out ahead).
   Anything about you can only be bought on your side. Kinds:
     rkm  you win your live ranked match (t0, b)            rkn  you win your next N rated matches (aft, N)
     rkr  you reach T Elo by the end of the week (aft, T, until)
     elw  w wins Elimination game g                         els  w is still in when round rd ends (g, w, rd)
     elsd Elimination game g reaches sudden death (g)
     lbw  w has the most minutes this week/month among the players listed (per, pk, w, set)
     ymin you study T+ minutes on day dk                    ywk  you study T+ minutes in the week starting pk
     combo every pick in legs is right */
const MKX = new Set(['rkm', 'rkn', 'rkr', 'elw', 'els', 'elsd', 'lbw', 'ymin', 'ywk', 'combo']);
const MK_SELF = new Set(['rkm', 'rkn', 'rkr', 'ymin', 'ywk']);
const mkDayR = r => Math.min(420, Math.max(40, 160 * Math.pow(2, ((+r || 1000) - 1650) / 800)));     // a typical day by rating
const mkMyNow = () => tnLogMin(dayKey(Date.now()), btNowMin(Date.now())) + (typeof tnLiveMin === 'function' ? tnLiveMin() : 0);
const mkClose = dk => { const x = new Date(dk + 'T00:00'); x.setMinutes(BT_CLOSE); return x.getTime(); };
const mkEndOfWeek = now => { const s = startOfWeek(new Date(now)); s.setDate(s.getDate() + 7); return s.getTime(); };
// minutes still to come over the rest of today plus `days` whole days, for a player with a typical day of D
function mkRest(D, now, days){ const fr = btLeft(btNowMin(now)) + days; return {mu: D * fr, sd: Math.max(6, .75 * D * (fr < 1 ? fr : Math.sqrt(fr)))}; }
const mkSeed = s => mulberry32(fdHash(s));

/* ranked */
function mkRkm(q, now){
  const c = R.cur;
  if (c && c.t0 === q.t0 && c.b === q.b){
    if (c.state === 'done') return {done: c.res === 'W'};
    const them = c.them / 60000, you = c.you / 60000, rnd = mkSeed('rkm' + q.t0 + ':' + Math.floor(now / 60000));
    if (c.youDone && them > you) return {done: false};
    let w = 0; const n = 600;
    for (let s = 0; s < n; s++){
      const T = c.tapped ? them : Math.max(them, typical(q.br || botRating(q.b)) * Math.exp(.35 * gaussOf(rnd)));
      const Y = c.youDone ? you : Math.max(you, typical(R.mmr) * Math.exp(.35 * gaussOf(rnd)));
      if (Y > T) w++;
    }
    return {p: btClamp(w / n)};
  }
  const h = (R.hist || []).find(x => !x.f && x.b === q.b && x.t >= q.t0 && x.t < q.t0 + 864e5);
  if (h) return {done: h.r === 'W'};
  return {void: true};
}
function mkRkn(q){
  const hs = (R.hist || []).filter(x => !x.f && x.t > q.aft).sort((a, b) => a.t - b.t).slice(0, q.N);
  if (hs.some(x => x.r !== 'W')) return {done: false};
  if (hs.length >= q.N) return {done: true};
  if (R.cur && R.cur.state === 'live' && R.cur.t0 <= q.aft) return {closed: 'Wait for your live match to end'};
  return {p: btClamp(Math.pow(.5, q.N - hs.length))};
}
function mkRkr(q, now){
  if (R.mmr >= q.T || (R.hist || []).some(x => !x.f && x.t > q.aft && x.m >= q.T)) return {done: true};
  if (now >= q.until) return {done: false};
  const games = Math.max(.5, 2 * (q.until - now) / 864e5), sd = 24 * Math.sqrt(games);
  return {p: btClamp(2 * (1 - btPhi((q.T - R.mmr) / sd)))};     // reaching a level at any point: twice the chance of ending above it
}

/* Elimination: the top-1,000 games (the same games on every device) */
const elOfId = g => { try { return elTopGame(parseInt(String(g).slice(1), 36)); } catch(_){ return null; } };
const elHaz = a => a <= 0 ? .5 : a < 1 ? .35 : a < 2.5 ? .25 : a < 5 ? .15 : a < 10 ? .09 : .05;
function elFacts(L, now){
  const RL = L.rules.round * 60000, A = elAllow(L.rules), outs = L.players.map(w => [w, elBotPlan(L, w).out]).sort((a, b) => a[1] - b[1]);
  const end = outs.length > 1 ? outs[outs.length - 2][1] : outs[0][1], winner = outs[outs.length - 1][0];
  const sdI = A.findIndex(a => a <= 0);
  return {RL, A, outs, end, winner, over: now >= end, r: Math.max(0, Math.floor((now - L.t0) / RL)), alive: outs.filter(([, o]) => o > now).map(([w]) => w), sdI};
}
const EL_SIMC = new Map();
function elSimOf(L, now){
  const key = L.id + '|' + Math.floor(now / 60000); if (EL_SIMC.has(key)) return EL_SIMC.get(key); if (EL_SIMC.size > 40) EL_SIMC.clear();
  const f = elFacts(L, now), rnd = mkSeed(key), n = 500, win = new Map(), surv = new Map(), mean = f.alive.reduce((s, w) => s + botRating(w), 0) / Math.max(1, f.alive.length);
  const mul = new Map(f.alive.map(w => [w, Math.pow(10, -(botRating(w) - mean) / 900)]));
  let sd = 0; const frac0 = Math.max(.05, (L.t0 + (f.r + 1) * f.RL - now) / f.RL);
  for (let s = 0; s < n; s++){
    let alive = f.alive.slice(), r = f.r;
    if (f.sdI >= 0 && r >= f.sdI && alive.length >= 2) sd++;
    for (let guard = 0; alive.length > 1 && guard < 60; guard++, r++){
      const a = f.A[Math.min(r, f.A.length - 1)], fr = guard ? 1 : frac0;
      if (f.sdI >= 0 && r === f.sdI && guard && alive.length >= 2) sd++;
      const keep = alive.filter(w => rnd() >= 1 - Math.pow(1 - Math.min(.95, elHaz(a) * mul.get(w)), fr));
      const left = keep.length ? keep : [alive[Math.floor(rnd() * alive.length)]];
      left.forEach(w => { const k = w + ':' + (r + 1); surv.set(k, (surv.get(k) || 0) + 1); });
      alive = left;
    }
    if (alive[0] != null){ win.set(alive[0], (win.get(alive[0]) || 0) + 1); for (let rr = r + 1; rr < r + 40; rr++){ const k = alive[0] + ':' + rr; surv.set(k, (surv.get(k) || 0) + 1); } }
  }
  const res = {n, win, surv, sd}; EL_SIMC.set(key, res); return res;
}
function mkEl(q, now){
  const L = elOfId(q.g); if (!L || L.t0 > now) return {closed: 'Not started'};
  if (q.w != null && !L.players.includes(q.w)) return {void: true};
  const f = elFacts(L, now), out = q.w != null ? elBotPlan(L, q.w).out : null;
  if (q.mk === 'elw'){ if (f.over) return {done: f.winner === q.w}; if (out <= now) return {done: false}; return {p: btClamp((elSimOf(L, now).win.get(q.w) || 0) / elSimOf(L, now).n)}; }
  if (q.mk === 'els'){
    const B = L.t0 + q.rd * f.RL;
    if (out <= now) return {done: out >= B || (f.over && f.winner === q.w)};
    if (now >= B || (f.over && f.winner === q.w)) return {done: true};
    const S = elSimOf(L, now); return {p: btClamp((S.surv.get(q.w + ':' + q.rd) || 0) / S.n)};
  }
  if (q.mk === 'elsd'){
    if (f.sdI < 0) return {closed: 'No sudden death'};
    const Bs = L.t0 + f.sdI * f.RL, at = f.outs.filter(([, o]) => o > Bs).length;
    if (now >= Bs || f.over) return {done: at >= 2};
    if (f.alive.length < 2) return {done: false};
    const S = elSimOf(L, now); return {p: btClamp(S.sd / S.n)};
  }
  return {closed: 'Unknown'};
}

/* leaderboards: who studies the most this week or month, among the players at the top now */
function mkPeriodDays(per, pk){
  const out = [], d = new Date(pk.length === 7 ? pk + '-01T12:00' : pk + 'T12:00'), m = d.getMonth();
  for (let i = 0; i < 31; i++){ if (per === 'm' && d.getMonth() !== m) break; if (per === 'w' && i >= 7) break; out.push(dayKey(d)); d.setDate(d.getDate() + 1); }
  return out;
}
function mkPerMin(w, days, now){
  const today = dayKey(now), nm = btNowMin(now); let m = 0;
  for (const dk of days){ if (dk > today) break; const up = dk === today ? nm : null; m += w === ME ? tnLogMin(dk, up) + (dk === today && typeof tnLiveMin === 'function' ? tnLiveMin() : 0) : tnBotMin(w, dk, up); }
  return m;
}
const LBW_C = new Map();
function mkLbw(q, now){
  const days = mkPeriodDays(q.per, q.pk), last = days[days.length - 1], today = dayKey(now);
  const key = q.per + q.pk + q.set.join('.') + '|' + Math.floor(now / 60000);
  let S = LBW_C.get(key);
  if (!S){
    if (LBW_C.size > 20) LBW_C.clear();
    const cur = q.set.map(w => mkPerMin(w, days, now));
    if (today > last){ S = {done: q.set[cur.indexOf(Math.max(...cur))]}; }
    else {
      const left = days.filter(d => d > today).length, rnd = mkSeed(key), n = 800, wins = new Map();
      const ds = q.set.map(w => mkRest(mkDayR(w === ME ? R.mmr : botRating(w)), now, left));
      for (let s = 0; s < n; s++){ let best = -1, bw = null; q.set.forEach((w, i) => { const f = cur[i] + Math.max(0, ds[i].mu + ds[i].sd * gaussOf(rnd)); if (f > best){ best = f; bw = w; } }); wins.set(bw, (wins.get(bw) || 0) + 1); }
      S = {wins, n};
    }
    LBW_C.set(key, S);
  }
  if (S.done !== undefined) return {done: S.done === q.w};
  return {p: btClamp((S.wins.get(q.w) || 0) / S.n), close: mkClose(last)};
}

/* you */
function mkYmin(q, now){
  const today = dayKey(now); if (q.dk < today) return {done: tnLogMin(q.dk) >= q.T};
  const cur = mkMyNow(); if (cur >= q.T) return {done: true};
  const d = mkRest(mkDayR(R.mmr), now, 0); return {p: btClamp(1 - btPhi((q.T - cur - d.mu) / d.sd)), close: mkClose(q.dk)};
}
function mkYwk(q, now){
  const days = mkPeriodDays('w', q.pk), today = dayKey(now), cur = mkPerMin(ME, days, now);
  if (cur >= q.T) return {done: true}; if (today > days[6]) return {done: false};
  const d = mkRest(mkDayR(R.mmr), now, days.filter(x => x > today).length); return {p: btClamp(1 - btPhi((q.T - cur - d.mu) / d.sd)), close: mkClose(days[6])};
}

/* combos: every pick has to be right; the chance is all the picks' chances multiplied */
function mkCombo(q, now){
  let p = 1, open = false;
  for (const l of q.legs){
    const r = btPrice(l.q, now);
    if (r.void) return {void: true};
    if (r.done != null){ if (r.done !== (l.side === 'y')) return {done: false}; continue; }
    if (r.p == null) return {closed: r.closed || 'A pick is closed'};
    open = true; p *= l.side === 'y' ? r.p : 1 - r.p;
    if (r.closed) open = 'closed';
  }
  if (!open) return {done: true};
  return open === 'closed' ? {p: btClamp(p), closed: 'A pick has stopped trading'} : {p: btClamp(p)};
}

function mkEvalX(q, now){
  switch (q.mk){
    case 'rkm': return mkRkm(q, now); case 'rkn': return mkRkn(q, now); case 'rkr': return mkRkr(q, now);
    case 'elw': case 'els': case 'elsd': return mkEl(q, now);
    case 'lbw': return mkLbw(q, now); case 'ymin': return mkYmin(q, now); case 'ywk': return mkYwk(q, now);
    case 'combo': return mkCombo(q, now);
  }
  return {closed: 'Unknown'};
}
const elName = g => { const L = elOfId(g); return L ? L.name : 'an Elimination game'; };
const mkHm = m => m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`;
function mkTitleX(q){
  switch (q.mk){
    case 'rkm': return `You beat ${btName(q.b)} in ranked`;
    case 'rkn': return q.N === 1 ? 'You win your next ranked match' : `You win your next ${q.N} ranked matches`;
    case 'rkr': return `You reach ${q.T.toLocaleString()} Elo (${rankOf(q.T).full}) this week`;
    case 'elw': return `${btName(q.w)} wins ${elName(q.g)}`;
    case 'els': return `${btName(q.w)} survives round ${q.rd} of ${elName(q.g)}`;
    case 'elsd': return `${elName(q.g)} reaches sudden death`;
    case 'lbw': return `${btName(q.w)} studies the most this ${q.per === 'w' ? 'week' : 'month'}`;
    case 'ymin': return `You study ${mkHm(q.T)}+ ${q.dk === dayKey(Date.now()) ? 'today' : 'on ' + new Date(q.dk + 'T12:00').toLocaleDateString([], {weekday: 'long'})}`;
    case 'ywk': return `You study ${mkHm(q.T)}+ this week`;
    case 'combo': return `Combo: ${q.legs.length} picks`;
  }
  return '';
}
function mkRulesX(q){
  switch (q.mk){
    case 'rkm': return `Yes if you win your live ranked match against ${btName(q.b)}. If the match isn’t rated (under 10 minutes), you get your coins back. Only Yes can be bought.`;
    case 'rkn': return `Yes if you win each of your next ${q.N} rated ranked matches, counted from the ones you start after buying. Friendly matches don’t count. Only Yes can be bought.`;
    case 'rkr': return `Yes as soon as your Elo reaches ${q.T.toLocaleString()} before the week ends (Saturday at midnight). Only Yes can be bought.`;
    case 'elw': return `Yes if ${btName(q.w)} is the last player studying in ${elName(q.g)}.`;
    case 'els': return `Yes if ${btName(q.w)} is still in ${elName(q.g)} when round ${q.rd} ends (or wins before then).`;
    case 'elsd': return `Yes if at least two players are still in ${elName(q.g)} when its sudden-death round starts.`;
    case 'lbw': return `Yes if ${btName(q.w)} has the most Focus minutes this ${q.per === 'w' ? 'week (Sunday to Saturday)' : 'month'} of the ${q.set.length} players listed, who were the top ${q.set.length} when the market opened. Trading closes at 11 PM on the last day.`;
    case 'ymin': return `Yes once you have ${mkHm(q.T)} of Focus minutes that day (midnight to midnight). Trading closes at 11 PM. Only Yes can be bought.`;
    case 'ywk': return `Yes once you have ${mkHm(q.T)} of Focus minutes this week (Sunday to Saturday). Trading closes at 11 PM Saturday. Only Yes can be bought.`;
    case 'combo': return `Pays 100 coins only if every pick is right: ${q.legs.map(l => `${btPickWhat(l.q, l.side)} on “${btTitle(l.q)}”`).join('; ')}. If any pick is wrong it settles No; if a pick is cancelled you get your coins back.`;
  }
  return '';
}
function mkBlockedX(q, side){
  if (q.mk === 'combo'){ for (const l of q.legs){ const why = btBlocked(l.q, l.side, (btCtx(l.q, Date.now()) || {}).B); if (why) return why; } return side === 'y' ? null : 'Combos are bought on Yes'; }
  if (MK_SELF.has(q.mk)) return side === 'y' ? null : 'You can only back yourself';
  if (q.mk === 'lbw' && q.set.includes(ME) && q.w !== ME) return 'Not while you’re in this race';
  if (q.mk === 'lbw' && q.w === ME && side !== 'y') return 'You can only back yourself';
  return null;
}
// what a pick reads as: a name for two-sided markets, else Yes or No
function btPickWhat(q, side){ return q.mk === 'match' || q.mk === 'h2h' ? btName(side === 'y' ? q.a : q.b) : side === 'y' ? 'Yes' : 'No'; }

/* the questions on the board */
let LB_TOPC = null;
function mkTopBy(fi, n){
  const key = botsVer + '|' + fi + '|' + dayKey(Date.now()); if (LB_TOPC && LB_TOPC[key]) return LB_TOPC[key];
  const top = []; for (let i = 0; i < ROSTER_N; i++){ const v = BS[i * BF + fi]; if (top.length < n || v > top[top.length - 1][0]){ top.push([v, i]); top.sort((a, b) => b[0] - a[0]); if (top.length > n) top.pop(); } }
  LB_TOPC = {[key]: top.map(x => x[1])}; return LB_TOPC[key];
}
function mkOtherEvents(now){
  const ev = [], today = dayKey(now), av = w => tnAv(w);
  // ranked
  if (R && R.on !== false && !rkUnplaced()){
    const c = R.cur;
    if (c && c.state === 'live' && !c.friendly) ev.push({id: 'rk|cur|' + c.t0, cat: 'rank', ic: 'vs', title: `Will you beat ${btName(c.b)}?`, sub: `Your ranked match · ${rankOf(c.br).full}`, closes: c.t0 + 12 * 3600e3,
      rows: [{q: {mk: 'rkm', t0: c.t0, b: c.b, br: c.br}, label: 'You win', av: av(ME)}]});
    const aft = (R.hist || []).reduce((m, x) => Math.max(m, x.t || 0), 0);
    if (!(c && c.state === 'live')) ev.push({id: 'rk|streak|' + aft, cat: 'rank', ic: 'star', title: 'Win your next ranked matches?', sub: 'Ranked · counts matches you start after buying', closes: now + 7 * 864e5,
      rows: [1, 3, 5].map(N => ({q: {mk: 'rkn', aft, N}, label: N === 1 ? 'Next match' : `Next ${N} in a row`}))});
    const rk = rankOf(R.mmr), until = mkEndOfWeek(now), tg = [];
    if (rk.hi) tg.push(rk.hi); if (RANKS[rk.i + 1] && isFinite(RANKS[rk.i + 1].lo) && !tg.includes(RANKS[rk.i + 1].lo)) tg.push(RANKS[rk.i + 1].lo);
    if (tg.length) ev.push({id: 'rk|rise|' + dayKey(until), cat: 'rank', ic: 'flag', title: 'Will you rank up this week?', sub: `Ranked · you’re ${rk.full} at ${R.mmr.toLocaleString()}`, closes: until,
      rows: tg.map(T => ({q: {mk: 'rkr', aft, T, until}, label: `${rankOf(T).full} (${T.toLocaleString()})`}))});
  }
  // Elimination: the top games running now
  const games = []; for (let k = Math.floor((now - 4 * 3600e3) / 240000); k <= Math.floor(now / 240000); k++){ let L; try { L = elTopGame(k); } catch(_){ continue; } if (L.t0 > now || L.players.length < 3) continue; const f = elFacts(L, now); if (!f.over && f.alive.length >= 2) games.push([L, f]); }
  games.slice(-6).reverse().forEach(([L, f]) => {
    const alive = f.alive, rd = f.r + 1, more = alive.map(w => ({q: {mk: 'els', g: L.id, w, rd}, label: `${btName(w)} survives round ${rd}`, av: av(w)}));
    if (f.sdI >= 0 && f.r < f.sdI) more.push({q: {mk: 'elsd', g: L.id}, label: 'Reaches sudden death'});
    ev.push({id: 'el|' + L.id, cat: 'elim', ic: 'elim', title: `Who wins ${L.name}?`, sub: `Elimination · ${L.players.length} players · round ${rd} · ${alive.length} left`, closes: f.end, rows: alive.map(w => ({q: {mk: 'elw', g: L.id, w}, label: btName(w), av: av(w)})), more, moreLabel: 'Survival and sudden death'});
  });
  // leaderboards
  [['w', F.week, 'week'], ['m', F.month, 'month']].forEach(([per, fi, word]) => {
    const pk = per === 'w' ? dayKey(startOfWeek(new Date(now))) : today.slice(0, 7), days = mkPeriodDays(per, pk), set = mkTopBy(fi, 5).slice();
    if (mkMyNow() + mkPerMin(ME, days.filter(d => d < today), now) > Math.min(...set.map(w => BS[w * BF + fi]))) set[4] = ME;
    ev.push({id: 'lb|' + per + '|' + pk, cat: 'lb', ic: 'bars', title: `Who studies the most this ${word}?`, sub: `Leaderboards · Hours this ${word} · top ${set.length}`, closes: mkClose(days[days.length - 1]),
      rows: set.map(w => ({q: {mk: 'lbw', per, pk, w, set}, label: btName(w), av: av(w)}))});
  });
  // you
  const goal = +P.goalMin || 60, ts = [...new Set([STREAK_MIN, goal, 60, 120, 180, 240, 300, 360])].sort((a, b) => a - b);
  ev.push({id: 'you|day|' + today, cat: 'you', ic: 'user', title: 'How much will you study today?', sub: 'You · Focus minutes today', closes: mkClose(today),
    rows: ts.map(T => ({q: {mk: 'ymin', dk: today, T}, label: T === STREAK_MIN ? `${T}+ min (keeps your streak)` : T === goal ? `${mkHm(T)}+ (your daily goal)` : `${mkHm(T)}+`}))});
  const wk = dayKey(startOfWeek(new Date(now)));
  ev.push({id: 'you|wk|' + wk, cat: 'you', ic: 'user', title: 'How much will you study this week?', sub: 'You · Sunday to Saturday', closes: mkClose(mkPeriodDays('w', wk)[6]),
    rows: [300, 600, 900, 1200, 1800, 2400].map(T => ({q: {mk: 'ywk', pk: wk, T}, label: `${mkHm(T)}+`}))});
  return ev;
}


/* ---- the Markets page ---- */
const BT = {band: null, div: null};
const MK = {cat: 'trend', view: null, sel: null, pick: null, coins: 100, msg: '', q: '', more: false, combo: store.get('fb.mkcombo', [])};
const mkSaveCombo = () => store.set('fb.mkcombo', MK.combo);
const mkSelfRow = q => MK_SELF.has(q.mk) || (q.mk === 'lbw' && q.w === ME);
let MK_SNAP = store.get('fb.mksnap', {day: '', p: {}});
function btView(now){
  const wk = btWeek(now), own = tnEntry(wk), band = BT.band != null ? BT.band : own ? own.band : tnMyBand();
  return {wk, band, div: BT.div != null ? BT.div : own && own.band === band ? own.div || 0 : tnDefDiv(wk, band)};
}
const BT_NOTQ = new Set(['id', 't', 'ts', 'side', 'n', 'price', 'cost', 'st', 'pay']);
const btKey = q => q.mk === 'combo' ? 'combo|' + q.legs.map(l => btKey(l.q) + '~' + l.side).join('&') : Object.keys(q).filter(k => !BT_NOTQ.has(k)).sort().map(k => k + ':' + (Array.isArray(q[k]) ? q[k].join('.') : q[k])).join('|');
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
  return `<button class="mk-buy ${cls}${on ? ' on' : ''}" data-mk="pick" data-ev="${esc(evId)}" data-q='${esc(JSON.stringify(q))}' data-side="${s}">${mkIc(ic)}${label}<b>${mkQuoteR(info.r, q, s).buy(1)}¢</b></button>`;
}
function mkLine(ev, row, now, big){
  const info = mkRowPrice(row, now), mv = info.yp != null ? mkMove(mkRowKey(row), info.yp) : 0;
  if (info.r.fair != null && MKX.has(row.q.mk)) mkRec(btKey(row.q), info.r.fair, now);
  const pct = info.yp != null ? mkPct(info.yp) : info.r.done != null ? (info.r.done === (row.side !== 'n') ? 'Yes' : 'No') : '–';
  const lab = big ? `<button class="mk-rl" data-mk="sel" data-k="${esc(mkRowKey(row))}">${row.av || ''}<span>${esc(row.label)}</span></button>` : `<span class="mk-rl">${row.av || ''}<span>${esc(row.label)}</span></span>`;
  return `<li class="${big && mkRowKey(row) === MK.sel ? 'sel' : ''}">${lab}<span class="mk-pct">${pct}${mkMoveHtml(mv)}</span><span class="mk-bb">${mkBuyBtn(row, 'y', info, ev.id)}${row.side || mkSelfRow(row.q) ? '' : mkBuyBtn(row, 'n', info, ev.id)}</span></li>`;
}
function mkCardHtml(ev, now){
  const rows = ev.two ? ev.rows : ev.rows.map(row => ({row, info: mkRowPrice(row, now)})).filter(x => x.info.r.p != null).sort((a, b) => b.info.yp - a.info.yp).slice(0, 3).map(x => x.row);
  const n = (ev.two ? 1 : ev.rows.length) + (ev.more ? ev.more.length : 0);
  return `<div class="mk-card" data-mk="open" data-ev="${esc(ev.id)}" role="button" tabindex="0"><div class="mk-ct"><span class="mk-cic">${mkIc(ev.ic)}</span><span class="mk-cat">${esc(ev.sub)}</span></div>
    <b class="mk-title">${esc(ev.title)}</b><ul class="mk-rows">${rows.map(row => mkLine(ev, row, now, false)).join('') || '<li class="hint">Nothing left to trade here.</li>'}</ul>
    <div class="mk-cf"><span>${mkIc('clock')}Closes ${mkClock(ev.closes)}</span><span>${mkIc('bars')}${mkVol(mkEvVol(ev, now))} traded today</span></div></div>`;
}
function mkSpark(pts){
  if (pts.length < 2) return '<p class="hint mk-nochart">The chart fills in as the day goes on.</p>';
  const W = 600, H = 170, x = i => (i / (pts.length - 1) * W).toFixed(1), y = p => (H - 6 - p * (H - 12)).toFixed(1);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(p)).join(''), last = pts[pts.length - 1];
  return `<div class="mk-chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 ${y(.5)}H${W}" class="mid"/><path d="${d}L${W} ${H}L0 ${H}Z" class="area"/><path d="${d}" class="ln"/></svg>
    <span class="mk-ax"><span>24h ago</span><span>now · ${mkPct(last)}</span></span></div>`;
}
// the chance through today, one point an hour, from the same model fed the board as it stood then
let MK_HIST = store.get('fb.mkhist', {});
function mkRec(key, p, now){
  const a = MK_HIST[key] || (MK_HIST[key] = []); if (a.length && now - a[a.length - 1][0] < 10 * 60000) return;
  a.push([now, Math.round(p * 1000) / 1000]); if (a.length > 150) a.splice(0, a.length - 150);
  const ks = Object.keys(MK_HIST); if (ks.length > 400) ks.sort((x, y) => MK_HIST[x][MK_HIST[x].length - 1][0] - MK_HIST[y][MK_HIST[y].length - 1][0]).slice(0, ks.length - 400).forEach(k => delete MK_HIST[k]);
  clearTimeout(mkRec.t); mkRec.t = setTimeout(() => store.set('fb.mkhist', MK_HIST), 1000);
}
// the price over the last 24 hours: what the crowd could see at each moment (hour by hour), plus how they traded it
function mkHistory(q, side, now){
  const r = btPrice(q, now); if (r.p == null || !r.flow) return {pts: []};
  const key = btKey(q), d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  let fairAt;
  if (MKX.has(q.mk)){ const h = MK_HIST[key] || []; fairAt = t => { let v = null; for (const [tt, p] of h){ if (tt <= t) v = p; else break; } return v != null ? v : h.length ? h[0][1] : r.fair; }; }
  else { const hr = []; for (let h = 0; h * 60 <= btNowMin(now); h++){ let f = null; try { f = btFair(q, d0.getTime() + h * 3600000 + 60000).p; } catch(_){} hr.push(f); }
    const first = hr.find(x => x != null); fairAt = t => { if (t < d0.getTime()) return first != null ? first : r.fair; const v = hr[Math.floor((t - d0.getTime()) / 3600000)]; return v != null ? v : r.fair; }; }
  const pts = []; r.flow.es.forEach(([t, e], i) => { if (i % 6) return; const p = mkSig(mkCrowdL(fairAt(t), e)); pts.push(side === 'n' ? 1 - p : p); });
  pts.push(side === 'n' ? 1 - r.p : r.p);
  return {pts};
}
// recent trades on these markets, without names: the crowd's, and yours marked as yours
function mkTrades(rows, now, max = 14){
  const seen = new Set(), out = [];
  rows.forEach(row => {
    const key = btKey(row.q); if (seen.has(key)) return; seen.add(key);
    const r = btPrice(row.q, now); if (r.fair == null || !r.flow) return;
    const two = row.q.mk === 'match' || row.q.mk === 'h2h', other = two ? rows.find(x => btKey(x.q) === key && x.side === 'n') : null;
    r.flow.trades.forEach(tr => { const py = mkSig(mkCrowdL(r.fair, tr.e)), c = Math.max(1, Math.min(99, Math.round((tr.yes ? py : 1 - py) * 100)));
      out.push({t: tr.t, n: tr.n, c, what: two ? (tr.yes ? row.label : other ? other.label : 'No') : tr.yes ? 'Yes' : 'No', on: two ? '' : row.label, yes: two || tr.yes}); });
  });
  Object.values(btBets()).forEach(b => { if (b.mk === 'combo' || now - b.t > 864e5 || !seen.has(btKey(b))) return; const row = rows.find(x => btKey(x.q) === btKey(b)), two = b.mk === 'match' || b.mk === 'h2h';
    out.push({t: b.t, n: b.n, c: b.price, what: two ? btName(b.side === 'y' ? b.a : b.b) : b.side === 'y' ? 'Yes' : 'No', on: two || !row ? '' : row.label, yes: two || b.side === 'y', me: 1});
    if (b.st === 'sold' && b.ts) out.push({t: b.ts, n: b.n, c: Math.round(b.pay / b.n), what: two ? btName(b.side === 'y' ? b.a : b.b) : b.side === 'y' ? 'Yes' : 'No', on: two || !row ? '' : row.label, yes: two || b.side === 'y', me: 1, sold: 1}); });
  return out.sort((a, b) => b.t - a.t).slice(0, max);
}
const mkAgo = (t, now) => { const m = Math.max(0, Math.round((now - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`; };
function mkTradesHtml(list, now, withMarket){
  if (!list.length) return '<p class="hint">No trades yet.</p>';
  return `<ul class="mk-feed">${list.map(x => `<li class="${x.me ? 'me' : ''}"><i class="mk-dot ${x.yes ? 'yes' : 'no'}"></i><span>${x.me ? `<b>You ${x.sold ? 'sold' : 'bought'}</b> ` : 'Bought '}${x.n.toLocaleString()} <b class="${x.yes ? 'yes' : 'no'}">${esc(x.what)}</b>${x.on ? ` · ${esc(x.on)}` : ''}${withMarket && x.ev ? `<small>${esc(x.ev)}</small>` : ''}</span><span class="mk-fc">${x.c}¢</span><span class="mk-ft">${mkAgo(x.t, now)}</span></li>`).join('')}</ul>`;
}
const mkVol = n => n < 1000 ? n.toLocaleString() : (n / 1000).toFixed(n < 1e4 ? 1 : 0) + 'K';
function mkEvVol(ev, now){ const seen = new Set(); let v = 0; ev.rows.concat(ev.more || []).forEach(row => { const k = btKey(row.q); if (seen.has(k)) return; seen.add(k); try { const r = btPrice(row.q, now); if (r.flow) v += r.flow.vol; } catch(_){} }); return v; }
function mkSumHtml(Q, n, cost){
  const row = (k, l, v, cls = '') => `<span><span>${l}</span><b data-s="${k}" class="${cls}">${v}</b></span>`;
  return `<div class="mk-tsum" data-mk-sum>${row('n', 'Contracts', n.toLocaleString())}${row('avg', 'Average price', n ? Math.round(cost / n) + '¢' : '–')}${row('cost', 'Cost', cost.toLocaleString())}${row('after', 'Price after you buy', n && !Q.combo ? mkPct(Q.after(n)) : '–')}${row('pay', 'Pays if right', (n * 100).toLocaleString(), 'win')}</div>`;
}
function mkTicketHtml(){
  const pk = MK.pick; if (!pk) return `<div class="mk-ticket empty">${mkIc('grid')}<p>Pick an answer to buy it here.</p></div>`;
  const r = btPrice(pk.q, Date.now()); if (r.closed || r.p == null) return `<div class="mk-ticket empty"><p>That market just closed.</p></div>`;
  const Q = mkQuoteR(r, pk.q, pk.side), price = Q.buy(1), coins = Math.max(0, Math.floor(+MK.coins || 0)), n = mkMaxN(Q, coins), cost = n ? Q.buy(n) : 0;
  const two = pk.q.mk === 'match' || pk.q.mk === 'h2h', combo = pk.q.mk === 'combo', what = combo ? 'combo' : btPickWhat(pk.q, pk.side);
  const inCombo = MK.combo.some(l => btKey(l.q) === btKey(pk.q)), canCombo = !combo && (inCombo || MK.combo.length < 6);
  return `<form class="mk-ticket"><div class="mk-tt">${mkIc(pk.side === 'y' || two ? 'check' : 'x', pk.side === 'y' || two ? 'yes' : 'no')}<span>Buy <b>${esc(what)}</b><small>${esc(btTitle(pk.q))}</small></span></div>
    <div class="mk-tp"><span>Price</span><b>${price}¢</b></div>
    <label class="mk-tc"><span>Coins</span><input type="number" min="${price}" step="1" value="${coins || ''}" inputmode="numeric" data-mk="coins"></label>
    <span class="mk-quick">${[100, 500, 1000, 5000].map(v => `<button type="button" class="small-btn" data-mk="amt" data-v="${v}">${v.toLocaleString()}</button>`).join('')}<button type="button" class="small-btn" data-mk="amt" data-v="max">Max</button></span>
    ${mkSumHtml(Q, n, cost)}
    <button class="btn primary mk-go" data-price="${price}" title="Buy ${esc(what)}">${mkIc('check')}<span>Buy ${esc(what)}</span></button>${canCombo ? `<button type="button" class="small-btn mk-addc" data-mk="addc">${mkIc(inCombo ? 'check' : 'layers')}${inCombo ? 'In your combo (update pick)' : 'Add to combo'}</button>` : ''}<button type="button" class="small-btn" data-mk="cancel">Cancel</button>
    ${MK.msg ? `<p class="mk-msg">${esc(MK.msg)}</p>` : ''}<p class="hint">Each contract pays 100 coins if you’re right. Your trade moves the price, so bigger trades cost more per contract. 1 coin fee per contract.</p></form>`;
}
function mkDetailHtml(ev, now){
  const all = ev.rows.concat(MK.more && ev.more ? ev.more : []);
  const sel = all.find(r => mkRowKey(r) === MK.sel) || all[0]; MK.sel = mkRowKey(sel);
  return `<div class="mk-detail"><div class="mk-main"><button class="small-btn mk-back" data-mk="back">${mkIc('back')}All markets</button>
    <div class="mk-dh"><span class="mk-cic lg">${mkIc(ev.ic)}</span><div><small>${esc(ev.sub)}</small><h2>${esc(ev.title)}</h2><small class="mk-cl">${mkIc('clock')}Closes ${mkClock(ev.closes)}</small></div></div>
    <div class="card mk-dchart"><div class="mk-sl">${sel.av || ''}<b>${esc(sel.label)}</b><small>price · last 24 hours</small></div>${mkSpark(mkHistory(sel.q, sel.side || 'y', now).pts)}</div>
    <ul class="mk-rows big">${all.map(row => mkLine(ev, row, now, true)).join('')}</ul>
    ${ev.more && ev.more.length ? `<button class="small-btn mk-moreb" data-mk="more">${mkIc('grid')}${MK.more ? 'Fewer markets' : `${ev.moreLabel || 'More on this match: margins and totals'} (${ev.more.length})`}</button>` : ''}
    <div class="card mk-trades"><b>${mkIc('trend')}Recent trades</b>${mkTradesHtml(mkTrades(all, now), now)}</div>
    <div class="card mk-rules"><b>Rules</b><p>${esc(btRules(sel.q))}</p><p class="hint">Prices are set by trading. Other players trade here all day (slower overnight), going on ratings, minutes so far and time left, never anyone’s study history, and they don’t always get it right. Your trades move the price too.</p></div></div>
    <aside class="mk-side">${mkTicketHtml()}</aside></div>`;
}
function mkPortfolioHtml(now){
  const all = Object.values(btBets()).sort((a, b) => b.t - a.t), open = all.filter(b => b.st === 'open'), done = all.filter(b => b.st !== 'open').slice(0, 40);
  const net = all.filter(b => b.st !== 'open').reduce((n, b) => n + (b.pay || 0) - (b.cost || 0), 0);
  let value = 0;
  const row = b => {
    let right;
    if (b.st === 'open'){ const r = btPrice(b, now), worth = r.p != null && !r.closed ? mkQuoteR(r, b, b.side).sell(b.n) : null, each = worth != null ? worth / b.n : null; if (each != null) value += worth;
      right = `<span class="mk-pv">${each != null ? `<b>${worth.toLocaleString()}</b><small>if sold now</small>` : '<small>settling</small>'}</span>${each != null ? `<button class="small-btn" data-mk="sell" data-id="${b.id}">${mkIc('out')}Sell</button>` : ''}`; }
    else right = `<i class="mk-st ${b.st}">${mkIc(b.st === 'won' ? 'check' : b.st === 'lost' ? 'x' : b.st === 'sold' ? 'out' : 'undo')}${b.st === 'won' ? `Won ${b.pay.toLocaleString()}` : b.st === 'sold' ? `Sold ${b.pay.toLocaleString()}` : b.st === 'void' ? 'Refunded' : 'Lost'}</i>`;
    const what = b.mk === 'combo' ? 'Combo' : btPickWhat(b, b.side), legs = b.mk === 'combo' ? `<small class="mk-legs">${b.legs.map(l => `${esc(btPickWhat(l.q, l.side))} · ${esc(btTitle(l.q))}`).join('<br>')}</small>` : '';
    return `<li class="mk-pos"><span class="mk-cic">${mkIc(MK_KIND_IC[b.mk] || 'grid')}</span><span class="mk-pt"><b>${esc(what)}</b> · ${esc(btTitle(b))}${legs}<small>${b.n.toLocaleString()} at ${b.price}¢ · cost ${b.cost.toLocaleString()} · pays ${(b.n * 100).toLocaleString()}</small></span>${right}</li>`;
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
  if (MK.view === 'combo'){ domMorph(box, html + mkComboHtml(now)); return; }
  if (MK.view){ const ev = evs.find(x => x.id === MK.view); if (ev){ domMorph(box, html + mkDetailHtml(ev, now) + mkComboBar(now)); return; } MK.view = null; }
  if (MK.cat === 'pos'){ domMorph(box, html + mkPortfolioHtml(now)); return; }
  let list = evs;
  if (MK.q){ const s = MK.q.toLowerCase(); list = list.filter(ev => (ev.title + ' ' + ev.rows.map(r => r.label).join(' ')).toLowerCase().includes(s)); }
  const score = ev => ev.rows.reduce((n, r) => { const i = mkRowPrice(r, now); return Math.max(n, i.yp != null ? Math.abs(mkMove(mkRowKey(r), i.yp)) + (i.yp > .15 && i.yp < .85 ? 3 : 0) + (ev.two ? 2 : 0) : 0); }, 0);
  if (['tour', 'rank', 'elim', 'lb', 'you'].includes(MK.cat)) list = list.filter(ev => ev.cat === MK.cat);
  if (MK.cat === 'soon') list = list.slice().sort((a, b) => a.closes - b.closes);
  else if (MK.cat === 'trend') list = list.map(ev => [ev, score(ev)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const v = btView(now), own = tnEntry(v.wk);
  if (MK.cat === 'tour') html += `<div class="mk-where">${mkIc('trophy')}<span>Bracket</span>${TN_BANDS.map((b, i) => `<button class="chip${i === v.band ? ' on' : ''}" data-mk="band" data-v="${i}">${esc(b[2])}</button>`).join('')}
      <form class="mk-divf"><label>Division <input type="number" min="1" max="${tnDivCount(v.band, v.wk)}" value="${v.div || ''}" inputmode="numeric"></label><button class="small-btn">Go</button>${own ? '<button type="button" class="small-btn" data-mk="mine">Mine</button>' : ''}</form></div>`;
  const shown = MK.cat === 'trend' || MK.cat === 'soon' ? list.slice(0, 30) : list;
  if (shown.length){ const tape = []; shown.slice(0, 12).forEach(ev => mkTrades(ev.rows, now, 3).forEach(x => tape.push({...x, ev: ev.title, on: x.on || ''})));
    tape.sort((a, b) => b.t - a.t); if (tape.length) html += `<div class="card mk-tape"><b>${mkIc('trend')}Live trades</b>${mkTradesHtml(tape.slice(0, 6), now, true)}</div>`; }
  html += shown.length ? `<div class="mk-grid">${shown.map(ev => mkCardHtml(ev, now)).join('')}</div>` : `<div class="mk-empty">${mkIc('grid')}<p>${MK.q ? 'No markets match that.' : (MK_EMPTY[MK.cat] || 'No markets open right now.')}</p></div>`;
  html += `<p class="hint mk-foot">Prices are set by trading: other players trade every market all day (slower overnight), and your trades move prices too. Add picks from different markets to a combo for a bigger payout.</p>`;
  domMorph(box, html + mkComboBar(now));
}
const MK_EMPTY = {tour: 'No tournament markets right now. Rounds run Monday to Friday, and Monday’s opens on the weekend.', rank: 'Ranked markets open once you’ve played your placement games.', elim: 'No top Elimination games are running right now. A new one starts every few minutes.'};
// the combo you're building: shown as a bar at the bottom, and in full with its own ticket
function mkComboQ(){ return {mk: 'combo', legs: MK.combo.map(l => ({q: l.q, side: l.side}))}; }
function mkComboBar(now){
  if (!MK.combo.length || MK.view === 'combo') return '';
  let p = 1; MK.combo.forEach(l => { const r = btPrice(l.q, now); p *= r.p != null ? (l.side === 'y' ? r.p : 1 - r.p) : 0; });
  return `<div class="mk-cbar">${mkIc('layers')}<span><b>Combo · ${MK.combo.length} pick${MK.combo.length === 1 ? '' : 's'}</b><small>${MK.combo.length < 2 ? 'Add 1 more pick' : `${mkPct(p)} chance if every pick is right`}</small></span><button class="btn primary sm" data-mk="combo">Review</button><button class="small-btn" data-mk="clrc">Clear</button></div>`;
}
function mkComboHtml(now){
  const legs = MK.combo;
  const rows = legs.map((l, i) => { const r = btPrice(l.q, now), p = r.p != null ? (l.side === 'y' ? r.p : 1 - r.p) : null;
    return `<li><span class="mk-cic">${mkIc(MK_KIND_IC[l.q.mk] || 'grid')}</span><span class="mk-pt"><b>${esc(btPickWhat(l.q, l.side))}</b> · ${esc(btTitle(l.q))}<small>${r.closed && r.done == null ? esc(r.closed) : r.done != null ? 'Already settled' : ''}</small></span><span class="mk-pct">${p != null ? mkPct(p) : '–'}</span><button class="small-btn" data-mk="rmc" data-i="${i}">${mkIc('x')}Remove</button></li>`; }).join('');
  if (legs.length >= 2){ const q = mkComboQ(); MK.pick = {key: btKey(q), side: 'y', q}; }
  else if (MK.pick && MK.pick.q.mk === 'combo') MK.pick = null;
  return `<div class="mk-detail"><div class="mk-main"><button class="small-btn mk-back" data-mk="back">${mkIc('back')}All markets</button>
    <div class="mk-dh"><span class="mk-cic lg">${mkIc('layers')}</span><div><small>Combo</small><h2>Your combo · ${legs.length} pick${legs.length === 1 ? '' : 's'}</h2><small>Every pick has to be right. Up to 6 picks from different markets.</small></div></div>
    ${legs.length ? `<ul class="mk-list mk-clist">${rows}</ul>` : `<div class="mk-empty">${mkIc('layers')}<p>Your combo is empty. Pick an answer on any market, then press Add to combo.</p></div>`}
    <div class="card mk-rules"><b>How combos work</b><p>A combo pays 100 coins a contract only if every pick is right. Its chance is the picks’ chances multiplied, so it pays far more than any one pick, and one wrong pick loses it all. It settles No the moment a pick is wrong, and if a pick is cancelled you get your coins back.</p></div></div>
    <aside class="mk-side">${legs.length >= 2 ? mkTicketHtml() : `<div class="mk-ticket empty">${mkIc('layers')}<p>Add ${2 - legs.length} more pick${legs.length === 1 ? '' : 's'} to buy this combo.</p></div>`}</aside></div>`;
}

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
  else if (k === 'amt') MK.coins = a.dataset.v === 'max' ? Math.max(0, coTotals().balance) : +a.dataset.v;
  else if (k === 'cancel'){ MK.pick = null; MK.msg = ''; }
  else if (k === 'addc' && MK.pick){ const key = btKey(MK.pick.q), i = MK.combo.findIndex(l => btKey(l.q) === key); if (i >= 0) MK.combo[i].side = MK.pick.side; else if (MK.combo.length < 6) MK.combo.push({q: MK.pick.q, side: MK.pick.side}); mkSaveCombo(); toast(`Combo · ${MK.combo.length} pick${MK.combo.length === 1 ? '' : 's'}`); MK.pick = null; }
  else if (k === 'combo'){ MK.view = 'combo'; MK.msg = ''; window.scrollTo(0, 0); }
  else if (k === 'rmc'){ MK.combo.splice(+a.dataset.i, 1); mkSaveCombo(); }
  else if (k === 'clrc'){ MK.combo = []; mkSaveCombo(); if (MK.view === 'combo') MK.view = null; }
  else if (k === 'sell'){ const r = btSellPos(a.dataset.id); toast(r.err || `Sold for ${r.ok.toLocaleString()} coins`); }
  else if (k === 'band'){ BT.band = +a.dataset.v; BT.div = null; }
  else if (k === 'mine'){ BT.band = null; BT.div = null; }
  mkRender();
});
document.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('.mk-card')){ ev.preventDefault(); ev.target.click(); } });
document.addEventListener('input', ev => {
  const s = ev.target.closest && ev.target.closest('[data-mk="search"]'); if (s){ MK.q = s.value; clearTimeout(mkRender.t); mkRender.t = setTimeout(() => { mkRender(); const i = $('#mkBody [data-mk="search"]'); if (i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); return; }
  const i = ev.target.closest && ev.target.closest('[data-mk="coins"]'); if (!i || !MK.pick) return;
  MK.coins = Math.floor(+i.value || 0); const Q = mkQuote(MK.pick.q, MK.pick.side, Date.now()); if (!Q) return;
  const n = mkMaxN(Q, MK.coins), box = document.querySelector('[data-mk-sum]'); if (box) box.outerHTML = mkSumHtml(Q, n, n ? Q.buy(n) : 0);
});
document.addEventListener('submit', ev => {
  const f = ev.target.closest && ev.target.closest('#mkBody form'); if (!f) return;
  ev.preventDefault();
  if (f.classList.contains('mk-divf')){ const n = Math.floor(+f.querySelector('input').value || 0), v = btView(Date.now()); if (n >= 1 && n <= tnDivCount(v.band, v.wk)){ BT.div = n; BT.band = v.band; } mkRender(); return; }
  if (!MK.pick) return;
  const r = btTrade(MK.pick.q, MK.pick.side, MK.coins, +f.querySelector('[data-price]').dataset.price);
  if (r.moved) MK.msg = `The price moved to ${r.moved}¢. Press Buy again to take it.`;
  else if (r.err) MK.msg = r.err;
  else { toast(`Bought ${r.n.toLocaleString()} contract${r.n === 1 ? '' : 's'} for ${r.cost.toLocaleString()} coins`); if (MK.pick.q.mk === 'combo'){ MK.combo = []; mkSaveCombo(); MK.view = null; MK.cat = 'pos'; } MK.pick = null; MK.msg = ''; }
  mkRender();
});
{ const _s = onPageShown; onPageShown = function(name){ const x = _s.apply(this, arguments); if (name === 'markets'){ try { btSettle(); } catch(e){ console.error(e); } mkRender(); } return x; }; }
setInterval(() => { if (typeof RK_READY === 'undefined' || !RK_READY || document.hidden) return; try { btSettle(); } catch(e){ console.error('markets', e); } const pg = $('#page-markets'); if (pg && !pg.hidden && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#mkBody form, .mk-search'))) mkRender(); }, 60000);
(function btStart(){ if (typeof RK_READY === 'undefined' || !RK_READY) return setTimeout(btStart, 3000); try { btSettle(); } catch(e){ console.error('markets', e); } })();
