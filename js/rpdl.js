/* ---------- downloading a replay ----------
   Replay buttons "download" the replay first, like CS or Valorant: a bar with a game-style size. For other players'
   matches and lobbies the download is real work: Gemini writes what they said in chat, and every message lands in one
   of that player's breaks (nobody types while studying). How much they talk varies a lot from match to match, by who's
   playing, how close it was and how many breaks there were; some replays have no chat at all (and use no request).
   Once downloaded, a replay's chat is kept, so it opens straight away next time.
   Also here: finished lobbies that ran without you are kept (the newest 300), so every player's profile can list the
   Elimination games they played, each with a replay. */
const rpSz = key => { const h = fdHash(key + ':sz'); return 2.6 + (h % 5200) / 1000; };       // a believable size in MB, the same every time
let RPDL = store.get('fb.rpdl2', {});            // replays already downloaded: key → 1
const rpChatLoad = key => IDB.get('rpc2:' + key).catch(() => null);
const rpChatSave = (key, v) => IDB.set('rpc2:' + key, v).catch(console.error);
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
  const finish = () => { if (run !== rpDlRun) return; el.hidden = true; RPDL[key] = 1; store.set('fb.rpdl2', RPDL); rpOpen(key, chat); };
  requestAnimationFrame(tick);
  try {
    const need = key.startsWith('rk:m5:') || key.startsWith('elx:');
    if (need){ const d = await rpBuild(key); if (d){ chat = await rpWriteChat(key, d); if (chat) rpChatSave(key, {chat, at: Date.now()}); } }
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
async function rpWriteChat(key, d){
  if (!GEM.key || GEM.wait > Date.now()) return null;
  const tr = rpTracks(d), br = rpBreaks(tr), ws = tr.map(p => p.w).filter(w => w >= 0), nb = ws.reduce((n, w) => n + br[w].length, 0);
  if (!nb) return [];
  // how much they talk: who's playing, how close it was, and a bit of luck (some matches are silent, some are busy)
  const z = d.start, el = d.kind === 'el', talk = ws.reduce((s, w) => s + rpTalky(w), 0) / ws.length;
  const close = !el && Math.abs(d.totA - d.totC) / Math.max(d.totA, d.totC, 1) < .1, rival = !el && fdHash(key + ':riv') % 100 < 15;
  const r = fdHash(key + ':amt') % 100, mood = r < 25 ? .12 : r < 75 ? .55 : 1.3;
  const n = Math.min(el ? 40 : 20, Math.round(nb * mood * talk * (close ? 1.25 : 1) * (rival ? 1.3 : 1) * (el ? .7 : 1)));
  if (n < 1) return [];
  // something they might bring up: 60% nothing, 30% one thing, 10% two (only in long matches)
  const long = d.end - d.start > 90 * 60000, tq = fdHash(key + ':top') % 100, nTop = tq < 60 ? 0 : tq < 90 || !long ? 1 : 2;
  const tops = [...Array(nTop)].map(() => { const w = pick(Math.random, ws); return `${bot(w).name} might bring up: ${pickTopic(w)}`; });
  const roster = ws.map(w => { const f = chatFacts(w), tk = rpTalky(w); return `${f.name} (${f.subj.split(',')[0]}, ${f.r} Elo, emojis: ${emojiStyle(w)}, ${tk < .5 ? 'quiet, says little' : tk > 1.5 ? 'chatty' : 'talks a normal amount'}${br[w].length ? '' : ', never took a break so never types'})`; }).join('\n');
  const W = rpWindows(d, tr, br, z).slice(0, 70);
  const wins = W.map(x => `${rpMs(x.a, z)}–${rpMs(x.b, z)} · on a break: ${x.on.map(w => bot(w).name).join(', ')}${x.on.length > 1 ? ' (together, so they can talk back and forth)' : x.rest.length ? ' (alone: the others are studying and only see it later)' : ' (alone: nobody else is still playing)'}${x.gone.length && x.gone.length < 6 ? ` · already finished: ${x.gone.map(w => bot(w).name).join(', ')}` : ''} · ${x.st}`).join('\n');
  const evs = rpEvents(d, tr).filter(e => /^(ko|win|sd|round|stop)$/.test(e.kind)).map(e => `${rpMs(e.t, z)} ${e.text}`).join('\n');
  const sys = `You write the chat log from a finished ${el ? 'Elimination game (a lobby studies together, breaks are limited each round, going over the allowance or stopping knocks you out, last one studying wins)' : 'ranked 1v1 (whoever studies longer wins)'} in Focus Bench, a study-timer app for college students. Players can only type while they're on a break, never while studying.
It has to read like a real chat log from start to finish:
- The first message is an opener that makes sense with nothing before it. It never sounds like a reply.
- Every message follows from what was actually said before it in this log. Nobody answers a question nobody asked or reacts to something that wasn't said.
- Nobody writes to someone who has already finished, and someone who is the only one left playing has nobody to talk to (at most a short note).
- Someone alone on a break is writing to people who are studying: they say one or two things and that's it. Anyone who answers does it on their own next break, minutes later, and answers what was said.
- Real back-and-forth only happens when two people are on a break at the same time.
- Keep to one or two threads for the whole match, followed across breaks. Don't hop between topics. It can be about the match or about anything else (food, a class, a show, their day).
- Match talk has to fit how things stood at that moment (it's listed with each break). Nobody congratulates themselves. Leads change because the other person is on a break, so nobody brags about taking the lead.
- No sign-offs or filler like "back to it", "back to the grind", "gl", "ok", "anyway". Silence is fine; quiet people may say nothing at all.
- Short, casual texts, lowercase is fine.
${EMO_RULE} Keep it friendly and appropriate. Never mention AI.`;
  const user = `Players:
${roster}

When people were on breaks (time from the start · who · how it stood):
${wins}
${evs ? `\nOther things that happened:\n${evs}\n` : ''}
Write up to ${n} messages (fewer is fine), in time order. Each: "from" (a player's name exactly as listed), "at" (time from the start, like 27:40 or 1:05:12, inside a break of that player), "text".${tops.length ? `\nIf it fits (it doesn't have to):\n${tops.join('\n')}` : ''}`;
  let got;
  try { got = await aiCall(sys, user, {at: {type: 'STRING'}}); }
  catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); if (e.msg) GEM.detail = e.msg; saveAI(); return null; }
  const names = {}; ws.forEach(w => { names[bot(w).name.toLowerCase()] = w; });
  const out = [];
  (Array.isArray(got) ? got : []).forEach(x => {
    const w = names[String(x && x.from || '').toLowerCase().trim()]; if (w == null || !br[w].length) return;
    const text = emotionOnly(stripSegue(String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 200))); if (!text) return;
    if (/^\W*(ok(ay)?|alr(ight)?|aight|anyway|welp|ight)?[\s,.]*(back to (it|the grind|grinding|work|studying|the books)|time to lock (back )?in|gl|good luck|ok)\W*$/i.test(text)) return;     // filler
    let t = rpParse(x.at, z); if (t == null) return;
    // into one of their breaks: the one it's in, or the nearest
    let best = null, bd = Infinity;
    br[w].forEach(([a, b]) => { const dd = t < a ? a - t : t > b ? t - b : 0; if (dd < bd){ bd = dd; best = [a, b]; } });
    if (bd > 10 * 60000) return;
    const a = best[0] + 6000, b = Math.max(a, best[1] - 4000); t = Math.min(b, Math.max(a, t));
    out.push({t: Math.round(t), w, text, b: best[1]});
  });
  out.sort((p, q) => p.t - q.t);
  // typing takes time: space messages out, and drop one that no longer fits in its break
  const res = [];
  out.forEach(m => { const prev = res[res.length - 1]; if (prev){ const gap = (prev.w === m.w ? 5000 : 12000) + Math.min(20000, m.text.length * 250); if (m.t < prev.t + gap) m.t = prev.t + gap; } if (m.t <= m.b) res.push({t: m.t, w: m.w, text: m.text}); });
  return res;
}

/* ---- finished lobbies without you: kept so their players' profiles can list them, with replays ---- */
let ELX = store.get('fb.elx', []);                // [{id, t0, end, N, name, ps: [[player, place]]}], newest first
const elxG = L => ({kind: 'el', G: {L, me: {ev: [], out: null}, chat: [], result: null}});
const elxLoad = id => id[0] === 'X' ? Promise.resolve(elxGen(id)).then(L => L && elxG(L)) : IDB.get('elx:' + id).then(v => v ? elxG(v.L) : null).catch(() => null);
/* Every player's own past games: worked out from their id and the day, the same on every device, so profiles have
   Elimination history going back three weeks without anything being saved. Id: X<player in base 36>_<day number>. */
const ELX_SIZES = [4, 4, 8, 8, 8, 16, 5, 6, 10, 12];
const elxPlays = (w, day) => { const rate = [0, 8, 18, 30, 45][fdHash(w + ':elrate') % 5]; return fdHash(w + ':eld:' + day) % 100 < rate; };
const ELX_GEN = new Map();
function elxGen(id){
  if (ELX_GEN.has(id)) return ELX_GEN.get(id);
  const m = /^X([0-9a-z]+)_(\d+)$/.exec(id); if (!m) return null;
  const w = parseInt(m[1], 36), day = +m[2]; if (!BOTS[w]) return null;
  const h = fdHash(id), rnd = mulberry32(h), N = ELX_SIZES[h % ELX_SIZES.length], ranked = [4, 8, 16].includes(N) && rnd() < .6;
  const t0 = day * 864e5 + (13 + Math.floor(rnd() * 12)) * 36e5 + Math.floor(rnd() * 60) * 60000;      // 8am–8pm Eastern
  const players = elPickPlayers(id, botRating(w), 300, N, '').filter(x => x !== w).slice(0, N - 1);
  players.splice(Math.floor(rnd() * N), 0, w);
  const rules = {size: N, round: 25, preset: 'standard', custom: [10, 5, 2.5, 1, 0], rated: ranked, ranked, range: 300, privacy: 'public', subject: '', name: '', start: 'full', at: 0, chat: 'break', spect: true};
  const L = {id, rules, created: t0 - 5 * 60000, center: botRating(w), host: players[0], players, joinAt: players.map(() => t0 - 60000), t0, name: ranked ? `Ranked · ${N} players` : lobbyName(players[0], BOTS[players[0]].subject, rnd)};
  ELX_GEN.set(id, L); return L;
}
// a player's Elimination games over the last three weeks that have finished, newest first
function elxOf(w){
  const today = Math.floor(Date.now() / 864e5), now = Date.now(), out = [];
  for (let day = today; day > today - 21; day--){
    if (!elxPlays(w, day)) continue;
    const L = elxGen('X' + w.toString(36) + '_' + day), outs = L.players.map(p => [p, elBotPlan(L, p).out]);
    if (L.t0 > now || Math.max(...outs.map(x => x[1])) > now) continue;
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
    ELX.unshift({id: L.id, t0: L.t0, end: sorted.length > 1 ? sorted[sorted.length - 2] : sorted[0], N: L.players.length, name: L.name || 'Lobby', ps}); have.add(L.id); ch = true;
  });
  if (ch){ ELX.sort((a, b) => b.t0 - a.t0); const gone = ELX.splice(300); gone.forEach(x => IDB.del('elx:' + x.id).catch(() => {})); store.set('fb.elx', ELX); }
}
setInterval(elxKeep, 30000); setTimeout(elxKeep, 8000);

/* ---- Elimination games on profiles (separate from ranked matches) ---- */
function profileElim(w){
  const row = (place, N, name, t, dur, key, d, lab) => `<li class="hr-${place === 1 ? 'W' : 'L'}"><span class="res">${place || '–'}</span><span class="rkg-n">${N}p</span><span class="who"><b>${place ? `${elOrd(place)} of ${N}` : `${N} players`}</b><small>${esc(name)} · lasted ${elClock(dur || 0)}</small></span><span class="tm"></span><span class="dl ${d > 0 ? 'pos' : d < 0 ? 'neg' : 'fr'}">${d ? `${d > 0 ? '+' : ''}${d}` : lab || 'Casual'}</span><span class="when">${winLabel(t)}<button class="rp-v" data-rp="${key}">Replay</button></span></li>`;
  let rows;
  if (w === ME) rows = (EL.hist || []).slice(0, 20).map(h => row(h.place, h.N, h.name || 'Lobby', h.t, h.dur, 'el:' + h.id, h.rated ? h.delta : 0));
  else {
    const kept = ELX.filter(x => x.ps.some(([p]) => p === w)).map(x => ({id: x.id, t0: x.t0, end: x.end, N: x.N, name: x.name, place: x.ps.find(([p]) => p === w)[1], ranked: false}));
    rows = kept.concat(elxOf(w)).sort((a, b) => b.t0 - a.t0).slice(0, 15).map(x => row(x.place, x.N, x.name, x.t0, x.end - x.t0, 'elx:' + x.id, 0, x.ranked ? 'Ranked' : 'Casual'));
  }
  return rows.length ? `<ul class="rk-hist pf-matches pf-elim">${rows.join('')}</ul>` : `<p class="hint">${w === ME ? 'No Elimination games yet. Join one from Ranked.' : 'No Elimination games yet.'}</p>`;
}
