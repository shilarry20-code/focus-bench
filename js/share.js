/* ---------- like, comment and share counts on posts, and sharing a post to DMs ----------
   Each post's action row reads like Instagram's: the heart with the number of likes, the speech bubble with the
   number of comments, and the paper plane with the number of shares. Tap the likes number to see who liked it, the
   comments number to see the comments. Share sends the post to people in your DMs (with a message if you like);
   it shows up there as a card you can tap to open, and they answer like any DM. */
FD.shared = FD.shared || {};
// shares: a small share of the likes (some posts get shared a lot more than others), plus the times you shared it
const fdShares = p => { const r = (fdHash(p.id + ':sh') % 100) / 100, k = r < .5 ? .015 : r < .85 ? .04 : .11; return Math.floor(fdLikes(p) * k) + (FD.shared[p.id] || 0); };
const FX_ICON = {
  share: '<svg viewBox="0 0 24 24"><path d="M21.5 3 10.2 14.2M21.5 3l-6.8 18-4.5-6.8L3.5 9.8z"/></svg>'};
const fxN = n => n >= 1e4 ? (Math.round(n / 100) / 10).toLocaleString() + 'K' : n.toLocaleString();
// add the numbers and the share button to an action row (in a feed card or the enlarged view)
function fxRow(html, p, view){
  const t = document.createElement('template'); t.innerHTML = html;
  const act = t.content.querySelector(view ? '.fv-foot .fd-act' : '.fd-act'); if (!act) return html;
  const like = act.querySelector('.fd-like'), cm = act.querySelector('.fd-cbtn'), nl = fdLikes(p), nc = fdCount(p), ns = fdShares(p);
  if (like) like.insertAdjacentHTML('afterend', `<button class="fd-n fd-lkn" data-ins="likers" aria-label="See who liked this">${fxN(nl)}</button>`);
  if (cm) cm.insertAdjacentHTML('afterend', `<button class="fd-n fd-cmn" data-fdx="${view ? 'cms' : 'open'}" aria-label="See the comments">${fxN(nc)}</button>`);
  const after = act.querySelector('.fd-cmn') || cm;
  if (after) after.insertAdjacentHTML('afterend', `<button class="fd-cbtn fd-shb" data-fdx="share" aria-label="Share">${FX_ICON.share}</button><span class="fd-n fd-shn">${fxN(ns)}</span>`);
  // the "70 likes · 2 comments" line goes: the numbers are on the buttons now (a "Liked by …" line in the feed stays)
  const lk = t.content.querySelector(view ? '.fv-foot .fd-likes' : '.fd-likes');
  if (lk && (view || !lk.querySelector('.fd-lkby'))) lk.remove();
  return t.innerHTML;
}
{
  const _ph = fdPostHtml; fdPostHtml = function(p){ return fxRow(_ph(p), p, false); };
  const _vh = fdViewHtml; fdViewHtml = function(p){ return fxRow(_vh(p), p, true); };
}
// keep the numbers right after a like (the feed only redraws the heart)
function fxRefresh(p){
  document.querySelectorAll(`[data-pid="${p.id}"]`).forEach(el => {
    const a = el.querySelector('.fd-lkn'); if (a) a.textContent = fxN(fdLikes(p));
    const b = el.querySelector('.fd-cmn'); if (b) b.textContent = fxN(fdCount(p));
    const c = el.querySelector('.fd-shn'); if (c) c.textContent = fxN(fdShares(p));
    if (el.closest('#fdView')){ const l = el.querySelector('.fv-foot .fd-likes'); if (l) l.remove(); }
    else { const l = el.querySelector('.fd-likes'); if (l && !l.querySelector('.fd-lkby')) l.remove(); }
  });
}
document.addEventListener('click', e => {
  const lk = e.target.closest('[data-fda="like"], [data-fda="dbl"]'); if (lk){ const host = lk.closest('[data-pid]'), p = host && FD.posts.find(x => x.id === host.dataset.pid); if (p) setTimeout(() => fxRefresh(p), 0); }
  const b = e.target.closest('[data-fdx]'); if (!b) return;
  const host = b.closest('[data-pid]'), p = host && FD.posts.find(x => x.id === host.dataset.pid); if (!p) return;
  e.stopPropagation(); const k = b.dataset.fdx;
  if (k === 'open') fdView(p, false);
  else if (k === 'cms'){ FDV.likers = null; FDV.ins = null; fdViewRefresh(); }
  else if (k === 'share') fxShare(p);
}, true);

/* ---- the share sheet ---- */
let FX = null;   // {pid, pick: Set, q, text}
function fxShare(p){ FX = {pid: p.id, pick: new Set(), q: '', text: ''}; let m = $('#fxSheet'); if (!m){ m = document.createElement('div'); m.id = 'fxSheet'; m.className = 'modal'; document.body.appendChild(m); } m.hidden = false; fxDraw(); setTimeout(() => { const i = $('#fxQ'); if (i) i.focus(); }, 30); }
function fxPeople(){
  const seen = new Set(), out = [], add = w => { if (w >= 0 && !seen.has(w)){ seen.add(w); out.push(w); } };
  try { dcDms().sort((a, b) => (thread(b).slice(-1)[0] || {t: 0}).t - (thread(a).slice(-1)[0] || {t: 0}).t).forEach(add); } catch(e){}
  (FD.follows || []).forEach(add); (FD.followers || []).forEach(add);
  const q = FX.q.trim().toLowerCase();
  return (q ? out.filter(w => bot(w).name.toLowerCase().includes(q)) : out).slice(0, 60);
}
function fxDraw(){
  const m = $('#fxSheet'); if (!m || !FX) return;
  const list = fxPeople(), n = FX.pick.size;
  m.innerHTML = `<div class="modal-card fx-card" role="dialog" aria-modal="true" aria-label="Share"><div class="fx-h"><b>Share</b><button class="st-ib dark" data-fxa="close" aria-label="Close">✕</button></div>
    <label class="el-search fx-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="fxQ" placeholder="Search" autocomplete="off" value="${esc(FX.q)}"></label>
    <div class="fx-grid">${list.map(w => `<button class="fx-p${FX.pick.has(w) ? ' on' : ''}" data-fxw="${w}"><span class="fx-av">${avatar(bot(w), 'md')}${FX.pick.has(w) ? '<i>✓</i>' : ''}</span><small>${esc(bot(w).name)}</small></button>`).join('') || '<p class="hint">No one to send it to yet. Follow people or message someone first.</p>'}</div>
    <div class="fx-foot"${n ? '' : ' hidden'}><input id="fxText" maxlength="200" placeholder="Write a message…" autocomplete="off" value="${esc(FX.text)}"><button class="small-btn accent" data-fxa="send">${n > 1 ? `Send separately (${n})` : 'Send'}</button></div></div>`;
}
function fxSend(){
  const p = FD.posts.find(x => x.id === FX.pid); if (!p || !FX.pick.size) return;
  const text = FX.text.trim().slice(0, 200), about = fxAbout(p), names = [];
  FX.pick.forEach(w => {
    dmSend(w, text);
    const last = DMS.msgs[DMS.msgs.length - 1]; if (last && last.me && last.w === w){ last.post = p.id; last.ps = about; }
    names.push(bot(w).name);
  });
  saveDms(); try { renderChat(); } catch(e){}
  FD.shared[p.id] = (FD.shared[p.id] || 0) + FX.pick.size; saveFeed(); fxRefresh(p);
  $('#fxSheet').hidden = true; FX = null;
  toast(`Sent to ${names.length > 2 ? `${names[0]}, ${names[1]} and ${names.length - 2} more` : names.join(' and ')}`);
}
// what a shared post is, in a few words (so whoever gets it knows what you sent)
function fxAbout(p){
  const who = p.w === -1 ? `${myName()}'s own` : `${bot(p.w).name}'s`;
  const what = p.type === 'scene' ? 'picture of where they study' : p.type === 'text' ? 'text post' : p.type === 'session' ? `${p.d.min}-minute session card` : p.type === 'match' || p.type === 'rank' ? 'ranked match result' : 'post';
  return `${who} ${what}${p.cap ? `, captioned “${String(p.cap).slice(0, 120)}”` : ''}`;
}
document.addEventListener('click', e => {
  if (!e.target.closest('#fxSheet')) return;
  if (e.target.id === 'fxSheet'){ $('#fxSheet').hidden = true; FX = null; return; }
  const p = e.target.closest('[data-fxw]'); if (p){ const w = +p.dataset.fxw; FX.pick.has(w) ? FX.pick.delete(w) : FX.pick.add(w); const t = $('#fxText'); if (t) FX.text = t.value; fxDraw(); const t2 = $('#fxText'); if (t2 && FX.pick.size) t2.focus(); return; }
  const a = e.target.closest('[data-fxa]'); if (!a) return;
  if (a.dataset.fxa === 'close'){ $('#fxSheet').hidden = true; FX = null; } else if (a.dataset.fxa === 'send'){ const t = $('#fxText'); if (t) FX.text = t.value; fxSend(); }
});
document.addEventListener('input', e => { if (e.target.id === 'fxQ' && FX){ FX.q = e.target.value; const pos = e.target.selectionStart; fxDraw(); const i = $('#fxQ'); i.focus(); i.setSelectionRange(pos, pos); } else if (e.target.id === 'fxText' && FX) FX.text = e.target.value; });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'fxText'){ e.preventDefault(); FX.text = e.target.value; fxSend(); } if (e.key === 'Escape' && FX){ $('#fxSheet').hidden = true; FX = null; } });

/* ---- a shared post in DMs: a little card, tap to open it ---- */
// its picture gets its own ids (the same post in the hidden Feed would otherwise own the gradients it uses)
const fxUniq = (svg, tag) => svg.replace(/id="([^"]+)"/g, `id="$1${tag}"`).replace(/url\(#([^)]+)\)/g, `url(#$1${tag})`).replace(/href="#([^"]+)"/g, `href="#$1${tag}"`);
function fxPostCard(id){
  const p = FD.posts.find(x => x.id === id && !x.del);
  if (!p) return '<div class="dm-post gone">Post unavailable</div>';
  const who = p.w === -1 ? myName() : bot(p.w).name;
  return `<button class="dm-post" data-fxopen="${esc(id)}"><span class="dm-ph">${p.w === -1 ? myAvatar('xs') : avatar(bot(p.w), 'xs')}<b>${esc(who)}</b></span><span class="dm-pm">${fxUniq(fdMedia(p), 'dm')}</span>${p.cap && p.type !== 'text' ? `<span class="dm-pc"><b>${esc(who)}</b> ${esc(String(p.cap).slice(0, 90))}</span>` : ''}</button>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-fxopen]'); if (!b) return; e.preventDefault(); e.stopPropagation(); const p = FD.posts.find(x => x.id === b.dataset.fxopen); if (!p) return toast('That post isn’t available anymore.'); showPage('feed'); fdView(p, false); }, true);
