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
const MK_DEEP = new Set(['match', 'out', 'top', 'h2h', 'elw', 'lbw', 'spr', 'elko', 'rtm']), MK_THIN = new Set(['ff', 'margin', 'total', 'els', 'elsd', 'ymin', 'ywk', 'rkn', 'rkr']);
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
const btAboutMe = q => q.mk === 'combo' ? q.legs.some(l => btAboutMe(l.q)) : q.w === ME || q.a === ME || q.b === ME || q.c === ME || (Array.isArray(q.set) && q.set.includes(ME)) || MK_SELF.has(q.mk);
function btBlocked(q, side, B){
  if (btAboutMe(q)) return 'You can’t bet on yourself';
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
  bars: '<path d="M8 21V11H3v10zM15 21V4h-6v17zM21 21v-7h-6v7z"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
};
const mkIc = (k, cls = '') => `<svg class="mk-ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MK_IC[k] || ''}</svg>`;
const MK_KIND_IC = {match: 'vs', out: 'trophy', reach: 'flag', min: 'clock', margin: 'ruler', total: 'sum', ff: 'off', top: 'star', ups: 'bolt', h2h: 'swap', rtm: 'vs', lbt: 'clock', spr: 'clock', elko: 'bolt', elnx: 'elim', rkm: 'vs', rkn: 'star', rkr: 'flag', elw: 'elim', els: 'elim', elsd: 'bolt', lbw: 'bars', ymin: 'user', ywk: 'user', combo: 'layers'};

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
const MK_CATS = [['trend', 'Trending', 'trend'], ['soon', 'Ending soon', 'clock'], ['tour', 'Tournament', 'trophy'], ['rank', 'Ranked', 'shield'], ['elim', 'Elimination', 'elim'], ['lb', 'Leaderboards', 'bars'], ['pos', 'Portfolio', 'wallet']];
function mkEvents(now){ let a = [], b = [], c = []; try { c = mkFastEvents(now); } catch(e){ console.error('markets', e); } try { a = mkTourneyEvents(now); } catch(e){ console.error('markets', e); } try { b = mkOtherEvents(now); } catch(e){ console.error('markets', e); } const all = c.concat(a, b), out = [];
  all.forEach(ev => { if (ev.two && ev.rows.some(r => btAboutMe(r.q))) return; const rows = ev.rows.filter(r => !btAboutMe(r.q)); if (!rows.length) return; out.push({...ev, rows, more: ev.more && ev.more.filter(r => !btAboutMe(r.q))}); });
  return out; }

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
const MKX = new Set(['rkm', 'rkn', 'rkr', 'elw', 'els', 'elsd', 'lbw', 'ymin', 'ywk', 'combo', 'spr', 'elko', 'elnx', 'rtm', 'lbt']);
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
const elOfId = g => { const L = (EL.live || []).find(x => x.id === g); if (L) return L; try { return elTopGame(parseInt(String(g).slice(1), 36)); } catch(_){ return null; } };
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
  if (per === 'd') return [pk];
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


/* ---- fast markets: 15-minute windows that settle and roll over all day ----
     spr   a tournament sprint: in the window starting w0, o = 'a' (a studies more), 'b' (b does) or 't' (a tie, including neither)
     elko  someone is knocked out of Elimination game g in the window starting w0
     elnx  w is the next player knocked out of game g after aft
   Prices come from what's visible: who's studying right now, minutes so far in the window and the time of day. */
const MK_WIN = 15 * 60000;
const mkWin = t => Math.floor(t / MK_WIN) * MK_WIN;
const mkHM = t => new Date(t).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
const mkMinOf = t => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
function mkOn(w, dk, m){ if (w === ME) return typeof focusing === 'function' && focusing(); return sitsOf(w, dk).some(([a, b]) => a <= m && b > m); }
// minutes w studied between minute s and t of day dk (your unlogged block counts too)
function mkWinMin(w, dk, s, t, now){
  if (w !== ME) return Math.max(0, tnBotMin(w, dk, t) - tnBotMin(w, dk, s));
  let m = tnLogMin(dk, t) - tnLogMin(dk, s);
  const live = typeof tnLiveMin === 'function' ? tnLiveMin() : 0;
  if (live && dk === dayKey(now)){ const b = mkMinOf(now), a = b - live; m += Math.max(0, Math.min(b, t) - Math.max(a, s)); }
  return Math.round(m);
}
const SPR_C = new Map();
function mkSpr(q, now){
  const end = q.w0 + MK_WIN, dk = dayKey(q.w0), s0 = mkMinOf(q.w0), s1 = s0 + 15, pick = (x, y) => x > y ? 'a' : y > x ? 'b' : 't';
  if (now >= end + 60000){
    if (q.a === ME || q.b === ME){ const live = typeof tnLiveMin === 'function' ? tnLiveMin() : 0; if (live && now - live * 60000 < end) return {closed: 'Settling when you stop'}; }
    return {done: pick(mkWinMin(q.a, dk, s0, s1, now), mkWinMin(q.b, dk, s0, s1, now)) === q.o};
  }
  const key = `${q.wk}|${q.band}|${q.div}|${q.a}|${q.b}|${q.w0}|${Math.floor(now / 60000)}`;
  let S = SPR_C.get(key);
  if (!S){
    if (SPR_C.size > 200) SPR_C.clear();
    const nm = Math.max(s0, mkMinOf(now)), ca = mkWinMin(q.a, dk, s0, nm, now), cb = mkWinMin(q.b, dk, s0, nm, now), rem = Math.max(0, Math.round(s1 - nm));
    const pOn = .0016 * mkAct(now), pOff = 1 / 40, rnd = mkSeed(key), n = 600, c = {a: 0, b: 0, t: 0};
    const onA = mkOn(q.a, dk, nm), onB = mkOn(q.b, dk, nm);
    for (let i = 0; i < n; i++){
      let xa = ca, xb = cb, oa = onA, ob = onB;
      for (let m = 0; m < rem; m++){ oa = oa ? rnd() >= pOff : rnd() < pOn; ob = ob ? rnd() >= pOff : rnd() < pOn; if (oa) xa++; if (ob) xb++; }
      c[pick(xa, xb)]++;
    }
    S = {c, n, ca, cb, onA, onB}; SPR_C.set(key, S);
  }
  return {p: btClamp(S.c[q.o] / S.n), close: end - 60000, sprint: S};
}
function mkElFast(q, now){
  const L = elOfId(q.g); if (!L || L.t0 > now) return {closed: 'Not started'};
  const f = elFacts(L, now);
  if (q.mk === 'elko'){
    const end = q.w0 + MK_WIN, hit = f.outs.some(([, o]) => o >= q.w0 && o < end && o <= now);
    if (hit) return {done: true};
    if (now >= end || f.over) return {done: false};
    const a = f.A[Math.min(f.r, f.A.length - 1)], mean = f.alive.reduce((x, w) => x + botRating(w), 0) / Math.max(1, f.alive.length);
    const lam = f.alive.reduce((x, w) => x + elHaz(a) * Math.pow(10, -(botRating(w) - mean) / 900), 0) / L.rules.round;
    return {p: btClamp(1 - Math.exp(-lam * (end - now) / 60000)), close: end - 60000};
  }
  // elnx
  if (!L.players.includes(q.w)) return {void: true};
  const next = f.outs.filter(([, o]) => o > q.aft).sort((x, y) => x[1] - y[1])[0];
  if (next && next[1] <= now) return {done: next[0] === q.w};
  if (elBotPlan(L, q.w).out <= q.aft) return {void: true};
  const mean = f.alive.reduce((x, w) => x + botRating(w), 0) / Math.max(1, f.alive.length), h = w => Math.pow(10, -(botRating(w) - mean) / 900);
  if (!f.alive.includes(q.w) || f.alive.length < 2) return {closed: 'Waiting'};
  return {p: btClamp(h(q.w) / f.alive.reduce((x, w) => x + h(w), 0))};
}
function mkFastEvents(now){
  const ev = [], w0 = mkWin(now), end = w0 + MK_WIN, span = `${mkHM(w0)}–${mkHM(end)}`, av = w => tnAv(w);
  // tournament sprints on the live round
  try {
    const v = btView(now), e = btEntry(v.wk, v.band, v.div), k = e ? btRound(e, now) : null;
    if (e && k != null && tnDayKey(e.wk, k) === dayKey(now)){
      const B = tnBracket(e, now), base = {wk: e.wk, band: e.band, div: e.div || v.div || 0}, dk = dayKey(now), s0 = mkMinOf(w0), nm = mkMinOf(now);
      B.rounds[k].filter(m => m.a && m.b && m.st === 'live').forEach(m => {
        const q = o => ({...base, mk: 'spr', k, a: m.a.w, b: m.b.w, w0, o}), on = w => mkOn(w, dk, nm) ? ' · studying' : '';
        ev.push({id: `f|spr|${base.wk}|${base.band}|${base.div}|${m.a.w}|${w0}`, cat: 'fast', fast: 1, ic: 'clock', title: `${btName(m.a.w)} vs ${btName(m.b.w)}: who studies more ${span}?`, sub: `Tournament sprint · ${TN_ROUNDS[k]}`, closes: end, live: 1,
          rows: [{q: q('a'), label: btName(m.a.w), av: av(m.a.w), stat: `${mkWinMin(m.a.w, dk, s0, nm, now)}m${on(m.a.w)}`}, {q: q('b'), label: btName(m.b.w), av: av(m.b.w), stat: `${mkWinMin(m.b.w, dk, s0, nm, now)}m${on(m.b.w)}`}, {q: q('t'), label: 'Tie or neither'}]});
      });
    }
  } catch(err){ console.error('markets', err); }
  // Elimination knockouts in this window, and who goes out next
  const games = mkElTops().map(L => [L, elFacts(L, now)]).filter(([, f]) => !f.over && f.alive.length >= 2);
  for (const [L, f] of games){
    ev.push({id: `f|elko|${L.id}|${w0}`, cat: 'fast', fast: 1, ic: 'bolt', watch: `data-mkwatch="${L.id}"`, title: `Anyone knocked out of ${L.name} by ${mkHM(end)}?`, sub: `Elimination · ${f.alive.length} left · round ${f.r + 1}`, closes: end, live: 1,
      rows: [{q: {mk: 'elko', g: L.id, w0}, label: 'Someone goes out'}]});

  }
  return ev;
}
function mkEvalX(q, now){
  switch (q.mk){
    case 'rkm': return mkRkm(q, now); case 'rkn': return mkRkn(q, now); case 'rkr': return mkRkr(q, now);
    case 'elw': case 'els': case 'elsd': return mkEl(q, now);
    case 'lbw': return mkLbw(q, now); case 'ymin': return mkYmin(q, now); case 'ywk': return mkYwk(q, now);
    case 'combo': return mkCombo(q, now);
    case 'spr': return mkSpr(q, now); case 'elko': case 'elnx': return mkElFast(q, now);
    case 'rtm': return mkRtm(q, now); case 'lbt': return mkLbt(q, now);
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
    case 'lbw': return q.set.length === 2 ? `${btName(q.set[0])} ends ${q.per === 'w' ? 'the week' : 'the month'} ahead of ${btName(q.set[1])}` : `${btName(q.w)} studies the most ${q.per === 'd' ? 'today' : q.per === 'w' ? 'this week' : 'this month'}`;
    case 'ymin': return `You study ${mkHm(q.T)}+ ${q.dk === dayKey(Date.now()) ? 'today' : 'on ' + new Date(q.dk + 'T12:00').toLocaleDateString([], {weekday: 'long'})}`;
    case 'ywk': return `You study ${mkHm(q.T)}+ this week`;
    case 'combo': return `Combo: ${q.legs.length} picks`;
    case 'spr': return q.o === 't' ? `${btName(q.a)} and ${btName(q.b)} tie ${mkHM(q.w0)}–${mkHM(q.w0 + MK_WIN)}` : `${btName(q.o === 'a' ? q.a : q.b)} studies more ${mkHM(q.w0)}–${mkHM(q.w0 + MK_WIN)}`;
    case 'elko': return `Someone is knocked out of ${elName(q.g)} by ${mkHM(q.w0 + MK_WIN)}`;
    case 'elnx': return `${btName(q.w)} is the next one out of ${elName(q.g)}`;
    case 'rtm': return `${btName(q.a)} beats ${btName(q.c)} in ranked`;
    case 'lbt': return `${btName(q.w)} studies ${mkHm(q.T)}+ ${q.per === 'd' ? 'today' : q.per === 'w' ? 'this week' : 'this month'}`;
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
    case 'lbw': return `Yes if ${btName(q.w)} has the most Focus minutes ${q.per === 'd' ? 'today' : q.per === 'w' ? 'this week (Sunday to Saturday)' : 'this month'} of the ${q.set.length} players listed, who were the top ${q.set.length} when the market opened. Trading closes at 11 PM on the last day.`;
    case 'ymin': return `Yes once you have ${mkHm(q.T)} of Focus minutes that day (midnight to midnight). Trading closes at 11 PM. Only Yes can be bought.`;
    case 'ywk': return `Yes once you have ${mkHm(q.T)} of Focus minutes this week (Sunday to Saturday). Trading closes at 11 PM Saturday. Only Yes can be bought.`;
    case 'spr': return `Compares ${btName(q.a)} and ${btName(q.b)}’s Focus minutes from ${mkHM(q.w0)} to ${mkHM(q.w0 + MK_WIN)} only, not their whole day. ${q.o === 't' ? 'Yes if they finish the window level, including when neither studies.' : `Yes if ${btName(q.o === 'a' ? q.a : q.b)} has more.`} Trading closes a minute before the window ends; it settles right after.`;
    case 'elko': return `Yes if anyone in ${elName(q.g)} is knocked out between ${mkHM(q.w0)} and ${mkHM(q.w0 + MK_WIN)}. Trading closes a minute before the window ends.`;
    case 'elnx': return `Yes if ${btName(q.w)} is the next player knocked out of ${elName(q.g)} after ${mkHM(q.aft)}.`;
    case 'rtm': return `Yes if ${btName(q.a)} beats ${btName(q.c)} in their live ranked match: whoever studies longer wins. It settles as soon as the result can’t change, at the latest when both have stopped.`;
    case 'lbt': return `Yes once ${btName(q.w)} has ${mkHm(q.T)} of Focus minutes ${q.per === 'd' ? 'today' : q.per === 'w' ? 'this week (Sunday to Saturday)' : 'this month'}. Trading closes at 11 PM on the last day.`;
    case 'combo': return `Pays 100 coins only if every pick is right: ${q.legs.map(l => `${btPickWhat(l.q, l.side)} on “${btTitle(l.q)}”`).join('; ')}. If any pick is wrong it settles No; if a pick is cancelled you get your coins back.`;
  }
  return '';
}
function mkBlockedX(q, side){
  if (q.mk === 'combo'){ for (const l of q.legs){ const why = btBlocked(l.q, l.side, (btCtx(l.q, Date.now()) || {}).B); if (why) return why; } return side === 'y' ? null : 'Combos are bought on Yes'; }
  if (MK_SELF.has(q.mk)) return side === 'y' ? null : 'You can only back yourself';
  if (q.mk === 'spr' && (q.a === ME || q.b === ME)){ const mine = q.o === (q.a === ME ? 'a' : 'b'); return mine && side === 'y' ? null : 'You can only back yourself'; }
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
/* ranked top matches: the live 1v1s between top-1,000 players (the ones you can watch). Yes = a wins (more minutes).
   The crowd sees each player's minutes so far and whether they're still going, never how long they planned to study. */
function mkRkTopPairs(){
  if (typeof wNowMin !== 'function' || !LF.pairs) return [];
  const {m} = wNowMin(), cut = LF.top || 2400;
  return LF.pairs.filter(p => Math.max(p.ea - p.ma, p.ec - p.mc) <= m && Math.max(p.ea, p.ec) > m && Math.min(p.ra, p.rc) >= cut);
}
const RTM_PW = new Map();
function mkRtmPair(q){
  const {dk, m} = wNowMin(); if (dk !== q.dk) return null;
  let p = (LF.pairs || []).find(x => x.a === q.a && x.c === q.c && x.ea === q.ea && x.ec === q.ec);
  if (!p && planDay === dk && LF.pairKey !== dk + '|' + q.w0){ const k = dk + '|' + q.w0; if (!RTM_PW.has(k)){ try { RTM_PW.set(k, pairWindow(q.w0, dk)); } catch(_){ RTM_PW.set(k, []); } } p = RTM_PW.get(k).find(x => x.a === q.a && x.c === q.c && x.ea === q.ea && x.ec === q.ec); }
  return p ? {p, m} : null;
}
function mkRtm(q, now){
  const x = mkRtmPair(q);
  if (!x){ const {dk} = wNowMin(); return dk > q.dk ? {void: true} : {closed: 'Not available'}; }
  const {p, m} = x, xa = wElapsed(p.ea - p.ma, p.ea, m), xc = wElapsed(p.ec - p.mc, p.ec, m), aOn = m < p.ea, cOn = m < p.ec;
  if (!aOn && !cOn) return {done: p.ma > p.mc};
  if (!aOn && xc > xa) return {done: false};
  if (!cOn && xa > xc) return {done: true};
  const rnd = mkSeed(`rtm${q.a}-${q.c}-${q.ea}-${Math.floor(now / 60000)}`); let w = 0; const n = 600;
  // someone still going studies on for a while yet: typically what's left of a usual session, never nothing
  const more = (x, r) => -Math.log(1 - rnd()) * Math.max(8, typical(r) * Math.exp(.35 * gaussOf(rnd)) - x);
  for (let i = 0; i < n; i++){ const A = aOn ? xa + more(xa, p.ra) : xa, C = cOn ? xc + more(xc, p.rc) : xc; if (A > C) w++; }
  return {p: btClamp(w / n)};
}
// a player's minutes over a day, week or month: Yes once they reach T
function mkLbt(q, now){
  const days = mkPeriodDays(q.per, q.pk), today = dayKey(now), last = days[days.length - 1], cur = mkPerMin(q.w, days, now);
  if (cur >= q.T) return {done: true}; if (today > last) return {done: false};
  const d = mkRest(mkDayR(botRating(q.w)), now, days.filter(x => x > today).length);
  return {p: btClamp(1 - btPhi((q.T - cur - d.mu) / d.sd)), close: mkClose(last)};
}
function mkOtherEvents(now){
  const ev = [], today = dayKey(now), av = w => tnAv(w);
  // ranked: every live top match
  if (typeof wNowMin === 'function'){
    const {dk, m} = wNowMin(), w0 = Math.floor(m / 120) * 120;
    mkRkTopPairs().forEach(p => {
      const q = {mk: 'rtm', dk, w0, a: p.a, c: p.c, ea: p.ea, ec: p.ec}, xa = Math.round(wElapsed(p.ea - p.ma, p.ea, m)), xc = Math.round(wElapsed(p.ec - p.mc, p.ec, m));
      const st = (x, on) => `${x}m${on ? ' · studying' : ' · stopped'}`;
      ev.push({id: `rk|${p.a}-${p.c}-${p.ea}`, cat: 'rank', ic: 'vs', two: true, live: 1, watch: `data-watch="${p.a}-${p.c}"`, title: `${btName(p.a)} vs ${btName(p.c)}`, sub: `Ranked · ${rankOf(p.ra).full} vs ${rankOf(p.rc).full}`, closes: (() => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime() + Math.max(p.ea, p.ec) * 60000; })(),
        rows: [{q, label: btName(p.a), av: av(p.a), side: 'y', stat: st(xa, m < p.ea)}, {q, label: btName(p.c), av: av(p.c), side: 'n', stat: st(xc, m < p.ec)}]});
    });
  }
  // Elimination: every top game running
  mkElTops().forEach(L => {
    const f = elFacts(L, now); if (f.over || f.alive.length < 2) return;
    const alive = f.alive, rd = f.r + 1, watch = `data-mkwatch="${L.id}"`;
    const w0 = mkWin(now), nx = f.outs.some(([, o]) => o > w0 && o <= now) ? [] : alive.map(w => ({q: {mk: 'elnx', g: L.id, w, aft: w0}, label: `${btName(w)} goes out next`, av: av(w)}));
    const more = nx.concat(alive.map(w => ({q: {mk: 'els', g: L.id, w, rd}, label: `${btName(w)} survives round ${rd}`, av: av(w)})));
    if (f.sdI >= 0 && f.r < f.sdI) more.push({q: {mk: 'elsd', g: L.id}, label: 'Reaches sudden death'});
    ev.push({id: 'el|' + L.id, cat: 'elim', ic: 'elim', live: 1, watch, title: `Who wins ${L.name}?`, sub: `Elimination · ${L.players.length} players · round ${rd} · ${alive.length} left`, closes: f.end, rows: alive.map(w => ({q: {mk: 'elw', g: L.id, w}, label: btName(w), av: av(w)})), more, moreLabel: 'Who goes out next, survival and sudden death'});
  });
  // leaderboards
  const wk = dayKey(startOfWeek(new Date(now))), mo = today.slice(0, 7);
  [['d', F.today, 'today', today], ['w', F.week, 'this week', wk], ['m', F.month, 'this month', mo]].forEach(([per, fi, word, pk]) => {
    const days = mkPeriodDays(per, pk), set = mkTopBy(fi, 5).slice(), close = mkClose(days[days.length - 1]), lead = set[0];
    ev.push({id: 'lb|' + per + '|' + pk, cat: 'lb', ic: 'bars', title: `Who studies the most ${word}?`, sub: `Leaderboards · top ${set.length} right now`, closes: close,
      rows: set.map(w => ({q: {mk: 'lbw', per, pk, w, set}, label: btName(w), av: av(w), stat: mkHm(Math.round(mkPerMin(w, days, now)))}))});
    if (per !== 'd'){ const two = [set[0], set[1]], q = {mk: 'lbw', per, pk, w: set[0], set: two};
      ev.push({id: 'lb2|' + per + '|' + pk, cat: 'lb', ic: 'swap', two: true, title: `#1 vs #2 ${word}: who ends ahead?`, sub: `Leaderboards · Hours ${word}`, closes: close,
        rows: [{q, label: btName(two[0]), av: av(two[0]), side: 'y', stat: mkHm(Math.round(mkPerMin(two[0], days, now)))}, {q, label: btName(two[1]), av: av(two[1]), side: 'n', stat: mkHm(Math.round(mkPerMin(two[1], days, now)))}]}); }
    const cur = mkPerMin(lead, days, now), step = per === 'd' ? 60 : per === 'w' ? 300 : 1200, base = Math.ceil((cur + 1) / step) * step;
    ev.push({id: 'lbt|' + per + '|' + pk + '|' + lead, cat: 'lb', ic: 'clock', title: `How much will ${btName(lead)} study ${word}?`, sub: `Leaderboards · #1 ${word} · ${mkHm(Math.round(cur))} so far`, closes: close,
      rows: [0, 1, 2, 3, 4, 5].map(i => base + i * step).map(T => ({q: {mk: 'lbt', per, pk, w: lead, T}, label: `${mkHm(T)}+`}))});
  });
  return ev;
}
// the ranked top-1,000 Elimination games running now (the ones you can watch): the only Elimination games with markets
function mkElTops(){
  if (typeof elTop !== 'function') return [];
  try { return elTop(true, 999).map(x => x.L).filter(L => String(L.id)[0] === 'T' && L.rules.ranked); } catch(_){ return []; }
}

/* ---- the Markets page ---- */
const BT = {band: null, div: null};
const MK = {cat: 'all', sort: 'trend', kind: 'all', tab: 'buy', sheet: false, picked: false, view: null, sel: null, pick: null, coins: 100, msg: '', q: '', more: false, combo: store.get('fb.mkcombo', [])};
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
function mkSpark(pts){
  if (pts.length < 2) return '<p class="hint mk-nochart">The chart fills in as the day goes on.</p>';
  const W = 600, H = 170, x = i => (i / (pts.length - 1) * W).toFixed(1), y = p => (H - 6 - p * (H - 12)).toFixed(1);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(p)).join(''), last = pts[pts.length - 1];
  return `<div class="mk-chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 ${y(.5)}H${W}" class="mid"/><path d="${d}L${W} ${H}L0 ${H}Z" class="area"/><path d="${d}" class="ln"/></svg>
    <span class="mk-ax"><span>earlier</span><span>now · ${mkPct(last)}</span></span></div>`;
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
  const pts = [], step = q.w0 ? 1 : 6, from = q.w0 ? q.w0 - MK_WIN : 0; r.flow.es.forEach(([t, e], i) => { if (i % step || t < from) return; const p = mkSig(mkCrowdL(fairAt(t), e)); pts.push(side === 'n' ? 1 - p : p); });
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
    r.flow.trades.forEach(tr => { if (row.q.w0 && tr.t < row.q.w0 - MK_WIN) return; const py = mkSig(mkCrowdL(r.fair, tr.e)), c = Math.max(1, Math.min(99, Math.round((tr.yes ? py : 1 - py) * 100)));
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
function mkEvVol(ev, now){ const seen = new Set(); let v = 0; ev.rows.concat(ev.more || []).forEach(row => { const k = btKey(row.q); if (seen.has(k)) return; seen.add(k); try { const r = btPrice(row.q, now); if (r.flow) v += row.q.w0 ? r.flow.trades.filter(t => t.t >= row.q.w0).reduce((x, t) => x + t.n, 0) : r.flow.vol; } catch(_){} }); return v; }
function mkSumHtml(Q, n, cost){
  const row = (k, l, v, cls = '') => `<span><span>${l}</span><b data-s="${k}" class="${cls}">${v}</b></span>`;
  return `<div class="mk-tsum" data-mk-sum>${row('n', 'Contracts', n.toLocaleString())}${row('avg', 'Average price', n ? Math.round(cost / n) + '¢' : '–')}${row('cost', 'Cost', cost.toLocaleString())}${Q.combo ? '' : row('after', 'Price after you buy', n ? mkPct(Q.after(n)) : '–')}${row('pay', 'Pays if right', (n * 100).toLocaleString(), 'win')}</div>`;
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
    const what = b.mk === 'combo' ? 'Combo' : btPickWhat(b, b.side);
    const legs = b.mk === 'combo' ? `<ul class="mk-legl">${b.legs.map((l, i) => { const r = btPrice(l.q, now), right = r.done != null ? r.done === (l.side === 'y') : null, p = r.p != null ? (l.side === 'y' ? r.p : 1 - r.p) : null;
      return `<li><i class="mk-lst ${right === true ? 'won' : right === false ? 'lost' : ''}">${right === true ? mkIc('check') : right === false ? mkIc('x') : p != null ? mkPct(p) : '–'}</i><button class="mk-goto" data-mk="goto" data-id="${b.id}" data-leg="${i}"><b>${esc(btPickWhat(l.q, l.side))}</b> · ${esc(btTitle(l.q))}</button><button class="mk-gob" data-mk="goto" data-id="${b.id}" data-leg="${i}" aria-label="Go to this market">${mkIc('back', 'fl')}</button></li>`; }).join('')}</ul>` : '';
    const head = b.mk === 'combo' ? `<b>Combo</b> · ${b.legs.length} picks, all have to be right` : `<button class="mk-goto" data-mk="goto" data-id="${b.id}"><b>${esc(what)}</b> · ${esc(btTitle(b))}${mkIc('back', 'fl')}</button>`;
    return `<li class="mk-pos"><span class="mk-cic">${mkIc(MK_KIND_IC[b.mk] || 'grid')}</span><span class="mk-pt">${head}${legs}<small>${b.n.toLocaleString()} at ${b.price}¢ · cost ${b.cost.toLocaleString()} · pays ${(b.n * 100).toLocaleString()}</small></span>${right}</li>`;
  };
  const openH = open.map(row).join(''), doneH = done.map(row).join('');
  return `<div class="mk-pf"><div class="mk-pfs"><span>${mkIc('wallet')}<b>${coTotals().balance.toLocaleString()}</b><small>coins to spend</small></span><span>${mkIc('grid')}<b>${value.toLocaleString()}</b><small>open positions are worth</small></span><span>${mkIc('trend')}<b class="${net >= 0 ? 'win' : 'lose'}">${net >= 0 ? '+' : ''}${net.toLocaleString()}</b><small>won or lost on settled markets</small></span></div>
    ${open.length ? `<div class="mk-sh">Open · ${open.length}</div><ul class="mk-list">${openH}</ul>` : ''}${done.length ? `<div class="mk-sh">Settled</div><ul class="mk-list">${doneH}</ul>` : ''}
    ${all.length ? '' : `<div class="mk-empty">${mkIc('wallet')}<p>No positions yet. Buy an answer on any market.</p></div>`}</div>`;
}
const MK_EMPTY = {lb: 'No leaderboard markets right now.', tour: 'No tournament markets right now. Rounds run Monday to Friday, and Monday’s opens on the weekend.', rank: 'No top ranked matches are live right now. They show up here (and under Top matches) when two top-1,000 players are mid-match.', elim: 'No top Elimination games are running right now. A new one starts every few minutes.'};
// open the market a position is in, with that answer picked in the ticket (on the Sell tab when you still hold it)
function mkGoto(q, side, holding){
  const now = Date.now(), key = btKey(q);
  if (q.wk != null && q.band != null && !MKX.has(q.mk)){ BT.band = q.band; BT.div = q.div || null; }
  let ev = null, row = null;
  try { for (const e of mkEvents(now)){ const rows = e.rows.concat(e.more || []), r = rows.find(x => btKey(x.q) === key && (!x.side || x.side === side)) || rows.find(x => btKey(x.q) === key); if (r){ ev = e; row = r; break; } } } catch(err){ console.error('markets', err); }
  if (!ev){ toast('That market isn’t on the board anymore.'); return; }
  const other = row.side ? ev.rows.find(x => x !== row && btKey(x.q) === key) : null;
  MK.view = ev.id; MK.sel = mkRowKey(row); MK.more = !ev.rows.includes(row);
  MK.pick = {key, side, q: row.q, ly: row.side ? (row.side === 'y' ? row.label : other && other.label) : row.label, ln: row.side ? (row.side === 'n' ? row.label : other && other.label) : row.label, t: ev.title};
  MK.picked = true; MK.tab = holding ? 'sell' : 'buy'; MK.msg = ''; window.scrollTo(0, 0);
}
// the combo you're building: shown as a bar at the bottom, and in full with its own ticket
function mkComboQ(){ return {mk: 'combo', legs: MK.combo.map(l => ({q: l.q, side: l.side}))}; }
function mkComboBar(now){
  if (!MK.combo.length || MK.view === 'combo') return '';
  let p = 1; MK.combo.forEach(l => { const r = btPrice(l.q, now); p *= r.p != null ? (l.side === 'y' ? r.p : 1 - r.p) : 0; });
  return `<div class="mk-cbar">${mkIc('layers')}<span><b>Combo · ${MK.combo.length} pick${MK.combo.length === 1 ? '' : 's'}</b><small>${MK.combo.length < 2 ? 'Add 1 more pick' : `${mkPct(p)} chance if every pick is right`}</small></span><button class="btn primary sm" data-mk="combo">Review</button><button class="small-btn" data-mk="clrc">Clear</button></div>`;
}

/* ---- the Markets page, laid out like Kalshi: a live strip on top, categories on the left, the market list in the
   middle, and a trade ticket (with Combo) always open on the right ---- */
const KX_CATS = [['all', 'All', 'grid'], ['fast', 'Fast · 15 min', 'bolt'], ['tour', 'Tournament', 'trophy'], ['rank', 'Ranked', 'shield'], ['elim', 'Elimination', 'elim'], ['lb', 'Leaderboards', 'bars']];
const KX_KINDS = [['all', 'All'], ['games', 'Head to head'], ['futures', 'Futures'], ['props', 'Props']];
const KX_GAMES = new Set(['match', 'h2h', 'spr', 'elw', 'rkm', 'elnx', 'rtm']), KX_FUT = new Set(['out', 'reach', 'lbw', 'rkr', 'rkn']);
const kxKind = ev => { const mk = ev.rows[0].q.mk; return KX_GAMES.has(mk) ? 'games' : KX_FUT.has(mk) ? 'futures' : 'props'; };
const kxHue = w => w == null ? null : w === ME ? 'var(--accent)' : `hsl(${bot(w).hue} 62% 50%)`;
const kxWho = q => q.mk === 'match' || q.mk === 'h2h' ? null : q.w != null ? q.w : q.mk === 'spr' && q.o !== 't' ? (q.o === 'a' ? q.a : q.b) : null;
const kxMult = c => c > 0 ? (100 / c).toFixed(c >= 50 ? 2 : 1).replace(/\.?0+$/, '') + 'x' : '';
const kxCd = t => `<span class="kx-cd" data-cd="${t}">${kxCdTxt(t)}</span>`;
function kxCdTxt(t){ const s = Math.max(0, Math.round((t - Date.now()) / 1000)); if (s >= 3600) return mkClock(t); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`; }
// one answer as a row: name with a bar as long as its chance, a stat, the payout and the chance to tap
function kxRow(ev, row, now, opts = {}){
  const info = mkRowPrice(row, now), yp = info.yp, side = row.side || 'y', Q = info.r.p != null ? mkQuoteR(info.r, row.q, side) : null, c = Q ? Q.buy(1) : 0;
  const why = btBlocked(row.q, side, info.B), mv = yp != null ? mkMove(mkRowKey(row), yp) : 0;
  if (info.r.fair != null && MKX.has(row.q.mk)) mkRec(btKey(row.q), info.r.fair, now);
  const who = row.side ? (row.side === 'y' ? row.q.a : row.q.b) : kxWho(row.q), col = kxHue(who) || (opts.i ? 'var(--muted)' : '#1fbf75');
  const pct = yp != null ? mkPct(yp) : info.r.done != null ? (info.r.done === (row.side !== 'n') ? 'Yes' : 'No') : '–';
  const on = MK.pick && MK.pick.key === btKey(row.q) && MK.pick.side === side;
  const btn = yp == null || info.r.closed || why ? `<span class="kx-pct off" title="${esc(why || info.r.closed || '')}">${pct}</span>`
    : `<button class="kx-pct${on ? ' on' : ''}" data-mk="pick" ${kxPickAttrs(ev, row, side)}>${pct}</button>`;
  return `<div class="kx-row${opts.big && mkRowKey(row) === MK.sel ? ' sel' : ''}"><span class="kx-nm">${row.av || ''}<span><span class="kx-lb">${esc(row.label)}</span><i class="kx-bar" style="width:${Math.round((yp || 0) * 100)}%;background:${col}"></i></span></span>
    <span class="kx-st">${row.stat ? esc(row.stat) : ''}${mkMoveHtml(mv)}</span><span class="kx-x">${Q ? kxMult(c) : ''}</span>${opts.big ? `<span class="mk-bb">${mkBuyBtn(row, 'y', info, ev.id)}${row.side || mkSelfRow(row.q) ? '' : mkBuyBtn(row, 'n', info, ev.id)}</span>` : btn}</div>`;
}
function kxPickAttrs(ev, row, side){
  const two = row.side != null, other = two ? ev.rows.find(r => r !== row && btKey(r.q) === btKey(row.q)) : null;
  const ly = two ? (row.side === 'y' ? row.label : other && other.label) : row.label, ln = two ? (row.side === 'n' ? row.label : other && other.label) : row.label;
  return `data-ev="${esc(ev.id)}" data-q='${esc(JSON.stringify(row.q))}' data-side="${side}" data-ly="${esc(ly || '')}" data-ln="${esc(ln || '')}" data-t="${esc(ev.title)}"`;
}
function kxCard(ev, now){
  const rows = ev.two || ev.fast ? ev.rows : ev.rows.map(row => ({row, info: mkRowPrice(row, now)})).filter(x => x.info.r.p != null).sort((a, b) => b.info.yp - a.info.yp).slice(0, 3).map(x => x.row);
  const n = ev.rows.length + (ev.more ? ev.more.length : 0) - (ev.two ? 1 : 0);
  return `<article class="kx-card" data-mk="open" data-ev="${esc(ev.id)}" tabindex="0"><header><span class="kx-ic">${mkIc(ev.ic)}</span><div><b>${esc(ev.title)}</b><small>${ev.live ? '<em class="kx-live">LIVE</em>' : ''}${esc(ev.sub)}</small></div>${ev.fast ? kxCd(ev.closes) : ''}${ev.watch ? `<button class="kx-watch" ${ev.watch}>${mkIc('eye')}Watch</button>` : ''}</header>
    ${rows.map((row, i) => kxRow(ev, row, now, {i})).join('') || '<p class="hint">Nothing left to trade here.</p>'}
    <footer><span>${mkVol(mkEvVol(ev, now))} traded ${ev.fast ? 'this window' : 'today'}</span><span>${ev.fast ? '' : `${mkIc('clock')}Closes ${mkClock(ev.closes)}`}${n > rows.length ? ` · ${n} markets` : ''}</span></footer></article>`;
}
// the live strip: two-answer markets happening now
function kxStrip(evs, now){
  const live = evs.filter(ev => ev.two || ev.cat === 'fast' && ev.rows.length > 1 || ev.rows[0].q.mk === 'elw').slice(0, 12);
  if (!live.length) return '';
  return `<div class="kx-strip">${live.map(ev => { const rs = ev.rows.map(r => ({r, i: mkRowPrice(r, now)})).filter(x => x.i.yp != null).sort((a, b) => ev.two ? 0 : b.i.yp - a.i.yp).slice(0, 2);
    return `<button class="kx-sc" data-mk="open" data-ev="${esc(ev.id)}"><small>${ev.fast ? `<em class="kx-live">SPRINT</em>${kxCd(ev.closes)}` : ev.live || ev.closes - now < 864e5 ? `<em class="kx-live">LIVE</em>${esc(ev.sub.split(' · ')[0])}` : esc(mkClock(ev.closes))}</small>
      ${rs.map(x => `<span>${x.r.av || ''}<b>${esc(x.r.label)}</b><i>${mkPct(x.i.yp)}</i></span>`).join('')}</button>`; }).join('')}</div>`;
}
function kxNav(evs, nOpen){
  const cnt = c => c === 'all' ? evs.length : evs.filter(e => e.cat === c).length;
  return `<nav class="kx-nav"><div class="kx-nl">Markets</div>${KX_CATS.map(([k, l, ic]) => `<button data-mk="cat" data-v="${k}" class="${MK.cat === k && !MK.view ? 'on' : ''}">${mkIc(ic)}<span>${l}</span><i>${cnt(k)}</i></button>`).join('')}
    <div class="kx-nl">You</div><button data-mk="cat" data-v="pos" class="${MK.cat === 'pos' && !MK.view ? 'on' : ''}">${mkIc('wallet')}<span>Portfolio</span>${nOpen ? `<i>${nOpen}</i>` : ''}</button>
    <div class="kx-bal"><svg class="co-ic" viewBox="0 0 24 24" aria-hidden="true">${CO_IC}</svg><b>${coTotals().balance.toLocaleString()}</b><small>coins</small></div></nav>`;
}
// the trade ticket: buy or sell, Yes or No, the coins, the chance and the payout
function kxTicket(now){
  const pk = MK.pick;
  if (!pk) return `<div class="kx-tk empty">${mkIc('grid')}<p>Tap a chance on any market to trade it here.</p></div>`;
  const combo = pk.q.mk === 'combo', r = btPrice(pk.q, now);
  if (r.p == null || r.closed) return `<div class="kx-tk empty"><p>${r.done != null ? 'That market has settled.' : 'That market just closed.'}</p></div>`;
  const two = pk.q.mk === 'match' || pk.q.mk === 'h2h', lab = s => two ? (s === 'y' ? pk.ly : pk.ln) || btPickWhat(pk.q, s) : s === 'y' ? 'Yes' : 'No';
  const qy = mkQuoteR(r, pk.q, 'y'), qn = mkQuoteR(r, pk.q, 'n'), Q = pk.side === 'y' ? qy : qn, coins = Math.max(0, Math.floor(+MK.coins || 0)), n = mkMaxN(Q, coins), cost = n ? Q.buy(n) : 0;
  const byY = btBlocked(pk.q, 'y', (btCtx(pk.q, now) || {}).B), byN = btBlocked(pk.q, 'n', (btCtx(pk.q, now) || {}).B);
  const mine = combo ? [] : Object.values(btBets()).filter(b => b.st === 'open' && btKey(b) === pk.key);
  const inCombo = MK.combo.some(l => btKey(l.q) === pk.key), canCombo = !combo && (inCombo || MK.combo.length < 6);
  const tabs = `<div class="kx-tabs"><button type="button" data-mk="tab" data-v="buy" class="${MK.tab !== 'sell' ? 'on' : ''}">Buy</button><button type="button" data-mk="tab" data-v="sell" class="${MK.tab === 'sell' ? 'on' : ''}">Sell${mine.length ? ` · ${mine.length}` : ''}</button><span>Coins</span></div>`;
  const head = `<div class="kx-th"><small>${esc(combo ? 'Your combo' : pk.t || btTitle(pk.q))}</small><b>${esc(combo ? `Combo · ${pk.q.legs.length} picks` : two ? lab(pk.side) : pk.ly || btTitle(pk.q))}</b></div>`;
  if (MK.tab === 'sell' && !combo){
    return `<div class="kx-tk">${tabs}${head}${mine.length ? `<ul class="kx-sell">${mine.map(b => { const v = mkQuoteR(r, b, b.side).sell(b.n); return `<li><span><b>${b.n.toLocaleString()} ${esc(btPickWhat(b, b.side))}</b><small>bought at ${b.price}¢ · cost ${b.cost.toLocaleString()}</small></span><button class="btn primary sm" data-mk="sell" data-id="${b.id}">Sell for ${v.toLocaleString()}</button></li>`; }).join('')}</ul>` : '<p class="hint">You don’t own any of this market yet.</p>'}</div>`;
  }
  const sideBtn = (s, q, why) => `<button type="button" class="kx-yn ${s === 'y' ? 'y' : 'n'}${pk.side === s ? ' on' : ''}" data-mk="tside" data-side="${s}" ${why ? `disabled title="${esc(why)}"` : ''}>${esc(lab(s))} ${why ? '–' : q.buy(1) + '¢'}</button>`;
  return `<form class="kx-tk mk-ticket">${tabs}${head}
    ${combo ? '' : `<div class="kx-yns">${sideBtn('y', qy, byY)}${sideBtn('n', qn, byN)}</div>`}
    <label class="kx-amt"><span>Coins</span><input type="number" min="1" step="1" value="${coins || ''}" placeholder="0" inputmode="numeric" data-mk="coins"></label>
    <span class="mk-quick">${[100, 500, 1000, 5000].map(v => `<button type="button" class="small-btn" data-mk="amt" data-v="${v}">${v.toLocaleString()}</button>`).join('')}<button type="button" class="small-btn" data-mk="amt" data-v="max">Max</button></span>
    <div class="kx-odds"><span>Odds</span><b>${mkPct(Q.p)} chance</b></div>
    ${mkSumHtml(Q, n, cost)}
    <button class="kx-go mk-go" data-price="${Q.buy(1)}">${n ? `Buy ${n.toLocaleString()} for ${cost.toLocaleString()} coins` : 'Enter an amount'}</button>
    ${canCombo ? `<button type="button" class="kx-addc" data-mk="addc">${mkIc(inCombo ? 'check' : 'layers')}${inCombo ? 'In your combo · update pick' : 'Add to combo'}</button>` : ''}
    ${MK.msg ? `<p class="mk-msg">${esc(MK.msg)}</p>` : ''}<p class="hint">Pays 100 coins a contract if you’re right. Your trade moves the price, so bigger trades cost more per contract. 1 coin fee per contract.</p></form>`;
}
function kxSide(now){
  return `<aside class="kx-side${MK.sheet ? ' open' : ''}"><button class="kx-combo${MK.view === 'combo' ? ' on' : ''}" data-mk="combo">${mkIc('layers')}Combo${MK.combo.length ? ` · ${MK.combo.length}` : ''}</button>
    <button class="kx-close" data-mk="sheetx" aria-label="Close">${mkIc('x')}</button>${kxTicket(now)}</aside>`;
}
function kxDetail(ev, now){
  const all = ev.rows.concat(MK.more && ev.more ? ev.more : []), sel = all.find(r => mkRowKey(r) === MK.sel) || all[0]; MK.sel = mkRowKey(sel);
  return `<button class="kx-back" data-mk="back">${mkIc('back')}All markets</button>
    <div class="kx-dh"><span class="kx-ic lg">${mkIc(ev.ic)}</span><div><small>${ev.live ? '<em class="kx-live">LIVE</em>' : ''}${esc(ev.sub)}</small><h2>${esc(ev.title)}</h2>${ev.watch ? `<button class="kx-watch big" ${ev.watch}>${mkIc('eye')}Watch live</button>` : ''}<small>${ev.fast ? kxCd(ev.closes) : `${mkIc('clock')}Closes ${mkClock(ev.closes)}`} · ${mkVol(mkEvVol(ev, now))} traded today</small></div></div>
    <div class="kx-panel"><div class="mk-sl">${sel.av || ''}<b>${esc(sel.label)}</b><small>price · ${sel.q.w0 ? 'this window' : 'last 24 hours'}</small></div>${mkSpark(mkHistory(sel.q, sel.side || 'y', now).pts)}</div>
    <div class="kx-panel kx-list">${all.map(row => kxRow(ev, row, now, {big: 1})).join('')}</div>
    ${ev.more && ev.more.length ? `<button class="small-btn mk-moreb" data-mk="more">${mkIc('grid')}${MK.more ? 'Fewer markets' : `${ev.moreLabel || 'More on this match: margins and totals'} (${ev.more.length})`}</button>` : ''}
    <div class="kx-panel"><b class="kx-ph">${mkIc('trend')}Recent trades</b>${mkTradesHtml(mkTrades(all, now), now)}</div>
    <div class="kx-panel"><b class="kx-ph">Rules</b><p>${esc(btRules(sel.q))}</p><p class="hint">Prices are set by trading. Other players trade here all day (slower overnight), going on what they can see, and they don’t always get it right. Your trades move the price too.</p></div>`;
}
function kxComboMain(now){
  const legs = MK.combo;
  if (legs.length >= 2){ const q = mkComboQ(); MK.pick = {key: btKey(q), side: 'y', q}; } else if (MK.pick && MK.pick.q.mk === 'combo') MK.pick = null;
  let p = 1; const rows = legs.map((l, i) => { const r = btPrice(l.q, now), x = r.p != null ? (l.side === 'y' ? r.p : 1 - r.p) : null; p *= x || 0;
    return `<div class="kx-row"><span class="kx-nm"><span class="kx-ic">${mkIc(MK_KIND_IC[l.q.mk] || 'grid')}</span><span><span class="kx-lb"><b>${esc(btPickWhat(l.q, l.side))}</b> · ${esc(btTitle(l.q))}</span>${r.closed && r.done == null ? `<small class="hint">${esc(r.closed)}</small>` : ''}</span></span><span class="kx-st"></span><span class="kx-x"></span><button class="small-btn" data-mk="rmc" data-i="${i}">${mkIc('x')}Remove</button></div>`; }).join('');
  return `<button class="kx-back" data-mk="back">${mkIc('back')}All markets</button>
    <div class="kx-dh"><span class="kx-ic lg">${mkIc('layers')}</span><div><small>Combo</small><h2>Your combo · ${legs.length} pick${legs.length === 1 ? '' : 's'}</h2><small>${legs.length >= 2 ? `${mkPct(p)} chance every pick is right` : 'Add at least 2 picks from different markets'}</small></div></div>
    ${legs.length ? `<div class="kx-panel kx-list">${rows}</div>` : `<div class="mk-empty">${mkIc('layers')}<p>Your combo is empty. Tap a chance on any market, then Add to combo.</p></div>`}
    <div class="kx-panel"><b class="kx-ph">How combos work</b><p>A combo pays 100 coins a contract only if every pick is right. Its chance is the picks’ chances multiplied, so it pays far more than any one pick, and one wrong pick loses it all. It settles No the moment a pick is wrong, and if a pick is cancelled you get your coins back.</p></div>`;
}
function mkRender(){
  mkRender.at = Date.now();
  const box = $('#mkBody'); if (!box || $('#page-markets').hidden) return;
  if (typeof RK_READY === 'undefined' || !RK_READY){ if (!box.firstChild) box.innerHTML = '<p class="hint">Loading markets…</p>'; return; }
  if ((!LF.pairs || !LF.pairs.length) && typeof lfPrep === 'function' && Date.now() - (mkRender.prep || 0) > 4000){ mkRender.prep = Date.now(); lfPrep().then(ok => { if (ok !== false && typeof renderLive === 'function'){ try { renderLive(true); } catch(_){} } setTimeout(mkRender, 300); }); }
  const now = Date.now(); let evs = []; try { evs = mkEvents(now); } catch(err){ console.error('markets', err); }
  const nOpen = Object.values(btBets()).filter(b => b.st === 'open').length;
  let main = '';
  if (MK.view === 'combo') main = kxComboMain(now);
  else if (MK.view){ const ev = evs.find(x => x.id === MK.view); if (ev) main = kxDetail(ev, now); else MK.view = null; }
  if (!main && MK.cat === 'pos') main = `<div class="kx-h"><h2>Portfolio</h2></div>${mkPortfolioHtml(now)}`;
  if (!main){
    let list = MK.cat === 'all' ? evs : evs.filter(ev => ev.cat === MK.cat);
    if (MK.q){ const s = MK.q.toLowerCase(); list = list.filter(ev => (ev.title + ' ' + ev.rows.map(r => r.label).join(' ')).toLowerCase().includes(s)); }
    const kinds = {all: list.length}; list.forEach(ev => { const k = kxKind(ev); kinds[k] = (kinds[k] || 0) + 1; });
    if (MK.kind !== 'all') list = list.filter(ev => kxKind(ev) === MK.kind);
    const score = ev => ev.rows.reduce((n, r) => { const i = mkRowPrice(r, now); return Math.max(n, i.yp != null ? Math.abs(mkMove(mkRowKey(r), i.yp)) + (i.yp > .15 && i.yp < .85 ? 3 : 0) + (ev.two || ev.fast ? 2 : 0) : 0); }, 0);
    if (MK.sort === 'soon') list = list.slice().sort((a, b) => a.closes - b.closes);
    else if (MK.sort === 'vol') list = list.map(ev => [ev, mkEvVol(ev, now)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    else list = list.map(ev => [ev, score(ev)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    if (!MK.pick && !MK.picked){ for (const ev of list){ const row = ev.rows.find(r => { const i = mkRowPrice(r, now); return i.yp != null && !i.r.closed && !btBlocked(r.q, r.side || 'y', i.B); }); if (row){ const other = ev.two ? ev.rows.find(r => r !== row && btKey(r.q) === btKey(row.q)) : null; MK.pick = {key: btKey(row.q), side: row.side || 'y', q: row.q, ly: row.side ? (row.side === 'y' ? row.label : other && other.label) : row.label, ln: row.side ? (other && other.label) : row.label, t: ev.title}; break; } } }
    const name = (KX_CATS.find(c => c[0] === MK.cat) || KX_CATS[0])[1];
    main = `<div class="kx-h"><h2>${MK.cat === 'all' ? 'Markets' : esc(name)}</h2><label class="kx-search">${mkIc('search')}<input type="search" placeholder="Search" value="${esc(MK.q)}" data-mk="search"></label>
      <select class="kx-sort" data-mk="sort">${[['trend', 'Trending'], ['soon', 'Ending soon'], ['vol', 'Most traded']].map(([k, l]) => `<option value="${k}"${MK.sort === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="kx-pills">${KX_KINDS.filter(([k]) => k === 'all' || kinds[k]).map(([k, l]) => `<button data-mk="kind" data-v="${k}" class="${MK.kind === k ? 'on' : ''}">${l} (${kinds[k] || 0})</button>`).join('')}</div>`;
    if (MK.cat === 'tour'){ const v = btView(now), own = tnEntry(v.wk); main += `<div class="mk-where">${mkIc('trophy')}<span>Bracket</span>${TN_BANDS.map((b, i) => `<button class="chip${i === v.band ? ' on' : ''}" data-mk="band" data-v="${i}">${esc(b[2])}</button>`).join('')}
      <form class="mk-divf"><label>Division <input type="number" min="1" max="${tnDivCount(v.band, v.wk)}" value="${v.div || ''}" inputmode="numeric"></label><button class="small-btn">Go</button>${own ? '<button type="button" class="small-btn" data-mk="mine">Mine</button>' : ''}</form></div>`; }
    main += list.length ? `<div class="kx-cards">${list.slice(0, MK.cat === 'all' ? 30 : 80).map(ev => kxCard(ev, now)).join('')}</div>` : `<div class="mk-empty">${mkIc('grid')}<p>${MK.q ? 'No markets match that.' : (MK_EMPTY[MK.cat] || 'No markets open right now.')}</p></div>`;
    const tape = []; list.slice(0, 12).forEach(ev => mkTrades(ev.rows, now, 3).forEach(x => tape.push({...x, ev: ev.title})));
    tape.sort((a, b) => b.t - a.t); if (tape.length) main += `<div class="kx-panel"><b class="kx-ph">${mkIc('trend')}Live trades</b>${mkTradesHtml(tape.slice(0, 8), now, true)}</div>`;
    main += `<p class="hint mk-foot">Prices are set by trading: other players trade every market all day (slower overnight), and your trades move prices too.</p>`;
  }
  const cats = `<div class="kx-mcats">${KX_CATS.concat([['pos', 'Portfolio', 'wallet']]).map(([k, l, ic]) => `<button data-mk="cat" data-v="${k}" class="${MK.cat === k && !MK.view ? 'on' : ''}">${mkIc(ic)}${l}</button>`).join('')}</div>`;
  domMorph(box, `<div class="kx">${kxStrip(evs, now)}${cats}<div class="kx-cols">${kxNav(evs, nOpen)}<div class="kx-main">${main}</div>${kxSide(now)}</div>${mkComboBar(now)}</div>`);
}
setInterval(() => { const els = document.querySelectorAll('#mkBody [data-cd]'); els.forEach(el => { el.textContent = kxCdTxt(+el.dataset.cd); }); const pg = $('#page-markets'); if (pg && !pg.hidden && Date.now() - (mkRender.at || 0) > 5000 && [...els].some(el => +el.dataset.cd <= Date.now()) && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#mkBody form, .kx-search'))) mkRender(); }, 1000);

document.addEventListener('click', ev => {
  const go = ev.target.closest && ev.target.closest('[data-mk-go]'); if (go){ ev.preventDefault(); MK.cat = go.dataset.mkGo; MK.view = null; showPage('markets'); return; }
  if (ev.target.closest && ev.target.closest('#mkBody [data-watch]')) return;      // ranked: the watch room opens it
  const ew = ev.target.closest && ev.target.closest('#mkBody [data-mkwatch]');
  if (ew){ ev.preventDefault(); const L = elOfId(ew.dataset.mkwatch); if (L){ EL.watch = {L, me: {ev: []}, chat: [], q: []}; EL.view = 'watch'; showPage('elim'); if (typeof elRender === 'function') elRender(); } return; }
  const a = ev.target.closest && ev.target.closest('[data-mk]'); if (!a || !a.closest('#mkBody')) return;
  const k = a.dataset.mk; if (k === 'coins' || k === 'search' || k === 'sort') return;
  ev.preventDefault();
  if (k === 'cat'){ MK.cat = a.dataset.v; MK.view = null; MK.kind = 'all'; if (MK.pick && MK.pick.q.mk === 'combo') MK.pick = null; }
  else if (k === 'kind') MK.kind = a.dataset.v;
  else if (k === 'tab') MK.tab = a.dataset.v;
  else if (k === 'tside' && MK.pick){ MK.pick.side = a.dataset.side; MK.msg = ''; }
  else if (k === 'sheetx') MK.sheet = false;
  else if (k === 'open'){ MK.view = a.dataset.ev; MK.sel = null; MK.more = false; window.scrollTo(0, 0); }
  else if (k === 'back'){ MK.view = null; if (MK.pick && MK.pick.q.mk === 'combo') MK.pick = null; }
  else if (k === 'sel') MK.sel = a.dataset.k;
  else if (k === 'more') MK.more = !MK.more;
  else if (k === 'pick'){ const q = JSON.parse(a.dataset.q), key = btKey(q), side = a.dataset.side, two = q.mk === 'match' || q.mk === 'h2h';
    if (MK.view && MK.view !== 'combo') MK.sel = key + (two ? side : '');
    MK.pick = {key, side, q, ly: a.dataset.ly, ln: a.dataset.ln, t: a.dataset.t}; MK.picked = true; MK.sheet = true; MK.tab = 'buy'; MK.msg = ''; }
  else if (k === 'goto'){ const b = btBets()[a.dataset.id]; if (b){ const leg = a.dataset.leg != null ? b.legs[+a.dataset.leg] : null; mkGoto(leg ? leg.q : b, leg ? leg.side : b.side, !leg && b.st === 'open'); } }
  else if (k === 'amt') MK.coins = a.dataset.v === 'max' ? Math.max(0, coTotals().balance) : +a.dataset.v;
  else if (k === 'cancel'){ MK.pick = null; MK.picked = true; MK.sheet = false; MK.msg = ''; }
  else if (k === 'addc' && MK.pick){ const key = btKey(MK.pick.q), i = MK.combo.findIndex(l => btKey(l.q) === key); if (i >= 0) MK.combo[i].side = MK.pick.side; else if (MK.combo.length < 6) MK.combo.push({q: MK.pick.q, side: MK.pick.side}); mkSaveCombo(); toast(`Combo · ${MK.combo.length} pick${MK.combo.length === 1 ? '' : 's'}`); }
  else if (k === 'combo'){ MK.view = 'combo'; MK.msg = ''; MK.tab = 'buy'; window.scrollTo(0, 0); }
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
  const n = mkMaxN(Q, MK.coins), cost = n ? Q.buy(n) : 0, box = document.querySelector('#mkBody [data-mk-sum]'); if (box) box.outerHTML = mkSumHtml(Q, n, cost);
  const go = document.querySelector('#mkBody .kx-go'); if (go) go.textContent = n ? `Buy ${n.toLocaleString()} for ${cost.toLocaleString()} coins` : 'Enter an amount';
});
document.addEventListener('change', ev => { const s = ev.target.closest && ev.target.closest('#mkBody [data-mk="sort"]'); if (s){ MK.sort = s.value; mkRender(); } });
document.addEventListener('submit', ev => {
  const f = ev.target.closest && ev.target.closest('#mkBody form'); if (!f) return;
  ev.preventDefault();
  if (f.classList.contains('mk-divf')){ const n = Math.floor(+f.querySelector('input').value || 0), v = btView(Date.now()); if (n >= 1 && n <= tnDivCount(v.band, v.wk)){ BT.div = n; BT.band = v.band; } mkRender(); return; }
  if (!MK.pick) return;
  const r = btTrade(MK.pick.q, MK.pick.side, MK.coins, +f.querySelector('[data-price]').dataset.price);
  if (r.moved) MK.msg = `The price moved to ${r.moved}¢. Press Buy again to take it.`;
  else if (r.err) MK.msg = r.err;
  else { toast(`Bought ${r.n.toLocaleString()} contract${r.n === 1 ? '' : 's'} for ${r.cost.toLocaleString()} coins`); if (MK.pick.q.mk === 'combo'){ MK.combo = []; mkSaveCombo(); MK.view = null; MK.cat = 'pos'; MK.pick = null; } MK.msg = ''; MK.sheet = false; }
  mkRender();
});
{ const _s = onPageShown; onPageShown = function(name){ const x = _s.apply(this, arguments); if (name === 'markets'){ try { btSettle(); } catch(e){ console.error(e); } mkRender(); } return x; }; }
setInterval(() => { if (typeof RK_READY === 'undefined' || !RK_READY || document.hidden) return; try { btSettle(); } catch(e){ console.error('markets', e); } const pg = $('#page-markets'); if (pg && !pg.hidden && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#mkBody form, .mk-search'))) mkRender(); }, 60000);
(function btStart(){ if (typeof RK_READY === 'undefined' || !RK_READY) return setTimeout(btStart, 3000); try { btSettle(); } catch(e){ console.error('markets', e); } })();
