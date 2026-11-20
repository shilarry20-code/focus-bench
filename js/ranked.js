/* ---------- Ranked: 682,925 bots, Elo, ranks, badges ---------- */
// Each bot is generated from a fixed seed (name, look, style, habits), so only the numbers that
// change are saved: each bot's rating and study totals, packed into a typed array kept in IndexedDB.
// The first 5,000 bots are the original roster and keep their names; the rest came later.
const ROSTER_N = 682925, OLD_N = 5000, ROSTER_SEED = 20261113, ROSTER_V = 4, BF = 13;   // BF: fields per bot
const F = {rating:0, total:1, sessions:2, days:3, cur:4, best:5, maxSess:6, maxDay:7, maxWeek:8, maxMonth:9, week:10, month:11, today:12};
function mulberry32(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const gaussOf = rnd => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pick = (rnd, a) => a[Math.floor(rnd() * a.length)];
const clampN = (x, a, b) => Math.max(a, Math.min(b, x));

const RANKS = [
  {name:'Freshman', lo:-1e9, c:'#8e98a3', cuts:[700, 800, 900]},
  {name:'Sophomore', lo:900, c:'#c27a43', cuts:[1000, 1100, 1200]},
  {name:'Scholar', lo:1200, c:'#4a86d8', cuts:[1300, 1400, 1500]},
  {name:'Honors', lo:1500, c:'#8456e8', cuts:[1600, 1700, 1800]},
  {name:"Dean's List", lo:1800, c:'#d9a420', cuts:[1900, 2000, 2100]},
  {name:'Valedictorian', lo:2100, c:'#d9473a', cuts:[2200, 2300, 2400]},
  {name:'Professor', lo:2400, c:'#b62fc0', cuts:[2500, 2600, 2700]},
  {name:'Distinguished Professor', sh:'Dist. Professor', lo:2700, c:'#139e9a', cuts:[2800, 2900, 3000], elite:1},
  {name:'Provost', lo:3000, c:'#d02f4f', cuts:[3100, 3200, 3300], elite:1},
  {name:'Chancellor', lo:3300, c:'#e0a30e', cuts:[3400, 3500, 3600], elite:1, shine:1},
  {name:'Laureate', lo:3600, c:'#3a9be0', cuts:[], elite:1, shine:1},
  {name:'Paragon', lo:Infinity, c:'#f2b01e', cuts:[], elite:1, shine:1, one:1}
];
const LAUREATE = 10, PARAGON_I = 11, LAUREATE_MIN = 3600;
function rankOf(r){
  let i = RANKS.length - 1; while (i > 0 && r < RANKS[i].lo) i--;
  const R0 = RANKS[i];
  if (!R0.cuts.length) return {i, name:R0.name, div:'', full:R0.name, sh:R0.sh || R0.name, c:R0.c, lo:R0.lo, hi:null, d:0};
  const d = r < R0.cuts[0] ? 0 : r < R0.cuts[1] ? 1 : 2;           // 0 = I (start), 1 = II, 2 = III (top)
  const lo = d === 0 ? (i === 0 ? 600 : R0.lo) : R0.cuts[d - 1], hi = R0.cuts[d], dv = ['I','II','III'][d];
  return {i, name:R0.name, div:dv, full:`${R0.name} ${dv}`, sh:`${R0.sh || R0.name} ${dv}`, c:R0.c, lo, hi, d};
}
const PARAGON = {i:PARAGON_I, name:'Paragon', div:'', full:'Paragon', sh:'Paragon', c:RANKS[PARAGON_I].c, lo:LAUREATE_MIN, hi:null, d:0};
const ME = -1;
// a player's rank with the two place-based ranks: the Paragon, and Laureates numbered by place
function rkOf(who){
  if (R && R.para && R.para.h === who) return PARAGON;
  if (who !== ME && !BS) return rankOf(1000);
  const k = rankOf(who === ME ? R.mmr : botRating(who));
  if (k.i === LAUREATE && BS){ const n = placeOf(who); return {...k, n, full:`Laureate #${n}`, sh:`Laureate #${n}`}; }
  return k;
}
const myRk = () => rkOf(ME);
// Rank emblems. emblemSvg(i, d, small): i = rank 0–11, d = division 0–2 (I–III) or -1 for none; small = simpler marks for tiny sizes.
let EMB_UID = 0;
const EMB_PAL = [
  // [main, light, dark, accent]
  ['#8e98a3', '#d3d9df', '#59626c', '#f2c94c'],   // Freshman: iron
  ['#c27a43', '#f0b27e', '#7a4520', '#fff3e0'],   // Sophomore: bronze
  ['#4a86d8', '#a9cdf7', '#24508f', '#ffe9a8'],   // Scholar: steel blue
  ['#8456e8', '#c4acff', '#4e2aa6', '#ffd257'],   // Honors: violet + gold
  ['#d9a420', '#ffe28a', '#94650a', '#7a1f2b'],   // Dean's List: gold
  ['#d9473a', '#ff9b8a', '#8f2117', '#1c2230'],   // Valedictorian: crimson
  ['#b62fc0', '#ee99f5', '#6d1478', '#ffd257'],   // Professor: royal magenta + gold
  ['#139e9a', '#7ff0e6', '#0a5e5b', '#e8fffd'],   // Distinguished Professor: teal gem
  ['#d02f4f', '#ff9aae', '#86152b', '#ffd257'],   // Provost: crimson star
  ['#e0a30e', '#fff0a8', '#94640a', '#e8475f'],   // Chancellor: crown gold
  ['#3a9be0', '#bfe6ff', '#1d5e96', '#fff7d6'],   // Laureate: sky + laurel
  ['#f2b01e', '#fff6c4', '#b5770a', '#ffffff']    // Paragon
];
function emblemSvg(i, d, small){
  const u = 'e' + (++EMB_UID), [c, lt, dk, ac] = EMB_PAL[i];
  const grad = `<defs><linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${dk}"/></linearGradient>
    <linearGradient id="${u}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="${lt}"/><stop offset="1" stop-color="${dk}"/></linearGradient>
    <radialGradient id="${u}s" cx=".35" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
  const G = `url(#${u}g)`, RIM = `url(#${u}r)`, SH = `url(#${u}s)`;
  const shieldP = 'M24 3.5L40.5 9.5V22.5C40.5 32.5 33.5 40 24 44C14.5 40 7.5 32.5 7.5 22.5V9.5Z';
  const shield = (inner) => `<path d="${shieldP}" fill="${G}" stroke="${RIM}" stroke-width="2.4" stroke-linejoin="round"/><path d="M24 7.5L37 12.2V22.5C37 30.4 31.6 36.6 24 40" fill="#000" opacity=".1"/><path d="${shieldP}" fill="${SH}"/>${inner}`;
  // division marks: 1-3 little stars along the bottom
  const star = (x, y, r, f) => { let p = ''; for (let k = 0; k < 10; k++){ const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; p += `${k ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(2)} ${(y + Math.sin(a) * rr).toFixed(2)}`; } return `<path d="${p}Z" fill="${f}" stroke="${f === '#ffd257' ? '#7a5200' : dk}" stroke-width=".7" stroke-linejoin="round"/>`; };
  const pips = (y, f) => { if (d < 0) return ''; const r = small ? 4.6 : 4, gap = r * 2.15, w = d * gap + r * 2 + 4;
    return `<rect x="${(24 - w / 2).toFixed(2)}" y="${(y - r - 1.6).toFixed(2)}" width="${w.toFixed(2)}" height="${(r * 2 + 3.2).toFixed(2)}" rx="${(r + 1.6).toFixed(2)}" fill="#141821" fill-opacity=".72" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>` +
      [...Array(d + 1)].map((_, k) => star(24 + (k - d / 2) * gap, y + .3, r, '#ffd257')).join(''); };
  let g = '';
  switch (i){
    case 0: // Freshman: pencil
      g = shield(`<g transform="rotate(-40 24 20)"><rect x="21" y="9" width="6" height="16" rx="1" fill="${ac}" stroke="#7a5a12" stroke-width=".8"/><rect x="21" y="9" width="6" height="3" fill="#e99" stroke="#7a5a12" stroke-width=".8"/><path d="M21 25h6l-3 5.5z" fill="#f3dcb0" stroke="#7a5a12" stroke-width=".8" stroke-linejoin="round"/><path d="M23.2 28.4h1.6L24 30z" fill="#333"/></g>`) + pips(33.5);
      break;
    case 1: // Sophomore: open book
      g = shield(`<path d="M24 14c-3-2-7-2.4-10.5-1.4v13c3.5-1 7.5-.6 10.5 1.4 3-2 7-2.4 10.5-1.4v-13C31 11.6 27 12 24 14z" fill="${ac}" stroke="${dk}" stroke-width="1" stroke-linejoin="round"/><path d="M24 14v13" stroke="${dk}" stroke-width="1"/><path d="M16.5 16.5c2-.4 4-.2 5.5.6M16.5 19.5c2-.4 4-.2 5.5.6M26 17.1c1.5-.8 3.5-1 5.5-.6M26 20.1c1.5-.8 3.5-1 5.5-.6" stroke="${c}" stroke-width=".9" fill="none" stroke-linecap="round"/>`) + pips(34);
      break;
    case 2: // Scholar: lamp of knowledge
      g = shield(`<path d="M24 9.5c2.2 2.6 2.6 4.6 0 7-2.6-2.4-2.2-4.4 0-7z" fill="#ffb02e"/><path d="M24 11.5c1 1.3 1.1 2.4 0 3.5-1.1-1.1-1-2.2 0-3.5z" fill="#fff6b0"/><path d="M14 20.5c3 0 5-1.5 10-1.5s8 1.5 11-1c-.5 4.5-4.5 7-11 7-5 0-8.5-1.8-10-4.5z" fill="${ac}" stroke="${dk}" stroke-width="1" stroke-linejoin="round"/><path d="M22 17h4l-.5 2h-3z" fill="${ac}" stroke="${dk}" stroke-width=".8"/><path d="M20 25.5h8l1.5 2.5h-11z" fill="${ac}" stroke="${dk}" stroke-width=".8" stroke-linejoin="round"/>`) + pips(34);
      break;
    case 3: // Honors: star with ribbon
      g = shield(`<path d="M17 25l-3 9 4-1.5 2 3.5 2.5-8.5zM31 25l3 9-4-1.5-2 3.5-2.5-8.5z" fill="#e64a7b" stroke="${dk}" stroke-width=".8" stroke-linejoin="round"/>${star(24, 19.5, 9.5, ac)}`) + pips(36.5, '#fff');
      break;
    case 4: // Dean's List: crest with scroll banner
      g = `<path d="M24 2.5l4 3.5 5-1 2 4.5 4.5 2-1 5 3.5 4-3.5 4 1 5-4.5 2-2 4.5-5-1-4 3.5-4-3.5-5 1-2-4.5-4.5-2 1-5L5 21.5l3.5-4-1-5 4.5-2 2-4.5 5 1z" fill="${G}" stroke="${RIM}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="24" cy="21.5" r="11" fill="${dk}" opacity=".25"/><circle cx="24" cy="21.5" r="11" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".9"/>${star(24, 17, 4.5, '#fff')}<path d="M10 22.5h28l-2.2 3.2 2.2 3.2H10l2.2-3.2z" fill="${ac}" stroke="#4d0f17" stroke-width=".8" stroke-linejoin="round"/><path d="M14.5 25.7h19" stroke="#ffd8a0" stroke-width=".9" stroke-dasharray="2 1.4"/><path d="M24 2.5l4 3.5 5-1 2 4.5 4.5 2-1 5 3.5 4" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>` + pips(37.5);
      break;
    case 5: // Valedictorian: shield with mortarboard
      g = shield(`<path d="M24 11l13 5.5-13 5.5-13-5.5z" fill="${ac}" stroke="#000" stroke-opacity=".4" stroke-width=".8" stroke-linejoin="round"/><path d="M17 19.3v5c0 2 3.2 3.5 7 3.5s7-1.5 7-3.5v-5L24 22z" fill="${ac}" stroke="#000" stroke-opacity=".4" stroke-width=".8"/><path d="M24 16.5l8 2.5v6.5" fill="none" stroke="#ffc83d" stroke-width="1.1"/><path d="M30.8 25.3h2.4l-.4 4h-1.6z" fill="#ffc83d"/><circle cx="24" cy="16.5" r="1.2" fill="#ffc83d"/>`) + pips(34.5);
      break;
    case 6: // Professor: wise owl wearing a mortarboard, on an ornate crest
      g = `<path d="M24 2l17.5 6.5v13c0 11-7.5 18.5-17.5 23-10-4.5-17.5-12-17.5-23v-13z" fill="${G}" stroke="${RIM}" stroke-width="2.2" stroke-linejoin="round"/><path d="M24 2l17.5 6.5v13c0 11-7.5 18.5-17.5 23-10-4.5-17.5-12-17.5-23v-13z" fill="${SH}"/><path d="M10.5 9.6L24 4.6l13.5 5" fill="none" stroke="${ac}" stroke-width="1.2"/>
        <path d="M15.5 17.5l-1.6-5.2 4.6 2.6M32.5 17.5l1.6-5.2-4.6 2.6" fill="#f3e3c4" stroke="#5a3a1a" stroke-width=".8" stroke-linejoin="round"/>
        <path d="M24 13.5c6.2 0 9.5 4 9.5 9.2 0 6-4.3 10.3-9.5 10.3s-9.5-4.3-9.5-10.3c0-5.2 3.3-9.2 9.5-9.2z" fill="#f3e3c4" stroke="#5a3a1a" stroke-width=".9"/>
        <path d="M19 28.5c1.6 1.6 3.2 2.2 5 2.2s3.4-.6 5-2.2" fill="none" stroke="#c9a77a" stroke-width=".9" stroke-linecap="round"/><path d="M21 31.2l3-1 3 1" fill="none" stroke="#c9a77a" stroke-width=".8"/>
        <circle cx="19.8" cy="21.5" r="3.7" fill="#fff" stroke="#5a3a1a" stroke-width=".8"/><circle cx="28.2" cy="21.5" r="3.7" fill="#fff" stroke="#5a3a1a" stroke-width=".8"/>
        <circle cx="20.2" cy="21.8" r="1.8" fill="#1c2230"/><circle cx="27.8" cy="21.8" r="1.8" fill="#1c2230"/><circle cx="20.8" cy="21.1" r=".6" fill="#fff"/><circle cx="28.4" cy="21.1" r=".6" fill="#fff"/>
        <path d="M24 23.6l-1.5 1.6 1.5 2 1.5-2z" fill="#f2a516" stroke="#7a4d00" stroke-width=".6" stroke-linejoin="round"/>
        <path d="M24 7.8l10 3.9-10 3.9-10-3.9z" fill="#1c2230" stroke="${ac}" stroke-width=".7" stroke-linejoin="round"/><path d="M18.6 13.5v1.8c1.4 1 3.4 1.4 5.4 1.4s4-.4 5.4-1.4v-1.8L24 15.6z" fill="#1c2230"/>
        <path d="M24 11.7l7.4 2.4v4.6" fill="none" stroke="${ac}" stroke-width=".9"/><path d="M30.6 18.4h1.6l-.3 2.6h-1z" fill="${ac}"/>` + pips(38.2, ac);
      break;
    case 7: // Distinguished Professor: faceted gem with wings
      g = `<path d="M17 18c-5-1-9.5-4-12-8 0 6 3 11 9 13.5-3 .5-5.5 0-7.5-1.5 2 4 6 5.5 10 4.5zM31 18c5-1 9.5-4 12-8 0 6-3 11-9 13.5 3 .5 5.5 0 7.5-1.5-2 4-6 5.5-10 4.5z" fill="${lt}" stroke="${dk}" stroke-width=".9" stroke-linejoin="round" opacity=".95"/>
        <path d="M24 5l11 6.5v13L24 31 13 24.5v-13z" fill="${G}" stroke="${RIM}" stroke-width="1.8" stroke-linejoin="round"/><path d="M24 5v13l11-6.5M24 18L13 11.5M24 18v13" stroke="#fff" stroke-opacity=".45" stroke-width=".8" fill="none"/><path d="M24 5l11 6.5L24 18z" fill="#fff" opacity=".25"/><path d="M24 18l11 6.5L24 31z" fill="#000" opacity=".15"/>` + pips(38.5);
      break;
    case 8: // Provost: star medallion with ribbons
      g = `<path d="M17 28l-4 16 5.5-2.5L21 46l3-14zM31 28l4 16-5.5-2.5L27 46l-3-14z" fill="${ac}" stroke="#8a5a00" stroke-width=".8" stroke-linejoin="round"/>` +
        (() => { let p = ''; for (let k = 0; k < 24; k++){ const a = -Math.PI / 2 + k * Math.PI / 12, r = k % 2 ? 15 : 18; p += `${k ? 'L' : 'M'}${(24 + Math.cos(a) * r).toFixed(2)} ${(20 + Math.sin(a) * r).toFixed(2)}`; } return `<path d="${p}Z" fill="${G}" stroke="${RIM}" stroke-width="1.4" stroke-linejoin="round"/>`; })() +
        `<circle cx="24" cy="20" r="10.5" fill="${dk}" opacity=".35"/><circle cx="24" cy="20" r="10.5" fill="none" stroke="${ac}" stroke-width="1.2"/>${star(24, 20, 7.5, ac)}<circle cx="24" cy="20" r="18" fill="${SH}"/>` + pips(39.5, '#fff');
      break;
    case 9: // Chancellor: jeweled crown
      g = `<g transform="translate(0 3.5)"><path d="M6 15L15 22L24 7L33 22L42 15L38.5 34H9.5Z" fill="${G}" stroke="${RIM}" stroke-width="1.8" stroke-linejoin="round"/><rect x="9" y="33" width="30" height="5.5" rx="1.5" fill="${G}" stroke="${RIM}" stroke-width="1.4"/>
        <circle cx="6" cy="14" r="2.3" fill="${G}" stroke="${RIM}"/><circle cx="24" cy="5.5" r="2.6" fill="${G}" stroke="${RIM}"/><circle cx="42" cy="14" r="2.3" fill="${G}" stroke="${RIM}"/>
        <path d="M24 19.5l3 3.5-3 3.5-3-3.5z" fill="${ac}" stroke="#fff" stroke-width=".7"/><circle cx="15" cy="27" r="1.9" fill="#3a9be0" stroke="#fff" stroke-width=".6"/><circle cx="33" cy="27" r="1.9" fill="#1fb36b" stroke="#fff" stroke-width=".6"/><path d="M6 15l9 7 9-15 9 15 9-7" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".7"/></g>` + pips(39.3, ac);
      break;
    case 10: { // Laureate: golden laurel wreath around a sky-blue medal, tied with a ribbon
      const leaf = (x, y, rot, sc) => `<path d="M0 -5.2C2.2 -2.6 2.2 2 0 4.6C-2.2 2 -2.2 -2.6 0 -5.2Z" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)}) scale(${sc})" fill="url(#${u}l)" stroke="#7a5200" stroke-width=".5"/>`;
      let lv = '';
      for (const sd of [-1, 1]){
        lv += `<path d="M${24 + sd * 5} 41.6C${24 + sd * 15.5} 38 ${24 + sd * 19.5} 26 ${24 + sd * 14} 9" fill="none" stroke="#a87a10" stroke-width="1.2" stroke-linecap="round"/>`;
        for (let k = 0; k < 8; k++){
          const th = 30 + k * 18.5, t = th * Math.PI / 180, R0 = 17.6, x = 24 + sd * Math.sin(t) * R0, y = 24.5 + Math.cos(t) * R0;
          // direction along the branch, heading up and around the medal
          const dir = Math.atan2(-Math.sin(t), sd * Math.cos(t)) * 180 / Math.PI + 90, sc = 1 - k * .045;
          lv += leaf(x + sd * Math.sin(t) * 1.9, y + Math.cos(t) * 1.9, dir + sd * 32, sc);       // outer leaf
          lv += leaf(x - sd * Math.sin(t) * 1.5, y - Math.cos(t) * 1.5, dir - sd * 28, sc * .85); // inner leaf
        }
      }
      g = `<defs><linearGradient id="${u}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#e8b52a"/><stop offset="1" stop-color="#a87a10"/></linearGradient></defs>${lv}
        <path d="M20 39.5l-3 6.5 3.4-1.2 1.6 3 2-7.3zM28 39.5l3 6.5-3.4-1.2-1.6 3-2-7.3z" fill="#e8475f" stroke="#86152b" stroke-width=".6" stroke-linejoin="round"/><circle cx="24" cy="40.2" r="2.2" fill="#e8475f" stroke="#86152b" stroke-width=".6"/>
        <circle cx="24" cy="23" r="11" fill="${G}" stroke="${RIM}" stroke-width="1.8"/><circle cx="24" cy="23" r="7.8" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".9"/>${star(24, 23, 6.3, ac)}<circle cx="24" cy="23" r="11" fill="${SH}"/>`;
      break; }
    default: { // Paragon: radiant crown
      let rays = '';
      for (let k = 0; k < 16; k++) rays += `<path d="M24 1l1.8 7h-3.6z" fill="${k % 2 ? lt : c}" transform="rotate(${k * 22.5} 24 24)" opacity="${k % 2 ? .7 : 1}"/>`;
      g = `<g class="rays">${rays}</g><circle cx="24" cy="24" r="15.5" fill="${G}" stroke="${RIM}" stroke-width="1.8"/><circle cx="24" cy="24" r="15.5" fill="${SH}"/>
        <path d="M14.5 28.5l-1.8-11 6 4.5L24 13l5.3 9 6-4.5-1.8 11z" fill="#fff" stroke="${dk}" stroke-width=".9" stroke-linejoin="round"/><rect x="14.5" y="29.5" width="19" height="3.4" rx="1" fill="#fff" stroke="${dk}" stroke-width=".9"/>
        <circle cx="24" cy="23.5" r="1.7" fill="#e8475f"/><circle cx="18.8" cy="25.5" r="1.2" fill="#3a9be0"/><circle cx="29.2" cy="25.5" r="1.2" fill="#1fb36b"/>`;
    }
  }
  return `<svg viewBox="0 0 48 48" aria-hidden="true">${grad}${g}</svg>`;
}

function emblem(rk, cls){
  const i = rk.i, Rk = RANKS[i] || {}, small = /\b(xs|sm)\b/.test(cls || '');
  return `<span class="emb ${cls || ''}${Rk.shine ? ' shine' : ''}${i === PARAGON_I ? ' para' : ''}" title="${esc(rk.full)}" style="--ec:${rk.c}">${emblemSvg(i, rk.div ? rk.d : -1, small)}</span>`;
}
// bot ratings were stretched when the ranks went to 100 Elo per division; the bots' habits follow
// their old position on the ladder, so the stretch is undone before looking those up
const STRETCH = [[0, 0], [900, 900], [1100, 1200], [1300, 1500], [1500, 1800], [1750, 2100], [2000, 2400], [2250, 2850], [2500, 3300], [2750, 3800], [3200, 4600], [9000, 12400]];
const lerpMap = (x, pts, a, b) => { for (let k = 1; k < pts.length; k++) if (x <= pts[k][a]){ const p = pts[k - 1], q = pts[k]; return p[b] + (q[b] - p[b]) * (x - p[a]) / (q[a] - p[a]); } return x; };
const stretchR = r => Math.round(lerpMap(r, STRETCH, 0, 1));
const unstretchR = r => lerpMap(r, STRETCH, 1, 0);
// typical sitting length (minutes) for a rating
const SIT = [[500,15],[800,25],[1000,35],[1200,50],[1400,70],[1600,90],[1800,120],[2000,150],[2200,190],[2400,240],[2800,330]];
function typical(r){
  r = unstretchR(r);
  if (r <= SIT[0][0]) return SIT[0][1];
  for (let k = 1; k < SIT.length; k++) if (r <= SIT[k][0]){ const [a, x] = SIT[k-1], [b, y] = SIT[k]; return x + (y - x) * (r - a) / (b - a); }
  return SIT[SIT.length - 1][1];
}

/* the roster, regenerated from the seed */
const STYLES = ['Steady','Steady','Steady','Sprinter','Sprinter','Grinder','Grinder','Wildcard','Wildcard','Night Owl','Early Bird'];
const NM_A = ['lofi','quiet','night','coffee','study','calc','bio','chem','library','deep','focus','pixel','neon','mellow','sleepy','caffeine','notes','flash','ivy','maple','ember','nova','echo','sol','juniper','atlas','orbit','sage','cozy','paper','ink','tea','matcha','cloud','moss','river','solar','lunar','static','vinyl','quill','cedar','cobalt','velvet','retro','tidy','zen','grind','late','early'];
const NM_B = ['maya','pete','kenji','ari','noor','leo','zara','finn','priya','omar','lena','theo','jun','sami','ana','rui','bea','kai','mira','eli','nina','dev','rosa','yuki','tom','ada','felix','iris','hana','arjun','chloe','diego','emma','gus','hugo','isla','jade','kofi','lars','mo','nadia','oscar','pia','quinn','raf','sofia','tariq','uma','vik','wren'];
const NM_C = ['reads','studies','notes','grinds','codes','learns','writes','focus','crams','solves','thinks','works','labs','reviews','drafts'];
const BIOS = ['one more chapter, then sleep (lie)','powered by iced coffee','library 3rd floor regular','flashcards are a lifestyle','studying so future me says thanks','do not disturb, midterm szn','lo-fi on, world off','quiet grind, loud results','reading the textbook nobody reads','pomodoros and peppermint tea','here to beat my own record','just trying to pass orgo','notes so neat they get borrowed','will study for snacks','early lecture survivor','night shift scholar','one problem set at a time','learning out loud','highlighters in every color','my desk is my happy place','procrastination recovery arc','study playlist on repeat','gym, study, sleep, repeat','second coffee, first chapter','i read the syllabus','finals mode: permanent','teaching it back to myself','dean\'s list or bust','focus is a muscle','tiny steps every day'];
const PEAKS = {Morning:[5,12], Afternoon:[12,17], Evening:[17,22], 'Late night':[22,29]};
const CHAT = ['halfway through problem set 3','coffee #2','flashcards time','this chapter is long','ok locking in','rewriting my notes','lab report grind','one more practice exam','reading the slides again','on question 14','music up, phone down','outlining the essay','reviewing lecture 9','almost through the reading','doing the hard problems first'];
const TAPS = ['ok brain is fried, gg','calling it here, gg','dinner time, good match','need a nap, gg','that\'s enough for today','gg, nice sitting','out of coffee, done','my eyes hurt, gg','going to the gym, gg','gg, see you next time'];
const NM_D = ['owl','fox','bear','wolf','hawk','lynx','otter','panda','koala','raven','finch','heron','moth','bee','crow','seal','tiger','orca','yak','crane','gecko','badger','robin','sparrow','falcon'];
const NM_E = ['math','lit','code','econ','hist','phys','bio','chem','art','music','law','med','stats','eng','arch','psych','nurse','pre_med','cs','design'];
function newName(i){
  // the later bots draw from a much bigger pool so names rarely repeat
  const rnd = mulberry32((ROSTER_SEED ^ 0x5bd1e995) + i * 40503), cap = x => x[0].toUpperCase() + x.slice(1);
  const a = pick(rnd, NM_A), b = pick(rnd, NM_B), c = pick(rnd, NM_C), d = pick(rnd, NM_D), e = pick(rnd, NM_E), n2 = 1 + Math.floor(rnd() * 99), n3 = 1 + Math.floor(rnd() * 999), yr = String(Math.floor(rnd() * 12) + 98).slice(-2);
  return [`${b}_${a}${n2}`, `${a}${cap(d)}${n2}`, `${b}.${c}${n3}`, `${cap(b)}${cap(a)}`, `${e}_${b}${yr}`, `${a}_${d}_${n2}`, `Dr.${cap(b)}${cap(d)}`, `${b}${n3}`, `${cap(d)}${cap(c)}${n2}`, `${b}_${e}`, `${a}.${b}`, `${cap(a)}${cap(d)}`][Math.floor(rnd() * 12)];
}
const PEAK_NAMES = Object.keys(PEAKS), STYLE_NAMES = ['Steady','Sprinter','Grinder','Wildcard','Night Owl','Early Bird'], FAV_NAMES = ['pomodoro','fifty','custom','timebox','stopwatch','flow'];
// compact per-bot data used in the hot loops (built once, cached in IndexedDB)
let T_STY = null, T_PK = null, T_FAV = null, T_SIT = null, T_PACT = null, T_SUF = null, T_BASE = null, RK_READY = false;
const botCache = new Map();
function bot(i){
  let b = botCache.get(i); if (b) return b;
  b = genBot(i); b.i = i; const suf = T_SUF ? T_SUF[i] : 0; if (suf) b.name += (/\d$/.test(b.name) ? '_' : '') + suf;
  if (botCache.size > 4000) botCache.clear();
  botCache.set(i, b); return b;
}
const BOTS = new Proxy({}, {get: (_, k) => typeof k === 'string' && /^\d+$/.test(k) && +k < ROSTER_N ? bot(+k) : undefined});
// done in chunks with pauses, so the rest of the app stays usable while a device builds the roster the first time
const breathe = () => new Promise(r => setTimeout(r, 0));
async function buildRosterArrays(){
  T_STY = new Uint8Array(ROSTER_N); T_PK = new Uint8Array(ROSTER_N); T_FAV = new Uint8Array(ROSTER_N);
  T_SIT = new Float32Array(ROSTER_N); T_PACT = new Float32Array(ROSTER_N); T_SUF = new Int32Array(ROSTER_N); T_BASE = new Int16Array(ROSTER_N);
  const seen = new Map();
  for (let i = 0; i < ROSTER_N; i++){
    if (i % 20000 === 0 && i) await breathe();
    const b = genBot(i), n = seen.get(b.name) || 0; seen.set(b.name, n + 1); if (n) T_SUF[i] = n + 1;
    T_STY[i] = STYLE_NAMES.indexOf(b.style); T_PK[i] = PEAK_NAMES.indexOf(b.peak); T_FAV[i] = FAV_NAMES.indexOf(b.fav);
    T_SIT[i] = b.sitMul; T_PACT[i] = b.pAct; T_BASE[i] = b.base;
  }
}
function genBot(i){
  const rnd = mulberry32(ROSTER_SEED + i * 7919);
  const pat = Math.floor(rnd() * 7), a = pick(rnd, NM_A), b = pick(rnd, NM_B), c = pick(rnd, NM_C), num = 1 + Math.floor(rnd() * 99);
  const cap = x => x[0].toUpperCase() + x.slice(1);
  let name = [`${b}_${a}`, `${a}${cap(b)}`, `${b}.${c}`, `${cap(b)}${num}`, `Dr.${cap(a)}`, `${a}_${num}`, `${cap(b)}${cap(c)}`][pat];
  const style = pick(rnd, STYLES);
  const peak = style === 'Night Owl' ? 'Late night' : style === 'Early Bird' ? 'Morning' : pick(rnd, ['Morning','Afternoon','Evening','Evening','Late night']);
  const hi = rnd() < .08;   // a thin elite group sits on top of the main bell curve
  const base = stretchR(Math.round(clampN(hi ? 1700 + gaussOf(rnd) * 280 : 1120 + gaussOf(rnd) * 260, 520, 2750)));
  const fav = style === 'Sprinter' ? 'pomodoro' : style === 'Grinder' ? 'stopwatch' : style === 'Wildcard' ? 'flow' : pick(rnd, ['pomodoro','pomodoro','fifty','custom','timebox','stopwatch']);
  let maj;
  const o = {i, name, ini: name.replace(/^Dr\./, '').replace(/[^A-Za-z]/g, ' ').trim().split(/\s+|(?=[A-Z])/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('') || 'B',
    hue: Math.floor(rnd() * 360), style, peak, subject: (maj = majorAt(rnd())).n, major: maj.k, bio: pick(rnd, BIOS), base, fav,
    sitMul: .85 + rnd() * .3, age: 20 + Math.floor(Math.pow(rnd(), 1.3) * 500), pAct: rnd(), x: [rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()]};
  o.name = makeName(i, maj);    // names come from their own random stream, so nothing else about the player changes
  o.ini = iniOf(o.name);
  return o;
}
function iniOf(n){
  const w = n.replace(/^(xX_|Xx|xx|iiTz|Im|oh|Real|King|TTV_|its|the)(?=[A-Za-z])/, '').replace(/[0-9]+/g, ' ').replace(/[._-]+/g, ' ').trim().split(/\s+|(?=[A-Z])/).filter(Boolean);
  return (w.slice(0, 2).map(x => x[0].toUpperCase()).join('') || 'P');
}
const activity = (b, r) => clampN(.35 + (unstretchR(r) - 800) / 2600 + b.pAct * .25, .2, .97);
const blockLen = (b, r) => b.fav === 'pomodoro' ? 25 : b.fav === 'fifty' ? 52 : b.fav === 'custom' ? 45 : typical(r) * b.sitMul;
const sittingsPerDay = b => b.style === 'Sprinter' ? 2.4 : b.style === 'Grinder' ? 1.3 : 1.7;
// the same three, from the compact arrays (for the loops over every bot)
let ACT_R = null, TYP_R = null;     // per whole rating 0–5,000: activity base and typical sitting
function rTables(){ ACT_R = new Float32Array(5001); TYP_R = new Float32Array(5001); for (let r = 0; r <= 5000; r++){ ACT_R[r] = .35 + (unstretchR(r) - 800) / 2600; TYP_R[r] = typical(r); } }
const rIdx = r => r < 0 ? 0 : r > 5000 ? 5000 : r | 0;
const activityI = (i, r) => clampN(ACT_R[rIdx(r)] + T_PACT[i] * .25, .2, .97);
const blockLenI = (i, r) => { const f = T_FAV[i]; return f === 0 ? 25 : f === 1 ? 52 : f === 2 ? 45 : TYP_R[rIdx(r)] * T_SIT[i]; };
const sittingsI = i => T_STY[i] === 1 ? 2.4 : T_STY[i] === 2 ? 1.3 : 1.7;
async function initBotStats(arr, from){
  const d0 = new Date(WORLD_START);
  for (let i = from || 0; i < ROSTER_N; i++){
    if (i % 20000 === 0 && i) await breathe();
    const b = genBot(i), o = i * BF, rnd = mulberry32(ROSTER_SEED ^ (i * 104729)), r = b.base, p = activity(b, r);
    const L = typical(r) * b.sitMul, perDay = L * sittingsPerDay(b), days = Math.max(1, Math.round(b.age * p));
    const total = Math.round(days * perDay * (.85 + rnd() * .3));
    const best = Math.max(1, Math.min(days, Math.round(Math.log(Math.max(2, b.age * (1 - p))) / Math.log(1 / p) * (.7 + rnd() * .6))));
    arr[o+F.rating] = r; arr[o+F.total] = total; arr[o+F.sessions] = Math.max(1, Math.round(total / blockLen(b, r)));
    arr[o+F.days] = days; arr[o+F.best] = best; arr[o+F.cur] = rnd() < p ? Math.floor(rnd() * best) : 0;
    arr[o+F.maxSess] = Math.round(L * (b.style === 'Grinder' ? 2.3 : b.style === 'Wildcard' ? 2 : 1.5) * (.9 + rnd() * .3));
    arr[o+F.maxDay] = Math.min(DAY_MAX, Math.round(perDay * (1.8 + rnd() * 1.2)));
    arr[o+F.maxSess] = Math.min(arr[o+F.maxSess], arr[o+F.maxDay]);
    arr[o+F.maxWeek] = Math.round(Math.min(arr[o+F.maxDay] * 7, perDay * 7 * p * (1.3 + rnd() * .4)));
    arr[o+F.maxMonth] = Math.round(Math.min(arr[o+F.maxWeek] * 4.4, perDay * 30 * p * (1.15 + rnd() * .3)));
    arr[o+F.week] = Math.round(perDay * p * d0.getDay()); arr[o+F.month] = Math.round(perDay * p * (d0.getDate() - 1)); arr[o+F.today] = 0;
  }
}
const b64 = a => { let s = ''; const u = new Uint8Array(a.buffer); for (let k = 0; k < u.length; k += 0x8000) s += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000)); return btoa(s); };
const unb64 = (s, T) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); return new T(u.buffer); };

/* ---------- the shared world ----------
   Every device works out exactly the same world. It starts from a fixed state on WORLD_START, every bot's day is
   fixed by its seed, the matches between players are paired with a seeded random stream, and the clock is Eastern
   time wherever you are. Real players' matches (yours, from your match history, which syncs) sit on top of that as
   adjustments: each match moves your opponent's shown rating and adds the sitting they studied, while the
   simulation itself keeps using the players' own ratings. Adjustments add up the same in any order, so a match
   heard about late lands in exactly the same place, and a daily snapshot of the world (made on GitHub) is exact. */
const WORLD_V = 4, WORLD_START = new Date(2026, 10, 18).getTime();    // midnight Nov 18, 2026 (Eastern)
const WORLD_FMT = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'});
// a timestamp whose reading on this device's clock is Eastern time at t (the same as t on a device set to Eastern)
function worldT(t){
  const p = {}; for (const x of WORLD_FMT.formatToParts(new Date(t))) p[x.type] = x.value;
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second).getTime() + (t % 1000);
}
let WAP = new Set(), OV_R = null, WORLD_UNTIL = 0;     // matches already applied; each player's rating adjustment from real players' matches
const baseR = i => BS[i * BF] - OV_R[i];                 // the rating the simulation uses
if (/[?&]snapshot\b/.test(location.search)){ const d = new Date(worldT(Date.now())); d.setHours(0, 0, 0, 0); WORLD_UNTIL = d.getTime(); }
const evKey = h => h.t + ':' + h.b;
function applyEvent(h){        // your match, as it changed your opponent: their rating, and the sitting they studied
  const o = h.b * BF;
  if (!h.f && h.d){ BS[o] -= h.d; OV_R[h.b] -= h.d; }
  const m = h.them || 0; BS[o+F.total] += m; BS[o+F.sessions]++; BS[o+F.maxSess] = Math.max(BS[o+F.maxSess], m);
  WAP.add(evKey(h));
}
const pendingEvents = () => (R.hist || []).filter(h => h && h.t && !WAP.has(evKey(h)) && h.b >= 0 && h.b < ROSTER_N).map(h => ({h, wt: worldT(h.t)})).filter(e => e.wt >= WORLD_START).sort((a, b) => a.wt - b.wt);

/* ---- the daily snapshot: the world (bots only) at a midnight, saved on GitHub, so a new device needn't replay every day ----
   It's each stat's change since the world's start (which every device can rebuild from the seeds), with each number's bytes
   stored apart so it compresses well. Real players' matches aren't in it: each device adds its own on top. */
const SNAP_BASE = (() => { const h = location.hostname, m = h.match(/^([^.]+)\.github\.io$/), repo = location.pathname.split('/')[1];
  return m && repo ? `https://raw.githubusercontent.com/${m[1]}/${repo}/world/` : 'https://raw.githubusercontent.com/shilarry20-code/focus-bench/world/'; })();
const gzipBuf = async (u8, de) => { const cs = de ? new DecompressionStream('gzip') : new CompressionStream('gzip'); const w = cs.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); };
async function exportWorld(){      // used by the GitHub Action (a fresh browser, so no real players' matches are mixed in)
  const N = ROSTER_N, init = new Int32Array(N * BF); await initBotStats(init, 0);
  const sh = new Uint8Array(N * BF * 4);
  for (let k = 0; k < BF; k++){ const base = k * N * 4; for (let i = 0; i < N; i++){ const v = BS[i * BF + k] - init[i * BF + k]; sh[base + i] = v & 255; sh[base + N + i] = (v >> 8) & 255; sh[base + 2 * N + i] = (v >> 16) & 255; sh[base + 3 * N + i] = (v >>> 24) & 255; } }
  const gz = await gzipBuf(sh);
  let bin = ''; for (let k = 0; k < gz.length; k += 0x8000) bin += String.fromCharCode.apply(null, gz.subarray(k, k + 0x8000));
  if (new Date(R.lastSlice).getHours() !== 0) throw new Error('snapshots are taken at midnight');
  return {meta: {v: WORLD_V, n: N, bf: BF, day: dayKey(R.lastSlice), made: Date.now()}, bin: btoa(bin)};
}
// the snapshot's time is its Eastern date at midnight, read on this device's clock (the world clock)
const snapT = meta => new Date(meta.day + 'T00:00').getTime();
async function fetchSnapshotMeta(){
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 5000);
  try { const r = await fetch(SNAP_BASE + 'world.json', {cache: 'no-store', signal: ctl.signal}); if (!r.ok) return null; const m = await r.json(); return m && m.v === WORLD_V && m.n === ROSTER_N && m.bf === BF ? m : null; } catch(e){ return null; } finally { clearTimeout(tm); }
}
async function loadSnapshot(meta){
  try {
    const r = await fetch(SNAP_BASE + 'world.bin?d=' + meta.day); if (!r.ok) return false;
    const sh = await gzipBuf(new Uint8Array(await r.arrayBuffer()), true), N = ROSTER_N;
    if (sh.length !== N * BF * 4) return false;
    const init = new Int32Array(N * BF); await initBotStats(init, 0);
    BS = new Int32Array(N * BF); PREV = new Int16Array(N);
    for (let k = 0; k < BF; k++){ const base = k * N * 4; for (let i = 0; i < N; i++) BS[i * BF + k] = init[i * BF + k] + (sh[base + i] | sh[base + N + i] << 8 | sh[base + 2 * N + i] << 16 | sh[base + 3 * N + i] << 24); }
    for (let i = 0; i < N; i++) PREV[i] = BS[i * BF];
    R.lastSlice = snapT(meta); R.lastSim = meta.day; WAP = new Set(); OV_R = new Int16Array(N); m5Init(null); RK_EW = null;     // your matches are added back on top
    return true;
  } catch(e){ console.error(e); return false; }
}

/* IndexedDB: the bots' numbers are about 13 MB, far past what localStorage holds */
const IDB = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    try { const r = indexedDB.open('focus-bench', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked')); }
    catch(e){ rej(e); }
  }));
  const tx = (mode, fn) => open().then(db => new Promise((res, rej) => {
    const t = db.transaction('kv', mode), req = fn(t.objectStore('kv'));
    t.oncomplete = () => res(req && mode === 'readonly' ? req.result : undefined); t.onerror = t.onabort = () => rej(t.error);
  }));
  return {get: k => tx('readonly', st => st.get(k)), set: (k, v) => tx('readwrite', st => st.put(v, k)), del: k => tx('readwrite', st => st.delete(k)),
    all: (lo, hi) => tx('readonly', st => st.getAll(IDBKeyRange.bound(lo, hi))),                       // every value with a key in [lo, hi]
    setMany: list => tx('readwrite', st => { list.forEach(([k, v]) => v === undefined ? st.delete(k) : st.put(v, k)); return null; })};
})();
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch(e){}

/* saved state */
var R = null, BS = null, PREV = null;     // BS: packed bot stats, PREV: ratings at the start of today
let idbOk = true, botsDirty = false, botsSaveT = null;
function loadRanked(){
  R = merge({v:1, on:true, mmr:1000, best:1000, played:0, w:0, l:0, d:0, ws:0, bestWs:0, bestUpset:0, revenge:0, profWins:0, hist:[], rec:{}, last:-1, showcase:null, cur:null, lastSim:null, lastSlice:null, rar:null, rv:0, para:null}, store.get('fb.ranked', {}));
  if (!R.para) R.para = {h: null, since: 0, reign: {}, long: {}};
  RK_READY = false;
  return loadBots().catch(e => { console.error(e); }).then(() => {
    rTables(); RK_READY = true; botsChanged();
    updateParagon(true);
    saveRanked(true);
    const show = () => { renderRankChip(); renderMatch(); if (!$('#page-ranked').hidden) renderRanked(); if (!$('#page-leaders').hidden) renderLeaders(); };
    show();
    // with sync on, wait (up to 20 s) for your other device's matches before bringing the world up to date
    const waitSync = () => new Promise(r => { const t0 = Date.now(), chk = () => (typeof SYNC === 'undefined' || !SYNC.token || syncFirstDone || Date.now() - t0 > 20000) ? r() : setTimeout(chk, 300); chk(); });
    return waitSync().then(dailySim).then(ch => { if (ch) show(); setTimeout(() => badgePass(), 1500); });
  });
}
async function loadBots(){
  let rec = null, ros = null;
  try { [rec, ros] = await Promise.all([IDB.get('bots'), IDB.get('roster')]); } catch(e){ idbOk = false; }
  if (ros && ros.v === ROSTER_V && ros.n === ROSTER_N){
    T_STY = new Uint8Array(ros.sty); T_PK = new Uint8Array(ros.pk); T_FAV = new Uint8Array(ros.fav);
    T_SIT = new Float32Array(ros.sit); T_PACT = new Float32Array(ros.pact); T_SUF = new Int32Array(ros.suf); T_BASE = new Int16Array(ros.base);
  } else {
    await buildRosterArrays(); botCache.clear();
    if (idbOk) IDB.set('roster', {v: ROSTER_V, n: ROSTER_N, sty: T_STY.buffer, pk: T_PK.buffer, fav: T_FAV.buffer, sit: T_SIT.buffer, pact: T_PACT.buffer, suf: T_SUF.buffer, base: T_BASE.buffer}).catch(() => {});
  }
  const haveRec = rec && rec.n === ROSTER_N && rec.w === WORLD_V && rec.bs && rec.bs.byteLength === ROSTER_N * BF * 4;
  const meta = await fetchSnapshotMeta();
  if (meta && (!haveRec || snapT(meta) - rec.lastSlice > 2 * 864e5) && await loadSnapshot(meta)){ botsDirty = true; }
  else if (rec && rec.n === ROSTER_N && rec.w === WORLD_V && rec.bs && rec.bs.byteLength === ROSTER_N * BF * 4){
    BS = new Int32Array(rec.bs); PREV = new Int16Array(rec.prev);
    R.lastSlice = rec.lastSlice; R.lastSim = rec.lastSim; WAP = new Set(rec.ap || []);
    OV_R = rec.ov && rec.ov.byteLength === ROSTER_N * 2 ? new Int16Array(rec.ov) : new Int16Array(ROSTER_N);
    m5Init(rec.m5); RK_EW = null; rkCounts(rec);
  } else {
    // the shared world, from its fixed start (the same on every device)
    BS = new Int32Array(ROSTER_N * BF); PREV = new Int16Array(ROSTER_N);
    await initBotStats(BS, 0);
    for (let i = 0; i < ROSTER_N; i++) PREV[i] = BS[i * BF];
    R.lastSlice = WORLD_START; R.lastSim = dayKey(WORLD_START); WAP = new Set(); OV_R = new Int16Array(ROSTER_N); m5Init(null); RK_EW = null;
    IDB.del('worldcp').catch(() => {});
    botsDirty = true;
  }
  if (R.rv < 2){ R.hist.forEach(h => h.br = stretchR(h.br)); if (R.cur) R.cur.br = stretchR(R.cur.br); }
  if (R.rv < 3 && false){
    // no bot's day can top 24 hours: pull back the few records that did, and keep sessions inside their day
    for (let i = 0; i < ROSTER_N; i++){
      const o = i * BF;
      if (BS[o+F.maxDay] > DAY_MAX) BS[o+F.maxDay] = 1150 + (i * 37) % 260;
      if (BS[o+F.maxSess] > BS[o+F.maxDay]) BS[o+F.maxSess] = Math.round(BS[o+F.maxDay] * .6);
      if (BS[o+F.today] > DAY_MAX) BS[o+F.today] = DAY_MAX;
    }
    botsDirty = true;
  }
  R.rv = 3; delete R.bots; delete R.prev;
  if (!M5_OPP) m5Init(null);
}
let rkSaveT = null;
function saveRanked(now){
  const doSave = () => { store.set('fb.ranked', R); if (botsDirty) saveBots(); };
  clearTimeout(rkSaveT); now ? doSave() : rkSaveT = setTimeout(doSave, 800);
}
const markBots = () => { botsDirty = true; };
document.addEventListener('visibilitychange', () => { if (document.hidden && botsDirty) saveBots(true); });
let botsSavedAt = Date.now();
function saveBots(force){
  if (!idbOk || !RK_READY || !BS) return;
  clearTimeout(botsSaveT);
  if (!force && !document.hidden && Date.now() - botsSavedAt < 10 * 60000){ botsSaveT = setTimeout(() => saveBots(), 10 * 60000 - (Date.now() - botsSavedAt) + 1000); return; }
  botsSaveT = setTimeout(() => {
    botsSavedAt = Date.now();
    botsDirty = false;
    IDB.set('bots', {n: ROSTER_N, w: WORLD_V, ap: [...WAP], ov: OV_R.buffer, bs: BS.buffer, prev: PREV.buffer, lastSlice: R.lastSlice, lastSim: R.lastSim, t: Date.now(),
      m5: m5Save(), ...rkSave()}).catch(e => { console.error(e); botsDirty = true; });
  }, 600);
}
addEventListener('pagehide', () => { if (botsDirty && RK_READY && idbOk){ clearTimeout(botsSaveT); botsDirty = false; IDB.set('bots', {n: ROSTER_N, w: WORLD_V, ap: [...WAP], ov: OV_R.buffer, bs: BS.buffer, prev: PREV.buffer, lastSlice: R.lastSlice, lastSim: R.lastSim, t: Date.now(), m5: m5Save(), ...rkSave()}).catch(() => {}); } });
const botRating = i => BS[i * BF];

/* bots update every 2 hours. Each bot has a plan for each day (study or not, how long), worked out
   from the seed so nothing extra is saved. The plan's minutes are spread across the day's twelve
   2-hour slices, weighted toward the bot's peak hours. Streaks and days studied roll over at midnight.
   Catch-up after time away covers up to 7 days, with whole missed days done in one step. */
const SLICE = 2 * 3600e3;
function sliceStartOf(t){ const d = new Date(t); d.setMinutes(0, 0, 0); d.setHours(d.getHours() - d.getHours() % 2); return d.getTime(); }
const SLICE_W = [];      // per peak: share of the day's minutes in each of the 12 slices (cumulative)
PEAK_NAMES.forEach(pk => {
  const [a, z] = PEAKS[pk], w = [];
  for (let k = 0; k < 12; k++){
    const h = k * 2 + 1, hh = h < 5 ? h + 24 : h;
    w.push(hh >= a && hh < z ? 3 : (hh >= a - 2 && hh < z + 2) ? 1.5 : (h >= 2 && h < 7) ? .1 : 1);
  }
  const sum = w.reduce((x, y) => x + y, 0); let c = 0;
  SLICE_W.push(w.map(x => (c += x / sum)));
});
const dayNum = dk => +dk.replace(/-/g, '');
// A bot's day is fixed by its seed, the date and its long-term base rating, so past days never change
// and its calendar can be rebuilt exactly at any time. No day tops 23 hours of study.
const DAY_MAX = 1440, DAY_CAP = 1380;
const PLAN = {active: false, m: 0, longest: 0};    // reused to avoid making 682,925 objects per update
function daySits(i, dk, out){     // the day's sitting lengths in minutes (empty if the bot skipped the day)
  const r = T_BASE[i], rnd = mulberry32(dayNum(dk) * 7 + i * 2654435761);
  out = out || [];  out.length = 0;
  if (!(rnd() < activityI(i, r))) return out;
  const L = TYP_R[rIdx(r)] * T_SIT[i], sits = Math.max(1, Math.round(sittingsI(i) * (.6 + rnd() * .8)));
  let m = 0; for (let s = 0; s < sits; s++){ const x = L * Math.exp(.3 * gaussOf(rnd)); out.push(x); m += x; }
  if (m > DAY_CAP) for (let s = 0; s < out.length; s++) out[s] *= DAY_CAP / m;
  return out;
}
const SITS = [];
function dayPlan(i, dk, out){
  out = out || {active: false, m: 0, longest: 0};
  daySits(i, dk, SITS);
  out.active = SITS.length > 0; out.m = 0; out.longest = 0;
  let m = 0, longest = 0; for (const x of SITS){ m += x; if (x > longest) longest = x; }
  out.m = Math.round(m); out.longest = Math.round(longest);
  return out;
}
// When each sitting of a player's day happens (minutes after midnight). The calendar, the 2-hour updates and
// ranked matches all use this one function, so a player's calendar, today's minutes and matches always agree.
const ST_A = new Int32Array(64), ST_B = new Int32Array(64), ST_LEN = new Int32Array(64), ST_GAP = new Float64Array(64);
// the whole world runs a little early or late each day (up to 45 min early, 75 late), and Friday and Saturday nights later still
let dsK = null, dsV = 0;
function dayShift(dk){
  if (dsK !== dk){ const d = new Date(dk + 'T12:00').getDay(); dsV = Math.floor(mulberry32(dayNum(dk) * 7919 + 13)() * 120) - 45 + (d === 5 || d === 6 ? 50 : d === 0 ? -20 : 0); dsK = dk; }
  return dsV;
}
function sitTimes(i, dk, xs){      // fills ST_A / ST_B, returns the count and the random stream the calendar continues with
  const n = Math.min(xs.length, 63), rnd = mulberry32(dayNum(dk) * 131 + i * 977 + 7);
  if (!n) return {n: 0, rnd};
  let total = 0, sumL = 0; for (let k = 0; k < n; k++){ total += xs[k]; ST_LEN[k] = Math.max(5, Math.round(xs[k])); sumL += ST_LEN[k]; }
  total = Math.round(total);
  ST_LEN[0] = Math.max(5, ST_LEN[0] + total - sumL);
  sumL = 0; for (let k = 0; k < n; k++) sumL += ST_LEN[k];
  let sumG = 0; for (let k = 0; k < n - 1; k++){ ST_GAP[k] = 15 + Math.floor(rnd() * 100); sumG += ST_GAP[k]; }
  if (sumL + sumG > 1435){ const f = Math.max(0, 1435 - sumL) / (sumG || 1); sumG = 0; for (let k = 0; k < n - 1; k++){ ST_GAP[k] = Math.floor(ST_GAP[k] * f); sumG += ST_GAP[k]; } }
  const span = sumL + sumG, pa = PEAKS[PEAK_NAMES[T_PK[i]]][0], sh = dayShift(dk);
  if (pa < 22){
    let at = clampN(pa * 60 + Math.floor(rnd() * 240) - 60 + sh, 0, Math.max(0, 1438 - span));     // anywhere from an hour early to three late
    for (let k = 0; k < n; k++){ ST_A[k] = at; ST_B[k] = at + ST_LEN[k]; at += ST_LEN[k] + (k < n - 1 ? ST_GAP[k] : 0); }
    return {n, rnd};
  }
  // night owls start around 10 PM and keep going past midnight: whatever runs over wraps to the small
  // hours of the same day (the day is a loop, so nothing overlaps), and a sitting that crosses midnight is split in two
  let at = 1260 + Math.floor(rnd() * 270) + sh + 1440, c = 0;     // some nights from 9 PM, others not until 1:30 AM
  const A = [], L = [];
  for (let k = 0; k < n; k++){
    const a = at % 1440, len = ST_LEN[k];
    if (a + len > 1440){ A.push(a); L.push(1440 - a); A.push(0); L.push(a + len - 1440); }
    else { A.push(a); L.push(len); }
    at += len + (k < n - 1 ? ST_GAP[k] : 0);
  }
  const ord = A.map((_, k) => k).sort((x, y) => A[x] - A[y]).slice(0, 64);
  ord.forEach(k => { ST_A[c] = A[k]; ST_LEN[c] = L[k]; ST_B[c] = A[k] + L[k]; c++; });
  return {n: c, rnd};
}
// every bot's plan for one day, worked out once and reused by that day's twelve updates:
// total and longest sitting, plus when each sitting happens (SCH_*: player i's sittings are SCH_O[i] .. SCH_O[i+1])
let planDay = null, planM = null, planL = null, SCH_O = null, SCH_A = new Uint16Array(1 << 20), SCH_B = new Uint16Array(1 << 20);
// the world update can run in small steps (a few milliseconds at a time) so the page stays smooth; the result is identical
const runGen = g => { let r; while (!(r = g.next()).done); return r.value; };
async function runGenAsync(g){ let r, t = performance.now(); while (!(r = g.next()).done){ if (performance.now() - t > 10){ await breathe(); t = performance.now(); } } return r.value; }
function plansFor(dk){ if (planDay !== dk) runGen(plansGen(dk)); }
function* plansGen(dk){
  planDay = null;
  if (!planM){ planM = new Int32Array(ROSTER_N); planL = new Int32Array(ROSTER_N); SCH_O = new Int32Array(ROSTER_N + 1); }
  let c = 0;
  for (let i = 0; i < ROSTER_N; i++){
    daySits(i, dk, SITS);
    let m = 0, longest = 0; for (const x of SITS){ m += x; if (x > longest) longest = x; }
    planM[i] = SITS.length ? Math.max(1, Math.round(m)) : 0; planL[i] = Math.round(longest);
    SCH_O[i] = c;
    const {n} = sitTimes(i, dk, SITS);
    if (c + n > SCH_A.length){ const a = new Uint16Array(SCH_A.length * 2), b = new Uint16Array(SCH_B.length * 2); a.set(SCH_A); b.set(SCH_B); SCH_A = a; SCH_B = b; }
    for (let k = 0; k < n; k++){ SCH_A[c] = ST_A[k]; SCH_B[c] = ST_B[k]; c++; }
    if ((i & 4095) === 4095) yield;
  }
  SCH_O[ROSTER_N] = c;
  planDay = dk;
}
// minutes player i studied between minute w0 and w1 of the planned day
function windowMin(i, w0, w1){
  let m = 0; for (let k = SCH_O[i], e = SCH_O[i + 1]; k < e; k++){ const a = Math.max(SCH_A[k], w0), b = Math.min(SCH_B[k], w1); if (b > a) m += b - a; }
  return m;
}
function rollover(t){
  // midnight: close out yesterday, then start today
  const d = new Date(t), yk = dayKey(new Date(t - 12 * 3600e3)), sun = d.getDay() === 0, first = d.getDate() === 1;
  const cached = planDay === yk;
  for (let i = 0; i < ROSTER_N; i++){
    const o = i * BF;
    if (cached ? planM[i] > 0 : dayPlan(i, yk, PLAN).active){ BS[o+F.days]++; BS[o+F.cur]++; if (BS[o+F.cur] > BS[o+F.best]) BS[o+F.best] = BS[o+F.cur]; } else BS[o+F.cur] = 0;
    PREV[i] = baseR(i); BS[o+F.today] = 0;
    if (sun) BS[o+F.week] = 0;
    if (first) BS[o+F.month] = 0;
  }
  planDay = null;      // plans depend on the start-of-day ratings, which just changed
}
function addStudy(i, add, longest){
  const o = i * BF, before = BS[o+F.today]; add = Math.min(add, DAY_MAX - before); if (add <= 0) return;
  const today = before + add, bl = blockLenI(i, baseR(i));
  BS[o+F.today] = today; BS[o+F.total] += add; BS[o+F.week] += add; BS[o+F.month] += add;
  BS[o+F.sessions] += Math.max(0, Math.round(today / bl) - Math.round(before / bl)) || (before === 0 ? 1 : 0);
  if (today > BS[o+F.maxDay]) BS[o+F.maxDay] = today;
  BS[o+F.maxSess] = Math.max(BS[o+F.maxSess], Math.min(longest, today));
  if (BS[o+F.week] > BS[o+F.maxWeek]) BS[o+F.maxWeek] = BS[o+F.week];
  if (BS[o+F.month] > BS[o+F.maxMonth]) BS[o+F.maxMonth] = BS[o+F.month];
}
/* Ranked matches between players: one match per study sitting, like yours. A sitting is matched at the first
   2-hour update after it ends (a 4-hour sitting waits until it's over), against someone near them on the ladder
   whose sitting also ended in that window; the whole sittings are compared and whoever studied longer wins.
   Sittings under 10 minutes aren't rated, and no studying means no match. Each player's last 5 are kept. */
const M5 = 5, M5_V = 3, BOT_K = 24;    // K-factor for matches between other players, same as yours after placements
let M5_OPP = null, M5_T = null, M5_A = null, M5_B = null, M5_D = null, M5_R = null, M5_O = null, M5_H = null;
/* every player's ranked record: wins and losses. Matches are won by whoever studied longer, so players who sit longer
   than others around their rating win more. Records from before counting began (RK_T0) are estimated (the same on every
   device); any of those older matches that shows in someone's match history is put in exactly once it's been looked up
   (RK_REC), so a record never contradicts the history. From RK_T0 on, every match adds a real win or loss. */
let RK_EW = null, RK_EL = null, RK_LW = null, RK_LL = null, RK_REC = null, RK_T0 = 0;
function rkEst(i, g){
  if (g <= 0) return [0, 0];
  let h = Math.imul(i ^ 0x5bd1e995, 2654435761) >>> 0; const u = () => (h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0, h / 4294967296);
  const fav = T_FAV[i] <= 2 ? -.02 : 0;                               // fixed-length timers don't stretch a sitting
  const e = clampN(.5 + (T_SIT[i] - 1) * .9 + fav + (u() - .5) * .06, .3, .7);
  const z = Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const w = Math.round(g * clampN(e + z * Math.sqrt(e * (1 - e) / g), 0, 1));
  return [w, g - w];
}
function rkCounts(rec){
  if (RK_EW && RK_EW.length === ROSTER_N) return;
  const ok = b => b && b.byteLength === ROSTER_N * 4;
  if (rec && rec.rk && rec.rk.v === 2 && ok(rec.rk.ew) && ok(rec.rk.el) && ok(rec.rk.lw) && ok(rec.rk.ll) && rec.rk.rec && rec.rk.rec.byteLength === ROSTER_N){
    RK_EW = new Int32Array(rec.rk.ew); RK_EL = new Int32Array(rec.rk.el); RK_LW = new Int32Array(rec.rk.lw); RK_LL = new Int32Array(rec.rk.ll); RK_REC = new Uint8Array(rec.rk.rec); RK_T0 = rec.rk.t0; return;
  }
  if (!BS || !T_SIT) return;
  const N = ROSTER_N; RK_EW = new Int32Array(N); RK_EL = new Int32Array(N); RK_LW = new Int32Array(N); RK_LL = new Int32Array(N); RK_REC = new Uint8Array(N);
  RK_T0 = R.lastSlice || Date.now();
  for (let i = 0; i < N; i++){ const [w, l] = rkEst(i, Math.floor(BS[i * BF + F.sessions] * .9)); RK_EW[i] = w; RK_EL[i] = l; }
  markBots();
}
const rkSave = () => RK_EW ? {rk: {v: 2, t0: RK_T0, ew: RK_EW.buffer, el: RK_EL.buffer, lw: RK_LW.buffer, ll: RK_LL.buffer, rec: RK_REC.buffer}} : {};
const rkTally = (win, lose) => { if (!RK_LW) return; RK_LW[win]++; RK_LL[lose]++; };
const rkWins = i => RK_EW[i] + RK_LW[i], rkGames = i => RK_EW[i] + RK_EL[i] + RK_LW[i] + RK_LL[i];
// put the older matches someone's history shows into their record exactly
function rkReconcile(i){
  if (!RK_EW || RK_REC[i]) return false;
  try { m5Backfill(i); } catch(e){}
  const old = m5List(i).filter(m => m.t < RK_T0), w = old.filter(m => m.a > m.b).length, l = old.length - w;
  const g0 = RK_EW[i] + RK_EL[i], [we, le] = rkEst(i, Math.max(0, g0 - old.length));
  RK_EW[i] = we + w; RK_EL[i] = le + l; RK_REC[i] = 1; markBots();
  return true;
}
function m5Init(rec){
  const n = ROSTER_N * M5;
  const ok = rec && rec.v === M5_V && rec.opp && rec.opp.byteLength === n * 4 && rec.h && rec.h.byteLength === ROSTER_N;   // older formats start fresh
  M5_OPP = ok ? new Int32Array(rec.opp) : new Int32Array(n).fill(-1);
  M5_T = ok ? new Uint32Array(rec.t) : new Uint32Array(n);      // when the sitting ended: day since 2026-01-01 × 1440 + minute
  M5_A = ok ? new Uint16Array(rec.a) : new Uint16Array(n);      // this player's sitting, in minutes
  M5_B = ok ? new Uint16Array(rec.b) : new Uint16Array(n);      // the opponent's sitting
  M5_D = ok ? new Int8Array(rec.d) : new Int8Array(n);          // Elo change
  M5_R = ok ? new Uint16Array(rec.r) : new Uint16Array(n);      // rating after the match
  M5_O = ok ? new Uint16Array(rec.o) : new Uint16Array(n);      // the opponent's rating going into it
  M5_H = ok ? new Uint8Array(rec.h) : new Uint8Array(ROSTER_N); // next slot to write
}
const m5Save = () => ({v: M5_V, opp: M5_OPP.buffer, t: M5_T.buffer, a: M5_A.buffer, b: M5_B.buffer, d: M5_D.buffer, r: M5_R.buffer, o: M5_O.buffer, h: M5_H.buffer});
// times are kept as (days since 2026-01-01) × 1440 + minute of the day, which survives clock changes
const M5_EPOCH = new Date(2026, 0, 1);
const dayIdx = dk => Math.round((new Date(dk + 'T00:00') - M5_EPOCH) / 864e5);   // midnight to midnight; rounding absorbs clock changes
const tCode = (dk, min) => dayIdx(dk) * 1440 + min;
const tFromCode = c => { const d = new Date(M5_EPOCH); d.setDate(d.getDate() + Math.floor(c / 1440)); d.setMinutes(c % 1440); return d.getTime(); };
function m5Count(i){ let c = 0; for (let k = 0; k < M5; k++) if (M5_OPP[i * M5 + k] >= 0) c++; return c; }
function m5Put(i, opp, code, a, b, d, after, oppR){     // a new, newest match
  const s = i * M5 + M5_H[i]; M5_H[i] = (M5_H[i] + 1) % M5;
  M5_OPP[s] = opp; M5_T[s] = code; M5_A[s] = a; M5_B[s] = b; M5_D[s] = d; M5_R[s] = after; M5_O[s] = oppR;
}
function m5PutOlder(i, opp, code, a, b, d, after, oppR){   // an older match, into the next empty slot behind the ones there
  const c = m5Count(i); if (c >= M5) return;
  const s = i * M5 + (M5_H[i] - 1 - c + 2 * M5) % M5;
  M5_OPP[s] = opp; M5_T[s] = code; M5_A[s] = a; M5_B[s] = b; M5_D[s] = d; M5_R[s] = after; M5_O[s] = oppR;
}
// matchmaking spread: opponents are usually within about this many points of a player's rating
const MATCH_SPREAD = 80;
// in a list of players sorted best-first, where a rating would sit (binary search)
function posForRating(list, rOf, r){ let lo = 0, hi = list.length; while (lo < hi){ const mid = (lo + hi) >> 1; if (rOf(list[mid]) > r) lo = mid + 1; else hi = mid; } return Math.min(lo, list.length - 1); }
function m5List(i){      // newest first
  const out = [];
  for (let k = 1; k <= M5; k++){
    const s = i * M5 + (M5_H[i] - k + M5) % M5; if (M5_OPP[s] < 0) continue;
    const t = tFromCode(M5_T[s]); out.push({opp: M5_OPP[s], t, t0: t - M5_A[s] * 60000, a: M5_A[s], b: M5_B[s], d: M5_D[s], after: M5_R[s], oppR: M5_O[s], code: M5_T[s]});
  }
  return out;
}
// the sitting that ended in (e0, e1] for player i on the planned day: its index in SCH_*, or -1
function sitEndingIn(i, e0, e1){
  let best = -1;
  for (let k = SCH_O[i], e = SCH_O[i + 1]; k < e; k++) if (SCH_B[k] > e0 && SCH_B[k] <= e1 && SCH_B[k] - SCH_A[k] >= 10 && (best < 0 || SCH_B[k] - SCH_A[k] > SCH_B[best] - SCH_A[best])) best = k;
  return best;
}
let CAND = null, CSIT = null;
function shuffledIdx(n, rnd){ const a = new Int32Array(n); for (let k = 0; k < n; k++) a[k] = k; for (let k = n - 1; k > 0; k--){ const j = Math.floor(rnd() * (k + 1)); const t = a[k]; a[k] = a[j]; a[j] = t; } return a; }
// who plays whom in one window, and how it goes (nothing is changed here, so the live feed can look ahead)
function pairWindow(w0, dk){ return runGen(pairGen(w0, dk)); }
function* pairGen(w0, dk){      // sittings that ended during the window starting at minute w0 of day dk
  if (!CAND){ CAND = new Int32Array(ROSTER_N); CSIT = new Int32Array(ROSTER_N); }
  let n = 0;
  for (let i = 0; i < ROSTER_N; i++){ if ((i & 16383) === 16383) yield; if (!planM[i]) continue; const k = sitEndingIn(i, w0, w0 + 120); if (k >= 0){ CAND[n] = i; CSIT[i] = k; n++; } }
  yield;
  const cand = Array.from(CAND.subarray(0, n)).sort((x, y) => baseR(y) - baseR(x) || x - y);
  const candR = cand.map(i => baseR(i)), rOfK = q => candR[q], ks = Array.from({length: n}, (_, q) => q);
  yield;
  const used = new Uint8Array(n), rnd = mulberry32(ROSTER_SEED ^ (dayIdx(dk) * 1440 + w0) * 2246822519), out = [];
  let step = 0;
  for (const k of shuffledIdx(n, rnd)){
    if ((++step & 2047) === 0) yield;
    if (used[k]) continue;
    // someone whose sitting also just ended, usually within ~80 points of their rating
    const target = candR[k] + Math.round(gaussOf(rnd) * MATCH_SPREAD);
    let j = -1; const p0 = posForRating(ks, rOfK, target);
    for (let off = 0; off < 12 && j < 0; off++) for (const q of [p0 + off, p0 - off]) if (q >= 0 && q < n && q !== k && !used[q]){ j = q; break; }
    if (j < 0) continue;
    used[k] = used[j] = 1;
    const a = cand[k], c = cand[j], sa_ = CSIT[a], sc_ = CSIT[c];
    let ma = SCH_B[sa_] - SCH_A[sa_], mc = SCH_B[sc_] - SCH_A[sc_]; const ra = baseR(a), rc = baseR(c);
    if (ma === mc){ if ((Math.imul(a ^ c, 0x9e3779b1) ^ w0) & 1) ma++; else mc++; }      // no draws: same minute, someone went a bit longer
    const ea = 1 / (1 + Math.pow(10, (rc - ra) / 400)), sa = ma > mc ? 1 : 0, dlt = Math.round(BOT_K * (sa - ea));
    out.push({a, c, ma, mc, ra, rc, dlt, ea: SCH_B[sa_], ec: SCH_B[sc_]});
  }
  return out;
}
function windowMatches(w0, dk, pairs){
  for (const m of pairs || pairWindow(w0, dk)){
    const {a, c, ma, mc, ra, rc, dlt} = m, na = clampN(ra + dlt, 300, 5000), nc = clampN(rc - dlt, 300, 5000);
    BS[a * BF] = na + OV_R[a]; BS[c * BF] = nc + OV_R[c];
    m5Put(a, c, tCode(dk, m.ea), ma, mc, na - ra, BS[a * BF], rc + OV_R[c]);
    m5Put(c, a, tCode(dk, m.ec), mc, ma, nc - rc, BS[c * BF], ra + OV_R[a]);
    if (ma > mc) rkTally(a, c); else rkTally(c, a);
  }
  botsChanged();
}
// Profiles that don't have 5 matches yet are filled from the player's past sittings, newest first, under the
// same rules: a sitting of 10+ minutes, against a nearby player whose sitting ended in the same 2-hour window.
// Ratings are walked back from their oldest saved match (or today's rating), so the chain still ends where it is now.
const sitsOf = (i, dk) => { if (dk < botJoinKey(i)) return []; const xs = daySits(i, dk, []); const {n} = sitTimes(i, dk, xs); const out = []; for (let k = 0; k < n; k++) out.push([ST_A[k], ST_B[k]]); return out; };
function m5Backfill(i){
  let c = m5Count(i); if (c >= M5 || !BS) return false;
  const have = m5List(i), oldest = have.length ? have[have.length - 1] : null;
  // only sittings that ended before anything already saved (and before the last update, which handled the rest)
  const limit = oldest ? oldest.code : tCode(dayKey(R.lastSlice), new Date(R.lastSlice).getHours() * 60) - 1;
  let rating = oldest ? oldest.after - oldest.d : BS[i * BF];
  const order = sortedBots(), pos = posOf(i), myNow = BS[i * BF];
  let lastOpp = oldest ? oldest.opp : -1;
  for (let back = 0; back < 60 && c < M5; back++){
    const d = new Date(tFromCode(limit)); d.setDate(d.getDate() - back); const dk = dayKey(d.getTime());
    const mine = sitsOf(i, dk).filter(([a, b]) => b - a >= 10 && tCode(dk, b) < limit).reverse();   // newest first
    for (const [a0, b0] of mine){
      if (c >= M5) break;
      const win = Math.floor((b0 - 1) / 120) * 120, rnd = mulberry32(dayIdx(dk) * 1440 + b0 + i * 7919);
      // look for a player around their rating (usually within ~80 points) whose sitting ended in the same window
      let opp = -1, om = 0;
      for (let tries = 0; tries < 6 && opp < 0; tries++){
        const p0 = posForRating(order, j => BS[j * BF], myNow + Math.round(gaussOf(rnd) * MATCH_SPREAD));
        for (let off = 0; off < 8 && opp < 0; off++){
          const q = p0 + (off >> 1) * (off & 1 ? -1 : 1); if (q < 0 || q >= order.length) continue;
          const j = order[q]; if (j === i || j === lastOpp) continue;
          const sj = sitsOf(j, dk).filter(([x, y]) => y > win && y <= win + 120 && y - x >= 10);
          if (sj.length){ opp = j; om = Math.max(...sj.map(([x, y]) => y - x)); }
        }
      }
      if (opp < 0) continue;
      const mm = b0 - a0, ro = rating + (BS[opp * BF] - myNow), ea = 1 / (1 + Math.pow(10, (ro - rating) / 400));
      const dlt = Math.round(BOT_K * ((mm > om ? 1 : mm < om ? 0 : .5) - ea));
      m5PutOlder(i, opp, tCode(dk, b0), mm, om, dlt, clampN(rating, 300, 5000), clampN(Math.round(ro), 300, 5000));
      rating -= dlt; c++; lastOpp = opp;
    }
  }
  markBots(); saveBots();
  return true;
}
// one window [t, t + 2h): everyone's study minutes from their real session times, then that window's matches
function runWindow(t, addMinutes){ return runGen(windowGen(t, addMinutes)); }
function* windowGen(t, addMinutes){
  const dk = dayKey(t), w0 = new Date(t).getHours() * 60;
  if (planDay !== dk) yield* plansGen(dk);
  if (addMinutes) for (let i = 0; i < ROSTER_N; i++){ if ((i & 16383) === 16383) yield; if (!planM[i]) continue; const m = windowMin(i, w0, w0 + 120); if (m > 0) addStudy(i, m, planL[i]); }
  const pairs = yield* pairGen(w0, dk);
  windowMatches(w0, dk, pairs);
}
// the update at time t handles the 2 hours that just ended; at midnight that's yesterday's last window, then the new day starts
function runSlice(t, addMinutes = true){
  runWindow(t - SLICE, addMinutes);
  if (new Date(t).getHours() === 0) rollover(t);
}
async function runSliceAsync(t){
  await runGenAsync(windowGen(t - SLICE, true));
  if (new Date(t).getHours() === 0){ await breathe(); rollover(t); }
}
// runs one update (or one whole missed day) at a time, letting the page breathe in between;
// resolves to true if anything changed
let simBusy = null;
function dailySim(){
  if (!RK_READY) return Promise.resolve(false);
  if (simBusy) return simBusy;
  let res; const prom = simBusy = new Promise(r => res = r);
  (async () => {
    while (typeof LF !== 'undefined' && LF.prepping) await breathe();      // the Studying now card is mid-way through its own steps
    let now = sliceStartOf(worldT(Date.now()));
    if (WORLD_UNTIL) now = Math.min(now, WORLD_UNTIL);
    if (!R.lastSlice || R.lastSlice < WORLD_START) R.lastSlice = WORLD_START;
    let changed = false;
    for (let t = R.lastSlice + SLICE; t <= now; t += SLICE){
      await runSliceAsync(t); R.lastSlice = t; changed = true;
      await new Promise(r => setTimeout(r, 15));          // let the page breathe between updates
    }
    for (const e of pendingEvents()){ applyEvent(e.h); changed = true; }     // real players' matches, in any order
    if (changed){ R.lastSim = dayKey(R.lastSlice); lbPts = null; botsChanged(); markBots(); updateParagon(); saveRanked(true); }
    return changed;
  })().then(ch => { simBusy = null; res(ch); }, e => { console.error(e); simBusy = null; res(false); });
  return prom;
}
/* sorted by rating (counting sort: ratings are whole numbers from 0 to 5,000), ties by bot number */
let sortedCache = null, posCache = null, botsVer = 0, rankCountCache = null;
function botsChanged(){ sortedCache = null; posCache = null; rankCountCache = null; botsVer++; badgeCache.clear(); }
function sortedBots(){
  if (sortedCache) return sortedCache;
  const MAXR = 5000, cnt = new Int32Array(MAXR + 2), out = new Int32Array(ROSTER_N);
  for (let i = 0; i < ROSTER_N; i++) cnt[MAXR - clampN(BS[i * BF], 0, MAXR) + 1]++;
  for (let k = 1; k <= MAXR + 1; k++) cnt[k] += cnt[k - 1];
  for (let i = 0; i < ROSTER_N; i++) out[cnt[MAXR - clampN(BS[i * BF], 0, MAXR)]++] = i;
  return (sortedCache = out);
}
function posOf(i){ if (!posCache){ const o = sortedBots(); posCache = new Int32Array(ROSTER_N); for (let k = 0; k < o.length; k++) posCache[o[k]] = k; } return posCache[i]; }
// overall place by Elo among everyone (you win ties)
function placeOf(who){
  if (who === ME){ const o = sortedBots(); let lo = 0, hi = o.length; while (lo < hi){ const m = (lo + hi) >> 1; if (BS[o[m] * BF] > R.mmr) lo = m + 1; else hi = m; } return lo + 1; }
  return posOf(who) + 1 + (R.mmr >= botRating(who) ? 1 : 0);
}

/* the Paragon: the single highest-rated player, once they're a Laureate. Ties keep the holder. */
const paraKey = h => h === ME ? 'me' : String(h);
function reignLongest(h){ const p = R.para, k = paraKey(h); return Math.max(p.long[k] || 0, p.h === h ? Date.now() - p.since : 0); }
function reignTotal(h){ const p = R.para, k = paraKey(h); return (p.reign[k] || 0) + (p.h === h ? Date.now() - p.since : 0); }
function updateParagon(silent){
  const p = R.para, o = sortedBots(), top = o[0], topR = BS[top * BF], best = Math.max(topR, R.mmr);
  let h = null;
  if (best >= LAUREATE_MIN){
    const holderR = p.h === ME ? R.mmr : p.h != null ? botRating(p.h) : -1;
    h = holderR === best ? p.h : R.mmr > topR ? ME : top;
  }
  if (h === p.h) return;
  const now = Date.now(), old = p.h;
  if (old != null){ const k = paraKey(old), held = now - p.since; p.reign[k] = (p.reign[k] || 0) + held; p.long[k] = Math.max(p.long[k] || 0, held); }
  p.h = h; p.since = now;
  saveRanked(); badgeCache.clear(); renderRankChip();
  if (silent) return;
  if (h === ME) crownShow(PARAGON, 'You are the Paragon', 'The single highest-rated player of all. Hold on to it.');
  else if (old === ME) toast(`You lost the Paragon title to ${BOTS[h] ? BOTS[h].name : 'a rival'}.`);
}
function crownShow(rkObj, title, sub){
  let ov = $('#crownOv');
  if (!ov){ ov = document.createElement('div'); ov.id = 'crownOv'; ov.className = 'crown-ov'; document.body.appendChild(ov); ov.addEventListener('click', () => ov.hidden = true); }
  ov.innerHTML = `<div class="crown-card" style="--ec:${rkObj.c}"><div class="crown-glow"></div>${emblem(rkObj, 'xxl')}<b>${esc(title)}</b><span>${esc(sub)}</span><small>Click anywhere to continue</small></div>`;
  ov.hidden = false; ov.classList.remove('go'); void ov.offsetWidth; ov.classList.add('go');
  fx.burst(); setTimeout(() => fx.burst(), 450);
  clearTimeout(crownShow.t); crownShow.t = setTimeout(() => ov.hidden = true, 6000);
}

/* bot study profiles and badges */
function botStats(i){
  const b = BOTS[i], o = i * BF, x = b.x, r = BS[o], days = BS[o+F.days], n = BS[o+F.sessions], total = BS[o+F.total];
  const rr = mulberry32(ROSTER_SEED + i * 31337), f = () => rr();
  const yrs = days / 365, bl = blockLen(b, r);
  const modes = {}; modes[b.fav] = Math.round(n * .6);
  ['pomodoro','fifty','flow','timebox','stopwatch','custom'].forEach(m => { if (m !== b.fav && f() < clampN(days / 120, .05, .8)) modes[m] = Math.max(1, Math.round(n * .08 * f())); });
  const night = b.peak === 'Late night', morn = b.peak === 'Morning';
  const sp = {}; ['01-01','02-14','10-31','12-25'].forEach(k => { if (f() < clampN(yrs * .55, 0, .9)) sp[k] = 1; }); if (f() < yrs * .02) sp['02-29'] = 1;
  const acts = 3 + Math.floor(x[0] * 5), maxDayN = Math.max(1, Math.round(BS[o+F.maxDay] / Math.min(bl, 52)));
  const goalP = clampN(typical(r) * sittingsPerDay(b) / (25 * 6) * .8, 0, .95);
  const st = {
    n, total, maxSess: BS[o+F.maxSess], named: n, modes, tags: {}, sp, swDot: (modes.stopwatch || 0) > 20 && f() < .3 ? 1 : 0,
    flowMax: modes.flow ? Math.round(BS[o+F.maxSess] * .8) : 0,
    early: morn || f() < .2 ? 1 : 0, dawn: morn && f() < .35 ? 1 : 0, owl: night || f() < .45 ? 1 : 0, midnight: night && days > 20 ? 1 : f() < .1 ? 1 : 0,
    three: night && days > 40 && f() < .25 ? 1 : 0, lunch: f() < .5 ? 1 : 0, monMorning: morn || f() < .2 ? 1 : 0, weekend: days > 5 ? 1 : 0,
    fri13: f() < clampN(yrs * 1.3, 0, .9) ? 1 : 0, pi: f() < clampN(days / 2000, 0, .3) ? 1 : 0,
    daysActive: days, bestStreak: BS[o+F.best], goalDays: Math.round(days * goalP), goalStreak: Math.round(BS[o+F.best] * goalP * .8),
    maxDay: BS[o+F.maxDay], maxDayN, comeback: activity(b, r) < .6 && f() < .6 ? 1 : 0, lucky7: maxDayN >= 7 && f() < clampN(yrs * .4, 0, .5) ? 1 : 0,
    fullWeekend: days > 15 && f() < .75 ? 1 : 0, maxWeek: BS[o+F.maxWeek], maxMonth: BS[o+F.maxMonth], perfectWeek: Math.min(7, BS[o+F.best]),
    allDay: BS[o+F.maxDay] > 240 && f() < .55 ? 1 : 0, insomniac: night && f() < clampN(yrs * .15, 0, .4) ? 1 : 0,
    hours: Math.min(24, Math.round(6 + days / 10 + (b.style === 'Wildcard' ? 5 : 0))), dows: Math.min(7, days >= 14 ? 7 : days),
    taskCount: Math.round(n * (.25 + x[1] * .2)), maxTaskDays: Math.min(days, Math.round(3 + days * (.08 + x[2] * .12))),
    actCount: acts, maxTag: Math.round(total * (.3 + x[3] * .3)), tags5h: Math.min(acts, Math.floor(total / (300 * 1.6))),
    maxGroup: Math.max(1, Math.round(maxDayN * .55)), maxPomoGroup: b.fav === 'pomodoro' ? Math.max(1, Math.round(maxDayN * .55)) : 0,
    c: {notes: Math.round(days * .4 * x[4]), notesDone: Math.round(days * .3 * x[4]), tagsAdded: x[5] < .7 ? 1 : 0, mini: x[6] < .6 ? 1 : 0, focusMode: x[7] < .6 ? 1 : 0,
        music: Math.round(x[5] * 8), backup: x[6] < .3 ? 1 : 0, edits: x[7] < .5 ? 2 : 0, deletes: x[4] < .4 ? 1 : 0, calMonth: x[3] < .6 ? 1 : 0, awards: 1,
        resets: Math.round(x[2] * 30), keys: Math.round(n * x[1] * .5), thunder: x[0] < .3 ? days * 2 : 0},
    set: {themes: 1 + Math.floor(x[1] * x[2] * Object.keys(THEMES).length), fonts: 1 + Math.floor(x[3] * x[4] * Object.keys(DIGIT_FONTS).length), amb: x[5] < .6 ? 1 + Math.floor(x[6] * 4) : 0, accentUsed: x[7] < .3 ? 1 : 0},
    rain: x[5] < .5 ? 1 : 0, storm: x[5] < .3 ? 1 : 0,
    r: {played: Math.round(days * .8), w: Math.round(days * .4), bestWs: Math.round(2 + x[2] * 8), bestUpset: Math.round(x[3] * 350), revenge: x[4] < .5 ? 1 : 0, best: r + Math.round(x[6] * 120), profWins: r >= 2400 ? Math.round(days * .2) : 0, para: R.para && (R.para.h === i || R.para.reign[i] != null) ? 1 : 0, reign: R.para ? Math.floor(reignLongest(i) / 864e5) : 0},
    unlocked: 0
  };
  st.modeCount = Object.keys(modes).length;
  /* study guides and practice quizzes came later, so they get their own seeded draws (the ones above stay put).
     Longer-time players are likelier to have them, and each step needs the one before it. */
  const g = mulberry32(ROSTER_SEED + i * 7919 + 17), use = clampN(days / 180, .3, 1);
  const hasGuide = g() < .51 * use, studied = hasGuide && g() < .7, quizzed = hasGuide && g() < .5;
  st.c.guides = hasGuide ? (g() < .24 ? 5 + Math.floor(g() * 6) : 1 + Math.floor(g() * 4)) : 0;
  st.c.guideStudy = studied ? 1 : 0;
  st.c.quizzes = quizzed ? 1 + Math.floor(g() * 3) : 0;
  st.c.quizPerfect = quizzed && g() < .4 ? 1 : 0;
  st.c.guideDone = studied && g() < .17 ? 1 : 0;
  return st;
}
const badgeCache = new Map();
function earnedFor(st){
  const got = [];
  for (const a of ACHS){ if (a.cat === 'meta') continue; if (achVal(a, st) >= a.goal) got.push(a.id); }
  st.unlocked = got.length;
  for (const a of ACHS){ if (a.cat !== 'meta') continue; if (achVal(a, st) >= a.goal){ got.push(a.id); st.unlocked++; } }
  return got;
}
function botBadges(i){
  if (badgeCache.has(i)) return badgeCache.get(i);
  const got = earnedFor(botStats(i));
  if (badgeCache.size > 5000) badgeCache.clear();
  badgeCache.set(i, got); return got;
}
const TIER_RANK = {legendary:0, platinum:1, gold:2, silver:3, bronze:4};
let ACH_MAP = null;
const achById = id => (ACH_MAP || (ACH_MAP = new Map(ACHS.map(a => [a.id, a])))).get(id);
function rarityOf(id){ return R.rar && R.rar.counts[id] != null ? (R.rar.counts[id] + (ACH.u[id] ? 1 : 0)) / (ROSTER_N + 1) : null; }
function rareSort(ids){
  return ids.slice().sort((p, q) => { const a = rarityOf(p), b = rarityOf(q); if (a != null && b != null && a !== b) return a - b; return TIER_RANK[achById(p).tier] - TIER_RANK[achById(q).tier]; });
}
function featured(ids, peakHint){
  const sorted = rareSort(ids.filter(id => achById(id) && achById(id).cat !== 'meta'));
  const out = sorted.slice(0, 2);
  const pers = peakHint && sorted.find(id => !out.includes(id) && peakHint.includes(id));
  if (pers) out.push(pers); else if (sorted[2]) out.push(sorted[2]);
  return out;
}
function botFeatured(i){ const b = BOTS[i]; return featured(botBadges(i), b.peak === 'Late night' ? ['owl','midnight','three','insomnia'] : b.peak === 'Morning' ? ['early','dawn','monday'] : b.style === 'Grinder' ? ['l240','l180','l120','d8','d6'] : b.style === 'Sprinter' ? ['g8p','g4p','dn12','dn8'] : null); }
function myFeatured(){
  const mine = ACHS.filter(a => ACH.u[a.id]).map(a => a.id);
  const chosen = (R.showcase || []).filter(id => ACH.u[id]);
  return chosen.length ? chosen.slice(0, 3) : featured(mine);
}
/* one pass over every bot, in small idle chunks: how many bots hold each achievement (rarity, kept
   for the day) and each bot's achievement points (for the leaderboard, redone after each update).
   Badge lists aren't kept for every bot, only for the few on screen. */
const RAR_V = 2;   // bump when bot stats change so rarity is recounted right away
let passGen = 0, passRunning = false, passWait = [];
function badgePass(done){
  if (done) passWait.push(done);
  if (!RK_READY) return;
  const needRar = !(R.rar && R.rar.day === R.lastSim && R.rar.v === RAR_V);
  if (!needRar && lbPts){ const w = passWait; passWait = []; w.forEach(f => f()); return; }
  if (passRunning) return; passRunning = true;
  const gen = botsVer, counts = {}, pts = new Int32Array(ROSTER_N), PT = {}; ACHS.forEach(a => { counts[a.id] = 0; PT[a.id] = TIERS[a.tier].pts; });
  let i = 0;
  const idle = window.requestIdleCallback || (f => setTimeout(() => f({timeRemaining: () => 8}), 16));
  const step = dl => {
    if (botsVer !== gen){ passRunning = false; setTimeout(() => badgePass(), 500); return; }     // bots changed mid-way: start over
    const t0 = performance.now();
    while (i < ROSTER_N && performance.now() - t0 < 12){
      const end = Math.min(ROSTER_N, i + 100);
      for (; i < end; i++){ const got = badgeCache.get(i) || earnedFor(botStats(i)); let n = 0; for (const id of got){ counts[id]++; n += PT[id]; } pts[i] = n; }
    }
    if (i < ROSTER_N){ idle(step); return; }
    R.rar = {day: R.lastSim, counts, v: RAR_V}; lbPts = pts; passRunning = false; saveRanked();
    const w = passWait; passWait = []; w.forEach(f => f());
  };
  idle(step);
}
const computeRarity = done => badgePass(done);
const ensureBotPoints = done => badgePass(done);
function badgeHtml(id, size){
  const a = achById(id); if (!a) return '';
  return `<span class="bdg ${size || ''}" data-ach="${a.id}" tabindex="0" role="button" aria-label="${esc(a.name)}, ${TIERS[a.tier].name} achievement. Show details">${achIcon(a)}</span>`;
}
/* badge detail card: what it is, how to get it, how rare, and where you stand */
let tipStats = null, tipStatsAt = 0, tipFor = null, tipAt = 0;
function showBadgeTip(el){
  const a = achById(el.dataset.ach); if (!a) return;
  const tip = $('#bdgTip'), T = TIERS[a.tier], got = ACH.u[a.id], hidden = a.secret && !got;
  if (Date.now() - tipStatsAt > 3000){ tipStats = achStats(); tipStatsAt = Date.now(); }
  const pct = rarityOf(a.id);
  const v = achVal(a, tipStats);
  const mine = got ? `<span class="tip-me got">You have this · unlocked ${new Date(got).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</span>`
    : hidden ? `<span class="tip-me">You don't have this yet</span>`
    : `<span class="tip-me">You don't have this yet${a.goal > 1 ? ` · your progress: ${achProgressText(a, v)}` : ''}</span>${a.goal > 1 ? `<span class="tip-bar"><i style="width:${Math.min(100, v / a.goal * 100)}%;background:${T.c}"></i></span>` : ''}`;
  tip.innerHTML = `<div class="tip-top">${achIcon(a, 'big')}<span><b>${esc(a.name)}</b><small style="color:${T.c}">${T.name} · +${T.pts}</small></span></div>
    <p class="tip-how">${hidden ? '<em>Secret: unlock it yourself to find out how.</em>' : `<span>How to get it</span>${esc(a.desc)}`}</p>
    ${pct == null ? '' : `<small class="tip-rare">Held by ${pct < .001 ? 'under 0.1' : (pct * 100).toFixed(pct < .1 ? 1 : 0)}% of players</small>`}
    ${mine}`;
  tip.hidden = false; tipFor = el; tipAt = Date.now();
  // place it above the badge, or below if there's no room, kept inside the screen
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, pad = 10;
  let left = Math.min(Math.max(pad, r.left + r.width / 2 - w / 2), innerWidth - w - pad);
  let top = r.top - h - 10; if (top < pad) top = r.bottom + 10;
  tip.style.left = left + 'px'; tip.style.top = Math.min(top, innerHeight - h - pad) + 'px';
}
function hideBadgeTip(){ $('#bdgTip').hidden = true; tipFor = null; }
document.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const b = e.target.closest && e.target.closest('.bdg[data-ach]'); if (b) showBadgeTip(b); });
document.addEventListener('pointerout', e => { if (e.pointerType === 'touch') return; const b = e.target.closest && e.target.closest('.bdg[data-ach]'); if (b && !b.contains(e.relatedTarget)) hideBadgeTip(); });
document.addEventListener('click', e => {
  const b = e.target.closest('.bdg[data-ach]');
  if (b){ e.stopPropagation(); tipFor === b && !$('#bdgTip').hidden && Date.now() - tipAt > 400 ? hideBadgeTip() : showBadgeTip(b); return; }
  if (!e.target.closest('#bdgTip')) hideBadgeTip();
}, true);
document.addEventListener('focusin', e => { const b = e.target.closest && e.target.closest('.bdg[data-ach]'); if (b) showBadgeTip(b); });
document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('.bdg[data-ach]')) hideBadgeTip(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideBadgeTip(); });
addEventListener('scroll', hideBadgeTip, true);
function avatar(b, cls){ return `<span class="av ${cls || ''}" style="--h:${b.hue}" aria-hidden="true">${esc(b.ini)}</span>`; }
const myName = () => ((P.myName || '').trim() || 'You');
const myIni = () => { const n = (P.myName || '').trim(); if (!n) return 'You'; const w = n.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || n).slice(0, 2)).toUpperCase(); };
const myAvatar = cls => `<span class="av me ${cls || ''}${P.myHue != null ? ' hue' : ''}${(P.myName || '').trim() ? ' named' : ''}"${P.myHue != null ? ` style="--h:${P.myHue}"` : ''} aria-hidden="true">${esc(myIni())}</span>`;

/* matchmaking */
function findOpponent(){
  const me = R.mmr, order = sortedBots(), h = new Date().getHours();
  const rivals = Object.entries(R.rec).filter(([i, r]) => r[0] + r[1] + r[2] >= 3 && Math.abs(botRating(+i) - me) <= 200).map(([i]) => +i).filter(i => i !== R.last);
  if (rivals.length && Math.random() < .15) return pick(Math.random, rivals);
  for (const w of [75, 150, 300, 2000]){
    const cand = order.filter(i => i !== R.last && Math.abs(botRating(i) - me) <= w);
    if (cand.length >= (w < 2000 ? 5 : 1)){
      const weighted = []; cand.forEach(i => { const [a, z] = PEAKS[PEAK_NAMES[T_PK[i]]], hh = h < 5 ? h + 24 : h; weighted.push(i); if (hh >= a && hh < z) weighted.push(i); });
      return pick(Math.random, weighted);
    }
  }
  return order[0];
}
function rollTarget(i){
  const b = BOTS[i], L = typical(botRating(i)) * b.sitMul, g = gaussOf(Math.random), h = new Date().getHours();
  const late = h >= 21 || h < 3, morning = h >= 5 && h < 12;
  let t;
  switch (b.style){
    case 'Sprinter': t = L * .85 * Math.exp(.12 * g); break;
    case 'Grinder': t = L * .9 * Math.exp(.45 * g); break;
    case 'Wildcard': t = Math.random() < .5 ? L * .55 * Math.exp(.3 * g) : L * 1.45 * Math.exp(.3 * g); break;
    case 'Night Owl': t = L * (late ? 1.2 : morning ? .85 : 1) * Math.exp(.25 * g); break;
    case 'Early Bird': t = L * (morning ? 1.2 : late ? .85 : 1) * Math.exp(.25 * g); break;
    default: t = L * Math.exp(.18 * g);
  }
  return Math.round(clampN(t, 12, 600) * 60000);
}
// your opponent studies on their own clock: focus blocks and breaks in real time, shaped by their style and favorite mode,
// adding up to the sitting they rolled. It runs whether you're focusing, on a break or away.
function oppPlan(b, target, t0){
  const B = BOTS[b], rnd = Math.random, blocks = []; let t = t0 + (30 + rnd() * 150) * 1000, left = target, k = 0;
  const lens = {pomodoro: [25, 5], fifty: [50, 10], flow: [75, 12], timebox: [45, 10], custom: [35, 7], stopwatch: [55, 10]}[B.fav] || [40, 8];
  while (left > 0 && k < 200){
    let f = lens[0] * (B.style === 'Grinder' ? 1.4 : B.style === 'Sprinter' ? (k === 0 ? 1.6 : .8) : 1) * (.75 + rnd() * .5) * 60000;
    if (B.fav === 'pomodoro') f = 25 * 60000;
    f = Math.min(left, Math.max(5 * 60000, f)); blocks.push([Math.round(t), Math.round(t + f)]); left -= f; t += f;
    let br = lens[1] * (.7 + rnd() * .8) * 60000; if (B.fav === 'pomodoro' && k % 4 === 3) br = 15 * 60000;
    if (B.style === 'Wildcard' && rnd() < .15) br *= 3;
    t += br; k++;
  }
  return blocks;
}
// the moment their time reached ms
function oppReach(c, ms){ let acc = 0; for (const [a, b] of c.plan){ if (acc + (b - a) >= ms) return Math.round(a + (ms - acc)); acc += b - a; } return c.plan[c.plan.length - 1][1]; }
const oppThem = (c, now) => c.plan.reduce((n, [a, b]) => n + Math.max(0, Math.min(now, b) - a), 0);
const oppState = (c, now) => now >= c.plan[c.plan.length - 1][1] ? 'stopped' : c.plan.some(([a, b]) => now >= a && now < b) ? 'studying' : now < c.plan[0][0] ? 'starting' : 'break';
const kFactor = () => R.played < 5 ? 40 : 24;
function stakes(br){ const E = 1 / (1 + Math.pow(10, (br - R.mmr) / 400)), K = kFactor(); return {E, win: Math.round(K * (1 - E)), loss: Math.round(K * E), draw: Math.round(K * (.5 - E))}; }
function startMatch(found, friendly){
  const b = found != null ? found : findOpponent(), br = botRating(b), now = Date.now();
  const lines = [...CHAT].sort(() => Math.random() - .5).slice(0, 6);
  R.cur = {pl: R.played < 5 && !friendly ? R.played + 1 : 0, friendly: !!friendly, b, br, mmr0: R.mmr, target: 0, you: 0, them: 0, t0: now, last: now, tick: now, state: 'live', tapped: false, lines, tap: pick(Math.random, TAPS), feat: botFeatured(b), mine: myFeatured()};
  R.cur.target = rollTarget(b); R.cur.plan = oppPlan(b, R.cur.target, now);
  R.last = b; saveRanked();
  const B = BOTS[b];
  if ($('#page-focus').hidden) toast(`Match started: ${B.name} (${rankOf(br).full} · ${br.toLocaleString()})`);
  renderMatch(true);
}

/* the matchmaking queue: you press Find match, the search runs a few seconds (longer late at night and at the
   top of the ladder, where fewer players are near your rating), then the match is shown and starts after a countdown */
let MQ = null, mqTimer = null;    // {t0, wait, pool, b, found}
function queueWait(){
  const h = new Date().getHours(), m = R.mmr;
  let w = 1.5 + Math.random() * 3.5;
  if (h >= 2 && h < 7) w *= 1.5; else if (h >= 23 || h < 2) w *= 1.2;
  if (m >= 3000) w *= 1.5; else if (m >= 2400) w *= 1.25;
  return Math.round(clampN(w, 1.5, 10) * 1000);
}
function queueActivity(h){ return [.35,.25,.15,.1,.08,.1,.18,.3,.45,.55,.6,.65,.7,.7,.72,.75,.8,.85,.95,1,1,.9,.75,.5][h]; }
function startSearch(){
  if (!R.on || !RK_READY || MQ || (R.cur && R.cur.state === 'live')) return;
  if (R.cur) R.cur = null;
  const near = sortedBots().filter(i => Math.abs(botRating(i) - R.mmr) <= 250).length;
  MQ = {t0: Date.now(), wait: queueWait(), pool: Math.max(4, Math.round(near * .012 * queueActivity(new Date().getHours()))), b: null, found: 0};
  clearInterval(mqTimer); mqTimer = setInterval(queueTick, 250);
  saveRanked(); renderMatch(true);
}
function cancelSearch(){ MQ = null; clearInterval(mqTimer); renderMatch(); }
function queueTick(){
  if (!MQ){ clearInterval(mqTimer); return; }
  if (!R.on){ cancelSearch(); return; }
  const now = Date.now();
  if (!MQ.found && now - MQ.t0 >= MQ.wait){ MQ.b = findOpponent(); MQ.found = now; try { chime(P.chime); } catch(e){} renderMatch(true); return; }
  if (MQ.found && now - MQ.found >= 2500){ const b = MQ.b, fr = MQ.friendly; MQ = null; clearInterval(mqTimer); startMatch(b, fr); return; }
  renderQueue();
}
const clock = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function queueRange(ms){ return ms < 4000 ? 50 : ms < 9000 ? 100 : ms < 16000 ? 200 : 400; }
// while searching only the numbers change, so the pulsing rings keep their rhythm
function renderQueue(){
  const slot = $('#matchSlot'); if (!slot || !MQ) return;
  const el = slot.querySelector('.mq'), now = Date.now();
  if (!el || MQ.found){ renderMatch(); return; }
  const t = now - MQ.t0, q = Math.max(2, Math.round(MQ.pool * (1 + .12 * Math.sin(now / 2300) + .06 * Math.sin(now / 700))));
  slot.querySelector('.mq-time').textContent = clock(t);
  slot.querySelector('.mq-range').textContent = `±${queueRange(t)}`;
  slot.querySelector('.mq-q').textContent = `${q.toLocaleString()} player${q === 1 ? '' : 's'} in queue`;
}
function finalize(res, why){
  const c = R.cur; if (!c || c.state !== 'live') return;
  const youMin = Math.round(c.you / 60000), themMin = Math.round(c.target / 60000), B = BOTS[c.b];   // the bot always finishes its sitting
  if (res !== 'W' && c.you < 10 * 60000){
    R.cur = null; saveRanked(); renderMatch();
    if (why !== 'silent') toast('Match not rated: you studied less than 10 minutes.');
    return;
  }
  const s = stakes(c.br), delta = c.friendly ? 0 : res === 'W' ? s.win : res === 'D' ? s.draw : -s.loss;
  const before = rankOf(R.mmr);
  if (!c.friendly){ R.mmr = clampN(R.mmr + delta, 100, 5000); R.best = Math.max(R.best, R.mmr); R.played++; }
  const rec = R.rec[c.b] || (R.rec[c.b] = [0, 0, 0]);
  const nem = nemesis();
  if (c.friendly){ if (res === 'W') rec[0]++; else if (res === 'L') rec[1]++; else rec[2]++; }
  if (!c.friendly && RK_LW && c.b >= 0 && c.b < ROSTER_N){ if (res === 'W') RK_LL[c.b]++; else if (res === 'L') RK_LW[c.b]++; markBots(); }
  else if (res === 'W'){ R.w++; R.ws++; R.bestWs = Math.max(R.bestWs, R.ws); rec[0]++; R.bestUpset = Math.max(R.bestUpset, c.br - c.mmr0); if (nem === c.b) R.revenge = 1; if (c.mmr0 >= 2400) R.profWins++; }
  else if (res === 'L'){ R.l++; R.ws = 0; rec[1]++; }
  else { R.d++; rec[2]++; }
  const after = rankOf(R.mmr);
  R.hist.forEach(x => { if (x.open){ x.ys = Math.round(x.ys); delete x.open; } });      // only one open at a time
  R.hist.unshift({t: Math.min(Date.now(), c.decT || Date.now()), b: c.b, br: c.br, you: youMin, them: themMin, ys: Math.round(c.you / 1000), ts: Math.round(c.target / 1000), r: res, d: delta, m: R.mmr, tap: c.tapped ? 1 : 0, ...(c.friendly ? {f: 1} : {}), ...(why === 'open' ? {open: 1, c0: c.t0} : {})});
  if (why === 'open') openAt = Date.now();
  if (R.hist.length > 500) R.hist.length = 500;
  if (worldT(R.hist[0].t) >= WORLD_START) applyEvent(R.hist[0]);      // your opponent's rating and the sitting they studied
  botsChanged(); markBots();
  c.state = 'done'; c.res = res; c.delta = delta; c.promo = after.i > before.i || (after.i === before.i && after.d > before.d) ? after.full : (after.i < before.i || (after.i === before.i && after.d < before.d) ? -1 : 0);
  saveRanked(true);
  if (res === 'W'){ chime(P.chime); if (c.promo && c.promo !== -1){ fx.burst(); if (RANKS[after.i].elite && after.i > before.i) crownShow(after, `Promoted to ${RANKS[after.i].name}`, after.i === LAUREATE ? 'You reached the Laureate rank. Become the highest-rated player to claim Paragon.' : 'You reached an elite rank.'); } }
  updateParagon();
  renderMatch(); renderRankChip(); achQueue();
  if (!$('#page-ranked').hidden) renderRanked();
}
// a match you won is settled at once, but your time keeps counting (shown as TBD) through your focus blocks. Breaks
// don't end it (time just doesn't count on a break); it's set when you pause, log, stop or switch modes yourself,
// or after 30 minutes with no timer running at all (say, the app was closed)
let openAt = 0;
function openTick(now, running){
  const h = R.hist.find(x => x.open); if (!h){ openAt = 0; return; }
  if (S.running) h.lr = now;                                   // a break counts as the timer running
  if (running){ if (openAt) h.ys += Math.min(2000, Math.max(0, now - openAt)) / 1000; openAt = now; h.you = Math.round(h.ys / 60); return; }
  openAt = 0;
  if (now - (h.lr || h.t) > 30 * 60000) openClose();
}
function openClose(){
  const h = R.hist.find(x => x.open); if (!h) return;
  h.ys = Math.round(h.ys); h.you = Math.round(h.ys / 60); delete h.open; delete h.lr; openAt = 0; saveRanked(true);
  if (R.cur && R.cur.state === 'done' && R.cur.t0 === h.c0) renderMatch(true);
  if (!$('#page-ranked').hidden) renderRanked();
}
// you pausing, logging, stopping or switching modes is what sets the time
['pause', 'reset', 'finishStopwatch'].forEach(fn => { const orig = window[fn]; if (typeof orig !== 'function') return;
  window[fn] = function(){ try { rankedTick(); } catch(e){} const r = orig.apply(this, arguments); try { openClose(); } catch(e){}
    try { const c = R && R.cur; if (c && c.state === 'live' && c.plan && c.you > 0 && !c.youDone) endMatch('stop'); } catch(e){} return r; }; });
function nemesis(){ let best = -1, n = 4; Object.entries(R.rec).forEach(([i, r]) => { if (r[1] > n){ n = r[1]; best = +i; } }); return best; }
function endMatch(why){
  const c = R.cur; if (!c || c.state !== 'live') return;
  if (!c.plan || why === 'off'){ if (c.won || (c.tapped && c.you > c.target)) return finalize('W', why); return finalize('L', why); }
  if (!c.youDone){ c.youDone = true; c.youAt = Date.now(); saveRanked(); }
  matchResolve(Date.now(), why);
}
// settle the match once it's decided: they've stopped and you're ahead (you win now; your time keeps counting as TBD
// unless you've stopped too), or you've stopped and they pass you, or you've both stopped
function matchResolve(now, why){
  const c = R.cur; if (!c || c.state !== 'live' || !c.plan) return false;
  if (!c.youDone){ if (c.tapped && c.you > c.target){ finalize('W', 'open'); return true; } return false; }
  if (c.them > c.you){ c.decT = oppReach(c, c.you); finalize('L', why || 'passed'); return true; }
  if (c.tapped){ c.decT = Math.max(c.youAt || 0, c.plan[c.plan.length - 1][1]); finalize(c.you >= c.target ? 'W' : 'L', why || 'both'); return true; }
  return false;
}
// runs inside the timer loop
let rkLastRender = 0, rkLastSave = 0;
function rankedTick(){
  if (!R || !R.on || !RK_READY) return;
  const now = Date.now(), running = S.running && S.phase === 'focus';
  openTick(now, running);
  const c = R.cur; if (!c) return;
  if (c.state === 'live' && c.plan){
    // they might push on for another block if they'd stop behind you
    if (!c.ext && now >= c.plan[c.plan.length - 1][1] - 1000 && c.you > c.target && (BOTS[c.b].style === 'Grinder' || BOTS[c.b].style === 'Wildcard') && Math.random() < .5){
      const end = c.plan[c.plan.length - 1][1], a = Math.max(end, Math.min(now, end + 60000)) + (4 + Math.random() * 8) * 60000, len = (25 + Math.random() * 30) * 60000; c.plan.push([Math.round(a), Math.round(a + len)]); c.target += Math.round(len); c.ext = 1; }
    else if (now >= c.plan[c.plan.length - 1][1] - 1000) c.ext = c.ext || 2;
    c.them = oppThem(c, now);
    const was = c.tapped; c.tapped = now >= c.plan[c.plan.length - 1][1]; if (c.tapped && !was) renderMatch();
    if (running && !c.youDone){ const dt = Math.min(2000, Math.max(0, now - c.tick)); c.you += dt; c.last = now; }
    else if (!c.youDone && !S.running && now - c.last > 30 * 60000){ c.youDone = true; c.youAt = c.last; }
    if (matchResolve(now)) return;
    if (now - rkLastSave > 5000){ rkLastSave = now; saveRanked(); }
  } else if (c.state === 'live'){
    if (running){
      const dt = Math.min(2000, Math.max(0, now - c.tick));
      c.you += dt; if (c.them < c.target) c.them = Math.min(c.target, c.them + dt); c.last = now;
      if (!c.tapped && c.them >= c.target){ c.tapped = true; renderMatch(); }
      if (c.tapped && c.you > c.target){ finalize('W', 'open'); return; }
    } else if (now - c.last > 30 * 60000){ endMatch('idle'); return; }
    if (now - rkLastSave > 5000){ rkLastSave = now; saveRanked(); }
  }
  c.tick = now;
  if (now - rkLastRender > 900){ rkLastRender = now; renderMatch(); }
}

/* how a finished match's times read: seconds when it was close, the bot's full sitting when you lost */
const fmtSec = sec => { const m = Math.floor(sec / 60), x = sec % 60; return `${fmtMin(m)} ${String(x).padStart(2, '0')}s`; };
function matchTimes(h){
  if (h.open) return `<span class="tbd" title="Still studying: your time is set when you pause or end your session">TBD</span> <i>vs</i> ${fmtSec(h.ts)}`;
  if (h.ys == null){   // older matches saved minutes only
    return h.r === 'D' ? `${fmtMin(h.you)} <i>vs</i> ${fmtMin(h.them)}` : fmtMin(h.you);
  }
  const close = Math.abs(h.ys - h.ts) < 120, f = x => close ? fmtSec(x) : fmtMin(Math.round(x / 60));
  return `${f(h.ys)} <i>vs</i> ${f(h.ts)}`;
}
/* match card on the Focus page */
const mm = ms => fmtMin(Math.floor(ms / 60000));
function renderMatch(fresh){
  const slot = $('#matchSlot'); if (!slot || !RK_READY) return;
  if (!R.on){ slot.innerHTML = ''; return; }
  const c = R.cur, rk = myRk();
  if (MQ && !MQ.found){
    if (slot.querySelector('.mq') && !fresh) return renderQueue();
    const t = Date.now() - MQ.t0;
    slot.dataset.key = '';
    slot.innerHTML = `<div class="card match mq"><div class="m-head"><span class="h first">Finding a match</span><span class="mq-time">${clock(t)}</span></div>
      <div class="mq-radar"><span class="mq-ring"></span><span class="mq-ring r2"></span><span class="mq-ring r3"></span>${emblem(rk, 'md')}</div>
      <p class="mq-line">Searching for players near <b>${R.mmr.toLocaleString()} Elo</b> <span class="mq-range">±${queueRange(t)}</span></p>
      <p class="hint mq-q">${MQ.pool.toLocaleString()} players in queue</p>
      <div class="mq-foot"><span class="hint">${R.played < 5 ? `Placement match ${R.played + 1} of 5` : `${rk.full} · ranked`}</span><button class="small-btn" data-act="m-cancel">Cancel</button></div></div>`;
    return;
  }
  if (MQ && MQ.found){
    const B = BOTS[MQ.b], br = botRating(MQ.b), brk = rankOf(br), left = Math.max(1, Math.ceil((2500 - (Date.now() - MQ.found)) / 1000));
    const n = slot.querySelector('.mq-cd');
    if (n && !fresh){ n.textContent = left; return; }
    slot.dataset.key = '';
    slot.innerHTML = `<div class="card match mq-found"><div class="m-head"><span class="h first mq-ok">${MQ.friendly ? 'Friendly match found' : 'Match found'}</span><span class="hint">Starting in <b class="mq-cd">${left}</b></span></div>
      <div class="m-players mq-vs">
        <div class="m-p">${myAvatar()}<span class="m-n"><b>${esc(myName())}</b><small>${emblem(rk, 'xs')} ${rk.full} · ${R.mmr.toLocaleString()}</small></span></div>
        <span class="vs">VS</span>
        <div class="m-p them" data-bot="${MQ.b}">${avatar(B)}<span class="m-n"><b>${esc(B.name)}</b><small>${emblem(brk, 'xs')} ${brk.full} · ${br.toLocaleString()}</small><span class="bdgs">${botFeatured(MQ.b).map(id => badgeHtml(id)).join('')}</span></span></div>
      </div></div>`;
    return;
  }
  if (!c){
    slot.innerHTML = `<div class="card match idle"><div class="h first">Ranked</div><div class="mi-row">${emblem(rk, 'md')}<span><b>${rk.full}</b><small>${R.mmr.toLocaleString()} Elo${R.played < 5 ? ` · placement ${R.played}/5` : ''}</small></span></div><p class="hint">Get matched with a player near your rating. Whoever studies longer wins.</p><div class="mi-btns"><button class="small-btn accent" data-act="m-find">Find match</button><button class="link-btn" data-go="ranked">Ranked page →</button></div></div>`;
    return;
  }
  const B = BOTS[c.b], brk = rankOf(c.br), s = stakes(c.br), max = Math.max(c.you, c.tapped ? c.target : c.them, 60000) * 1.08;
  const live = c.state === 'live';
  const lineIdx = Math.min(c.lines.length - 1, Math.floor(c.them / (7 * 60000)));
  const tired = B.style === 'Steady' && !c.tapped && c.them > c.target * .85;
  const botLine = c.tapped ? `“${c.tap}”` : tired ? '“starting to slow down…”' : c.them > 60000 ? `“${c.lines[lineIdx]}”` : '“gl hf”';
  const waiting = live && c.you === 0 && !(S.running && S.phase === 'focus');
  const os = c.plan ? oppState(c, Date.now()) : null, gap = Math.abs(c.you - c.them), ahead = c.you >= c.them;
  const them = esc(B.name), osTxt = os === 'studying' ? `${them} is studying` : os === 'break' ? `${them} is on a break` : os === 'starting' ? `${them} is getting started` : `${them} stopped at ${mm(c.target)}`;
  const status = !live ? '' : !c.plan ? (waiting ? 'Press Start to begin.' : c.tapped ? `${them} stopped at ${mm(c.target)}. Pass them to win.` : `${them} is still going. Keep studying: if they stop first, you win.`)
    : c.youDone ? `You stopped at ${mm(c.you)}. ${osTxt}: ${c.them > c.you ? 'they passed you' : `they need ${mm(c.you - c.them + 60000)} more to pass you`}. Waiting for them to finish.`
    : waiting ? `${osTxt}. Press Start: your time counts while you focus, theirs runs on their own schedule.`
    : os === 'stopped' ? `${osTxt}. ${ahead ? 'You’re ahead: you win.' : `Pass them to win: ${mm(gap + 60000)} to go.`}`
    : `${osTxt}. ${ahead ? `You’re ahead by ${mm(gap)}.` : `You’re behind by ${mm(gap)}.`} Stopping your timer locks in your time.`;
  let result = '';
  if (!live){
    const res = {W:'Victory', L:'Defeat', D:'Draw'}[c.res], nrk = myRk(), prog = nrk.hi ? (R.mmr - nrk.lo) / (nrk.hi - nrk.lo) : 1;
    const sec = ms => fmtSec(Math.round(ms / 1000));
    const oh = R.hist.find(x => x.open && x.c0 === c.t0);
    const how = oh ? `TBD vs ${sec(c.target)} <small class="tbd-note">Your time keeps counting through your focus blocks (not breaks) until you pause or end your session. You can find your next match now.</small>` : c.res === 'W' && c.you - c.target < 120000 ? `${sec(c.you)} vs ${sec(c.target)}` : `${mm(c.you)} vs ${mm(c.target)}`;
    result = `<div class="m-result r-${c.res}"><b>${res}</b><p class="how">${how}</p><span>${c.friendly ? 'Friendly match · no Elo change' : `${(c.mmr0).toLocaleString()} → ${R.mmr.toLocaleString()} <em>(${c.delta > 0 ? '+' : ''}${c.delta})</em>`}</span>
      ${c.promo && c.promo !== -1 ? `<p class="promo">Promoted to ${esc(c.promo)}!</p>` : c.promo === -1 ? `<p class="demo">Dropped to ${esc(nrk.full)}.</p>` : ''}
      <div class="m-prog">${emblem(nrk, 'sm')}<span class="bar2"><i style="width:${prog * 100}%;background:${nrk.c}"></i></span><small>${nrk.hi ? `${R.mmr - nrk.lo}/${nrk.hi - nrk.lo} to next` : nrk.i === PARAGON_I ? 'Paragon' : 'Laureate'}</small></div>
      <div class="mi-btns"><button class="small-btn accent" data-act="m-find">Find next match</button><button class="small-btn" data-dm="${c.b}">Message ${esc(BOTS[c.b].name)}</button><button class="small-btn" data-act="m-dismiss">Close</button></div></div>`;
  }
  // while a match is live, only the moving parts change, so badges you're hovering stay put
  const key = `${c.t0}|${c.state}|${c.tapped}|${waiting}|${!!c.won}`;
  if (!fresh && live && slot.dataset.key === key && slot.querySelector('.m-bars')){
    const bars = slot.querySelectorAll('.m-bar');
    bars[0].querySelector('i').style.width = `${c.you / max * 100}%`; bars[0].querySelector('b').textContent = mm(c.you);
    bars[1].querySelector('i').style.width = `${(c.tapped ? c.target : c.them) / max * 100}%`;
    if (c.plan){ const tb = bars[1].querySelector('b'); if (tb) tb.textContent = mm(c.tapped ? c.target : c.them); const st = slot.querySelector('.m-status'); if (st && st.innerHTML !== status) st.innerHTML = status; }
    if (typeof mcRender === 'function') mcRender();
    return;
  }
  const doneKey = !live ? `done|${c.t0}|${c.res}|${c.promo}|${R.mmr}|${R.hist.some(x => x.open && x.c0 === c.t0)}` : '';
  if (!fresh && !live && slot.dataset.key === doneKey && slot.querySelector('.m-result')){ if (typeof mcRender === 'function') mcRender(); return; }
  slot.dataset.key = live ? key : doneKey;
  const mcVal = $('#mcIn') ? $('#mcIn').value : '', mcFoc = !!(document.activeElement && document.activeElement.id === 'mcIn');
  slot.innerHTML = `<div class="card match${fresh ? ' found' : ''}${live ? '' : ' over'}">
    <div class="m-head"><span class="h first">${c.friendly ? 'Friendly match' : c.pl ? `Placement match ${c.pl} of 5` : 'Ranked match'}</span>${live ? '<span class="live-dot">Live</span>' : ''}</div>
    <div class="m-players">
      <div class="m-p" data-me>${myAvatar()}<span class="m-n"><b>${esc(myName())}</b><small>${emblem(rankOf(c.mmr0), 'xs')} ${rankOf(c.mmr0).full} · ${c.mmr0.toLocaleString()}</small><span class="bdgs">${c.mine.map(id => badgeHtml(id)).join('')}</span></span></div>
      <span class="vs">VS</span>
      <div class="m-p them" data-bot="${c.b}">${avatar(B)}<span class="m-n"><b>${esc(B.name)}</b><small>${emblem(brk, 'xs')} ${brk.full} · ${c.br.toLocaleString()}</small><span class="bdgs">${c.feat.map(id => badgeHtml(id)).join('')}</span></span></div>
    </div>
    <div class="m-bars">
      <div class="m-bar"><span>You</span><span class="trk"><i style="width:${c.you / max * 100}%"></i></span><b>${mm(c.you)}</b></div>
      <div class="m-bar bot"><span>${esc(B.name)}</span><span class="trk"><i style="width:${(c.tapped ? c.target : c.them) / max * 100}%"></i>${c.tapped ? `<em style="left:${c.target / max * 100}%"></em>` : ''}</span><b>${c.plan && live ? mm(c.tapped ? c.target : c.them) : c.tapped ? mm(c.target) : waiting ? 'ready' : live ? 'going…' : '?'}</b></div>
    </div>
    ${live ? `${typeof mcBox === 'function' ? mcBox(c) : `<p class="m-chat">${esc(B.name)}: ${esc(botLine)}</p>`}<p class="m-status">${status}</p>
    <div class="m-foot"><span class="stakes">${c.friendly ? 'Friendly · no Elo change' : `Win <b class="pos">+${s.win}</b> · Loss <b class="neg">−${s.loss}</b>`}</span><span class="m-foot-btns"><button class="small-btn" data-dm="${c.b}">Message</button><button class="small-btn" data-act="m-end">End match</button></span></div>` : result + (typeof mcBox === 'function' ? mcBox(c) : '')}
  </div>`;
  if (typeof mcRender === 'function'){ const inp = $('#mcIn'); if (inp){ inp.value = mcVal; if (mcFoc) inp.focus(); } mcRender(); }
}
$('#page-ranked').addEventListener('click', e => {
  if (!e.target.closest('[data-rkfind]')) return;
  showPage('focus'); startSearch(); window.scrollTo(0, 0);
});
$('#matchSlot').addEventListener('click', e => {
  const a = e.target.closest('[data-act]'), them = e.target.closest('[data-bot]');
  if (a && a.dataset.act === 'm-end'){ if (a.dataset.sure){ endMatch('button'); } else { a.dataset.sure = 1; a.textContent = 'Tap again to end'; a.classList.add('danger'); setTimeout(() => { $('#matchSlot').dataset.key = ''; renderMatch(); }, 3500); } return; }
  if (a && a.dataset.act === 'm-dismiss'){ R.cur = null; saveRanked(); renderMatch(); return; }
  if (a && a.dataset.act === 'm-find'){ startSearch(); return; }
  if (a && a.dataset.act === 'm-cancel'){ cancelSearch(); return; }
  if (them && !e.target.closest('.bdg')) openBot(+them.dataset.bot);
});

/* header chip */
function renderRankChip(){
  const el = $('#rankChip'); if (!el) return;
  el.hidden = !R.on;
  const rk = myRk();
  el.innerHTML = `${emblem(rk, 'xs')}<b>${rk.sh}</b><span>${R.mmr.toLocaleString()}</span>`;
  el.title = `${rk.full} · ${R.mmr.toLocaleString()} Elo`;
}

/* Ranked page */
let rkHistShown = 30;
function renderRanked(){
  if (!RK_READY){ $('#rkHero').innerHTML = `<p class="hint">Loading ${(ROSTER_N + 1).toLocaleString()} players…</p>`; return; }
  const rk = myRk(), next = rk.hi ? rankOf(rk.hi) : null, prog = rk.hi ? (R.mmr - rk.lo) / (rk.hi - rk.lo) : 1;
  const games = R.w + R.l + R.d, wr = games ? (Math.round(R.w / games * 1000) / 10).toFixed(1) : '0.0';
  $('#rkHero').innerHTML = `${emblem(rk, 'xl')}<div class="rk-hero-tx"><small>${R.played < 5 ? `Placement ${R.played}/5 · your rank firms up after 5 matches` : 'Your rank'}</small><b style="color:${rk.c}">${rk.full}</b>
    <span>${R.mmr.toLocaleString()} Elo · best ${R.best.toLocaleString()}</span>
    <span class="bar2 big"><i style="width:${prog * 100}%;background:${rk.c}"></i></span>
    <small>${next ? `${(rk.hi - R.mmr).toLocaleString()} Elo to ${next.full}` : rk.i === PARAGON_I ? 'You hold the Paragon title: no one is rated higher. Keep it.' : 'Be the highest-rated player of all to claim Paragon.'}</small>
    <span class="bdgs lg">${myFeatured().map(id => badgeHtml(id, 'lg')).join('')}<button class="link-btn" data-go="awards">Change showcase →</button></span></div>
    <div class="rk-find">${R.cur && R.cur.state === 'live' ? '<button class="small-btn" data-rkfind="1">Match in progress →</button>' : MQ ? '<button class="small-btn" data-rkfind="1">Searching… →</button>' : '<button class="small-btn accent" data-rkfind="1">Find match</button>'}</div>`;
  $('#rkKpis').innerHTML = `<div class="stat"><b>${R.w}–${R.l}${R.d ? '–' + R.d : ''}</b><span>wins–losses${R.d ? '–draws' : ''}</span></div><div class="stat"><b>${wr}%</b><span>win rate</span></div><div class="stat"><b>${R.ws}</b><span>win streak · best ${R.bestWs}</span></div><div class="stat"><b>${R.played}</b><span>matches played</span></div>`;
  renderEloChart();
  const hist = R.hist.slice(0, rkHistShown);
  $('#rkHist').innerHTML = hist.map(h => { const B = BOTS[h.b], rkb = rankOf(h.br); return `<li class="hr-${h.r}"><span class="res">${h.r}</span>${avatar(B, 'sm')}<span class="who"><button class="lnk" data-bot="${h.b}">${esc(B.name)}</button><small>${rkb.full} · ${h.br.toLocaleString()} · ${B.style}</small></span><span class="tm">${matchTimes(h)}</span>${dlCell(h)}<span class="when">${new Date(h.t).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span></li>`; }).join('')
    || '<li class="empty-li">No matches yet. Start a focus block on the Focus page and you\'ll be matched automatically.</li>';
  $('#rkMore').hidden = R.hist.length <= rkHistShown;
  // ladder: 10 above and 10 below you
  const order = sortedBots(); let pos = order.findIndex(i => botRating(i) < R.mmr); if (pos < 0) pos = order.length;
  const from = Math.max(0, pos - 10), to = Math.min(order.length, pos + 10), nem = nemesis();
  const row = (i, place) => { const B = BOTS[i], r = botRating(i), para = R.para.h === i, mv = r - OV_R[i] - PREV[i], rec = R.rec[i], feat = botFeatured(i)[0];
    return `<li data-bot="${i}"${para ? ' class="para-row"' : ''}><span class="pl">#${place.toLocaleString()}</span><span class="mv ${mv > 0 ? 'up' : mv < 0 ? 'dn' : ''}">${mv > 0 ? '▲' : mv < 0 ? '▼' : ''}</span>${avatar(B, 'sm')}<span class="who"><b>${esc(B.name)}</b><small>${B.style}${rec ? ` · ${i === nem ? 'nemesis' : rec[0] + rec[1] + rec[2] >= 3 ? 'rival' : 'played'} ${rec[0]}–${rec[1]}` : ''}</small></span>${feat ? badgeHtml(feat) : '<span></span>'}${emblem(rkOf(i), 'xs')}<span class="rt">${r.toLocaleString()}</span></li>`; };
  let lad = '';
  for (let k = from; k < pos; k++) lad += row(order[k], k + 1);
  lad += `<li class="me" data-me><span class="pl">#${(pos + 1).toLocaleString()}</span><span class="mv"></span>${myAvatar('sm')}<span class="who"><b>${esc(myName())}</b><small>${rk.sh}</small></span>${myFeatured()[0] ? badgeHtml(myFeatured()[0]) : '<span></span>'}${emblem(rk, 'xs')}<span class="rt">${R.mmr.toLocaleString()}</span></li>`;
  for (let k = pos; k < to; k++) lad += row(order[k], k + 2);
  $('#rkLadder').innerHTML = lad;
  $('#rkLadderPos').textContent = `#${(pos + 1).toLocaleString()} of ${(ROSTER_N + 1).toLocaleString()}`;
  // rank list with how many players hold each
  const N1 = ROSTER_N + 1;
  if (!rankCountCache){ rankCountCache = RANKS.map(() => 0); for (let i = 0; i < ROSTER_N; i++){ const r = BS[i * BF]; let k = RANKS.length - 2; while (k > 0 && r < RANKS[k].lo) k--; rankCountCache[k]++; } }
  const counts = rankCountCache.slice(); counts[rankOf(R.mmr).i]++;
  if (R.para.h != null){ counts[LAUREATE]--; counts[PARAGON_I] = 1; }
  const range = k => k === 0 ? 'under 900 Elo' : k === LAUREATE ? '3,600+ Elo' : k === PARAGON_I ? 'The highest-rated Laureate' : `${RANKS[k].lo.toLocaleString()}–${(RANKS[k + 1].lo - 1).toLocaleString()} Elo`;
  const share = n => n === 0 ? 'none' : n / N1 < .001 ? `${n.toLocaleString()} player${n === 1 ? '' : 's'}` : `${(n / N1 * 100).toFixed(n / N1 < .01 ? 1 : 0)}%`;
  $('#rkRanks').innerHTML = RANKS.map((x, k) => {
    const here = k === rk.i, shown = k === PARAGON_I ? PARAGON : {...rankOf(k === 0 ? 850 : x.lo + 250), d: 2, div: x.cuts.length ? 'III' : ''};
    return `<li class="${here ? 'here' : ''}${x.elite ? ' elite' : ''}">${emblem(shown, 'sm')}<span><b>${x.name}</b><small>${range(k)}${x.cuts.length ? ' · I, II, III' : ''}</small></span><span class="cnt">${k === PARAGON_I ? (R.para.h != null ? 'only 1' : 'vacant') : share(counts[k])}</span>${here ? '<em>You</em>' : ''}</li>`; }).reverse().join('');
  renderParaCard();
  $('#rkOn').checked = R.on;
}
function renderParaCard(){
  const el = $('#rkPara'); if (!el) return;
  const p = R.para, h = p.h, since = h != null ? Date.now() - p.since : 0;
  const dur = ms => ms >= 864e5 ? `${Math.floor(ms / 864e5)} day${ms >= 1728e5 ? 's' : ''}` : ms >= 36e5 ? `${Math.floor(ms / 36e5)}h` : `${Math.max(1, Math.floor(ms / 6e4))}m`;
  if (h == null){ el.innerHTML = `<div class="h first">Paragon</div><div class="para-in">${emblem(PARAGON, 'md')}<span><b>Vacant</b><small>No one has reached ${LAUREATE_MIN.toLocaleString()} Elo. The first Laureate to lead the ladder claims it.</small></span></div>`; return; }
  const me = h === ME, B = me ? null : BOTS[h], r = me ? R.mmr : botRating(h);
  el.innerHTML = `<div class="h first">Current Paragon</div><div class="para-in click"${me ? ' data-me' : ` data-bot="${h}"`}>${emblem(PARAGON, 'md')}${me ? myAvatar() : avatar(B)}<span><b>${me ? esc(myName()) : esc(B.name)}</b><small>${r.toLocaleString()} Elo · reigning ${dur(since)}</small></span></div><p class="hint">The single highest-rated player of all. Only one player holds it at a time.</p>`;
}
function renderEloChart(){
  const el = $('#rkChart'), RH = R.hist.filter(h => !h.f), pts = RH.slice(0, 100).reverse().map(h => h.m);
  if (!RH.length){ el.innerHTML = '<p class="hint">Your Elo line shows up after your first rated match.</p>'; return; }
  pts.unshift(RH.length >= 100 ? RH[99].m - RH[99].d : 1000);
  const W = 640, H = 200, pl = 8, pr = 74, pt = 14, pb = 14, lo = Math.floor((Math.min(...pts) - 40) / 50) * 50, hi = Math.ceil((Math.max(...pts) + 40) / 50) * 50;
  const X = k => pl + (W - pl - pr) * (pts.length === 1 ? 1 : k / (pts.length - 1)), Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
  let grid = '';
  RANKS.forEach((x, ri) => [ri === 0 ? 600 : x.lo, ...x.cuts.slice(0, 2)].forEach((v, j) => {
    if (v <= lo || v >= hi || (j > 0 && hi - lo >= 500)) return;
    const lab = x.cuts.length ? `${x.name} ${['I','II','III'][j]}` : x.name;
    grid += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" class="${j === 0 ? 'g-major' : 'g-minor'}"/><text x="${W - pr + 6}" y="${Y(v) + 4}" class="g-lab">${esc(lab)}</text>`;
  }));
  const d = pts.map((v, k) => `${k ? 'L' : 'M'}${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Elo over your last ${pts.length - 1} matches">${grid}<path d="${d} L${X(pts.length - 1)},${H - pb} L${X(0)},${H - pb}Z" class="g-area"/><path d="${d}" class="g-line"/><circle cx="${X(pts.length - 1)}" cy="${Y(pts[pts.length - 1])}" r="4.5" class="g-end"/><line class="g-guide" y1="${pt}" y2="${H - pb}" x1="-10" x2="-10"/></svg><div class="g-tip" hidden></div><small class="g-cap">Last ${pts.length - 1} match${pts.length === 2 ? '' : 'es'}</small>`;
  const svg = el.querySelector('svg'), tip = el.querySelector('.g-tip'), guide = el.querySelector('.g-guide'), hs = RH.slice(0, 100).reverse();
  svg.onpointermove = e => {
    const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, k = clampN(Math.round((x - pl) / (W - pl - pr) * (pts.length - 1)), 1, pts.length - 1), h = hs[k - 1];
    guide.setAttribute('x1', X(k)); guide.setAttribute('x2', X(k));
    tip.hidden = false; tip.style.left = `${X(k) / W * 100}%`; tip.style.top = `${Y(pts[k]) / H * 100}%`;
    tip.innerHTML = `<b>${h.m.toLocaleString()}</b> <span class="${h.d >= 0 ? 'pos' : 'neg'}">${h.d > 0 ? '+' : ''}${h.d}</span><small>${{W:'Win',L:'Loss',D:'Draw'}[h.r]} vs ${esc(BOTS[h.b].name)}</small>`;
  };
  svg.onpointerleave = () => { tip.hidden = true; guide.setAttribute('x1', -10); guide.setAttribute('x2', -10); };
}
$('#rkMore').onclick = () => { rkHistShown += 30; renderRanked(); };
$('#rkOn').onchange = e => {
  R.on = e.target.checked;
  if (!R.on && R.cur && R.cur.state === 'live') endMatch('off');
  if (!R.on) R.cur = null;
  saveRanked(); renderMatch(); renderRankChip();
  toast(R.on ? 'Ranked is on. You\'ll be matched when you press Start.' : 'Ranked is off. Your rating is saved.');
};
document.addEventListener('click', e => { const b = e.target.closest('#page-ranked [data-bot], .lnk[data-bot]'); if (b && !e.target.closest('.bdg')) openBot(+b.dataset.bot); });


/* ---------- bot calendars: every session a bot studied, rebuilt from its seed (nothing stored) ---------- */
const ROSTER_EPOCH = new Date(2026, 10, 13).getTime();       // bots' join dates count back from here
const botJoinKey = i => dayKey(ROSTER_EPOCH - bot(i).age * 864e5);
const BOT_TAGS = ['Homework', 'Exam prep', 'Reading', 'Project', 'Review'];
const botTagColor = t => { const k = BOT_TAGS.indexOf(t), pal = SERIES[isDark() ? 'dark' : 'light']; return k >= 0 ? pal[k] : actColor(t); };
function botClasses(i, d){ return scheduleFor(i, MAJOR_BY[bot(i).major] || MAJORS[0], d || new Date()); }
function semesterOf(d){
  const y = d.getFullYear(), m = d.getMonth();
  const start = m >= 7 ? new Date(y, 7, 20) : m <= 4 ? new Date(y, 0, 10) : new Date(y, 4, 20);
  const wk = Math.max(0, Math.floor((d - start) / (7 * 864e5)));
  return {wk, summer: m === 5 || m === 6 || (m === 4 && d.getDate() > 15), exam: wk === 6 || wk === 7 ? 'Midterm' : wk >= 14 ? 'Final' : null};
}
function botTask(rnd, subj, kind, sem, d, k){
  const ps = sem.wk + 1 + k % 2, ch = 1 + Math.floor(sem.wk * 1.15), lec = 1 + Math.floor(sem.wk * 2.6) + (d.getDay() >= 3 ? 1 : 0), lab = 1 + Math.floor(sem.wk / 2);
  const kd = CLASS_KIND.get(subj) || '', lang = kd === 'L', writ = kd === 'W', code = kd === 'C', des = kd === 'D', isLab = kd === 'B';
  const T = {
    'Homework': lang ? [`Workbook unit ${ch}`, `Vocab set ${ps}`, 'Translation practice', 'Conjugation drills', `Vocab quiz ${ps} prep`] : writ ? [`Response paper ${lab}`, `Discussion post ${ps}`, `Reading questions ${ch}`] : code ? [`Programming assignment ${ps}`, `Lab ${lab} code`, 'Debugging', `Project ${1 + Math.floor(sem.wk / 4)} milestone`] : des ? [`Studio project ${lab}`, 'Sketching concepts', 'Critique prep', `Design brief ${ps}`] : [`Problem set ${ps}`, `Homework ${ps}`, `Worksheet ${ps}`],
    'Reading': [`Chapter ${ch} reading`, `Reading: chapter ${ch}`, `Chapter ${ch} notes`],
    'Exam prep': sem.exam ? [`${sem.exam} prep`, `${sem.exam} practice exam`, `${sem.exam} flashcards`, `${sem.exam} review sheet`] : ['Quiz prep', 'Practice problems', 'Flashcards', `Exam ${1 + Math.floor(sem.wk / 5)} review`],
    'Project': lang ? ['Oral presentation', 'Conversation prep'] : writ ? ['Essay draft', 'Term paper', 'Essay outline', 'Editing essay'] : code ? ['Group project', 'Final project', 'Code review', 'Writing tests'] : des ? ['Portfolio piece', 'Studio project', 'Prototype', 'Final critique prep'] : isLab ? [`Lab report ${lab}`, `Lab ${lab} prep`, 'Lab write-up', 'Pre-lab questions'] : ['Group project', 'Project write-up', 'Case study', 'Presentation slides'],
    'Review': [`Lecture ${lec} notes`, 'Rewriting notes', 'Review session', `Lecture ${lec} review`]
  };
  return sem.summer ? pick(rnd, ['Summer review', 'Getting ahead', `Chapter ${1 + Math.floor(sem.wk / 2)} reading`, 'Practice problems']) : pick(rnd, T[kind]);
}
// one bot day in full: its sessions with times, class, task, activity and timer style
const botDayCache = new Map();
function botDay(i, dk){
  const key = i + '|' + dk, todayK = dayKey(Date.now());
  if (dk !== todayK && botDayCache.has(key)) return botDayCache.get(key);
  let out = null;
  if (dk >= botJoinKey(i) && dk <= todayK){
    const xs = daySits(i, dk, []);
    if (xs.length){
      const B = bot(i), d = new Date(dk + 'T12:00'), sem = semesterOf(d), cls = botClasses(i, d);
      const {n, rnd} = sitTimes(i, dk, xs), starts = Array.from(ST_A.subarray(0, n)), lens = Array.from(ST_LEN.subarray(0, n));
      const sessions = [];
      lens.forEach((len, k) => { const at = starts[k];
        const subj = k === 0 ? (rnd() < .6 ? cls[0] : pick(rnd, cls)) : pick(rnd, cls);
        const w = rnd(), kind = sem.exam ? (w < .5 ? 'Exam prep' : w < .7 ? 'Review' : w < .85 ? 'Homework' : 'Reading')
          : (w < .35 ? 'Homework' : w < .55 ? 'Reading' : w < .7 ? 'Review' : w < .85 ? 'Project' : 'Exam prep');
        const mode = rnd() < .8 ? B.fav : pick(rnd, FAV_NAMES);
        sessions.push({a: at, b: at + len, min: len, subj, task: botTask(rnd, subj, kind, sem, d, k), tag: kind, mode});
      });
      out = {sessions};
    }
  }
  out = withMatches(i, dk, out);
  if (out && dk === todayK){
    // today: only what's happened so far; a session going on right now is cut at the current minute
    const nowM = new Date().getHours() * 60 + new Date().getMinutes();
    const ss = out.sessions.filter(x => x.a <= nowM || x.match).map(x => x.match ? {...x, b: Math.max(x.a + 1, nowM), min: Math.max(1, nowM - x.a), live: true} : x.b > nowM ? {...x, b: Math.max(x.a + 1, nowM), min: Math.max(1, nowM - x.a), live: true} : x).filter(x => x.min > 0);
    out = ss.length ? {sessions: ss} : null;
  }
  if (out){ out.min = out.sessions.reduce((n, x) => n + x.min, 0); out.n = out.sessions.length; out.by = {}; out.sessions.forEach(x => out.by[x.tag] = (out.by[x.tag] || 0) + x.min); }
  if (dk !== todayK){ if (botDayCache.size > 3000) botDayCache.clear(); botDayCache.set(key, out); }
  return out;
}
// your ranked matches against this player count as their study time too: the match replaces whatever their
// schedule had at that hour, and a live match shows them as studying from the moment it started
function withMatches(i, dk, out){
  const mins = t => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); }, add = [];
  const c = R.cur;
  if (c && c.b === i && c.state === 'live' && c.you > 0 && dayKey(c.t0) === dk){
    const a = mins(c.t0), live = !c.tapped, b = live ? Math.max(a + 1, mins(Date.now()) + 1) : a + Math.max(1, Math.round(c.target / 60000));
    add.push({a, b, live});
  }
  R.hist.forEach(h => {
    if (h.b !== i || dayKey(h.t) !== dk) return;
    const len = Math.max(1, h.ts ? Math.round(h.ts / 60) : h.them || 0), a = Math.max(0, mins(h.t - Math.max(h.ys || 0, h.ts || 0) * 1000));
    add.push({a, b: Math.min(1440, a + len)});
  });
  if (!add.length) return out;
  const B = bot(i), cls = botClasses(i, new Date(dk + 'T12:00')), base = out ? out.sessions : [];
  const keep = base.filter(x => !add.some(m => x.a < m.b && x.b > m.a));
  const ms = add.map(m => { const o = base.find(x => x.a < m.b && x.b > m.a);
    return {a: m.a, b: m.b, min: m.b - m.a, subj: o ? o.subj : cls[0], task: `Ranked match vs ${myName()}`, tag: o ? o.tag : 'Review', mode: B.fav, ...(m.live ? {match: true} : {})}; });
  return {sessions: [...keep, ...ms].sort((x, y) => x.a - y.a)};
}
// is this player studying right now (their schedule, or a live match with you)?
function botLiveNow(i){
  const c = R.cur;
  if (c && c.b === i && c.state === 'live' && c.you > 0 && !c.tapped) return true;
  const d = botDay(i, dayKey(Date.now()));
  return !!(d && d.sessions.some(x => x.live));
}
const MODE_NAMES = {pomodoro:'Pomodoro', fifty:'52/17', custom:'Custom', timebox:'Timebox', stopwatch:'Stopwatch', flow:'Flow'};

/* ---------- profiles: a popup for anyone, which opens into a full page ---------- */
let profTab = 'posts', profTabWho = null;
const fmtCount = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K' : n.toLocaleString();
let profPrev = 'ranked', profWho = null, profFilter = 'all', profEditing = false, profMatchN = 15;
const PROFILE_HUES = [null, 0, 22, 42, 95, 150, 180, 205, 228, 262, 292, 330];
const isBotW = w => w !== ME;
function pName(w){ return w === ME ? myName() : BOTS[w].name; }
function pAvatar(w, cls){ return w === ME ? myAvatar(cls) : avatar(BOTS[w], cls); }
// study numbers for anyone, in one shape
function pStats(w){
  if (w === ME){
    const t = myTotals(), wk = {}, mo = {};
    LOG.forEach(x => { const d = new Date(x.t), w0 = dayKey(startOfWeek(d)), m0 = dayKey(d).slice(0, 7); wk[w0] = (wk[w0] || 0) + x.min; mo[m0] = (mo[m0] || 0) + x.min; });
    return {total: t.total, sessions: t.sessions, days: t.days, cur: t.cur, best: t.best, maxSess: t.maxSess, maxDay: t.maxDay, week: t.week, month: t.month,
      maxWeek: Math.max(0, ...Object.values(wk)), maxMonth: Math.max(0, ...Object.values(mo)), pts: t.pts, ach: ACHS.filter(a => ACH.u[a.id]).length};
  }
  const o = w * BF, got = botBadges(w);
  return {total: BS[o+F.total], sessions: BS[o+F.sessions], days: BS[o+F.days], cur: BS[o+F.cur], best: BS[o+F.best], maxSess: BS[o+F.maxSess], maxDay: BS[o+F.maxDay],
    week: BS[o+F.week], month: BS[o+F.month], maxWeek: BS[o+F.maxWeek], maxMonth: BS[o+F.maxMonth], pts: got.reduce((n, id) => n + TIERS[achById(id).tier].pts, 0), ach: got.length,
    sit: Math.round(typical(botRating(w)) * BOTS[w].sitMul)};
}
// minutes on a given day: yours from the log; a bot's from its daily plan (only shown as a level)
function pDayFn(w){
  if (w === ME){ const by = {}; LOG.forEach(x => { const k = dayKey(x.t); by[k] = (by[k] || 0) + x.min; }); return dk => by[dk] || 0; }
  return dk => { const r = botDay(w, dk); return r ? r.min : 0; };
}
const LEVELS = ['No study', 'Light', 'Medium', 'Heavy'];
const levelOf = m => m <= 0 ? 0 : m < 60 ? 1 : m < 180 ? 2 : 3;
function pPlace(c, w, t){
  if (w === ME) return myPlace(c, t);
  const vi = botVal(c, w), ei = BS[w * BF]; let n = 0;
  for (let j = 0; j < ROSTER_N; j++){ const v = botVal(c, j); if (v > vi || (v === vi && (BS[j * BF] > ei || (BS[j * BF] === ei && j < w)))) n++; }
  const me = c.me(t); if (me > vi || (me === vi && R.mmr >= ei)) n++;
  return n + 1;
}
const durTxt = ms => ms >= 864e5 ? `${Math.floor(ms / 864e5)} day${ms >= 1728e5 ? 's' : ''}` : ms >= 36e5 ? `${Math.floor(ms / 36e5)} hour${ms >= 72e5 ? 's' : ''}` : `${Math.max(1, Math.floor(ms / 6e4))} min`;
function paraLine(w){ const tot = R.para ? reignTotal(w) : 0; if (!tot) return ''; return `<p class="pf-para">${emblem(PARAGON, 'xs')} ${R.para.h === w ? `Paragon now · reigning ${durTxt(Date.now() - R.para.since)}` : 'Former Paragon'} · ${durTxt(tot)} as Paragon in total</p>`; }
function weekStrip(w, weeks){
  const f = pDayFn(w), d = startOfWeek(new Date()); d.setDate(d.getDate() - 7 * (weeks - 1));
  const today = dayKey(Date.now()); let h = '', active = 0;
  for (let k = 0; k < weeks * 7; k++){
    const dk = dayKey(d), future = dk > today, lv = future ? -1 : levelOf(f(dk)); if (lv > 0) active++;
    h += `<i class="hm l${lv}"${future ? '' : ` data-pk="${dk}"`} title="${future ? '' : `${d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})} · ${lv > 0 ? fmtMin(f(dk)) : 'no study'}`}"></i>`;
    d.setDate(d.getDate() + 1);
  }
  return {h, active};
}
function editForm(){
  return `<div class="pf-edit"><label>Display name<input id="pfName" maxlength="20" placeholder="You" value="${esc(P.myName || '')}"></label>
    <div class="pf-hues" role="radiogroup" aria-label="Avatar color">${PROFILE_HUES.map(hh => `<button data-hue="${hh == null ? '' : hh}" role="radio" aria-checked="${(P.myHue ?? null) === hh}" title="${hh == null ? 'Accent color' : ''}" style="${hh == null ? 'background:var(--accent)' : `background:hsl(${hh} 52% 44%)`}"></button>`).join('')}</div>
    <label>Bio<textarea id="pfBio" maxlength="150" rows="2" placeholder="what you're studying, your goals, anything">${esc(P.myBio || '')}</textarea></label>
    <div class="pf-edit-btns"><button class="small-btn accent" data-pf="save">Save</button><button class="small-btn" data-pf="cancel">Cancel</button></div></div>`;
}
function profileHead(w, big){
  const rk = rkOf(w), r = w === ME ? R.mmr : botRating(w), B = w === ME ? null : BOTS[w];
  return `<div class="pf-top">${pAvatar(w, big ? 'xl' : 'lg')}<div><b id="bmName">${esc(pName(w))}</b>${B ? pfPresence(w) : ''}
    <span>${emblem(rk, 'xs')} ${esc(rk.full)} · ${r.toLocaleString()} Elo</span>
    <small>${B ? `${B.style} · studies in the ${B.peak.toLowerCase()} · ${esc(B.subject)}` : 'Your profile'}</small>
    ${B ? `<small class="pf-cls">This semester: ${botClasses(w).map(esc).join(', ')}</small>` : ''}
    ${B && botLiveNow(w) ? `<span class="pf-live">● ${R.cur && R.cur.b === w && R.cur.state === 'live' && !R.cur.tapped ? 'Studying now · in a ranked match with you' : 'Studying now'}</span>` : ''}</div>
    ${w === ME && !profEditing ? '<button class="small-btn pf-editbtn" data-pf="edit">Edit</button>' : ''}</div>
    ${w === ME && profEditing ? editForm() : ''}
    ${B ? `<p class="bm-bio">“${esc(B.bio)}”</p>` : ''}${paraLine(w)}`;
}
// online / studying / offline, next to their name
function pfPresence(w){
  let st = 'off'; try { st = botLiveNow(w) || (typeof dmStudying === 'function' && dmStudying(w)) ? 'busy' : typeof dmOnline === 'function' && dmOnline(w) ? 'on' : 'off'; } catch(e){}
  return ` <span class="pf-pres ${st}"><i></i>${st === 'busy' ? 'Studying' : st === 'on' ? 'Online' : 'Offline'}</span>`;
}
// the popup
function openProfile(w){
  if (!RK_READY) return;
  profWho = w; hideBadgeTip();
  const st = pStats(w), feat = w === ME ? myFeatured() : botFeatured(w), rec = w === ME ? null : R.rec[w], nem = nemesis(), strip = weekStrip(w, 4);
  const games = R.w + R.l + R.d;
  const tiles = w === ME
    ? [[fmtMin(st.total).replace(/ \d+m$/, ''), 'studied in total'], [st.cur, 'day streak'], [st.best, 'best streak (days)'], [`${R.w}–${R.l}${R.d ? '–' + R.d : ''}`, games ? `ranked · ${Math.round(R.w / games * 100)}% wins` : 'ranked record']]
    : [[`~${fmtMin(st.sit)}`, 'typical sitting'], [fmtMin(st.total).replace(/ \d+m$/, ''), 'studied in total'], [st.best, 'best streak (days)'],
       [rec ? `${rec[0]}–${rec[1]}${rec[2] ? '–' + rec[2] : ''}` : '–', rec ? (w === nem ? 'your record · nemesis' : rec[0] + rec[1] + rec[2] >= 3 ? 'your record · rival' : 'your record') : 'not played yet']];
  $('#botModalBody').innerHTML = `${profileHead(w)}
    <div class="bm-grid">${tiles.map(([v, l]) => `<span><b>${v}</b><small>${l}</small></span>`).join('')}</div>
    <div class="h">Last 4 weeks <small class="pf-sub">${strip.active} active day${strip.active === 1 ? '' : 's'}</small></div><div class="hm-strip">${strip.h}</div>
    <div class="h">Featured badges</div><div class="bdgs lg">${feat.length ? feat.map(id => badgeHtml(id, 'lg') + `<span class="bdg-name">${esc(achById(id).name)}</span>`).join('') : '<span class="hint">No badges yet.</span>'}</div>
    <div class="pf-actions"><span class="hint">${st.ach} of ${ACHS.length} achievements · ${st.pts.toLocaleString()} pts</span>${w !== ME && typeof dmButtons === 'function' ? dmButtons(w) : ''}<button class="small-btn accent" data-pf="full">⤢ Open full profile</button></div>`;
  $('#botModal').hidden = false;
  const f = w === ME && profEditing ? $('#pfName') : $('#botModal .x'); f && f.focus();
}
const openBot = i => openProfile(i);
// the full page
/* ranked matches on a profile: your real history, or another player's last 5 matches plus any against you */
const dlCell = h => h.f ? '<span class="dl fr">Friendly</span>' : `<span class="dl ${h.d >= 0 ? 'pos' : 'neg'}">${h.d > 0 ? '+' : ''}${h.d}</span>`;
function winLabel(t){
  const d = new Date(t), today = dayKey(Date.now()), dk = dayKey(t), y = new Date(); y.setDate(y.getDate() - 1);
  return dk === today ? 'Today' : dk === dayKey(y.getTime()) ? 'Yesterday' : d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}
function profileMatches(w){
  const res = (r, d) => r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'Draw';
  const row = m => `<li class="hr-${m.r}"><span class="res" title="${res(m.r)}">${m.r}</span>${m.you ? myAvatar('sm') : avatar(BOTS[m.opp], 'sm')}
    <span class="who">${m.you ? `<b>You</b>` : `<button class="lnk" data-bot="${m.opp}">${esc(BOTS[m.opp].name)}</button>`}${m.vsYou ? ' <i class="pf-vs">vs you</i>' : ''}<small>${m.sub}</small></span>
    <span class="tm">${m.tm}</span><span class="dl ${m.f ? 'fr' : m.d >= 0 ? 'pos' : 'neg'}">${m.f ? 'Friendly' : `${m.d > 0 ? '+' : ''}${m.d}`}${m.after != null && !m.f ? `<small>${m.after.toLocaleString()}</small>` : ''}</span><span class="when">${m.when}</span></li>`;
  const youRow = (h, mine) => {      // one of your real matches, from your side or theirs
    const B = BOTS[h.b], r = mine ? h.r : ({W: 'L', L: 'W', D: 'D'})[h.r], swap = !mine;
    const tm = h.ys == null ? `${fmtMin(swap ? h.them : h.you)} <i>vs</i> ${fmtMin(swap ? h.you : h.them)}` : (x => swap ? x.split(' <i>vs</i> ').reverse().join(' <i>vs</i> ') : x)(matchTimes(h));
    return {t: h.t, r, f: h.f, d: mine ? h.d : -h.d, after: mine ? h.m : null, opp: h.b, you: !mine, vsYou: false,
      sub: mine ? `${rankOf(h.br).full} · ${h.br.toLocaleString()} then` : `${rankOf(R.mmr).full}`, tm, when: `${winLabel(h.t)}, ${new Date(h.t).toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'})}`};
  };
  let rows, more = false;
  if (w === ME){
    rows = R.hist.slice(0, profMatchN).map(h => youRow(h, true)); more = R.hist.length > profMatchN;
    if (!rows.length) return '<p class="hint">No matches yet. Turn on Ranked and start a focus block to get matched.</p>';
  } else {
    m5Backfill(w);
    const clock = t => new Date(t).toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'});
    const sim = m5List(w).map(m => ({t: m.t, r: m.a > m.b ? 'W' : m.a < m.b ? 'L' : 'D', d: m.d, after: m.after, opp: m.opp,
      sub: `${rankOf(m.oppR).full} · ${m.oppR.toLocaleString()} then`, tm: `${fmtMin(m.a)} <i>vs</i> ${fmtMin(m.b)}`,
      when: `${winLabel(m.t0)}, ${clock(m.t0)}–${clock(m.t)}`}));
    const oldest = sim.length ? sim[sim.length - 1].t : 0;
    const vsYou = R.hist.filter(h => h.b === w && (sim.length < 5 || h.t >= oldest)).slice(0, 5).map(h => youRow(h, false));
    rows = [...sim, ...vsYou].sort((a, b) => b.t - a.t);
    if (!rows.length) return '<p class="hint">No ranked matches yet.</p>';
  }
  return `<ul class="rk-hist pf-matches">${rows.map(row).join('')}</ul>${more ? '<button class="link-btn" data-pf="moreMatches">Show more</button>' : ''}`;
}
function renderProfilePage(){
  const w = profWho; if (w == null || !RK_READY) return;
  const st = pStats(w), t = myTotals(), B = w === ME ? null : BOTS[w];
  const stats = [[fmtMin(st.total), 'Studied in total'], [st.sessions.toLocaleString(), 'Sessions'], [st.days.toLocaleString(), 'Days studied'], [`${st.cur} day${st.cur === 1 ? '' : 's'}`, 'Current streak'],
    [`${st.best} day${st.best === 1 ? '' : 's'}`, 'Best streak'], [fmtMin(st.maxSess), 'Longest session'], [fmtMin(st.maxDay), 'Biggest day'], [fmtMin(st.week), 'This week'],
    [fmtMin(st.month), 'This month'], [fmtMin(st.maxWeek), 'Best week'], [fmtMin(st.maxMonth), 'Best month'], ...(B ? [[`~${fmtMin(st.sit)}`, 'Typical sitting']] : []), [`${st.ach}/${ACHS.length}`, `Achievements · ${st.pts.toLocaleString()} pts`]];
  // leaderboard places
  const ptsReady = !!lbPts;
  const lbs = LB.map(c => { const ready = c.f != null || ptsReady, pl = ready ? pPlace(c, w, t) : null, v = w === ME ? c.me(t) : botVal(c, w);
    return `<li><button data-lb="${c.id}"><span class="nm">${c.name}</span><span class="mv2">${ready || c.f != null ? lbFmt(c.u, v) : '…'}</span><span class="pl2">${pl ? `#${pl.toLocaleString()} · ${topPct(pl)}` : '…'}</span></button></li>`; }).join('');
  if (!ptsReady) ensureBotPoints(() => { if (!$('#page-profile').hidden && profWho === w) renderProfilePage(); });
  // 6-month activity
  const f = pDayFn(w), weeks = 26, d0 = startOfWeek(new Date()); d0.setDate(d0.getDate() - 7 * (weeks - 1));
  const today = dayKey(Date.now()), mNow = today.slice(0, 7), dow = [0, 0, 0, 0, 0, 0, 0];
  let cells = '', months = '', activeMonth = 0, daysMonth = 0, activeAll = 0, lastM = '';
  for (let k = 0, d = new Date(d0); k < weeks * 7; k++, d.setDate(d.getDate() + 1)){
    const dk = dayKey(d), future = dk > today, m = future ? 0 : f(dk), lv = future ? -1 : levelOf(m);
    if (k % 7 === 0){ const mk = dk.slice(0, 7), show = mk !== lastM && (k > 0 || d.getDate() <= 14); months += `<span>${show ? d.toLocaleDateString(undefined, {month:'short'}) : ''}</span>`; if (show || k > 0) lastM = mk; }
    if (!future){ dow[d.getDay()] += m; if (lv > 0) activeAll++; if (dk.slice(0, 7) === mNow){ daysMonth++; if (lv > 0) activeMonth++; } }
    cells += `<i class="hm l${lv}${future ? '' : ' pick'}"${future ? '' : ` data-pk="${dk}"`} title="${future ? '' : `${d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})} · ${m > 0 ? fmtMin(m) : 'no study'}`}"></i>`;
  }
  const busiest = Math.max(...dow) > 0 ? new Date(2026, 0, 4 + dow.indexOf(Math.max(...dow))).toLocaleDateString(undefined, {weekday:'long'}) + 's' : '–';
  // ranked
  let ranked;
  if (w === ME){
    const games = R.w + R.l + R.d, last = R.hist.filter(h => !h.f).slice(0, 10);
    ranked = `<div class="pf-kv"><span><b>${R.w}–${R.l}${R.d ? '–' + R.d : ''}</b><small>wins–losses${R.d ? '–draws' : ''}</small></span><span><b>${games ? Math.round(R.w / games * 100) : 0}%</b><small>win rate</small></span><span><b>${R.best.toLocaleString()}</b><small>best Elo</small></span><span><b>${R.bestWs}</b><small>best win streak</small></span></div>
      <div class="pf-dots">${last.length ? last.map(h => `<i class="d-${h.r}" title="${{W:'Win', L:'Loss', D:'Draw'}[h.r]} vs ${esc(BOTS[h.b].name)}">${h.r}</i>`).join('') : '<span class="hint">No matches yet.</span>'}</div>${last.length ? '<small class="pf-sub">Last 10 matches, newest first</small>' : ''}`;
  } else {
    const rec = R.rec[w], hs = R.hist.filter(h => h.b === w).slice(0, 5), nem = nemesis();
    ranked = rec ? `<div class="pf-kv"><span><b>${rec[0]}–${rec[1]}${rec[2] ? '–' + rec[2] : ''}</b><small>your record vs ${esc(B.name)}${w === nem ? ' · nemesis' : rec[0] + rec[1] + rec[2] >= 3 ? ' · rival' : ''}</small></span></div>
      <ul class="rk-hist pf-h2h">${hs.map(h => `<li class="hr-${h.r}"><span class="res">${h.r}</span><span class="who">${new Date(h.t).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span><span class="tm">${matchTimes(h)}</span>${dlCell(h)}</li>`).join('')}</ul>`
      : `<p class="hint">You haven't played ${esc(B.name)} yet. Matches pair you with players near your rating.</p>`;
  }
  // achievements by tier
  const mine = new Set(ACHS.filter(a => ACH.u[a.id]).map(a => a.id));
  let got = w === ME ? [...mine] : botBadges(w);
  if (w !== ME && profFilter === 'missing') got = got.filter(id => !mine.has(id));
  const tiers = ['legendary', 'platinum', 'gold', 'silver', 'bronze'].map(tr => { const ids = got.filter(id => achById(id).tier === tr); return ids.length ? `<div class="pf-tier"><span style="color:${TIERS[tr].c}">${TIERS[tr].name} · ${ids.length}</span><div class="bdgs wrap">${rareSort(ids).map(id => badgeHtml(id)).join('')}</div></div>` : ''; }).join('');
  // header like a social app: picture and counts, who they are, buttons, a few numbers, then tabs
  if (profTabWho !== w){ profTabWho = w; profTab = 'posts'; }
  const soc = typeof socFollowers === 'function', nf = soc ? socFollowers(w) : 0, ng = soc ? socFollowing(w) : 0, posts = typeof fdUserPosts === 'function' ? fdUserPosts(w) : [];
  const rk = rkOf(w), elo = w === ME ? R.mmr : botRating(w), live = B && botLiveNow(w), place = placeOf(w);
  const fy = w !== ME && typeof FD !== 'undefined' && FD.followers.includes(w);
  const fb = soc ? socFollowedBy(w) : [], fbTxt = fb.length ? `Followed by ${fb.slice(0, 2).map(a => `<button class="lnk" data-bot="${a}">${esc(bot(a).name)}</button>`).join(', ')}${fb.length > 2 ? ` and ${fb.length - 2} other${fb.length - 2 === 1 ? '' : 's'} you follow` : ''}` : '';
  let wr = '–';
  if (w === ME){ const g = R.w + R.l + R.d; if (g) wr = winPct(R.w, g); }
  else { try { rkCounts(); if (rkReconcile(w)) RKA = null; const g = rkGames(w); if (g >= 20) wr = winPct(rkWins(w), g); } catch(e){} }
  const chips = [[st.total >= 60 ? Math.floor(st.total / 60).toLocaleString() + 'h' : st.total + 'm', 'studied'], [`${st.cur}d`, 'streak'], [wr, 'win rate'], ['#' + place.toLocaleString(), 'overall']];
  const bio = w === ME ? (P.myBio || '') : B.bio;
  const cnt = (n, l, kind) => kind ? `<button class="pf-cnt" data-soc="${kind}" data-soc-w="${w === ME ? 'me' : w}"><b>${fmtCount(n)}</b><small>${l}</small></button>` : `<span class="pf-cnt"><b>${n.toLocaleString()}</b><small>${l}</small></span>`;
  const TABS = [['posts', 'Posts'], ['stats', 'Stats'], ['ranked', 'Ranked'], ['awards', 'Awards']];
  const tabBody = {
    posts: () => posts.length ? `<div class="fd-grid pf-posts">${posts.map(p => `<button class="fd-thumb" data-goto-post="${p.id}" aria-label="Open post">${fdMedia(p)}</button>`).join('')}</div>`
      : `<p class="hint pf-empty">${w === ME ? 'No posts yet. Make one from the Feed.' : 'No posts yet.'}</p>`,
    stats: () => `<div class="card"><div class="h first">Study stats</div><div class="pf-stats">${stats.map(([v, l]) => `<span><b>${v}</b><small>${l}</small></span>`).join('')}</div></div>
      <div class="card"><div class="h first">Activity · last 6 months</div>
        <div class="hm-cal"><div class="hm-months">${months}</div><div class="hm-days"><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div><div class="hm-grid">${cells}</div></div>
        <div class="hm-foot"><span class="hm-legend">${LEVELS.map((l, k) => `<i class="hm l${k}"></i>${l}`).join('')}</span><span>Active ${activeMonth} of ${daysMonth} days this month · ${activeAll} active days in 6 months · busiest on ${busiest}</span></div></div>
      <div class="card" id="pfCal"></div>
      <div class="card"><div class="h first">Leaderboard places</div><ul class="lb-mine pf-lb">${lbs}</ul><p class="hint">Out of ${(ROSTER_N + 1).toLocaleString()} players. Click one to open that leaderboard.</p></div>`,
    ranked: () => `<div class="card"><div class="h first">Ranked</div>${ranked}</div><div class="card"><div class="h first">${w === ME ? 'Ranked matches' : 'Recent ranked matches'}</div>${profileMatches(w)}</div>`,
    awards: () => `<div class="card"><div class="h first">Featured</div><div class="bdgs lg">${(w === ME ? myFeatured() : botFeatured(w)).map(id => badgeHtml(id, 'lg') + `<span class="bdg-name">${esc(achById(id).name)}</span>`).join('') || '<span class="hint">Nothing featured yet.</span>'}</div></div>
      <div class="card"><div class="h first pf-ach-h"><span>Achievements · ${(w === ME ? mine.size : botBadges(w).length)}/${ACHS.length}</span>${w === ME ? '' : `<span class="seg sm" id="pfFilter"><button data-v="all" aria-pressed="${profFilter === 'all'}">All</button><button data-v="missing" aria-pressed="${profFilter === 'missing'}">They have, you don't</button></span>`}</div>${tiers || '<p class="hint">Nothing here.</p>'}</div>`
  };
  $('#profBody').innerHTML = `<div class="pf-bar"><button class="small-btn" data-pf="back">← Back</button></div>
    <div class="pf-wrap">
    <div class="card pf-head">
      <div class="pf-h1"><span class="pf-pic">${pAvatar(w, 'xl')}${live ? '<i class="pf-livedot" title="Studying now"></i>' : ''}</span>
        <div class="pf-cnts">${cnt(posts.length, posts.length === 1 ? 'post' : 'posts')}${cnt(nf, nf === 1 ? 'follower' : 'followers', 'followers')}${cnt(ng, 'following', 'following')}</div></div>
      <div class="pf-id"><b id="bmName">${esc(pName(w))}</b>${fy ? '<i class="soc-fy">Follows you</i>' : ''}</div>
      <div class="pf-meta">${emblem(rk, 'xs')} ${esc(rk.full)} · ${elo.toLocaleString()} Elo${B && B.subject ? ` · ${esc(B.subject)}` : ''}</div>
      ${bio && !(w === ME && profEditing) ? `<p class="pf-bio">${esc(bio)}</p>` : ''}
      ${B ? `<small class="pf-cls">${esc(B.style)} · studies in the ${esc(B.peak.toLowerCase())} · this semester: ${botClasses(w).map(esc).join(', ')}</small>` : ''}
      ${live ? `<span class="pf-live">● ${R.cur && R.cur.b === w && R.cur.state === 'live' && !R.cur.tapped ? 'Studying now · in a ranked match with you' : 'Studying now'}</span>` : ''}
      ${paraLine(w)}${fbTxt ? `<small class="pf-fb">${fbTxt}</small>` : ''}
      ${w === ME ? (profEditing ? editForm() : '<div class="pf-btns"><button class="small-btn" data-pf="edit">Edit profile</button></div>') : `<div class="pf-btns">${typeof dmButtons === 'function' ? dmButtons(w) : ''}</div>`}
      <div class="pf-chips">${chips.map(([v, l]) => `<span><b>${v}</b><small>${l}</small></span>`).join('')}</div>
    </div>
    <div class="pf-tabs" role="tablist">${TABS.map(([k, l]) => `<button data-pft="${k}" role="tab" aria-selected="${profTab === k}">${l}</button>`).join('')}</div>
    <div class="pf-tabbody">${tabBody[profTab]()}</div>
    </div>`;
  $('#pageTitle').textContent = w === ME ? (P.myName ? myName() : 'Your profile') : B.name;
  renderProfileCal();
}
// calendar on a profile: week by default, month on request; click a day to see its sessions
let pc = null;
const pcOpen = new Set();   // expanded session groups in the profile calendar (this visit only)
/* the selected day's sessions, with everything of the same name and activity in one group you can expand */
function pcSessRows(ss, me, col){
  const span = (a, b) => me ? hmRange(a.t0, b.t1) : `${hm12(a.a)}–${hm12(b.b)}`;
  const groups = [], by = new Map();
  ss.forEach(x => { const k = (x.subj || '') + '\u0000' + (x.task || '').trim().toLowerCase() + '\u0000' + (x.tag || ''); const g = by.get(k); if (g) g.push(x); else { const n = [x]; by.set(k, n); groups.push(n); } });
  const em = (x, mode, live) => `<em><i class="pc-dot" style="background:${col(x.tag)}"></i>${esc(x.tag)}${mode ? ` · ${MODE_NAMES[mode] || esc(mode)}` : ''}${live ? ' · <span class="pc-live">studying now</span>' : ''}</em>`;
  const nm = x => `<span class="nm">${x.subj ? `<b>${esc(x.subj)}</b> · ` : ''}${esc(x.task)}</span>`;
  return groups.map((g, gi) => {
    const x = g[0];
    if (g.length === 1) return `<li><span class="t">${span(x, x)}</span><span class="task"><span class="exp-sp"></span>${nm(x)}${em(x, x.mode, x.live)}</span><span class="min">${fmtMin(x.min)}</span></li>`;
    const key = `${profWho}|${pc.day}|${gi}|${x.task}`, open = pcOpen.has(key), last = g[g.length - 1];
    const mode = g.every(y => y.mode === x.mode) ? x.mode : null, live = g.some(y => y.live);
    let h = `<li class="grp"><span class="t">${span(x, last)}</span><span class="task"><button class="exp" data-pcx="${esc(key)}" aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Show'} sessions">${open ? '▾' : '▸'}</button>${nm(x)}${em(x, mode, live)}<span class="badge">${g.length} sessions</span></span><span class="min">${fmtMin(g.reduce((n, y) => n + y.min, 0))}</span></li>`;
    if (open) g.forEach((y, n) => { h += `<li class="sub"><span class="t">${span(y, y)}</span><span class="task"><span class="nm">Session ${n + 1}</span>${y.live ? '<em><span class="pc-live">studying now</span></em>' : ''}</span><span class="min">${fmtMin(y.min)}</span></li>`; });
    return h;
  }).join('');
}
function pcReset(){ const d = new Date(); pc = {view: P.calView === 'month' ? 'month' : 'week', week: startOfWeek(d), month: new Date(d.getFullYear(), d.getMonth(), 1), day: dayKey(d)}; }
function pcDayInfo(w, dk){
  if (w !== ME) return botDay(w, dk);
  const ss = LOG.filter(x => dayKey(x.t) === dk).map(x => ({a: null, t0: x.t - x.min * 60000, t1: x.t, min: x.min, subj: '', task: (x.task || '').trim() || 'Untitled session', tag: x.tag || 'General', mode: x.mode})).sort((p, q) => p.t0 - q.t0);
  if (!ss.length) return null;
  const by = {}; ss.forEach(x => by[x.tag] = (by[x.tag] || 0) + x.min);
  return {sessions: ss, min: ss.reduce((n, x) => n + x.min, 0), n: ss.length, by};
}
const hm12 = m => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
function renderProfileCal(){
  const el = $('#pfCal'); if (!el || profWho == null) return;
  if (!pc) pcReset();
  const w = profWho, me = w === ME, today = dayKey(Date.now()), week = pc.view === 'week', col = me ? actColor : botTagColor;
  const segs = r => Object.entries(r.by).sort((a, b) => b[1] - a[1]).map(([t, mm]) => `<i style="flex:${mm};background:${col(t)}" title="${esc(t)} · ${fmtMin(mm)}"></i>`).join('');
  const tip = (d, r) => `${d.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'})} · ${r ? `${fmtMin(r.min)} · ` + Object.entries(r.by).sort((a, b) => b[1] - a[1]).map(([t, mm]) => `${t} ${fmtMin(mm)}`).join(', ') : 'no study'}`;
  let body = '', title = '', sum = '';
  if (week){
    const days = [...Array(7)].map((_, k) => { const d = new Date(pc.week); d.setDate(d.getDate() + k); return d; }), rs = days.map(d => pcDayInfo(w, dayKey(d)));
    const a = days[0], b = days[6], maxMin = Math.max(60, ...rs.map(r => r ? r.min : 0));
    title = `${a.toLocaleDateString(undefined, {month:'short', day:'numeric'})} – ${b.toLocaleDateString(undefined, a.getMonth() === b.getMonth() ? {day:'numeric'} : {month:'short', day:'numeric'})}, ${b.getFullYear()}`;
    body = `<div class="cal-week">${days.map((d, k) => { const dk = dayKey(d), r = rs[k];
      return `<button class="wk-row${r ? ' has' : ''}${dk === today ? ' today' : ''}${dk === pc.day ? ' on' : ''}${dk > today ? ' future' : ''}" data-pk="${dk}" title="${esc(tip(d, r))}" aria-pressed="${dk === pc.day}">
        <span class="wd"><b>${d.toLocaleDateString(undefined, {weekday:'short'})}</b><span class="dn">${d.getDate()}</span></span>
        <span class="wk-bar">${r ? `<span class="fill" style="width:${r.min / maxMin * 100}%">${segs(r)}</span>` : ''}</span>
        <span class="wk-m">${r ? fmtMin(r.min) : '–'}</span></button>`; }).join('')}</div>`;
    const tot = rs.reduce((n, r) => n + (r ? r.min : 0), 0), nd = rs.filter(Boolean).length;
    sum = tot ? `${fmtMin(tot)} studied on ${nd} day${nd === 1 ? '' : 's'} this week` : 'No study this week.';
  } else {
    const y = pc.month.getFullYear(), m = pc.month.getMonth(), lead = new Date(y, m, 1).getDay(), daysIn = new Date(y, m + 1, 0).getDate();
    title = pc.month.toLocaleDateString(undefined, {month:'long', year:'numeric'});
    const rs = []; let maxMin = 0, tot = 0, nd = 0;
    for (let d = 1; d <= daysIn; d++){ const r = pcDayInfo(w, dayKey(new Date(y, m, d, 12))); rs.push(r); if (r){ maxMin = Math.max(maxMin, r.min); tot += r.min; nd++; } }
    let h = ''; for (let k = 0; k < lead; k++) h += '<span class="cal-cell pad" aria-hidden="true"></span>';
    rs.forEach((r, k) => { const dd = new Date(y, m, k + 1, 12), dk = dayKey(dd), heat = r ? .25 + .75 * r.min / maxMin : 0;
      h += `<button class="cal-cell${r ? ' has' : ''}${dk === today ? ' today' : ''}${dk === pc.day ? ' on' : ''}${dk > today ? ' future' : ''}" data-pk="${dk}" style="--heat:${heat}" title="${esc(tip(dd, r))}" aria-pressed="${dk === pc.day}"><span class="n">${k + 1}</span>${r ? `<span class="m">${fmtMin(r.min)}</span><span class="segs">${segs(r)}</span>` : ''}</button>`; });
    body = `<div class="cal-dow" aria-hidden="true"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="cal-grid">${h}</div>`;
    sum = tot ? `${fmtMin(tot)} studied on ${nd} day${nd === 1 ? '' : 's'} this month` : 'No study this month.';
  }
  // the selected day
  const r = pcDayInfo(w, pc.day), dTitle = pc.day === today ? 'Today' : new Date(pc.day + 'T12:00').toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
  let dayH = `<div class="h">${dTitle}</div>`;
  if (r){
    const rows = Object.entries(r.by).sort((a, b) => b[1] - a[1]), top = rows[0][1];
    dayH += `<p class="cal-total"><b>${fmtMin(r.min)}</b> across ${r.n} session${r.n === 1 ? '' : 's'}</p>
      <div class="tagbars">${rows.map(([t, mm]) => `<div class="tagbar" style="--c:${col(t)}"><span class="name"><i></i><b>${esc(t)}</b></span><span class="track2"><i style="width:${mm / top * 100}%"></i></span><span class="m">${fmtMin(mm)}</span></div>`).join('')}</div>
      <ul class="sessions pc-sess">${pcSessRows(r.sessions, me, col)}</ul>`;
  } else dayH += `<p class="hint">${pc.day > today ? "This day hasn't happened yet." : !me && pc.day < botJoinKey(w) ? `${esc(pName(w))} hadn't started studying here yet.` : 'No study on this day.'}</p>`;
  el.innerHTML = `<div class="pc-top"><div class="h first">Calendar</div><div class="seg" role="group" aria-label="Calendar view"><button data-pc="week" aria-pressed="${week}">Week</button><button data-pc="month" aria-pressed="${!week}">Month</button></div></div>
    <div class="cal-head pc-head"><button class="small-btn" data-pc="prev" aria-label="Previous ${pc.view}">‹</button><b>${title}</b><button class="small-btn" data-pc="next" aria-label="Next ${pc.view}">›</button><button class="small-btn" data-pc="today">Today</button></div>
    ${body}<p class="cal-month">${sum}</p>${dayH}`;
}
function pcAct(a, dk){
  if (dk){ pc.day = dk; const d = new Date(dk + 'T12:00'); pc.week = startOfWeek(d); pc.month = new Date(d.getFullYear(), d.getMonth(), 1); }
  else if (a === 'week' || a === 'month'){ pc.view = a; const d = new Date(pc.day + 'T12:00'); pc.week = startOfWeek(d); pc.month = new Date(d.getFullYear(), d.getMonth(), 1); }
  else if (a === 'prev' || a === 'next'){ const n = a === 'prev' ? -1 : 1; if (pc.view === 'month') pc.month = new Date(pc.month.getFullYear(), pc.month.getMonth() + n, 1); else { pc.week = new Date(pc.week); pc.week.setDate(pc.week.getDate() + 7 * n); } }
  else if (a === 'today') pcReset();
  renderProfileCal();
}
function openFullProfile(w){ if (profWho !== w || !pc) pcReset(); if (profWho !== w) profMatchN = 15; profWho = w; $('#botModal').hidden = true; showPage('profile'); }
function saveProfileEdit(){
  const n = ($('#pfName').value || '').trim().slice(0, 20), on = document.querySelector('.pf-hues [aria-checked="true"]');
  P.myName = n; P.myHue = on && on.dataset.hue !== '' ? +on.dataset.hue : null; const bi = $('#pfBio'); if (bi) P.myBio = bi.value.replace(/\s+/g, ' ').trim().slice(0, 150); saveP(); profEditing = false;
  renderMeBtn(); renderMatch(); renderRankChip();
  if (!$('#page-ranked').hidden) renderRanked(); if (!$('#page-leaders').hidden) renderLeaders();
  toast('Profile saved');
}
function profClick(e){
  const tb = e.target.closest('[data-pft]'); if (tb){ profTab = tb.dataset.pft; renderProfilePage(); return; }
  const b = e.target.closest('[data-pf]'), hue = e.target.closest('[data-hue]');
  if (hue){ hue.parentNode.querySelectorAll('[data-hue]').forEach(x => x.setAttribute('aria-checked', x === hue)); return; }
  if (!b) return;
  const a = b.dataset.pf, inPage = !!e.target.closest('#page-profile'), redraw = () => inPage ? renderProfilePage() : openProfile(profWho);
  if (a === 'full') openFullProfile(profWho);
  else if (b.dataset.pk){ /* handled below */ }
  else if (a === 'back') showPage(profPrev || 'ranked');
  else if (a === 'moreMatches'){ profMatchN += 15; renderProfilePage(); }
  else if (a === 'edit'){ profEditing = true; redraw(); setTimeout(() => { const f = $('#pfName'); f && f.focus(); }, 0); }
  else if (a === 'cancel'){ profEditing = false; redraw(); }
  else if (a === 'save'){ saveProfileEdit(); redraw(); }
}
$('#botModal').addEventListener('click', e => {
  if (e.target === $('#botModal') || e.target.closest('.x')){ $('#botModal').hidden = true; profEditing = false; return; }
  const pk = e.target.closest('.hm-strip [data-pk]'); if (pk){ const w = profWho; pcReset(); pc.day = pk.dataset.pk; const d = new Date(pc.day + 'T12:00'); pc.week = startOfWeek(d); profWho = w; $('#botModal').hidden = true; showPage('profile'); setTimeout(() => $('#pfCal') && $('#pfCal').scrollIntoView({block: 'start'}), 30); return; }
  profClick(e);
});
$('#botModal').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pfName'){ saveProfileEdit(); openProfile(ME); } });
$('#page-profile').addEventListener('click', e => {
  profClick(e);
  const px = e.target.closest('[data-pcx]'); if (px){ const k = px.dataset.pcx; pcOpen.has(k) ? pcOpen.delete(k) : pcOpen.add(k); renderProfileCal(); return; }
  const pcb = e.target.closest('[data-pc]'); if (pcb){ pcAct(pcb.dataset.pc); return; }
  const pk = e.target.closest('[data-pk]'); if (pk){ pcAct(null, pk.dataset.pk); if (pk.classList.contains('hm')) $('#pfCal').scrollIntoView({behavior: motion() === 'off' ? 'auto' : 'smooth', block: 'start'}); return; }
  const lb = e.target.closest('[data-lb]'); if (lb){ P.lbCat = lb.dataset.lb; saveP(); lbShown = 10; lbJump = profWho === ME; showPage('leaders'); return; }
  const fl = e.target.closest('#pfFilter [data-v]'); if (fl){ profFilter = fl.dataset.v; renderProfilePage(); }
});
$('#page-profile').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pfName'){ saveProfileEdit(); renderProfilePage(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape'){ $('#botModal').hidden = true; profEditing = false; } });
// clicking yourself anywhere opens your profile
document.addEventListener('click', e => { const m = e.target.closest('[data-me]'); if (m && !e.target.closest('.bdg') && !e.target.closest('#botModal')) openProfile(ME); });
function renderMeBtn(){ const b = $('#meBtn'); if (b){ b.innerHTML = myAvatar('sm'); b.title = `${myName() === 'You' ? 'Your' : myName() + "'s"} profile`; } }
$('#meBtn').onclick = () => openProfile(ME);
renderMeBtn();

