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

/* ---- the player ---- */
let RP = null;
async function rpOpen(key){
  let d = null;
  try {
    if (key.startsWith('el:')){ const s = await rpLoad(key) || (EL.G && 'el:' + EL.G.L.id === key ? {kind: 'el', G: elPack(EL.G)} : null); if (s) d = {kind: 'el', G: s.G, t0: s.G.L.t0, end: Math.max(s.G.result && s.G.result.t || 0, ...s.G.L.players.filter(w => w !== -1).map(w => s.G.L.bp && s.G.L.bp[w] ? s.G.L.bp[w].out : elBotPlan(s.G.L, w).out))}; }
    else { const r = await rpGetRk(key); if (r) d = {kind: 'rk', ...r}; }
  } catch(e){ console.error(e); }
  if (!d) return toast('That replay isn’t available.');
  d.start = d.kind === 'el' ? d.G.L.t0 - 5000 : d.t0; d.end = Math.max(d.end, d.start + 60000);
  RP = {d, t: d.start, play: true, speed: 60, tab: 'arena', last: performance.now()};
  $('#rpModal').hidden = false; rpDraw(true); rpLoop();
}
function rpClose(){ $('#rpModal').hidden = true; RP = null; }
function rpLoop(){
  if (!RP) return;
  const now = performance.now(), dt = now - RP.last; RP.last = now;
  if (RP.play){ RP.t = Math.min(RP.d.end, RP.t + dt * RP.speed); if (RP.t >= RP.d.end) RP.play = false; rpDraw(); }
  requestAnimationFrame(rpLoop);
}
const rpStateAt = (ev, t) => { let s = 'B'; for (const [x, st] of ev){ if (x > t) break; s = st; } return s; };
const rpStudied = (ev, t) => { let n = 0; for (let k = 0; k < ev.length; k++){ if (ev[k][1] !== 'S') continue; const y = Math.min(k + 1 < ev.length ? ev[k + 1][0] : t, t); if (y > ev[k][0]) n += y - ev[k][0]; } return n; };
let rpLastDraw = 0;
function rpDraw(force){
  if (!RP) return; const now = performance.now(); if (!force && now - rpLastDraw < 120) return; rpLastDraw = now;
  const d = RP.d, t = RP.t, box = $('#rpBody'), span = d.end - d.start;
  let body = '', marks = '';
  if (d.kind === 'el'){
    body = elGameHtml(d.G, t, {replay: true, tab: RP.tab});
    const outs = d.G.L.players.map(w => w === -1 ? (d.G.me.out ? d.G.me.out.t : null) : (d.G.L.bp && d.G.L.bp[w] ? d.G.L.bp[w].out : elBotPlan(d.G.L, w).out)).filter(Boolean);
    marks = outs.map(x => `<i class="rp-mk" style="left:${(x - d.start) / span * 100}%"></i>`).join('');
  } else {
    const nm = w => w === -1 ? 'You' : bot(w).name, sA = rpStateAt(d.evA, t), sC = rpStateAt(d.evC, t), yA = rpStudied(d.evA, t), yC = rpStudied(d.evC, t);
    const doneA = t >= (d.evA.length ? d.evA[d.evA.length - 1][0] : 0) && sA === 'B', doneC = t >= (d.evC.length ? d.evC[d.evC.length - 1][0] : 0) && sC === 'B';
    const lane = ev => { let h = `<b class="rp-head" style="left:${(t - d.start) / span * 100}%"></b>`; for (let k = 0; k < ev.length; k++) if (ev[k][1] === 'S'){ const a = ev[k][0], b = k + 1 < ev.length ? ev[k + 1][0] : d.end; h += `<i style="left:${(a - d.start) / span * 100}%;width:${Math.max(.2, (b - a) / span * 100)}%"></i>`; } return h; };
    const side = (w, s, y, done, tot) => `<div class="rp-side ${done ? 'out' : s === 'S' ? 'study' : 'break'}">${w === -1 ? myAvatar('md') : avatar(bot(w), 'md')}<b>${w === -1 ? 'You' : `<button class="lnk" data-bot="${w}">${esc(nm(w))}</button>`}</b><span class="rp-clk">${elClock(y)}</span><small>${done ? 'Stopped' : s === 'S' ? 'Studying' : 'On a break'}</small></div>`;
    body = `<div class="card rp-vs">${side(d.A, sA, yA, doneA, d.totA)}<span class="rp-v">vs</span>${side(d.C, sC, yC, doneC, d.totC)}</div>
      <div class="card"><div class="rp-lanes"><div><span>${esc(nm(d.A))}</span><div class="rp-lane a">${lane(d.evA)}</div></div><div><span>${esc(nm(d.C))}</span><div class="rp-lane c">${lane(d.evC)}</div></div></div>
      ${t >= d.end ? `<p class="rp-res">${d.res === 'D' ? 'Draw' : `${esc(nm(d.res === 'W' ? d.A : d.C))} won`} · ${elClock(d.totA)} vs ${elClock(d.totC)}${d.friendly ? ' · friendly' : d.d != null ? ` · ${d.d > 0 ? '+' : ''}${d.d} Elo` : ''}</p>` : ''}
      ${d.exact ? '' : '<p class="hint">Start, end and both totals are from the match; the breaks in between are filled in from each player’s usual timer.</p>'}</div>`;
  }
  const head = `<div class="rp-ctl"><button class="small-btn accent" data-rp-act="play">${RP.play ? 'Pause' : t >= d.end ? 'Replay' : 'Play'}</button>
    <select data-rp-act="speed" aria-label="Speed">${[1, 10, 60, 300, 600].map(s => `<option value="${s}"${RP.speed === s ? ' selected' : ''}>${s}×</option>`).join('')}</select>
    ${d.kind === 'el' ? `<button class="small-btn" data-rp-act="next">Next knockout</button><button class="small-btn" data-rp-act="sd">Skip to sudden death</button>` : ''}<button class="small-btn" data-rp-act="end">Skip to the end</button>
    <span class="rp-time">${elClock(t - (d.kind === 'el' ? d.G.L.t0 : d.start))} / ${elClock(d.end - (d.kind === 'el' ? d.G.L.t0 : d.start))}</span></div>
    <div class="rp-scrub" data-rp-act="seek">${marks}<b style="width:${(t - d.start) / span * 100}%"></b></div>`;
  box.innerHTML = head + body;
}
document.addEventListener('click', e => {
  const v = e.target.closest('[data-rp]'); if (v){ e.preventDefault(); rpOpen(v.dataset.rp); return; }
  if (!RP) return;
  if (e.target.closest('#rpModal') && (e.target === $('#rpModal') || e.target.closest('#rpModal .x'))) return rpClose();
  const tb = e.target.closest('#rpBody [data-el="tab"]'); if (tb){ e.stopPropagation(); RP.tab = tb.dataset.t; rpDraw(true); return; }
  const a = e.target.closest('[data-rp-act]'); if (!a) return; const k = a.dataset.rpAct, d = RP.d;
  if (k === 'play'){ if (RP.t >= d.end) RP.t = d.start; RP.play = !RP.play; RP.last = performance.now(); }
  else if (k === 'end'){ RP.t = d.end; RP.play = false; }
  else if (k === 'next' && d.kind === 'el'){ const outs = d.G.L.players.map(w => w === -1 ? (d.G.me.out ? d.G.me.out.t : 0) : elBotPlan(d.G.L, w).out).filter(x => x > RP.t + 1000).sort((x, y) => x - y); if (outs.length) RP.t = outs[0] - 3000; }
  else if (k === 'sd' && d.kind === 'el'){ const A = elAllow(d.G.L.rules), i = A.findIndex(x => x <= 0); if (i >= 0) RP.t = Math.min(d.end, d.G.L.t0 + i * d.G.L.rules.round * 60000); }
  else if (k === 'seek'){ const r = a.getBoundingClientRect(); RP.t = d.start + clampN((e.clientX - r.left) / r.width, 0, 1) * (d.end - d.start); }
  rpDraw(true);
}, true);
document.addEventListener('change', e => { const s = e.target.closest('[data-rp-act="speed"]'); if (s && RP){ RP.speed = +s.value; } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && RP) rpClose(); });

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
