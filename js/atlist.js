/* ---------- @mentions: type @ in a comment or message and pick someone from a list, like Instagram ----------
   People in that conversation come first (the post's poster and commenters, the group's members, the person you're
   messaging, your match opponent or lobby), then people you follow and who follow you, then anyone else whose name
   matches. Arrow keys and Enter or Tab pick one; Esc closes the list. */
const AT_INPUTS = '#dmIn, .fd-form input, #elIn, #mcIn, #wIn, #chatIn';
let AT = {inp: null, at: -1, list: [], k: 0};
function atContext(inp){
  const out = [];
  try {
    if (inp.id === 'dmIn' && DC.key){ if (DC.key.startsWith('u:')) out.push(+DC.key.slice(2)); else { const g = GC.g[DC.key.slice(2)]; if (g) out.push(...g.m); } }
    if (inp.closest('.fd-form')){ const p = FD.posts.find(x => x.id === FDV.view); if (p){ if (p.w >= 0) out.push(p.w); (p.cm || p.pv || []).slice().reverse().forEach(c => { if (c.w >= 0) out.push(c.w); }); } }
    if (inp.id === 'elIn' && EL.G) out.push(...EL.G.L.players.filter(w => w >= 0));
    if (inp.id === 'mcIn' && R.cur) out.push(R.cur.b);
  } catch(e){}
  return out;
}
function atMatches(inp, q){
  q = q.toLowerCase(); const seen = new Set(), out = [];
  const add = w => { if (w == null || w < 0 || w >= ROSTER_N || seen.has(w)) return; const n = bot(w).name.toLowerCase(); if (q && !n.includes(q)) return; seen.add(w); out.push({w, pre: !q || n.startsWith(q)}); };
  atContext(inp).forEach(add);
  try { FD.follows.forEach(add); FD.followers.forEach(add); } catch(e){}
  try { dcDms().forEach(add); } catch(e){}
  if (q) BOT_BY_NAME.forEach((w, n) => { if (out.length < 60 && n.includes(q)) add(w); });
  // names starting with what you typed first, keeping the order above otherwise
  return out.sort((a, b) => (b.pre - a.pre)).slice(0, 7).map(x => x.w);
}
function atClose(){ const el = $('#atList'); if (el) el.remove(); AT = {inp: null, at: -1, list: [], k: 0}; }
function atShow(inp, at, q){
  const list = atMatches(inp, q); if (!list.length){ atClose(); return; }
  AT = {inp, at, list, k: Math.min(AT.inp === inp ? AT.k : 0, list.length - 1)};
  let el = $('#atList'); if (!el){ el = document.createElement('div'); el.id = 'atList'; el.className = 'at-list'; el.setAttribute('role', 'listbox'); document.body.appendChild(el); }
  el.innerHTML = list.map((w, k) => { const B = bot(w), f = typeof FD !== 'undefined' && FD.follows.includes(w);
    return `<button type="button" class="at-row${k === AT.k ? ' on' : ''}" data-atw="${w}" role="option" aria-selected="${k === AT.k}">${avatar(B, 'sm')}<span><b>${esc(B.name)}</b><small>${f ? 'Following · ' : ''}${esc(B.subject || '')}</small></span></button>`; }).join('');
  const r = inp.getBoundingClientRect(), w = Math.min(320, Math.max(240, r.width));
  el.style.width = w + 'px'; el.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
  const h = el.offsetHeight; el.style.top = (r.top - h - 6 > 8 ? r.top - h - 6 : r.bottom + 6) + 'px';
}
function atCheck(inp){
  const v = inp.value, c = inp.selectionStart == null ? v.length : inp.selectionStart, before = v.slice(0, c);
  const m = before.match(/(^|[\s(])@([A-Za-z0-9_.]{0,30})$/);
  if (!m){ atClose(); return; }
  atShow(inp, c - m[2].length - 1, m[2]);
}
function atPick(w){
  const inp = AT.inp; if (!inp) return; const v = inp.value, c = inp.selectionStart == null ? v.length : inp.selectionStart, name = bot(w).name;
  inp.value = v.slice(0, AT.at) + '@' + name + ' ' + v.slice(c).replace(/^\S*/, '').replace(/^ /, '');
  const pos = AT.at + name.length + 2; inp.focus(); inp.setSelectionRange(pos, pos); atClose();
}
document.addEventListener('input', e => { if (e.target.matches && e.target.matches(AT_INPUTS)) atCheck(e.target); });
document.addEventListener('keydown', e => {
  if (!AT.inp || e.target !== AT.inp || !$('#atList')) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); AT.k = (AT.k + (e.key === 'ArrowDown' ? 1 : -1) + AT.list.length) % AT.list.length; atShow(AT.inp, AT.at, AT.inp.value.slice(AT.at + 1, AT.inp.selectionStart)); }
  else if (e.key === 'Enter' || e.key === 'Tab'){ e.preventDefault(); e.stopImmediatePropagation(); atPick(AT.list[AT.k]); }
  else if (e.key === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); atClose(); }
}, true);
document.addEventListener('pointerdown', e => {
  const r = e.target.closest('#atList [data-atw]'); if (r){ e.preventDefault(); atPick(+r.dataset.atw); return; }   // pointerdown keeps the input focused
  if (!e.target.closest('#atList') && e.target !== AT.inp) atClose();
}, true);
document.addEventListener('focusout', e => { if (e.target === AT.inp) setTimeout(() => { if (document.activeElement !== AT.inp) atClose(); }, 150); });
addEventListener('resize', atClose);
