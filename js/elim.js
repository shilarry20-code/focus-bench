/* ---------- Elimination ----------
   A lobby of 3–16 players studies at the same moment. The game runs in rounds (25 minutes in a standard lobby), and each
   round gives a break allowance (10 → 5 → 2.5 → 1 min, then 0: sudden death). Breaks can be split up, but going past the
   allowance, or ending your session, knocks you out on the spot. No time cap: the last one studying wins.
   Every bot's game is worked out up front from the lobby's seed (their stamina, how they use their breaks, the odd
   misjudged break), so a lobby plays out the same whether you're watching, away or replaying it. */
const EL_PRESETS = {standard: [10, 5, 2.5, 1, 0], relaxed: [15, 10, 5, 2, 0], hardcore: [5, 2, 1, 0], sudden: [0]};
const EL_PRESET_NAME = {standard: 'Standard', relaxed: 'Relaxed', hardcore: 'Hardcore', sudden: 'Sudden death', custom: 'Custom'};
const elAllow = r => (r.preset === 'custom' ? (r.custom && r.custom.length ? r.custom : [10, 5, 2.5, 1, 0]) : EL_PRESETS[r.preset] || EL_PRESETS.standard);
const elStd = r => r.preset === 'standard' && +r.round === 25;
const elRated = r => !!r.ranked && elStd(r);      // only games from the Ranked queue are rated; every other lobby is casual
let EL = store.get('fb.elim', {G: null, list: [], live: [], hist: [], view: 'browse', tab: 'stand', filt: 'all', form: null});
EL.list = EL.list || []; EL.live = EL.live || []; EL.hist = EL.hist || [];
const saveEl = () => { const {_bp, ...rest} = EL; store.set('fb.elim', JSON.parse(JSON.stringify(rest, (k, v) => k === '_bp' ? undefined : v))); };
const elBusy = () => !!(EL.G && !EL.G.done);
const elMeIn = G => G && G.L.players.includes(-1);

/* ---- who plays: players near a rating, picked the same way every time for a lobby ---- */
function elPickPlayers(seed, center, range, n, subject){
  const order = sortedBots(), rnd = mulberry32(fdHash(seed + ':pick'));
  // order is highest rating first: find where `center` sits
  let lo = 0, hi = order.length - 1; while (lo < hi){ const m = (lo + hi) >> 1; if (botRating(order[m]) > center) lo = m + 1; else hi = m; }
  const out = new Set(), half = range / 2;
  for (let t = 0; t < 4000 && out.size < n; t++){
    const k = clampN(lo + Math.round((rnd() - .5) * 2 * Math.min(6000, 400 + t * 4)), 0, order.length - 1), w = order[k];
    if (Math.abs(botRating(w) - center) > half || out.has(w)) continue;
    if (subject && t < 2500 && BOTS[w].subject !== subject && rnd() < .7) continue;
    out.add(w);
  }
  return [...out];
}

/* ---- each bot's game, from the seed ---- */
function elBotPlan(L, w){
  if (L.bp && L.bp[w]) return L.bp[w];
  const rnd = mulberry32(fdHash(L.id + ':' + w)), RL = L.rules.round * 60000, A = elAllow(L.rules).map(m => m * 60000);
  const B = BOTS[w], typ = typical(botRating(w)) * (B.sitMul || 1), g = gaussOf(rnd);
  const S = clampN(typ * Math.exp(.45 + .4 * g), 25, 720) * 60000;          // how long they can keep going today
  const style = ['early', 'saver', 'edge', 'calm'][Math.floor(rnd() * 4)];
  const br = []; let out = L.t0 + S, why = 'stopped';
  for (let r = 0; r < 400; r++){
    const rs = L.t0 + r * RL; if (rs >= out) break;
    const a = A[Math.min(r, A.length - 1)];
    if (a <= 0){ if (rnd() < (style === 'edge' ? .05 : .015)){ const t = Math.round(rs + rnd() * RL); if (t < out){ br.push([t, t + 20000]); out = t + 2000; why = 'break'; } break; } continue; }
    if (rnd() > {early: .95, saver: .55, edge: .9, calm: .75}[style]) continue;
    const use = {early: r < 2 ? .75 + rnd() * .25 : .4 + rnd() * .4, saver: .15 + rnd() * .35, edge: .85 + rnd() * .14, calm: .3 + rnd() * .4}[style];
    const over = rnd() < (style === 'edge' ? .12 : .03) * (a <= 150000 ? 2 : 1);
    const tot = over ? a + (5 + rnd() * 80) * 1000 : Math.max(20000, Math.min(a * use, a - 4000));
    const two = tot > 4 * 60000 && rnd() < .5, l1 = two ? tot * (.3 + rnd() * .4) : tot, l2 = tot - l1;
    const s1 = Math.round(rs + 60000 + rnd() * Math.max(0, (two ? RL / 2 : RL) - l1 - 120000));
    const parts = two ? [[s1, s1 + l1], [Math.round(rs + RL / 2 + rnd() * Math.max(0, RL / 2 - l2 - 60000)), 0]] : [[s1, s1 + l1]];
    if (two) parts[1][1] = parts[1][0] + l2;
    let used = 0;
    for (const [s, e] of parts){
      if (s >= out) break;
      if (used + (e - s) > a){ const at = Math.round(s + (a - used)); if (at < out){ br.push([s, Math.round(e)]); out = at; why = 'break'; } break; }
      br.push([s, Math.round(e)]); used += e - s;
    }
    if (why === 'break') break;
  }
  const plan = {out: Math.round(out), why, br: br.filter(([s]) => s < out).map(([s, e]) => [s, Math.min(e, Math.round(out) + (why === 'break' ? 60000 : 0))])};
  (L.bp || (L.bp = {}))[w] = plan;
  return plan;
}

/* ---- you: your studying and breaks, as they happen ---- */
function elMeOut(G, now){
  const L = G.L, RL = L.rules.round * 60000, A = elAllow(L.rules).map(m => m * 60000), ev = G.me.ev;
  if (G.me.out) return G.me.out;
  const seg = []; for (let k = 0; k < ev.length; k++) seg.push([ev[k][0], k + 1 < ev.length ? ev[k + 1][0] : now, ev[k][1]]);
  const rEnd = Math.floor((now - L.t0) / RL);
  for (let r = 0; r <= rEnd; r++){
    const rs = L.t0 + r * RL, re = rs + RL, a = A[Math.min(r, A.length - 1)] + (A[Math.min(r, A.length - 1)] <= 0 ? 3000 : 0);   // a few seconds' grace in sudden death
    let used = 0;
    for (const [s, e, st] of seg){
      if (st !== 'B') continue; const x = Math.max(s, rs), y = Math.min(e, re, now); if (y <= x) continue;
      if (used + (y - x) > a) return {t: Math.round(x + (a - used)), why: 'break'};
      used += y - x;
    }
  }
  return null;
}
function elMeUsed(G, now){
  const L = G.L, RL = L.rules.round * 60000, r = Math.max(0, Math.floor((now - L.t0) / RL)), rs = L.t0 + r * RL, ev = G.me.ev; let used = 0;
  for (let k = 0; k < ev.length; k++){ if (ev[k][1] !== 'B') continue; const x = Math.max(ev[k][0], rs), y = Math.min(k + 1 < ev.length ? ev[k + 1][0] : now, now); if (y > x) used += y - x; }
  return used;
}

/* ---- the state of a lobby at any moment (live, spectating or replay) ---- */
function elState(G, t){
  const L = G.L, RL = L.rules.round * 60000, A = elAllow(L.rules).map(m => m * 60000);
  const r = Math.max(0, Math.floor((t - L.t0) / RL)), rs = L.t0 + r * RL, a = A[Math.min(r, A.length - 1)];
  const ps = L.players.map(w => {
    if (w === -1){
      const out = G.me.out && G.me.out.t <= t ? G.me.out : null, ev = G.me.ev; let st = 'S';
      for (let k = ev.length - 1; k >= 0; k--) if (ev[k][0] <= t){ st = ev[k][1]; break; }
      let used = 0; for (let k = 0; k < ev.length; k++){ if (ev[k][1] !== 'B') continue; const x = Math.max(ev[k][0], rs), y = Math.min(k + 1 < ev.length ? ev[k + 1][0] : t, t); if (y > x) used += y - x; }
      return {w, out: out ? out.t : null, why: out && out.why, st: out ? 'out' : t < L.t0 ? 'wait' : st === 'B' ? 'break' : 'study', used};
    }
    const p = elBotPlan(L, w), out = p.out <= t ? p.out : null;
    const onBr = p.br.some(([s, e]) => t >= s && t < e);
    const used = p.br.reduce((n, [s, e]) => n + Math.max(0, Math.min(e, t) - Math.max(s, rs)), 0);
    return {w, out, why: out && p.why, st: out ? 'out' : t < L.t0 ? 'wait' : onBr ? 'break' : 'study', used};
  });
  const alive = ps.filter(p => !p.out), order = ps.filter(p => p.out).sort((x, y) => x.out - y.out || x.w - y.w);
  order.forEach((p, k) => { p.place = ps.length - k; });
  let over = null;
  if (alive.length === 1 && order.length){ alive[0].place = 1; over = {winner: alive[0].w, t: order[order.length - 1].out}; }
  else if (!alive.length){ const last = order[order.length - 1]; last.place = 1; over = {winner: last.w, t: last.out}; }
  return {r, rs, re: rs + RL, a, A, ps, alive: alive.length, over, sd: a <= 0};
}
// when the game ends for good (every bot's end is known; yours only once it happens)
function elEnd(G){
  const outs = G.L.players.filter(w => w !== -1).map(w => elBotPlan(G.L, w).out).sort((a, b) => a - b);
  if (!elMeIn(G)) return outs[outs.length - 2] != null ? outs[outs.length - 2] : outs[0];
  return null;
}

/* ---- the lobby list: lobbies open around your rating, filling up, starting, and running ---- */
const EL_SUBJ_NAMES = ['grind', 'lock in', 'no breaks', 'finals prep', 'late night', 'library crew', 'study hall', 'focus room', 'deep work', 'quiet hours', 'all nighter', 'early birds', 'cram session', 'marathon'];
function elWait(N){       // how long a lobby takes to fill once you're in (seconds)
  const h = new Date().getHours(), late = h >= 2 && h < 7 ? 1.5 : 1, hi = R.mmr >= 3000 ? 1.5 : R.mmr >= 2400 ? 1.25 : 1;
  const s = (1.5 + Math.random() * 3.5) * late * hi, min = N <= 3 ? 4.5 : 5 + (N - 4) * 5 / 12;
  return min + (s - 1.5) * (1.15 + (N - 4) * .096);
}
function elNewLobby(opts){
  const now = Date.now(), id = 'L' + now.toString(36) + Math.random().toString(36).slice(2, 6), rnd = Math.random;
  const rules = {size: 8, round: 25, preset: 'standard', custom: [10, 5, 2.5, 1, 0], rated: true, range: 300, privacy: 'public', subject: '', name: '', start: 'full', at: 0, chat: 'break', spect: true, ...opts};
  if (!elStd(rules)) rules.rated = false;
  const center = opts.center != null ? opts.center : R.mmr + gaussOf(rnd) * 220;
  return {id, rules, created: now, center: Math.round(center), host: opts.host != null ? opts.host : null, players: [], joinAt: [], t0: 0, name: rules.name};
}
function elListTick(){
  if (!RK_READY) return;
  const now = Date.now(); let ch = false;
  // keep about ten open lobbies, of mixed sizes
  EL.list = EL.list.filter(l => l.players.length < l.rules.size && now - l.created < 30 * 60000);
  while (EL.list.length < 10){
    const r = Math.random(), N = r < .22 ? 4 : r < .4 ? 8 : r < .5 ? 16 : [3, 5, 6, 6, 7, 10, 12, 12, 14][Math.floor(Math.random() * 9)];
    const casual = Math.random() < .2, pre = casual ? ['relaxed', 'hardcore', 'sudden', 'standard'][Math.floor(Math.random() * 4)] : 'standard';
    const L = elNewLobby({size: N, preset: pre, round: casual && pre === 'standard' ? [15, 45, 60][Math.floor(Math.random() * 3)] : 25, rated: !casual});
    const ppl = elPickPlayers(L.id, L.center, 300, N, ''), host = ppl[0];
    L.host = host; L.pool = ppl; L.name = lobbyName(host, BOTS[host].subject);
    L.rules.subject = Math.random() < .25 ? BOTS[host].subject : '';
    L.players = [host]; L.joinAt = [now];
    // people trickle in over a few minutes
    let t = now; for (let k = 1; k < N; k++){ t += (8 + Math.random() * 40) * 1000; L.joinAt.push(Math.round(t)); }
    L.created = now - Math.floor(Math.random() * 60000);
    EL.list.push(L); ch = true;
  }
  EL.list.forEach(L => {
    if (L.mine) return;
    while (L.players.length < L.rules.size && L.joinAt[L.players.length] <= now){ L.players.push(L.pool[L.players.length]); ch = true; }
    if (L.players.length >= L.rules.size && !L.t0){ L.t0 = now + 3000; EL.live.unshift({...L}); ch = true; }
  });
  EL.list = EL.list.filter(l => !l.t0);
  // games already going when you open the app
  if (EL.live.length < 3 && !EL.seeded){
    EL.seeded = 1;
    for (let k = 0; k < 4; k++){
      const N = [4, 8, 16, 6, 12][Math.floor(Math.random() * 5)], L = elNewLobby({size: N}), ppl = elPickPlayers(L.id, L.center, 300, N, '');
      if (ppl.length < N) continue;
      L.host = ppl[0]; L.players = ppl; L.name = lobbyName(ppl[0], BOTS[ppl[0]].subject);
      L.t0 = now - (5 + Math.random() * 80) * 60000; L.joinAt = ppl.map(() => L.t0 - 3000);
      const S = elState({L, me: {ev: []}}, now); if (!S.over) EL.live.push(L);
    }
    ch = true;
  }
  // running lobbies you can watch (a few at a time; finished ones drop off)
  EL.live = EL.live.filter(L => { const end = Math.max(...L.players.map(w => elBotPlan(L, w).out)); return now < end + 5 * 60000; }).slice(0, 8);
  if (ch && !$('#page-elim').hidden && EL.view === 'browse') elRender();
}

/* ---- joining, creating, leaving ---- */
function elCanJoin(){
  if (R.cur && R.cur.state === 'live'){ toast('Finish your ranked match first.'); return false; }
  if (elBusy()){ toast('You’re already in a lobby.'); return false; }
  return true;
}
function elJoin(L){
  if (!elCanJoin()) return;
  if (Math.abs(R.mmr - L.center) > L.rules.range / 2 + 25){ toast('Your rating is outside this lobby’s range.'); return; }
  EL.list = EL.list.filter(l => l !== L);
  const N = L.rules.size, have = L.players.slice(0, N - 1), now = Date.now(), wait = elWait(N) * 1000;
  const need = N - 1 - have.length, pool = (L.pool || elPickPlayers(L.id, L.center, L.rules.range, N + 4, L.rules.subject)).filter(w => !have.includes(w));
  const joinAt = have.map(() => now);
  let t = now; for (let k = 0; k < need; k++){ t += wait / Math.max(1, need) * (.5 + Math.random()); joinAt.push(Math.round(Math.min(now + wait, t))); }
  const G = {L: {...L, players: [-1, ...have, ...pool.slice(0, need)], joinAt: [now, ...joinAt], t0: 0, mine: true}, me: {ev: [], out: null}, chat: [], q: [], xp: 0, seenOut: [], done: false, at: now};
  G.L.fillEnd = Math.max(...G.L.joinAt);
  EL.G = G; EL.view = 'game'; EL.tab = 'stand'; saveEl(); showPage('elim'); elRender();
}
// the Ranked queue for 4, 8 or 16: a standard lobby around your rating
function elQueue(N){
  if (MQ){ toast('You’re already searching for a 1v1.'); return; }
  if (!elCanJoin()) return;
  const L = elNewLobby({size: N, center: R.mmr, preset: 'standard', round: 25, ranked: true}); L.name = `Ranked · ${N} players`; elJoin(L);
}
function elCreate(f){
  if (!elCanJoin()) return;
  const rules = {size: clampN(+f.size || 8, 3, 16), round: +f.round || 25, preset: f.preset, custom: f.custom, rated: f.rated, range: +f.range || 300, privacy: f.privacy, subject: f.subject, name: f.name.trim(), start: f.start, at: f.at, chat: f.chat, spect: f.spect};
  const L = elNewLobby({...rules, center: R.mmr}); L.name = rules.name || `${myName()}'s lobby`; L.host = -1;
  if (rules.privacy === 'invite' && f.inv && f.inv.length){ L.pool = f.inv.concat(elPickPlayers(L.id, L.center, rules.range, rules.size + 4, rules.subject).filter(w => !f.inv.includes(w))); L.invited = f.inv; }
  else if (rules.privacy === 'followers' && typeof FD !== 'undefined' && FD.follows.length) L.pool = FD.follows.filter(w => Math.abs(botRating(w) - R.mmr) <= rules.range / 2).sort(() => Math.random() - .5).concat(elPickPlayers(L.id, L.center, rules.range, rules.size + 4, rules.subject));
  else L.pool = elPickPlayers(L.id, L.center, rules.range, rules.size + 4, rules.subject);
  L.pool = [...new Set(L.pool)];
  elJoin(L);
  if (rules.start === 'time' && rules.at > Date.now()){ const G = EL.G; G.L.startAt = rules.at; G.L.joinAt = G.L.joinAt.map((t, k) => k ? Math.round(Date.now() + (rules.at - Date.now()) * k / G.L.players.length) : t); G.L.fillEnd = rules.at - 3000; saveEl(); }
  if (L.invited) L.invited.forEach(w => { try { dmQueue(w, Date.now() + 2000 + Math.random() * 6000, ['in! 🔥'], {}); } catch(e){} });
}
function elLeave(){
  const G = EL.G; if (!G) return;
  if (G.L.t0 && Date.now() >= G.L.t0 && !G.done && !G.me.out){ if (!confirm('Leave the game? You’ll be knocked out.')) return; G.me.out = {t: Date.now(), why: 'left'}; elFinishMe(G); }
  EL.G = null; EL.view = 'browse'; saveEl(); elRender();
}

/* ---- the clock: filling, countdown, and the game ---- */
function elTick(){
  if (!RK_READY) return;
  const G = EL.G, now = Date.now();
  if (G && !G.done){
    const L = G.L;
    if (!L.t0 && now >= (L.fillEnd || 0) && (!L.startAt || now >= L.startAt - 3000)){
      L.t0 = Math.max(now, L.fillEnd || now) + 3000; G.me.ev = [[L.t0, 'B']];
      saveEl(); elRender();
      setTimeout(() => elBegin(G), Math.max(0, L.t0 - Date.now()));
    }
    if (L.t0 && now >= L.t0){
      // your state: studying while the focus timer runs, otherwise on a break
      const st = focusing() ? 'S' : 'B', last = G.me.ev[G.me.ev.length - 1];
      if (!G.me.out && (!last || last[1] !== st)) G.me.ev.push([now, st]);
      if (!G.me.out){ const o = elMeOut(G, now); if (o){ G.me.out = o; elFinishMe(G); } }
      // warnings and knockouts
      const S = elState(G, now);
      if (!G.me.out){
        const left = S.a - elMeUsed(G, now);
        if (st === 'B' && S.a > 0){ if (left < 31000 && left > 25000 && G.warn !== S.r + ':30'){ G.warn = S.r + ':30'; toast('30 seconds of break left this round.'); }
          if (left < 11000 && left > 5000 && G.warn !== S.r + ':10'){ G.warn = S.r + ':10'; toast('10 seconds of break left! Start your timer.'); try { chime && chime(P.chime); } catch(e){} } }
        if (st === 'B' && S.a <= 0 && G.warn !== S.r + ':sd'){ G.warn = S.r + ':sd'; toast('Sudden death: start your timer now!'); }
      }
      S.ps.filter(p => p.out && p.w !== -1 && !G.seenOut.includes(p.w)).sort((a, b) => a.out - b.out).forEach(p => {
        G.seenOut.push(p.w);
        const meIn = !G.me.out || G.me.out.t > p.out;
        if (meIn && elMeIn(G)){ G.xp += 20; addElXp(20); }
        G.chat.push({t: p.out, sys: 1, text: `${bot(p.w).name} ${p.why === 'stopped' ? 'ended their session' : 'went over the break allowance'} · ${L.players.length - G.seenOut.length - (G.me.out && G.me.out.t <= p.out ? 1 : 0)} left`});
        if (now - p.out < 120000){ elBanner(p.w); elChatEvent('out', p.w); }
      });
      if (S.over && !G.done){
        const meWon = S.over.winner === -1;
        if (meWon && !G.wonPaid){ G.wonPaid = 1; G.xp += 100; addElXp(100); elFinishMe(G, S.over.t); }
        if (!elMeIn(G) || G.me.out || meWon){ G.done = true; G.result = G.result || elResult(G, S); }
      }
      if (!$('#page-elim').hidden && EL.view === 'game') elRenderGame(); else elCardRender();
      if (now - (G.saved || 0) > 5000){ G.saved = now; saveEl(); }
    }
    if (!L.t0 && !$('#page-elim').hidden && EL.view === 'game') elRenderGame();
  }
  if (EL.view === 'watch' && EL.watch && !$('#page-elim').hidden) elRenderGame(EL.watch);
  elChatPump();
}
let elInternal = false;
function elBegin(G){
  if (EL.G !== G || G.done) return;
  elInternal = true;
  // the game runs on the stopwatch: switch to it and start
  try {
    if (P.mode !== 'stopwatch'){ if (S.running && S.phase === 'focus') reset(); P.mode = 'stopwatch'; saveP(); S.flowBreakMin = 5; resetCycle(true); renderTimerPane(); }
    if (!S.running) start();
  } catch(e){ console.error(e); }
  elInternal = false;
  toast('Go! Your stopwatch is running. Pausing it is a break.');
  G.chat.push({t: Date.now(), sys: 1, text: `The game started: ${G.L.players.length} players. Round 1 · ${elFmtA(elAllow(G.L.rules)[0])} of breaks.`});
  saveEl(); elRender();
}
// you're out (or you won): Elo for rated lobbies, your record, and the replay
function elFinishMe(G, won){
  if (G.paid) return; G.paid = 1;
  const t = won ? (typeof won === 'number' ? won : Date.now()) : G.me.out.t, L = G.L, N = L.players.length;
  const S = elState(G, t + 1), me = S.ps.find(p => p.w === -1), place = won ? 1 : me.place || (S.alive + 1);
  let delta = 0;
  if (elRated(L.rules)){
    const K = N <= 3 ? 32 : 36 + (N - 4) * 28 / 12, E = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));
    S.ps.filter(p => p.w !== -1).forEach(p => { const beat = won || (p.out && p.out < t) ? 1 : 0; delta += beat - E(R.mmr, botRating(p.w)); });
    delta = Math.round(K / (N - 1) * delta);
    R.mmr = clampN(R.mmr + delta, 100, 5000); R.best = Math.max(R.best, R.mmr);
  }
  let pl = 0, placed = null;
  if (elRated(L.rules)){
    pl = rkUnplaced() ? R.played + 1 : 0; R.played++; placed = rkPlace();
    const gm = R.gm || (R.gm = {}), x = gm[N] || (gm[N] = {w: 0, l: 0}); if (place === 1) x.w++; else x.l++;
    (R.gh || (R.gh = [])).unshift({id: L.id, t, t0: L.t0, N, p: place, d: delta, m: R.mmr, dur: t - L.t0, ...(pl ? {pl} : {})}); R.gh = R.gh.slice(0, 300);
  }
  const el = R.el || (R.el = {played: 0, wins: 0, top3: 0, best: 99, longest: 0, sd: 0});
  el.played++; if (place === 1) el.wins++; if (place <= 3) el.top3++; el.best = Math.min(el.best, place);
  el.longest = Math.max(el.longest, t - L.t0); if (elState(G, t - 1000).sd) el.sd++;
  G.result = {place, N, delta, rated: elRated(L.rules), t, why: won ? 'won' : G.me.out.why, xp: G.xp, pl, placed: placed && placed.full};
  saveRanked(); saveEl(); try { renderRankChip(); } catch(e){}
  const elo = pl ? (placed ? `Placed: ${placed.full} · ` : `Placement ${pl} of ${PLACE_N} · `) : delta ? `${delta > 0 ? '+' : ''}${delta} Elo · ` : '';
  toast(won ? `You won the lobby! 🏆 ${elo}+${G.xp} XP` : `You’re out: ${elOrd(place)} of ${N}. ${elo}+${G.xp} XP`);
  if (won) try { fx.burst(); } catch(e){}
  elHistAdd(G);
  try { renderRanked(); } catch(e){}
}
const elResult = (G, S) => G.result || {place: (S.ps.find(p => p.w === -1) || {}).place, N: G.L.players.length};
function addElXp(n){ R.elXp = (R.elXp || 0) + n; saveRanked(); try { lvRender(); } catch(e){} }
function elHistAdd(G){
  if (!elMeIn(G) || G.histed) return; G.histed = 1;
  const r = G.result || {}; EL.hist.unshift({id: G.L.id, t: G.L.t0, N: G.L.players.length, place: r.place, delta: r.delta || 0, rated: r.rated, xp: G.xp, name: G.L.name, dur: (r.t || Date.now()) - G.L.t0});
  EL.hist = EL.hist.slice(0, 50);
  const elh = R.elh || (R.elh = []); elh.unshift({t: G.L.t0, p: r.place, N: G.L.players.length, sd: elState(G, (r.t || Date.now()) - 1000).sd ? 1 : 0}); R.elh = elh.slice(0, 200); saveRanked();
  rpSave('el:' + G.L.id, {kind: 'el', G: elPack(G)});
  saveEl();
}
// a lobby as saved for its replay: everything needed to play it back exactly
function elPack(G){ const L = G.L; L.players.forEach(w => { if (w !== -1) elBotPlan(L, w); }); return {L: JSON.parse(JSON.stringify(L)), me: G.me, chat: G.chat.slice(-300), result: G.result}; }

/* ---- lobby chat: people talk on their breaks (you too) ---- */
const EL_LINES = {brk: ['taking my break now', 'brb water', 'stretch break', 'ok snack time', 'quick break', 'eyes need a rest', 'bathroom run', 'refilling coffee ☕'],
  out: ['rip', 'gg', 'nooo', 'one down', 'that allowance is no joke', 'gg wp', 'oof'], sd: ['sudden death is terrifying', 'no more breaks 😬', 'my legs are numb', 'we ball']};
let elChatBusy = false, elAiLast = 0;
function elChatEvent(kind, w){
  const G = EL.G; if (!G || G.L.rules.chat === 'off') return;
  const S = elState(G, Date.now()), onBreak = S.ps.filter(p => p.w !== -1 && p.st === 'break').map(p => p.w), talk = G.L.rules.chat === 'on' ? S.ps.filter(p => p.w !== -1 && !p.out).map(p => p.w) : onBreak;
  if (!talk.length) return;
  if (GEM.key && !(GEM.wait > Date.now()) && Date.now() - elAiLast > 150000 && !elChatBusy) return elChatAI(kind === 'out' ? `${bot(w).name} just got knocked out.` : 'react to the game', talk);
  if (Math.random() < .6){ const who = talk[Math.floor(Math.random() * talk.length)], lines = EL_LINES[S.sd ? 'sd' : kind === 'out' ? 'out' : 'brk']; elQ(who, lines[Math.floor(Math.random() * lines.length)]); }
}
function elQ(w, text, at){ const G = EL.G; if (!G) return; const t = Math.max(at || Date.now() + 2000, ...G.q.map(x => x.t + 2500)); G.q.push({t, w, text}); }
function elChatPump(){
  const G = EL.G; if (!G || !G.q.length) return;
  const now = Date.now(); if (G.q[0].t > now || now - (G.lastMsg || 0) < 2200) return;
  const x = G.q.shift(); G.chat.push({t: now, w: x.w, text: x.text}); G.lastMsg = now;
  if (!$('#page-elim').hidden && EL.view === 'game') elRenderGame();
}
async function elChatAI(task, talk){
  const G = EL.G; elChatBusy = true; elAiLast = Date.now();
  try {
    const S = elState(G, Date.now()), me = myName();
    const sys = `You write lobby chat for an Elimination game on Focus Bench, a study-timer app for college students. Everyone in the lobby studies at the same time; each round allows a little break time, and going over it (or stopping) knocks you out. Last one studying wins.
People only chat while they're on a break. Write like quick game-lobby chat: short, casual, lowercase is fine, slang is fine, some trash talk and hype, nothing formal. Never start a message with the name of the person it answers.
Answer with JSON: {"messages":[{"from":"<name exactly as listed>","text":"…"}]}.
${typeof TALK_RULES === 'string' ? TALK_RULES : ''}`;
    const user = `Round ${S.r + 1}, ${S.alive} of ${G.L.players.length} still in, ${S.sd ? 'sudden death (no breaks allowed)' : `${elFmtA(S.a / 60000)} of breaks this round`}.
People who can talk now: ${talk.map(w => `${bot(w).name} (emojis: ${emojiStyle(w)})`).join('; ')}${!focusing() ? `; ${me} (the user) is on a break too` : ''}.
Chat so far:
${G.chat.slice(-10).map(x => x.sys ? `[${x.text}]` : `${x.w === -1 ? me : bot(x.w).name}: ${x.text}`).join('\n') || '(nothing yet)'}

${task} Write 1 to 3 short messages from 1 or 2 of the people who can talk.`;
    const got = await aiCall(sys, user), names = new Map(talk.map(w => [bot(w).name.toLowerCase(), w]));
    (Array.isArray(got) ? got : []).slice(0, 3).forEach(x => { const w = names.get(String(x && x.from || '').toLowerCase().trim()); if (w == null) return; const text = emotionOnly(stripSegue(String(x.text || '').trim().slice(0, 180))); if (text) elQ(w, text); });
  } catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); }
  finally { elChatBusy = false; }
}
function elSend(text){
  const G = EL.G; if (!G || !text.trim()) return;
  if (G.L.rules.chat === 'off') return toast('Chat is off in this lobby.');
  if (G.L.rules.chat === 'break' && focusing() && !G.me.out) return toast('You can only chat on a break.');
  G.chat.push({t: Date.now(), w: -1, text: text.trim().slice(0, 200)}); saveEl(); elRenderGame();
  const S = elState(G, Date.now()), talk = (G.L.rules.chat === 'on' ? S.ps.filter(p => p.w !== -1 && !p.out) : S.ps.filter(p => p.w !== -1 && p.st === 'break')).map(p => p.w);
  if (talk.length && GEM.key && !elChatBusy) setTimeout(() => elChatAI(`${myName()} just said something: answer them.`, talk), 2500);
}

/* ---- drawing ---- */
const elFmtA = m => m <= 0 ? 'no' : m < 1 ? `${Math.round(m * 60)} sec` : `${+m.toFixed(1)} min`;
const elOrd = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const elClock = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
const elWho = w => w === -1 ? `<b>You</b>` : `<button class="lnk" data-bot="${w}">${esc(bot(w).name)}</button>`;
const elAv = w => w === -1 ? myAvatar('sm') : avatar(bot(w), 'sm');
const elR = w => w === -1 ? R.mmr : botRating(w);
function elRender(){
  const box = $('#elBody'); if (!box) return; elCardRender();
  if ($('#page-elim').hidden) return;
  if (EL.view === 'game' && EL.G) return elRenderGame();
  if (EL.view === 'watch' && EL.watch) return elRenderGame(EL.watch);
  if (EL.view === 'create') return elRenderCreate();
  EL.view = 'browse';
  const f = EL.filt, inSize = l => f === 'all' || f === 'join' || (f === 's' ? l.rules.size <= 6 : f === 'm' ? l.rules.size >= 7 && l.rules.size <= 11 : l.rules.size >= 12);
  const can = l => Math.abs(R.mmr - l.center) <= l.rules.range / 2 + 25;
  const list = EL.list.filter(l => inSize(l) && (f !== 'join' || can(l))).sort((a, b) => can(b) - can(a) || b.players.length / b.rules.size - a.players.length / a.rules.size);
  const row = l => { const lo = l.center - l.rules.range / 2, hi = l.center + l.rules.range / 2, ok = can(l);
    return `<li class="el-row${ok ? '' : ' off'}"><div class="el-rn"><b>${esc(l.name)}</b><small>${l.host != null && l.host !== -1 ? `host ${esc(bot(l.host).name)} · ` : ''}${elRated(l.rules) ? 'Rated' : 'Casual'} · ${EL_PRESET_NAME[l.rules.preset]}${+l.rules.round !== 25 ? ` · ${l.rules.round}-min rounds` : ''}${l.rules.subject ? ` · ${esc(l.rules.subject)}` : ''}</small></div>
      <div class="el-rs"><span class="el-fill"><i style="width:${l.players.length / l.rules.size * 100}%"></i></span><small>${l.players.length}/${l.rules.size}</small></div>
      <small class="el-rr">${Math.round(lo).toLocaleString()}–${Math.round(hi).toLocaleString()}</small>
      <button class="small-btn${ok ? ' accent' : ''}" data-el="join" data-id="${l.id}" ${ok ? '' : 'disabled title="Your rating is outside this lobby’s range"'}>Join</button></li>`; };
  const now = Date.now(), live = EL.live.filter(L => L.rules.spect !== false).map(L => { const S = elState({L, me: {ev: []}}, now); return {L, S}; }).filter(x => !x.S.over || now - x.S.over.t < 60000);
  box.innerHTML = `<div class="el-top card"><div><div class="h first">Elimination</div><p class="hint">Everyone studies at once. Each round allows a little break time; go over it or stop and you're out. Last one studying wins. Lobbies here are casual and don't change your Elo; for rated 4, 8 and 16-player games, pick them in the Ranked queue.</p></div>
      <div class="el-quick"><button class="small-btn accent" data-el="create">Create lobby</button><button class="small-btn" data-go="ranked">Ranked group games →</button></div></div>
    ${EL.G ? `<div class="card el-cur"><b>You're in a lobby.</b> <button class="small-btn accent" data-el="back">Back to your game →</button></div>` : ''}
    <div class="el-cols"><div class="card"><div class="h first el-lh"><span>Open lobbies</span><span class="el-filt">${[['all', 'All'], ['join', 'Joinable'], ['s', '3–6'], ['m', '7–11'], ['l', '12–16']].map(([k, t]) => `<button class="chip${f === k ? ' on' : ''}" data-el="filt" data-f="${k}">${t}</button>`).join('')}</span></div>
      <ul class="el-list">${list.map(row).join('') || '<li class="hint">No lobbies right now. Create one!</li>'}</ul><p class="hint">Your rating: ${R.mmr.toLocaleString()} Elo. Lobbies are open to players within their rating range.</p></div>
      <div><div class="card"><div class="h first">Live now</div><ul class="el-list">${live.map(({L, S}) => `<li class="el-row"><div class="el-rn"><b>${esc(L.name)}</b><small>${S.over ? `Finished · ${esc(bot(S.over.winner).name)} won` : `Round ${S.r + 1} · ${S.alive} of ${L.players.length} left${S.sd ? ' · sudden death' : ''}`}</small></div><button class="small-btn" data-el="watch" data-id="${L.id}">Watch</button></li>`).join('') || '<li class="hint">Nothing running right now.</li>'}</ul></div>
      <div class="card"><div class="h first">Your games</div><ul class="el-list">${EL.hist.slice(0, 12).map(h => `<li class="el-row"><div class="el-rn"><b>${elOrd(h.place || 0)} of ${h.N}</b><small>${esc(h.name || 'Lobby')} · ${new Date(h.t).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} · ${elClock(h.dur)}${h.rated ? ` · ${h.delta > 0 ? '+' : ''}${h.delta} Elo` : ''} · +${h.xp} XP</small></div><button class="small-btn" data-rp="el:${h.id}">View</button></li>`).join('') || '<li class="hint">Your finished games show up here, with replays.</li>'}</ul></div></div></div>`;
}
function elRenderCreate(){
  const box = $('#elBody'), f = EL.form || (EL.form = {size: 8, round: 25, preset: 'standard', custom: [10, 5, 2.5, 1, 0], rated: true, range: 300, privacy: 'public', subject: '', name: '', start: 'full', at: '', chat: 'break', spect: true, inv: []});
  const std = f.preset === 'standard' && +f.round === 25;
  const subjects = [...new Set(Array.from({length: 2000}, (_, i) => bot(i).subject).filter(Boolean))].sort();
  const cands = [...new Set([...(typeof FD !== 'undefined' ? FD.follows : []), ...Object.keys(R.rec || {}).map(Number)])].filter(w => w >= 0).slice(0, 40);
  const opt = (k, v, t) => `<option value="${v}"${String(f[k]) === String(v) ? ' selected' : ''}>${t}</option>`;
  box.innerHTML = `<div class="card el-form"><div class="h first">Create a lobby</div>
    <label>Name<input id="elfName" maxlength="40" placeholder="${esc(myName())}'s lobby" value="${esc(f.name)}"></label>
    <label>Players <b id="elfSzV">${f.size}</b><input type="range" id="elfSize" min="3" max="16" value="${f.size}"></label>
    <label>Round length<select id="elfRound">${[10, 15, 25, 45, 60].map(m => opt('round', m, `${m} minutes`)).join('')}</select></label>
    <label>Break allowance<select id="elfPre">${Object.keys(EL_PRESET_NAME).map(k => opt('preset', k, `${EL_PRESET_NAME[k]}${EL_PRESETS[k] ? ' · ' + EL_PRESETS[k].join(' → ') + ' min' : ''}`)).join('')}</select></label>
    ${f.preset === 'custom' ? `<label>Your allowance per round (minutes, the last one repeats)<input id="elfCustom" value="${f.custom.join(', ')}" placeholder="10, 5, 2.5, 1, 0"></label>` : ''}
    <p class="hint">Custom lobbies are casual: they don’t change your Elo.</p>
    <label>Rating range<select id="elfRange">${opt('range', 100, '±50 (within 100)') + opt('range', 200, '±100 (within 200)') + opt('range', 300, '±150 (within 300)')}</select></label>
    <label>Who can join<select id="elfPriv">${opt('privacy', 'public', 'Public: shows in the lobby list') + opt('privacy', 'followers', 'Followers only: people you follow') + opt('privacy', 'invite', 'Invite only')}</select></label>
    ${f.privacy === 'invite' ? `<div class="el-inv">${cands.length ? cands.map(w => `<label class="chip${f.inv.includes(w) ? ' on' : ''}"><input type="checkbox" data-inv="${w}" ${f.inv.includes(w) ? 'checked' : ''} hidden>${esc(bot(w).name)}</label>`).join('') : '<p class="hint">Follow people or play ranked to have people to invite.</p>'}</div>` : ''}
    <label>Subject (optional)<input id="elfSubj" list="elfSubjL" value="${esc(f.subject)}" placeholder="Organic chemistry"><datalist id="elfSubjL">${subjects.map(s => `<option value="${esc(s)}">`).join('')}</datalist></label>
    <label>Start<select id="elfStart">${opt('start', 'full', 'When it’s full') + opt('start', 'time', 'At a set time')}</select></label>
    ${f.start === 'time' ? `<label>Start time<input type="time" id="elfAt" value="${f.at || ''}"></label>` : ''}
    <label>Chat<select id="elfChat">${opt('chat', 'break', 'Only on breaks') + opt('chat', 'on', 'Always on') + opt('chat', 'off', 'Off')}</select></label>
    <label class="el-chk"><input type="checkbox" id="elfSpect" ${f.spect ? 'checked' : ''}> Let people watch</label>
    <div class="confirm"><button class="small-btn" data-el="browse">Cancel</button><button class="small-btn accent" data-el="make">Create and join</button></div></div>`;
}
function elFormRead(){
  const f = EL.form, v = id => ($('#' + id) || {}).value;
  if (!f) return;
  f.name = v('elfName') || ''; f.size = +v('elfSize') || f.size; f.round = +v('elfRound') || f.round; f.preset = v('elfPre') || f.preset;
  if ($('#elfCustom')){ const c = v('elfCustom').split(/[,\s]+/).map(Number).filter(x => isFinite(x) && x >= 0).slice(0, 12); if (c.length) f.custom = c; }
  f.rated = !!($('#elfRated') && $('#elfRated').checked); f.range = +v('elfRange') || 300; f.privacy = v('elfPriv') || 'public'; f.subject = (v('elfSubj') || '').trim();
  f.start = v('elfStart') || 'full'; if ($('#elfAt')) f.at = v('elfAt'); f.chat = v('elfChat') || 'break'; f.spect = !!($('#elfSpect') && $('#elfSpect').checked);
  f.inv = [...document.querySelectorAll('[data-inv]')].filter(x => x.checked).map(x => +x.dataset.inv);
}
function elBanner(w){
  const host = $('#elBody'); if (!host || $('#page-elim').hidden) return;
  const G = EL.G, n = G ? G.L.players.indexOf(w) + 1 : 0, el = document.createElement('div'); el.className = 'el-ban';
  el.innerHTML = `<small>Eliminated</small><b>Player ${String(n).padStart(3, '0')}</b><span>${esc(bot(w).name)}</span>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 500); }, 2600);
}
// the game view (yours, one you're watching, or a replay at time t)
function elGameHtml(G, t, opts = {}){
  const L = G.L, mine = elMeIn(G), now = t;
  if (!L.t0 || now < L.t0){
    const N = L.rules.size || L.players.length, joined = L.joinAt ? L.joinAt.filter(x => x <= now).length : L.players.length;
    const lo = Math.min(...L.players.slice(0, joined).map(elR)), hi = Math.max(...L.players.slice(0, joined).map(elR));
    return `<div class="card el-wait"><div class="el-wh">${L.t0 ? `<b>Starting in ${Math.max(1, Math.ceil((L.t0 - now) / 1000))}…</b>` : L.startAt ? `<b>Starts at ${new Date(L.startAt).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})} · ${joined}/${N}</b>` : `<b>${joined >= N ? 'Lobby full!' : 'Finding players'} · ${joined}/${N}</b>`}<small>${esc(L.name || 'Lobby')} · rating ${lo.toLocaleString()}–${hi.toLocaleString()} · ${elRated(L.rules) ? 'Rated' : 'Casual'} · ${EL_PRESET_NAME[L.rules.preset]} · ${L.rules.round}-min rounds</small></div>
      <div class="el-slots">${Array.from({length: N}, (_, k) => k < joined ? `<div class="el-slot in">${elAv(L.players[k])}<b>${L.players[k] === -1 ? 'You' : esc(bot(L.players[k]).name)}</b><small>${elR(L.players[k]).toLocaleString()}</small></div>` : `<div class="el-slot"><span class="el-spin"></span><small>Searching…</small></div>`).join('')}</div>
      ${opts.replay ? '' : `<div class="confirm"><button class="small-btn" data-el="leave">Leave</button></div>`}</div>`;
  }
  const S = elState(G, now), me = S.ps.find(p => p.w === -1), RL = L.rules.round * 60000, next = S.A[Math.min(S.r + 1, S.A.length - 1)];
  const top = `<div class="card el-bar"><div><b>${esc(L.name || 'Lobby')}</b><small>Round ${S.r + 1} · ${S.alive} of ${L.players.length} left · ${elRated(L.rules) ? 'Rated' : 'Casual'}</small></div>
    ${S.over ? `<span class="el-pill win">${S.over.winner === -1 ? 'You won!' : esc(bot(S.over.winner).name) + ' won'}</span>` : S.sd ? '<span class="el-pill sd">Sudden death · no breaks</span>' : `<span class="el-pill">${elFmtA(S.a / 60000)} of breaks this round · ${next < S.a ? `drops to ${elFmtA(next / 60000)}` : 'next round'} in ${elClock(S.re - now)}</span>`}</div>`;
  let card = '';
  if (mine && me){
    const left = Math.max(0, S.a - me.used), pct = S.a > 0 ? left / S.a * 100 : 0, studied = elMeStudied(G, now);
    card = `<div class="card el-me ${me.st}"><div><small>${me.st === 'out' ? `Out · ${elOrd(me.place || 0)} of ${L.players.length}` : me.st === 'break' ? 'On a break' : 'Studying'}</small><b>${elClock(studied)}</b>
      ${me.st !== 'out' && !S.over ? (S.a > 0 ? `<div class="el-al"><span>Break left this round</span><b>${elClock(left)}</b></div><div class="el-alb ${pct < 20 ? 'red' : pct < 50 ? 'amb' : ''}"><i style="width:${pct}%"></i></div>` : '<div class="el-al"><span>Sudden death: any break knocks you out</span></div>') : G.result ? `<p class="hint">${G.result.placed ? `Placed: ${esc(G.result.placed)} · ` : G.result.pl ? `Placement ${G.result.pl} of ${PLACE_N} · ` : G.result.rated ? `${G.result.delta > 0 ? '+' : ''}${G.result.delta} Elo · ` : ''}+${G.xp} XP</p>` : ''}</div>
      ${opts.replay ? '' : me.st === 'out' || S.over ? `<div class="el-btns"><button class="small-btn" data-el="browse">Back to lobbies</button>${G.done || me.st === 'out' ? `<button class="small-btn" data-el="share">Share to Feed</button><button class="small-btn" data-rp="el:${L.id}">View replay</button><button class="small-btn" data-el="close">Close</button>` : ''}</div>` : `<div class="el-btns"><button class="small-btn accent" data-el="brk">${me.st === 'break' ? 'Back to studying' : 'Take a break'}</button><button class="small-btn danger" data-el="stop">Stop (you're out)</button></div>`}</div>`;
  }
  const order = S.ps.slice().sort((a, b) => (a.out ? 1 : 0) - (b.out ? 1 : 0) || (b.out || 0) - (a.out || 0) || elR(b.w) - elR(a.w));
  const stand = `<div class="card"><div class="h first">Standings</div><ul class="el-st">${order.map(p => `<li class="${p.st}${!opts.replay && EL.follow === p.w ? ' fol' : ''}" data-tile="${p.w}">${elAv(p.w)}<span class="who">${elWho(p.w)}<small>${elR(p.w).toLocaleString()}</small></span><span class="el-ps">${p.st === 'out' ? `Out · ${elOrd(p.place)}` : p.st === 'break' ? `Break · ${elClock(Math.max(0, S.a - p.used))} left` : p.st === 'wait' ? 'Ready' : S.over && S.over.winner === p.w ? 'Winner' : 'Studying'}</span></li>`).join('')}</ul></div>`;
  const arena = `<div class="card el-arena${S.sd ? ' sd' : ''}"><div class="el-count"><b>${S.alive}</b><small>of ${L.players.length} remaining</small></div><div class="el-grid">${L.players.map((w, k) => { const p = S.ps[k];
      return `<div class="el-tile ${p.st}${S.over && S.over.winner === w ? ' champ' : ''}${!opts.replay && EL.follow === w ? ' fol' : ''}" data-tile="${w}" title="${w === -1 ? 'You' : esc(bot(w).name)}${p.st === 'out' ? ` · out, ${elOrd(p.place)}` : p.st === 'break' ? ' · on a break' : ''}"><span class="num">${String(k + 1).padStart(3, '0')}</span>${elAv(w)}<small>${w === -1 ? 'You' : esc(bot(w).name)}</small>${p.st === 'break' && S.a > 0 ? `<i class="drain" style="width:${Math.max(0, (S.a - p.used) / S.a * 100)}%"></i>` : ''}</div>`; }).join('')}</div></div>`;
  const chat = L.rules.chat === 'off' ? '' : `<div class="card el-chat"><div class="h first">Lobby chat <small>${L.rules.chat === 'break' ? '· on breaks only' : ''}</small></div><div class="el-cl" id="elChatList">${(G.chat.length || mine ? G.chat : elSysLines(G, now)).filter(m => m.t <= now).slice(-60).map(m => m.sys ? `<p class="sys">${esc(m.text)}</p>` : `<p><b>${m.w === -1 ? esc(myName()) : esc(bot(m.w).name)}</b> ${esc(m.text)}</p>`).join('') || '<p class="hint">Quiet so far.</p>'}</div>
    ${mine && !opts.replay ? `<form class="el-send" id="elForm"><input id="elIn" maxlength="200" autocomplete="off" placeholder="${L.rules.chat === 'break' && me && me.st === 'study' ? 'Take a break to chat' : 'Say something…'}"><button class="small-btn accent">Send</button></form>` : ''}</div>`;
  const tabs = `<div class="el-tabs">${[['stand', 'Standings'], ['arena', 'Arena']].map(([k, n]) => `<button class="chip${(opts.tab || EL.tab) === k ? ' on' : ''}" data-el="tab" data-t="${k}">${n}</button>`).join('')}${!opts.replay && !mine ? '<button class="small-btn" data-el="browse">Back to lobbies</button>' : ''}</div>`;
  const tl = opts.replay ? '' : elTimeline(G, now), fc = opts.replay ? '' : elFollowCard(G, now);
  if ((opts.tab || EL.tab) === 'arena') return top + card + tabs + fc + arena + `<div class="el-main el-below">${tl}${chat}</div>`;
  return top + card + tabs + fc + `<div class="el-main">${stand}<div class="el-sidecol">${tl}${chat}</div></div>`;
}
// knockout lines for a lobby you're watching
function elSysLines(G, t){
  const S = elState(G, t), outs = S.ps.filter(p => p.out).sort((a, b) => a.out - b.out);
  return [{t: G.L.t0, sys: 1, text: `The game started: ${G.L.players.length} players.`}, ...outs.map((p, k) => ({t: p.out, sys: 1, text: `${p.w === -1 ? myName() : bot(p.w).name} ${p.why === 'stopped' ? 'ended their session' : p.why === 'left' ? 'left' : 'went over the break allowance'} · ${G.L.players.length - k - 1} left`}))];
}
// what has happened so far in a running game, newest first
function elTimeline(G, now){
  if (!G.L.t0 || now < G.L.t0 || typeof rpEvents !== 'function') return '';
  const S = elState(G, now), end = S.over ? S.over.t : now, d = {kind: 'el', G, start: G.L.t0, end, live: !S.over};
  let E = []; try { E = rpEvents(d, rpTracks(d)).filter(e => e.kind !== 'chat'); } catch(e){ console.error(e); }
  const z = G.L.t0;
  return `<div class="card el-tl"><div class="h first">Timeline <small>${E.length} event${E.length === 1 ? '' : 's'}${EL.follow != null && G.L.players.includes(EL.follow) ? ` · ${EL.follow === -1 ? 'your' : esc(bot(EL.follow).name) + '’s'} highlighted` : ''}</small></div><ol>${E.slice(-60).reverse().map(e => `<li class="k-${e.kind}${EL.follow != null && e.w === EL.follow ? ' fw' : ''}"><time>${elClock(e.t - z)}</time><span>${esc(e.text)}</span></li>`).join('')}</ol></div>`;
}
// the player you're following: what they're doing right now and what they've done
function elFollowCard(G, now){
  const f = EL.follow, L = G.L;
  if (!L.t0 || now < L.t0) return '';
  if (f == null || !L.players.includes(f)) return '<p class="hint el-fhint">Tap a player to follow them and see what they’re doing.</p>';
  const S = elState(G, now), p = S.ps.find(x => x.w === f), n = L.players.indexOf(f) + 1, end = S.over ? S.over.t : now;
  const d = {kind: 'el', G, start: L.t0, end, live: !S.over}, tr = rpTracks(d).find(x => x.w === f), st = rpStats(tr.ev);
  const mine = rpEvents(d, rpTracks(d)).filter(e => e.w === f && e.kind !== 'chat').slice(-4).reverse();
  const left = Math.max(0, S.a - p.used), stud = f === -1 ? elMeStudied(G, now) : rpStud(tr.ev, now);
  const status = p.st === 'out' ? `Out · ${elOrd(p.place)}` : S.over && S.over.winner === f ? 'Winner' : p.st === 'break' ? 'On a break' : 'Studying';
  return `<div class="card el-fc ${p.st}"><div class="el-fch">${elAv(f)}<span><small>Following · Player ${String(n).padStart(3, '0')}</small><b>${f === -1 ? 'You' : esc(bot(f).name)}</b><small>${elR(f).toLocaleString()} Elo${f >= 0 && BOTS[f].subject ? ' · ' + esc(BOTS[f].subject) : ''}</small></span>${f >= 0 ? `<button class="small-btn" data-bot="${f}">Profile</button>` : ''}<button class="small-btn" data-el="unfollow" aria-label="Stop following">×</button></div>
    <div class="el-fcs"><div><small>Status</small><b class="st-${p.st}">${status}</b></div><div><small>Studied</small><b>${elClock(stud)}</b></div><div><small>Break left this round</small><b>${p.st === 'out' ? '–' : S.a > 0 ? elClock(left) : 'none'}</b>${p.st !== 'out' && S.a > 0 ? `<span class="el-alb ${left / S.a < .2 ? 'red' : left / S.a < .5 ? 'amb' : ''}"><i style="width:${left / S.a * 100}%"></i></span>` : ''}</div><div><small>Breaks taken</small><b>${st.n} · ${elClock(st.br)}</b></div></div>
    ${mine.length ? `<ul class="el-fce">${mine.map(e => `<li><time>${elClock(e.t - L.t0)}</time>${esc(e.text)}</li>`).join('')}</ul>` : ''}</div>`;
}
function elMeStudied(G, t){ const ev = G.me.ev, end = G.me.out ? Math.min(t, G.me.out.t) : G.result && G.result.t ? Math.min(t, G.result.t) : t; let n = 0; for (let k = 0; k < ev.length; k++){ if (ev[k][1] !== 'S') continue; const y = Math.min(k + 1 < ev.length ? ev[k + 1][0] : end, end); if (y > ev[k][0]) n += y - ev[k][0]; } return n; }
let elKeep = null;
function elRenderGame(Gx){
  const box = $('#elBody'); if (!box || $('#page-elim').hidden) return;
  const G = Gx || EL.G; if (!G) return elRender();
  const inp = $('#elIn'), val = inp ? inp.value : '', foc = document.activeElement === inp, cl = $('#elChatList'), atEnd = !cl || cl.scrollTop + cl.clientHeight >= cl.scrollHeight - 20;
  box.innerHTML = elGameHtml(G, Date.now());
  const i2 = $('#elIn'); if (i2){ i2.value = val; if (foc) i2.focus(); }
  const c2 = $('#elChatList'); if (c2 && atEnd) c2.scrollTop = c2.scrollHeight;
}
// the card on the Ranked page
function elCardRender(){
  const box = $('#elCard'); if (!box) return;
  const G = EL.G;
  let status = '';
  if (G && !G.done){ const S = G.L.t0 ? elState(G, Date.now()) : null; status = `<p class="el-live">● ${S ? `In a game · round ${S.r + 1} · ${S.alive} of ${G.L.players.length} left` : 'In a lobby, waiting to start'}</p><button class="small-btn accent" data-el="back">Back to your game →</button>`; }
  box.innerHTML = `<div class="card"><div class="h first">Elimination</div><p class="hint">Study against a whole lobby. Break allowances shrink every round; last one studying wins.</p>${status || `<div class="el-quick">${[4, 8, 16].map(n => `<button class="small-btn accent" data-el="quick" data-n="${n}">${n}</button>`).join('')}<button class="small-btn" data-el="go">Lobbies →</button></div>`}
    ${R.el ? `<p class="hint">${R.el.wins} win${R.el.wins === 1 ? '' : 's'} · ${R.el.top3} top-3 · ${R.el.played} played</p>` : ''}</div>`;
}

// running lobbies, for the Live now lists on Ranked and in the Feed
function elLiveHtml(){
  const now = Date.now(), live = EL.live.filter(L => L.t0 && L.t0 <= now && L.rules.spect !== false).map(L => ({L, S: elState({L, me: {ev: []}}, now)})).filter(x => !x.S.over).slice(0, 3);
  if (!live.length) return '';
  return `<div class="lf-sub lf-livehd"><i class="lf-dot" aria-hidden="true"></i>Elimination lobbies</div><ul class="el-list el-lf">${live.map(({L, S}) => `<li class="el-row"><div class="el-rn"><b>${esc(L.name)}</b><small>Round ${S.r + 1} · ${S.alive} of ${L.players.length} left${S.sd ? ' · sudden death' : ''}</small></div><button class="small-btn" data-el="watch" data-id="${L.id}">Watch</button></li>`).join('')}</ul>`;
}

// is this player in an Elimination game right now (yours, or one running)? 'study', 'break' or null
function elPresence(w){
  const now = Date.now(), games = [EL.G && EL.G.L, ...(EL.live || []), EL.watch && EL.watch.L].filter(L => L && L.t0 && now >= L.t0 && L.players.includes(w));
  for (const L of games){ const p = elBotPlan(L, w); if (p.out <= now) continue; return p.br.some(([s, e]) => now >= s && now < e) ? 'break' : 'study'; }
  return null;
}
{ const _b = botLiveNow; botLiveNow = function(i){ return elPresence(i) === 'study' || _b.apply(this, arguments); }; }

/* ---- taps ---- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-el]'); if (!b) return;
  const k = b.dataset.el;
  if (k === 'quick') elQueue(+b.dataset.n);
  else if (k === 'go'){ EL.view = EL.G ? 'game' : 'browse'; showPage('elim'); elRender(); }
  else if (k === 'back'){ EL.view = 'game'; showPage('elim'); elRender(); }
  else if (k === 'browse'){ EL.view = 'browse'; EL.watch = null; elRender(); }
  else if (k === 'create'){ EL.view = 'create'; showPage('elim'); elRender(); }
  else if (k === 'filt'){ EL.filt = b.dataset.f; elRender(); }
  else if (k === 'join'){ const L = EL.list.find(l => l.id === b.dataset.id); if (L) elJoin(L); }
  else if (k === 'watch'){ const L = EL.live.find(l => l.id === b.dataset.id); if (L){ EL.watch = {L, me: {ev: []}, chat: [], q: []}; EL.view = 'watch'; showPage('elim'); elRender(); } }
  else if (k === 'make'){ elFormRead(); const f = EL.form; let at = 0; if (f.start === 'time' && f.at){ const [h, m] = f.at.split(':').map(Number), d = new Date(); d.setHours(h, m, 0, 0); if (d < Date.now()) d.setDate(d.getDate() + 1); at = d.getTime(); }
    elCreate({...f, at}); }
  else if (k === 'leave') elLeave();
  else if (k === 'close'){ EL.G = null; EL.view = 'browse'; saveEl(); elRender(); }
  else if (k === 'tab'){ EL.tab = b.dataset.t; saveEl(); elRender(); }
  else if (k === 'unfollow'){ EL.follow = null; elRender(); }
  else if (k === 'brk'){ if (S.running) pause(); else start(); setTimeout(elTick, 50); }
  else if (k === 'stop'){ if (confirm('Stop studying? You’ll be knocked out of the lobby.')){ const G = EL.G; G.me.out = {t: Date.now(), why: 'stopped'}; elFinishMe(G); try { if (P.mode === 'stopwatch') finishStopwatch(); else reset(); } catch(err){} elTick(); } }
  else if (k === 'share'){ const r = EL.G && EL.G.result; if (!r) return; const cap = r.place === 1 ? `won a ${r.N}-player elimination lobby 🏆` : `${elOrd(r.place)} of ${r.N} in elimination today`;
    try { showPage('feed'); FDV.composer = {...fdNewComposer(), mode: 'text', cap}; FDV.tab = 'for'; renderFeed(); window.scrollTo(0, 0); toast('Your post is ready: edit it and press Post.'); } catch(err){ toast('Couldn’t open the Feed.'); } }
});
// tap a player in a running game to follow them
document.addEventListener('click', e => {
  const t = e.target.closest('#elBody [data-tile]'); if (!t || e.target.closest('[data-bot], button')) return;
  const w = +t.dataset.tile; EL.follow = EL.follow === w ? null : w; elRender();
});
document.addEventListener('change', e => {
  if (EL.view !== 'create' || !e.target.closest('.el-form')) return;
  elFormRead(); if (['elfPre', 'elfPriv', 'elfStart', 'elfRound'].includes(e.target.id) || e.target.dataset.inv != null) elRenderCreate();
});
document.addEventListener('input', e => { if (e.target.id === 'elfSize'){ const v = $('#elfSzV'); if (v) v.textContent = e.target.value; } });
document.addEventListener('submit', e => { if (e.target.id !== 'elForm') return; e.preventDefault(); const i = $('#elIn'); elSend(i.value); i.value = ''; });
// ending your session (resetting or finishing the timer) during a game knocks you out
{
  const outNow = why => { const G = EL.G; if (elInternal || !G || G.done || G.me.out || !G.L.t0 || Date.now() < G.L.t0) return; G.me.out = {t: Date.now(), why}; elFinishMe(G); setTimeout(elTick, 50); };
  const _f = finishStopwatch; finishStopwatch = function(){ outNow('stopped'); return _f.apply(this, arguments); };
  const _r = reset; reset = function(){ outNow('stopped'); return _r.apply(this, arguments); };
}
{ const _s = onPageShown; onPageShown = function(name){ const x = _s.apply(this, arguments); if (name === 'elim'){ elListTick(); elRender(); } if (name === 'ranked') elCardRender(); return x; }; }
setInterval(() => { try { elListTick(); elTick(); } catch(e){ console.error(e); } }, 1000);
setTimeout(() => { try { elCardRender(); } catch(e){} }, 3000);
