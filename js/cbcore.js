/* ---------- turning AI-written comments into comments on a post ----------
   Shared by the app and the overnight run (tools/comments.mjs loads this same file), so comments written while the app
   is closed land exactly like ones written in it. Plain functions only: nothing here touches the page or the app's state. */
// only emotion and reaction emojis survive (every face, heart, hand gesture and a few reaction symbols); object emojis that just illustrate words are removed
var EMO_EXTRA = new Set([...'💀☠💩👻👽👾🤖😈👿👹👺🤡🎃👀🔥✨💯🎉🎊💅💢💤💫💥💦💨❗❓‼⁉💋🌚🌝💃🕺🫂🗣']);
var emoOk = ch => { const c = ch.codePointAt(0);
  return (c >= 0x1F600 && c <= 0x1F64F) || (c >= 0x1F910 && c <= 0x1F92F) || (c >= 0x1F970 && c <= 0x1F97A) || c === 0x1F9D0 || (c >= 0x1FAE0 && c <= 0x1FAE9) || c === 0x263A || c === 0x2639
    || c === 0x2764 || c === 0x2763 || (c >= 0x1F493 && c <= 0x1F49F) || c === 0x1F9E1 || c === 0x1F90D || c === 0x1F90E || c === 0x1F5A4 || (c >= 0x1FA75 && c <= 0x1FA77)
    || (c >= 0x1F446 && c <= 0x1F450) || (c >= 0x270A && c <= 0x270D) || c === 0x261D || c === 0x1F590 || c === 0x1F596 || (c >= 0x1F918 && c <= 0x1F91F) || c === 0x1F90C || c === 0x1F90F
    || (c >= 0x1FAF0 && c <= 0x1FAF8) || c === 0x1F4AA || c === 0x1F937 || c === 0x1F926 || EMO_EXTRA.has(ch); };
var SEG = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter() : null;
// a goodnight in the afternoon or a good morning at night doesn't fit the time: it's dropped
const GN_RE = /^\W*(?:gn|g\.n\.?|good ?night|night night|nighty ?night|nite|sleep well|sweet dreams|going to (?:bed|sleep)|heading (?:to bed|off to sleep)|off to (?:bed|sleep)|time for bed|im (?:going )?(?:to )?(?:bed|sleep)|i'?m (?:going )?(?:to )?(?:bed|sleep))\b/i, GM_RE = /^\W*(?:gm|good ?morning|morning (?:everyone|all|guys|y'?all|dude))\b/i;
function wrongTimeGreeting(t){ const h = new Date().getHours(); return (h >= 7 && h < 20 && GN_RE.test(t)) || ((h >= 14 || h < 4) && GM_RE.test(t)); }
function emotionOnly(t){
  if (wrongTimeGreeting(t)) return '';
  if (!SEG || !/\p{Extended_Pictographic}/u.test(t)) return t;
  let out = '';
  for (const {segment: g} of SEG.segment(t)){
    if (!/\p{Extended_Pictographic}/u.test(g)){ out += g; continue; }
    const base = [...g.replace(/[\u{1F3FB}-\u{1F3FF}\uFE0F\u200D\u2640\u2642\u2194\u2195]/gu, '')][0];
    if (base && emoOk(base)) out += g;
  }
  return out.replace(/ {2,}/g, ' ').replace(/ ([,.!?])/g, '$1').trim();
}
function stripSegue(t){
  const m = t.match(/^(speaking of|on (that|the) (note|topic|subject) of|on that note|that reminds me( of)?|random(ly)?( but| question| thought)?|unrelated( but)?|totally unrelated( but)?|changing the subject|side note|off topic( but)?)\b[^,.!?:;—–-]*[,:;—–-]\s*/i);
  if (!m || m[0].length >= t.length - 8) return t;
  return t.slice(m[0].length);
}
// a poster only answers people on their own post (no new comments of their own): about one answer for every 8 comments, at least 3
function cbSelfMax(p){ return Math.max(3, Math.round((p.cm || []).filter(c => !c.del && c.w !== p.w).length / 8)); }
function cbSelfOk(p, w, re){ return w < 0 || w !== p.w || (re && (p.cm || []).filter(c => c.w === w && !c.del).length < cbSelfMax(p)); }
// likes on a new comment: set when it's written; `likes` is the post's like count
function cbCmLikes(likes, reply){ return Math.round(Math.max(0, likes * .004 * Math.exp((Math.random() + Math.random() + Math.random() - 1.5) * 1.6) * (reply ? .25 : 1))); }
// the post's likes as they build up over the first hours (the app adds 1 if you liked it)
function cbLikes(p, now = Date.now()){ return p.L ? Math.floor(p.L * (1 - Math.exp(-(now - p.t) / (2700e3 * (1 + Math.log10(Math.max(1, p.L / 200))))))) : 0; }
// add Gemini's messages to p.cm; returns how many were added
//   names: {lowercase name: player number}; tags: {c3: comment id}; env: {me, nameOf(w), likes}
//   replyTo: "new", a tag ("c3": the thread under that comment) or "@name" (that person's latest comment)
function cbApplyCore(p, got, names, now, tags, env){
  const span = Math.max(60000, Math.min(now - p.t, 3 * 864e5)), last = new Map(); let added = 0, k = 0;
  tags = tags || {};
  (Array.isArray(got) ? got : []).forEach(x => {
    const w = names[String(x && x.from || '').toLowerCase().trim()]; if (w == null) return;
    let text = emotionOnly(stripSegue(String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().slice(0, 240))); if (!text) return;
    const to = String(x.replyTo || '').trim(), tg = to.match(/^\[?(c\d+)\b/i), tagId = tg && tags[tg[1].toLowerCase()];
    let re = null;
    if (tagId && p.cm.some(c => c.id === tagId && !c.del)) re = tagId;          // inside a thread, "@name …" stays: it says who in the thread they're answering
    else {
      // "@name" (or text starting with @name): under that person's latest comment, without the @name
      let name = /^@/.test(to) ? to.slice(1).trim() : ''; const m = !name && text.match(/^@([\w.]+)\s*/); if (m) name = m[1];
      if (name){
        text = text.replace(new RegExp('^@' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '').trim() || text;
        const nm = name.toLowerCase(), par = p.cm.slice().reverse().find(c => !c.del && String(c.w === -1 ? env.me : env.nameOf(c.w)).toLowerCase() === nm);
        re = par ? par.id : null;
      }
    }
    if (!text || !cbSelfOk(p, w, re)) return;
    const par = re ? p.cm.find(c => c.id === re) : null, u = Math.random();
    // when it was written: early comments bunch up near the post; replies come in a burst after what they answer
    let t = par ? Math.max(par.t, last.get(par.id) || 0) + (1 + -Math.log(1 - u * .98) * (last.has(par.id) ? 6 : 25)) * 60000 : p.t + span * (1 - Math.pow(1 - u, 2.2));
    t = Math.round(Math.min(now - 1000, Math.max(p.t + 30000, t)));
    if (par) last.set(par.id, t);
    p.cm.push({id: p.id + 'b' + now.toString(36) + (k++).toString(36) + Math.random().toString(36).slice(2, 4), w, t, text, re, lk: cbCmLikes(env.likes, !!re)}); added++;
  });
  return added;
}
