/* ---------- study streak ---------- */
// A day counts toward your streak once you've logged at least 10 minutes on it.
const STREAK_MIN = 10;
function streakInfo(){
  const byDay = {};
  LOG.forEach(s => { const k = dayKey(s.t); byDay[k] = (byDay[k] || 0) + s.min; });
  const counts = k => (byDay[k] || 0) >= STREAK_MIN;
  const d = new Date(); d.setHours(12, 0, 0, 0);
  const today = dayKey(d), todayMin = byDay[today] || 0, doneToday = counts(today);
  if (!doneToday) d.setDate(d.getDate() - 1);
  let cur = 0; while (counts(dayKey(d))){ cur++; d.setDate(d.getDate() - 1); }
  const best = Math.max(cur, streakOf(Object.keys(byDay).filter(counts).sort()));
  const state = doneToday ? 'on' : cur > 0 ? 'risk' : 'off';
  const week = [...Array(7)].map((_, i) => { const x = startOfWeek(new Date()); x.setDate(x.getDate() + i); const k = dayKey(x); return {k, label: x.toLocaleDateString(undefined, {weekday:'narrow'}), on: counts(k), today: k === today, future: k > today}; });
  return {cur, best, state, todayMin, left: Math.max(0, STREAK_MIN - todayMin), week};
}
const FLAME = '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/></svg>';
function renderStreak(){
  const chip = $('#streakChip'); if (!chip) return;
  const s = streakInfo();
  chip.dataset.state = s.state; $('#streakPop').dataset.state = s.state;
  $('#streakN').textContent = s.cur;
  $('#streakTxt').textContent = s.state === 'off' ? 'No streak yet' : `day streak${s.state === 'risk' ? ' · study today' : ''}`;
  chip.title = s.state === 'risk' ? `Study ${s.left} more minutes today to keep your streak.` : '';
  $('#streakBig').textContent = s.cur;
  $('#streakBest').textContent = `Best: ${s.best} day${s.best === 1 ? '' : 's'}`;
  $('#streakWeek').innerHTML = s.week.map(w => `<span class="sw${w.on ? ' on' : ''}${w.today ? ' today' : ''}${w.future ? ' future' : ''}"><i></i>${w.label}</span>`).join('');
  $('#streakMsg').textContent = s.state === 'on' ? `You're covered for today. Come back tomorrow to make it ${s.cur + 1}.`
    : s.state === 'risk' ? `Study ${s.left} more minute${s.left === 1 ? '' : 's'} today to make it ${s.cur + 1}. Miss today and it resets.`
    : s.todayMin > 0 ? `${s.left} more minute${s.left === 1 ? '' : 's'} today starts a new streak.` : `Study ${STREAK_MIN} minutes today to start a streak.`;
}
$('#streakChip').onclick = e => { e.stopPropagation(); const pop = $('#streakPop'); pop.hidden = !pop.hidden; $('#streakChip').setAttribute('aria-expanded', !pop.hidden); };
document.addEventListener('click', e => { if (!e.target.closest('.streak-wrap')) { $('#streakPop').hidden = true; $('#streakChip').setAttribute('aria-expanded', 'false'); } });
// catch the day changing at midnight, and a running block crossing the 10-minute mark
let streakDay = dayKey(Date.now());
setInterval(() => { if (dayKey(Date.now()) !== streakDay){ streakDay = dayKey(Date.now()); renderLog(); } }, 60000);

/* ---------- pages & navigation ---------- */
const PAGE_ALIAS = {log:'stats', cal:'stats', timer:['settings','set-timer'], sound:['settings','set-sound'], look:['settings','set-look']};
function showPage(name, sec){
  const el = $('#page-' + name); if (!el) return;
  document.querySelectorAll('.page').forEach(p => {
    const on = p === el;
    if (on && p.hidden){ p.classList.remove('pane-in'); void p.offsetWidth; p.classList.add('pane-in'); }
    p.hidden = !on;
  });
  document.querySelectorAll('.nav-btn[data-page]').forEach(b => b.dataset.page === name ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  $('#moreBtn').classList.toggle('on', ['guides','music','notes','settings','whatsnew'].includes(name) || (name === 'chat' && matchMedia('(max-width:760px)').matches) || (name === 'leaders' && matchMedia('(max-width:760px)').matches));
  $('#nav').classList.remove('more-open');
  $('#pageTitle').textContent = el.dataset.title;
  document.body.dataset.page = name;
  if (P.page !== name && name !== 'profile'){ P.page = name; saveP(); }
  if (name !== 'profile') profPrev = name;
  if (name === 'stats'){ renderLog(); const w = $('#week'); w.classList.remove('grow'); void w.offsetWidth; w.classList.add('grow'); }
  if (name === 'awards'){ achBump('awards'); renderAwards(); }
  if (typeof onPageShown === 'function') onPageShown(name);
  if (sec){ const t = $('#' + sec); if (t){ if (name === 'settings') setTocOn(sec, true); setTimeout(() => t.scrollIntoView({behavior: motion() === 'off' ? 'auto' : 'smooth', block: 'start'}), 30); } }
  else window.scrollTo(0, 0);
  if (name === 'settings' && !sec) requestAnimationFrame(updateToc);
}
function openTab(name){ const a = PAGE_ALIAS[name] || name; Array.isArray(a) ? showPage(a[0], a[1]) : showPage(a); }
$('#nav').addEventListener('click', e => {
  const b = e.target.closest('.nav-btn[data-page]');
  if (b){ if (b.dataset.page === 'feed' && !$('#page-feed').hidden && window.scrollY > 0){ feedToTop(); return; } showPage(b.dataset.page); return; }
  if (e.target.closest('#moreBtn')) $('#nav').classList.toggle('more-open');
});
document.addEventListener('click', e => {
  if (!e.target.closest('#nav')) $('#nav').classList.remove('more-open');
  const g = e.target.closest('[data-go]');
  if (g){ e.preventDefault(); showPage(g.dataset.go, g.dataset.sec); }
  const a = e.target.closest('.toc a[data-sec]');
  if (a){ e.preventDefault(); setTocOn(a.dataset.sec, true); $('#' + a.dataset.sec).scrollIntoView({behavior: motion() === 'off' ? 'auto' : 'smooth', block: 'start'}); }
});
// highlight the settings section you're looking at: the last one whose top has passed 30% of the screen,
// the last section once you're at the bottom (short ones there can't scroll up that far), or the one you just clicked
let tocPick = null, tocPickAt = 0;
function setTocOn(id, picked){
  if (picked){ tocPick = id; tocPickAt = Date.now(); }
  document.querySelectorAll('.toc a').forEach(a => a.classList.toggle('on', a.dataset.sec === id));
}
function updateToc(){
  const secs = [...document.querySelectorAll('.set')].filter(x => x.offsetParent);
  if (!secs.length) return;
  const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
  if (tocPick && Date.now() - tocPickAt < 1500) return;           // still scrolling to the one you clicked
  if (atBottom && tocPick && secs.some(x => x.id === tocPick && x.getBoundingClientRect().top < innerHeight)) return setTocOn(tocPick);
  tocPick = null;
  let cur = secs[0].id;
  secs.forEach(x => { if (x.getBoundingClientRect().top <= innerHeight * 0.3) cur = x.id; });
  if (atBottom) cur = secs[secs.length - 1].id;
  setTocOn(cur);
}
let tocRaf = 0;
addEventListener('scroll', () => { if (!tocRaf) tocRaf = requestAnimationFrame(() => { tocRaf = 0; updateToc(); }); }, {passive: true});
addEventListener('resize', updateToc);
$('#achBtn').onclick = () => showPage('awards');

/* Stats summary tiles */
function renderKpis(){
  if (!$('#stWeek')) return;
  const wk = dayKey(startOfWeek(new Date())), byDay = {};
  LOG.forEach(s => { const k = dayKey(s.t); byDay[k] = (byDay[k] || 0) + s.min; });
  $('#stWeek').textContent = fmtMin(Object.entries(byDay).filter(([k]) => k >= wk).reduce((n, [, m]) => n + m, 0));
  $('#stBest').textContent = fmtMin(Math.max(0, ...Object.values(byDay)));
}
$('#sessScope').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const all = b.dataset.v === 'all';
  $('#sessScope').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  $('#sessDayWrap').hidden = all; $('#sessAllWrap').hidden = !all;
  if (all){ sessView = 'all'; logList.reset(); logList.render(); }
};

/* quick dock under the timer */
function renderDock(){
  const sOn = P.ambient !== 'off', sNames = {rain:'Rain', storm:'Storm', white:'White', pink:'Pink', brown:'Brown'};
  $('#dockSound').classList.toggle('on', sOn);
  $('#dockSoundState').textContent = sOn ? sNames[P.ambient] + (S.running || ambPreview ? ' · on' : ' · ready') : 'Off';
  const it = spWanted().it, playing = it && canEmbed() && !spPaused;
  $('#dockMusic').classList.toggle('on', !!playing);
  $('#dockMusicState').textContent = !it ? 'Add some' : !canEmbed() ? 'Open' : playing ? 'Playing' : 'Paused';
  $('#miniBtn').classList.toggle('on', miniOpen());
  $('#miniBtn small').textContent = miniOpen() ? 'Open' : 'Pop out';
}
$('#dockSound').onclick = () => {
  if (P.ambient === 'off') P.ambient = P.lastAmb || 'rain'; else { P.lastAmb = P.ambient; P.ambient = 'off'; }
  saveP(); ac(); prewarm(); updateAmbient(); renderLookSound(); renderDock();
  toast(P.ambient === 'off' ? 'Background sound off.' : `${$('#dockSoundState').textContent.split(' ·')[0]} sound on. It plays while the timer runs.`);
};
$('#dockMusic').onclick = () => {
  const it = spWanted().it;
  if (!it){ showPage('music'); return; }
  if (!canEmbed()){ window.open(spUrl(it), '_blank', 'noopener'); return; }
  spPaused ? spPlay() : spPause();
  setTimeout(renderDock, 300);
};
setInterval(() => { if (!document.hidden) renderDock(); }, 1000);

/* parking lot on the Focus page */
function renderQuickNotes(){
  if (!$('#qNoteList')) return;
  const open = NOTES.filter(n => !n.done).slice(0, 5);
  $('#qNoteList').innerHTML = open.map(n => `<li><input type="checkbox" data-id="${n.id}" aria-label="Done"><span>${esc(n.text)}</span></li>`).join('')
    || '<li style="border:0"><span class="hint" style="margin:0">Nothing parked.</span></li>';
}
function addQuickNote(){ const v = $('#qNoteIn').value.trim(); if (!v) return; achBump('notes'); NOTES.unshift({id: Date.now().toString(36), text: v, done: false}); $('#qNoteIn').value = ''; saveNotes(); renderNotes(); }
$('#qNoteAdd').onclick = addQuickNote;
$('#qNoteIn').onkeydown = e => { if (e.key === 'Enter') addQuickNote(); };
$('#qNoteList').onchange = e => { const n = NOTES.find(x => x.id === e.target.dataset.id); if (n){ n.done = true; achBump('notesDone'); saveNotes(); renderNotes(); } };

/* ---------- boot ---------- */
applyLook(); renderTimerPane(); renderLookSound(); renderLog(); renderNotes(); renderAll(); renderMusic();
requestAnimationFrame(moveTabInk);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveTabInk);
prewarm();
document.querySelectorAll('.fl').forEach(f => f.innerHTML = FLAME);
renderAchHeader(); checkAch(); renderStreak(); renderMatch(); renderRankChip();
showPage(P.page && $('#page-' + P.page) ? P.page : 'focus');
if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderTime);

// while a pop-up window is open, the page behind it doesn't scroll (on phones you'd otherwise scroll the hidden page)
{
  let lockY = 0, locked = false;
  const check = () => {
    const open = [...document.querySelectorAll('.modal')].some(m => !m.hidden && getComputedStyle(m).display !== 'none');
    if (open === locked) return; locked = open;
    // the page stays exactly where it is (pinning the body in place shifted the side panels, which stick to the window);
    // the scrollbar's width is kept as padding so nothing jumps sideways
    const h = document.documentElement, b = document.body;
    if (open){ lockY = window.scrollY; const sb = window.innerWidth - h.clientWidth; h.style.overflow = 'hidden'; b.style.overscrollBehavior = 'none'; if (sb > 0) b.style.paddingRight = sb + 'px'; }
    else { h.style.overflow = ''; b.style.overscrollBehavior = ''; b.style.paddingRight = ''; if (Math.abs(window.scrollY - lockY) > 2) window.scrollTo(0, lockY); }
  };
  new MutationObserver(check).observe(document.body, {subtree: true, attributes: true, attributeFilter: ['hidden'], childList: true});
}
