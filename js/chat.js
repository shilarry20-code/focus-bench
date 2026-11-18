/* ---------- global chat ----------
   A room full of the other players. It keeps going on every page while the app is open: a new stretch of
   conversation every few minutes, mostly players talking to each other (answering questions, ribbing a rival
   after a match, arguing about Pomodoro), built from what's really happening in the simulation: who's studying
   right now, recent ranked results, exam season. When you post, one or two people usually answer.

   With a free Gemini key (Settings > Chat) the conversation is written by Gemini Flash-Lite, a batch of messages
   at a time. Without one, or if Gemini is busy, it's built from scripted conversations instead.
   While a focus block runs, messages keep arriving but nothing pops up. When the site was closed, the room
   fills in a short catch-up of the time you were away.
   Stored on this device only (fb.chat); the Gemini key is kept in this browser (fb.ai), never in backups or sync. */

const CHAT_MAX = 300, CHAT_POOL_N = 700;
const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey';
let CHATS = store.get('fb.chat', null) || {msgs: [], q: [], read: Date.now(), seen: 0, next: 0};
let GEM = store.get('fb.ai', {});
const saveChat = () => { if (CHATS.msgs.length > CHAT_MAX) CHATS.msgs.splice(0, CHATS.msgs.length - CHAT_MAX); store.set('fb.chat', CHATS); };
const saveAI = () => store.set('fb.ai', GEM);
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

/* ---- scripted conversations ---- */
const cpk = (rr, a) => a[Math.floor(rr() * a.length)];
// each thread: lines of [role, options, replyTo (index of an earlier line) or -1]; {A} {B} {C} are players
function chatThreads(ctx){
  const T = [];
  const add = (w, lines, ok = true) => { if (ok) T.push({w, lines}); };
  add(3, [['A', ['how do yall stop procrastinating', 'been staring at my {subjA} notes for 20 min doing nothing', 'anyone else just cannot start today'], -1],
          ['B', ['phone in another room. works every time', 'just do one pomodoro, the first one is the hardest', 'set the timer for 10 min and tell yourself you can stop after'], 0],
          ['A', ['ok trying it', 'fine. starting now', 'ok going. see you in 25'], 1],
          ['C', ['same honestly', 'the struggle is real today', 'this chat is my procrastination tbh'], 0]]);
  add(3, [['A', ['pomodoro is overrated, 25 min is too short', '52/17 > pomodoro, fight me', 'hot take: breaks ruin my flow'], -1],
          ['B', ['25 is perfect for problem sets tho', 'nah pomodoro keeps me honest', 'flow mode is the real answer'], 0],
          ['A', ['respectfully disagree', 'ok flow mode is fair', 'we\'ll settle this in ranked'], 1],
          ['C', ['whatever works for you works', 'i just use timebox and pray', 'stopwatch gang where you at'], 0]]);
  add(ctx.exam ? 5 : 1, [['A', [`${ctx.exam ? ctx.exam.toLowerCase() : 'exam'} week is destroying me`, `who else has ${ctx.exam ? ctx.exam.toLowerCase() + 's' : 'exams'} this week`, `{subjA} ${ctx.exam ? ctx.exam.toLowerCase() : 'exam'} tomorrow and i know nothing`], -1],
          ['B', ['you got this', 'same, {subjB} on thursday', 'practice exams, nothing else works'], 0],
          ['A', ['thx 🙏', 'practice exams it is', 'ok locking in'], 1]], true);
  if (ctx.winner) add(4, [['A', [`just beat {opp} in ranked, ${ctx.winner.last.mine}m`, `+${Math.abs(ctx.winner.last.d)} elo lets go`, 'finally won one vs {opp}'], -1],
          ['B', ['gg', 'nice', '{opp} is no joke too', 'ok now carry me'], 0],
          ['A', ['it was close tbh', 'they almost had me', 'locked in today'], 1]]);
  if (ctx.loser) add(3, [['A', [`{opp} outlasted me by ${Math.max(1, ctx.loser.last.theirs - ctx.loser.last.mine)} min 💀`, 'lost to {opp} again', `down ${Math.abs(ctx.loser.last.d)} elo, rough`], -1],
          ['B', ['it happens', 'you\'ll get it back', '{opp} studies like a machine'], 0],
          ['A', ['rematch tomorrow', 'next one is mine', 'i needed food ok'], 1]]);
  if (ctx.rivals) add(4, [['A', ['gg {B}. you got lucky', 'rematch {B}?', '{B} how were you still going'], -1],
          ['B', ['lucky? i was locked in', 'anytime', 'i had coffee, you didn\'t stand a chance'], 0],
          ['A', ['next time', 'enjoy it while it lasts', 'ok that\'s fair'], 1],
          ['C', ['the rivalry continues', 'popcorn 🍿', 'yall are both crazy'], 1]]);
  add(2, [['A', ['third coffee of the day', 'need a nap so bad', 'is it bad that i studied through lunch'], -1],
          ['B', ['drink water too lol', 'naps = 20 min max or you\'re done', 'lunch counts as a study break technically'], 0],
          ['A', ['water? never heard of it', 'ok 20 min nap then back', 'fair'], 1]]);
  add(2, [['A', ['library is packed today', 'finally found a quiet spot', 'someone is eating chips next to me in the library 😭'], -1],
          ['B', ['go early, it\'s empty before 9', 'headphones on and pretend you don\'t hear it', 'top floor is always quiet'], 0]]);
  add(ctx.late ? 5 : 0, [['A', ['anyone else up', 'late night grind check', 'why do i study best at night'], -1],
          ['B', ['always', 'here', 'night owl gang'], 0],
          ['C', ['go to sleep 😭', 'respect', 'it\'s so quiet at night tho'], 0]], ctx.late);
  add(ctx.morning ? 5 : 0, [['A', ['morning crew where you at', 'up early for {subjA} reading', 'first pomodoro done before 8'], -1],
          ['B', ['here ☕', 'early bird gets the elo', 'how are you guys awake'], 0],
          ['A', ['coffee is the answer', 'sleep is optional', 'went to bed at 10 like a grandma'], 2]], ctx.morning);
  add(2, [['A', ['what do you listen to while studying', 'lofi or silence?', 'need new study music'], -1],
          ['B', ['rain sounds', 'video game soundtracks', 'silence or i get distracted'], 0],
          ['C', ['brown noise changed my life', 'the rain setting in here is lowkey good', 'classical, no lyrics'], 0]]);
  add(3, [['A', ['best way to memorize {subjA} stuff?', 'how do you study for {subjA}', 'tips for {subjA}? i\'m drowning'], -1],
          ['B', ['quiz yourself, don\'t reread', 'explain it out loud like you\'re teaching it', 'a little every day, spaced out'], 0],
          ['A', ['ok that makes sense', 'teaching my roommate {subjA} rn', 'trying it'], 1],
          ['C', ['active recall is the move', 'practice problems > notes', 'flashcards in here are good for that'], 0]]);
  add(2, [['A', ['just finished my {taskA}', '{taskA} done, finally', 'submitted it with 2 min to spare'], -1],
          ['B', ['nice', 'what\'s next', 'reward yourself'], 0],
          ['A', ['food', 'next assignment... the grind continues', 'a nap'], 1]]);
  add(2, [['A', ['day {n} of my streak', 'not breaking my streak today', 'streak almost died yesterday lol'], -1],
          ['B', ['keep it going', 'don\'t break it now', 'streaks are the only thing keeping me going'], 0]]);
  if (ctx.top) add(2, [['A', ['how is {top} always online', '{top} has to be a robot', 'did anyone see {top}\'s hours this week'], -1],
          ['B', ['{top} studies more than i sleep', 'goals honestly', 'no social life detected'], 0]]);
  add(ctx.weekend ? 3 : 0, [['A', ['studying on a {day} night, couldn\'t be me (it\'s me)', 'weekend grind', 'library is empty, love it'], -1],
          ['B', ['same', 'at least it\'s quiet', 'we\'re built different'], 0]], ctx.weekend);
  add(2, [['A', ['break time, 5 min of scrolling', 'taking a break', 'brb food'], -1],
          ['B', ['don\'t let it become 50 min', 'see you in 5 (you won\'t be back in 5)', 'enjoy'], 0],
          ['A', ['...no promises', 'ok fine 5', 'back already, proud of me?'], 1]]);
  add(2, [['A', ['how many hours did you all do yesterday', 'what\'s everyone\'s goal today'], -1],
          ['B', ['like 4', '6 pomodoros', 'more than i wanted lol'], 0],
          ['C', ['2 and i\'m proud of it', 'goal is 5 hours', 'not enough'], 0]]);
  add(1, [['A', ['ranked queue is fast today', 'who wants to get matched', 'anyone near {rankA}? looking for a match'], -1],
          ['B', ['not me i\'m losing too much', 'i\'ll find you', 'queue me up'], 0]]);
  return T;
}
// fill a thread with players and real details; returns [{w, text, re}] with re as an index into the batch
function chatBuild(rr, online){
  if (online.length < 2) return [];
  const facts = online.map(chatFacts), now = new Date(), h = now.getHours(), sem = semesterOf(now);
  const winners = facts.filter(f => f.last && f.last.won), losers = facts.filter(f => f.last && !f.last.won);
  const rivalPair = facts.find(f => f.last && online.some(j => bot(j).name === f.last.opp));
  const top = (() => { try { return bot(sortedBots()[0]).name; } catch(e){ return null; } })();
  const ctx = {exam: sem.exam, late: h >= 23 || h < 4, morning: h >= 5 && h < 10, weekend: [5, 6].includes(now.getDay()),
    winner: winners.length ? cpk(rr, winners) : null, loser: losers.length ? cpk(rr, losers) : null, rivals: rivalPair || null, top};
  const T = chatThreads(ctx), total = T.reduce((n, t) => n + t.w, 0);
  let x = rr() * total, th = T[0];
  for (const t of T){ x -= t.w; if (x <= 0){ th = t; break; } }
  // pick the cast: whoever the thread is about goes first
  let A = null;
  if (th.lines[0][1].some(s => /\{opp\}/.test(s))) A = (ctx.winner && th.lines[0][1][0].includes('beat')) ? ctx.winner : ctx.loser || ctx.winner;
  if (ctx.rivals && th.lines[0][1].some(s => /\{B\}/.test(s))) A = ctx.rivals;
  if (!A) A = cpk(rr, facts);
  const others = facts.filter(f => f.i !== A.i);
  let B = ctx.rivals && A === ctx.rivals ? facts.find(f => f.name === A.last.opp) : null;
  if (!B) B = cpk(rr, others);
  const rest = others.filter(f => f.i !== B.i), C = rest.length ? cpk(rr, rest) : null;
  const cast = {A, B, C}, fill = s => s
    .replace(/\{A\}/g, A.name).replace(/\{B\}/g, B.name).replace(/\{C\}/g, C ? C.name : B.name)
    .replace(/\{subjA\}/g, A.subj.toLowerCase()).replace(/\{subjB\}/g, B.subj.toLowerCase())
    .replace(/\{opp\}/g, A.last ? A.last.opp : 'them').replace(/\{rankA\}/g, A.rank).replace(/\{top\}/g, top || 'the #1 player')
    .replace(/\{taskA\}/g, cpk(rr, ['problem set', 'lab report', 'essay draft', 'reading quiz', 'homework']))
    .replace(/\{n\}/g, 3 + Math.floor(rr() * 40)).replace(/\{day\}/g, now.toLocaleDateString(undefined, {weekday: 'long'}).toLowerCase());
  const out = [], at = [];                                    // at[k]: where template line k landed in out
  th.lines.forEach(([role, opts, re], k) => {
    const who = cast[role]; if (!who || (k > 1 && rr() < .25)){ at[k] = -1; return; }   // threads don't always play out in full
    at[k] = out.length;
    out.push({w: who.i, text: fill(cpk(rr, opts)), re: re >= 0 && at[re] >= 0 ? at[re] : -1});
  });
  return out;
}
// queue a batch, spread out from `from` with gaps that feel like typing
function chatQueue(batch, from, gapMin = 8, gapMax = 45){
  let t = from;
  const ids = [];
  batch.forEach((m, k) => {
    t += (k ? gapMin + Math.random() * (gapMax - gapMin) : 2 + Math.random() * 6) * 1000;
    const id = chatId() + k; ids.push(id);
    const re = typeof m.re === 'number' ? (m.re >= 0 ? ids[m.re] : null) : m.re || null;
    CHATS.q.push({id, t: Math.round(t), w: m.w, text: m.text, re});
  });
  CHATS.q.sort((a, b) => a.t - b.t); saveChat();
}

/* ---- Gemini ---- */
const chatName = w => w === -1 ? myName() : bot(w).name;
function aiPrompt(online, forUser){
  const now = new Date(), sem = semesterOf(now), cast = online.slice(0, 12).map(chatFacts);
  const recent = CHATS.msgs.slice(-16), tag = new Map(recent.map((m, k) => [m.id, 'm' + (k + 1)]));
  const sys = `You write messages for the global chat room of Focus Bench, a study-timer app where college students track focus sessions and play ranked matches (whoever studies longer wins and gains Elo).
Write like a real group chat: casual, mostly lowercase, short (usually 2-16 words), varied, emoji rare. Topics: studying, classes, exams, focus tricks, breaks, ranked matches, streaks, leaderboards.
The players mostly talk to each other: they answer each other's questions, tease rivals after a match, disagree politely, and continue threads already in the chat. Keep each player's personality (style, when they study, what they study).
Keep it friendly and school-appropriate: no politics, no romance, no real people. Never mention GEM or that anyone is simulated. Only use player names from the list. "${myName()}" is another player in the room; only talk to them when answering one of their messages.`;
  const who = cast.map(f => `- ${f.name}: ${f.rank} (${f.r} Elo), ${f.style}, studies in the ${f.peak.toLowerCase()}, ${f.subj}${f.last ? `; just ${f.last.won ? 'beat' : 'lost to'} ${f.last.opp} in ranked (${f.last.mine} vs ${f.last.theirs} min)` : ''}`).join('\n');
  const hist = recent.map((m, k) => `[m${k + 1}] ${chatName(m.w)}: ${m.text}${m.re && tag.has(m.re) ? ` (replying to ${tag.get(m.re)})` : ''}`).join('\n') || '(the chat is quiet)';
  const user = `It's ${now.toLocaleDateString(undefined, {weekday: 'long'})} ${now.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}, week ${sem.wk + 1} of the semester${sem.exam ? `, ${sem.exam.toLowerCase()} season` : ''}.
Players online:
${who}

Recent chat, oldest first:
${hist}

${forUser ? `The newest message is from ${myName()} (m${recent.length}). Write 1 to 4 messages: one or two players answer ${myName()} (replyTo "m${recent.length}"), and others may react or keep their own conversation going.`
  : 'Write 6 to 9 new messages continuing this chat. Mostly continue or answer threads above, and maybe start one new topic.'}
For replyTo use the id of the message being answered: "m#" from the recent chat, or "n1", "n2"… for the new messages in your list. Leave it out when a message isn't a reply.`;
  return {sys, user, recent, cast};
}
async function aiCall(sys, user){
  const models = GEM.model ? [GEM.model, ...GEMINI_MODELS.filter(m => m !== GEM.model)] : GEMINI_MODELS;
  for (const model of models){
    let r;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-goog-api-key': GEM.key},
        body: JSON.stringify({systemInstruction: {parts: [{text: sys}]}, contents: [{role: 'user', parts: [{text: user}]}],
          generationConfig: {temperature: 1, maxOutputTokens: 3000, responseMimeType: 'application/json',
            responseSchema: {type: 'OBJECT', properties: {messages: {type: 'ARRAY', items: {type: 'OBJECT',
              properties: {from: {type: 'STRING'}, text: {type: 'STRING'}, replyTo: {type: 'STRING'}}, required: ['from', 'text']}}}, required: ['messages']}}})});
    } catch(e){ throw {kind: 'offline'}; }
    if (r.status === 404 || (r.status === 400 && /model/i.test(await r.clone().text()))) continue;     // that model's gone: try the next
    if (r.status === 400 || r.status === 401 || r.status === 403){ const t = await r.text(); throw {kind: /api key|API_KEY|permission/i.test(t) ? 'key' : 'other', msg: t.slice(0, 200)}; }
    if (r.status === 429) throw {kind: 'busy'};
    if (!r.ok) throw {kind: 'other', msg: 'HTTP ' + r.status};
    const j = await r.json(), txt = ((j.candidates || [])[0] || {}).content;
    const s = txt && txt.parts ? txt.parts.map(p => p.text || '').join('') : '';
    let o; try { o = JSON.parse(s); } catch(e){ throw {kind: 'other', msg: 'unreadable reply'}; }
    if (GEM.model !== model){ GEM.model = model; saveAI(); }
    return o.messages || [];
  }
  throw {kind: 'other', msg: 'No Gemini model available'};
}
// turn Gemini's messages into chat messages, checking every name against the room
function aiToBatch(list, recent, cast){
  const byName = new Map(cast.map(f => [f.name.toLowerCase(), f.i])), out = [];
  list.forEach(m => {
    const w = byName.get(String(m.from || '').trim().toLowerCase());
    let text = String(m.text || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 220);
    if (w == null || !text) return;
    let re = null; const id = String(m.replyTo || '');
    if (/^m\d+$/.test(id)){ const x = recent[+id.slice(1) - 1]; if (x) re = x.id; }
    else if (/^n\d+$/.test(id)){ const k = +id.slice(1) - 1; if (k >= 0 && k < out.length) re = k; }
    out.push({w, text, re});
  });
  return out;
}
async function chatGenerate(forUser){
  if (chatBusy) return; chatBusy = true;
  const online = chatWhoOnline(), rr = mulberry32(Date.now() % 2147483647);
  try {
    if (GEM.key && !(GEM.wait > Date.now()) && !document.hidden){
      try {
        const {sys, user, recent, cast} = aiPrompt(online, forUser);
        const batch = aiToBatch(await aiCall(sys, user), recent, cast);
        if (batch.length){ GEM.err = null; GEM.ok = Date.now(); saveAI(); chatQueue(batch, Date.now(), forUser ? 4 : 10, forUser ? 14 : 50); renderChatSettings(); return; }
      } catch(e){
        GEM.err = e.kind === 'key' ? 'Gemini didn’t accept that key.' : e.kind === 'busy' ? 'Gemini’s free limit is used up for now. Using scripted chat for a bit.' : e.kind === 'offline' ? null : 'Gemini had a problem. Using scripted chat for a bit.';
        GEM.wait = Date.now() + (e.kind === 'busy' ? 15 : e.kind === 'key' ? 60 * 24 : 5) * 60000; saveAI(); renderChatSettings(); renderChat();
      }
    }
    if (forUser) chatQueue(chatUserReplies(rr, online), Date.now(), 5, 20);
    else { const n = 1 + (rr() < .4 ? 1 : 0); for (let k = 0; k < n; k++) chatQueue(chatBuild(rr, online), Date.now() + k * 90000); }
  } finally { chatBusy = false; }
}
// scripted answers when you post (they can't really read it, so they keep it general)
function chatUserReplies(rr, online){
  const last = CHATS.msgs[CHATS.msgs.length - 1], t = last ? last.text.toLowerCase() : '', me = myName();
  if (!online.length || rr() < .15) return [];
  const sets = /exam|test|midterm|final|quiz/.test(t) ? ['good luck!!', 'you got this', 'what class?', 'same, mine\'s friday']
    : /tired|sleep|exhausted|nap/.test(t) ? ['same', 'take a 20 min nap', 'coffee time', 'go to bed lol']
    : /^(hi|hey|hello|yo|sup)\b/.test(t) ? ['hey', 'yo', `hi ${me}`, 'welcome back']
    : /\?\s*$/.test(t) ? ['good question', 'honestly depends', 'idk but i want to know too', 'active recall, always']
    : /ranked|elo|match|won|lost|gg/.test(t) ? ['gg', 'nice', 'queue me next', 'i\'m coming for you']
    : ['lol', 'fr', 'same', 'true', 'real', 'facts'];
  const a = cpk(rr, online), out = [{w: a, text: cpk(rr, sets), re: last ? last.id : null}];
  if (rr() < .35 && online.length > 1){ const b = cpk(rr, online.filter(x => x !== a)); out.push({w: b, text: cpk(rr, ['^', 'this', 'agreed', 'lol']), re: 0}); }
  return out;
}

/* ---- the clock: release messages when they're due, start new conversation, catch up after being away ---- */
function chatTick(){
  if (!RK_READY) return;
  const now = Date.now();
  if (!chatStarted){ chatStarted = true; chatCatchUp(); }
  let fresh = [];
  while (CHATS.q.length && CHATS.q[0].t <= now){ const m = CHATS.q.shift(); CHATS.msgs.push(m); fresh.push(m); }
  if (fresh.length){
    CHATS.msgs.sort((a, b) => a.t - b.t); saveChat();
    if (chatPageOpen()){ CHATS.read = now; renderChat(); } else chatPreview(fresh.filter(m => m.w !== -1).pop());
    chatBadge();
  }
  if (document.hidden) return;                                // a tab in the background just delivers; it doesn't write new chat
  if (now - (CHATS.seen || 0) > 8 * 60000 && CHATS.seen) chatCatchUp();
  CHATS.seen = now;
  if (!CHATS.q.length && now >= (CHATS.next || 0)){
    CHATS.next = now + (180 + Math.random() * 180) * 1000; saveChat();
    chatGenerate(false);
  }
}
function chatCatchUp(){
  const now = Date.now(), away = now - (CHATS.seen || 0);
  CHATS.q = CHATS.q.filter(m => m.t > now - 6 * 3600e3);      // anything that was due while away is just there now
  if (CHATS.seen && away > 8 * 60000){
    const from = Math.max(CHATS.seen, now - 6 * 3600e3), span = now - from, n = Math.min(10, Math.max(1, Math.round(span / (25 * 60000))));
    const rr = mulberry32(now % 2147483647), online = chatWhoOnline();
    for (let k = 0; k < n; k++){
      const at = from + span * (k + rr() * .6) / n, b = chatBuild(rr, online);
      let t = at; const ids = [];
      b.forEach((m, j) => { t += (j ? 15 + rr() * 60 : 0) * 1000; const id = chatId() + 'a' + k + j; ids.push(id); if (t < now) CHATS.msgs.push({id, t: Math.round(t), w: m.w, text: m.text, re: m.re >= 0 ? ids[m.re] : null}); });
    }
    CHATS.msgs.sort((a, b) => a.t - b.t);
  }
  if (!CHATS.msgs.length){                                     // first visit: the room was already talking
    const rr = mulberry32(now % 2147483647), online = chatWhoOnline();
    [0, 1].forEach(k => { let t = now - (14 - k * 7) * 60000; const ids = [];
      chatBuild(rr, online).forEach((m, j) => { t += (j ? 20 + rr() * 50 : 0) * 1000; const id = chatId() + 's' + k + j; ids.push(id); CHATS.msgs.push({id, t: Math.round(t), w: m.w, text: m.text, re: m.re >= 0 ? ids[m.re] : null}); }); });
    CHATS.msgs.sort((a, b) => a.t - b.t); CHATS.read = now;
  }
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
    ${r ? `<div class="ch-re">↪ <b>${esc(chatName(r.w))}</b> ${esc(r.text.length > 70 ? r.text.slice(0, 70) + '…' : r.text)}</div>` : ''}
    <p>${esc(m.text)}</p></div></div>`;
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
      <form class="ch-send" id="chatForm"><input id="chatIn" maxlength="200" placeholder="Say something to the room" autocomplete="off" aria-label="Message"><button class="small-btn accent">Send</button></form>
      <p class="hint ch-hint" id="chatHint"></p></div>`;
  }
  $('#chatOnline').innerHTML = online.slice(0, 14).map(i => `<button class="ch-av" data-bot="${i}" title="${esc(bot(i).name)}">${avatar(bot(i))}</button>`).join('') + (online.length > 14 ? `<span class="hint">+${online.length - 14}</span>` : '');
  $('.ch-top small').innerHTML = `<i class="ch-on"></i>${online.length} online`;
  $('#chatList').innerHTML = rows || '<p class="hint ch-empty">It’s quiet. Say hi, or wait a minute for the regulars.</p>';
  $('#chatHint').innerHTML = GEM.key ? (GEM.err ? esc(GEM.err) : '') : 'Replies are scripted. Add a free Gemini key in <button class="link-btn" data-go="settings" data-sec="set-chat">Settings → Chat</button> for real conversation.';
  const L = $('#chatList'); if (nearBottom) L.scrollTop = L.scrollHeight;
}
function chatShown(name){
  if (name !== 'chat') { chatBadge(); return; }
  CHATS._shownRead = CHATS.read; CHATS.read = Date.now(); saveChat(); chatBadge();
  renderChat(); const L = $('#chatList'); if (L) L.scrollTop = L.scrollHeight;
}
const _onPageShown = onPageShown;
onPageShown = function(name){ _onPageShown(name); chatShown(name); };
$('#page-chat').addEventListener('submit', e => {
  if (e.target.id !== 'chatForm') return; e.preventDefault();
  const inp = $('#chatIn'), text = inp.value.replace(/\s+/g, ' ').trim(); if (!text) return;
  inp.value = '';
  CHATS.msgs.push({id: chatId(), t: Date.now(), w: -1, text}); CHATS.read = Date.now(); saveChat(); renderChat();
  CHATS.q = CHATS.q.filter(m => m.t > Date.now() + 20000);   // the room pauses to answer you
  setTimeout(() => chatGenerate(true), 600 + Math.random() * 1200);
});
$('#page-chat').addEventListener('click', e => {
  const b = e.target.closest('[data-bot], [data-me]'); if (!b) return;
  if (b.dataset.me) openProfile(ME); else openProfile(+b.dataset.bot);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && chatPageOpen()){ CHATS.read = Date.now(); saveChat(); chatBadge(); } });

/* ---- Settings > Chat ---- */
function renderChatSettings(){
  const el = $('#chatSetBody'); if (!el) return;
  el.innerHTML = `<p class="lead">The global chat runs on its own. With a free Gemini key, the players write real conversation and answer what you say; without one, the chat is scripted.</p>
    ${GEM.key ? `<div class="sync-status ${GEM.err ? 'bad' : ''}"><span class="sync-dot${GEM.err ? ' off' : ''}"></span><span><b>${GEM.err ? esc(GEM.err) : 'Gemini is on'}</b><small>${GEM.model ? `Model: ${esc(GEM.model)}` : 'Not used yet'}${GEM.ok ? ` · last used ${syncAgo(GEM.ok)}` : ''}</small></span></div>
      <div class="confirm"><button class="small-btn" id="aiTest">Test it</button><button class="small-btn" id="aiOff">Remove key</button></div>`
    : `<ol class="sync-steps"><li><b>Get a free key.</b> <a class="small-btn" href="${GEMINI_KEY_URL}" target="_blank" rel="noopener">Google GEM Studio ↗</a><small class="hint">Sign in with Google, click <b>Create API key</b>, and copy it. The free tier is plenty for the chat; nothing is charged.</small></li>
      <li><b>Paste it here.</b><span class="sync-row"><input type="password" id="aiKey" placeholder="Paste your Gemini API key" autocomplete="off" spellcheck="false" aria-label="Gemini API key"><button class="small-btn accent" id="aiSave">Save</button></span><small class="hint">It stays in this browser only. Paste it on each device you use.</small></li></ol>`}
    <div class="row"><label for="chatPopOn">Message previews<span class="sub">A small pop-up for new messages, only during breaks or with the timer stopped</span></label><input type="checkbox" id="chatPopOn" ${P.chatPop !== false ? 'checked' : ''}></div>
    <div class="confirm"><button class="small-btn" id="chatClear">Clear chat history</button></div>`;
}
async function aiTest(){
  const b = $('#aiTest') || $('#aiSave'); if (b){ b.disabled = true; b.textContent = 'Checking…'; }
  try {
    const out = await aiCall('Reply with JSON only.', 'Return {"messages":[{"from":"test","text":"ok"}]}');
    GEM.err = null; GEM.wait = 0; GEM.ok = Date.now(); saveAI(); toast(`Gemini works (${GEM.model}).`); return Array.isArray(out);
  } catch(e){
    GEM.err = e.kind === 'key' ? 'Gemini didn’t accept that key.' : e.kind === 'busy' ? 'Gemini’s free limit is used up for now.' : e.kind === 'offline' ? 'Couldn’t reach Gemini.' : 'Gemini had a problem.';
    saveAI(); toast(GEM.err); return false;
  } finally { renderChatSettings(); }
}
$('#page-settings').addEventListener('click', async e => {
  const b = e.target.closest('#aiSave, #aiTest, #aiOff, #chatClear'); if (!b) return;
  if (b.id === 'aiSave'){
    // any key format Google issues is fine: the test call below is what decides whether it works
    const k = ($('#aiKey').value || '').replace(/^[\s"'`]+|[\s"'`]+$/g, '').replace(/\s+/g, '');
    if (k.length < 20){ toast('That key looks too short. Copy the whole key from Google AI Studio.'); return; }
    GEM = {key: k}; saveAI();
    if (!(await aiTest())){ GEM = {}; saveAI(); renderChatSettings(); }
  }
  else if (b.id === 'aiTest') aiTest();
  else if (b.id === 'aiOff'){ GEM = {}; saveAI(); renderChatSettings(); toast('Key removed. The chat is scripted now.'); }
  else if (b.id === 'chatClear'){
    if (!b.dataset.sure){ b.dataset.sure = 1; b.textContent = 'Click again to clear'; setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.textContent = 'Clear chat history'; } }, 3500); return; }
    CHATS = {msgs: [], q: [], read: Date.now(), seen: Date.now(), next: 0}; saveChat(); chatBadge(); toast('Chat cleared.');
  }
});
$('#page-settings').addEventListener('change', e => { if (e.target.id === 'chatPopOn'){ P.chatPop = e.target.checked; saveP(); } });
$('#page-settings').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'aiKey') $('#aiSave').click(); });
renderChatSettings(); chatBadge();
