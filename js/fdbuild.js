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
// requests today per model: this device + your other devices (from the gist) + the overnight runner
function aiTotals(){
  const d = ptDay(), out = {}, add = o => Object.entries(o || {}).forEach(([m, c]) => out[m] = (out[m] || 0) + c);
  add(GEM.cnt && GEM.cnt.day === d ? GEM.cnt.n : {}); add(GEM.oth && GEM.oth.day === d ? GEM.oth.n : {}); add(GEM.ext && GEM.ext.day === d ? GEM.ext.n : {});
  return out;
}
function cbQuota(){
  const n = aiTotals(); let lim = 0, used = 0;
  // the count can still miss things (a device that hasn't reported yet, requests before counting was fixed), so assume more:
  // a quarter more with gist sync, double without it
  // (except in the last two hours before the reset: then the real count, so it uses all but the 30 it keeps)
  const late = ptResetAt() - Date.now() < 2 * 3600e3, k = late ? 1 : cbSyncOn() ? 1.25 : 2;
  GEMINI_MODELS.forEach(m => { const L = (GEM.lim && GEM.lim[m]) || CB_LIM0; lim += L; used += modelOut(m) ? L : Math.min(L, Math.round((n[m] || 0) * k)); });
  return {lim, used, late};
}
function cbAllowed(){
  const q = cbQuota(), b = cbDay();
  if (q.late) return q.used < q.lim - 30;                 // last two hours before the reset: use what would be lost, keep 30
  const xn = GEM.ext && GEM.ext.day === ptDay() ? GEM.ext.req || 0 : 0;
  return b.n + xn < cbCap() && q.used < q.lim * .5;
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
Write like real people in an Instagram comment section: mostly short (a few words to one sentence), lowercase is common, slang is fine. Mix it up: reactions, jokes, questions, people tagging along, someone disagreeing, someone being a little unhinged, longer takes now and then. React to what the post actually shows (you'll be told what's in it) and to other comments. Stay on the post: commenters don't talk about their own classes, homework, exams or major at all. They react to what the poster said or showed (tease them, hype them up, ask about it, joke about the picture). Bad: "real analysis homework would make me drop out", "constitutional law has nothing on this", "my compiler is running and i'm staring at this". If older comments on the post do that, don't copy them. Never repeat a comment that's already there, and don't all say the same thing in different words.
Replies: answers go under the comment they answer. Some threads become back-and-forths (two people arguing, others piling on, the poster jumping in); most comments get no reply.
Each person has their own emoji habit ("never", "sometimes" or "often", with their go-to emojis): mostly use their own, sometimes another face, hand or heart emoji, at most a couple per message. No hashtags. Don't start a comment with someone's name or @name. ${me} is the person using the app.
Answer with JSON: {"messages":[{"from":"<name exactly as listed>","text":"…","replyTo":"…"}]}; replyTo is "new" for a new comment or "@<name>" to answer that person's comment (an existing one or one from earlier in your answer).`;

// everything a batch for this post needs: the prompt (with {N} for how many and {MORE} for ones already added this run)
async function cbJob(p){
  const cm = await fdCm(p), have = cm.filter(c => !c.del), target = fdTarget(p);
  const replyShare = Math.min(.6, Math.max(.15, .12 + Math.log10(1 + target) / 6));
  const tree = fdTree(have).sort((a, b) => fdLk(b.c, p) - fdLk(a.c, p)), lines = [];
  tree.slice(0, 12).forEach(r => { lines.push(`${fdNameOf(r.c.w)}: ${r.c.text}`); r.kids.slice(-2).forEach(k => lines.push(`   ↳ ${fdNameOf(k.c.w)}: ${k.c.text}`)); });
  have.slice(-6).forEach(c => { const l = `${fdNameOf(c.w)}: ${c.text}`; if (!lines.some(x => x.endsWith(l))) lines.push(l); });
  const cs = fdCommenters(p, 22).filter(w => w !== p.w), poster = p.w >= 0 ? p.w : null, names = {};
  cs.forEach(w => { names[bot(w).name.toLowerCase()] = w; }); if (poster != null) names[bot(poster).name.toLowerCase()] = poster;
  const who = cs.map(w => { const f = chatFacts(w); return `${f.name} (${Math.random() < .15 ? f.subj + ', ' : ''}emojis: ${emojiStyle(w)})`; }).join('; ');
  const user = `Post by ${fdNameOf(p.w)}${p.w === -1 ? ' (the user)' : ''}, ${fdAgo(p.t)} ago, ${fdLikes(p).toLocaleString()} likes. What it is: ${fdAbout(p)}${p.cap && p.type !== 'text' ? `\nCaption: ${p.cap}` : ''}
Comments so far (${have.length}; the most liked first):\n${lines.join('\n') || '(none yet)'}{MORE}

Write {N} more. About ${Math.round(replyShare * 100)}% of them answer a comment (replyTo "@<name>"), the rest are new comments (replyTo "new").
They come from: ${who}. Most of them comment once; a few come back to answer people.${poster != null ? ` ${fdNameOf(poster)} (who posted it) never writes a new comment, only answers (replyTo "@<name>"), and answers a few of the comments in this batch.` : ''}`;
  return {pid: p.id, sys: CB_SYS(myName()), user, names, need: target - have.length};
}
// turn Gemini's messages into comments on the post (also used for comments written overnight); returns how many were added
function cbApply(p, got, names, now){
  const me = myName(), span = Math.max(60000, Math.min(now - p.t, 3 * 864e5)); let added = 0, k = 0;
  (Array.isArray(got) ? got : []).forEach(x => {
    const w = names[String(x && x.from || '').toLowerCase().trim()]; if (w == null) return;
    let text = emotionOnly(stripSegue(String(x.text || '').replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().slice(0, 240))); if (!text) return;
    const to = String(x.replyTo || '').trim(), at = /^@/.test(to) ? to.slice(1) : '', a = fdAnswerTo(p, at, text, me); text = a.text; if (!text) return;
    if (!fdSelfOk(p, w, a.re)) return;
    const par = a.re ? p.cm.find(c => c.id === a.re) : null, u = Math.random();
    // when it was written: early comments bunch up near the post; answers come after what they answer
    let t = par ? par.t + (1 + Math.random() * 90) * 60000 : p.t + span * (1 - Math.pow(1 - u, 2.2));
    t = Math.round(Math.min(Date.now() - 1000, Math.max(p.t + 30000, t)));
    p.cm.push({id: p.id + 'b' + now.toString(36) + (k++).toString(36) + Math.random().toString(36).slice(2, 4), w, t, text, re: a.re, lk: fdCmLikes(p, !!a.re)}); added++;
  });
  return added;
}
let cbBusy = false, cbNext = 0;
async function cbRun(){
  const now = Date.now();
  if (cbBusy || now < cbNext || !GEM.key || GEM.bOff || (GEM.wait && GEM.wait > now) || !RK_READY || !FD_READY || simBusy) return;
  if (AI_FLIGHT || now - AI_LAST < 30000 || !cbAllowed()) return;
  if (GEM.bldOther && GEM.bldOther.day === ptDay() && now - GEM.bldOther.at < 6 * 60000) return;      // another device is building right now
  const p = cbPick(); if (!p){ cbNext = now + 60000; return; }
  cbBusy = true;
  try {
    const job = await cbJob(p), n = Math.min(35, job.need);
    const got = await aiCall(job.sys, job.user.replace('{MORE}', '').replace('{N}', n), {bld: true});
    const added = cbApply(p, got, job.names, now), b = cbDay();
    b.n++; b.c += added; GEM.bldAt = Date.now(); saveAI(); saveFeed();
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
    <p class="hint">Overnight (while the app is closed): ${!cbSyncOn() ? 'needs gist sync turned on.' : GEM.ext && GEM.ext.day === ptDay() ? `${GEM.ext.req || 0} request${GEM.ext.req === 1 ? '' : 's'} today.` : 'nothing yet today.'}${GEM.todoAt ? ` To-do list sent ${Date.now() - GEM.todoAt < 60000 ? 'just now' : fdAgo(GEM.todoAt) + ' ago'}${GEM.todoN != null ? ` (${GEM.todoN} post${GEM.todoN === 1 ? '' : 's'}, ${(GEM.todoC || 0).toLocaleString()} comments to write)` : ''}.` : ''}${cbSyncOn() ? ' <button class="link-btn" id="cbCopyTok">Copy gist token</button> (for the GIST_TOKEN secret)' : ''}</p>
    <p class="hint">Feed storage: ${fdStorageTxt()}</p></div>`;
}
function fdStorageTxt(){
  let n = 0, c = 0, bytes = 0; FD.posts.forEach(p => { n++; c += p.cm ? p.cm.length : p.cn || 0; bytes += 300 + (p.cb || (p.cm ? p.cm.length * 110 : (p.cn || 0) * 110)); });
  return `${n.toLocaleString()} posts, ${c.toLocaleString()} comments, about ${bytes > 1e6 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1e3)) + ' KB'}`;
}
document.addEventListener('click', e => { if (e.target.id === 'cbCopyTok'){ navigator.clipboard.writeText(SYNC.token).then(() => toast('Gist token copied. Paste it as the GIST_TOKEN secret.'), () => toast('Couldn’t copy. Try again.')); } });
document.addEventListener('change', e => {
  if (e.target.id === 'cbOn'){ GEM.bOff = !e.target.checked; saveAI(); toast(GEM.bOff ? 'Comment builder off.' : 'Comment builder on.'); }
  if (e.target.id === 'cbCap'){ GEM.bCap = Math.max(0, Math.min(2000, Math.round(+e.target.value || 0))); saveAI(); }
});

/* ---- overnight: a GitHub workflow keeps writing while the app is closed ----
   This device leaves a to-do list in your sync gist (fb-todo.json: the posts that need comments most, with ready-made
   prompts, plus today's usage and your limits); the workflow writes batches into fb-inbox.json and its own usage into
   fb-usage.json. Here the inbox gets merged into the Feed and the merged batches are cleared. Needs gist sync turned on. */
const CB_TODO = 'fb-todo.json', CB_INBOX = 'fb-inbox.json', CB_USAGE = 'fb-usage.json';
const cbSyncOn = () => typeof SYNC !== 'undefined' && SYNC.token && SYNC.gist;
let cbOvBusy = false;
async function cbTodoUpload(){
  if (!cbSyncOn() || !GEM.key || !FD_READY || !RK_READY) return;
  const now = Date.now(), vis = FD.posts.filter(p => !p.del && p.gen && p.t <= now), list = [];
  const rank = win => new Set(vis.filter(p => !win || now - p.t < win).sort((a, b) => fdLikes(b) - fdLikes(a)).slice(0, 25).map(p => p.id));
  const sets = [rank(864e5), rank(7 * 864e5), rank(30 * 864e5), rank(0)];
  vis.forEach(p => { const gap = fdTarget(p) - (p.cm ? p.cm.filter(c => !c.del).length : p.cn || 0); if (gap < 3) return;
    const w = 1 + (sets[0].has(p.id) ? 4 : 0) + (sets[1].has(p.id) ? 2 : 0) + (sets[2].has(p.id) ? 1 : 0) + (sets[3].has(p.id) ? 1 : 0) + (p.seen ? 2 : 0); list.push([Math.pow(gap, .6) * w, p]); });
  list.sort((a, b) => b[0] - a[0]);
  const jobs = []; for (const [, p] of list.slice(0, 60)) jobs.push(await cbJob(p));
  const todo = {v: 1, at: now, day: ptDay(), models: GEMINI_MODELS, use: GEM.cnt && GEM.cnt.day === ptDay() ? GEM.cnt.n : {}, bld: cbDay().n, lim: GEM.lim || {}, cap: cbCap(), off: !!GEM.bOff, out: GEM.out || {}, jobs};
  try { await gh('/gists/' + SYNC.gist, {method: 'PATCH', body: JSON.stringify({files: {[CB_TODO]: {content: JSON.stringify(todo)}}})}); GEM.todoAt = now; GEM.todoN = jobs.length; GEM.todoC = jobs.reduce((n, j) => n + Math.max(0, j.need), 0); saveAI(); } catch(e){ console.error(e); }
}
async function cbGistFile(g, name){ const f = g.files && g.files[name]; if (!f) return null; let t = f.content; if (f.truncated) t = await (await fetch(f.raw_url, {cache: 'no-store'})).text(); try { return JSON.parse(t); } catch(e){ return null; } }
async function cbInboxMerge(){
  if (cbOvBusy || !cbSyncOn() || !FD_READY || !RK_READY) return; cbOvBusy = true;
  try {
    const g = await gh('/gists/' + SYNC.gist), inbox = (await cbGistFile(g, CB_INBOX)) || [], use = await cbGistFile(g, CB_USAGE);
    if (use && use.day === ptDay()){ GEM.ext = {day: use.day, n: use.n || {}, req: use.req || 0}; saveAI(); }
    if (!Array.isArray(inbox) || !inbox.length) return;
    const done = new Set(GEM.ibDone || []), now = Date.now(); let added = 0;
    for (const it of inbox){ if (done.has(it.id)) continue; const p = FD.posts.find(x => x.id === it.pid); done.add(it.id); if (!p || p.del) continue; await fdCm(p); added += cbApply(p, it.got, it.names || {}, now); }
    GEM.ibDone = [...done].slice(-400); saveAI();
    if (added){ saveFeed(); renderFeed(); fdViewRefresh(); }
    // clear what was merged (anything written since stays for next time)
    const g2 = await gh('/gists/' + SYNC.gist), cur = (await cbGistFile(g2, CB_INBOX)) || [], left = cur.filter(it => !done.has(it.id));
    await gh('/gists/' + SYNC.gist, {method: 'PATCH', body: JSON.stringify({files: {[CB_INBOX]: {content: JSON.stringify(left)}}})});
  } catch(e){ console.error(e); } finally { cbOvBusy = false; }
}
(function cbOvStart(){
  if (!RK_READY || !FD_READY) return setTimeout(cbOvStart, 4000);
  setTimeout(async () => { await cbInboxMerge(); cbTodoUpload(); }, 8000);
  setInterval(async () => { await cbInboxMerge(); cbTodoUpload(); }, 20 * 60000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cbTodoUpload(); else setTimeout(cbInboxMerge, 3000); });
})();
// Settings → Chat was drawn before this file loaded: draw it again now, and whenever Settings opens (counts stay fresh)
renderChatSettings();
{ const _sh = onPageShown; onPageShown = function(name){ _sh.apply(this, arguments); if (name === 'settings') renderChatSettings(); }; }

/* ---- counting across devices: each device keeps its count for today in the sync gist (fb-ai-usage.json) ---- */
const AU_FILE = 'fb-ai-usage.json';
const devId = (() => { let d = store.get('fb.devId', null); if (!d){ d = 'd' + Math.random().toString(36).slice(2, 10); store.set('fb.devId', d); } return d; })();
let auBusy = false;
async function auSync(){
  if (auBusy || !cbSyncOn()) return; auBusy = true;
  try {
    const d = ptDay(), g = await gh('/gists/' + SYNC.gist), cur = (await cbGistFile(g, AU_FILE)) || {};
    const devs = cur.day === d ? cur.devs || {} : {}, mine = GEM.cnt && GEM.cnt.day === d ? GEM.cnt.n : {};
    // the others: their counts, and whether one of them is running the comment builder
    const oth = {}; let bo = null;
    Object.entries(devs).forEach(([id, v]) => { if (id === devId) return; Object.entries(v.n || {}).forEach(([m, c]) => oth[m] = (oth[m] || 0) + c); if (v.bld && (!bo || v.bld > bo)) bo = v.bld; });
    GEM.oth = {day: d, n: oth}; GEM.bldOther = bo ? {day: d, at: bo} : null; saveAI();
    devs[devId] = {n: mine, at: Date.now(), bld: GEM.bldAt && Date.now() - GEM.bldAt < 6 * 60000 ? GEM.bldAt : 0, name: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'phone' : 'computer'};
    await gh('/gists/' + SYNC.gist, {method: 'PATCH', body: JSON.stringify({files: {[AU_FILE]: {content: JSON.stringify({day: d, devs})}}})});
    if (!$('#page-settings').hidden) renderChatSettings();
  } catch(e){ console.error(e); } finally { auBusy = false; }
}
(function auStart(){ if (!RK_READY) return setTimeout(auStart, 4000); setTimeout(auSync, 5000); setInterval(auSync, 2 * 60000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) auSync(); }); })();
