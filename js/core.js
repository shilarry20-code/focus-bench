const $ = s => document.querySelector(s);
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
const clone = o => JSON.parse(JSON.stringify(o));
function merge(a, b){
  if (!b || typeof b !== 'object') return a;
  for (const k in b){
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
}

const MODES = {
  pomodoro:{name:'Pomodoro', hint:'Short focus sprints with a longer break every few rounds. Good for getting started on something you are avoiding.'},
  fifty:{name:'52 / 17', hint:'Longer focus blocks with a real break. Good for reading and writing once you are warmed up.'},
  flow:{name:'Flowtime', hint:'The clock counts up. Work until your focus fades, then press "Take break". Your break length scales with how long you worked.'},
  stopwatch:{name:'Stopwatch', hint:'The clock counts up with no breaks. Start it when you begin an assignment and press "Done" when you finish. The whole session is logged as one entry. You can pause it anytime, and it survives a page reload.'},
  timebox:{name:'Timebox', hint:'One countdown for one task. When time is up, you stop and move on.'},
  custom:{name:'Custom', hint:'Set your own focus, break and round lengths.'}
};
const ACCENTS = {cobalt:['#2f54d6','#8ea7ff'], sky:['#0a6fae','#6cc4f5'], teal:['#0e7471','#4fd1c5'], pine:['#14705a','#56d3ad'], lime:['#4d7c0f','#a3e635'], amber:['#b45309','#fbbf24'], tomato:['#d23f2a','#ff7d66'], rose:['#be1d58','#ff7aa8'], violet:['#6d43d0','#b8a0ff'], graphite:['#1d2433','#e3e8f0']};
const THEMES = {
  auto:{name:'Match device'},
  light:{name:'Light', bg:'#eceff4',surface:'#fbfcfe',ink:'#151b27',muted:'#5d677a',line:'#d6dce6',soft:'#e4e8f0',rest:'#b4720c'},
  dark:{name:'Dark', dark:1, bg:'#0e1219',surface:'#161b25',ink:'#e6eaf1',muted:'#8f99ab',line:'#283143',soft:'#1e2532',rest:'#f0b44c'},
  black:{name:'Pure black', dark:1, bg:'#000000',surface:'#0b0b0c',ink:'#f2f2f2',muted:'#8c8c8c',line:'#232323',soft:'#18181a',rest:'#f5b342'},
  midnight:{name:'Midnight', dark:1, bg:'#0a0f24',surface:'#111836',ink:'#e6eaff',muted:'#8a93c2',line:'#232d5a',soft:'#1a2247',rest:'#ffb86b'},
  ocean:{name:'Ocean', dark:1, bg:'#06171f',surface:'#0c2430',ink:'#dff2f7',muted:'#7fa5b3',line:'#1a3a47',soft:'#13303c',rest:'#ffb38a'},
  forest:{name:'Forest', dark:1, bg:'#0d1712',surface:'#15231b',ink:'#e1eee5',muted:'#86a091',line:'#25382c',soft:'#1c2d23',rest:'#e8c15a'},
  plum:{name:'Plum', dark:1, bg:'#170e1d',surface:'#22162b',ink:'#f1e6f6',muted:'#a58db3',line:'#382645',soft:'#2c1e37',rest:'#ffb36b'},
  paper:{name:'Paper', bg:'#ebe5da',surface:'#f6f2ea',ink:'#2f281f',muted:'#77695a',line:'#d8ccb8',soft:'#e3dacb',rest:'#a8661a'},
  mint:{name:'Mint', bg:'#e5f2ec',surface:'#f6fcf9',ink:'#13241d',muted:'#58736a',line:'#cbe1d7',soft:'#d9ebe3',rest:'#b06c10'},
  blush:{name:'Blush', bg:'#f6eaee',surface:'#fff8fa',ink:'#2e1b22',muted:'#7d606a',line:'#e9d2da',soft:'#f0dee4',rest:'#b8642c'},
  sky:{name:'Sky', bg:'#e6eff8',surface:'#f7fbff',ink:'#122033',muted:'#56687e',line:'#cddcec',soft:'#dbe7f3',rest:'#c0691a'}
};
const DIGIT_FONTS = {
  condensed:['Tall',"'Big Shoulders Display','Arial Narrow',sans-serif",1],
  mono:['Mono',"'JetBrains Mono',ui-monospace,Menlo,monospace",.7],
  rounded:['Round',"'Fredoka','Nunito',sans-serif",.8],
  serif:['Serif',"'Fraunces',Georgia,serif",.78],
  elegant:['Elegant',"'Playfair Display',Georgia,serif",.8],
  digital:['Digital',"'Orbitron',sans-serif",.6],
  pixel:['Pixel',"'VT323',monospace",1.05],
  hand:['Handwritten',"'Caveat',cursive",1.05],
  heavy:['Heavy',"'Archivo Black',Impact,sans-serif",.66],
  system:['System',"system-ui,-apple-system,'Segoe UI',sans-serif",.78]
};
const UI_FONTS = {
  figtree:['Figtree',"'Figtree',system-ui,sans-serif"],
  lexend:['Lexend',"'Lexend',system-ui,sans-serif"],
  nunito:['Nunito',"'Nunito',system-ui,sans-serif"],
  serif:['Serif',"'Source Serif 4',Georgia,serif"],
  mono:['Mono',"'JetBrains Mono',ui-monospace,monospace"],
  system:['System',"system-ui,-apple-system,'Segoe UI',sans-serif"]
};
const WEIGHTS = {light:300, regular:500, bold:800};
const RINGS = {thin:6, medium:14, thick:24};
const RADII = {sharp:[3,3,4], boxy:[10,8,10], soft:[22,12,999], round:[32,18,999]};
const LOOK_KEYS = ['motion','theme','accent','customAccent','breakColor','style','digits','weight','uiFont','timerSize','ring','ticks','showSeconds','radius','texture','mini'];
const DEFAULTS = {
  mode:'pomodoro',
  modes:{ pomodoro:{focus:25,short:5,long:15,rounds:4}, fifty:{focus:52,short:17}, custom:{focus:45,short:10,long:20,rounds:3}, timebox:{focus:60}, flow:{ratio:5,minBreak:3} },
  autoBreak:true, autoFocus:false, goal:6, goalMin:120,
  chime:'bell', volume:.7, tick:false, ambient:'off', thunder:'some', ambVol:.35, ambFocusOnly:true,
  accent:'cobalt', customAccent:'#e0457b', breakColor:'auto', theme:'auto', style:'ring', digits:'condensed', weight:'bold', uiFont:'figtree', timerSize:1, ring:'medium', ticks:true, radius:'soft', texture:'none', showSeconds:true, mini:'m', calView:'week', motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'full',
  tags:['Homework','Reading','Project','Exam prep'], tag:'Homework', task:'',
  music:{list:[], current:null, autoStart:true, breakMode:'pause', breakId:null, byTag:{}, pauseTimer:true, size:'normal'}
};
let P = merge(clone(DEFAULTS), store.get('fb.settings', {}));
if (JSON.stringify(P.tags) === JSON.stringify(['CNIT 17600','Design project','General'])){ P.tags = clone(DEFAULTS.tags); P.tag = DEFAULTS.tag; }
// the daily goal is minutes studied now (it used to be a number of focus blocks): start from about what the old one meant
if (!P.goalMinV){ P.goalMin = Math.min(720, Math.max(15, Math.round((P.goal || 6) * 25 / 15) * 15)); P.goalMinV = 1; store.set('fb.settings', P); }
let LOG = store.get('fb.log', []);
let NOTES = store.get('fb.notes', []);
const saveP = () => store.set('fb.settings', P);

/* ---------- timer state ---------- */
let S = merge({phase:'focus', round:1, remaining:null, flowAcc:0, flowBreakMin:5, segOff:0, segTask:null, segTag:null, segAt:0}, store.get('fb.state', {}));
S.running = false;
function durMs(phase){
  const m = P.mode, c = P.modes[m];
  if (m === 'stopwatch') return 0;
  if (m === 'timebox') return c.focus * 60000;
  if (m === 'flow') return phase === 'focus' ? 0 : S.flowBreakMin * 60000;
  if (m === 'fifty') return (phase === 'focus' ? c.focus : c.short) * 60000;
  return c[phase] * 60000;
}
if (P.mode === 'stopwatch') S.phase = 'focus';
if (S.remaining == null || (P.mode !== 'flow' && S.remaining > durMs(S.phase))) S.remaining = durMs(S.phase);
const countUp = () => (P.mode === 'flow' || P.mode === 'stopwatch') && S.phase === 'focus';
const remaining = () => S.running ? Math.max(0, S.endAt - Date.now()) : S.remaining;
const flowElapsed = () => S.flowAcc + (S.running ? Date.now() - S.flowStart : 0);
const focusElapsed = () => countUp() ? flowElapsed() : durMs('focus') - remaining();
const saveState = () => store.set('fb.state', {phase:S.phase, round:S.round, remaining:remaining(), flowAcc:countUp()?flowElapsed():S.flowAcc, flowBreakMin:S.flowBreakMin, segOff:S.segOff, segTask:S.segTask, segTag:S.segTag, segAt:S.segAt});
const notStarted = () => countUp() ? S.flowAcc === 0 && !S.running : !S.running && S.remaining === durMs(S.phase);

function start(){
  if (S.running) return;
  if (S.segTask == null || !blockStarted()){ S.segTask = (P.task || '').trim(); S.segTag = P.tag; S.segAt = Date.now(); S.segOff = blockStarted() ? S.segOff : 0; }
  ac();
  if (countUp()) S.flowStart = Date.now();
  else { if (S.remaining <= 0) S.remaining = durMs(S.phase); S.endAt = Date.now() + S.remaining; }
  S.running = true; wake(true); changed();
}
function pause(){
  if (!S.running) return;
  if (countUp()) S.flowAcc += Date.now() - S.flowStart;
  else S.remaining = Math.max(0, S.endAt - Date.now());
  S.running = false; wake(false); changed();
}
const toggle = () => S.running ? pause() : start();
// time already focused in this block (a minute or more) is saved to your log, like Skip and Break do
function savePartial(){
  if (S.phase !== 'focus') return 0;
  const el = focusElapsed(), m = Math.round((el - (S.segOff || 0)) / 60000);
  if (el - (S.segOff || 0) < 60000) return 0;
  logFocus(el); return m;
}
function reset(noSave){
  achBump('resets');
  const short = !noSave && S.phase === 'focus' && focusElapsed() - (S.segOff || 0) > 0 && focusElapsed() - (S.segOff || 0) < 60000;
  const saved = noSave ? 0 : savePartial();
  S.segOff = 0; S.segTask = null; S.running = false; S.flowAcc = 0; S.remaining = durMs(S.phase); wake(false); changed();
  if (saved) toast(`Saved ${saved} min to your log.`);
  else if (short) toast('Under a minute, so nothing was logged.');
}
function resetCycle(noSave){ S.phase = 'focus'; S.round = 1; reset(noSave); }

function advance(autoStart){
  S.segOff = 0; S.segTask = null;
  S.running = false;
  const m = P.mode;
  if (m === 'timebox'){ S.phase = 'focus'; }
  else if (S.phase === 'focus'){
    const r = (m === 'fifty') ? 0 : P.modes[m].rounds || 0;
    S.phase = (r > 0 && S.round % r === 0) ? 'long' : 'short';
  } else {
    S.round = S.phase === 'long' ? 1 : S.round + 1;
    S.phase = 'focus';
  }
  S.flowAcc = 0;
  S.remaining = durMs(S.phase);
  if (autoStart) { S.running = false; start(); } else { wake(false); changed(); }
}
function flowBreak(){
  const el = flowElapsed();
  if (el < 60000){ toast('Focus for at least a minute before taking a break.'); return; }
  logFocus(el);
  const f = P.modes.flow;
  S.flowBreakMin = Math.max(f.minBreak, Math.round(el / 60000 / f.ratio));
  S.running = false; S.flowAcc = 0; S.phase = 'short'; S.remaining = durMs('short');
  toast(`Nice. You earned a ${S.flowBreakMin} minute break.`);
  if (P.autoBreak) start(); else { wake(false); changed(); }
}
// Stopwatch: log everything since Start as one session, celebrate, and reset to 0:00
function finishStopwatch(){
  flushTaskSwitch();
  const el = flowElapsed();
  S.running = false; S.flowAcc = 0; wake(false);
  if (el - (S.segOff || 0) < 60000){ const msg = S.segOff ? 'Done. Your earlier tasks are already logged.' : 'Under a minute, so nothing was logged.'; S.segOff = 0; S.segTask = null; toast(msg); changed(); return; }
  try { rankedTick(); } catch(e){}
  const prior = S.segOff || 0;
  logFocus(el);
  if (R && R.cur && R.cur.state === 'live') endMatch('done');
  chime(P.chime); fx.burst(); popDial();
  toast(prior ? `Done! ${fmtMin(Math.round(el / 60000))} in total. The last ${fmtMin(Math.round((el - prior) / 60000))} went to ${P.task.trim() || P.tag}.` : `Done! Logged ${fmtMin(Math.round(el / 60000))}${P.task ? ' on ' + P.task.trim() : ''}.`);
  changed();
}
function skip(){
  if (P.mode === 'stopwatch') return finishStopwatch();
  if (countUp()) return flowBreak();
  const was = S.running;
  if (S.phase === 'focus'){ const el = focusElapsed(); if (el >= 60000) logFocus(el); }
  advance(was);
}
function complete(){
  const ph = S.phase;
  chime(P.chime);
  if (ph === 'focus'){ logFocus(durMs('focus')); fx.burst(); }
  popDial();
  if (P.mode === 'timebox'){ toast("Time's up. Wrap up and move on."); advance(false); return; }
  toast(ph === 'focus' ? 'Focus block done. Time for a break.' : 'Break over. Back to it.');
  advance(ph === 'focus' ? P.autoBreak : P.autoFocus);
}
// Logs the end of a block. If you switched tasks partway through, the earlier part was already
// logged under the old task, so only the time since the switch goes to the current task.
function logFocus(ms){
  flushTaskSwitch();
  const min = Math.round((ms - (S.segOff || 0)) / 60000);
  S.segOff = 0; S.segTask = null;
  if (min < 1) return;
  LOG.push({t:Date.now(), min, task:(P.task||'').trim(), tag:P.tag, mode:P.mode});
  store.set('fb.log', LOG);
  renderLog();
}
/* splitting a block when you change what you're working on */
const blockStarted = () => S.phase === 'focus' && focusElapsed() > 0;
function segOwner(){ return {task: S.segTask != null ? S.segTask : (P.task || '').trim(), tag: S.segTag != null ? S.segTag : P.tag}; }
let taskSwitchT = null;
function flushTaskSwitch(){
  clearTimeout(taskSwitchT); taskSwitchT = null;
  const now = {task: (P.task || '').trim(), tag: P.tag};
  if (S.segTask == null){ S.segTask = now.task; S.segTag = now.tag; S.segAt = Date.now(); return; }
  const old = {task: S.segTask, tag: S.segTag}, norm = x => x.trim().toLowerCase().replace(/\s+/g, ' ');
  if (norm(old.task) === norm(now.task) && old.tag === now.tag){ S.segTask = now.task; saveState(); return; }
  // Not a switch, so the whole stretch just takes the new name:
  //  - the block had no name yet (same activity), or
  //  - you changed it again within a minute of your last change (still typing or fixing a typo)
  if ((!old.task && old.tag === now.tag) || Date.now() - (S.segAt || 0) < 60000){ S.segTask = now.task; S.segTag = now.tag; S.segAt = Date.now(); saveState(); return; }
  if (blockStarted()){
    const min = Math.round((focusElapsed() - (S.segOff || 0)) / 60000);
    if (min >= 1){
      LOG.push({t: Date.now(), min, task: old.task, tag: old.tag, mode: P.mode});
      store.set('fb.log', LOG);
      S.segOff = (S.segOff || 0) + min * 60000;
      renderLog();
      toast(`Logged ${fmtMin(min)} on ${old.task || old.tag}. Now tracking ${now.task || now.tag}.`);
    }
  }
  S.segTask = now.task; S.segTag = now.tag; S.segAt = Date.now(); saveState();
}
// typing goes through a short pause first, so a split happens once you've finished typing, not on every key
function queueTaskSwitch(){ clearTimeout(taskSwitchT); taskSwitchT = setTimeout(flushTaskSwitch, 1500); }

/* ---------- loop ---------- */
let lastSec = -1, lastSave = 0;
setInterval(() => {
  try { rankedTick(); } catch(e){}
  if (S.running && !countUp() && Date.now() >= S.endAt){ complete(); return; }
  if (S.running){
    const sec = Math.floor((countUp() ? flowElapsed() : remaining()) / 1000);
    if (sec !== lastSec){ lastSec = sec; if (P.tick && S.phase === 'focus') tickSound(); }
    if (Date.now() - lastSave > 5000){ lastSave = Date.now(); saveState(); }
  }
  renderTime();
}, 200);

/* ---------- formatting ---------- */
const pad = n => String(n).padStart(2, '0');
function fmt(ms, up){
  let sec = up ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);
  if (!P.showSeconds){
    const m = up ? Math.floor(sec / 60) : Math.ceil(sec / 60);
    return {text:String(m), unit:'min'};
  }
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return {text: h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`, unit:''};
}
function fmtMin(min){ const h = Math.floor(min / 60), m = min % 60; return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`; }
function phaseName(){
  if (S.phase === 'short') return P.mode === 'fifty' || P.mode === 'flow' ? 'Break' : 'Short break';
  if (S.phase === 'long') return 'Long break';
  if (P.mode === 'timebox') return 'Timebox';
  if (P.mode === 'flow') return 'Flow · counting up';
  if (P.mode === 'stopwatch') return 'Stopwatch · until done';
  return 'Focus';
}

/* ---------- render ---------- */
const C = 2 * Math.PI * 128;
const arc = $('#arc'); arc.style.strokeDasharray = C;
(function ticks(){
  const g = $('#ticks'); let h = '';
  for (let i = 0; i < 60; i++){
    const a = i / 60 * Math.PI * 2, major = i % 5 === 0, r1 = major ? 140 : 145, r2 = 152;
    h += `<line class="${major?'major':''}" x1="${160+Math.sin(a)*r1}" y1="${160-Math.cos(a)*r1}" x2="${160+Math.sin(a)*r2}" y2="${160-Math.cos(a)*r2}"/>`;
  }
  g.innerHTML = h;
})();

function frac(){
  if (countUp()) return (flowElapsed() % 3600000) / 3600000;
  const d = durMs(S.phase); return d ? remaining() / d : 0;
}
function renderTime(){
  const up = countUp();
  const f = fmt(up ? flowElapsed() : remaining(), up);
  setTimeText(f, up);
  const fr = frac();
  if (!(S.running && motion() !== 'off')) drawProgress(fr, false);
  document.title = S.running ? `${f.text}${f.unit ? ' min' : ''} · ${phaseName()}` : 'Focus Bench';
  updateMini(f, fr);
}
function renderAll(){
  const b = document.body;
  b.dataset.phase = S.phase === 'focus' ? 'focus' : 'break';
  b.dataset.style = P.style; b.dataset.digits = P.digits;
  b.dataset.run = S.running ? 'on' : 'off';
  b.classList.remove('m-full','m-subtle','m-off'); b.classList.add('m-' + motion());
  applyLook();

  $('#modes').innerHTML = $('#modesSet').innerHTML = Object.entries(MODES).map(([k,v]) => `<button class="chip" role="tab" data-mode="${k}" aria-selected="${k===P.mode}">${v.name}</button>`).join('');
  if ($('#setModeName')) $('#setModeName').textContent = MODES[P.mode].name;
  $('#phaseLabel').textContent = phaseName();
  const r = $('#rounds');
  if ((P.mode === 'pomodoro' || P.mode === 'custom') && P.modes[P.mode].rounds > 0){
    const n = P.modes[P.mode].rounds, cur = ((S.round - 1) % n) + 1;
    let h = '';
    for (let i = 1; i <= n; i++) h += `<i class="${i < cur || (i === cur && S.phase !== 'focus') ? 'done' : i === cur ? 'now' : ''}"></i>`;
    r.innerHTML = h; r.title = `Round ${cur} of ${n}`;
  } else if (P.mode === 'timebox' || P.mode === 'stopwatch') { r.textContent = ''; r.title=''; }
  else { r.textContent = `Round ${S.round}`; r.title=''; }
  $('#pausedTag').textContent = !S.running && !notStarted() ? 'Paused' : '';

  $('#startBtn').textContent = S.running ? 'Pause' : notStarted() ? (S.phase === 'focus' ? 'Start' : 'Start break') : 'Resume';
  $('#skipBtn').textContent = P.mode === 'stopwatch' ? 'Done' : countUp() ? 'Take break' : P.mode === 'timebox' ? 'Finish' : S.phase === 'focus' ? 'Skip' : 'End break';
  $('#miniBtn span').textContent = 'Mini clock';
  $('#miniBtn').classList.toggle('on', miniOpen());
  $('#focusBtn span').textContent = 'Focus mode'; $('#focusBtn small').textContent = b.classList.contains('focus-mode') ? 'Exit' : 'Full screen'; $('#focusBtn').classList.toggle('on', b.classList.contains('focus-mode'));
  if (typeof renderDock === 'function' && $('#dockSound')) renderDock();
  renderTime();
}
function changed(){ saveState(); renderAll(); updateAmbient(); updateMedia(); musicSync(); }

/* ---------- look ---------- */
function isDark(){
  const th = THEMES[P.theme];
  if (th && th.bg) return !!th.dark;
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
}
function lum(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0;
  const n = parseInt(m[1], 16), c = [n >> 16, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}
const onColor = hex => lum(hex) > .36 ? '#10141c' : '#ffffff';
const accentHex = () => P.accent === 'custom' ? P.customAccent : (ACCENTS[P.accent] || ACCENTS.cobalt)[isDark() ? 1 : 0];
function applyLook(){
  achSet('themes', P.theme); achSet('fonts', P.digits); if (P.accent === 'custom') achSet('accentUsed', 1);
  const r = document.documentElement.style, b = document.body, th = THEMES[P.theme] || THEMES.auto, dark = isDark();
  ['bg','surface','ink','muted','line','soft'].forEach(k => th[k] ? r.setProperty('--' + k, th[k]) : r.removeProperty('--' + k));
  r.colorScheme = th.bg ? (th.dark ? 'dark' : 'light') : '';
  const acc = accentHex(), rest = P.breakColor !== 'auto' ? P.breakColor : (th.rest || (dark ? '#f0b44c' : '#b4720c'));
  r.setProperty('--accent', acc); r.setProperty('--on-accent', onColor(acc));
  r.setProperty('--rest', rest); r.setProperty('--on-rest', onColor(rest));
  const D = DIGIT_FONTS[P.digits] || DIGIT_FONTS.condensed;
  b.style.setProperty('--digits', D[1]); b.style.setProperty('--dscale', D[2]);
  b.style.setProperty('--dweight', WEIGHTS[P.weight] || 800);
  r.setProperty('--f-body', (UI_FONTS[P.uiFont] || UI_FONTS.figtree)[1]);
  r.setProperty('--tscale', P.timerSize); r.setProperty('--ring', RINGS[P.ring] || 14);
  const R = RADII[P.radius] || RADII.soft;
  r.setProperty('--r-card', R[0] + 'px'); r.setProperty('--r-ctl', R[1] + 'px'); r.setProperty('--r-pill', R[2] + 'px');
  b.dataset.texture = P.texture; b.dataset.ticks = P.ticks ? 'on' : 'off';
  if ($('#week')) renderLog();
}

/* ---------- settings UI ---------- */
function numRow(id, label, sub, val, min, max){
  return `<div class="row"><label for="${id}">${label}${sub?`<span class="sub">${sub}</span>`:''}</label><input type="number" id="${id}" min="${min}" max="${max}" value="${val}"></div>`;
}
function renderTimerPane(){
  const m = P.mode, c = P.modes[m];
  $('#modeHint').textContent = MODES[m].hint; $('#modeHintFocus').textContent = MODES[m].hint;
  let h = '';
  if (m === 'pomodoro' || m === 'custom'){
    h += numRow('f-focus','Focus length','minutes',c.focus,1,240);
    h += numRow('f-short','Short break','minutes',c.short,1,60);
    h += numRow('f-long','Long break','minutes',c.long,1,90);
    h += numRow('f-rounds','Long break every','rounds (0 turns it off)',c.rounds,0,12);
  } else if (m === 'fifty'){
    h += numRow('f-focus','Focus length','minutes',c.focus,1,240);
    h += numRow('f-short','Break','minutes',c.short,1,60);
  } else if (m === 'flow'){
    h += numRow('f-ratio','Break ratio','break = focus time ÷ this number',c.ratio,2,10);
    h += numRow('f-minBreak','Shortest break','minutes',c.minBreak,1,30);
  } else if (m === 'stopwatch'){
    h = '';
  } else {
    h += numRow('f-focus','Timebox length','minutes',c.focus,1,480);
  }
  $('#modeFields').innerHTML = h;
  $('#modeFields').querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => {
    const key = inp.id.slice(2); let v = parseInt(inp.value, 10);
    const min = +inp.min, max = +inp.max;
    if (isNaN(v)) v = P.modes[m][key]; v = Math.min(max, Math.max(min, v)); inp.value = v;
    P.modes[m][key] = v; saveP();
    if (!S.running) S.remaining = durMs(S.phase);
    changed();
  }));
  $('#rowAutoBreak').hidden = m === 'timebox' || m === 'stopwatch';
  $('#rowAutoFocus').hidden = m === 'timebox' || m === 'stopwatch';
  $('#autoBreak').checked = P.autoBreak; $('#autoFocus').checked = P.autoFocus; $('#goal').value = P.goalMin;
  renderTags();
}
function renderTags(){
  if (!P.tags.length) P.tags = ['General'];
  if (!P.tags.includes(P.tag)) P.tag = P.tags[0];
  $('#tagSel').innerHTML = P.tags.map(t => `<option ${t===P.tag?'selected':''}>${esc(t)}</option>`).join('');
  $('#tagList').innerHTML = P.tags.map((t,i) => `<span>${esc(t)}<button data-i="${i}" aria-label="Remove ${esc(t)}">×</button></span>`).join('');
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function seg(el, opts, key, after){
  el.innerHTML = opts.map(([v,l]) => `<button data-v="${v}" aria-pressed="${P[key]===v}">${l}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return; P[key] = b.dataset.v; saveP(); seg(el, opts, key, after); after && after(); };
}
function renderLookSound(){
  seg($('#chimeSeg'), [['bell','Bell'],['wood','Wood'],['digital','Digital'],['rise','Rise'],['none','None']], 'chime', () => chime(P.chime));
  seg($('#ambSeg'), [['off','Off'],['rain','Rain'],['storm','Thunderstorm'],['white','White'],['pink','Pink'],['brown','Brown']], 'ambient', () => { ac(); prewarm(); updateAmbient(); $('#rowThunder').hidden = $('#rowThunderTest').hidden = P.ambient !== 'storm'; });
  seg($('#thunderSeg'), [['rare','Rare'],['some','Sometimes'],['often','Often']], 'thunder', () => { if (amb) scheduleThunder(amb); });
  $('#rowThunder').hidden = $('#rowThunderTest').hidden = P.ambient !== 'storm';
  seg($('#styleSeg'), [['ring','Ring'],['bar','Bar'],['digits','Big digits']], 'style', renderAll);
  seg($('#fontSeg'), Object.entries(DIGIT_FONTS).map(([k,v]) => [k, `<span style="font-family:${v[1].replace(/"/g,"'")}">${v[0]}</span>`]), 'digits', renderAll);
  seg($('#weightSeg'), [['light','Light'],['regular','Regular'],['bold','Bold']], 'weight', renderAll);
  seg($('#uiFontSeg'), Object.entries(UI_FONTS).map(([k,v]) => [k, `<span style="font-family:${v[1].replace(/"/g,"'")}">${v[0]}</span>`]), 'uiFont', renderAll);
  seg($('#ringSeg'), [['thin','Thin'],['medium','Medium'],['thick','Thick']], 'ring', renderAll);
  seg($('#radiusSeg'), [['sharp','Sharp'],['boxy','Boxy'],['soft','Soft'],['round','Round']], 'radius', renderAll);
  seg($('#textureSeg'), [['none','Plain'],['dots','Dots'],['grid','Grid'],['lines','Notebook'],['glow','Glow']], 'texture', renderAll);
  $('#themeGrid').innerHTML = Object.entries(THEMES).map(([k,t]) => {
    const pv = t.bg ? `background:${t.bg}` : 'background:linear-gradient(135deg,#eceff4 0 50%,#0e1219 50% 100%)';
    const bar = t.surface || '#8f99ab', dot = t.bg ? (ACCENTS[P.accent] ? ACCENTS[P.accent][t.dark ? 1 : 0] : P.customAccent) : 'var(--accent)';
    return `<button class="theme-btn" data-t="${k}" aria-pressed="${P.theme===k}"><span class="pv" style="${pv}"><i style="background:${bar}"></i><b style="background:${dot}"></b></span>${t.name}</button>`;
  }).join('');
  $('#accentPick').value = P.customAccent;
  $('#breakPick').value = P.breakColor !== 'auto' ? P.breakColor : getComputedStyle(document.documentElement).getPropertyValue('--rest').trim() || '#b4720c';
  $('#breakAuto').setAttribute('aria-pressed', P.breakColor === 'auto');
  $('#breakAuto').style.borderColor = P.breakColor === 'auto' ? 'var(--accent)' : '';
  $('#timerSize').value = P.timerSize; $('#ticksOn').checked = P.ticks;
  seg($('#miniSeg'), [['s','S'],['m','M'],['l','L']], 'mini');
  seg($('#motionSeg'), [['full','Full'],['subtle','Subtle'],['off','Off']], 'motion', () => { renderAll(); moveTabInk(); });
  $('#swatches').innerHTML = Object.entries(ACCENTS).map(([k,v]) => `<button data-k="${k}" aria-label="${k}" title="${k}" aria-pressed="${P.accent===k}" style="background:${v[isDark() ? 1 : 0]}"></button>`).join('')
    + `<button data-k="custom" aria-label="custom" title="Your custom color" aria-pressed="${P.accent==='custom'}" style="background:${P.customAccent}"></button>`;
  $('#volume').value = P.volume; $('#ambVol').value = P.ambVol;
  $('#tick').checked = P.tick; $('#ambFocusOnly').checked = P.ambFocusOnly; $('#showSeconds').checked = P.showSeconds;
}

