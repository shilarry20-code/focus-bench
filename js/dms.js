/* ---------- direct messages and match challenges ----------
   A "Messages" tab next to the global room. You can message anyone from their profile; Gemini writes their
   replies in their own voice, knowing your head-to-head record, your last match, their rank and what they study.
   Players can also send you something on their own, but rarely: after a match (more likely when it was close, an
   upset, a rivalry or a big Elo swing; less likely after a blowout), light trash talk from a rival, or a
   challenge from someone online near your rating. Nobody sends a second message while their last one is
   unanswered, and nothing new arrives during a focus block.
   Challenges are cards with a countdown (15 min for yours, 10 min for theirs). Players decide by whether they're
   around, the rating gap (much higher-rated players usually turn down ranked challenges, since they'd risk a lot
   of Elo for little gain, but often take a friendly one) and whether you're rivals. Friendly matches don't move
   Elo but count in your head-to-head record and match history. */

const DM_MAX = 800, CH_MINE = 15 * 60000, CH_THEIRS = 10 * 60000;
let DMS = store.get('fb.dms', null) || {msgs: [], q: [], read: {}};
if (!DMS.read) DMS.read = {}; if (!DMS.q) DMS.q = [];
const saveDms = () => { if (DMS.msgs.length > DM_MAX) DMS.msgs.splice(0, DMS.msgs.length - DM_MAX); store.set('fb.dms', DMS); };
let CHAT_TAB = 'global', DM_OPEN = null, dmChalOpen = false;
const dmLoadT = Date.now(), dmGenBusy = {};

/* ---- facts the players know ---- */
const thread = w => DMS.msgs.filter(m => m.w === w && !m.del);
const dmOnline = w => { try { return chatWhoOnline().includes(w); } catch(e){ return false; } };
const dmStudying = w => { try { return botLiveNow(w); } catch(e){ return false; } };
const isRival = w => { const r = R.rec[w]; return w === nemesis() || !!(r && r[0] + r[1] + r[2] >= 3); };
const recStr = w => { const r = R.rec[w]; return r ? `${r[0]}–${r[1]}${r[2] ? '–' + r[2] : ''}` : 'never played'; };
const lastVs = w => R.hist.find(h => h.b === w);
// a player can start something only when their last message has been answered and nothing of theirs is waiting
function dmCanStart(w){
  if (DMS.q.some(m => m.w === w)) return false;
  const t = thread(w), last = t[t.length - 1];
  return !last || !!last.me;
}
const pendingCh = w => thread(w).find(m => m.ch && m.ch.st === 'p');
const liveOpp = () => R && R.cur && R.cur.state === 'live' && !R.cur.tapped ? R.cur.b : -1;
const matchBusy = () => !!((R.cur && R.cur.state === 'live') || MQ);

/* ---- Gemini writes what they say ---- */
function dmPrompt(w, task){
  const B = bot(w), f = chatFacts(w), me = myName(), h = lastVs(w), rk = myRk();
  const sys = `You write direct messages that ${B.name}, a player of Focus Bench, sends to another player, ${me}. Focus Bench is a study-timer app for college students; in ranked matches whoever studies longer wins and gains Elo.
Write like real texting between two college students: casual, short, lowercase is fine, sometimes several short texts in a row. Keep ${B.name}'s own personality. They can talk about anything; most texts shouldn't be about studying or work, and don't tack study talk onto messages. When they bring up shows, movies, music, games or sports, they name the real ones (no vague "that show").
Each player has their own emoji habit (given next to their name): \"often\" uses emojis in a lot of messages, \"sometimes\" now and then, \"never\" not at all; at most a couple per message. Use them like real people do, to show emotion or react, mostly their own go-tos (listed next to their name) and sometimes any other face, hand or heart emoji: don't fall back on the same few (😭 💀 😂) for everyone. Never use them to illustrate the words (no 🍪 for cookies, 🚗 for cars, ⭐ for stars, 📚 for studying). Keep it friendly and appropriate: no explicit content, no slurs or harassment. Never mention AI. Don't check in on how ${me} is doing and don't congratulate rank-ups unprompted. Every message is from ${B.name}.`;
  const hist = thread(w).filter(m => m.text || m.ch).slice(-14).map(m => m.ch ? `(${m.me ? me : B.name} sent a ${m.ch.mode === 'f' ? 'friendly' : 'ranked'} challenge, ${({p: 'pending', a: 'accepted', d: 'declined', x: 'expired'})[m.ch.st]})` : `${m.me ? me : B.name}: ${m.text}`).join('\n') || '(no messages yet)';
  const user = `${B.name}: ${f.rank} (${f.r} Elo), ${f.style}, studies in the ${f.peak.toLowerCase()}, ${f.subj}, emojis: ${emojiStyle(w)}${B.bio ? `. Bio: "${B.bio}"` : ''}.
${me}: ${rk.full} (${R.mmr} Elo).
${R.cur && R.cur.b === w && R.cur.state === 'live' ? `They are in a live ${R.cur.friendly ? 'friendly' : 'ranked'} match with each other right now (any challenge between them was already accepted).` : ''}
Their head-to-head record (${me}'s wins–losses${R.rec[w] && R.rec[w][2] ? '–draws' : ''}): ${recStr(w)}${isRival(w) ? ', they are rivals' : ''}.
${h ? `Their last match: ${winLabel(h.t).toLowerCase()}, ${h.f ? 'friendly' : 'ranked'}, ${me} ${({W: 'won', L: 'lost', D: 'drew'})[h.r]}, ${matchTimes(h).replace(/<[^>]+>/g, '')}${h.f ? '' : `, ${h.d > 0 ? '+' : ''}${h.d} Elo for ${me}`}${Date.now() - h.t < 3600e3 ? ` (it ended ${Math.max(1, Math.round((Date.now() - h.t) / 60000))} min ago)` : ''}.` : 'They have no matches together.'}
It's ${new Date().toLocaleDateString(undefined, {weekday: 'long'})} ${new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}.

Conversation so far, oldest first:
${hist}

${task}`;
  return {sys, user};
}
// returns their texts; with withAct, {texts, act}: act is an extra item Gemini adds (from "ACTION") to say what they do
async function dmWrite(w, task, withAct){
  let texts = [], act = null;
  if (GEM.key && !(GEM.wait > Date.now()) && w !== liveOpp()){
    try {
      const {sys, user} = dmPrompt(w, task), got = await aiCall(sys, user);
      (Array.isArray(got) ? got : []).forEach(m => {
        const t = String((m && (m.text || m.message)) || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
        if (/^action$/i.test(String((m && m.from) || '').trim())){ act = t.toLowerCase(); return; }
        const t2 = emotionOnly(t); if (t2 && texts.length < 3) texts.push(t2);
      });
    } catch(e){
      if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e);
      if (e.msg) GEM.detail = e.msg; saveAI();
    }
  }
  return withAct ? {texts, act} : texts;
}
// put what they wrote in the queue from time t; the first text can carry a card or a status change
function dmQueue(w, t, texts, first = {}, hold = false){
  const items = texts.length ? texts : [''];
  items.forEach((text, k) => {
    if (!text && !first.ch && !first.upd) return;
    DMS.q.push({id: chatId() + 'd' + k, t: Math.round(t), w, text, ...(k ? {} : first), ...(hold ? {hold: 1} : {})});
    t += (3 + Math.random() * 6 + text.length * .06) * 1000;
  });
  DMS.q.sort((a, b) => a.t - b.t); saveDms(); dmRefresh();
}
// how long until they answer: online now is quick, studying is slower, offline may be a long while or never
function dmDelay(w){
  if (dmStudying(w)) return Math.random() < .85 ? (30 + Math.random() * 150) * 1000 : null;
  if (dmOnline(w)) return (3 + Math.random() * 9) * 1000;
  return Math.random() < .45 ? (8 + Math.random() * 90) * 60000 : null;
}

/* ---- you send a message ---- */
let dmReplyTimer = {};
function dmSend(w, text){
  DMS.msgs.push({id: chatId(), t: Date.now(), w, me: 1, text}); DMS.read[w] = Date.now();
  DMS.q = DMS.q.filter(m => m.w !== w || m.upd || m.ch);   // they rethink what they were about to say
  saveDms(); renderChat();
  clearTimeout(dmReplyTimer[w]);
  dmReplyTimer[w] = setTimeout(async () => {                 // wait a moment in case you send a few texts in a row
    // offline: they write back now, but it only sends once they're back online (or studying) and see it
    const off = !dmStudying(w) && !dmOnline(w), d = off ? 0 : dmDelay(w); if (d == null || dmGenBusy[w]) return;
    dmGenBusy[w] = 1;
    const B = bot(w), me = myName(), pend = pendingCh(w), mine = pend && pend.ch.by === 'me' && !off, gap = botRating(w) - R.mmr;
    let task = `${me} just messaged. Write ${B.name}'s reply: 1 to 3 short texts.`;
    if (off) task += ` ${B.name} is offline right now and will only see this later, when they're back on, so write the reply they send then: they can say they just saw it (not every time), and they're answering a while after ${me} wrote.${pend && pend.ch.by === 'me' ? ` ${me}'s challenge will have run out by then.` : ''}`;
    if (mine){
      const {yes, fYes} = chDecide(pend), md = pend.ch.mode === 'f' ? 'friendly' : 'ranked';
      task += ` There's a ${md} challenge from ${me} waiting for ${B.name}'s answer, and ${B.name} ${yes ? 'ACCEPTS it now' : `DECLINES it${pend.ch.mode === 'r' && gap > 150 ? ` (they're ${gap} Elo higher, so a ranked match risks a lot of Elo for little gain${fYes ? '; they would play a friendly instead' : ''})` : ''}`}. The reply must make that answer clear.`;
    } else if (R.on && !matchBusy() && !pend){
      const rYes = Math.random() < chAcceptP(w, 'r'), fYes = Math.random() < chAcceptP(w, 'f');
      task += ` If ${me} is asking to play a match right now: ${B.name} ${rYes ? 'would play ranked' : 'won’t play ranked' + (gap > 150 ? ` (much higher rated, too much Elo to lose)` : '')} and ${fYes ? 'would play a friendly' : 'won’t play a friendly right now'}. If they agree to play, add one more item to the list with "from": "ACTION" and "text": "ranked" or "friendly", and ${B.name} sends the challenge for ${me} to accept. Never say a challenge was sent or accepted without that item. If ${me} isn't asking to play, don't add it.`;
    }
    const {texts, act} = await dmWrite(w, task, true);
    dmGenBusy[w] = 0;
    const t0 = off ? Date.now() + 7 * 864e5 : Math.max(Date.now() + 2500, Date.now() + d - 4000), had = new Set(DMS.q.map(q => q.id));
    if (mine && pendingCh(w) === pend){
      DMS.q = DMS.q.filter(q => !(q.upd && q.upd.id === pend.id));          // this reply is their answer
      dmQueue(w, t0, texts, {upd: {id: pend.id, st: pend.ch.yes ? 'a' : 'd'}});
    } else if (act && /ranked|friendly/.test(act) && R.on && !matchBusy() && !pendingCh(w)){
      dmQueue(w, t0, texts.length ? texts : [''], {});
      dmQueue(w, t0 + 1500 + texts.length * 3500, [''], {ch: {mode: /friendly/.test(act) ? 'f' : 'r', by: 'them'}});
    } else if (texts.length) dmQueue(w, t0, texts);
    if (off){ DMS.q.forEach(q => { if (!had.has(q.id)) q.wake = 1; }); saveDms(); }
  }, 3500);
}

/* ---- challenges ---- */
// the chance they say yes. Ranked: someone much higher rated stands to lose far more than they'd gain, so they
// mostly refuse; someone lower rated has little to lose. Friendly: no Elo at stake, so most are up for it.
function chAcceptP(w, mode){
  const gap = botRating(w) - R.mmr, rival = isRival(w);
  let p = mode === 'f' ? (gap > 400 ? .55 : .72) : gap > 100 ? clampN(.75 - (gap - 100) / 300 * .65, .04, .75) : .82;
  if (rival) p += mode === 'f' ? .1 : .15;
  if (dmStudying(w)) p *= .6;
  return clampN(p, .02, .95);
}
function chStakes(w){ const s = stakes(botRating(w)); return `Win <b class="pos">+${s.win}</b> · Loss <b class="neg">−${s.loss}</b>`; }
async function dmChallenge(w, mode){
  if (focusing()) return;
  if (!R.on){ toast('Turn on Ranked to send challenges.'); return; }
  if (matchBusy()){ toast('Finish your current match first.'); return; }
  if (pendingCh(w)){ toast('There’s already a challenge waiting in this chat.'); return; }
  const now = Date.now(), m = {id: chatId(), t: now, w, me: 1, text: '', ch: {mode, exp: now + CH_MINE, st: 'p', by: 'me'}};
  DMS.msgs.push(m); DMS.read[w] = now; saveDms(); dmChalOpen = false; renderChat();
  // whether they'll see it before it runs out, and when
  let d = dmDelay(w);
  if (d == null && Math.random() < .3) d = (2 + Math.random() * 12) * 60000;
  if (d == null || d >= CH_MINE - 20000) return;                  // it just expires
  const B = bot(w), gap = botRating(w) - R.mmr, {yes, fYes} = chDecide(m);
  const why = mode === 'r' && !yes && gap > 150 ? ` They're ${gap} Elo higher, so a ranked match risks a lot of Elo for little gain${fYes ? '; they would play a friendly though' : ''}.` : !yes && dmStudying(w) ? ' They are in the middle of a study session.' : '';
  dmGenBusy[w] = 1;
  const texts = await dmWrite(w, `${myName()} sent ${B.name} a ${mode === 'f' ? 'friendly (no Elo)' : 'ranked'} match challenge${isRival(w) ? ' (they are rivals)' : ''}. ${B.name} ${yes ? 'accepts' : 'declines'}.${why} Write 1 short text ${B.name} sends with that answer.`);
  dmGenBusy[w] = 0;
  dmQueue(w, Math.max(Date.now() + 2500, now + d), texts, {upd: {id: m.id, st: yes ? 'a' : 'd'}});
}
// decide once whether they'll take a challenge of yours; kept on the card so later texts agree with it
function chDecide(m){
  if (m.ch.yes == null){ const gap = botRating(m.w) - R.mmr; m.ch.yes = Math.random() < chAcceptP(m.w, m.ch.mode); m.ch.fYes = m.ch.mode === 'r' && !m.ch.yes && gap > 150 && Math.random() < chAcceptP(m.w, 'f'); saveDms(); }
  return {yes: m.ch.yes, fYes: m.ch.fYes};
}
// accepted: straight to "Match found" and its countdown, the same as matchmaking
function chPlay(w, mode, go = true){
  if (!R.on || matchBusy() || !RK_READY) return false;
  if (R.cur) R.cur = null;
  MQ = {t0: Date.now(), wait: 0, pool: 1, b: w, found: Date.now(), friendly: mode === 'f'};
  clearInterval(mqTimer); mqTimer = setInterval(queueTick, 250);
  try { chime(P.chime); } catch(e){}
  if (go) showPage('focus'); renderMatch(true);
  return true;
}
function chRespond(id, yes){
  const m = DMS.msgs.find(x => x.id === id); if (!m || !m.ch || m.ch.st !== 'p' || focusing()) return;
  if (yes && (!R.on || matchBusy())){ toast(!R.on ? 'Turn on Ranked to play challenges.' : 'Finish your current match first.'); return; }
  m.ch.st = yes ? 'a' : 'd'; m.ch.at = Date.now(); DMS.read[m.w] = Date.now(); saveDms();
  if (yes) chPlay(m.w, m.ch.mode); else renderChat();
}

/* ---- things they start on their own ---- */
// after a match: most of the time nothing. Close finishes, upsets, rivalries and big swings make a message more likely
function dmAfterMatch(c){
  if (!c || !GEM.key) return;
  const w = c.b; if (!dmCanStart(w)) return;
  const youMs = c.you, themMs = c.tapped ? c.target : c.them, hi = Math.max(youMs, themMs, 1), lo = Math.min(youMs, themMs);
  const close = lo / hi > .9, blowout = lo / hi < .6, upset = (c.res === 'W' && c.br > c.mmr0 + 120) || (c.res === 'L' && c.br < c.mmr0 - 120);
  let p = .12 + (close ? .12 : 0) + (upset ? .12 : 0) + (isRival(w) ? .14 : 0) + (Math.abs(c.delta || 0) >= 20 ? .08 : 0) - (blowout ? .07 : 0) + (c.friendly ? .1 : 0);
  if (Math.random() >= clampN(p, .04, .55)) return;
  const B = bot(w), theyLost = c.res === 'W', rematch = isRival(w) && theyLost && R.on && Math.random() < .35;
  const mode = rematch && botRating(w) - R.mmr > 150 ? 'f' : 'r';
  const task = rematch ? `${B.name} just lost a ${c.friendly ? 'friendly' : 'ranked'} match to ${myName()} and is sending a ${mode === 'f' ? 'friendly' : 'ranked'} rematch challenge. Write 1 short text to go with it.`
    : `${B.name} and ${myName()} just finished a ${c.friendly ? 'friendly' : 'ranked'} match: ${B.name} ${({W: 'lost', L: 'won', D: 'drew'})[c.res]}${close ? ', it was close' : blowout ? ', it was one-sided' : ''}${upset ? ', an upset' : ''}. Write 1 or 2 short texts ${B.name} sends about it (gg, salty, impressed, joking, whatever fits them).`;
  setTimeout(async () => {
    if (!dmCanStart(w)) return;
    dmGenBusy[w] = 1; const texts = await dmWrite(w, task); dmGenBusy[w] = 0;
    if (!texts.length) return;
    dmQueue(w, Date.now() + (40 + Math.random() * 200) * 1000, texts, rematch ? {ch: {mode, by: 'them'}} : {}, true);
  }, 2000);
}
const _finalize = finalize;
finalize = function(res, why){
  const c = R.cur && R.cur.state === 'live' ? {...R.cur} : null;
  _finalize(res, why);
  if (c && R.cur){ c.res = R.cur.res; c.delta = R.cur.delta; dmAfterMatch(c); }
};
// every minute or so, while you're not focusing: a rare word from a rival, or a challenge from someone online
/* ---- messages from while you were away: come back after a while and someone may have written to you ---- */
let dmAwaySince = store.get('fb.lastSeen', Date.now()), dmAwayBusy = false;          // when you were last here, captured on open
function dmSeenNow(){ if (!document.hidden) store.set('fb.lastSeen', Date.now()); }
async function dmAway(){
  const now = Date.now(), from = dmAwaySince, away = now - from;
  dmAwaySince = now; dmSeenNow();
  if (dmAwayBusy || !GEM.key || !RK_READY || away < 45 * 60000) return;
  if (Math.random() > Math.min(.65, away / 3600e3 * .18)) return;                    // ~20% after an hour, up to 65% after a long day
  dmAwayBusy = true;
  try {
    const pool = [], add = (w, n) => { if (w >= 0 && w < ROSTER_N && w !== liveOpp() && !dmGenBusy[w]) for (let k = 0; k < n; k++) pool.push(w); };
    [...new Set(DMS.msgs.map(m => m.w))].forEach(w => add(w, 3));
    Object.keys(R.rec || {}).map(Number).filter(w => isRival(w)).forEach(w => add(w, 3));
    (R.hist || []).slice(0, 15).forEach(h => add(h.b, 2));
    const sb = sortedBots(), at = (() => { let lo = 0, hi = sb.length; while (lo < hi){ const m = (lo + hi) >> 1; if (BS[sb[m] * BF] > R.mmr) lo = m + 1; else hi = m; } return lo; })();
    for (let k = 0; k < 4; k++) add(sb[clampN(at + Math.floor((Math.random() - .5) * 400), 0, sb.length - 1)], 1);
    const n = Math.random() < .75 ? 1 : 2, used = new Set();
    for (let k = 0; k < n && pool.length; k++){
      const w = pool[Math.floor(Math.random() * pool.length)]; if (used.has(w)) continue; used.add(w);
      const when = from + 600000 + Math.random() * Math.max(0, away - 900000), cls = (() => { try { return botClasses(w)[0]; } catch(e){ return bot(w).subject; } })();
      dmGenBusy[w] = 1;
      const texts = await dmWrite(w, `${bot(w).name} messaged ${myName()} a while ago, around ${new Date(when).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}, and ${myName()} is only now seeing it. Write the 1 or 2 short texts ${bot(w).name} sent then. Pick whatever's natural for them: following up on what they last talked about, something about their last match, asking how ${myName()}'s classes are going, a complaint about their own ${cls}, something funny that happened, asking if ${myName()} wants to play later. Don't mention ${myName()} being away or offline.`);
      dmGenBusy[w] = 0;
      if (texts.length){ const base = Date.now() + 2500 + k * 4000; texts.forEach((text, j) => DMS.q.push({id: chatId() + 'a' + j, t: base + j * 900, at: Math.round(when + j * (20 + Math.random() * 60) * 1000), w, text})); }
    }
    DMS.q.sort((a, b) => a.t - b.t); saveDms(); dmRefresh();
  } catch(e){ console.error(e); } finally { dmAwayBusy = false; }
}
setTimeout(() => setInterval(dmSeenNow, 60000), 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden){ dmAwaySince = Date.now(); store.set('fb.lastSeen', dmAwaySince); } else setTimeout(dmAway, 4000); });
addEventListener('pagehide', () => store.set('fb.lastSeen', Date.now()));
(function dmAwayStart(){ if (!RK_READY) return setTimeout(dmAwayStart, 3000); setTimeout(dmAway, 6000); })();

let dmAmbientAt = 0;
async function dmAmbient(){
  const now = Date.now();
  if (now - dmAmbientAt < 60000 || now - dmLoadT < 120000 || focusing() || document.hidden || !RK_READY) return;
  dmAmbientAt = now;
  if (DMS.q.some(m => m.hold) || DMS.msgs.some(m => m.ch && m.ch.st === 'p' && m.ch.by === 'them')) return;
  const rivals = Object.keys(R.rec).map(Number).filter(w => isRival(w) && dmCanStart(w) && !dmGenBusy[w]);
  if (GEM.key && rivals.length && Math.random() < 1 / 240){
    const w = pick(Math.random, rivals), chal = R.on && Math.random() < .4, mode = botRating(w) - R.mmr > 150 ? 'f' : 'r';
    dmGenBusy[w] = 1;
    const texts = await dmWrite(w, chal ? `${bot(w).name} is sending their rival ${myName()} a ${mode === 'f' ? 'friendly' : 'ranked'} match challenge out of nowhere. Write 1 short text to go with it, a bit of trash talk is fine.`
      : `${bot(w).name} sends their rival ${myName()} a bit of light-hearted trash talk out of nowhere. Write 1 or 2 short texts.`);
    dmGenBusy[w] = 0;
    if (texts.length || chal) dmQueue(w, Date.now() + 3000, texts, chal ? {ch: {mode, by: 'them'}} : {}, true);
    return;
  }
  if (R.on && !matchBusy() && Math.random() < 1 / 150){
    const near = chatWhoOnline().filter(w => Math.abs(botRating(w) - R.mmr) <= 150 && dmCanStart(w) && !dmStudying(w) && !dmGenBusy[w]);
    if (!near.length) return;
    const w = pick(Math.random, near), mode = Math.random() < .75 ? 'r' : 'f';
    dmGenBusy[w] = 1;
    const texts = await dmWrite(w, `${bot(w).name} is online, saw ${myName()} is near their rating, and sends a ${mode === 'f' ? 'friendly' : 'ranked'} match challenge. Write 1 short text to go with it.`);
    dmGenBusy[w] = 0;
    dmQueue(w, Date.now() + 3000, texts, {ch: {mode, by: 'them'}}, true);
  }
}

/* ---- the clock: deliver, expire, count down ---- */
let dmWakeAt = 0;
function dmTick(){
  const now = Date.now(); let fresh = [], changed = false;
  const opp = liveOpp();
  if (opp >= 0 && DMS.q.some(m => m.w === opp && !m.upd)){ DMS.q = DMS.q.filter(m => m.w !== opp || m.upd); changed = true; }
  // replies written while they were offline go out a little after they're back
  if (now - dmWakeAt > 15000 && DMS.q.some(m => m.wake)){
    dmWakeAt = now; const back = new Map();
    DMS.q.forEach(m => { if (!m.wake) return; if (!back.has(m.w)) back.set(m.w, (dmOnline(m.w) || dmStudying(m.w)) ? {base: now + (20 + Math.random() * 100) * 1000, first: Math.min(...DMS.q.filter(x => x.w === m.w && x.wake).map(x => x.t))} : null);
      const b = back.get(m.w); if (b){ m.t = b.base + (m.t - b.first); delete m.wake; changed = true; } });
    if (changed) DMS.q.sort((a, b) => a.t - b.t);
  }
  DMS.q.forEach(m => { if (focusing() && m.t <= now) m.t = now + 5000; });     // nothing arrives during a focus block: it waits for your break
  while (DMS.q.length && DMS.q[0].t <= now){
    const q = DMS.q.shift();
    if (q.upd){                                 // their answer to your challenge; too late if it already ran out
      const c = DMS.msgs.find(x => x.id === q.upd.id);
      if (!(c && c.ch && c.ch.st === 'p' && now < c.ch.exp)){ changed = true; continue; }
      c.ch.st = q.upd.st; c.ch.at = now;
      if (q.upd.st === 'a'){ if (!chPlay(c.w, c.ch.mode, chatPageOpen())) c.ch.late = 1; else toast(`${bot(c.w).name} accepted your challenge`); }
    }
    const m = {id: q.id, t: q.at && q.at < now ? q.at : now, w: q.w, text: q.text || '', ai: 1};      // messages sent while you were away keep their time
    if (q.ch) m.ch = {mode: q.ch.mode, exp: now + CH_THEIRS, st: 'p', by: 'them'};
    if (m.text || m.ch){ DMS.msgs.push(m); fresh.push(m); }
    changed = true;
  }
  DMS.msgs.forEach(m => { if (m.ch && m.ch.st === 'p' && now >= m.ch.exp){ m.ch.st = 'x'; changed = true; } });
  if (changed){
    DMS.msgs.sort((a, b) => a.t - b.t);
    if (CHAT_TAB === 'dm' && DM_OPEN != null && chatPageOpen()) DMS.read[DM_OPEN] = now;
    saveDms(); dmRefresh();
    const last = fresh.filter(m => !(CHAT_TAB === 'dm' && DM_OPEN === m.w && chatPageOpen())).pop();
    if (last) dmPreview(last);
  }
  // in the conversation list: "typing…" in place of the last message while someone is writing to you
  if (CHAT_TAB === 'dm' && DM_OPEN == null && chatPageOpen()){
    const ty = new Set(typingNow(DMS.q.filter(m => m.text && !focusing())));
    document.querySelectorAll('#chatBody .dm-row').forEach(row => {
      const p = row.querySelector('.dm-p'), on = ty.has(+row.dataset.open); if (!p || p.dataset.ty === String(on)) return;
      if (p.dataset.orig == null) p.dataset.orig = p.innerHTML;
      p.dataset.ty = String(on); p.classList.toggle('dm-typing', on);
      p.innerHTML = on ? 'typing <span class="ty-dots" aria-hidden="true"><i></i><i></i><i></i></span>' : p.dataset.orig;
    });
  }
  // live countdowns on open challenge cards
  document.querySelectorAll('#chatBody .cc-left[data-exp]').forEach(el => { const ms = +el.dataset.exp - now; el.textContent = ms > 0 ? `${clock(ms)} left` : 'Expired'; });
  if (CHAT_TAB === 'dm' && DM_OPEN != null && chatPageOpen()){
    const t = $('#dmTyping');
    if (t){ const ws = typingNow(DMS.q.filter(m => m.w === DM_OPEN && m.text && !focusing())), k = ws.join(',');
      if (t.dataset.k !== k){ t.dataset.k = k; t.innerHTML = typingHtml(ws); t.classList.toggle('on', !!ws.length); } }
    const inp = $('#dmIn'); if (inp && !inp.dataset.ph) inp.dataset.ph = inp.placeholder;
    chatLockInput(inp, $('#dmForm button'));
    const lock = focusing(); document.querySelectorAll('#chatBody [data-dmchal], #chatBody [data-ch]').forEach(b => { b.disabled = lock; });
  }
  dmAmbient();
}
setInterval(dmTick, 1000);
function dmRefresh(){ chatBadge(); if (chatPageOpen() && CHAT_TAB === 'dm') renderChat(); else renderChatTabs(); }
function dmPreview(m){
  if (P.chatPop === false || focusing() || document.hidden) return;
  const el = $('#chatPop'), B = bot(m.w);
  el.innerHTML = `${avatar(B)}<span><b>${esc(B.name)}</b><small>${m.ch && !m.text ? `sent you a ${m.ch.mode === 'f' ? 'friendly' : 'ranked'} challenge` : esc(m.text)}</small></span>`;
  el.dataset.dm = m.w; chatPopAt = Date.now();
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 7000);
}
const _chatPreview = chatPreview;
chatPreview = function(m){ const el = $('#chatPop'); const before = el.innerHTML; _chatPreview(m); if (el.innerHTML !== before) delete el.dataset.dm; };
$('#chatPop').addEventListener('click', () => { const w = $('#chatPop').dataset.dm; if (w != null && w !== ''){ openDm(+w); } });

/* ---- unread counts ---- */
const dmUnread = w => thread(w).filter(m => !m.me && m.t > (DMS.read[w] || 0)).length;
const dmUnreadAll = () => { const s = new Set(DMS.msgs.filter(m => !m.me && !m.del).map(m => m.w)); let n = 0; s.forEach(w => { if (!(CHAT_TAB === 'dm' && DM_OPEN === w && chatPageOpen())) n += dmUnread(w); }); return n; };
chatBadge = function(){
  const g = chatPageOpen() && CHAT_TAB === 'global' ? 0 : chatUnread(), n = g + dmUnreadAll(), txt = n > 99 ? '99+' : n ? String(n) : '';
  document.querySelectorAll('.chat-badge').forEach(b => { b.textContent = txt; b.hidden = !n; });
  renderChatTabs();
};

/* ---- the Chat page: Global and Messages tabs ---- */
function renderChatTabs(){
  const el = $('#chatTabs'); if (!el) return;
  const n = dmUnreadAll(), g = CHAT_TAB === 'global' ? 0 : chatUnread();
  el.innerHTML = `<button class="ct-btn${CHAT_TAB === 'global' ? ' on' : ''}" data-tab="global">Global${g ? `<b>${g > 99 ? '99+' : g}</b>` : ''}</button><button class="ct-btn${CHAT_TAB === 'dm' ? ' on' : ''}" data-tab="dm">Messages${n ? `<b>${n > 99 ? '99+' : n}</b>` : ''}</button>`;
}
const _renderChat = renderChat;
renderChat = function(){
  renderChatTabs();
  if (CHAT_TAB !== 'dm') return _renderChat();
  const el = $('#chatBody'); if (!el || $('#page-chat').hidden) return;
  if (!RK_READY){ el.innerHTML = '<p class="hint">Loading players…</p>'; return; }
  if (DM_OPEN == null) return renderDmList(el);
  renderDmThread(el, DM_OPEN);
};
function dmStatus(w){ return dmStudying(w) ? '<i class="ch-on busy"></i> Studying now' : dmOnline(w) ? '<i class="ch-on"></i> Online' : 'Offline'; }
function renderDmList(el){
  const ws = [...new Set(DMS.msgs.filter(m => !m.del).map(m => m.w))];
  const rows = ws.map(w => { const t = thread(w), last = t[t.length - 1]; return {w, last}; }).sort((a, b) => b.last.t - a.last.t);
  el.innerHTML = `<div class="card ch-card dm-card"><div class="ch-top"><div><b>Messages</b><small>${rows.length ? `${rows.length} conversation${rows.length === 1 ? '' : 's'}` : 'Direct messages'}</small></div></div>
    <div class="dm-threads">${rows.length ? rows.map(({w, last}) => { const B = bot(w), u = dmUnread(w);
      const prev = last.ch && !last.text ? `${last.me ? 'You' : B.name} sent a ${last.ch.mode === 'f' ? 'friendly' : 'ranked'} challenge` : `${last.me ? 'You: ' : ''}${last.text}`;
      return `<button class="dm-row${u ? ' unread' : ''}" data-open="${w}">${avatar(B)}<span class="dm-meta"><span class="dm-n"><b>${esc(B.name)}</b><time>${chatTime(last.t)}</time></span><span class="dm-p">${esc(prev.length > 80 ? prev.slice(0, 80) + '…' : prev)}</span></span>${u ? `<b class="dm-u">${u}</b>` : ''}</button>`; }).join('')
      : '<p class="hint ch-empty">No messages yet. Open anyone’s profile and tap <b>Message</b> to start a conversation, or <b>Challenge</b> to send a match request.</p>'}</div>
    ${GEM.key ? '' : '<p class="hint ch-hint">Players write back once Gemini is set up in <button class="link-btn" data-go="settings" data-sec="set-chat">Settings → Chat</button>.</p>'}</div>`;
}
function chCard(m){
  const B = bot(m.w), mine = m.ch.by === 'me', f = m.ch.mode === 'f', st = m.ch.st;
  const title = `${f ? 'Friendly' : 'Ranked'} challenge`, sub = mine ? `You challenged ${esc(B.name)}` : `${esc(B.name)} challenged you`;
  const stake = f ? 'No Elo change · counts in your head-to-head' : chStakes(m.w);
  const state = st === 'p' ? `<span class="cc-left" data-exp="${m.ch.exp}">${clock(Math.max(0, m.ch.exp - Date.now()))} left</span>`
    : st === 'a' ? `<span class="cc-st ok">Accepted${m.ch.late ? ' · you were in a match' : ''}</span>` : st === 'd' ? '<span class="cc-st no">Declined</span>' : '<span class="cc-st">Expired</span>';
  const btns = st === 'p' && !mine ? `<div class="cc-btns"><button class="small-btn accent" data-ch="${m.id}" data-yes="1">Accept</button><button class="small-btn" data-ch="${m.id}">Decline</button></div>` : '';
  return `<div class="cc cc-${st}${f ? ' fr' : ''}"><div class="cc-h"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 17.5 21 6V3h-3L6.5 14.5M11 19l-6-6M8 16l-4 4M5 21l-2-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><b>${title}</b>${state}</div>
    <p class="cc-sub">${sub}</p><p class="cc-stake">${stake}</p>${btns}</div>`;
}
function renderDmThread(el, w){
  const B = bot(w), rk = rankOf(botRating(w)), list = $('#dmList'), nearBottom = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  if (dmUnread(w)){ DMS.read[w] = Date.now(); saveDms(); }
  const t = thread(w), lock = focusing();
  const rows = t.map(m => `<div class="dm-msg${m.me ? ' me' : ''}">${m.ch ? chCard(m) : ''}${m.text ? `<p>${esc(m.text)}</p>` : ''}<span class="dm-foot">${m.me && m.text && !m.ch ? `<button class="dm-del" data-del="${m.id}" aria-label="Delete message" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>` : ''}<time>${chatTime(m.t)}</time></span></div>`).join('');
  const s = stakes(botRating(w)), pend = pendingCh(w);
  if (!list || list.dataset.w !== String(w)){
    el.innerHTML = `<div class="card ch-card dm-card"><div class="dm-top"><button class="small-btn dm-back" data-back="1" aria-label="Back to messages">←</button>
      <button class="ch-av" data-bot="${w}">${avatar(B)}</button><span class="dm-who"><button class="ch-name" data-bot="${w}">${esc(B.name)}</button><small>${emblem(rk, 'xs')} ${esc(rk.full)} · <span id="dmSt">${dmStatus(w)}</span></small></span>
      <button class="small-btn" data-dmchal="1">Challenge</button></div>
      <div class="ch-list dm-list" id="dmList" data-w="${w}"></div>
      <div class="ch-typing" id="dmTyping" aria-live="polite"></div>
      <div class="dm-chal" id="dmChal" hidden></div>
      <form class="ch-send" id="dmForm"><input id="dmIn" maxlength="300" placeholder="Message ${esc(B.name)}" autocomplete="off" aria-label="Message"><button class="small-btn accent">Send</button></form>
      <p class="hint ch-hint">${GEM.key ? '' : 'Players write back once Gemini is set up in <button class="link-btn" data-go="settings" data-sec="set-chat">Settings → Chat</button>.'}</p></div>`;
  }
  $('#dmSt').innerHTML = dmStatus(w);
  $('#dmList').innerHTML = rows || `<p class="hint ch-empty">Say hi to ${esc(B.name)}, or send a challenge. Your record together: ${recStr(w)}.</p>`;
  const ch = $('#dmChal');
  ch.hidden = !dmChalOpen;
  ch.innerHTML = dmChalOpen ? `<span class="hint">Challenge ${esc(B.name)} (${botRating(w).toLocaleString()} Elo) to a match. Expires in 15 min.</span>
    <button class="small-btn accent" data-send="r">Ranked<small>Win +${s.win} · Loss −${s.loss}</small></button><button class="small-btn" data-send="f">Friendly<small>No Elo change</small></button><button class="ch-x" data-chx="1" aria-label="Cancel">✕</button>` : '';
  const cb = el.querySelector('[data-dmchal]'); cb.disabled = lock; cb.title = pend ? 'A challenge is already waiting' : '';
  el.querySelectorAll('[data-ch]').forEach(b => { b.disabled = lock; });
  const L = $('#dmList'); if (nearBottom){ L.scrollTop = L.scrollHeight; requestAnimationFrame(() => { L.scrollTop = L.scrollHeight; }); }
  const inp = $('#dmIn'); if (!inp.dataset.ph) inp.dataset.ph = inp.placeholder; chatLockInput(inp, $('#dmForm button'));
  if (lock) inp.disabled = true;
}
function openDm(w){
  CHAT_TAB = 'dm'; DM_OPEN = w; dmChalOpen = false;
  $('#botModal').hidden = true;
  if ($('#page-chat').hidden) showPage('chat'); else renderChat();
  chatBadge();
  setTimeout(() => { const i = $('#dmIn'); if (i && !i.disabled && matchMedia('(min-width:761px)').matches) i.focus(); }, 50);
}
function dmButtons(w){
  return `<span class="pf-dm"><button class="small-btn" data-dm="${w}">Message</button><button class="small-btn" data-dmc="${w}">Challenge</button></span>`;
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-dm]'); if (a){ openDm(+a.dataset.dm); return; }
  const c = e.target.closest('[data-dmc]'); if (c){ openDm(+c.dataset.dmc); dmChalOpen = !focusing(); renderChat(); }
});
$('#page-chat').addEventListener('click', e => {
  const tb = e.target.closest('[data-tab]');
  if (tb){ CHAT_TAB = tb.dataset.tab; if (CHAT_TAB === 'global'){ CHATS.read = Date.now(); saveChat(); } $('#chatBody').innerHTML = ''; renderChat(); chatBadge(); const L = $('#chatList'); if (L) L.scrollTop = L.scrollHeight; return; }
  if (CHAT_TAB !== 'dm') return;
  e.stopImmediatePropagation();
  const o = e.target.closest('[data-open]'); if (o){ DM_OPEN = +o.dataset.open; dmChalOpen = false; renderChat(); chatBadge(); return; }
  if (e.target.closest('[data-back]')){ DM_OPEN = null; renderChat(); return; }
  if (e.target.closest('[data-dmchal]')){ dmChalOpen = !dmChalOpen; renderChat(); return; }
  if (e.target.closest('[data-chx]')){ dmChalOpen = false; renderChat(); return; }
  const sd = e.target.closest('[data-send]'); if (sd){ dmChallenge(DM_OPEN, sd.dataset.send); return; }
  const r = e.target.closest('[data-ch]'); if (r){ chRespond(r.dataset.ch, !!r.dataset.yes); return; }
  const dl = e.target.closest('[data-del]');
  if (dl){ chatDelBtn(dl, () => { const m = DMS.msgs.find(x => x.id === dl.dataset.del); if (m && m.me){ m.del = 1; m.text = ''; saveDms(); renderChat(); } }); return; }
  const g = e.target.closest('[data-go]'); if (g){ showPage(g.dataset.go, g.dataset.sec); return; }
  const b = e.target.closest('[data-bot]'); if (b) openProfile(+b.dataset.bot);
}, true);
$('#page-chat').addEventListener('submit', e => {
  if (e.target.id !== 'dmForm') return; e.preventDefault(); e.stopImmediatePropagation();
  if (focusing() || DM_OPEN == null) return;
  const inp = $('#dmIn'), text = inp.value.replace(/\s+/g, ' ').trim(); if (!text) return;
  inp.value = ''; dmSend(DM_OPEN, text);
}, true);
// another tab of the app changed the messages
addEventListener('storage', e => {
  if (e.key !== 'fb.dms' || !e.newValue) return;
  try { DMS = JSON.parse(e.newValue); } catch(err){ return; }
  chatBadge(); if (chatPageOpen() && CHAT_TAB === 'dm') renderChat();
});
