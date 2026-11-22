/* ---------- downloading a replay ----------
   Replay buttons "download" the replay first, like CS or Valorant: a bar with a game-style size. For other players'
   matches and lobbies the download is real work: Gemini writes what they said in chat, and every message lands in one
   of that player's breaks (nobody types while studying). How much they talk varies a lot from match to match, by who's
   playing, how close it was and how many breaks there were; some replays have no chat at all (and use no request).
   Once downloaded, a replay's chat is kept, so it opens straight away next time.
   Also here: finished lobbies that ran without you are kept (the newest 300), so every player's profile can list the
   Elimination games they played, each with a replay. */
const rpSz = key => { const h = fdHash(key + ':sz'); return 2.6 + (h % 5200) / 1000; };       // a believable size in MB, the same every time
let RPDL = store.get('fb.rpdl', {});            // replays already downloaded: key → 1
const rpChatLoad = key => IDB.get('rpc:' + key).catch(() => null);
const rpChatSave = (key, v) => IDB.set('rpc:' + key, v).catch(console.error);
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
  const finish = () => { if (run !== rpDlRun) return; el.hidden = true; RPDL[key] = 1; store.set('fb.rpdl', RPDL); rpOpen(key, chat); };
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
async function rpWriteChat(key, d){
  if (!GEM.key || GEM.wait > Date.now()) return null;
  const tr = rpTracks(d), br = rpBreaks(tr), ws = tr.map(p => p.w).filter(w => w >= 0), nb = ws.reduce((n, w) => n + br[w].length, 0);
  if (!nb) return [];
  // how much they talk: who's playing, how close it was, and a bit of luck (some matches are silent, some are busy)
  const z = d.start, el = d.kind === 'el', talk = ws.reduce((s, w) => s + rpTalky(w), 0) / ws.length;
  const close = !el && Math.abs(d.totA - d.totC) / Math.max(d.totA, d.totC, 1) < .1, rival = !el && fdHash(key + ':riv') % 100 < 15;
  const r = fdHash(key + ':amt') % 100, mood = r < 25 ? .12 : r < 75 ? .55 : 1.3;
  const n = Math.min(el ? 50 : 25, Math.round(nb * mood * talk * (close ? 1.25 : 1) * (rival ? 1.3 : 1) * (el ? .8 : 1.1)));
  if (n < 1) return [];
  // something they might bring up: 60% nothing, 30% one thing, 10% two (only in long matches)
  const long = d.end - d.start > 90 * 60000, tq = fdHash(key + ':top') % 100, nTop = tq < 60 ? 0 : tq < 90 || !long ? 1 : 2;
  const tops = [...Array(nTop)].map(() => { const w = pick(Math.random, ws); return `${bot(w).name} might bring up: ${pickTopic(w)}`; });
  const roster = ws.map(w => { const f = chatFacts(w), tk = rpTalky(w); return `${f.name} (${f.subj.split(',')[0]}, ${f.r} Elo, emojis: ${emojiStyle(w)}, ${tk < .5 ? 'quiet, says little' : tk > 1.5 ? 'chatty' : 'talks a normal amount'}) · breaks: ${br[w].length ? br[w].map(([a, b]) => `${rpMs(a, z)}–${rpMs(b, z)}`).join(', ') : 'none (never talks)'}`; }).join('\n');
  const evs = rpEvents(d, tr).filter(e => !/chat|brk|back/.test(e.kind)).map(e => `${rpMs(e.t, z)} ${e.text}`).join('\n');
  const sys = `You write the chat from a finished match in Focus Bench, a study-timer app for college students (${el ? 'Elimination: a lobby studies together, breaks are limited each round, and going over the allowance or stopping knocks you out; the last one studying wins' : 'a ranked 1v1: whoever studies longer wins'}). Players can only type while they're on a break, never while studying.
Write it like real chat between college students on their breaks: short texts, casual, lowercase is fine. They talk about the match sometimes (the lead, someone going out, trash talk, "back to it"), but just as often about anything else: what they're eating, a show, a class, their day. Once a topic starts they stay on it across breaks instead of jumping around; a new topic only comes up when the old one has run out or something big happens in the match. Quiet players say very little; not everyone has to talk.
${EMO_RULE} Keep it friendly and appropriate. Never mention AI.
${typeof TALK_RULES === 'string' ? TALK_RULES : ''}`;
  const user = `Players (with their breaks, as time from the start):
${roster}

What happened:
${evs}

Write about ${n} messages, in time order. Each: "from" (a player's name exactly as listed), "at" (the time from the start, like 27:40 or 1:05:12, inside one of that player's breaks), "text".${tops.length ? `\nIf it fits (it doesn't have to):\n${tops.join('\n')}` : ''}`;
  let got;
  try { got = await aiCall(sys, user, {at: {type: 'STRING'}}); }
  catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); if (e.msg) GEM.detail = e.msg; saveAI(); return null; }
  const names = {}; ws.forEach(w => { names[bot(w).name.toLowerCase()] = w; });
  const out = [];
  (Array.isArray(got) ? got : []).forEach(x => {
    const w = names[String(x && x.from || '').toLowerCase().trim()]; if (w == null || !br[w].length) return;
    const text = emotionOnly(stripSegue(String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 200))); if (!text) return;
    let t = rpParse(x.at, z); if (t == null) t = br[w][Math.floor(Math.random() * br[w].length)][0] + 20000;
    // into one of their breaks: the one it's in, or the nearest
    let best = null, bd = Infinity;
    br[w].forEach(([a, b]) => { const dd = t < a ? a - t : t > b ? t - b : 0; if (dd < bd){ bd = dd; best = [a, b]; } });
    const a = best[0] + 4000, b = Math.max(a, best[1] - 4000); t = Math.min(b, Math.max(a, t));
    out.push({t: Math.round(t), w, text});
  });
  out.sort((p, q) => p.t - q.t);
  for (let k = 1; k < out.length; k++) if (out[k].t <= out[k - 1].t) out[k].t = out[k - 1].t + 1500;       // one after another
  return out;
}

/* ---- finished lobbies without you: kept so their players' profiles can list them, with replays ---- */
let ELX = store.get('fb.elx', []);                // [{id, t0, end, N, name, ps: [[player, place]]}], newest first
const elxLoad = id => IDB.get('elx:' + id).then(v => v ? {kind: 'el', G: {L: v.L, me: {ev: [], out: null}, chat: [], result: null}} : null).catch(() => null);
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
  const row = (place, N, name, t, dur, key, d) => `<li class="hr-${place === 1 ? 'W' : 'L'}"><span class="res">${place || '–'}</span><span class="rkg-n">${N}p</span><span class="who"><b>${place ? `${elOrd(place)} of ${N}` : `${N} players`}</b><small>${esc(name)} · lasted ${elClock(dur || 0)}</small></span><span class="tm"></span><span class="dl ${d > 0 ? 'pos' : d < 0 ? 'neg' : 'fr'}">${d ? `${d > 0 ? '+' : ''}${d}` : 'Casual'}</span><span class="when">${winLabel(t)}<button class="rp-v" data-rp="${key}">Replay</button></span></li>`;
  let rows;
  if (w === ME) rows = (EL.hist || []).slice(0, 20).map(h => row(h.place, h.N, h.name || 'Lobby', h.t, h.dur, 'el:' + h.id, h.rated ? h.delta : 0));
  else rows = ELX.filter(x => x.ps.some(([p]) => p === w)).slice(0, 15).map(x => row(x.ps.find(([p]) => p === w)[1], x.N, x.name, x.t0, x.end - x.t0, 'elx:' + x.id, 0));
  return rows.length ? `<ul class="rk-hist pf-matches pf-elim">${rows.join('')}</ul>` : `<p class="hint">${w === ME ? 'No Elimination games yet. Join one from Ranked.' : 'No Elimination games yet.'}</p>`;
}
