/* ---------- group chats ----------
   You make a group with people you follow who follow you back (up to 25). It acts like a real group chat: whoever's
   around talks through the day (busier in the evening, quiet late at night), people answer each other, react, reply to
   specific messages and @ each other, and when you come back after a while, what was said meanwhile is there with its
   real times. When you post, the members who are online answer. Each Gemini request writes a chunk of conversation
   (bigger groups get bigger chunks), so a 25-person group uses about as many requests as a small one.
   Challenges can be posted in a group, by you or by members, and anyone can take them: an open 1v1 (ranked or
   friendly), or an Elimination lobby (4, 8 or 16) that members join and, if you're in, other players near your rating
   fill. Matches members play among themselves get their result posted in the chat. */
const GC_KEEP = 600, GC_MAX = 25;
let GC = store.get('fb.groups', null) || {g: {}, msgs: [], q: [], read: {}, use: {}};
['g', 'read', 'use'].forEach(k => { if (!GC[k]) GC[k] = {}; }); ['msgs', 'q'].forEach(k => { if (!GC[k]) GC[k] = []; });
function saveGc(){
  const by = {}; GC.msgs.forEach(m => { (by[m.g] = by[m.g] || []).push(m); });
  if (Object.values(by).some(l => l.length > GC_KEEP)) GC.msgs = Object.values(by).flatMap(l => l.slice(-GC_KEEP)).sort((a, b) => a.t - b.t);
  const {_x, ...rest} = GC; store.set('fb.groups', rest);
}
const gcList = () => Object.values(GC.g).filter(g => !g.left);
const gcMsgs = g => GC.msgs.filter(m => m.g === g.id && !m.del && m.t > (g.hide || 0));
const gcMutuals = () => (typeof FD === 'undefined' ? [] : FD.follows.filter(w => FD.followers.includes(w)));
const gcUnread = g => g.left ? 0 : gcMsgs(g).filter(m => m.w !== -1 && !m.sys && m.t > (GC.read[g.id] || 0)).length;
const gcUnreadAll = () => gcList().filter(g => !g.mute && !(DC.key === 'g:' + g.id && chatPageOpen())).reduce((n, g) => n + gcUnread(g), 0);
const gcName = g => g.name || (g.m.slice(0, 3).map(w => bot(w).name).join(', ') + (g.m.length > 3 ? ` and ${g.m.length - 3} more` : ''));
function gcUse(){ const d = ptDay(); if (GC.use.day !== d) GC.use = {day: d, n: 0}; GC.use.n++; }

/* ---- who's around: studying, online (they're active somewhere, or it's a time they're usually on), or offline ---- */
const GC_HOUR = [.25, .18, .1, .06, .04, .04, .06, .12, .2, .25, .28, .3, .32, .3, .3, .32, .34, .36, .42, .47, .5, .5, .45, .35];
function gcAround(w){
  const slot = Math.floor(Date.now() / 1200000), h = new Date().getHours(), B = bot(w);
  const late = /night/i.test(B.peak || ''), early = /morning/i.test(B.peak || '');
  const p = GC_HOUR[late ? (h + 22) % 24 : early ? (h + 2) % 24 : h] * (late || early ? 1.15 : 1);
  return (fdHash(w + ':' + slot) % 1000) / 1000 < p;
}
const gcState = w => dmStudying(w) ? 'study' : (dmOnline(w) || gcAround(w)) ? 'on' : 'off';
const gcOnline = g => g.m.filter(w => gcState(w) !== 'off');

/* ---- making and changing groups ---- */
function gcCreate(ms, name){
  const id = 'G' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const g = {id, name: (name || '').trim().slice(0, 40), m: [...new Set(ms)].slice(0, GC_MAX), by: -1, t: Date.now(), next: Date.now() + (40 + Math.random() * 120) * 1000};
  GC.g[id] = g; gcSys(g, `${myName()} made the group`); GC.read[id] = Date.now(); saveGc();
  return g;
}
function gcSys(g, text, extra = {}){ GC.msgs.push({id: chatId() + 's', g: g.id, w: -2, t: Date.now(), sys: 1, text, ...extra}); }
function gcRename(g, name){ g.name = name.trim().slice(0, 40); gcSys(g, `${myName()} named the group “${g.name || gcName(g)}”`); saveGc(); }
function gcAdd(g, ws){ ws = ws.filter(w => !g.m.includes(w)).slice(0, GC_MAX - g.m.length); if (!ws.length) return; g.m.push(...ws); gcSys(g, `${myName()} added ${ws.map(w => bot(w).name).join(', ')}`); saveGc(); }
function gcRemove(g, w){ g.m = g.m.filter(x => x !== w); gcSys(g, `${myName()} removed ${bot(w).name}`); saveGc(); }
function gcLeave(g){ g.left = Date.now(); GC.q = GC.q.filter(q => q.g !== g.id); saveGc(); }

/* ---- Gemini writes the group's messages ---- */
const GC_REF = {};
function gcPrompt(g, task){
  const me = myName(), H = gcMsgs(g).filter(m => (m.text || m.ch) && !m.sys).slice(-30); GC_REF[g.id] = H.map(m => m.id);
  const nm = w => w === -1 ? me : bot(w).name;
  const sys = `You write messages in a group chat on Focus Bench, a study-timer app for college students (in ranked matches whoever studies longer wins and gains Elo; Elimination is a last-one-studying-wins lobby). The group is called "${gcName(g)}". ${me} is the person using the app; never write messages from ${me}.
Write it like a real group chat between college students: short texts, people talking over each other, answering each other, running jokes, teasing, @-mentioning someone, side conversations, someone changing the subject. Each member keeps their own personality and way of texting. Most of it isn't about studying. When they bring up shows, movies, music, games or sports, they name real ones. Not everyone talks every time; quieter members chime in less.
${EMO_RULE} Keep it friendly and appropriate: no explicit content, no slurs or harassment. Never mention AI.
${typeof TALK_RULES === 'string' ? TALK_RULES : ''}`;
  const roster = g.m.map(w => { const f = chatFacts(w), st = gcState(w); return `${f.name} (${f.subj.split(',')[0]}, ${f.rank}, emojis: ${emojiStyle(w)}, ${st === 'study' ? 'studying right now' : st === 'on' ? 'online' : 'offline'})`; }).join('\n');
  const hist = H.map((m, k) => `[${k + 1}] ${m.ch ? `(${nm(m.w)} posted ${gcChTxt(m)})` : `${nm(m.w)}${m.re ? ` (replying to [${H.findIndex(x => x.id === m.re) + 1 || '?'}])` : ''}: ${m.text}`}`).join('\n') || '(nothing yet)';
  const user = `Members:\n${roster}\n${me} (${myRk().full}, ${R.mmr} Elo) is in the group too.
It's ${new Date().toLocaleDateString(undefined, {weekday: 'long'})} ${new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}.

Chat so far, oldest first (numbered):
${hist}

${task}
Each item: "from" (a member's name exactly as listed), "text". Optional: "replyTo" (the number of a message it answers; leave it out almost always: real people only use reply to point back at an older message when the chat has moved on and it would be unclear otherwise; never for the message right before, never for their own message), "react" (an emoji reaction) with "reactTo" (the number of the message it reacts to); an item can be just a reaction with empty text.`;
  return {sys, user};
}
async function gcWrite(g, task){
  if (!GEM.key || GEM.wait > Date.now()) return null;
  try {
    const {sys, user} = gcPrompt(g, task); gcUse();
    return await aiCall(sys, user, {react: {type: 'STRING'}, reactTo: {type: 'STRING'}});
  } catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); if (e.msg) GEM.detail = e.msg; saveAI(); return null; }
}
// put Gemini's messages in the queue: from time t0, spread over `span` ms (a chunk of chat) or at texting speed;
// `past`: they were sent while you were away, so they land now with their own times
function gcQueue(g, got, t0, span, past){
  const names = {}; g.m.forEach(w => { names[bot(w).name.toLowerCase()] = w; });
  const ref = GC_REF[g.id] || [], items = (Array.isArray(got) ? got : []).filter(x => x && names[String(x.from || '').toLowerCase().trim()] != null);
  let t = t0; const step = span ? span / Math.max(1, items.length) : 0;
  let reLeft = Math.max(1, Math.round(items.length / 5));          // at most about 1 reply in 5 messages
  items.forEach((x, k) => {
    const w = names[String(x.from).toLowerCase().trim()], text = emotionOnly(stripSegue(String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 300)));
    const n = s => { const v = parseInt(String(s || '').replace(/\D/g, ''), 10); return v && ref[v - 1] ? ref[v - 1] : null; };
    t += span ? step * (.4 + Math.random() * 1.2) : (2 + Math.random() * 7 + text.length * .05) * 1000;
    const rx = dcOneEmoji(x.react), rTo = n(x.reactTo);
    if (rx && rTo) GC.q.push({id: chatId() + 'x' + k, g: g.id, w, t: past ? Date.now() + 800 * k : Math.round(t - 1500), ...(past ? {at: Math.round(t - 1500)} : {}), rx: {id: rTo, e: rx}});
    let re = n(x.replyTo); const tgt = re && GC.msgs.find(y => y.id === re);
    if (re && (!tgt || tgt.w === w || reLeft <= 0)) re = null; if (re) reLeft--;
    if (text) GC.q.push({id: chatId() + 'g' + k, g: g.id, w, t: past ? Date.now() + 600 + 700 * k : Math.round(t), ...(past ? {at: Math.round(t)} : {}), text, ...(re ? {re} : {})});
  });
  GC.q.sort((a, b) => a.t - b.t); saveGc();
  return items.length;
}

/* ---- how often a group talks on its own ---- */
function gcGap(g){
  const n = g.m.length, h = new Date().getHours(), night = h >= 2 && h < 8 ? 3.2 : h < 2 || h >= 23 ? 1.5 : 1;
  const [lo, hi] = n <= 5 ? [30, 60] : n <= 12 ? [28, 50] : [25, 40];
  return (lo + Math.random() * (hi - lo)) * 60000 * night;
}
const gcChunk = (g, on) => { const n = g.m.length, cap = n <= 5 ? 10 : n <= 12 ? 18 : 30; return clampN(Math.round(on * 1.3 + 2 + Math.random() * 5), 4, cap); };
async function gcAmbient(g){
  const on = gcOnline(g); if (on.length < 2){ g.next = Date.now() + (8 + Math.random() * 12) * 60000; saveGc(); return; }
  g.busy = 1;
  const n = gcChunk(g, on.length), mins = Math.round(6 + Math.random() * 14), starter = pick(Math.random, on);
  const recent = gcMsgs(g).filter(m => m.text).slice(-1)[0], fresh = recent && Date.now() - recent.t < 40 * 60000;
  const idea = Math.random() < .5 && fresh ? 'Pick up where the chat left off (answer what was said last, or a running joke).' : `Someone starts something new; a starting point for ${bot(starter).name}: ${pickTopic(starter)}. Take it wherever feels natural.`;
  const got = await gcWrite(g, `Write the next ${n} messages in the group, over about ${mins} minutes, from members who are online or studying (mostly online ones; offline members don't talk). ${idea} If ${myName()} said something recently that nobody answered, someone answers it.`);
  g.busy = 0; g.next = Date.now() + gcGap(g);
  if (got) gcQueue(g, got, Date.now() + 2000, mins * 60000);
  if (got && Math.random() < .08) gcBotChallenge(g);
  saveGc();
}
// you post: whoever's online answers (offline members see it later)
const gcReplyT = {};
function gcSend(g, text, re){
  GC.msgs.push({id: chatId(), g: g.id, w: -1, t: Date.now(), text, ...(re ? {re} : {})}); GC.read[g.id] = Date.now();
  saveGc(); dcRefresh();
  clearTimeout(gcReplyT[g.id]);
  gcReplyT[g.id] = setTimeout(async () => {
    const on = gcOnline(g); if (!on.length || g.busy){ g.next = Math.min(g.next || Infinity, Date.now() + 10 * 60000); saveGc(); return; }
    g.busy = 1; GC.q = GC.q.filter(q => q.g !== g.id || q.rx || q.t > Date.now() + 120000);    // they react to you instead of carrying on
    const k = Math.min(on.length, 1 + Math.floor(Math.random() * Math.min(5, on.length)));
    const got = await gcWrite(g, `${myName()} just posted. Write what happens next: about ${k} of the members who are online answer (or just react), maybe each other too, 2 to ${Math.max(3, k * 2)} items in all. Offline members don't answer.`);
    g.busy = 0; if (got) gcQueue(g, got, Date.now() + (3 + Math.random() * 10) * 1000, 0);
    g.next = Date.now() + gcGap(g); saveGc();
  }, 3500);
}
// back after a while: what the group said meanwhile, with its real times
let gcAwayFrom = store.get('fb.lastSeen', Date.now()), gcAwayBusy = false;
async function gcAway(){
  const now = Date.now(), from = gcAwayFrom, away = now - from; gcAwayFrom = now;
  if (gcAwayBusy || !GEM.key || !RK_READY || away < 50 * 60000) return;
  gcAwayBusy = true;
  try {
    for (const g of gcList()){
      if (g.busy) continue;
      const chunks = away / gcGap(g); if (chunks < .7) continue;
      const n = clampN(Math.round(chunks * gcChunk(g, Math.max(2, Math.round(g.m.length * .35))) * .7), 4, 30);
      const a = new Date(from + 5 * 60000), b = new Date(now - 3 * 60000), tf = d => d.toLocaleString([], {weekday: 'short', hour: 'numeric', minute: '2-digit'});
      g.busy = 1;
      const got = await gcWrite(g, `${myName()} was away from ${tf(a)} to ${tf(b)}. Write the ${n} messages the group sent in that time (several separate conversations if it was a long while; nobody talks in the middle of the night). Don't mention ${myName()} being away.`);
      g.busy = 0;
      // spread over the waking hours of that stretch
      if (got){ const span = Math.max(60000, b - a); gcQueue(g, got, +a, span, true); }
      g.next = now + gcGap(g); saveGc();
    }
  } catch(e){ console.error(e); } finally { gcAwayBusy = false; }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) gcAwayFrom = Date.now(); else setTimeout(gcAway, 6000); });

/* ---- challenges in a group ---- */
function gcChTxt(m){ const c = m.ch; return c.k === 'el' ? `an Elimination lobby for ${c.size} (${c.st === 'p' ? 'open' : c.st === 'a' ? 'started' : 'closed'})` : `an open ${c.mode === 'f' ? 'friendly' : 'ranked'} 1v1 challenge${c.taker != null ? `, taken by ${c.taker === -1 ? myName() : bot(c.taker).name}` : ''}`; }
function gcPostCh(g, k, mode, size){
  if (k === '1v1'){ GC.msgs.push({id: chatId() + 'c', g: g.id, w: -1, t: Date.now(), ch: {k, mode, exp: Date.now() + CH_MINE, st: 'p'}}); saveGc(); dcRefresh(); return; }
  if (!elCanJoin()) return;
  // members who'll join (online ones are likely to), first in line for the lobby; players near your rating fill the rest
  const inv = g.m.filter(w => Math.random() < (gcState(w) === 'on' ? .6 : gcState(w) === 'study' ? .25 : .08)).sort(() => Math.random() - .5).slice(0, size - 1);
  elCreate({size, round: 25, preset: 'standard', custom: [10, 5, 2.5, 1, 0], rated: false, range: 600, privacy: 'invite', subject: '', name: `${gcName(g)} · Elimination`, start: 'full', at: 0, chat: 'break', spect: true, inv});
  if (EL.G) GC.msgs.push({id: chatId() + 'c', g: g.id, w: -1, t: Date.now(), ch: {k: 'el', size, st: 'a', lid: EL.G.L.id, me: 1}});
  saveGc();
}
function gcBotChallenge(g){
  const on = gcOnline(g).filter(w => gcState(w) === 'on'); if (!on.length) return;
  const w = pick(Math.random, on), el = Math.random() < .45, now = Date.now();
  if (el){ const size = Math.random() < .55 ? 4 : Math.random() < .75 ? 8 : 16, exp = now + (8 + Math.random() * 10) * 60000;
    const joined = g.m.filter(x => x !== w && Math.random() < (gcState(x) === 'on' ? .45 : .06)).map(x => [x, Math.round(now + Math.random() * (exp - now))]);
    GC.q.push({id: chatId() + 'c', g: g.id, w, t: now + 4000, ch: {k: 'el', size, exp, st: 'p', joined}}); }
  else GC.q.push({id: chatId() + 'c', g: g.id, w, t: now + 4000, ch: {k: '1v1', mode: Math.random() < .65 ? 'r' : 'f', exp: now + CH_THEIRS + Math.random() * 6e5, st: 'p'}});
  GC.q.sort((a, b) => a.t - b.t); saveGc();
}
// you take a challenge someone posted
function gcTake(m){
  const g = GC.g[m.g], c = m.ch; if (!g || c.st !== 'p' || focusing()) return;
  if (c.k === '1v1'){
    if (!R.on || matchBusy()){ toast(!R.on ? 'Turn on Ranked to play challenges.' : 'Finish your current match first.'); return; }
    c.st = 'a'; c.taker = -1; c.at = Date.now(); gcSys(g, `${myName()} took ${bot(m.w).name}'s challenge`); saveGc(); chPlay(m.w, c.mode); return;
  }
  if (!elCanJoin()) return;
  const now = Date.now(), L = elNewLobby({size: c.size, preset: 'standard', round: 25, center: R.mmr, range: 600});
  L.host = m.w; L.name = `${bot(m.w).name}'s lobby`;
  L.pool = [...new Set([m.w, ...c.joined.filter(([, t]) => t <= now).map(([w]) => w), ...c.joined.map(([w]) => w), ...elPickPlayers(L.id, L.center, 600, c.size + 4, '')])];
  c.st = 'a'; c.me = 1; c.lid = L.id; saveGc(); elJoin(L);
}
// challenges going on in the group without you: someone takes a 1v1, Elimination lobbies start, results come in
function gcChTick(now){
  GC.msgs.forEach(m => {
    const c = m.ch; if (!c) return; const g = GC.g[m.g]; if (!g || g.left) return;
    if (c.k === '1v1' && c.st === 'p'){
      if (now >= c.exp){ c.st = 'x'; return; }
      if (Math.random() < 1 / 45){                    // every 45 s or so, someone online might take it
        const cand = g.m.filter(w => w !== m.w && gcState(w) === 'on'); if (!cand.length) return;
        const w = pick(Math.random, cand);
        if (m.w === -1){ if (Math.random() < chAcceptP(w, c.mode) * .5 && R.on && !matchBusy() && !focusing()){ c.st = 'a'; c.taker = w; c.at = now; gcSys(g, `${bot(w).name} took the challenge`); chPlay(w, c.mode, chatPageOpen()); } }
        else if (Math.random() < .3){ c.st = 'a'; c.taker = w; c.at = now; c.done = now + (25 + Math.random() * 35) * 60000; gcSys(g, `${bot(w).name} took ${bot(m.w).name}'s challenge`); }
      }
    }
    if (c.k === '1v1' && c.st === 'a' && c.done && now >= c.done && !c.res){
      const a = m.w, b = c.taker, pa = 1 / (1 + Math.pow(10, (botRating(b) - botRating(a)) / 400)), aw = Math.random() < pa, by = Math.round(3 + Math.random() * 30);
      c.res = aw ? a : b; gcSys(g, `${bot(c.res).name} beat ${bot(aw ? b : a).name} by ${by} min${c.mode === 'f' ? ' (friendly)' : ''}`);
    }
    if (c.k === 'el' && c.st === 'p' && now >= c.exp){
      const ps = [m.w, ...c.joined.map(([w]) => w)];
      if (ps.length < 3){ c.st = 'x'; gcSys(g, `${bot(m.w).name}'s Elimination lobby didn't fill`); }
      else { c.st = 'a'; c.done = now + (50 + Math.random() * 90) * 60000; c.n = Math.min(c.size, ps.length + Math.floor(Math.random() * (c.size - ps.length + 1))); }
    }
    if (c.k === 'el' && c.st === 'a' && c.done && !c.me && now >= c.done && !c.res){
      const ps = [m.w, ...c.joined.map(([w]) => w)], wts = ps.map(w => Math.pow(10, botRating(w) / 800)), tot = wts.reduce((x, y) => x + y, 0);
      let u = Math.random() * tot, i = 0; while (i < ps.length - 1 && (u -= wts[i]) > 0) i++;
      c.res = ps[i]; gcSys(g, `${bot(c.res).name} won ${bot(m.w).name}'s Elimination (${c.n || ps.length} players)`);
    }
  });
}

/* ---- the clock ---- */
let gcLastTick = 0;
function gcTick(){
  if (typeof RK_READY === 'undefined' || !RK_READY) return;
  const now = Date.now(); let fresh = [], changed = false;
  while (GC.q.length && GC.q[0].t <= now){
    const q = GC.q.shift(), g = GC.g[q.g]; changed = true; if (!g || g.left) continue;
    // someone who's gone offline since this was written doesn't send it (messages from while you were away keep their old time and are fine)
    if (!q.at && q.w >= 0 && gcState(q.w) === 'off') continue;
    if (q.rx){ const m = GC.msgs.find(x => x.id === q.rx.id); if (m) dcReact(m, q.w, q.rx.e, true); continue; }
    const prevM = gcMsgs(g).filter(x => !x.sys).pop(), re = q.re && !(prevM && prevM.id === q.re) ? q.re : null;      // answering the message right above needs no reply line
    const m = {id: q.id, g: q.g, w: q.w, t: q.at && q.at < now ? q.at : now, ...(q.text ? {text: q.text} : {}), ...(re ? {re} : {}), ...(q.ch ? {ch: q.ch} : {})};
    GC.msgs.push(m); fresh.push(m);
  }
  if (now - gcLastTick > 1000){ gcLastTick = now; const before = JSON.stringify(GC.msgs.filter(m => m.ch).map(m => m.ch)); gcChTick(now); if (JSON.stringify(GC.msgs.filter(m => m.ch).map(m => m.ch)) !== before) changed = true; }
  // a group's own conversation, one request at a time
  if (!document.hidden && !gcList().some(g => g.busy)){
    const due = gcList().filter(g => (g.next || 0) <= now).sort((a, b) => (a.next || 0) - (b.next || 0))[0];
    if (due && GEM.key && !(GEM.wait > now)) gcAmbient(due);
    else if (due && !GEM.key){ due.next = now + 30 * 60000; changed = true; }
  }
  if (changed){
    GC.msgs.sort((a, b) => a.t - b.t);
    if (DC.key && DC.key.startsWith('g:') && chatPageOpen()) GC.read[DC.key.slice(2)] = now;
    saveGc(); dcRefresh();
    const last = fresh.filter(m => !m.sys && !(DC.key === 'g:' + m.g && chatPageOpen()) && !(GC.g[m.g] || {}).mute).pop();
    if (last) gcPreview(last);
  }
}
setInterval(gcTick, 1000);
function gcPreview(m){
  if (P.chatPop === false || focusing() || document.hidden) return;
  const el = $('#chatPop'), g = GC.g[m.g]; if (!el || !g) return;
  el.innerHTML = `${avatar(bot(m.w))}<span><b>${esc(gcName(g))}</b><small>${esc(bot(m.w).name)}: ${m.ch ? (m.ch.k === 'el' ? 'posted an Elimination lobby' : 'posted a challenge') : esc(m.text || '')}</small></span>`;
  delete el.dataset.dm; el.dataset.gc = g.id; chatPopAt = Date.now();
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 7000);
}
(function gcStart(){ if (typeof RK_READY === 'undefined' || !RK_READY) return setTimeout(gcStart, 3000); setTimeout(gcAway, 9000); })();

// Settings → Chat: how many Gemini requests group chats used today (part of the totals above it)
if (typeof aiUsageHtml === 'function'){
  const _aiUsageHtml = aiUsageHtml;
  aiUsageHtml = function(){ const n = GC.use && GC.use.day === ptDay() ? GC.use.n : 0;
    return _aiUsageHtml().replace(/<p class="hint">/, `<div class="ai-u-row"><span>Group chats <small class="hint">(this device)</small></span><span></span><b>${n} today</b></div><p class="hint">`); };
}
