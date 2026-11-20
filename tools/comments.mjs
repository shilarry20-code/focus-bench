// Overnight comment builder, run by .github/workflows/comments.yml while the app is closed.
// Reads the to-do list the app left in the sync gist (fb-todo.json), writes comment batches with Gemini into
// fb-inbox.json, and records its own usage in fb-usage.json. The app merges the inbox the next time it opens.
// Same quota rules as in the app: a daily cap, never past half of the day's limit, except in the last two hours before
// the reset (midnight Pacific), when it can use what would otherwise be lost, keeping 30. Stops at the first daily limit.
// Secrets: GEMINI_KEY (a key from a project with no billing), GIST_TOKEN (the same gist token the app uses).
const KEY = process.env.GEMINI_KEY, TOKEN = process.env.GIST_TOKEN, MAX_MIN = +(process.env.MAX_MIN || 25);
const TODO = 'fb-todo.json', INBOX = 'fb-inbox.json', USAGE = 'fb-usage.json', SYNC_FILE = 'focus-bench-sync.json';
const t0 = Date.now(), sleep = ms => new Promise(r => setTimeout(r, ms));
if (!KEY || !TOKEN){ console.log('GEMINI_KEY or GIST_TOKEN secret is missing; nothing to do.'); process.exit(0); }

const gh = async (path, opts = {}) => {
  const r = await fetch('https://api.github.com' + path, {...opts, headers: {Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + TOKEN, ...(opts.body ? {'Content-Type': 'application/json'} : {})}});
  if (!r.ok) throw new Error(`GitHub ${r.status} on ${path}`); return r.status === 204 ? null : r.json();
};
const file = async (g, name) => { const f = g.files && g.files[name]; if (!f) return null; let t = f.content; if (f.truncated) t = await (await fetch(f.raw_url)).text(); try { return JSON.parse(t); } catch(e){ return null; } };
const PT = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Los_Angeles', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'});
const pt = () => { const p = {}; for (const x of PT.formatToParts(new Date())) p[x.type] = x.value; return p; };
const ptDay = () => { const p = pt(); return `${p.year}-${p.month}-${p.day}`; };
const late = () => { const p = pt(); return +p.hour >= 22; };          // the last two hours before midnight Pacific

// find the sync gist: the one holding the app's sync file
// (the one the app writes its to-do list to; if there are several, the most recently updated)
let gist = null, cands = [];
for (let page = 1; page <= 5; page++){ const list = await gh(`/gists?per_page=100&page=${page}`); cands.push(...list.filter(x => x.files && (x.files[TODO] || x.files[SYNC_FILE]))); if (list.length < 100) break; }
cands.sort((a, b) => (!!b.files[TODO] - !!a.files[TODO]) || (Date.parse(b.updated_at) - Date.parse(a.updated_at)));
if (cands.length) gist = cands[0].id;
console.log(`${cands.length} sync gist${cands.length === 1 ? '' : 's'} found; using the one updated ${cands[0] ? cands[0].updated_at : '-'}${cands[0] && cands[0].files[TODO] ? ' (has the to-do list)' : ''}.`);
if (!gist){ console.log('No sync gist found.'); process.exit(0); }
const g = await gh('/gists/' + gist), todo = await file(g, TODO);
if (!todo){ console.log('No to-do list in the gist yet (open the app once).'); process.exit(0); }
console.log(`To-do list from ${new Date(todo.at).toISOString()}: ${(todo.jobs || []).length} posts need comments (${(todo.jobs || []).reduce((n, j) => n + Math.max(0, j.need), 0)} comments in all).`);
if (!Array.isArray(todo.jobs) || !todo.jobs.length){ console.log('Nothing to write yet: no post is far enough behind its comment count.'); process.exit(0); }
if (todo.off){ console.log('The comment builder is turned off in the app.'); process.exit(0); }
const day = ptDay();
let use = await file(g, USAGE); if (!use || use.day !== day) use = {day, n: {}, req: 0, c: 0};
let inbox = (await file(g, INBOX)) || [];
const models = (todo.models && todo.models.length ? todo.models : ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
const out = new Set(models.filter(m => todo.out && todo.out[m] > Date.now()));
const au = await file(g, 'fb-ai-usage.json'), appUse = {};
if (au && au.day === day) Object.values(au.devs || {}).forEach(v => Object.entries(v.n || {}).forEach(([m, c]) => appUse[m] = (appUse[m] || 0) + c));
else if (todo.day === day) Object.assign(appUse, todo.use || {});
const appBld = todo.day === day ? todo.bld || 0 : 0;
if (au && au.day === day && Object.values(au.devs || {}).some(v => v.bld && Date.now() - v.bld < 6 * 60000)){ console.log('A device is building comments right now; skipping this run.'); process.exit(0); }
const budgetOk = () => {
  let lim = 0, used = 0; models.forEach(m => { const L = (todo.lim && todo.lim[m]) || 500; lim += L; used += out.has(m) ? L : Math.min(L, Math.round(((appUse[m] || 0) + (use.n[m] || 0)) * 1.25)); });
  return late() ? used < lim - 30 : (appBld + use.req < (todo.cap ?? 150) && used < lim * .5);
};
const schema = {type: 'OBJECT', properties: {messages: {type: 'ARRAY', items: {type: 'OBJECT', properties: {from: {type: 'STRING'}, text: {type: 'STRING'}, replyTo: {type: 'STRING'}}, required: ['from', 'text']}}}, required: ['messages']};
async function ask(sys, user){
  for (const m of models){
    if (out.has(m)) continue;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {method: 'POST', headers: {'Content-Type': 'application/json', 'x-goog-api-key': KEY},
      body: JSON.stringify({systemInstruction: {parts: [{text: sys}]}, contents: [{role: 'user', parts: [{text: user}]}], generationConfig: {temperature: 1, maxOutputTokens: 4000, responseMimeType: 'application/json', responseSchema: schema}})});
    const raw = await r.text();
    if (r.status === 429){ if (/per ?day|PerDay|daily/i.test(raw)){ out.add(m); console.log(`${m}: daily limit reached`); continue; } return {wait: true}; }
    if (!r.ok){ console.log(`${m}: HTTP ${r.status}`); continue; }
    use.n[m] = (use.n[m] || 0) + 1; use.req++;
    try { const j = JSON.parse(raw), txt = j.candidates[0].content.parts.filter(p => !p.thought).map(p => p.text || '').join(''); const o = JSON.parse(txt); return {msgs: Array.isArray(o.messages) ? o.messages : []}; }
    catch(e){ return {msgs: []}; }
  }
  return {stop: true};
}

// work through the list: biggest gaps first (the app already sorted it), a batch at a time
const left = new Map(todo.jobs.map(j => [j.pid, j.need]));
inbox.filter(it => it.at > todo.at).forEach(it => left.set(it.pid, (left.get(it.pid) || 0) - (it.got || []).length));
const extra = new Map();
let made = 0, reqs = 0;
while (Date.now() - t0 < MAX_MIN * 60000 && budgetOk()){
  const job = todo.jobs.find(j => (left.get(j.pid) || 0) >= 3); if (!job) break;
  const n = Math.min(35, left.get(job.pid)), more = extra.get(job.pid) || [];
  const user = job.user.replace('{N}', n).replace('{MORE}', more.length ? `\nAlso just added:\n${more.slice(-12).map(x => `${x.from}: ${x.text}`).join('\n')}` : '');
  const r = await ask(job.sys, user);
  if (r.stop) break;
  if (r.wait){ await sleep(65000); continue; }
  reqs++;
  const got = r.msgs.filter(x => x && x.from && x.text).map(x => ({from: x.from, text: String(x.text).slice(0, 240), replyTo: x.replyTo || 'new'}));
  if (got.length){ inbox.push({id: `ov${Date.now().toString(36)}${reqs}`, pid: job.pid, at: Date.now(), got, names: job.names}); extra.set(job.pid, more.concat(got)); }
  left.set(job.pid, (left.get(job.pid) || 0) - Math.max(got.length, 5)); made += got.length; use.c += got.length;
  // save as we go, so a cancelled run keeps what it wrote
  if (reqs % 5 === 0) await gh('/gists/' + gist, {method: 'PATCH', body: JSON.stringify({files: {[INBOX]: {content: JSON.stringify(inbox)}, [USAGE]: {content: JSON.stringify(use)}}})});
  await sleep(5000);
}
await gh('/gists/' + gist, {method: 'PATCH', body: JSON.stringify({files: {[INBOX]: {content: JSON.stringify(inbox)}, [USAGE]: {content: JSON.stringify(use)}}})});
console.log(`${reqs} request${reqs === 1 ? '' : 's'}, ${made} comments written; today ${use.req} requests, ${use.c} comments.`);
