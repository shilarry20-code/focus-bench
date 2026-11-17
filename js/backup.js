/* ---------- backup & restore ---------- */
function backupText(){ return JSON.stringify({app:'focus-bench', version:1, exported:new Date().toISOString(), log:LOG, notes:NOTES, settings:P, achievements:ACH, ranked:R, guides:GUIDES}); }
$('#bkCopy').onclick = () => {
  achBump('backup');
  const txt = backupText(), out = $('#bkOut');
  out.value = txt; out.hidden = false;
  const fallback = () => { out.focus(); out.select(); toast('Backup selected. Press Ctrl+C (or Cmd+C on a Mac) to copy it.'); };
  try { navigator.clipboard.writeText(txt).then(() => toast(`Backup copied: ${LOG.length} sessions. Paste it into the other copy.`), fallback); } catch(e){ fallback(); }
};
$('#bkDownload').onclick = () => {
  achBump('backup');
  const d = new Date(), name = `focus-bench-backup-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.json`;
  const url = URL.createObjectURL(new Blob([backupText()], {type:'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Saved ${name}.`);
};
function restoreBackup(raw){
  let data;
  try { data = JSON.parse(String(raw).trim()); } catch(e){ toast("That isn't a Focus Bench backup. Copy the whole backup and try again."); return; }
  if (!data || data.app !== 'focus-bench' || !Array.isArray(data.log)){ toast("That isn't a Focus Bench backup. Copy the whole backup and try again."); return; }
  const key = s => [s.t, s.min, s.task || '', s.tag || ''].join('|'), have = new Set(LOG.map(key));
  const fresh = data.log.filter(s => s && typeof s.t === 'number' && typeof s.min === 'number' && !have.has(key(s)));
  LOG = LOG.concat(fresh).sort((a,b) => a.t - b.t); store.set('fb.log', LOG);
  if (Array.isArray(data.notes)){ const ids = new Set(NOTES.map(n => n.id)); NOTES = NOTES.concat(data.notes.filter(n => n && n.id && !ids.has(n.id))); saveNotes(); }
  if ($('#bkSettings').checked && data.settings && typeof data.settings === 'object'){
    const curTags = P.tags, curMusic = P.music.list, curTask = P.task;
    P = merge(clone(DEFAULTS), data.settings);
    P.tags = [...new Set([...(P.tags || []), ...curTags])];
    const ids = new Set(P.music.list.map(x => x.id)); P.music.list = P.music.list.concat(curMusic.filter(x => !ids.has(x.id)));
    if (!P.music.current && P.music.list[0]) P.music.current = P.music.list[0].id;
    P.task = curTask; saveP();
    $('#task').value = P.task;
  }
  if (data.achievements && typeof data.achievements === 'object'){
    const A = data.achievements;
    Object.entries(A.u || {}).forEach(([k, t]) => { ACH.u[k] = ACH.u[k] ? Math.min(ACH.u[k], t) : t; });
    Object.entries(A.c || {}).forEach(([k, v]) => { ACH.c[k] = Math.max(ACH.c[k] || 0, +v || 0); });
    Object.entries(A.s || {}).forEach(([k, v]) => { ACH.s[k] = [...new Set([...(ACH.s[k] || []), ...(v || [])])]; });
    ACH.seeded = true; saveAch();
  }
  if (Array.isArray(data.guides)){
    data.guides.forEach(g => { if (!g || !g.id) return; const cur = guideById(g.id); if (!cur) GUIDES.push(g); else if ((g.updated || 0) > (cur.updated || 0)) Object.assign(cur, g); });
    saveGuides(); renderGuides(); renderGuideSlot();
  }
  if (data.ranked && typeof data.ranked === 'object' && (data.ranked.played || 0) > R.played){ store.set('fb.ranked', data.ranked); loadRanked(); renderMatch(); renderRankChip(); }
  applyLook(); renderTimerPane(); renderLookSound(); renderNotes(); renderAll(); renderMusic(); renderLog();
  $('#bkIn').value = '';
  const skipped = data.log.length - fresh.length;
  toast(`Restored ${fresh.length} session${fresh.length===1?'':'s'}` + (skipped ? `. ${skipped} were already here.` : '.'));
}
$('#bkRestore').onclick = () => { const v = $('#bkIn').value; if (!v.trim()){ toast('Paste a backup into the box first.'); return; } restoreBackup(v); };
$('#bkFile').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => restoreBackup(r.result); r.readAsText(f); e.target.value = ''; };
if (window.top !== window) $('#bkDownload').hidden = true;   // Claude's viewer blocks downloads; Copy still works

