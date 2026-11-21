/* ---------- redrawn props ----------
   Same props as before (names, sizes and groups unchanged, so captions still match), drawn so they read at a glance:
   a clear silhouette, a lit side and a shaded side, a rim or top where it has one, and the details that make the thing
   what it is. Coordinates as before: (0,0) bottom-left, up is negative. */
{
const dk = (col, k = .22) => sc2Shade(col, k), lt = (col, k = .3) => sc2Tint(col, k);
const el = (cx, cy, rx, ry, f, ex = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${ex}/>`;
const no = ' stroke="none"', hl = (x, y, h, w = 2) => rc(x, y, w, h, '#fff', 1, ' opacity=".45"');
const st = (col, w = 2) => ` stroke="${col}" stroke-width="${w}" stroke-linecap="round" fill="none"`;
// a cylinder standing on the ground: body, shaded right side, top ellipse
const cyl = (x, w, h, col, top) => rc(x, -h, w, h, col, 2) + rc(x + w * .62, -h, w * .38, h, dk(col, .18), 0, no) + el(x + w / 2, -h, w / 2, w * .16, top || lt(col, .25));
const D = {
  // ---- drinks ----
  mug: c => cyl(0, 22, 26, c.a2, '#5a321b') + el(11, -26, 9, 2.6, '#6b3a1e', no) + pa('M22 -21 q10 -1 10 7 q0 8 -10 7', 'none', st(dk(c.a2, .1), 4)) + hl(3, -23, 18) + steam(5, -32),
  latte: c => pa('M0 -40 L22 -40 L19 0 L3 0z', '#f6f1e8') + pa('M2.05 -26 L19.95 -26 L19 0 L3 0z', '#a8714a', no) + pa('M1.05 -33 L20.95 -33 L19.95 -26 L2.05 -26z', '#ecdcc4', no) +
    rc(4, -37, 6, 6, '#fff', 1, ' stroke="#cfc6b6" stroke-width=".6"') + rc(11, -32, 6, 6, '#fff', 1, ' stroke="#cfc6b6" stroke-width=".6"') + pa('M-1 -40 h24 v-2 q-12 -5 -24 0z', '#fbf8f2') + ln(14, -54, 12, -40, c.a1, 3.5) +
    pa('M0 -40 L22 -40 L19 0 L3 0z', 'none', ' stroke="rgba(20,16,12,.7)" stroke-width="1.4" stroke-linejoin="round"') + hl(3.5, -38, 30, 1.5),
  boba: c => pa('M0 -40 L22 -40 L19 0 L3 0z', '#e9c79f') + pa('M.4 -36 L21.6 -36 L22 -40 L0 -40z', '#f6efe3', no) + [[6, -3], [11, -3], [16, -3], [8.5, -7.4], [13.5, -7.4], [16.2, -7.4]].map(([x, y]) => ci(x, y, 2.3, '#2f1d12', no)).join('') +
    ln(13, -56, 11, -40, '#2c2c2a', 4.5) + pa('M0 -40 L22 -40 L19 0 L3 0z', 'none', ' stroke="rgba(20,16,12,.7)" stroke-width="1.4" stroke-linejoin="round"') + hl(3.5, -34, 22, 1.5),
  matcha: c => cyl(0, 28, 22, '#f1ece2', '#7fb35a') + pa('M9 -22 q5 -3 10 0 q-5 2 -10 0z', '#d9ecc4', no) + pa('M28 -18 q8 0 8 6 q0 6 -8 6', 'none', st('#d8d0c2', 3.5)),
  energy: c => cyl(0, 14, 34, c.a1, '#c9ccd1') + rc(0, -26, 14, 11, '#15171c', 0) + tx(7, -18.5, 'ZAP', 6, '#fff') + hl(2, -32, 28, 1.5),
  energy3: c => cyl(0, 14, 34, c.a1, '#c9ccd1') + cyl(15, 14, 30, c.a2, '#c9ccd1') + pa('M30 0 L44 0 L44 -14 L41 -18 L44 -22 L42 -26 L30 -26 L32 -20 L29 -14z', c.a1) + el(37, -26, 6, 2, '#c9ccd1') + rc(39, -26, 5, 26, dk(c.a1, .2), 0, no),
  water: c => rc(1, -40, 14, 40, lt(c.a3, .1), 6) + rc(10, -40, 5, 40, dk(c.a3, .12), 0, no) + rc(1, -26, 14, 10, '#fff', 0, ' opacity=".55"') + rc(3, -47, 10, 8, '#2c2c2a', 2) + hl(3, -36, 30, 1.5),
  tea: c => el(14, -1.5, 15, 2.5, '#f1ece2') + pa('M2 -22 h22 v9 q0 11 -11 11 q-11 0 -11 -11z', '#f6f2ea') + el(13, -22, 11, 2.6, '#b5793c', no) + pa('M24 -18 q7 0 7 5 q0 5 -7 5', 'none', st('#d8d0c2', 3)) +
    ln(16, -22, 26, -38, '#c9a26a', 1) + rc(23, -42, 7, 7, '#e9b44c', 1),
  soda: c => cyl(0, 14, 26, '#d0342c', '#c9ccd1') + pa('M0 -14 q4 -4 7 0 t7 0', 'none', st('#fff', 1.6)) + hl(2, -24, 20, 1.5),
  // ---- food ----
  ramen: c => pa('M0 -26 h30 l-3 26 h-24z', '#f4f1ea') + pa('M20 -26 h10 l-3 26 h-9z', '#e2ddd2', no) + rc(0, -30, 30, 5, '#d24a3a', 1) + pa('M6 -30 q4 -6 8 0 q4 -6 8 0', 'none', st('#f2d27a', 2)) +
    pa('M18 -30 l14 -10 l2 3 l-12 8z', '#e9e4da') + ln(10, -27, 24, -50, '#c9a26a', 2) + ln(14, -27, 27, -49, '#c9a26a', 2) + tx(15, -10, 'NOODLE', 5, '#d24a3a'),
  pizza: c => pa('M0 0 L34 0 L17 -22z', '#f5c34e') + pa('M-1 0 L35 0 L35 -4 L-1 -4z', '#d08a3a') + ci(12, -8, 3.2, '#c0392b', no) + ci(21, -10, 3, '#c0392b', no) + ci(17, -16, 2.4, '#c0392b', no) + pa('M8 -4 q1 5 2 0', '#f5c34e', no),
  takeout: c => pa('M3 -26 L31 -26 L27 0 L7 0z', '#f4f1ea') + pa('M3 -26 L9 -33 L25 -33 L31 -26z', '#e6e0d3') + pa('M8 -33 q9 -14 18 0', 'none', st('#8a8a8a', 1.2)) + ci(17, -16, 4.5, '#c0392b', no) + pa('M22 -26 L31 -26 L27 0 L22 0z', '#ddd6c7', no),
  snacks: c => pa('M3 -34 h24 l-1 4 l2 26 l-1 4 h-24 l-1 -4 l2 -26z', c.a1) + pa('M21 -30 h5 l2 26 l-1 4 h-6z', dk(c.a1, .15), no) + pa('M3 -34 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2', 'none', st(dk(c.a1, .2), 1)) +
    el(15, -16, 8, 7, '#f2d27a') + pa('M10 -17 q5 -4 10 0', 'none', st('#d4a83a', 1)) + tx(15, -26, 'CHIPS', 4.6, '#fff'),
  cookies: c => el(18, -2, 18, 3, '#f1ece2') + [6, 18, 30, 12, 24].map((x, k) => el(x, -6 - (k > 2) * 4, 6, 3.4, '#c58a4a') + ci(x - 1.5, -6.5 - (k > 2) * 4, 1, '#3b2416', no) + ci(x + 2, -5.5 - (k > 2) * 4, .9, '#3b2416', no)).join(''),
  donut: c => el(14, -7, 14, 7, '#d49a55') + pa('M1.5 -9 q0 -7 12.5 -7 q12.5 0 12.5 7 q-2 2 -3 0.5 q-2 2.5 -4 1 q-2 2 -5 1 q-3 1.5 -5 -.5 q-2 1.5 -4 -.5 q-2 1.5 -4 -1.5z', '#f39bbf') +
    el(14, -10, 4.2, 2, '#b8783a', no) + [[6, -12, '#7ec8e3', 20], [20, -13, '#fdd835', -30], [22, -9.5, '#fff', 10], [8, -9, '#81c784', -15], [12, -14.5, '#e57373', 40], [17, -8.6, '#7ec8e3', -10]].map(([x, y, f, a]) => rc(x, y, 2.6, 1, f, .5, ` stroke="none" transform="rotate(${a} ${x} ${y})"`)).join(''),
  sandwich: c => pa('M0 0 L32 0 L4 -24z', '#e9c27a') + pa('M2 -2 L28 -2 L5 -20z', '#f6e3b5') + pa('M3 -3 q6 -2 12 0 q6 -2 12 0 L26 -4 L4 -4z', '#7cb342', no) + pa('M4 -7 L18 -7 L6 -14z', '#e57368', no) ,
  fruit: c => pa('M10 -1 q-11 0 -10 -11 q1 -9 10 -7 q9 -2 10 7 q1 11 -10 11z', '#d13b30') + pa('M10 -18 q-1 -5 2 -8', 'none', st('#5d3b25', 2)) + pa('M12 -22 q6 -5 9 0 q-5 3 -9 0z', '#6ab04c') + ci(5, -12, 2.4, '#fff', ' opacity=".55"'),
  banana: c => pa('M2 -14 Q17 10 33 -14 Q17 -5 2 -14z', '#f6d64a') + pa('M5 -11 Q17 4 30 -11', 'none', st('#d4ac2a', 1)) + pa('M2 -14 Q17 -5 33 -14 Q17 -8 2 -14z', '#e9c234', no) +
    pa('M33 -14 l3 -4 l1.6 1 l-2.8 4.4z', '#6b4a2a') + ci(2, -14, 1.7, '#5d3b25', no),
  candy: c => [[4, -5, c.a1], [16, -5, '#f2d14e'], [28, -5, c.a3], [10, -12, '#e57373'], [22, -12, c.a2]].map(([x, y, f]) => pa(`M${x - 8} ${y - 3} l3 3 l-3 3z M${x + 8} ${y - 3} l-3 3 l3 3z`, f) + el(x, y, 5, 3.6, f) + ln(x - 2, y - 2, x + 2, y + 2, '#fff', 1, ' opacity=".6"')).join(''),
  cereal: c => pa('M0 -14 h34 q0 14 -17 14 q-17 0 -17 -14z', c.a3) + el(17, -14, 17, 3.4, '#fbf8f1') + [5, 10, 15, 20, 25, 29, 12, 22].map((x, k) => ci(x + 1, -14.5 - (k > 5) * 1.5, 2, ['#e8a33d', '#d9534f', '#f2d14e', '#7cb342'][k % 4], no)).join('') + ln(24, -14, 36, -28, '#c9ccd1', 2.5),
  // ---- study ----
  notebook: c => pa('M0 0 L25 -3 L25 -12 L1 -9z', '#fbf9f4') + pa('M27 -3 L52 0 L51 -9 L27 -12z', '#fbf9f4') + [-5.5, -8].map(y => ln(3, y + 2, 23, y - 1, '#9fb4d0', .8) + ln(29, y - 1, 49, y + 2, '#9fb4d0', .8)).join('') +
    [0, 1, 2, 3, 4].map(k => ci(26, -3.5 - k * 2, 1.2, 'none', ' stroke="#777" stroke-width=".9"')).join('') + pa('M0 0 L25 -3 L27 -3 L52 0z', c.a1),
  notes: c => [0, 1, 2].map(k => pa(`M${k * 2} ${-k * 3} L${34 + k * 2} ${-k * 3 - 1} L${33 + k * 2} ${-k * 3 - 4} L${-1 + k * 2} ${-k * 3 - 3}z`, k === 2 ? '#fff' : '#f1ede4')).join('') + ln(8, -8.5, 30, -9.3, '#9fb4d0', .8) + rc(26, -12, 4, 4, '#c0392b', 1, ' transform="rotate(20 28 -10)"'),
  textbook: c => rc(0, -16, 42, 16, c.a2, 2) + rc(2, -13, 39, 10, '#f6f2e8', 1) + [0, 1, 2, 3].map(k => ln(3, -11 + k * 2.4, 40, -11 + k * 2.4, '#d9d2c3', .7)).join('') + rc(0, -16, 42, 3, dk(c.a2, .15), 1) + rc(0, -3, 42, 3, dk(c.a2, .15), 1),
  books: c => rc(3, -10, 36, 10, c.a1, 2) + rc(5, -8, 2, 6, '#f2c14e', 0, no) + rc(0, -21, 40, 11, c.a2, 2) + rc(34, -19, 4, 7, '#f6f2e8', 0, no) + rc(5, -31, 32, 10, c.a3, 2) + rc(9, -28, 18, 2, '#fff', 1, ' opacity=".6"'),
  bookopen: c => pa('M0 -2 q11 -9 22 -3 q11 -6 22 3 v-12 q-11 -8 -22 -3 q-11 -5 -22 3z', '#fbf8f0') + pa('M0 -2 q11 -9 22 -3 q11 -6 22 3 v2 q-11 -7 -22 -2 q-11 -5 -22 2z', c.a2) +
    [0, 1, 2].map(k => pa(`M4 ${-8 - k * 2.4} q7 -4 15 -2 M25 ${-6 - k * 2.4 - 2} q7 -2 15 2`, 'none', st('#b8b2a4', .7))).join('') + ln(22, -5, 22, -17, '#d8d2c4', 1),
  flashcards: c => [0, 1, 2].map(k => `<g transform="rotate(${[-6, 4, -1][k]} 17 ${-6 - k * 3})">${rc(3, -11 - k * 3, 28, 9, '#fff', 1)}${ln(5, -8.5 - k * 3, 29, -8.5 - k * 3, '#e57373', .7)}</g>`).join('') + tx(17, -10.5, 'Q?', 4.5, '#555'),
  highlighters: c => ['#f2e14e', '#f48fb1', '#81d4fa'].map((f, k) => `<g transform="translate(${k * 3} ${-k * 5})">${rc(0, -6, 26, 6, f, 2)}${rc(18, -6, 8, 6, dk(f, .15), 1)}${pa('M26 -5.5 l5 1.5 v2 l-5 1.5z', dk(f, .35))}</g>`).join(''),
  pens: c => cyl(1, 18, 18, c.a3, dk(c.a3, .35)) + ln(5, -18, 2, -36, '#2a5bd7', 2.2) + ln(9, -18, 10, -38, '#2c2c2a', 2.2) + ln(13, -18, 17, -34, '#d32f2f', 2.2) + rc(1, -33, 2.6, 4, '#f6f6f6', 1, no),
  pencil: c => rc(0, -6, 28, 6, '#f2c14e', 1) + rc(0, -6, 28, 2, lt('#f2c14e', .3), 0, no) + rc(-5, -6, 5, 6, '#e98f9b', 1) + rc(-1, -6, 2, 6, '#b8b8b8', 0) + pa('M28 -6 l7 3 l-7 3z', '#efd9a8') + pa('M33 -3.8 l2 .8 l-2 .8z', '#333', no),
  sticky: c => [0, 1, 2, 3].map(k => rc(0, -4 - k * 1.5, 24, 1.5, k % 2 ? '#f2d14e' : '#f9e27a', 0, no)).join('') + pa('M0 -9 L24 -9 L24 -26 L0 -26z', '#fbe88a') + pa('M18 -9 L24 -9 L24 -14z', '#e9cf5a') + ln(4, -20, 18, -20, '#8a7a3a', .8) + ln(4, -16, 14, -16, '#8a7a3a', .8),
  planner: c => rc(0, -9, 36, 9, c.a1, 3) + rc(2, -3, 32, 2, '#f6f2e8', 0, no) + rc(26, -10, 3, 11, '#2c2c2a', 0) + pa('M10 0 v5 l2 -2 l2 2 v-5z', '#f2c14e'),
  calculator: c => `<g transform="rotate(-8 9 0)">${rc(0, -36, 20, 36, '#2f3236', 3)}${rc(3, -32, 14, 9, '#a7b98f', 1)}${ln(4.5, -27, 15, -29, '#4a5a3a', .8)}${[...Array(12)].map((_, k) => rc(3 + (k % 3) * 5, -20 + Math.floor(k / 3) * 4.4, 3.6, 2.8, k === 11 ? '#4a90d9' : '#5d6168', .8, no)).join('')}</g>`,
  ruler: c => pa('M0 -4 L44 -6 L44 -1 L0 0z', '#efd9a0') + [...Array(11)].map((_, k) => ln(2 + k * 4, -3.9 - k * .2, 2 + k * 4, -2.4 - k * .2 - (k % 2 ? 0 : -.8), '#7a5a2a', .6)).join(''),
  binder: c => rc(0, -36, 30, 36, c.a2, 2) + rc(0, -36, 6, 36, dk(c.a2, .25), 1) + rc(10, -28, 16, 9, '#fff', 1) + ln(12, -24.5, 24, -24.5, '#999', .8) + [9, 18, 27].map(y => ci(3, -y, 1.6, '#d9d9d9', no)).join(''),
  pset: c => pa('M0 -1 L36 -4 L37 -12 L1 -9z', '#fff') + [0, 1, 2].map(k => ln(3, -3.4 - k * 2, 28, -5.6 - k * 2, '#8a8a8a', .6)).join('') + pa('M29 -7 l2 2 l4 -5', 'none', st('#d32f2f', 1.3)) + tx(10, -10.5, 'Pset 4', 3.5, '#555')
};
Object.entries(D).forEach(([k, d]) => { if (SC.PROP[k]) SC.PROP[k].d = d; });

const D2 = {
  // ---- tech ----
  laptop: c => pa('M7 -42 h42 a2 2 0 0 1 2 2 v32 h-46 v-32 a2 2 0 0 1 2 -2z', '#3a3d44') + rc(9.5, -39.5, 37, 29, c.scr, 1) + pa('M9.5 -39.5 h37 l-37 18z', '#fff', ' opacity=".25" stroke="none"') +
    pa('M0 0 L56 0 L51 -8 L5 -8z', '#c9ccd1') + pa('M22 -3 h12 l-1 -2 h-10z', '#9ea3aa', no),
  laptopcode: c => pa('M7 -42 h42 a2 2 0 0 1 2 2 v32 h-46 v-32 a2 2 0 0 1 2 -2z', '#3a3d44') + rc(9.5, -39.5, 37, 29, '#1e1e2e', 1) +
    [[12, 18, '#c792ea'], [15, 22, '#82aaff'], [15, 14, '#c3e88d'], [18, 20, '#f78c6c'], [12, 10, '#89ddff'], [15, 24, '#c3e88d']].map(([x, w, f], k) => rc(x, -36 + k * 4.2, w, 2, f, 1, no)).join('') +
    pa('M0 0 L56 0 L51 -8 L5 -8z', '#c9ccd1') + pa('M22 -3 h12 l-1 -2 h-10z', '#9ea3aa', no),
  tablet: c => `<g transform="rotate(-10 15 0)">${rc(0, -42, 32, 42, '#2f3236', 4)}${rc(2.5, -39.5, 27, 37, '#fbfaf6', 1)}${[0, 1, 2, 3].map(k => pa(`M5 ${-34 + k * 7} q4 -3 8 0 t8 0 t6 -1`, 'none', st('#3b6fd8', 1))).join('')}${ln(28, -44, 33, -20, '#e9e9e9', 2.2)}</g>`,
  phone: c => rc(0, -30, 16, 30, '#1f2125', 3.5) + rc(1.6, -28.4, 12.8, 26.8, c.scr, 2) + rc(3.5, -25, 4, 4, c.a1, 1, no) + rc(9, -25, 4, 4, c.a3, 1, no) + rc(3.5, -19, 4, 4, c.a2, 1, no) + rc(6, -29.5, 4, 1, '#000', .5, no),
  monitor: c => rc(0, -48, 60, 38, '#2c2e33', 3) + rc(3, -45, 54, 31, c.scr, 1) + rc(6, -41, 26, 4, '#fff', 1, ' opacity=".6" stroke="none"') + rc(6, -34, 40, 2, '#fff', 1, ' opacity=".5" stroke="none"') + rc(6, -30, 32, 2, '#fff', 1, ' opacity=".5" stroke="none"') +
    pa('M26 -10 h8 l2 8 h-12z', '#3a3d44') + rc(17, -3, 26, 3, '#3a3d44', 1.5),
  headphones: c => pa('M4 -9 q0 -24 13 -24 q13 0 13 24', 'none', st(dk(c.a1, .15), 3.5)) + rc(0, -15, 8, 13, c.a1, 3) + rc(26, -15, 8, 13, c.a1, 3) + rc(2, -13, 3, 9, dk(c.a1, .35), 1.5, no) + rc(29, -13, 3, 9, dk(c.a1, .35), 1.5, no),
  earbuds: c => `<g transform="rotate(70 21 -10)">${rc(0, -15, 22, 6, '#f2f2f2', 3)}${rc(2, -11, 18, 1.6, '#d6d6d6', .8, ' stroke="none"')}</g>` + rc(0, -10, 22, 10, '#f6f6f6', 5) + el(11, -10, 9.2, 2, '#2f3236', no) +
    rc(5.2, -15, 3.2, 6, '#fff', 1.4) + ci(6.8, -15.6, 2.6, '#fff') + rc(13.6, -15, 3.2, 6, '#fff', 1.4) + ci(15.2, -15.6, 2.6, '#fff') + ci(11, -4, 1, '#7ad37a', no),
  keyboard: c => pa('M0 0 L56 0 L54 -10 L2 -10z', '#33363c') + [...Array(3)].map((_, row) => [...Array(11 - row)].map((_, k) => rc(4 + row * 2 + k * 4.6, -8.6 + row * 2.6, 3.8, 2, (k + row) % 5 === 2 ? c.a1 : '#e6e6e6', .6, no)).join('')).join('') + rc(16, -1.6, 22, 1.2, '#e6e6e6', .5, no),
  mouse: c => pa('M0 0 q0 -11 11 -11 q11 0 11 11z', '#4a4d54') + ln(11, -11, 11, -5, '#2a2c30', .9) + rc(9.8, -9, 2.4, 3, '#9ea3aa', 1, no) + pa('M2 -2 q2 -7 8 -8', 'none', st('#fff', 1)).replace('fill="none"', 'fill="none" opacity=".35"'),
  charger: c => rc(0, -9, 10, 9, '#f4f4f4', 2) + rc(2, -11.5, 2, 3, '#bdbdbd', .5) + rc(6, -11.5, 2, 3, '#bdbdbd', .5) + pa('M10 -4 q6 -8 11 -2 t10 -1 q5 -6 9 0 q-6 6 -11 2', 'none', st('#f4f4f4', 2)) + pa('M10 -4 q6 -8 11 -2 t10 -1 q5 -6 9 0 q-6 6 -11 2', 'none', st('#bdbdbd', .6)),
  controller: c => pa('M3 -3 q-5 -14 8 -14 h12 q13 0 8 14 q-3 5 -8 1 l-3 -3 h-6 l-3 3 q-5 4 -8 -1z', '#3a3d44') + rc(7, -12, 2, 6, '#c9ccd1', .5, no) + rc(5, -10, 6, 2, '#c9ccd1', .5, no) +
    ci(24, -12, 1.4, '#e57373', no) + ci(27, -9.5, 1.4, '#64b5f6', no) + ci(21, -9.5, 1.4, '#81c784', no) + ci(24, -7, 1.4, '#ffd54f', no),
  // ---- decor ----
  lamp: c => el(12, -2, 12, 3, '#2f3236') + pa('M10 -3 L5 -32', 'none', st('#2f3236', 3)) + pa('M5 -32 L22 -46', 'none', st('#2f3236', 3)) + ci(5, -32, 2.4, '#55595f') +
    pa('M16 -50 L32 -42 L26 -33 L13 -41z', c.a1) + pa('M26 -33 L13 -41 L16 -40 L26 -35z', dk(c.a1, .25), no) + pa('M26 -33 q-4 4 -11 -6', '#fff3b0', ' opacity=".85" stroke="none"'),
  plant: c => pa('M3 -14 h17 l-2.5 14 h-12z', '#c97b4a') + rc(2, -16, 19, 4, dk('#c97b4a', .12), 1) + pa('M11.5 -16 q-13 -8 -9 -22 q10 6 9 22z', '#4c9a5c') + pa('M11.5 -16 q12 -10 7 -24 q-9 8 -7 24z', '#5fb06c') + pa('M11.5 -16 q-1 -14 2 -20', 'none', st('#2e6b3c', 1)),
  succulent: c => pa('M2 -8 h16 l-2 8 h-12z', '#e8dcc8') + [[-50, '#7fb08a'], [-20, '#94c4a0'], [10, '#7fb08a'], [40, '#94c4a0'], [-35, '#a8d4b2'], [25, '#a8d4b2']].map(([a, f]) => `<ellipse cx="10" cy="-14" rx="2.8" ry="6" fill="${f}" transform="rotate(${a} 10 -9)"/>`).join('') + ci(10, -12, 2.5, '#c7e6cf'),
  cactus: c => pa('M2 -10 h13 l-2 10 h-9z', '#c97b4a') + rc(1, -12, 15, 3, dk('#c97b4a', .12), 1) + rc(5, -30, 7, 19, '#5aa469', 3.5) + pa('M5 -20 h-2 a2 2 0 0 1 -2 -2 v-5 a1.5 1.5 0 0 1 3 0 v3 h1z', '#5aa469') + pa('M12 -24 h2 a2 2 0 0 0 2 -2 v-4 a1.5 1.5 0 0 0 -3 0 v2 h-1z', '#5aa469') +
    [[7, -27], [10, -22], [7, -16]].map(([x, y]) => ln(x, y, x + .8, y - .8, '#2e6b3c', .8)).join('') + ci(8.5, -31, 1.8, '#f48fb1', no),
  monstera: c => pa('M10 -14 h20 l-3 14 h-14z', '#e8dcc8') + rc(9, -16, 22, 4, '#d8ccb4', 1) +
    pa('M20 -15 q-22 -12 -14 -36 q18 4 14 36z', '#2f8a4a') + pa('M20 -15 q22 -14 14 -40 q-18 8 -14 40z', '#3a9d58') + pa('M20 -15 q-4 -20 2 -36', 'none', st('#1e5e33', 1)) +
    pa('M11 -38 l5 3 M9 -30 l6 2 M30 -42 l-6 4 M32 -32 l-6 3', 'none', st('#efe9dc', 1.6)),
  candle: c => rc(1, -18, 14, 18, '#f4ede0', 2) + rc(10, -18, 5, 18, '#e2d8c6', 0, no) + el(8, -18, 7, 2, '#fbf6ec') + ln(8, -18, 8, -22, '#2c2c2a', 1) + pa('M8 -31 q4.5 5 0 9 q-4.5 -4 0 -9z', '#ffb547') + pa('M8 -28 q2 2.5 0 5 q-2 -2.5 0 -5z', '#fff3b0', no) + ci(8, -26, 9, '#ffd27a', ' opacity=".18" stroke="none"'),
  lavalamp: c => pa('M3 -6 L6 -34 h6 L15 -6z', lt(c.a1, .15)) + ci(9, -14, 3.4, '#ffb347', no) + ci(10, -24, 2.4, '#ffb347', no) + el(8, -30, 1.8, 2.4, '#ffb347', no) + pa('M1 0 L4 -7 h10 L17 0z', '#8a8f96') + pa('M5 -34 h8 l-1 -4 h-6z', '#8a8f96'),
  clock: c => rc(3, -3, 3, 3, '#555', 1) + rc(18, -3, 3, 3, '#555', 1) + ci(12, -14, 11, c.a2) + ci(12, -14, 8.5, '#fbf9f4') + ci(5, -25, 3, c.a2) + ci(19, -25, 3, c.a2) +
    ln(12, -14, 12, -20, '#2c2c2a', 1.4) + ln(12, -14, 16, -12, '#2c2c2a', 1.4) + [0, 90, 180, 270].map(a => `<line x1="12" y1="-21.5" x2="12" y2="-20.3" stroke="#555" stroke-width="1" transform="rotate(${a} 12 -14)"/>`).join(''),
  photo: c => `<g transform="rotate(-6 10 0)">${rc(0, -26, 22, 26, '#fff', 1)}${rc(2.5, -23.5, 17, 16, c.a3, 0)}${ci(8, -15, 3, '#fff3b0', no)}${pa('M2.5 -7.5 l6 -6 l4 4 l3 -3 l4 5z', dk(c.a3, .3), no)}</g>`,
  frame: c => pa('M4 0 l3 -8', 'none', st('#4a2f1e', 2)) + rc(0, -28, 24, 26, '#6b4429', 2) + rc(3, -25, 18, 20, '#fbf8f0', 1) + ci(9, -18, 3, c.a1, no) + ci(15, -18, 3, c.a2, no) + pa('M5 -6 q4 -8 7 -6 q3 -2 7 6z', c.a3, no),
  figurine: c => el(8, -1, 7, 1.8, '#555') + rc(4, -16, 8, 15, c.a2, 3) + ci(8, -20, 5, '#f1c9a5') + pa('M3 -21 q5 -8 10 0 q-2 -3 -5 -3 q-3 0 -5 3z', '#2c2c2a') + ci(6.3, -20, .8, '#222', no) + ci(9.7, -20, .8, '#222', no) + rc(1, -14, 3, 7, c.a2, 1.5) + rc(12, -14, 3, 7, c.a2, 1.5),
  duck: c => pa('M1 -6 q0 -8 10 -7 q4 -8 9 -4 q3 3 -1 6 q4 1 3 6 q-1 5 -11 5 q-10 0 -10 -6z', '#f6d743') + pa('M20 -12 l6 1 l-6 2.5z', '#f08a24') + ci(16, -14, 1.2, '#222', no) + pa('M6 -7 q4 3 9 0', 'none', st('#d4b52a', 1)),
  stressball: c => ci(9, -9, 9, c.a1) + pa('M3 -14 q5 3 12 0', 'none', st(dk(c.a1, .2), 1)) + ci(6, -11, 1.2, '#222', no) + ci(12, -11, 1.2, '#222', no) + pa('M6 -6.5 q3 2.5 6 0', 'none', st('#222', 1)) + ci(5, -13, 2, '#fff', ' opacity=".5" stroke="none"'),
  crystal: c => pa('M7 -20 L13 -9 L10 0 H4 L1 -9z', '#c4b5fd') + pa('M7 -20 L7 0 M1 -9 L13 -9', 'none', st('#8b78e6', .8)) + pa('M7 -20 L13 -9 L10 0 H7z', '#a796f2', no) + pa('M4 -12 l2 -4', 'none', st('#fff', 1)),
  // ---- music ----
  vinyl: c => rc(0, -10, 46, 10, '#6b4429', 2) + rc(0, -10, 46, 2.5, lt('#6b4429', .15), 1, no) + el(18, -11, 15, 3.5, '#1d1d1f') + el(18, -11, 5, 1.2, c.a1, no) + pa('M38 -10 L38 -16 L28 -12', 'none', st('#c9ccd1', 1.6)) + ci(38, -16, 1.8, '#9ea3aa') + ci(42, -5, 1.5, '#e57373', no),
  guitar: c => rc(9, -72, 5, 46, '#5d3b25', 1) + rc(7.5, -78, 8, 7, '#4a2f1e', 2) + [-76, -73].map(y => ci(6.5, y, 1, '#c9ccd1') + ci(16.5, y, 1, '#c9ccd1')).join('') +
    pa('M11.5 -40 q-9 0 -9 9 q0 5 3 7 q-6 3 -6 10 q0 12 12 12 q12 0 12 -12 q0 -7 -6 -10 q3 -2 3 -7 q0 -9 -9 -9z', '#d08a46') + ci(11.5, -22, 4, '#3b2416', no) + rc(7, -10, 9, 2.5, '#3b2416', 1, no) +
    [10.5, 12.5].map(x => ln(x, -70, x, -9, '#eee', .4)).join(''),
  headset: c => ln(15, 0, 15, -40, '#2c2c2a', 2.4) + pa('M8 0 l7 -6 l7 6', 'none', st('#2c2c2a', 2)) + pa('M0 -62 h30 v20 h-30z', '#2c2c2a') + rc(2, -61, 26, 18, '#fbf9f2', 0) +
    [0, 1, 2].map(k => [0, 1, 2, 3, 4].map(j => ln(4, -58 + k * 6 + j * 1.1, 26, -58 + k * 6 + j * 1.1, '#999', .3)).join('') + ci(8 + k * 6, -56 + k * 6, 1.2, '#222', no) + ln(9.2, -56 + k * 6, 9.2, -60 + k * 6, '#222', .6)).join(''),
  // ---- med ----
  stetho: c => pa('M4 -16 q0 14 12 12 q12 -2 10 -12', 'none', st('#2f3236', 2.4)) + ci(4, -17, 2, '#9ea3aa') + ci(26, -17, 2, '#9ea3aa') + pa('M16 -4 q4 4 12 4', 'none', st('#2f3236', 2.4)) + ci(31, -2, 4.5, '#c9ccd1') + ci(31, -2, 2.4, '#9ea3aa', no),
  medcards: c => [0, 1].map(k => `<g transform="rotate(${k ? 5 : -4} 15 -6)">${rc(k * 2, -12 - k * 3, 28, 11, '#eaf6ff', 1)}${rc(k * 2, -12 - k * 3, 28, 2.5, '#4a90d9', 0, no)}</g>`).join('') + tx(16, -9, 'Rx', 5, '#4a90d9'),
  skeleton: c => rc(5, -2, 6, 2, '#8a8f96', 1) + ln(8, -2, 8, -8, '#8a8f96', 1.4) + ci(8, -32, 4.5, '#ece6d6') + ci(6.5, -32.5, .9, '#555', no) + ci(9.5, -32.5, .9, '#555', no) +
    ln(8, -27.5, 8, -14, '#cfc5ae', 2) + [-25, -22.5, -20].map(y => pa(`M3.5 ${y} q4.5 -2 9 0`, 'none', st('#cfc5ae', 1.4))).join('') + pa('M8 -26 L3 -18 M8 -26 L13 -18 M8 -14 L5 -6 M8 -14 L11 -6', 'none', st('#cfc5ae', 1.8)),
  // ---- lab ----
  goggles: c => pa('M2 -4 q-3 -8 4 -9 h18 q7 1 4 9 q-2 3 -6 1 l-3 -2 h-8 l-3 2 q-4 2 -6 -1z', '#d4ecf5', ' fill-opacity=".9"') + pa('M2 -4 q-3 -8 4 -9 h18 q7 1 4 9 q-2 3 -6 1 l-3 -2 h-8 l-3 2 q-4 2 -6 -1z', 'none', st('#2f3236', 1.6)) +
    pa('M0 -9 h-2 M30 -9 h2', 'none', st('#2f3236', 2)) + pa('M6 -10 l3 -1', 'none', st('#fff', 1)),
  beaker: c => pa('M3 -28 h14 v6 l2 22 h-18 l2 -22z', '#e6f2f5') + pa('M1.6 -12 h16.8 l.6 12 h-18z', lt(c.a1, .2), no) + pa('M1 -28 h18 l-1 -2 h-16z', '#e6f2f5') + [-22, -18, -14].map(y => ln(14, y, 17, y, '#8aa', .8)).join('') + hl(4, -26, 20, 1.5),
  flask: c => pa('M8 -30 h7 v10 l9 20 h-25 l9 -20z', '#e6f2f5') + pa('M3.5 -10 h16 l4.5 10 h-25z', c.a3, no) + rc(7, -33, 9, 3.5, '#c9a26a', 1) + ci(10, -6, 1.4, '#fff', ' opacity=".7" stroke="none"') + ci(14, -4, 1, '#fff', ' opacity=".7" stroke="none"') + hl(9.5, -28, 10, 1.4),
  testtubes: c => rc(0, -12, 32, 3.5, '#8a5a33', 1) + rc(0, -3, 32, 3, '#8a5a33', 1) + rc(1, -12, 2.4, 12, '#6b4429', 0) + rc(28.6, -12, 2.4, 12, '#6b4429', 0) +
    [[5, '#e57373'], [12, '#64b5f6'], [19, '#81c784'], [26, '#ffd54f']].map(([x, f]) => rc(x - 2.5, -26, 5, 22, '#eef6f8', 2.5) + rc(x - 2.5, -14, 5, 10, f, 2.5, no)).join('') + rc(0, -12, 32, 3.5, '#8a5a33', 1),
  molkit: c => pa('M7 -7 L16 -18 L26 -8 M16 -18 L16 -28', 'none', st('#9ea3aa', 2)) + ci(7, -7, 5, '#2f3236') + ci(26, -8, 5, '#e53935') + ci(16, -18, 5.5, '#2f3236') + ci(16, -28, 3.6, '#f6f6f6') + [[5, -9], [24, -10], [14, -20], [15, -29.5]].map(([x, y]) => ci(x, y, 1.2, '#fff', ' opacity=".5" stroke="none"')).join(''),
  // ---- art ----
  sketchbook: c => pa('M0 -1 L40 -3 L41 -12 L1 -10z', '#2c2c2a') + pa('M2 -3 L38 -5 L39 -11 L3 -9z', '#f6f3ec') + pa('M8 -5 q8 -6 14 -3 q6 2 12 -3', 'none', st('#555', 1)) + [3, 7, 11, 15, 19, 23, 27, 31, 35].map(x => ci(x + 1, -9.5 - x * .05, .8, '#bbb', no)).join(''),
  paints: c => rc(0, -8, 38, 8, '#f6f6f6', 2) + rc(0, -8, 38, 2, '#e2e2e2', 1, no) + ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'].map((f, k) => el(4 + k * 6, -4, 2.4, 1.6, f, no)).join('') + ln(28, -10, 44, -16, '#c9a26a', 1.6) + pa('M43 -15.5 l3 -1.5 l.5 1.5z', '#2c2c2a', no),
  brushes: c => pa('M2 -20 h16 l-1 20 h-14z', '#cfe8f0', ' fill-opacity=".85"') + rc(2.5, -9, 15, 9, '#8fb8c8', 0, ' stroke="none" opacity=".6"') +
    [[5, -40, '#c0392b', -8], [10, -42, '#2c2c2a', 0], [15, -38, '#f2c14e', 9]].map(([x, y, f, a]) => `<g transform="rotate(${a} ${x} -10)">${ln(x, -10, x, y + 6, '#c9a26a', 2)}${rc(x - 1.4, y + 2, 2.8, 4, '#c9ccd1', .5)}${pa(`M${x - 1.4} ${y + 2} q1.4 -6 2.8 0z`, f)}</g>`).join(''),
  // ---- sport ----
  dumbbell: c => rc(0, -14, 7, 14, '#2f3236', 2) + rc(27, -14, 7, 14, '#2f3236', 2) + rc(3, -12, 4, 10, '#4a4d54', 1, no) + rc(27, -12, 4, 10, '#4a4d54', 1, no) + rc(7, -9, 20, 4, '#9ea3aa', 1) + [10, 13, 16, 19, 22].map(x => ln(x, -9, x, -5, '#6b6f75', .6)).join(''),
  gymbag: c => pa('M2 -2 q-3 -10 2 -18 h36 q5 8 2 18z', c.a2) + pa('M4 -20 h36 q4 7 2 14 h-40 q-2 -7 2 -14z', dk(c.a2, .12), no) + ln(4, -18, 40, -18, dk(c.a2, .3), 1) + pa('M13 -20 q9 -12 18 0', 'none', st('#2c2c2a', 2.4)) +
    rc(16, -14, 12, 6, '#fff', 1, ' opacity=".8"') + rc(0, -14, 4, 8, dk(c.a2, .3), 2) + rc(40, -14, 4, 8, dk(c.a2, .3), 2),
  ball: c => ci(12, -12, 12, '#e07a2e') + pa('M0 -12 h24 M12 -24 v24 M3.5 -20.5 q6 8 0 17 M20.5 -20.5 q-6 8 0 17', 'none', st('#5a2d10', 1.1)) + ci(7, -17, 2.5, '#fff', ' opacity=".35" stroke="none"'),
  skateboard: c => pa('M2 -8 q-3 0 -2 -3 h48 q3 3 -2 3z', c.a1) + pa('M2 -8 h44 q4 0 4 -3 h-50 q-1 3 2 3z', dk(c.a1, .25), no) + rc(10, -7, 6, 2, '#9ea3aa', .5) + rc(34, -7, 6, 2, '#9ea3aa', .5) +
    [9, 17, 33, 41].map(x => ci(x, -3, 2.8, '#f2e6c8')).join(''),
  // ---- pets ----
  cat: c => pa('M30 -2 q8 -2 6 -12 q-1 -5 -4 -4', 'none', st(dk(c.pet, .1), 3.5)) + pa('M4 0 q-3 -16 10 -20 q12 -2 15 8 q2 8 0 12z', c.pet) + pa('M8 0 v-4 M22 0 v-4', 'none', st(dk(c.pet, .25), 1.2)) +
    ci(13, -24, 8, c.pet) + pa('M6.5 -28 l1 -9 l6 6z M19.5 -28 l-1 -9 l-6 6z', c.pet) + pa('M8 -30 l.7 -4.5 l2.7 2.8z M18 -30 l-.7 -4.5 l-2.7 2.8z', '#f4a3b8', no) +
    el(10, -24.5, 1.1, 1.6, '#2c2c2a', no) + el(16, -24.5, 1.1, 1.6, '#2c2c2a', no) + pa('M12 -21.5 l1 1 l1 -1z', '#f48fb1', no) + pa('M7 -21 l-5 -1 M7 -20 l-5 1 M19 -21 l5 -1 M19 -20 l5 1', 'none', st('#555', .5)),
  catsleep: c => el(19, -7, 18, 7.5, c.pet) + ci(31, -9, 6.5, c.pet) + pa('M27 -14 l1 -6 l4 4z M34 -14.5 l1.5 -5.5 l2.5 5z', c.pet) + pa('M28 -9.5 q1.5 1.2 3 0 M32.5 -9.5 q1.5 1.2 3 0', 'none', st('#2c2c2a', .9)) +
    pa('M2 -4 q-3 4 6 4 q10 0 16 -3', 'none', st(dk(c.pet, .12), 3.2)) + pa('M8 -12 q8 -4 16 0', 'none', st(dk(c.pet, .15), 1)) + tx(40, -18, 'z', 6, '#7a8aa8') + tx(44, -24, 'z', 4.5, '#7a8aa8'),
  dog: c => pa('M2 -2 q-1 -18 14 -18 h10 q8 0 8 10 v8z', c.pet) + rc(5, -6, 5, 6, c.pet, 2) + rc(25, -6, 5, 6, c.pet, 2) + pa('M2 -14 q-5 -2 -4 -8', 'none', st(c.pet, 3)) +
    ci(32, -26, 9, c.pet) + el(39, -23, 5.5, 4, lt(c.pet, .25)) + el(43, -24.5, 2, 1.6, '#2c2c2a', no) + ci(32, -28, 1.3, '#2c2c2a', no) + pa('M25 -32 q-6 2 -4 12 q4 -2 6 -8z', dk(c.pet, .3)) + pa('M38 -21 q2 4 -1 6', '#e57373', no) + rc(26, -19, 11, 2.5, c.a1, 1),
  hamster: c => pa('M1 0 q-2 -14 11 -14 q11 0 11 14z', '#e8b57a') + pa('M5 0 q6 -8 14 0z', '#f6e3c8', no) + ci(6, -13, 2.6, '#e8b57a') + ci(17, -13, 2.6, '#e8b57a') + ci(6, -13, 1.2, '#f4a3b8', no) + ci(17, -13, 1.2, '#f4a3b8', no) +
    ci(9, -8, 1.2, '#222', no) + ci(14, -8, 1.2, '#222', no) + ci(11.5, -6, .9, '#f48fb1', no),
  fishbowl: c => pa('M6 -26 h16 q8 6 8 14 q0 12 -15 12 q-15 0 -15 -12 q0 -8 6 -14z', '#d6eef8', ' fill-opacity=".85"') + pa('M0.4 -13 q14 3 29.2 0 q0 13 -14.6 13 q-14.6 0 -14.6 -13z', '#7ec4e6', ' stroke="none" opacity=".7"') +
    rc(5, -27.5, 18, 2.5, '#d6eef8', 1) + pa('M10 -9 q5 -5 10 0 q-5 5 -10 0z M20 -9 l4 -3 v6z', '#f08a24', no) + ci(12, -9.5, .8, '#222', no) + pa('M6 -2 q2 -4 0 -7 M24 -2 q-2 -5 1 -8', 'none', st('#4c9a5c', 1.4)) + ci(8, -18, 1.2, '#fff', ' stroke="none" opacity=".7"'),
  // ---- misc ----
  tissues: c => rc(0, -14, 28, 14, '#a7c7e7', 2) + rc(20, -14, 8, 14, dk('#a7c7e7', .12), 0, no) + pa('M2 -10 q6 -3 10 0 q4 3 8 0', 'none', st('#fff', 1)) + el(14, -14, 6, 1.6, '#6f8fae', no) + pa('M10 -14 q2 -10 4 -9 q3 -1 4 9z', '#fff'),
  pills: c => cyl(0, 14, 16, '#f08a24', '#f08a24') + rc(-.5, -21, 15, 5, '#fff', 1.5) + rc(2, -12, 10, 6, '#fff', 1, ' opacity=".85"') + ln(4, -9, 10, -9, '#f08a24', .8),
  keys: c => ci(6, -6, 5, 'none', st('#b0b0b0', 1.6)) + `<g transform="rotate(-10 10 -6)">${rc(9, -8, 6, 6, '#d9b45a', 1.5)}${rc(14, -6.4, 12, 2.6, '#d9b45a', .5)}${pa('M20 -3.8 v2 M23 -3.8 v1.4', 'none', st('#b8923a', 1))}</g>` + rc(2, -4, 7, 5, '#5f7a8a', 2),
  glasses: c => rc(0, -11, 13, 9, '#cfe3ef', 4, ' fill-opacity=".6"') + rc(17, -11, 13, 9, '#cfe3ef', 4, ' fill-opacity=".6"') + rc(0, -11, 13, 9, 'none', 4, st('#2c2c2a', 1.8)) + rc(17, -11, 13, 9, 'none', 4, st('#2c2c2a', 1.8)) +
    pa('M13 -8 q2 -2 4 0', 'none', st('#2c2c2a', 1.4)) + pa('M0 -9 l-4 6 M30 -9 l4 6', 'none', st('#2c2c2a', 1.4)),
  idcard: c => pa('M0 -1 L28 -3 L29 -18 L1 -16z', '#fbfbfb') + pa('M0 -1 L28 -3 L28.3 -6.5 L.3 -4.5z', c.a1, no) + pa('M3 -8 L10 -8.5 L10.4 -15 L3.4 -14.5z', '#c9b8a6') + ci(6.8, -12.8, 1.6, '#8a6a52', no) +
    ln(13, -11, 25, -12, '#999', .9) + ln(13, -8, 22, -8.8, '#bbb', .9) + tx(15, -2.6, 'STUDENT', 3, '#fff'),
  wallet: c => rc(0, -12, 28, 12, '#6b4429', 3) + rc(0, -12, 28, 4, dk('#6b4429', .2), 2, no) + pa('M16 -8 h12 v4 h-12 q-2 -2 0 -4z', '#5a3a24') + ci(19, -6, 1, '#d9b45a', no) + pa('M2 -12 h14 v-3 h-14z', '#7aa96a'),
  umbrella: c => pa('M7 -48 l7 32 q-7 3 -14 0z', c.a2) + pa('M7 -48 l2 32', 'none', st(dk(c.a2, .3), .8)) + ln(7, -16, 7, -3, '#2c2c2a', 1.6) + pa('M7 -3 q0 4 4 3', 'none', st('#2c2c2a', 2)) +
    [[3, -8], [11, -12], [4, -20]].map(([x, y]) => pa(`M${x} ${y} q1.5 2.5 0 3.5 q-1.5 -1 0 -3.5z`, '#7ec4e6', no)).join(''),
  tote: c => pa('M0 -24 h30 l-1 24 h-28z', '#ece2cf') + pa('M8 -24 q7 -14 14 0', 'none', st('#c9b48f', 2.2)) + ci(15, -12, 6, c.a1, no) + pa('M12 -12 l2 2 l4 -4', 'none', st('#fff', 1.2)) + ln(4, -22, 4, -2, '#d8ccb4', .8),
  backpack: c => rc(2, -40, 30, 40, c.a2, 10) + rc(25, -38, 7, 36, dk(c.a2, .15), 6, no) + pa('M10 -40 q7 -8 14 0', 'none', st(dk(c.a2, .3), 2.4)) +
    rc(6, -20, 22, 16, dk(c.a2, .12), 5) + ln(8, -14, 26, -14, dk(c.a2, .35), 1) + rc(15, -16, 4, 2, '#d9d9d9', 1) + rc(0, -30, 3, 16, dk(c.a2, .25), 1.5)
};
// new things on desks
Object.assign(SC.PROP, {
  pomodoro:  PR('a tomato-shaped kitchen timer', 22, 22, 'study', c => el(11, -9, 11, 9, '#e04a3a') + pa('M5 -13 q6 -3 12 0', 'none', st('#b8362a', 1)) + pa('M11 -18 l-4 -4 l4 1 l1 -4 l1 4 l4 -1 l-4 4z', '#4caf50') +
    [0, 1, 2, 3, 4].map(k => ln(4 + k * 3.5, -8, 4 + k * 3.5, -6.5, '#fff', .7)).join('') + pa('M11 -9 l-2 4 h4z', '#fff', no), c => ci(12, 12, 11, '#e04a3a') + pa('M12 8 l-4 -4 l4 1 l1 -4 l1 4 l4 -1 l-4 4z', '#4caf50')),
  hourglass: PR('an hourglass', 16, 30, 'decor', c => rc(0, -3, 16, 3, '#6b4429', 1) + rc(0, -30, 16, 3, '#6b4429', 1) + ln(1.5, -27, 1.5, -3, '#6b4429', 1.4) + ln(14.5, -27, 14.5, -3, '#6b4429', 1.4) +
    pa('M3 -27 h10 q0 7 -4 11 q4 4 4 13 h-10 q0 -9 4 -13 q-4 -4 -4 -11z', '#e6f2f5', ' fill-opacity=".9"') + pa('M5 -24 h6 q-1 4 -3 6 q-2 -2 -3 -6z', '#e8c27a', no) + pa('M4.5 -3 q3.5 -6 7 0z', '#e8c27a', no) + ln(8, -16, 8, -6, '#e8c27a', .7)),
  eraser:    PR('a pink eraser', 18, 9, 'study', c => pa('M0 0 L14 0 L18 -4 L18 -9 L4 -9 L0 -5z', '#f2a5b6') + pa('M14 0 L18 -4 L18 -9 L14 -5z', '#dc8a9c', no) + pa('M0 -5 L14 -5 L18 -9', 'none', st('#c97387', .7)) + rc(3, -4, 9, 2.4, '#fff', .5, ' opacity=".6" stroke="none"'), c => rc(0, 0, 20, 10, '#f2a5b6', 2)),
  stapler:   PR('a stapler', 34, 12, 'study', c => rc(0, -4, 34, 4, '#3a3d44', 2) + pa('M2 -5 L30 -8 q4 -1 4 3 L4 -4z', c.a1) + pa('M2 -5 L30 -8 q4 -1 4 3 L4 -4z', 'none', st(dk(c.a1, .3), .6)) + rc(26, -10, 6, 3, '#c9ccd1', 1), c => rc(0, 0, 38, 12, c.a1, 4) + rc(0, 3, 38, 6, '#3a3d44', 2)),
  calendar:  PR('a desk calendar', 28, 24, 'study', c => pa('M2 0 L6 -24 h16 L26 0z', '#3a3d44') + rc(4, -24, 20, 22, '#fbfaf6', 1) + rc(4, -24, 20, 6, '#d32f2f', 1) + tx(14, -19.6, 'NOV', 4, '#fff') + tx(14, -7, '20', 9, '#2c2c2a') + [8, 12, 16, 20].map(x => ci(x, -25, .9, '#9ea3aa')).join('')),
  chocolate: PR('a chocolate bar', 32, 10, 'food', c => pa('M0 -1 L18 -2 L19 -10 L1 -9z', '#5a321b') + [[3, -8], [8, -8.3], [13, -8.6], [3, -5], [8, -5.3], [13, -5.6]].map(([x, y]) => rc(x, y, 4, 2.4, '#7a4a2a', .5, no)).join('') + pa('M17 -2 L32 -3 L33 -10.5 L18 -9.6z', '#c0392b') + tx(25.5, -5, 'CHOC', 3.4, '#fff')),
  speaker:   PR('a little bluetooth speaker', 34, 16, 'tech', c => rc(0, -16, 34, 16, '#2f3236', 7) + rc(5, -13, 24, 10, '#4a4d54', 4, no) + [...Array(18)].map((_, k) => ci(8 + (k % 9) * 2.3, -10.5 + Math.floor(k / 9) * 4, .6, '#2a2c30', no)).join('') + ci(30, -14, 1, c.a1, no)),
  ringlight: PR('a ring light on a little tripod', 26, 46, 'tech', c => pa('M13 -18 L6 0 M13 -18 L20 0 M13 -18 L13 0', 'none', st('#2f3236', 1.6)) + ln(13, -18, 13, -24, '#2f3236', 2) +
    ci(13, -35, 11, 'none', ' stroke="#2f3236" stroke-width="4.5"') + ci(13, -35, 11, 'none', ' stroke="#fff8e0" stroke-width="3"') + rc(10, -38, 6, 10, '#1f2125', 1.5)),
  plushie:   PR('a teddy bear plushie', 26, 28, 'decor', c => ci(13, -8, 9, '#c88a5a') + el(13, -6, 5, 4, '#e8c09a', no) + ci(5, -2, 3.5, '#c88a5a') + ci(21, -2, 3.5, '#c88a5a') + `<ellipse cx="4.5" cy="-11" rx="3" ry="5.5" fill="#c88a5a" transform="rotate(25 4.5 -11)"/><ellipse cx="21.5" cy="-11" rx="3" ry="5.5" fill="#c88a5a" transform="rotate(-25 21.5 -11)"/>` + ci(3.2, -7, 1.6, '#e8c09a', no) + ci(22.8, -7, 1.6, '#e8c09a', no) + ci(5, -1.5, 1.8, '#e8c09a', no) + ci(21, -1.5, 1.8, '#e8c09a', no) + ci(13, -21, 7.5, '#c88a5a') + ci(7, -27, 3, '#c88a5a') + ci(19, -27, 3, '#c88a5a') +
    ci(7, -27, 1.4, '#e8a07a', no) + ci(19, -27, 1.4, '#e8a07a', no) + el(13, -18.5, 3.2, 2.4, '#e8c09a', no) + ci(13, -19.5, 1, '#3b2416', no) + ci(10, -22.5, .9, '#222', no) + ci(16, -22.5, .9, '#222', no) + pa('M9 -14 l4 2 l4 -2 l-1 3 h-6z', c.a1, no)),
  globe:     PR('a desk globe', 24, 32, 'decor', c => el(12, -1.5, 9, 2, '#6b4429') + ln(12, -2, 12, -6, '#6b4429', 2) + ci(12, -18, 11, '#5aa7d6') + pa('M5 -24 q3 -3 6 -1 q2 3 -1 5 q-3 0 -5 -4z M14 -16 q4 -2 6 1 q-1 5 -4 6 q-3 -3 -2 -7z M9 -11 q2 1 2 3 q-2 1 -3 -1z', '#7cb342', no) +
    pa('M1 -18 a11 11 0 0 1 22 0', 'none', ' stroke="#c9a26a" stroke-width="1.6" transform="rotate(-20 12 -18)"') + ci(8, -23, 2, '#fff', ' opacity=".35" stroke="none"')),
  shaker:    PR('a protein shaker', 16, 36, 'sport', c => pa('M1 -28 h14 l-1 28 h-12z', '#e9ecef', ' fill-opacity=".9"') + rc(1.4, -18, 13.2, 18, '#c9a27a', 0, no) + rc(0, -32, 16, 5, '#2f3236', 1.5) + rc(4, -36, 6, 4, '#2f3236', 1) + [-24, -20].map(y => ln(11, y, 14, y, '#999', .7)).join('') + hl(3, -26, 22, 1.4)),
  lipbalm:   PR('a lip balm', 8, 18, 'misc', c => rc(0, -12, 8, 12, '#fbfbfb', 2) + rc(0, -18, 8, 6, c.a1, 2) + rc(0, -12, 8, 1.6, dk(c.a1, .2), 0, no) + ln(2, -10, 2, -3, '#ddd', 1))
});
SC.PROP.mouse.n = 'a computer mouse';
SC.PROP_KEYS = Object.keys(SC.PROP);
Object.entries(D2).forEach(([k, d]) => { if (SC.PROP[k]) SC.PROP[k].d = d; });
// a few things were drawn too small to recognize: give them more room
Object.entries({earbuds: [22, 22], mouse: [22, 12], idcard: [29, 18], wallet: [28, 15], keys: [26, 12], stressball: [18, 18], crystal: [14, 20], phone: [16, 30], hamster: [23, 16], charger: [42, 12]}).forEach(([k, [w, h]]) => { if (SC.PROP[k]){ SC.PROP[k].w = w; SC.PROP[k].h = h; } });
}
