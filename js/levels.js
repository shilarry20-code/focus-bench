/* ---------- levels ----------
   XP from studying (1 a minute), hitting the daily goal (+25), ranked wins (+30), challenges (+50 daily, +250 weekly,
   +650 monthly) and achievements (5 XP per achievement point: +25 bronze up to +500 legendary). Your XP is added up from
   your whole history, so it always matches what you've done. Each level costs 40 XP more than the last, starting at 100. */
const LV_COST = L => 100 + 40 * (L - 1);                              // XP to go from level L to L + 1
const lvTotal = L => 100 * (L - 1) + 20 * (L - 1) * (L - 2);          // total XP to reach level L
function lvOf(xp){
  // solve 20L² − 40L + 40 − xp = 0 for the top level reached
  if (!(xp > 0)) return 1;
  let L = Math.max(1, Math.floor((40 + Math.sqrt(Math.max(0, 80 * xp - 1600))) / 40));
  while (lvTotal(L + 1) <= xp) L++; while (L > 1 && lvTotal(L) > xp) L--;
  return L;
}
const LV_TIERS = [[100, 'leg', 'Legendary'], [75, 'dia', 'Diamond'], [50, 'gold', 'Gold'], [25, 'silver', 'Silver'], [10, 'bronze', 'Bronze'], [1, 'grey', 'Grey']];
const lvTier = L => LV_TIERS.find(t => L >= t[0]);
const lvBadge = (L, cls = '') => `<span class="lvb lv-${lvTier(L)[1]}${cls ? ' ' + cls : ''}" title="Level ${L} · ${lvTier(L)[2]} tier">Lv ${L}</span>`;

/* ---- your XP ---- */
let LVS = store.get('fb.lv', {seen: 0});
function myXpParts(){
  const days = {}; let min = 0;
  LOG.forEach(s => { min += s.min; const k = dayKey(s.t); days[k] = (days[k] || 0) + s.min; });
  const goal = Object.values(days).filter(m => m >= P.goalMin).length;
  const ach = typeof ACHS !== 'undefined' ? ACHS.filter(a => ACH.u[a.id]).reduce((n, a) => n + TIERS[a.tier].pts, 0) : 0;
  return {study: min, goal: goal * 25, ranked: (R.w || 0) * 30, chal: (CHL.xp || 0), ach: ach * 5, elim: R.elXp || 0};
}
const myXp = () => { const p = myXpParts(); return p.study + p.goal + p.ranked + p.chal + p.ach + p.elim; };
// today's XP, by source
function myXpToday(){
  const k = dayKey(Date.now()), t0 = new Date(k + 'T00:00').getTime();
  const min = LOG.filter(s => dayKey(s.t) === k).reduce((n, s) => n + s.min, 0);
  const wins = (R.hist || []).filter(h => h.t >= t0 && !h.f && h.r === 'W').length;
  const chal = Object.entries(CHL.done || {}).filter(([, t]) => t >= t0).reduce((n, [key]) => { const [sk, id] = key.split('|'); return n + (id === 'all' ? CHX_ALL[sk[0]] : chXp(sk[0], id)); }, 0);
  const ach = typeof ACHS !== 'undefined' ? ACHS.filter(a => ACH.u[a.id] && ACH.u[a.id] >= t0).reduce((n, a) => n + TIERS[a.tier].pts * 5, 0) : 0;
  return [['Studied ' + fmtMin(min), min, 'clock'], ['Daily goal', min >= P.goalMin ? 25 : 0, 'target'], [`${wins} ranked win${wins === 1 ? '' : 's'}`, wins * 30, 'trophy'], ['Challenges', chal, 'check'], ['Achievements', ach, 'award']].filter(r => r[1] > 0);
}

/* ---- everyone else's XP: the same sources, from their stats ---- */
let LVA = null;
function lvArrs(){
  const key = `${botsVer}|${lbPts ? 1 : 0}|${typeof RK_EW !== 'undefined' && RK_EW ? 1 : 0}`;
  if (LVA && LVA.key === key) return LVA;
  try { rkCounts(); } catch(e){}
  const N = ROSTER_N, xp = new Int32Array(N);
  for (let i = 0; i < N; i++){
    const o = i * BF, days = BS[o + F.days];
    const wins = typeof RK_EW !== 'undefined' && RK_EW ? RK_EW[i] + RK_LW[i] : 0;
    xp[i] = BS[o + F.total] + 25 * Math.round(days * .45) + 30 * wins + 18 * days + (lbPts ? lbPts[i] * 5 : 0);
  }
  return (LVA = {key, xp});
}
const botXp = i => lvArrs().xp[i];
const lvLevelOf = w => w === ME || w === -1 ? lvOf(myXp()) : lvOf(botXp(w));

/* ---- drawing ---- */
const LV_IC = {clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/>', target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>', trophy: '<path d="M7 4h10v4.5a5 5 0 0 1-10 0zM12 13.5V17M8.5 20h7"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', award: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5 8 21l4-2 4 2-1-7.5"/>'};
function lvBar(xp){
  const L = lvOf(xp), a = lvTotal(L), b = lvTotal(L + 1);
  return {L, into: xp - a, need: b - a, pct: (xp - a) / (b - a) * 100};
}
function lvCardHtml(){
  const xp = myXp(), B = lvBar(xp), today = myXpToday(), tot = today.reduce((n, r) => n + r[1], 0), parts = myXpParts();
  return `<div class="card lv-card"><div class="lv-top">${lvBadge(B.L, 'big')}<div><b>Level ${B.L}</b><small>${lvTier(B.L)[2]} tier · ${xp.toLocaleString()} XP in all</small></div></div>
    <div class="lv-bar"><i style="width:${B.pct}%"></i></div>
    <div class="lv-nums"><span>Level ${B.L}</span><span>${B.into.toLocaleString()} / ${B.need.toLocaleString()} XP</span><span>Level ${B.L + 1}</span></div>
    <div class="lv-sub">Today's XP <b>+${tot.toLocaleString()}</b></div>
    ${today.length ? `<ul class="lv-list">${today.map(([t, v, ic]) => `<li><span><svg viewBox="0 0 24 24">${LV_IC[ic]}</svg>${esc(t)}</span><b>+${v.toLocaleString()}</b></li>`).join('')}</ul>` : '<p class="hint">Study, win ranked matches and finish challenges to earn XP.</p>'}
    <details class="lv-more"><summary>Where your XP comes from</summary><ul class="lv-list">${[['Studying', parts.study, 'clock'], ['Daily goals', parts.goal, 'target'], ['Ranked wins', parts.ranked, 'trophy'], ['Elimination', parts.elim, 'trophy'], ['Challenges', parts.chal, 'check'], ['Achievements', parts.ach, 'award']].map(([t, v, ic]) => `<li><span><svg viewBox="0 0 24 24">${LV_IC[ic]}</svg>${t}</span><b>${v.toLocaleString()}</b></li>`).join('')}</ul></details></div>`;
}
function lvRender(){
  if (typeof RK_READY !== 'undefined' && !RK_READY) return;
  const xp = myXp(), B = lvBar(xp);
  const chip = $('#lvChip'); if (chip){ chip.hidden = false; chip.dataset.tier = lvTier(B.L)[1]; chip.innerHTML = `<svg class="lv-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg><b>Lv ${B.L}</b><span class="lv-mini"><i style="width:${B.pct}%"></i></span>`; chip.title = `Level ${B.L} · ${B.into.toLocaleString()} / ${B.need.toLocaleString()} XP to level ${B.L + 1}`; }
  const slot = $('#lvSlot'); if (slot) slot.innerHTML = `<div class="lv-strip">${lvBadge(B.L)}<div class="lv-bar thin"><i style="width:${B.pct}%"></i></div><small>${B.into.toLocaleString()} / ${B.need.toLocaleString()} XP</small></div>`;
  // level ups (the first time, just remember where you are), and +XP pops
  if (!LVS.seen){ LVS.seen = B.L; LVS.xp = xp; store.set('fb.lv', LVS); return; }
  if (xp > (LVS.xp || 0)){ lvPop(xp - (LVS.xp || 0)); LVS.xp = xp; store.set('fb.lv', LVS); }
  else if (xp < (LVS.xp || 0)){ LVS.xp = xp; store.set('fb.lv', LVS); }
  if (B.L > LVS.seen){ const from = LVS.seen; LVS.seen = B.L; store.set('fb.lv', LVS); lvLevelUp(B.L, from); }
  else if (B.L < LVS.seen){ LVS.seen = B.L; store.set('fb.lv', LVS); }
}
function lvPop(n){
  const chip = $('#lvChip'); if (!chip || !n) return;
  const el = document.createElement('span'); el.className = 'lv-pop'; el.textContent = `+${n.toLocaleString()} XP`;
  chip.appendChild(el); setTimeout(() => el.remove(), 1900);
}
function lvLevelUp(L, from){
  const newTier = lvTier(L)[0] > lvTier(from)[0];
  const el = document.createElement('div'); el.className = 'lv-up' + (newTier ? ' tier' : '');
  el.innerHTML = `<small>Level up</small><b>Level ${L}</b>${newTier ? `<span>${lvBadge(L)} ${lvTier(L)[2]} tier reached</span>` : ''}`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 500); }, newTier ? 4200 : 3000);
  try { fx.burst(); } catch(e){}
}

/* ---- badges next to names ---- */
{
  const _w = fdWho; fdWho = w => `<span class="lv-nm">${_w(w)}${lvBadge(lvLevelOf(w), 'sm')}</span>`;
  const _r = lbRow2; lbRow2 = function(c, V, k){ const w = V.at(k), html = _r(c, V, k), head = '<span class="who"><b>' + esc(w === ME ? myName() : bot(w).name); return html.replace(head, head + ' ' + lvBadge(lvLevelOf(w), 'sm')); };
}
// profiles: a badge by the name, and the level card on your own page
{
  const _ph = renderProfilePage;
  renderProfilePage = function(){
    const x = _ph.apply(this, arguments);
    try {
      const nm = document.querySelector('#profBody #bmName'); if (nm && !nm.querySelector('.lvb')) nm.insertAdjacentHTML('beforeend', ' ' + lvBadge(lvLevelOf(profWho)));
      if (profWho === ME){ const host = document.querySelector('#profBody'); const first = host && host.querySelector('.card'); if (first && !host.querySelector('.lv-card')) first.insertAdjacentHTML('afterend', lvCardHtml()); }
    } catch(e){ console.error(e); }
    return x;
  };
  const _op = openProfile;
  openProfile = function(w){ const x = _op.apply(this, arguments); try { const nm = document.querySelector('#bmName'); if (nm && !nm.querySelector('.lvb')) nm.insertAdjacentHTML('beforeend', ' ' + lvBadge(lvLevelOf(w))); } catch(e){} return x; };
}
// chat and DMs: after each name button
const lvTagNames = root => { if (!root) return; root.querySelectorAll('.ch-name[data-bot]:not([data-lv]), .ch-name[data-me]:not([data-lv])').forEach(b => { b.dataset.lv = 1; b.insertAdjacentHTML('afterend', lvBadge(lvLevelOf(b.dataset.me != null ? ME : +b.dataset.bot), 'sm')); }); };
new MutationObserver(() => { lvTagNames($('#chatBody')); lvTagNames($('#chatPop')); }).observe(document.body, {childList: true, subtree: true});

setInterval(() => { try { lvRender(); } catch(e){ console.error(e); } }, 15000);
{ const _r = renderLog; renderLog = function(){ const x = _r.apply(this, arguments); try { lvRender(); } catch(e){} return x; }; }
setTimeout(() => { try { lvRender(); } catch(e){} if (!lbPts) try { ensureBotPoints(() => { LVA = null; }); } catch(e){} }, 6000);

document.addEventListener('click', e => { if (e.target.closest('#lvChip')){ try { profTab = 'stats'; } catch(err){} openFullProfile(ME); } });
