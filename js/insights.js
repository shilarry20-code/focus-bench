/* ---------- post insights ----------
   Your own posts: reach (followers / not), likes over time, engagement, followers gained, top comments, and how it
   compares with your other posts. Other people's posts: only the public numbers. Opens in the post viewer, in place
   of the comments. */
FDV.ins = null; FDV.insC = 't'; FDV.likers = null; FDV.lkN = 60;
const insHash = (s, k) => (fdHash(s + ':' + k) % 10000) / 10000;
const insTau = p => 2700e3 * (1 + Math.log10(Math.max(1, (p.L || 0) / 200)));
const insOrd = n => n + ((n % 100 >= 11 && n % 100 <= 13) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const insPct = x => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10) + '%';
function insReplies(p){
  const nc = fdCount(p), w = (p.cm || p.pv || []).filter(c => !c.del);
  const share = w.length ? w.filter(c => c.re).length / w.length : 0, rep = Math.round(nc * share);
  return {nc, rep, top: nc - rep};
}
// who saw it: a steady share of viewers like a post (each post has its own), so views follow the likes
function insReach(p){
  const likes = fdLikes(p), rate = .06 + insHash(p.id, 'r') * .05, views = Math.max(likes, Math.round(likes / rate));
  const grown = 1 - Math.exp(-(Date.now() - p.t) / insTau(p));
  const fol = Math.min(views, Math.round(FD.followers.length * (.3 + insHash(p.id, 'f') * .25) * grown));
  return {views, fol, non: views - fol};
}
// cumulative likes from posting until now (or its first week)
function insChart(p){
  const L = p.L || 0, tau = insTau(p), span = Math.max(60000, Math.min(Date.now() - p.t, 7 * 864e5)), W = 300, H = 90, n = 48;
  const at = t => L * (1 - Math.exp(-t / tau)), top = Math.max(1, at(span));
  const pts = Array.from({length: n + 1}, (_, k) => { const t = span * k / n; return [k / n * W, H - 4 - at(t) / top * (H - 12)]; });
  const line = pts.map(([x, y], k) => (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join('');
  const half = tau * Math.LN2, dur = ms => ms < 3600e3 ? `${Math.max(1, Math.round(ms / 60000))} min` : ms < 864e5 ? `${Math.round(ms / 3600e3 * 10) / 10} h` : `${Math.round(ms / 864e5 * 10) / 10} days`;
  const note = !L ? 'No likes yet.' : Date.now() - p.t < half ? 'Still picking up likes.' : `Half its likes came in the first ${dur(half)}.`;
  const endLbl = Date.now() - p.t > 7 * 864e5 ? 'First week' : 'Now';
  return `<svg class="ins-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${line}L${W} ${H}L0 ${H}Z" class="a"/><path d="${line}" class="l"/></svg>
    <div class="ins-axis"><span>Posted</span><span>${endLbl}</span></div><p class="hint">${note}</p>`;
}
// a ring split into parts, with a label in the middle
function insDonut(parts, mid, sub){
  const tot = parts.reduce((t, [v]) => t + v, 0) || 1, R = 15.9155; let off = 0;
  return `<svg class="ins-donut" viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="${R}" class="bg"/>${parts.map(([v, c]) => { const d = v / tot * 100, o = `<circle cx="21" cy="21" r="${R}" class="${c}" stroke-dasharray="${d} ${100 - d}" stroke-dashoffset="${25 - off}"/>`; off += d; return o; }).join('')}
    <text x="21" y="21">${mid}</text><text x="21" y="27" class="s">${sub}</text></svg>`;
}
// likes, comments and replies as one bar
function insStack(parts){
  const tot = parts.reduce((t, [v]) => t + v, 0) || 1;
  return `<div class="ins-stack">${parts.map(([v, , c]) => `<i class="${c}" style="width:${v / tot * 100}%"></i>`).join('')}</div>
    <div class="ins-leg">${parts.map(([v, l, c]) => `<span><i class="${c}"></i>${l} ${v.toLocaleString()}</span>`).join('')}</div>`;
}
// likes in each hour since posting (its first day)
function insHourly(p){
  const L = p.L || 0, tau = insTau(p), age = Date.now() - p.t, hrs = Math.max(1, Math.min(24, Math.ceil(age / 3600e3)));
  const at = t => L * (1 - Math.exp(-Math.min(t, age) / tau));
  const v = Array.from({length: hrs}, (_, h) => Math.max(0, Math.round(at((h + 1) * 3600e3) - at(h * 3600e3)))), mx = Math.max(1, ...v), best = v.indexOf(mx);
  return `<div class="ins-bars">${v.map((x, h) => `<i class="${h === best ? 'pk' : ''}" style="height:${Math.max(2, x / mx * 100)}%" title="Hour ${h + 1}: ${x.toLocaleString()} likes"></i>`).join('')}</div>
    <div class="ins-axis"><span>1st hour</span><span>${hrs === 24 ? '24th hour' : 'Now'}</span></div>
    <p class="hint">Best hour: the ${insOrd(best + 1)} hour, with ${mx.toLocaleString()} like${mx === 1 ? '' : 's'}.</p>`;
}
// this post next to your recent ones
function insRecent(p){
  const mine = FD.posts.filter(q => q.w === -1 && !q.del && q.t <= Date.now()).sort((a, b) => a.t - b.t), k = mine.indexOf(p);
  const list = mine.slice(Math.max(0, k - 7), k + 1).concat(mine.slice(k + 1, k + 1 + Math.max(0, 8 - (k + 1)))).slice(0, 8);
  if (list.length < 2) return '';
  const v = list.map(fdLikes), mx = Math.max(1, ...v);
  return `<div class="ins-bars cmp">${list.map((q, j) => `<i class="${q === p ? 'pk' : ''}" style="height:${Math.max(2, v[j] / mx * 100)}%" title="${v[j].toLocaleString()} likes · ${fdAgo(q.t)} ago"></i>`).join('')}</div>
    <div class="ins-axis"><span>Older</span><span>Newer</span></div>`;
}
function insRow(label, val, sub){ return `<div class="ins-row"><span>${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`; }
function insHtml(p){
  const me = p.w === -1, likes = fdLikes(p), {nc, rep, top} = insReplies(p);
  const when = new Date(p.t).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
  const head = `<div class="ins-h"><button class="ins-back" data-ins="back" aria-label="Back to comments"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><b>${me ? 'Insights' : 'Post info'}</b></div>`;
  if (!me) return `<div class="ins">${head}
    <div class="ins-kpis"><div><b>${likes.toLocaleString()}</b><span>likes</span></div><div><b>${nc.toLocaleString()}</b><span>comments</span></div><div><b>${rep.toLocaleString()}</b><span>replies</span></div></div>
    ${insRow('Posted', when)}<p class="hint">Only the person who posted it can see its full insights.</p></div>`;
  const R2 = insReach(p), inter = likes + nc, eng = R2.views ? inter / R2.views * 100 : 0;
  const others = FD.posts.filter(q => q.w === -1 && !q.del && q.id !== p.id && q.t <= Date.now());
  let cmp = '<p class="hint">Post a few more to compare them.</p>';
  if (others.length){
    const aL = others.reduce((s, q) => s + fdLikes(q), 0) / others.length, aC = others.reduce((s, q) => s + fdCount(q), 0) / others.length;
    const x = (v, a) => !a ? '–' : v >= a ? `${(Math.round(v / a * 10) / 10).toLocaleString()}× your usual` : `${Math.round((1 - v / a) * 100)}% below your usual`;
    cmp = insRow('Likes', x(likes, aL), `average ${Math.round(aL).toLocaleString()}`) + insRow('Comments', x(nc, aC), `average ${Math.round(aC).toLocaleString()}`) + `<p class="hint">Compared with your other ${others.length} post${others.length === 1 ? '' : 's'}.</p>`;
  }
  const best = (p.cm || []).filter(c => !c.del && c.w !== -1).sort((a, b) => fdLk(b, p) - fdLk(a, p)).slice(0, 3);
  const fg = p.fg == null ? '–' : p.fg.toLocaleString();
  return `<div class="ins">${head}
    <div class="ins-kpis"><div><b>${R2.views.toLocaleString()}</b><span>reached</span></div><div><b>${likes.toLocaleString()}</b><span>likes</span></div><div><b>${fg}</b><span>new followers</span></div></div>
    <h4>Reach</h4>
    <div class="ins-reach">${insDonut([[R2.fol, 'f'], [R2.non, 'n']], R2.views ? insPct(R2.fol / R2.views * 100) : '0%', 'followers')}
      <div class="ins-leg col"><span><i class="f"></i>Followers <b>${R2.fol.toLocaleString()}</b></span><span><i class="n"></i>Not following you <b>${R2.non.toLocaleString()}</b></span></div></div>
    <h4>Likes over time</h4>
    <div class="ins-seg"><button class="${FDV.insC !== 'h' ? 'on' : ''}" data-ins="ct">Total</button><button class="${FDV.insC === 'h' ? 'on' : ''}" data-ins="ch">Per hour</button></div>
    ${FDV.insC === 'h' ? insHourly(p) : insChart(p)}
    <h4>Engagement</h4>
    ${insStack([[likes, 'Likes', 'a'], [top, 'Comments', 'b'], [rep, 'Replies', 'c']])}
    ${insRow('Interactions', inter.toLocaleString(), `${insPct(eng)} of people reached`)}
    ${p.fg == null ? '<p class="hint">New followers are counted for posts made from now on.</p>' : ''}
    <h4>Top comments</h4>
    ${best.length ? best.map(c => `<div class="ins-cm">${avatar(bot(c.w), 'sm')}<div>${fdWho(c.w)} <span>${esc(c.text)}</span></div><small>♥ ${fdLk(c, p).toLocaleString()}</small></div>`).join('') : `<p class="hint">${p.cm ? 'No comments yet.' : 'Loading comments…'}</p>`}
    <h4>Compared with your posts</h4>${insRecent(p)}${cmp}
    ${insRow('Posted', when)}</div>`;
}
// who liked it: mostly the poster's followers early on, then people who found it; the same people every time
function insLikers(p, n){
  const likes = fdLikes(p) - (FD.liked[p.id] ? 1 : 0), out = [], seen = new Set([p.w]);
  const fol = p.w === -1 ? FD.followers.slice() : [];
  const share = p.w === -1 ? Math.min(1, insReach(p).fol / Math.max(1, insReach(p).views) * 1.6) : .45;
  const r = mulberry32(fdHash(p.id + ':likers')), N = ROSTER_N;
  // a fixed shuffle of the followers, and a fixed walk through everyone else
  for (let i = fol.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [fol[i], fol[j]] = [fol[j], fol[i]]; }
  const step = 7919 * 7 + 2, start = Math.floor(r() * N); let fi = 0, wi = 0;
  (p.xl || []).forEach(w => { if (w >= 0 && !seen.has(w) && out.length < likes){ out.push(w); seen.add(w); } });         // people who liked it because you asked
  const fl = fdFolLiker(p); if (fl != null && likes > 0 && !seen.has(fl)){ out.push(fl); seen.add(fl); }      // the person you follow who liked it shows first
  while (out.length < Math.min(n, likes)){
    let w;
    if (fi < fol.length && r() < share) w = fol[fi++];
    else { w = (start + (wi++) * step) % N; if (wi > N) break; }
    if (w == null || w < 0 || seen.has(w)) continue; seen.add(w); out.push(w);
  }
  return {list: out, total: likes, me: !!FD.liked[p.id]};
}
function insLikersHtml(p){
  const {list, total, me} = insLikers(p, FDV.lkN);
  const row = i => { const B = bot(i), on = FD.follows.includes(i), fy = FD.followers.includes(i);
    return `<li class="soc-row"><button class="soc-who lk-who" data-bot="${i}">${avatar(B, 'md')}<span><b>${esc(B.name)}${fy ? ' <i class="soc-fy">Follows you</i>' : ''}</b><small>${esc(B.subject || '')}</small></span></button>
      <button class="small-btn${on ? '' : ' accent'}" data-fdf="${i}">${on ? 'Following' : 'Follow'}</button></li>`; };
  return `<div class="ins"><div class="ins-h"><button class="ins-back" data-ins="lkback" aria-label="Back to comments"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><b>Likes</b><small class="ins-n">${(total + (me ? 1 : 0)).toLocaleString()}</small></div>
    <ul class="soc-list">${me ? `<li class="soc-row"><span class="soc-who">${myAvatar('md')}<span><b>${esc(myName())}</b><small>you</small></span></span></li>` : ''}${list.map(row).join('')}</ul>
    ${list.length < total ? `<button class="fv-morec" data-ins="lkmore">Show more (${(total - list.length).toLocaleString()} more)</button>` : ''}</div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('.lk-who[data-bot]'); if (b){ e.stopPropagation(); openProfile(+b.dataset.bot); } }, true);
// show insights in the viewer instead of the comments, and add the button next to Like and Comment
{
  const _vh = fdViewHtml;
  fdViewHtml = function(p){
    const html = _vh(p), t = document.createElement('template'); t.innerHTML = html;
    const act = t.content.querySelector('.fv-foot .fd-act');
    if (act && p.w === -1) act.insertAdjacentHTML('beforeend', `<button class="fd-insb${FDV.ins === p.id ? ' on' : ''}" data-ins="${FDV.ins === p.id ? 'back' : 'open'}" aria-label="${p.w === -1 ? 'Insights' : 'Post info'}" title="${p.w === -1 ? 'Insights' : 'Post info'}"><svg viewBox="0 0 24 24"><path d="M5 20V11M12 20V5M19 20v-6"/></svg></button>`);
    const lc = t.content.querySelector('.fv-foot .fd-likes'); if (lc && fdLikes(p)) lc.classList.add('lk-open'), lc.setAttribute('data-ins', 'likers'), lc.setAttribute('role', 'button'), lc.setAttribute('tabindex', '0');
    if (FDV.likers === p.id){ const box = t.content.querySelector('.fv-cms'); if (box){ box.classList.add('ins-on'); box.innerHTML = insLikersHtml(p); } }
    else if (FDV.ins === p.id){ const box = t.content.querySelector('.fv-cms'); if (box){ box.classList.add('ins-on'); box.innerHTML = insHtml(p); } const f = t.content.querySelector('.fv-foot .fd-form'); if (f) f.hidden = true; }
    return t.innerHTML;
  };
  const _v = fdView;
  fdView = function(p, focus){ if (FDV.view !== p.id){ FDV.ins = null; FDV.likers = null; } return _v(p, focus); };
  const _c = fdCard;
  fdCard = function(p){
    const html = _c(p); if (p.w !== -1 || p.id === 'prevt') return html;
    const t = document.createElement('template'); t.innerHTML = html;
    const lk = t.content.querySelector('.fd-likes'); if (lk && fdLikes(p)){ lk.classList.add('lk-open'); lk.setAttribute('data-ins', 'likers'); } if (lk) lk.insertAdjacentHTML('afterend', '<button class="fd-insv" data-ins="view">View insights</button>');
    return t.innerHTML;
  };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ins]'); if (!b) return;
  const host = b.closest('[data-pid]'), p = host && FD.posts.find(x => x.id === host.dataset.pid); if (!p) return;
  e.stopPropagation();
  const k = b.dataset.ins;
  if (k === 'view'){ fdView(p); FDV.ins = p.id; FDV.likers = null; fdViewRefresh(); return; }
  if (k === 'ct' || k === 'ch'){ FDV.insC = k === 'ch' ? 'h' : 't'; const box = document.querySelector('#fdViewBody .fv-cms'), top = box ? box.scrollTop : 0; fdViewRefresh(); const b2 = document.querySelector('#fdViewBody .fv-cms'); if (b2) b2.scrollTop = top; return; }
  if (k === 'likers'){ if (!b.closest('#fdView')){ fdView(p); } FDV.likers = FDV.likers === p.id ? null : p.id; FDV.ins = null; FDV.lkN = 60; }
  else if (k === 'lkback') FDV.likers = null;
  else if (k === 'lkmore'){ FDV.lkN += 60; const box = document.querySelector('#fdViewBody .fv-cms'), top = box ? box.scrollTop : 0; fdViewRefresh(); const b2 = document.querySelector('#fdViewBody .fv-cms'); if (b2) b2.scrollTop = top; return; }
  else { FDV.ins = k === 'open' ? p.id : null; FDV.likers = null; }
  fdViewRefresh();
  const box = document.querySelector('#fdViewBody .fv-cms'); if (box) box.scrollTop = 0;
}, true);
// a new follower while one of your posts is fresh came from it (the biggest one of the last day)
function insFollowed(){
  const now = Date.now(), fresh = FD.posts.filter(p => p.w === -1 && !p.del && p.fg != null && now - p.t < 864e5).sort((a, b) => fdLikes(b) - fdLikes(a))[0];
  if (fresh){ fresh.fg++; }
}
