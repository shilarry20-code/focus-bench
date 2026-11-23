/* ---------- things players do for you when you ask (or offer) in a chat ----------
   You ask in a message ("like my post", "follow me", "repost it", "comment on my pic") or, now and then, they offer
   ("lemme go like your story"). The code decides it the way challenges do: it spots the request, works out which
   post or story you mean, decides yes or no once, and tells Gemini the outcome so the text matches ("alr fine" works).
   The action then happens a little later, by itself, whatever the reply said.
     like     your post, story or comment: shows in the likes list, the count and your notifications
     follow   they follow you
     comment  Gemini writes a comment on your post
     repost   they add your post to their story
   Only a clear request counts: "i like your post" and "it looks like my post" do nothing, and so does a vague one. */
let ACT = store.get('fb.acts', {q: [], dec: {}, done: {}});
ACT.q = ACT.q || []; ACT.dec = ACT.dec || {}; ACT.done = ACT.done || {};
const saveAc = () => store.set('fb.acts', ACT);

/* ---- spotting the request ---- */
const acNorm = s => ' ' + String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/\bu\b/g, 'you').replace(/\bur\b/g, 'your').replace(/\b(?:pls+|plz+|pleaseee+)\b/g, 'please').replace(/\s+/g, ' ') + ' ';
// "i like", "we'd follow", "i really like": you're saying something, not asking
const AC_SAYS = /(?:^|\W)(?:i|we|they|i'd|id|i'll|ill|i'm|im|we'd|we'll|he|she)\s*(?:(?:really|also|just|do|still|actually|kinda|def|definitely|would|wanna|want to|totally|always|already|will|gonna|never|don't|dont|can't|cant|did|didn't|didnt|have|haven't|havent|had|am|going to|might|may|should|could|can)\s+)*$/;
// "looks like", "feel like", "something like": "like" isn't the verb
const AC_NOTVERB = /\b(?:look|looks|looked|looking|feel|feels|felt|seem|seems|seemed|sound|sounds|sounded|something|anything|nothing|everything|just|more|much|be|is|are|was|were|it's|its|that's|thats|what|how|exactly|almost|sort of|kind of|kinda|same|such|would|ill|i'd|id)\s*$/;
const AC_DET = /\b(?:my|your|the|a|an|that|this|his|her|their|any|no|some|another|every|each|one|ur|our)\s*$/;
const AC_MY = '(?:all\\s+|some\\s+|a few\\s+|both\\s+|every\\s+|each\\s+|the\\s+rest\\s+of\\s+)?(?:of\\s+)?(?:my|mine)\\b';
// said about some other time ("when i see you, follow me", "like my post later"): nothing happens now
const AC_LATER = /\b(?:when|whenever|if|once|next time|tomorrow|tonight|after|before|until|unless|someday|sometime)\b/;
const AC_LATER_AFTER = /^[^.?!]{0,40}\b(?:later|tomorrow|tonight|next time|after|until|when i|whenever i|if i)\b/;
function acHits(t, verb, after){
  const re = new RegExp(verb, 'g'); let m;
  while ((m = re.exec(t))){
    const before = t.slice(Math.max(0, m.index - 60), m.index).trimEnd(), post = t.slice(m.index + m[0].length, m.index + m[0].length + 60);
    if (AC_SAYS.test(before) || AC_NOTVERB.test(before)) continue;
    if (AC_LATER.test(before.slice(Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?')) + 1)) || AC_LATER_AFTER.test(post)) continue;      // "when i see you, follow me": not now
    if (after.test(post)) return {before, post};
  }
  return null;
}
// what the request is about: 'story', 'post', 'comment' or 'any'
function acObj(post){
  const x = post.slice(0, 44);
  if (/\bstor(?:y|ies)\b/.test(x)) return 'story';
  if (/\bcomments?\b/.test(x)) return 'comment';
  if (/\b(?:posts?|pics?|photos?|pictures?|vids?|videos?|reels?|uploads?|selfie)\b/.test(x)) return 'post';
  return 'any';
}
function acParse(text){
  const t = acNorm(text), out = [];
  const lk = acHits(t, "\\b(?:like|liked|likes|heart|hearted|upvote|upvoted|react to|reacted to)\\b", new RegExp('^\\s*(?:and\\s+\\w+\\s+)?(?:' + AC_MY + '|(?:it|that|this|them|those|these)\\b|the\\s+(?:post|posts|story|pic|pics|photo|comment))'));
  if (lk && !/^\s*(?:your|ur)\b/.test(lk.post)) out.push({act: 'like', obj: acObj(lk.post)});
  else if (!lk && /\b(?:like|heart)\s+and\s+(?:follow|comment|repost|share)\b/.test(t) && !AC_SAYS.test(t.slice(0, t.search(/\b(?:like|heart)\s+and\b/)).trimEnd())) out.push({act: 'like', obj: 'any'});
  const fo = acHits(t, "\\b(?:follow|followed|following)\\b", /^\s*(?:me\b|my\b|back\b|us\b|him\b|her\b|me back|for\s+follow\b|4\s*follow\b|each\s*other\b)/)
    || acHits(t, "\\b(?:f4f|f\\/f|follow4follow)\\b", /^/)
    || acHits(t, "\\badd\\b", /^\s*(?:me|us)\b(?!\s+(?:to|in|into|as)\b)/);
  if (fo && !/\b(?:following me)\b/.test(' ' + fo.before + ' ')) out.push({act: 'follow', obj: ''});
  let cm = acHits(t, "\\b(?:comment|commented)\\b", /^\s*(?:on\b|under\b|something\b|smth\b|sth\b|at\b|back\b|then\b|please\b|here\b|there\b|a\b)[^.?!]{0,36}?(?:\b(?:my|mine|it|that|this)\b|$)|^\s*(?:on|under)\b/);
  if (cm && AC_DET.test(cm.before)) cm = null;                                      // "my comment", "a comment" the noun
  if (!cm) cm = acHits(t, "\\b(?:drop|leave|write|add|put|post)\\s+(?:a|some|your)\\s+(?:comment|reply)\\b", /^[^.?!]{0,36}?\b(?:my|mine|it|that|this)\b/) || acHits(t, "\\bsay\\s+(?:something|smth|sth)\\b", /^\s*(?:on|under|about)\s+(?:my|mine|it|that|this)\b/);
  if (cm) out.push({act: 'comment', obj: 'post'});
  const rp = acHits(t, "\\b(?:re-?post(?:ed)?|re-?shar(?:e|ed))\\b", new RegExp('^\\s*(?:' + AC_MY + '|(?:it|that|this|them|those|these)\\b|the\\s+(?:post|pic|photo))'))
    || acHits(t, "\\b(?:share|shared|put|add|throw|stick|post)\\b", new RegExp('^\\s*(?:' + AC_MY + '|(?:it|that|this|them)\\b)[^.?!]{0,40}?\\b(?:stor(?:y|ies))\\b'))
    || acHits(t, "\\b(?:share|shared)\\b", new RegExp('^\\s*' + AC_MY + '\\s+(?:post|posts|pic|pics|photo|photos|picture|vid|video|reel)\\b'));
  if (rp && !/^\s*(?:with|to)\s+(?:me|us)\b/.test(rp.post)) out.push({act: 'repost', obj: 'post'});
  return out;
}

/* ---- what they could act on ---- */
const acPosts = () => (FD.posts || []).filter(p => p.w === -1 && !p.del && Date.now() - p.t < 30 * 864e5).sort((a, b) => b.t - a.t);
const acStories = () => stMine().slice().sort((a, b) => b.t - a.t);
function acFindMyComment(w){
  const all = []; (FD.posts || []).forEach(p => (p.cm || []).forEach(c => { if (c.w === -1 && c.t <= Date.now()) all.push({p, c}); }));
  return all.sort((a, b) => b.c.t - a.c.t).find(x => !(x.c.xl || []).includes(w)) || null;
}
const acNew = (list, w) => list.find(x => !(x.xl || []).includes(w));
function acDesc(kind, x){
  if (kind === 'story') return `their story (${stAbout(x)})`;
  if (kind === 'comment') return `their comment “${String(x.c.text).slice(0, 80)}”`;
  return fxAbout(x).replace(/^[^']*'s own /, 'their ').replace(/^.*?'s /, 'their ');
}
// which post/story/comment, or why there isn't one: {none}, {done} (already did it), or {kind, id, desc}
function acPick(act, w, obj){
  if (act === 'follow') return FD.followers.includes(w) ? {done: 'already follows them'} : {kind: 'follow', id: '', desc: ''};
  if (act === 'comment'){ const p = acPosts()[0]; return p ? {kind: 'post', id: p.id, desc: acDesc('post', p)} : {none: 1}; }
  if (act === 'repost'){ const p = acPosts().find(x => !(STY.rp || []).some(r => r.w === w && r.pid === x.id)); return p ? {kind: 'post', id: p.id, desc: acDesc('post', p)} : (acPosts().length ? {done: 'already reposted their post'} : {none: 1}); }
  // like
  const post = acPosts()[0], story = acStories()[0], cmt = obj === 'comment' ? acFindMyComment(w) : null;
  const pick = obj === 'story' ? (story ? ['story', story] : null) : obj === 'post' ? (post ? ['post', post] : null) : obj === 'comment' ? (cmt ? ['comment', cmt] : null)
    : (() => { const c = [story && !(story.xl || []).includes(w) && ['story', story], post && !(post.xl || []).includes(w) && ['post', post]].filter(Boolean).sort((a, b) => b[1].t - a[1].t); return c[0] || (story || post ? 'done' : null); })();
  if (!pick) return {none: 1};
  if (pick === 'done') return {done: 'already liked their latest post and story'};
  const [kind, x] = pick, has = kind === 'comment' ? (x.c.xl || []).includes(w) : (x.xl || []).includes(w);
  if (has) return {done: `already liked ${acDesc(kind, x)}`};
  return {kind, id: kind === 'comment' ? x.p.id + '|' + x.c.id : x.id, desc: acDesc(kind, x)};
}

/* ---- deciding ---- */
const AC_P = {like: .9, follow: .8, comment: .75, repost: .62};
function acDecide(w, act, key, pushy){
  const k = w + '|' + act + '|' + key;
  if (ACT.dec[k] == null){ ACT.dec[k] = Math.random() < clampN(AC_P[act] + (pushy ? .06 : 0) - (typeof dmStudying === 'function' && dmStudying(w) ? .08 : 0), .05, .97) ? 1 : 0; const ks = Object.keys(ACT.dec); if (ks.length > 400) ks.slice(0, 100).forEach(x => delete ACT.dec[x]); saveAc(); }
  return !!ACT.dec[k];
}
const AC_WHAT = {like: d => `like ${d}`, follow: () => 'follow them', comment: d => `comment on ${d}`, repost: d => `add ${d} to their story`};
// the note that goes on the end of a reply prompt, and a commit() that makes it happen once the reply exists
function acPrep(w, text, opt = {}){
  let reqs = []; try { reqs = acParse(text); } catch(e){ console.error(e); }
  const me = myName(), B = bot(w), notes = [], plan = [], pushy = /\b(?:why|didn't|didnt|never|still|yet)\b/.test(acNorm(text));
  reqs.forEach(r => {
    const tg = acPick(r.act, w, r.obj); if (tg.none) return;
    const what = AC_WHAT[r.act](tg.desc);
    if (tg.done){ notes.push(`${me} asks ${B.name} to ${what.replace(/ their .*| them$/, '')}, but ${B.name} ${tg.done}: they can mention that (e.g. "already did").`); return; }
    const yes = acDecide(w, r.act, tg.id, pushy);
    notes.push(yes ? `${me} asks ${B.name} to ${what}. ${B.name} AGREES and is doing it right now: the reply says so in their own words (a casual "ok", "bet", "done" is fine; don't describe the details).`
      : `${me} asks ${B.name} to ${what}. ${B.name} DOESN'T do it: the reply is a casual no, an excuse or a joke in their own words.`);
    if (yes) plan.push({act: r.act, kind: tg.kind, tid: tg.id});
  });
  if (!reqs.length && opt.offer !== false && Math.random() < .05){            // now and then they offer on their own
    const acts = ['like', 'like', 'follow'], act = acts[Math.floor(Math.random() * acts.length)], tg = acPick(act, w, 'any');
    if (!tg.none && !tg.done){ notes.push(`While replying, ${B.name} also mentions in a few casual words that they're about to ${AC_WHAT[act](tg.desc)} (like "lemme go like your story"); they're doing it right now.`); plan.push({act, kind: tg.kind, tid: tg.id}); }
  }
  return {note: notes.length ? ' ' + notes.join(' ') : '', plan, commit(due){ plan.forEach(p => acQueue(w, p, due)); }};
}
// the same for a room of people: some agree, some don't, the rest ignore it
function acPrepMany(ws, text){
  let reqs = []; try { reqs = acParse(text); } catch(e){ console.error(e); }
  const me = myName(), notes = [], plan = [], pool = ws.filter(w => w >= 0).sort(() => Math.random() - .5).slice(0, 4);
  if (!reqs.length || !pool.length) return {note: '', plan, commit(){}};
  reqs.forEach(r => {
    const yes = [], no = []; let desc = '', what = '';
    pool.forEach(w => { const tg = acPick(r.act, w, r.obj); if (tg.none || tg.done) return; what = AC_WHAT[r.act](tg.desc); desc = tg.desc; (acDecide(w, r.act, tg.id, false) ? yes : no).push([w, tg]); });
    if (!yes.length && !no.length) return;
    const names = l => l.map(([w]) => bot(w).name).join(' and ');
    notes.push(`${me} asks the group to ${what}. ${yes.length ? `${names(yes.slice(0, 2))} AGREE${yes.length === 1 ? 'S' : ''} and ${yes.length === 1 ? 'is' : 'are'} doing it right now (each says so in their own words, casually).` : ''} ${no.length ? `${names(no.slice(0, 1))} DON'T do it (a casual no or a joke).` : ''} Nobody else needs to answer that.`);
    yes.slice(0, 2).forEach(([w, tg]) => plan.push({w, act: r.act, kind: tg.kind, tid: tg.id}));
  });
  return {note: notes.length ? ' ' + notes.join(' ') : '', plan, commit(due){ plan.forEach(p => acQueue(p.w, p, due + Math.random() * 6000)); }};
}
function acQueue(w, p, due){
  ACT.q.push({id: chatId() + 'q', w, act: p.act, kind: p.kind, tid: p.tid, due: Math.round(due || Date.now() + 5000)}); saveAc();
}

/* ---- they say they did it: make it true ----
   "followed back", "got u added": when a player says in chat that they followed you, they follow you. Nothing is blocked; this only makes the claim real. */
const AC_FOLLOW_CLAIM = /\b(?:(?:i\s+)?(?:just\s+)?(?:followed|added)\s+(?:you|ya)\b|followed\s+(?:you\s+)?back\b|got\s+(?:you|ya)\s+(?:added|followed)\b|(?:i'm|im|i\s+am)\s+following\s+(?:you|ya)\b|following\s+(?:you|ya)\s+now\b|(?:you're|youre)\s+(?:added|followed)\b)/;
function acClaim(w, text){
  try {
    if (w == null || w < 0 || typeof FD === 'undefined' || !FD.followers) return;
    const t = acNorm(text);
    if (!AC_FOLLOW_CLAIM.test(t) || /\?|\b(?:if|when|whenever|will|gonna|should|wanna|can\s+i|would|ill|i'll|didn't|didnt|haven't|havent|not)\b/.test(t.slice(0, t.search(AC_FOLLOW_CLAIM)))) return;
    if (FD.followers.includes(w) || ACT.q.some(q => q.w === w && q.act === 'follow')) return;
    acQueue(w, {act: 'follow', kind: 'follow', tid: ''}, Date.now() + 1500 + Math.random() * 4000);
  } catch(e){ console.error(e); }
}

/* ---- doing it ---- */
const acLine = ['this is so good', 'love this', 'ok this goes hard', 'real', 'lowkey inspiring', 'we love to see it', 'nice one', 'locked in fr'];
async function acRun(j){
  const w = j.w, B = bot(w), now = Date.now(), me = myName();
  if (j.act === 'follow'){
    if (!FD.followers.includes(w)){ FD.followers.push(w); fdNote('follow', w, `<b>${esc(B.name)}</b> started following you`, null, now); }
    return;
  }
  if (j.act === 'like'){
    if (j.kind === 'post'){ const p = FD.posts.find(x => x.id === j.tid && x.w === -1); if (!p) return; p.xl = p.xl || []; if (p.xl.includes(w)) return; p.xl.push(w); fdNote('like', w, `<b>${esc(B.name)}</b> liked your post`, p.id, now); try { fxRefresh(p); } catch(e){} }
    else if (j.kind === 'story'){ const s = STY.mine.find(x => x.id === j.tid); if (!s) return; s.xl = s.xl || []; if (s.xl.includes(w)) return; s.xl.push(w); fdNote('like', w, `<b>${esc(B.name)}</b> liked your story`, null, now); saveSt(); }
    else if (j.kind === 'comment'){ const [pid, cid] = j.tid.split('|'), p = FD.posts.find(x => x.id === pid), c = p && (p.cm || []).find(x => x.id === cid); if (!c) return; c.xl = c.xl || []; if (c.xl.includes(w)) return; c.xl.push(w); fdNote('like', w, `<b>${esc(B.name)}</b> liked your comment`, pid, now); try { fdPersist(); } catch(e){} }
    saveFeed(); try { if (typeof fdViewRefresh === 'function') fdViewRefresh(); } catch(e){}
    return;
  }
  if (j.act === 'comment'){
    const p = FD.posts.find(x => x.id === j.tid && x.w === -1); if (!p) return; await fdCm(p);
    if (p.cm.some(c => c.w === w && c.t > p.t)) return;                       // they already commented on it
    let text = '';
    if (GEM.key && !(GEM.wait > Date.now())){
      try {
        const thread = p.cm.filter(x => x.t <= now).slice(-8).map(x => `${x.w === -1 ? me : bot(x.w).name}: ${x.text}`).join('\n');
        const got = await aiCall(FD_SYS(me), `Post ${p.id} by ${me}. ${p.type === 'scene' ? 'What the picture shows (background only, don’t list it)' : 'What it is'}: ${fdAbout(p)}${p.cap ? `\nCaption: ${p.cap}` : ''}\nComments so far:\n${thread || '(none yet)'}\n\n${me} asked ${B.name} to comment on it and ${B.name} agreed. Write ${B.name}'s comment: one short comment like a real person would leave. Answer with JSON: [{"text":"…"}]`);
        const x = (Array.isArray(got) ? got : []).find(m => m && m.text);
        if (x) text = emotionOnly(stripSegue(stripLeadName(String(x.text).replace(/#\w+/g, '').trim().slice(0, 240), [me])));
      } catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); }
    }
    if (!text) text = acLine[Math.floor(Math.random() * acLine.length)];
    p.cm.push({id: p.id + 'a' + now.toString(36) + w, w, t: now, text, lk: fdCmLikes(p, false)});
    fdNote('comment', w, `<b>${esc(B.name)}</b> commented: ${esc(text.slice(0, 80))}`, p.id, now); try { fdPersist(); } catch(e){}
    saveFeed(); try { renderFeed(); fdViewRefresh(); } catch(e){}
    return;
  }
  if (j.act === 'repost'){
    const p = FD.posts.find(x => x.id === j.tid && x.w === -1); if (!p) return;
    STY.rp = STY.rp || []; if (STY.rp.some(r => r.w === w && r.pid === p.id)) return;
    STY.rp.push({id: 'RQ' + w.toString(36) + now.toString(36), w, t: now, pid: p.id}); saveSt();
    FD.shared[p.id] = (FD.shared[p.id] || 0) + 1; fdNote('share', w, `<b>${esc(B.name)}</b> added your post to their story`, p.id, now); saveFeed();
    try { fdStrip(); fxRefresh(p); } catch(e){}
  }
}
// the messages you sent since they last said something (so "like my post" then "pls" still counts)
function acRecentMine(w){ const t = typeof thread === 'function' ? thread(w) : []; const out = []; for (let k = t.length - 1; k >= 0 && t[k].me; k--) out.unshift(t[k].text || ''); return out.join(' . '); }
// the things you said last in a chat (rows with me or w === -1), as one string
function acTail(list){ const out = []; for (let k = (list || []).length - 1; k >= 0 && (list[k].me || list[k].w === -1) && !list[k].sys; k--) out.unshift(list[k].text || ''); return out.join(' . '); }
let acBusy = false, acNoteT = 0;
async function acTick(){
  if (acBusy || !RK_READY) return;
  const now = Date.now(), due = ACT.q.filter(j => j.due <= now);
  // players who reposted your post on their own: tell you once
  if (now - acNoteT > 30000){ acNoteT = now; try { acRepostNotes(now); } catch(e){ console.error(e); } }
  if (!due.length) return;
  acBusy = true;
  try { for (const j of due){ ACT.q = ACT.q.filter(x => x.id !== j.id); saveAc(); try { await acRun(j); } catch(e){ console.error(e); } } }
  finally { acBusy = false; }
}
setInterval(() => { acTick().catch(console.error); }, 4000);

/* ---- reposts ---- */
// players who put your post on their story on their own: you get told once, when it goes up
function acRepostNotes(now){
  if (typeof stDerived !== 'function') return;
  (FD.followers || []).forEach(w => stDerived(w).forEach(s => {
    if (s.t > now || now - s.t > ST_LIFE || ACT.done['rp' + s.id]) return;
    ACT.done['rp' + s.id] = 1; saveAc();
    fdNote('share', w, `<b>${esc(bot(w).name)}</b> added your post to their story`, s.d.pid, s.t);
    FD.shared[s.d.pid] = (FD.shared[s.d.pid] || 0) + 1; saveFeed();
  }));
  const ks = Object.keys(ACT.done); if (ks.length > 300){ ks.slice(0, 100).forEach(k => delete ACT.done[k]); saveAc(); }
}
// you put their post on your story: now and then they notice and say thanks
async function acThanks(w, p){
  if (Math.random() > .35 || typeof dmWrite !== 'function' || !GEM.key) return;
  await new Promise(r => setTimeout(r, (2 + Math.random() * 18) * 60000));
  try {
    const {texts} = await dmWrite(w, `${bot(w).name} just saw that ${myName()} put ${bot(w).name}'s post (${fxAbout(p)}) on their story. Write 1 short text from ${bot(w).name} about it, like thanking them or reacting.`);
    const off = typeof gcState === 'function' ? gcState(w) === 'off' : !dmOnline(w);
    if (texts.length) dmQueue(w, off ? Date.now() + 7 * 864e5 : Date.now() + 4000, texts, {});
  } catch(e){ console.error(e); }
}
