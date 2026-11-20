/* ---------- the comment builder: fills big posts with comments a little at a time ----------
   Every post has a target comment count (fdTarget, replies included). When nothing else needs Gemini, this writes the
   next batch (up to ~35 comments and replies) for the post that's furthest behind, top posts first. It only spends
   leftover quota: a daily cap you set in Settings, never past half of the day's limit (except in the last two hours before
   the reset, when unused requests would vanish anyway, and even then it leaves 30), and it stops at the first sign of a limit. */

/* every Gemini request goes through here, so the builder can tell when you (or anything else) is using it */
let AI_FLIGHT = 0, AI_LAST = 0;
{ const _ai = aiCall; aiCall = async function(sys, user, opt){ const bld = opt && opt.bld; AI_FLIGHT++; if (!bld) AI_LAST = Date.now(); try { return await _ai(sys, user); } finally { AI_FLIGHT--; } }; }

const CB_LIM0 = 500;                                       // guess for a model's daily limit until one has actually run out
const cbDay = () => { if (!GEM.bld || GEM.bld.day !== ptDay()) GEM.bld = {day: ptDay(), n: 0, c: 0}; return GEM.bld; };
const cbCap = () => GEM.bCap != null ? GEM.bCap : 150;
function cbQuota(){
  const n = GEM.cnt && GEM.cnt.day === ptDay() ? GEM.cnt.n : {}; let lim = 0, used = 0;
  GEMINI_MODELS.forEach(m => { const L = (GEM.lim && GEM.lim[m]) || CB_LIM0; lim += L; used += modelOut(m) ? L : Math.min(L, n[m] || 0); });
  return {lim, used, late: ptResetAt() - Date.now() < 2 * 3600e3};
}
function cbAllowed(){
  const q = cbQuota(), b = cbDay();
  if (q.late) return q.used < q.lim - 30;                 // last two hours before the reset: use what would be lost, keep 30
  return b.n < cbCap() && q.used < q.lim * .5;
}

/* which post next: the biggest gap between target and written, weighted toward what's on the Top lists and what you opened */
function cbPick(){
  const now = Date.now(), vis = FD.posts.filter(p => !p.del && p.gen && p.t <= now);
  const rank = win => new Set(vis.filter(p => !win || now - p.t < win).sort((a, b) => fdLikes(b) - fdLikes(a)).slice(0, 25).map(p => p.id));
  const day = rank(864e5), week = rank(7 * 864e5), month = rank(30 * 864e5), all = rank(0);
  let best = null, bs = 0;
  vis.forEach(p => {
    const gap = fdTarget(p) - (p.cm ? p.cm.filter(c => !c.del).length : p.cn || 0); if (gap < 3) return;
    const w = 1 + (day.has(p.id) ? 4 : 0) + (week.has(p.id) ? 2 : 0) + (month.has(p.id) ? 1 : 0) + (all.has(p.id) ? 1 : 0) + (p.seen ? 2 : 0) + (p.w === -1 ? 2 : 0);
    const sc = Math.pow(gap, .6) * w; if (sc > bs){ bs = sc; best = p; }
  });
  return best;
}

const CB_SYS = me => `You write comments for the Feed on Focus Bench, a study app for college students that works like Instagram. You're adding more comments to a post that's getting attention.
Write like real people in an Instagram comment section: mostly short (a few words to one sentence), lowercase is common, slang is fine. Mix it up: reactions, jokes, questions, people tagging along, someone disagreeing, someone being a little unhinged, longer takes now and then. React to what the post actually shows (you'll be told what's in it) and to other comments. Never repeat a comment that's already there, and don't all say the same thing in different words.
Replies: answers go under the comment they answer. Some threads become back-and-forths (two people arguing, others piling on, the poster jumping in); most comments get no reply.
Each person has their own emoji habit ("never", "sometimes" or "often", with their go-to emojis): mostly use their own, sometimes another face, hand or heart emoji, at most a couple per message. No hashtags. Don't start a comment with someone's name or @name. ${me} is the person using the app.
Answer with JSON: {"messages":[{"from":"<name exactly as listed>","text":"…","replyTo":"…"}]}; replyTo is "new" for a new comment or "@<name>" to answer that person's comment (an existing one or one from earlier in your answer).`;

let cbBusy = false, cbNext = 0;
async function cbRun(){
  const now = Date.now();
  if (cbBusy || now < cbNext || !GEM.key || GEM.bOff || (GEM.wait && GEM.wait > now) || !RK_READY || !FD_READY || simBusy) return;
  if (AI_FLIGHT || now - AI_LAST < 30000 || !cbAllowed()) return;
  const p = cbPick(); if (!p){ cbNext = now + 60000; return; }
  cbBusy = true;
  try {
    const cm = await fdCm(p), me = myName(), have = cm.filter(c => !c.del), target = fdTarget(p), gap = target - have.length, n = Math.min(35, gap);
    const replyShare = Math.min(.6, Math.max(.15, .12 + Math.log10(1 + target) / 6));
    // what's there already: the best-liked threads, plus the newest few
    const tree = fdTree(have).sort((a, b) => fdLk(b.c, p) - fdLk(a.c, p)), lines = [];
    tree.slice(0, 12).forEach(r => { lines.push(`${fdNameOf(r.c.w)}: ${r.c.text}`); r.kids.slice(-2).forEach(k => lines.push(`   ↳ ${fdNameOf(k.c.w)}: ${k.c.text}`)); });
    have.slice(-6).forEach(c => { const l = `${fdNameOf(c.w)}: ${c.text}`; if (!lines.some(x => x.endsWith(l))) lines.push(l); });
    const cs = fdCommenters(p, 22).filter(w => w !== p.w), poster = p.w >= 0 ? p.w : null;
    const names = new Map(); cs.forEach(w => names.set(bot(w).name.toLowerCase(), w)); if (poster != null) names.set(bot(poster).name.toLowerCase(), poster);
    const who = cs.map(w => { const f = chatFacts(w); return `${f.name} (${f.subj}, emojis: ${emojiStyle(w)})`; }).join('; ');
    const user = `Post by ${fdNameOf(p.w)}${p.w === -1 ? ' (the user)' : ''}, ${fdAgo(p.t)} ago, ${fdLikes(p).toLocaleString()} likes. What it is: ${fdAbout(p)}${p.cap && p.type !== 'text' ? `\nCaption: ${p.cap}` : ''}
Comments so far (${have.length}; the most liked first):\n${lines.join('\n') || '(none yet)'}

Write ${n} more. About ${Math.round(replyShare * 100)}% of them answer a comment (replyTo "@<name>"), the rest are new comments (replyTo "new").
They come from: ${who}. Most of them comment once; a few come back to answer people.${poster != null ? ` ${fdNameOf(poster)} (who posted it) can answer a couple of comments too.` : ''}`;
    const got = await aiCall(CB_SYS(me), user, {bld: true});
    const span = Math.max(60000, Math.min(now - p.t, 3 * 864e5)), b = cbDay(); let added = 0, k = 0;
    (Array.isArray(got) ? got : []).forEach(x => {
      const w = names.get(String(x && x.from || '').toLowerCase().trim()); if (w == null) return;
      let text = emotionOnly(stripSegue(String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().slice(0, 240))); if (!text) return;
      const to = String(x.replyTo || '').trim(), at = /^@/.test(to) ? to.slice(1) : '', a = fdAnswerTo(p, at, text, me); text = a.text; if (!text) return;
      const par = a.re ? p.cm.find(c => c.id === a.re) : null, u = Math.random();
      // when it was written: early comments bunch up near the post; answers come after what they answer
      let t = par ? par.t + (1 + Math.random() * 90) * 60000 : p.t + span * (1 - Math.pow(1 - u, 2.2));
      t = Math.round(Math.min(now - 1000, Math.max(p.t + 30000, t)));
      p.cm.push({id: p.id + 'b' + now.toString(36) + (k++).toString(36), w, t, text, re: a.re, lk: fdCmLikes(p, !!a.re)}); added++;
    });
    b.n++; b.c += added; saveAI(); saveFeed();
    if (FDV.view === p.id) fdViewRefresh(); else if (!$('#page-feed').hidden && !document.hidden) renderFeed();
    cbNext = Date.now() + (added ? 6000 : 60000);
  } catch(e){
    if (e.kind === 'busy') cbNext = e.short ? Date.now() + 90000 : (e.until || Date.now() + 3600e3);
    else if (e.kind === 'key') cbNext = Date.now() + 3600e3;
    else cbNext = Date.now() + 5 * 60000;
  } finally { cbBusy = false; }
}
setInterval(cbRun, 5000);
// posts you open get filled first
{ const _v = fdView; fdView = function(p){ if (p) p.seen = 1; return _v.apply(this, arguments); }; }

/* ---- Settings → Chat ---- */
function cbSettingsHtml(){
  const b = cbDay(), q = cbQuota();
  return `<div class="ai-usage cb-set"><div class="h">Comment builder</div>
    <div class="row"><label for="cbOn">Fill big posts with comments in the background<span class="sub">Only uses leftover requests: up to the cap below, never past half of today’s limit (in the last 2 hours before the reset it can use the rest, keeping 30). Pauses whenever anything else needs Gemini.</span></label><input type="checkbox" id="cbOn" ${GEM.bOff ? '' : 'checked'}></div>
    <div class="row"><label for="cbCap">Requests per day<span class="sub">Today: ${b.n} request${b.n === 1 ? '' : 's'}, ${b.c.toLocaleString()} comment${b.c === 1 ? '' : 's'}${q.late ? ' · reset is close, so it can use what’s left' : ''}</span></label><input type="number" id="cbCap" min="0" max="2000" step="10" value="${cbCap()}" style="width:90px"></div>
    <p class="hint">Feed storage: ${fdStorageTxt()}</p></div>`;
}
function fdStorageTxt(){
  let n = 0, c = 0, bytes = 0; FD.posts.forEach(p => { n++; c += p.cm ? p.cm.length : p.cn || 0; bytes += 300 + (p.cb || (p.cm ? p.cm.length * 110 : (p.cn || 0) * 110)); });
  return `${n.toLocaleString()} posts, ${c.toLocaleString()} comments, about ${bytes > 1e6 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1e3)) + ' KB'}`;
}
document.addEventListener('change', e => {
  if (e.target.id === 'cbOn'){ GEM.bOff = !e.target.checked; saveAI(); toast(GEM.bOff ? 'Comment builder off.' : 'Comment builder on.'); }
  if (e.target.id === 'cbCap'){ GEM.bCap = Math.max(0, Math.min(2000, Math.round(+e.target.value || 0))); saveAI(); }
});
