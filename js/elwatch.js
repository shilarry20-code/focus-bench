/* ---------- watching a group match: two chats ----------
   Lobby chat: the players themselves, typing on their breaks (knockouts, the round, anything). Viewers only read it.
   Viewers: everyone watching, like a stream chat. People who are online drift in and out, react to knockouts and
   sudden death, and answer you when you say something. Both use Gemini when it's set up, with a few stock lines
   otherwise; neither runs while you're focusing (the room waits for your break). */
const EW_LINES = {
  out: ['NOOO', 'gg', 'there it goes 💀', 'called it', 'oof', 'rip', 'one less'],
  sd: ['sudden death lets gooo', 'no more breaks 😬', 'this is where it gets good', 'who blinks first'],
  hi: ['yo', 'hey 👋', 'sup', 'hii'],
  lobby: ['taking my break now', 'brb water', 'stretch break', 'ok snack time', 'eyes need a rest', 'refilling coffee ☕']};
let ewBusy = false;
const ewNow = () => Date.now();
function ewInit(G){
  if (G.ew) return G.ew;
  const now = ewNow(), S = elState(G, now);
  G.chat = G.chat || []; G.q = G.q || [];
  G.ew = {v: [], vq: [], cast: [], calls: 0, seenOut: S.ps.filter(p => p.out).map(p => p.w), sd: S.sd, nextV: now + 25000 + Math.random() * 30000, nextL: now + 15000 + Math.random() * 30000, opened: false};
  return G.ew;
}
// who's watching: some players who are online right now, never the people in the match
function ewRoom(G){
  const E = G.ew, on = typeof chatWhoOnline === 'function' ? chatWhoOnline() : [], inGame = new Set(G.L.players);
  E.cast = E.cast.filter(w => on.includes(w) && !inGame.has(w));
  const pool = on.filter(w => !inGame.has(w) && !E.cast.includes(w));
  while (E.cast.length < 7 && pool.length) E.cast.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  // players who are out stick around to watch the rest
  const S = elState(G, ewNow()), outs = S.ps.filter(p => p.out && p.w >= 0).map(p => p.w).slice(-3);
  return E.cast.concat(outs);
}
function ewViewers(G){
  const S = elState(G, ewNow()), avg = G.L.players.reduce((x, w) => x + elR(w), 0) / G.L.players.length, r = S.r;
  return Math.round((20 + G.L.players.length * 9 + Math.max(0, avg - 900) / 6) * (1 + Math.min(r, 6) * .25) * (S.sd ? 1.6 : 1) * (.9 + .1 * Math.sin(ewNow() / 60000 + G.L.players[0] % 7)));
}
function ewStand(G){
  const S = elState(G, ewNow());
  return S.ps.filter(p => !p.out).map(p => `${bot(p.w).name} (${p.st === 'break' ? 'on a break' : 'studying'})`).join(', ');
}
async function ewViewSay(G, kind, extra){
  const E = ewInit(G); if (ewBusy) return;
  const S = elState(G, ewNow()), me = myName(), room = ewRoom(G); if (!room.length) return;
  const task = {open: 'Write 3 to 4 short messages from 2 or 3 different viewers about the match right now.',
    ambient: `Write 2 or 3 short messages from 1 to 3 viewers: ${Math.random() < .5 ? `someone brings up ${pickTopic(null, {school: .3})} and others chime in` : 'react to the match or chat a bit'}.`,
    out: `${extra} just got knocked out. Write 2 or 3 short reactions from different viewers (${extra} may comment too if they're listed).`,
    sd: 'Sudden death just started: no breaks allowed, the next one to stop is out. Write 2 or 3 short hype reactions.',
    reply: `${me} just said something. Write 1 or 2 short messages from 1 or 2 viewers answering ${me}.`}[kind];
  let out = [];
  if (GEM.key && !(GEM.wait > Date.now()) && E.calls < 30){
    ewBusy = true; E.calls++;
    try {
      const cast = room.map(w => { const f = chatFacts(w); return `- ${f.name}: ${f.rank}, ${f.subj}, emojis: ${emojiStyle(w)}${G.L.players.includes(w) ? ' (was in this match and got knocked out, now watching)' : ''}`; });
      const sys = `You write chat messages from viewers watching a live group match on Focus Bench, a study-timer app for college students. Everyone in the match studies at the same time; each round allows a little break time, going over it or stopping knocks you out, and the last one studying wins.
The viewers aren't in the match. They react like a stream chat: hype, picking favorites, predictions, jokes, surprise at knockouts, and they also just chat with each other.
Write like quick live-stream chat: short, casual, lowercase is fine, slang is fine. Never formal. No "speaking of…" style bridges. Don't start a message with the name of the person it answers.
${EMO_RULE}
${me} is the user, also watching.
${typeof TALK_RULES === 'string' ? TALK_RULES : ''}`;
      const user = `The match: ${G.L.name}, ${G.L.players.length} players, ${elRated(G.L.rules) ? 'ranked' : 'casual'}. Round ${S.r + 1}, ${S.alive} still in${S.sd ? ', sudden death' : ''}.
Still in: ${ewStand(G)}.
About ${ewViewers(G).toLocaleString()} people watching.
Viewers who can talk:
${cast.join('\n')}

Viewer chat so far (already sent; never send any of it again):
${E.v.slice(-14).map(x => `${x.w === -1 ? me : bot(x.w).name}: ${x.text}`).join('\n') || '(nothing yet)'}

${task}`;
      const got = await aiCall(sys, user), names = new Map(room.map(w => [bot(w).name.toLowerCase(), w]));
      (Array.isArray(got) ? got : []).forEach(x => {
        const w = names.get(String(x && x.from || '').toLowerCase().trim()); if (w == null) return;
        const text = emotionOnly(stripSegue(stripLeadName(String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 200), [me])));
        if (text && !out.some(o => o.text === text)) out.push({w, text});
      });
    } catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); if (e.msg) GEM.detail = e.msg; }
    finally { ewBusy = false; }
  }
  if (!out.length && kind !== 'ambient' && kind !== 'reply'){
    const lines = EW_LINES[kind === 'open' ? 'hi' : kind].slice(), n = 1 + Math.floor(Math.random() * 2);
    for (let k = 0; k < n && lines.length; k++) out.push({w: room[Math.floor(Math.random() * room.length)], text: lines.splice(Math.floor(Math.random() * lines.length), 1)[0]});
  }
  let t = Math.max(ewNow() + (kind === 'reply' ? 1500 : 800), ...E.vq.map(x => x.t + 2000));
  out.slice(0, 5).forEach(o => { t += (1.5 + o.text.length * .05 + Math.random() * 3) * 1000; E.vq.push({t: Math.round(t), w: o.w, text: o.text}); });
}
// the players: whoever's on a break may say something
function ewLobby(G, kind, w){
  if (G.L.rules.chat === 'off') return;
  const S = elState(G, ewNow()), onBreak = S.ps.filter(p => p.w >= 0 && p.st === 'break').map(p => p.w);
  const talk = G.L.rules.chat === 'on' ? S.ps.filter(p => p.w >= 0 && !p.out).map(p => p.w) : onBreak;
  if (!talk.length) return false;
  if (GEM.key && !(GEM.wait > Date.now()) && !elChatBusy && (G.ew.lcalls || 0) < 25){
    G.ew.lcalls = (G.ew.lcalls || 0) + 1;
    elChatAI(kind === 'out' ? `${bot(w).name} just got knocked out.` : kind === 'sd' ? 'Sudden death just started: no more breaks.' : G.chat.length ? 'Keep the conversation going (answer what was said, or say something new' + (typeof pickTopic === 'function' && Math.random() < .5 ? `; if it's a new topic, ${pickTopic(talk[Math.floor(Math.random() * talk.length)])}` : '') + ').' : 'Someone starts chatting on their break' + (typeof pickTopic === 'function' ? `: ${pickTopic(talk[Math.floor(Math.random() * talk.length)])}` : '') + '.', talk, G);
    return true;
  }
  if (Math.random() < .5){ const who = talk[Math.floor(Math.random() * talk.length)], lines = kind === 'out' ? EL_LINES.out : kind === 'sd' ? EL_LINES.sd : EW_LINES.lobby; elQ(who, lines[Math.floor(Math.random() * lines.length)], 0, G); }
  return true;
}
// what the players said before you started watching: written once, the same way replays get their chat
async function ewBackfill(G){
  if (G.chat.length || typeof rpWriteChat !== 'function' || !GEM.key) return;
  const now = ewNow(); if (now - G.L.t0 < 5 * 60000) return;
  try {
    const got = await rpWriteChat('elw:' + G.L.id, {kind: 'el', G: {L: G.L, me: {ev: [], out: null}, chat: [], result: null}, start: G.L.t0, end: now - 60000});
    if (got && got.length && EL.watch === G){ G.chat = got.filter(m => m.t < now).concat(G.chat).sort((a, b) => a.t - b.t); elRenderGame(G); }
  } catch(e){ console.error(e); }
}
function ewTick(){
  if (!RK_READY || EL.view !== 'watch' || !EL.watch || $('#page-elim').hidden) return;
  const G = EL.watch, E = ewInit(G), now = ewNow(), S = elState(G, now); let ch = false;
  if (S.over) return;
  const away = focusing();
  if (!away){
    if (!E.opened){ E.opened = true; ewViewSay(G, 'open'); ewBackfill(G); }
    // someone just went on a break: often they say something (and whoever else is on a break may answer)
    const st = E.st || (E.st = {}); S.ps.forEach(p => { if (p.w < 0) return; if (p.st === 'break' && st[p.w] && st[p.w] !== 'break' && Math.random() < .55) setTimeout(() => ewLobby(G, 'chat'), 4000 + Math.random() * 15000); st[p.w] = p.st; });
    // knockouts and sudden death: both chats react
    S.ps.filter(p => p.out && p.w >= 0 && !E.seenOut.includes(p.w)).forEach(p => { E.seenOut.push(p.w); ewViewSay(G, 'out', bot(p.w).name); setTimeout(() => ewLobby(G, 'out', p.w), 1500 + Math.random() * 4000); });
    if (S.sd && !E.sd){ E.sd = true; ewViewSay(G, 'sd'); ewLobby(G, 'sd'); }
    if (now >= E.nextV){ E.nextV = now + 50000 + Math.random() * 70000; ewViewSay(G, 'ambient'); }
    if (now >= E.nextL){ E.nextL = ewLobby(G, 'chat') ? now + 90000 + Math.random() * 120000 : now + 15000; }      // nobody on a break: check again soon
  }
  // deliver what's waiting, one at a time
  if (E.vq.length && E.vq[0].t <= now){ const x = E.vq.shift(); E.v.push({t: now, w: x.w, text: x.text}); E.v = E.v.slice(-120); ch = true; }
  if (G.q.length && G.q[0].t <= now && now - (G.lastMsg || 0) > 2200){ const x = G.q.shift(); G.chat.push({t: now, w: x.w, text: x.text}); G.lastMsg = now; ch = true; }
  if (ch) elRenderGame(G);
}
setInterval(() => { try { ewTick(); } catch(e){ console.error(e); } }, 1000);

function elViewHtml(G, now){
  const E = ewInit(G);
  return `<div class="card el-chat el-vchat"><div class="h first">Viewers <small>· ${ewViewers(G).toLocaleString()} watching</small></div><div class="el-cl" id="elVList">${E.v.map(m => `<p><b>${m.w === -1 ? esc(myName()) : esc(bot(m.w).name)}</b> ${atLinks(esc(m.text))}</p>`).join('') || '<p class="hint">Say something to the other viewers.</p>'}</div>
    <form class="el-send" id="elVForm"><input id="elVIn" maxlength="200" autocomplete="off" placeholder="Chat with viewers…"><button class="small-btn accent">Send</button></form></div>`;
}
document.addEventListener('submit', e => {
  if (e.target.id !== 'elVForm') return; e.preventDefault();
  const i = $('#elVIn'), text = i.value.trim(); if (!text || !EL.watch) return; i.value = '';
  const G = EL.watch, E = ewInit(G); E.v.push({t: ewNow(), w: -1, text: text.slice(0, 200)}); elRenderGame(G);
  setTimeout(() => ewViewSay(G, 'reply'), 1800);
});

// names and Profile buttons in group match views (watching, your game, replays) open that player's profile
document.addEventListener('click', e => {
  const b = e.target.closest('#elBody [data-bot], #rpModal [data-bot]'); if (!b || e.defaultPrevented) return;
  e.preventDefault(); const w = +b.dataset.bot; if (!(w >= 0)) return;
  if (b.closest('#rpModal') && typeof rpClose === 'function') rpClose();
  openProfile(w);
});
