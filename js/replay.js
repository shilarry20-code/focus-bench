/* ---------- replays ----------
   Play back a finished game: your Elimination lobbies, your ranked matches, and other players' ranked matches.
   Yours are saved as they happen (who studied and who was on a break, second by second, plus the chat). Other players'
   ranked matches are rebuilt from their match history when you press View: the start, the end and both totals are
   real; the breaks in between are filled in from their usual timer (the same every time). */
const rpSave = (key, data) => IDB.set('rp:' + key, data).catch(console.error);
const rpLoad = key => IDB.get('rp:' + key).catch(() => null);

/* ---- recording your ranked matches: your study and breaks, as they happen ---- */
setInterval(() => {
  const c = R.cur; if (!c || c.state !== 'live') return;
  const st = focusing() ? 'S' : 'B', ev = c.yev || (c.yev = [[c.t0, 'B']]);
  if (ev[ev.length - 1][1] !== st) ev.push([Date.now(), st]);
}, 1000);
{
  const _fin = finalize;
  finalize = function(res, why){
    const c = R.cur, snap = c && c.state === 'live' ? {b: c.b, br: c.br, mmr0: c.mmr0, t0: c.t0, plan: c.plan, target: c.target, yev: c.yev || [[c.t0, 'S']], friendly: c.friendly} : null;
    const x = _fin.apply(this, arguments);
    if (snap && R.hist[0] && R.hist[0].b === snap.b){
      const h = R.hist[0]; snap.end = h.t; snap.res = h.r; snap.d = h.d; snap.you = (h.ys || h.you * 60) * 1000; snap.them = (h.ts || h.them * 60) * 1000;
      h.rp = snap.t0; rpSave('rk:' + snap.t0, {kind: 'rk', ...snap}); saveRanked();
    }
    return x;
  };
}

/* ---- rebuilding a match you only know the totals of ---- */
// study blocks that add up to `ms`, starting at t0, shaped by that player's usual timer
function rpBlocks(w, t0, ms, seed, maxEnd, fill){
  const rnd = mulberry32(fdHash(String(seed))), B = w >= 0 ? BOTS[w] : {fav: P.mode, style: ''};
  const lens = {pomodoro: [25, 5], fifty: [50, 10], flow: [75, 12], timebox: [45, 10], custom: [35, 7], stopwatch: [55, 10]}[B.fav] || [40, 8];
  const out = []; let t = t0, left = ms, k = 0;
  while (left > 0 && k < 200){
    let f = (B.fav === 'pomodoro' ? 25 : lens[0] * (.75 + rnd() * .5)) * 60000; f = Math.min(left, Math.max(5 * 60000, f));
    out.push([t, t + f]); left -= f; t += f + lens[1] * (.7 + rnd() * .8) * 60000; k++;
  }
  // fit the breaks into the match: squeeze them if the player would run past the end, stretch them if they ended it
  if (maxEnd && out.length > 1){
    const last = out[out.length - 1][1], gaps = last - t0 - ms, want = maxEnd - t0 - ms;
    if (last > maxEnd || fill){ const k2 = gaps > 0 ? Math.max(0, want) / gaps : 0; let x = t0;
      out.forEach((bk, i) => { const len = bk[1] - bk[0], gap = i ? (bk[0] - out[i - 1][1]) : 0; bk[0] = x + gap * k2; bk[1] = bk[0] + len; x = bk[1]; void len; }); }
  }
  return out.map(([a, b]) => [Math.round(a), Math.round(b)]);
}
const rpEv = blocks => { const ev = []; blocks.forEach(([a, b], k) => { if (!k) ev.push([a, 'S']); else ev.push([a, 'S']); ev.push([b, 'B']); }); return ev; };
// a 1v1 as the player knows it: two timelines
async function rpGetRk(key){
  const [, kind, a, b] = key.split(':');
  if (kind === 'me'){                                                  // one of yours (rk:me:<hist t>)
    const h = R.hist.find(x => x.t === +a); if (!h) return null;
    if (h.rp){ const s = await rpLoad('rk:' + h.rp); if (s) return {A: -1, C: s.b, t0: s.t0, end: s.end, evA: s.yev, evC: rpEv(s.plan), res: s.res, d: s.d, totA: s.you, totC: s.them, friendly: s.friendly, exact: true}; }
    const you = (h.ys || h.you * 60) * 1000, them = (h.ts || h.them * 60) * 1000, t0 = h.t - Math.max(you, them) * 1.25;
    const bA = rpBlocks(-1, t0, you, 'me' + h.t, h.t, you >= them), bC = rpBlocks(h.b, t0, them, 'op' + h.t, h.t, them > you);
    return {A: -1, C: h.b, t0, end: h.t, evA: rpEv(bA), evC: rpEv(bC), res: h.r, d: h.d, totA: you, totC: them, friendly: h.f};
  }
  // a bot's match from their history (rk:m5:<player>:<code>)
  const w = +a; m5Backfill(w); const m = m5List(w).find(x => String(x.code) === b); if (!m) return null;
  const t0 = m.t0, W = Math.max(m.t - m.t0, Math.max(m.a, m.b) * 60000 * 1.12), bA = rpBlocks(w, t0, m.a * 60000, `${w}:${m.code}:a`, t0 + W, m.a >= m.b), bC = rpBlocks(m.opp, t0, m.b * 60000, `${w}:${m.code}:b`, t0 + W, m.b > m.a);
  // both stop when the longer one finishes; stretch to the recorded end
  return {A: w, C: m.opp, t0, end: Math.max(bA.length ? bA[bA.length - 1][1] : t0, bC.length ? bC[bC.length - 1][1] : t0), evA: rpEv(bA), evC: rpEv(bC), res: m.a > m.b ? 'W' : m.a < m.b ? 'L' : 'D', d: m.d, totA: m.a * 60000, totC: m.b * 60000};
}

/* ---- the player: a full-screen replay with a video-style control bar at the bottom ---- */
let RP = null;
const RP_SPEEDS = [1, 5, 10, 30, 60, 120, 300, 600, 1200];
const RP_IC = {
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="7" y="5.5" width="3.6" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="13.4" y="5.5" width="3.6" height="13" rx="1" fill="currentColor" stroke="none"/>',
  again: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  prev: '<path d="M6 5.5v13"/><path d="M18 5.5l-9 6.5 9 6.5z" fill="currentColor"/>',
  next: '<path d="M18 5.5v13"/><path d="M6 5.5l9 6.5-9 6.5z" fill="currentColor"/>',
  back: '<path d="M5 12a7 7 0 1 0 2-4.9"/><path d="M5 4v4h4"/>',
  fwd: '<path d="M19 12a7 7 0 1 1-2-4.9"/><path d="M19 4v4h-4"/>',
  end: '<path d="M4.5 6l7 6-7 6zM11.5 6l7 6-7 6z" fill="currentColor"/><path d="M20 5.5v13"/>',
  sd: '<path d="M13 3L5 13.5h6L10 21l8.5-11h-6z" fill="currentColor"/>',
  log: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1.2" fill="currentColor"/>',
  speed: '<path d="M4.5 16a8 8 0 1 1 15 0"/><path d="M12 15.5l4-5"/>'};
const rpIc = (k, n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${RP_IC[k]}${n ? `<text x="12" y="15.3" text-anchor="middle">${n}</text>` : ''}</svg>`;
const rpNm = w => w === -1 ? 'You' : bot(w).name;

/* the match as timelines: each player's states over time (S studying, B on a break, X done) */
function rpTracks(d){
  if (d.kind === 'rk'){
    const fix = ev => { const e = ev.map(x => [x[0], x[1]]); if (e.length && e[e.length - 1][1] === 'B') e[e.length - 1][1] = 'X'; return e; };
    return [{w: d.A, ev: fix(d.evA)}, {w: d.C, ev: fix(d.evC)}];
  }
  const G = d.G, L = G.L;
  return L.players.map((w, k) => {
    if (w === -1){
      const end = G.me.out ? G.me.out.t : G.result && G.result.t ? G.result.t : d.end;
      const ev = G.me.ev.filter(x => x[0] < end).map(x => [x[0], x[1]]); ev.push([end, 'X']);
      return {w, n: k + 1, ev, out: G.me.out ? G.me.out.t : null, why: G.me.out && G.me.out.why, won: !G.me.out};
    }
    const p = L.bp && L.bp[w] ? L.bp[w] : elBotPlan(L, w), won = p.out > d.end, stop = won ? d.end : p.out, ev = [[L.t0, 'S']];
    p.br.forEach(([s, e]) => { if (s >= stop) return; ev.push([s, 'B']); if (e < stop) ev.push([e, 'S']); });
    ev.push([stop, 'X']);
    return {w, n: k + 1, ev, out: won ? null : p.out, why: p.why, won};
  });
}
const rpSt = (ev, t) => { let s = 'W'; for (const [x, st] of ev){ if (x > t) break; s = st; } return s; };
const rpStud = (ev, t) => { let n = 0; for (let k = 0; k < ev.length; k++){ if (ev[k][1] !== 'S') continue; const y = Math.min(k + 1 < ev.length ? ev[k + 1][0] : t, t); if (y > ev[k][0]) n += y - ev[k][0]; } return n; };
function rpStats(ev){
  let st = 0, br = 0, n = 0, long = 0;
  for (let k = 0; k < ev.length - 1; k++){ const len = ev[k + 1][0] - ev[k][0]; if (ev[k][1] === 'S'){ st += len; long = Math.max(long, len); } else if (ev[k][1] === 'B' && len >= 5000){ br += len; n++; } }
  return {st, br, n, long};
}
// everything that happens, in order
function rpEvents(d, tr){
  const E = [], add = (t, kind, text, w) => E.push({t, kind, text, w});
  if (d.kind === 'rk'){
    add(d.start, 'start', 'The match starts');
    tr.forEach(p => { for (let k = 1; k < p.ev.length; k++){ const [t, s] = p.ev[k], prev = p.ev[k - 1][1];
      if (s === 'B' && (k + 1 >= p.ev.length || p.ev[k + 1][0] - t >= 5000)) add(t, 'brk', `${rpNm(p.w)} took a break`, p.w);
      else if (s === 'S' && prev === 'B' && t - p.ev[k - 1][0] >= 5000) add(t, 'back', `${rpNm(p.w)} is back studying`, p.w);
      else if (s === 'X') add(t, 'stop', `${rpNm(p.w)} stopped · ${elClock(rpStud(p.ev, t))} studied`, p.w); } });
    // lead changes: the lead is exact and straight between state changes
    const ts = [...new Set([...tr[0].ev, ...tr[1].ev].map(x => x[0]))].sort((a, b) => a - b), lead = t => rpStud(tr[0].ev, t) - rpStud(tr[1].ev, t);
    let last = 0;
    for (let k = 0; k < ts.length - 1; k++){
      const a = ts[k], b = ts[k + 1], la = lead(a), lb = lead(b);
      if (la !== 0) last = Math.sign(la);
      if (lb !== 0 && Math.sign(lb) !== last && last !== 0){ const x = a + Math.abs(la) / Math.abs(lb - la) * (b - a); add(Math.round(x), 'lead', `${rpNm(lb > 0 ? tr[0].w : tr[1].w)} takes the lead`, lb > 0 ? tr[0].w : tr[1].w); last = Math.sign(lb); }
      else if (lb !== 0 && last === 0){ last = Math.sign(lb); }
    }
    add(d.end, 'win', d.res === 'D' ? 'Draw' : `${rpNm(d.res === 'W' ? d.A : d.C)} wins · ${elClock(d.totA)} vs ${elClock(d.totC)}`, d.res === 'W' ? d.A : d.C);
  } else {
    const G = d.G, L = G.L, RL = L.rules.round * 60000, A = elAllow(L.rules), N = L.players.length;
    add(L.t0, 'start', `The game starts · ${N} players · ${elFmtA(A[0])} of breaks`);
    for (let r = 1; L.t0 + r * RL < d.end; r++){ const a = A[Math.min(r, A.length - 1)], prevA = A[Math.min(r - 1, A.length - 1)];
      if (a <= 0 && prevA > 0) add(L.t0 + r * RL, 'sd', `Round ${r + 1} · sudden death: no more breaks`); else if (a > 0 || prevA > 0) add(L.t0 + r * RL, 'round', `Round ${r + 1} · ${elFmtA(a)} of breaks`); }
    tr.forEach(p => { for (let k = 1; k < p.ev.length; k++){ const [t, s] = p.ev[k];
      if (s === 'B' && (k + 1 >= p.ev.length || p.ev[k + 1][0] - t >= 5000)) add(t, 'brk', `${rpNm(p.w)} took a break`, p.w);
      else if (s === 'S' && p.ev[k - 1][1] === 'B' && t - p.ev[k - 1][0] >= 5000) add(t, 'back', `${rpNm(p.w)} is back studying`, p.w); } });
    const outs = tr.filter(p => p.out).sort((a, b) => a.out - b.out);
    outs.forEach((p, k) => add(p.out, 'ko', `Player ${String(p.n).padStart(3, '0')} · ${rpNm(p.w)} ${p.why === 'stopped' ? 'ended their session' : p.why === 'left' ? 'left' : 'went over the break allowance'} · ${N - k - 1} left`, p.w));
    const win = tr.find(p => !p.out) || outs[outs.length - 1];
    if (win) add(d.end, 'win', `${rpNm(win.w)} ${win.w === -1 ? 'win' : 'wins'}!`, win.w);
    (G.chat || []).filter(m => !m.sys).forEach(m => add(m.t, 'chat', `${m.w === -1 ? myName() : bot(m.w).name}: ${m.text}`, m.w));
  }
  return E.filter(e => e.t >= d.start && e.t <= d.end).sort((a, b) => a.t - b.t || (a.kind === 'win') - (b.kind === 'win'));
}

async function rpOpen(key){
  let d = null;
  try {
    if (key.startsWith('el:')){ const s = await rpLoad(key) || (EL.G && 'el:' + EL.G.L.id === key ? {kind: 'el', G: elPack(EL.G)} : null); if (s){ // the game is decided when the second-to-last player goes out
        const L = s.G.L, outs = L.players.map(w => w === -1 ? (s.G.me.out ? s.G.me.out.t : Infinity) : (L.bp && L.bp[w] ? L.bp[w].out : elBotPlan(L, w).out)).sort((a, b) => a - b);
        d = {kind: 'el', G: s.G, t0: L.t0, end: outs.length > 1 ? outs[outs.length - 2] : outs[0]}; } }
    else { const r = await rpGetRk(key); if (r) d = {kind: 'rk', ...r}; }
  } catch(e){ console.error(e); }
  if (!d) return toast('That replay isn’t available.');
  d.start = d.kind === 'el' ? d.G.L.t0 : d.t0; d.end = Math.max(d.end, d.start + 60000);
  const tr = rpTracks(d);
  RP = {d, tr, E: rpEvents(d, tr), t: d.start, play: true, speed: RP && RP.speed || 60, tab: 'arena', last: performance.now(), log: !matchMedia('(max-width: 760px)').matches, follow: null, cur: -1};
  $('#rpModal').hidden = false; rpShell(); rpDraw(true); rpLoop();
}
function rpClose(){ $('#rpModal').hidden = true; RP = null; }
function rpLoop(){
  if (!RP) return;
  const now = performance.now(), dt = now - RP.last; RP.last = now;
  if (RP.play && !RP.drag){ RP.t = Math.min(RP.d.end, RP.t + dt * RP.speed); if (RP.t >= RP.d.end){ RP.play = false; rpDraw(true); } else { rpBar(); rpDraw(); } }
  requestAnimationFrame(rpLoop);
}
const rpZ = () => RP.d.start;
const rpX = t => clampN((t - RP.d.start) / (RP.d.end - RP.d.start), 0, 1) * 100;
// the parts that are built once: header, layout, graph, event log, control bar
function rpShell(){
  const d = RP.d, card = $('#rpModal .rp-card'), span = d.end - d.start;
  card.querySelector('.h').textContent = d.kind === 'el' ? `Replay · ${d.G.L.name || 'Elimination'}` : `Replay · ${rpNm(d.A)} vs ${rpNm(d.C)}`;
  let marks = '';
  if (d.kind === 'el'){
    const RL = d.G.L.rules.round * 60000;
    for (let r = 1; d.start + r * RL < d.end; r++) marks += `<i class="rp-rd" style="left:${rpX(d.start + r * RL)}%"></i>`;
    RP.E.filter(e => e.kind === 'ko').forEach(e => { marks += `<i class="rp-mk" style="left:${rpX(e.t)}%"></i>`; });
  } else RP.E.filter(e => e.kind === 'lead').forEach(e => { marks += `<i class="rp-ld" style="left:${rpX(e.t)}%"></i>`; });
  const stripes = d.kind === 'rk' ? RP.tr.map((p, k) => `<span class="rp-stripe s${k}">${p.ev.map((x, j) => x[1] === 'S' && j + 1 < p.ev.length ? `<i style="left:${rpX(x[0])}%;width:${Math.max(.15, rpX(p.ev[j + 1][0]) - rpX(x[0]))}%"></i>` : '').join('')}</span>`).join('') : '';
  const ib = (act, ic, tip, n) => `<button class="rp-ib" data-rp-act="${act}" data-tip="${tip}" aria-label="${tip}">${rpIc(ic, n)}</button>`;
  $('#rpBody').innerHTML = `<div class="rp-main${RP.log ? '' : ' nolog'}"><div class="rp-stage"><div id="rpView"></div><div class="card rp-graph" id="rpGraph"></div><div id="rpSum"></div></div>
      <aside class="rp-side-p"><div id="rpFollow"></div><div class="card rp-log"><div class="h first">Events <small>${RP.E.length}</small></div><ol id="rpLog">${RP.E.map((e, i) => `<li class="k-${e.kind}" data-rpi="${i}"><time>${elClock(e.t - rpZ())}</time><span>${esc(e.text)}</span></li>`).join('')}</ol></div></aside></div>
    <div class="rp-bar">
      <div class="rp-scrub${d.kind === 'rk' ? ' tall' : ''}" role="slider" tabindex="0" aria-label="Replay position" aria-valuemin="0" aria-valuemax="100"><span class="rp-track"><b></b></span>${marks}${stripes}<i class="rp-knob"></i><span class="rp-hover" hidden></span></div>
      <div class="rp-btns"><div class="rp-l">${ib('play', 'play', 'Play (Space)')}${ib('prev', 'prev', 'Previous event (,)')}${ib('b10', 'back', 'Back 10 min (Shift+←)', '10')}${ib('b1', 'back', 'Back 1 min (←)', '1')}${ib('f1', 'fwd', 'Forward 1 min (→)', '1')}${ib('f10', 'fwd', 'Forward 10 min (Shift+→)', '10')}${ib('next', 'next', 'Next event (.)')}<span class="rp-time"></span></div>
        <div class="rp-r">${d.kind === 'el' && elAllow(d.G.L.rules).some(x => x <= 0) ? ib('sd', 'sd', 'Skip to sudden death') : ''}${ib('end', 'end', 'Skip to the end')}
          <div class="rp-spd"><button class="rp-ib wide" data-rp-act="spd" data-tip="Speed" aria-label="Speed" aria-haspopup="true">${rpIc('speed')}<b class="rp-sv"></b></button><ul class="rp-spl" hidden>${RP_SPEEDS.map(s => `<li><button data-rp-speed="${s}">${s}×</button></li>`).join('')}</ul></div>
          ${ib('log', 'log', 'Event log')}</div></div></div>`;
  rpGraph();
}
function rpGraph(){
  const d = RP.d, el = $('#rpGraph'), W = 600, H = 110, X = t => (t - d.start) / (d.end - d.start) * W;
  if (d.kind === 'rk'){
    const ts = [...new Set([d.start, ...RP.tr[0].ev.map(x => x[0]), ...RP.tr[1].ev.map(x => x[0]), d.end])].sort((a, b) => a - b);
    const lead = t => rpStud(RP.tr[0].ev, t) - rpStud(RP.tr[1].ev, t), vals = ts.map(lead), mx = Math.max(60000, ...vals.map(Math.abs)) * 1.1, Y = v => H / 2 - v / mx * (H / 2 - 6);
    const pts = ts.map((t, k) => `${X(t).toFixed(1)},${Y(vals[k]).toFixed(1)}`).join(' ');
    el.innerHTML = `<div class="h first rp-gh"><span>Lead over time</span><small><i class="dot s0"></i>${esc(rpNm(d.A))} ahead · <i class="dot s1"></i>${esc(rpNm(d.C))} ahead</small></div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><rect x="0" y="0" width="${W}" height="${H / 2}" class="ga"/><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}" class="gc"/><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="g0"/><polyline points="${pts}" class="gl"/><line class="gp" x1="0" x2="0" y1="0" y2="${H}"/></svg>`;
  } else {
    const N = d.G.L.players.length, outs = RP.tr.filter(p => p.out && p.out <= d.end).map(p => p.out).sort((a, b) => a - b), Y = n => 6 + (1 - n / N) * (H - 12);
    let p = `M0,${Y(N)}`, n = N; outs.forEach(t => { p += ` H${X(t).toFixed(1)} V${Y(--n).toFixed(1)}`; }); p += ` H${W}`;
    el.innerHTML = `<div class="h first rp-gh"><span>Players left</span><small>${N} → 1</small></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${p} V${H} H0Z" class="gf"/><path d="${p}" class="gl"/><line class="gp" x1="0" x2="0" y1="0" y2="${H}"/></svg>`;
  }
}
// the stage (throttled) and the cheap moving parts (every frame)
let rpLastDraw = 0;
function rpDraw(force){
  if (!RP) return; const now = performance.now(); if (!force && now - rpLastDraw < 120) return; rpLastDraw = now;
  const d = RP.d, t = RP.t;
  let body;
  if (d.kind === 'el'){
    body = elGameHtml(d.G, t, {replay: true, tab: RP.tab});
  } else {
    const [a, c] = RP.tr, sA = rpSt(a.ev, t), sC = rpSt(c.ev, t), yA = rpStud(a.ev, t), yC = rpStud(c.ev, t), gap = yA - yC;
    const side = (p, s, y, k) => `<div class="rp-side ${s === 'X' ? 'out' : s === 'S' ? 'study' : 'break'} s${k}">${p.w === -1 ? myAvatar('lg') : avatar(bot(p.w), 'lg')}<b>${p.w === -1 ? 'You' : `<button class="lnk" data-bot="${p.w}">${esc(rpNm(p.w))}</button>`}</b><span class="rp-clk">${elClock(y)}</span><small>${s === 'X' ? 'Stopped' : s === 'S' ? 'Studying' : 'On a break'}</small></div>`;
    body = `<div class="card rp-vs">${side(a, sA, yA, 0)}<div class="rp-mid"><span class="rp-vsx">vs</span><small>${gap === 0 ? 'Even' : `${esc(rpNm(gap > 0 ? a.w : c.w))} ahead by ${elClock(Math.abs(gap))}`}</small></div>${side(c, sC, yC, 1)}</div>`;
  }
  $('#rpView').innerHTML = body;
  if (d.kind === 'el'){ const f = RP.follow; $('#rpView').querySelectorAll('.el-tile').forEach((x, k) => { x.dataset.tile = d.G.L.players[k]; x.classList.toggle('fol', +x.dataset.tile === f); }); }
  rpFollowCard();
  // the summary once it's over
  const done = t >= d.end, sum = $('#rpSum');
  if (done !== !!sum.firstChild) sum.innerHTML = done ? rpSummary() : '';
  rpBar();
}
function rpBar(){
  const box = $('#rpBody'); if (!box || !RP) return;
  const d = RP.d, t = RP.t, f = rpX(t);
  const b = box.querySelector('.rp-track b'), k = box.querySelector('.rp-knob'); if (!b) return;
  b.style.width = f + '%'; k.style.left = f + '%';
  box.querySelector('.rp-time').textContent = `${elClock(t - rpZ())} / ${elClock(d.end - rpZ())}`;
  box.querySelector('.rp-scrub').setAttribute('aria-valuenow', Math.round(f));
  const pb = box.querySelector('[data-rp-act="play"]'), st = RP.play ? 'pause' : t >= d.end ? 'again' : 'play';
  if (pb.dataset.st !== st){ pb.dataset.st = st; pb.innerHTML = rpIc(st); const tip = st === 'pause' ? 'Pause (Space)' : st === 'again' ? 'Watch again (Space)' : 'Play (Space)'; pb.dataset.tip = tip; pb.setAttribute('aria-label', tip); }
  const sv = box.querySelector('.rp-sv'); if (sv.textContent !== RP.speed + '×') sv.textContent = RP.speed + '×';
  const gp = box.querySelector('#rpGraph .gp'); if (gp){ const x = (t - d.start) / (d.end - d.start) * 600; gp.setAttribute('x1', x); gp.setAttribute('x2', x); }
  // the event log follows along
  let i = -1; for (let j = 0; j < RP.E.length && RP.E[j].t <= t; j++) i = j;
  if (i !== RP.cur){
    RP.cur = i; const ol = $('#rpLog');
    ol.querySelectorAll('li').forEach((li, j) => { li.classList.toggle('past', j <= i); li.classList.toggle('cur', j === i); });
    const li = ol.children[Math.max(0, i)]; if (li && RP.log && !ol.matches(':hover')){ const box2 = ol.closest('.rp-log'), y = li.offsetTop - box2.clientHeight / 2; box2.scrollTop = y; }
  }
}
function rpFollowCard(){
  const el = $('#rpFollow'); if (!el) return;
  const d = RP.d, f = RP.follow;
  if (d.kind !== 'el' || f == null){ el.innerHTML = d.kind === 'el' ? '<p class="hint rp-tiphint">Tap a player in the Arena or Standings to follow them.</p>' : ''; return; }
  const p = RP.tr.find(x => x.w === f), t = RP.t, s = rpSt(p.ev, t), S = elState(d.G, t), me = S.ps.find(x => x.w === f), left = Math.max(0, S.a - (me ? me.used : 0));
  el.innerHTML = `<div class="card rp-fc"><div class="rp-fh">${f === -1 ? myAvatar('md') : avatar(bot(f), 'md')}<span><small>Player ${String(p.n).padStart(3, '0')}</small><b>${esc(rpNm(f))}</b></span><button class="rp-ib" data-rp-act="unfollow" data-tip="Stop following" aria-label="Stop following">×</button></div>
    <div class="rp-fs"><div><small>Status</small><b class="st-${s}">${s === 'X' ? (p.out && p.out <= t ? 'Out' : 'Won') : s === 'S' ? 'Studying' : s === 'B' ? 'On a break' : 'Ready'}</b></div><div><small>Studied</small><b>${elClock(rpStud(p.ev, t))}</b></div><div><small>Break left</small><b>${s === 'X' ? '–' : S.a > 0 ? elClock(left) : 'none'}</b></div></div></div>`;
}
function rpSummary(){
  const d = RP.d, rows = RP.tr.map(p => ({p, s: rpStats(p.ev)}));
  if (d.kind === 'el'){ const order = rows.slice().sort((a, b) => (a.p.out ? 1 : 0) - (b.p.out ? 1 : 0) || (b.p.out || 0) - (a.p.out || 0)); order.forEach((r, k) => { r.place = k + 1; }); rows.splice(0, rows.length, ...order); }
  const leads = RP.E.filter(e => e.kind === 'lead').length;
  return `<div class="card rp-sumc"><div class="h first">Match summary${d.kind === 'rk' ? ` <small>${leads} lead change${leads === 1 ? '' : 's'}</small>` : ''}</div><table class="rp-tab"><thead><tr>${d.kind === 'el' ? '<th>#</th>' : ''}<th>Player</th><th>Studied</th><th>Breaks</th><th>Break time</th><th>Longest stretch</th>${d.kind === 'el' ? '<th>Out</th>' : ''}</tr></thead><tbody>
    ${rows.map(r => `<tr${r.p.w === -1 ? ' class="me"' : ''}>${d.kind === 'el' ? `<td>${r.place}</td>` : ''}<td>${esc(rpNm(r.p.w))}</td><td>${elClock(r.s.st)}</td><td>${r.s.n}</td><td>${elClock(r.s.br)}</td><td>${elClock(r.s.long)}</td>${d.kind === 'el' ? `<td>${r.p.out && r.place !== 1 ? `${elClock(r.p.out - rpZ())} · ${r.p.why === 'stopped' ? 'ended session' : r.p.why === 'left' ? 'left' : 'over allowance'}` : 'Winner'}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function rpSeek(t){ RP.t = clampN(t, RP.d.start, RP.d.end); RP.last = performance.now(); rpDraw(true); }
function rpStep(dir){ const t = RP.t, E = RP.E; if (dir > 0){ const e = E.find(x => x.t > t + 500); rpSeek(e ? e.t : RP.d.end); } else { const ps = E.filter(x => x.t < t - 1500); rpSeek(ps.length ? ps[ps.length - 1].t : RP.d.start); } }
function rpAct(k){
  const d = RP.d;
  if (k === 'play'){ if (RP.t >= d.end) RP.t = d.start; RP.play = !RP.play; RP.last = performance.now(); rpBar(); return; }
  if (k === 'end'){ RP.play = false; return rpSeek(d.end); }
  if (k === 'b1' || k === 'f1' || k === 'b10' || k === 'f10') return rpSeek(RP.t + (k[0] === 'f' ? 1 : -1) * (k.length === 3 ? 10 : 1) * 60000);
  if (k === 'prev') return rpStep(-1);
  if (k === 'next') return rpStep(1);
  if (k === 'sd'){ const A = elAllow(d.G.L.rules), i = A.findIndex(x => x <= 0); if (i >= 0) rpSeek(d.G.L.t0 + i * d.G.L.rules.round * 60000); return; }
  if (k === 'log'){ RP.log = !RP.log; $('#rpBody .rp-main').classList.toggle('nolog', !RP.log); RP.cur = -2; rpBar(); return; }
  if (k === 'spd'){ const l = $('#rpBody .rp-spl'); l.hidden = !l.hidden; l.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.rpSpeed === RP.speed)); return; }
  if (k === 'unfollow'){ RP.follow = null; rpDraw(true); }
}
document.addEventListener('click', e => {
  const v = e.target.closest('[data-rp]'); if (v){ e.preventDefault(); rpOpen(v.dataset.rp); return; }
  if (!RP) return;
  if (e.target.closest('#rpModal') && (e.target === $('#rpModal') || e.target.closest('#rpModal .x'))) return rpClose();
  const sp = e.target.closest('[data-rp-speed]'); if (sp){ RP.speed = +sp.dataset.rpSpeed; RP.last = performance.now(); sp.closest('.rp-spl').hidden = true; rpBar(); return; }
  if (!e.target.closest('.rp-spd')){ const l = $('#rpBody .rp-spl'); if (l) l.hidden = true; }
  const tb = e.target.closest('#rpBody [data-el="tab"]'); if (tb){ e.stopPropagation(); RP.tab = tb.dataset.t; rpDraw(true); return; }
  const ti = e.target.closest('#rpView .el-tile, #rpView .el-st li'); if (ti && RP.d.kind === 'el' && !e.target.closest('[data-bot]')){
    const w = ti.dataset.tile != null ? +ti.dataset.tile : RP.d.G.L.players[[...ti.parentNode.children].indexOf(ti)] ;
    if (ti.matches('.el-st li')){ const idx = [...ti.parentNode.children].indexOf(ti), S = elState(RP.d.G, RP.t), ord = S.ps.slice().sort((a, b) => (a.out ? 1 : 0) - (b.out ? 1 : 0) || (b.out || 0) - (a.out || 0) || elR(b.w) - elR(a.w)); RP.follow = ord[idx] ? ord[idx].w : null; }
    else RP.follow = RP.follow === w ? null : w;
    rpDraw(true); return; }
  const li = e.target.closest('#rpLog li'); if (li){ const ev = RP.E[+li.dataset.rpi]; if (ev) rpSeek(ev.t + 1); return; }
  const a = e.target.closest('[data-rp-act]'); if (a) rpAct(a.dataset.rpAct);
}, true);
// drag (or tap) the bar; hovering shows what's at that moment
{
  const at = (e, bar) => { const r = bar.getBoundingClientRect(); return RP.d.start + clampN((e.clientX - r.left) / r.width, 0, 1) * (RP.d.end - RP.d.start); };
  const hover = (e, bar) => {
    const tip = bar.querySelector('.rp-hover'), t = at(e, bar), d = RP.d, near = RP.E.filter(x => x.kind !== 'chat' && Math.abs(x.t - t) < (d.end - d.start) * .012).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    let ctx;
    if (d.kind === 'el'){ const S = elState(d.G, t); ctx = `Round ${S.r + 1} · ${S.alive} left`; }
    else { const g = rpStud(RP.tr[0].ev, t) - rpStud(RP.tr[1].ev, t); ctx = g === 0 ? 'Even' : `${rpNm(g > 0 ? RP.tr[0].w : RP.tr[1].w)} +${elClock(Math.abs(g))}`; }
    tip.innerHTML = `<b>${elClock(t - rpZ())}</b> ${esc(ctx)}${near ? `<small>${esc(near.text)}</small>` : ''}`;
    tip.hidden = false; tip.style.left = clampN(rpX(t), 6, 94) + '%';
  };
  document.addEventListener('pointerdown', e => {
    const bar = e.target.closest('#rpBody .rp-scrub'); if (!bar || !RP) return;
    e.preventDefault(); RP.drag = bar; bar.classList.add('drag'); try { bar.setPointerCapture(e.pointerId); } catch(err){}
    RP.t = at(e, bar); rpBar(); rpDraw(); hover(e, bar);
  });
  document.addEventListener('pointermove', e => {
    if (!RP) return;
    if (RP.drag){ RP.t = at(e, RP.drag); rpBar(); rpDraw(); hover(e, RP.drag); return; }
    const bar = e.target.closest && e.target.closest('#rpBody .rp-scrub'); const tip = $('#rpBody .rp-hover');
    if (bar) hover(e, bar); else if (tip) tip.hidden = true;
  });
  const up = () => { if (!RP || !RP.drag) return; RP.drag.classList.remove('drag'); const tip = RP.drag.querySelector('.rp-hover'); if (tip && !RP.drag.matches(':hover')) tip.hidden = true; RP.drag = null; RP.last = performance.now(); rpDraw(true); };
  document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
}
document.addEventListener('keydown', e => {
  if (!RP) return;
  if (e.key === 'Escape'){ const l = $('#rpBody .rp-spl'); if (l && !l.hidden){ l.hidden = true; return; } return rpClose(); }
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  if (e.key === ' ' || e.key === 'k'){ e.preventDefault(); rpAct('play'); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight'){ e.preventDefault(); rpSeek(RP.t + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1) * 60000); }
  else if (e.key === ',') rpStep(-1);
  else if (e.key === '.') rpStep(1);
  else if (e.key === 'End'){ RP.play = false; rpSeek(RP.d.end); }
  else if (e.key === 'Home') rpSeek(RP.d.start);
});

/* ---- View buttons on match histories ---- */
{
  const _pm = profileMatches;
  profileMatches = function(w){
    const html = _pm.apply(this, arguments), t = document.createElement('template'); t.innerHTML = html;
    const lis = [...t.content.querySelectorAll('.rk-hist > li')];
    // rows are in the same order the original built them: work out each one's match again
    let rows;
    if (w === ME) rows = R.hist.slice(0, lis.length).map(h => 'rk:me:' + h.t);
    else { const sim = m5List(w).map(m => ({t: m.t, k: `rk:m5:${w}:${m.code}`})), oldest = sim.length ? sim[sim.length - 1].t : 0;
      const vs = R.hist.filter(h => h.b === w && (sim.length < 5 || h.t >= oldest)).slice(0, 5).map(h => ({t: h.t, k: 'rk:me:' + h.t}));
      rows = [...sim, ...vs].sort((a, b) => b.t - a.t).map(x => x.k); }
    lis.forEach((li, k) => { const when = li.querySelector('.when'); if (when && rows[k]) when.insertAdjacentHTML('beforeend', `<button class="rp-v" data-rp="${rows[k]}">View</button>`); });
    return t.innerHTML;
  };
}
// the Ranked page's match history
new MutationObserver(() => {
  const ul = $('#rkHist'); if (!ul || ul.dataset.rpv === String(ul.children.length) + ':' + (R.hist[0] && R.hist[0].t)) return;
  ul.dataset.rpv = String(ul.children.length) + ':' + (R.hist[0] && R.hist[0].t);
  [...ul.children].forEach((li, k) => { const h = R.hist[k], when = li.querySelector('.when'); if (h && when && !when.querySelector('.rp-v')) when.insertAdjacentHTML('beforeend', `<button class="rp-v" data-rp="rk:me:${h.t}">View</button>`); });
}).observe(document.body, {childList: true, subtree: true});
