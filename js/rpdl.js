/* ---------- downloading a replay ----------
   Replay buttons "download" the replay first, like CS or Valorant: a bar with a game-style size. For other players'
   matches and lobbies the download is real work: Gemini writes what they said in chat, and every message lands in one
   of that player's breaks (nobody types while studying). How much they talk varies a lot from match to match, by who's
   playing, how close it was and how many breaks there were; some replays have no chat at all (and use no request).
   Once downloaded, a replay's chat is kept, so it opens straight away next time.
   Also here: finished lobbies that ran without you are kept (the newest 300), so every player's profile can list the
   Elimination games they played, each with a replay. */
const rpSz = key => { const h = fdHash(key + ':sz'); return 2.6 + (h % 5200) / 1000; };       // a believable size in MB, the same every time
let RPDL = store.get('fb.rpdl4', {});            // replays already downloaded: key → 1
const rpChatLoad = key => IDB.get('rpc4:' + key).catch(() => null);
const rpChatSave = (key, v) => IDB.set('rpc4:' + key, v).catch(console.error);
let rpDlRun = 0;
async function rpDownload(key){
  if (RPDL[key]){ const c = await rpChatLoad(key); return rpOpen(key, c && c.chat); }
  const run = ++rpDlRun, mb = rpSz(key), t0 = performance.now();
  let el = $('#rpDl'); if (!el){ el = document.createElement('div'); el.className = 'modal'; el.id = 'rpDl'; document.body.appendChild(el); }
  el.innerHTML = `<div class="modal-card rp-dl" role="dialog" aria-modal="true" aria-label="Downloading replay"><div class="rp-dlh"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg><b>Downloading replay</b></div>
    <div class="rp-dlbar"><i id="rpDlFill"></i></div><div class="rp-dln"><span id="rpDlPct">0%</span><span id="rpDlMb">0.0 / ${mb.toFixed(1)} MB</span></div><button class="small-btn" data-rpdl="cancel">Cancel</button></div>`;
  el.hidden = false;
  let done = false, p = 0, chat = null;
  const show = v => { const f = $('#rpDlFill'); if (!f) return; f.style.width = (v * 100).toFixed(1) + '%'; $('#rpDlPct').textContent = Math.floor(v * 100) + '%'; $('#rpDlMb').textContent = `${(mb * v).toFixed(1)} / ${mb.toFixed(1)} MB`; };
  // the bar creeps toward 90% while the work goes on, then finishes
  const tick = () => { if (run !== rpDlRun) return; const s = (performance.now() - t0) / 1000; p = done ? Math.min(1, p + .045) : Math.min(.9, .9 * (1 - Math.exp(-s / 2.2)) + Math.random() * .004); show(p); if (p >= 1) return finish(); requestAnimationFrame(tick); };
  const finish = () => { if (run !== rpDlRun) return; el.hidden = true; if (chat !== null) RPDL[key] = 1; store.set('fb.rpdl4', RPDL); rpOpen(key, chat); };
  requestAnimationFrame(tick);
  try {
    const need = key.startsWith('rk:m5:') || key.startsWith('elx:');
    if (need){ const d = await rpBuild(key); if (d){ chat = await rpWriteChat(key, d); if (chat && chat.length) rpChatSave(key, {chat, at: Date.now()}); else if (chat === null) console.warn('replay chat not written', GEM.detail || ''); } }
  } catch(e){ console.error(e); }
  const wait = Math.max(0, 1400 - (performance.now() - t0));          // even an instant one takes a moment
  setTimeout(() => { done = true; }, wait);
}
document.addEventListener('click', e => { if (e.target.closest('[data-rpdl="cancel"]')){ rpDlRun++; $('#rpDl').hidden = true; } });

/* ---- writing the chat ---- */
// each player's breaks: [start, end] where they were on a break for at least a minute
function rpBreaks(tr){ const out = {}; tr.forEach(p => { const b = []; for (let k = 0; k < p.ev.length - 1; k++) if (p.ev[k][1] === 'B' && p.ev[k + 1][0] - p.ev[k][0] >= 60000) b.push([p.ev[k][0], p.ev[k + 1][0]]); out[p.w] = b; }); return out; }
// how chatty a player is (the same for them every time): quiet, normal or chatty
const rpTalky = w => { const h = fdHash(w + ':talk') % 100; return h < 30 ? .25 : h < 80 ? 1 : 2; };
const rpMs = (t, z) => { const s = Math.max(0, Math.round((t - z) / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? `${h}:${String(m).padStart(2, '0')}` : m) + ':' + String(x).padStart(2, '0'); };
const rpParse = (s, z) => { const a = String(s || '').trim().split(':').map(Number); if (a.some(isNaN) || a.length < 2) return null; const sec = a.length === 3 ? a[0] * 3600 + a[1] * 60 + a[2] : a[0] * 60 + a[1]; return z + sec * 1000; };
// the stretches of the match when somebody was on a break, with who was on one and how things stood
function rpWindows(d, tr, br, z){
  const pts = new Set(); Object.values(br).forEach(l => l.forEach(([a, b]) => { pts.add(a); pts.add(b); }));
  const T = [...pts].sort((a, b) => a - b), out = [], el = d.kind === 'el';
  for (let k = 0; k < T.length - 1; k++){
    const a = T[k], b = T[k + 1], on = tr.filter(p => p.w >= 0 && br[p.w].some(([x, y]) => x <= a && y >= b)).map(p => p.w);
    if (!on.length || b - a < 15000) continue;
    const prev = out[out.length - 1];
    if (prev && prev.b === a && prev.on.join() === on.join() && !tr.some(p => p.w >= 0 && p.ev[p.ev.length - 1][0] > prev.a && p.ev[p.ev.length - 1][0] <= a)){ prev.b = b; continue; }
    let st;
    if (el){ const left = tr.filter(p => !p.out || p.out > a).length; st = `${left} of ${tr.length} still in`; }
    else { const s = tr.map(p => [p.w, rpStud(p.ev, a)]).sort((x, y) => y[1] - x[1]); st = s[0][1] - s[1][1] < 60000 ? `about even (${Math.round(s[0][1] / 60000)}m each)` : `${bot(s[0][0]).name} ahead, ${Math.round(s[0][1] / 60000)}m to ${Math.round(s[1][1] / 60000)}m`; }
    const gone = tr.filter(p => p.w >= 0 && !on.includes(p.w) && p.ev[p.ev.length - 1][0] <= a).map(p => p.w), rest = tr.filter(p => p.w >= 0 && !on.includes(p.w) && !gone.includes(p.w));
    out.push({a, b, on, st, gone, rest});
  }
  return out;
}
/* The shape of the chat is planned here, not by Gemini: who talks in which break, and whether each text starts the
   chat, answers something they hadn't seen yet, or adds to what they just said. Gemini only writes the words for each
   numbered slot, so a first message can't sound like a reply and nobody answers a message they couldn't have read. */
function rpPlan(key, W, n){
  const rnd = mulberry32(fdHash(key + ':plan')), wins = [];
  W.forEach((x, i) => { const tog = x.on.length > 1; wins.push({i, k: tog ? 2 + Math.floor(rnd() * 4) : rnd() < .65 ? 1 : 2}); });
  let tot = wins.reduce((s, x) => s + x.k, 0);
  while (tot > n && wins.length){ const j = Math.floor(rnd() * wins.length); tot -= wins[j].k; wins.splice(j, 1); }
  const slots = [], last = {};          // last: when each player last texted
  wins.forEach(({i, k}) => {
    const x = W[i]; let t = x.a + 12000 + Math.floor(rnd() * 25000);
    // who talks: alone, it's them; together, two (or three in a big lobby), starting with whoever has something to answer
    let who = x.on.slice(); if (who.length > 1){ who.sort(() => rnd() - .5); who = who.slice(0, x.on.length > 3 && rnd() < .4 ? 3 : 2); who.sort((p, q) => slots.filter(m => m.w !== p && m.t > (last[p] || 0)).length > slots.filter(m => m.w !== q && m.t > (last[q] || 0)).length ? -1 : 1); }
    for (let c = 0; c < k; c++){
      if (t > x.b - 5000) break;
      const w = who.length > 1 ? who[c % who.length] : who[0];
      const unread = slots.filter(m => m.w !== w && m.t > (last[w] || 0) && m.t < t), prev = slots[slots.length - 1];
      // nobody keeps texting into silence: two unanswered texts in a row (in earlier breaks) is enough
      const tail = []; for (let j = slots.length - 1; j >= 0 && slots[j].w === w; j--) tail.push(slots[j]);
      if (!unread.length && tail.length >= 2 && tail[0].x !== x) break;
      let role;
      if (!slots.length) role = 'starts the chat (nothing has been said before this)';
      else if (unread.length) role = `answers #${unread[unread.length - 1].n}${unread.length > 1 ? ` (has just read #${unread[0].n}–#${unread[unread.length - 1].n})` : ''}`;
      else if (prev && prev.w === w) role = prev.x === x ? `adds a second text right after their own #${prev.n}` : `texts again on a later break, #${prev.n} still hasn't been answered (follow up on it or ask something else, without complaining)`;
      else role = 'says something new (keep the same thread going)';
      const m = {n: slots.length + 1, t, w, role, x}; slots.push(m); last[w] = t;
      t += 14000 + Math.floor(rnd() * 22000);
    }
  });
  return slots;
}
async function rpWriteChat(key, d){
  if (!GEM.key || GEM.wait > Date.now()) return null;
  const tr = rpTracks(d), br = rpBreaks(tr), ws = tr.map(p => p.w).filter(w => w >= 0), nb = ws.reduce((n, w) => n + br[w].length, 0);
  if (!nb) return [];
  // how much they talk: who's playing, how close it was, and a bit of luck (some matches are silent, some are busy)
  const z = d.start, el = d.kind === 'el', talk = ws.reduce((s, w) => s + rpTalky(w), 0) / ws.length;
  const close = !el && Math.abs(d.totA - d.totC) / Math.max(d.totA, d.totC, 1) < .1, rival = !el && fdHash(key + ':riv') % 100 < 15;
  const r = fdHash(key + ':amt') % 100, mood = r < 20 ? .3 : r < 70 ? 1.2 : 2.4;
  const n = Math.min(el ? 40 : 20, Math.round(nb * mood * talk * (close ? 1.25 : 1) * (rival ? 1.3 : 1) * (el ? .7 : 1)));
  if (n < 1) return [];
  const slots = rpPlan(key, rpWindows(d, tr, br, z), n); if (!slots.length) return [];
  // something they might bring up: 60% nothing, 30% one thing, 10% two (only in long matches)
  const long = d.end - d.start > 90 * 60000, tq = fdHash(key + ':top') % 100, nTop = tq < 60 ? 0 : tq < 90 || !long ? 1 : 2;
  const tops = [...Array(nTop)].map(() => { const w = pick(Math.random, ws); return `${bot(w).name} might bring up: ${pickTopic(w)}`; });
  const roster = ws.filter(w => slots.some(m => m.w === w)).map(w => { const f = chatFacts(w); return `${f.name} (${f.subj.split(',')[0]}, ${f.r} Elo, emojis: ${emojiStyle(w)})`; }).join('\n');
  const script = slots.map(m => `#${m.n} ${rpMs(m.t, z)} ${bot(m.w).name} · ${m.x.on.length > 1 ? `on a break with ${m.x.on.filter(q => q !== m.w).map(q => bot(q).name).slice(0, 4).join(', ')}` : m.x.rest.length ? (el ? 'alone on a break, the others are studying' : `alone on a break, ${bot(m.x.rest[0].w).name} is studying`) : 'alone on a break, nobody else is still playing'} · ${m.x.st} · ${m.role}`).join('\n');
  const evs = rpEvents(d, tr).filter(e => /^(ko|win|sd|stop)$/.test(e.kind) && e.t < slots[slots.length - 1].t).map(e => `${rpMs(e.t, z)} ${e.text}`).join('\n');
  const sys = `You write the chat log from a finished ${el ? 'Elimination game (a lobby studies together, breaks are limited each round, going over the allowance or stopping knocks you out, last one studying wins)' : 'ranked 1v1 (whoever studies longer wins)'} in Focus Bench, a study-timer app for college students. Everyone studies in their own place (not the same room) and players can only type while they're on a break, never while studying, so a text sent while the other person studies is only read on their next break, maybe half an hour later.
${el ? '' : 'It is just the two of them: every text is to the one other player, so never "anyone", "everyone", "you guys", "y\'all" or "anyone else".\n'}You get a numbered list of slots. Who sends each one, when, and what it does (starts the chat, answers a certain number, adds to their own text) is already decided: write the words for every slot and follow its role exactly.
It must read as one real conversation from top to bottom: an answer actually answers the message it points to, nobody mentions things nobody said, and it sticks to one or two topics instead of jumping around. It can be about the match (only what's true at that moment, which is listed with each slot) or about anything else: a class, food, a show, their day. Someone who answers half an hour later knows time has passed. Nobody congratulates themselves.
No filler or sign-offs: never "back to it", "back to the grind", "gotta grind", "gl", "gg", "good luck", and nobody wishes the other luck, says goodbye or says they're heading out, since the match is still going. Short, casual texts, lowercase is fine.
${EMO_RULE} Keep it friendly and appropriate. Never mention AI.`;
  const user = `Players:
${roster}
${evs ? `\nWhat happened in the match before the last slot:\n${evs}\n` : ''}
Slots:
${script}

Return one item per slot, in order: "n" (the slot number), "from" (the sender's name exactly as listed), "text".${tops.length ? `\nIf it fits the conversation (it doesn't have to):\n${tops.join('\n')}` : ''}`;
  let got;
  try { got = await aiCall(sys, user, {n: {type: 'INTEGER'}}); }
  catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); if (e.msg) GEM.detail = e.msg; saveAI(); return null; }
  const out = [], byN = new Map(); (Array.isArray(got) ? got : []).forEach((x, k) => { const nn = +(x && x.n) || k + 1; if (!byN.has(nn)) byN.set(nn, x); });
  slots.forEach(m => {
    const x = byN.get(m.n); if (!x) return;
    const text = emotionOnly(stripSegue(String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 200))); if (!text) return;
    if (/^\W*(ok(ay)?|alr(ight)?|aight|anyway|welp|ight)?[\s,.]*(back to (it|the grind|grinding|work|studying|the books)|gotta grind|time to lock (back )?in|gl|ggs?|good luck|ok)\W*$/i.test(text)) return;     // filler
    out.push({t: m.t, w: m.w, text});
  });
  return out;
}

/* ---- finished lobbies without you: kept so their players' profiles can list them, with replays ---- */
let ELX = store.get('fb.elx', []);                // [{id, t0, end, N, name, ps: [[player, place]]}], newest first
const elxG = L => ({kind: 'el', G: {L, me: {ev: [], out: null}, chat: [], result: null}});
const elxLoad = id => /^[XG]/.test(id) ? Promise.resolve(elxGen(id)).then(L => L && elxG(L)) : IDB.get('elx:' + id).then(v => v ? elxG(v.L) : null).catch(() => null);
/* Everyone's past group matches, worked out the same on every device and consistent between the players in them:
   each day has a few sessions; in each, the ladder is cut into groups of neighbours (the group size changes from
   session to session) and some of those groups played a match. So a match is the same match on every player's
   profile, with the same result, and its replay matches too. Id: G<day>_<session>_<group>. */
const ELX_SESS = 6, ELX_P = 7;           // sessions a day; % of groups that played in a session
const ELX_GEN = new Map();
const elxSize = (day, s) => [4, 4, 5, 6, 6, 7, 8, 8, 8, 9, 10, 11, 12, 13, 14, 15, 16, 16][fdHash('elxn:' + day + ':' + s) % 18];
// Groups are made inside rating bands (about 250 Elo wide): inside a band the players are scrambled with a keyed shuffle
// (idx -> a*idx + b mod M), so each game mixes everyone from the band instead of a few neighbours, and a different crowd every session
const ELX_BAND = 250, ELX_BG = 1e5;
let ELX_BANDS = null;
function elxBands(){
  const order = sortedBots();
  if (ELX_BANDS && ELX_BANDS.order === order) return ELX_BANDS;
  const starts = [0], of = new Int32Array(order.length);
  for (let k = 1, cur = Math.floor(botRating(order[0]) / ELX_BAND); k < order.length; k++){ const bk = Math.floor(botRating(order[k]) / ELX_BAND); if (bk !== cur){ starts.push(k); cur = bk; } of[k] = starts.length - 1; }
  starts.push(order.length);
  return ELX_BANDS = {order, starts, of};
}
const elxGcd = (x, y) => y ? elxGcd(y, x % y) : x;
function elxInv(a, m){ let [r0, r1, t0, t1] = [m, a % m, 0, 1]; while (r1){ const q = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [t0, t1] = [t1, t0 - q * t1]; } return ((t0 % m) + m) % m; }
function elxMix(day, s, bi, M){          // the shuffle for one band in one session
  const h = fdHash('elxm:' + day + ':' + s + ':' + bi); let a = 1 + (h % Math.max(1, M - 1)); while (M > 1 && elxGcd(a, M) !== 1) a++;
  return {a: M > 1 ? a % M || 1 : 1, b: fdHash('elxb:' + day + ':' + s + ':' + bi) % Math.max(1, M)};
}
function elxGroup(day, s, g){
  const id = 'G' + day + '_' + s + '_' + g;
  if (ELX_GEN.has(id)) return ELX_GEN.get(id);
  const N = elxSize(day, s), B = elxBands(), bi = Math.floor(g / ELX_BG), gi = g % ELX_BG, ppl = [];
  if (bi < B.starts.length - 1){
    const st = B.starts[bi], M = B.starts[bi + 1] - st, {a, b} = elxMix(day, s, bi, M), ia = elxInv(a, M);
    for (let k = gi * N; k < Math.min(M, gi * N + N); k++){ const idx = (((k - b) % M + M) % M) * ia % M; ppl.push(B.order[st + idx]); }
  }
  if (ppl.length < 3 || fdHash(id) % 100 >= ELX_P){ ELX_GEN.set(id, null); return null; }
  const rnd = mulberry32(fdHash(id + ':m')); for (let k = ppl.length - 1; k > 0; k--){ const j = Math.floor(rnd() * (k + 1)); [ppl[k], ppl[j]] = [ppl[j], ppl[k]]; }
  const n = ppl.length, ranked = [4, 8, 16].includes(n) && rnd() < .6;
  const t0 = day * 864e5 + (11 + s * 2.5 + rnd() * 2) * 36e5;           // sessions spread from morning to night (Eastern)
  const rules = {size: n, round: 25, preset: 'standard', custom: [10, 5, 2.5, 1, 0], rated: ranked, ranked, range: 300, privacy: 'public', subject: '', name: '', start: 'full', at: 0, chat: 'break', spect: true};
  const L = {id, rules, created: t0 - 5 * 60000, center: botRating(ppl[0]), host: ranked ? null : ppl[0], players: ppl, joinAt: ppl.map(() => t0 - 60000), t0: Math.round(t0), name: ranked ? `Ranked · ${n} players` : lobbyName(ppl[0], BOTS[ppl[0]].subject, rnd, t0)};
  ELX_GEN.set(id, L); return L;
}
function elxGen(id){
  const m = /^G(\d+)_(\d+)_(\d+)$/.exec(id); if (!m) return null;
  return elxGroup(+m[1], +m[2], +m[3]);
}
// a player's group matches over the last three weeks that have finished, newest first
function elxOf(w){
  const today = Math.floor(Date.now() / 864e5), now = Date.now(), out = [], pos = posOf(w);
  for (let day = today; day > today - 21; day--) for (let s = ELX_SESS - 1; s >= 0; s--){
    const N = elxSize(day, s), B = elxBands(), bi = B.of[pos], st = B.starts[bi], M = B.starts[bi + 1] - st, {a, b} = elxMix(day, s, bi, M), g = bi * ELX_BG + Math.floor(((a * (pos - st) + b) % M) / N);
    const L = elxGroup(day, s, g); if (!L || !L.players.includes(w) || L.t0 > now) continue;
    const outs = L.players.map(p => [p, elBotPlan(L, p).out]); if (Math.max(...outs.map(x => x[1])) > now) continue;
    const order = outs.slice().sort((a, b) => b[1] - a[1]), place = order.findIndex(x => x[0] === w) + 1, mine = outs.find(x => x[0] === w)[1];
    out.push({id: L.id, t0: L.t0, end: mine, N: L.players.length, name: L.name, place, ranked: L.rules.ranked});
  }
  return out;
}
function elxKeep(){
  if (typeof EL === 'undefined' || typeof RK_READY === 'undefined' || !RK_READY) return;
  const now = Date.now(), have = new Set(ELX.map(x => x.id)); let ch = false;
  (EL.live || []).forEach(L => {
    if (!L.t0 || have.has(L.id) || L.players.includes(-1)) return;
    const outs = L.players.map(w => [w, elBotPlan(L, w).out]); if (Math.max(...outs.map(x => x[1])) > now) return;       // still going
    const ps = outs.sort((a, b) => b[1] - a[1]).map(([w], k) => [w, k + 1]), sorted = outs.map(x => x[1]).sort((a, b) => a - b);
    IDB.set('elx:' + L.id, {L: JSON.parse(JSON.stringify(L))}).catch(console.error);
    ELX.unshift({id: L.id, t0: L.t0, end: sorted.length > 1 ? sorted[sorted.length - 2] : sorted[0], N: L.players.length, name: L.name || 'Lobby', ps, rk: !!(L.rules && L.rules.ranked)}); have.add(L.id); ch = true;
  });
  if (ch){ ELX.sort((a, b) => b.t0 - a.t0); const gone = ELX.splice(300); gone.forEach(x => IDB.del('elx:' + x.id).catch(() => {})); store.set('fb.elx', ELX); }
}
setInterval(elxKeep, 30000); setTimeout(elxKeep, 8000);

/* ---- Elimination games on profiles (separate from ranked matches) ---- */
function profileElim(w){
  const row = (place, N, name, t, dur, key, d, lab) => `<li class="hr-${place === 1 ? 'W' : 'L'}"><span class="res">${place || '–'}</span><span class="rkg-n">${N}p</span><span class="who"><b>${place ? `${elOrd(place)} of ${N}` : `${N} players`}</b><small>${esc(name)} · lasted ${elClock(dur || 0)}</small></span><span class="tm"></span><span class="dl ${d > 0 ? 'pos' : d < 0 ? 'neg' : 'fr'}">${d ? `${d > 0 ? '+' : ''}${d}` : lab || 'Casual'}</span><span class="when">${winLabel(t)}<button class="rp-v" data-rp="${key}">Replay</button></span></li>`;
  let rows;
  if (w === ME) rows = (EL.hist || []).slice(0, 5).map(h => row(h.place, h.N, h.name || 'Lobby', h.t, h.dur, 'el:' + h.id, h.rated ? h.delta || 0 : 0, h.rated ? 'Ranked' : 'Casual'));
  else {
    const kept = ELX.filter(x => x.ps.some(([p]) => p === w)).map(x => ({id: x.id, t0: x.t0, end: x.end, N: x.N, name: x.name, place: x.ps.find(([p]) => p === w)[1], ranked: !!x.rk}));
    rows = kept.concat(elxOf(w)).sort((a, b) => b.t0 - a.t0).slice(0, 5).map(x => row(x.place, x.N, x.name, x.t0, x.end - x.t0, 'elx:' + x.id, x.ranked ? Math.round(14 * (x.N + 1 - 2 * x.place) / (x.N - 1)) : 0, x.ranked ? 'Ranked' : 'Casual'));
  }
  return rows.length ? `<ul class="rk-hist pf-matches pf-elim">${rows.join('')}</ul>` : `<p class="hint">${w === ME ? 'No group matches yet. Quick match into 4, 8 or 16 players, or join one from Lobbies.' : 'No group matches yet.'}</p>`;
}
