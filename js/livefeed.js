/* ---------- Studying now: who's studying this minute, today's activity, what's trending, and a live feed ----------
   Everything comes from the shared world: the day's real study schedule (the same one the simulation uses) and
   the ranked pairings for the current 2-hour window, worked out ahead so each match shows the minute it finishes.
   Nothing is scripted: the feed fills fast in the evening and slows to a trickle at 4 AM, and a deterministic
   sample keeps it the same on every device. It pauses while you're in a focus block. */
const LF = {tab: (typeof P !== 'undefined' && P.lfTab) || 'you', at: 0, pairs: null, pairKey: '', hours: null, live: 0, peak: null, trend: [], events: [], frozen: false, sel: 0};
const LF_TABS = [['you', 'For you'], ['top', 'Top matches'], ['all', 'Everyone']];
const lfNow = () => { const w = new Date(worldT(Date.now())); return {dk: dayKey(w.getTime()), m: w.getHours() * 60 + w.getMinutes(), h: w.getHours()}; };
const lfHash = (i, t, salt) => (Math.imul(i ^ 0x2c1b3c6d, 0x297a2d39) ^ Math.imul(t + salt * 7919, 0x85ebca6b)) >>> 0;
const lfKeep = (i, t, salt, p) => lfHash(i, t, salt) / 4294967296 < p;
const lfFocusing = () => typeof S !== 'undefined' && S.running && S.phase === 'focus';

// the heavy parts that only change once a day or once a window (today's plan, past hours, the window's pairings and the
// index of sessions) are prepared in small steps, so opening Ranked never freezes; the refresh after that is quick
async function lfPrep(){
  if (LF.prepping || simBusy) return false;
  const {dk, m, h} = lfNow(), w0 = Math.floor(m / 120) * 120, key = dk + '|' + w0;
  if (planDay === dk && LF.pairKey === key && LF.hDay === dk && LF.hUpTo >= h && LF.ix && LF.ix.day === dk) return true;
  if (R.lastSlice < sliceStartOf(worldT(Date.now()))){ await dailySim(); return false; }
  LF.prepping = 1;
  try {
    if (planDay !== dk) await runGenAsync(plansGen(dk));
    if (LF.pairKey !== key){ LF.pairs = await runGenAsync(pairGen(w0, dk)); LF.pairKey = key; }
    if (LF.hDay !== dk || LF.hUpTo < h){
      const hc = new Int32Array(24), e = SCH_O[ROSTER_N]; let t = performance.now();
      for (let k = 0; k < e; k++){ const a = SCH_A[k], b = SCH_B[k]; for (let x = Math.floor(a / 60), hb = Math.min(h - 1, Math.floor((b - 1) / 60)); x <= hb; x++){ const mid = x * 60 + 30; if (a <= mid && b > mid) hc[x]++; }
        if ((k & 32767) === 0 && performance.now() - t > 10){ await breathe(); t = performance.now(); } }
      LF.hc = hc; LF.hDay = dk; LF.hUpTo = h;
    }
    await breathe(); lfIndex();
  } finally { LF.prepping = 0; }
  return true;
}
// the count, today's hours, the busiest hour and the current window's pairings
function lfCompute(){
  if (simBusy) return false;                     // the world is mid-update: keep showing what we have and try again shortly
  const {dk, m, h} = lfNow();
  plansFor(dk);
  // past hours never change, so they're counted once; only this minute is counted fresh
  const e = SCH_O[ROSTER_N];
  if (LF.hDay !== dk || LF.hUpTo < h){
    const hc = new Int32Array(24);
    for (let k = 0; k < e; k++){ const a = SCH_A[k], b = SCH_B[k]; for (let x = Math.floor(a / 60), hb = Math.min(h - 1, Math.floor((b - 1) / 60)); x <= hb; x++){ const mid = x * 60 + 30; if (a <= mid && b > mid) hc[x]++; } }
    LF.hc = hc; LF.hDay = dk; LF.hUpTo = h;
  }
  let live = 0; for (let k = 0; k < e; k++) if (SCH_A[k] <= m && SCH_B[k] > m) live++;
  const hours = LF.hc.slice(); hours[h] = live;
  const w0 = Math.floor(m / 120) * 120, key = dk + '|' + w0;
  // the window's pairings depend on everyone's ratings after the last window: only work them out once the world has caught up
  if (LF.pairKey !== key){
    if (R.lastSlice < sliceStartOf(worldT(Date.now()))){ if (!LF.waiting){ LF.waiting = 1; dailySim().then(() => { LF.waiting = 0; LF.at = 0; renderLive(true); }); } LF.pairs = []; }
    else { LF.pairs = pairWindow(w0, dk); LF.pairKey = key; }
  }
  let pk = 0; for (let x = 0; x <= h; x++) if (hours[x] > hours[pk]) pk = x;
  Object.assign(LF, {hours, live, peak: {h: pk, n: hours[pk]}, dk, m, at: Date.now()});
  try { const sb = sortedBots(); LF.top = botRating(sb[Math.min(999, sb.length - 1)]); } catch(e){ LF.top = 2400; }
  lfTrend(dk, m);
  LF.events = lfEvents(dk, m);
  return true;
}
// subjects among a sample of the people studying right now, scaled up to everyone
function lfTrend(dk, m){
  const e = SCH_O[ROSTER_N], cnt = new Map(); let seen = 0, step = Math.max(1, Math.floor(e / 60000)), i = 0;
  for (let k = 0; k < e && seen < 1200; k += step){
    if (!(SCH_A[k] <= m && SCH_B[k] > m)) continue;
    while (SCH_O[i + 1] <= k) i++;
    if (i >= ROSTER_N) break;
    const d = botDay(i, dk), s = d && d.sessions.find(x => x.a <= m && x.b >= m);
    if (s){ cnt.set(s.subj, (cnt.get(s.subj) || 0) + 1); seen++; }
  }
  const k0 = LF.live / Math.max(1, seen);
  LF.subj = new Map([...cnt.entries()].map(([s, n]) => [s, Math.round(n * k0)])); LF.subjMin = Math.max(1, Math.round(k0));
  LF.trend = [...cnt.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([s, n]) => [s, Math.round(n * k0)]);
}
// who counts as "for you": near your rating, people you've played, rivals, people you've messaged
function lfMine(){
  const set = new Set(Object.keys(R.rec || {}).map(Number));
  try { (DMS.msgs || []).forEach(x => set.add(x.w)); } catch(e){}
  return set;
}
function lfIndex(){
  if (LF.ix && LF.ix.day === planDay) return LF.ix;
  const e = SCH_O[ROSTER_N], own = new Int32Array(e), offA = new Int32Array(1443), offB = new Int32Array(1443), byA = new Int32Array(e), byB = new Int32Array(e);
  for (let i = 0; i < ROSTER_N; i++) for (let k = SCH_O[i]; k < SCH_O[i + 1]; k++) own[k] = i;
  for (let k = 0; k < e; k++){ offA[SCH_A[k] + 1]++; offB[SCH_B[k] + 1]++; }
  for (let x = 1; x < 1443; x++){ offA[x] += offA[x - 1]; offB[x] += offB[x - 1]; }
  const pa = offA.slice(), pb = offB.slice();
  for (let k = 0; k < e; k++){ byA[pa[SCH_A[k]]++] = k; byB[pb[SCH_B[k]]++] = k; }
  return (LF.ix = {day: planDay, own, offA, offB, byA, byB});
}
function lfEvents(dk, m){
  const out = [], mine = lfMine(), mm = R.mmr, from = m - 120, e = SCH_O[ROSTER_N];
  // sessions starting and finishing in the last 2 hours, and people passing 4 or 6 hours for the day
  const X = lfIndex(), lo0 = Math.max(0, from + 1), started = new Map();
  for (let q = X.offA[lo0], qe = X.offA[Math.min(1441, m + 1)]; q < qe; q++){
    const k = X.byA[q], i = X.own[k], a = SCH_A[k], b = SCH_B[k], near = Math.abs(botRating(i) - mm) <= 60, rel = mine.has(i);
    // a session that started in the last 2 hours shows as "started" while it's still going, and as "finished" once it's over
    const sYou = rel || (near && lfKeep(i, a, 1, .035)), sAll = lfKeep(i, a, 2, 1 / 900);
    if ((sYou || sAll) && b > m) out.push({t: a, i, kind: 'start', k, you: sYou, all: sAll});
    if (b <= m) started.set(k, [sYou, sAll]);
  }
  for (let q = X.offB[lo0], qe = X.offB[Math.min(1441, m + 1)]; q < qe; q++){
    const k = X.byB[q], i = X.own[k], a = SCH_A[k], b = SCH_B[k]; if (b - a < 20) continue;
    const near = Math.abs(botRating(i) - mm) <= 60, rel = mine.has(i), [sYou, sAll] = started.get(k) || [false, false];
    const you = sYou || rel || (near && lfKeep(i, b, 3, .03)), all = sAll || lfKeep(i, b, 4, (b - a >= 150 ? 1 / 60 : 1 / 1100));
    if (you || all) out.push({t: b, i, kind: 'end', k, min: b - a, you, all});
    let tot = 0; for (let x = SCH_O[i]; x <= k; x++) tot += SCH_B[x] - SCH_A[x];
    const prev = tot - (b - a), mile = [360, 240].find(x => prev < x && tot >= x);
    if (mile && (rel || lfKeep(i, b, 5, mile >= 360 ? 1 / 4 : 1 / 25))) out.push({t: b, i, kind: 'hours', h: mile / 60, you: rel || near, all: true});
  }
  // ranked matches between other players that have finished so far in this window
  for (const p of LF.pairs || []){
    const t = Math.max(p.ea, p.ec); if (t > m || t <= from) continue;
    const rel = mine.has(p.a) || mine.has(p.c), near = Math.abs(p.ra - mm) <= 60 || Math.abs(p.rc - mm) <= 60;
    const upset = Math.abs(p.ra - p.rc) >= 120 && ((p.ra < p.rc && p.ma > p.mc) || (p.rc < p.ra && p.mc > p.ma));
    const ev = {t, kind: 'match', p, upset, rel, top: p.ra + p.rc, you: rel || (near && lfKeep(p.a, t, 6, .07)), all: lfKeep(p.a, t, 7, upset ? 1 / 12 : 1 / 260)};
    if (ev.you || ev.all || Math.max(p.ra, p.rc) >= LF.top) out.push(ev);
    lfRankUps(out, p, t, mine, near);
  }
  // matches that finished in the previous window (already settled, so they come from the saved results, read once per window)
  const base = dayIdx(dk) * 1440, w0 = Math.floor(m / 120) * 120, mk = dk + '|' + w0 + '|' + R.lastSlice;
  if (LF.m5Key !== mk){
    const lo = base + w0 - 120, hi = base + w0, list = [];
    for (let s = 0, n = ROSTER_N * M5; s < n; s++){
      const opp = M5_OPP[s]; if (opp < 0) continue; const c = M5_T[s]; if (c <= lo || c > hi) continue;
      const i = (s / M5) | 0; if (i > opp) continue;
      list.push({a: i, c: opp, ma: M5_A[s], mc: M5_B[s], ra: M5_R[s] - M5_D[s], rc: M5_O[s], dlt: M5_D[s], ea: c - base, ec: c - base});
    }
    LF.m5Key = mk; LF.m5List = list;
  }
  for (const p of LF.m5List){
    const t = p.ea, i = p.a; if (t <= from) continue;
    const rel = mine.has(p.a) || mine.has(p.c), near = Math.abs(p.ra - mm) <= 60 || Math.abs(p.rc - mm) <= 60;
    const upset = Math.abs(p.ra - p.rc) >= 120 && ((p.ra < p.rc && p.ma > p.mc) || (p.rc < p.ra && p.mc > p.ma));
    { const ev = {t, kind: 'match', p, upset, rel, top: p.ra + p.rc, you: rel || (near && lfKeep(i, t, 6, .07)), all: lfKeep(i, t, 7, upset ? 1 / 12 : 1 / 260)}; if (ev.you || ev.all || Math.max(p.ra, p.rc) >= LF.top) out.push(ev); }
    lfRankUps(out, p, t, mine, near);
  }
  // your own matches
  (R.hist || []).forEach(h => { const tm = new Date(worldT(h.t)), mins = tm.getHours() * 60 + tm.getMinutes(); if (Date.now() - h.t < 2 * 3600e3 && dayKey(tm.getTime()) === dk) out.push({t: mins, kind: 'mine', h, you: true, all: false}); });
  return out.sort((x, y) => y.t - x.t);
}
function lfRankUps(out, p, t, mine, near){
  const up = (r, nr, who) => { const x0 = rankOf(r), x1 = rankOf(clampN(nr, 300, 5000)); if (x1.i > x0.i || (x1.i === x0.i && x1.d > x0.d)) { const you = mine.has(who) || (near && lfKeep(who, t, 9, .3)), all = x1.i >= 6 || lfKeep(who, t, 8, 1 / 80); if (you || all) out.push({t, i: who, kind: 'rank', rk: x1, you, all}); } };
  up(p.ra, p.ra + p.dlt, p.a); up(p.rc, p.rc - p.dlt, p.c);
}
function lfAgo(t){ const d = LF.m - t; return d <= 0 ? 'now' : d < 60 ? `${d}m` : `${Math.floor(d / 60)}h`; }
// a subject you can hover (or tap) to see how many are studying it right now
const lfSubj = s => { const n = LF.subj && LF.subj.get(s), tip = n ? `${n.toLocaleString()} studying ${s} right now` : `Under ${(LF.subjMin || 1).toLocaleString()} studying ${s} right now`; return `<span class="lf-subj" tabindex="0" data-tip="${esc(tip)}">${esc(s)}</span>`; };
const lfName = i => `<button class="lnk" data-bot="${i}">${esc(bot(i).name)}</button>`;
function lfRow(ev){
  let ic = 'play', txt = '';
  if (ev.kind === 'start'){ const d = botDay(ev.i, LF.dk), s = d && d.sessions.find(x => x.a === SCH_A[ev.k]); txt = `${lfName(ev.i)} <span>started ${s ? `${esc(MODE_NAMES[s.mode] || 'a session')} on ${lfSubj(s.subj)}` : 'studying'}</span>`; }
  else if (ev.kind === 'end'){ const d = botDay(ev.i, LF.dk), s = d && d.sessions.find(x => x.a === SCH_A[ev.k]); ic = 'check'; txt = `${lfName(ev.i)} <span>finished ${ev.min >= 90 ? `${Math.floor(ev.min / 60)} h ${ev.min % 60 ? `${ev.min % 60} min` : ''}` : `${ev.min} min`}${s ? ` of ${lfSubj(s.subj)}` : ''}</span>`; }
  else if (ev.kind === 'hours'){ ic = 'flame'; txt = `${lfName(ev.i)} <span>passed ${ev.h} hours today</span>`; }
  else if (ev.kind === 'rank'){ ic = 'up'; txt = `${lfName(ev.i)} <span>reached ${emblem(ev.rk, 'xs')} ${esc(ev.rk.full)}</span>`; }
  else if (ev.kind === 'match'){ const p = ev.p, aw = p.ma >= p.mc, w = aw ? p.a : p.c, l = aw ? p.c : p.a, wm = Math.max(p.ma, p.mc), lm = Math.min(p.ma, p.mc), d = Math.abs(p.dlt);
    ic = 'swords'; txt = p.ma === p.mc ? `${lfName(p.a)} <span>drew with</span> ${lfName(p.c)} <span>· ${wm}–${lm} min</span>` : `${lfName(w)} <em class="lft-d up">+${d}</em> <span>beat</span> ${lfName(l)} <em class="lft-d down">−${d}</em> <span>· ${wm}–${lm} min</span>${ev.upset ? ' <b class="lf-tag">Upset</b>' : ''}`; }
  else if (ev.kind === 'mine'){ const h = ev.h; ic = 'you'; txt = `<b>You</b> <span>${({W: 'beat', L: 'lost to', D: 'drew with'})[h.r]}</span> ${lfName(h.b)} <span>· ${h.you}–${h.them} min${h.f ? ' · friendly' : ` · ${h.d > 0 ? '+' : ''}${h.d}`}</span>`; }
  return `<li class="lf-${ev.kind}"><i class="lf-ic lf-ic-${ic}" aria-hidden="true"></i><span class="lf-txt">${txt}</span><time>${lfAgo(ev.t)}</time></li>`;
}
function lfTopRow(ev){
  const p = ev.p, draw = p.ma === p.mc, aw = p.ma > p.mc;
  const side = (i, r, mins, d) => { const q = posOf(i) + 1, pos = q <= 1000 ? `#${q} · ` : '', cls = d > 0 ? 'up' : d < 0 ? 'down' : '';
    return `<span class="lft-p${d > 0 ? ' won' : ''}">${avatar(bot(i), 'sm')}<span>${lfName(i)}<small>${pos}${emblem(rankOf(r), 'xs')} ${r.toLocaleString()} · ${mins} min</small><em class="lft-d ${cls}">${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)} Elo</em></span></span>`; };
  const ago = lfAgo(ev.t);
  return `<li>${side(p.a, p.ra, p.ma, p.dlt)}<span class="lft-vs">${draw ? 'Draw' : 'vs'}<time>${ago === 'now' ? 'just now' : ago + ' ago'}</time></span>${side(p.c, p.rc, p.mc, -p.dlt)}</li>`;
}
function renderLive(force){
  // it's drawn on Ranked, and in the Feed's Live tab
  const rk = $('#rkLive'), fl = $('#fdLive'), rkOn = rk && !$('#page-ranked').hidden, flOn = fl && !$('#page-feed').hidden;
  const el = rkOn ? rk : flOn ? fl : rk; if (!el || !RK_READY) return;
  const shown = rkOn || flOn;
  if (!force && (!shown || (lfFocusing() && el.firstChild))){ lfSide(); if (shown && lfFocusing() && !LF.frozen){ LF.frozen = true; const n = el.querySelector('.lf-pause'); if (n) n.hidden = false; } return; }
  LF.frozen = false;
  if (Date.now() - LF.at > 25000 || !LF.hours){
    const {dk, m, h} = lfNow();
    const ready = planDay === dk && LF.pairKey === dk + '|' + Math.floor(m / 120) * 120 && LF.hDay === dk && LF.hUpTo >= h && LF.ix && LF.ix.day === dk;
    if (!ready){ if (!LF.hours && !el.firstChild) el.innerHTML = '<div class="h first lf-h"><span><i class="lf-dot" aria-hidden="true"></i>Studying now</span></div><p class="hint">Counting who’s studying…</p>';
      lfPrep().then(ok => { if (ok){ LF.at = 0; renderLive(true); } }); if (!LF.hours) return; }
    else lfCompute();
  }
  if (!LF.hours) return;
  const key = LF.at + '|' + LF.tab + '|' + R.mmr;
  if (!force && LF.drawn === key && el.firstChild) return;
  LF.drawn = key;
  const H = LF.hours, mx = Math.max(1, ...H), {h} = lfNow();
  const bars = Array.from({length: 24}, (_, x) => x > h ? '<span class="fut"><i></i></span>'
    : `<span class="${x === h ? 'now' : ''}${x < 4 ? ' tl' : x > 19 ? ' tr' : ''}" tabindex="0" data-tip="${x === h ? 'Now' : hourLabel(x)}: ${H[x].toLocaleString()} studying"><i style="--v:${Math.max(.04, H[x] / mx).toFixed(3)}"></i></span>`).join('');
  const tmax = LF.trend.length ? LF.trend[0][1] : 1;
  let list;
  if (LF.tab === 'top'){
    const top = LF.events.filter(x => x.kind === 'match' && Math.max(x.p.ra, x.p.rc) >= LF.top).slice(0, 60);
    const live = typeof wLiveTop === 'function' ? wLiveTop() : [];
    const liveHtml = live.length ? `<div class="lf-sub lf-livehd"><i class="lf-dot" aria-hidden="true"></i>Live now</div><ul class="lf-live">${live.map(p => { const {m} = lfNow(); return `<li><span class="lf-txt">${lfName(p.a)} <span>vs</span> ${lfName(p.c)}<small>${Math.max(p.ra, p.rc).toLocaleString()} Elo · ${Math.round(m - Math.max(p.ea - p.ma, p.ec - p.mc))} min in</small></span><button class="small-btn" data-watch="${p.a}-${p.c}">Watch</button></li>`; }).join('')}</ul><div class="lf-sub">Finished</div>` : '';
    list = liveHtml + (top.length ? `<ol class="lf-top">${top.map(lfTopRow).join('')}</ol>` : '<p class="hint">None in the last 2 hours. The top players are quiet right now.</p>');
  } else {
    const evs = LF.events.filter(x => LF.tab === 'you' ? x.you : x.all).slice(0, 40);
    list = evs.length ? `<ul class="lf-feed">${evs.map(lfRow).join('')}</ul>` : `<p class="hint">${LF.tab === 'you' ? 'Nothing from players near your rating in the last 2 hours.' : 'It’s quiet right now.'}</p>`;
  }
  if (typeof elLiveHtml === 'function') list = elLiveHtml() + list;
  el.innerHTML = `<div class="h first lf-h"><span><i class="lf-dot" aria-hidden="true"></i>Studying now</span><small>${new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}</small></div>
    <div class="lf-count"><b>${LF.live.toLocaleString()}</b><span>of ${(ROSTER_N + 1).toLocaleString()} players</span></div>
    <p class="hint lf-peak">${LF.peak && LF.peak.h !== h ? `Busiest so far today: ${hourLabel(LF.peak.h)}, ${LF.peak.n.toLocaleString()} studying.` : 'This is the busiest hour so far today.'}</p>
    <div class="lf-bars" aria-label="Players studying in each hour today">${bars}</div>
    <div class="lf-axis"><span>12 AM</span><span>6 AM</span><span>noon</span><span>6 PM</span><span>11 PM</span></div>
    ${LF.trend.length ? `<div class="lf-sub">Trending right now</div><div class="lf-trend">${LF.trend.map(([s, n]) => `<div><span>${lfSubj(s)}</span><i><b style="width:${Math.round(n / tmax * 100)}%"></b></i><em>${n.toLocaleString()}</em></div>`).join('')}</div>` : ''}
    <div class="lf-tabs" role="tablist">${LF_TABS.map(([k, n]) => `<button role="tab" data-lft="${k}" aria-selected="${LF.tab === k}">${n}</button>`).join('')}</div>
    <p class="hint lf-pause" hidden>Paused while you focus.</p>
    ${list}
    <div class="lf-btns"><button class="small-btn accent" data-lfa="join">Join them</button><button class="small-btn" data-lfa="match">Find a match</button></div>`;
  if (rkOn && flOn) fl.innerHTML = el.innerHTML; else if (el === rk && fl) fl.innerHTML = el.innerHTML; else if (el === fl && rk) rk.innerHTML = el.innerHTML;
  lfSide();
}
// keep the numbers fresh for the Feed (count, hours, trending, events); calls back once a slow first prep is done
function lfFresh(cb){
  if (!RK_READY) return false;
  if (LF.hours && Date.now() - LF.at < 25000) return true;
  const {dk, m, h} = lfNow(), ready = planDay === dk && LF.pairKey === dk + '|' + Math.floor(m / 120) * 120 && LF.hDay === dk && LF.hUpTo >= h && LF.ix && LF.ix.day === dk;
  if (!ready){ lfPrep().then(ok => { if (ok){ LF.at = 0; cb && cb(); } }); return !!LF.hours; }
  try { lfCompute(); } catch(e){ console.error(e); }
  return !!LF.hours;
}
const hourLabel = x => x === 0 ? '12 AM' : x < 12 ? `${x} AM` : x === 12 ? 'noon' : `${x - 12} PM`;
function lfSide(){
  const b = $('#navLive'); if (!b || !RK_READY) return;
  if (!simBusy && (!LF.sideAt || Date.now() - LF.sideAt > 60000)){
    const {dk, m} = lfNow();
    if (planDay === dk){ let live = 0; for (let k = 0, e = SCH_O[ROSTER_N]; k < e; k++) if (SCH_A[k] <= m && SCH_B[k] > m) live++; LF.live = live; LF.sideAt = Date.now(); }
    else if (!LF.hours) { try { if (lfCompute()) LF.sideAt = Date.now(); } catch(e){ return; } }
  }
  if (!LF.hours && !LF.sideAt) return;
  b.hidden = false; b.querySelector('b').textContent = LF.live.toLocaleString();
}
document.addEventListener('click', e => {
  // tap a bar (phones) to see its count; tap anywhere else to hide it
  const bar = e.target.closest('.lf-bars span[data-tip]');
  document.querySelectorAll('.lf-bars .tip').forEach(x => { if (x !== bar) x.classList.remove('tip'); });
  if (bar){ bar.classList.toggle('tip'); return; }
  const sj = e.target.closest('.lf-subj'); document.querySelectorAll('.lf-subj.tip').forEach(x => { if (x !== sj) x.classList.remove('tip'); }); if (sj){ sj.classList.toggle('tip'); return; }
  const t = e.target.closest('[data-lft]');
  if (t){ LF.tab = t.dataset.lft; P.lfTab = LF.tab; try { saveP(); } catch(err){} renderLive(true); return; }
  const a = e.target.closest('[data-lfa]');
  if (a){
    if (a.dataset.lfa === 'join'){ showPage('focus'); if (!S.running) start(); }
    else if (!R.on) toast('Turn on Ranked matches below to play.');
    else { showPage('focus'); startSearch(); }
    return;
  }
  if (e.target.closest('#navLive')){ if (typeof FDV !== 'undefined') FDV.tab = 'live'; showPage('feed'); }
  const bb = e.target.closest('#rkLive [data-bot], #fdLive [data-bot], #fdSide [data-bot], #fdStrip [data-bot]'); if (bb){ e.stopPropagation(); openProfile(+bb.dataset.bot); }
});
setInterval(() => { try { renderLive(); } catch(e){ console.error(e); } }, 30000);
// draw it with the rest of the Ranked page
const _renderRanked0 = renderRanked;
renderRanked = function(){ const r = _renderRanked0.apply(this, arguments); try { renderLive(); } catch(e){ console.error(e); } return r; };

// today's picture for every subject, from a sample of everyone who has studied so far today (scaled up): how many studied
// it, when, and which majors. Worked out on the first hover and kept for 10 minutes.
let LFS = null;
function lfSubjDay(){
  const {dk, m} = lfNow();
  if (LFS && LFS.dk === dk && Date.now() - LFS.at < 600000) return LFS;
  if (planDay !== dk || !SCH_O) return null;
  let active = 0; const act = [];
  for (let i = 0; i < ROSTER_N; i++){ const a = SCH_O[i], b = SCH_O[i + 1]; if (b > a && SCH_A[a] <= m){ active++; if ((i * 2654435761 >>> 0) % 260 === 0) act.push(i); } }
  const map = new Map(); let seen = 0;
  for (const i of act.slice(0, 3000)){
    const d = botDay(i, dk); if (!d) continue; seen++;
    const subs = new Set(); d.sessions.forEach(x => { if (x.a > m) return; subs.add(x.subj);
      const e = map.get(x.subj) || {n: 0, h: new Array(24).fill(0), maj: new Map()}; for (let t = x.a; t < Math.min(x.b, m); t += 30) e.h[Math.floor(t / 60) % 24]++; map.set(x.subj, e); });
    subs.forEach(sj => { const e = map.get(sj); e.n++; const mj = bot(i).major; e.maj.set(mj, (e.maj.get(mj) || 0) + 1); });
  }
  LFS = {dk, at: Date.now(), map, k: active / Math.max(1, seen), active}; return LFS;
}
function lfSubjCard(sj){
  const now = LF.subj && LF.subj.get(sj), D = lfSubjDay(), e = D && D.map.get(sj), {h} = lfNow();
  const today = e ? Math.max(now || 0, Math.round(e.n * D.k)) : null, mx = e ? Math.max(1, ...e.h) : 1;
  const bars = e ? e.h.map((v, x) => `<i class="${x > h ? 'fut' : x === h ? 'now' : ''}" style="--v:${x > h ? .04 : Math.max(.04, v / mx).toFixed(3)}"></i>`).join('') : '';
  const majors = e ? [...e.maj.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => (MAJOR_BY[k] || {}).n).filter(Boolean) : [];
  let pk = 0; if (e) e.h.forEach((v, x) => { if (x <= h && v > e.h[pk]) pk = x; });
  return `<div class="lfc-t">${esc(sj)}</div>
    <div class="lfc-nums"><div><b><i class="lf-dot" aria-hidden="true"></i>${now ? now.toLocaleString() : `<${(LF.subjMin || 1).toLocaleString()}`}</b><small>studying now</small></div>
      <div><b>${today != null ? today.toLocaleString() : '…'}</b><small>studied it today</small></div></div>
    ${e ? `<div class="lfc-bars">${bars}</div><div class="lfc-axis"><span>12 AM</span><span>noon</span><span>11 PM</span></div>
      <div class="lfc-foot">${e.h[pk] ? `Busiest at ${hourLabel(pk)}` : ''}${majors.length ? `${e.h[pk] ? ' · ' : ''}Mostly ${majors.map(esc).join(', ')}` : ''}</div>` : '<div class="lfc-foot">Too few people studied this today to say more.</div>'}`;
}
// the card floats above everything, so scrolling lists can't cut it off
{ let card = null, cur = null, hideT = null;
  const show = el => { clearTimeout(hideT); if (!card){ card = document.createElement('div'); card.className = 'lf-card-pop'; document.body.appendChild(card);
      card.addEventListener('mouseenter', () => clearTimeout(hideT)); card.addEventListener('mouseleave', () => hide()); }
    const sj = el.textContent; if (cur !== el || card.hidden){ card.innerHTML = lfSubjCard(sj); cur = el; }
    card.hidden = false; const r = el.getBoundingClientRect(), w = card.offsetWidth, hgt = card.offsetHeight;
    let x = r.left + r.width / 2 - w / 2; x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
    let y = r.top - hgt - 8; if (y < 8) y = r.bottom + 8;
    card.style.left = x + 'px'; card.style.top = y + 'px'; };
  const hide = (later) => { clearTimeout(hideT); hideT = setTimeout(() => { if (card) card.hidden = true; cur = null; }, later ? 160 : 0); };
  document.addEventListener('mouseover', e => { const el = e.target.closest('.lf-subj'); if (el) show(el); });
  document.addEventListener('mouseout', e => { if (e.target.closest('.lf-subj')) hide(true); });
  document.addEventListener('focusin', e => { const el = e.target.closest('.lf-subj'); if (el) show(el); });
  document.addEventListener('click', e => { const el = e.target.closest('.lf-subj'); if (el) show(el); else if (!e.target.closest('.lf-card-pop')) hide(); });
  window.addEventListener('scroll', () => hide(), true);
}
