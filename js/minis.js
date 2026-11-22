/* ---------- mini views from the top bar ----------
   Tapping your level, your rank or the trophy opens a small window under it (like the streak one) instead of switching
   tabs; each has a button to the full page. Tap again, tap outside or press Esc to close. */
const TBPOP = {open: null};
function miniLevel(){
  return `${lvCardHtml().replace('class="card lv-card"', 'class="lv-card mini-lv"')}
    <div class="mini-go"><button class="small-btn" data-mini-go="level">Your profile</button></div>`;
}
function miniRank(){
  const rk = myRk(), hist = (R.hist || []).slice(0, 5);
  const wins = (R.hist || []).filter(h => h.r === 'W').length, losses = (R.hist || []).filter(h => h.r === 'L').length;
  let mid;
  if (rk.un) mid = `<p class="mini-sub">${R.played}/${PLACE_N} placement games played. Finish ${PLACE_N - R.played} more to get your rank.</p><div class="lv-bar"><i style="width:${R.played / PLACE_N * 100}%"></i></div>`;
  else {
    const pct = rk.hi ? Math.max(0, Math.min(100, (R.mmr - rk.lo) / (rk.hi - rk.lo) * 100)) : 100, nx = rk.hi ? rankOf(rk.hi) : null;
    mid = `<div class="lv-bar"><i style="width:${pct}%;background:${rk.c}"></i></div><div class="lv-nums"><span>${rk.sh}</span><span>${rk.hi ? `${(rk.hi - R.mmr).toLocaleString()} Elo to ${esc(nx.sh)}` : 'Top rank'}</span></div>`;
  }
  const res = h => `<li><span class="mini-res ${h.r === 'W' ? 'w' : h.r === 'L' ? 'l' : 'd'}">${h.r}</span><span class="mini-opp">vs ${h.b >= 0 && h.b < ROSTER_N ? `<button class="at-lnk" data-bot="${h.b}">${esc(bot(h.b).name)}</button>` : 'someone'}</span><small>${h.d > 0 ? '+' : ''}${h.d || 0} · ${fdAgo(h.t)}</small></li>`;
  return `<div class="mini-top">${emblem(rk, 'md')}<div><b>${esc(rk.full)}</b><small>${rk.un ? 'Unranked' : `${R.mmr.toLocaleString()} Elo`} · ${wins}W ${losses}L</small></div></div>
    ${mid}
    ${hist.length ? `<div class="mini-h">Recent matches</div><ul class="mini-list">${hist.map(res).join('')}</ul>` : '<p class="hint">No matches yet.</p>'}
    <div class="mini-go"><button class="small-btn accent" data-mini-go="ranked">Go to Ranked</button></div>`;
}
function miniAch(){
  const st = achStats(), got = Object.keys(ACH.u).length;
  const recent = ACHS.filter(a => ACH.u[a.id]).sort((a, b) => ACH.u[b.id] - ACH.u[a.id]).slice(0, 3);
  const next = ACHS.filter(a => !ACH.u[a.id] && !a.secret && a.goal > 1).map(a => [a, achVal(a, st) / a.goal]).filter(([, f]) => f > 0 && f < 1).sort((x, y) => y[1] - x[1]).slice(0, 3);
  const row = (a, extra) => `<li class="mini-ach">${achIcon(a)}<span><b>${esc(a.name)}</b>${extra}</span></li>`;
  return `<div class="mini-top"><div><b>${got} / ${ACHS.length} achievements</b><small>${Math.round(got / ACHS.length * 100)}% unlocked</small></div></div>
    <div class="lv-bar"><i style="width:${got / ACHS.length * 100}%"></i></div>
    ${recent.length ? `<div class="mini-h">Latest</div><ul class="mini-list">${recent.map(a => row(a, `<small>${new Date(ACH.u[a.id]).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</small>`)).join('')}</ul>` : ''}
    ${next.length ? `<div class="mini-h">Almost there</div><ul class="mini-list">${next.map(([a, f]) => row(a, `<span class="ach-prog"><i style="width:${Math.min(100, f * 100)}%;background:${TIERS[a.tier].c}"></i></span><small>${achProgressText(a, achVal(a, st))}</small>`)).join('')}</ul>` : ''}
    <div class="mini-go"><button class="small-btn accent" data-mini-go="awards">See all</button></div>`;
}
const TBPOP_VIEWS = {lvChip: miniLevel, rankChip: miniRank, achBtn: miniAch};
function tbPopClose(){ const p = $('#miniPop'); if (p) p.remove(); if (TBPOP.open){ const b = $('#' + TBPOP.open); if (b) b.setAttribute('aria-expanded', 'false'); } TBPOP.open = null; }
function tbPopOpen(id){
  tbPopClose(); const btn = $('#' + id); if (!btn) return;
  const sp = $('#streakPop'); if (sp && !sp.hidden){ sp.hidden = true; $('#streakChip').setAttribute('aria-expanded', 'false'); }    // one menu at a time
  const el = document.createElement('div'); el.id = 'miniPop'; el.className = 'mini-pop'; el.setAttribute('role', 'dialog');
  try { el.innerHTML = TBPOP_VIEWS[id](); } catch(e){ console.error(e); return; }
  document.body.appendChild(el); TBPOP.open = id; btn.setAttribute('aria-expanded', 'true');
  // under the button, kept on screen
  const r = btn.getBoundingClientRect(), w = el.offsetWidth;
  el.style.top = `${Math.round(r.bottom + 8)}px`;
  el.style.left = `${Math.round(Math.max(12, Math.min(innerWidth - w - 12, r.right - w)))}px`;
  el.style.maxHeight = `${Math.round(innerHeight - r.bottom - 24)}px`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('#lvChip, #rankChip, #achBtn');
  if (b){ e.stopImmediatePropagation(); e.preventDefault(); if (TBPOP.open === b.id) tbPopClose(); else tbPopOpen(b.id); return; }
  const go = e.target.closest('[data-mini-go]');
  if (go){ const k = go.dataset.miniGo; tbPopClose(); if (k === 'level'){ try { profTab = 'stats'; } catch(err){} openFullProfile(ME); } else showPage(k); return; }
  if (TBPOP.open && !e.target.closest('#miniPop')) tbPopClose();
  else if (TBPOP.open && e.target.closest('#miniPop [data-bot]')) tbPopClose();
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && TBPOP.open) tbPopClose(); });
addEventListener('resize', () => { if (TBPOP.open) tbPopClose(); });
addEventListener('scroll', () => { if (TBPOP.open) tbPopClose(); }, {passive: true});
