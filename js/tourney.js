/* ---------- Weekly Tournament ----------
   One tournament a week. Sign-up is open Saturday and Sunday; the bracket plays Monday to Friday,
   one round a day: Round of 32, Round of 16, Quarterfinals, Semifinals, and on Friday the Final plus a
   third-place match between the two semifinal losers.

   A round is the whole day (midnight to midnight). Whoever has more Focus-timer minutes that day wins.
   Under 10 minutes is a forfeit; if both forfeit, or it's a tie, the higher seed goes through.
   Sessions that cross midnight count on each side of it.

   You play 31 other players from your rank band (Freshman–Honors, Dean's List–Provost, Chancellor and up),
   seeded by Elo. The field is picked once, when you sign up, and saved (R.tour), so it syncs to your other
   device as it is. Players' minutes come from their own study days (sitsOf in ranked.js, the same sittings
   their calendar, the live feed and ranked matches use), so the bracket is the same everywhere and never
   changes after the fact. Your own minutes for a day are locked once the day is over (after the first
   sync, so your other device's sessions are in), so editing a session later never changes a round.
   Tournaments don't change Elo. Prizes (tournament chips) come in the next stage. */

const TN_N = 32, TN_MIN = 10, TN_KEEP = 16;
const TN_ROUNDS = ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final'];
const TN_SHORT = ['R32', 'R16', 'QF', 'SF', 'Final'];
const TN_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TN_BANDS = [[0, 3, 'Freshman – Honors'], [4, 8, 'Dean’s List – Provost'], [9, 11, 'Chancellor and up']];

const tnBandOf = r => { const i = rankOf(r).i; return Math.max(0, TN_BANDS.findIndex(b => i >= b[0] && i <= b[1])); };
const tnBandRange = b => [b === 0 ? -1e9 : RANKS[TN_BANDS[b][0]].lo, b === 2 ? 1e9 : RANKS[TN_BANDS[b][1] + 1].lo];
function tnMonday(t){ const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; }
const tnPlus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const tnDayKey = (wk, k) => dayKey(tnPlus(new Date(wk + 'T00:00'), k));
const tnWeekOf = t => dayKey(tnMonday(t));                         // this week's tournament (Mon–Fri, or the one that just ended on Sat/Sun)
const tnSignupWeek = t => { const d = new Date(t).getDay(); return d === 6 || d === 0 ? dayKey(tnPlus(tnMonday(t), 7)) : null; };
const tnMidnight = t => { const d = new Date(t); d.setHours(24, 0, 0, 0); return d.getTime(); };
const tnRange = wk => { const a = new Date(wk + 'T00:00'), b = tnPlus(a, 4), f = d => d.toLocaleDateString([], {month: 'short', day: 'numeric'}); return `${f(a)} – ${f(b)}`; };

function tnData(){ if (!R.tour || typeof R.tour !== 'object') R.tour = {e: {}}; if (!R.tour.e) R.tour.e = {}; return R.tour; }
const tnEntry = wk => wk && R && R.tour && R.tour.e ? R.tour.e[wk] || null : null;
function tnSave(){
  const e = tnData().e, ks = Object.keys(e).sort();
  ks.slice(0, Math.max(0, ks.length - TN_KEEP)).forEach(k => delete e[k]);
  saveRanked();
}

/* ---- the field ---- */
// standard bracket order: seed 1 meets 32, and 1 and 2 can only meet in the final
function tnSeedOrder(n){ let o = [1]; while (o.length < n){ const m = o.length * 2 + 1; o = o.flatMap(s => [s, m - s]); } return o; }
const TN_ORDER = tnSeedOrder(TN_N);
/* ---- divisions ----
   Each band runs many tournaments a week, each its own 32-player division. About 30% of a band's players enter,
   so a band has thousands of divisions. Every division's field comes from the seed (week, band, division) and the
   players' long-term base rating, so any division, this week's or a past one, always comes out the same.
   When you sign up you're put in a random division and take one of its 32 places. */
const TN_ENTER = .3, tnPop = [], tnDivCache = new Map();
// how many divisions a band has this week: sign-ups go up and down from week to week (about ±18%)
const TN_SIZE_MIN = 18;
function tnDivCount(band, wk){
  if (tnPop[band] == null){ const [lo, hi] = tnBandRange(band); let n = 0; for (let i = 0; i < ROSTER_N; i++){ const r = T_BASE[i]; if (r >= lo && r < hi) n++; } tnPop[band] = n; }
  const swing = wk ? .82 + mulberry32(fdHash('tnD:' + wk + ':' + band))() * .36 : 1;
  return Math.max(1, Math.round(tnPop[band] * TN_ENTER * swing / 29));
}
// divisions aren't always full: anywhere from 18 to 32 players, most of them close to full. Missing places are byes.
const tnDivSize = (wk, band, div) => TN_N - Math.floor(Math.pow(mulberry32(fdHash('tnS:' + wk + ':' + band + ':' + div))(), 2.2) * (TN_N - TN_SIZE_MIN + 1));
function tnDivEntry(wk, band, div){
  const key = wk + ':' + band + ':' + div; if (tnDivCache.has(key)) return tnDivCache.get(key);
  const [lo, hi] = tnBandRange(band), rnd = mulberry32(fdHash('tnd:' + key)), out = new Set(), size = tnDivSize(wk, band, div);
  // players who study most days are the ones who sign up for a week-long event
  for (let t = 0; t < 400000 && out.size < size; t++){
    const w = Math.floor(rnd() * ROSTER_N), r = T_BASE[w];
    if (r < lo || r >= hi || out.has(w) || wk < botJoinKey(w)) continue;
    if (rnd() > Math.pow(activityI(w, r), 6)) continue;
    out.add(w);
  }
  const e = {wk, band, div, past: 1, f: [...out].map(w => [w, T_BASE[w]]), my: []};
  if (tnDivCache.size > 60) tnDivCache.clear();
  tnDivCache.set(key, e); return e;
}
// the division shown for a week you didn't play
const tnDefDiv = (wk, band) => 1 + fdHash('tndef:' + wk + ':' + band) % tnDivCount(band, wk);
const tnDivName = n => 'Division ' + Number(n).toLocaleString();
function tnJoin(){
  const wk = tnSignupWeek(Date.now());
  if (!wk){ toast('Sign-up for the next tournament opens on Saturday.'); return; }
  if (!RK_READY){ toast('Still loading players. Try again in a moment.'); return; }
  if (tnEntry(wk)) return;
  const myR = Math.round(R.mmr), band = tnBandOf(myR), D = tnDivCount(band, wk), div = 1 + Math.floor(Math.random() * D);
  // you take an open place in the division, or if it's full, one player's place (they sit this week out); seeds use everyone's Elo right now
  const base = tnDivEntry(wk, band, div).f.map(([w]) => w), drop = base.length >= TN_N ? Math.floor(Math.random() * base.length) : -1;
  const f = base.filter((_, k) => k !== drop).slice(0, TN_N - 1).map(w => [w, botRating(w)]);
  tnData().e[wk] = {wk, at: Date.now(), r: myR, band, div, D, f, my: [null, null, null, null, null], seen: -1};
  tnSave(); tnRender(); tnDot();
  const s = tnBracket(tnEntry(wk), Date.now()).me;
  const B0 = tnBracket(tnEntry(wk), Date.now()), bye = B0.rounds[0].find(m => m.a === B0.me || m.b === B0.me).st === 'bye';
  toast(`You’re in ${tnDivName(div)}! You’re seed ${s.seed} of ${B0.ps.length}.${bye ? ' You have a bye on Monday, so you start in the Round of 16 on Tuesday.' : ' Round of 32 is on Monday.'}`);
}
function tnLeave(){
  const wk = tnSignupWeek(Date.now()), e = tnEntry(wk); if (!e) return;
  delete tnData().e[wk]; tnSave(); tnRender(); tnDot(); toast('You’ve left next week’s tournament.');
}

/* ---- minutes ---- */
// your Focus minutes on day dk (only up to minute `upto` of the day if given), from the log, split at midnight
function tnLogMin(dk, upto){
  const d0 = new Date(dk + 'T00:00').getTime(), d1 = upto == null ? tnMidnight(d0) : d0 + upto * 60000;
  let ms = 0;
  for (const s of LOG){ if (!s || !(s.min > 0)) continue; const b = s.t, a = b - s.min * 60000; if (b <= d0 || a >= d1) continue; ms += Math.min(b, d1) - Math.max(a, d0); }
  return Math.round(ms / 60000);
}
// the block you're in right now that isn't logged yet
const tnLiveMin = () => typeof focusing === 'function' && focusing() ? Math.max(0, Math.floor((focusElapsed() - (S.segOff || 0)) / 60000)) : 0;
function tnBotMin(w, dk, upto){
  let m = 0; for (const [a, b] of sitsOf(w, dk)){ const e = upto == null ? b : Math.min(b, upto); if (e > a) m += e - a; }
  return Math.round(m);
}
// minutes for player w on round day k; live = today's so far
function tnMin(e, w, k, now){
  const dk = tnDayKey(e.wk, k), today = dayKey(now);
  if (w === ME){
    if (dk < today) return e.my[k] != null ? e.my[k] : tnLogMin(dk);
    if (dk === today) return tnLogMin(dk) + tnLiveMin();
    return 0;
  }
  if (dk > today) return 0;
  const d = new Date(now);
  return tnBotMin(w, dk, dk === today ? d.getHours() * 60 + d.getMinutes() : null);
}

/* ---- the bracket ---- */
function tnPlayers(e){
  const ps = e.f.map(([w, r]) => ({w, r})).concat(e.past ? [] : [{w: ME, r: e.r}]);
  ps.sort((a, b) => b.r - a.r || (a.w === ME ? -1 : b.w === ME ? 1 : a.w - b.w));
  ps.forEach((p, k) => { p.seed = k + 1; });
  return ps;
}
function tnDecide(a, b, ma, mb){
  const okA = ma >= TN_MIN, okB = mb >= TN_MIN, hi = a.seed < b.seed ? a : b;
  if (okA !== okB) return okA ? a : b;
  if (!okA) return hi;
  return ma > mb ? a : mb > ma ? b : hi;
}
// every match of the week as it stands at `now`: state is done (the day is over), live (today) or future
function tnBracket(e, now){
  const ps = tnPlayers(e), bySeed = s => ps[s - 1] || null, today = dayKey(now);
  let cur = TN_ORDER.map(bySeed);
  const rounds = [], losers = [];
  let third = null;
  for (let k = 0; k < 5; k++){
    const dk = tnDayKey(e.wk, k), st = dk < today ? 'done' : dk === today ? 'live' : 'future', ms = [], next = [];
    for (let m = 0; m < cur.length; m += 2){
      const a = cur[m], b = cur[m + 1];
      if (k === 0 && (!a || !b) && (a || b)){ const p = a || b; ms.push({a, b, win: p, st: 'bye', ma: 0, mb: 0}); next.push(p); continue; }    // an empty place: a bye
      if (!a || !b){ ms.push({a, b, st: 'future'}); next.push(null); continue; }
      const ma = st === 'future' ? 0 : tnMin(e, a.w, k, now), mb = st === 'future' ? 0 : tnMin(e, b.w, k, now);
      const win = st === 'future' ? null : tnDecide(a, b, ma, mb);
      ms.push({a, b, ma, mb, win, st});
      next.push(st === 'done' ? win : null);
      if (k === 3 && st === 'done') losers.push(win === a ? b : a);
    }
    rounds.push(ms); cur = next;
    if (k === 4){
      const dk4 = tnDayKey(e.wk, 4), st4 = dk4 < today ? 'done' : dk4 === today ? 'live' : 'future';
      if (losers.length === 2){
        const [a, b] = losers, ma = st4 === 'future' ? 0 : tnMin(e, a.w, 4, now), mb = st4 === 'future' ? 0 : tnMin(e, b.w, 4, now);
        third = {a, b, ma, mb, win: st4 === 'future' ? null : tnDecide(a, b, ma, mb), st: st4};
      } else third = {a: null, b: null, st: 'future'};
    }
  }
  // your week: the round you're in or went out in, and where you finished
  const me = ps.find(p => p.w === ME) || null, path = [];
  let place = null, outIn = null;
  for (let k = 0; k < 5 && me; k++){
    const m = rounds[k].find(x => x.a === me || x.b === me); if (!m) break;
    path.push({k, m});
    if (m.st === 'done' && m.win !== me){ outIn = k; break; }   // (a bye is never a loss)
  }
  const fin = rounds[4][0];
  if (me && fin.st === 'done' && (fin.a === me || fin.b === me)) place = fin.win === me ? 1 : 2;
  if (me && third && third.st === 'done' && (third.a === me || third.b === me)) place = third.win === me ? 3 : 4;
  if (me && third && (third.a === me || third.b === me)) path.push({k: 5, m: third});
  const champ = fin.st === 'done' ? fin.win : null;
  return {ps, rounds, third, me, path, place, champ, outIn: outIn != null && outIn < 3 ? outIn : null};
}
const tnOver = (e, now) => dayKey(now) > tnDayKey(e.wk, 4);
const tnPlaceText = (B) => B.place ? ['', 'Champion', 'Runner-up', '3rd place', '4th place'][B.place] : B.outIn != null ? `Out in the ${TN_ROUNDS[B.outIn]}` : null;
const tnOrd = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');

/* ---- locking finished days and telling you how they went ---- */
function tnTick(){
  if (!R || typeof RK_READY === 'undefined' || !RK_READY) return;
  tnData();
  if (typeof SYNC !== 'undefined' && SYNC.token && typeof syncFirstDone !== 'undefined' && !syncFirstDone) return;   // wait for the other device's sessions
  const now = Date.now(), today = dayKey(now);
  let changed = false;
  Object.values(R.tour.e).forEach(e => {
    if (!e || !e.my) return;
    for (let k = 0; k < 5; k++){ const dk = tnDayKey(e.wk, k); if (dk < today && e.my[k] == null){ e.my[k] = tnLogMin(dk); changed = true; } }
  });
  const e = tnEntry(tnWeekOf(now));
  if (e){
    const B = tnBracket(e, now), done = B.path.filter(p => p.m.st === 'done'), last = done[done.length - 1];
    const lastK = last ? last.k : -1;
    if (last && (e.seen ?? -1) < lastK){
      const m = last.m, mine = m.a === B.me ? m.ma : m.mb, theirs = m.a === B.me ? m.mb : m.ma, opp = m.a === B.me ? m.b : m.a;
      const rn = last.k === 5 ? 'third-place match' : ['Round of 32 match', 'Round of 16 match', 'quarterfinal', 'semifinal', 'Final'][last.k];
      const oName = bot(opp.w).name, noShow = theirs < TN_MIN, nextK = last.k + 1;
      const score = noShow ? `${fmtMin(mine)}, and ${oName} didn’t study enough to count` : `${fmtMin(mine)} to ${fmtMin(theirs)} against ${oName}`;
      const nextToday = nextK < 5 && tnDayKey(e.wk, nextK) === today;
      const won = m.win === B.me;
      const msg = B.place === 1 ? `You won the Weekly Tournament! ${score} in the Final.`
        : B.place ? `You finished ${tnOrd(B.place)} in the Weekly Tournament (${score} in the ${rn}).`
        : won ? `You won your ${rn}: ${score}.${nextToday ? ` Your ${['', 'Round of 16', 'quarterfinal', 'semifinal', 'Final'][nextK]} is today.` : ''}`
        : `${oName} knocked you out in the ${rn}: ${mine < TN_MIN ? `you had ${fmtMin(mine)}, under the 10 minutes needed` : `${fmtMin(mine)} to ${fmtMin(theirs)}`}.${last.k === 3 ? ' You play for 3rd place on Friday.' : ''}`;
      e.seen = lastK; changed = true;
      setTimeout(() => { toast(msg); if (B.place === 1) try { fx.burst(); } catch(x){} }, 1500);
    }
  }
  if (changed) tnSave();
  tnDot();
}
// a dot on the nav when sign-up is open and you haven't joined, or there's a round today you haven't played yet
function tnDot(){
  const now = Date.now(), su = tnSignupWeek(now), e = tnEntry(tnWeekOf(now));
  let on = !!(su && !tnEntry(su));
  if (!on && e && !tnOver(e, now)){ const B = tnBracket(e, now), p = B.path[B.path.length - 1]; on = !!(p && p.m.st === 'live' && (p.m.a === B.me ? p.m.ma : p.m.mb) < TN_MIN); }
  document.querySelectorAll('.tn-dot').forEach(d => { d.hidden = !on || (d.classList.contains('tn-more') && !!document.querySelector('.wn-more:not([hidden])')); });
}

/* ---- the page ---- */
const TN = {tab: null, wkView: null};
const tnAv = w => w === ME ? myAvatar('sm') : avatar(bot(w), 'sm');
const tnName = w => w === ME ? 'You' : esc(bot(w).name);
const tnClock = t => { const s = Math.max(0, Math.floor((t - Date.now()) / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`; };
function tnRow(p, mins, m, showMin){
  if (!p) return m.st === 'bye' ? `<div class="tn-p tbd"><span class="tn-seed"></span><span class="tn-nm">Bye (open place)</span><span class="tn-mn"></span></div>` : `<div class="tn-p tbd"><span class="tn-seed"></span><span class="tn-nm">TBD</span><span class="tn-mn"></span></div>`;
  const won = m.win === p, lead = m.st === 'live' && won, cls = [p.w === ME ? 'me' : '', m.st === 'done' ? (won ? 'win' : 'lose') : '', lead ? 'ahead' : ''].join(' ');
  return `<div class="tn-p ${cls}"${p.w === ME ? '' : ` data-bot="${p.w}"`}><span class="tn-seed">${p.seed}</span>${tnAv(p.w)}<span class="tn-nm">${tnName(p.w)}</span><span class="tn-mn">${showMin ? (mins < TN_MIN && m.st === 'done' ? `<i class="ff">${mins ? fmtMin(mins) : '0m'}</i>` : fmtMin(mins)) : ''}</span></div>`;
}
function tnMatchHtml(m, label){
  const show = m.st !== 'future' && m.st !== 'bye';
  return `<div class="tn-m ${m.st}${m.a && m.a.w === ME || m.b && m.b.w === ME ? ' mine' : ''}">${label ? `<div class="tn-ml">${label}</div>` : ''}${tnRow(m.a, m.ma, m, show)}${tnRow(m.b, m.mb, m, show)}${m.st === 'live' ? '<span class="tn-live">Live</span>' : ''}</div>`;
}
function tnTodayCard(e, B, now){
  if (B.me && dayKey(now) === tnDayKey(e.wk, 0) && B.path.some(x => x.k === 0 && x.m.st === 'bye'))
    return `<div class="card tn-today"><div class="tn-th"><div><small>Today · Round of 32</small><b>You have a bye today</b></div><div class="tn-cd"><small>Round of 16 starts in</small><b data-tn-cd>${tnClock(tnMidnight(now))}</b></div></div>
      <p class="hint">Your division has open places, so the top seeds skip the Round of 32. You’re already through to Tuesday’s Round of 16; studying today doesn’t count for the tournament.</p></div>`;
  const p = B.path[B.path.length - 1]; if (!p || p.m.st !== 'live') return '';
  const m = p.m, meA = m.a === B.me, mine = meA ? m.ma : m.mb, theirs = meA ? m.mb : m.ma, opp = meA ? m.b : m.a;
  const lead = mine - theirs, rn = p.k === 5 ? 'Third-place match' : TN_ROUNDS[p.k], top = Math.max(mine, theirs, 60);
  const status = mine < TN_MIN ? `Study ${TN_MIN - mine} more minute${TN_MIN - mine === 1 ? '' : 's'} today to count` : lead > 0 ? `You’re ahead by ${fmtMin(lead)}` : lead < 0 ? `You’re behind by ${fmtMin(-lead)}` : 'You’re level';
  return `<div class="card tn-today"><div class="tn-th"><div><small>Today · ${rn}</small><b>${status}</b></div><div class="tn-cd"><small>Round ends in</small><b data-tn-cd>${tnClock(tnMidnight(now))}</b></div></div>
    <div class="tn-vs">
      <div class="tn-side me">${myAvatar()}<b>You</b><small>Seed ${B.me.seed}</small><strong>${fmtMin(mine)}</strong><div class="tn-pg"><i style="width:${mine / top * 100}%"></i></div></div>
      <div class="tn-x">vs</div>
      <div class="tn-side" data-bot="${opp.w}">${avatar(bot(opp.w))}<b>${esc(bot(opp.w).name)}</b><small>Seed ${opp.seed} · ${emblem(rankOf(opp.r), 'xs')} ${opp.r.toLocaleString()} · ${esc(bot(opp.w).style)}</small><strong>${fmtMin(theirs)}</strong><div class="tn-pg them"><i style="width:${theirs / top * 100}%"></i></div></div>
    </div>
    <p class="hint">Only Focus-timer time counts. More minutes by midnight wins; a tie goes to the higher seed. ${typeof focusing === 'function' && focusing() ? '' : '<button class="small-btn accent" data-go="focus">Start studying</button>'}</p></div>`;
}
function tnPathHtml(B){
  return `<div class="tn-path">${[0, 1, 2, 3, 4].map(k => {
    const p = B.path.find(x => x.k === k), t = B.path.find(x => x.k === 5);
    let cls = 'future', txt = TN_DAYS[k];
    if (p){ const m = p.m, mine = m.a === B.me ? m.ma : m.mb, theirs = m.a === B.me ? m.mb : m.ma;
      if (m.st === 'bye'){ cls = 'won'; txt = 'Bye'; }
      else if (m.st === 'done'){ cls = m.win === B.me ? 'won' : 'lost'; txt = `${fmtMin(mine)} – ${fmtMin(theirs)}`; }
      else if (m.st === 'live'){ cls = 'live'; txt = 'Today'; } }
    else if (B.outIn != null && k > B.outIn) cls = 'gone';
    if (k === 4 && t && !p){ const m = t.m, mine = m.a === B.me ? m.ma : m.mb, theirs = m.a === B.me ? m.mb : m.ma;
      return `<div class="tn-step ${m.st === 'done' ? (m.win === B.me ? 'won' : 'lost') : m.st}"><small>3rd place</small><b>${m.st === 'done' ? `${fmtMin(mine)} – ${fmtMin(theirs)}` : m.st === 'live' ? 'Today' : 'Friday'}</b></div>`; }
    return `<div class="tn-step ${cls}"><small>${TN_SHORT[k]}</small><b>${txt}</b></div>`;
  }).join('')}</div>`;
}
// the bracket as a tree: one column per round, each match fed by the two beside it, your path in color
function tnTreeRow(p, mins, m){
  if (!p) return `<div class="tn-tr tbd"><span class="tn-seed"></span><span class="tn-nm">${m.st === 'bye' ? 'Bye' : 'TBD'}</span></div>`;
  const won = m.win === p, cls = [p.w === ME ? 'me' : '', m.st === 'done' || m.st === 'bye' ? (won ? 'win' : 'lose') : m.st === 'live' && won ? 'ahead' : ''].join(' ');
  const mn = m.st === 'done' || m.st === 'live' ? (mins < TN_MIN && m.st === 'done' ? `<i class="ff">${fmtMin(mins)}</i>` : fmtMin(mins)) : '';
  return `<div class="tn-tr ${cls}"${p.w === ME ? '' : ` data-bot="${p.w}"`} title="${p.w === ME ? 'You' : esc(bot(p.w).name)} · seed ${p.seed}"><span class="tn-seed">${p.seed}</span><span class="tn-nm">${tnName(p.w)}</span><span class="tn-mn">${mn}</span></div>`;
}
const tnTreeBox = (m, extra = '') => `<div class="tn-mt ${m.st}${m.a && m.a.w === ME || m.b && m.b.w === ME ? ' mine' : ''}${extra}">${tnTreeRow(m.a, m.ma, m)}${tnTreeRow(m.b, m.mb, m)}</div>`;
function tnBracketHtml(e, B, now){
  const onPath = m => B.me && (m.a === B.me || m.b === B.me) && (m.st !== 'done' || m.win === B.me);
  const cols = B.rounds.map((ms, k) => {
    const st = ms[0].st === 'bye' ? ms.find(m => m.st !== 'bye') : ms[0], live = ms.some(m => m.st === 'live');
    const date = new Date(tnDayKey(e.wk, k) + 'T00:00').toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
    const slots = ms.map(m => `<div class="tn-slot${onPath(m) ? ' path' : ''}">${tnTreeBox(m)}${k === 4 && B.third ? `<div class="tn-third"><small>3rd place</small>${tnTreeBox(B.third)}</div>` : ''}</div>`).join('');
    return `<div class="tn-col${live ? ' now' : ''}"><div class="tn-colh"><b>${TN_ROUNDS[k]}</b><small>${date}${live ? ' · live' : ''}</small></div><div class="tn-slots">${slots}</div></div>`;
  }).join('');
  const live = B.rounds.some(r => r.some(m => m.st === 'live'));
  return `<div class="card tn-bk"><div class="h first">Bracket</div><p class="hint tn-dayl">${live ? 'Today’s minutes are so far. ' : ''}Tap a name to see their profile.${B.me ? ' Your path is in color.' : ''}</p><div class="tn-tree" data-tn-tree>${cols}</div></div>`;
}
/* ---- the calendar: one row per week, Monday to Friday are that week's rounds ---- */
const TN_CAL_BACK = 12;     // months you can go back
function tnWeekEntry(wk, band){ const own = tnEntry(wk); return own || tnDivEntry(wk, band, tnDefDiv(wk, band)); }
function tnCalHtml(now){
  const today = dayKey(now), band = tnBandOf(Math.round(R.mmr)), d0 = new Date(now);
  if (!TN.cal) TN.cal = {y: d0.getFullYear(), m: d0.getMonth()};
  const {y, m} = TN.cal, first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const minM = new Date(d0.getFullYear(), d0.getMonth() - TN_CAL_BACK, 1), atMin = first <= minM, atMax = y === d0.getFullYear() && m === d0.getMonth();
  const rows = [];
  const sun0 = tnPlus(first, -first.getDay());       // rows run Sunday to Saturday; Monday to Friday of each row is a tournament
  for (let sun = sun0; sun <= last; sun = tnPlus(sun, 7)){
    const wkD = tnPlus(sun, 1);
    const wk = dayKey(wkD), started = wk <= today, own = tnEntry(wk), e = started ? tnWeekEntry(wk, band) : null;
    const B = e ? tnBracket(e, now) : null, champ = B && B.champ;
    const cells = [0, 1, 2, 3, 4, 5, 6].map(c => {
      const k = c - 1, dd = tnPlus(sun, c), dk = dayKey(dd), out = dd.getMonth() !== m, isToday = dk === today;
      let cls = 'tn-cd2' + (out ? ' out' : '') + (isToday ? ' today' : '') + (k < 0 || k > 4 ? ' wkend' : ''), body = '';
      if (k >= 0 && k <= 4){
        let res = '';
        if (own && B){
          const p = B.path.find(x => x.k === k) || (k === 4 ? B.path.find(x => x.k === 5) : null);
          if (p){ const mm = p.m, mine = mm.a === B.me ? mm.ma : mm.mb, theirs = mm.a === B.me ? mm.mb : mm.ma;
            if (mm.st === 'bye'){ cls += ' won'; res = '<i class="tn-r">Bye</i>'; }
            else if (mm.st === 'done'){ const w = mm.win === B.me; cls += w ? ' won' : ' lost'; res = `<i class="tn-r">${w ? '✓' : '✗'}<span> ${fmtMin(mine)}–${fmtMin(theirs)}</span></i>`; }
            else if (mm.st === 'live'){ cls += ' live'; res = `<i class="tn-r">●<span> live</span></i>`; } }
          else if (B.outIn != null && k > B.outIn) cls += ' gone';
        }
        if (k === 4 && champ && !own) res = `<span class="tn-cch" title="Champion: ${tnName(champ.w)}">${tnAv(champ.w)}</span>`;
        if (k === 4 && own && B && B.place) res = `<i class="tn-r tn-plc p${B.place}">${tnOrd(B.place)}</i>`;
        body = `<small class="tn-rn">${k === 4 && own && B && B.path.some(x => x.k === 5) ? '3rd' : TN_SHORT[k]}</small>${res}`;
      } else body = '<small class="tn-rn">Sign-up</small>';
      return `<span class="${cls}"><b>${dd.getDate()}</b>${body}</span>`;
    }).join('');
    const tag = own ? `<span class="tn-cwk mine">${tnDivName(own.div || 0)}</span>` : '';
    rows.push(started ? `<button class="tn-cw${own ? ' mine' : ''}" data-tn="view" data-wk="${wk}" data-band="${own ? own.band : band}" data-div="${own ? own.div || 0 : tnDefDiv(wk, band)}" title="${tnRange(wk)}${champ ? ' · champion ' + tnName(champ.w) : ''}">${cells}${tag}</button>`
      : `<div class="tn-cw future">${cells}${own ? tag : ''}</div>`);
  }
  return `<div class="card tn-cal"><div class="tn-ch"><div class="h first">Tournament calendar</div><div class="tn-cnav"><button class="small-btn" data-tn="cal" data-d="-1"${atMin ? ' disabled' : ''} aria-label="Previous month">‹</button><b>${first.toLocaleDateString([], {month: 'long', year: 'numeric'})}</b><button class="small-btn" data-tn="cal" data-d="1"${atMax ? ' disabled' : ''} aria-label="Next month">›</button></div></div>
    <div class="tn-cgrid"><div class="tn-cw head">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => `<span>${x}</span>`).join('')}</div>${rows.join('')}</div>
    <p class="hint">Each week is a tournament. Tap a week to open it: your own division if you played, otherwise one of your band’s. The picture on Friday is that division’s champion.</p></div>`;
}
function tnPastViewHtml(v, now){
  const own = tnEntry(v.wk), e = own && (!v.div || own.div === v.div || !own.div) && v.band === own.band ? own : tnDivEntry(v.wk, v.band, v.div || tnDefDiv(v.wk, v.band));
  const B = tnBracket(e, now), c = B.champ, f = B.rounds[4][0], over = tnOver(e, now);
  const ru = c ? (f.win === f.a ? f.b : f.a) : null, t = B.third && B.third.st === 'done' ? B.third : null;
  const pod = c ? [[1, c], [2, ru], [3, t && t.win], [4, t && (t.win === t.a ? t.b : t.a)]].filter(x => x[1]) : [];
  return `<div class="card tn-bar"><div><button class="small-btn" data-tn="back">← Back</button></div><div class="tn-vh"><b>Weekly Tournament · ${tnRange(e.wk)}</b><small>${e.div ? tnDivName(e.div) + ' · ' : ''}${TN_BANDS[e.band][2]} · ${e.past ? (over ? 'you didn’t play in this division' : 'another division, in progress') : 'your division'}</small></div>${!e.past && tnPlaceText(B) ? `<span class="tn-pill${B.place ? ' p' + B.place : ' out'}">${tnPlaceText(B)}</span>` : ''}</div>
    ${pod.length ? `<div class="card"><div class="h first">Top 4</div><div class="tn-pod">${pod.map(([n, p]) => `<div class="tn-po p${n}"${p.w === ME ? '' : ` data-bot="${p.w}"`}><span class="tn-pill p${n}">${tnOrd(n)}</span>${p.w === ME ? myAvatar() : avatar(bot(p.w))}<b>${tnName(p.w)}</b><small>Seed ${p.seed}</small></div>`).join('')}</div></div>` : ''}
    ${!e.past ? `<div class="card"><div class="h first">Your path</div>${tnPathHtml(B)}</div>` : ''}
    ${tnBracketHtml(e, B, now)}
    ${tnDivPickHtml(e.wk, e.band, e.div)}`;
}
// look at any other division of a week
function tnDivPickHtml(wk, band, cur){
  const D = tnDivCount(band, wk), mine = tnEntry(wk);
  return `<div class="card tn-dp"><div><div class="h first">Other divisions</div><p class="hint">${D.toLocaleString()} divisions of up to 32 in ${TN_BANDS[band][2]} the week of ${tnRange(wk)}.${mine && mine.div && mine.band === band ? ` You’re in ${tnDivName(mine.div)}.` : ''}</p></div>
    <form class="tn-dpf" data-wk="${wk}" data-band="${band}"><label>Division <input type="number" min="1" max="${D}" value="${cur || ''}" placeholder="1–${D.toLocaleString()}" inputmode="numeric"></label><button class="small-btn accent">Go</button><button type="button" class="small-btn" data-tn="rand">Random</button>${mine && mine.div && mine.band === band && cur !== mine.div ? '<button type="button" class="small-btn" data-tn="mine">Mine</button>' : ''}</form></div>`;
}
function tnRulesHtml(){
  return `<details class="card tn-rules"><summary><b>How it works</b></summary><ul>
    <li>One tournament a week. Sign up on Saturday or Sunday; it’s free.</li>
    <li>Each rank band runs thousands of divisions a week. You’re put in a random one: up to 32 players from your band, seeded by Elo. When a division isn’t full, the top seeds get a bye (a free pass) through the Round of 32. One round a day: Round of 32 on Monday through the Final on Friday.</li>
    <li>Each round lasts the whole day. Whoever studies more with the Focus timer by midnight wins. Under 10 minutes is a forfeit, and a tie goes to the higher seed.</li>
    <li>Lose and you’re out for the week. The two semifinal losers play for 3rd place on Friday.</li>
    <li>Tournaments don’t change your Elo. Prizes for the top 4 are coming soon.</li></ul></details>`;
}
function tnSignupHtml(wk, now){
  const e = tnEntry(wk), myR = Math.round(R.mmr), band = e ? e.band : tnBandOf(myR), end = new Date(wk + 'T00:00').getTime();
  if (!e) return `<div class="card tn-hero"><div><small>Sign-up open · closes in <span data-tn-cd-to="${end}">${tnClock(end)}</span></small><b>Weekly Tournament · ${tnRange(wk)}</b>
    <p>You’ll be put in a random division of up to 32 players from your band (${TN_BANDS[band][2]}, ${tnDivCount(band, wk).toLocaleString()} divisions this week). One round a day, Monday to Friday, decided by who studies more that day.</p></div>
    <button class="small-btn accent tn-join" data-tn="join">Join tournament</button></div>`;
  const B = tnBracket(e, now), first = B.rounds[0].find(m => m.a === B.me || m.b === B.me), opp = first.a === B.me ? first.b : first.a;
  const tops = B.ps.slice(0, 4).filter(p => p.w !== ME);
  return `<div class="card tn-hero in"><div><small>You’re in · starts in <span data-tn-cd-to="${end}">${tnClock(end)}</span></small><b>Weekly Tournament · ${tnRange(wk)}</b>
    <p>You’re in ${e.div ? tnDivName(e.div) : 'a division'} of ${TN_BANDS[band][2]}, seed ${B.me.seed} of ${B.ps.length}. ${opp ? `Monday’s Round of 32 is against <button class="lnk" data-bot="${opp.w}">${esc(bot(opp.w).name)}</button> (seed ${opp.seed}, ${opp.r.toLocaleString()} Elo).` : `Your division isn’t full, so you have a bye on Monday and start in Tuesday’s Round of 16.`}</p>
    <p class="hint">Top seeds: ${tops.slice(0, 3).map(p => `<button class="lnk" data-bot="${p.w}">${esc(bot(p.w).name)}</button> (${p.r.toLocaleString()})`).join(', ')}</p></div>
    <button class="small-btn" data-tn="leave">Leave</button></div>`;
}
function tnRender(){
  const box = $('#tnBody'); if (!box || $('#page-tourney').hidden) return;
  if (typeof RK_READY === 'undefined' || !RK_READY){ if (!box.firstChild) box.innerHTML = '<p class="hint">Loading players…</p>'; return; }
  const now = Date.now(), wk = tnWeekOf(now), e = tnEntry(wk), su = tnSignupWeek(now);
  let html = '';
  if (TN.wkView){ domMorph(box, tnPastViewHtml(TN.wkView, now)); tnTreeScroll(box); return; }
  if (su) html += tnSignupHtml(su, now);
  if (e){
    const B = tnBracket(e, now), over = tnOver(e, now), pl = tnPlaceText(B);
    const pill = B.place ? `<span class="tn-pill p${B.place}">${pl}</span>` : B.outIn != null ? `<span class="tn-pill out">${pl}</span>` : over ? '' : '<span class="tn-pill live">Still in</span>';
    html += `<div class="card tn-bar"><div><b>Weekly Tournament · ${tnRange(e.wk)}</b><small>${e.div ? tnDivName(e.div) + ' · ' : ''}${TN_BANDS[e.band][2]} · seed ${B.me.seed} of ${B.ps.length} · ${over ? 'finished' : 'unranked, Elo doesn’t change'}</small></div>${pill}</div>`;
    html += tnTodayCard(e, B, now);
    html += `<div class="card"><div class="h first">Your path</div>${tnPathHtml(B)}</div>`;
    html += tnBracketHtml(e, B, now);
    html += tnDivPickHtml(e.wk, e.band, e.div);
  } else if (!su){
    const sat = tnPlus(tnMonday(now), 5);
    html += `<div class="card tn-hero"><div><small>Next sign-up opens in <span data-tn-cd-to="${sat.getTime()}">${tnClock(sat.getTime())}</span></small><b>Weekly Tournament</b>
      <p>You’re not in this week’s tournament (sign-up closed when Monday started). Sign-up for the next one opens Saturday, ${sat.toLocaleDateString([], {month: 'short', day: 'numeric'})}.</p></div></div>`;
  }
  if (!e) html += tnDivPickHtml(wk, tnBandOf(Math.round(R.mmr)), null);
  html += tnCalHtml(now);
  html += tnRulesHtml();
  const open = box.querySelector('.tn-rules') && box.querySelector('.tn-rules').open;
  domMorph(box, html);
  tnTreeScroll(box);
  if (open) box.querySelector('.tn-rules').open = true;
}
function tnTreeScroll(box){
  const t = box.querySelector('[data-tn-tree]'); if (!t || t.dataset.sk === (TN.wkView ? TN.wkView.wk + TN.wkView.div : 'main')) return;
  t.dataset.sk = TN.wkView ? TN.wkView.wk + TN.wkView.div : 'main';
  const c = t.querySelector('.tn-col.now'); if (c && t.scrollWidth > t.clientWidth) t.scrollLeft = Math.max(0, c.getBoundingClientRect().left - t.getBoundingClientRect().left + t.scrollLeft - 4);
}
function tnCountdowns(){
  document.querySelectorAll('#tnBody [data-tn-cd]').forEach(el => { el.textContent = tnClock(tnMidnight(Date.now())); });
  document.querySelectorAll('#tnBody [data-tn-cd-to]').forEach(el => { el.textContent = tnClock(+el.dataset.tnCdTo); });
}
document.addEventListener('click', ev => {
  const t = ev.target.closest('#tnBody [data-tn]');
  if (t){
    const a = t.dataset.tn;
    if (a === 'join') tnJoin();
    else if (a === 'leave') tnLeave();
    else if (a === 'tab'){ TN.tab = +t.dataset.k; TN.tabWk = TN.wkView ? TN.wkView.wk : tnWeekOf(Date.now()); tnRender(); }
    else if (a === 'view'){ const wk = t.dataset.wk; TN.wkView = tnEntry(wk) && wk === tnWeekOf(Date.now()) ? null : {wk, band: +t.dataset.band, div: +t.dataset.div || 0}; TN.tab = null; tnRender(); window.scrollTo(0, 0); }
    else if (a === 'rand' || a === 'mine'){ const f = t.closest('.tn-dpf'), wk = f.dataset.wk, band = +f.dataset.band, own = tnEntry(wk);
      const div = a === 'mine' ? own.div : 1 + Math.floor(Math.random() * tnDivCount(band, wk));
      TN.wkView = a === 'mine' && wk === tnWeekOf(Date.now()) ? null : {wk, band, div}; TN.tab = null; tnRender(); window.scrollTo(0, 0); }
    else if (a === 'back'){ TN.wkView = null; TN.tab = null; tnRender(); }
    else if (a === 'cal'){ const c = TN.cal; const d = new Date(c.y, c.m + +t.dataset.d, 1); TN.cal = {y: d.getFullYear(), m: d.getMonth()}; tnRender(); }
    return;
  }
  const b = ev.target.closest('#tnBody [data-bot]');
  if (b && !ev.target.closest('a')){ ev.preventDefault(); openProfile(+b.dataset.bot); }
});
document.addEventListener('submit', ev => {
  const f = ev.target.closest('#tnBody .tn-dpf'); if (!f) return; ev.preventDefault();
  const band = +f.dataset.band, D = tnDivCount(band, f.dataset.wk), n = Math.round(+f.querySelector('input').value);
  if (!(n >= 1 && n <= D)){ toast(`Pick a division from 1 to ${D.toLocaleString()}.`); return; }
  const own = tnEntry(f.dataset.wk);
  TN.wkView = own && own.div === n && own.band === band && f.dataset.wk === tnWeekOf(Date.now()) ? null : {wk: f.dataset.wk, band, div: n}; TN.tab = null; tnRender(); window.scrollTo(0, 0);
});
{ const _s = onPageShown; onPageShown = function(name){ const x = _s.apply(this, arguments); if (name === 'tourney'){ TN.wkView = null; TN.cal = null; tnTick(); tnRender(); } return x; }; }
let tnLastDay = null;
setInterval(() => {
  const d = dayKey(Date.now());
  if (d !== tnLastDay){ tnLastDay = d; tnTick(); if (!$('#page-tourney').hidden) tnRender(); }
  tnCountdowns();
}, 1000);
setInterval(() => { tnTick(); if (!$('#page-tourney').hidden && !document.hidden) tnRender(); }, 30000);
(function tnStart(){ if (typeof RK_READY === 'undefined' || !RK_READY) return setTimeout(tnStart, 2000); tnTick(); tnRender(); })();
