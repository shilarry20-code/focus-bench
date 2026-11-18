/* ---------- global chat ----------
   A room full of the other players, written by Gemini (free tier, key in Settings > Chat). It keeps going on
   every page while the app is open: a new stretch of conversation every few minutes, mostly players talking to
   each other (answering questions, ribbing a rival after a match, arguing about Pomodoro), grounded in what's
   really happening in the simulation: who's studying right now, recent ranked results, exam season. When you
   post, one or two people usually answer. There are no canned lines: with no key, or while Gemini is
   unavailable, the room is simply quiet.
   While a focus block runs, messages keep arriving but nothing pops up. After time away, Gemini writes a short
   stretch of what was said meanwhile. Every message Gemini writes is marked ai:true; the chat keeps only those
   and your own. Messages sync across devices with the rest of your data (see sync.js); the key never does. */

const CHAT_MAX = 300, CHAT_POOL_N = 700;
const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey';
let CHATS = store.get('fb.chat', null) || {msgs: [], q: [], read: Date.now(), seen: 0, next: 0};
let GEM = store.get('fb.ai', {});
const saveChat = () => { if (CHATS.msgs.length > CHAT_MAX) CHATS.msgs.splice(0, CHATS.msgs.length - CHAT_MAX); store.set('fb.chat', CHATS); };
const saveAI = () => store.set('fb.ai', GEM);
const chatLoadT = Date.now();
let chatBusy = false, chatPool = null, chatOnline = null, chatOnlineAt = 0, chatPopAt = 0, chatStarted = false;
const chatId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const focusing = () => S.running && S.phase === 'focus';
const chatPageOpen = () => !$('#page-chat').hidden && !document.hidden;

/* ---- who's around ---- */
// the room's regulars: a fixed set of players, so the same names keep turning up
function chatRegulars(){
  if (chatPool) return chatPool;
  const rr = mulberry32(ROSTER_SEED * 7 + 11), set = new Set();
  while (set.size < CHAT_POOL_N) set.add(Math.floor(rr() * ROSTER_N));
  return (chatPool = [...set]);
}
// who's in the room right now: regulars who are studying, plus some whose usual hours these are
function chatWhoOnline(){
  if (chatOnline && Date.now() - chatOnlineAt < 180000) return chatOnline;
  const h = new Date().getHours(), hh = h < 5 ? h + 24 : h, today = dayKey(Date.now()), rr = mulberry32(Math.floor(Date.now() / 1800000));
  const out = [];
  chatRegulars().forEach(i => {
    const B = bot(i), pk = PEAKS[B.peak] || [9, 22], inPeak = hh >= pk[0] && hh < pk[1];
    let live = false; try { const d = botDay(i, today); live = !!(d && d.sessions.some(x => x.live)); } catch(e){}
    if (live || (inPeak && rr() < .12)) out.push(i);
  });
  if (R.cur && R.cur.state === 'live' && !out.includes(R.cur.b)) out.push(R.cur.b);
  chatOnline = out.slice(0, 60); chatOnlineAt = Date.now();
  return chatOnline;
}
// what a player has going on: their last ranked result, rank, what they study
function chatFacts(i){
  const B = bot(i), r = botRating(i), rk = rankOf(r);
  let last = null; try { const m = m5List(i)[0]; if (m && Date.now() - m.t < 6 * 3600e3) last = m; } catch(e){}
  return {i, name: B.name, rank: rk.full, r, style: B.style, peak: B.peak, subj: B.subject, bio: B.bio,
    last: last ? {opp: bot(last.opp).name, won: last.a > last.b, mine: last.a, theirs: last.b, d: last.d} : null};
}

// queue Gemini's messages, spread out from `from` with gaps that feel like typing
function chatQueue(batch, from, gapMin = 8, gapMax = 45){
  let t = from;
  const ids = [];
  batch.forEach((m, k) => {
    t += (k ? gapMin + Math.random() * (gapMax - gapMin) : 2 + Math.random() * 6) * 1000;
    const id = chatId() + k; ids.push(id);
    const re = typeof m.re === 'number' ? (m.re >= 0 ? ids[m.re] : null) : m.re || null;
    CHATS.q.push({id, t: Math.round(t), w: m.w, text: m.text, re, ai: true});
  });
  CHATS.q.sort((a, b) => a.t - b.t); saveChat();
}
// only Gemini's messages and your own stay in the room
const chatKeep = m => m && (m.ai || m.w === -1);
CHATS.msgs = CHATS.msgs.filter(chatKeep); CHATS.q = CHATS.q.filter(chatKeep);

/* ---- Gemini ---- */
const chatName = w => w === -1 ? myName() : bot(w).name;
function aiPrompt(online, forUser, away){
  const now = new Date(), sem = semesterOf(now), people = online.slice(0, 12);
  if (forUser){ const mine = CHATS.msgs[CHATS.msgs.length - 1], to = mine && mine.re && CHATS.msgs.find(x => x.id === mine.re); if (to && to.w !== -1 && !people.includes(to.w)) people.unshift(to.w); }
  const cast = people.map(chatFacts);
  const recent = CHATS.msgs.slice(-16), tag = new Map(recent.map((m, k) => [m.id, 'm' + (k + 1)]));
  const sys = `You write messages for the global chat room of Focus Bench, a study-timer app used by college students. Players track focus sessions and play ranked matches (whoever studies longer wins and gains Elo).
This is a general hangout room: people can talk about anything, like any group chat of college students. Food, games, sports, music, shows, weather, classes, roommates, weekend plans, random thoughts, memes, complaining, jokes. Studying, exams and ranked matches come up naturally because of where they are, but most messages don't need to be about studying.
Write like a real group chat: casual and varied in length (quick reactions to a couple of sentences), with each player keeping their own personality (their style, when they study, what they study). Players mostly talk to each other: they answer questions, tease each other, disagree, change the subject, and continue threads already in the chat.
Keep it friendly and appropriate: no explicit content, no slurs or harassment, nothing hateful. Never mention AI or that anyone is simulated. Only use player names from the list. "${myName()}" is another player in the room; only talk to them when answering one of their messages.`;
  const who = cast.map(f => `- ${f.name}: ${f.rank} (${f.r} Elo), ${f.style}, studies in the ${f.peak.toLowerCase()}, ${f.subj}${f.last ? `; just ${f.last.won ? 'beat' : 'lost to'} ${f.last.opp} in ranked (${f.last.mine} vs ${f.last.theirs} min)` : ''}`).join('\n');
  const hist = recent.map((m, k) => `[m${k + 1}] ${chatName(m.w)}: ${m.text}${m.re && tag.has(m.re) ? ` (replying to ${tag.get(m.re)})` : ''}`).join('\n') || '(the chat is quiet)';
  const user = `It's ${now.toLocaleDateString(undefined, {weekday: 'long'})} ${now.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}, week ${sem.wk + 1} of the semester${sem.exam ? `, ${sem.exam.toLowerCase()} season` : ''}.
Players online (background, for context; they don't have to talk about it):
${who}

Recent chat, oldest first:
${hist}

${forUser ? (() => { const mine = recent[recent.length - 1], to = mine && mine.re && CHATS.msgs.find(x => x.id === mine.re);
    return `The newest message is from ${myName()} (m${recent.length})${to && to.w !== -1 ? `, replying to ${chatName(to.w)}` : ''}. Write 1 to 4 messages: ${to && to.w !== -1 ? `${chatName(to.w)} answers ${myName()} first (replyTo "m${recent.length}"), and maybe one more player` : `one or two players answer ${myName()} (replyTo "m${recent.length}")`}; others may react or keep their own conversation going.`; })()
  : away ? `${myName()} was away for ${Math.round((Date.now() - away.from) / 60000)} minutes. Write 6 to 10 messages the room exchanged during that time, continuing the chat above: threads, replies, and whatever else people brought up.`
  : 'Write 6 to 9 new messages continuing this chat. Continue or answer threads above, or let someone change the subject to whatever is on their mind.'}
For replyTo use the id of the message being answered: "m#" from the recent chat, or "n1", "n2"… for the new messages in your list. Leave it out when a message isn't a reply.`;
  return {sys, user, recent, cast};
}
// Tries the models in order. For each, it first asks for JSON in an exact shape; if Gemini refuses that request
// (some models or keys don't take a schema), it asks again more loosely and pulls the JSON out of the text.
// GEM.detail keeps Google's own error message so Settings can show what went wrong.
async function aiCall(sys, user){
  const models = GEM.model ? [GEM.model, ...GEMINI_MODELS.filter(m => m !== GEM.model)] : GEMINI_MODELS;
  const schema = {type: 'OBJECT', properties: {messages: {type: 'ARRAY', items: {type: 'OBJECT',
    properties: {from: {type: 'STRING'}, text: {type: 'STRING'}, replyTo: {type: 'STRING'}}, required: ['from', 'text']}}}, required: ['messages']};
  const configs = [{responseMimeType: 'application/json', responseSchema: schema}, {responseMimeType: 'application/json'}, {}];
  let last = null;
  for (const model of models){
    for (const extra of configs){
      let r, raw = '', netErr = null;
      const body = JSON.stringify({systemInstruction: {parts: [{text: sys}]},
        contents: [{role: 'user', parts: [{text: user + (extra.responseSchema ? '' : '\n\nAnswer with only a JSON object: {"messages":[{"from":"…","text":"…","replyTo":"…"}]}')}]}],
        generationConfig: {temperature: 1, maxOutputTokens: 4000, ...extra}});
      // a dropped connection (waking from sleep, switching networks, a tab in the background) gets two more tries
      for (let attempt = 0; attempt < 3; attempt++){
        if (attempt) await new Promise(res => setTimeout(res, attempt === 1 ? 5000 : 15000));
        const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 60000);
        try {
          r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {method: 'POST',
            headers: {'Content-Type': 'application/json', 'x-goog-api-key': GEM.key}, body, signal: ctl.signal});
          raw = await r.text(); netErr = null; break;
        } catch(e){ netErr = e.name === 'AbortError' ? 'timed out after 60 s' : `${e.name}: ${e.message}`; }
        finally { clearTimeout(timer); }
      }
      if (netErr) throw {kind: 'offline', msg: `couldn’t reach Gemini (${netErr}${navigator.onLine === false ? ', device offline' : ''})`};
      let j = null; try { j = JSON.parse(raw); } catch(e){}
      const em = j && j.error ? `${j.error.status || r.status}: ${j.error.message || ''}` : `HTTP ${r.status}`;
      if (!r.ok){
        last = `${model} · ${em}`.slice(0, 260); GEM.detail = last;
        if (r.status === 429) throw {kind: 'busy', msg: last};
        if (/API key|API_KEY|api_key|unauthenticated|credential/i.test(em) || r.status === 401) throw {kind: 'key', msg: last};
        if (r.status === 404 || /not found|not supported|is not available|unsupported model/i.test(em)) break;   // next model
        continue;                                                                  // same model, looser request
      }
      const cand = ((j && j.candidates) || [])[0];
      const txt = cand && cand.content && cand.content.parts ? cand.content.parts.filter(p => !p.thought).map(p => p.text || '').join('') : '';
      let o = null; try { o = JSON.parse(txt); } catch(e){ const m = txt.match(/\{[\s\S]*\}/); if (m) try { o = JSON.parse(m[0]); } catch(e2){} }
      if (!o || !Array.isArray(o.messages)){
        last = `${model} · ${cand ? 'reply ended: ' + (cand.finishReason || 'unreadable') : 'no reply' + (j && j.promptFeedback && j.promptFeedback.blockReason ? ' (' + j.promptFeedback.blockReason + ')' : '')}`;
        GEM.detail = last; continue;
      }
      if (GEM.model !== model){ GEM.model = model; }
      GEM.detail = null; saveAI();
      return o.messages;
    }
  }
  saveAI();
  throw {kind: 'other', msg: last || 'No Gemini model answered'};
}
// turn Gemini's messages into chat messages, checking every name against the room
const normName = n => String(n || '').toLowerCase().replace(/^@/, '').replace(/[^a-z0-9]/g, '');
function aiToBatch(list, recent, cast){
  const out = [], keys = cast.map(f => ({i: f.i, k: normName(f.name)}));
  let lastW = null;
  const who = from => {
    const k = normName(from); if (!k || !keys.length) return null;
    const hit = keys.find(x => x.k === k) || keys.find(x => x.k.startsWith(k) || k.startsWith(x.k)) || keys.find(x => k.length >= 4 && x.k.includes(k));
    if (hit) return hit.i;
    const others = keys.filter(x => x.i !== lastW);                     // a name Gemini made up: give the line to someone online
    return (others.length ? others : keys)[Math.floor(Math.random() * (others.length || keys.length))].i;
  };
  (Array.isArray(list) ? list : []).forEach(m => {
    const w = who(m && (m.from || m.name || m.player));
    let text = String((m && (m.text || m.message)) || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (w == null || !text) return;
    let re = null; const id = String(m.replyTo || m.reply_to || '').trim().replace(/^#/, '');
    if (/^m?\d+$/.test(id) && !/^n/.test(id)){ const x = recent[+id.replace('m', '') - 1]; if (x) re = x.id; }
    else if (/^n\d+$/.test(id)){ const k = +id.slice(1) - 1; if (k >= 0 && k < out.length) re = k; }
    out.push({w, text, re}); lastW = w;
  });
  return out;
}
async function chatGenerate(forUser, away){
  if (chatBusy || !GEM.key || GEM.wait > Date.now()) return;
  chatBusy = true;
  try {
    const {sys, user, recent, cast} = aiPrompt(chatWhoOnline(), forUser, away);
    const got = await aiCall(sys, user), batch = aiToBatch(got, recent, cast);
    GEM.last = {at: Date.now(), got: Array.isArray(got) ? got.length : 0, used: batch.length, model: GEM.model};
    if (!batch.length){ GEM.last.why = cast.length ? 'Gemini sent no usable messages' : 'nobody is online right now'; saveAI(); return; }
    GEM.err = null; GEM.ok = Date.now(); saveAI();
    if (away){                                    // what was said while you were gone, spread over that time
      const span = Date.now() - away.from, ids = [];
      batch.forEach((m, k) => {
        const t = Math.round(away.from + span * (k + .2 + Math.random() * .6) / batch.length), id = chatId() + 'a' + k; ids.push(id);
        CHATS.msgs.push({id, t, w: m.w, text: m.text, re: typeof m.re === 'number' ? (m.re >= 0 ? ids[m.re] : null) : m.re || null, ai: true});
      });
      CHATS.msgs.sort((a, b) => a.t - b.t); saveChat(); chatBadge(); renderChat();
    } else chatQueue(batch, Date.now(), forUser ? 4 : 10, forUser ? 14 : 50);
  } catch(e){
    GEM.last = {at: Date.now(), got: 0, used: 0, why: e.msg || (e.kind === 'offline' ? 'couldn’t reach Gemini' : e.kind)};
    GEM.err = e.kind === 'key' ? 'Gemini didn’t accept that key.' : e.kind === 'busy' ? 'Gemini’s free limit is used up for now. The chat is quiet until it resets.' : e.kind === 'offline' ? null : 'Gemini had a problem. The chat is quiet for a bit.';
    if (e.msg) GEM.detail = e.msg;
    GEM.wait = Date.now() + (e.kind === 'busy' ? 15 : e.kind === 'key' ? 60 * 24 : e.kind === 'offline' ? 1 : 5) * 60000;
    if (e.kind === 'offline') CHATS.next = GEM.wait;
    saveAI();
  } finally { chatBusy = false; renderChatSettings(); renderChat(); }
}

/* ---- the clock: release messages when they're due, start new conversation, catch up after being away ---- */
function chatTick(){
  if (!RK_READY) return;
  const now = Date.now();
  if (!chatStarted){
    if (SYNC.token && !syncFirstDone && now - chatLoadT < 20000) return;   // let the other device's messages arrive first
    chatStarted = true; chatCatchUp();
  }
  let fresh = [];
  while (CHATS.q.length && CHATS.q[0].t <= now){ const m = CHATS.q.shift(); CHATS.msgs.push(m); fresh.push(m); }
  if (fresh.length){
    CHATS.msgs.sort((a, b) => a.t - b.t); saveChat();
    if (chatPageOpen()){ CHATS.read = now; renderChat(); } else chatPreview(fresh.filter(m => m.w !== -1).pop());
    chatBadge();
  }
  if (document.hidden) return;                                // a tab in the background just delivers; it doesn't write new chat
  if (now - Math.max(CHATS.seen || 0, CHATS.msgs.length ? CHATS.msgs[CHATS.msgs.length - 1].t : 0) > 8 * 60000 && CHATS.seen) chatCatchUp();
  CHATS.seen = now;
  if (GEM.key && !CHATS.msgs.length && !CHATS.q.length && !chatBusy && !(GEM.wait > now)) CHATS.next = 0;
  if (!CHATS.q.length && now >= (CHATS.next || 0)){
    CHATS.next = now + (180 + Math.random() * 180) * 1000; saveChat();
    chatGenerate(false);
  }
}
function chatCatchUp(){
  const now = Date.now(), lastMsg = CHATS.msgs.length ? CHATS.msgs[CHATS.msgs.length - 1].t : 0;
  if (lastMsg > (CHATS.seen || 0)) CHATS.seen = Math.min(now, lastMsg);    // another device kept the room going
  CHATS.q = CHATS.q.filter(m => m.t > now - 6 * 3600e3);
  const away = CHATS.seen ? now - CHATS.seen : 0;
  if (away > 8 * 60000 && GEM.key){ CHATS.next = now + (180 + Math.random() * 180) * 1000; chatGenerate(false, {from: Math.max(CHATS.seen, now - 6 * 3600e3)}); }
  CHATS.seen = now; saveChat(); chatBadge();
}
// another tab of the app wrote to the chat: use its copy
addEventListener('storage', e => {
  if (e.key !== 'fb.chat' || !e.newValue) return;
  try { CHATS = JSON.parse(e.newValue); } catch(err){ return; }
  chatBadge(); renderChat();
});
setInterval(chatTick, 2500);

/* ---- unread count and break-time previews ---- */
const chatUnread = () => CHATS.msgs.filter(m => m.t > (CHATS.read || 0) && m.w !== -1).length;
function chatBadge(){
  const n = chatPageOpen() ? 0 : chatUnread(), txt = n > 99 ? '99+' : n ? String(n) : '';
  document.querySelectorAll('.chat-badge').forEach(b => { b.textContent = txt; b.hidden = !n; });
}
function chatPreview(m){
  if (!m || P.chatPop === false || focusing() || document.hidden || Date.now() - chatPopAt < 25000) return;
  chatPopAt = Date.now();
  const el = $('#chatPop'), B = bot(m.w);
  el.innerHTML = `${avatar(B)}<span><b>${esc(B.name)}</b><small>${esc(m.text)}</small></span>`;
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 6000);
}
$('#chatPop').addEventListener('click', () => { $('#chatPop').hidden = true; showPage('chat'); });

/* ---- the Chat page ---- */
const chatTime = t => { const d = new Date(t), today = dayKey(Date.now()) === dayKey(t); return (today ? '' : d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) + ' ') + d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}); };
function chatMsgHtml(m, byId){
  const me = m.w === -1, B = me ? null : bot(m.w), rk = me ? myRk() : rankOf(botRating(m.w)), r = m.re && byId.get(m.re);
  const feat = me ? myFeatured()[0] : botFeatured(m.w)[0];
  return `<div class="ch-msg${me ? ' mine' : ''}" data-id="${m.id}">
    <button class="ch-av" ${me ? 'data-me="1"' : `data-bot="${m.w}"`} aria-label="${esc(chatName(m.w))}'s profile">${me ? myAvatar() : avatar(B)}</button>
    <div class="ch-body"><div class="ch-head"><button class="ch-name" ${me ? 'data-me="1"' : `data-bot="${m.w}"`}>${esc(chatName(m.w))}</button>${emblem(rk, 'xs')}<span class="ch-rk">${esc(rk.full)}</span>${feat ? badgeHtml(feat) : ''}<time>${chatTime(m.t)}</time></div>
    ${r ? `<div class="ch-re"><b>${esc(chatName(r.w))}</b> ${esc(r.text.length > 70 ? r.text.slice(0, 70) + '…' : r.text)}</div>` : ''}
    <p>${esc(m.text)}</p></div>
    <button class="ch-reply" data-reply="${m.id}" aria-label="Reply to ${esc(chatName(m.w))}" title="Reply"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/></svg></button></div>`;
}
function renderChat(){
  const el = $('#chatBody'); if (!el || $('#page-chat').hidden) return;
  if (!RK_READY){ el.innerHTML = '<p class="hint">Loading players…</p>'; return; }
  const list = $('#chatList'), nearBottom = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  const online = chatWhoOnline(), byId = new Map(CHATS.msgs.map(m => [m.id, m])), readAt = CHATS._shownRead || CHATS.read || 0;
  let divider = false;
  const rows = CHATS.msgs.map(m => { let d = ''; if (!divider && m.t > readAt && m.w !== -1 && CHATS.msgs[0] !== m){ divider = true; d = '<div class="ch-new"><span>New</span></div>'; } return d + chatMsgHtml(m, byId); }).join('');
  if (!list){
    el.innerHTML = `<div class="card ch-card"><div class="ch-top"><div><b>Global chat</b><small><i class="ch-on"></i>${online.length} online</small></div><div class="ch-online" id="chatOnline"></div></div>
      <div class="ch-list" id="chatList"></div>
      <div class="ch-replying" id="chatReplying" hidden></div>
      <form class="ch-send" id="chatForm"><input id="chatIn" maxlength="200" placeholder="Say something to the room" autocomplete="off" aria-label="Message"><button class="small-btn accent">Send</button></form>
      <p class="hint ch-hint" id="chatHint"></p></div>`;
  }
  $('#chatOnline').innerHTML = online.slice(0, 14).map(i => `<button class="ch-av" data-bot="${i}" title="${esc(bot(i).name)}">${avatar(bot(i))}</button>`).join('') + (online.length > 14 ? `<span class="hint">+${online.length - 14}</span>` : '');
  $('.ch-top small').innerHTML = `<i class="ch-on"></i>${online.length} online`;
  $('#chatList').innerHTML = rows || (GEM.key ? '<p class="hint ch-empty">It’s quiet. Say hi, or give the regulars a minute.</p>'
    : '<p class="hint ch-empty">The chat is written by Gemini. Add a free key in <button class="link-btn" data-go="settings" data-sec="set-chat">Settings → Chat</button> to bring the room to life.</p>');
  $('#chatHint').innerHTML = GEM.key ? (GEM.err ? esc(GEM.err) : '') : '';
  if (chatReplyTo){ const el = document.querySelector(`.ch-msg[data-id="${chatReplyTo}"]`); if (el) el.classList.add('picked'); }
  const L = $('#chatList'); if (nearBottom) L.scrollTop = L.scrollHeight;
}
function chatShown(name){
  if (name !== 'chat') { chatBadge(); return; }
  const lastT = CHATS.msgs.length ? CHATS.msgs[CHATS.msgs.length - 1].t : 0;
  if (GEM.key && !CHATS.q.length && Date.now() - lastT > 4 * 60000 && !(GEM.wait > Date.now())){ CHATS.next = Date.now() + (180 + Math.random() * 180) * 1000; saveChat(); chatGenerate(false); }
  CHATS._shownRead = CHATS.read; CHATS.read = Date.now(); saveChat(); chatBadge();
  renderChat(); const L = $('#chatList'); if (L) L.scrollTop = L.scrollHeight;
}
const _onPageShown = onPageShown;
onPageShown = function(name){ _onPageShown(name); chatShown(name); };
let chatReplyTo = null;
function setChatReply(id){
  const m = id && CHATS.msgs.find(x => x.id === id), bar = $('#chatReplying'); chatReplyTo = m ? m.id : null;
  document.querySelectorAll('.ch-msg.picked').forEach(x => x.classList.remove('picked'));
  if (m){ const el = document.querySelector(`.ch-msg[data-id="${m.id}"]`); if (el) el.classList.add('picked'); }
  if (!bar) return;
  bar.hidden = !m;
  bar.innerHTML = m ? `<span>Replying to <b>${esc(chatName(m.w))}</b>: ${esc(m.text.length > 60 ? m.text.slice(0, 60) + '…' : m.text)}</span><button type="button" class="ch-x" data-unreply="1" aria-label="Cancel reply">✕</button>` : '';
  if (m) $('#chatIn').focus();
}
$('#page-chat').addEventListener('submit', e => {
  if (e.target.id !== 'chatForm') return; e.preventDefault();
  const inp = $('#chatIn'), text = inp.value.replace(/\s+/g, ' ').trim(); if (!text) return;
  inp.value = '';
  CHATS.msgs.push({id: chatId(), t: Date.now(), w: -1, text, re: chatReplyTo}); CHATS.read = Date.now(); setChatReply(null); saveChat(); renderChat();
  CHATS.q = CHATS.q.filter(m => m.t > Date.now() + 20000);   // the room pauses to answer you
  if (GEM.key) setTimeout(() => chatGenerate(true), 600 + Math.random() * 1200);
});
$('#page-chat').addEventListener('click', e => {
  const r = e.target.closest('[data-reply]'); if (r){ setChatReply(r.dataset.reply); return; }
  if (e.target.closest('[data-unreply]')){ setChatReply(null); return; }
  const b = e.target.closest('[data-bot], [data-me]');
  if (!b){                                   // tapping a message itself (not a name or picture) replies to it
    const msg = e.target.closest('.ch-msg'); if (msg && !window.getSelection().toString()) setChatReply(chatReplyTo === msg.dataset.id ? null : msg.dataset.id);
    return;
  }
  if (b.dataset.me) openProfile(ME); else openProfile(+b.dataset.bot);
});
$('#page-chat').addEventListener('keydown', e => { if (e.key === 'Escape' && chatReplyTo) setChatReply(null); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && chatPageOpen()){ CHATS.read = Date.now(); saveChat(); chatBadge(); } });

/* ---- Settings > Chat ---- */
function renderChatSettings(){
  const el = $('#chatSetBody'); if (!el) return;
  el.innerHTML = `<p class="lead">The global chat is written by Gemini: the players talk to each other and answer what you say. It needs a free Gemini key; without one the room stays quiet.</p>
    ${GEM.key ? `<div class="sync-status ${GEM.err ? 'bad' : ''}"><span class="sync-dot${GEM.err ? ' off' : ''}"></span><span><b>${GEM.err ? esc(GEM.err) : 'Gemini is on'}</b><small>${GEM.model ? `Model: ${esc(GEM.model)}` : 'Not used yet'}${GEM.ok ? ` · last used ${syncAgo(GEM.ok)}` : ''}</small></span></div>
      ${GEM.err && GEM.detail ? `<p class="hint ai-detail">Google said: <code>${esc(GEM.detail)}</code></p>` : ''}
      ${GEM.last ? `<p class="hint ai-detail">Last chat request ${syncAgo(GEM.last.at)}: ${GEM.last.used ? `${GEM.last.got} message${GEM.last.got === 1 ? '' : 's'}, ${GEM.last.used} used` : esc(GEM.last.why || 'nothing came back')}.</p>` : ''}
      <div class="confirm"><button class="small-btn" id="aiTest">Test it</button><button class="small-btn" id="aiOff">Remove key</button></div>`
    : `<ol class="sync-steps"><li><b>Get a free key.</b> <a class="small-btn" href="${GEMINI_KEY_URL}" target="_blank" rel="noopener">Google AI Studio ↗</a><small class="hint">Sign in with Google, click <b>Create API key</b>, and copy it. Use a key from a project with <b>no billing</b> set up, so nothing can ever be charged.</small></li>
      <li><b>Paste it here.</b><span class="sync-row"><input type="password" id="aiKey" placeholder="Paste your Gemini API key" autocomplete="off" spellcheck="false" aria-label="Gemini API key"><button class="small-btn accent" id="aiSave">Save</button></span><small class="hint">It stays in this browser only. Paste it on each device you use.</small></li></ol>`}
    <div class="row"><label for="chatPopOn">Message previews<span class="sub">A small pop-up for new messages, only during breaks or with the timer stopped</span></label><input type="checkbox" id="chatPopOn" ${P.chatPop !== false ? 'checked' : ''}></div>
    <div class="confirm"><button class="small-btn" id="chatClear">Clear chat history</button></div>`;
}
// "Test it" sends a real, chat-sized request and says how many messages came back
async function aiTest(){
  const b = $('#aiTest') || $('#aiSave'); if (b){ b.disabled = true; b.textContent = 'Checking…'; }
  try {
    const online = RK_READY ? chatWhoOnline() : [];
    let n = 1;
    if (online.length){ const {sys, user, recent, cast} = aiPrompt(online, false); n = aiToBatch(await aiCall(sys, user), recent, cast).length; }
    else await aiCall('Reply with JSON only.', 'Return {"messages":[{"from":"test","text":"ok"}]}');
    GEM.err = null; GEM.wait = 0; GEM.ok = Date.now(); GEM.last = {at: Date.now(), got: n, used: n, model: GEM.model}; saveAI();
    CHATS.next = 0; saveChat();
    toast(n ? `Gemini works (${GEM.model}): ${n} messages came back.` : `Gemini answered but sent no usable messages.`); return true;
  } catch(e){
    GEM.err = e.kind === 'key' ? 'Gemini didn’t accept that key.' : e.kind === 'busy' ? 'Gemini’s free limit is used up for now.' : e.kind === 'offline' ? 'Couldn’t reach Gemini.' : 'Gemini had a problem.';
    if (e.msg){ GEM.detail = e.msg; GEM.last = {at: Date.now(), got: 0, used: 0, why: e.msg}; }
    saveAI(); toast(GEM.err + (e.msg ? ' Details are in Settings → Chat.' : '')); return false;
  } finally { renderChatSettings(); }
}
$('#page-settings').addEventListener('click', async e => {
  const b = e.target.closest('#aiSave, #aiTest, #aiOff, #chatClear'); if (!b) return;
  if (b.id === 'aiSave'){
    // any key format Google issues is fine: the test call below is what decides whether it works
    const k = ($('#aiKey').value || '').replace(/^[\s"'`]+|[\s"'`]+$/g, '').replace(/\s+/g, '');
    if (k.length < 20){ toast('That key looks too short. Copy the whole key from Google AI Studio.'); return; }
    GEM = {key: k}; saveAI();
    await aiTest();
  }
  else if (b.id === 'aiTest') aiTest();
  else if (b.id === 'aiOff'){ GEM = {}; saveAI(); renderChatSettings(); renderChat(); toast('Key removed. The chat is quiet now.'); }
  else if (b.id === 'chatClear'){
    if (!b.dataset.sure){ b.dataset.sure = 1; b.textContent = 'Click again to clear'; setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.textContent = 'Clear chat history'; } }, 3500); return; }
    CHATS = {msgs: [], q: [], read: Date.now(), seen: Date.now(), next: 0}; saveChat(); chatBadge(); toast('Chat cleared.');
  }
});
$('#page-settings').addEventListener('change', e => { if (e.target.id === 'chatPopOn'){ P.chatPop = e.target.checked; saveP(); } });
$('#page-settings').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'aiKey') $('#aiSave').click(); });
renderChatSettings(); chatBadge();

addEventListener('online', () => { if (GEM.key && GEM.wait > Date.now()){ GEM.wait = 0; saveAI(); } if (GEM.key){ CHATS.next = Math.min(CHATS.next || 0, Date.now() + 3000); saveChat(); } });
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !GEM.key) return;
  const lastT = CHATS.msgs.length ? CHATS.msgs[CHATS.msgs.length - 1].t : 0;
  if (GEM.last && GEM.last.why && /reach Gemini/.test(GEM.last.why) && GEM.wait > Date.now()){ GEM.wait = 0; saveAI(); }
  if (!CHATS.q.length && Date.now() - lastT > 4 * 60000){ CHATS.next = Math.min(CHATS.next || 0, Date.now() + 2000); saveChat(); }
});
