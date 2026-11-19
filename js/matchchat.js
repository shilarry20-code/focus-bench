/* ---------- match chat: a small chat window inside the live match, just for that game ----------
   You can send on breaks, while paused and before you press Start; during a focus block the box is locked.
   Your opponent's messages are written by Gemini and know how the match is going. Anything they send while you're
   focusing waits (shown as "2 new") until your break. Without a Gemini key they fall back to short built-in
   lines. The chat stays on the result screen and is cleared when your next match starts. It never goes to DMs. */

const MC_REPLIES = ['lol', 'ok ok', 'haha', 'true', 'bet', 'nah you got this', 'we ball', 'lmao', 'fair', 'real'];
let mcPrevFoc = focusing(), mcBusy = false, mcStick = true, mcScroll = 0, mcTyKey = '', mcReplyT = null;
const mcCur = () => R.cur && (R.cur.state === 'live' || R.cur.state === 'done') ? R.cur : null;

function mcBox(c){
  const B = BOTS[c.b];
  return `<div class="mc" id="mc"><div class="mc-h"><span>Match chat</span><b class="mc-new" id="mcNew" hidden></b></div>
    <div class="mc-list" id="mcList"></div><div class="ch-typing mc-typing" id="mcTyping" aria-live="polite"></div>
    <form class="mc-send" id="mcForm"><input id="mcIn" maxlength="200" autocomplete="off" aria-label="Match chat message" placeholder="Message ${esc(B.name)}" data-ph="Message ${esc(B.name)}"><button class="small-btn accent">Send</button></form></div>`;
}
function mcRender(){
  const c = mcCur(), L = $('#mcList'); if (!c || !L) return;
  const msgs = c.chat || [], last = msgs[msgs.length - 1], k = msgs.length + '|' + (last ? last.t : 0);
  if (!L.dataset.w){ L.dataset.w = 1; L.addEventListener('scroll', () => { mcStick = L.scrollHeight - L.scrollTop - L.clientHeight < 24; mcScroll = L.scrollTop; }, {passive: true}); }
  if (L.dataset.k !== k){
    const fresh = !L.dataset.k, grew = !fresh && msgs.length > (+L.dataset.n || 0);
    L.dataset.k = k; L.dataset.n = msgs.length;
    L.innerHTML = msgs.length ? msgs.map(m => `<div class="mc-msg${m.me ? ' me' : ''}"><b>${m.me ? 'You' : esc(BOTS[c.b].name)}</b> <span>${esc(m.text)}</span></div>`).join('')
      : `<p class="hint mc-empty">${c.state === 'live' ? 'Say gl hf. You can chat on breaks, while paused, and before you start.' : 'No messages this match.'}</p>`;
    L.scrollTop = mcStick || (grew && msgs[msgs.length - 1].me) ? L.scrollHeight : mcScroll;     // stay where you were reading
  }
  const foc = focusing(), now = Date.now(), q = c.cq || [];
  const n = $('#mcNew'); if (n) n.hidden = true;
  const t = $('#mcTyping');
  if (t){
    const ws = foc ? [] : typingNow(q.map(x => ({...x, w: c.b}))), key = ws.join(',');
    // a redrawn card gets a new, empty row: fill it straight away without replaying the slide-in or restarting the dots
    if (t.dataset.k !== key){ const isNew = t.dataset.k == null; t.dataset.k = key; if (isNew && key && key === mcTyKey) t.classList.add('still'); t.innerHTML = typingHtml(ws); t.classList.toggle('on', !!ws.length); }
    mcTyKey = key;
  }
  chatLockInput($('#mcIn'), $('#mcForm button'));
}

/* ---- what the opponent says ---- */
function mcPrompt(c, task){
  const B = BOTS[c.b], f = chatFacts(c.b), me = myName(), s = stakes(c.br), r = R.rec[c.b];
  const youMin = Math.round(c.you / 60000), themMin = Math.round((c.tapped ? c.target : c.them) / 60000);
  const state = c.state === 'done' ? `The match just ended: ${me} ${({W: 'won', L: 'lost', D: 'drew'})[c.res]}.`
    : !c.you ? `${me} hasn't started studying yet.` : focusing() ? `${me} is focusing right now.` : S.running ? `${me} is on a break.` : `${me} has paused their timer.`;
  const sys = `You write in-match chat messages from ${B.name} to ${me}. They're playing a live match on Focus Bench, a study-timer app for college students: both study at the same time and whoever studies longer wins.
Write like quick game chat: short, casual, lowercase is fine, friendly trash talk is fine. Keep ${B.name}'s personality. Don't lecture about studying.
Each player has their own emoji habit (given next to their name): \"often\" uses emojis in a lot of messages, \"sometimes\" now and then, \"never\" not at all; at most a couple per message, used the way real people text (reactions, tone), not decoration on every line. Keep it friendly and appropriate: no explicit content, no slurs or harassment. Never mention AI. Every message is from ${B.name}.`;
  const user = `${B.name}: ${f.rank} (${f.r} Elo), ${f.subj}, ${f.style.toLowerCase()} studier, emojis: ${emojiStyle(c.b)}. ${me}: ${rankOf(c.mmr0).full} (${c.mmr0} Elo).
Match: ${c.friendly ? 'friendly (no Elo at stake)' : `ranked (${me} gains ${s.win} Elo for a win, loses ${s.loss} for a loss)`}. Their record before this: ${r ? `${r[0]}–${r[1]}${r[2] ? '–' + r[2] : ''} (${me}'s wins–losses)` : 'first time playing'}.
So far ${me} has studied ${youMin} min and ${B.name} ${themMin} min${c.tapped && c.state === 'live' ? `, and ${B.name} has stopped for good` : ''}. ${state}

Match chat so far:
${(c.chat || []).slice(-10).map(m => `${m.me ? me : B.name}: ${m.text}`).join('\n') || '(nothing yet)'}

${task}`;
  return {sys, user};
}
async function mcSay(kind, delay){
  const c = mcCur(); if (!c || mcBusy) return;
  if ((c.cq || []).length && kind !== 'reply') return;              // one thing at a time
  if (kind === 'reply' && mcBusy){ clearTimeout(mcReplyT); mcReplyT = setTimeout(() => mcSay('reply', delay), 2000); return; }
  const B = BOTS[c.b], me = myName();
  const task = {start: `The match just started. Write 1 short opening message from ${B.name} (like gl hf, a bit of banter).`,
    brk: `${me} just took a break. Write 1 short message ${B.name} sends (teasing, chatting, or about how the match is going).`,
    tap: `${B.name} is done studying for this match and stopped. Write 1 short message about it.`,
    end: `Write 1 short post-game message from ${B.name} about the result.`,
    reply: `${me} just sent you something (maybe a few messages in a row). Write ${B.name}'s reply to all of it together: 1 or 2 short messages.`}[kind];
  let texts = [];
  if (GEM.key && !(GEM.wait > Date.now())){
    mcBusy = true;
    try { const {sys, user} = mcPrompt(c, task), got = await aiCall(sys, user);
      texts = (Array.isArray(got) ? got : []).map(m => String((m && (m.text || m.message)) || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)).filter(Boolean).slice(0, 2);
    } catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); if (e.msg) GEM.detail = e.msg; saveAI(); }
    finally { mcBusy = false; }
  }
  if (!texts.length){                                              // the built-in lines
    texts = [kind === 'start' ? 'gl hf' : kind === 'end' ? (c.res === 'W' ? 'gg you got me' : c.res === 'L' ? 'gg' : 'gg close one') : kind === 'tap' ? c.tap
      : kind === 'brk' ? pick(Math.random, c.lines || ['nice break lol']) : pick(Math.random, MC_REPLIES)];
  }
  const cur = mcCur(); if (cur !== c) return;                      // the match changed meanwhile
  if (focusing() && c.state === 'live') return;                    // you started focusing: they're studying too
  let t = Date.now() + delay;
  c.cq = c.cq || [];
  texts.forEach(text => { c.cq.push({t: Math.round(t), text, ...(kind === 'reply' ? {re: 1} : {})}); t += (3 + text.length * .07 + Math.random() * 3) * 1000; });
  saveRanked(); mcRender();
}
// the opponent's own moments: the start, your breaks (once each), when they stop, and after the result
const _mcStart = startMatch;
startMatch = function(found, friendly){
  _mcStart(found, friendly);
  if (R.cur){ R.cur.chat = []; R.cur.cq = []; saveRanked(); if (Math.random() < .65) mcSay('start', (4 + Math.random() * 10) * 1000); }
};
const _mcFinal = finalize;
finalize = function(res, why){
  const live = R.cur && R.cur.state === 'live';
  _mcFinal(res, why);
  if (live && R.cur && Math.random() < .6) mcSay('end', (3 + Math.random() * 8) * 1000);
};
function mcTick(){
  const c = mcCur(); if (!c){ mcPrevFoc = focusing(); return; }
  const now = Date.now(), foc = focusing(); let changed = false;
  c.cq = c.cq || []; c.chat = c.chat || [];
  // during a focus block you're both studying: anything they hadn't sent yet is dropped (and they don't start anything)
  if (foc && c.state === 'live' && c.cq.length){ c.cq = []; changed = true; }
  while (c.cq.length && c.cq[0].t <= now && !foc){ const q = c.cq.shift(); c.chat.push({t: now, text: q.text}); changed = true; }
  if (c.state === 'live'){
    if (mcPrevFoc && !foc && c.you > 0 && !c.mcBrk){ c.mcBrk = 1; changed = true; if (Math.random() < .35) mcSay('brk', (6 + Math.random() * 25) * 1000); }
    if (foc && c.mcBrk){ c.mcBrk = 0; changed = true; }
    // when they stop for good during your focus block, they say so on your break
    if (c.tapped && !c.mcTap){ c.mcTap = 1; changed = true; if (Math.random() < .5){ if (foc) c.mcTapLater = 1; else mcSay('tap', (2 + Math.random() * 6) * 1000); } }
    if (c.mcTapLater && !foc){ c.mcTapLater = 0; changed = true; mcSay('tap', (3 + Math.random() * 6) * 1000); }
  }
  mcPrevFoc = foc;
  if (changed) saveRanked();
  mcRender();
}
setInterval(mcTick, 1000);
document.addEventListener('submit', e => {
  if (e.target.id !== 'mcForm') return; e.preventDefault();
  const c = mcCur(); if (!c || focusing()) return;
  const inp = $('#mcIn'), text = inp.value.replace(/\s+/g, ' ').trim(); if (!text) return;
  inp.value = ''; (c.chat = c.chat || []).push({t: Date.now(), me: 1, text}); mcStick = true;
  c.cq = (c.cq || []).filter(q => !q.re);         // they were about to answer your last message; now they'll answer all of them
  saveRanked(); mcRender();
  clearTimeout(mcReplyT); mcReplyT = setTimeout(() => mcSay('reply', (2 + Math.random() * 6) * 1000), 3500);
});
