/* ---------- challenges: 3 daily, 4 weekly, 5 monthly ----------
   Picked to fit you (more study ones if you don't play ranked, targets based on how much you usually study). Progress
   counts everything since the period started (midnight, Monday, the 1st). Never anything about gaining Elo or reaching
   a rating: only things that can be done at any rating. One free reroll a day. */
let CHL = store.get('fb.chal', {sets: {}, done: {}, rr: {day: '', used: 0}, total: 0});
const saveChl = () => store.set('fb.chal', CHL);
const CH_N = {d: 3, w: 4, m: 5}, CH_NAME = {d: 'Daily', w: 'Weekly', m: 'Monthly'};

/* ---- periods ---- */
function chStart(per, now = Date.now()){
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  if (per === 'w') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));        // Monday
  if (per === 'm') d.setDate(1);
  return d.getTime();
}
function chEnd(per, now = Date.now()){
  const d = new Date(chStart(per, now));
  if (per === 'd') d.setDate(d.getDate() + 1); else if (per === 'w') d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1);
  return d.getTime();
}
const chKey = (per, now = Date.now()) => per + dayKey(chStart(per, now));
const chDaysLeft = per => Math.max(1, Math.round((chEnd(per) - chStart('d')) / 864e5));    // today included

/* ---- what you did since a moment ---- */
function chData(t0){
  const s = LOG.filter(x => x.t >= t0), days = {};
  s.forEach(x => { const k = dayKey(x.t), d = days[k] || (days[k] = {min: 0, n: 0}); d.min += x.min; d.n++; });
  const dk = Object.keys(days).sort();
  let run = 0, best = 0, prev = null;
  dk.filter(k => days[k].min >= 10).forEach(k => { const t = new Date(k + 'T12:00').getTime(); run = prev != null && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = t; });
  const tags = {}; s.forEach(x => { const g = x.tag || 'General'; tags[g] = (tags[g] || 0) + x.min; });
  const hrs = (a, b) => s.reduce((n, x) => { const st = new Date(x.t - x.min * 60000).getHours(); return n + (st >= a && st < b ? x.min : 0); }, 0);
  const rk = (R.hist || []).filter(h => h.t >= t0 && !h.f).slice().reverse();     // oldest first
  let ws = 0, bws = 0; rk.forEach(h => { ws = h.r === 'W' ? ws + 1 : 0; bws = Math.max(bws, ws); });
  return {
    min: s.reduce((n, x) => n + x.min, 0), n: s.length, long: Math.max(0, ...s.map(x => x.min)), long90: s.filter(x => x.min >= 90).length,
    days: dk.filter(k => days[k].min >= 10).length, goal: dk.filter(k => days[k].n >= P.goal).length, streak: best,
    tags: Object.values(tags).filter(m => m >= 10).length, am: hrs(0, 12), eve: hrs(18, 24),
    rplay: rk.length, rwin: rk.filter(h => h.r === 'W').length, rws: bws,
    rclose: rk.filter(h => h.r === 'W' && Math.abs(h.br - (h.m - h.d)) <= 100).length,
    rrival: rk.filter(h => h.r === 'W' && isRival(h.b)).length,
    posts: typeof FD !== 'undefined' ? FD.posts.filter(p => p.w === -1 && !p.del && p.t >= t0).length : 0
  };
}
// how much you usually study on a day you study (last two weeks), for sizing the targets
function chUsual(){
  const t0 = Date.now() - 14 * 864e5, days = {}; LOG.filter(x => x.t >= t0).forEach(x => { const k = dayKey(x.t); days[k] = (days[k] || 0) + x.min; });
  const v = Object.values(days); const avg = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 60;
  const ns = {}; LOG.filter(x => x.t >= t0).forEach(x => { const k = dayKey(x.t); ns[k] = (ns[k] || 0) + 1; });
  const nv = Object.values(ns), sess = nv.length ? nv.reduce((a, b) => a + b, 0) / nv.length : 2;
  return {min: clampN(avg, 30, 240), sess: clampN(Math.round(sess), 2, 8), long: LOG.length ? clampN(Math.max(...LOG.slice(-40).map(x => x.min)), 30, 120) : 45};
}
const chR15 = m => Math.max(15, Math.round(m / 15) * 15), chR60 = m => Math.max(60, Math.round(m / 60) * 60);
const chHm = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}` : `${m} min`;

/* ---- the challenges ---- */
// {id, per, kind, key (what's counted), n (target, given usual and days left), t (the title)}
const CH_POOL = [
  {id: 'd.min', per: 'd', kind: 'study', key: 'min', n: u => chR15(u.min * (.8 + Math.random() * .4)), t: n => `Study ${chHm(n)} today`, unit: 'min', main: 1},
  {id: 'd.n', per: 'd', kind: 'study', key: 'n', n: u => u.sess, t: n => `Finish ${n} focus sessions`},
  {id: 'd.long', per: 'd', kind: 'study', key: 'long', n: u => chR15(u.long * .9), t: n => `Study ${chHm(n)} in one sitting`, unit: 'min', prog: 'max'},
  {id: 'd.goal', per: 'd', kind: 'study', key: 'goal', n: () => 1, t: () => `Hit your daily goal (${P.goal} session${P.goal === 1 ? '' : 's'})`, show: 'n'},
  {id: 'd.am', per: 'd', kind: 'study', key: 'am', n: () => 30, t: () => 'Study 30 min before noon', unit: 'min', ok: () => new Date().getHours() < 11},
  {id: 'd.eve', per: 'd', kind: 'study', key: 'eve', n: () => 30, t: () => 'Study 30 min after 6 PM', unit: 'min'},
  {id: 'd.tags', per: 'd', kind: 'study', key: 'tags', n: () => 2, t: () => 'Study 2 different subjects (10+ min each)', ok: () => new Set(LOG.slice(-60).map(x => x.tag || 'General')).size >= 2},
  {id: 'd.rwin', per: 'd', kind: 'ranked', key: 'rwin', n: () => 1, t: () => 'Win a ranked match'},
  {id: 'd.rplay', per: 'd', kind: 'ranked', key: 'rplay', n: () => 2, t: () => 'Play 2 ranked matches'},
  {id: 'd.post', per: 'd', kind: 'feed', key: 'posts', n: () => 1, t: () => 'Post something to the Feed'},

  {id: 'w.min', per: 'w', kind: 'study', key: 'min', n: u => chR60(u.min * 5 * (.8 + Math.random() * .4)), t: n => `Study ${chHm(n)} this week`, unit: 'min', main: 1},
  {id: 'w.days', per: 'w', kind: 'study', key: 'days', n: () => 5, t: n => `Study on ${n} different days`, days: 1},
  {id: 'w.goal', per: 'w', kind: 'study', key: 'goal', n: () => 4, t: n => `Hit your daily goal on ${n} days`, days: 1},
  {id: 'w.long', per: 'w', kind: 'study', key: 'long90', n: () => 2, t: n => `Have ${n} sittings of 90+ min`},
  {id: 'w.n', per: 'w', kind: 'study', key: 'n', n: u => u.sess * 5, t: n => `Finish ${n} focus sessions`},
  {id: 'w.rwin', per: 'w', kind: 'ranked', key: 'rwin', n: () => 5, t: n => `Win ${n} ranked matches`},
  {id: 'w.rplay', per: 'w', kind: 'ranked', key: 'rplay', n: () => 8, t: n => `Play ${n} ranked matches`},
  {id: 'w.close', per: 'w', kind: 'ranked', key: 'rclose', n: () => 1, t: () => 'Win a close match (opponent within 100 Elo)'},
  {id: 'w.rws', per: 'w', kind: 'ranked', key: 'rws', n: () => 2, t: n => `Win ${n} ranked matches in a row`, prog: 'max'},
  {id: 'w.post', per: 'w', kind: 'feed', key: 'posts', n: () => 3, t: n => `Post to the Feed ${n} times`},

  {id: 'm.min', per: 'm', kind: 'study', key: 'min', n: u => chR60(u.min * 20 * (.8 + Math.random() * .4)), t: n => `Study ${chHm(n)} this month`, unit: 'min', main: 1},
  {id: 'm.days', per: 'm', kind: 'study', key: 'days', n: () => 20, t: n => `Study on ${n} different days`, days: 1},
  {id: 'm.streak', per: 'm', kind: 'study', key: 'streak', n: () => 10, t: n => `Study ${n} days in a row`, days: 1, prog: 'max'},
  {id: 'm.goal', per: 'm', kind: 'study', key: 'goal', n: () => 15, t: n => `Hit your daily goal on ${n} days`, days: 1},
  {id: 'm.long', per: 'm', kind: 'study', key: 'long90', n: () => 6, t: n => `Have ${n} sittings of 90+ min`},
  {id: 'm.rwin', per: 'm', kind: 'ranked', key: 'rwin', n: () => 15, t: n => `Win ${n} ranked matches`},
  {id: 'm.rws', per: 'm', kind: 'ranked', key: 'rws', n: () => 3, t: n => `Win ${n} ranked matches in a row`, prog: 'max'},
  {id: 'm.rival', per: 'm', kind: 'ranked', key: 'rrival', n: () => 3, t: n => `Beat a rival ${n} times`, ok: () => Object.keys(R.rec || {}).some(w => isRival(+w))},
  {id: 'm.close', per: 'm', kind: 'ranked', key: 'rclose', n: () => 4, t: n => `Win ${n} close matches (within 100 Elo)`},
  {id: 'm.post', per: 'm', kind: 'feed', key: 'posts', n: () => 8, t: n => `Post to the Feed ${n} times`}
];
const chDef = id => CH_POOL.find(c => c.id === id);
// ranked challenges only if ranked is on, and fewer of them if you haven't played lately
function chRankedMax(per){
  if (!R.on) return 0;
  const recent = (R.hist || []).filter(h => !h.f && h.t > Date.now() - 30 * 864e5).length;
  return per === 'd' ? (recent ? 1 : 0) : recent >= 5 ? 2 : 1;
}
function chMake(def, per){
  const u = chUsual(), t0 = chStart(per), have = chData(t0)[def.key] || 0;
  let n = Math.max(1, Math.round(def.n(u)));
  if (def.days) n = Math.max(1, Math.min(n, have + chDaysLeft(per)));          // still possible with the days left
  // handed out partway through the period (first time, or after a reroll): what's done counts, and the rest is scaled to the time left
  const frac = (chEnd(per) - Date.now()) / (chEnd(per) - t0);
  if (!def.days && def.prog !== 'max' && n > 3 && frac < .9){ n = have + n * frac; n = def.unit === 'min' ? (per === 'd' ? chR15(n) : chR60(n)) : Math.round(n); n = Math.max(have + 1, n); }
  return {id: def.id, n};
}
function chPick(per, keep = []){
  const used = new Set(keep.map(c => c.id)), out = keep.slice(), rmax = chRankedMax(per);
  const pool = CH_POOL.filter(c => c.per === per && !used.has(c.id) && (!c.ok || c.ok()));
  // the main "study X" one first, then a shuffle with at most a couple of ranked ones
  const main = pool.find(c => c.main); if (main && !keep.length) { out.push(chMake(main, per)); used.add(main.id); }
  const rest = pool.filter(c => !used.has(c.id)).sort(() => Math.random() - .5);
  for (const c of rest){
    if (out.length >= CH_N[per]) break;
    if (c.kind === 'ranked' && out.filter(x => chDef(x.id).kind === 'ranked').length >= rmax) continue;
    if (c.kind === 'feed' && out.some(x => chDef(x.id).kind === 'feed')) continue;
    out.push(chMake(c, per));
  }
  return out;
}
function chSets(){
  let changed = false;
  ['d', 'w', 'm'].forEach(per => { const k = chKey(per); if (!CHL.sets[per] || CHL.sets[per].k !== k){ CHL.sets[per] = {k, list: chPick(per)}; changed = true; } });
  if (changed){ const keep = new Set(['d', 'w', 'm'].map(p => CHL.sets[p].k)); Object.keys(CHL.done).forEach(x => { if (!keep.has(x.split('|')[0])) delete CHL.done[x]; }); saveChl(); }
  return CHL.sets;
}
function chProg(per, c){
  const def = chDef(c.id); if (!def) return {v: 0, n: c.n, done: false};
  const done = CHL.done[CHL.sets[per].k + '|' + c.id];
  const v = done ? c.n : Math.min(c.n, chData(chStart(per))[def.key] || 0);
  return {v, n: c.n, done: !!done, def};
}
// mark newly finished ones (and celebrate)
function chCheck(){
  if (typeof RK_READY !== 'undefined' && !RK_READY) return;
  const sets = chSets(); let any = false;
  ['d', 'w', 'm'].forEach(per => {
    const S = sets[per]; let fresh = 0;
    S.list.forEach(c => { const k = S.k + '|' + c.id; if (CHL.done[k]) return; const p = chProg(per, c); if (p.v >= c.n){ CHL.done[k] = Date.now(); CHL.total = (CHL.total || 0) + 1; fresh++; any = true; toast(`Challenge complete: ${p.def.t(c.n)}`); } });
    if (fresh && S.list.every(c => CHL.done[S.k + '|' + c.id])) setTimeout(() => toast(`All ${CH_NAME[per].toLowerCase()} challenges done!`), 1800);
  });
  if (any){ saveChl(); try { fx.burst(); } catch(e){} }
  chRender();
}
function chReroll(per, id){
  const today = dayKey(Date.now()); if (CHL.rr.day === today && CHL.rr.used >= 1) return toast('You’ve used today’s reroll.');
  const S = CHL.sets[per], i = S.list.findIndex(c => c.id === id); if (i < 0 || CHL.done[S.k + '|' + id]) return;
  const others = S.list.filter(c => c.id !== id), was = chDef(id).kind;
  const pool = CH_POOL.filter(c => c.per === per && c.id !== id && !S.list.some(x => x.id === c.id) && (!c.ok || c.ok())
    && !(c.kind === 'ranked' && was !== 'ranked' && others.filter(x => chDef(x.id).kind === 'ranked').length >= chRankedMax(per))
    && !(c.kind === 'feed' && others.some(x => chDef(x.id).kind === 'feed')));
  if (!pool.length) return toast('No other challenge to swap in.');
  S.list[i] = chMake(pool[Math.floor(Math.random() * pool.length)], per);
  CHL.rr = {day: today, used: 1}; saveChl(); chCheck();
}

/* ---- drawing ---- */
function chLeft(per){
  const ms = chEnd(per) - Date.now(), h = Math.floor(ms / 3600e3), d = Math.floor(h / 24);
  return d >= 1 ? `${d}d ${h % 24}h left` : h >= 1 ? `${h}h ${Math.floor(ms % 3600e3 / 60000)}m left` : `${Math.max(1, Math.floor(ms / 60000))}m left`;
}
function chItem(per, c, canRr){
  const p = chProg(per, c); if (!p.def) return '';
  const fmt = v => p.def.unit === 'min' ? chHm(v).replace(' min', 'm') : v.toLocaleString();
  return `<li class="chl-i${p.done ? ' done' : ''}"><span class="chl-ck" aria-hidden="true">${p.done ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ''}</span>
    <div class="chl-b"><div class="chl-t">${esc(p.def.t(c.n))}</div><div class="chl-bar"><i style="width:${Math.min(100, p.v / c.n * 100)}%"></i></div></div>
    <small class="chl-v">${p.done ? 'Done' : `${fmt(p.v)} / ${fmt(c.n)}`}</small>
    ${!p.done && canRr ? `<button class="chl-rr" data-chrr="${per}|${c.id}" aria-label="Reroll this challenge" title="Swap for another (1 free a day)"><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg></button>` : ''}</li>`;
}
function chRender(){
  const full = $('#chalSlot'), rk = $('#chalRk'); if (!full && !rk) return;
  if (typeof RK_READY !== 'undefined' && !RK_READY) return;
  const sets = chSets(), canRr = !(CHL.rr.day === dayKey(Date.now()) && CHL.rr.used >= 1);
  if (full && !$('#page-focus').hidden){
    full.innerHTML = `<div class="card chl"><div class="h first chl-h"><span>Challenges</span><small>${canRr ? '1 free reroll today' : 'Reroll used today'}</small></div>
      ${['d', 'w', 'm'].map(per => { const S = sets[per], nd = S.list.filter(c => CHL.done[S.k + '|' + c.id]).length;
        return `<div class="chl-sec"><div class="chl-sh"><b>${CH_NAME[per]}</b><span>${nd}/${S.list.length} · ${chLeft(per)}</span></div><ul>${S.list.map(c => chItem(per, c, canRr)).join('')}</ul></div>`; }).join('')}
      <p class="hint">${(CHL.total || 0).toLocaleString()} challenge${CHL.total === 1 ? '' : 's'} completed so far.</p></div>`;
  }
  if (rk && !$('#page-ranked').hidden){
    const mine = ['d', 'w', 'm'].flatMap(per => sets[per].list.filter(c => chDef(c.id) && chDef(c.id).kind === 'ranked').map(c => [per, c]));
    rk.innerHTML = mine.length ? `<div class="card chl"><div class="h first chl-h"><span>Ranked challenges</span><button class="link-btn" data-go="focus">All challenges →</button></div>
      <ul>${mine.map(([per, c]) => chItem(per, c, canRr).replace('<div class="chl-t">', `<div class="chl-t"><em>${CH_NAME[per]}</em> `)).join('')}</ul></div>` : '';
  }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-chrr]'); if (!b) return; const [per, id] = b.dataset.chrr.split('|'); chReroll(per, id); });
{ const _r = renderLog; renderLog = function(){ const x = _r.apply(this, arguments); try { chCheck(); } catch(err){ console.error(err); } return x; }; }
{ const _o = onPageShown; onPageShown = function(name){ const x = _o.apply(this, arguments); if (name === 'focus' || name === 'ranked') chCheck(); return x; }; }
setInterval(() => { try { chCheck(); } catch(e){ console.error(e); } }, 30000);
setTimeout(() => { try { chCheck(); } catch(e){} }, 4000);
