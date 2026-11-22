/* ---------- Stories ----------
   Like Instagram: a row of rings at the top of the Feed. People you follow post stories that last 24 hours: a picture
   of where they're studying, their study time so far, a session they just finished, their streak, a song, or a few
   words. Who posts, when and what all come from the player and the day (the same on every device, no Gemini needed):
   some post most days, many every few days, some once or twice a week, and nobody has to post every day. A bigger
   study day makes a post a bit more likely. You can post your own (a stats card or your own photo) and see who
   viewed it; replies and reactions go to your DMs, and they answer like any DM. */
const STV = 360, STH = 640, ST_DUR = 5500, ST_LIFE = 864e5;
let STY = store.get('fb.stories', {seen: {}, mine: [], liked: {}, dmd: {}});
STY.seen = STY.seen || {}; STY.mine = STY.mine || []; STY.liked = STY.liked || {}; STY.dmd = STY.dmd || {};
const saveSt = () => store.set('fb.stories', STY);
const ST_CACHE = new Map();

// how often someone posts: about 1 in 5 most days, half every few days, the rest once or twice a week
const stStyle = w => { const h = fdHash(w + ':sty') % 10; return h < 2 ? 'often' : h < 7 ? 'some' : 'rare'; };
const ST_P = {often: .74, some: .33, rare: .2}, ST_N = {often: [1, 4], some: [1, 2], rare: [1, 2]};
const ST_SONGS = ['lofi beats to study to', 'Clair de Lune · Debussy', 'Nights · Frank Ocean', 'Weightless · Marconi Union', 'Pink + White · Frank Ocean', 'Gymnopédie No.1 · Satie', 'Redbone · Childish Gambino', 'Intro · The xx', 'Sunflower · Post Malone', 'Holocene · Bon Iver', 'Space Song · Beach House', 'Experience · Ludovico Einaudi', 'brown noise (3 hours)', 'rain sounds for focus', 'Kyoto · Phoebe Bridgers', 'Nocturne Op.9 No.2 · Chopin'];
const ST_CAP = {
  scene: ['lib grind day {n}', 'home base for the next 3 hours', 'send coffee', 'locked in', 'the view today', 'study spot of the day', 'we move', 'no thoughts just {s}', 'office hours (mine)', 'this corner is mine now', 'productive arc loading', 'pls let this be enough', '', '', ''],
  timer: ['{t} and counting', 'still going', 'we are so back', 'cooked but proud', 'not done yet', '{t} down', ''],
  session: ['{m} of {s} 🫡', 'finally done with {s}', 'one session closer', '{s}: handled', 'that was brutal', ''],
  streak: ['day {n} 🔥', '{n} days and counting', 'not breaking it now', ''],
  song: ['on repeat today', 'study soundtrack', 'this song carries', ''],
  text: ['exam in 3 days help', 'who else is up rn', 'library closes in 1 hr and i have 4 chapters', 'reminder to drink water', 'my brain is a browser with 47 tabs open', 'quiz tomorrow, vibes today', 'one more pomodoro then food', 'why is {s} like this', 'need a study buddy', 'off to class', 'rewarding myself with boba', 'the grind doesn’t stop'],
};
const stFill = (t, o) => t.replace(/\{(\w)\}/g, (_, k) => o[k] != null ? o[k] : '');
// world minutes on a day → a real timestamp
function stAt(dk, m){ const d = new Date(dk + 'T00:00'), off = worldT(Date.now()) - Date.now(); return d.getTime() + m * 60000 - off; }
// someone's stories for one day (all of them, posted or still to come)
function stDay(w, dk){
  const key = w + '|' + dk; if (ST_CACHE.has(key)) return ST_CACHE.get(key);
  const rnd = mulberry32(fdHash('st:' + w + ':' + dk)), sty = stStyle(w), day = botDay(w, dk), ss = day ? day.sessions.filter(x => !x.match) : [];
  const big = ss.reduce((n, x) => n + x.min, 0) >= 240 ? .12 : 0, out = [];
  if (ss.length && rnd() < ST_P[sty] + big){
    const [lo, hi] = ST_N[sty], n = lo + Math.floor(rnd() * (hi - lo + 1)), B = bot(w);
    for (let k = 0; k < n; k++){
      const s = ss[Math.floor(rnd() * ss.length)], r = rnd();
      // when: during a session (a quick picture at the start, or "still going"), or right after one
      const m = r < .5 ? s.a + 2 + Math.floor(rnd() * 8) : Math.min(1439, s.b + 1 + Math.floor(rnd() * 20));
      const tot = ss.filter(x => x.a < m).reduce((x, y) => x + Math.min(y.min, Math.max(0, m - y.a)), 0);
      const kind = r < .5 ? (rnd() < .65 ? 'scene' : tot >= 30 ? 'timer' : 'scene') : (() => { const q = rnd(); return q < .4 ? 'session' : q < .55 ? 'song' : q < .68 ? 'streak' : q < .85 ? 'text' : 'scene'; })();
      const t = stAt(dk, m), subj = String(s.subj || 'studying').toLowerCase();
      const capPool = ST_CAP[kind], cap = stFill(capPool[Math.floor(rnd() * capPool.length)], {n: 2 + Math.floor(rnd() * 40), s: subj, t: `${Math.floor(tot / 60)}h ${tot % 60}m`, m: `${s.min} min`});
      out.push({id: `S${w.toString(36)}_${dk.replace(/-/g, '')}_${k}`, w, t, kind, cap, d: {tot, min: s.min, subj: s.subj, song: ST_SONGS[Math.floor(rnd() * ST_SONGS.length)], streak: 2 + Math.floor(rnd() * 60), live: r < .5, seed: fdHash('stsc:' + w + dk + k), hour: Math.floor(m / 60), hue: B.hue, maj: B.major}});
    }
    out.sort((a, b) => a.t - b.t);
  }
  ST_CACHE.set(key, out); return out;
}
// someone's stories up now (the last 24 hours), oldest first
function stOf(w){
  const now = Date.now(), today = fdWorldMin(now).dk, y = fdWorldMin(now - 864e5).dk;
  return [...stDay(w, y), ...stDay(w, today)].filter(s => s.t <= now && now - s.t < ST_LIFE);
}
const stMine = () => STY.mine.filter(s => Date.now() - s.t < ST_LIFE);
const stAllSeen = list => list.every(s => STY.seen[s.id]);
// the tray: you, then people you follow with stories up (unseen first, newest first)
function stTray(){
  if (typeof FD === 'undefined' || P.noStories) return [];
  const ppl = []; (FD.follows || []).forEach(w => { if (w < 0) return; const l = stOf(w); if (l.length) ppl.push({w, l, seen: stAllSeen(l), last: l[l.length - 1].t}); });
  return ppl.sort((a, b) => a.seen - b.seen || b.last - a.last);
}
function stTrayHtml(){
  if (P.noStories || !RK_READY) return '';
  const tray = stTray(), mine = stMine(), short = n => n.length > 9 ? n.slice(0, 8) + '…' : n;
  const me = `<button class="fd-st st-me" data-st="me" title="${mine.length ? 'Your story' : 'Add to your story'}"><span class="fd-ring st-ring${mine.length ? (stAllSeen(mine) ? ' seen' : '') : ' none'}">${myAvatar('md')}</span>${mine.length ? (stAllSeen(mine) ? '<i class="st-has" data-st="me" title="Watch story" role="button" aria-label="Watch story"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg></i>' : '') : '<i class="st-plus">+</i>'}<small>Your story</small></button>`;
  return `<div class="card fd-strip-card st-tray"><div class="fd-strip-row">${me}${tray.slice(0, 40).map(p => `<button class="fd-st" data-st="${p.w}" title="${esc(bot(p.w).name)}"><span class="fd-ring st-ring${p.seen ? ' seen' : ''}">${avatar(bot(p.w), 'md')}</span>${p.seen ? '<i class="st-has" data-st="${p.w}" title="Watch story" role="button" aria-label="Watch story"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg></i>' : ''}<small>${esc(short(bot(p.w).name))}</small></button>`).join('')}${tray.length ? '' : '<p class="hint st-none">No stories from people you follow right now.</p>'}</div></div>`;
}

/* ---- drawing a story (9:16) ---- */
const stTxt = (x, y, t, sz, f, ex = '') => `<text x="${x}" y="${y}" font-size="${sz}" fill="${f}" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="700" text-anchor="middle"${ex}>${t}</text>`;
function stWrap(text, per){ const lines = []; let cur = ''; String(text).split(' ').forEach(x => { if (cur && (cur + ' ' + x).length > per){ lines.push(cur); cur = x; } else cur = cur ? cur + ' ' + x : x; }); if (cur) lines.push(cur); return lines; }
function stCaption(cap, y){
  if (!cap) return '';
  const lines = stWrap(cap, 24).slice(0, 3);
  return lines.map((l, k) => { const w = Math.min(330, l.length * 10.5 + 28); return `<rect x="${(STV - w) / 2}" y="${y + k * 34 - 22}" width="${w}" height="30" rx="8" fill="rgba(0,0,0,.55)"/>` + stTxt(STV / 2, y + k * 34, esc(l), 17, '#fff'); }).join('');
}
function stSticker(x, y, w, h, body, bg = '#fff'){ return `<g transform="rotate(-3 ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${bg}" opacity=".96"/>${body}</g>`; }
function stSvg(s){
  const d = s.d || {}, hue = d.hue != null ? d.hue : 220, id = 'st' + fdHash(s.id).toString(36);
  const bg = `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scH(hue, 45, 32)}"/><stop offset="1" stop-color="${scH(hue + 50, 50, 16)}"/></linearGradient><filter id="${id}b"><feGaussianBlur stdDeviation="22"/></filter></defs><rect width="${STV}" height="${STH}" fill="url(#${id}g)"/>`;
  const scene = (y, size = 360) => { const S = sceneSpec({seed: d.seed || fdHash(s.id), hue, maj: d.maj || 'math', hour: d.hour != null ? d.hour : 15, month: new Date(s.t).getMonth(), mood: '', outgoing: false, ...(s.w == null && typeof fdMyLook === 'function' && String(s.id).match(/^(M|draft)/) ? {look: fdMyLook()} : {})}); const inner = sceneSvg(S, id).replace('<svg ', `<svg x="${(STV - size) / 2}" y="${y}" width="${size}" height="${size}" `); return inner; };
  const blurScene = () => `<g filter="url(#${id}b)" opacity=".55">${sceneSvg(sceneSpec({seed: d.seed || fdHash(s.id), hue, maj: d.maj || 'math', hour: d.hour != null ? d.hour : 15, month: new Date(s.t).getMonth()}), id + 'x').replace('<svg ', `<svg x="-140" y="0" width="${STH}" height="${STH}" `)}</g>`;
  let body = '';
  if (s.kind === 'photo') body = `<image href="${s.img}" x="0" y="0" width="${STV}" height="${STH}" preserveAspectRatio="xMidYMid slice"/>` + stCaption(s.cap, 500);
  else if (s.kind === 'scene') body = blurScene() + scene(120) + (d.live ? stSticker(108, 500, 144, 40, `<circle cx="128" cy="520" r="6" fill="#e5484d"/><text x="142" y="526" font-size="15" font-weight="700" fill="#222" font-family="ui-sans-serif,system-ui">studying now</text>`) : '') + stCaption(s.cap, d.live ? 92 : 500);
  else if (s.kind === 'timer') body = blurScene() + scene(170, 300) + stSticker(80, 90, 200, 62, stTxt(180, 122, `${Math.floor(d.tot / 60)}h ${d.tot % 60}m`, 30, '#1d1d1f') + stTxt(180, 143, 'STUDIED TODAY', 10, '#777', ' letter-spacing="2"')) + stCaption(s.cap, 500);
  else if (s.kind === 'session') body = blurScene() + stSticker(55, 190, 250, 230, stTxt(180, 236, 'SESSION DONE', 12, '#888', ' letter-spacing="3"') + stTxt(180, 300, d.min >= 60 ? `${Math.floor(d.min / 60)}h ${d.min % 60}m` : `${d.min} min`, 50, '#1d1d1f') + stTxt(180, 340, esc(String(d.subj || '').slice(0, 26)), 15, '#555') + stTxt(180, 392, 'focus bench', 11, '#aaa', ' letter-spacing="2"'), '#f7f4ee') + stCaption(s.cap, 492);
  else if (s.kind === 'streak') body = blurScene() + `<path d="M180 190c38 40 62 74 62 112a62 62 0 0 1-124 0c0-26 14-46 30-60 0 22 8 34 20 38-6-34 2-64 12-90z" fill="#ff8a3d"/><path d="M180 260c18 20 28 36 28 52a28 28 0 0 1-56 0c0-14 8-24 16-30 2 10 6 16 12 18-2-14 0-28 0-40z" fill="#ffd166"/>` + stTxt(180, 430, `${d.streak}-day streak`, 34, '#fff') + stCaption(s.cap, 492);
  else if (s.kind === 'song') body = blurScene() + scene(110, 300) + stSticker(60, 440, 240, 72, `<rect x="74" y="452" width="48" height="48" rx="8" fill="${scH(hue + 120, 50, 55)}"/><path d="M92 486v-22l14-3v22" stroke="#fff" stroke-width="3" fill="none"/>` + `<text x="132" y="472" font-size="13" font-weight="700" fill="#1d1d1f" font-family="ui-sans-serif,system-ui">${esc(String(d.song).split(' · ')[0].slice(0, 22))}</text><text x="132" y="492" font-size="11" fill="#777" font-family="ui-sans-serif,system-ui">${esc(String(d.song).split(' · ')[1] || 'playing now')}</text>`) + stCaption(s.cap, 92);
  else if (s.kind === 'text') body = stWrap(s.cap, 16).slice(0, 7).map((l, k, a) => stTxt(180, 320 - (a.length - 1) * 21 + k * 42, esc(l), 30, '#fff', ' stroke="rgba(0,0,0,.18)" stroke-width="2" paint-order="stroke"')).join('');
  else if (s.kind === 'card') body = stCard(s);
  return `<svg viewBox="0 0 ${STV} ${STH}" class="st-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${bg}${body}</svg>`;
}
// your own stats cards
function stCard(s){
  const d = s.d || {}, big = (v, y) => stTxt(180, y, esc(v), 52, '#1d1d1f'), lab = (v, y) => stTxt(180, y, esc(v), 12, '#888', ' letter-spacing="3"');
  let inner = '';
  if (d.tpl === 'today') inner = lab('STUDIED TODAY', 236) + big(d.v, 306) + stTxt(180, 346, esc(d.sub || ''), 15, '#555');
  else if (d.tpl === 'streak') inner = `<path d="M180 214c22 24 36 44 36 66a36 36 0 0 1-72 0c0-16 8-28 18-36 0 13 5 20 12 23-4-20 1-38 6-53z" fill="#ff8a3d"/>` + big(d.v, 366) + lab('DAY STREAK', 392);
  else if (d.tpl === 'session') inner = lab('SESSION DONE', 236) + big(d.v, 306) + stTxt(180, 346, esc(d.sub || ''), 15, '#555');
  else if (d.tpl === 'rank') inner = lab('MY RANK', 236) + stTxt(180, 296, esc(d.v), 34, '#1d1d1f') + stTxt(180, 336, esc(d.sub || ''), 15, '#555');
  return stSticker(55, 180, 250, 250, inner + stTxt(180, 410, 'focus bench', 11, '#aaa', ' letter-spacing="2"'), '#f7f4ee') + stCaption(s.cap, 492);
}

/* ---- the viewer ---- */
let SV = null;     // {queue: [{w, l}], qi, i, t0, paused, el}
function stOpen(w){
  let queue, qi0 = 0;
  if (w === 'me'){ const m = stMine(); if (!m.length) return stCompose(); queue = [{w: -1, l: m}, ...stTray().map(p => ({w: p.w, l: p.l}))]; }
  else { const tray = stTray(); queue = tray.map(p => ({w: p.w, l: p.l})); const mine = stMine(); if (mine.length) queue.unshift({w: -1, l: mine}); qi0 = queue.findIndex(p => p.w === w); if (qi0 < 0){ const l = stOf(w); if (!l.length) return; queue = [{w, l}]; qi0 = 0; } }
  const first = queue[qi0], start = Math.max(0, first.l.findIndex(s => !STY.seen[s.id]));
  SV = {queue, qi: qi0, i: start, t0: performance.now(), el: 0, paused: false};
  let m = $('#stView'); if (!m){ m = document.createElement('div'); m.id = 'stView'; m.className = 'st-view'; document.body.appendChild(m); }
  m.hidden = false; document.documentElement.classList.add('st-open');
  stShow(); requestAnimationFrame(stLoop);
}
function stCur(){ const g = SV.queue[SV.qi]; return g && {g, s: g.l[SV.i]}; }
function stShow(){
  const c = stCur(); if (!c) return stClose();
  const {g, s} = c, m = $('#stView'), mine = g.w === -1;
  STY.seen[s.id] = Date.now(); saveSt();
  const who = mine ? `<span class="st-av">${myAvatar('sm')}</span><b>Your story</b>` : `<button class="st-av" data-bot="${g.w}">${avatar(bot(g.w), 'sm')}</button><button class="st-name" data-bot="${g.w}">${esc(bot(g.w).name)}</button>`;
  const views = mine ? stViews(s) : null;
  // like Instagram on a computer: the people before and after you sit to the sides, smaller and dimmed; tap one to jump to them
  const peek = (qi, side) => { const q = SV.queue[qi]; if (!q) return ''; const ps = q.l[Math.max(0, q.l.findIndex(x => !STY.seen[x.id]))] || q.l[0];
    return `<button class="st-peek ${side}" data-stq="${qi}" aria-label="${q.w === -1 ? 'Your story' : esc(bot(q.w).name)}">${stSvg(ps)}<span class="st-pk">${q.w === -1 ? myAvatar('md') : avatar(bot(q.w), 'md')}<b>${q.w === -1 ? 'Your story' : esc(bot(q.w).name)}</b><small>${fdAgo(ps.t)}</small></span></button>`; };
  const dir = SV.dir || ''; SV.dir = '';
  m.innerHTML = `<div class="st-car"><div class="st-side l">${[SV.qi - 2, SV.qi - 1].map(k => peek(k, 'l')).join('')}</div><div class="st-stage${dir ? ' in-' + dir : ''}"><div class="st-frame">${stSvg(s)}
      <div class="st-top"><div class="st-bars">${g.l.map((x, k) => `<i><b style="width:${k < SV.i ? 100 : 0}%"></b></i>`).join('')}</div>
        <div class="st-head">${who}<small>${fdAgo(s.t)}</small><span class="st-sp"></span><button class="st-ib" data-sv="pause" aria-label="Pause">${SV.paused ? '▶' : '❚❚'}</button><button class="st-ib" data-sv="close" aria-label="Close">✕</button></div></div>
      <button class="st-tap l" data-sv="prev" aria-label="Previous"></button><button class="st-tap r" data-sv="next" aria-label="Next"></button>
      <div class="st-foot">${mine ? `<button class="st-views" data-sv="views"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>${views.n.toLocaleString()} viewer${views.n === 1 ? '' : 's'}</button><span class="st-sp"></span><button class="st-ib" data-sv="add" aria-label="Add to your story">+</button><button class="st-ib" data-sv="del" aria-label="Delete this story">🗑</button>`
        : `<form class="st-reply" id="stForm"><input id="stIn" maxlength="200" autocomplete="off" placeholder="Send message"><button class="st-ib" type="submit" aria-label="Send">➤</button></form><button class="st-ib st-rxb${SV.rx ? ' on' : ''}" data-sv="rx" aria-label="Reactions"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.2c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9.2 9.8h.01M14.8 9.8h.01"/></svg></button><button class="st-ib st-like${STY.liked[s.id] ? ' on' : ''}" data-sv="like" aria-label="Like">${STY.liked[s.id] ? '♥' : '♡'}</button>`}</div>
      ${mine ? '' : `<div class="st-rx"${SV.rx ? '' : ' hidden'}>${['😂', '😮', '😍', '😢', '👏', '🔥'].map(e => `<button data-sx="${e}">${e}</button>`).join('')}</div>`}
      <div class="st-panel" hidden></div></div>
    <button class="st-arrow l" data-sv="prev" aria-label="Previous">‹</button><button class="st-arrow r" data-sv="next" aria-label="Next">›</button></div><div class="st-side r">${[SV.qi + 1, SV.qi + 2].map(k => peek(k, 'r')).join('')}</div></div>`;
  SV.t0 = performance.now(); SV.el = 0;
  try { fdStrip(); } catch(e){}
}
function stLoop(now){
  if (!SV) return;
  const bar = document.querySelector(`#stView .st-bars i:nth-child(${SV.i + 1}) b`), busy = SV.paused || SV.rx || document.activeElement === $('#stIn') || SV.hold || !$('#stView .st-panel').hidden;
  if (busy){ SV.t0 = now - SV.el; } else { SV.el = now - SV.t0; }
  if (bar) bar.style.width = Math.min(100, SV.el / ST_DUR * 100) + '%';
  if (SV.el >= ST_DUR) stNext(); else requestAnimationFrame(stLoop);
}
function stNext(){ if (!SV) return; const g = SV.queue[SV.qi]; if (SV.i < g.l.length - 1){ SV.i++; stShow(); requestAnimationFrame(stLoop); } else stNextPerson(); }
function stPrev(){ if (!SV) return; if (SV.i > 0){ SV.i--; stShow(); } else if (SV.qi > 0){ SV.qi--; SV.dir = 'l'; SV.i = SV.queue[SV.qi].l.length - 1; stShow(); } else { SV.t0 = performance.now(); SV.el = 0; } }
function stNextPerson(){ if (!SV) return; if (SV.qi < SV.queue.length - 1){ SV.qi++; SV.dir = 'r'; const l = SV.queue[SV.qi].l; SV.i = Math.max(0, l.findIndex(s => !STY.seen[s.id])); stShow(); requestAnimationFrame(stLoop); } else stClose(); }
function stPrevPerson(){ if (!SV || SV.qi === 0){ if (SV){ SV.i = 0; stShow(); } return; } SV.qi--; SV.dir = 'l'; SV.i = 0; stShow(); }
function stClose(){ SV = null; const m = $('#stView'); if (m){ m.hidden = true; m.innerHTML = ''; } document.documentElement.classList.remove('st-open'); try { fdStrip(); } catch(e){} }
// what a story shows, in a few words (for DMs about it)
function stAbout(s){
  const d = s.d || {};
  return ({scene: 'a picture of where they’re studying', timer: `their study time today (${Math.floor((d.tot || 0) / 60)}h ${(d.tot || 0) % 60}m)`, session: `a finished ${d.min}-minute session of ${d.subj}`, streak: `their ${d.streak}-day streak`, song: `the song they’re listening to (${d.song})`, text: 'a text story', photo: 'a photo', card: `a ${d.tpl === 'today' ? 'study time' : d.tpl} card (${d.v})`})[s.kind] + (s.cap ? `, captioned “${s.cap}”` : '');
}
function stReply(text, react){
  const c = stCur(); if (!c || c.g.w === -1 || !text.trim()) return;
  dmSend(c.g.w, text.trim().slice(0, 200));
  const last = DMS.msgs[DMS.msgs.length - 1]; if (last && last.me && last.w === c.g.w){ last.sr = stAbout(c.s); last.st = {id: c.s.id, w: c.g.w}; if (react) last.srx = 1; saveDms(); try { renderChat(); } catch(e){} }
  stSent(react ? text : null, react ? `Reaction sent to ${bot(c.g.w).name}` : `Sent to ${bot(c.g.w).name}`);
}
// what you see after reacting or replying: the emoji floats up, and a little note says it went
function stSent(emoji, note){
  const f = $('#stView .st-frame'); if (!f) return;
  if (emoji) for (let k = 0; k < 7; k++){ const e = document.createElement('i'); e.className = 'st-fly'; e.textContent = emoji; e.style.left = (30 + Math.random() * 40) + '%'; e.style.animationDelay = (k * 70) + 'ms'; e.style.fontSize = (34 + Math.random() * 26) + 'px'; f.appendChild(e); setTimeout(() => e.remove(), 1800); }
  let n = f.querySelector('.st-sent'); if (!n){ n = document.createElement('div'); n.className = 'st-sent'; f.appendChild(n); }
  n.textContent = note; n.classList.remove('on'); void n.offsetWidth; n.classList.add('on');
}

/* ---- your story: who viewed it ---- */
function stViews(s){
  const fol = (FD.followers || []).filter(w => w >= 0), age = (Date.now() - s.t) / 36e5, reach = Math.min(1, .2 + .8 * (1 - Math.exp(-age / 2.5)));
  const order = fol.slice().sort((a, b) => fdHash(s.id + ':' + a) - fdHash(s.id + ':' + b)), cut = Math.round(order.length * (.35 + (fdHash(s.id) % 30) / 100) * reach);
  const list = order.slice(0, cut).map(w => ({w, rx: fdHash(s.id + 'rx' + w) % 9 === 0 ? ['😍', '🔥', '👏', '😂', '😮'][fdHash(s.id + 'e' + w) % 5] : '', like: fdHash(s.id + 'lk' + w) % 5 === 0}));
  return {n: list.length, list};
}
function stViewsPanel(){
  const c = stCur(); if (!c) return; const v = stViews(c.s), p = $('#stView .st-panel');
  p.hidden = !p.hidden; if (p.hidden) return;
  p.innerHTML = `<div class="st-ph"><b>${v.n.toLocaleString()} viewer${v.n === 1 ? '' : 's'}</b><button class="st-ib" data-sv="views" aria-label="Close">✕</button></div><ul>${v.list.slice(0, 200).map(x => `<li><button class="st-pv" data-bot="${x.w}">${avatar(bot(x.w), 'sm')}<span>${esc(bot(x.w).name)}</span></button>${x.like ? '<i class="st-heart">♥</i>' : ''}${x.rx ? `<i>${x.rx}</i>` : ''}</li>`).join('') || '<li class="hint">No one yet. Give it a little time.</li>'}</ul>`;
}
// now and then someone who saw your story messages you about it (once per story, and not for every one)
async function stDmTick(){
  if (typeof dmWrite !== 'function' || !RK_READY) return;
  for (const s of stMine()){
    if (STY.dmd[s.id] || Date.now() - s.t < 20 * 60000) continue;
    STY.dmd[s.id] = 1; saveSt();
    if (fdHash(s.id + ':dm') % 100 >= 10) continue;
    const v = stViews(s).list; if (!v.length) continue;
    const w = v[fdHash(s.id + 'who') % Math.min(v.length, 12)].w;
    try {
      const {texts} = await dmWrite(w, `${bot(w).name} just saw ${myName()}'s story (${stAbout(s)}) and messages ${myName()} about it: 1 or 2 short texts reacting to it, like replying to a story on Instagram.`);
      const off = typeof gcState === 'function' ? gcState(w) === 'off' : !dmOnline(w);
      if (texts.length) dmQueue(w, off ? Date.now() + 7 * 864e5 : Date.now() + 4000, texts, {sr: 'your story: ' + stAbout(s)});      // offline: it sends when they're back on
    } catch(e){ console.error(e); }
    return;          // one at a time
  }
}
setInterval(() => { try { stDmTick(); } catch(e){} }, 60000);

/* ---- posting your own ---- */
let SC_ = null;    // the composer: {tpl, cap, img}
function stTemplates(){
  const out = {}, today = dayKey(Date.now()), mins = LOG.filter(x => dayKey(x.t) === today).reduce((n, x) => n + x.min, 0), si = streakInfo(), last = LOG[LOG.length - 1];
  out.today = {label: 'Study time today', d: {tpl: 'today', v: `${Math.floor(mins / 60)}h ${mins % 60}m`, sub: `${LOG.filter(x => dayKey(x.t) === today).length} session${LOG.filter(x => dayKey(x.t) === today).length === 1 ? '' : 's'}`}};
  if (si.cur) out.streak = {label: 'My streak', d: {tpl: 'streak', v: String(si.cur)}};
  if (last) out.session = {label: 'Last session', d: {tpl: 'session', v: last.min >= 60 ? `${Math.floor(last.min / 60)}h ${last.min % 60}m` : `${last.min} min`, sub: String(last.task || last.tag || 'Focus').slice(0, 28)}};
  if (R && R.on) out.rank = {label: 'My rank', d: {tpl: 'rank', v: myRk().full, sub: `${R.mmr.toLocaleString()} Elo`}};
  out.photo = {label: 'Photo', d: {tpl: 'photo'}};
  out.text = {label: 'Just text', d: {tpl: 'text'}};
  return out;
}
function stCompose(tpl){
  const T = stTemplates(); SC_ = {tpl: tpl && T[tpl] ? tpl : Object.keys(T)[0], cap: '', img: null};
  let m = $('#stComp'); if (!m){ m = document.createElement('div'); m.id = 'stComp'; m.className = 'modal'; document.body.appendChild(m); }
  m.hidden = false; stComposeDraw();
}
function stComposeDraw(){
  const T = stTemplates(), m = $('#stComp'); if (!m || !SC_) return;
  const s = stDraft();
  m.innerHTML = `<div class="modal-card st-comp" role="dialog" aria-modal="true" aria-label="Add to your story"><div class="st-ch"><b>Add to your story</b><button class="st-ib dark" data-sc="close" aria-label="Close">✕</button></div>
    <div class="st-cb"><div class="st-prev">${s ? stSvg(s) : '<div class="st-pick"><p>Pick a photo</p></div>'}</div>
    <div class="st-opts"><div class="st-tpls">${Object.entries(T).map(([k, x]) => `<button class="chip${SC_.tpl === k ? ' on' : ''}" data-sct="${k}">${x.label}</button>`).join('')}</div>
      ${SC_.tpl === 'photo' ? `<label class="small-btn st-file">Choose photo<input type="file" accept="image/*" id="stFile" hidden></label>` : ''}
      ${SC_.tpl === 'text' ? '<button class="small-btn" data-sc="color">New color</button>' : ''}
      <label class="st-capl">${SC_.tpl === 'text' ? 'Text' : 'Caption (optional)'}<input id="stCap" maxlength="${SC_.tpl === 'text' ? 140 : 80}" placeholder="${SC_.tpl === 'text' ? 'What’s on your mind?' : 'Leave it empty for no caption'}" value="${esc(SC_.cap)}"></label>
      <p class="hint">Stories last 24 hours. Your followers see it in their tray; you'll see who viewed it.</p>
      <button class="small-btn accent" data-sc="post" ${s ? '' : 'disabled'}>Share to story</button></div></div></div>`;
}
function stDraft(){
  const T = stTemplates(), x = T[SC_.tpl]; if (!x) return null;
  if (SC_.tpl === 'photo') return SC_.img ? {id: 'draft', t: Date.now(), kind: 'photo', img: SC_.img, cap: SC_.cap, d: {}} : null;
  const hue = P.myHue != null ? P.myHue : 215;
  if (SC_.tpl === 'text') return SC_.cap.trim() ? {id: 'draft', t: Date.now(), kind: 'text', cap: SC_.cap.trim(), d: {hue: SC_.hue != null ? SC_.hue : hue}} : null;
  if (SC_.tpl === 'pic') return {id: 'draft' + (SC_.seed || 0), t: Date.now(), kind: 'scene', cap: SC_.cap.trim(), d: {seed: SC_.seed || (SC_.seed = Math.floor(Math.random() * 1e9)), hue, hour: new Date().getHours(), maj: 'math'}};
  return {id: 'draft', t: Date.now(), kind: 'card', cap: SC_.cap, d: {...x.d, hue: P.myHue != null ? P.myHue : 215}};
}
function stPost(){
  const s = stDraft(); if (!s) return;
  s.id = 'M' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); s.t = Date.now();
  STY.mine = stMine().concat(s); saveSt(); $('#stComp').hidden = true; SC_ = null;
  toast('Added to your story'); try { fdStrip(); } catch(e){}
}
// photos are shrunk to story size before they're kept
function stLoadPhoto(file){
  const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => {
    const c = document.createElement('canvas'), W = 540, H = 960, sc = Math.max(W / img.width, H / img.height); c.width = W; c.height = H;
    c.getContext('2d').drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc);
    SC_.img = c.toDataURL('image/jpeg', .72); stComposeDraw(); }; img.src = r.result; }; r.readAsDataURL(file);
}

/* ---- input ---- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-st]'); if (t && t.closest('#fdStrip')){ e.preventDefault(); e.stopPropagation(); const v = t.dataset.st; if (v === 'me'){ if (stMine().length) stOpen('me'); else stCompose(); } else stOpen(+v); return; }
  if (e.target.closest('#stView')){
    const b = e.target.closest('[data-bot]'); if (b){ e.preventDefault(); e.stopPropagation(); const w = +b.dataset.bot; stClose(); openProfile(w); return; }
    const pk = e.target.closest('[data-stq]'); if (pk){ const qi = +pk.dataset.stq; SV.dir = qi > SV.qi ? 'r' : 'l'; SV.qi = qi; const l = SV.queue[qi].l; SV.i = Math.max(0, l.findIndex(x => !STY.seen[x.id])); stShow(); return; }
    const x = e.target.closest('[data-sx]'); if (x){ stReply(x.dataset.sx, true); SV.rx = false; const r = $('#stView .st-rx'); if (r) r.hidden = true; const b = $('#stView .st-rxb'); if (b) b.classList.remove('on'); return; }
    const a = e.target.closest('[data-sv]'); if (!a) return; const k = a.dataset.sv;
    if (k === 'close') stClose(); else if (k === 'next') stNext(); else if (k === 'prev') stPrev(); else if (k === 'nextp') stNextPerson(); else if (k === 'prevp') stPrevPerson();
    else if (k === 'pause'){ SV.paused = !SV.paused; a.textContent = SV.paused ? '▶' : '❚❚'; }
    else if (k === 'like'){ const c = stCur(); if (!c) return; STY.liked[c.s.id] = !STY.liked[c.s.id]; saveSt(); a.classList.toggle('on', STY.liked[c.s.id]); a.textContent = STY.liked[c.s.id] ? '♥' : '♡'; if (STY.liked[c.s.id] && typeof fdHeartPop === 'function') try { fdHeartPop(a); } catch(err){} }
    else if (k === 'views') stViewsPanel();
    else if (k === 'rx'){ SV.rx = !SV.rx; const r = $('#stView .st-rx'); if (r) r.hidden = !SV.rx; a.classList.toggle('on', SV.rx); }
    else if (k === 'add'){ stClose(); stCompose(); }
    else if (k === 'del'){ const c = stCur(); if (!c) return; if (a.dataset.sure){ STY.mine = STY.mine.filter(s => s.id !== c.s.id); saveSt(); const l = stMine(); if (!l.length) return stClose(); SV.queue[0].l = l; SV.i = Math.min(SV.i, l.length - 1); stShow(); } else { a.dataset.sure = 1; a.textContent = 'Delete?'; SV.paused = true; } }
    return;
  }
  if (e.target.closest('#stComp')){
    const c = e.target.closest('[data-sct]'); if (c){ SC_.tpl = c.dataset.sct; stComposeDraw(); return; }
    const a = e.target.closest('[data-sc]'); if (a){ const k = a.dataset.sc; if (k === 'close'){ $('#stComp').hidden = true; SC_ = null; } else if (k === 'post') stPost(); else if (k === 'shuffle'){ SC_.seed = Math.floor(Math.random() * 1e9); stComposeDraw(); } else if (k === 'color'){ SC_.hue = Math.floor(Math.random() * 360); stComposeDraw(); } return; }
    if (e.target.id === 'stComp'){ $('#stComp').hidden = true; SC_ = null; }
  }
}, true);
document.addEventListener('input', e => { if (e.target.id === 'stCap' && SC_){ SC_.cap = e.target.value; const p = $('#stComp .st-prev'), s = stDraft(); if (p) p.innerHTML = s ? stSvg(s) : '<div class="st-pick"><p>Type something</p></div>'; const b = $('#stComp [data-sc="post"]'); if (b) b.disabled = !s; } });
document.addEventListener('change', e => { if (e.target.id === 'stFile' && e.target.files[0]) stLoadPhoto(e.target.files[0]); });
document.addEventListener('submit', e => { if (e.target.id !== 'stForm') return; e.preventDefault(); const i = $('#stIn'); stReply(i.value); i.value = ''; i.blur(); });
document.addEventListener('keydown', e => {
  if (!SV || e.target.id === 'stIn') return;
  if (e.key === 'Escape') stClose(); else if (e.key === 'ArrowRight') stNext(); else if (e.key === 'ArrowLeft') stPrev(); else if (e.key === ' '){ e.preventDefault(); SV.paused = !SV.paused; }
});
// hold to pause; swipe left/right for the next/previous person, down to close
{
  let p0 = null;
  document.addEventListener('pointerdown', e => { if (!SV || !e.target.closest('#stView .st-frame') || e.target.closest('input, form, .st-foot, .st-rx, .st-panel, .st-head')) return; p0 = {x: e.clientX, y: e.clientY, t: performance.now()}; SV.hold = true; });
  document.addEventListener('pointerup', e => {
    if (!SV || !p0) return; SV.hold = false; const dx = e.clientX - p0.x, dy = e.clientY - p0.y, dt = performance.now() - p0.t; const was = p0; p0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)){ SV.swiped = true; dx < 0 ? stNextPerson() : stPrevPerson(); }
    else if (dy > 90){ SV.swiped = true; stClose(); }
    else if (dt > 260) SV.swiped = true;        // that was a hold, not a tap
    void was;
  });
  // a hold or swipe isn't also a tap
  document.addEventListener('click', e => { if (SV && SV.swiped && e.target.closest('#stView .st-tap')){ e.stopImmediatePropagation(); e.preventDefault(); SV.swiped = false; } }, true);
}

/* ---- one row on the Feed: Live now first, then stories, then people studying ----
   A story you haven't seen has the colorful ring; once you've seen it, the ring shows how they are right now:
   green studying, blue online, gray offline. */
const stStatus = w => typeof gcState === 'function' ? gcState(w) : 'off';
fdStrip = function(){
  const el = $('#fdStrip'); if (!el || !RK_READY) return;
  if (FDV.tab === 'live' || FDV.tab === 'act'){ el.innerHTML = ''; return; }
  const short = n => n.length > 9 ? n.slice(0, 8) + '…' : n;
  const live = typeof wLiveTop === 'function' ? wLiveTop().slice(0, 6) : [];
  const tray = P.noStories ? [] : stTray(), withStory = new Set(tray.map(p => p.w)), mine = stMine();
  const seenP = new Set(), ppl = [], add = w => { if (w >= 0 && !seenP.has(w) && !withStory.has(w) && botLiveNow(w)){ seenP.add(w); ppl.push(w); } };
  FD.follows.forEach(add); Object.keys(R.rec || {}).map(Number).filter(w => isRival(w)).forEach(add); if (ppl.length < 8) FD.followers.forEach(add);
  const ring = w => { const st = stStatus(w); return st === 'study' ? 'rs-study' : st === 'on' ? 'rs-on' : 'rs-off'; };
  const items = [];
  if (!P.noStories) items.push(`<button class="fd-st st-me" data-st="me" title="${mine.length ? 'Your story' : 'Add to your story'}"><span class="fd-ring ${mine.length ? (stAllSeen(mine) ? 'rs-on' : 'st-ring') : 'st-ring none'}">${myAvatar('md')}</span>${mine.length ? (stAllSeen(mine) ? '<i class="st-has" data-st="me" title="Watch story" role="button" aria-label="Watch story"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg></i>' : '') : '<i class="st-plus">+</i>'}<small>Your story</small></button>`);
  live.forEach(p => { const top = p.ra >= p.rc ? p.a : p.c, oth = top === p.a ? p.c : p.a;
    items.push(`<button class="fd-st live" data-watch="${p.a}-${p.c}" title="Watch ${esc(bot(p.a).name)} vs ${esc(bot(p.c).name)}"><span class="fd-ring">${avatar(bot(top), 'md')}</span><b class="fd-livetag">LIVE</b><small>${esc(short(bot(top).name))} vs ${esc(short(bot(oth).name))}</small></button>`); });
  tray.slice(0, 40).forEach(p => items.push(p.seen ? `<button class="fd-st" data-bot="${p.w}" title="${esc(bot(p.w).name)}"><span class="fd-ring ${ring(p.w)}">${avatar(bot(p.w), 'md')}</span><i class="st-has" data-st="${p.w}" title="Watch story" role="button" aria-label="Watch story"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg></i><small>${esc(short(bot(p.w).name))}</small></button>` : `<button class="fd-st" data-st="${p.w}" title="${esc(bot(p.w).name)}"><span class="fd-ring st-ring">${avatar(bot(p.w), 'md')}</span><small>${esc(short(bot(p.w).name))}</small></button>`));
  ppl.slice(0, 24).forEach(w => items.push(`<button class="fd-st" data-bot="${w}" title="${esc(bot(w).name)} is studying"><span class="fd-ring rs-study">${avatar(bot(w), 'md')}</span><small>${esc(short(bot(w).name))}</small></button>`));
  // updated in place (not rebuilt), so a scroll that's moving keeps moving smoothly
  const html = items.length ? `<div class="card fd-strip-card"><div class="fd-strip-row">${items.join('')}</div><button class="fd-sa l" aria-label="Scroll left">‹</button><button class="fd-sa r" aria-label="Scroll right">›</button></div>` : '';
  if (typeof domMorph === 'function') domMorph(el, html); else el.innerHTML = html;
  stripArrows();
};

/* ---- sync: what you've seen, and your own stories ---- */
if (typeof SECTIONS !== 'undefined'){
  SECTIONS.stories = {
    items: () => { const o = {}; const cut = Date.now() - 2 * 864e5;
      Object.entries(STY.seen).forEach(([id, t]) => { if (t > cut) o['s:' + id] = t; });
      stMine().forEach(s => { o['m:' + s.id] = s; }); Object.entries(STY.liked).forEach(([id, v]) => { if (v) o['l:' + id] = 1; }); return o; },
    put: o => { const seen = {}, mine = [], liked = {};
      Object.entries(o).forEach(([k, v]) => { if (k.startsWith('s:')) seen[k.slice(2)] = v; else if (k.startsWith('m:')) mine.push(v); else if (k.startsWith('l:')) liked[k.slice(2)] = 1; });
      STY.seen = {...STY.seen, ...seen}; STY.mine = mine.sort((a, b) => a.t - b.t); STY.liked = {...STY.liked, ...liked}; store.set('fb.stories', STY); try { fdStrip(); } catch(e){} }
  };
  if (typeof STORE_SECTION !== 'undefined') STORE_SECTION['fb.stories'] = 'stories';
}
// keep what you've seen tidy (two days is plenty)
{ const cut = Date.now() - 2 * 864e5; let ch = false; for (const k in STY.seen) if (STY.seen[k] < cut){ delete STY.seen[k]; ch = true; } STY.mine = STY.mine.filter(s => Date.now() - s.t < 2 * ST_LIFE); if (ch) saveSt(); }

// the setting
{ const c = $('#stShow'); if (c){ c.checked = !P.noStories; c.addEventListener('change', () => { P.noStories = !c.checked; saveP(); try { fdStrip(); } catch(e){} }); } }

// after a focus session of 15+ minutes, offer to put it on your story
{
  const _lf = logFocus;
  logFocus = function(ms){
    const r = _lf.apply(this, arguments);
    try { if (ms >= 15 * 60000 && !P.noStories){ let n = $('#stNudge'); if (!n){ n = document.createElement('div'); n.id = 'stNudge'; n.className = 'st-nudge'; document.body.appendChild(n); }
      n.innerHTML = `<span>Share this session to your story?</span><button class="small-btn accent" data-stn="go">Add to story</button><button class="st-ib dark" data-stn="x" aria-label="Dismiss">✕</button>`; n.hidden = false;
      clearTimeout(n._t); n._t = setTimeout(() => { n.hidden = true; }, 12000); } } catch(e){}
    return r;
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-stn]'); if (!b) return; $('#stNudge').hidden = true; if (b.dataset.stn === 'go') stCompose('session'); });
}

/* ---- the Feed's two rows (stories and Live now) scroll sideways: arrows at the ends, the mouse wheel, or drag ---- */
function stripArrows(){
  document.querySelectorAll('#fdStrip .fd-strip-card').forEach(card => {
    const row = card.querySelector('.fd-strip-row'); if (!row) return;
    let l = card.querySelector('.fd-sa.l'), r = card.querySelector('.fd-sa.r');
    card.classList.add('fd-scroll'); if (!l){ card.insertAdjacentHTML('beforeend', '<button class="fd-sa l" aria-label="Scroll left">‹</button><button class="fd-sa r" aria-label="Scroll right">›</button>'); l = card.querySelector('.fd-sa.l'); r = card.querySelector('.fd-sa.r'); }
    const max = row.scrollWidth - row.clientWidth;
    l.hidden = row.scrollLeft <= 2; r.hidden = row.scrollLeft >= max - 2;
  });
}
// glide: every wheel notch or arrow press moves the target, and the row eases toward it
function stripGlide(row, dx){
  const max = row.scrollWidth - row.clientWidth;
  row._tgt = Math.max(0, Math.min(max, (row._gliding ? row._tgt : row.scrollLeft) + dx));
  if (row._gliding) return; row._gliding = true;
  const step = () => { const d = row._tgt - row.scrollLeft; if (Math.abs(d) < .6 || !row.isConnected){ row.scrollLeft = row._tgt; row._gliding = false; stripArrows(); return; } row.scrollLeft += d * .16; requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
document.addEventListener('click', e => { const b = e.target.closest('#fdStrip .fd-sa'); if (!b) return; const row = b.closest('.fd-strip-card').querySelector('.fd-strip-row'); stripGlide(row, (b.classList.contains('l') ? -1 : 1) * row.clientWidth * .8); });
document.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('fd-strip-row')) stripArrows(); }, true);
document.addEventListener('wheel', e => {
  const row = e.target.closest && e.target.closest('#fdStrip .fd-strip-row'); if (!row || row.scrollWidth <= row.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const max = row.scrollWidth - row.clientWidth; if ((e.deltaY < 0 && row.scrollLeft <= 0) || (e.deltaY > 0 && row.scrollLeft >= max)) return;     // at an end: let the page scroll
  e.preventDefault(); stripGlide(row, e.deltaY * (e.deltaMode === 1 ? 40 : 1.4));
}, {passive: false});
{ // drag with the mouse (a drag isn't a click)
  let d = null;
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; const row = e.target.closest && e.target.closest('#fdStrip .fd-strip-row'); if (row) d = {row, x: e.clientX, s: row.scrollLeft, moved: false}; });
  document.addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 5) d.moved = true; if (d.moved){ d.row.scrollLeft = d.s - dx; d.row.classList.add('dragging'); } });
  document.addEventListener('pointerup', () => { if (!d) return; const was = d; d = null; was.row.classList.remove('dragging'); if (was.moved){ const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', stop, {capture: true, once: true}); setTimeout(() => document.removeEventListener('click', stop, true), 50); } });
}
addEventListener('resize', stripArrows);

// a story someone replied to, shown in DMs: tap it to watch (while it's still up)
function stFind(id, w){ return (w === -1 ? stMine() : stOf(w)).find(s => s.id === id) || (w === -1 ? STY.mine.find(s => s.id === id) : null); }
function stThumb(st){
  const s = st && stFind(st.id, st.w);
  if (!s) return `<div class="dm-story gone"><span>Story unavailable</span></div>`;
  return `<button class="dm-story" data-stopen="${esc(st.id)}" data-stw="${st.w}" aria-label="Open story">${typeof fxUniq === 'function' ? fxUniq(stSvg(s), 'dm') : stSvg(s)}</button>`;
}
function stOpenOne(id, w){
  const s = stFind(id, w); if (!s) return toast('That story isn’t up anymore.');
  const l = w === -1 ? stMine() : stOf(w); SV = {queue: [{w, l}], qi: 0, i: Math.max(0, l.findIndex(x => x.id === id)), t0: performance.now(), el: 0, paused: false};
  let m = $('#stView'); if (!m){ m = document.createElement('div'); m.id = 'stView'; m.className = 'st-view'; document.body.appendChild(m); }
  m.hidden = false; document.documentElement.classList.add('st-open'); stShow(); requestAnimationFrame(stLoop);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-stopen]'); if (!b) return; e.preventDefault(); e.stopPropagation(); stOpenOne(b.dataset.stopen, +b.dataset.stw); }, true);
