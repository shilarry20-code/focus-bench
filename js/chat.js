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
// 3.5 Flash-Lite first; when its free daily allowance is used up, 3.1 Flash-Lite until the daily reset (midnight Pacific).
// (The 2.5 models only allow about 20 free requests a day, so they're not used.)
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
const MODEL_NAMES = {'gemini-3.5-flash-lite': '3.5 Flash-Lite', 'gemini-3.1-flash-lite': '3.1 Flash-Lite'};
const PT_FMT = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Los_Angeles', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'});
const ptParts = () => { const p = {}; for (const x of PT_FMT.formatToParts(new Date())) p[x.type] = x.value; return p; };
const ptDay = () => { const p = ptParts(); return `${p.year}-${p.month}-${p.day}`; };
// Google's daily counts start over at midnight Pacific time
function ptResetAt(){ const p = ptParts(); return Date.now() - (((+p.hour % 24) * 3600 + +p.minute * 60 + +p.second) * 1000) + 864e5 + 60000; }
const modelOut = m => !!(GEM.out && GEM.out[m] > Date.now());
function countRequest(m){ if (!GEM.cnt || GEM.cnt.day !== ptDay()) GEM.cnt = {day: ptDay(), n: {}}; GEM.cnt.n[m] = (GEM.cnt.n[m] || 0) + 1; }
// after a failed request: how long to wait before trying again
function aiBackoff(e){ return e.until ? e.until : Date.now() + (e.kind === 'busy' ? (e.short ? 1 : 15) : e.kind === 'key' ? 60 * 24 : e.kind === 'offline' ? 1 : 5) * 60000; }
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
// each player's emoji habit, fixed by their number: about 3 in 10 never use them, half sometimes, 2 in 10 often
const emojiHabit = i => { const h = (Math.imul(i + 1, 2654435761) >>> 0) % 10; return h < 3 ? 'never' : h < 8 ? 'sometimes' : 'often'; };
const emojiStyle = i => emojiHabit(i);
// how emojis get chosen, for every prompt: by what the message means, from the whole range, never a personal list
const EMO_RULE = 'Emoji habits (next to each name) say how often someone uses emojis: "never" means none, "sometimes" about one message in four, "often" about every other message. Add one only when it shows the feeling of that exact message, the way a real person would: laughing at something funny, sympathy for a rough day, hype for good news, shock, embarrassment, love. Use the plain, obvious emoji most people would pick for that feeling; don’t reach for unusual ones, and don’t add one just to have one. If you can’t say what feeling it adds, leave it out. Never use emojis to illustrate words (no 🍪 for cookies, 📚 for studying).';
// your opponent in a live match is studying against you, so they're not in the room
const inMatchWith = () => R && R.cur && R.cur.state === 'live' && !R.cur.tapped ? R.cur.b : -1;
// someone you just played sticks around for a while afterwards (20 to 45 min, the same for each match)
function justPlayed(){
  const out = [], now = Date.now();
  for (const h of (R && R.hist) || []){
    if (now - h.t > 45 * 60000) break;
    if (typeof h.b === 'number' && h.b >= 0 && now - h.t < (20 + (h.t % 26)) * 60000 && !out.includes(h.b)) out.push(h.b);
  }
  return out;
}
function chatWhoOnline(){
  const opp = inMatchWith(), base = chatWhoOnline0(), extra = justPlayed().filter(i => !base.includes(i));
  return base.concat(extra).filter(i => i !== opp);
}
function chatWhoOnline0(){
  if (chatOnline && Date.now() - chatOnlineAt < 180000) return chatOnline;
  const h = new Date().getHours(), hh = h < 5 ? h + 24 : h, today = dayKey(Date.now()), rr = mulberry32(Math.floor(Date.now() / 1800000));
  const out = [];
  chatRegulars().forEach(i => {
    const B = bot(i), pk = PEAKS[B.peak] || [9, 22], inPeak = hh >= pk[0] && hh < pk[1];
    let live = false; try { const d = botDay(i, today); live = !!(d && d.sessions.some(x => x.live)); } catch(e){}
    if (live || (inPeak && rr() < .12)) out.push(i);
  });
  chatOnline = out.slice(0, 60); chatOnlineAt = Date.now();
  return chatOnline;
}
// what a player has going on: their last ranked result, rank, what they study
function chatFacts(i){
  const B = bot(i), r = botRating(i), rk = rankOf(r);
  let last = null; try { const m = m5List(i)[0]; if (m && Date.now() - m.t < 6 * 3600e3) last = m; } catch(e){}
  return {i, name: B.name, rank: rk.full, r, style: B.style, peak: B.peak, subj: `${B.subject} major, taking ${(() => { try { return botClasses(i).join(', '); } catch(e){ return B.subject; } })()}`, bio: B.bio,
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
/* topics: each batch gets 2-3 fresh things on people's minds, never one of the last 30 handed out, so the room keeps moving */
const ROOM_TOPICS = [
  // everyday life
  'someone’s roommate keeps eating their food', 'a laundry room disaster', 'someone slept through all their alarms today', 'a terrible haircut', 'a weird dream someone had last night',
  'someone locked themselves out', 'a group project partner who vanished', 'someone got a parking ticket', 'the dorm/apartment heater is broken', 'someone finally cleaned their room',
  'a surprise visit from parents this weekend', 'someone’s phone screen just cracked', 'a fire alarm went off at 3 am', 'someone is trying to fix their sleep schedule', 'getting sick right before a deadline',
  // food
  'the best and worst dining hall meals this week', 'a cooking attempt that went badly', 'a late-night food run', 'a hot take on pineapple pizza', 'the best cheap snack',
  'someone discovered a new restaurant near campus', 'meal prepping for the week', 'coffee vs energy drinks', 'a ramen upgrade hack', 'what to order for a group dinner',
  // school
  'a professor with a strange habit', 'a quiz nobody saw coming', 'the worst 8 am class', 'picking classes for next semester', 'a lecture that was actually good',
  'office hours horror story', 'someone switched majors', 'a group chat for a class going off the rails', 'a TA who grades way too hard', 'internship applications',
  // money and jobs
  'someone’s part-time job shift was chaos', 'saving up for something specific', 'textbook prices', 'a subscription someone forgot to cancel', 'splitting rent or bills with roommates',
  // campus and plans
  'weekend plans', 'a campus event happening soon', 'the weather today', 'going home for break', 'a road trip idea',
  'trying out for an intramural team', 'a club meeting that got weird', 'the gym being packed', 'a concert someone wants to go to', 'where to study besides the library',
  // hot takes and games
  'is a hot dog a sandwich', 'a would-you-rather question', 'what you’d do with $10,000', 'the most overrated thing on campus', 'an unpopular opinion about a popular food',
  'rank the seasons', 'the best decade for music', 'cats vs dogs', 'a superpower debate', 'what they’d bring to a deserted island',
  // media, games, sports (be specific)
  'a show someone just finished (name it)', 'an album or artist on repeat (name it)', 'a video game someone can’t put down (name it)', 'a movie that was way better or worse than expected (name it)', 'a sports team someone follows (name it)',
  'a YouTuber or streamer they watch (name them)', 'a comfort show someone rewatches (name it)', 'a song that’s been stuck in someone’s head (name it, no lyrics)', 'a book someone is reading for fun (name it)', 'a mobile game someone is addicted to (name it)',
  // random
  'a random fun fact someone just learned', 'a childhood memory that came up', 'a new hobby someone picked up', 'a pet back home', 'a holiday tradition',
  'the best and worst gifts ever received', 'something embarrassing that happened in public', 'a skill someone wishes they had', 'a goal for the rest of the semester', 'a hometown thing nobody else gets',
];
function chatTopicPick(n){
  const used = new Set(CHATS.topics || []), fresh = ROOM_TOPICS.filter(t => !used.has(t));
  const pool = (fresh.length >= n ? fresh : ROOM_TOPICS).slice().sort(() => Math.random() - .5), out = [];
  for (const t of pool){ if (out.length >= n) break; if (/name (it|them)/.test(t) && out.some(x => /name (it|them)/.test(x))) continue; out.push(t); }
  CHATS.topics = (CHATS.topics || []).concat(out).slice(-30);
  return out;
}
let chatWilling = [];      // [{i, mode}] players who'd send you a challenge if you ask, decided for this reply
function chatChallengeNote(cast){
  chatWilling = [];
  if (typeof chAcceptP !== 'function' || !R.on || matchBusy()) return '';
  cast.forEach(f => {
    if (dmStudying(f.i) || pendingCh(f.i)) return;
    if (Math.random() < chAcceptP(f.i, 'r')) chatWilling.push({i: f.i, mode: 'r'});
    else if (Math.random() < chAcceptP(f.i, 'f')) chatWilling.push({i: f.i, mode: 'f'});
  });
  const me = myName();
  if (!chatWilling.length) return `If ${me} is asking for a match or a challenge, nobody here is up for one right now: they can say so, but nobody sends one.\n`;
  return `If ${me} is asking for a match or a challenge, these players are up for it: ${chatWilling.map(x => `${bot(x.i).name} (${x.mode === 'r' ? 'ranked' : 'friendly only'})`).join(', ')}. One or two of them can say yes, and each one who does sends ${me} a challenge: for each, add an extra item with "from": "ACTION" and "text": "<their name>: ranked" or "<their name>: friendly". Never say a challenge was sent without that item. If ${me} isn't asking to play, add no ACTION items.\n`;
}
function aiPrompt(online, forUser, away){
  const now = new Date(), sem = semesterOf(now), people = online.slice(0, 12);
  if (forUser){ const mine = CHATS.msgs[CHATS.msgs.length - 1], to = mine && mine.re && CHATS.msgs.find(x => x.id === mine.re); if (to && to.w !== -1 && to.w !== inMatchWith() && !people.includes(to.w)) people.unshift(to.w); }
  const cast = people.map(chatFacts);
  // you're only part of the conversation if you've been talking lately; otherwise your old messages and your name stay out of it
  const userHere = forUser || CHATS.msgs.some(m => m.w === -1 && !m.del && Date.now() - m.t < 15 * 60000);
  const recent = CHATS.msgs.filter(m => !m.del && (userHere || m.w !== -1)).slice(-16), tag = new Map(recent.map((m, k) => [m.id, 'm' + (k + 1)]));
  const sys = `You write messages for the global chat room of Focus Bench, a study-timer app used by college students. Players track focus sessions and play ranked matches (whoever studies longer wins and gains Elo).
This is a general hangout room: people can talk about anything, like any group chat of college students. Studying, exams and ranked matches come up now and then because of where they are. Don't tack study talk onto other messages (no \"back to studying\", \"gotta grind\", \"locking in\").
People talk about what's on their mind; each batch you'll get a few things on people's minds right now, so the room doesn't go in circles. If they mention a show, movie, song, game, team or anything like that, they name the real thing rather than a vague "that show". Don't quote song lyrics. Something a model might think of as "new" may be old by now (see today's date): only call things new or upcoming if you're sure they still are. Don't reuse a line or a topic someone already used.
A new topic is just a new message that starts on its own: no bridges like "speaking of…", "on that note", "that reminds me", "random but" or "unrelated but".
Most messages are not replies: only set replyTo when the message directly answers or reacts to that exact message. A reply must respond to what that message actually said; if someone changes the subject, it's a new message, not a reply.
Write like a real group chat: casual texting style (lowercase is fine, contractions, slang, not formal full sentences), mostly short, with only the odd longer message. A reply is already shown as a reply, so don't start it with the other person's name; use names only now and then, the way people really do. with each player keeping their own personality and interests. Players mostly talk to each other: they answer questions, tease each other, disagree, change the subject, and continue threads already in the chat.
Each player has their own emoji habit (given next to their name): \"often\" uses emojis in a lot of messages, \"sometimes\" now and then, \"never\" not at all; at most a couple per message. ${EMO_RULE} Keep it friendly and appropriate: no explicit content, no slurs or harassment, nothing hateful. Never mention AI or that anyone is simulated. Only use player names from the list. ${userHere ? `"${myName()}" is also in the room; only talk to or mention them when answering one of their messages.` : 'Only the listed players are in this conversation: never address, @mention or reply to anyone else.'}`;
  const lastK = Math.floor(Math.random() * cast.length * 3);    // mention one player's last match only sometimes, so ranked isn't always the topic
  const who = cast.map((f, k) => `- ${f.name}: ${f.rank}, ${f.subj}, emojis: ${emojiStyle(f.i)}${f.last && k === lastK ? `; just ${f.last.won ? 'beat' : 'lost to'} ${f.last.opp} in ranked (${f.last.mine} vs ${f.last.theirs} min)` : ''}`).join('\n');
  const hist = recent.map((m, k) => `[m${k + 1}] ${chatName(m.w)}: ${m.text}${m.re && tag.has(m.re) ? ` (replying to ${tag.get(m.re)})` : ''}`).join('\n') || '(the chat is quiet)';
  const older = CHATS.msgs.filter(m => !m.del && m.t > Date.now() - 6 * 3600e3 && !recent.includes(m)).slice(-60);
  const user = `It's ${now.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})}, ${now.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}, week ${sem.wk + 1} of the semester${sem.exam ? `, ${sem.exam.toLowerCase()} season` : ''}.
Players online (background only; most messages shouldn't be about it):
${who}

${older.length ? `Already said in the room earlier today (don't repeat these or bring the same things up again as if they were new):
${older.map(m => '- ' + m.text.slice(0, 90)).join('\n')}

` : ''}${forUser ? '' : `On people's minds right now (build most of this batch around these, in your own words, with real details; don't repeat older threads): ${chatTopicPick(Math.random() < .5 ? 2 : 3).join('; ')}.

`}Recent chat, oldest first:
${hist}

${forUser ? (() => { const mine = recent[recent.length - 1], to = mine && mine.re && CHATS.msgs.find(x => x.id === mine.re);
    let run = 0; for (let k = recent.length - 1; k >= 0 && recent[k].w === -1; k--) run++;
    const several = run > 1 ? ` ${myName()} sent the last ${run} messages in a row (m${recent.length - run + 1} to m${recent.length}): answer them together, not one by one.` : '';
    return `The newest message is from ${myName()} (m${recent.length})${to && to.w !== -1 ? `, replying to ${chatName(to.w)}` : ''}.${several} ${(() => { const u = Math.random(), n = u < .38 ? 1 : u < .62 ? 2 : u < .8 ? 3 : u < .93 ? 4 : 5;     // how many people jump in varies, like a real room
      return `Exactly ${n} different player${n > 1 ? 's' : ''} answer${n > 1 ? '' : 's'} ${myName()} (replyTo "m${recent.length}")${to && to.w !== -1 ? `, starting with ${chatName(to.w)}` : ''}${n > 2 ? '; some can just react in a word or two' : ''}. Write ${n} to ${n + 2} messages in all: the rest can be follow-ups between those players or others keeping their own conversation going.`; })()}`; })()
  : away ? `The room kept going for the last ${Math.round((Date.now() - away.from) / 60000)} minutes. Write 6 to 10 messages the room exchanged during that time, continuing the chat above: threads, replies, and whatever else people brought up.`
  : 'Write 6 to 9 new messages continuing this chat. Continue or answer threads above, or let someone change the subject to whatever is on their mind.'}
${forUser ? chatChallengeNote(cast) : ''}For replyTo use the id of the message being answered: "m#" from the recent chat, or "n1", "n2"… for the new messages in your list. Leave it out when a message isn't a reply.`;
  return {sys, user, recent, cast, userHere};
}
// Tries the models in order. For each, it first asks for JSON in an exact shape; if Gemini refuses that request
// (some models or keys don't take a schema), it asks again more loosely and pulls the JSON out of the text.
// GEM.detail keeps Google's own error message so Settings can show what went wrong.
// `more`: extra fields each message may carry (e.g. reactions), added to the answer's shape
async function aiCall(sys, user, more){
  const models = GEMINI_MODELS.filter(m => !modelOut(m));
  if (!models.length){ const until = Math.min(...GEMINI_MODELS.map(m => GEM.out[m])); throw {kind: 'busy', until, msg: 'Both Gemini models have used up today’s free requests.'}; }
  const schema = {type: 'OBJECT', properties: {messages: {type: 'ARRAY', items: {type: 'OBJECT',
    properties: {from: {type: 'STRING'}, text: {type: 'STRING'}, replyTo: {type: 'STRING'}, ...(more || {})}, required: ['from', 'text']}}}, required: ['messages']};
  const configs = [{responseMimeType: 'application/json', responseSchema: schema}, {responseMimeType: 'application/json'}, {}];
  let last = null, busy = 0;
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
      if (r.status !== 429) countRequest(model);                    // Google counts every request that reaches it, retries and errors included
      let j = null; try { j = JSON.parse(raw); } catch(e){}
      const em = j && j.error ? `${j.error.status || r.status}: ${j.error.message || ''}` : `HTTP ${r.status}`;
      if (!r.ok){
        last = `${model} · ${em}`.slice(0, 260); GEM.detail = last;
        if (r.status === 429){
          // the day's allowance for this model is gone: switch to the next one until the reset; a per-minute limit just waits a minute
          if (/per ?day|PerDay|daily/i.test(em + ' ' + raw)){ GEM.out = GEM.out || {}; GEM.out[model] = ptResetAt(); const used = GEM.cnt && GEM.cnt.day === ptDay() ? GEM.cnt.n[model] || 0 : 0; if (used >= 20){ GEM.lim = GEM.lim || {}; GEM.lim[model] = used; } saveAI(); break; }
          throw {kind: 'busy', short: true, msg: last};
        }
        if (/API key|API_KEY|api_key|unauthenticated|credential/i.test(em) || r.status === 401) throw {kind: 'key', msg: last};
        if (r.status === 404 || /not found|not supported|is not available|unsupported model/i.test(em)) break;   // next model
        // Google's servers are overloaded (503) or erroring (5xx): asking again in a different shape won't help, so go
        // straight to the next model, and if every model is overloaded, wait a few minutes before trying again
        if (r.status >= 500){ busy++; break; }
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
  if (busy && busy >= models.length) throw {kind: 'busy', over: 1, until: Date.now() + 4 * 60000, msg: `${last} (Google’s servers are busy; trying again in a few minutes)`};
  if (!GEMINI_MODELS.some(m => !modelOut(m))){ const until = Math.min(...GEMINI_MODELS.map(m => GEM.out[m])); throw {kind: 'busy', until, msg: 'Both Gemini models have used up today’s free requests.'}; }
  throw {kind: 'other', msg: last || 'No Gemini model answered'};
}
// turn Gemini's messages into chat messages, checking every name against the room
const normName = n => String(n || '').toLowerCase().replace(/^@/, '').replace(/[^a-z0-9]/g, '');
// "speaking of five am wake up calls, my professor…" → "my professor…": no lead-ins bridging to a new topic
// "NightFox_8, honestly…" → "honestly…": the reply already shows who it's for
function stripLeadName(text, names){
  for (const n of names){
    if (!n || n.length < 3) continue;
    const re = new RegExp('^@?' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,:!\\-–—]*\\s+', 'i');
    if (re.test(text)) return text.replace(re, '') || text;
  }
  return text;
}
// a message that's mostly the same words as one said in the last 6 hours (or earlier in this batch) is a repeat
const wordSet = t => new Set(String(t).toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
const STOP = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'just', 'but', 'you', 'your', 'are', 'was', 'have', 'its', "it's", 'not', 'all', 'can', 'out', 'like', 'get', 'got', 'too', 'what', 'how', 'any', 'one', 'now', 'lol', 'about', 'they', 'did', 'has', 'from', 'really', 'honestly', 'actually', 'anyone', 'guys']);
function chatRepeats(text, batch){
  const a = wordSet(text); if (a.size < 3) return false;
  const since = Date.now() - 6 * 3600e3;
  return CHATS.msgs.filter(m => m.t > since).concat(batch).some(m => {
    const b = wordSet(m.text); let both = 0; a.forEach(w => { if (b.has(w)) both++; });
    return both >= 3 && both / Math.min(a.size, b.size) >= .6;
  });
}
// a reply has to be about the message it answers: sharing a real word with it (same word stem), or a short reaction like "lol same"
const REACT = /^(lol|lmao|lmfao|haha|same|fr|real|true|facts|nah|no|yes|yeah|yep|bet|omg|wait|ok|okay|wdym|what|why|how|bruh|dead|nope|exactly|literally|right|ikr|w|l)\b/i;
function replyFits(text, target){
  if (!target) return false;
  const words = String(text).trim().split(/\s+/);
  if (words.length <= 5 || REACT.test(text.trim())) return true;
  const stem = w => w.replace(/'s$/, '').slice(0, 5), a = new Set([...wordSet(text)].map(stem));
  return [...wordSet(target)].some(w => a.has(stem(w)));
}
function aiToBatch(list, recent, cast, noYou){
  const out = [], pos = [], keys = cast.map(f => ({i: f.i, k: normName(f.name)}));
  let lastW = null;
  const who = from => {
    const k = normName(from); if (!k || !keys.length) return null;
    const hit = keys.find(x => x.k === k) || keys.find(x => x.k.startsWith(k) || k.startsWith(x.k)) || keys.find(x => k.length >= 4 && x.k.includes(k));
    if (hit) return hit.i;
    const others = keys.filter(x => x.i !== lastW);                     // a name Gemini made up: give the line to someone online
    return (others.length ? others : keys)[Math.floor(Math.random() * (others.length || keys.length))].i;
  };
  const nm = (P.myName || '').trim(), youRe = nm.length >= 3 ? new RegExp('(^|[^a-z0-9])@?' + nm.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)', 'i') : null;
  (Array.isArray(list) ? list : []).forEach((m, gi) => {
    pos[gi] = -1;
    const w = who(m && (m.from || m.name || m.player));
    let text = String((m && (m.text || m.message)) || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (w == null || !text) return;
    if (noYou && youRe && youRe.test(text)) return;
    if (chatRepeats(text, out)) return;
    text = stripLeadName(text, [...cast.map(f => f.name), myName()]);
    text = stripSegue(emotionOnly(text)); if (!text) return;
    let re = null; const id = String(m.replyTo || m.reply_to || '').trim().replace(/^#/, '');
    if (/^m?\d+$/.test(id) && !/^n/.test(id)){ const x = recent[+id.replace('m', '') - 1]; if (x) re = x.id; }
    else if (/^n\d+$/.test(id)){ const k = pos[+id.slice(1) - 1]; if (k != null && k >= 0) re = k; }
    if (noYou && re != null && typeof re !== 'number' && (recent.find(x => x.id === re) || {}).w === -1) re = null;
    if (re != null){ const tgt = typeof re === 'number' ? out[re] : recent.find(x => x.id === re); if (!replyFits(text, tgt && tgt.text)) re = null; }     // not about that message: post it on its own
    pos[gi] = out.length; out.push({w, text, re}); lastW = w;
  });
  return out;
}
// players who said yes in the room send their challenge to your Messages, just after their chat message
function chatSendChallenges(acts){
  if (typeof dmQueue !== 'function' || !R.on || matchBusy()) return;
  let n = 0;
  acts.forEach(a => {
    if (n >= 2) return;
    const [nm, md] = a.split(':').map(x => x.trim()), k = normName(nm);
    const x = chatWilling.find(c => normName(bot(c.i).name) === k) || chatWilling.find(c => k && normName(bot(c.i).name).startsWith(k));
    if (!x || pendingCh(x.i)) return;
    const mode = /friendly/i.test(md || '') || x.mode === 'f' ? 'f' : 'r';
    const said = CHATS.q.filter(m => m.w === x.i).pop(), at = (said ? said.t : Date.now()) + 2500 + n * 1500;
    dmQueue(x.i, at, [''], {ch: {mode, by: 'them'}}); n++;
  });
}
async function chatGenerate(forUser, away){
  if (chatBusy || !GEM.key || GEM.wait > Date.now()) return;
  chatBusy = true;
  try {
    const {sys, user, recent, cast, userHere} = aiPrompt(chatWhoOnline(), forUser, away);
    const raw = await aiCall(sys, user), acts = [], got = (Array.isArray(raw) ? raw : []).filter(m => { if (/^action$/i.test(String((m && m.from) || '').trim())){ acts.push(String(m.text || '')); return false; } return true; });
    const batch = aiToBatch(got, recent, cast, !userHere);
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
    } else chatQueue(batch, Date.now(), forUser ? 4 : chatPageOpen() ? 5 : 10, forUser ? 14 : chatPageOpen() ? 28 : 50);
    if (forUser && acts.length) chatSendChallenges(acts);
  } catch(e){
    GEM.last = {at: Date.now(), got: 0, used: 0, why: e.msg || (e.kind === 'offline' ? 'couldn’t reach Gemini' : e.kind)};
    GEM.err = e.kind === 'key' ? 'Gemini didn’t accept that key.' : e.kind === 'busy' ? (e.over ? null : e.until ? `Both models used up today’s free requests. The chat is quiet until ${new Date(e.until).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}.` : e.short ? null : 'Gemini’s free limit is used up for now. The chat is quiet until it resets.') : e.kind === 'offline' ? null : 'Gemini had a problem. The chat is quiet for a bit.';
    if (e.msg) GEM.detail = e.msg;
    GEM.wait = aiBackoff(e);
    if (e.kind === 'offline') CHATS.next = GEM.wait;
    saveAI();
  } finally { chatBusy = false; renderChatSettings(); renderChat(); }
}

/* ---- the clock: release messages when they're due, start new conversation, catch up after being away ---- */
function chatTick(){
  return;                 // global chat was replaced by the Feed
  if (!RK_READY) return;
  const now = Date.now();
  if (!chatStarted){
    if (SYNC.token && !syncFirstDone && now - chatLoadT < 20000) return;   // let the other device's messages arrive first
    chatStarted = true; chatCatchUp();
  }
  let fresh = [];
  const opp = inMatchWith(); if (opp >= 0 && CHATS.q.some(m => m.w === opp)) CHATS.q = CHATS.q.filter(m => m.w !== opp);
  while (CHATS.q.length && CHATS.q[0].t <= now){ const m = CHATS.q.shift(); CHATS.msgs.push(m); fresh.push(m); }
  if (fresh.length){
    CHATS.msgs.sort((a, b) => a.t - b.t); saveChat();
    if (chatPageOpen() && (typeof CHAT_TAB === 'undefined' || CHAT_TAB !== 'dm')){ CHATS.read = now; renderChat(); } else chatPreview(fresh.filter(m => m.w !== -1).pop());
    chatBadge();
  }
  if (document.hidden) return;                                // a tab in the background just delivers; it doesn't write new chat
  if (now - Math.max(CHATS.seen || 0, CHATS.msgs.length ? CHATS.msgs[CHATS.msgs.length - 1].t : 0) > 8 * 60000 && CHATS.seen) chatCatchUp();
  CHATS.seen = now;
  if (GEM.key && !CHATS.msgs.length && !CHATS.q.length && !chatBusy && !(GEM.wait > now)) CHATS.next = 0;
  // while you're watching the room it keeps flowing: the next stretch starts about a minute after the last
  // message (at most one request every 75 s); on other pages it's every 3 to 6 minutes
  const lastT = CHATS.msgs.length ? CHATS.msgs[CHATS.msgs.length - 1].t : 0;
  if (chatPageOpen() && GEM.key && !CHATS.q.length && !chatBusy && !(GEM.wait > now) && now - lastT > 45000 + Math.random() * 30000 && now - (chatLastReq || 0) > 75000) CHATS.next = 0;
  if (!CHATS.q.length && now >= (CHATS.next || 0)){
    CHATS.next = now + (180 + Math.random() * 180) * 1000; chatLastReq = now; saveChat();
    chatGenerate(false);
  }
  if (chatPageOpen() && $('#chatList') && $('#chatList').children.length !== CHATS.msgs.filter(m => !m.del).length + ($('#chatList .ch-new') ? 1 : 0) && CHATS.msgs.length) renderChat();
}
let chatLastReq = 0;
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
    ${r ? `<button class="ch-re" data-jump="${r.id}" title="Go to this message">${r.del ? '<i>Deleted message</i>' : `<b>${esc(chatName(r.w))}</b> ${esc(r.text.length > 70 ? r.text.slice(0, 70) + '…' : r.text)}`}</button>` : ''}
    <p>${atLinks(esc(m.text))}</p></div>
    <button class="ch-reply" data-reply="${m.id}" aria-label="Reply to ${esc(chatName(m.w))}" title="Reply"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/></svg></button>${me ? `<button class="ch-reply ch-del" data-del="${m.id}" aria-label="Delete message" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>` : ''}</div>`;
}
function renderChat(){
  const el = $('#chatBody'); if (!el || $('#page-chat').hidden) return;
  if (!RK_READY){ el.innerHTML = '<p class="hint">Loading players…</p>'; return; }
  const list = $('#chatList'), nearBottom = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  const online = chatWhoOnline(), byId = new Map(CHATS.msgs.map(m => [m.id, m])), readAt = CHATS._shownRead || CHATS.read || 0;
  let divider = false;
  const rows = CHATS.msgs.filter(m => !m.del).map(m => { let d = ''; if (!divider && m.t > readAt && m.w !== -1 && CHATS.msgs[0] !== m){ divider = true; d = '<div class="ch-new"><span>New</span></div>'; } return d + chatMsgHtml(m, byId); }).join('');
  if (!list){
    el.innerHTML = `<div class="card ch-card"><div class="ch-top"><div><b>Global chat</b><small><i class="ch-on"></i>${online.length} online</small></div><div class="ch-online" id="chatOnline"></div></div>
      <div class="ch-list" id="chatList"></div>
      <div class="ch-typing" id="chatTyping" aria-live="polite"></div>
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
  chatLive();
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
let chatReplyTo = null, chatReplyT = null;
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
  if (focusing()) return;
  const inp = $('#chatIn'), text = inp.value.replace(/\s+/g, ' ').trim(); if (!text) return;
  inp.value = '';
  CHATS.msgs.push({id: chatId(), t: Date.now(), w: -1, text, re: chatReplyTo}); CHATS.read = Date.now(); setChatReply(null); saveChat(); renderChat();
  CHATS.q = CHATS.q.filter(m => m.t > Date.now() + 20000);   // the room pauses to answer you
  clearTimeout(chatReplyT);
  if (GEM.key) chatReplyT = setTimeout(function go(){ if (chatBusy){ chatReplyT = setTimeout(go, 1500); return; } chatGenerate(true); }, 3500);
});
// tapping the quoted message in a reply jumps up to it
function chatJump(id){
  const el = document.querySelector(`#chatList .ch-msg[data-id="${id}"]`);
  if (!el){ toast('That message is no longer in the chat.'); return; }
  el.scrollIntoView({block: 'center', behavior: motion() === 'off' ? 'auto' : 'smooth'});
  el.classList.remove('jumped'); void el.offsetWidth; el.classList.add('jumped');
}
// deleting your own message: tap the bin, then tap again to confirm
function chatDelBtn(b, done){
  if (!b.dataset.sure){ b.dataset.sure = 1; b.classList.add('sure'); b.title = 'Tap again to delete'; setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.classList.remove('sure'); b.title = 'Delete'; } }, 3000); return; }
  done();
}
$('#page-chat').addEventListener('click', e => {
  const j = e.target.closest('[data-jump]'); if (j && !e.target.closest('.dm-card')){ chatJump(j.dataset.jump); return; }
  const dl = e.target.closest('[data-del]');
  if (dl && !e.target.closest('.dm-card')){ chatDelBtn(dl, () => { const m = CHATS.msgs.find(x => x.id === dl.dataset.del); if (m && m.w === -1){ m.del = 1; m.text = ''; if (chatReplyTo === m.id) setChatReply(null); saveChat(); renderChat(); } }); return; }
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

/* ---- "X is typing": a queued message shows its writer typing for a few seconds before it lands,
   longer for longer messages. Shared with direct messages. ---- */
const typeMs = text => Math.min(7000, 1600 + String(text || '').length * 55);
const typingNow = q => { const now = Date.now(), seen = new Set(), out = [];
  q.forEach(m => { if (m.w >= 0 && m.t > now && m.t - typeMs(m.text) <= now && !seen.has(m.w)){ seen.add(m.w); out.push(m.w); } }); return out; };
function typingHtml(ws){
  if (!ws.length) return '';
  const n = ws.map(w => `<b>${esc(bot(w).name)}</b>`);
  const who = ws.length === 1 ? `${n[0]} is typing` : ws.length === 2 ? `${n[0]} and ${n[1]} are typing` : ws.length === 3 ? `${n[0]}, ${n[1]} and ${n[2]} are typing` : 'Several people are typing';
  return `<span class="ty-avs">${ws.slice(0, 3).map(w => avatar(bot(w), 'sm')).join('')}</span><span class="ty-txt">${who}</span><span class="ty-dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
}
// the send box is closed during a focus block and opens on breaks, when paused and when stopped
function chatLockInput(inp, btn){
  if (!inp) return;
  const lock = focusing();
  if (inp.disabled !== lock){ inp.disabled = lock; if (btn) btn.disabled = lock; inp.placeholder = lock ? 'Chat opens on your break' : inp.dataset.ph || inp.placeholder; }
}
function chatLive(){
  const t = $('#chatTyping'); if (!t) return;
  const ws = typingNow(CHATS.q), key = ws.join(',');
  if (t.dataset.k !== key){ t.dataset.k = key; t.innerHTML = typingHtml(ws); t.classList.toggle('on', !!ws.length); }
  const inp = $('#chatIn'); if (inp && !inp.dataset.ph) inp.dataset.ph = inp.placeholder;
  chatLockInput(inp, $('#chatForm button'));
}
setInterval(() => { if (chatPageOpen()) chatLive(); }, 500);

/* ---- Settings > Chat ---- */
// requests this device has sent today, per model (Google's limit counts every device using your key)
function aiUsageHtml(){
  const n = typeof aiTotals === 'function' ? aiTotals() : GEM.cnt && GEM.cnt.day === ptDay() ? GEM.cnt.n : {}, reset = new Date(ptResetAt() - 60000).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
  return `<div class="ai-usage"><div class="h">Gemini requests today</div>${GEMINI_MODELS.map(m => { const c = n[m] || 0, out = modelOut(m);
    return `<div class="ai-u-row"><span>${MODEL_NAMES[m]}${m === GEMINI_MODELS[0] ? ' <small class="hint">(used first)</small>' : ''}</span><span class="bar2"><i style="width:${Math.min(100, c / ((GEM.lim && GEM.lim[m]) || 500) * 100)}%"></i></span><b>${out ? 'used up' : `${c} / ${GEM.lim && GEM.lim[m] ? GEM.lim[m] : '~500'}`}</b></div>`; }).join('')}
    <p class="hint">${typeof cbSyncOn === 'function' && cbSyncOn() ? 'All your devices together (through gist sync) plus overnight runs, retries and errors included.' : 'This device only (turn on gist sync to add your other devices), retries and errors included.'} Resets at ${reset}.</p></div>`;
}
function renderChatSettings(){
  const el = $('#chatSetBody'); if (!el) return;
  el.innerHTML = `<p class="lead">Gemini writes what the players say: Feed captions and comments, DMs and match chat. It needs a free Gemini key; without one they stay quiet.</p>
    ${GEM.key ? `<div class="sync-status ${GEM.err ? 'bad' : ''}"><span class="sync-dot${GEM.err ? ' off' : ''}"></span><span><b>${GEM.err ? esc(GEM.err) : 'Gemini is on'}</b><small>${GEM.model ? `Model: ${esc(GEM.model)}` : 'Not used yet'}${GEM.ok ? ` · last used ${syncAgo(GEM.ok)}` : ''}</small></span></div>
      ${GEM.err && GEM.detail ? `<p class="hint ai-detail">Google said: <code>${esc(GEM.detail)}</code></p>` : ''}
      ${GEM.last ? `<p class="hint ai-detail">Last chat request ${syncAgo(GEM.last.at)}: ${GEM.last.used ? `${GEM.last.got} message${GEM.last.got === 1 ? '' : 's'}, ${GEM.last.used} used` : esc(GEM.last.why || 'nothing came back')}.</p>` : ''}
      ${aiUsageHtml()}
      ${typeof cbSettingsHtml === 'function' ? cbSettingsHtml() : ''}
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
