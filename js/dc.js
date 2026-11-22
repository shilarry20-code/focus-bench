/* ---------- Messages, laid out like Discord ----------
   Left: search and every conversation (DMs and groups) with status dots and unread counts. Middle: the chat, with each
   person's run of messages under one avatar and name, day dividers, replies (a quote line above the message), reaction
   pills, and a toolbar on hover (react, reply, delete your own); on phones a long press opens the same actions. Right,
   in groups: the member list by Studying / Online / Offline. Deleting a chat hides it until they message you again.
   DM logic (replies, challenges, timing) lives in dms.js and group logic in groups.js; this draws them and handles input. */
const dcPhone = () => matchMedia('(max-width:760px)').matches;
let DC = {key: null, memP: false, q: '', reply: null, jump: null, mem: store.get('fb.dcMem', true), chal: false};
const DC_QUICK = ['❤️', '😂', '😮', '😢', '👍', '🔥'];
const DC_ALL = '😀 😁 😂 🤣 😃 😄 😅 😆 😉 😊 😋 😎 😍 🥰 😘 🙂 🤗 🤩 🤔 🤨 😐 😑 😶 🙄 😏 😣 😥 😮 🤐 😯 😪 😫 🥱 😴 😌 😛 😜 😝 🤤 😒 😓 😔 😕 🙃 🤑 😲 🙁 😖 😞 😟 😤 😢 😭 😦 😧 😨 😩 🤯 😬 😰 😱 🥵 🥶 😳 🤪 😵 🥴 😠 😡 🤬 😷 🤒 🤕 🤢 🤮 🤧 😇 🥳 🥺 🥹 🤠 🤡 🤥 🤫 🤭 🧐 🤓 😈 👿 💀 👻 👽 🤖 💩 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🫠 🫡 🫢 🫣 🫤 🫥 🫨 😮‍💨 😵‍💫 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 💕 💞 💓 💗 💖 💘 💝 👍 👎 👊 ✊ 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✌️ 🤞 🤟 🤘 👌 🤌 🤏 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤙 💪 🫶 🫡 🤷 🤦 👀 🔥 ✨ 💯 🎉 🎊 💥 💫 💢 💤 💦 💨 ❗ ❓ ‼️ ⁉️'.split(' ');
const dcOneEmoji = s => { s = String(s || '').trim(); if (!s || !SEG) return ''; const g = [...SEG.segment(s)].map(x => x.segment).find(x => /\p{Extended_Pictographic}/u.test(x)); return g && emoOk([...g.replace(/[\u{1F3FB}-\u{1F3FF}️‍♀♂↔↕]/gu, '')][0]) ? g : ''; };
// add (or with toggle, take back) a reaction; who: -1 for you, or a player
function dcReact(m, who, e, add){
  m.rx = m.rx || {}; const l = m.rx[e] || (m.rx[e] = []), i = l.indexOf(who);
  if (i >= 0){ if (!add) l.splice(i, 1); } else { if (who === -1) Object.keys(m.rx).forEach(k => { const j = m.rx[k].indexOf(-1); if (j >= 0 && k !== e) m.rx[k].splice(j, 1); }); l.push(who); }
  Object.keys(m.rx).forEach(k => { if (!m.rx[k].length) delete m.rx[k]; });
  if (m.g) saveGc(); else saveDms();
}

/* ---- conversations ---- */
const dcDms = () => [...new Set(DMS.msgs.filter(m => !m.del).map(m => m.w))].filter(w => thread(w).length);
function dcConvos(){
  const out = dcDms().map(w => { const t = thread(w), last = t[t.length - 1]; return {key: 'u:' + w, w, last, at: last.t, unread: dmUnread(w)}; });
  gcList().forEach(g => { const t = gcMsgs(g), last = t[t.length - 1]; out.push({key: 'g:' + g.id, g, last, at: last ? last.t : g.t, unread: gcUnread(g)}); });
  return out.sort((a, b) => b.at - a.at);
}
const dcNameOf = w => w === -1 ? myName() : w === -2 ? '' : bot(w).name;
const dcAv = (w, cls) => w === -1 ? myAvatar(cls) : avatar(bot(w), cls);
function dcGroupAv(g, cls = ''){ const a = g.m.slice(0, 2); return `<span class="dc-gav ${cls}">${a.map(w => avatar(bot(w), 'sm')).join('')}</span>`; }
const dcDot = st => `<i class="dc-st ${st}" title="${st === 'study' ? 'Studying' : st === 'on' ? 'Online' : 'Offline'}"></i>`;
const dcWState = w => dmStudying(w) ? 'study' : dmOnline(w) ? 'on' : 'off';
function dcPrev(c){
  const m = c.last; if (!m) return 'No messages yet';
  const who = m.me || m.w === -1 ? 'You: ' : c.g && !m.sys ? `${dcNameOf(m.w)}: ` : '';
  const body = m.ch ? (m.ch.k === 'el' ? 'posted an Elimination lobby' : m.g ? 'posted a 1v1 challenge' : `sent a ${m.ch.mode === 'f' ? 'friendly' : 'ranked'} challenge`) : m.text || '';
  return who + body;
}
function dcRow(c){
  const on = DC.key === c.key, mute = c.g && c.g.mute;
  const av = c.g ? dcGroupAv(c.g) : `<span class="dc-avw">${avatar(bot(c.w))}${dcDot(dcWState(c.w))}</span>`;
  const name = c.g ? gcName(c.g) : bot(c.w).name, p = dcPrev(c);
  return `<div class="dc-row${on ? ' on' : ''}${c.unread && !mute ? ' unread' : ''}${mute ? ' muted' : ''}" data-dckey="${c.key}"${c.w != null ? ` data-open="${c.w}"` : ''} role="button" tabindex="0">${av}
    <span class="dc-rmeta"><span class="dc-rn"><b>${esc(name)}</b>${c.last ? `<time>${chatTime(c.last.t)}</time>` : ''}</span><span class="dc-rp dm-p">${esc(p.length > 70 ? p.slice(0, 70) + '…' : p)}</span></span>
    ${c.unread ? `<b class="dc-badge${mute ? ' mute' : ''}">${c.unread > 99 ? '99+' : c.unread}</b>` : ''}<button class="dc-rmore" data-dcmenu="${c.key}" aria-label="More">⋯</button></div>`;
}
function dcSideHtml(){
  const q = DC.q.trim().toLowerCase();
  if (q) return dcSearchHtml(q);
  const cs = dcConvos();
  return cs.length ? cs.map(dcRow).join('') : `<p class="hint dc-empty">No messages yet. Open anyone’s profile and tap <b>Message</b>, or start a group.</p>`;
}
// search: conversations by name, then messages that contain the words
function dcSearchHtml(q){
  const words = q.split(/\s+/).filter(Boolean), hit = t => { t = String(t || '').toLowerCase(); return words.every(x => t.includes(x)); };
  const mark = t => { let h = esc(t); words.forEach(x => { h = h.replace(new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), s => `<mark>${s}</mark>`); }); return h; };
  const cs = dcConvos().filter(c => hit(c.g ? gcName(c.g) : bot(c.w).name));
  const ms = [];
  dcDms().forEach(w => thread(w).forEach(m => { if (m.text && hit(m.text)) ms.push({key: 'u:' + w, m, name: bot(w).name, who: m.me ? -1 : w}); }));
  gcList().forEach(g => gcMsgs(g).forEach(m => { if (m.text && !m.sys && hit(m.text)) ms.push({key: 'g:' + g.id, m, name: gcName(g), who: m.w}); }));
  ms.sort((a, b) => b.m.t - a.m.t);
  const snip = t => { const i = t.toLowerCase().indexOf(words[0]); const a = Math.max(0, i - 30); return (a ? '…' : '') + t.slice(a, a + 110) + (a + 110 < t.length ? '…' : ''); };
  return `${cs.length ? `<div class="dc-sh">Conversations</div>${cs.map(dcRow).join('')}` : ''}
    <div class="dc-sh">Messages${ms.length ? ` · ${ms.length.toLocaleString()}` : ''}</div>
    ${ms.length ? ms.slice(0, 60).map(r => `<div class="dc-hit" data-dckey="${r.key}" data-dcjump="${r.m.id}" role="button" tabindex="0">${dcAv(r.who, 'sm')}<span><span class="dc-rn"><b>${esc(dcNameOf(r.who))}</b><small>${esc(r.name)} · ${chatTime(r.m.t)}</small></span><span class="dc-hp">${mark(snip(r.m.text))}</span></span></div>`).join('') : '<p class="hint dc-empty">No messages match.</p>'}`;
}

/* ---- the chat ---- */
function dcList(){
  if (!DC.key) return [];
  if (DC.key.startsWith('u:')){ const w = +DC.key.slice(2); return thread(w).map(m => ({...m, a: m.me ? -1 : w, _m: m})); }
  const g = GC.g[DC.key.slice(2)]; return g ? gcMsgs(g).map(m => ({...m, a: m.w, _m: m})) : [];
}
const dcDay = t => { const d = dayKey(t), n = Date.now(); return d === dayKey(n) ? 'Today' : d === dayKey(n - 864e5) ? 'Yesterday' : new Date(t).toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'}); };
const dcClock = t => new Date(t).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
function dcMsgsHtml(list){
  if (!list.length) return '';
  const by = new Map(list.map(m => [m.id, m])); let prev = null, out = '';
  list.forEach(m => {
    if (!prev || dayKey(prev.t) !== dayKey(m.t)) { out += `<div class="dc-day"><span>${dcDay(m.t)}</span></div>`; prev = null; }
    if (m.sys){ out += `<div class="dc-sys" data-mid="${m.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg><span>${atLinks(esc(m.text))}</span><time>${dcClock(m.t)}</time></div>`; prev = m; return; }
    const first = !prev || prev.sys || prev.a !== m.a || m.t - prev.t > 7 * 60000 || m.re || m.ch || prev.ch;
    const rep = m.re ? by.get(m.re) || (m.g ? GC.msgs : DMS.msgs).find(x => x.id === m.re) : null;
    const repA = rep ? (rep.me ? -1 : rep.g ? rep.w : rep.w) : null;
    const name = m.a === -1 ? myName() : bot(m.a).name, hue = m.a === -1 ? (P.myHue != null ? P.myHue : 215) : bot(m.a).hue;
    const rx = m.rx && Object.keys(m.rx).length ? `<div class="dc-rx">${Object.entries(m.rx).map(([e, ws]) => `<button class="dc-pill${ws.includes(-1) ? ' mine' : ''}" data-dcpill="${esc(e)}" title="${esc(ws.slice(0, 8).map(dcNameOf).join(', ') + (ws.length > 8 ? '…' : ''))}">${e}<b>${ws.length}</b></button>`).join('')}</div>` : '';
    const body = (m.ch ? (m.g ? gcCard(m._m) : chCard(m._m)) : '') + (m.text ? `<div class="dc-t">${atLinks(esc(m.text))}</div>` : '');
    const tools = `<div class="dc-tools" role="toolbar"><button data-dcreact aria-label="Add reaction" title="Add reaction"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9.2 9.8h.01M14.8 9.8h.01"/></svg></button>${m.text || m.ch ? `<button data-dcreply aria-label="Reply" title="Reply"><svg viewBox="0 0 24 24"><path d="M10 7 5 12l5 5M5 12h9a5 5 0 0 1 5 5v1"/></svg></button>` : ''}${m.a === -1 && m.text && !m.ch ? `<button data-dcdel aria-label="Delete" title="Delete"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button>` : ''}</div>`;
    out += `<div class="dc-m${first ? ' first' : ''}${DC.reply === m.id ? ' replying' : ''}" data-mid="${m.id}">
      ${rep ? `<div class="dc-rep" data-dcjump="${rep.id}"><i></i>${dcAv(repA, 'xs')}<b>${esc(dcNameOf(repA))}</b><span>${esc(rep.text || (rep.ch ? 'a challenge' : '…')).slice(0, 90)}</span></div>` : ''}
      ${first ? `<span class="dc-mav">${m.a === -1 ? `<button class="dc-avb" data-me="1">${myAvatar()}</button>` : `<button class="dc-avb" data-bot="${m.a}">${avatar(bot(m.a))}</button>`}</span><div class="dc-mh"><button class="dc-name" ${m.a === -1 ? 'data-me="1"' : `data-bot="${m.a}"`} style="--h:${hue}">${esc(name)}</button><time>${dcDay(m.t) === 'Today' ? 'Today at ' : dcDay(m.t) === 'Yesterday' ? 'Yesterday at ' : new Date(m.t).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric', year: '2-digit'}) + ' '}${dcClock(m.t)}</time></div>` : `<time class="dc-gut">${dcClock(m.t)}</time>`}
      <div class="dc-body">${body}${rx}</div>${tools}</div>`;
    prev = m;
  });
  return out;
}
// a challenge card posted in a group
function gcCard(m){
  const c = m.ch, g = GC.g[m.g], by = m.w === -1 ? 'You' : bot(m.w).name, now = Date.now();
  if (c.k === '1v1'){
    const st = c.st === 'p' ? `<span class="cc-left" data-exp="${c.exp}">${clock(Math.max(0, c.exp - now))} left</span>` : c.st === 'a' ? `<span class="cc-st ok">Taken by ${esc(c.taker === -1 ? 'you' : bot(c.taker).name)}${c.res != null ? ` · ${esc(bot(c.res).name)} won` : ''}</span>` : '<span class="cc-st">Expired</span>';
    const btn = c.st === 'p' && m.w !== -1 ? `<div class="cc-btns"><button class="small-btn accent" data-gctake="${m.id}">Take it</button></div>` : '';
    return `<div class="cc cc-${c.st}${c.mode === 'f' ? ' fr' : ''}"><div class="cc-h"><b>Open ${c.mode === 'f' ? 'friendly' : 'ranked'} 1v1</b>${st}</div><p class="cc-sub">${esc(by)} ${m.w === -1 ? 'are' : 'is'} up for a match. First one to take it plays.</p>${m.w !== -1 && c.mode === 'r' ? `<p class="cc-stake">${chStakes(m.w)}</p>` : ''}${btn}</div>`;
  }
  // Elimination: who's in (members who joined; yours shows your live lobby)
  let ins = [], n = c.size;
  if (c.me && EL.G && EL.G.L.id === c.lid){ const L = EL.G.L; ins = L.players.filter((w, k) => (L.joinAt[k] || 0) <= now); }
  else ins = [m.w, ...(c.joined || []).filter(([, t]) => t <= now).map(([w]) => w)];
  const st = c.st === 'p' ? `<span class="cc-left cc-start" data-start="${c.exp}">starts in ${clock(Math.max(0, c.exp - now))}</span>` : c.st === 'a' ? `<span class="cc-st ok">${c.me ? 'You’re in' : 'Started'}${c.res != null ? ` · ${esc(bot(c.res).name)} won` : ''}</span>` : '<span class="cc-st">Didn’t fill</span>';
  const btn = c.st === 'p' && !c.me ? `<div class="cc-btns"><button class="small-btn accent" data-gctake="${m.id}">Join</button></div>` : c.me && EL.G && EL.G.L.id === c.lid && !EL.G.done ? `<div class="cc-btns"><button class="small-btn" data-go="elim">Open lobby</button></div>` : '';
  return `<div class="cc cc-${c.st} cc-el"><div class="cc-h"><b>Elimination · ${n} players</b>${st}</div><p class="cc-sub">${esc(by)} ${m.w === -1 ? 'started' : 'is starting'} a lobby${g ? ` for ${esc(gcName(g))}` : ''}. ${Math.min(ins.length, n)}/${n} in.</p>
    <div class="cc-ins">${ins.slice(0, 16).map(w => dcAv(w, 'xs')).join('')}</div>${btn}</div>`;
}
function dcHeadHtml(){
  if (DC.key.startsWith('u:')){
    const w = +DC.key.slice(2), B = bot(w), rk = rankOf(botRating(w));
    return `<button class="dc-back" data-dcback aria-label="Back">←</button><span class="dc-hav">${avatar(B)}${dcDot(dcWState(w))}</span><span class="dc-hw"><button class="dc-hn" data-bot="${w}">${esc(B.name)}</button><small>${emblem(rk, 'xs')} ${esc(rk.full)} · <span id="dmSt">${dmStatus(w)}</span></small></span>
      <button class="small-btn" data-dmchal="1">Challenge</button><button class="dc-ib" data-dcmenu="${DC.key}" aria-label="More">⋯</button>`;
  }
  const g = GC.g[DC.key.slice(2)], on = gcOnline(g).length;
  return `<button class="dc-back" data-dcback aria-label="Back">←</button>${dcGroupAv(g, 'hd')}<span class="dc-hw"><b class="dc-hn">${esc(gcName(g))}</b><small>${g.m.length + 1} members · ${on} online${g.mute ? ' · muted' : ''}</small></span>
    <button class="dc-ib${(dcPhone() ? DC.memP : DC.mem) ? ' on' : ''}" data-dcmem aria-label="Members" title="Members"><svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.1 2.8-5 5.5-5s4.9 1.9 5.5 5M15.5 5.6a3 3 0 0 1 0 5.8M17 14.2c2 .6 3.2 2.3 3.6 4.8"/></svg></button><button class="dc-ib" data-dcinfo aria-label="Group settings" title="Group settings"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button>`;
}
function dcMembersHtml(g){
  const sec = (t, ws) => ws.length ? `<div class="dc-msec">${t} — ${ws.length}</div>${ws.map(w => `<button class="dc-mem" data-bot="${w}"><span class="dc-avw">${avatar(bot(w), 'sm')}${dcDot(gcState(w))}</span><span><b style="--h:${bot(w).hue}">${esc(bot(w).name)}</b><small>${gcState(w) === 'study' ? 'Studying' : esc(bot(w).subject)}</small></span></button>`).join('')}` : '';
  const st = w => gcState(w);
  return `<div class="dc-msec">You</div><div class="dc-mem me"><span class="dc-avw">${myAvatar('sm')}</span><span><b>${esc(myName())}</b></span></div>` + sec('Studying', g.m.filter(w => st(w) === 'study')) + sec('Online', g.m.filter(w => st(w) === 'on')) + sec('Offline', g.m.filter(w => st(w) === 'off'));
}
function dcComposerHtml(){
  const isG = DC.key.startsWith('g:'), ph = isG ? `Message #${gcName(GC.g[DC.key.slice(2)])}` : `Message @${bot(+DC.key.slice(2)).name}`;
  return `<div class="dc-replybar" id="dcReplyBar" hidden></div>
    <div class="dm-chal" id="dmChal" hidden></div>
    <div class="dc-chmenu" id="dcChMenu" hidden></div>
    <form class="dc-form" id="dmForm"><button type="button" class="dc-plus" data-dcplus aria-label="Challenges" title="Send a challenge"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
      <input id="dmIn" maxlength="300" placeholder="${esc(ph)}" data-ph="${esc(ph)}" autocomplete="off" aria-label="Message"><button class="dc-send" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M4 12 20 4l-6 16-3-7z"/></svg></button></form>
    <div class="ch-typing dc-typing" id="${isG ? 'gcTyping' : 'dmTyping'}" aria-live="polite"></div>`;
}

/* ---- drawing the page ---- */
renderChat = function(){
  renderChatTabs();
  const el = $('#chatBody'); if (!el || $('#page-chat').hidden) return;
  if (!RK_READY){ el.innerHTML = '<p class="hint">Loading players…</p>'; return; }
  if (DC.key && DC.key.startsWith('g:') && (!GC.g[DC.key.slice(2)] || GC.g[DC.key.slice(2)].left)) DC.key = null;
  DM_OPEN = DC.key && DC.key.startsWith('u:') ? +DC.key.slice(2) : null; CHAT_TAB = 'dm';
  let root = $('#dcRoot');
  if (!root){
    el.innerHTML = `<div class="dc card" id="dcRoot"><aside class="dc-side"><div class="dc-shead"><b>Messages</b><button class="small-btn" data-dcnew title="New group"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Group</button></div>
      <label class="dc-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input id="dcQ" placeholder="Search messages" autocomplete="off" aria-label="Search messages"></label>
      <div class="dc-rows" id="dcRows"></div></aside><section class="dc-main" id="dcMain"></section><aside class="dc-members" id="dcMembers" hidden></aside></div>`;
    root = $('#dcRoot');
  }
  if ($('#dcQ').value !== DC.q && document.activeElement !== $('#dcQ')) $('#dcQ').value = DC.q;
  if (DM_OPEN != null && dmUnread(DM_OPEN)){ DMS.read[DM_OPEN] = Date.now(); saveDms(); }
  if (DC.key && DC.key.startsWith('g:') && gcUnread(GC.g[DC.key.slice(2)])){ GC.read[DC.key.slice(2)] = Date.now(); saveGc(); }
  $('#dcRows').innerHTML = dcSideHtml();
  root.classList.toggle('open', !!DC.key);
  const main = $('#dcMain'), mem = $('#dcMembers');
  if (!DC.key){ main.dataset.key = ''; main.innerHTML = `<div class="dc-none"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg><b>Your messages</b><p class="hint">Pick a conversation, or start a group with people you follow who follow you back.</p><button class="small-btn accent" data-dcnew>New group</button></div>`; mem.hidden = true; root.classList.remove('with-mem'); return; }
  // the chat itself: built once per conversation, then only the parts that change
  if (main.dataset.key !== DC.key){
    main.dataset.key = DC.key; DC.reply = null; dmChalOpen = false; DC.chal = false; DC.memP = false;
    main.innerHTML = `<header class="dc-head" id="dcHead"></header><div class="dc-list" id="dcList" data-w="${DM_OPEN != null ? DM_OPEN : ''}"></div>${dcComposerHtml()}`;
    setTimeout(() => { const i = $('#dmIn'); if (i && !i.disabled && matchMedia('(min-width:761px)').matches) i.focus(); }, 30);
  }
  $('#dcHead').innerHTML = dcHeadHtml();
  const L = $('#dcList'), near = L.scrollHeight - L.scrollTop - L.clientHeight < 90 || !L.dataset.drawn;
  const list = dcList();
  L.innerHTML = list.length ? dcMsgsHtml(list) : `<div class="dc-start">${DM_OPEN != null ? `${avatar(bot(DM_OPEN), 'lg')}<b>${esc(bot(DM_OPEN).name)}</b><p class="hint">This is the beginning of your messages with ${esc(bot(DM_OPEN).name)}. Your record together: ${recStr(DM_OPEN)}.</p>` : '<b>Welcome to the group!</b><p class="hint">Say hi, or post a challenge with the + button.</p>'}</div>`;
  L.dataset.drawn = 1;
  if (DC.jump){ const t = L.querySelector(`[data-mid="${DC.jump}"]`); DC.jump = null; if (t){ t.scrollIntoView({block: 'center'}); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1800); } }
  else if (near || DC.down){ DC.down = false; L.scrollTop = L.scrollHeight; requestAnimationFrame(() => { L.scrollTop = L.scrollHeight; }); }
  // members
  const isG = DC.key.startsWith('g:'), memOn = dcPhone() ? DC.memP : DC.mem;
  mem.hidden = !isG || !memOn; root.classList.toggle('with-mem', isG && memOn);
  if (isG && memOn) mem.innerHTML = `<div class="dc-mtop"><b>Members</b><button class="dc-ib" data-dcmem aria-label="Close members">×</button></div>` + dcMembersHtml(GC.g[DC.key.slice(2)]);
  // composer bits
  const rb = $('#dcReplyBar'), rm = DC.reply ? list.find(m => m.id === DC.reply) : null;
  rb.hidden = !rm; rb.innerHTML = rm ? `Replying to <b>${esc(dcNameOf(rm.a))}</b><span>${esc((rm.text || 'a challenge').slice(0, 60))}</span><button type="button" data-dcunreply aria-label="Cancel reply">×</button>` : '';
  const ch = $('#dmChal');
  if (DM_OPEN != null){ const s = stakes(botRating(DM_OPEN)); ch.hidden = !dmChalOpen; ch.innerHTML = dmChalOpen ? `<span class="hint">Challenge ${esc(bot(DM_OPEN).name)} (${botRating(DM_OPEN).toLocaleString()} Elo). Expires in 15 min.</span><button class="small-btn accent" data-send="r">Ranked<small>Win +${s.win} · Loss −${s.loss}</small></button><button class="small-btn" data-send="f">Friendly<small>No Elo change</small></button><button class="ch-x" data-chx="1" aria-label="Cancel">✕</button>` : ''; }
  else ch.hidden = true;
  const cm = $('#dcChMenu'); cm.hidden = !(isG && DC.chal);
  cm.innerHTML = isG && DC.chal ? `<b>Post a challenge</b><button class="small-btn accent" data-gcpost="1v1:r">Ranked 1v1<small>first to take it plays</small></button><button class="small-btn" data-gcpost="1v1:f">Friendly 1v1<small>no Elo</small></button>${[4, 8, 16].map(n => `<button class="small-btn" data-gcpost="el:${n}">Elimination · ${n}<small>members join, others fill</small></button>`).join('')}<button class="ch-x" data-dcchx aria-label="Cancel">✕</button>` : '';
  const inp = $('#dmIn'); chatLockInput(inp, $('#dmForm .dc-send'));
  const lock = focusing(); el.querySelectorAll('[data-dmchal], [data-ch], [data-gctake], [data-dcplus]').forEach(b => { b.disabled = lock; });
};
function dcRefresh(){ chatBadge(); if (chatPageOpen()) renderChat(); }
const _chatBadge = chatBadge;
chatBadge = function(){
  const n = dmUnreadAll() + (typeof gcUnreadAll === 'function' ? gcUnreadAll() : 0), txt = n > 99 ? '99+' : n ? String(n) : '';
  document.querySelectorAll('.chat-badge').forEach(b => { b.textContent = txt; b.hidden = !n; });
};
function dcOpen(key, jump){
  DC.key = key; DC.jump = jump || null;
  $('#botModal').hidden = true;
  if ($('#page-chat').hidden) showPage('chat'); else renderChat();
  chatBadge();
}
openDm = function(w){ dcOpen('u:' + w); };
// typing in groups, live countdowns
setInterval(() => {
  if (!chatPageOpen() || !DC.key) return;
  if (DC.key.startsWith('g:')){ const t = $('#gcTyping'); if (t){ const ws = typingNow(GC.q.filter(q => q.g === DC.key.slice(2) && q.text)), k = ws.join(','); if (t.dataset.k !== k){ t.dataset.k = k; t.innerHTML = typingHtml(ws); t.classList.toggle('on', !!ws.length); } } }
  document.querySelectorAll('#dcList .cc-left[data-exp]').forEach(el => { const ms = +el.dataset.exp - Date.now(); el.textContent = ms > 0 ? `${clock(ms)} left` : 'Expired'; });
  document.querySelectorAll('#dcList .cc-start[data-start]').forEach(el => { const ms = +el.dataset.start - Date.now(); el.textContent = ms > 0 ? `starts in ${clock(ms)}` : 'Starting…'; });
  chatLockInput($('#dmIn'), $('#dmForm .dc-send'));
}, 1000);

/* ---- reactions picker and the phone action sheet ---- */
function dcMsgOf(id){ return DMS.msgs.find(m => m.id === id) || GC.msgs.find(m => m.id === id); }
function dcPicker(anchor, id){
  dcPickClose();
  const el = document.createElement('div'); el.className = 'dc-pick'; el.id = 'dcPick'; el.dataset.id = id;
  el.innerHTML = `<div class="dc-pq">${DC_QUICK.map(e => `<button data-dcpick="${e}">${e}</button>`).join('')}</div><div class="dc-pall">${DC_ALL.map(e => `<button data-dcpick="${e}">${e}</button>`).join('')}</div>`;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right - w))}px`;
  el.style.top = `${r.top - h - 6 > 8 ? r.top - h - 6 : Math.min(innerHeight - h - 8, r.bottom + 6)}px`;
}
function dcPickClose(){ const p = $('#dcPick'); if (p) p.remove(); const s = $('#dcSheet'); if (s) s.remove(); }
function dcSheet(id){
  dcPickClose(); const m = dcMsgOf(id); if (!m) return;
  const mine = m.me || m.w === -1;
  const el = document.createElement('div'); el.className = 'dc-sheet'; el.id = 'dcSheet'; el.dataset.id = id;
  el.innerHTML = `<div class="dc-sheet-in"><div class="dc-pq">${DC_QUICK.map(e => `<button data-dcpick="${e}">${e}</button>`).join('')}<button data-dcmorepick aria-label="More reactions">＋</button></div>
    ${m.text || m.ch ? '<button class="dc-sb" data-dcsreply>Reply</button>' : ''}${m.text ? '<button class="dc-sb" data-dccopy>Copy text</button>' : ''}${mine && m.text && !m.ch ? '<button class="dc-sb danger" data-dcsdel>Delete message</button>' : ''}<button class="dc-sb" data-dcsclose>Cancel</button></div>`;
  document.body.appendChild(el);
}
let dcHold = null;
document.addEventListener('pointerdown', e => {
  const m = e.target.closest('#dcList .dc-m'); if (!m || e.pointerType === 'mouse' || e.target.closest('button, a, .cc')) return;
  dcHold = setTimeout(() => { dcHold = null; if (navigator.vibrate) navigator.vibrate(12); dcSheet(m.dataset.mid); }, 450);
});
['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.addEventListener(t, e => { if (dcHold && (t !== 'pointermove' || Math.abs(e.movementY) + Math.abs(e.movementX) > 6)){ clearTimeout(dcHold); dcHold = null; } }));
document.addEventListener('contextmenu', e => { if (e.target.closest('#dcList .dc-m') && matchMedia('(pointer: coarse)').matches) e.preventDefault(); });

/* ---- the new group and group settings windows ---- */
function dcModal(html){
  let m = $('#dcModal');
  if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'dcModal'; m.innerHTML = '<div class="modal-card dc-mc" role="dialog" aria-modal="true"><button class="x" aria-label="Close">×</button><div id="dcModalBody"></div></div>'; document.body.appendChild(m); }
  $('#dcModalBody').innerHTML = html; m.hidden = false;
}
const dcModalClose = () => { const m = $('#dcModal'); if (m) m.hidden = true; };
let DCN = {sel: new Set(), q: ''};
function dcPeopleRows(ws, sel){
  const q = DCN.q.trim().toLowerCase(), list = ws.filter(w => !q || bot(w).name.toLowerCase().includes(q));
  return list.length ? list.map(w => `<label class="dc-pr"><span class="dc-avw">${avatar(bot(w), 'sm')}${dcDot(gcState(w))}</span><span><b>${esc(bot(w).name)}</b><small>${esc(bot(w).subject)}</small></span><input type="checkbox" data-dcsel="${w}" ${sel.has(w) ? 'checked' : ''}></label>`).join('') : '<p class="hint">Nobody here.</p>';
}
function dcNewGroup(){
  DCN = {sel: new Set(), q: '', mode: 'new'};
  const mu = gcMutuals();
  dcModal(`<h2>New group</h2><p class="lead">Add people you follow who follow you back (up to ${GC_MAX}).</p>
    <input id="dcGName" placeholder="Group name (optional)" maxlength="40" class="dc-in">
    ${mu.length ? `<input id="dcPQ" placeholder="Search people" class="dc-in" autocomplete="off"><div class="dc-people" id="dcPeople">${dcPeopleRows(mu, DCN.sel)}</div>
    <div class="dc-mfoot"><span class="hint" id="dcSelN">0 selected</span><button class="small-btn accent" data-dccreate disabled>Create group</button></div>` : '<p class="hint">You don’t have any mutuals yet. Follow people from the Feed or their profiles; when they follow you back, you can add them.</p>'}`);
}
function dcInfo(g){
  DCN = {sel: new Set(), q: '', mode: 'add', g: g.id};
  const add = gcMutuals().filter(w => !g.m.includes(w));
  dcModal(`<h2>Group settings</h2>
    <div class="dc-irow"><input id="dcGRename" class="dc-in" maxlength="40" value="${esc(g.name || '')}" placeholder="${esc(gcName(g))}"><button class="small-btn" data-dcrename>Save name</button></div>
    <label class="row dc-irow"><span>Mute notifications</span><input type="checkbox" class="switch" data-dcmute ${g.mute ? 'checked' : ''}></label>
    <div class="h">Members · ${g.m.length + 1}</div><div class="dc-people">${g.m.map(w => `<div class="dc-pr"><span class="dc-avw">${avatar(bot(w), 'sm')}${dcDot(gcState(w))}</span><span><b>${esc(bot(w).name)}</b><small>${esc(bot(w).subject)}</small></span><button class="small-btn" data-dcrm="${w}">Remove</button></div>`).join('')}</div>
    ${add.length && g.m.length < GC_MAX ? `<div class="h">Add people</div><input id="dcPQ" placeholder="Search your mutuals" class="dc-in" autocomplete="off"><div class="dc-people" id="dcPeople">${dcPeopleRows(add, DCN.sel)}</div><div class="dc-mfoot"><span class="hint" id="dcSelN">0 selected</span><button class="small-btn accent" data-dcadd disabled>Add</button></div>` : ''}
    <div class="dc-danger"><button class="small-btn" data-dcclear>Delete chat history</button><button class="small-btn danger" data-dcleave>Leave group</button></div>`);
}
function dcMenu(anchor, key){
  dcPickClose(); const isG = key.startsWith('g:'), g = isG ? GC.g[key.slice(2)] : null;
  const el = document.createElement('div'); el.className = 'dc-pick dc-menu'; el.id = 'dcPick';
  el.innerHTML = isG ? `<button data-dcm="mute" data-k="${key}">${g.mute ? 'Unmute' : 'Mute'}</button><button data-dcm="info" data-k="${key}">Group settings</button><button data-dcm="leave" data-k="${key}" class="danger">Leave group</button>`
    : `<button data-dcm="profile" data-k="${key}">View profile</button><button data-dcm="del" data-k="${key}" class="danger">Delete chat</button>`;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect(); el.style.left = `${Math.max(8, Math.min(innerWidth - el.offsetWidth - 8, r.right - el.offsetWidth))}px`; el.style.top = `${Math.min(innerHeight - el.offsetHeight - 8, r.bottom + 4)}px`;
}
function dcDeleteChat(key){
  if (key.startsWith('u:')){ const w = +key.slice(2), was = DMS.hide[w]; DMS.hide[w] = Date.now(); saveDms(); if (DC.key === key) DC.key = null; renderChat();
    typeof undoToast === 'function' ? undoToast('Chat deleted.', () => { if (was) DMS.hide[w] = was; else delete DMS.hide[w]; saveDms(); renderChat(); }) : toast('Chat deleted.'); }
  else { const g = GC.g[key.slice(2)]; if (!g) return; g.hide = Date.now(); saveGc(); renderChat(); toast('Chat history deleted.'); }
}

/* ---- input ---- */
document.addEventListener('click', e => {
  if ($('#page-chat').hidden && !e.target.closest('#dcModal, #dcPick, #dcSheet')) return;
  const T = s => e.target.closest(s), stop = () => { e.stopImmediatePropagation(); e.preventDefault(); };
  let x;
  // reaction picker / sheet / menu
  if ((x = T('[data-dcpick]'))){ const box = x.closest('#dcPick, #dcSheet'), m = dcMsgOf(box.dataset.id); if (m) dcReact(m, -1, x.dataset.dcpick); dcPickClose(); renderChat(); return stop(); }
  if (T('[data-dcmorepick]')){ const id = $('#dcSheet').dataset.id; dcPickClose(); const row = document.querySelector(`#dcList [data-mid="${id}"]`); if (row) dcPicker(row, id); return stop(); }
  if ((x = T('#dcSheet [data-dcsreply]'))){ DC.reply = $('#dcSheet').dataset.id; dcPickClose(); renderChat(); $('#dmIn') && $('#dmIn').focus(); return stop(); }
  if (T('#dcSheet [data-dccopy]')){ const m = dcMsgOf($('#dcSheet').dataset.id); try { navigator.clipboard.writeText(m.text); toast('Copied.'); } catch(err){} dcPickClose(); return stop(); }
  if (T('#dcSheet [data-dcsdel]')){ const m = dcMsgOf($('#dcSheet').dataset.id); if (m){ m.del = 1; m.text = ''; m.g ? saveGc() : saveDms(); } dcPickClose(); renderChat(); return stop(); }
  if (T('#dcSheet [data-dcsclose]') || (T('#dcSheet') && !T('.dc-sheet-in'))){ dcPickClose(); return stop(); }
  if ((x = T('[data-dcm]'))){ const k = x.dataset.k, a = x.dataset.dcm, g = k.startsWith('g:') ? GC.g[k.slice(2)] : null; dcPickClose();
    if (a === 'del') dcDeleteChat(k); else if (a === 'profile') openProfile(+k.slice(2)); else if (a === 'mute'){ g.mute = !g.mute; saveGc(); renderChat(); chatBadge(); }
    else if (a === 'info') dcInfo(g); else if (a === 'leave' && confirm(`Leave “${gcName(g)}”?`)){ gcLeave(g); if (DC.key === k) DC.key = null; renderChat(); chatBadge(); }
    return stop(); }
  if (!T('#dcPick, #dcSheet')) dcPickClose();
  // the windows
  if (T('#dcModal') && (e.target === $('#dcModal') || T('#dcModal .x'))){ dcModalClose(); return stop(); }
  if (T('[data-dccreate]')){ const g = gcCreate([...DCN.sel], $('#dcGName').value); dcModalClose(); dcOpen('g:' + g.id); return stop(); }
  if (T('[data-dcadd]')){ const g = GC.g[DCN.g]; gcAdd(g, [...DCN.sel]); dcInfo(g); renderChat(); return stop(); }
  if ((x = T('[data-dcrm]'))){ const g = GC.g[DCN.g]; gcRemove(g, +x.dataset.dcrm); dcInfo(g); renderChat(); return stop(); }
  if (T('[data-dcrename]')){ const g = GC.g[DCN.g]; gcRename(g, $('#dcGRename').value); dcInfo(g); renderChat(); return stop(); }
  if (T('[data-dcclear]')){ dcModalClose(); dcDeleteChat('g:' + DCN.g); return stop(); }
  if (T('[data-dcleave]')){ const g = GC.g[DCN.g]; if (confirm(`Leave “${gcName(g)}”?`)){ gcLeave(g); dcModalClose(); DC.key = null; renderChat(); chatBadge(); } return stop(); }
  if ($('#page-chat').hidden) return;
  // the list
  if ((x = T('[data-dcmenu]'))){ dcMenu(x, x.dataset.dcmenu); return stop(); }
  if ((x = T('[data-dckey]'))){ dcOpen(x.dataset.dckey, x.dataset.dcjump); return stop(); }
  if (T('[data-dcnew]')){ dcNewGroup(); return stop(); }
  if (T('[data-dcback]')){ DC.key = null; renderChat(); return stop(); }
  if (T('[data-dcmem]')){ if (dcPhone()) DC.memP = !DC.memP; else { DC.mem = !DC.mem; store.set('fb.dcMem', DC.mem); } renderChat(); return stop(); }
  if (T('[data-dcinfo]')){ dcInfo(GC.g[DC.key.slice(2)]); return stop(); }
  // a message
  if ((x = T('[data-dcjump]'))){ const t = document.querySelector(`#dcList [data-mid="${x.dataset.dcjump}"]`); if (t){ t.scrollIntoView({block: 'center', behavior: motion() === 'off' ? 'auto' : 'smooth'}); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1800); } return stop(); }
  if ((x = T('[data-dcreact]'))){ dcPicker(x, x.closest('[data-mid]').dataset.mid); return stop(); }
  if ((x = T('[data-dcreply]'))){ DC.reply = x.closest('[data-mid]').dataset.mid; renderChat(); $('#dmIn') && $('#dmIn').focus(); return stop(); }
  if (T('[data-dcunreply]')){ DC.reply = null; renderChat(); return stop(); }
  if ((x = T('[data-dcdel]'))){ chatDelBtn(x, () => { const m = dcMsgOf(x.closest('[data-mid]').dataset.mid); if (m){ m.del = 1; m.text = ''; m.g ? saveGc() : saveDms(); renderChat(); } }); return stop(); }
  if ((x = T('[data-dcpill]'))){ const m = dcMsgOf(x.closest('[data-mid]').dataset.mid); if (m){ dcReact(m, -1, x.dataset.dcpill); renderChat(); } return stop(); }
  // challenges
  if (T('[data-dcplus]')){ if (DC.key.startsWith('u:')){ dmChalOpen = !dmChalOpen; } else DC.chal = !DC.chal; renderChat(); return stop(); }
  if (T('[data-dcchx]')){ DC.chal = false; renderChat(); return stop(); }
  if ((x = T('[data-gcpost]'))){ const [k, v] = x.dataset.gcpost.split(':'), g = GC.g[DC.key.slice(2)]; DC.chal = false; if (k === '1v1') gcPostCh(g, '1v1', v); else gcPostCh(g, 'el', null, +v); renderChat(); return stop(); }
  if ((x = T('[data-gctake]'))){ const m = GC.msgs.find(y => y.id === x.dataset.gctake); if (m) gcTake(m); renderChat(); return stop(); }
  if ((x = T('#dcList [data-me]'))){ openProfile(ME); return stop(); }
}, true);
document.addEventListener('change', e => {
  const s = e.target.closest('[data-dcsel]'); if (s){ const w = +s.dataset.dcsel; if (s.checked){ const lim = DCN.mode === 'add' ? GC_MAX - GC.g[DCN.g].m.length : GC_MAX; if (DCN.sel.size >= lim){ s.checked = false; toast(`Groups can have up to ${GC_MAX} people.`); return; } DCN.sel.add(w); } else DCN.sel.delete(w);
    const n = $('#dcSelN'); if (n) n.textContent = `${DCN.sel.size} selected`; const b = $('[data-dccreate], [data-dcadd]'); if (b) b.disabled = DCN.mode === 'new' ? DCN.sel.size < 2 : !DCN.sel.size; return; }
  const mu = e.target.closest('[data-dcmute]'); if (mu){ const g = GC.g[DCN.g]; g.mute = mu.checked; saveGc(); renderChat(); chatBadge(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'dcQ'){ DC.q = e.target.value; $('#dcRows').innerHTML = dcSideHtml(); return; }
  if (e.target.id === 'dcPQ'){ DCN.q = e.target.value; const box = $('#dcPeople'); if (!box) return; const g = GC.g[DCN.g]; box.innerHTML = dcPeopleRows(DCN.mode === 'add' ? gcMutuals().filter(w => !g.m.includes(w)) : gcMutuals(), DCN.sel); }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('#dcPick') || $('#dcSheet')){ dcPickClose(); return; }
  if ($('#dcModal') && !$('#dcModal').hidden){ dcModalClose(); return; }
  if (DC.reply && chatPageOpen()){ DC.reply = null; renderChat(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'dmForm') return; e.preventDefault(); e.stopImmediatePropagation();
  if (focusing() || !DC.key) return;
  const inp = $('#dmIn'), text = inp.value.replace(/\s+/g, ' ').trim(); if (!text) return;
  inp.value = ''; const re = DC.reply; DC.reply = null; DC.down = true;
  if (DC.key.startsWith('u:')) dmSend(+DC.key.slice(2), text, re); else gcSend(GC.g[DC.key.slice(2)], text, re);
}, true);
$('#chatPop').addEventListener('click', () => { const g = $('#chatPop').dataset.gc; if (g){ delete $('#chatPop').dataset.gc; dcOpen('g:' + g); } }, true);
addEventListener('storage', e => { if (e.key === 'fb.groups' && e.newValue){ try { GC = JSON.parse(e.newValue); } catch(err){ return; } dcRefresh(); } });
