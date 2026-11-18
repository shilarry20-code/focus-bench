/* ---------- flashcards: study a guide's Q:/A: cards one at a time ----------
   Pick which sections to study (a section includes the ones nested under it), then go card by card: flip, then
   mark it "Got it" or "Still learning". The marks are kept with the guide (so they sync to your other devices),
   and you can study just the cards you're still learning. Each section with cards also gets a "Study" link. */

let FC = null;      // {g, cards, secs, sel:Set, only, shuffle, deck, i, flipped, res, screen}
const fcKey = q => { let h = 5381; const t = String(q).toLowerCase().replace(/\s+/g, ' ').trim(); for (let k = 0; k < t.length; k++) h = (h * 33 ^ t.charCodeAt(k)) >>> 0; return 'c' + h.toString(36); };
const fcMd = t => String(t || '').split('\n').map(mdInline).join('<br>');
const fcMark = (g, c) => { const v = (g.fc || {})[fcKey(c.q)]; return v === 1 ? 'got' : v === 0 ? 'learn' : ''; };

// the sections that have cards: each heading covers its own cards and those under its sub-headings
function fcSections(r){
  const idx = new Map(r.heads.map((h, k) => [h.id, k])), out = [];
  const intro = r.cards.filter(c => c.h == null);
  if (intro.length) out.push({id: '_intro', text: 'Before the first heading', lv: 1, cards: intro});
  const minLv = r.heads.length ? Math.min(...r.heads.map(h => h.lv)) : 1;
  r.heads.forEach((h, k) => {
    let end = r.heads.length; for (let j = k + 1; j < r.heads.length; j++) if (r.heads[j].lv <= h.lv){ end = j; break; }
    const cards = r.cards.filter(c => c.h != null && idx.get(c.h) >= k && idx.get(c.h) < end);
    if (cards.length) out.push({id: h.id, text: h.text, lv: h.lv - minLv + 1, cards, own: r.cards.filter(c => c.h === h.id).length});
  });
  return out;
}
function fcModal(){
  let m = $('#fcModal'); if (m) return m;
  document.body.insertAdjacentHTML('beforeend', '<div class="fc-modal" id="fcModal" hidden><div class="fc-box" role="dialog" aria-modal="true" aria-label="Flashcards"></div></div>');
  m = $('#fcModal');
  m.addEventListener('click', fcClick);
  let x0 = null, y0 = null;
  m.addEventListener('touchstart', e => { if (!e.target.closest('.fc-card')) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, {passive: true});
  m.addEventListener('touchend', e => {
    if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5){ fcGo(dx < 0 ? 1 : -1); e.preventDefault(); }
  });
  return m;
}
function fcOpen(g, secId){
  const r = mdRender(g.body); if (!r.cards.length) return;
  const secs = fcSections(r);
  FC = {g, cards: r.cards, secs, sel: new Set(secId ? [secId] : secs.filter(s => s.lv === 1).map(s => s.id)), only: false, shuffle: false, screen: 'pick'};
  if (!FC.sel.size) secs.forEach(s => FC.sel.add(s.id));
  fcModal().hidden = false;
  if (secId) fcStart(); else fcRender();
}
function fcClose(){ FC = null; const m = $('#fcModal'); if (m) m.hidden = true; if (!$('#page-guides').hidden && gView) renderGuides(); }
function fcChosen(){
  const ns = new Set(); FC.secs.forEach(s => { if (FC.sel.has(s.id)) s.cards.forEach(c => ns.add(c.n)); });
  let cards = FC.cards.filter(c => ns.has(c.n));
  if (FC.only) cards = cards.filter(c => fcMark(FC.g, c) === 'learn');
  return cards;
}
function fcStart(deck){
  let cards = deck || fcChosen(); if (!cards.length){ toast(FC.only ? 'No cards marked “Still learning” in those sections.' : 'Pick at least one section.'); if (deck || FC.screen !== 'pick'){ FC.screen = 'pick'; fcRender(); } return; }
  cards = cards.slice(); if (FC.shuffle) cards.sort(() => Math.random() - .5);
  Object.assign(FC, {deck: cards, i: 0, flipped: false, res: {}, screen: 'study'}); fcRender();
}
function fcGo(d){ if (!FC || FC.screen !== 'study') return; const n = FC.i + d; if (n < 0) return; if (n >= FC.deck.length){ FC.screen = 'done'; fcRender(); return; } FC.i = n; FC.flipped = false; fcRender(); }
function fcSet(v){
  if (!FC || FC.screen !== 'study' || !FC.flipped) return;
  const c = FC.deck[FC.i]; FC.res[c.n] = v; FC.g.fc = FC.g.fc || {}; FC.g.fc[fcKey(c.q)] = v; saveGuides();
  fcGo(1);
}
function secName(c){ const s = FC.secs.filter(x => x.cards.includes(c)).pop(); return s ? s.text : ''; }
function fcRender(){
  const box = $('#fcModal .fc-box'); if (!FC || !box) return;
  const g = FC.g, x = '<button class="x fc-x" data-fc="close" aria-label="Close">✕</button>';
  if (FC.screen === 'pick'){
    const learnAll = fcChosen.call(null), nSel = (() => { const o = FC.only; FC.only = false; const n = fcChosen().length; FC.only = o; return n; })();
    const learnN = (() => { const o = FC.only; FC.only = true; const n = fcChosen().length; FC.only = o; return n; })();
    box.innerHTML = `${x}<div class="fc-pick"><h3>Study flashcards</h3><p class="hint">${esc(g.title)} · pick the sections to study</p>
      <div class="fc-all"><button class="link-btn" data-fc="all">Select all</button><button class="link-btn" data-fc="none">Clear</button></div>
      <div class="fc-secs">${FC.secs.map(s => { const got = s.cards.filter(c => fcMark(g, c) === 'got').length, le = s.cards.filter(c => fcMark(g, c) === 'learn').length;
        return `<label class="fc-sec" style="--lv:${s.lv}"><input type="checkbox" data-sec="${s.id}"${FC.sel.has(s.id) ? ' checked' : ''}><span class="fc-sn">${esc(s.text)}</span><span class="fc-cnt">${s.cards.length} card${s.cards.length === 1 ? '' : 's'}${le ? ` · <em class="le">${le} learning</em>` : ''}${got ? ` · <em class="ok">${got} got</em>` : ''}</span></label>`; }).join('')}</div>
      <label class="fc-opt"><input type="checkbox" data-opt="only"${FC.only ? ' checked' : ''}> Only cards I’m still learning <small>(${learnN})</small></label>
      <label class="fc-opt"><input type="checkbox" data-opt="shuffle"${FC.shuffle ? ' checked' : ''}> Shuffle</label>
      <div class="fc-foot"><button class="small-btn" data-fc="close">Cancel</button><button class="small-btn accent" data-fc="start"${learnAll.length ? '' : ' disabled'}>Start · ${learnAll.length} card${learnAll.length === 1 ? '' : 's'}</button></div>
      ${nSel && !learnAll.length && FC.only ? '<p class="hint">None of these are marked “Still learning”.</p>' : ''}</div>`;
    return;
  }
  if (FC.screen === 'done'){
    const vals = Object.values(FC.res), got = vals.filter(v => v === 1).length, le = FC.deck.filter(c => FC.res[c.n] === 0);
    box.innerHTML = `${x}<div class="fc-done"><h3>Done!</h3><p><b>${FC.deck.length}</b> card${FC.deck.length === 1 ? '' : 's'} · <span class="ok">${got} got it</span> · <span class="le">${le.length} still learning</span>${FC.deck.length - vals.length ? ` · ${FC.deck.length - vals.length} skipped` : ''}</p>
      <div class="fc-foot">${le.length ? `<button class="small-btn accent" data-fc="again">Study the ${le.length} still learning</button>` : ''}<button class="small-btn" data-fc="restart">Go again</button><button class="small-btn" data-fc="pick">Choose sections</button><button class="small-btn" data-fc="close">Close</button></div></div>`;
    return;
  }
  const c = FC.deck[FC.i], mk = FC.res[c.n] != null ? (FC.res[c.n] ? 'got' : 'learn') : fcMark(g, c), pct = FC.i / FC.deck.length * 100;
  box.innerHTML = `${x}<div class="fc-study"><div class="fc-top"><span class="fc-ct">${FC.i + 1} / ${FC.deck.length}</span><span class="fc-secname">${esc(secName(c))}</span>${mk ? `<span class="fc-mk ${mk}">${mk === 'got' ? 'Got it' : 'Still learning'}</span>` : ''}</div>
    <span class="bar2 fc-bar"><i style="width:${pct}%"></i></span>
    <button class="fc-card${FC.flipped ? ' flip' : ''}" data-fc="flip" aria-label="${FC.flipped ? 'Answer. Click to see the question' : 'Question. Click to see the answer'}">
      <span class="fc-face fc-front"><small>Question</small><span>${fcMd(c.q)}</span><em>Tap to flip</em></span>
      <span class="fc-face fc-back"><small>Answer</small><span>${c.a ? fcMd(c.a) : '<i>(no answer written)</i>'}</span></span></button>
    <div class="fc-ctl">${FC.flipped ? `<button class="small-btn fc-le" data-fc="learn">Still learning</button><button class="small-btn accent fc-ok" data-fc="got">Got it</button>`
      : `<button class="small-btn" data-fc="prev"${FC.i ? '' : ' disabled'} aria-label="Previous card">←</button><button class="small-btn accent" data-fc="flip">Flip</button><button class="small-btn" data-fc="next" aria-label="Next card">→</button>`}</div>
    <p class="hint fc-keys">Space to flip · ← → to move · 1 still learning · 2 got it</p></div>`;
}
function fcClick(e){
  if (e.target === $('#fcModal')){ if (FC && FC.screen !== 'study') fcClose(); return; }
  const cb = e.target.closest('input[data-sec]'); if (cb){ cb.checked ? FC.sel.add(cb.dataset.sec) : FC.sel.delete(cb.dataset.sec); fcRender(); return; }
  const op = e.target.closest('input[data-opt]'); if (op){ FC[op.dataset.opt] = op.checked; fcRender(); return; }
  const b = e.target.closest('[data-fc]'); if (!b || !FC) return;
  const a = b.dataset.fc;
  if (a === 'close') fcClose();
  else if (a === 'all'){ FC.secs.forEach(s => FC.sel.add(s.id)); fcRender(); }
  else if (a === 'none'){ FC.sel.clear(); fcRender(); }
  else if (a === 'start') fcStart();
  else if (a === 'flip'){ FC.flipped = !FC.flipped; fcRender(); }
  else if (a === 'prev') fcGo(-1);
  else if (a === 'next') fcGo(1);
  else if (a === 'got') fcSet(1);
  else if (a === 'learn') fcSet(0);
  else if (a === 'again') fcStart(FC.deck.filter(c => FC.res[c.n] === 0));
  else if (a === 'restart') fcStart(FC.deck);
  else if (a === 'pick'){ FC.screen = 'pick'; fcRender(); }
}
// runs before the app's own shortcuts (number keys switch pages, Space starts the timer), which stay off while this is open
addEventListener('keydown', e => {
  if (!FC || $('#fcModal').hidden || e.key === 'Tab') return;
  e.stopImmediatePropagation();
  if (e.key === 'Escape'){ fcClose(); return; }
  if (FC.screen !== 'study'){ if (e.key === ' ' && !/INPUT|BUTTON/.test(e.target.tagName)) e.preventDefault(); return; }
  if (e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); FC.flipped = !FC.flipped; fcRender(); }
  else if (e.key === 'ArrowRight'){ e.preventDefault(); fcGo(1); }
  else if (e.key === 'ArrowLeft'){ e.preventDefault(); fcGo(-1); }
  else if (e.key === '1') fcSet(0);
  else if (e.key === '2') fcSet(1);
}, true);

/* ---- in the guide: a list of the cards, and a "Study" link on sections with cards ---- */
function fcSideList(g, r){
  const learn = r.cards.filter(c => fcMark(g, c) === 'learn').length;
  return `<div class="card fc-side"><div class="h first fc-side-h"><span>Flashcards <small class="pf-sub">${r.cards.length}${learn ? ` · ${learn} learning` : ''}</small></span><button class="small-btn accent" data-ga="fc">Study</button></div>
    <nav class="fc-list">${r.cards.map(c => { const mk = fcMark(g, c); return `<button data-fcjump="${c.n}"><i class="fc-dot ${mk}"></i><span>${esc(c.q.replace(/[*_`=~]/g, '').split('\n')[0])}</span></button>`; }).join('')}</nav></div>`;
}
function fcDecorate(g, r){
  const secs = fcSections(r);
  secs.forEach(s => {
    if (s.id === '_intro' || s.lv > 2) return;
    const h = document.getElementById(s.id); if (!h || !h.closest('#guidesBody')) return;
    h.insertAdjacentHTML('beforeend', ` <button class="g-fcsec" data-fcsec="${s.id}" title="Study the flashcards in this section">Study ${s.cards.length} card${s.cards.length === 1 ? '' : 's'}</button>`);
  });
}
$('#page-guides').addEventListener('click', e => {
  const s = e.target.closest('[data-fcsec]'); if (s){ e.preventDefault(); const g = gView && guideById(gView); if (g) fcOpen(g, s.dataset.fcsec); return; }
  const j = e.target.closest('[data-fcjump]');
  if (j){ const d = document.getElementById('fc' + j.dataset.fcjump); if (!d) return; d.open = true;
    d.scrollIntoView({block: 'center', behavior: motion() === 'off' ? 'auto' : 'smooth'}); d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash'); }
});
