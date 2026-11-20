/* ---------- log ---------- */
const dayKey = d => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
function renderLog(){
  renderKpis();
  if (typeof achQueue === 'function') achQueue();
  const today = dayKey(Date.now());
  const todays = LOG.filter(s => dayKey(s.t) === today);
  const todayMin = todays.reduce((a,s) => a + s.min, 0);
  $('#todayMin').textContent = fmtMin(todayMin);
  $('#stToday').textContent = fmtMin(todayMin);
  $('#stBlocks').textContent = `${fmtMin(todayMin)} / ${fmtMin(P.goalMin)}`;
  // daily goal: minutes studied today against the goal
  const gp = Math.min(1, todayMin / P.goalMin);
  $('#goalDots').innerHTML = `<span class="gbar${gp >= 1 ? ' full' : ''}"><i style="width:${gp * 100}%"></i></span>${gp >= 1 ? '<em>✓</em>' : ''}`;
  $('#goalDots').title = `Daily goal: ${fmtMin(todayMin)} of ${fmtMin(P.goalMin)}`;
  // streak (10 minutes or more counts as a day)
  $('#stStreak').textContent = streakInfo().cur;
  renderStreak();
  // week, stacked by activity
  const week = [];
  for (let i = 6; i >= 0; i--){ const x = new Date(); x.setHours(12,0,0,0); x.setDate(x.getDate() - i); week.push({k:dayKey(x), label:x.toLocaleDateString(undefined,{weekday:'short'}), full:x.toLocaleDateString(undefined,{weekday:'long', month:'short', day:'numeric'}), min:0, by:{}, tasks:{}}); }
  LOG.forEach(s => { const w = week.find(w => w.k === dayKey(s.t)); if (!w) return; const t = s.tag || 'General'; w.min += s.min; w.by[t] = (w.by[t] || 0) + s.min; const tk = (s.task || '').trim(); const tt = (w.tasks[t] = w.tasks[t] || {}); tt[tk] = (tt[tk] || 0) + s.min; });
  const peak = Math.max(...week.map(w => w.min));
  const max = Math.max(60, Math.ceil(peak / 60) * 60);
  const order = actOrder(week);
  WEEK = week;
  $('#week').innerHTML = week.map((w,i) => {
    const segs = order.filter(t => w.by[t]).map(t => `<span class="sg" tabindex="0" data-d="${i}" data-a="${esc(t)}" style="--c:${actColor(t)};flex:${w.by[t]} 1 0" aria-label="${esc(t)}: ${fmtMin(w.by[t])} on ${w.full}"></span>`).join('');
    return `<div class="col"><span class="v">${w.min ? fmtMin(w.min) : ''}</span><div class="stk" style="height:${w.min / max * 82}%">${segs}</div></div>`;
  }).join('');
  $('#days').innerHTML = week.map((w,i) => `<span class="${i===6?'today':''}">${i===6?'Today':w.label}</span>`).join('');
  // tag bars this week
  const byTag = {};
  week.forEach(w => Object.entries(w.by).forEach(([t,m]) => byTag[t] = (byTag[t] || 0) + m));
  const tags = order.filter(t => byTag[t]).map(t => [t, byTag[t]]).sort((a,b) => b[1] - a[1]);
  $('#legend').innerHTML = tags.map(([t]) => `<span style="--c:${actColor(t)}"><i></i>${esc(t)}</span>`).join('');
  const tmax = tags.length ? tags[0][1] : 1;
  $('#tagBars').innerHTML = tags.length
    ? `<div class="tagbars">${tags.map(([t,m]) => `<div class="tagbar" data-a="${esc(t)}" style="--c:${actColor(t)}"><span class="name"><i></i><b>${esc(t)}</b></span><span class="track2"><i style="width:${m/tmax*100}%"></i></span><span class="m">${fmtMin(m)}</span></div>`).join('')}</div>`
    : `<div class="empty">Finish a focus block and your time per activity shows up here.</div>`;
  renderSessions();
}

/* ---------- activity colors & chart tooltip ---------- */
// Colorblind-safe categorical palette, light and dark steps. Each activity keeps its color
// (by its place in your activity list) no matter which ones show up in a given week.
const SERIES = {light:['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#6250d6','#e34948'], dark:['#3987e5','#d95926','#199e70','#c98500','#d55181','#008300','#9085e9','#e66767']};
let WEEK = [];
function actOrder(week){
  const seen = [...P.tags];
  week.forEach(w => Object.keys(w.by).forEach(t => { if (!seen.includes(t)) seen.push(t); }));
  return seen;
}
function actColor(t){
  const i = P.tags.indexOf(t), pal = SERIES[isDark() ? 'dark' : 'light'];
  return i >= 0 && i < pal.length ? pal[i] : (isDark() ? '#7d8596' : '#8a919e');
}
// Lists what you worked on (the "What are you working on?" text) under an activity, longest first.
function taskLines(map, limit){
  const rows = Object.entries(map || {}).sort((p,q) => q[1] - p[1]);
  let h = rows.slice(0, limit).map(([k,m]) => `<div class="tk"><span class="${k?'':'none'}">${k ? esc(k) : 'No description'}</span><em>${fmtMin(m)}</em></div>`).join('');
  if (rows.length > limit) h += `<div class="tk"><span>and ${rows.length - limit} more</span><em></em></div>`;
  return h;
}
function showTip(el, x, y){
  const tip = $('#vtip'), a = el.dataset.a;
  let html;
  if (el.dataset.d != null){
    const w = WEEK[+el.dataset.d];
    const rows = Object.entries(w.by).sort((p,q) => q[1] - p[1]);
    html = `<div class="d">${esc(w.full)} · ${fmtMin(w.min)}</div>` + rows.map(([t,m]) => `<div class="r ${t===a?'on':''}" style="--c:${actColor(t)}"><span><i></i>${esc(t)}</span><em>${fmtMin(m)}</em></div>` + taskLines(w.tasks[t], t === a ? 6 : 3)).join('');
    document.querySelectorAll('#week .sg').forEach(s => s.classList.toggle('dim', s.dataset.a !== a));
  } else {
    const keys = new Set(WEEK.map(w => w.k)), list = LOG.filter(s => keys.has(dayKey(s.t)) && (s.tag || 'General') === a);
    const m = list.reduce((n,s) => n + s.min, 0);
    const byTask = {}; list.forEach(s => { const k = (s.task || '').trim(); byTask[k] = (byTask[k] || 0) + s.min; });
    html = `<div class="d">This week · ${list.length} session${list.length===1?'':'s'}</div><div class="r on" style="--c:${actColor(a)}"><span><i></i>${esc(a)}</span><em>${fmtMin(m)}</em></div>` + taskLines(byTask, 8);
  }
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect(), pad = 12;
  let left = x + 14, top = y - r.height - 12;
  if (left + r.width > innerWidth - pad) left = x - r.width - 14;
  if (top < pad) top = y + 18;
  tip.style.left = Math.max(pad, left) + 'px'; tip.style.top = top + 'px';
}
function hideTip(){ $('#vtip').hidden = true; document.querySelectorAll('#week .sg.dim').forEach(s => s.classList.remove('dim')); }
const tipTarget = e => e.target.closest && e.target.closest('#week .sg, #tagBars .tagbar');
document.addEventListener('pointermove', e => { const el = tipTarget(e); el ? showTip(el, e.clientX, e.clientY) : (!$('#vtip').hidden && e.pointerType === 'mouse' && hideTip()); });
document.addEventListener('pointerdown', e => { const el = tipTarget(e); el ? showTip(el, e.clientX, e.clientY) : hideTip(); });
document.addEventListener('focusin', e => { const el = tipTarget(e); if (el){ const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top); } });
document.addEventListener('focusout', e => { if (tipTarget(e)) hideTip(); });
document.addEventListener('scroll', hideTip, true);

/* ---------- session lists: grouping, editing, selecting and deleting ---------- */
// Every block on the same day with the same task and activity is shown as one group you can expand,
// however long the gaps between them. The same list component is used in the Log tab and under the calendar.
const sStart = s => s.t - s.min * 60000;
const workKey = s => dayKey(s.t) + '\u0000' + (s.task || '').trim().toLowerCase() + '\u0000' + (s.tag || 'General');
function groupSessions(items){            // items: [{s, i}] oldest first; groups come back ordered by their last block
  const groups = [], by = new Map();
  for (const it of items){
    const k = workKey(it.s), st = sStart(it.s), g = by.get(k);
    if (g){ g.items.push(it); g.start = Math.min(g.start, st); g.end = Math.max(g.end, it.s.t); g.min += it.s.min; }
    else { const n = {items: [it], start: st, end: it.s.t, min: it.s.min, key: String(it.s.t)}; by.set(k, n); groups.push(n); }
  }
  return groups.sort((x, y) => x.end - y.end);
}
const hm = t => new Date(t).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
function hmRange(a, b){
  const x = hm(a), y = hm(b), sx = x.split(' '), sy = y.split(' ');
  if (dayKey(a) === dayKey(b) && sx.length > 1 && sy.length > 1 && sx[sx.length-1] === sy[sy.length-1] && /\D/.test(sx[sx.length-1])) return sx.slice(0, -1).join(' ') + '–' + y;
  return x + '–' + y;
}
function toLocalInput(t){ const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
const PENCIL = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';

function SessionList(root, opts){
  const st = {select: false, confirm: false, sel: new Set(), open: new Set(), edit: null};
  const listEl = root.querySelector('.sl-list'), barEl = root.querySelector('.sl-bar');
  function tagOptions(cur){ const tags = P.tags.includes(cur) ? P.tags : [...P.tags, cur]; return tags.map(t => `<option ${t===cur?'selected':''}>${esc(t)}</option>`).join(''); }
  function editForm(key, g){
    const s = g.items[0].s, multi = g.items.length > 1 && key.startsWith('g:');
    return `<li class="editing"><form class="sl-edit" data-key="${key}">
      <label class="f-task">What you worked on<input name="task" value="${esc(s.task || '')}" maxlength="80" placeholder="Untitled session"></label>
      <label>Activity<select name="tag">${tagOptions(s.tag || 'General')}</select></label>
      ${multi ? `<p class="sub">Changes all ${g.items.length} blocks in this group. Expand the group to change one block's time or length.</p>` :
        `<label>Started<input type="datetime-local" name="start" value="${toLocalInput(sStart(s))}" required></label>
         <label>Minutes<input type="number" name="min" min="1" max="600" value="${s.min}" required></label>`}
      <div class="sl-edit-btns"><button type="submit" class="small-btn save">Save</button><button type="button" class="small-btn" data-act="cancel-edit">Cancel</button></div>
    </form></li>`;
  }
  function row(it, cls, label, timeTxt, extra){
    const {s, i} = it;
    return `<li class="${cls}${st.sel.has(i) ? ' sel' : ''}" data-i="${i}">${st.select ? `<input type="checkbox" data-i="${i}" ${st.sel.has(i)?'checked':''} aria-label="Select this block">` : ''}<span class="t">${timeTxt}</span><span class="task">${cls ? '' : '<span class="exp-sp"></span>'}<span class="nm">${label}</span><em>${esc(s.tag || '')}</em></span><span class="min">${fmtMin(s.min)}</span>${st.select ? '' : `<button class="ed" data-edit="i:${i}" aria-label="Edit this session" title="Edit">${PENCIL}</button>`}</li>`;
  }
  function render(){
    const items = opts.items(), groups = groupSessions(items).reverse();
    const visible = new Set(items.map(x => x.i)); st.sel.forEach(i => { if (!visible.has(i)) st.sel.delete(i); });
    const dateP = t => opts.showDate() ? new Date(t).toLocaleDateString(undefined, {month:'short', day:'numeric'}) + ', ' : '';
    let h = '';
    for (const g of groups){
      const name = esc(g.items[0].s.task || 'Untitled session');
      if (g.items.length === 1){
        const it = g.items[0], k = 'i:' + it.i;
        h += st.edit === k ? editForm(k, g) : row(it, '', name, dateP(it.s.t) + hmRange(sStart(it.s), it.s.t));
        continue;
      }
      const gk = 'g:' + g.key, open = st.open.has(g.key), allSel = g.items.every(x => st.sel.has(x.i)), someSel = g.items.some(x => st.sel.has(x.i));
      if (st.edit === gk){ h += editForm(gk, g); }
      else h += `<li class="grp${allSel ? ' sel' : ''}" data-g="${g.key}">${st.select ? `<input type="checkbox" data-g="${g.key}" ${allSel?'checked':''} ${someSel && !allSel ? 'data-mixed="1"' : ''} aria-label="Select all blocks in this group">` : ''}<span class="t">${dateP(g.start)}${hmRange(g.start, g.end)}</span><span class="task"><button class="exp" data-exp="${g.key}" aria-expanded="${open}" aria-label="${open?'Hide':'Show'} blocks">${open ? '▾' : '▸'}</button><span class="nm">${name}</span><em>${esc(g.items[0].s.tag || '')}</em><span class="badge">${g.items.length} blocks</span></span><span class="min">${fmtMin(g.min)}</span>${st.select ? '' : `<button class="ed" data-edit="${gk}" aria-label="Edit this group" title="Edit">${PENCIL}</button>`}</li>`;
      if (open) g.items.map((it, n) => [it, n + 1]).reverse().forEach(([it, n]) => {
        const k = 'i:' + it.i;
        h += st.edit === k ? editForm(k, {items: [it]}) : row(it, 'sub', `Block ${n}`, hmRange(sStart(it.s), it.s.t));
      });
    }
    listEl.innerHTML = groups.length ? `<ul class="sessions${st.select ? ' selecting' : ''}${opts.showDate() ? ' all' : ''}">${h}</ul>` : `<div class="empty">${opts.empty()}</div>`;
    listEl.querySelectorAll('[data-mixed]').forEach(c => c.indeterminate = true);
    const n = st.sel.size;
    if (!groups.length){ barEl.innerHTML = ''; st.select = false; return; }
    if (st.confirm && n) barEl.innerHTML = `<span class="count">Delete ${n} block${n===1?'':'s'}? This can't be undone.</span><button class="small-btn danger" data-act="yes">Delete</button><button class="small-btn" data-act="no">Cancel</button>`;
    else if (st.select){
      st.confirm = false;
      barEl.innerHTML = `<label><input type="checkbox" data-act="all" ${n && n === items.length ? 'checked' : ''}> Select all</label><span class="count">${n} selected</span><button class="small-btn danger" data-act="del" ${n?'':'disabled'}>Delete selected</button><button class="small-btn" data-act="done">Done</button>`;
      const all = barEl.querySelector('[data-act="all"]'); if (all) all.indeterminate = n > 0 && n < items.length;
    } else barEl.innerHTML = `<button class="small-btn" data-act="start">Select sessions to delete</button>`;
  }
  root.addEventListener('click', e => {
    const t = e.target, exp = t.closest('[data-exp]'), ed = t.closest('[data-edit]'), act = t.closest('[data-act]');
    if (exp){ const k = exp.dataset.exp; st.open.has(k) ? st.open.delete(k) : st.open.add(k); render(); return; }
    if (ed){ st.edit = ed.dataset.edit; if (ed.dataset.edit.startsWith('i:')){ /* keep the group open while editing a block */ } render(); const f = listEl.querySelector('.sl-edit input'); f && f.focus(); return; }
    if (act){
      const a = act.dataset.act, items = opts.items();
      if (a === 'cancel-edit') st.edit = null;
      else if (a === 'start'){ st.select = true; st.sel.clear(); st.edit = null; }
      else if (a === 'done'){ st.select = false; st.sel.clear(); }
      else if (a === 'all'){ if (act.checked) items.forEach(x => st.sel.add(x.i)); else st.sel.clear(); }
      else if (a === 'del') st.confirm = true;
      else if (a === 'no') st.confirm = false;
      else if (a === 'yes'){
        const n = st.sel.size; LOG = LOG.filter((_, i) => !st.sel.has(i)); store.set('fb.log', LOG);
        st.sel.clear(); st.confirm = false; st.select = false; renderLog(); toast(`Deleted ${n} block${n===1?'':'s'}.`); achBump('deletes', n); return;
      }
      render(); return;
    }
    if (!st.select) return;
    const li = t.closest('li[data-i], li[data-g]'); if (!li) return;
    if (li.dataset.g){
      const g = groupSessions(opts.items()).find(x => x.key === li.dataset.g); if (!g) return;
      const all = g.items.every(x => st.sel.has(x.i)); g.items.forEach(x => all ? st.sel.delete(x.i) : st.sel.add(x.i));
    } else { const i = +li.dataset.i; st.sel.has(i) ? st.sel.delete(i) : st.sel.add(i); }
    st.confirm = false; render();
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, key = f.dataset.key, fd = new FormData(f), task = String(fd.get('task') || '').trim(), tag = String(fd.get('tag') || 'General');
    if (key.startsWith('g:')){
      const g = groupSessions(opts.items()).find(x => x.key === key.slice(2)); if (!g) return;
      g.items.forEach(({i}) => { LOG[i] = {...LOG[i], task, tag}; });
    } else {
      const i = +key.slice(2), min = Math.round(+fd.get('min')), start = new Date(String(fd.get('start'))).getTime();
      if (!(min >= 1 && min <= 600)){ toast('Minutes must be between 1 and 600.'); return; }
      if (!isFinite(start)){ toast('Pick a valid start date and time.'); return; }
      LOG[i] = {...LOG[i], task, tag, min, t: start + min * 60000};
    }
    LOG.sort((a, b) => a.t - b.t); store.set('fb.log', LOG);
    st.edit = null; st.sel.clear(); renderLog(); toast('Session updated.'); achBump('edits');
  });
  return {render, reset(){ st.select = false; st.confirm = false; st.sel.clear(); st.edit = null; }};
}

// Log tab: pick a day (or all sessions)
let sessView = 'today';
const logList = SessionList($('#logSessions'), {
  items: () => { const want = sessView === 'today' ? dayKey(Date.now()) : sessView; return LOG.map((s, i) => ({s, i})).filter(({s}) => sessView === 'all' || dayKey(s.t) === want); },
  showDate: () => sessView === 'all',
  empty: () => sessView === 'today' ? 'No sessions yet today. Press Start and your first block lands here when it ends.' : 'No sessions here.'
});
function renderSessions(){
  const today = dayKey(Date.now());
  const days = [...new Set(LOG.map(s => dayKey(s.t)))].filter(k => k !== today).sort().reverse();
  if (sessView !== 'today' && sessView !== 'all' && !days.includes(sessView)) sessView = 'today';
  const label = k => new Date(k + 'T12:00').toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
  $('#sessDay').innerHTML = [['today','Today'], ...days.map(k => [k, label(k)]), ['all','All sessions']]
    .map(([v,l]) => `<option value="${v}" ${v===sessView?'selected':''}>${l}</option>`).join('');
  logList.render();
  renderCalendar();
}
$('#sessDay').onchange = e => { sessView = e.target.value; logList.reset(); logList.render(); };

/* ---------- calendar (week by default, month on request) ---------- */
const startOfWeek = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; };
let calDay = dayKey(Date.now());
let calMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
let calWeek = startOfWeek(new Date());
const calList = SessionList($('#calSessions'), {
  items: () => LOG.map((s, i) => ({s, i})).filter(({s}) => dayKey(s.t) === calDay),
  showDate: () => false,
  empty: () => 'Nothing logged on this day.'
});
function dayTotals(){
  const byDay = {};
  LOG.forEach(s => { const k = dayKey(s.t), d = byDay[k] || (byDay[k] = {min:0, by:{}, n:0}); d.min += s.min; d.n++; const t = s.tag || 'General'; d.by[t] = (d.by[t] || 0) + s.min; });
  return byDay;
}
const segsFor = r => Object.entries(r.by).sort((a,b) => b[1] - a[1]).map(([t, mm]) => `<i style="flex:${mm};background:${actColor(t)}"></i>`).join('');
function renderCalendar(){
  if (!$('#calGrid')) return;
  const week = P.calView !== 'month', today = dayKey(Date.now()), byDay = dayTotals();
  $('#calGrid').hidden = $('.cal-dow').hidden = week; $('#calWeek').hidden = !week;
  $('#calPrev').setAttribute('aria-label', week ? 'Previous week' : 'Previous month');
  $('#calNext').setAttribute('aria-label', week ? 'Next week' : 'Next month');
  if (week){
    const days = [...Array(7)].map((_, i) => { const d = new Date(calWeek); d.setDate(d.getDate() + i); return d; });
    const a = days[0], b = days[6], sameM = a.getMonth() === b.getMonth();
    $('#calTitle').textContent = `${a.toLocaleDateString(undefined, {month:'short', day:'numeric'})} – ${b.toLocaleDateString(undefined, sameM ? {day:'numeric'} : {month:'short', day:'numeric'})}, ${b.getFullYear()}`;
    const rs = days.map(d => byDay[dayKey(d)]), maxMin = Math.max(60, ...rs.map(r => r ? r.min : 0));
    $('#calWeek').innerHTML = days.map((d, i) => {
      const k = dayKey(d), r = rs[i];
      const lab = d.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'}) + (r ? `, ${fmtMin(r.min)} studied` : ', nothing logged');
      return `<button class="wk-row${r ? ' has' : ''}${k === today ? ' today' : ''}${k === calDay ? ' on' : ''}${k > today ? ' future' : ''}" data-k="${k}" aria-label="${lab}" aria-pressed="${k === calDay}">
        <span class="wd"><b>${d.toLocaleDateString(undefined, {weekday:'short'})}</b><span class="dn">${d.getDate()}</span></span>
        <span class="wk-bar">${r ? `<span class="fill" style="width:${r.min / maxMin * 100}%">${segsFor(r)}</span>` : ''}</span>
        <span class="wk-m">${r ? fmtMin(r.min) : '–'}</span></button>`;
    }).join('');
    const tot = rs.reduce((n, r) => n + (r ? r.min : 0), 0), nDays = rs.filter(Boolean).length;
    const prev = [...Array(7)].reduce((n, _, i) => { const d = new Date(calWeek); d.setDate(d.getDate() - 7 + i); const r = byDay[dayKey(d)]; return n + (r ? r.min : 0); }, 0);
    const diff = tot - prev, cmp = prev || tot ? (diff === 0 ? ' · same as the week before' : ` · ${diff > 0 ? '+' : '−'}${fmtMin(Math.abs(diff))} vs the week before`) : '';
    $('#calMonthSum').textContent = tot ? `${fmtMin(tot)} studied on ${nDays} day${nDays===1?'':'s'} this week${cmp}` : `Nothing logged this week yet${cmp}.`;
  } else {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    $('#calTitle').textContent = calMonth.toLocaleDateString(undefined, {month:'long', year:'numeric'});
    const lead = new Date(y, m, 1).getDay(), daysIn = new Date(y, m + 1, 0).getDate();
    let maxMin = 0, monthMin = 0, monthDays = 0;
    for (let d = 1; d <= daysIn; d++){ const r = byDay[dayKey(new Date(y, m, d, 12))]; if (r){ maxMin = Math.max(maxMin, r.min); monthMin += r.min; monthDays++; } }
    let h = '';
    for (let i = 0; i < lead; i++) h += '<span class="cal-cell pad" aria-hidden="true"></span>';
    for (let d = 1; d <= daysIn; d++){
      const k = dayKey(new Date(y, m, d, 12)), r = byDay[k], heat = r ? .25 + .75 * r.min / maxMin : 0;
      const lab = new Date(y, m, d).toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'}) + (r ? `, ${fmtMin(r.min)} studied` : ', nothing logged');
      h += `<button class="cal-cell${r ? ' has' : ''}${k === today ? ' today' : ''}${k === calDay ? ' on' : ''}${k > today ? ' future' : ''}" data-k="${k}" style="--heat:${heat}" aria-label="${lab}" aria-pressed="${k === calDay}"><span class="n">${d}</span>${r ? `<span class="m">${fmtMin(r.min)}</span><span class="segs">${segsFor(r)}</span>` : ''}</button>`;
    }
    $('#calGrid').innerHTML = h;
    $('#calMonthSum').textContent = monthMin ? `${fmtMin(monthMin)} studied on ${monthDays} day${monthDays===1?'':'s'} this month` : 'Nothing logged this month yet.';
  }
  // the selected day
  const r = byDay[calDay];
  $('#calDayTitle').textContent = calDay === today ? 'Today' : new Date(calDay + 'T12:00').toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
  if (r){
    const rows = Object.entries(r.by).sort((a,b) => b[1] - a[1]), top = rows[0][1];
    $('#calDayBreak').innerHTML = `<p class="cal-total"><b>${fmtMin(r.min)}</b> across ${r.n} focus block${r.n===1?'':'s'}</p><div class="tagbars">${rows.map(([t, mm]) => `<div class="tagbar" style="--c:${actColor(t)}"><span class="name"><i></i><b>${esc(t)}</b></span><span class="track2"><i style="width:${mm/top*100}%"></i></span><span class="m">${fmtMin(mm)}</span></div>`).join('')}</div>`;
  } else $('#calDayBreak').innerHTML = '';
  calList.render();
}
function pickDay(e){ const c = e.target.closest('[data-k]'); if (!c) return; calDay = c.dataset.k; calList.reset(); renderCalendar(); }
$('#calGrid').onclick = pickDay; $('#calWeek').onclick = pickDay;
function calShift(n){
  if (P.calView === 'month') calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + n, 1);
  else { calWeek = new Date(calWeek); calWeek.setDate(calWeek.getDate() + 7 * n); }
  renderCalendar();
}
$('#calPrev').onclick = () => calShift(-1);
$('#calNext').onclick = () => calShift(1);
$('#calToday').onclick = () => { const d = new Date(); calMonth = new Date(d.getFullYear(), d.getMonth(), 1); calWeek = startOfWeek(d); calDay = dayKey(d); calList.reset(); renderCalendar(); };
function renderCalMode(){
  $('#calMode').innerHTML = [['week','Week'],['month','Month']].map(([v,l]) => `<button data-v="${v}" aria-pressed="${(P.calView || 'week') === v}">${l}</button>`).join('');
}
$('#calMode').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  P.calView = b.dataset.v; saveP(); if (b.dataset.v === 'month') achBump('calMonth');
  // open the new view on the week or month that holds the selected day
  const d = new Date(calDay + 'T12:00'); calMonth = new Date(d.getFullYear(), d.getMonth(), 1); calWeek = startOfWeek(d);
  renderCalMode(); renderCalendar();
};
renderCalMode();

