/* ---------- Feed: an Instagram-style feed for the campus (replaces global chat) ----------
   Posts come from the shared world: session receipts and match results are the players' real sessions and matches,
   rank-ups are real, and pictures are drawn by scenes.js from each player's major, the time of day and the season.
   Gemini writes the captions and comments (one request covers a handful of posts), and it's told what each picture
   shows (sceneDesc), so what people say fits the picture. Likes build up over a few hours, more for popular players.
   You can follow people, like and comment (people answer, later if they're offline), and post your own: pictures you
   put together from the same presets, shares of your sessions, matches and rank-ups, or plain text.
   Everything lives in fb.feed on this device (and syncs with the rest of your data). */
const FD_V = 1;
let FD = store.get('fb.feed', null);
if (!FD || FD.v !== FD_V) FD = {v: FD_V, posts: [], follows: [], followers: [], notif: [], filled: 0, nseen: 0, pend: [], liked: {}};
const saveFeed = () => { if (FD.posts.length > 260) FD.posts = FD.posts.sort((a, b) => b.t - a.t).slice(0, 240).concat(FD.posts.filter(p => p.w === -1 && !FD.posts.slice(0, 240).includes(p))); if (FD.notif.length > 150) FD.notif = FD.notif.slice(-150); store.set('fb.feed', FD); };
const fdId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fdHash = s => { let h = 2166136261; for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619); return h >>> 0; };
let FDV = {tab: 'for', shown: 16, open: {}, re: {}, busy: false, composer: null};

/* ---- who posts ---- */
function fdPool(){
  const pool = [], add = (w, n) => { if (w >= 0 && w < ROSTER_N) for (let k = 0; k < n; k++) pool.push(w); };
  FD.follows.forEach(w => add(w, 5));
  Object.keys(R.rec || {}).map(Number).forEach(w => add(w, isRival(w) ? 3 : 1));
  (R.hist || []).slice(0, 20).forEach(h => add(h.b, 2));
  try { [...new Set(DMS.msgs.map(m => m.w))].forEach(w => add(w, 2)); } catch(e){}
  try { chatWhoOnline().forEach(w => add(w, 1)); } catch(e){}
  const sb = sortedBots();
  for (let k = 0; k < 40; k++) add(sb[Math.floor(Math.pow(Math.random(), 2.2) * 2000)], 1);          // popular players
  const me = posOf(sb[0]) >= 0 ? (() => { let lo = 0, hi = sb.length; while (lo < hi){ const m = (lo + hi) >> 1; if (BS[sb[m] * BF] > R.mmr) lo = m + 1; else hi = m; } return lo; })() : 0;
  for (let k = 0; k < 30; k++) add(sb[clampN(me + Math.floor((Math.random() - .5) * 3000), 0, sb.length - 1)], 1);
  return pool;
}
const fdPop = w => w === -1 ? fdMyPop() : 18 + 2600 / Math.sqrt(posOf(w) + 1);
function fdMyPop(){ return 10 + FD.followers.length * .9 + Math.max(0, (R.mmr - 900) / 25); }
const fdWorldMin = t => { const d = new Date(worldT(t)); return {dk: dayKey(d.getTime()), m: d.getHours() * 60 + d.getMinutes(), h: d.getHours(), mo: d.getMonth()}; };
// the post itself: a real session or match when there is one around that time, otherwise a picture or a thought
function fdMake(w, t){
  const B = bot(w), {dk, m, h, mo} = fdWorldMin(t), r = mulberry32(fdHash(w + ':' + t)), id = fdId();
  const base = {id, w, t, cm: [], L: 0};
  const u = r();
  if (u < .28){       // a match they just played
    const code = dayIdx(dk) * 1440 + m;
    for (let s = w * M5, e = s + M5; s < e; s++){ const opp = M5_OPP[s]; if (opp < 0) continue; const c = M5_T[s]; if (c <= code && c > code - 90){
      const won = M5_A[s] > M5_B[s], after = M5_R[s], before = after - M5_D[s], up = rankOf(after).i > rankOf(before).i;
      return {...base, type: up && won ? 'rank' : 'match', d: {opp, ys: M5_A[s], ts: M5_B[s], dl: M5_D[s], r: after, rk: rankOf(after).full}}; } }
  }
  if (u < .62){       // a session they just finished
    const day = botDay(w, dk), s = day && day.sessions.filter(x => !x.live && x.b <= m && x.b > m - 60 && x.min >= 25).pop();
    if (s) return {...base, type: 'session', d: {min: s.min, subj: s.subj, mode: s.mode, a: s.a, tot: day.sessions.filter(x => x.b <= s.b).reduce((n, x) => n + x.min, 0)}};
  }
  if (r() < .2) return {...base, type: 'text'};
  const mood = h >= 22 || h < 5 ? 'tired' : '';
  return {...base, type: 'scene', sc: {seed: fdHash(id), hue: B.hue, maj: B.major, hour: h, month: mo, mood, outgoing: emojiHabit(w) === 'often' || r() < .35}};
}
// posts appear at a real-world pace: more in the evening, few at 4 AM
const FD_RATE = [3, 2, 1.4, 1, .8, .8, 1.2, 2.2, 3, 3.4, 3.6, 4, 4.4, 4.4, 4.6, 5, 5.2, 5.6, 6, 6.4, 6.6, 6.4, 5.6, 4.2];
function fdFill(){
  if (!RK_READY || simBusy) return false;
  const now = Date.now(), from = Math.max(FD.filled || now - 8 * 3600e3, now - 12 * 3600e3);
  if (now - from < 4 * 60000) return false;
  const pool = fdPool(); let made = 0;
  for (let t = from; t < now && made < 45; ){
    const h = new Date(worldT(t)).getHours(), gap = 3600e3 / FD_RATE[h] * (.4 + Math.random() * 1.2);
    t += gap; if (t >= now) break;
    const w = pool[Math.floor(Math.random() * pool.length)];
    try { const p = fdMake(w, Math.round(t)); p.L = Math.round(fdPop(w) * ({scene: 1, text: .55, session: .8, match: 1.1, rank: 1.7}[p.type] || 1) * (p.sc && p.sc.outgoing ? 1.2 : 1) * (.45 + Math.random())); FD.posts.push(p); made++; } catch(e){ console.error(e); }
  }
  FD.filled = now; saveFeed();
  return made > 0;
}
const fdLikes = p => (p.L ? Math.floor(p.L * (1 - Math.exp(-(Date.now() - p.t) / 2700e3))) : 0) + (FD.liked[p.id] ? 1 : 0);
const fdShownComments = p => p.cm.filter(c => c.t <= Date.now() && !c.del);

/* ---- what each post is about, in words, for the people writing captions and comments ---- */
function fdAbout(p){
  const who = p.w === -1 ? myName() : bot(p.w).name;
  if (p.type === 'scene') return sceneDesc(fdSpec(p));
  if (p.type === 'session') return `A session receipt card: ${who} just finished ${p.d.min} min of ${p.d.subj} (${MODE_NAMES[p.d.mode] || 'a session'}), ${Math.floor(p.d.tot / 60)}h ${p.d.tot % 60}m today so far.`;
  if (p.type === 'match' || p.type === 'rank'){ const won = p.d.ys > p.d.ts; return `A ranked match result card: ${who} ${won ? 'beat' : 'lost to'} ${p.d.opp === -1 ? myName() : bot(p.d.opp).name}, ${p.d.ys}–${p.d.ts} min, ${p.d.dl > 0 ? '+' : ''}${p.d.dl} Elo${p.type === 'rank' ? `, and it ranked them up to ${p.d.rk}` : ''}.`; }
  if (p.type === 'text') return p.cap ? `A text post: "${p.cap}"` : 'A text post (just words, no picture).';
  return '';
}
function fdSpec(p){ if (p.spec) return p.spec; return (p._spec = p._spec || sceneSpec({...p.sc, look: scLook(p.w)})); }
// who comments: people who'd plausibly see it (followers of theirs are everyone near them, people online now)
function fdCommenters(p, n){
  const out = [], seen = new Set([p.w]), add = w => { if (w >= 0 && w < ROSTER_N && !seen.has(w)){ seen.add(w); out.push(w); } };
  let on = []; try { on = chatWhoOnline(); } catch(e){}
  const sb = sortedBots(), at = posOf(p.w === -1 ? sb[0] : p.w);
  for (let k = 0; k < 40 && out.length < n; k++){ const u = Math.random(); add(u < .45 && on.length ? on[Math.floor(Math.random() * on.length)] : sb[clampN(at + Math.floor((Math.random() - .5) * 2000), 0, sb.length - 1)]); }
  return out;
}
const FD_SYS = me => `You write posts and comments for the Feed on Focus Bench, a study app for college students that works like Instagram: players post pictures of where they're studying, session receipts, match results and short thoughts, and others like and comment.
Write like real college students on Instagram: short, casual, lowercase is common, slang is fine, inside jokes about classes, finals, coffee, sleep. Captions are usually a few words to one sentence. Comments are short reactions or questions about the post, and they must fit what the picture actually shows (you'll be told what's in it).
Each person has their own emoji habit ("never", "sometimes" or "often", with their go-to emojis): mostly use their own, sometimes any other face, hand or heart emoji, never the same few for everyone, at most a couple per message.
Don't start a comment with the name of the person it answers. No hashtags. ${me} is the person using the app.
Answer with JSON: {"messages":[{"from":"<name exactly as listed>","text":"…","replyTo":"…"}]}; replyTo says what each message is: "cap <post id>" for a post's caption (from the poster), "<post id>" for a comment on it.`;
async function fdWrite(posts){
  if (!posts.length || !GEM.key || GEM.wait > Date.now()) return false;
  const me = myName(), blocks = [], names = new Map();
  posts.forEach((p, k) => {
    p.k = 'p' + (k + 1);
    const nC = Math.min(6, Math.max(0, Math.round(Math.log2(1 + p.L / 25) * (.5 + Math.random())))), cs = fdCommenters(p, nC);
    p._cs = cs; [p.w, ...cs].forEach(w => { if (w >= 0) names.set(bot(w).name.toLowerCase(), w); });
    const f = chatFacts(p.w);
    blocks.push(`Post ${p.k} by ${f.name} (${f.rank}, ${f.subj}, emojis: ${emojiStyle(p.w)}), posted at ${new Date(p.t).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}.
What it is: ${fdAbout(p)}
${p.type === 'text' ? `Write the post itself as its caption (one or two short sentences, something on their mind: a class, a vent, a joke, a question).` : 'Write its caption.'}
${cs.length ? `Then one comment each from: ${cs.map(w => { const g = chatFacts(w); return `${g.name} (${g.subj}, emojis: ${emojiStyle(w)})`; }).join('; ')}. One of them can answer another's comment, and ${f.name} can answer one comment.` : 'Nobody comments on this one.'}`);
  });
  const user = `Today is ${new Date().toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}.\n\n${blocks.join('\n\n')}`;
  try {
    const got = await aiCall(FD_SYS(me), user);
    (Array.isArray(got) ? got : []).forEach(x => {
      const w = names.get(String(x && x.from || '').toLowerCase().trim()), to = String(x && x.replyTo || '').trim(); if (w == null) return;
      let text = String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
      text = emotionOnly(stripSegue(text)); if (!text) return;
      const cap = /^cap\s+/i.test(to), k = to.replace(/^cap\s+/i, ''), p = posts.find(q => q.k === k); if (!p) return;
      if (cap && w === p.w){ if (!p.cap) p.cap = text; return; }
      if (p.cm.length >= 8) return;
      const prev = p.cm.length ? p.cm[p.cm.length - 1].t : p.t;
      p.cm.push({id: p.id + 'c' + p.cm.length, w, t: Math.round(Math.max(prev, p.t) + (2 + Math.random() * 40) * 60000), text: text.replace(/^\[play\]\s*/i, ''), play: /^\[play\]/i.test(text)});
    });
    posts.forEach(p => { p.gen = 1; if (!p.cap) p.cap = fdFallbackCap(p); delete p.k; delete p._cs; });
    return true;
  } catch(e){
    if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); if (e.msg) GEM.detail = e.msg; try { saveAI(); } catch(err){}
    posts.forEach(p => { delete p.k; delete p._cs; });
    return false;
  }
}
const FD_CAPS = {scene: ['current situation', 'locked in (allegedly)', 'office for the night', 'the vibes are academic', 'study spot of the day', 'we move', 'send coffee'], text: ['why is the syllabus lying to me', 'one more chapter and then bed. probably', 'who else has an exam tomorrow', 'the library wifi is a social experiment'],
  session: ['done for now', 'that one hurt', 'productive day fr', 'small win'], match: ['gg', 'we take those', 'rematch?', 'good game'], rank: ['new rank unlocked', 'climbing', 'finally']};
function fdFallbackCap(p){ const a = FD_CAPS[p.type] || FD_CAPS.scene; return p.type === 'match' && p.d.ys < p.d.ts ? 'unlucky. next one' : a[fdHash(p.id) % a.length]; }
async function fdWriteVisible(list){
  if (FDV.busy) return; const need = list.filter(p => !p.gen && p.w !== -1).slice(0, 6); if (!need.length) return;
  FDV.busy = true;
  try { const ok = await fdWrite(need); if (!ok) need.forEach(p => { if (!GEM.key){ p.cap = p.cap || fdFallbackCap(p); p.gen = 1; } }); saveFeed(); } finally { FDV.busy = false; }
  renderFeed();
}

/* ---- cards for real moments ---- */
function fdCard(p){
  const who = p.w === -1 ? myName() : bot(p.w).name, hue = p.w === -1 ? 220 : bot(p.w).hue, c1 = scH(hue, 55, 52), c2 = scH(hue + 40, 45, 30);
  const svg = b => `<svg viewBox="0 0 300 300" class="scene" role="img" aria-label="${esc(fdAbout(p))}">${b}</svg>`;
  if (p.type === 'session'){
    const d = p.d, st = new Date(p.t - d.min * 60000), hh = Math.floor(d.min / 60), tot = `${Math.floor(d.tot / 60)}h ${d.tot % 60}m`;
    return svg(rc(0, 0, 300, 300, scH(hue + 180, 18, 30), 0) + rc(70, 30, 160, 230, '#f4f1ea', 4) + pa('M70 255 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 v-15 h-160z', '#f4f1ea')
      + tx(150, 58, 'FOCUS BENCH', 10, '#5f5e5a', ' letter-spacing="2"') + ln(85, 68, 215, 68, '#b4b2a9', 1, ' stroke-dasharray="3 3"')
      + tx(150, 110, hh ? `${hh}h ${d.min % 60}m` : `${d.min} min`, 32, '#2c2c2a') + tx(150, 130, esc(String(d.subj).slice(0, 26)), 11, '#5f5e5a')
      + ln(85, 144, 215, 144, '#b4b2a9', 1, ' stroke-dasharray="3 3"')
      + `<g font-size="11" fill="#444" font-family="ui-sans-serif,system-ui"><text x="88" y="166">Mode</text><text x="212" y="166" text-anchor="end">${esc(MODE_NAMES[d.mode] || 'Focus')}</text><text x="88" y="186">Started</text><text x="212" y="186" text-anchor="end">${st.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}</text><text x="88" y="206">Today</text><text x="212" y="206" text-anchor="end">${tot}</text></g>`
      + tx(150, 236, 'thank you for studying', 9, '#888780'));
  }
  if (p.type === 'match' || p.type === 'rank'){
    const d = p.d, won = d.ys > d.ts, opp = d.opp === -1 ? myName() : bot(d.opp).name, dl = Math.abs(d.dl);
    let b = rc(0, 0, 300, 300, c2, 0) + ci(150, 300, 220, c1, ' opacity=".35"');
    if (p.type === 'rank') b += tx(150, 72, 'RANKED UP', 14, '#fff', ' letter-spacing="3" opacity=".85"') + tx(150, 128, esc(d.rk), 30, '#fff') + ci(150, 190, 34, '#fff', ' opacity=".15"') + pa('M150 165 l9 18 l20 3 l-14 14 l3 20 l-18 -9 l-18 9 l3 -20 l-14 -14 l20 -3z', '#ffe14f') + tx(150, 262, `beat ${esc(opp.slice(0, 20))} · ${d.ys}–${d.ts} min`, 11, '#fff', ' opacity=".85"');
    else b += tx(150, 60, won ? 'VICTORY' : 'DEFEAT', 24, won ? '#ffe14f' : '#ffb4b4', ' letter-spacing="3"') + tx(80, 130, `${d.ys}m`, 34, '#fff') + tx(220, 130, `${d.ts}m`, 34, '#fff', ' opacity=".75"') + tx(150, 125, 'vs', 13, '#fff', ' opacity=".6"')
      + tx(80, 154, esc(who.slice(0, 14)), 11, '#fff') + tx(220, 154, esc(opp.slice(0, 14)), 11, '#fff', ' opacity=".8"') + rc(95, 190, 110, 34, '#fff', 17, ' opacity=".15"') + tx(150, 213, `${won ? '+' : '−'}${dl} Elo`, 16, won ? '#b9f6ca' : '#ffcdd2') + tx(150, 262, esc(rankOf(d.r).full), 11, '#fff', ' opacity=".75"');
    return svg(b);
  }
  // a plain text post: the words on a color card
  const t = esc(p.cap || '…'), size = t.length > 90 ? 16 : t.length > 50 ? 19 : 23, lines = [];
  let cur = ''; t.split(' ').forEach(w => { if ((cur + ' ' + w).length > (size > 20 ? 18 : 24)){ lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }); if (cur) lines.push(cur);
  return svg(rc(0, 0, 300, 300, c1, 0) + ci(270, 30, 90, '#fff', ' opacity=".08"') + lines.slice(0, 8).map((l, k) => tx(150, 150 - (Math.min(8, lines.length) - 1) * size * .65 + k * size * 1.3, l, size, '#fff')).join(''));
}
const fdMedia = p => p.type === 'scene' ? sceneSvg(fdSpec(p), p.id) : fdCard(p);

/* ---- drawing the feed ---- */
const fdAgo = t => { const s = (Date.now() - t) / 1000; return s < 60 ? 'now' : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; };
const fdWho = w => w === -1 ? `<b>${esc(myName())}</b>` : `<button class="lnk" data-bot="${w}">${esc(bot(w).name)}</button>`;
function fdPostHtml(p){
  const me = p.w === -1, B = me ? null : bot(p.w), cms = fdShownComments(p), open = FDV.open[p.id], likes = fdLikes(p), fol = !me && FD.follows.includes(p.w);
  const show = open ? cms : cms.slice(-2), re = FDV.re[p.id];
  return `<article class="card fd-post" data-pid="${p.id}">
    <header class="fd-h">${me ? myAvatar('sm') : avatar(B, 'sm')}<span class="fd-who">${fdWho(p.w)}<small>${me ? 'You' : esc(B.subject)} · ${fdAgo(p.t)}</small></span>${me ? `<button class="fd-x" data-fda="del" title="Delete post" aria-label="Delete post">×</button>` : `<button class="small-btn${fol ? '' : ' accent'} fd-fol" data-fda="follow">${fol ? 'Following' : 'Follow'}</button>`}</header>
    <div class="fd-media" data-fda="dbl">${fdMedia(p)}</div>
    <div class="fd-b"><div class="fd-act"><button class="fd-like${FD.liked[p.id] ? ' on' : ''}" data-fda="like" aria-label="Like"><svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.3-9.1C1.2 8.6 3.1 5 6.6 5c2 0 3.4 1.2 4.4 2.6C12 6.2 13.4 5 15.4 5c3.5 0 5.4 3.6 3.9 6.9C19 16.4 12 21 12 21z"/></svg></button><button class="fd-cbtn" data-fda="comments" aria-label="Comments"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/></svg></button></div>
    <div class="fd-likes">${likes.toLocaleString()} like${likes === 1 ? '' : 's'}</div>
    ${p.type !== 'text' && p.cap ? `<p class="fd-cap">${fdWho(p.w)} ${esc(p.cap)}</p>` : !p.cap && !p.gen && !me ? '<p class="fd-cap hint">…</p>' : ''}
    ${cms.length > 2 && !open ? `<button class="fd-more" data-fda="comments">View all ${cms.length} comments</button>` : ''}
    ${show.map(c => `<div class="fd-c${c.w === -1 ? ' me' : ''}" data-cid="${c.id}">${fdWho(c.w)} <span>${esc(c.text)}</span><small>${fdAgo(c.t)}${c.w !== -1 ? ` · <button data-fda="reply">Reply</button>` : ''}</small></div>`).join('')}
    ${open ? `<form class="fd-form" data-fda="send">${re ? `<div class="fd-re">Replying to ${esc(re.name)} <button type="button" data-fda="unre" aria-label="Cancel reply">×</button></div>` : ''}<input maxlength="220" placeholder="Add a comment…" aria-label="Add a comment" autocomplete="off"><button class="small-btn accent">Post</button></form>` : ''}
    </div></article>`;
}
function fdList(){
  const now = Date.now(), vis = FD.posts.filter(p => p.t <= now && !p.del);
  if (FDV.tab === 'following') return vis.filter(p => FD.follows.includes(p.w)).sort((a, b) => b.t - a.t);
  if (FDV.tab === 'you') return vis.filter(p => p.w === -1).sort((a, b) => b.t - a.t);
  // For you: newest first, nudged up for people you follow and popular posts
  const sc = p => p.t / 3600e3 + (FD.follows.includes(p.w) ? 1.5 : 0) + Math.log10(1 + p.L) * .35 + (p.w === -1 ? 2 : 0);
  return vis.sort((a, b) => sc(b) - sc(a));
}
function fdNotifHtml(){
  const ns = FD.notif.slice(-40).reverse();
  return `<div class="card fd-notifs"><div class="h first">Activity</div>${ns.length ? ns.map(n => `<div class="fd-n${n.t > FD.nseen ? ' new' : ''}">${n.w != null && n.w >= 0 ? avatar(bot(n.w), 'sm') : '<span class="fd-ndot"></span>'}<span>${n.html}</span><small>${fdAgo(n.t)}</small></div>`).join('') : '<p class="hint">Likes, comments and new followers show up here.</p>'}</div>`;
}
function renderFeed(){
  const el = $('#fdBody'); if (!el || $('#page-feed').hidden) return;
  if (!RK_READY || (simBusy && !FD.posts.length)){ el.innerHTML = '<p class="hint">Loading the feed…</p>'; return; }
  const n = FD.notif.filter(x => x.t > FD.nseen).length;
  $('#fdTabs').innerHTML = [['for', 'For you'], ['following', 'Following'], ['you', `You${n ? ` <b>${n}</b>` : ''}`]].map(([k, t]) => `<button class="ct-btn${FDV.tab === k ? ' on' : ''}" data-fdt="${k}">${t}</button>`).join('') + `<button class="small-btn accent fd-new" data-fda="compose">New post</button>`;
  const list = fdList(), page = list.slice(0, FDV.shown);
  const top = FDV.tab === 'you' ? `<div class="card fd-me">${myAvatar('md')}<div><b>${esc(myName())}</b><small>${list.length} post${list.length === 1 ? '' : 's'} · ${FD.followers.length} follower${FD.followers.length === 1 ? '' : 's'} · ${FD.follows.length} following</small></div></div>` + fdNotifHtml() : '';
  el.innerHTML = `<div id="fdComp">${FDV.composer ? fdComposerHtml() : ''}</div>` + top + (page.length ? page.map(fdPostHtml).join('') : `<p class="hint fd-empty">${FDV.tab === 'following' ? 'Follow people from their posts or profiles to see them here.' : FDV.tab === 'you' ? 'Your posts show up here. Tap <b>New post</b> to make one.' : 'Nothing yet.'}</p>`)
    + (list.length > FDV.shown ? '<button class="small-btn fd-load" data-fda="more">Show more</button>' : '')
    + (!GEM.key ? '<p class="hint ch-hint">Captions and comments are written once Gemini is set up in <button class="link-btn" data-go="settings" data-sec="set-chat">Settings → Chat</button>.</p>' : '');
  if (FDV.tab === 'you'){ FD.nseen = Date.now(); saveFeed(); fdBadge(); }
  fdWriteVisible(page);
}
function fdBadge(){ const n = FD.notif.filter(x => x.t > FD.nseen).length; document.querySelectorAll('.feed-badge').forEach(b => { b.textContent = n > 99 ? '99+' : n || ''; b.hidden = !n; }); }

/* ---- notifications ---- */
function fdNote(kind, w, html, pid){ FD.notif.push({t: Date.now(), kind, w, html, pid}); saveFeed(); fdBadge(); }

/* ---- following ---- */
function fdFollow(w, on){
  const i = FD.follows.indexOf(w);
  if (on && i < 0){ FD.follows.push(w); const known = (R.rec && R.rec[w]) || DMS.msgs.some(m => m.w === w); if (!FD.followers.includes(w) && Math.random() < (known ? .7 : .35)) FD.pend.push({kind: 'fb', w, due: Date.now() + (5 + Math.random() * 85) * 60000}); }
  if (!on && i >= 0) FD.follows.splice(i, 1);
  saveFeed();
}
const _dmButtons = typeof dmButtons === 'function' ? dmButtons : () => '';
dmButtons = function(w){ const on = FD.follows.includes(w); return `<button class="small-btn${on ? '' : ' accent'}" data-fdf="${w}">${on ? 'Following' : 'Follow'}</button>` + _dmButtons(w); };

/* ---- commenting: people answer you, later if they're offline ---- */
function fdComment(p, text){
  const re = FDV.re[p.id], c = {id: p.id + 'm' + Date.now().toString(36), w: -1, t: Date.now(), text, re: re ? re.cid : null};
  p.cm.push(c); delete FDV.re[p.id];
  // who answers: the person you replied to, or the poster (if it isn't you); on your own post, someone in the comments
  let who = re ? re.w : p.w !== -1 ? p.w : (p.cm.filter(x => x.w >= 0).pop() || {}).w;
  if (who != null && who >= 0 && Math.random() < .9) FD.pend.push({kind: 'reply', pid: p.id, cid: c.id, w: who, due: Date.now() + (40 + Math.random() * 200) * 1000});
  saveFeed(); renderFeed();
}
async function fdReply(job){
  const p = FD.posts.find(x => x.id === job.pid), mine = p && p.cm.find(x => x.id === job.cid); if (!p || !mine || !GEM.key) return true;
  const me = myName(), B = bot(job.w), f = chatFacts(job.w);
  const thread = p.cm.filter(x => x.t <= Date.now()).slice(-10).map(x => `${x.w === -1 ? me : bot(x.w).name}: ${x.text}`).join('\n');
  const user = `Post ${p.id} by ${p.w === -1 ? me : bot(p.w).name}. What it is: ${fdAbout(p)}${p.cap ? `\nCaption: ${p.cap}` : ''}\nComments so far:\n${thread}\n\n${me} just commented "${mine.text}". Write ${B.name}'s answer (${f.rank}, ${f.subj}, emojis: ${emojiStyle(job.w)}) as one short comment, replyTo "${p.id}". It should answer what ${me} said.${/\b(play|match|1v1|challenge|duel|ranked|game)\b/i.test(mine.text) && R.on ? ` If ${me} is asking to play and ${B.name} would, start the comment with [play].` : ''}`;
  try {
    const got = await aiCall(FD_SYS(me), user), x = (Array.isArray(got) ? got : []).find(m => m && m.text);
    if (!x) return true;
    let text = emotionOnly(stripSegue(stripLeadName(String(x.text).replace(/#\w+/g, '').trim().slice(0, 240), [me]))); const play = /^\[play\]/i.test(text); text = text.replace(/^\[play\]\s*/i, '');
    if (!text) return true;
    p.cm.push({id: p.id + 'r' + Date.now().toString(36), w: job.w, t: Date.now(), text, re: mine.id});
    fdNote('reply', job.w, `<b>${esc(B.name)}</b> replied: ${esc(text.slice(0, 80))}`, p.id);
    if (play) fdChallenge([job.w]);
    return true;
  } catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); return e.kind !== 'offline' && e.kind !== 'busy' ? true : false; }
}
function fdChallenge(ws){
  if (typeof dmQueue !== 'function' || !R.on || matchBusy()) return;
  ws.slice(0, 2).forEach((w, k) => { if (!pendingCh(w)) dmQueue(w, Date.now() + 4000 + k * 2500, [''], {ch: {mode: 'r', by: 'them'}}); });
}
// your own posts: likes build up, and people comment in a few waves (right away, after a while, hours later)
async function fdEngage(job){
  const p = FD.posts.find(x => x.id === job.pid); if (!p || p.del) return true;
  if (!GEM.key) return true;
  const me = myName(), n = job.n === 0 ? 1 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 3);
  if (!n) return true;
  const pool = FD.followers.length ? FD.followers : fdCommenters(p, 6), cs = [];
  for (let k = 0; k < 12 && cs.length < n; k++){ const w = pool[Math.floor(Math.random() * pool.length)]; if (w >= 0 && !cs.includes(w)) cs.push(w); }
  if (!cs.length) return true;
  const ask = /\b(play|match|1v1|challenge|duel|ranked|anyone up)\b/i.test(p.cap || '') && R.on;
  const user = `Post ${p.id} by ${me} (the user). What it is: ${fdAbout(p)}${p.cap ? `\nCaption: ${p.cap}` : ''}\nComments so far:\n${p.cm.filter(x => x.t <= Date.now()).slice(-8).map(x => `${x.w === -1 ? me : bot(x.w).name}: ${x.text}`).join('\n') || '(none)'}\n\nWrite one comment each from: ${cs.map(w => { const f = chatFacts(w); return `${f.name} (${f.rank}, ${f.subj}, emojis: ${emojiStyle(w)})`; }).join('; ')}. replyTo "${p.id}".${ask ? ` ${me} is asking for a match: anyone who'd play starts their comment with [play].` : ''}`;
  try {
    const got = await aiCall(FD_SYS(me), user), names = new Map(cs.map(w => [bot(w).name.toLowerCase(), w])), players = [];
    (Array.isArray(got) ? got : []).forEach((x, k) => { const w = names.get(String(x && x.from || '').toLowerCase().trim()); if (w == null) return;
      let text = emotionOnly(stripSegue(String(x.text || '').replace(/#\w+/g, '').trim().slice(0, 240))); const play = /^\[play\]/i.test(text); text = text.replace(/^\[play\]\s*/i, ''); if (!text) return;
      p.cm.push({id: p.id + 'e' + Date.now().toString(36) + k, w, t: Date.now() + k * 20000, text}); if (play) players.push(w);
      setTimeout(() => { fdNote('comment', w, `<b>${esc(bot(w).name)}</b> commented: ${esc(text.slice(0, 80))}`, p.id); renderFeed(); }, k * 20000); });
    if (players.length) fdChallenge(players);
    saveFeed(); return true;
  } catch(e){ if (e.kind === 'busy' || e.kind === 'key') GEM.wait = aiBackoff(e); return e.kind !== 'offline' && e.kind !== 'busy'; }
}

/* ---- every minute: people answering, new followers, likes on your posts ---- */
let fdTickBusy = false;
async function fdTick(){
  if (!RK_READY || fdTickBusy) return; fdTickBusy = true;
  try {
    const now = Date.now();
    // first time: people who already know you follow you
    if (!FD.seeded){ FD.seeded = 1; const known = [...new Set([...Object.keys(R.rec || {}).map(Number), ...DMS.msgs.map(m => m.w)])]; known.forEach(w => { if (Math.random() < .35 && !FD.followers.includes(w)) FD.followers.push(w); }); saveFeed(); }
    // jobs that are due (people offline answer once they're back)
    for (const job of FD.pend.slice()){
      if (job.due > now) continue;
      if (job.kind !== 'eng' && job.kind !== 'fb' && !(dmOnline(job.w) || dmStudying(job.w)) && now - job.due < 12 * 3600e3) continue;
      if (job.kind === 'fb'){ if (!FD.followers.includes(job.w)){ FD.followers.push(job.w); fdNote('follow', job.w, `<b>${esc(bot(job.w).name)}</b> followed you back`); } FD.pend.splice(FD.pend.indexOf(job), 1); continue; }
      const done = job.kind === 'reply' ? await fdReply(job) : await fdEngage(job);
      if (done){ const i = FD.pend.indexOf(job); if (i >= 0) FD.pend.splice(i, 1); } else job.due = now + 120000;
      break;                                                   // one request at a time
    }
    // new followers, more often the higher you climb and the more you post
    const rate = .12 + fdMyPop() / 500 + FD.posts.filter(p => p.w === -1 && now - p.t < 864e5).length * .15;
    if (Math.random() < rate / 60){ const pool = fdPool().filter(w => !FD.followers.includes(w)); if (pool.length){ const w = pool[Math.floor(Math.random() * pool.length)]; FD.followers.push(w); fdNote('follow', w, `<b>${esc(bot(w).name)}</b> started following you`); } }
    // likes on your posts: a note at 1, 5, 10, 25, 50, 100…
    FD.posts.filter(p => p.w === -1 && !p.del).forEach(p => { const n = fdLikes(p) - (FD.liked[p.id] ? 1 : 0), marks = [1, 5, 10, 25, 50, 100, 250, 500, 1000], hit = marks.filter(x => x <= n).pop();
      if (hit && hit > (p.ln || 0)){ p.ln = hit; const w = fdCommenters(p, 1)[0]; fdNote('like', w, hit === 1 ? `<b>${esc(bot(w).name)}</b> liked your post` : `<b>${esc(bot(w).name)}</b> and ${hit - 1} others liked your post`, p.id); } });
    saveFeed();
    if (!$('#page-feed').hidden && Date.now() - (FDV.drawn || 0) > 60000 && !document.activeElement.closest('.fd-form')){ if (fdFill()) {} FDV.drawn = Date.now(); renderFeed(); }
  } catch(e){ console.error(e); } finally { fdTickBusy = false; }
}
setInterval(fdTick, 60000); setTimeout(fdTick, 8000);

/* ---- making your own post ---- */
const FD_MY_LOOK_DEF = {skin: SKIN[2], hair: '#3b2a20', style: 'short', glasses: false, outfit: '#3f6fa0', hood: true};
function fdMyLook(){ return {...FD_MY_LOOK_DEF, ...(FD.look || {})}; }
function fdNewComposer(){
  const now = new Date(worldT(Date.now()));
  const S = sceneSpec({seed: Math.floor(Math.random() * 2 ** 31), hue: 215, maj: 'biz', hour: now.getHours(), month: now.getMonth(), look: fdMyLook(), outgoing: true});
  return {mode: 'pic', S, share: 'session', cap: ''};
}
const fdOpt = (map, cur, none) => (none ? `<option value="">${none}</option>` : '') + Object.entries(map).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${esc(typeof v === 'string' ? v : v.n)}</option>`).join('');
function fdShareItems(){
  const out = {}, last = LOG.length ? LOG[LOG.length - 1] : null;
  if (last){ const dk = dayKey(last.t), tot = LOG.filter(x => dayKey(x.t) === dk).reduce((n, x) => n + x.min, 0); out.session = {label: `Your last session: ${last.min} min${last.task ? ` of ${last.task}` : ''}`, type: 'session', d: {min: last.min, subj: last.task || last.tag || 'Focus', mode: last.mode || 'pomodoro', a: 0, tot}}; }
  const h = (R.hist || []).find(x => !x.open);
  if (h) out.match = {label: `Your last match: ${h.r === 'W' ? 'beat' : 'lost to'} ${bot(h.b).name}`, type: 'match', d: {opp: h.b, ys: h.you, ts: h.them, dl: h.d, r: h.m, rk: rankOf(h.m).full}};
  if (h && h.r === 'W') out.rank = {label: `Your rank: ${myRk().full}`, type: 'rank', d: {opp: h.b, ys: h.you, ts: h.them, dl: h.d, r: R.mmr, rk: myRk().full}};
  return out;
}
function fdComposerHtml(){
  const C = FDV.composer, S = C.S, self = S.angle === 'selfie', L = fdMyLook();
  const sel = (k, map, cur, label, none) => `<label>${label}<select data-fdw="${k}">${fdOpt(map, cur, none)}</select></label>`;
  const props = SC.PROP_KEYS.reduce((m, k) => (m[k] = SC.PROP[k].n, m), {});
  let body = '';
  if (C.mode === 'pic'){
    body = `<div class="fd-build"><div class="fd-prev">${sceneSvg(S, 'prev')}</div><div class="fd-opts">
      <div class="fd-row"><button type="button" class="small-btn" data-fda="rand">Shuffle everything</button></div>
      ${sel('set', SC.SETTING, S.set, 'Where')}${sel('light', SC.LIGHT, S.light, 'Lighting')}${sel('angle', SC.ANGLE, S.angle, 'Camera')}
      ${self ? sel('expr', SC.EXPR, S.expr, 'Face') + sel('pose', SC.POSE, S.pose, 'Pose') + sel('hand', Object.fromEntries(Object.entries(SC.HAND).map(([k, v]) => [k, v || 'no gesture'])), S.hand, 'Hands')
        + `<details class="fd-look"><summary>How you look</summary>${sel('lk:skin', Object.fromEntries(SKIN.map((c, k) => [c, ['Lightest', 'Light', 'Light-medium', 'Medium', 'Medium-deep', 'Deep', 'Deepest'][k]])), L.skin, 'Skin tone')}${sel('lk:hair', Object.fromEntries(HAIR.map((c, k) => [c, ['Black', 'Dark brown', 'Brown', 'Light brown', 'Dirty blond', 'Blond', 'Red', 'Gray', 'Blue', 'Purple', 'Green', 'White', 'Pink'][k] || c])), L.hair, 'Hair color')}${sel('lk:style', {short: 'Short', long: 'Long', bun: 'Bun', curly: 'Curly', buzz: 'Buzz cut', side: 'Side part', afro: 'Afro', bob: 'Bob', spiky: 'Spiky', pony: 'Ponytail'}, L.style, 'Hair style')}<label class="fd-chk"><input type="checkbox" data-fdw="lk:glasses"${L.glasses ? ' checked' : ''}> Glasses</label></details>`
        : [0, 1, 2, 3, 4, 5].map(k => sel('prop' + k, props, S.props[k] || '', `Thing ${k + 1}`, 'nothing')).join('') + `<label>Note<input data-fdw="cls" maxlength="24" value="${esc(S.cls || '')}" placeholder="what the sticky note says"></label>`}
      ${sel('season', SC.SEASON, S.season || '', 'Season', 'none')}
    </div></div>`;
  } else if (C.mode === 'share'){
    const items = fdShareItems(), keys = Object.keys(items);
    if (!keys.includes(C.share)) C.share = keys[0];
    body = keys.length ? `<div class="fd-share">${keys.map(k => `<label class="fd-shopt"><input type="radio" name="fdsh" data-fdw="share" value="${k}"${k === C.share ? ' checked' : ''}> ${esc(items[k].label)}</label>`).join('')}<div class="fd-prev small">${fdCard({id: 'x', w: -1, type: items[C.share].type, d: items[C.share].d, t: Date.now()})}</div></div>` : '<p class="hint">Finish a session or a match first, then you can share it.</p>';
  }
  return `<div class="card fd-comp"><div class="fd-comp-h"><b>New post</b><button class="fd-x" data-fda="close" aria-label="Close">×</button></div>
    <div class="ct-tabs fd-ctabs">${[['pic', 'Picture'], ['share', 'Share'], ['text', 'Text']].map(([k, t]) => `<button class="ct-btn${C.mode === k ? ' on' : ''}" data-fdm="${k}">${t}</button>`).join('')}</div>
    ${body}<textarea data-fdw="cap" maxlength="220" rows="2" placeholder="${C.mode === 'text' ? 'What’s on your mind?' : 'Write a caption…'}">${esc(C.cap)}</textarea>
    <div class="fd-row"><button class="small-btn accent" data-fda="post">Post</button></div></div>`;
}
function fdPublish(){
  const C = FDV.composer, now = Date.now(), cap = (C.cap || '').replace(/\s+/g, ' ').trim();
  let p = {id: fdId(), w: -1, t: now, cm: [], cap, gen: 1};
  if (C.mode === 'pic') p = {...p, type: 'scene', spec: {...C.S, look: C.S.angle === 'selfie' ? fdMyLook() : C.S.look}};
  else if (C.mode === 'share'){ const it = fdShareItems()[C.share]; if (!it) return toast('Nothing to share yet.'); p = {...p, type: it.type, d: it.d}; }
  else { if (!cap) return toast('Write something first.'); p.type = 'text'; }
  p.L = Math.round(fdMyPop() * ({scene: 1, text: .6, session: .8, match: 1.1, rank: 1.8}[p.type] || 1) * (.6 + Math.random() * .8) * (p.spec && p.spec.angle === 'selfie' ? 1.25 : 1));
  FD.posts.push(p);
  [[0, 60 + Math.random() * 120], [1, (20 + Math.random() * 40) * 60], [2, (120 + Math.random() * 120) * 60]].forEach(([n, s]) => FD.pend.push({kind: 'eng', pid: p.id, n, due: now + s * 1000}));
  FDV.composer = null; FDV.tab = 'you'; saveFeed(); renderFeed(); toast('Posted.');
}
// redraw just the composer (keeps the feed below as it is)
function fdComposerRedraw(){ const el = $('#fdComp'); if (el) el.innerHTML = FDV.composer ? fdComposerHtml() : ''; }

/* ---- taps ---- */
document.addEventListener('click', e => {
  const pg = e.target.closest('#page-feed'), ff = e.target.closest('[data-fdf]');
  if (ff){ const w = +ff.dataset.fdf, on = !FD.follows.includes(w); fdFollow(w, on); ff.textContent = on ? 'Following' : 'Follow'; ff.classList.toggle('accent', !on); renderFeed(); return; }
  if (!pg) return;
  const t = e.target.closest('[data-fdt]'); if (t){ FDV.tab = t.dataset.fdt; FDV.shown = 16; renderFeed(); return; }
  const m = e.target.closest('[data-fdm]'); if (m){ FDV.composer.mode = m.dataset.fdm; fdComposerRedraw(); return; }
  const a = e.target.closest('[data-fda]'); if (!a) return;
  const act = a.dataset.fda, post = a.closest('[data-pid]'), p = post && FD.posts.find(x => x.id === post.dataset.pid);
  if (act === 'compose'){ FDV.composer = FDV.composer || fdNewComposer(); renderFeed(); $('#fdComp').scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
  if (act === 'close'){ FDV.composer = null; fdComposerRedraw(); return; }
  if (act === 'rand'){ const k = FDV.composer.mode; FDV.composer = {...fdNewComposer(), mode: k, cap: FDV.composer.cap}; fdComposerRedraw(); return; }
  if (act === 'post'){ fdPublish(); return; }
  if (act === 'more'){ FDV.shown += 16; renderFeed(); return; }
  if (!p) return;
  if (act === 'like' || (act === 'dbl' && e.detail === 2)){ if (act === 'dbl' && FD.liked[p.id]) return; FD.liked[p.id] = !FD.liked[p.id]; saveFeed();
    post.querySelector('.fd-like').classList.toggle('on', !!FD.liked[p.id]); const n = fdLikes(p); post.querySelector('.fd-likes').textContent = `${n.toLocaleString()} like${n === 1 ? '' : 's'}`; return; }
  if (act === 'follow'){ const on = !FD.follows.includes(p.w); fdFollow(p.w, on); renderFeed(); return; }
  if (act === 'comments'){ FDV.open[p.id] = !FDV.open[p.id]; post.outerHTML = fdPostHtml(p); if (FDV.open[p.id]){ const i = document.querySelector(`[data-pid="${p.id}"] .fd-form input`); if (i) i.focus(); } return; }
  if (act === 'reply'){ const c = a.closest('[data-cid]'), cm = p.cm.find(x => x.id === c.dataset.cid); FDV.open[p.id] = true; FDV.re[p.id] = {cid: cm.id, w: cm.w, name: bot(cm.w).name}; post.outerHTML = fdPostHtml(p); const i = document.querySelector(`[data-pid="${p.id}"] .fd-form input`); if (i) i.focus(); return; }
  if (act === 'unre'){ delete FDV.re[p.id]; post.outerHTML = fdPostHtml(p); return; }
  if (act === 'del'){ if (!confirmDel(p)) return; p.del = 1; FD.pend = FD.pend.filter(j => j.pid !== p.id); saveFeed(); renderFeed(); undoToast && undoToast('Post deleted.', () => { delete p.del; saveFeed(); renderFeed(); }); return; }
});
function confirmDel(){ return true; }
document.addEventListener('submit', e => {
  const f = e.target.closest('.fd-form'); if (!f) return; e.preventDefault();
  const p = FD.posts.find(x => x.id === f.closest('[data-pid]').dataset.pid), i = f.querySelector('input'), text = i.value.replace(/\s+/g, ' ').trim();
  if (p && text) fdComment(p, text);
});
// the picture builder: every change redraws the preview
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.fdw; if (!k || !FDV.composer) return;
  const C = FDV.composer, S = C.S, v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (k === 'cap'){ C.cap = v; return; }
  if (k === 'share'){ C.share = v; fdComposerRedraw(); return; }
  if (k.startsWith('lk:')){ FD.look = {...fdMyLook(), [k.slice(3)]: v}; S.look = fdMyLook(); saveFeed(); }
  else if (k.startsWith('prop')){ const n = +k.slice(4), a = S.props.slice(); a[n] = v; S.props = a.filter(Boolean); }
  else if (k === 'season') S.season = v || null;
  else S[k] = v;
  if (k === 'angle' && v === 'selfie') S.look = fdMyLook();
  if (k === 'angle' || k.startsWith('lk:')) fdComposerRedraw();
  else { const pv = document.querySelector('#fdComp .fd-prev'); if (pv) pv.innerHTML = sceneSvg(S, 'prev'); }
});

/* ---- a player's posts on their profile ---- */
const _renderProfilePage = typeof renderProfilePage === 'function' ? renderProfilePage : null;
if (_renderProfilePage) renderProfilePage = function(){
  const r = _renderProfilePage.apply(this, arguments);
  try {
    const w = profWho, mine = w === ME, ps = FD.posts.filter(p => !p.del && p.t <= Date.now() && (mine ? p.w === -1 : p.w === w)).sort((a, b) => b.t - a.t).slice(0, 12);
    const host = $('#profBody'); if (host && ps.length) host.insertAdjacentHTML('beforeend', `<div class="card fd-grid-card"><div class="h first">Posts</div><div class="fd-grid">${ps.map(p => `<button class="fd-thumb" data-goto-post="${p.id}" aria-label="Open post">${fdMedia(p)}</button>`).join('')}</div></div>`);
  } catch(e){ console.error(e); }
  return r;
};
document.addEventListener('click', e => { const b = e.target.closest('[data-goto-post]'); if (!b) return; const p = FD.posts.find(x => x.id === b.dataset.gotoPost); if (!p) return;
  FDV.tab = p.w === -1 ? 'you' : 'for'; FDV.shown = Math.max(FDV.shown, fdList().indexOf(p) + 4); showPage('feed'); setTimeout(() => { const el = document.querySelector(`[data-pid="${p.id}"]`); if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'}); }, 80); });

const _fdShown = onPageShown;
// the world may still be catching up when you open the Feed: fill it as soon as it's ready
function fdOpen(){ if ($('#page-feed').hidden) return; if (!RK_READY || simBusy){ renderFeed(); return setTimeout(fdOpen, 1500); } fdFill(); FDV.drawn = Date.now(); renderFeed(); }
onPageShown = function(name){ _fdShown(name); if (name === 'feed') fdOpen(); };
setTimeout(fdBadge, 3000);
