/* ---------- Leaderboards, redesigned: podium, your standing, movement, filters, the whole list ----------
   Uses the data side of leaderboards.js (LB, botVal, myTotals, myPlace, lbFmt, topPct) and replaces how the page is drawn.
   Every board can be scrolled from #1 to the last player: the full order is worked out once per category (Elo is already
   sorted) and kept until the world changes. Movement arrows compare with the top 100 saved on the last day before today; your rank history
   is saved daily for the chart on your card. */
const LB_GROUPS = [
  ['Rating', '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>', [['elo', 'Elo'], ['rkw', 'Ranked wins'], ['rkp', 'Win %']]],
  ['Time', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', [['hours', 'All time'], ['week', 'This week'], ['month', 'This month']]],
  ['Streaks', '<path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.6 2.7-5.5 3.6-9.3 1.9 1.2 3 3 3 5 1-.6 1.6-1.8 1.7-3.2 2.4 1.8 4.7 4.5 4.7 7.6C18.5 18.4 16 21 12 21z"/>', [['cur', 'Current'], ['best', 'Best']]],
  ['Records', '<circle cx="12" cy="14" r="5.5"/><path d="M9 3h6l-1.5 5.5h-3zM12 11.5v2.5l1.5 1"/>', [['sess', 'Longest session'], ['day', 'Biggest day'], ['days', 'Most days'], ['count', 'Sessions']]],
  ['Awards', '<path d="M7 4h10v4.5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4M12 13.5V17M8.5 20h7M10 17h4"/>', [['pts', 'Points'], ['lvl', 'Level']]], ['Elimination', '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M14 14l5 5M19 14l-5 5"/>', [['elw', 'Wins'], ['el3', 'Top 3']]]];
const LB_FILTERS = [['all', 'Everyone'], ['following', 'Following'], ['major', 'Your major'], ['rivals', 'Rivals']];
const lbIcon = d => `<svg class="lb2-ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

/* ---- the full order for a category ---- */
const LBO = {};
function lbOrder(c){
  const key = `${botsVer}|${c.f == null ? (lbPts ? 1 : 0) : ''}`;
  if (LBO[c.id] && LBO[c.id].key === key) return LBO[c.id].ord;
  let ord;
  if (c.id === 'elo') ord = sortedBots();
  else {
    // pack (value, Elo, bot) into one number and sort those natively: fast for 682,925 players
    const N = ROSTER_N, S = 1048576, keys = new Float64Array(N);
    for (let i = 0; i < N; i++){ const v = Math.min(850000, Math.max(0, botVal(c, i))), e = Math.max(0, Math.min(9999, BS[i * BF])); keys[i] = -((v * 1e4 + e) * S + (S - 1 - i)); }
    keys.sort(); ord = new Int32Array(N);
    for (let k = 0; k < N; k++){ const x = -keys[k]; ord[k] = S - 1 - (x % S); }
  }
  LBO[c.id] = {key, ord}; return ord;
}
// the list being shown: everyone, or a smaller set; at(k) is the player at position k (ME for you), place k + 1
function lbView(c, t){
  const me = c.me(t), filt = P.lbFilt || 'all';
  if (filt === 'all'){
    const ord = lbOrder(c), mine = myPlace(c, t) - 1;
    return {n: ROSTER_N + 1, mine, at: k => k === mine ? ME : ord[k < mine ? k : k - 1], val: w => w === ME ? me : botVal(c, w), me};
  }
  let ids = [];
  if (filt === 'following') ids = (typeof FD !== 'undefined' ? FD.follows : []).slice();
  else if (filt === 'rivals') ids = Object.keys(R.rec || {}).map(Number).filter(w => isRival(w));
  else if (filt === 'major' && P.myMajor){ const s = new Set(); for (let i = 0; i < ROSTER_N && s.size < 4000; i++) if (bot(i).major === P.myMajor) s.add(i); ids = [...s]; }
  const val = w => w === ME ? me : botVal(c, w), elo = w => w === ME ? R.mmr : BS[w * BF];
  const list = [...new Set(ids)].filter(w => w >= 0 && w < ROSTER_N); list.push(ME);
  list.sort((a, b) => val(b) - val(a) || elo(b) - elo(a) || (a === ME ? -1 : b === ME ? 1 : a - b));
  return {n: list.length, mine: list.indexOf(ME), at: k => list[k], val, me};
}

/* ---- saved history: your place each day, and a week of daily top 100s for the arrows ---- */
let LBH = store.get('fb.lbHist', {}), LBS = store.get('fb.lbSnap', {}), LBP = store.get('fb.lbPeriod', {});
function lbNote(c, V){
  const dk = dayKey(Date.now());
  if ((P.lbFilt || 'all') !== 'all') return;
  (LBH[dk] = LBH[dk] || {})[c.id] = V.mine + 1;
  const days = Object.keys(LBH).sort(); while (days.length > 40) delete LBH[days.shift()];
  const s = LBS[c.id] || {};
  const cur = {}; for (let k = 0; k < Math.min(100, V.n); k++){ const w = V.at(k); cur[w === ME ? 'me' : w] = k + 1; }
  // daily top 100s (a week kept)
  s.days = s.days || {}; if (s.prev && s.pday && !s.days[s.pday]) s.days[s.pday] = s.prev;
  s.days[dk] = cur; s.day = dk; s.cur = cur;
  const ks = Object.keys(s.days).sort(); while (ks.length > 9) delete s.days[ks.shift()];
  const old = ks.filter(k => k < dk), at = old[old.length - 1];       // the arrows compare with the last saved day before today
  s.prev = at ? s.days[at] : null; s.pday = at || null; LBS[c.id] = s;
  // weekly and monthly boards: remember each period's top 3, for "last week's winners"
  if (c.id === 'week' || c.id === 'month'){
    const pk = c.id === 'week' ? dayKey(startOfWeek(new Date())) : dk.slice(0, 7);
    LBP[c.id] = LBP[c.id] || {}; LBP[c.id][pk] = [0, 1, 2].filter(k => k < V.n).map(k => { const w = V.at(k); return [w === ME ? -1 : w, V.val(w)]; });
    const ks = Object.keys(LBP[c.id]).sort(); while (ks.length > 6) delete LBP[c.id][ks.shift()];
    store.set('fb.lbPeriod', LBP);
  }
  store.set('fb.lbHist', LBH); store.set('fb.lbSnap', LBS);
}
// how a player moved since the last saved day: +n up, -n down, 'new' for new to the top 100
function lbMove(c, w, place){
  const s = LBS[c.id]; if (!s || !s.prev || (P.lbFilt || 'all') !== 'all') return null;
  const was = s.prev[w === ME ? 'me' : w];
  if (was == null) return place <= 50 && w !== ME ? 'new' : null;
  return was - place;
}
const lbMoveHtml = m => m == null || m === 0 ? '<span class="lb2-mv"></span>' : m === 'new' ? '<span class="lb2-mv new">New</span>' : `<span class="lb2-mv ${m > 0 ? 'up' : 'dn'}">${m > 0 ? '▲' : '▼'}${Math.abs(m).toLocaleString()}</span>`;

/* ---- details per category ---- */
function lbRecDate(c, w){
  if (w === ME){
    if (c.id === 'sess'){ const s = LOG.reduce((a, x) => !a || x.min > a.min ? x : a, null); return s ? s.t : null; }
    const by = {}; LOG.forEach(x => { const k = dayKey(x.t); by[k] = (by[k] || 0) + x.min; }); let best = null, bv = 0; Object.entries(by).forEach(([k, v]) => { if (v > bv){ bv = v; best = k; } }); return best ? new Date(best + 'T12:00').getTime() : null;
  }
  const days = Math.max(3, Math.min(150, BS[w * BF + F.days] || 3)), back = 1 + (Math.imul(w + 7, 2654435761) >>> 0) % days;
  return Date.now() - back * 864e5;
}
function lbTags(c, w){
  const out = [];
  if (w !== ME && botLiveNow(w)) out.push('<span class="lb2-live">● studying</span>');
  if (c.id === 'cur' || c.id === 'best'){
    const cur = w === ME ? myTotals().cur : BS[w * BF + F.cur], best = w === ME ? myTotals().best : BS[w * BF + F.best];
    if (c.id === 'cur' && cur >= 7) out.push(`<span class="lb2-fire" style="--s:${Math.min(1.5, .8 + cur / 120)}">🔥</span>`);
    if (c.id === 'best' && cur > 0 && cur >= best) out.push('<span class="lb2-tag">still going</span>');
  }
  if (c.id === 'sess' || c.id === 'day'){ const d = lbRecDate(c, w); if (d) out.push(`<span class="lb2-date">${new Date(d).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>`); }
  if (c.id === 'pts' && w !== ME){ try { const b = rareSort(botBadges(w))[0]; if (b) out.push(badgeHtml(b)); } catch(e){} }
  return out.join(' ');
}
function lbSub(w){
  const rk = w === ME ? myRk() : rkOf(w);
  return `${emblem(rk, 'xs')} ${esc(rk.full)}${w === ME ? '' : ` · ${esc(bot(w).style)}`}`;
}
const lbGapTxt = (u, d) => u === 'elo' ? `+${d.toLocaleString()} Elo` : u === 'min' ? `${lbFmt('min', d)} more` : u === 'd' ? `${d} more day${d === 1 ? '' : 's'}` : u === 'pts' ? `+${d.toLocaleString()} pts` : u === 'pct' ? `+${(d / 10).toFixed(1)} points of win rate` : u === 'xp' ? `+${d.toLocaleString()} XP` : `${d.toLocaleString()} more`;

/* ---- drawing ---- */
const LBV = {from: 3, to: 53, cat: null, filt: null};
function lbRow2(c, V, k){
  const w = V.at(k), place = k + 1, me = w === ME, B = me ? null : bot(w);
  return `<li class="lb-row lb2-row${me ? ' me' : ''}" ${me ? 'data-me' : `data-bot="${w}"`} tabindex="0" data-k="${k}"><span class="pl">${place.toLocaleString()}</span>${lbMoveHtml(lbMove(c, w, place))}${me ? myAvatar('sm') : avatar(B, 'sm')}
    <span class="who"><b>${esc(me ? myName() : B.name)} ${lbTags(c, w)}</b><small>${lbSub(w)}</small></span><span class="val">${lbFmt(c.u, V.val(w))}</span></li>`;
}
function lbPodium(c, V){
  const spot = k => { if (k >= V.n) return '<div class="lb2-step"></div>'; const w = V.at(k), me = w === ME, B = me ? null : bot(w), live = !me && botLiveNow(w);
    return `<div class="lb2-step s${k + 1}" ${me ? 'data-me' : `data-bot="${w}"`} tabindex="0">${k === 0 ? '<span class="lb2-crown">👑</span>' : ''}<span class="lb2-pav">${me ? myAvatar('lg') : avatar(B, 'lg')}${live ? '<i class="lb2-dot"></i>' : ''}</span>
      <b>${esc(me ? myName() : B.name)}</b><small>${emblem(me ? myRk() : rkOf(w), 'xs')} ${lbFmt(c.u, V.val(w))}</small>${lbMoveHtml(lbMove(c, w, k + 1))}<div class="lb2-block">${k + 1}</div></div>`; };
  return `<div class="lb2-pod">${spot(1)}${spot(0)}${spot(2)}</div>`;
}
function lbYouCard(c, V, t){
  const place = V.mine + 1, me = V.me, all = (P.lbFilt || 'all') === 'all';
  // your rank over the last 7 days: one slot per day (a dot where that day was saved), higher on the chart = better rank
  let chart = '';
  if (all){
    const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
    const vals = days.map(d => (LBH[dayKey(d.getTime())] || {})[c.id] || null), got = vals.filter(v => v);
    if (got.length){
      const lo = Math.min(...got), hi = Math.max(...got), sp = Math.max(1, hi - lo), X = i => 22 + i * 276 / 6, Y = v => got.length < 2 || hi === lo ? 62 : 26 + (v - lo) / sp * 72;
      const pts = vals.map((v, i) => v ? [X(i), Y(v), v] : null).filter(Boolean), L = pts[pts.length - 1];
      chart = `<svg class="lb2-spark" viewBox="0 0 320 128" role="img" aria-label="Your rank on each of the last 7 days">
        ${days.map((d, i) => `<line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="14" y2="106" class="lb2-grid"/>`).join('')}
        ${pts.length > 1 ? `<polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
        ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${p === L ? 5 : 3.6}" fill="var(--accent)"><title>#${p[2].toLocaleString()}</title></circle>`).join('')}
        <text x="${Math.min(298, Math.max(22, L[0])).toFixed(1)}" y="${(L[1] - 11).toFixed(1)}" text-anchor="${L[0] > 250 ? 'end' : 'middle'}" class="lb2-val">#${L[2].toLocaleString()}</text>
        ${days.map((d, i) => `<text x="${X(i).toFixed(1)}" y="123" text-anchor="middle" class="lb2-day${i === 6 ? ' now' : ''}">${i === 6 ? 'Today' : d.toLocaleDateString(undefined, {weekday: 'short'})}</text>`).join('')}
      </svg><small class="hint">Your rank, last 7 days${got.length < 7 ? ' · fills in a day at a time' : ''}</small>`;
    } else chart = '<small class="hint">Your rank chart fills in day by day.</small>';
  }
  // what's next: the player just above you, and the next top-% mark
  let next = '';
  if (V.mine > 0){ const w = V.at(V.mine - 1), gap = V.val(w) - me + (c.u === 'elo' || c.u === 'n' || c.u === 'pts' || c.u === 'd' ? 1 : 1);
    next += `<div>${lbGapTxt(c.u, Math.max(1, gap))} to pass <b>${esc(bot(w).name)}</b></div>`; }
  if (all){ const mark = [50, 25, 10, 5, 1].map(p => [p, Math.floor(V.n * p / 100)]).find(([, at]) => at >= 1 && place > at);
    if (mark){ const w = V.at(mark[1] - 1), gap = V.val(w) - me + 1; next += `<div class="hint">${lbGapTxt(c.u, Math.max(1, gap))} to reach the top ${mark[0]}%</div>`; } }
  let extra = '';
  if (c.id === 'rkp' && myGames() < 20){ next = `<div>Play ${20 - myGames()} more rated game${20 - myGames() === 1 ? '' : 's'} to get a win rate on this board.</div>`; }
  if (c.id === 'rkp' && myGames()) extra = `<div class="hint">${R.w}–${R.l}${R.d ? '–' + R.d : ''} in rated games · ${winPct(R.w, myGames())}</div>`;
  if (c.id === 'cur'){ const today = LOG.filter(x => dayKey(x.t) === dayKey(Date.now())).reduce((n, x) => n + x.min, 0); if (today < 10) extra = `<div class="hint">${t.cur ? 'Study 10+ minutes today to keep your streak.' : 'Study 10+ minutes today to start a streak.'}</div>`; }
  if (c.id === 'pts') extra = `<div class="hint">${ACHS.filter(a => ACH.u[a.id]).length} of ${ACHS.length} achievements unlocked.</div>`;
  return `<div class="lb2-you"><small class="hint">Your standing · ${esc(c.name)}${all ? '' : ` · ${LB_FILTERS.find(f => f[0] === P.lbFilt)[1]}`}</small><div class="lb2-big">#${place.toLocaleString()}</div>
    <div class="hint">${all ? topPct(place) + ' · ' : `of ${V.n.toLocaleString()} · `}${lbFmt(c.u, me)}</div>${chart}${next || extra ? `<div class="lb2-next">${next}${extra}</div>` : ''}</div>`;
}
function lbDist(c, V){
  if ((P.lbFilt || 'all') !== 'all') return '';
  const ord = lbOrder(c), N = ord.length, hiV = botVal(c, ord[Math.floor(N * .001)]), loV = botVal(c, ord[Math.floor(N * .99)]), B = 18, cnt = new Array(B).fill(0), sp = Math.max(1, hiV - loV);
  for (let k = 0; k < N; k += 7){ const v = botVal(c, ord[k]); cnt[Math.max(0, Math.min(B - 1, Math.floor((v - loV) / sp * B)))]++; }
  const mx = Math.max(...cnt), mb = Math.max(0, Math.min(B - 1, Math.floor((V.me - loV) / sp * B)));
  const bars = cnt.map((n, i) => { const h = Math.max(1, n / mx * 60); return `<rect x="${i * 11 + 1}" y="${64 - h}" width="9" height="${h}" rx="1.5" fill="${i === mb ? 'var(--accent)' : 'var(--line)'}"/>`; }).join('');
  return `<div class="h first">Where you stand</div><svg class="lb2-hist" viewBox="0 0 200 66" role="img" aria-label="How ${N.toLocaleString()} players are spread out, and where you are">${bars}<line x1="${mb * 11 + 5.5}" y1="0" x2="${mb * 11 + 5.5}" y2="64" stroke="var(--accent)" stroke-dasharray="3 2"/></svg>
    <div class="lb2-hist-x"><span>${lbFmt(c.u, loV)}</span><span>you</span><span>${lbFmt(c.u, hiV)}+</span></div>`;
}
function lbPeriodCard(c){
  if (c.id !== 'week' && c.id !== 'month') return '';
  const now = new Date(), end = c.id === 'week' ? (() => { const d = startOfWeek(now); d.setDate(d.getDate() + 7); return d; })() : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const ms = end - now, d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
  const pk = c.id === 'week' ? (() => { const s = startOfWeek(now); s.setDate(s.getDate() - 7); return dayKey(s); })() : (() => { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); return dayKey(s).slice(0, 7); })();
  const last = LBP[c.id] && LBP[c.id][pk];
  return `<div class="h first">${esc(c.name)} · resets in ${d ? `${d}d ` : ''}${h}h</div>${last && last.length ? `<div class="lb2-last"><small class="hint">Last ${c.id === 'week' ? 'week' : 'month'}</small>${last.map(([w, v], k) => `<span>${['🥇', '🥈', '🥉'][k]} <b>${esc(w === -1 ? myName() : bot(w).name)}</b> ${lbFmt(c.u, v)}</span>`).join('')}</div>` : '<p class="hint">Last period’s winners show up here once a period ends.</p>'}`;
}
let lbIO = null;
function renderLeaders(){
  if (!$('#lbList')) return;
  if (!RK_READY){ $('#lbList').innerHTML = `<li class="lb-wait">Loading ${(ROSTER_N + 1).toLocaleString()} players…</li>`; return; }
  const c = LB.find(x => x.id === P.lbCat) || LB[0], t = myTotals(), filt = P.lbFilt || 'all';
  $('#lbCats').innerHTML = LB_GROUPS.map(([g, ic, cats]) => `<div class="lb2-grp${cats.some(([id]) => id === c.id) ? ' on' : ''}">${lbIcon(ic)}<span class="lb2-gl">${g}</span>${cats.map(([id, l]) => `<button data-v="${id}" aria-pressed="${id === c.id}">${l}</button>`).join('')}</div>`).join('');
  $('#lbFilt').innerHTML = `<div class="seg">${LB_FILTERS.map(([k, l]) => `<button data-lbf="${k}" aria-pressed="${filt === k}">${l}</button>`).join('')}</div>${filt === 'major' ? `<select id="lbMajor" aria-label="Your major"><option value="">Pick your major</option>${MAJORS.slice().sort((a, b) => a.n.localeCompare(b.n)).map(m => `<option value="${m.k}"${P.myMajor === m.k ? ' selected' : ''}>${esc(m.n)}</option>`).join('')}</select>` : ''}`;
  $('#lbTitle').textContent = c.name; $('#lbDesc').textContent = c.desc;
  if (!lbReady(c)){ $('#lbList').innerHTML = '<li class="lb-wait">Adding up everyone\'s achievement points…</li>'; $('#lbPod').innerHTML = ''; $('#lbPin').innerHTML = ''; $('#lbYouCard').innerHTML = '<p class="hint">Adding up points…</p>'; $('#lbDist').hidden = true; $('#lbPer').hidden = true; ensureBotPoints(() => { if (!$('#page-leaders').hidden) renderLeaders(); }); return lbMineSide(c, t); }
  if (filt === 'major' && !P.myMajor){ $('#lbList').innerHTML = '<li class="lb-wait">Pick your major above to see players in it.</li>'; $('#lbPod').innerHTML = ''; $('#lbYouCard').innerHTML = ''; $('#lbDist').innerHTML = ''; return lbMineSide(c, t); }
  const V = lbView(c, t); lbNote(c, V);
  if (LBV.cat !== c.id || LBV.filt !== filt){ LBV.cat = c.id; LBV.filt = filt; LBV.from = Math.min(3, V.n); LBV.to = Math.min(V.n, 53); }
  if (typeof lbJump !== 'undefined' && lbJump){ lbJump = false; lbGoMe(V, false); }
  LBV.to = Math.min(LBV.to, V.n); LBV.from = Math.min(LBV.from, LBV.to);
  $('#lbPod').innerHTML = lbPodium(c, V);
  let h = LBV.from > 3 ? `<li class="lb2-more"><button class="small-btn" data-lbm="up">Show ${Math.min(50, LBV.from - 3)} above</button></li>` : '';
  for (let k = LBV.from; k < LBV.to; k++) h += lbRow2(c, V, k);
  if (LBV.to < V.n) h += '<li class="lb2-more" id="lbMoreAt"><span class="hint">Loading more…</span></li>';
  $('#lbList').innerHTML = h || '<li class="lb-wait">Just you here so far.</li>';
  // a pinned "you" row while you're out of view
  const inView = V.mine >= LBV.from && V.mine < LBV.to || V.mine < 3;
  $('#lbPin').innerHTML = inView ? '' : `<ol class="lb-list">${lbRow2(c, V, V.mine).replace('lb2-row me', 'lb2-row me pinned')}</ol>`;
  $('#lbJump').textContent = V.mine < LBV.to && V.mine >= LBV.from || V.mine < 3 ? 'Back to the top' : 'Jump to me';
  $('#lbYouCard').innerHTML = lbYouCard(c, V, t);
  $('#lbDist').innerHTML = lbDist(c, V); $('#lbDist').hidden = !$('#lbDist').innerHTML;
  $('#lbPer').innerHTML = lbPeriodCard(c); $('#lbPer').hidden = !$('#lbPer').innerHTML;
  lbMineSide(c, t);
  // load the next 50 when you scroll near the bottom
  if (lbIO) lbIO.disconnect(); const s = $('#lbMoreAt');
  if (s){ lbIO = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)){ LBV.to = Math.min(V.n, LBV.to + 50); lbIO.disconnect(); renderLeaders(); } }, {rootMargin: '400px'}); lbIO.observe(s); }
}
function lbMineSide(c, t){
  $('#lbMine').innerHTML = LB.map(x => { const ready = lbReady(x), place = ready ? myPlace(x, t) : null;
    return `<li><button class="${x.id === c.id ? 'on' : ''}" data-v="${x.id}"><span class="nm">${x.name}</span><span class="mv2">${lbFmt(x.u, x.me(t))}</span><span class="pl2">${place ? `#${place.toLocaleString()} · ${topPct(place)}` : '…'}</span></button></li>`; }).join('');
}
function lbGoMe(V, draw = true){ LBV.from = Math.max(3, V.mine - 20); LBV.to = Math.min(V.n, V.mine + 30); if (draw){ renderLeaders(); setTimeout(() => { const r = document.querySelector('#lbList [data-me]'); if (r) r.scrollIntoView({block: 'center', behavior: 'smooth'}); }, 30); } }
document.addEventListener('click', e => {
  if (!e.target.closest('#page-leaders')) return;
  const f = e.target.closest('[data-lbf]'); if (f){ P.lbFilt = f.dataset.lbf; saveP(); renderLeaders(); return; }
  const m = e.target.closest('[data-lbm]'); if (m){ LBV.from = Math.max(3, LBV.from - 50); renderLeaders(); return; }
  const j = e.target.closest('#lbJump'); if (j){ const c = LB.find(x => x.id === P.lbCat) || LB[0], V = lbView(c, myTotals()); if (j.textContent === 'Back to the top'){ LBV.from = 3; LBV.to = Math.min(V.n, 53); renderLeaders(); window.scrollTo({top: 0, behavior: 'smooth'}); } else lbGoMe(V); return; }
  const p = e.target.closest('.lb2-step[data-bot]'); if (p) openBot(+p.dataset.bot);
  const pr = e.target.closest('#lbPin [data-bot], #lbPod [data-me], #lbPin [data-me]'); if (pr && pr.dataset.me != null) openFullProfile(ME);
}, true);
document.addEventListener('change', e => { if (e.target.id === 'lbMajor'){ P.myMajor = e.target.value || null; saveP(); renderLeaders(); } });
$('#lbJump').onclick = null;

// once a day (a little after the app opens), save your place on the boards you've looked at, so the 7-day chart has a
// dot for days you didn't open Leaderboards
function lbDailyNote(){
  try {
    if (typeof RK_READY === 'undefined' || !RK_READY || (P.lbFilt || 'all') !== 'all') return;
    const dk = dayKey(Date.now()), seen = Object.keys(LBS), today = LBH[dk] || {};
    const cats = LB_GROUPS.flatMap(g => g[2]).map(([id]) => id).filter(id => seen.includes(id) && today[id] == null).slice(0, 4);
    cats.forEach((id, i) => setTimeout(() => { try { const c = LB.find(x => x.id === id); if (c) lbNote(c, lbView(c, myTotals())); } catch(e){} }, i * 1500));
  } catch(e){}
}
setTimeout(function lbDailyStart(){ if (typeof RK_READY === 'undefined' || !RK_READY) return setTimeout(lbDailyStart, 5000); lbDailyNote(); setInterval(lbDailyNote, 3 * 3600e3); }, 20000);
