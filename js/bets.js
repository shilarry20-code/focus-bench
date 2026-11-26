/* ---------- Tournament markets (Kalshi-style) ----------
   Every market is a Yes/No question about this week's tournament, priced from 1 to 99 coins. A contract pays 100 coins
   if you're right and nothing if you're wrong, so the price reads as the percent chance. You can sell a position back
   before it settles, at the current Sell price.
     Matches   Will A beat B in today's round?            (buy A or buy B)
     Minutes   Will A study 120+ minutes today?           (a ladder of thresholds per player)
     Winner    Will A win the tournament?                  (one row per player still in)
   Chances never look at anyone's own study history (real people change their habits). They use only what's on the
   board: the two ratings, each player's minutes so far today, and how much of a typical study day is left, from one
   fixed day-curve that is the same for everyone. Buy prices sit 2 coins above the chance and sell prices 2 below.
   Trading on a round closes at 11 PM that day; a market closes early only when its answer can no longer change.
   You can't trade against yourself: in your own bracket you can only back yourself.
   Positions live in the coin store (CO.bets) and sync with it. */

const BT_MAX = 5000, BT_SPREAD = 2, BT_CLOSE = 23 * 60, BT_SIMS = 1500, BT_SD = 110, BT_DRIFT = 45;
const BT_TIERS = [30, 60, 90, 120, 180, 240, 300, 360];
const BT_BAND_DAY = [110, 160, 220];     // a typical study day by rank band, used only for the Minutes ladder

// how study is spread over a typical day, the same for everyone (share of the day's minutes in each hour)
const BT_W = [5, 3, 1, 1, 1, 1, 1, 2, 3, 5, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 6, 5];
const BT_WS = BT_W.reduce((a, b) => a + b, 0);
function btLeft(nowMin){ if (nowMin == null) return 1; const h = Math.floor(nowMin / 60), part = 1 - (nowMin % 60) / 60; let s = BT_W[h] * part; for (let i = h + 1; i < 24; i++) s += BT_W[i]; return s / BT_WS; }
const btPhi = x => { const t = 1 / (1 + .3275911 * Math.abs(x) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x / 2); return x >= 0 ? (1 + y) / 2 : (1 - y) / 2; };
const btElo = (ra, rb) => 1 / (1 + Math.pow(10, (rb - ra) / 400));
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
// a player's minutes on round day k as of minute-of-day `at` (null: the whole day)
function btMinAt(e, w, k, at){ const dk = tnDayKey(e.wk, k); return w === ME ? tnLogMin(dk, at) + (at == null || at >= btNowMin(Date.now()) ? tnLiveMin() : 0) : tnBotMin(w, dk, at); }

/* ---- chances ---- */
// a match: the lead, the ratings, and how much of the day is left
function btMatchP(a, b, ma, mb, at){
  const L = at == null ? 1440 : 1440 - at, fr = btLeft(at);
  if (at != null){ if (tnDecide(a, b, ma, mb + L) === a) return {p: 1, done: a.w}; if (tnDecide(a, b, ma + L, mb) === b) return {p: 0, done: b.w}; }
  const sd = BT_SD * Math.sqrt(fr) + 1, mu = (2 * btElo(a.r, b.r) - 1) * BT_DRIFT * fr;
  return {p: btClamp(btPhi((ma - mb + mu) / sd))};
}
// minutes ladder: will they reach T minutes today?
function btMinP(e, p, cur, T, at){
  const L = at == null ? 1440 : 1440 - at;
  if (cur >= T) return {p: 1, done: 'y'}; if (cur + L < T) return {p: 0, done: 'n'};
  const fr = btLeft(at), D = BT_BAND_DAY[e.band] * Math.pow(2, (p.r - tnBandMid(e.band)) / 800), mu = D * fr, sd = Math.max(8, .75 * D * fr);
  return {p: btClamp(1 - btPhi((T - cur - mu) / sd))};
}
const tnBandMid = band => { const [lo, hi] = tnBandRange(band); return isFinite(lo) && lo > -1e8 && hi < 1e8 ? (lo + hi) / 2 : lo > -1e8 ? lo + 300 : hi - 300; };
// the tournament: play the rest of it out many times with the match chances above
const btSimCache = new Map();
function btOutright(e, B, now){
  const key = `${e.wk}|${e.band}|${e.div || 0}|${Math.floor(now / 300000)}`; if (btSimCache.has(key)) return btSimCache.get(key);
  if (btSimCache.size > 30) btSimCache.clear();
  const today = dayKey(now), nm = btNowMin(now), rnd = mulberry32(fdHash(key)), wins = new Map();
  const live = new Map();   // today's live chances, worked out once
  B.rounds.forEach((ms, k) => { if (tnDayKey(e.wk, k) === today) ms.forEach(m => { if (m.a && m.b && m.st === 'live') live.set(m.a.w + ':' + m.b.w, btMatchP(m.a, m.b, m.ma, m.mb, nm).p); }); });
  for (let s = 0; s < BT_SIMS; s++){
    let cur = null;
    for (let k = 0; k < 5; k++){
      const ms = B.rounds[k], next = [];
      for (let i = 0; i < ms.length; i++){
        const m = ms[i], a = k ? cur[2 * i] : m.a, b = k ? cur[2 * i + 1] : m.b;
        if (!a || !b){ next.push(a || b || null); continue; }
        const same = m.a && m.b && m.a.w === a.w && m.b.w === b.w;
        if (same && (m.st === 'done' || m.st === 'bye')){ next.push(m.win); continue; }
        const lp = same ? live.get(a.w + ':' + b.w) : undefined, p = lp != null ? lp : btMatchP(a, b, 0, 0, null).p;
        next.push(rnd() < p ? a : b);
      }
      cur = next;
    }
    const c = cur[0]; if (c) wins.set(c.w, (wins.get(c.w) || 0) + 1);
  }
  const out = new Map(); wins.forEach((n, w) => out.set(w, btClamp(n / BT_SIMS)));
  btSimCache.set(key, out); return out;
}

/* ---- markets ---- */
// q: {mk: 'match'|'min'|'out', wk, band, div, k, a, b, w, T}. Yes means: a wins / w reaches T / w wins it all.
function btMarket(q, now){
  const e = btEntry(q.wk, q.band, q.div); if (!e) return {closed: 'Not found'};
  const B = tnBracket(e, now), today = dayKey(now), nm = btNowMin(now);
  if (q.mk === 'out'){
    if (B.champ) return {closed: 'Settled', e, B};
    if (tnDayKey(e.wk, 4) === today && nm >= BT_CLOSE) return {closed: 'Closed', e, B};
    const p = btOutright(e, B, now).get(q.w) || 0;
    return p ? {p, e, B} : {closed: 'Out of the tournament', e, B};
  }
  const dk = tnDayKey(e.wk, q.k); if (dk < today) return {closed: 'Settled', e, B};
  const m = B.rounds[q.k].find(x => x.a && x.b && (q.mk === 'match' ? x.a.w === q.a && x.b.w === q.b : x.a.w === q.w || x.b.w === q.w));
  if (!m || m.st === 'done' || m.st === 'bye') return {closed: 'Not available', e, B};
  const at = dk === today ? nm : null;
  const r = q.mk === 'match' ? btMatchP(m.a, m.b, at == null ? 0 : m.ma, at == null ? 0 : m.mb, at)
    : btMinP(e, m.a.w === q.w ? m.a : m.b, at == null ? 0 : (m.a.w === q.w ? m.ma : m.mb) || 0, q.T, at);
  if (r.done != null) return {closed: 'Answer is in', done: r.done, e, B, m};
  if (dk === today && nm >= BT_CLOSE) return {closed: 'Closed at 11 PM', e, B, m, p: r.p};
  return {p: r.p, e, B, m};
}
const btBuy = p => Math.min(99, Math.max(1, Math.round(p * 100) + BT_SPREAD));      // price to buy Yes; No costs btBuy(1 - p)
const btSell = p => Math.min(99, Math.max(0, Math.round(p * 100) - BT_SPREAD));     // what one contract fetches if you sell it
// chance through today, one point an hour (the same formula, fed the minutes as they stood then)
function btHistory(q, now){
  const e = btEntry(q.wk, q.band, q.div), B = tnBracket(e, now), nm = btNowMin(now), pts = [];
  if (q.mk === 'out' || tnDayKey(e.wk, q.k) !== dayKey(now)) return pts;
  const m = B.rounds[q.k].find(x => x.a && x.b && (q.mk === 'match' ? x.a.w === q.a && x.b.w === q.b : x.a.w === q.w || x.b.w === q.w)); if (!m) return pts;
  for (let at = 0; at <= nm; at += 60){
    const t = Math.min(at, nm);
    const r = q.mk === 'match' ? btMatchP(m.a, m.b, btMinAt(e, m.a.w, q.k, t), btMinAt(e, m.b.w, q.k, t), t) : btMinP(e, m.a.w === q.w ? m.a : m.b, btMinAt(e, q.w, q.k, t), q.T, t);
    pts.push(r.p);
  }
  const r = btMarket(q, now); if (r.p != null) pts.push(r.p);
  return pts;
}
// you can only ever back yourself (side: 'y' or 'n')
function btBlocked(q, side, B){
  const me = B && B.me; if (!me || B.outIn != null) return null;
  if (q.mk === 'out') return q.w === ME && side === 'y' ? null : 'While you’re still in, you can only back yourself to win';
  const m = B.rounds[q.k] && B.rounds[q.k].find(x => x.a && x.b && (x.a.w === ME || x.b.w === ME)), opp = m ? (m.a.w === ME ? m.b.w : m.a.w) : null;
  if (q.mk === 'match' && (q.a === ME || q.b === ME)) return (side === 'y') === (q.a === ME) ? null : 'You can’t bet against yourself';
  if (q.mk === 'min' && q.w === ME) return side === 'y' ? null : 'You can’t bet on yourself studying less';
  if (q.mk === 'min' && q.w === opp) return 'You can’t trade on your opponent’s minutes';
  return null;
}
const btName = w => w === ME ? 'You' : bot(w).name;
function btQuestion(q){
  if (q.mk === 'out') return `Will ${btName(q.w)} win the tournament?`;
  if (q.mk === 'match') return `${btName(q.a)} vs ${btName(q.b)} · ${TN_ROUNDS[q.k]}`;
  return `Will ${btName(q.w)} study ${q.T}+ min on ${TN_DAYS[q.k]}?`;
}
function btSideName(q, side){ return q.mk === 'match' ? btName(side === 'y' ? q.a : q.b) : side === 'y' ? 'Yes' : 'No'; }
function btRules(q){
  if (q.mk === 'match') return `Settles on whoever studies more Focus minutes on ${TN_DAYS[q.k]} (midnight to midnight). Under 10 minutes is a forfeit; a tie or a double forfeit goes to the higher seed. Closes at 11 PM.`;
  if (q.mk === 'min') return `Yes if ${btName(q.w)} has ${q.T} or more Focus minutes on ${TN_DAYS[q.k]} (midnight to midnight), settling early the moment they get there. Closes at 11 PM.`;
  return `Yes if ${btName(q.w)} wins Friday's final. Settles No as soon as they're knocked out.`;
}

/* ---- trading ---- */
function btTrade(q, side, coins, seen){
  const now = Date.now(), M = btMarket(q, now);
  if (M.closed) return {err: `This market is closed (${M.closed.toLowerCase()}).`};
  const why = btBlocked(q, side, M.B); if (why) return {err: why};
  const price = side === 'y' ? btBuy(M.p) : btBuy(1 - M.p);
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
  const M = btMarket(b, Date.now()); if (M.closed) return {err: 'This market can’t be sold right now.'};
  const each = b.side === 'y' ? btSell(M.p) : btSell(1 - M.p);
  b.st = 'sold'; b.pay = b.n * each; b.ts = Date.now(); saveCo(); if (typeof coRender === 'function') coRender();
  return {ok: b.pay};
}
function btSettle(now = Date.now()){
  const today = dayKey(now); let won = 0, changed = false;
  Object.values(btBets()).forEach(b => {
    if (b.st !== 'open') return;
    let e; try { e = btEntry(b.wk, b.band, b.div); } catch(_){ return; } if (!e) return;
    const B = tnBracket(e, now); let yes = null;
    if (b.mk === 'out'){
      if (B.champ) yes = B.champ.w === b.w;
      else if (B.rounds.some(ms => ms.some(m => m.st === 'done' && m.win && m.a && m.b && (m.a.w === b.w || m.b.w === b.w) && m.win.w !== b.w))) yes = false;
    } else {
      const m = B.rounds[b.k] && B.rounds[b.k].find(x => x.a && x.b && (b.mk === 'match' ? x.a.w === b.a && x.b.w === b.b : x.a.w === b.w || x.b.w === b.w));
      if (!m){ if (tnDayKey(b.wk, b.k) < today){ b.st = 'void'; b.pay = b.cost; changed = true; } return; }
      if (b.mk === 'match'){
        if (m.st === 'done') yes = m.win.w === b.a;
        else if (m.st === 'live'){ const r = btMatchP(m.a, m.b, m.ma, m.mb, btNowMin(now)); if (r.done != null) yes = r.done === b.a; }
      } else {
        const cur = (m.a.w === b.w ? m.ma : m.mb) || 0;
        if (m.st === 'done') yes = cur >= b.T;
        else if (m.st === 'live'){ const r = btMinP(e, m.a.w === b.w ? m.a : m.b, cur, b.T, btNowMin(now)); if (r.done) yes = r.done === 'y'; }
      }
    }
    if (yes == null) return;
    const right = (b.side === 'y') === yes; b.st = right ? 'won' : 'lost'; b.pay = right ? b.n * 100 : 0; b.ts = now; changed = true; if (right) won += b.pay;
  });
  if (changed){ saveCo(); if (typeof coRender === 'function') coRender(); if (typeof tnRender === 'function' && !document.hidden) tnRender(); }
  if (won){ if (typeof coPop === 'function') coPop(won); toast(`Market settled in your favor · +${won.toLocaleString()} coins`); }
  return changed;
}

/* ---- the Markets card on the Tournament page ---- */
const BT = {band: null, div: null, tab: 'match', pick: null, coins: 100, msg: '', open: new Set()};
function btView(now){
  const wk = btWeek(now), own = tnEntry(wk), band = BT.band != null ? BT.band : own ? own.band : tnMyBand();
  return {wk, band, div: BT.div != null ? BT.div : own && own.band === band ? own.div || 0 : tnDefDiv(wk, band)};
}
const btKey = q => [q.mk, q.wk, q.band, q.div, q.k, q.a, q.b, q.w, q.T].join('|');
const btQ = (el) => JSON.parse(el.closest('[data-q]').dataset.q);
function btSpark(pts){
  if (pts.length < 2) return '';
  const W = 260, H = 54, x = i => (i / (pts.length - 1) * W).toFixed(1), y = p => (H - 4 - p * (H - 8)).toFixed(1);
  return `<svg class="bt-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 ${y(.5)}H${W}" class="mid"/><path d="${pts.map((p, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(p)).join('')}" class="ln"/></svg>`;
}
function btBtn(q, side, M){
  const why = M.B ? btBlocked(q, side, M.B) : null, closed = M.closed || why, p = side === 'y' ? M.p : M.p != null ? 1 - M.p : null;
  const on = BT.pick && BT.pick.key === btKey(q) && BT.pick.side === side, cls = side === 'y' ? 'yes' : 'no';
  const label = q.mk === 'match' ? esc(btSideName(q, side)) : side === 'y' ? 'Yes' : 'No';
  if (closed || p == null) return `<button class="bt-buy ${cls}" disabled title="${esc(why || M.closed || '')}"><span>${label}</span><b>–</b></button>`;
  return `<button class="bt-buy ${cls}${on ? ' on' : ''}" data-bt="pick" data-side="${side}"><span>${label}</span><b>${btBuy(p)}¢</b></button>`;
}
function btRow(q, now, title, sub){
  const M = btMarket(q, now), key = btKey(q), open = BT.open.has(key);
  const chance = M.p != null ? Math.round(M.p * 100) : M.done != null ? (M.done === 'y' || M.done === q.a || M.done === q.w ? 100 : 0) : null;
  const chanceTxt = chance == null ? '–' : chance < 1 ? '<1%' : chance > 99 ? '>99%' : chance + '%';
  let row = `<li class="bt-mk${open ? ' open' : ''}" data-q='${esc(JSON.stringify(q))}'><button class="bt-q" data-bt="more"><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${q.mk === 'match' && M.p != null ? `<span class="bt-ch">${Math.round(M.p * 100)}% · ${100 - Math.round(M.p * 100)}%<small>chance</small></span>` : `<span class="bt-ch">${chanceTxt}<small>chance</small></span>`}</button>
    <span class="bt-btns">${btBtn(q, 'y', M)}${btBtn(q, 'n', M)}</span>`;
  if (open) row += `<div class="bt-more">${btSpark(btHistory(q, now))}<p class="bt-rules">${esc(btRules(q))}</p>${M.closed ? `<p class="bt-rules"><b>${esc(M.closed)}.</b></p>` : ''}</div>`;
  if (BT.pick && BT.pick.key === key) row += btTicketHtml(q, M);
  return row + '</li>';
}
function btTicketHtml(q, M){
  const side = BT.pick.side, p = side === 'y' ? M.p : 1 - M.p; if (M.closed || p == null) return '';
  const price = btBuy(p), coins = Math.max(0, Math.floor(+BT.coins || 0)), n = Math.floor(coins / price);
  return `<form class="bt-ticket"><div class="bt-tt">Buy <b>${esc(btSideName(q, side))}</b>${q.mk === 'match' ? '' : ` · ${esc(btQuestion(q))}`} at <b>${price}¢</b></div>
    <label>Coins <input type="number" min="${price}" max="${BT_MAX}" step="1" value="${coins || ''}" inputmode="numeric" data-bt="coins"></label>
    <span class="bt-quick">${[100, 500, 1000, 5000].map(v => `<button type="button" class="small-btn" data-bt="amt" data-v="${v}">${v.toLocaleString()}</button>`).join('')}</span>
    <span class="bt-sum" data-bt-sum>${n.toLocaleString()} contract${n === 1 ? '' : 's'} · pays <b>${(n * 100).toLocaleString()}</b> if ${q.mk === 'match' ? esc(btSideName(q, side)) + ' wins' : side === 'y' ? 'Yes' : 'No'}</span>
    <button class="btn primary sm" data-price="${price}">Buy</button><button type="button" class="small-btn" data-bt="cancel">Cancel</button>
    ${BT.msg ? `<p class="bt-msg">${esc(BT.msg)}</p>` : ''}</form>`;
}
function btCardHtml(now){
  if (typeof CO === 'undefined') return '';
  const v = btView(now); let e = null; try { e = btEntry(v.wk, v.band, v.div); } catch(_){}
  const bal = coTotals().balance, own = tnEntry(v.wk), mine = own && e === own, nOpen = Object.values(btBets()).filter(b => b.st === 'open').length;
  let html = `<div class="card bt-card"><div class="bt-h"><div><div class="h first">Markets</div><small class="bt-sub">${e ? `${mine ? 'Your division' : tnDivName(e.div || v.div || 1)} · ${esc(TN_BANDS[v.band][2])} · ${tnRange(v.wk)}` : ''}</small></div>
    <span class="bt-bal"><svg class="co-ic" viewBox="0 0 24 24" aria-hidden="true">${CO_IC}</svg>${bal.toLocaleString()}</span></div>
    <div class="bt-where">${TN_BANDS.map((b, i) => `<button class="chip${i === v.band ? ' on' : ''}" data-bt="band" data-v="${i}">${esc(b[2])}</button>`).join('')}
      <form class="bt-divf"><label>Division <input type="number" min="1" max="${tnDivCount(v.band, v.wk)}" value="${mine ? '' : v.div || ''}" placeholder="${mine ? 'yours' : '1–' + tnDivCount(v.band, v.wk).toLocaleString()}" inputmode="numeric"></label><button class="small-btn">Go</button>${own ? '<button type="button" class="small-btn" data-bt="mine">Mine</button>' : ''}</form></div>
    <div class="bt-tabs" role="tablist">${[['match', 'Matches'], ['min', 'Minutes'], ['out', 'Winner'], ['pos', 'Positions' + (nOpen ? ` · ${nOpen}` : '')]].map(([t, l]) => `<button data-bt="tab" data-v="${t}" aria-selected="${BT.tab === t}">${l}</button>`).join('')}</div>`;
  if (BT.tab === 'pos') return html + btPositionsHtml(now) + '</div>';
  if (!e) return html + '<p class="hint">No tournament to trade on right now.</p></div>';
  const B = tnBracket(e, now), k = btRound(e, now), today = dayKey(now), nm = btNowMin(now), base = {wk: e.wk, band: e.band, div: e.div || v.div || 0};
  const live = k != null && tnDayKey(e.wk, k) === today;
  const when = k == null ? '' : live ? (nm >= BT_CLOSE ? `${TN_ROUNDS[k]} · trading closed at 11 PM, settles at midnight` : `${TN_ROUNDS[k]} · live today · closes 11 PM`) : `${TN_ROUNDS[k]} · ${TN_DAYS[k]}`;
  const ms = k == null ? [] : B.rounds[k].filter(m => m.a && m.b && m.st !== 'bye');
  if (BT.tab === 'match'){
    html += k == null ? '<p class="hint">This tournament is over.</p>' : `<div class="bt-ev">${when}</div><ul class="bt-list">${ms.map(m => btRow({...base, mk: 'match', k, a: m.a.w, b: m.b.w}, now,
      `${tnName(m.a.w)} vs ${tnName(m.b.w)}`, `seeds ${m.a.seed} and ${m.b.seed}${live ? ` · ${fmtMin(m.ma || 0)}–${fmtMin(m.mb || 0)} so far` : ''}`)).join('')}</ul>`;
  } else if (BT.tab === 'min'){
    if (k == null) html += '<p class="hint">This tournament is over.</p>';
    else {
      html += `<div class="bt-ev">How many minutes today? · ${when}</div>`;
      ms.forEach(m => [[m.a, m.ma], [m.b, m.mb]].forEach(([p, cur]) => {
        const rows = BT_TIERS.map(T => ({...base, mk: 'min', k, w: p.w, T})).filter(q => { const M = btMarket(q, now); return M.p != null && M.p > .02 && M.p < .98; }).slice(0, 4);
        if (!rows.length) return;
        html += `<div class="bt-grp">${tnAv(p.w)}<b>${tnName(p.w)}</b><small>${live ? fmtMin(cur || 0) + ' so far' : 'seed ' + p.seed}</small></div><ul class="bt-list">${rows.map(q => btRow(q, now, `${q.T}+ minutes`, '')).join('')}</ul>`;
      }));
    }
  } else if (BT.tab === 'out'){
    if (B.champ) html += `<p class="hint">${tnName(B.champ.w)} won this tournament.</p>`;
    else {
      const P = btOutright(e, B, now), ps = [...P.entries()].sort((a, b) => b[1] - a[1]);
      html += `<div class="bt-ev">Who will win the tournament?</div><ul class="bt-list">${ps.map(([w]) => { const p = B.ps.find(x => x.w === w); return btRow({...base, mk: 'out', w}, now, `${tnAv(w)} ${tnName(w)}`, `seed ${p ? p.seed : '–'}`); }).join('')}</ul>`;
    }
  }
  html += '<p class="hint bt-foot">Prices are the chance in coins: a contract pays 100 if you’re right. Chances use only ratings, today’s minutes so far and how much of the day is left.</p>';
  return html + '</div>';
}
function btPositionsHtml(now){
  const all = Object.values(btBets()).sort((a, b) => b.t - a.t), open = all.filter(b => b.st === 'open'), done = all.filter(b => b.st !== 'open').slice(0, 30), net = btNet();
  const row = b => {
    let right = '';
    if (b.st === 'open'){ const M = btMarket(b, now), each = M.p != null && !M.closed ? (b.side === 'y' ? btSell(M.p) : btSell(1 - M.p)) : null;
      right = `<span class="bt-pv">${each != null ? `<b>${(b.n * each).toLocaleString()}</b><small>value now</small>` : '<small>waiting to settle</small>'}</span>${each != null ? `<button class="small-btn" data-bt="sell" data-id="${b.id}">Sell</button>` : ''}`; }
    else right = `<i class="bt-st ${b.st}">${b.st === 'won' ? `Won +${b.pay.toLocaleString()}` : b.st === 'sold' ? `Sold for ${b.pay.toLocaleString()}` : b.st === 'void' ? 'Refunded' : 'Lost'}</i>`;
    return `<li class="bt-pos"><span><b>${esc(btSideName(b, b.side))}</b> · ${esc(btQuestion(b))}<small>${b.n.toLocaleString()} at ${b.price}¢ · cost ${b.cost.toLocaleString()} · pays ${(b.n * 100).toLocaleString()}</small></span>${right}</li>`;
  };
  return `${all.length ? `<p class="hint">All-time from markets: <b>${net >= 0 ? '+' : ''}${net.toLocaleString()}</b> coins${open.length ? ' (open positions count as what they cost until they settle or you sell)' : ''}.</p>` : ''}
    ${open.length ? `<div class="bt-ev">Open</div><ul class="bt-list">${open.map(row).join('')}</ul>` : ''}
    ${done.length ? `<div class="bt-ev">Settled</div><ul class="bt-list">${done.map(row).join('')}</ul>` : ''}
    ${all.length ? '' : '<p class="hint">No positions yet. Buy Yes or No on any market.</p>'}`;
}
function btRefresh(){ if (typeof tnRender === 'function') tnRender(); }
document.addEventListener('click', ev => {
  const a = ev.target.closest && ev.target.closest('[data-bt]'); if (!a || !a.closest('.bt-card')) return;
  const k = a.dataset.bt; if (k === 'coins') return;
  ev.preventDefault();
  if (k === 'band'){ BT.band = +a.dataset.v; BT.div = null; BT.pick = null; }
  else if (k === 'mine'){ BT.band = null; BT.div = null; BT.pick = null; }
  else if (k === 'tab'){ BT.tab = a.dataset.v; BT.pick = null; }
  else if (k === 'more'){ const key = btKey(btQ(a)); BT.open.has(key) ? BT.open.delete(key) : BT.open.add(key); }
  else if (k === 'pick'){ const q = btQ(a), key = btKey(q), side = a.dataset.side; BT.pick = BT.pick && BT.pick.key === key && BT.pick.side === side ? null : {key, side, q}; BT.msg = ''; }
  else if (k === 'amt') BT.coins = +a.dataset.v;
  else if (k === 'cancel'){ BT.pick = null; BT.msg = ''; }
  else if (k === 'sell'){ const r = btSellPos(a.dataset.id); toast(r.err || `Sold for ${r.ok.toLocaleString()} coins`); }
  btRefresh();
});
document.addEventListener('input', ev => {
  const i = ev.target.closest && ev.target.closest('[data-bt="coins"]'); if (!i || !BT.pick) return;
  BT.coins = Math.floor(+i.value || 0); const M = btMarket(BT.pick.q, Date.now()); if (M.closed) return;
  const price = btBuy(BT.pick.side === 'y' ? M.p : 1 - M.p), n = Math.floor(BT.coins / price), s = document.querySelector('[data-bt-sum] b');
  if (s){ s.textContent = (n * 100).toLocaleString(); s.parentNode.firstChild.textContent = `${n.toLocaleString()} contract${n === 1 ? '' : 's'} · pays `; }
});
document.addEventListener('submit', ev => {
  const f = ev.target.closest && ev.target.closest('.bt-card form'); if (!f) return;
  ev.preventDefault();
  if (f.classList.contains('bt-divf')){ const n = Math.floor(+f.querySelector('input').value || 0), v = btView(Date.now()); if (n >= 1 && n <= tnDivCount(v.band, v.wk)){ BT.div = n; BT.band = v.band; BT.pick = null; } btRefresh(); return; }
  if (!BT.pick) return;
  const r = btTrade(BT.pick.q, BT.pick.side, BT.coins, +f.querySelector('[data-price]').dataset.price);
  if (r.moved) BT.msg = `The price moved to ${r.moved}¢. Press Buy again to take it.`;
  else if (r.err) BT.msg = r.err;
  else { toast(`Bought ${r.n.toLocaleString()} contract${r.n === 1 ? '' : 's'} for ${r.cost.toLocaleString()} coins`); BT.pick = null; BT.msg = ''; }
  btRefresh();
});
setInterval(() => { if (typeof RK_READY !== 'undefined' && RK_READY && !document.hidden) try { btSettle(); } catch(e){ console.error('markets', e); } }, 60000);
(function btStart(){ if (typeof RK_READY === 'undefined' || !RK_READY) return setTimeout(btStart, 3000); try { btSettle(); } catch(e){ console.error('markets', e); } })();
