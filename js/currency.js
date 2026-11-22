/* ---------- coins ----------
   Coins are the spendable currency (XP stays your permanent progress). Where they come from:
     studying    1 coin a minute, half rate past 4 hours in a day, times a streak multiplier (3 days x1.1, 7 x1.25, 14+ x1.5)
     daily goal  +50 on each day you reach it
     challenges  50-100 each (daily), 300-500 (weekly), 1,000-1,500 (monthly), by difficulty; finishing a whole set pays
                 +300, +1,500 or +5,000 on top
     awards      25 coins per achievement point (bronze 125 up to legendary 2,500)
     ranked 1v1  a win pays 4x your rank's base, a loss 1x (a draw 2x)
     Elimination every player in a ranked lobby adds 1.5x their own rank base to a prize pool, and the pool is shared by
                 place: 4 players or fewer pay 1st only (100%), 5-8 pay the top 3 (50/30/20), 9-16 pay the top 5
                 (35/25/20/12/8). Everyone else gets nothing from the match.
   Rank base: 300 at Freshman I, +25 for each division, +100 for each full rank (Laureate 1,300), Paragon 1,600.
   Friendly matches, casual lobbies, watching and quizzes pay nothing.
   Studying, the daily goal, challenges and awards are worked out from your history (so you start with what you've already
   earned), and each of those totals only ever goes up: deleting a session never takes coins back. Matches are written
   to a ledger, one line per match, so two devices merge without counting a match twice. What's spent will be a ledger too. */
const CO_BASE0 = 300, CO_STEP = 100, CO_DIVSTEP = 25, CO_PARAGON = 1600;
const CO_FULL_MIN = 240, CO_GOAL = 50, CO_ACH = 25, CO_POOL = 1.5;
const CO_CH_RANGE = {d: [50, 100, .8, 1.2, 5], w: [300, 500, 1, 1.3, 25], m: [1000, 1500, 1, 1.3, 50]};   // lo, hi, difficulty range, rounding
const CO_CH_SET = {d: 300, w: 1500, m: 5000};
const CO_V1 = {W: 4, L: 1, D: 2};
const coSplit = n => n <= 4 ? [1] : n <= 8 ? [.5, .3, .2] : [.35, .25, .2, .12, .08];
const coMult = s => s >= 14 ? 1.5 : s >= 7 ? 1.25 : s >= 3 ? 1.1 : 1;

let CO = store.get('fb.coins', {led: {}, hw: {}, sp: {}});          // led: {matchId: [coins, time, 'r'|'e']}, hw: high-water marks, sp: spent
if (!CO.led) CO.led = {}; if (!CO.hw) CO.hw = {}; if (!CO.sp) CO.sp = {};
const saveCo = () => store.set('fb.coins', CO);

/* ---- rank base ---- */
const coBaseOfRating = r => { const k = rankOf(r); return CO_BASE0 + CO_STEP * Math.min(k.i, LAUREATE) + CO_DIVSTEP * (k.d || 0); };
function coMyBase(){ const rk = myRk(); return rk.i === PARAGON_I ? CO_PARAGON : rk.un ? CO_BASE0 : coBaseOfRating(R.mmr); }
// what everyone in a lobby adds up to in rank bases (kept on the match so its prize pool never changes later)
function coLobbyBases(L, myBefore, placement){
  return L.players.reduce((s, w) => s + (w === -1 ? (placement ? CO_BASE0 : coBaseOfRating(myBefore)) : coBaseOfRating(botRating(w))), 0);
}
const coElimPay = (N, p, bs) => Math.round(bs * CO_POOL * (coSplit(N)[p - 1] || 0));

/* ---- matches: one ledger line each, added once ---- */
function coSyncMatches(){
  if (typeof R === 'undefined' || !R || !R.hist) return false;
  const gh = R.gh || [], trimmed = R.hist.length >= 500 || gh.length >= 300;
  const all = [...R.hist.filter(h => !h.f).map(h => ({t: h.t, id: 'r|' + h.t + '|' + h.b, h})), ...gh.map(g => ({t: g.t, id: 'e|' + g.id, g}))].sort((a, b) => a.t - b.t);
  let changed = false;
  all.forEach((x, i) => {
    if (CO.led[x.id]) return;
    const placement = x.g ? !!x.g.pl : (!trimmed && i < PLACE_N);      // your first rated games are placement games: Freshman I base
    let c = 0;
    if (x.h){ c = (CO_V1[x.h.r] || 0) * (placement ? CO_BASE0 : coBaseOfRating(x.h.m - x.h.d)); }
    else { const g = x.g, mine = placement ? CO_BASE0 : coBaseOfRating(g.m - g.d); c = coElimPay(g.N, g.p, g.bs || g.N * mine); }
    CO.led[x.id] = [c, x.t, x.g ? 'e' : 'r']; changed = true;
  });
  return changed;
}

/* ---- the rest, worked out from your history ---- */
function coChKey(k){
  const [sk, id] = k.split('|'), per = sk[0];
  if (id === 'all') return CO_CH_SET[per] || 0;
  const d = typeof CH_POOL !== 'undefined' ? CH_POOL.find(c => c.id === id) : null, w = d ? d.w || 1 : 1, r = CO_CH_RANGE[per]; if (!r) return 0;
  return Math.round((r[0] + (r[1] - r[0]) * Math.max(0, Math.min(1, (w - r[2]) / (r[3] - r[2])))) / r[4]) * r[4];
}
function coDerived(){
  const byDay = {}; LOG.forEach(s => { const k = dayKey(s.t); byDay[k] = (byDay[k] || 0) + s.min; });
  const days = {}; let study = 0, goal = 0, run = 0, prev = null;
  Object.keys(byDay).sort().forEach(k => {
    const m = byDay[k], t = new Date(k + 'T12:00').getTime(), counts = m >= STREAK_MIN;
    if (counts){ run = prev != null && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; prev = t; } else { run = 0; prev = null; }
    const sc = Math.round((Math.min(m, CO_FULL_MIN) + Math.max(0, m - CO_FULL_MIN) * .5) * (counts ? coMult(run) : 1)), gc = m >= P.goalMin ? CO_GOAL : 0;
    days[k] = {study: sc, goal: gc}; study += sc; goal += gc;
  });
  const chal = Object.keys((typeof CHL !== 'undefined' && CHL.led) || {}).reduce((n, k) => n + coChKey(k), 0);
  const ach = typeof ACHS !== 'undefined' ? ACHS.filter(a => ACH.u[a.id]).reduce((n, a) => n + TIERS[a.t].pts * CO_ACH, 0) : 0;
  return {study, goal, chal, ach, days};
}
// everything you've earned, by where it came from. Each worked-out total only goes up (the high-water mark).
function coTotals(){
  const d = coDerived(); let dirty = coSyncMatches();
  const parts = {study: d.study, goal: d.goal, chal: d.chal, ach: d.ach};
  Object.keys(parts).forEach(k => { if (parts[k] > (CO.hw[k] || 0)){ CO.hw[k] = parts[k]; dirty = true; } else parts[k] = CO.hw[k] || 0; });
  if (dirty) saveCo();
  let r1 = 0, el = 0; Object.values(CO.led).forEach(([c, , kind]) => { if (kind === 'e') el += c; else r1 += c; });
  parts.v1 = r1; parts.el = el;
  const earned = parts.study + parts.goal + parts.chal + parts.ach + r1 + el, spent = Object.values(CO.sp).reduce((n, v) => n + (+v || 0), 0);
  return {parts, earned, spent, balance: earned - spent, days: d.days};
}
// today's coins, by source
function coToday(T){
  const k = dayKey(Date.now()), t0 = new Date(k + 'T00:00').getTime(), d = (T.days || {})[k] || {study: 0, goal: 0};
  const chal = Object.entries((typeof CHL !== 'undefined' && CHL.done) || {}).filter(([, t]) => t >= t0).reduce((n, [key]) => n + coChKey(key), 0);
  const ach = typeof ACHS !== 'undefined' ? ACHS.filter(a => ACH.u[a.id] && ACH.u[a.id] >= t0).reduce((n, a) => n + TIERS[a.t].pts * CO_ACH, 0) : 0;
  let v1 = 0, el = 0; Object.values(CO.led).forEach(([c, t, kind]) => { if (t >= t0){ if (kind === 'e') el += c; else v1 += c; } });
  return [['Studying', d.study, 'clock'], ['Daily goal', d.goal, 'target'], ['Challenges', chal, 'check'], ['Achievements', ach, 'award'], ['Ranked 1v1', v1, 'trophy'], ['Elimination', el, 'trophy']].filter(r => r[1] > 0);
}

/* ---- drawing ---- */
const CO_IC = '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/>';
const coFmt = n => n < 1e4 ? n.toLocaleString() : n < 1e6 ? (n / 1e3).toFixed(n < 1e5 ? 1 : 0).replace(/\.0$/, '') + 'K' : (n / 1e6).toFixed(n < 1e7 ? 2 : 1).replace(/\.?0+$/, '') + 'M';
function coCardHtml(cls = 'card lv-card co-card'){
  const T = coTotals(), today = coToday(T), tot = today.reduce((n, r) => n + r[1], 0), p = T.parts, rk = myRk();
  const src = [['Studying', p.study, 'clock'], ['Daily goals', p.goal, 'target'], ['Challenges', p.chal, 'check'], ['Achievements', p.ach, 'award'], ['Ranked 1v1', p.v1, 'trophy'], ['Elimination', p.el, 'trophy']];
  const row = ([t, v, ic]) => `<li><span><svg viewBox="0 0 24 24">${LV_IC[ic] || ''}</svg>${esc(t)}</span><b>${v >= 0 ? '+' : ''}${v.toLocaleString()}</b></li>`;
  return `<div class="${cls}"><div class="lv-top"><span class="co-big"><svg viewBox="0 0 24 24" aria-hidden="true">${CO_IC}</svg></span><div><b>${T.balance.toLocaleString()} coins</b><small>${T.earned.toLocaleString()} earned in all${T.spent ? ` · ${T.spent.toLocaleString()} spent` : ''}</small></div></div>
    <div class="lv-sub">Today's coins <b>+${tot.toLocaleString()}</b></div>
    ${today.length ? `<ul class="lv-list">${today.map(row).join('')}</ul>` : '<p class="hint">Study, finish a challenge or play a ranked match to earn coins.</p>'}
    <details class="lv-more"><summary>Where your coins come from</summary><ul class="lv-list">${src.map(row).join('')}</ul>
      <p class="hint">Your rank base is <b>${coMyBase().toLocaleString()}</b> (${esc(rk.un ? 'Unranked' : rk.full)}). Ranked 1v1: a win pays 4× your base, a loss 1×. Elimination: everyone adds 1.5× their base to a prize pool, shared by place (4 players: 1st only; 8: top 3; 16: top 5). Studying pays 1 a minute with a streak bonus, plus the daily goal (+50), challenges and achievements. Friendly matches, casual lobbies and quizzes pay nothing.</p></details></div>`;
}
function miniCoins(){
  return `${coCardHtml('lv-card mini-lv co-card')}<div class="mini-go"><button class="small-btn" data-mini-go="level">Your profile</button></div>`;
}
let coPopT = 0;
function coPop(n){
  const chip = $('#coinChip'); if (!chip || !n) return;
  const el = document.createElement('span'); el.className = 'lv-pop'; el.textContent = `+${n.toLocaleString()} coins`;
  chip.appendChild(el); setTimeout(() => el.remove(), 1900);
}
function coRender(){
  if (typeof RK_READY !== 'undefined' && !RK_READY) return;
  let T; try { T = coTotals(); } catch(e){ console.error(e); return; }
  const chip = $('#coinChip');
  if (chip){
    chip.hidden = false; chip.title = `${T.balance.toLocaleString()} coins`;
    if (!chip.querySelector('.lv-pop')) chip.innerHTML = `<svg class="co-ic" viewBox="0 0 24 24" aria-hidden="true">${CO_IC}</svg><b>${coFmt(T.balance)}</b>`;
    else chip.querySelector('b').textContent = coFmt(T.balance);
  }
  const seen = store.get('fb.coinSeen', null);       // the first time (and your starting balance) shows without a pop
  if (seen == null){ store.set('fb.coinSeen', T.balance); return; }
  if (T.balance > seen){ coPop(T.balance - seen); store.set('fb.coinSeen', T.balance); }
  else if (T.balance < seen) store.set('fb.coinSeen', T.balance);
}
// your own profile: the coins card goes under the level card
{
  const _ph = renderProfilePage;
  renderProfilePage = function(){
    const x = _ph.apply(this, arguments);
    try {
      if (profWho === ME){ const host = document.querySelector('#profBody'), lv = host && host.querySelector('.lv-card:not(.co-card)'); if (lv && !host.querySelector('.co-card')) lv.insertAdjacentHTML('afterend', coCardHtml()); }
    } catch(e){ console.error(e); }
    return x;
  };
}
setInterval(() => { try { coRender(); } catch(e){ console.error(e); } }, 15000);
{ const _r = renderLog; renderLog = function(){ const x = _r.apply(this, arguments); try { coRender(); } catch(e){} return x; }; }
setTimeout(() => { try { coRender(); } catch(e){} }, 6500);
