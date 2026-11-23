/* ---------- wake lock ---------- */
let wl = null;
async function wake(on){
  try {
    if (on && 'wakeLock' in navigator && !wl){ wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => wl = null); }
    else if (!on && wl){ await wl.release(); wl = null; }
  } catch(e){}
}

/* ---------- mini clock (floating window) ---------- */
let pipWin = null, pipVideo = null, pipCanvas = null;
const miniOpen = () => !!pipWin || (!!pipVideo && document.pictureInPictureElement === pipVideo);
const SIZES = {s:[230,130], m:[300,170], l:[400,220]};
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Big+Shoulders+Display:wght@300;500;800&family=Caveat:wght@400;500;700&family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,800&family=Fredoka:wght@300;500;600;700&family=JetBrains+Mono:wght@300;500;700;800&family=Lexend:wght@400;500;600;700&family=Nunito:wght@400;600;700&family=Orbitron:wght@400;500;800&family=Playfair+Display:wght@400;500;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=VT323&display=swap';
function tokens(){
  const cs = getComputedStyle(document.body), g = n => cs.getPropertyValue(n).trim();
  return {bg:g('--surface'), ink:g('--ink'), cur:g('--cur'), muted:g('--muted'), soft:g('--soft'), onacc:g('--on-cur'), digits:g('--digits'), weight:g('--dweight') || '800', body:g('--f-body')};
}
async function toggleMini(){
  if (pipWin){ pipWin.close(); pipWin = null; renderAll(); return; }
  if (pipVideo && document.pictureInPictureElement){ try { await document.exitPictureInPicture(); } catch(e){} return; }
  // A floating document window is only allowed when the page runs in its own tab.
  if (window.top === window && 'documentPictureInPicture' in window){
    try {
      const [w,h] = SIZES[P.mini] || SIZES.m;
      pipWin = await documentPictureInPicture.requestWindow({width:w, height:h}); achBump('mini');
      buildDocPip(pipWin);
      pipWin.addEventListener('pagehide', () => { pipWin = null; renderAll(); });
      renderAll(); return;
    } catch(e){ pipWin = null; }
  }
  try { await openVideoPip(); }
  catch(e){ toast("This browser won't let a web page float a mini clock. Chrome and Edge support it."); }
}
function buildDocPip(w){
  const d = w.document;
  d.head.innerHTML = `<meta charset="utf-8"><link rel="stylesheet" href="${FONT_URL}"><style>
    html,body{margin:0;height:100%}
    body{background:var(--bg);color:var(--ink);font-family:Figtree,system-ui,sans-serif;display:flex;flex-direction:column;justify-content:center;gap:4px;padding:10px 14px;box-sizing:border-box;overflow:hidden}
    .r{display:flex;justify-content:space-between;align-items:center;gap:8px}
    .l{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--cur);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .t{font-family:var(--digits);font-weight:var(--dweight);font-size:min(46vh,24vw);line-height:1;font-variant-numeric:tabular-nums}
    .t small{font-size:.35em;color:var(--muted);margin-left:.15em;font-family:Figtree,sans-serif}
    .bar{height:6px;border-radius:9px;background:var(--soft);overflow:hidden}.bar i{display:block;height:100%;background:var(--cur)}
    .k{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    button{border:0;border-radius:99px;background:var(--cur);color:var(--onacc);font:700 12px Figtree,sans-serif;padding:4px 10px;cursor:pointer}
    button.g{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1px var(--soft)}
  </style>`;
  d.body.innerHTML = `<div class="r"><span class="l" id="pl"></span><span><button class="g" id="sk">Skip</button> <button id="pp">Start</button></span></div><div class="t" id="pt"></div><div class="bar"><i id="pb"></i></div><div class="k" id="pk"></div>`;
  d.getElementById('pp').onclick = toggle;
  d.getElementById('sk').onclick = skip;
}
async function openVideoPip(){
  if (!document.pictureInPictureEnabled || !HTMLCanvasElement.prototype.captureStream) throw new Error('unsupported');
  if (!pipCanvas){ pipCanvas = document.createElement('canvas'); pipCanvas.width = 480; pipCanvas.height = 270; }
  drawPip(fmt(countUp() ? flowElapsed() : remaining(), countUp()), frac());
  if (!pipVideo){
    pipVideo = document.createElement('video');
    pipVideo.muted = true; pipVideo.playsInline = true; pipVideo.setAttribute('aria-hidden','true');
    pipVideo.style.cssText = 'position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;bottom:0;left:0';
    document.body.appendChild(pipVideo);
    pipVideo.srcObject = pipCanvas.captureStream(10);
    pipVideo.addEventListener('leavepictureinpicture', () => { renderAll(); });
    pipVideo.addEventListener('enterpictureinpicture', () => { renderAll(); updateMedia(); });
  }
  await pipVideo.play();
  await pipVideo.requestPictureInPicture(); achBump('mini');
  setupMedia();
}
function drawPip(f, fr){
  const c = pipCanvas, x = c.getContext('2d'), W = c.width, H = c.height, k = tokens();
  x.fillStyle = k.bg; x.fillRect(0,0,W,H);
  x.textBaseline = 'alphabetic';
  x.fillStyle = k.cur; x.font = '700 22px Figtree, sans-serif';
  x.fillText(phaseName().toUpperCase(), 28, 48);
  if (!S.running && !notStarted()){ x.fillStyle = k.muted; x.textAlign = 'right'; x.fillText('PAUSED', W - 28, 48); x.textAlign = 'left'; }
  const fam = k.digits || 'sans-serif';
  x.font = `${k.weight} 120px ${fam}`;
  let w = x.measureText(f.text).width, size = Math.min(120, 120 * (W - 56 - (f.unit ? 70 : 0)) / w);
  x.font = `${k.weight} ${size}px ${fam}`; x.fillStyle = k.ink; x.fillText(f.text, 26, 170);
  if (f.unit){ const tw = x.measureText(f.text).width; x.font = '600 30px Figtree, sans-serif'; x.fillStyle = k.muted; x.fillText(f.unit, 34 + tw, 170); }
  x.fillStyle = k.soft; roundRect(x, 28, 194, W - 56, 10, 5); x.fill();
  if (fr > 0){ x.fillStyle = k.cur; roundRect(x, 28, 194, Math.max(10, (W - 56) * fr), 10, 5); x.fill(); }
  const label = [P.task, P.tag].filter(Boolean).join(' · ');
  x.fillStyle = k.muted; x.font = '600 22px Figtree, sans-serif';
  let t = label; while (t && x.measureText(t).width > W - 56) t = t.slice(0, -2);
  x.fillText(t === label ? t : t + '…', 28, 240);
}
function roundRect(x, X, Y, w, h, r){ x.beginPath(); x.moveTo(X+r,Y); x.arcTo(X+w,Y,X+w,Y+h,r); x.arcTo(X+w,Y+h,X,Y+h,r); x.arcTo(X,Y+h,X,Y,r); x.arcTo(X,Y,X+w,Y,r); x.closePath(); }
function updateMini(f, fr){
  if (pipWin){
    const d = pipWin.document, k = tokens(), b = d.body;
    if (!d.getElementById('pt')) return;
    Object.entries({'--bg':k.bg,'--ink':k.ink,'--cur':k.cur,'--muted':k.muted,'--soft':k.soft,'--onacc':k.onacc,'--digits':k.digits,'--dweight':k.weight}).forEach(([n,v]) => b.style.setProperty(n, v));
    d.getElementById('pl').textContent = phaseName();
    d.getElementById('pt').innerHTML = f.text + (f.unit ? `<small>${f.unit}</small>` : '');
    d.getElementById('pb').style.width = (fr * 100) + '%';
    d.getElementById('pk').textContent = [P.task, P.tag].filter(Boolean).join(' · ');
    d.getElementById('pp').textContent = S.running ? 'Pause' : 'Start';
    d.getElementById('sk').textContent = P.mode === 'stopwatch' ? 'Done' : countUp() ? 'Break' : 'Skip';
    pipWin.document.title = f.text;
  }
  if (pipVideo && document.pictureInPictureElement === pipVideo) drawPip(f, fr);
}
function setupMedia(){
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try { ms.setActionHandler('play', () => { start(); pipVideo && pipVideo.play(); }); } catch(e){}
  try { ms.setActionHandler('pause', () => { pause(); pipVideo && pipVideo.play(); }); } catch(e){}
  try { ms.setActionHandler('nexttrack', () => skip()); } catch(e){}
  updateMedia();
}
function updateMedia(){
  if (!('mediaSession' in navigator) || !pipVideo) return;
  try {
    navigator.mediaSession.playbackState = S.running ? 'playing' : 'paused';
    if ('MediaMetadata' in window) navigator.mediaSession.metadata = new MediaMetadata({title: phaseName(), artist: P.task || P.tag || 'Focus Bench'});
  } catch(e){}
}

/* ---------- focus mode ---------- */
function toggleFocusMode(){
  const on = !document.body.classList.contains('focus-mode'); if (on) achBump('focusMode');
  document.body.classList.toggle('focus-mode', on);
  try {
    if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch(e){}
  renderAll();
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('focus-mode')){ document.body.classList.remove('focus-mode'); renderAll(); } });

/* ---------- toast ---------- */
let toastT;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3800); }

/* ---------- events ---------- */
$('#startBtn').onclick = toggle;
$('#resetBtn').onclick = () => reset();
$('#skipBtn').onclick = skip;
$('#miniBtn').onclick = toggleMini;
$('#focusBtn').onclick = toggleFocusMode;
function onModeClick(e){
  const b = e.target.closest('[data-mode]'); if (!b || b.dataset.mode === P.mode) return;
  if (S.running && S.phase === 'focus'){ const el = focusElapsed(); if (el >= 60000) logFocus(el); }
  const saved = savePartial();                       // save what you'd focused in the old mode first
  P.mode = b.dataset.mode; saveP(); S.flowBreakMin = 5; resetCycle(true); renderTimerPane();
  if (saved) toast(`Saved ${saved} min to your log.`);
}
$('#modes').onclick = $('#modesSet').onclick = onModeClick;
$('#task').value = P.task;
$('#task').addEventListener('input', e => { P.task = e.target.value; saveP(); updateMedia(); queueTaskSwitch(); });
$('#task').addEventListener('change', () => flushTaskSwitch());
$('#task').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('#tagSel').addEventListener('change', e => { P.tag = e.target.value; saveP(); flushTaskSwitch(); });
$('#autoBreak').onchange = e => { P.autoBreak = e.target.checked; saveP(); };
$('#autoFocus').onchange = e => { P.autoFocus = e.target.checked; saveP(); };
$('#goal').onchange = e => { P.goalMin = Math.min(720, Math.max(15, Math.round((parseInt(e.target.value,10) || 120) / 5) * 5)); e.target.value = P.goalMin; saveP(); renderLog(); };
$('#tagList').onclick = e => { const b = e.target.closest('button'); if (!b) return; P.tags.splice(+b.dataset.i, 1); saveP(); renderTags(); };
function addTag(){ const v = $('#newTag').value.trim(); if (!v) return; if (!P.tags.includes(v)){ P.tags.push(v); achBump('tagsAdded'); } P.tag = v; $('#newTag').value = ''; saveP(); renderTags(); }
$('#addTag').onclick = addTag;
$('#newTag').onkeydown = e => { if (e.key === 'Enter') addTag(); };
$('#volume').oninput = e => { P.volume = +e.target.value; saveP(); };
$('#testChime').onclick = () => chime(P.chime === 'none' ? 'bell' : P.chime);
$('#tick').onchange = e => { P.tick = e.target.checked; saveP(); };
$('#ambVol').oninput = e => { P.ambVol = +e.target.value; saveP(); updateAmbient(); };
$('#ambFocusOnly').onchange = e => { P.ambFocusOnly = e.target.checked; saveP(); updateAmbient(); };
$('#ambPreview').onclick = () => { ac(); if (P.ambient === 'off'){ toast('Pick a background sound first.'); return; } ambPreview = !ambPreview; updateAmbient(); };
$('#thunderNow').onclick = () => playThunder();
$('#showSeconds').onchange = e => { P.showSeconds = e.target.checked; saveP(); renderAll(); };
$('#swatches').onclick = e => { const b = e.target.closest('button'); if (!b) return; P.accent = b.dataset.k; saveP(); renderAll(); renderLookSound(); };
$('#themeGrid').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; P.theme = b.dataset.t; saveP(); renderAll(); renderLookSound(); };
$('#accentPick').oninput = e => { P.accent = 'custom'; P.customAccent = e.target.value; saveP(); applyLook(); renderTime(); };
$('#accentPick').onchange = () => renderLookSound();
$('#breakPick').oninput = e => { P.breakColor = e.target.value; saveP(); applyLook(); renderTime(); };
$('#breakPick').onchange = () => renderLookSound();
$('#breakAuto').onclick = () => { P.breakColor = 'auto'; saveP(); renderAll(); renderLookSound(); };
$('#timerSize').oninput = e => { P.timerSize = +e.target.value; saveP(); applyLook(); };
$('#ticksOn').onchange = e => { P.ticks = e.target.checked; saveP(); applyLook(); };
$('#resetLook').onclick = () => { LOOK_KEYS.forEach(k => P[k] = clone(DEFAULTS)[k]); saveP(); renderAll(); renderLookSound(); toast('Look reset to default.'); };
new MutationObserver(() => { renderAll(); renderLookSound(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
function addNote(){ const v = $('#noteIn').value.trim(); if (!v) return; achBump('notes'); NOTES.unshift({id:Date.now().toString(36), text:v, done:false}); $('#noteIn').value = ''; saveNotes(); renderNotes(); }
$('#noteAdd').onclick = addNote;
$('#noteIn').onkeydown = e => { if (e.key === 'Enter') addNote(); };
const noteClick = e => {
  const ab = e.target.closest('[data-arch]'), ub = e.target.closest('[data-unarch]');
  if (ab){ const n = NOTES.find(x => x.id === ab.dataset.arch); if (n){ n.arch = Date.now(); saveNotes(); renderNotes(); undoToast('Note archived', () => { delete n.arch; saveNotes(); renderNotes(); }); } }
  else if (ub){ const n = NOTES.find(x => x.id === ub.dataset.unarch); if (n){ delete n.arch; saveNotes(); renderNotes(); } }
  else if (e.target.dataset.del){ NOTES = NOTES.filter(n => n.id !== e.target.dataset.del); saveNotes(); renderNotes(); }
  else if (e.target.dataset.id){ const n = NOTES.find(n => n.id === e.target.dataset.id); if (n){ n.done = e.target.checked; if (n.done) achBump('notesDone'); saveNotes(); renderNotes(); } }
};
$('#noteList').onclick = noteClick; $('#noteArch').onclick = noteClick;
$('#noteArch').addEventListener('toggle', e => { if (e.target.tagName === 'DETAILS') noteArchOpen = e.target.open; }, true);
$('#noteArchAll').onclick = () => {
  const hit = NOTES.filter(n => n.done && !n.arch); if (!hit.length){ toast('Check a note first.'); return; }
  const t = Date.now(); hit.forEach((n, k) => n.arch = t + k); saveNotes(); renderNotes();
  undoToast(hit.length === 1 ? 'Note archived' : `${hit.length} notes archived`, () => { hit.forEach(n => delete n.arch); saveNotes(); renderNotes(); });
};
$('#noteClear').onclick = () => { NOTES = NOTES.filter(n => !n.done || n.arch); saveNotes(); renderNotes(); };
document.addEventListener('keydown', e => {
  const t = e.target;
  if (e.metaKey || e.ctrlKey || e.altKey || t.matches('input, textarea, select')) return;
  if (e.key === 'Escape') $('#nav').classList.remove('more-open');
  if (typeof runShortcut === 'function') runShortcut(e);      // your shortcuts (js/keys.js)
});
/* hiding the side panel (computers only; phones use the bottom bar), remembered between visits */
function applySide(){ document.body.classList.toggle('side-hidden', !!P.sideHidden); }
// The layout changes once; the page then slides into place with a transform (cheap), instead of the column
// width animating, which made the browser re-lay out the whole page on every frame.
function toggleSide(){
  const main = document.querySelector('.main'), desk = matchMedia('(min-width:761px)').matches && !document.body.classList.contains('focus-mode');
  const x0 = desk && main ? main.getBoundingClientRect().left : 0;
  P.sideHidden = !P.sideHidden; saveP(); applySide();
  if (desk && main && motion() !== 'off'){
    const dx = x0 - main.getBoundingClientRect().left;
    if (dx) main.animate([{transform: `translateX(${dx}px)`}, {transform: 'none'}], {duration: 260, easing: 'cubic-bezier(.4,0,.2,1)'});
  }
  const f = P.sideHidden ? $('#sideShow') : $('#sideHide'); if (f && f.getClientRects().length) f.focus({preventScroll: true});
  if (P.sideHidden && !P.sideTip){ P.sideTip = 1; saveP(); toast('Hover the left edge or press \\ to bring the panel back.'); }
}
$('#sideHide').onclick = toggleSide;
$('#sideShow').onclick = toggleSide;
applySide();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { renderAll(); renderLookSound(); });

