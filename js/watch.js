/* ---------- watching a live match: study along with two top players while a room of spectators watches ----------
   Live top matches (a top-1,000 player, both mid-session) show up under Top matches with a Watch button.
   The watch room sits on the Focus page: both players' times ticking, how many are watching, and a spectator chat.
   Studying along starts your own timer (normal focus time, no Elo). The chat follows the same rule as match chat:
   it's quiet during your focus blocks and opens on breaks, when paused and after the match. Spectators are written
   by Gemini (a few requests per room); without a key they only react to the big moments with built-in lines.
   Once a player stops they can drop into the chat too. The room closes a few minutes after the match ends. */
let W = store.get('fb.watch', null), wBusy = false, wReplyT = null, wStick = true, wScroll = 0, wPrevFoc = false;
const wSave = () => store.set('fb.watch', W);
const wNowMin = () => { const d = new Date(worldT(Date.now())); return {dk: dayKey(d.getTime()), m: d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60}; };
// a match is live while both have started and someone is still going; it's over once both have stopped
function wLiveTop(){
  const {m} = wNowMin(), out = [];
  for (const p of LF.pairs || []){
    const sa = p.ea - p.ma, sc = p.ec - p.mc;
    if (Math.max(sa, sc) <= m && Math.max(p.ea, p.ec) > m && Math.min(p.ra, p.rc) >= (LF.top || 2400)) out.push(p);      // both players in the top 1,000
  }
  return out.sort((x, y) => Math.max(y.ra, y.rc) - Math.max(x.ra, x.rc)).slice(0, 6);
}
function wElapsed(start, end, m){ return Math.max(0, Math.min(m, end) - start); }
function wViewers(){
  if (!W) return 0;
  const {m} = wNowMin(), best = Math.min(posOf(W.a), posOf(W.c)) + 1, prog = clampN((m - W.s0) / Math.max(30, W.e1 - W.s0), 0, 1);
  const base = 25 + 2600 / Math.sqrt(best), wob = .85 + .15 * Math.sin(m / 3.7 + W.a % 7) + .05 * Math.sin(m * 1.9);
  return Math.round(base * (.55 + .7 * prog) * wob * (W.end ? Math.max(.25, 1 - (m - W.e1) / 8) : 1));
}
function watchMatch(p){
  const {dk} = wNowMin(), sa = p.ea - p.ma, sc = p.ec - p.mc;
  W = {dk, a: p.a, c: p.c, sa, sc, ea: p.ea, ec: p.ec, ma: p.ma, mc: p.mc, ra: p.ra, rc: p.rc, dlt: p.dlt, s0: Math.max(sa, sc), e1: Math.max(p.ea, p.ec),
    cast: wCast(p), chat: [], q: [], calls: 0, last: 0, seen: {}, joined: Date.now()};
  wSave(); showPage('focus'); renderWatch(true);
  setTimeout(() => { const el = $('#watchSlot'); if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'}); }, 60);
  if (!focusing()) wSay('open', 2500);
}
// who's in the room: only players who are online right now (never the two players while they're still going)
function wCast(p){
  const rr = mulberry32(p.a * 31 + p.c * 17 + p.ea), pool = chatWhoOnline().filter(i => i !== p.a && i !== p.c), out = [];
  while (pool.length && out.length < 9){ const i = pool.splice(Math.floor(rr() * pool.length), 1)[0]; if (!out.includes(i)) out.push(i); }
  return out;
}
// people drift off: anyone who's gone offline leaves the room and someone online wanders in
function wRoom(){
  const on = new Set(chatWhoOnline()), st = wState();
  W.cast = W.cast.filter(i => on.has(i));
  if (W.cast.length < 5){ const more = [...on].filter(i => i !== W.a && i !== W.c && !W.cast.includes(i)); while (more.length && W.cast.length < 7) W.cast.push(more.splice(Math.floor(Math.random() * more.length), 1)[0]); }
  return W.cast.concat([W.a, W.c].filter(i => i === W.a ? !st.aOn : !st.cOn));
}
function wState(){
  const {m} = wNowMin(), aOn = m < W.ea, cOn = m < W.ec, ta = wElapsed(W.sa, W.ea, m), tc = wElapsed(W.sc, W.ec, m);
  return {m, aOn, cOn, ta, tc, over: !aOn && !cOn};
}
const wClock = min => { const s = Math.floor(min * 60), h = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60, ss = s % 60; return (h ? h + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0'); };

/* ---- what the room says ---- */
function wPrompt(task){
  const st = wState(), A = bot(W.a), C = bot(W.c), me = myName();
  const inRoom = wRoom();
  const cast = inRoom.map(i => { const f = chatFacts(i); return `- ${f.name}: ${f.rank}, ${f.subj}, emojis: ${emojiStyle(i)}${i === W.a || i === W.c ? ' (one of the two players; they just stopped and are watching now)' : ''}`; });
  const lead = st.ta === st.tc ? 'tied' : `${st.ta > st.tc ? A.name : C.name} is ahead by ${Math.round(Math.abs(st.ta - st.tc))} min`;
  const res = st.over ? (W.ma === W.mc ? 'It ended in a draw.' : `It's over: ${W.ma > W.mc ? A.name : C.name} won ${Math.max(W.ma, W.mc)}–${Math.min(W.ma, W.mc)} min (${W.ma > W.mc ? '+' + W.dlt : '+' + -W.dlt} Elo for the winner, the same off the loser).`) : '';
  const sys = `You write chat messages from spectators watching a live ranked match on Focus Bench, a study-timer app for college students. In a match both players study at the same time and whoever studies longer wins Elo.
The spectators are in a watch room together; some are studying along on their own break schedule. They react to the match like viewers of a stream: hype, predictions, rooting for someone, jokes, surprise when someone stops. They can also just chat with each other a bit.
Write like quick live-stream chat: short, casual, lowercase is fine, slang is fine. Never formal. No "speaking of…" style bridges.
${EMO_RULE}
${me} is the user, also watching. When ${me} talks, answer what they actually said. Don't start a message with the name of the person it answers.
Answer with JSON: {"messages":[{"from":"<spectator name exactly as listed>","text":"…"}]}.
${typeof TALK_RULES === 'string' ? TALK_RULES : ''}`;
  const user = `The match: ${A.name} (${rankOf(W.ra).full}, ${W.ra} Elo, #${posOf(W.a) + 1} on the ladder) vs ${C.name} (${rankOf(W.rc).full}, ${W.rc} Elo, #${posOf(W.c) + 1}).
Right now: ${A.name} ${st.aOn ? 'is still studying' : 'has stopped'} at ${Math.floor(st.ta)} min, ${C.name} ${st.cOn ? 'is still studying' : 'has stopped'} at ${Math.floor(st.tc)} min; ${lead}. ${res}
About ${wViewers().toLocaleString()} people are watching. ${focusing() ? '' : `${me} is on a break.`}
Spectators who can talk:
${cast.join('\n')}

Chat so far:
${W.chat.slice(-14).map(x => `${x.w === -1 ? me : bot(x.w).name}: ${x.text}`).join('\n') || '(nothing yet)'}

${task}`;
  return {sys, user, inRoom};
}
const W_LINES = {stop: ['NOOO 😭', 'he stopped??', 'its over', 'thats it?? 💀', 'called it', 'gg', 'wait what'], end: ['gg', 'ggs', 'what a match', 'called it 😤', 'clean', 'gg wp', 'insane'], hi: ['yo', 'hey 👋', 'sup', 'hii']};
async function wSay(kind, delay, extra){
  if (!W || wBusy) return;
  if (kind !== 'reply' && W.q.length) return;
  const st = wState(), A = bot(W.a), C = bot(W.c), me = myName();
  let task = {open: `Write 3 to 5 short messages from 2 to 4 different spectators about where the match stands right now.`,
    ambient: `Write 2 or 3 short messages from 1 to 3 spectators: ${Math.random() < .5 ? `someone brings up ${pickTopic(null, {school: .3})} and others chime in` : 'react to the match or chat a bit'}.${openerAvoid()}`,
    stop: `${extra} just stopped studying, so the other player only needs to keep going. Write 2 to 4 short reactions from different spectators.`,
    end: `The match just ended. Write 2 to 4 short reactions from different spectators to the result.`,
    reply: `${me} just said something (maybe a few messages in a row). Write 1 to 3 short messages from 1 or 2 spectators answering ${me}.`}[kind];
  const ac = kind === 'reply' && typeof acPrepMany === 'function' ? acPrepMany(W.cast || [], acTail(W.chat)) : null; if (ac) task += ac.note;      // asked to like, follow, comment or repost
  let out = [];
  if (GEM.key && !(GEM.wait > Date.now()) && W.calls < 30){
    wBusy = true; W.calls++;
    try {
      const {sys, user, inRoom} = wPrompt(task), got = await aiCall(sys, user), names = new Map(inRoom.map(i => [bot(i).name.toLowerCase(), i]));
      (Array.isArray(got) ? got : []).forEach(x => {
        const w = names.get(String(x && x.from || '').toLowerCase().trim()); if (w == null) return;
        let text = String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
        text = emotionOnly(stripSegue(stripLeadName(text, [me]))); if (text && !out.some(o => o.text === text)) out.push({w, text});
      });
    } catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); if (e.msg) GEM.detail = e.msg; try { saveAI(); } catch(err){} }
    finally { wBusy = false; }
  }
  if (!W) return;
  if (!out.length && (kind === 'stop' || kind === 'end' || (kind === 'open' && !W.chat.length))){
    const lines = W_LINES[kind === 'open' ? 'hi' : kind].slice(), rr = Math.random, n = 1 + Math.floor(rr() * 2);
    const room = wRoom(); if (room.length) for (let k = 0; k < n && lines.length; k++) out.push({w: room[Math.floor(rr() * room.length)], text: lines.splice(Math.floor(rr() * lines.length), 1)[0]});
  }
  if (focusing() && !st.over) return;                 // you started focusing meanwhile: the room waits for your break
  // after anything already waiting, so a new batch doesn't land on top of the last one
  let t = Math.max(Date.now() + delay, ...W.q.map(x => x.t + 2000));
  out.slice(0, 5).forEach(o => { t += (2 + o.text.length * .06 + Math.random() * 4) * 1000; W.q.push({t: Math.round(t), w: o.w, text: o.text}); });
  if (ac && out.length) ac.commit(t + 2000);
  W.last = Date.now(); wSave(); renderWatch();
}

/* ---- the big view: the same match, enlarged over the page, with a graph of the lead so far ---- */
let wBigOn = false;
function wBig(on){
  wBigOn = !!on && !!W; const c = $('#watchSlot .watch'); if (!c) return;
  c.classList.toggle('big', wBigOn); document.documentElement.classList.toggle('w-bigopen', wBigOn);
  const b = c.querySelector('.w-big'); if (b){ b.setAttribute('aria-label', wBigOn ? 'Shrink' : 'Enlarge'); b.dataset.tip = wBigOn ? 'Shrink' : 'Enlarge'; b.innerHTML = wBigOn ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>'; }
  if (!wBigOn){ const g = c.querySelector('.w-graph'); if (g) g.innerHTML = ''; }
  renderWatch();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && wBigOn) wBig(false); });
document.addEventListener('pointerdown', e => { if (wBigOn && !e.target.closest('#watchSlot .watch') && !e.target.closest('.modal, .toast')) wBig(false); });      // a tap outside shrinks it back
// minutes studied by each player, minute by minute, as a lead line (above the middle: the first player is ahead)
function wGraph(el, st){
  if (!el) return;
  const m0 = W.s0, m1 = Math.max(m0 + 5, st.over ? W.e1 : st.m), Wd = 600, H = 120, K = 120;
  const pts = [], vals = [];
  for (let k = 0; k <= K; k++){ const m = m0 + (m1 - m0) * k / K; if (m > st.m) break; vals.push([m, wElapsed(W.sa, W.ea, m) - wElapsed(W.sc, W.ec, m)]); }
  const mx = Math.max(5, ...vals.map(v => Math.abs(v[1]))) * 1.15, X = m => (m - m0) / (m1 - m0) * Wd, Y = v => H / 2 - v / mx * (H / 2 - 6);
  vals.forEach(([m, v]) => pts.push(`${X(m).toFixed(1)},${Y(v).toFixed(1)}`));
  const key = pts.length + ':' + (pts[pts.length - 1] || ''); if (el.dataset.k === key) return; el.dataset.k = key;
  el.innerHTML = `<div class="w-gh"><span>Lead over time</span><small><i class="dot s0"></i>${esc(bot(W.a).name)} ahead · <i class="dot s1"></i>${esc(bot(W.c).name)} ahead</small></div>
    <svg viewBox="0 0 ${Wd} ${H}" preserveAspectRatio="none"><rect x="0" y="0" width="${Wd}" height="${H / 2}" class="ga"/><rect x="0" y="${H / 2}" width="${Wd}" height="${H / 2}" class="gc"/><line x1="0" x2="${Wd}" y1="${H / 2}" y2="${H / 2}" class="g0"/><polyline points="${pts.join(' ')}" class="gl"/></svg>`;
}

/* ---- drawing ---- */
function renderWatch(fresh){
  const slot = $('#watchSlot'); if (!slot) return;
  if (!W || !RK_READY){ if (slot.innerHTML) slot.innerHTML = ''; return; }
  if (!slot.querySelector('.watch') || fresh){
    const A = bot(W.a), C = bot(W.c), side = (i, r) => `<div class="w-p" data-wp="${i}">${avatar(bot(i), 'md')}<div><button class="lnk" data-bot="${i}">${esc(bot(i).name)}</button>
      <small>#${(posOf(i) + 1).toLocaleString()} · ${emblem(rankOf(r), 'xs')} ${r.toLocaleString()}</small><span class="w-st"></span></div><b class="w-time">0:00</b></div>`;
    slot.innerHTML = `<div class="card watch"><div class="w-head"><span class="h first"><i class="lf-dot" aria-hidden="true"></i>Watching</span><span class="w-view"></span><button class="rp-ib w-big" data-wact="big" aria-label="Enlarge" data-tip="Enlarge"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg></button><button class="small-btn" data-wact="leave">Leave</button></div>
      <div class="w-players">${side(W.a, W.ra)}<span class="w-vs">vs</span>${side(W.c, W.rc)}</div>
      <p class="w-lead"></p><div class="w-graph"></div>
      <div class="w-along"></div>
      <div class="mc w-chat"><div class="mc-h"><span>Room chat</span></div><div class="mc-list" id="wList"></div><div class="ch-typing mc-typing" id="wTyping" aria-live="polite"></div>
      <form class="mc-send" id="wForm"><input id="wIn" maxlength="200" autocomplete="off" aria-label="Room chat message" placeholder="Say something to the room" data-ph="Say something to the room"><button class="small-btn accent">Send</button></form></div></div>`;
    const L = $('#wList'); L.addEventListener('scroll', () => { wStick = L.scrollHeight - L.scrollTop - L.clientHeight < 24; wScroll = L.scrollTop; }, {passive: true});
    slot.dataset.k = '';
    if (wBigOn){ wBigOn = false; wBig(true); return; }
  }
  const st = wState(), A = bot(W.a), C = bot(W.c);
  slot.querySelectorAll('.w-p').forEach(el => {
    const i = +el.dataset.wp, on = i === W.a ? st.aOn : st.cOn, t = i === W.a ? st.ta : st.tc, won = st.over && (i === W.a ? W.ma > W.mc : W.mc > W.ma);
    el.querySelector('.w-time').textContent = wClock(t);
    el.querySelector('.w-st').innerHTML = on ? '<i class="w-on"></i>Studying' : st.over ? (W.ma === W.mc ? 'Draw' : won ? `<b class="lft-d up">Won · +${Math.abs(W.dlt)} Elo</b>` : `<b class="lft-d down">Lost · −${Math.abs(W.dlt)} Elo</b>`) : 'Stopped';
    el.classList.toggle('off', !on && !won); el.classList.toggle('won', won);
  });
  slot.querySelector('.w-view').textContent = `${wViewers().toLocaleString()} watching`;
  const gap = Math.abs(st.ta - st.tc);
  slot.querySelector('.w-lead').textContent = st.over ? (W.ma === W.mc ? 'It’s a draw.' : `${W.ma > W.mc ? A.name : C.name} wins by ${Math.round(Math.abs(W.ma - W.mc))} min. The room closes in a few minutes.`)
    : gap < 1 ? 'Dead even.' : `${st.ta > st.tc ? A.name : C.name} is ahead by ${Math.floor(gap)} min${(!st.aOn || !st.cOn) ? ` · ${st.aOn ? C.name : A.name} has stopped, so ${st.aOn ? A.name : C.name} just has to keep going` : ''}.`;
  if (wBigOn) wGraph(slot.querySelector('.w-graph'), st);
  const al = slot.querySelector('.w-along');
  const alongKey = S.running ? (focusing() ? 'f' : 'b') : 'n';
  if (al.dataset.k !== alongKey){ al.dataset.k = alongKey;
    al.innerHTML = alongKey === 'f' ? '<span class="w-pill">You’re studying along. Chat opens on your break.</span>' : alongKey === 'b' ? '<span class="w-pill">On a break: say hi to the room.</span>'
      : '<button class="small-btn accent" data-wact="along">Study along</button><span class="hint">Starts your timer. Normal focus time, no Elo.</span>'; }
  // chat
  const L = $('#wList'), msgs = W.chat, k = msgs.length + '|' + (msgs.length ? msgs[msgs.length - 1].t : 0);
  if (slot.dataset.k !== k){
    const grew = msgs.length > (+slot.dataset.n || 0); slot.dataset.k = k; slot.dataset.n = msgs.length;
    L.innerHTML = msgs.length ? msgs.map(x => x.sys ? `<div class="mc-msg w-sys">${esc(x.text)}</div>` : `<div class="mc-msg${x.w === -1 ? ' me' : ''}"><b>${x.w === -1 ? 'You' : `<button class="lnk" data-bot="${x.w}">${esc(bot(x.w).name)}</button>`}</b> <span>${atLinks(esc(x.text))}</span></div>`).join('')
      : `<p class="hint mc-empty">${focusing() ? 'The room is quiet while you focus. Chat opens on your break.' : 'Nobody’s said anything yet.'}</p>`;
    L.scrollTop = wStick || (grew && msgs[msgs.length - 1].w === -1) ? L.scrollHeight : wScroll;
  }
  const ty = $('#wTyping');
  if (ty){ const ws = focusing() && !st.over ? [] : typingNow(W.q), key = ws.join(','); if (ty.dataset.k !== key){ ty.dataset.k = key; ty.innerHTML = typingHtml(ws); ty.classList.toggle('on', !!ws.length); } }
  const inp = $('#wIn'); if (inp){ const lock = focusing() && !st.over; if (inp.disabled !== lock){ inp.disabled = lock; $('#wForm button').disabled = lock; inp.placeholder = lock ? 'Chat opens on your break' : inp.dataset.ph; } }
}

/* ---- every second: the clock, the room's moments, and the queue ---- */
function wTick(){
  if (!W){ wPrevFoc = focusing(); return; }
  const st = wState(), now = Date.now(), foc = focusing() && !st.over;
  let changed = false;
  if (st.over && st.m - W.e1 > 6){ W = null; wSave(); renderWatch(); toast('The watch room closed.'); return; }
  // players stopping and the result, as moments in the chat
  [[W.a, W.ea], [W.c, W.ec]].forEach(([i, e]) => { if (st.m >= e && !W.seen[i]){ W.seen[i] = 1; changed = true;
    W.chat.push({t: now, sys: 1, text: `${bot(i).name} stopped at ${Math.floor(e - (i === W.a ? W.sa : W.sc))} min.`});
    if (!st.over){ if (foc) W.later = 'stop:' + i; else wSay('stop', 1500, bot(i).name); } } });
  if (st.over && !W.seen.end){ W.seen.end = 1; changed = true; W.chat.push({t: now, sys: 1, text: W.ma === W.mc ? 'Draw.' : `${bot(W.ma > W.mc ? W.a : W.c).name} wins.`}); W.q = []; wSay('end', 1500); }
  if (foc && W.q.length){ W.q = []; changed = true; }                    // the room waits while you focus
  // one message at a time, a couple of seconds apart (after a break or a pause, the backlog comes in one by one)
  if (W.q.length && W.q[0].t <= now && !foc && now - (W.lastMsg || 0) >= 2200){ const x = W.q.shift(); W.chat.push({t: now, w: x.w, text: x.text}); W.lastMsg = now; changed = true;
    if (W.q.length && W.q[0].t < now + 2200) W.q[0].t = now + 2200 + Math.random() * 2500; }
  if (!foc){
    if (wPrevFoc){ if (W.later){ const who = +W.later.split(':')[1]; W.later = null; wSay('stop', 2000, bot(who).name); } else if (now - W.last > 90000) wSay('open', 3000); }
    else if (!W.q.length && now - W.last > 150000 + (W.a % 60) * 1000 && !st.over) wSay('ambient', 2000);
  }
  wPrevFoc = focusing();
  if (W.chat.length > 120) W.chat = W.chat.slice(-120);
  if (changed) wSave();
  renderWatch();
}
setInterval(wTick, 1000);
document.addEventListener('submit', e => {
  if (e.target.id !== 'wForm') return; e.preventDefault();
  if (!W || (focusing() && !wState().over)) return;
  const inp = $('#wIn'), text = inp.value.replace(/\s+/g, ' ').trim(); if (!text) return;
  inp.value = ''; W.chat.push({t: Date.now(), w: -1, text}); wStick = true; W.q = W.q.filter(x => !x.re); wSave(); renderWatch();
  clearTimeout(wReplyT); wReplyT = setTimeout(() => wSay('reply', 1500), 3500);
});
document.addEventListener('click', e => {
  const wb = e.target.closest('[data-watch]');
  if (wb){ const p = (LF.pairs || []).find(x => x.a + '-' + x.c === wb.dataset.watch); if (p) watchMatch(p); return; }
  const a = e.target.closest('[data-wact]');
  if (a){ if (a.dataset.wact === 'big'){ wBig(!wBigOn); return; } if (a.dataset.wact === 'leave'){ wBig(false); W = null; wSave(); renderWatch(); } else if (a.dataset.wact === 'along' && !S.running) start(); renderWatch(); return; }
  const b = e.target.closest('#watchSlot [data-bot]'); if (b) openProfile(+b.dataset.bot);
});
// the watch room belongs to today's world: an old one from yesterday is dropped
if (W && W.dk !== wNowMin().dk) { W = null; wSave(); }
// the two players count as online while they hang around in the room after stopping
const _wOnline = chatWhoOnline;
chatWhoOnline = function(){
  const o = _wOnline.apply(this, arguments);
  if (W){ const st = wState(); [[W.a, st.aOn], [W.c, st.cOn]].forEach(([i, on]) => { if (!on && !o.includes(i)) o.push(i); }); }
  return o;
};
