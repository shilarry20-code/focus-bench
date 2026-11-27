/* ---------- the Desk: the scene at the top of every profile ----------
   Your character sits behind a desk in a room. Everything in the scene is an item from one catalog (DK_ITEMS), and
   each item fills one slot: the room, the desk, the chair, two wall spots and three spots on the desk (left, middle,
   right). Adding something later is just a new catalog entry; the editor and the shop read the same catalog.
   The scene is drawn in the character's own units (the head is around y 20-80, shoulders ~95) so the figure from
   the creator drops straight in; the desk top sits at y 148 and hides everything below it.
   The window follows the real time of day, and lamps light up at night.
   Simulated players get a desk picked from their seed. Yours lives in P.desk and syncs with your settings. */

const DK_INK = '#2a2420', DK_TOP = 148;
const dkSw = (w = 2.2) => `stroke="${DK_INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const dkShade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k))); return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };

/* ---- the slots, in drawing order ---- */
const DK_SLOTS = [
  ['room', 'Room'], ['chair', 'Chair'], ['wall1', 'Wall, left'], ['wall2', 'Wall, middle'], ['desk', 'Desk'],
  ['left', 'Desk, left'], ['center', 'Desk, middle'], ['right', 'Desk, right']
];
// where each spot is (x of the item's bottom center; wall spots give the center)
const DK_AT = {wall1: [-196, 12], wall2: [-74, -4], left: [-128, DK_TOP], center: [60, DK_TOP + 2], right: [300, DK_TOP]};

/* ---- the time of day: 0 night, 1 dawn/dusk, 2 day ---- */
function dkSky(now = Date.now()){
  const h = new Date(now).getHours() + new Date(now).getMinutes() / 60;
  if (h >= 7.5 && h < 17.5) return {k: 2, top: '#8cc8ee', bot: '#d9eefa', dark: 0};
  if ((h >= 5.5 && h < 7.5) || (h >= 17.5 && h < 19.5)) return {k: 1, top: '#f0a36a', bot: '#ffd9a0', dark: .12};
  return {k: 0, top: '#141a3a', bot: '#2c2f5e', dark: .38};
}

/* ---- rooms: the wall behind you, a window on the right ---- */
function dkWindow(sky, x = 148, y = -36, w = 116, h = 124){
  let g = `<defs><linearGradient id="dkSkyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.top}"/><stop offset="1" stop-color="${sky.bot}"/></linearGradient></defs>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#dkSkyG)"/>`;
  if (sky.k === 0) g += `<circle cx="${x + w * .72}" cy="${y + 26}" r="10" fill="#f4efd8"/><circle cx="${x + w * .72 + 5}" cy="${y + 23}" r="9" fill="${sky.top}"/>` + [[.2, .2], [.4, .4], [.15, .6], [.55, .18], [.85, .55], [.35, .75]].map(([a, b]) => `<circle cx="${(x + w * a).toFixed(1)}" cy="${(y + h * b).toFixed(1)}" r="1.2" fill="#fff" opacity=".85"/>`).join('');
  else if (sky.k === 1) g += `<circle cx="${x + w * .3}" cy="${y + h * .78}" r="16" fill="#ffd27a" opacity=".9"/>`;
  else g += `<circle cx="${x + w * .78}" cy="${y + 24}" r="11" fill="#fff3b0"/><path d="M${x + 14} ${y + 46}q8-9 18-3q6-8 16 0q10 0 9 8h-43z" fill="#fff" opacity=".9"/>`;
  // treetops / rooftops along the bottom of the view
  g += `<path d="M${x} ${y + h}v-22q10-12 22-4q8-14 22-3q12-10 24 2q10-8 22 1q14-6 26 6v20z" fill="${sky.k === 0 ? '#1d2a2a' : sky.k === 1 ? '#5b6b4a' : '#7aa06a'}"/>`;
  return g + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#f2ece0" stroke-width="7"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${dkSw(2)}/>
    <path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="#f2ece0" stroke-width="4"/><path d="M${x - 8} ${y + h + 4}h${w + 16}" stroke="#e6dccb" stroke-width="7"/><path d="M${x - 8} ${y + h + 4}h${w + 16}" ${dkSw(1.6)} fill="none"/>`;
}
const dkWall = (fill, extra = '') => `<rect x="-600" y="-400" width="1200" height="700" fill="${fill}"/>${extra}`;
const dkRarity = id => (DK_ITEMS[id] && DK_ITEMS[id].rare) || 'Common';
const DK_ITEMS = {
  /* rooms */
  dorm: {slot: 'room', name: 'Dorm room', draw: (c, s) => dkWall('#c9d9e6', [...Array(14)].map((_, r) => `<path d="M-600 ${-60 + r * 22}H600" stroke="#b6c7d6" stroke-width="1.4"/>` + [...Array(30)].map((_, k) => `<path d="M${-590 + k * 44 + (r % 2) * 22} ${-60 + r * 22}v22" stroke="#b6c7d6" stroke-width="1.4"/>`).join('')).join('')) + dkWindow(s)},
  library: {slot: 'room', name: 'Library', draw: (c, s) => {
    let g = dkWall('#6b4a33'); const books = ['#9b2f3f', '#3f6fa0', '#5b8c5a', '#c9a14a', '#7a4f8a', '#d98a3a', '#2f3540'];
    for (let r = 0; r < 4; r++){ const y = -52 + r * 52; g += `<rect x="-600" y="${y + 44}" width="1200" height="8" fill="#4a3022"/>`;
      for (let x = -440, k = r * 3; x < 560; k++){ const w = 7 + (k * 7) % 6, h = 30 + (k * 5) % 12; g += `<rect x="${x}" y="${y + 44 - h}" width="${w}" height="${h}" fill="${books[k % books.length]}" stroke="#2a1b10" stroke-width="1"/>`; x += w + 1 + (k % 9 === 0 ? 14 : 0); } }
    return g + `<rect x="-600" y="-400" width="1200" height="700" fill="#000" opacity=".12"/>`; }},
  cafe: {slot: 'room', name: 'Café', draw: (c, s) => {
    let g = dkWall('#b5644a'); for (let r = 0; r < 14; r++) for (let k = 0; k < 30; k++) g += `<rect x="${-600 + k * 40 + (r % 2) * 20}" y="${-60 + r * 16}" width="38" height="14" fill="${['#b5644a', '#a85a42', '#bd6e52'][(r * 7 + k) % 3]}"/>`;
    return g + `<g><path d="M-60 -60v22" stroke="#2a2420" stroke-width="1.5"/><path d="M-74 -38h28l-6 12h-16z" fill="#2f3540" ${dkSw(1.6)}/><ellipse cx="-60" cy="-24" rx="9" ry="3" fill="#ffe7a8"/></g>` + dkWindow(s); }},
  bedroom: {slot: 'room', name: 'Bedroom', draw: (c, s) => dkWall('#efd9de', [...Array(40)].map((_, k) => `<circle cx="${-560 + (k % 20) * 56 + ((k / 20 | 0) % 2) * 28}" cy="${-40 + (k / 20 | 0) * 60}" r="3" fill="#e2bcc6"/>`).join('') + [...Array(40)].map((_, k) => `<circle cx="${-532 + (k % 20) * 56}" cy="${-10 + (k / 20 | 0) * 60}" r="2" fill="#e8c9d1"/>`).join('')) + dkWindow(s)},
  /* desks: the top at y 148, a front panel down past the bottom of the view */
  wood: {slot: 'desk', name: 'Oak desk', col: '#9a6a44', draw: c => dkDesk(c, 1)},
  white: {slot: 'desk', name: 'White desk', col: '#efeae1', draw: c => dkDesk(c, 0)},
  black: {slot: 'desk', name: 'Black desk', col: '#34383f', draw: c => dkDesk(c, 2)},
  sage: {slot: 'desk', name: 'Sage desk', col: '#a9c4b2', draw: c => dkDesk(c, 1)},
  /* chairs: behind you, peeking out around your shoulders */
  office: {slot: 'chair', name: 'Desk chair', col: '#3a3f48', draw: c => `<rect x="2" y="64" width="116" height="96" rx="20" fill="${c}" ${dkSw()}/><rect x="12" y="74" width="96" height="76" rx="14" fill="${dkShade(c, 1.25)}" opacity=".5"/>`},
  gaming: {slot: 'chair', name: 'Gaming chair', col: '#c23b3b', draw: c => `<path d="M14 160V40q0-18 18-22h56q18 4 18 22v120z" fill="#24262b" ${dkSw()}/><path d="M28 30h64M24 48h72" stroke="${c}" stroke-width="7"/><path d="M14 70q-10 6-10 22v68M106 70q10 6 10 22v68" fill="none" stroke="${c}" stroke-width="7"/><rect x="40" y="22" width="40" height="14" rx="5" fill="${c}" ${dkSw(1.6)}/>`},
  spindle: {slot: 'chair', name: 'Wooden chair', col: '#8a5a3c', draw: c => `<path d="M4 70q56-26 112 0" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round"/><path d="M4 70q56-26 112 0" fill="none" ${dkSw(1.8)}/>${[10, 32, 88, 110].map(x => `<rect x="${x - 4}" y="${x < 60 ? 68 - (x - 10) * .2 : 68 - (110 - x) * .2}" width="8" height="90" fill="${dkShade(c, .9)}" ${dkSw(1.6)}/>`).join('')}`},
  armchair: {slot: 'chair', name: 'Armchair', col: '#5d7fa6', draw: c => `<path d="M-14 160V92q0-16 16-16h8V58q0-16 16-16h68q16 0 16 16v18h8q16 0 16 16v68z" fill="${c}" ${dkSw()}/><path d="M10 76v84M110 76v84" stroke="${dkShade(c, .8)}" stroke-width="3"/>`},
  /* wall */
  poster: {slot: 'wall', name: 'Poster', col: '#3f6fa0', draw: (c, s, [x, y]) => `<rect x="${x - 26}" y="${y - 36}" width="52" height="72" fill="${c}" ${dkSw()}/><circle cx="${x}" cy="${y - 6}" r="14" fill="#f2c14e"/><path d="M${x - 26} ${y + 22}l16-14 12 9 12-12 12 17z" fill="${dkShade(c, .7)}"/><path d="M${x - 16} ${y + 28}h32" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="${x}" cy="${y - 32}" r="1.8" fill="#c23b3b"/>`},
  pennant: {slot: 'wall', name: 'Pennant', col: '#9b2f3f', draw: (c, s, [x, y]) => `<path d="M${x - 34} ${y - 16}L${x + 38} ${y}L${x - 34} ${y + 16}z" fill="${c}" ${dkSw()}/><path d="M${x - 34} ${y - 16}v32" stroke="#f2ece0" stroke-width="5"/><text x="${x - 10}" y="${y + 3.5}" font-family="Arial Black,Arial" font-weight="900" font-size="10" fill="#fff" text-anchor="middle">FOCUS</text>`},
  clock: {slot: 'wall', name: 'Wall clock', col: '#f2ece0', draw: (c, s, [x, y]) => { const d = new Date(), h = (d.getHours() % 12 + d.getMinutes() / 60) * 30, m = d.getMinutes() * 6, r = 22, hand = (a, l, w) => `<path d="M${x} ${y}L${(x + Math.sin(a * Math.PI / 180) * l).toFixed(1)} ${(y - Math.cos(a * Math.PI / 180) * l).toFixed(1)}" stroke="${DK_INK}" stroke-width="${w}" stroke-linecap="round"/>`;
    return `<circle cx="${x}" cy="${y}" r="${r + 4}" fill="#2f3540" ${dkSw()}/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>${[...Array(12)].map((_, k) => `<circle cx="${(x + Math.sin(k * Math.PI / 6) * (r - 4)).toFixed(1)}" cy="${(y - Math.cos(k * Math.PI / 6) * (r - 4)).toFixed(1)}" r="${k % 3 ? .9 : 1.6}" fill="${DK_INK}"/>`).join('')}${hand(h, 11, 2.6)}${hand(m, 16, 1.8)}<circle cx="${x}" cy="${y}" r="2" fill="#c23b3b"/>`; }},
  cork: {slot: 'wall', name: 'Cork board', col: '#c79a62', draw: (c, s, [x, y]) => `<rect x="${x - 38}" y="${y - 28}" width="76" height="56" rx="3" fill="${c}" stroke="#7a5a3a" stroke-width="5"/><rect x="${x - 38}" y="${y - 28}" width="76" height="56" rx="3" fill="none" ${dkSw(1.6)}/>
    <rect x="${x - 30}" y="${y - 20}" width="22" height="20" fill="#f7e27a" transform="rotate(-6 ${x - 19} ${y - 10})"/><rect x="${x - 2}" y="${y - 22}" width="26" height="18" fill="#fff"/><path d="M${x + 2} ${y - 16}h18M${x + 2} ${y - 11}h12" stroke="#9aa" stroke-width="1.4"/><rect x="${x - 22}" y="${y + 4}" width="20" height="18" fill="#a8d0e6" transform="rotate(5 ${x - 12} ${y + 13})"/><rect x="${x + 6}" y="${y + 2}" width="24" height="18" fill="#f0b6b0"/>
    ${[[-19, -19], [11, -21], [-12, 5], [18, 3]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r="2" fill="#c23b3b"/>`).join('')}`},
  frame: {slot: 'wall', name: 'Framed photo', col: '#2f3540', draw: (c, s, [x, y]) => `<rect x="${x - 30}" y="${y - 22}" width="60" height="44" fill="${c}" ${dkSw()}/><rect x="${x - 24}" y="${y - 16}" width="48" height="32" fill="#bfe0f2"/><path d="M${x - 24} ${y + 16}l14-16 10 10 8-6 16 12z" fill="#5b8c5a"/><circle cx="${x + 12}" cy="${y - 8}" r="4" fill="#fff3b0"/>`},
  /* on the desk: drawn from the bottom center at the spot */
  lamp: {slot: 'item', name: 'Desk lamp', col: '#2f3540', light: 1, draw: (c, s, [x, y]) => `<ellipse cx="${x}" cy="${y - 2}" rx="15" ry="4" fill="${c}" ${dkSw()}/><path d="M${x} ${y - 4}L${x + 8} ${y - 40}L${x - 10} ${y - 62}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M${x} ${y - 4}L${x + 8} ${y - 40}L${x - 10} ${y - 62}" fill="none" ${dkSw(1.2)}/><circle cx="${x + 8}" cy="${y - 40}" r="3.4" fill="${c}" ${dkSw(1.4)}/><path d="M${x - 10} ${y - 62}l-22 6 6 18 20-14z" fill="${c}" ${dkSw()}/><ellipse cx="${x - 26}" cy="${y - 47}" rx="7" ry="3.4" fill="#fff4c4" transform="rotate(-38 ${x - 26} ${y - 47})"/>`},
  mug: {slot: 'item', name: 'Mug', col: '#e8746a', draw: (c, s, [x, y]) => `<path d="M${x + 9} ${y - 20}q12 0 12 9t-12 8" fill="none" stroke="${c}" stroke-width="4"/><path d="M${x + 9} ${y - 20}q12 0 12 9t-12 8" fill="none" ${dkSw(1.4)}/><path d="M${x - 12} ${y - 28}h22l-2 26q0 2-2 2h-14q-2 0-2-2z" fill="${c}" ${dkSw()}/><ellipse cx="${x - 1}" cy="${y - 28}" rx="11" ry="3" fill="#5b3a26" ${dkSw(1.4)}/><path d="M${x - 4} ${y - 34}q-4-6 0-10M${x + 3} ${y - 34}q-4-6 0-10" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`},
  plant: {slot: 'item', name: 'Potted plant', col: '#c4704f', draw: (c, s, [x, y]) => `<path d="M${x} ${y - 22}c-10-22-26-26-32-22 8 3 18 12 24 24M${x} ${y - 22}c-2-28 6-40 14-42-3 8-6 22-8 42M${x + 2} ${y - 22}c12-18 26-20 30-16-8 3-16 9-22 18" fill="#5b8c5a" ${dkSw(1.6)}/><path d="M${x - 14} ${y - 24}h28l-4 24h-20z" fill="${c}" ${dkSw()}/><path d="M${x - 15} ${y - 20}h30" stroke="${dkShade(c, .75)}" stroke-width="3"/>`},
  books: {slot: 'item', name: 'Book stack', col: '#3f6fa0', draw: (c, s, [x, y]) => [[c, 44, 0], ['#c9a14a', 40, 3], ['#9b2f3f', 46, -2], ['#5b8c5a', 38, 2]].map(([f, w, dx], k) => `<rect x="${x - w / 2 + dx}" y="${y - 10 * (k + 1)}" width="${w}" height="10" rx="1.5" fill="${f}" ${dkSw(1.6)}/><path d="M${x + w / 2 + dx - 5} ${y - 10 * (k + 1) + 2}v6" stroke="#f2ece0" stroke-width="1.6"/>`).join('')},
  laptop: {slot: 'item', name: 'Laptop', col: '#b9bec6', center: 1, draw: (c, s, [x, y]) => `<path d="M${x - 46} ${y - 2}l6-54h80l6 54z" fill="${c}" ${dkSw()}/><circle cx="${x}" cy="${y - 30}" r="5" fill="${dkShade(c, .8)}"/><rect x="${x - 52}" y="${y - 4}" width="104" height="5" rx="2" fill="${dkShade(c, .85)}" ${dkSw(1.6)}/>`},
  notebook: {slot: 'item', name: 'Open notebook', col: '#f6f2e8', center: 1, draw: (c, s, [x, y]) => `<path d="M${x - 44} ${y}l6-10h76l6 10z" fill="#2f3540" ${dkSw(1.6)}/><path d="M${x - 40} ${y - 2}l5-9h35v9zM${x + 40} ${y - 2}l-5-9h-35v9z" fill="${c}" ${dkSw(1.4)}/><path d="M${x - 30} ${y - 7}h24M${x + 6} ${y - 7}h24M${x - 32} ${y - 4}h26M${x + 6} ${y - 4}h26" stroke="#9fb4c8" stroke-width="1"/><path d="M${x + 22} ${y - 3}l14-12" stroke="#f2c14e" stroke-width="3" stroke-linecap="round"/><path d="M${x + 22} ${y - 3}l14-12" ${dkSw(1)}/>`},
  headphones: {slot: 'item', name: 'Headphones', col: '#2f3540', draw: (c, s, [x, y]) => `<path d="M${x - 18} ${y - 8}q0-30 18-30t18 30" fill="none" stroke="${c}" stroke-width="5"/><path d="M${x - 18} ${y - 8}q0-30 18-30t18 30" fill="none" ${dkSw(1.2)}/><rect x="${x - 25}" y="${y - 16}" width="12" height="16" rx="5" fill="${c}" ${dkSw()}/><rect x="${x + 13}" y="${y - 16}" width="12" height="16" rx="5" fill="${c}" ${dkSw()}/>`},
  pencils: {slot: 'item', name: 'Pencil cup', col: '#5d7fa6', draw: (c, s, [x, y]) => `${[['#f2c14e', -6, -36, -8], ['#e8746a', 0, -40, 0], ['#5b8c5a', 6, -34, 8]].map(([f, dx, h, a]) => `<rect x="${x + dx - 2}" y="${y + h}" width="4" height="${-h - 6}" fill="${f}" ${dkSw(1)} transform="rotate(${a} ${x + dx} ${y - 10})"/>`).join('')}<path d="M${x - 11} ${y - 24}h22l-2 24h-18z" fill="${c}" ${dkSw()}/>`},
  cat: {slot: 'item', name: 'Lucky cat', col: '#f6f2e8', draw: (c, s, [x, y]) => `<path d="M${x - 14} ${y}v-18q0-12 14-12t14 12v18z" fill="${c}" ${dkSw()}/><path d="M${x - 12} ${y - 26}l2-10 7 6M${x + 12} ${y - 26}l-2-10-7 6" fill="${c}" ${dkSw(1.6)}/><path d="M${x + 12} ${y - 18}q8-6 6-16" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M${x + 12} ${y - 18}q8-6 6-16" fill="none" ${dkSw(1.2)}/><circle cx="${x - 5}" cy="${y - 22}" r="1.4" fill="${DK_INK}"/><circle cx="${x + 5}" cy="${y - 22}" r="1.4" fill="${DK_INK}"/><path d="M${x - 3} ${y - 18}q3 2 6 0" fill="none" ${dkSw(1)}/><circle cx="${x}" cy="${y - 10}" r="3.2" fill="#f2c14e" ${dkSw(1)}/>`},
  bottle: {slot: 'item', name: 'Water bottle', col: '#5fb3a8', draw: (c, s, [x, y]) => `<rect x="${x - 9}" y="${y - 44}" width="18" height="44" rx="6" fill="${c}" ${dkSw()}/><rect x="${x - 6}" y="${y - 52}" width="12" height="9" rx="2" fill="#2f3540" ${dkSw(1.6)}/><path d="M${x - 9} ${y - 20}h18" stroke="#fff" stroke-width="3" opacity=".6"/>`},
  globe: {slot: 'item', name: 'Globe', col: '#5d9fd6', draw: (c, s, [x, y]) => `<path d="M${x - 10} ${y - 2}h20l-4-6h-12z" fill="#c9a14a" ${dkSw(1.6)}/><path d="M${x} ${y - 8}v-4" ${dkSw(2)}/><circle cx="${x}" cy="${y - 28}" r="17" fill="${c}" ${dkSw()}/><path d="M${x - 10} ${y - 38}q8 2 6 10t6 8M${x + 4} ${y - 18}q6-4 10 0" fill="#7fb36b" stroke="#5b8c5a" stroke-width="1"/><path d="M${x - 20} ${y - 46}q22 6 40 34" fill="none" stroke="#c9a14a" stroke-width="2.4"/>`},
  snacks: {slot: 'item', name: 'Snacks', col: '#f2c14e', draw: (c, s, [x, y]) => `<path d="M${x - 16} ${y}l-3-34 4 2 4-2 4 2 4-2 4 2 4-2 4 2-3 32z" fill="${c}" ${dkSw()}/><circle cx="${x}" cy="${y - 18}" r="7" fill="#e8746a"/><ellipse cx="${x + 22}" cy="${y - 2}" rx="5" ry="2.4" fill="#e3b04b" ${dkSw(1.2)}/>`}
};
// the desk itself: a top with a lip and a front panel (style 0 plain, 1 with a drawer, 2 with metal edges)
function dkDesk(c, style){
  const top = dkShade(c, 1.12), side = dkShade(c, .82);
  let g = `<path d="M-420 ${DK_TOP - 6}H540L550 ${DK_TOP + 4}H-430Z" fill="${top}" ${dkSw()}/><rect x="-430" y="${DK_TOP + 4}" width="980" height="10" fill="${side}" ${dkSw()}/>
    <rect x="-416" y="${DK_TOP + 14}" width="952" height="140" fill="${c}" ${dkSw()}/>`;
  if (style === 1) g += `<rect x="-236" y="${DK_TOP + 24}" width="120" height="34" rx="3" fill="${dkShade(c, 1.05)}" ${dkSw(1.6)}/><rect x="-188" y="${DK_TOP + 38}" width="24" height="5" rx="2.5" fill="#c9a14a" ${dkSw(1)}/><rect x="236" y="${DK_TOP + 24}" width="120" height="34" rx="3" fill="${dkShade(c, 1.05)}" ${dkSw(1.6)}/><rect x="284" y="${DK_TOP + 38}" width="24" height="5" rx="2.5" fill="#c9a14a" ${dkSw(1)}/>`;
  if (style === 2) g += `<path d="M-416 ${DK_TOP + 20}H536" stroke="#9aa0a8" stroke-width="3"/>`;
  return g;
}

/* ---- what's on a desk ---- */
const DK_DEFAULT = {room: 'dorm', desk: 'wood', chair: 'office', wall1: 'poster', wall2: 'clock', left: 'lamp', center: 'notebook', right: 'mug', col: {}};
const dkItems = slot => Object.keys(DK_ITEMS).filter(k => DK_ITEMS[k].slot === (['wall1', 'wall2'].includes(slot) ? 'wall' : ['left', 'center', 'right'].includes(slot) ? 'item' : slot));
function dkClean(d){
  const o = Object.assign({}, DK_DEFAULT, d || {}); o.col = Object.assign({}, (d && d.col) || {});
  DK_SLOTS.forEach(([s]) => { if (o[s] !== '' && !dkItems(s).includes(o[s])) o[s] = DK_DEFAULT[s]; });
  return o;
}
// a simulated player's desk: picked from their seed, the same every time
function dkOfBot(w){
  const r = mulberry32(fdHash('desk:' + w)), pick = s => { const a = dkItems(s); return a[Math.floor(r() * a.length)]; };
  const d = {}; DK_SLOTS.forEach(([s]) => { d[s] = pick(s); });
  if (r() < .25) d.wall2 = ''; if (r() < .2) d.left = '';
  const used = new Set(); ['left', 'center', 'right'].forEach(s => { while (d[s] && used.has(d[s])) d[s] = pick(s); if (d[s]) used.add(d[s]); });
  if (DK_ITEMS[d.center] && !DK_ITEMS[d.center].center && r() < .7) d.center = r() < .5 ? 'laptop' : 'notebook';
  d.col = {}; return dkClean(d);
}
const dkOf = w => w === ME ? dkClean(P.desk) : dkOfBot(w);
const dkLookOf = w => w === ME ? chMyLook() : chLookOf(BOTS[w] && BOTS[w].i != null ? BOTS[w].i : w);

/* ---- the scene ---- */
function dkScene(w, opt = {}){
  const d = opt.desk || dkOf(w), look = opt.look || dkLookOf(w), sky = dkSky(), col = s => (d.col && d.col[s]) || (DK_ITEMS[d[s]] && DK_ITEMS[d[s]].col) || '#888';
  const item = s => { const it = DK_ITEMS[d[s]]; return it ? `<g class="dk-i" data-slot="${s}">${it.draw(col(s), sky, DK_AT[s] || [0, 0])}</g>` : ''; };
  const lit = ['left', 'center', 'right'].some(s => DK_ITEMS[d[s]] && DK_ITEMS[d[s]].light);
  let g = `<g class="dk-room">${DK_ITEMS[d.room].draw(col('room'), sky)}</g>`;
  g += item('wall1') + item('wall2') + `<g class="dk-chair" transform="translate(0 0)">${item('chair')}</g>`;
  g += `<g class="dk-me">${chFigure(look)}</g>`;
  g += `<g class="dk-desk">${DK_ITEMS[d.desk].draw(col('desk'))}</g>` + item('left') + item('right') + item('center');
  // night: the room dims, and a lamp throws a warm pool of light
  if (sky.dark) g += `<rect x="-600" y="-400" width="1200" height="700" fill="#0c1030" opacity="${lit ? sky.dark * .75 : sky.dark}"/>`;
  if (lit && sky.k !== 2){ const s = ['left', 'center', 'right'].find(k => DK_ITEMS[d[k]] && DK_ITEMS[d[k]].light), [x, y] = DK_AT[s];
    g += `<defs><radialGradient id="dkLamp"><stop offset="0" stop-color="#ffd98a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs><ellipse cx="${x - 10}" cy="${y - 20}" rx="120" ry="80" fill="url(#dkLamp)"/>`; }
  return `<svg class="dk-svg${opt.cls ? ' ' + opt.cls : ''}" viewBox="${opt.view || '-290 -48 700 271'}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(w === ME ? 'Your desk' : pName(w) + '’s desk')}">${g}</svg>`;
}
function dkSceneHtml(w){ return `<div class="dk-scene">${dkScene(w, {cls: 'ch-live'})}</div>`; }
// the wall clock keeps time: redraw open desks once a minute
setInterval(() => { document.querySelectorAll('.dk-scene').forEach(el => { const pg = el.closest('#page-profile'); if (pg && !pg.hidden && typeof profWho !== 'undefined' && profWho != null) el.innerHTML = dkScene(profWho, {cls: 'ch-live'}); }); }, 60000);
