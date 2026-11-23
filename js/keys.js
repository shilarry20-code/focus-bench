/* ---------- keyboard shortcuts you can change or remove ----------
   Each shortcut has a default key; Settings → Keyboard shortcuts lets you pick another key (Shift combos too), remove it,
   turn them all off, or go back to the defaults. Changes are saved in your settings, so they sync to your other devices.
   (Ctrl, Cmd and Alt combos are left to the browser.) */
const KEY_ACTIONS = [
  {id: 'toggle', name: 'Start or pause', def: ' '},
  {id: 'reset', name: 'Log (save time so far and reset)', def: 'r'},
  {id: 'skip', name: 'Skip, or Done in Stopwatch', def: 's'},
  {id: 'mini', name: 'Mini clock', def: 'm'},
  {id: 'focus', name: 'Focus mode', def: 'f'},
  {id: 'side', name: 'Hide or show the side panel', def: '\\'},
  ...[['focus', 'Focus', '1'], ['stats', 'Stats', '2'], ['ranked', 'Ranked', '3'], ['leaders', 'Leaderboards', '4'], ['awards', 'Achievements', '5'],
      ['guides', 'Guides', '6'], ['notes', 'Notes', '8'], ['settings', 'Settings', '9'], ['chat', 'Chat', '']]
    .map(([pg, n, d]) => ({id: 'p:' + pg, name: `Go to ${n}`, def: d, page: pg}))
];
const keyOf = id => { const o = P.keys || {}; if (id in o) return o[id]; const a = KEY_ACTIONS.find(x => x.id === id); return a ? a.def : ''; };
// the key as stored: letters and digits by their place on the keyboard (so Shift+1 is still "1"), with "shift+" in front
function keyCombo(e){
  const c = e.code || '', base = /^Key[A-Z]$/.test(c) ? c.slice(3).toLowerCase() : /^Digit\d$/.test(c) ? c.slice(5) : c === 'Space' ? ' ' : e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  return (e.shiftKey && base.length === 1 && base !== ' ' && /[a-z0-9]/.test(base) ? 'shift+' : e.shiftKey && base === ' ' ? 'shift+' : '') + base;
}
const keyLabel = k => !k ? '' : k.split('+').map(p => p === ' ' ? 'Space' : p === 'shift' ? 'Shift' : p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)).join('+');
const KEY_RESERVED = new Set(['escape', 'tab', 'enter', 'shift', 'control', 'alt', 'meta', 'capslock', 'contextmenu']);

// the sidebar's little key badges follow your keys
function applyKeyBadges(){
  document.querySelectorAll('.nav-btn[data-page]').forEach(b => {
    let k = b.querySelector('kbd'); const lab = P.keysOff ? '' : keyLabel(keyOf('p:' + b.dataset.page));
    if (!k && lab){ k = document.createElement('kbd'); b.appendChild(k); }
    if (k){ k.textContent = lab; k.hidden = !lab; }
  });
}
let KB_CAP = null, KB_NOTE = '';
function renderKeySettings(){
  const el = $('#set-keys'); if (!el) return;
  const changed = Object.keys(P.keys || {}).length;
  el.innerHTML = `<h2>Keyboard shortcuts</h2>
    <div class="row"><label for="keysOn">Keyboard shortcuts<span class="sub">Click a key to change it, or ✕ to remove it. Shift combos work too.</span></label><input type="checkbox" class="switch" id="keysOn" ${P.keysOff ? '' : 'checked'}></div>
    <ul class="keyedit${P.keysOff ? ' off' : ''}">${KEY_ACTIONS.map(a => { const k = keyOf(a.id), cap = KB_CAP === a.id;
      return `<li><span class="ke-n">${esc(a.name)}</span><button class="ke-k${cap ? ' cap' : ''}${k ? '' : ' none'}" data-kb="${a.id}" ${P.keysOff ? 'disabled' : ''} aria-label="Change the key for ${esc(a.name)}">${cap ? 'Press a key…' : k ? `<kbd>${esc(keyLabel(k))}</kbd>` : 'None'}</button>${k && !cap ? `<button class="ch-x ke-x" data-kbx="${a.id}" aria-label="Remove the shortcut for ${esc(a.name)}" ${P.keysOff ? 'disabled' : ''}>✕</button>` : '<span class="ke-x"></span>'}</li>`; }).join('')}</ul>
    <p class="hint ke-note">${KB_NOTE ? esc(KB_NOTE) : KB_CAP ? 'Press the new key, or Esc to cancel.' : ''}</p>
    <button class="small-btn" data-kbreset ${changed ? '' : 'disabled'}>Reset to defaults</button>`;
}
function setKey(id, combo){
  const keys = {...(P.keys || {})}, a = KEY_ACTIONS.find(x => x.id === id); KB_NOTE = '';
  if (combo){ const other = KEY_ACTIONS.find(x => x.id !== id && keyOf(x.id) === combo); if (other){ keys[other.id] = ''; KB_NOTE = `${keyLabel(combo)} was used for “${other.name}”, which now has no key.`; } }
  if (combo === a.def) delete keys[id]; else keys[id] = combo;
  Object.keys(keys).forEach(k => { const x = KEY_ACTIONS.find(y => y.id === k); if (x && keys[k] === x.def) delete keys[k]; });
  P.keys = keys; saveP(); applyKeyBadges(); renderKeySettings();
}
$('#set-keys').addEventListener('click', e => {
  const b = e.target.closest('[data-kb]'); if (b){ KB_CAP = KB_CAP === b.dataset.kb ? null : b.dataset.kb; KB_NOTE = ''; renderKeySettings(); return; }
  const x = e.target.closest('[data-kbx]'); if (x){ KB_CAP = null; setKey(x.dataset.kbx, ''); return; }
  if (e.target.closest('[data-kbreset]')){ KB_CAP = null; KB_NOTE = 'Back to the default keys.'; P.keys = {}; saveP(); applyKeyBadges(); renderKeySettings(); }
});
$('#set-keys').addEventListener('change', e => { if (e.target.id === 'keysOn'){ P.keysOff = !e.target.checked; KB_CAP = null; saveP(); applyKeyBadges(); renderKeySettings(); } });
// choosing a new key: this runs before everything else, so the key you press isn't also used as a shortcut
addEventListener('keydown', e => {
  if (!KB_CAP) return;
  const k = e.key.toLowerCase();
  if (['shift', 'control', 'alt', 'meta', 'capslock'].includes(k)) return;      // wait for the real key
  e.preventDefault(); e.stopImmediatePropagation();
  if (k === 'escape'){ KB_CAP = null; KB_NOTE = ''; renderKeySettings(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey){ KB_NOTE = 'Ctrl, Cmd and Alt combos belong to the browser. Pick another key.'; renderKeySettings(); return; }
  const combo = keyCombo(e);
  if (KEY_RESERVED.has(combo.replace('shift+', ''))){ KB_NOTE = `${keyLabel(combo)} can’t be a shortcut. Pick another key.`; renderKeySettings(); return; }
  const id = KB_CAP; KB_CAP = null; setKey(id, combo);
}, true);
// the shortcuts themselves
function runShortcut(e){
  if (P.keysOff) return false;
  const combo = keyCombo(e), a = KEY_ACTIONS.find(x => keyOf(x.id) === combo);
  if (!a) return false;
  if (a.id === 'toggle' && e.target.closest('button')) return false;     // Space on a button presses the button
  if (a.id === 'toggle' || combo === ' ' || combo === 'shift+ ') e.preventDefault();
  achBump('keys');
  if (a.page) showPage(a.page);
  else ({toggle, reset, skip, mini: toggleMini, focus: toggleFocusMode, side: toggleSide})[a.id]();
  return true;
}
applyKeyBadges(); renderKeySettings();
