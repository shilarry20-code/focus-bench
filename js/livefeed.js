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

// the count, today's hours, the busiest hour and the current window's pairings
function lfCompute(){
  const {dk, m, h} = lfNow();
  plansFor(dk);
  const hours = new Int32Array(24); let live = 0;
  const e = SCH_O[ROSTER_N];
  for (let k = 0; k < e; k++){
    const a = SCH_A[k], b = SCH_B[k];
    if (a <= m && b > m) live++;
    for (let x = Math.floor(a / 60), hb = Math.min(h, Math.floor((b - 1) / 60)); x <= hb; x++){ const mid = x === h ? m : x * 60 + 30; if (a <= mid && b > mid) hours[x]++; }
  }
  hours[h] = live;
  const w0 = Math.floor(m / 120) * 120, key = dk + '|' + w0;
  if (LF.pairKey !== key){ LF.pairs = pairWindow(w0, dk); LF.pairKey = key; }
  let pk = 0; for (let x = 0; x <= h; x++) if (hours[x] > hours[pk]) pk = x;
  Object.assign(LF, {hours, live, peak: {h: pk, n: hours[pk]}, dk, m, at: Date.now()});
  try { const sb = sortedBots(); LF.top = botRating(sb[Math.min(999, sb.length - 1)]); } catch(e){ LF.top = 2400; }
  lfTrend(dk, m);
  LF.events = lfEvents(dk, m);
}
// subjects among a sample of the people studying right now, scaled up to everyone
function lfTrend(dk, m){
  const e = SCH_O[ROSTER_N], cnt = new Map(); let seen = 0, step = Math.max(1, Math.floor(e / 120000)), i = 0;
  for (let k = 0; k < e && seen < 2500; k += step){
    if (!(SCH_A[k] <= m && SCH_B[k] > m)) continue;
    while (SCH_O[i + 1] <= k) i++;
    if (i >= ROSTER_N) break;
    const d = botDay(i, dk), s = d && d.sessions.find(x => x.a <= m && x.b >= m);
    if (s){ cnt.set(s.subj, (cnt.get(s.subj) || 0) + 1); seen++; }
  }
  LF.trend = [...cnt.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([s, n]) => [s, Math.round(n / Math.max(1, seen) * LF.live)]);
}
// who counts as "for you": near your rating, people you've played, rivals, people you've messaged
function lfMine(){
  const set = new Set(Object.keys(R.rec || {}).map(Number));
  try { (DMS.msgs || []).forEach(x => set.add(x.w)); } catch(e){}
  return set;
}
function lfEvents(dk, m){
  const out = [], mine = lfMine(), mm = R.mmr, from = m - 120, e = SCH_O[ROSTER_N];
  // sessions starting and finishing, and people passing 4 or 6 hours for the day
  let i = 0;
  for (let k = 0; k < e; k++){
    while (SCH_O[i + 1] <= k) i++;
    const a = SCH_A[k], b = SCH_B[k], r = botRating(i), near = Math.abs(r - mm) <= 60, rel = mine.has(i);
    if (a > from && a <= m){
      const you = rel || (near && lfKeep(i, a, 1, .035)), all = lfKeep(i, a, 2, 1 / 900);
      if (you || all) out.push({t: a, i, kind: 'start', k, you, all});
    }
    if (b > from && b <= m && b - a >= 20){
      const you = rel || (near && lfKeep(i, b, 3, .03)), all = lfKeep(i, b, 4, (b - a >= 150 ? 1 / 60 : 1 / 1100));
      if (you || all) out.push({t: b, i, kind: 'end', k, min: b - a, you, all});
      // passing 4 or 6 hours today
      let tot = 0; for (let q = SCH_O[i]; q <= k; q++) tot += SCH_B[q] - SCH_A[q];
      const prev = tot - (b - a), mile = [360, 240].find(x => prev < x && tot >= x);
      if (mile && (rel || lfKeep(i, b, 5, mile >= 360 ? 1 / 4 : 1 / 25))) out.push({t: b, i, kind: 'hours', h: mile / 60, you: rel || near, all: true});
    }
  }
  // ranked matches between other players that have finished so far in this window
  for (const p of LF.pairs || []){
    const t = Math.max(p.ea, p.ec); if (t > m || t <= from) continue;
    const rel = mine.has(p.a) || mine.has(p.c), near = Math.abs(p.ra - mm) <= 60 || Math.abs(p.rc - mm) <= 60;
    const upset = Math.abs(p.ra - p.rc) >= 120 && ((p.ra < p.rc && p.ma > p.mc) || (p.rc < p.ra && p.mc > p.ma));
    const ev = {t, kind: 'match', p, upset, rel, top: p.ra + p.rc, you: rel || (near && lfKeep(p.a, t, 6, .07)), all: lfKeep(p.a, t, 7, upset ? 1 / 12 : 1 / 260)};
    out.push(ev);
    lfRankUps(out, p, t, mine, near);
  }
  // matches that finished in the previous window (already settled, so they come from the saved results)
  const base = dayIdx(dk) * 1440, w0 = Math.floor(m / 120) * 120, lo = base + from, hi = base + w0;
  for (let s = 0, n = ROSTER_N * M5; s < n; s++){
    const opp = M5_OPP[s]; if (opp < 0) continue; const c = M5_T[s]; if (c <= lo || c > hi) continue;
    const i = (s / M5) | 0; if (i > opp) continue;
    const t = c - base, p = {a: i, c: opp, ma: M5_A[s], mc: M5_B[s], ra: M5_R[s] - M5_D[s], rc: M5_O[s], dlt: M5_D[s], ea: t, ec: t};
    const rel = mine.has(i) || mine.has(opp), near = Math.abs(p.ra - mm) <= 60 || Math.abs(p.rc - mm) <= 60;
    const upset = Math.abs(p.ra - p.rc) >= 120 && ((p.ra < p.rc && p.ma > p.mc) || (p.rc < p.ra && p.mc > p.ma));
    out.push({t, kind: 'match', p, upset, rel, top: p.ra + p.rc, you: rel || (near && lfKeep(i, t, 6, .07)), all: lfKeep(i, t, 7, upset ? 1 / 12 : 1 / 260)});
    lfRankUps(out, p, t, mine, near);
  }
  // your own matches
  (R.hist || []).forEach(h => { const tm = new Date(worldT(h.t)), mins = tm.getHours() * 60 + tm.getMinutes(); if (Date.now() - h.t < 2 * 3600e3 && dayKey(tm.getTime()) === dk) out.push({t: mins, kind: 'mine', h, you: true, all: false}); });
  return out.sort((x, y) => y.t - x.t);
}
function lfRankUps(out, p, t, mine, near){
  const up = (r, nr, who) => { const x0 = rankOf(r), x1 = rankOf(clampN(nr, 300, 5000)); if (x1.i > x0.i || (x1.i === x0.i && x1.d > x0.d)) out.push({t, i: who, kind: 'rank', rk: x1, you: mine.has(who) || (near && lfKeep(who, t, 9, .3)), all: x1.i >= 6 || lfKeep(who, t, 8, 1 / 80)}); };
  up(p.ra, p.ra + p.dlt, p.a); up(p.rc, p.rc - p.dlt, p.c);
}
function lfAgo(t){ const d = LF.m - t; return d <= 0 ? 'now' : d < 60 ? `${d}m` : `${Math.floor(d / 60)}h`; }
const lfName = i => `<button class="lnk" data-bot="${i}">${esc(bot(i).name)}</button>`;
function lfRow(ev){
  let ic = 'play', txt = '';
  if (ev.kind === 'start'){ const d = botDay(ev.i, LF.dk), s = d && d.sessions.find(x => x.a === SCH_A[ev.k]); txt = `${lfName(ev.i)} <span>started ${s ? `${esc(MODE_NAMES[s.mode] || 'a session')} on ${esc(s.subj)}` : 'studying'}</span>`; }
  else if (ev.kind === 'end'){ const d = botDay(ev.i, LF.dk), s = d && d.sessions.find(x => x.a === SCH_A[ev.k]); ic = 'check'; txt = `${lfName(ev.i)} <span>finished ${ev.min >= 90 ? `${Math.floor(ev.min / 60)} h ${ev.min % 60 ? `${ev.min % 60} min` : ''}` : `${ev.min} min`}${s ? ` of ${esc(s.subj)}` : ''}</span>`; }
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
  const el = $('#rkLive'); if (!el || !RK_READY) return;
  const page = $('#page-ranked'), shown = page && !page.hidden;
  if (!force && (!shown || (lfFocusing() && el.firstChild))){ lfSide(); if (shown && lfFocusing() && !LF.frozen){ LF.frozen = true; const n = el.querySelector('.lf-pause'); if (n) n.hidden = false; } return; }
  LF.frozen = false;
  if (Date.now() - LF.at > 25000 || !LF.hours) lfCompute();
  const key = LF.at + '|' + LF.tab + '|' + R.mmr;
  if (!force && LF.drawn === key && el.firstChild) return;
  LF.drawn = key;
  const H = LF.hours, mx = Math.max(1, ...H), {h} = lfNow();
  const bars = Array.from({length: 24}, (_, x) => x > h ? '<i class="fut"></i>' : `<i style="--v:${Math.max(.04, H[x] / mx).toFixed(3)}"${x === h ? ' class="now"' : ''} title="${hourLabel(x)}: ${H[x].toLocaleString()}"></i>`).join('');
  const tmax = LF.trend.length ? LF.trend[0][1] : 1;
  let list;
  if (LF.tab === 'top'){
    const top = LF.events.filter(x => x.kind === 'match' && Math.max(x.p.ra, x.p.rc) >= LF.top).slice(0, 30);
    const live = typeof wLiveTop === 'function' ? wLiveTop() : [];
    const liveHtml = live.length ? `<div class="lf-sub lf-livehd"><i class="lf-dot" aria-hidden="true"></i>Live now</div><ul class="lf-live">${live.map(p => { const {m} = lfNow(); return `<li><span class="lf-txt">${lfName(p.a)} <span>vs</span> ${lfName(p.c)}<small>${Math.max(p.ra, p.rc).toLocaleString()} Elo · ${Math.round(m - Math.max(p.ea - p.ma, p.ec - p.mc))} min in</small></span><button class="small-btn" data-watch="${p.a}-${p.c}">Watch</button></li>`; }).join('')}</ul><div class="lf-sub">Finished</div>` : '';
    list = liveHtml + (top.length ? `<ol class="lf-top">${top.map(lfTopRow).join('')}</ol>` : '<p class="hint">None in the last 2 hours. The top players are quiet right now.</p>');
  } else {
    const evs = LF.events.filter(x => LF.tab === 'you' ? x.you : x.all).slice(0, 40);
    list = evs.length ? `<ul class="lf-feed">${evs.map(lfRow).join('')}</ul>` : `<p class="hint">${LF.tab === 'you' ? 'Nothing from players near your rating in the last 2 hours.' : 'It’s quiet right now.'}</p>`;
  }
  el.innerHTML = `<div class="h first lf-h"><span><i class="lf-dot" aria-hidden="true"></i>Studying now</span><small>${new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}</small></div>
    <div class="lf-count"><b>${LF.live.toLocaleString()}</b><span>of ${(ROSTER_N + 1).toLocaleString()} players</span></div>
    <p class="hint lf-peak">${LF.peak && LF.peak.h !== h ? `Busiest so far today: ${hourLabel(LF.peak.h)}, ${LF.peak.n.toLocaleString()} studying.` : 'This is the busiest hour so far today.'}</p>
    <div class="lf-bars" aria-label="Players studying in each hour today">${bars}</div>
    <div class="lf-axis"><span>12 AM</span><span>6 AM</span><span>noon</span><span>6 PM</span><span>11 PM</span></div>
    ${LF.trend.length ? `<div class="lf-sub">Trending right now</div><div class="lf-trend">${LF.trend.map(([s, n]) => `<div><span>${esc(s)}</span><i><b style="width:${Math.round(n / tmax * 100)}%"></b></i><em>${n.toLocaleString()}</em></div>`).join('')}</div>` : ''}
    <div class="lf-tabs" role="tablist">${LF_TABS.map(([k, n]) => `<button role="tab" data-lft="${k}" aria-selected="${LF.tab === k}">${n}</button>`).join('')}</div>
    <p class="hint lf-pause" hidden>Paused while you focus.</p>
    ${list}
    <div class="lf-btns"><button class="small-btn accent" data-lfa="join">Join them</button><button class="small-btn" data-lfa="match">Find a match</button></div>`;
  lfSide();
}
const hourLabel = x => x === 0 ? '12 AM' : x < 12 ? `${x} AM` : x === 12 ? 'noon' : `${x - 12} PM`;
function lfSide(){
  const b = $('#navLive'); if (!b || !RK_READY) return;
  if (!LF.hours || Date.now() - LF.at > 60000){ if (lfFocusing() && LF.hours) {} else { try { lfCompute(); } catch(e){ return; } } }
  b.hidden = false; b.querySelector('b').textContent = LF.live.toLocaleString();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-lft]');
  if (t){ LF.tab = t.dataset.lft; P.lfTab = LF.tab; try { saveP(); } catch(err){} renderLive(true); return; }
  const a = e.target.closest('[data-lfa]');
  if (a){
    if (a.dataset.lfa === 'join'){ showPage('focus'); if (!S.running) start(); }
    else if (!R.on) toast('Turn on Ranked matches below to play.');
    else { showPage('focus'); startSearch(); }
    return;
  }
  if (e.target.closest('#navLive')){ showPage('ranked'); setTimeout(() => { const c = $('#rkLive'); if (c) c.scrollIntoView({behavior: 'smooth', block: 'start'}); }, 50); }
  const bb = e.target.closest('#rkLive [data-bot]'); if (bb){ e.stopPropagation(); openProfile(+bb.dataset.bot); }
});
setInterval(() => { try { renderLive(); } catch(e){ console.error(e); } }, 30000);
// draw it with the rest of the Ranked page
const _renderRanked0 = renderRanked;
renderRanked = function(){ const r = _renderRanked0.apply(this, arguments); try { renderLive(); } catch(e){ console.error(e); } return r; };
