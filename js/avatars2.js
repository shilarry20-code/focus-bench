/* ---------- more profile pictures ----------
   About a hundred more original designs (foods, animals, things, places, little blob characters, sports and patterns),
   each with its own colours, placement and details picked from the player's number, so the same design rarely looks
   the same twice. They're added to the kinds in avatars.js. */
{
const C = (r, s = 70, l = 60) => hsl(rr(r, 0, 360), s, l);
const pastel = r => hsl(rr(r, 0, 360), rr(r, 45, 75), rr(r, 78, 90));
const deep = r => hsl(rr(r, 0, 360), rr(r, 40, 65), rr(r, 18, 32));
const lite = r => solid(pastel(r));
const bg = r => r() < .5 ? solid(pastel(r)) : solid(deep(r));
// a little face: eyes and a mouth, in one of several moods
const face = (r, x, y, s = 1, ink = '#2b2420') => {
  const m = avPick(r, ['smile', 'grin', 'o', 'flat', 'cat', 'blush', 'sleepy', 'wink']), e = 3 * s, ey = y - 1.2 * s;
  const eyes = m === 'sleepy' ? `<path d="M${x - e - 1.2 * s} ${ey}h${2.4 * s}M${x + e - 1.2 * s} ${ey}h${2.4 * s}" stroke="${ink}" stroke-width="${.8 * s}" stroke-linecap="round"/>`
    : m === 'wink' ? `<circle cx="${x - e}" cy="${ey}" r="${1 * s}" fill="${ink}"/><path d="M${x + e - 1.2 * s} ${ey}q${1.2 * s} ${-1.2 * s} ${2.4 * s} 0" stroke="${ink}" stroke-width="${.8 * s}" fill="none" stroke-linecap="round"/>`
    : `<circle cx="${x - e}" cy="${ey}" r="${1 * s}" fill="${ink}"/><circle cx="${x + e}" cy="${ey}" r="${1 * s}" fill="${ink}"/>`;
  const mo = m === 'o' ? `<ellipse cx="${x}" cy="${y + 2 * s}" rx="${1 * s}" ry="${1.3 * s}" fill="${ink}"/>` : m === 'flat' ? `<path d="M${x - 1.5 * s} ${y + 2 * s}h${3 * s}" stroke="${ink}" stroke-width="${.8 * s}" stroke-linecap="round"/>`
    : m === 'cat' ? `<path d="M${x - 2 * s} ${y + 1.5 * s}q${1 * s} ${1.2 * s} ${2 * s} 0q${1 * s} ${1.2 * s} ${2 * s} 0" stroke="${ink}" stroke-width="${.8 * s}" fill="none" stroke-linecap="round"/>`
    : m === 'grin' ? `<path d="M${x - 2.4 * s} ${y + 1 * s}q${2.4 * s} ${3.4 * s} ${4.8 * s} 0z" fill="${ink}"/>`
    : `<path d="M${x - 2 * s} ${y + 1.2 * s}q${2 * s} ${2 * s} ${4 * s} 0" stroke="${ink}" stroke-width="${.8 * s}" fill="none" stroke-linecap="round"/>`;
  const bl = m === 'blush' || r() < .3 ? `<ellipse cx="${x - e - 1.2 * s}" cy="${y + .8 * s}" rx="${1.3 * s}" ry="${.8 * s}" fill="#ff8a8a" opacity=".55"/><ellipse cx="${x + e + 1.2 * s}" cy="${y + .8 * s}" rx="${1.3 * s}" ry="${.8 * s}" fill="#ff8a8a" opacity=".55"/>` : '';
  return eyes + mo + bl;
};

/* ---- food ---- */
const FOOD = [
  // donut from above, with sprinkles
  r => { const x = rr(r, 17, 23), y = rr(r, 17, 23); return bg(r) + `<circle cx="${x}" cy="${y}" r="14" fill="#d9a35f"/><path d="M${x - 13} ${y}a13 13 0 1 1 26 0q-3 4-6 1t-6 2-7-2-7 2z" fill="${avPick(r, ['#f48fb1', '#6d4c41', '#fff3e0', '#81d4fa', '#ce93d8'])}"/><circle cx="${x}" cy="${y}" r="4.5" fill="${pastel(r)}"/>` + Array.from({length: 14}, () => { const a = rr(r, 0, 6.28), d = rr(r, 6, 11); return `<rect x="${x + Math.cos(a) * d}" y="${y + Math.sin(a) * d - 3}" width="2" height=".7" rx=".3" fill="${C(r, 80, 60)}" transform="rotate(${rr(r, 0, 180)} ${x + Math.cos(a) * d} ${y + Math.sin(a) * d - 3})"/>`; }).join(''); },
  // a slice of pizza
  r => bg(r) + `<g transform="rotate(${rr(r, -30, 30)} 20 20)"><path d="M8 8h24L20 36z" fill="#f2c14e"/><path d="M7 6h26a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4z" fill="#c98a3a"/>${Array.from({length: 4}, () => `<circle cx="${rr(r, 13, 27)}" cy="${rr(r, 12, 22)}" r="${rr(r, 1.6, 2.4)}" fill="#c0392b"/>`).join('')}${r() < .5 ? '<path d="M14 15l2 1M22 19l1.5 1.5" stroke="#3e8a4a" stroke-width="1.2"/>' : ''}</g>`,
  // sushi, two pieces
  r => bg(r) + [12, 27].map((x, k) => `<rect x="${x - 7}" y="18" width="14" height="10" rx="3" fill="#fafafa"/><path d="M${x - 8} 17q8-6 16 0v3q-8-3-16 0z" fill="${avPick(r, ['#ff8a65', '#ef5350', '#ffcc80'])}"/>${k ? '' : `<rect x="${x - 1.5}" y="16" width="3" height="12" fill="#263238"/>`}`).join('') + `<ellipse cx="20" cy="31" rx="17" ry="2.5" fill="#000" opacity=".12"/>`,
  // a bowl of ramen
  r => bg(r) + `<path d="M5 20h30a15 13 0 0 1-30 0z" fill="${C(r, 60, 50)}"/><ellipse cx="20" cy="20" rx="15" ry="3.5" fill="#f3d9a4"/><path d="M10 19q3-2 6 0t6 0 6 0" stroke="#f9e7b9" stroke-width="1" fill="none"/><circle cx="25" cy="19" r="2.6" fill="#fff"/><circle cx="25" cy="19" r="1.3" fill="#ffb300"/><path d="M8 5l14 13M11 4l12 14" stroke="#8d6e63" stroke-width="1.1"/>`,
  // bubble tea
  r => bg(r) + `<path d="M12 12h16l-2 24H14z" fill="${avPick(r, ['#d7b48a', '#f8bbd0', '#c5e1a5', '#ffe0b2', '#b39ddb'])}"/><path d="M11 10h18v3H11z" fill="#fff" opacity=".8"/><path d="M22 2l-2 13" stroke="${C(r)}" stroke-width="2.2"/>` + Array.from({length: 9}, (_, k) => `<circle cx="${15 + (k % 4) * 3 + (k > 3 ? 1.5 : 0)}" cy="${33 - Math.floor(k / 4) * 2.6}" r="1.3" fill="#3e2723"/>`).join('') + face(r, 20, 24, .8),
  // burger
  r => bg(r) + `<path d="M8 18a12 9 0 0 1 24 0z" fill="#e0a050"/><rect x="7" y="18" width="26" height="3" rx="1.5" fill="#7cb342"/><rect x="8" y="21" width="24" height="3" fill="#fbc02d"/><rect x="7" y="23.5" width="26" height="4.5" rx="2" fill="#6d4c41"/><path d="M8 28h24v2a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" fill="#e0a050"/>` + Array.from({length: 5}, () => `<ellipse cx="${rr(r, 12, 28)}" cy="${rr(r, 12, 16)}" rx=".6" ry=".35" fill="#fff8e1"/>`).join(''),
  // a taco
  r => bg(r) + `<path d="M5 30a15 15 0 0 1 30 0z" fill="#f6c453"/><path d="M8 28q3-8 6-4t5-3 5 3 5-2 4 6" fill="#7cb342"/><path d="M10 27q4-5 8-1t8-1 5 1" stroke="#e53935" stroke-width="2" fill="none"/>`,
  // a fruit, cut open
  r => { const k = Math.floor(r() * 4), x = rr(r, 16, 24), y = rr(r, 16, 24);
    return bg(r) + (k === 0 ? `<circle cx="${x}" cy="${y}" r="12" fill="#2e7d32"/><circle cx="${x}" cy="${y}" r="10" fill="#e53935"/>${Array.from({length: 7}, (_, j) => `<ellipse cx="${x + Math.cos(j) * 5}" cy="${y + Math.sin(j) * 5}" rx=".6" ry="1" fill="#212121"/>`).join('')}`
      : k === 1 ? `<ellipse cx="${x}" cy="${y}" rx="9" ry="12" fill="#558b2f"/><ellipse cx="${x}" cy="${y}" rx="7.5" ry="10.5" fill="#dce775"/><circle cx="${x}" cy="${y + 2}" r="4" fill="#795548"/>`
      : k === 2 ? `<circle cx="${x}" cy="${y}" r="12" fill="#fdd835"/><circle cx="${x}" cy="${y}" r="10.4" fill="#fff59d"/>${Array.from({length: 8}, (_, j) => `<path d="M${x} ${y}L${x + Math.cos(j * .785) * 9.5} ${y + Math.sin(j * .785) * 9.5}" stroke="#fdd835" stroke-width=".8"/>`).join('')}`
      : `<path d="M${x} ${y + 12}c-9-3-12-11-9-17 2-4 7-4 9-1 2-3 7-3 9 1 3 6 0 14-9 17z" fill="#e53935"/>${Array.from({length: 9}, () => `<ellipse cx="${x + rr(r, -6, 6)}" cy="${y + rr(r, -4, 7)}" rx=".4" ry=".7" fill="#fff59d"/>`).join('')}<path d="M${x - 4} ${y - 5}q4-4 8 0" stroke="#43a047" stroke-width="2" fill="none"/>`) + (r() < .5 ? face(r, x, y + 1, .8) : ''); },
  // a cupcake
  r => bg(r) + `<path d="M11 22h18l-3 13H14z" fill="${C(r, 60, 55)}"/><path d="M13 22v13M17 22v13M21 22v13M25 22v13" stroke="#000" stroke-width=".5" opacity=".2"/><path d="M9 22q0-6 5-6 1-6 6-6t6 6q5 0 5 6z" fill="${pastel(r)}"/><circle cx="20" cy="9" r="2.4" fill="#e53935"/>` + face(r, 20, 28, .8),
  // a croissant
  r => bg(r) + `<g transform="rotate(${rr(r, -25, 25)} 20 20)"><path d="M5 26q2-14 15-14t15 14q-4-3-7-2l-3-6-5 7-5-7-3 6q-3-1-7 2z" fill="#e0a050"/><path d="M14 19l3 6M26 19l-3 6M20 15v9" stroke="#b9772a" stroke-width="1"/></g>`,
  // an egg in a pan
  r => bg(r) + `<circle cx="18" cy="20" r="13" fill="#37474f"/><path d="M30 20h9" stroke="#37474f" stroke-width="3.2" stroke-linecap="round"/><path d="M11 18q2-7 8-6t7 6-3 8-10 1-2-9z" fill="#fff"/><circle cx="18" cy="19" r="3.6" fill="#ffb300"/>` + (r() < .6 ? face(r, 18, 19.5, .5) : ''),
  // toast
  r => bg(r) + `<path d="M9 15a6 6 0 0 1 3-9h16a6 6 0 0 1 3 9v18H9z" fill="#c98a3a"/><path d="M11 15a4 4 0 0 1 2-7h14a4 4 0 0 1 2 7v16H11z" fill="#f5d08a"/>` + face(r, 20, 21) + (r() < .5 ? `<rect x="15" y="12" width="10" height="7" rx="1" fill="#fff59d"/>` : ''),
  // a coffee cup with a face
  r => bg(r) + `<path d="M10 14h18l-2 20H12z" fill="${avPick(r, ['#fff', '#ffccbc', '#c5cae9', '#dcedc8', '#ffe082'])}"/><path d="M28 18q6 0 5 6t-6 5" stroke="#bdbdbd" stroke-width="2" fill="none"/><path d="M15 10q-2-3 0-6M20 11q-2-3 0-6M24 10q-2-3 0-6" stroke="#bdbdbd" stroke-width="1" fill="none"/>` + face(r, 19, 24),
  // ice pop
  r => { const c1 = C(r, 75, 60); return bg(r) + `<g transform="rotate(${rr(r, -20, 20)} 20 20)"><rect x="18.5" y="26" width="3" height="10" rx="1" fill="#d7b48a"/><path d="M12 10a8 8 0 0 1 16 0v17H12z" fill="${c1}"/><path d="M12 18h16v4H12z" fill="#fff" opacity=".35"/>${face(r, 20, 13, .8)}</g>`; },
  // dumplings in a steamer
  r => bg(r) + `<circle cx="20" cy="22" r="14" fill="#c8a165"/><circle cx="20" cy="22" r="12" fill="#e9d3a3"/>` + [[14, 19], [25, 19], [19, 27]].map(([x, y]) => `<path d="M${x - 5} ${y + 2}q5-9 10 0z" fill="#fffdf6"/><path d="M${x - 2} ${y - 1}l1 1.5M${x} ${y - 2}v1.8M${x + 2} ${y - 1}l-1 1.5" stroke="#d7ccc8" stroke-width=".6"/>`).join(''),
  // a cookie
  r => bg(r) + `<circle cx="${rr(r, 17, 23)}" cy="${rr(r, 17, 23)}" r="13" fill="#d7a35a"/>` + Array.from({length: 7}, () => `<circle cx="${rr(r, 11, 29)}" cy="${rr(r, 11, 29)}" r="${rr(r, 1, 1.8)}" fill="#4e342e"/>`).join(''),
];

/* ---- animals ---- */
const ear = (x, y, w, h, c) => `<path d="M${x - w} ${y}l${w} ${-h} ${w} ${h}z" fill="${c}"/>`;
const ANIMALS2 = [
  // fox face
  r => { const o = avPick(r, ['#ef6c00', '#f4511e', '#8d6e63', '#cfd8dc']); return bg(r) + ear(11, 15, 5, 10, o) + ear(29, 15, 5, 10, o) + `<path d="M6 14l14 22 14-22q-14-6-28 0z" fill="${o}"/><path d="M11 22l9 14 9-14q-9 4-18 0z" fill="#fff"/><circle cx="20" cy="35" r="1.6" fill="#212121"/>` + `<circle cx="14" cy="21" r="1.2" fill="#212121"/><circle cx="26" cy="21" r="1.2" fill="#212121"/>`; },
  // bunny
  r => { const f = avPick(r, ['#fafafa', '#d7ccc8', '#bcaaa4', '#9e9e9e']); return bg(r) + `<ellipse cx="14" cy="10" rx="3.4" ry="10" fill="${f}"/><ellipse cx="26" cy="10" rx="3.4" ry="10" fill="${f}"/><ellipse cx="14" cy="10" rx="1.6" ry="7" fill="#f8bbd0"/><ellipse cx="26" cy="10" rx="1.6" ry="7" fill="#f8bbd0"/><circle cx="20" cy="27" r="11" fill="${f}"/>` + face(r, 20, 28); },
  // bear
  r => { const f = avPick(r, ['#8d6e63', '#6d4c41', '#d7a35a', '#fafafa', '#424242']); return bg(r) + `<circle cx="10" cy="12" r="5" fill="${f}"/><circle cx="30" cy="12" r="5" fill="${f}"/><circle cx="20" cy="23" r="13" fill="${f}"/><ellipse cx="20" cy="28" rx="6" ry="4.5" fill="#f5e6d3"/><ellipse cx="20" cy="26.5" rx="2" ry="1.4" fill="#3e2723"/>` + `<circle cx="15" cy="21" r="1.3" fill="#212121"/><circle cx="25" cy="21" r="1.3" fill="#212121"/>`; },
  // penguin
  r => bg(r) + `<ellipse cx="20" cy="24" rx="12" ry="15" fill="#263238"/><ellipse cx="20" cy="27" rx="8" ry="11" fill="#fafafa"/><path d="M18 21l2 3 2-3z" fill="#ffa000"/><circle cx="16.5" cy="18" r="1.2" fill="#fff"/><circle cx="23.5" cy="18" r="1.2" fill="#fff"/><circle cx="16.5" cy="18" r=".6" fill="#000"/><circle cx="23.5" cy="18" r=".6" fill="#000"/>` + (r() < .4 ? `<path d="M10 11q10-8 20 0v2H10z" fill="${C(r, 70, 50)}"/>` : ''),
  // duck
  r => bg(r) + `<ellipse cx="22" cy="28" rx="13" ry="8" fill="#fdd835"/><circle cx="15" cy="17" r="7" fill="#fdd835"/><path d="M7 17q-4 1-4 3 4 1 6-1z" fill="#fb8c00"/><circle cx="14" cy="15.5" r="1.2" fill="#212121"/><path d="M24 26q5-1 7 3" stroke="#f9a825" stroke-width="1.4" fill="none"/>` + (r() < .5 ? `<path d="M0 36q10-3 20 0t20 0v4H0z" fill="#64b5f6"/>` : ''),
  // hamster
  r => bg(r) + `<circle cx="11" cy="13" r="3.5" fill="#f2c08f"/><circle cx="29" cy="13" r="3.5" fill="#f2c08f"/><ellipse cx="20" cy="24" rx="14" ry="12" fill="#f2c08f"/><ellipse cx="20" cy="28" rx="8" ry="7" fill="#fff3e0"/>` + face(r, 20, 23) + `<ellipse cx="11" cy="26" rx="3" ry="2.4" fill="#f8bbd0" opacity=".7"/><ellipse cx="29" cy="26" rx="3" ry="2.4" fill="#f8bbd0" opacity=".7"/>`,
  // axolotl
  r => { const p = avPick(r, ['#f8bbd0', '#ffccbc', '#e1bee7', '#b2ebf2', '#212121']); return bg(r) + [[-1, 1], [1, 1]].map(([s]) => [0, 1, 2].map(j => `<path d="M${20 + s * 11} ${18 + j * 4}q${s * 5} -2 ${s * 7} 1" stroke="#ec407a" stroke-width="2" stroke-linecap="round" fill="none"/>`).join('')).join('') + `<ellipse cx="20" cy="23" rx="12" ry="10" fill="${p}"/>` + face(r, 20, 24, 1, p === '#212121' ? '#fff' : '#2b2420'); },
  // shiba / dog face
  r => { const f = avPick(r, ['#e0a050', '#5d4037', '#fafafa', '#9e9e9e', '#d7a35a']); return bg(r) + ear(11, 14, 5, 9, f) + ear(29, 14, 5, 9, f) + `<circle cx="20" cy="23" r="13" fill="${f}"/><ellipse cx="20" cy="29" rx="7" ry="5" fill="#fff8e1"/><ellipse cx="20" cy="26.4" rx="2.2" ry="1.5" fill="#212121"/>` + `<circle cx="14.5" cy="21" r="1.3" fill="#212121"/><circle cx="25.5" cy="21" r="1.3" fill="#212121"/>` + (r() < .4 ? '<path d="M18 30q2 3 4 0" fill="#ef5350"/>' : ''); },
  // sloth hanging
  r => bg(r) + `<path d="M0 8h40" stroke="#6d4c41" stroke-width="3"/><path d="M12 8q-2 8 2 14M28 8q2 8-2 14" stroke="#8d6e63" stroke-width="4" stroke-linecap="round" fill="none"/><ellipse cx="20" cy="26" rx="10" ry="9" fill="#a1887f"/><ellipse cx="20" cy="26" rx="7" ry="6" fill="#efebe9"/><ellipse cx="16.5" cy="25" rx="2.4" ry="1.6" fill="#5d4037"/><ellipse cx="23.5" cy="25" rx="2.4" ry="1.6" fill="#5d4037"/><path d="M18 29q2 1.5 4 0" stroke="#3e2723" stroke-width=".8" fill="none"/>`,
  // raccoon
  r => bg(r) + ear(11, 14, 4.5, 8, '#757575') + ear(29, 14, 4.5, 8, '#757575') + `<circle cx="20" cy="23" r="13" fill="#9e9e9e"/><path d="M8 21q6-5 12 0 6-5 12 0-6 6-12 2-6 4-12-2z" fill="#424242"/><circle cx="15" cy="21" r="1.2" fill="#fff"/><circle cx="25" cy="21" r="1.2" fill="#fff"/><ellipse cx="20" cy="29" rx="5" ry="3.5" fill="#eeeeee"/><circle cx="20" cy="27.5" r="1.3" fill="#212121"/>`,
  // koala
  r => bg(r) + `<circle cx="9" cy="16" r="7" fill="#b0bec5"/><circle cx="31" cy="16" r="7" fill="#b0bec5"/><circle cx="9" cy="16" r="4" fill="#eceff1"/><circle cx="31" cy="16" r="4" fill="#eceff1"/><circle cx="20" cy="23" r="12" fill="#b0bec5"/><ellipse cx="20" cy="25" rx="3" ry="4" fill="#37474f"/><circle cx="15" cy="20" r="1.2" fill="#212121"/><circle cx="25" cy="20" r="1.2" fill="#212121"/>`,
  // whale
  r => solid(hsl(rr(r, 190, 215), 60, rr(r, 70, 85))) + `<path d="M5 26q0-12 15-12 13 0 15 10l4-5-1 9 1 6-5-4q-4 8-14 8-15 0-15-12z" fill="${avPick(r, ['#1e88e5', '#5c6bc0', '#26a69a', '#78909c'])}"/><path d="M7 28q8 6 22 1" stroke="#fff" stroke-width="1" opacity=".6" fill="none"/><circle cx="12" cy="24" r="1.2" fill="#fff"/><path d="M15 12q0-4-2-6M15 12q0-4 2-6" stroke="#90caf9" stroke-width="1.2" fill="none"/>`,
  // octopus
  r => { const c1 = C(r, 65, 60); return bg(r) + Array.from({length: 6}, (_, k) => `<path d="M${10 + k * 4} 24q${k % 2 ? 3 : -3} 8 ${k % 2 ? -2 : 2} 13" stroke="${c1}" stroke-width="3" stroke-linecap="round" fill="none"/>`).join('') + `<ellipse cx="20" cy="17" rx="11" ry="11" fill="${c1}"/>` + face(r, 20, 18); },
  // bee
  r => bg(r) + `<ellipse cx="15" cy="13" rx="6" ry="4" fill="#e3f2fd" opacity=".9" transform="rotate(-30 15 13)"/><ellipse cx="25" cy="13" rx="6" ry="4" fill="#e3f2fd" opacity=".9" transform="rotate(30 25 13)"/><ellipse cx="20" cy="23" rx="11" ry="9" fill="#fdd835"/><path d="M14 15v16M20 14v18M26 15v16" stroke="#212121" stroke-width="2.4"/>` + face(r, 20, 23, .7),
  // ladybug
  r => bg(r) + `<circle cx="20" cy="22" r="12" fill="#e53935"/><path d="M20 10v24" stroke="#212121" stroke-width="1"/><circle cx="20" cy="11" r="5" fill="#212121"/>` + Array.from({length: 6}, () => `<circle cx="${rr(r, 11, 29)}" cy="${rr(r, 16, 30)}" r="${rr(r, 1.2, 2.2)}" fill="#212121"/>`).join(''),
  // snail
  r => bg(r) + `<path d="M4 32h28q4 0 4-4" stroke="${avPick(r, ['#bcaaa4', '#c5e1a5', '#b39ddb'])}" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="18" cy="22" r="10" fill="${C(r, 55, 55)}"/><path d="M18 22m-6 0a6 6 0 1 1 6 6 3.5 3.5 0 1 1 0-7" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/><path d="M34 26l1-7M37 27l3-6" stroke="#8d6e63" stroke-width=".9"/>`,
  // hedgehog
  r => bg(r) + `<path d="M6 30q0-16 16-16 12 0 13 16z" fill="#6d4c41"/>` + Array.from({length: 9}, (_, k) => `<path d="M${8 + k * 3} ${22 - (k % 2) * 2}l2-6 2 6" fill="#4e342e"/>`).join('') + `<path d="M28 30q8 0 9-4-2-5-9-4z" fill="#f5deb3"/><circle cx="36.5" cy="26" r=".9" fill="#212121"/><circle cx="31" cy="25" r=".8" fill="#212121"/>`,
  // seal
  r => solid(hsl(rr(r, 185, 205), 50, 82)) + `<rect y="30" width="40" height="10" fill="#e1f5fe"/><ellipse cx="20" cy="27" rx="14" ry="9" fill="#b0bec5"/><circle cx="14" cy="20" r="8" fill="#b0bec5"/>` + face(r, 14, 21, .8) + `<path d="M30 30l7 3-4 2z" fill="#90a4ae"/>`,
  // chick hatching
  r => bg(r) + `<circle cx="20" cy="18" r="9" fill="#fff176"/><path d="M18 18l2 2 2-2z" fill="#ff9800"/><circle cx="17" cy="15.5" r="1" fill="#212121"/><circle cx="23" cy="15.5" r="1" fill="#212121"/><path d="M9 24l3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3v4a11 9 0 0 1-22 0z" fill="#fafafa"/>`,
  // bat
  r => avFlat(hsl(rr(r, 230, 270), 40, 20)) + starsN(r, 8) + `<path d="M20 16q-4-5-10-4 2 2 1 4-4-1-9 3 5 0 6 3 3-2 6 0 3-3 6-2z" fill="#424242"/><path d="M20 16q4-5 10-4-2 2-1 4 4-1 9 3-5 0-6 3-3-2-6 0-3-3-6-2z" fill="#424242"/><ellipse cx="20" cy="19" rx="4" ry="5" fill="#616161"/><circle cx="18.5" cy="18" r=".8" fill="#ffeb3b"/><circle cx="21.5" cy="18" r=".8" fill="#ffeb3b"/>`,
  // otter floating
  r => solid(hsl(rr(r, 190, 210), 55, 70)) + `<path d="M0 26q10-3 20 0t20 0v14H0z" fill="#4fc3f7"/><ellipse cx="20" cy="25" rx="12" ry="6" fill="#8d6e63"/><circle cx="12" cy="20" r="6" fill="#8d6e63"/><circle cx="12" cy="21" r="3.4" fill="#d7ccc8"/>` + face(r, 12, 20.5, .6) + `<path d="M0 30q10-3 20 0t20 0" stroke="#e1f5fe" stroke-width="1" fill="none"/>`,
  // pig
  r => bg(r) + ear(12, 14, 4, 7, '#f48fb1') + ear(28, 14, 4, 7, '#f48fb1') + `<circle cx="20" cy="23" r="12" fill="#f8bbd0"/><ellipse cx="20" cy="27" rx="5" ry="3.6" fill="#f48fb1"/><circle cx="18.3" cy="27" r=".9" fill="#ad1457"/><circle cx="21.7" cy="27" r=".9" fill="#ad1457"/><circle cx="15" cy="21" r="1.2" fill="#212121"/><circle cx="25" cy="21" r="1.2" fill="#212121"/>`,
  // cow
  r => bg(r) + `<ellipse cx="9" cy="16" rx="4" ry="2.4" fill="#fafafa" transform="rotate(-20 9 16)"/><ellipse cx="31" cy="16" rx="4" ry="2.4" fill="#fafafa" transform="rotate(20 31 16)"/><ellipse cx="20" cy="21" rx="11" ry="12" fill="#fafafa"/><path d="M12 13q4 4 2 9-4-2-2-9z" fill="#424242"/><ellipse cx="20" cy="28" rx="8" ry="5" fill="#f8bbd0"/><circle cx="17" cy="28" r="1" fill="#ad1457"/><circle cx="23" cy="28" r="1" fill="#ad1457"/><circle cx="15.5" cy="19" r="1.2" fill="#212121"/><circle cx="24.5" cy="19" r="1.2" fill="#212121"/>`,
  // deer
  r => bg(r) + `<path d="M12 12l-4-8M12 12l-6-3M28 12l4-8M28 12l6-3" stroke="#8d6e63" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="10" cy="17" rx="4" ry="2" fill="#c08457" transform="rotate(-30 10 17)"/><ellipse cx="30" cy="17" rx="4" ry="2" fill="#c08457" transform="rotate(30 30 17)"/><path d="M12 16q8-6 16 0l-3 17q-5 4-10 0z" fill="#c08457"/><ellipse cx="20" cy="31" rx="3.5" ry="2.4" fill="#4e342e"/><circle cx="16" cy="21" r="1.3" fill="#212121"/><circle cx="24" cy="21" r="1.3" fill="#212121"/>`,
  // shark fin
  r => solid(hsl(rr(r, 195, 215), 65, rr(r, 55, 70))) + `<path d="M12 28q6-16 18-20-4 10 0 20z" fill="#546e7a"/><path d="M0 28q5-2.5 10 0t10 0 10 0 10 0v12H0z" fill="${hsl(205, 70, 40)}"/><path d="M0 33q5-2 10 0t10 0 10 0 10 0" stroke="#e1f5fe" stroke-width="1" fill="none"/>`,
  // snake curled
  r => { const c1 = C(r, 60, 45); return bg(r) + `<path d="M8 30q0-8 12-8t12-6-8-7" stroke="${c1}" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="25" cy="9" r="4" fill="${c1}"/><circle cx="24" cy="8" r=".8" fill="#fff"/><path d="M21 10l-3 1 2 1" stroke="#e53935" stroke-width=".7" fill="none"/>`; },
];

/* ---- things ---- */
const OBJ = [
  // camera
  r => bg(r) + `<rect x="6" y="13" width="28" height="19" rx="3" fill="${avPick(r, ['#424242', '#e0e0e0', '#ef9a9a', '#90caf9', '#a5d6a7'])}"/><rect x="13" y="10" width="9" height="4" rx="1" fill="#616161"/><circle cx="20" cy="22.5" r="6.5" fill="#263238"/><circle cx="20" cy="22.5" r="4" fill="#455a64"/><circle cx="18.5" cy="21" r="1.2" fill="#fff" opacity=".7"/><circle cx="29.5" cy="16.5" r="1.2" fill="#ffeb3b"/>`,
  // handheld game console
  r => bg(r) + `<rect x="10" y="4" width="20" height="32" rx="3" fill="${avPick(r, ['#cfd8dc', '#ffab91', '#80cbc4', '#b39ddb', '#fff59d'])}"/><rect x="13" y="7" width="14" height="12" rx="1" fill="#558b2f"/><path d="M14 25h4M16 23v4" stroke="#424242" stroke-width="1.6"/><circle cx="24" cy="24" r="1.4" fill="#c2185b"/><circle cx="26.5" cy="26" r="1.4" fill="#c2185b"/>` + face(r, 20, 13, .7, '#1b5e20'),
  // skateboard
  r => bg(r) + `<g transform="rotate(${rr(r, -35, 35)} 20 20)"><rect x="4" y="16" width="32" height="7" rx="3.5" fill="${C(r, 70, 55)}"/><path d="M8 18h24" stroke="#fff" stroke-width="1" opacity=".5" stroke-dasharray="2 2"/><circle cx="11" cy="26" r="2.3" fill="#fdd835"/><circle cx="29" cy="26" r="2.3" fill="#fdd835"/></g>`,
  // potted plant
  r => bg(r) + `<path d="M12 26h16l-2 10H14z" fill="${avPick(r, ['#d84315', '#8d6e63', '#eceff1', '#f8bbd0', '#90caf9'])}"/>` + Array.from({length: 5}, (_, k) => `<ellipse cx="${20 + (k - 2) * 3.5}" cy="${20 - (k % 2) * 4}" rx="2.6" ry="7" fill="${hsl(rr(r, 100, 150), 45, rr(r, 35, 45))}" transform="rotate(${(k - 2) * 18} ${20 + (k - 2) * 3.5} ${24})"/>`).join('') + (r() < .5 ? face(r, 20, 31, .6) : ''),
  // candle
  r => avFlat(hsl(rr(r, 220, 270), 35, 18)) + `<circle cx="20" cy="13" r="9" fill="#ffd54f" opacity=".18"/><rect x="15" y="18" width="10" height="17" rx="1.5" fill="${pastel(r)}"/><path d="M20 18v-3" stroke="#424242" stroke-width=".8"/><path d="M20 8q3 4 0 7-3-3 0-7z" fill="#ffb300"/>`,
  // lava lamp
  r => { const c1 = C(r, 80, 60); return bg(r) + `<path d="M15 8h10l3 22H12z" fill="${hsl(0, 0, 100, .35)}"/><path d="M14 6h12v3H14zM11 30h18l-2 6H13z" fill="#90a4ae"/><ellipse cx="19" cy="24" rx="4" ry="3" fill="${c1}"/><ellipse cx="22" cy="16" rx="2.4" ry="3" fill="${c1}"/><circle cx="18" cy="11" r="1.5" fill="${c1}"/>`; },
  // dice
  r => bg(r) + `<g transform="rotate(${rr(r, -25, 25)} 20 20)"><rect x="9" y="9" width="22" height="22" rx="4" fill="${avPick(r, ['#fafafa', '#e53935', '#212121', '#ffeb3b'])}"/>${[[14, 14], [26, 26], [20, 20], [26, 14], [14, 26]].slice(0, 1 + Math.floor(r() * 5)).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#616161"/>`).join('')}</g>`,
  // chess piece
  r => lite(r) + `<path d="M13 34h14v-3H13zM15 31h10l-2-12h-6z" fill="${avPick(r, ['#fafafa', '#212121'])}"/><circle cx="20" cy="13" r="5" fill="${avPick(r, ['#fafafa', '#212121'])}"/><path d="M14 19h12" stroke="#9e9e9e" stroke-width="1.4"/>`,
  // umbrella in rain
  r => solid(hsl(rr(r, 200, 230), 25, rr(r, 55, 70))) + Array.from({length: 14}, () => { const x = rr(r, 0, 40), y = rr(r, 0, 36); return `<path d="M${x} ${y}l-1 3" stroke="#e3f2fd" stroke-width=".7" opacity=".7"/>`; }).join('') + `<path d="M5 20a15 13 0 0 1 30 0q-2.5-2-5 0-2.5-2-5 0-2.5-2-5 0-2.5-2-5 0-2.5-2-5 0z" fill="${C(r, 75, 55)}"/><path d="M20 20v12q0 3 3 3" stroke="#424242" stroke-width="1.4" fill="none"/>`,
  // balloons
  r => bg(r) + Array.from({length: 3}, (_, k) => { const x = 11 + k * 9 + rr(r, -2, 2), y = 12 + rr(r, -3, 4); return `<path d="M${x} ${y + 7}q${rr(r, -3, 3)} 8 ${20 - x} ${30 - y}" stroke="#757575" stroke-width=".6" fill="none"/><ellipse cx="${x}" cy="${y}" rx="5" ry="6.5" fill="${C(r, 75, 60)}"/><ellipse cx="${x - 1.6}" cy="${y - 2}" rx="1.2" ry="2" fill="#fff" opacity=".45"/>`; }).join(''),
  // kite
  r => solid(hsl(rr(r, 190, 215), 70, rr(r, 72, 85))) + `<g transform="rotate(${rr(r, -20, 20)} 20 14)"><path d="M20 3l9 11-9 11-9-11z" fill="${C(r, 80, 60)}"/><path d="M20 3v22M11 14h18" stroke="#fff" stroke-width=".8"/></g><path d="M20 25q-4 4 0 7t-2 8" stroke="#757575" stroke-width=".7" fill="none"/>`,
  // paper plane
  r => bg(r) + `<path d="M4 22l32-12-10 24-6-8z" fill="#fafafa"/><path d="M20 26l16-16-22 15z" fill="#e0e0e0"/><path d="M4 30q6-1 10-5" stroke="#fff" stroke-dasharray="1.6 1.6" stroke-width=".8" fill="none" opacity=".8"/>`,
  // bicycle
  r => lite(r) + `<circle cx="10" cy="26" r="7" stroke="#424242" stroke-width="1.6" fill="none"/><circle cx="30" cy="26" r="7" stroke="#424242" stroke-width="1.6" fill="none"/><path d="M10 26l7-11h10l3 11M17 15l5 11 5-11M15 13h5M27 15l-1-4h3" stroke="${C(r, 70, 50)}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`,
  // little car
  r => bg(r) + `<path d="M5 27v-5q0-3 3-3h3l4-6h11l5 6h3q3 0 3 3v5z" fill="${C(r, 70, 55)}"/><path d="M16 14h4v5h-8zM22 14h3l4 5h-7z" fill="#e3f2fd"/><circle cx="12" cy="28" r="3.4" fill="#263238"/><circle cx="28" cy="28" r="3.4" fill="#263238"/><circle cx="12" cy="28" r="1.4" fill="#b0bec5"/><circle cx="28" cy="28" r="1.4" fill="#b0bec5"/>`,
  // tent under stars
  r => avFlat(hsl(rr(r, 220, 250), 45, 18)) + starsN(r, 14, 26) + `<rect y="30" width="40" height="10" fill="${hsl(120, 25, 18)}"/><path d="M8 32l12-16 12 16z" fill="${C(r, 70, 50)}"/><path d="M20 16l-4 16h8z" fill="#ffe082"/>`,
  // cozy house
  r => bg(r) + `<path d="M8 20l12-10 12 10v14H8z" fill="${pastel(r)}"/><path d="M6 21l14-12 14 12" stroke="${C(r, 55, 40)}" stroke-width="3" fill="none" stroke-linejoin="round"/><rect x="17" y="25" width="6" height="9" fill="${C(r, 50, 40)}"/><rect x="11" y="22" width="4" height="4" fill="#ffe082"/><rect x="25" y="22" width="4" height="4" fill="#ffe082"/>`,
  // key
  r => lite(r) + `<g transform="rotate(${rr(r, -45, 45)} 20 20)"><circle cx="12" cy="20" r="6" stroke="${avPick(r, ['#fbc02d', '#bdbdbd', '#bcaaa4'])}" stroke-width="2.6" fill="none"/><path d="M18 20h16M30 20v4M34 20v3" stroke="${avPick(r, ['#fbc02d', '#bdbdbd'])}" stroke-width="2.6"/></g>`,
  // anchor
  r => lite(r) + `<circle cx="20" cy="9" r="3" stroke="#37474f" stroke-width="1.8" fill="none"/><path d="M20 12v22M14 17h12M8 26q2 9 12 8 10 1 12-8" stroke="#37474f" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // hourglass
  r => bg(r) + `<path d="M11 6h18M11 34h18" stroke="#6d4c41" stroke-width="2.4"/><path d="M13 7q0 9 7 13-7 4-7 13h14q0-9-7-13 7-4 7-13z" fill="#e3f2fd" opacity=".8"/><path d="M15 11q5 2 10 0l-5 8zM14 33q6-6 12 0z" fill="${avPick(r, ['#ffca28', '#ff8a65', '#ce93d8'])}"/>`,
  // light bulb
  r => bg(r) + `<circle cx="20" cy="16" r="9" fill="#fff59d"/><path d="M15 23h10l-1 5h-8z" fill="#fff59d"/><rect x="16" y="28" width="8" height="5" rx="1" fill="#9e9e9e"/><path d="M18 22l1-6 2 3 1-3" stroke="#f9a825" stroke-width=".8" fill="none"/>` + Array.from({length: 6}, (_, k) => `<path d="M${20 + Math.cos(k * 1.05 - 1.6) * 12} ${16 + Math.sin(k * 1.05 - 1.6) * 12}l${Math.cos(k * 1.05 - 1.6) * 3} ${Math.sin(k * 1.05 - 1.6) * 3}" stroke="#fff59d" stroke-width="1.2"/>`).join(''),
  // rubber duck in the bath
  r => solid(hsl(rr(r, 180, 200), 60, 80)) + `<path d="M0 28q5-2 10 0t10 0 10 0 10 0v12H0z" fill="#b3e5fc"/><path d="M8 27q0-7 9-7 2-6 7-5t4 6q6 1 6 6z" fill="#ffeb3b"/><path d="M30 20q4 0 5 2-3 1-5 0z" fill="#ff9800"/><circle cx="27" cy="18" r=".9" fill="#212121"/>` + Array.from({length: 5}, () => `<circle cx="${rr(r, 3, 37)}" cy="${rr(r, 4, 22)}" r="${rr(r, 1, 2.4)}" fill="#fff" opacity=".7" stroke="#b3e5fc" stroke-width=".4"/>`).join(''),
  // sunflower
  r => solid(hsl(rr(r, 195, 215), 65, 80)) + `<path d="M20 26v14" stroke="#43a047" stroke-width="2"/>` + Array.from({length: 12}, (_, k) => `<ellipse cx="${20 + Math.cos(k * .52) * 8}" cy="${17 + Math.sin(k * .52) * 8}" rx="4" ry="2" fill="#fdd835" transform="rotate(${k * 30} ${20 + Math.cos(k * .52) * 8} ${17 + Math.sin(k * .52) * 8})"/>`).join('') + `<circle cx="20" cy="17" r="5.5" fill="#6d4c41"/>` + (r() < .5 ? face(r, 20, 17.5, .6, '#fff8e1') : ''),
  // cactus
  r => bg(r) + `<path d="M13 30h14l-2 7H15z" fill="${avPick(r, ['#d84315', '#f8bbd0', '#90caf9', '#ffe082'])}"/><rect x="16" y="9" width="8" height="22" rx="4" fill="#43a047"/><path d="M16 21h-3a2 2 0 0 1-2-2v-4M24 18h3a2 2 0 0 0 2-2v-3" stroke="#43a047" stroke-width="3.4" stroke-linecap="round" fill="none"/>` + face(r, 20, 17, .7) + (r() < .5 ? `<circle cx="20" cy="8" r="2" fill="#f06292"/>` : ''),
  // game controller
  r => bg(r) + `<path d="M8 15h24q5 0 6 7l1 7q0 4-4 4-3 0-5-4H10q-2 4-5 4-4 0-4-4l1-7q1-7 6-7z" fill="${avPick(r, ['#424242', '#eceff1', '#7e57c2', '#ef5350', '#26a69a'])}"/><path d="M10 20v5M7.5 22.5h5" stroke="#fff" stroke-width="1.6"/><circle cx="28" cy="20.5" r="1.4" fill="#ffeb3b"/><circle cx="31" cy="23" r="1.4" fill="#4fc3f7"/><circle cx="25" cy="23" r="1.4" fill="#ef5350"/><circle cx="28" cy="25.5" r="1.4" fill="#66bb6a"/>`,
  // laptop with stickers
  r => bg(r) + `<rect x="7" y="9" width="26" height="18" rx="2" fill="${avPick(r, ['#b0bec5', '#424242', '#f5f5f5'])}"/><path d="M4 28h32l-2 3H6z" fill="#90a4ae"/>` + Array.from({length: 4}, () => `<circle cx="${rr(r, 11, 29)}" cy="${rr(r, 12, 24)}" r="${rr(r, 1.6, 3)}" fill="${C(r, 75, 60)}"/>`).join(''),
  // headphones on a stand / big
  r => bg(r) + `<path d="M8 24a12 12 0 0 1 24 0" stroke="${avPick(r, ['#212121', '#e0e0e0', '#f48fb1'])}" stroke-width="3" fill="none"/><rect x="5" y="22" width="7" height="11" rx="3" fill="${C(r, 60, 50)}"/><rect x="28" y="22" width="7" height="11" rx="3" fill="${C(r, 60, 50)}"/>` + (r() < .6 ? `<path d="M17 18l3-5v8a2 2 0 1 1-1-1.7" stroke="#fff" stroke-width="1.2" fill="none"/>` : ''),
  // books stacked
  r => bg(r) + Array.from({length: 4}, (_, k) => `<rect x="${8 + rr(r, -2, 2)}" y="${30 - k * 6}" width="${24 - k * 2}" height="5.4" rx="1" fill="${C(r, 60, 55)}"/><path d="M${10} ${32 - k * 6}h${18 - k * 2}" stroke="#fff" stroke-width=".6" opacity=".6"/>`).join('') + (r() < .5 ? `<path d="M22 11q2-4 5-3" stroke="#43a047" stroke-width="1.4" fill="none"/>` : ''),
  // globe
  r => bg(r) + `<path d="M8 34h24M20 30v4" stroke="#6d4c41" stroke-width="2"/><circle cx="20" cy="17" r="11" fill="#4fc3f7"/><path d="M13 12q4-2 6 1t-1 6-4 4-2-5zM23 9q5 1 6 6t-3 5-2-4z" fill="#81c784"/><path d="M8 17a12 12 0 0 0 24 0" stroke="#8d6e63" stroke-width="1.2" fill="none"/>`,
  // crystal
  r => { const c1 = C(r, 70, 65); return bg(r) + `<path d="M20 4l8 10-8 22-8-22z" fill="${c1}"/><path d="M20 4l-8 10h16zM20 36l-8-22h8z" fill="#fff" opacity=".3"/><path d="M8 34l3-8 4 8zM29 34l3-6 3 6z" fill="${c1}" opacity=".7"/>`; },
];

/* ---- places and skies ---- */
const PLACES = [
  // beach at sunset, sun on the water
  r => { const h = rr(r, 0, 40); return bgGrad('p' + Math.floor(r() * 1e6), hsl(330 + h, 70, 60), hsl(30 + h, 90, 70)) + `<circle cx="${rr(r, 12, 28)}" cy="24" r="7" fill="#fff3b0"/><rect y="25" width="40" height="15" fill="${hsl(220 + h, 45, 40)}"/><path d="M14 28h12M16 31h8M18 34h4" stroke="#fff3b0" stroke-width="1" opacity=".7"/>`; },
  // aurora
  r => { const id = 'au' + Math.floor(r() * 1e6); return avFlat(hsl(rr(r, 215, 240), 50, 12)) + starsN(r, 12) + `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(rr(r, 120, 170), 90, 60)}" stop-opacity="0"/><stop offset="1" stop-color="${hsl(rr(r, 120, 170), 90, 60)}" stop-opacity=".9"/></linearGradient></defs><path d="M0 22q10-12 20-4t20-6v14H0z" fill="url(#${id})"/><path d="M0 34l8-6 6 4 8-7 8 6 10-5v14H0z" fill="${hsl(220, 30, 8)}"/>`; },
  // desert dunes
  r => solid(hsl(rr(r, 25, 45), 80, 80)) + `<circle cx="${rr(r, 8, 32)}" cy="10" r="4" fill="#fff"/><path d="M0 28q12-10 24-2t16 0v14H0z" fill="${hsl(32, 70, 62)}"/><path d="M0 34q15-8 28-2t12 1v7H0z" fill="${hsl(28, 65, 52)}"/>` + (r() < .5 ? `<path d="M30 30v-8M30 25h-2v-3M30 24h2v-3" stroke="#2e7d32" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : ''),
  // foggy forest
  r => solid(hsl(rr(r, 150, 200), 15, rr(r, 75, 85))) + [0, 1, 2].map(row => Array.from({length: 6}, (_, k) => { const x = k * 7 + rr(r, -2, 2) + row * 3, y = 20 + row * 7, s = 1 + row * .25; return `<path d="M${x} ${y - 11 * s}l${4 * s} ${11 * s}h${-8 * s}z" fill="${hsl(150, 25, 50 - row * 14)}"/>`; }).join('')).join('') + `<rect y="${rr(r, 22, 28)}" width="40" height="4" fill="#fff" opacity=".35"/>`,
  // volcano
  r => solid(hsl(rr(r, 10, 30), 60, rr(r, 70, 80))) + `<path d="M4 40l12-22h8l12 22z" fill="#5d4037"/><path d="M16 18h8l-2 5-2-2-2 3z" fill="#ff7043"/><circle cx="18" cy="11" r="4" fill="#9e9e9e" opacity=".6"/><circle cx="23" cy="7" r="3" fill="#9e9e9e" opacity=".5"/>`,
  // tiny island
  r => solid(hsl(rr(r, 185, 205), 70, rr(r, 70, 82))) + `<rect y="24" width="40" height="16" fill="${hsl(195, 70, 50)}"/><ellipse cx="20" cy="26" rx="10" ry="3" fill="#ffe082"/><path d="M20 25q-1-8 2-12" stroke="#6d4c41" stroke-width="1.4" fill="none"/><path d="M22 13q-6-2-9 2 4-1 9-2zM22 13q6-3 9 1-4-1-9-1zM22 13q-2 5-1 7" stroke="#43a047" stroke-width="1.8" fill="none"/>`,
  // moon over the sea
  r => avFlat(hsl(rr(r, 220, 245), 50, 16)) + starsN(r, 10, 24) + `<circle cx="${rr(r, 12, 28)}" cy="13" r="6" fill="#f5edc4"/><rect y="25" width="40" height="15" fill="${hsl(225, 50, 22)}"/><path d="M15 28h10M17 31h6M18.5 34h3" stroke="#f5edc4" stroke-width="1" opacity=".6"/>`,
  // campfire
  r => avFlat(hsl(rr(r, 220, 260), 35, 14)) + starsN(r, 10, 20) + `<circle cx="20" cy="27" r="12" fill="#ff9800" opacity=".18"/><path d="M12 34l16-4M12 30l16 4" stroke="#6d4c41" stroke-width="2.4" stroke-linecap="round"/><path d="M20 16q7 7 3 14h-6q-4-7 3-14z" fill="#ff7043"/><path d="M20 22q3 3 1 8h-2q-2-5 1-8z" fill="#ffeb3b"/>`,
  // cabin in the snow
  r => solid(hsl(rr(r, 200, 225), 35, 72)) + Array.from({length: 18}, () => `<circle cx="${rr(r, 0, 40)}" cy="${rr(r, 0, 30)}" r="${rr(r, .4, 1)}" fill="#fff"/>`).join('') + `<rect y="30" width="40" height="10" fill="#fafafa"/><path d="M10 31V22h18v9z" fill="#6d4c41"/><path d="M8 23l11-8 11 8z" fill="#fafafa"/><rect x="13" y="24" width="4" height="4" fill="#ffe082"/>`,
  // ferris wheel
  r => solid(hsl(rr(r, 260, 340), 55, rr(r, 70, 82))) + `<circle cx="20" cy="18" r="12" stroke="#fff" stroke-width="1.4" fill="none"/>` + Array.from({length: 8}, (_, k) => { const a = k * .785, x = 20 + Math.cos(a) * 12, y = 18 + Math.sin(a) * 12; return `<path d="M20 18L${x} ${y}" stroke="#fff" stroke-width=".7"/><rect x="${x - 2}" y="${y}" width="4" height="3" rx="1" fill="${C(r, 75, 60)}"/>`; }).join('') + `<path d="M14 40l6-22 6 22" stroke="#fff" stroke-width="1.4" fill="none"/>`,
  // rainbow
  r => solid(hsl(rr(r, 190, 210), 70, 82)) + ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'].map((c, k) => `<path d="M${4 + k * 2} 34a${16 - k * 2} ${16 - k * 2} 0 0 1 ${32 - k * 4} 0" stroke="${c}" stroke-width="2" fill="none"/>`).join('') + `<ellipse cx="6" cy="34" rx="6" ry="3" fill="#fff"/><ellipse cx="34" cy="34" rx="6" ry="3" fill="#fff"/>`,
  // waves
  r => { const h = rr(r, 180, 230); return solid(hsl(h, 60, 85)) + [0, 1, 2, 3].map(k => `<path d="M0 ${16 + k * 6}q5-4 10 0t10 0 10 0 10 0v${30 - k * 6}H0z" fill="${hsl(h, 65, 70 - k * 12)}"/>`).join(''); },
  // galaxy spiral
  r => { const h = rr(r, 240, 320); return avFlat(hsl(h, 50, 10)) + starsN(r, 18) + Array.from({length: 60}, (_, k) => { const a = k * .35, d = k * .28; return `<circle cx="${20 + Math.cos(a) * d}" cy="${20 + Math.sin(a) * d * .6}" r="${(1.6 - k / 50).toFixed(2)}" fill="${hsl(h + k * 2, 80, 75)}" opacity="${(1 - k / 70).toFixed(2)}"/>`; }).join(''); },
  // ringed planet
  r => { const c1 = C(r, 65, 60); return avFlat(hsl(rr(r, 220, 260), 45, 14)) + starsN(r, 14) + `<ellipse cx="20" cy="21" rx="17" ry="4" stroke="${hsl(40, 70, 75)}" stroke-width="1.6" fill="none" transform="rotate(-18 20 21)"/><circle cx="20" cy="20" r="9" fill="${c1}"/><path d="M11 22q9 3 18-3" stroke="#fff" stroke-width="1" opacity=".3" fill="none"/>`; },
  // city at night with lit windows
  r => avFlat(hsl(rr(r, 225, 260), 45, 16)) + `<circle cx="32" cy="8" r="3" fill="#f5edc4"/>` + Array.from({length: 6}, (_, k) => { const x = k * 7, h = rr(r, 12, 30); return `<rect x="${x}" y="${40 - h}" width="6.4" height="${h}" fill="${hsl(230, 25, rr(r, 18, 28))}"/>` + Array.from({length: Math.floor(h / 4)}, (_, j) => r() < .45 ? `<rect x="${x + 1.2 + (j % 2) * 2.4}" y="${42 - h + j * 3.6}" width="1.6" height="1.6" fill="#ffe082"/>` : '').join(''); }).join(''),
  // mountain lake at dawn
  r => { const h = rr(r, 0, 60); return bgGrad('ml' + Math.floor(r() * 1e6), hsl(200 + h, 50, 75), hsl(20 + h, 70, 82)) + `<path d="M0 26l9-12 6 7 7-11 9 12 9-6v10z" fill="${hsl(220, 20, 40)}"/><path d="M0 26l9 10 6-6 7 9 9-10 9 5v-8z" fill="${hsl(220, 20, 40)}" opacity=".35"/><rect y="26" width="40" height="14" fill="${hsl(205, 50, 60)}" opacity=".5"/>`; },
];

/* ---- original little characters ---- */
const BLOBS = [
  // a mochi blob
  r => { const c1 = pastel(r); return bg(r) + `<path d="M6 30q0-16 14-16t14 16q0 4-14 4T6 30z" fill="${c1}"/><ellipse cx="14" cy="20" rx="2.5" ry="1.4" fill="#fff" opacity=".7"/>` + face(r, 20, 26); },
  // a ghost
  r => avFlat(hsl(rr(r, 230, 290), 40, rr(r, 15, 30))) + starsN(r, 6) + `<path d="M10 34V18a10 10 0 0 1 20 0v16l-3.3-3-3.3 3-3.4-3-3.3 3-3.4-3z" fill="#fafafa"/>` + face(r, 20, 20),
  // a slime
  r => { const c1 = C(r, 70, 60); return bg(r) + `<path d="M5 34q2-20 15-20t15 20z" fill="${c1}"/><path d="M12 34q1-4 3 0M25 34q1-5 3 0" fill="${c1}"/><ellipse cx="13" cy="21" rx="2" ry="3" fill="#fff" opacity=".5"/>` + face(r, 20, 26); },
  // a star buddy
  r => { const c1 = avPick(r, ['#fdd835', '#ffb74d', '#f06292', '#4fc3f7']); return bg(r) + `<path d="M20 4l4.7 9.6 10.5 1.5-7.6 7.4 1.8 10.5L20 28l-9.4 5 1.8-10.5-7.6-7.4 10.5-1.5z" fill="${c1}" stroke="#fff" stroke-width=".8"/>` + face(r, 20, 19, .8); },
  // a cloud buddy
  r => solid(hsl(rr(r, 190, 220), 70, rr(r, 70, 82))) + `<path d="M9 30a6 6 0 0 1 1-12 8 8 0 0 1 15-3 6 6 0 0 1 6 8 4 4 0 0 1-1 7z" fill="#fff"/>` + face(r, 20, 23) + (r() < .5 ? Array.from({length: 4}, (_, k) => `<path d="M${13 + k * 4} 32l-1 3" stroke="#4fc3f7" stroke-width="1"/>`).join('') : ''),
  // a moon buddy
  r => avFlat(hsl(rr(r, 225, 260), 45, 16)) + starsN(r, 10) + `<path d="M24 6a14 14 0 1 0 10 22 11 11 0 1 1-10-22z" fill="#fff3b0"/>` + face(r, 17, 21, .8),
  // a sun buddy
  r => solid(hsl(rr(r, 190, 210), 70, 80)) + Array.from({length: 10}, (_, k) => `<path d="M${20 + Math.cos(k * .628) * 11} ${20 + Math.sin(k * .628) * 11}l${Math.cos(k * .628) * 5} ${Math.sin(k * .628) * 5}" stroke="#ffb300" stroke-width="2" stroke-linecap="round"/>`).join('') + `<circle cx="20" cy="20" r="9.5" fill="#ffd54f"/>` + face(r, 20, 21),
  // an onigiri
  r => bg(r) + `<path d="M20 6q14 18 12 26H8Q6 24 20 6z" fill="#fafafa"/><rect x="13" y="26" width="14" height="8" fill="#263238"/>` + face(r, 20, 20),
  // a little monster with one eye
  r => { const c1 = C(r, 65, 55); return bg(r) + `<path d="M12 10l-2-6 5 5M28 10l2-6-5 5" fill="${c1}"/><rect x="8" y="9" width="24" height="26" rx="11" fill="${c1}"/><circle cx="20" cy="19" r="5" fill="#fff"/><circle cx="${rr(r, 19, 21)}" cy="19.5" r="2.4" fill="#212121"/><path d="M15 28q5 4 10 0" stroke="#212121" stroke-width="1.2" fill="none"/><path d="M17 29.6l1 1.6 1-1.4M21 29.6l1 1.6 1-1.4" fill="#fff"/>`; },
  // a tiny robot
  r => bg(r) + `<path d="M20 4v5" stroke="#90a4ae" stroke-width="1.4"/><circle cx="20" cy="4" r="1.8" fill="#ef5350"/><rect x="9" y="9" width="22" height="18" rx="5" fill="${avPick(r, ['#b0bec5', '#90caf9', '#ffcc80', '#c5e1a5'])}"/><rect x="12" y="13" width="16" height="9" rx="3" fill="#263238"/><circle cx="16" cy="17.5" r="1.6" fill="#4dd0e1"/><circle cx="24" cy="17.5" r="1.6" fill="#4dd0e1"/><rect x="13" y="28" width="14" height="8" rx="2" fill="#90a4ae"/>`,
  // a mushroom friend
  r => bg(r) + `<rect x="15" y="20" width="10" height="14" rx="4" fill="#fff3e0"/><path d="M5 22q0-15 15-15t15 15z" fill="${avPick(r, ['#e53935', '#8e24aa', '#fb8c00', '#3949ab'])}"/>` + Array.from({length: 4}, () => `<circle cx="${rr(r, 10, 30)}" cy="${rr(r, 11, 18)}" r="${rr(r, 1.4, 2.4)}" fill="#fff"/>`).join('') + face(r, 20, 27, .7),
  // a jelly bean family
  r => bg(r) + [10, 20, 30].map(x => `<ellipse cx="${x}" cy="${rr(r, 18, 26)}" rx="4.4" ry="7" fill="${C(r, 75, 60)}" transform="rotate(${rr(r, -20, 20)} ${x} 22)"/>`).join(''),
];

/* ---- sports ---- */
const SPORTS = [
  r => solid(hsl(rr(r, 100, 140), 45, 45)) + `<circle cx="20" cy="20" r="12" fill="#fafafa"/><path d="M20 13l5 3.6-2 6h-6l-2-6z" fill="#212121"/><path d="M20 13V8M25 16.6l5-1.6M23 22.6l3 4.4M17 22.6l-3 4.4M15 16.6l-5-1.6" stroke="#212121" stroke-width="1"/>`,
  r => solid(hsl(rr(r, 10, 30), 70, 60)) + `<circle cx="20" cy="20" r="12" fill="#d4e157"/><path d="M9 14q11 6 0 13M31 14q-11 6 0 13" stroke="#fff" stroke-width="1.4" fill="none"/>`,
  r => bg(r) + `<circle cx="20" cy="20" r="12" fill="#fafafa"/><path d="M12 11q4 9 0 18M28 11q-4 9 0 18" stroke="#e53935" stroke-width="1" stroke-dasharray="1.2 1" fill="none"/>`,
  r => bg(r) + `<circle cx="20" cy="20" r="12" fill="#fafafa"/><path d="M20 8q-6 12 0 24M8 20q12-6 24 0M12 12q10 2 16 16" stroke="${avPick(r, ['#1e88e5', '#fdd835', '#e53935'])}" stroke-width="2" fill="none"/>`,
  r => solid(hsl(rr(r, 100, 130), 40, 40)) + `<ellipse cx="20" cy="20" rx="14" ry="8.5" fill="#8d4e2a" transform="rotate(-30 20 20)"/><path d="M14 23l12-6M16 18l2 3M19 16.6l2 3M22 15l2 3" stroke="#fff" stroke-width="1"/>`,
  r => avFlat(hsl(rr(r, 200, 230), 40, 25)) + `<rect x="6" y="24" width="28" height="4" fill="#90a4ae"/><path d="M34 26q4-10-2-16" stroke="#bdbdbd" stroke-width="1.6" fill="none"/><circle cx="${rr(r, 14, 24)}" cy="14" r="5" fill="#ff7043"/>`,
  r => solid(hsl(rr(r, 0, 360), 40, 82)) + `<circle cx="20" cy="22" r="12" fill="${avPick(r, ['#212121', '#3949ab', '#c62828'])}"/><circle cx="16" cy="18" r="1.6" fill="#fff" opacity=".7"/><circle cx="20" cy="16" r="1.6" fill="#fff" opacity=".7"/><circle cx="18" cy="21" r="1.6" fill="#fff" opacity=".7"/>`,
  r => solid(hsl(rr(r, 180, 210), 60, 75)) + `<rect y="28" width="40" height="12" fill="#eceff1"/><path d="M8 30l8-16 4 6 4-4 8 14z" fill="#fafafa"/><path d="M26 6l-14 26M28 6l-14 26" stroke="${C(r, 70, 50)}" stroke-width="1.6"/>`,
  r => solid(hsl(rr(r, 190, 210), 70, rr(r, 55, 70))) + `<path d="M0 30q10-4 20 0t20 0v10H0z" fill="#e1f5fe"/><path d="M8 26q6-2 10 2l10-14" stroke="#fafafa" stroke-width="2.4" fill="none"/><circle cx="29" cy="12" r="3" fill="#ffcc80"/>`,
];

/* ---- patterns ---- */
const PATTERNS = [
  // terrazzo
  r => solid(pastel(r)) + Array.from({length: 22}, () => `<path d="M${rr(r, 0, 40)} ${rr(r, 0, 40)}l${rr(r, 1, 3)} ${rr(r, -2, 2)} ${rr(r, -2, 2)} ${rr(r, 1, 3)}z" fill="${C(r, 60, 55)}"/>`).join(''),
  // topographic lines
  r => { const c1 = deep(r); return avFlat(c1) + Array.from({length: 8}, (_, k) => `<ellipse cx="${18 + k * .6}" cy="${20 - k * .4}" rx="${3 + k * 3}" ry="${2 + k * 2.4}" fill="none" stroke="#fff" stroke-width=".6" opacity=".6" transform="rotate(${rr(r, -20, 20)} 20 20)"/>`).join(''); },
  // plaid
  r => { const a = C(r, 60, 45), b = C(r, 60, 60); return avFlat(a) + [6, 18, 30].map(v => `<rect x="${v}" width="5" height="40" fill="${b}" opacity=".55"/><rect y="${v}" width="40" height="5" fill="${b}" opacity=".55"/>`).join('') + [12, 24, 36].map(v => `<path d="M${v} 0v40M0 ${v}h40" stroke="#fff" stroke-width=".5" opacity=".5"/>`).join(''); },
  // zigzag
  r => avFlat(C(r, 60, 55)) + Array.from({length: 6}, (_, k) => `<path d="M0 ${k * 7 + 3}l5 4 5-4 5 4 5-4 5 4 5-4 5 4 5-4" stroke="#fff" stroke-width="1.6" fill="none" opacity="${.5 + (k % 2) * .4}"/>`).join(''),
  // hexagons
  r => { const c1 = C(r, 55, 55); return avFlat(c1) + Array.from({length: 20}, (_, k) => { const x = (k % 5) * 9 + (Math.floor(k / 5) % 2) * 4.5, y = Math.floor(k / 5) * 8 + 4; return `<path d="M${x} ${y - 4}l3.6 2v4l-3.6 2-3.6-2v-4z" fill="${r() < .3 ? '#fff' : 'none'}" stroke="#fff" stroke-width=".6" opacity=".55"/>`; }).join(''); },
  // marbled swirl
  r => { const a = C(r, 55, 65), b = C(r, 55, 45); return avFlat(a) + Array.from({length: 4}, (_, k) => `<path d="M-5 ${8 + k * 9}q12-8 20 2t30-4" stroke="${b}" stroke-width="${rr(r, 2, 5)}" fill="none" opacity=".7"/>`).join(''); },
  // polka dots, big
  r => avFlat(C(r, 65, 60)) + Array.from({length: 9}, (_, k) => `<circle cx="${(k % 3) * 14 + 6}" cy="${Math.floor(k / 3) * 14 + 6}" r="4" fill="#fff" opacity=".85"/>`).join(''),
  // triangles mosaic
  r => { const h = rr(r, 0, 360); return Array.from({length: 16}, (_, k) => { const x = (k % 4) * 10, y = Math.floor(k / 4) * 10; return `<path d="M${x} ${y}h10v10z" fill="${hsl(h + rr(r, -30, 30), 60, rr(r, 45, 70))}"/><path d="M${x} ${y}v10h10z" fill="${hsl(h + rr(r, -30, 30), 60, rr(r, 45, 70))}"/>`; }).join(''); },
  // gradient orbs
  r => { const id = 'go' + Math.floor(r() * 1e6); return avFlat(hsl(rr(r, 0, 360), 50, 20)) + `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${C(r, 90, 70)}"/><stop offset="1" stop-color="${C(r, 90, 70)}" stop-opacity="0"/></radialGradient></defs>` + Array.from({length: 3}, () => `<circle cx="${rr(r, 5, 35)}" cy="${rr(r, 5, 35)}" r="${rr(r, 10, 18)}" fill="url(#${id})"/>`).join(''); },
  // stripes with a sun
  r => Array.from({length: 5}, (_, k) => `<rect y="${k * 8}" width="40" height="8" fill="${hsl(rr(r, 0, 360), 65, 55 + k * 5)}"/>`).join('') + `<circle cx="20" cy="22" r="9" fill="#fff3b0" opacity=".9"/>`,
];

ANIMALS.push(...ANIMALS2); THINGS.push(...OBJ); NATURE.push(...PLACES); ABSTRACT.push(...PATTERNS); CHARACTERS.push(...BLOBS);
AV_KINDS.splice(AV_KINDS.length - 2, 0, ['food', 10, FOOD], ['sports', 4, SPORTS]);
// the shares of each kind, now that there are many more of some
const W = {person: 16, animal: 18, nature: 14, character: 13, thing: 15, space: 5, abstract: 6, food: 8, sports: 3, mono: 2, none: 3};
AV_KINDS.forEach(k => { if (W[k[0]] != null) k[1] = W[k[0]]; });
AV_CACHE.clear();
}
