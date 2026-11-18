/* ---------- profile pictures for the other players ----------
   Like real profiles, each player picked their own kind of picture, and the pictures differ in what they show,
   the angle and the framing: a selfie, someone seen from the side or from behind, a tiny figure in a landscape,
   a pet asleep, a cup from above, a planet, an original game-style character, a pattern, a styled letter, or
   nothing at all (plain initials). Each is drawn here as a small SVG from the player's number, so the same player
   always looks the same on every device and nothing is downloaded. On top of the scene, some pictures are
   zoomed or cropped, mirrored, or given a photo filter. Every character and design is original. */

const AV_CACHE = new Map();
const avRng = seed => mulberry32((seed * 2654435761) >>> 0 ^ 0x5bd1e995);
const hsl = (h, s, l, a) => `hsl(${Math.round(((h % 360) + 360) % 360)} ${s}% ${l}%${a != null ? ' / ' + a : ''})`;
const avPick = (r, a) => a[Math.floor(r() * a.length)];
const rr = (r, a, b) => a + r() * (b - a);
const SKIN = ['#f6d7c3', '#eec4a5', '#e0ac85', '#c98e64', '#a86f48', '#7c4f31', '#5b3a24'];
const HAIR = ['#1d1a1a', '#3b2a20', '#5d3b25', '#8a5a33', '#c9a26a', '#e8d29a', '#b4472b', '#7d7d86', '#2b3a8f', '#a0337a', '#2f8f6b', '#e7e7ea', '#f08cb6'];
const lin = (id, c1, c2, x2 = 0, y2 = 1) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`;
const bgGrad = (id, c1, c2, x2, y2) => lin(id, c1, c2, x2, y2) + `<rect width="40" height="40" fill="url(#${id})"/>`;
const starsN = (r, n, maxY = 40) => Array.from({length: n}, () => `<circle cx="${rr(r, 0, 40).toFixed(1)}" cy="${rr(r, 0, maxY).toFixed(1)}" r="${rr(r, .25, .8).toFixed(2)}" fill="#fff" opacity="${rr(r, .4, 1).toFixed(2)}"/>`).join('');
let AVR = Math.random;                         // the current picture's random source (set while drawing)
const avFlat = c => `<rect width="40" height="40" fill="${c}"/>`;
// a flat colour behind a subject: about half stay flat, the rest get their own texture or light
const BACKS = [
  () => '', () => '', () => '', () => '',
  r => `<circle cx="${rr(r, 10, 30)}" cy="${rr(r, 8, 22)}" r="${rr(r, 12, 20)}" fill="#fff" opacity=".22"/>`,
  r => `<path d="M0 ${rr(r, 20, 34)}L40 ${rr(r, 6, 20)}V40H0z" fill="#000" opacity=".09"/>`,
  r => { let d = ''; const g = avPick(r, [5, 6, 8]); for (let y = g / 2; y < 40; y += g) for (let x = g / 2; x < 40; x += g) d += `<circle cx="${x}" cy="${y}" r="${(g / 8).toFixed(2)}"/>`; return `<g fill="#fff" opacity=".35">${d}</g>`; },
  r => `<g stroke="#fff" stroke-width="${rr(r, .6, 1.4)}" opacity=".2" transform="rotate(${avPick(r, [0, 45, -45, 90])} 20 20)">${Array.from({length: 12}, (_, k) => `<path d="M-20 ${k * 6 - 16}h80"/>`).join('')}</g>`,
  r => `<g stroke="#000" stroke-width=".5" opacity=".12">${[8, 16, 24, 32].map(v => `<path d="M${v} 0v40M0 ${v}h40"/>`).join('')}</g>`,
  r => Array.from({length: 7}, () => `<circle cx="${rr(r, 0, 40)}" cy="${rr(r, 0, 40)}" r="${rr(r, 2, 6)}" fill="#fff" opacity="${rr(r, .12, .3).toFixed(2)}"/>`).join(''),
  r => Array.from({length: 14}, () => `<rect x="${rr(r, 0, 38)}" y="${rr(r, 0, 38)}" width="1.6" height=".8" rx=".4" fill="${hsl(rr(r, 0, 360), 80, 60)}" transform="rotate(${rr(r, 0, 180)} 20 20)" opacity=".7"/>`).join(''),
  r => `<path d="M0 ${rr(r, 28, 34)}q10-4 20 0t20 0V40H0z" fill="#fff" opacity=".22"/><path d="M0 ${rr(r, 33, 37)}q10-4 20 0t20 0V40H0z" fill="#fff" opacity=".2"/>`,
  r => Array.from({length: 12}, (_, k) => `<path d="M20 44L${20 + 60 * Math.cos(k * Math.PI / 6)} ${44 + 60 * Math.sin(k * Math.PI / 6)}L${20 + 60 * Math.cos((k + .5) * Math.PI / 6)} ${44 + 60 * Math.sin((k + .5) * Math.PI / 6)}z" fill="#fff" opacity=".1"/>`).join(''),
  r => `<rect width="40" height="${rr(r, 14, 26)}" fill="#fff" opacity=".18"/>`,
  r => `<circle cx="${avPick(r, [0, 40])}" cy="${avPick(r, [0, 40])}" r="${rr(r, 16, 26)}" fill="${hsl(rr(r, 0, 360), 70, 65)}" opacity=".55"/>`,
];
const solid = c => avFlat(c) + avPick(AVR, BACKS)(AVR);

/* ---------------- people: different angles and situations ---------------- */
function headFront(r, cx, cy, s, skin, hair, opts = {}){
  const st = opts.style || avPick(r, ['short', 'long', 'bun', 'curly', 'buzz', 'side', 'afro', 'bob', 'spiky']);
  const back = st === 'long' ? `<path d="M${cx - 8 * s} ${cy}c0-9 4-13 ${8 * s}-13s${8 * s} 4 ${8 * s} 13v${15 * s}h${-16 * s}z" fill="${hair}"/>`
    : st === 'afro' ? `<circle cx="${cx}" cy="${cy - 2 * s}" r="${11 * s}" fill="${hair}"/>` : st === 'bob' ? `<path d="M${cx - 8.5 * s} ${cy + 5 * s}c-1-10 3-15 ${8.5 * s}-15s${9.5 * s} 5 ${8.5 * s} 15z" fill="${hair}"/>` : '';
  const top = st === 'curly' ? [-6, -3.6, -1.2, 1.2, 3.6, 6].map((x, k) => `<circle cx="${cx + x * s}" cy="${cy - 7.5 * s + (k % 2) * 1.3 * s}" r="${3 * s}" fill="${hair}"/>`).join('')
    : st === 'bun' ? `<circle cx="${cx}" cy="${cy - 11 * s}" r="${3.4 * s}" fill="${hair}"/><path d="M${cx - 7.4 * s} ${cy - 2 * s}c0-5 3.4-8 ${7.4 * s}-8s${7.4 * s} 3 ${7.4 * s} 8c-3-2.5-12-2.5-${14.8 * s} 0z" fill="${hair}"/>`
    : st === 'buzz' ? `<path d="M${cx - 7.2 * s} ${cy - 2.5 * s}c.5-4.5 3.6-7 ${7.2 * s}-7s${6.7 * s} 2.5 ${7.2 * s} 7c-4-2-10-2-${14.4 * s} 0z" fill="${hair}" opacity=".8"/>`
    : st === 'spiky' ? `<path d="M${cx - 8 * s} ${cy - 1 * s}l-1-${8 * s} ${3 * s} ${3 * s} ${1 * s}-${6 * s} ${3 * s} ${4 * s} ${2 * s}-${6 * s} ${2 * s} ${6 * s} ${3 * s}-${4 * s} ${1 * s} ${6 * s} ${3 * s}-${3 * s}-1 ${8 * s}c-4-3-12-3-${16 * s} 0z" fill="${hair}"/>`
    : st === 'side' ? `<path d="M${cx - 7.6 * s} ${cy}c0-6 3.6-9.5 ${7.6 * s}-9.5s${7.8 * s} 3 ${7.8 * s} 9c-4-4-9-5-${15.4 * s}.5z" fill="${hair}"/>`
    : `<path d="M${cx - 7.5 * s} ${cy - 1.5 * s}c0-5 3.5-8.5 ${7.5 * s}-8.5s${7.5 * s} 3.5 ${7.5 * s} 8.5c-2-2.5-5-3.5-${7.5 * s}-3.5s-5.5 1-${7.5 * s} 3.5z" fill="${hair}"/>`;
  const eyeY = cy + 1 * s, ex = 3.1 * s;
  const eyes = opts.closed ? `<path d="M${cx - ex - 1.2 * s} ${eyeY}q${1.2 * s} ${1 * s} ${2.4 * s} 0M${cx + ex - 1.2 * s} ${eyeY}q${1.2 * s} ${1 * s} ${2.4 * s} 0" stroke="#2a1d18" stroke-width="${.8 * s}" fill="none"/>`
    : `<circle cx="${cx - ex}" cy="${eyeY}" r="${.95 * s}" fill="#2a1d18"/><circle cx="${cx + ex}" cy="${eyeY}" r="${.95 * s}" fill="#2a1d18"/>`;
  const mouth = avPick(r, [`<path d="M${cx - 2.4 * s} ${cy + 5 * s}q${2.4 * s} ${2 * s} ${4.8 * s} 0" fill="none" stroke="#5a2e22" stroke-width="${.9 * s}" stroke-linecap="round"/>`,
    `<path d="M${cx - 1.6 * s} ${cy + 5.4 * s}h${3.2 * s}" stroke="#5a2e22" stroke-width="${.9 * s}" stroke-linecap="round"/>`, `<ellipse cx="${cx}" cy="${cy + 5.3 * s}" rx="${1.5 * s}" ry="${1.1 * s}" fill="#7a3328"/>`]);
  const blush = r() < .4 ? `<circle cx="${cx - 5 * s}" cy="${cy + 3.3 * s}" r="${1.3 * s}" fill="#f08aa0" opacity=".35"/><circle cx="${cx + 5 * s}" cy="${cy + 3.3 * s}" r="${1.3 * s}" fill="#f08aa0" opacity=".35"/>` : '';
  return `${back}<ellipse cx="${cx}" cy="${cy + 1 * s}" rx="${7.4 * s}" ry="${8.2 * s}" fill="${skin}"/>${top}${eyes}${blush}${mouth}`;
}
const PEOPLE = [
  // classic front bust, sometimes with glasses, a cap or headphones
  (r, id) => { const skin = avPick(r, SKIN), hair = avPick(r, HAIR), shirt = hsl(rr(r, 0, 360), 50, rr(r, 40, 60)), a = r();
    return solid(hsl(rr(r, 0, 360), 45, rr(r, 70, 86))) + `<path d="M6 40c1-8 7-11 14-11s13 3 14 11z" fill="${shirt}"/><rect x="17.5" y="24" width="5" height="6" fill="${skin}"/>` + headFront(r, 20, 17, 1, skin, hair)
      + (a < .3 ? `<g fill="none" stroke="#222" stroke-width="1.1"><rect x="13.6" y="15.8" width="5.4" height="4" rx="1.6"/><rect x="21" y="15.8" width="5.4" height="4" rx="1.6"/><path d="M19 17.6h2"/></g>`
      : a > .78 ? `<path d="M10.6 18c0-7 4-11 9.4-11s9.4 4 9.4 11" fill="none" stroke="#333" stroke-width="1.6"/><rect x="8.6" y="16" width="3.4" height="6" rx="1.5" fill="${hsl(rr(r, 0, 360), 60, 50)}"/><rect x="28" y="16" width="3.4" height="6" rx="1.5" fill="${hsl(rr(r, 0, 360), 60, 50)}"/>` : ''); },
  // side profile, looking left, against a gradient
  (r, id) => { const skin = avPick(r, SKIN), hair = avPick(r, HAIR), h = rr(r, 0, 360);
    return bgGrad('p' + id, hsl(h, 60, 75), hsl(h + 50, 60, 55), 1, 1) + `<path d="M14 40c0-6 3-9 8-10l2-4c-3 0-4-1-4-3l-2-1 2-2c-1-3-1-5 0-7 2-4 6-5 10-4 5 1 7 6 6 11-1 4-3 6-4 7v3c3 1 6 4 7 10z" fill="${skin}"/>`
      + `<path d="M19 13c1-5 6-7 10-6 6 1 8 7 6 13-1 3-2 4-3 5 0-4-1-7-3-8-2 1-3 0-4-2-2 0-4-1-6-2z" fill="${hair}"/><circle cx="23" cy="17" r=".9" fill="#222"/><path d="M14 40c1-5 4-8 9-9 4 1 7 3 9 9z" fill="${hsl(h + 180, 40, 30)}"/>`; },
  // seen from behind, looking at a sunset or the city at night
  (r, id) => { const hair = avPick(r, HAIR), night = r() < .5, hood = r() < .35, h = rr(r, 0, 40);
    const sky = night ? bgGrad('b' + id, '#141a3a', '#3b2d5c') + starsN(r, 8, 20) + [3, 9, 14, 27, 33].map((x, k) => `<rect x="${x}" y="${18 + (k * 7) % 9}" width="5" height="22" fill="#232a4d"/>${Array.from({length: 4}, (_, j) => `<rect x="${x + 1}" y="${21 + (k * 7) % 9 + j * 3}" width="1.2" height="1.2" fill="#ffd979" opacity="${r() < .6 ? .9 : 0}"/>`).join('')}`).join('')
      : bgGrad('b' + id, hsl(260 + h, 50, 45), hsl(20 + h, 85, 65)) + `<circle cx="${rr(r, 12, 28)}" cy="21" r="6" fill="#ffd27a"/><path d="M0 26l9-6 8 5 9-7 14 8v14H0z" fill="${hsl(250, 30, 30)}"/>`;
    return sky + (hood ? `<path d="M10 40c0-8 3-12 4-14-1-7 2-13 6-13s7 6 6 13c1 2 4 6 4 14z" fill="${hsl(rr(r, 0, 360), 25, 22)}"/>`
      : `<path d="M8 40c1-7 6-10 12-10s11 3 12 10z" fill="${hsl(rr(r, 0, 360), 35, 25)}"/><ellipse cx="20" cy="22" rx="6.5" ry="7.5" fill="${hair}"/>${r() < .4 ? `<path d="M15 22c0 6-1 9-3 11 4 0 6-2 8-4 2 2 4 4 8 4-2-2-3-5-3-11z" fill="${hair}"/>` : ''}`); },
  // close-up selfie, face off-centre and big, peace sign
  (r, id) => { const skin = avPick(r, SKIN), hair = avPick(r, HAIR), bg = hsl(rr(r, 0, 360), 55, 80);
    return solid(bg) + `<g transform="translate(-4 4) scale(1.45)">${headFront(r, 18, 16, 1, skin, hair)}</g><path d="M31 40v-9l-2-6c0-1 1.5-1.5 2 0l1.5 4.5.5-6.5c0-1 1.6-1 1.6 0l-.3 7 2 1c1 1 1.5 3 1.5 4v5z" fill="${skin}" stroke="${hsl(0, 0, 0, .15)}" stroke-width=".5"/>`; },
  // hoodie in the dark: different poses, settings, eyes and extras each time
  (r, id) => { const g = hsl(rr(r, 0, 360), 90, 60), hood = hsl(rr(r, 200, 280), rr(r, 10, 35), rr(r, 12, 30)), pose = avPick(r, ['front', 'phone', 'side', 'low']);
    const set = avPick(r, ['glow', 'city', 'rain', 'moon', 'sign']);
    const back = set === 'glow' ? avFlat('#0e0f17') + `<circle cx="20" cy="20" r="15" fill="${g}" opacity=".18"/>`
      : set === 'city' ? avFlat('#12142a') + [2, 9, 15, 25, 32].map((x, k) => `<rect x="${x}" y="${8 + (k * 5) % 11}" width="6" height="40" fill="#1d2142"/>` + Array.from({length: 5}, (_, j) => r() < .5 ? `<rect x="${x + 1.5}" y="${11 + (k * 5) % 11 + j * 4}" width="1.2" height="1.2" fill="${g}"/>` : '').join('')).join('')
      : set === 'rain' ? avFlat('#151a24') + Array.from({length: 18}, () => { const x = rr(r, 0, 40), y = rr(r, 0, 36); return `<path d="M${x} ${y}l-1 4" stroke="#7d8db0" stroke-width=".5" opacity=".7"/>`; }).join('')
      : set === 'moon' ? avFlat('#0f1530') + starsN(r, 8) + `<circle cx="${avPick(r, [9, 31])}" cy="9" r="5" fill="#f2ecd0"/>`
      : (sx => avFlat('#120f1a') + `<rect x="${sx}" y="2.6" width="14" height="5.6" rx="1.5" fill="none" stroke="${g}" stroke-width="1"/><text x="${sx + 7}" y="6.7" text-anchor="middle" font-size="3.4" font-family="sans-serif" fill="${g}">`)(13) + `${avPick(r, ['OPEN', '24/7', 'CAFE', 'ARCADE', 'LOFI'])}</text>`;
    const eyes = avPick(r, ['dots', 'slits', 'visor', 'none', 'x']);
    const face = (x, y) => eyes === 'dots' ? `<circle cx="${x - 2.2}" cy="${y}" r=".8" fill="${g}"/><circle cx="${x + 2.2}" cy="${y}" r=".8" fill="${g}"/>`
      : eyes === 'slits' ? `<path d="M${x - 3} ${y}h1.8M${x + 1.2} ${y}h1.8" stroke="${g}" stroke-width=".8"/>` : eyes === 'visor' ? `<rect x="${x - 3.6}" y="${y - .8}" width="7.2" height="1.8" rx=".9" fill="${g}"/>`
      : eyes === 'x' ? `<path d="M${x - 3} ${y - .8}l1.6 1.6m0-1.6l-1.6 1.6M${x + 1.4} ${y - .8}l1.6 1.6m0-1.6l-1.6 1.6" stroke="${g}" stroke-width=".6"/>` : '';
    const ears = r() < .2 ? `<path d="M13 12l1-6 4 4zM27 12l-1-6-4 4z" fill="${hood}"/>` : '';
    let fig;
    if (pose === 'phone') fig = `${ears}<path d="M5 40c1-8 5-11 7-12-1-3-1-7 0-10 1-6 5-9 8-9s7 3 8 9c1 3 1 7 0 10 2 1 6 4 7 12z" fill="${hood}"/><ellipse cx="20" cy="22" rx="5.6" ry="6.4" fill="#0b0b10"/><path d="M15.6 24c2 2 6.8 2 8.8 0" stroke="${g}" stroke-width="2.4" opacity=".35"/><path d="M17.5 21.5h1.4M21.1 21.5h1.4" stroke="#ddd" stroke-width=".6"/><rect x="16" y="31" width="8" height="5" rx="1" fill="#1b1b22" stroke="${g}" stroke-width=".6"/><path d="M14 34l2-1M26 34l-2-1" stroke="${hood}" stroke-width="2"/><path d="M17 31l-3-8M23 31l3-8" stroke="${g}" stroke-width="5" opacity=".08"/>`;
    else if (pose === 'side') fig = `<path d="M9 40c0-9 2-13 4-16-1-6 1-14 9-15 6 0 9 4 9 10 0 3-1 5-2 6 3 3 4 9 4 15z" fill="${hood}"/><path d="M23 15c3 0 5 2 6 5l-1 5c-2 1-5 0-6-2z" fill="#0b0b10"/>${eyes === 'none' ? '' : `<circle cx="26.4" cy="19.5" r=".8" fill="${g}"/>`}${r() < .5 ? `<path d="M24 25c2 4 2 9 0 15" stroke="#ddd" stroke-width=".6" fill="none"/>` : ''}`;
    else if (pose === 'low') fig = `${ears}<g transform="translate(0 7)"><path d="M3 40c1-8 6-12 8-13-1-4-1-8 0-11 1-6 5-9 9-9s8 3 9 9c1 3 1 7 0 11 2 1 7 5 8 13z" fill="${hood}"/><ellipse cx="20" cy="18" rx="6" ry="6.8" fill="#0b0b10"/>${face(20, 18)}</g>`;
    else fig = `${ears}<path d="M5 40c1-8 5-11 7-12-1-3-1-7 0-10 1-6 5-9 8-9s7 3 8 9c1 3 1 7 0 10 2 1 6 4 7 12z" fill="${hood}"/><ellipse cx="20" cy="21" rx="5.6" ry="6.6" fill="#0b0b10"/>${face(20, 21)}${r() < .5 ? `<path d="M17 33l-1 5M23 33l1 5" stroke="${g}" stroke-width=".8"/>` : r() < .5 ? `<path d="M11 18c-1 4-1 9 1 12M29 18c1 4 1 9-1 12" stroke="#444" stroke-width="1.4" fill="none"/><rect x="9" y="16" width="4" height="6" rx="1.8" fill="${g}"/><rect x="27" y="16" width="4" height="6" rx="1.8" fill="${g}"/>` : ''}`;
    return back + fig; },
  // little figure at a desk with a laptop and lamp, room view
  (r, id) => { const wall = hsl(rr(r, 0, 360), 30, rr(r, 75, 88)), skin = avPick(r, SKIN), hair = avPick(r, HAIR);
    return solid(wall) + `<rect x="27" y="7" width="9" height="11" rx="1" fill="${hsl(200, 50, 70)}"/><path d="M27 12.5h9M31.5 7v11" stroke="#fff" stroke-width=".8"/><rect y="28" width="40" height="12" fill="${hsl(30, 35, 45)}"/>`
      + `<path d="M5 28l3-9h2l1 2" stroke="#444" stroke-width="1" fill="none"/><path d="M6.5 18l4 0-2-3z" fill="#f2c94c"/>` + `<g transform="translate(4 8) scale(.62)">${headFront(r, 22, 16, 1, skin, hair)}</g>`
      + `<path d="M10 28c0-5 3-7 7.6-7s7.6 2 7.6 7z" fill="${hsl(rr(r, 0, 360), 45, 45)}"/><path d="M13 28l2-6h12l-2 6z" fill="#bfc5ce"/><circle cx="20" cy="25" r=".9" fill="#fff"/>`; },
  // three-quarter view with headphones on
  (r, id) => { const skin = avPick(r, SKIN), hair = avPick(r, HAIR), hp = hsl(rr(r, 0, 360), 65, 50);
    return bgGrad('q' + id, hsl(rr(r, 180, 300), 50, 70), hsl(rr(r, 180, 300), 50, 50), 1, 0) + `<path d="M7 40c1-7 6-10 13-10s12 3 13 10z" fill="${hsl(rr(r, 0, 360), 30, 30)}"/>`
      + `<path d="M13 18c0-6 4-10 9-10s8 4 8 10c0 6-3 11-8 11-5 0-9-5-9-11z" fill="${skin}"/><path d="M12.5 17c0-7 5-11 10-11 6 0 8.5 4 8 9-2-3-5-4-9-4-3 0-6 2-9 6z" fill="${hair}"/>`
      + `<circle cx="20.5" cy="18.5" r=".9" fill="#222"/><circle cx="26" cy="18.5" r=".9" fill="#222"/><path d="M21.5 24q2 1.4 4 0" stroke="#7a3328" stroke-width=".8" fill="none"/>`
      + `<path d="M12 17c0-8 5-12 10-12s9 4 9 11" stroke="#2a2a33" stroke-width="1.8" fill="none"/><rect x="10" y="15" width="5" height="7" rx="2.2" fill="${hp}"/>`; },
  // mirror selfie: the phone covers the face
  (r, id) => { const skin = avPick(r, SKIN), hair = avPick(r, HAIR), top = hsl(rr(r, 0, 360), 45, rr(r, 35, 60));
    return solid(hsl(rr(r, 20, 50), 20, rr(r, 82, 92))) + `<rect x="2" y="2" width="36" height="36" rx="3" fill="none" stroke="${hsl(30, 20, 70)}" stroke-width="1.2"/><path d="M7 40c1-8 6-12 13-12s12 4 13 12z" fill="${top}"/>`
      + `<ellipse cx="20" cy="18" rx="7" ry="8" fill="${skin}"/><path d="M12.5 17c0-6 3.5-9.5 7.5-9.5s7.5 3.5 7.5 9.5c-2-3-5-4-7.5-4s-5.5 1-7.5 4z" fill="${hair}"/>`
      + `<rect x="15.5" y="14" width="9" height="15" rx="2" fill="${hsl(rr(r, 0, 360), 40, 25)}"/><circle cx="18" cy="16.5" r="1.1" fill="#111" stroke="#666" stroke-width=".4"/><path d="M24 26c2 1 3 3 3 6" stroke="${skin}" stroke-width="3" stroke-linecap="round"/>`; },
  // tiny hiker on a mountain top
  (r, id) => { const h = rr(r, 180, 230);
    return bgGrad('m' + id, hsl(h, 60, 80), hsl(h, 50, 92)) + `<path d="M0 40V30l8-6 6 4 6-10 6 7 6-4 8 7v12z" fill="${hsl(h + 20, 20, 55)}"/><path d="M0 40l10-14 6 5 7-12 8 12 9-4v13z" fill="${hsl(h + 30, 25, 35)}"/><path d="M23 19l-2 3h4z" fill="#fff"/>`
      + `<circle cx="23" cy="13" r="1.2" fill="#3a2a22"/><path d="M23 14.2v3.4M21.8 15.5h2.4M23 17.6l-1 2M23 17.6l1 2" stroke="#3a2a22" stroke-width=".9"/><path d="M24 15l1.5-1.5" stroke="${hsl(0, 70, 50)}" stroke-width="1"/>`; },
  // holding a coffee, seen from your own eyes (no face)
  (r, id) => { const skin = avPick(r, SKIN), cup = hsl(rr(r, 0, 360), 40, rr(r, 50, 85)), sleeve = hsl(rr(r, 0, 360), 45, 40);
    return solid(hsl(rr(r, 20, 40), 30, rr(r, 55, 75))) + `<rect y="26" width="40" height="14" fill="${hsl(25, 35, 40)}"/><path d="M0 40V30l10-4 4 2" fill="${sleeve}"/>`
      + `<path d="M14 14h12l-1.5 18h-9z" fill="${cup}"/><ellipse cx="20" cy="14" rx="6" ry="1.6" fill="#6b4226"/><path d="M14 22c-3 0-6 1-8 3l1 4c3-1 5-2 7-2zM26 22c2 0 4 1 5 3l-1 3c-2-1-3-2-4-2z" fill="${skin}"/>`
      + `<path d="M18 8q-1.5 2 0 4M22 7q-1.5 2.5 0 5" stroke="#fff" stroke-width=".8" fill="none" opacity=".7"/>`; },
  // face hidden behind an open book, only the eyes and hair show
  (r, id) => { const skin = avPick(r, SKIN), hair = avPick(r, HAIR), cov = hsl(rr(r, 0, 360), 55, 45);
    return solid(hsl(rr(r, 0, 360), 40, 85)) + `<path d="M7 40c1-6 6-9 13-9s12 3 13 9z" fill="${hsl(rr(r, 0, 360), 30, 40)}"/>` + headFront(r, 20, 16, 1, skin, hair)
      + `<path d="M8 22l12 2 12-2v13l-12 2-12-2z" fill="${cov}"/><path d="M9 23l11 2v11l-11-2zM31 23l-11 2v11l11-2z" fill="#fbf8f0"/><path d="M11 26l7 1.2M11 28.5l7 1.2M22 27.2l7-1.2M22 29.7l7-1.2" stroke="#ccc" stroke-width=".5"/>`; },
  // sunglasses at the beach
  (r, id) => { const skin = avPick(r, SKIN), hair = avPick(r, HAIR);
    return `<rect width="40" height="22" fill="${hsl(200, 75, 75)}"/><rect y="22" width="40" height="6" fill="${hsl(200, 70, 50)}"/><rect y="28" width="40" height="12" fill="#ecd29a"/>`
      + `<path d="M7 40c1-7 6-10 13-10s12 3 13 10z" fill="${hsl(rr(r, 0, 360), 70, 55)}"/>` + headFront(r, 20, 17, 1, skin, hair, {style: avPick(r, ['long', 'curly', 'short', 'bun', 'buzz'])})
      + `<path d="M12.6 16.4h14.8" stroke="#111" stroke-width="1"/><path d="M13 16.4h5.6l-.5 3c-.2 1-1 1.4-2 1.4h-.8c-1 0-1.8-.6-2-1.4zM21.4 16.4H27l-.3 3c-.2 1-1 1.4-2 1.4h-.8c-1 0-1.8-.6-2-1.4z" fill="#111"/>`; },
  // winter beanie, scarf, snow falling
  (r, id) => { const skin = avPick(r, SKIN), hair = avPick(r, HAIR), knit = hsl(rr(r, 0, 360), 60, 50), scarf = hsl(rr(r, 0, 360), 60, 45);
    return bgGrad('w' + id, '#9fb7d4', '#dfe8f3') + Array.from({length: 12}, () => `<circle cx="${rr(r, 0, 40)}" cy="${rr(r, 0, 40)}" r="${rr(r, .4, .9)}" fill="#fff"/>`).join('')
      + `<path d="M7 40c1-7 6-10 13-10s12 3 13 10z" fill="${hsl(rr(r, 0, 360), 30, 30)}"/>` + headFront(r, 20, 18, 1, skin, hair, {style: 'long'})
      + `<path d="M11.8 15c0-6 3.7-9 8.2-9s8.2 3 8.2 9z" fill="${knit}"/><rect x="11.2" y="13.4" width="17.6" height="3.2" rx="1.4" fill="${knit}" stroke="${hsl(0, 0, 100, .4)}" stroke-width=".5"/><circle cx="20" cy="5.4" r="2.2" fill="#f4f4f4"/>`
      + `<path d="M11 28c3 2 15 2 18 0v3c-3 2-15 2-18 0z" fill="${scarf}"/><path d="M24 30l2 7h-3.5l-1-6z" fill="${scarf}"/>`; },
  // dancing / jumping silhouette against a bold colour
  (r, id) => { const h = rr(r, 0, 360);
    return solid(hsl(h, 75, 60)) + `<circle cx="${rr(r, 8, 32)}" cy="${rr(r, 8, 14)}" r="${rr(r, 4, 7)}" fill="${hsl(h + 40, 85, 75)}"/><g fill="${hsl(h + 200, 50, 15)}"><circle cx="20" cy="11" r="3"/><path d="M19 14.5l-6-4-1.4 1.2 6 5 .5 7-5 8 1.8 1.2 5.6-7 4 7.8 2-1-3-9 .2-6.5 5-6-1.4-1-4 4.6z"/></g>`; },
];

/* ---------------- nature and places ---------------- */
const NATURE = [
  (r, id) => { const h = rr(r, 0, 40); return bgGrad('s' + id, hsl(260 + h, 50, 40), hsl(20 + h, 85, 62)) + `<circle cx="${rr(r, 12, 28)}" cy="23" r="6" fill="#ffd27a"/><path d="M0 40V27l8-7 7 6 9-10 8 8 8-5v21z" fill="${hsl(250, 30, 22)}"/><path d="M0 40V32l10-5 9 4 11-6 10 5v10z" fill="${hsl(250, 30, 14)}"/>`; },
  (r, id) => solid(hsl(rr(r, 190, 215), 70, 78)) + `<circle cx="29" cy="11" r="4.5" fill="#fff3b0"/><path d="M0 24q5-3 10 0t10 0 10 0 10 0v16H0z" fill="${hsl(205, 70, 50)}"/><path d="M0 30q5-3 10 0t10 0 10 0 10 0v10H0z" fill="${hsl(210, 70, 40)}"/><path d="M0 35q5-2.5 10 0t10 0 10 0 10 0v5H0z" fill="${hsl(215, 70, 30)}"/>`,
  (r, id) => { const g = rr(r, 110, 160); return solid(hsl(rr(r, 190, 220), 50, 82)) + [[6, 30, 1], [15, 26, 1.3], [25, 29, 1.1], [34, 25, 1.25]].map(([x, y, s]) => `<path d="M${x} ${y - 16 * s}l${6 * s} ${12 * s}h${-3 * s}l${4 * s} ${8 * s}H${x - 4 * s}l${4 * s} ${-8 * s}h${-3 * s}z" fill="${hsl(g, 40, rr(r, 20, 34))}"/>`).join('') + `<rect y="34" width="40" height="6" fill="${hsl(g, 30, 25)}"/>`; },
  // one flower, close-up and off-centre
  (r, id) => { const p = hsl(rr(r, 0, 360), 70, 65), n = 5 + Math.floor(r() * 4), cx = rr(r, 15, 25), cy = rr(r, 14, 22);
    return solid(hsl(rr(r, 90, 150), 35, rr(r, 75, 88))) + `<path d="M${cx} ${cy + 4}v30" stroke="#3e8a4a" stroke-width="2.4"/>` + Array.from({length: n}, (_, k) => { const a = k / n * Math.PI * 2, x = cx + Math.cos(a) * 8, y = cy + Math.sin(a) * 8; return `<ellipse cx="${x}" cy="${y}" rx="7" ry="4.6" transform="rotate(${a * 180 / Math.PI} ${x} ${y})" fill="${p}"/>`; }).join('') + `<circle cx="${cx}" cy="${cy}" r="5" fill="#f7c948"/><circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="#d9a520" stroke-dasharray="1 1"/>`; },
  (r, id) => avFlat(hsl(225, 45, 16)) + starsN(r, 10, 22) + `<circle cx="${rr(r, 10, 30)}" cy="11" r="5" fill="#f5edc4"/><rect y="25" width="40" height="15" fill="${hsl(220, 45, 24)}"/><path d="M12 28h16M15 31h10M18 34h4" stroke="#f5edc4" stroke-width="1" opacity=".6"/>`,
  (r, id) => solid(hsl(rr(r, 25, 45), 80, 80)) + `<circle cx="30" cy="10" r="4" fill="#fff4c2"/><path d="M0 40V30q10-5 20 0t20-2v12z" fill="${hsl(32, 60, 62)}"/><path d="M15 33V17a2.5 2.5 0 0 1 5 0v16zM15 25h-3a2 2 0 0 1-2-2v-4a1.5 1.5 0 0 1 3 0v3h2zM20 22h3v-3a1.5 1.5 0 0 1 3 0v4a2 2 0 0 1-2 2h-4z" fill="#3f8a4c"/>`,
  // a single leaf, huge, diagonal
  (r, id) => { const g = rr(r, 80, 150); return solid(hsl(g + 40, 35, 88)) + `<path d="M2 38C4 14 18 2 38 2c0 20-14 34-36 36z" fill="${hsl(g, 50, 40)}"/><path d="M2 38 36 4M12 28l-2-9M18 22l-1-10M24 16l-.5-8M14 26l10 1M20 20l9 1M26 14l7 .5" stroke="${hsl(g, 50, 70)}" stroke-width="1" fill="none"/>`; },
  (r, id) => bgGrad('a' + id, '#0d1b2e', '#16314a', 1, 1) + starsN(r, 6, 14) + `<path d="M0 18q10-8 20-2t20-6v8q-10 6-20 1T0 24z" fill="${hsl(rr(r, 130, 190), 80, 55)}" opacity=".7"/><path d="M0 24q12-6 22-1t18-4v5q-9 5-19 1T0 29z" fill="${hsl(rr(r, 260, 310), 70, 60)}" opacity=".5"/><path d="M0 40V32l9-4 8 3 9-5 14 6v8z" fill="#06101c"/>`,
  // cherry blossom branch across the frame
  (r, id) => solid(hsl(rr(r, 190, 210), 60, 86)) + `<path d="M0 30C10 26 16 18 24 16s12-6 16-10" stroke="#5a3a2a" stroke-width="2" fill="none"/><path d="M14 22l-2-6M28 13l1-6" stroke="#5a3a2a" stroke-width="1.2"/>` + [[8, 27], [12, 16], [18, 21], [24, 15], [29, 7], [33, 10], [21, 26], [36, 4]].map(([x, y]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-1.6" rx="1.2" ry="1.7" transform="rotate(${a})" fill="#f6b7cb"/>`).join('')}<circle r=".7" fill="#e0608a"/></g>`).join(''),
  // rain on a window with blurry city lights behind
  (r, id) => solid(hsl(rr(r, 210, 240), 30, 25)) + Array.from({length: 7}, () => `<circle cx="${rr(r, 0, 40)}" cy="${rr(r, 0, 40)}" r="${rr(r, 3, 7)}" fill="${hsl(rr(r, 20, 60), 90, 65)}" opacity=".35"/>`).join('') + Array.from({length: 14}, () => { const x = rr(r, 1, 39), y = rr(r, 1, 36), l = rr(r, 1.5, 4); return `<path d="M${x} ${y}v${l}" stroke="#d7e6ff" stroke-width="${rr(r, .6, 1.2)}" stroke-linecap="round" opacity=".7"/>`; }).join('') + `<path d="M20 0v40M0 20h40" stroke="#1a1d29" stroke-width="2"/>`,
  // mountain lake with its reflection
  (r, id) => { const h = rr(r, 190, 230), m = hsl(h + 10, 25, 40); return solid(hsl(h, 55, 82)) + `<path d="M0 22l9-11 6 6 7-10 8 9 10-5v11z" fill="${m}"/><path d="M19 9l3-2 3 4-3-1z" fill="#fff"/><rect y="22" width="40" height="18" fill="${hsl(h, 50, 55)}"/><path d="M0 22l9 11 6-6 7 10 8-9 10 5V22z" fill="${m}" opacity=".45"/><path d="M5 28h8M22 31h10M12 35h6" stroke="#fff" stroke-width=".6" opacity=".6"/>`; },
  // city skyline at night, from across the water
  (r, id) => { let x = 0, b = ''; while (x < 40){ const w = rr(r, 3, 7), hgt = rr(r, 6, 20); b += `<rect x="${x}" y="${26 - hgt}" width="${w}" height="${hgt}" fill="${hsl(240, 25, rr(r, 12, 22))}"/>` + Array.from({length: 3}, () => r() < .6 ? `<rect x="${x + rr(r, .5, w - 1.5)}" y="${26 - rr(r, 1, hgt - 1)}" width=".9" height=".9" fill="#ffd979"/>` : '').join(''); x += w + .3; }
    return bgGrad('c' + id, '#1b1f45', hsl(rr(r, 280, 340), 50, 40)) + starsN(r, 5, 12) + b + `<rect y="26" width="40" height="14" fill="#10142e"/><path d="M4 29h6M16 31h9M28 30h7M9 34h5" stroke="#ffd979" stroke-width=".7" opacity=".55"/>`; },
  // lighthouse on rocks
  (r, id) => solid(hsl(rr(r, 195, 215), 55, 72)) + `<path d="M24 11l14-5v10z" fill="#fff6b0" opacity=".55"/><path d="M16 34l2-20h6l2 20z" fill="#f4f4f4"/><path d="M17 26h8.2l.3 3h-8.8zM17.8 18h6.4l.3 3h-7z" fill="#d6453d"/><rect x="17.5" y="10" width="7" height="4" fill="#333"/><path d="M17 10l4-3 4 3z" fill="#d6453d"/><path d="M0 40V34l8-3 6 2 12-1 6 3 8-2v7z" fill="#5d636b"/><path d="M0 38q10-2 20 0t20 0v2H0z" fill="${hsl(205, 70, 45)}"/>`,
  // road to the horizon
  (r, id) => { const h = rr(r, 0, 60); return bgGrad('r' + id, hsl(200, 60, 75), hsl(30 + h, 70, 80)) + `<rect y="22" width="40" height="18" fill="${hsl(90 + h, 35, 45)}"/><path d="M18.5 22h3L34 40H6z" fill="#444"/><path d="M20 24v2M20 28v3M20 33v4" stroke="#f2d04b" stroke-width="1"/><path d="M0 22q10-4 20 0t20 0" fill="${hsl(250, 20, 55)}"/>`; },
  // hot air balloons
  (r, id) => solid(hsl(rr(r, 190, 205), 65, 80)) + [[13, 15, 6], [29, 10, 4], [31, 27, 3]].map(([x, y, s]) => { const c = hsl(rr(r, 0, 360), 75, 58); return `<path d="M${x - s} ${y}a${s} ${s} 0 1 1 ${2 * s} 0c0 ${s * .8}-${s * .6} ${s * 1.2}-${s * .5} ${s * 1.4}h-${s}c0-${s * .2}-${s * .5}-${s * .6}-${s * .5}-${s * 1.4}z" fill="${c}"/><path d="M${x} ${y - s}v${s * 2.4}" stroke="#fff" stroke-width=".5" opacity=".6"/><rect x="${x - s * .3}" y="${y + s * 1.7}" width="${s * .6}" height="${s * .45}" fill="#7a5230"/>`; }).join('') + `<path d="M0 36q10-3 20 0t20-1v5H0z" fill="#6aa86a"/>`,
  // clouds from a plane window
  (r, id) => `<rect width="40" height="40" fill="#cfd5dc"/><rect x="9" y="4" width="22" height="32" rx="11" fill="${hsl(rr(r, 200, 215), 70, 70)}"/><g clip-path="url(#w${id})"><path d="M5 26q4-4 8-1 3-4 8-1 4-3 8 0 3-2 7 1v12H5z" fill="#fff"/><path d="M5 31q5-3 9 0 4-2 8 0 5-3 9 0v6H5z" fill="#eef2f6"/></g><defs><clipPath id="w${id}"><rect x="9" y="4" width="22" height="32" rx="11"/></clipPath></defs><rect x="9" y="4" width="22" height="32" rx="11" fill="none" stroke="#a9b0b8" stroke-width="2"/>`,
  // palm tree on a beach
  (r, id) => bgGrad('pl' + id, hsl(rr(r, 10, 40), 85, 70), hsl(rr(r, 280, 320), 50, 55)) + `<rect y="28" width="40" height="12" fill="${hsl(200, 60, 40)}"/><path d="M0 34q20-6 40 2v4H0z" fill="#e7c98f"/><path d="M24 34c-1-8 0-15 3-20" stroke="#3b2a20" stroke-width="1.6" fill="none"/><g fill="#1f3b2a"><path d="M27 14c-4-3-9-3-12 0 4-1 8 0 12 0z"/><path d="M27 14c3-4 8-5 11-3-4 0-8 1-11 3z"/><path d="M27 14c-2 3-6 6-9 6 3-2 6-4 9-6z"/><path d="M27 14c3 2 6 5 7 8-2-3-5-5-7-8z"/></g>`,
  // waterfall
  (r, id) => avFlat('#5b7d5a') + `<path d="M0 0h40v14H0z" fill="${hsl(195, 60, 78)}"/><path d="M0 14l8-3 7 2 12-3 13 3v6H0z" fill="#3f5f3e"/><path d="M14 16h12v18H14z" fill="#e8f6ff"/><path d="M16 17v16M19 17v16M22 17v16M25 17v16" stroke="#a9d8f2" stroke-width=".7"/><ellipse cx="20" cy="35" rx="10" ry="3" fill="#ffffff" opacity=".85"/><rect y="35" width="40" height="5" fill="${hsl(200, 55, 45)}"/>`,
  // sunflower field
  (r, id) => solid(hsl(205, 70, 78)) + `<rect y="24" width="40" height="16" fill="#4f8a3a"/>` + [[6, 30, 4], [15, 26, 5.4], [27, 29, 4.4], [35, 25, 3.6], [21, 35, 3]].map(([x, y, s]) => `<path d="M${x} ${y}v14" stroke="#3d6b2a" stroke-width="1"/>` + Array.from({length: 10}, (_, k) => `<ellipse cx="${x}" cy="${y - s * .75}" rx="${s * .22}" ry="${s * .5}" transform="rotate(${k * 36} ${x} ${y})" fill="#f6c431"/>`).join('') + `<circle cx="${x}" cy="${y}" r="${s * .45}" fill="#6b3e1d"/>`).join(''),
];

/* ---------------- animals: faces, full bodies, from above, from the side ---------------- */
const eyes2 = (x, y, d = 4.5, s = 1.4, c = '#1b1b1b') => `<circle cx="${x - d}" cy="${y}" r="${s}" fill="${c}"/><circle cx="${x + d}" cy="${y}" r="${s}" fill="${c}"/><circle cx="${x - d + .45}" cy="${y - .45}" r="${s * .35}" fill="#fff"/><circle cx="${x + d + .45}" cy="${y - .45}" r="${s * .35}" fill="#fff"/>`;
// something on the head or face: cx is the head's centre, top its top edge, w its width, ey the eye line, ed the eye spacing
function faceAcc(r, cx, top, w, ey, ed){
  if (r() < .45) return '';
  const c = hsl(rr(r, 0, 360), 75, 55), c2 = hsl(rr(r, 0, 360), 75, 65);
  return avPick(r, [
    () => `<path d="M${cx - w * .22} ${top + 1}L${cx + rr(r, -2, 2)} ${top - w * .55}L${cx + w * .22} ${top + 1}z" fill="${c}"/><circle cx="${cx}" cy="${top - w * .55}" r="1.4" fill="${c2}"/><path d="M${cx - w * .12} ${top - w * .15}h${w * .24}" stroke="#fff" stroke-width=".7" opacity=".7"/>`,
    () => `<path d="M${cx - w * .42} ${top + w * .12}c0-${w * .4} ${w * .84}-${w * .4} ${w * .84} 0z" fill="${c}"/><rect x="${cx - w * .45}" y="${top + w * .06}" width="${w * .9}" height="${w * .14}" rx="1" fill="${c2}"/><circle cx="${cx}" cy="${top - w * .22}" r="${w * .1}" fill="#f5f5f5"/>`,
    () => `<g fill="none" stroke="#151515" stroke-width="1"><circle cx="${cx - ed}" cy="${ey}" r="${ed * .62}"/><circle cx="${cx + ed}" cy="${ey}" r="${ed * .62}"/><path d="M${cx - ed * .38} ${ey}h${ed * .76}"/></g>`,
    () => `<path d="M${cx - ed * 1.6} ${ey - .6}h${ed * 3.2}" stroke="#111" stroke-width=".9"/><path d="M${cx - ed * 1.55} ${ey - .6}h${ed * 1.25}l-.3 ${ed * .6}q-.6 .8-1.6 .3zM${cx + ed * .3} ${ey - .6}h${ed * 1.25}l-.3 ${ed * .6}q-.6 .8-1.6 .3z" fill="#111"/>`,
    () => `<g transform="translate(${cx + w * rr(r, -.3, .3)} ${top + 1})"><path d="M0 0l-4-2.4v4.8zM0 0l4-2.4v4.8z" fill="${c}"/><circle r="1.2" fill="${c2}"/></g>`,
    () => `<path d="M${cx - w * .3} ${top + 1}l${w * .06}-${w * .28} ${w * .12} ${w * .16} ${w * .12}-${w * .26} ${w * .12} ${w * .26} ${w * .12}-${w * .16} ${w * .06} ${w * .28}z" fill="#f6c431" stroke="#c99a12" stroke-width=".5"/>`,
    () => Array.from({length: 5}, (_, k) => `<circle cx="${cx - w * .36 + k * w * .18}" cy="${top + 1 - Math.sin(k / 4 * Math.PI) * 2}" r="${w * .07}" fill="${k % 2 ? c : c2}"/>`).join(''),
    () => `<path d="M${cx - w * .5} ${ey + w * .02}c0-${w * .7} ${w}-${w * .7} ${w} 0" stroke="#2a2a33" stroke-width="1.4" fill="none"/><rect x="${cx - w * .58}" y="${ey - 1}" width="${w * .18}" height="${w * .3}" rx="1.2" fill="${c}"/><rect x="${cx + w * .4}" y="${ey - 1}" width="${w * .18}" height="${w * .3}" rx="1.2" fill="${c}"/>`,
    () => `<path d="M${cx - w * .45} ${ey + w * .42}q${w * .45} ${w * .18} ${w * .9} 0v${w * .14}q-${w * .45} ${w * .18}-${w * .9} 0z" fill="${c}"/><path d="M${cx + w * .2} ${ey + w * .5}l${w * .08} ${w * .3}h-${w * .14}z" fill="${c}"/>`,
  ])();
}
const CATF = ['#f2a65a', '#555', '#eee', '#9a7b5f', '#2b2b2b', '#d9c3a5', '#c8c8d0'];
const ANIMALS = [
  (r, id) => { const f = avPick(r, CATF), dark = f === '#2b2b2b' || f === '#555'; return solid(hsl(rr(r, 0, 360), 50, 80)) + `<path d="M9 13 11 3l7 7zM31 13 29 3l-7 7z" fill="${f}"/><ellipse cx="20" cy="21" rx="12" ry="10.5" fill="${f}"/>${eyes2(20, 19, 5, 1.6, dark ? '#9ee06a' : '#1b1b1b')}<path d="M19 23h2l-1 1.3z" fill="#e47b8a"/><path d="M20 24.3q-1.5 1.7-3 .8M20 24.3q1.5 1.7 3 .8M8 22l6 .5M8 25l6-.8M32 22l-6 .5M32 25l-6-.8" stroke="${dark ? '#ddd' : '#555'}" stroke-width=".7" fill="none"/>` + faceAcc(r, 20, 11, 22, 19, 5); },
  // cat asleep, curled up, seen from above on a blanket
  (r, id) => { const f = avPick(r, CATF); return solid(hsl(rr(r, 0, 360), 35, 70)) + `<path d="M0 10h40M0 20h40M0 30h40M10 0v40M20 0v40M30 0v40" stroke="#fff" stroke-width=".5" opacity=".25"/><ellipse cx="20" cy="21" rx="12" ry="10" fill="${f}"/><path d="M8 24c0 6 6 9 12 9 5 0 9-2 11-5-4 2-9 2-13 0" fill="none" stroke="${f}" stroke-width="3.4" stroke-linecap="round"/><circle cx="14" cy="17" r="5.5" fill="${f}"/><path d="M10 13l.5-4 3 2.5zM15.5 12l2.5-3 .5 4z" fill="${f}"/><path d="M11.5 17.5q1 .8 2 0M15 17.5q1 .8 2 0" stroke="#333" stroke-width=".6" fill="none"/><text x="27" y="12" font-size="5" font-family="sans-serif" fill="#fff" opacity=".8">z</text><text x="30" y="8" font-size="4" font-family="sans-serif" fill="#fff" opacity=".6">z</text>`; },
  // cat silhouette in a window at night
  (r, id) => avFlat('#1f2238') + `<rect x="6" y="5" width="28" height="27" rx="1" fill="${hsl(rr(r, 210, 240), 45, 30)}"/>${starsN(r, 6, 26).replace(/cx="(\d+)/g, (m, x) => `cx="${6 + (+x) * .7}`)}<circle cx="27" cy="12" r="4" fill="#f5edc4"/><path d="M20 5v27M6 18h28" stroke="#1f2238" stroke-width="1.4"/><rect x="3" y="32" width="34" height="3" fill="#3a3550"/><path d="M14 32c-1-5 0-9 3-10l-1-4 2 2.4h2l2-2.4-.6 4c3 1 4 5 3 10z" fill="#0b0b12"/><path d="M24 31c4 0 6-2 6-5" stroke="#0b0b12" stroke-width="1.4" fill="none"/>`,
  (r, id) => { const f = avPick(r, ['#c99a62', '#efe2cf', '#6b4a32', '#f0c27a', '#9a9a9a']), ear = avPick(r, ['#6b4a32', '#3a2a1e', '#efe2cf']); return solid(hsl(rr(r, 0, 360), 50, 80)) + `<ellipse cx="20" cy="21" rx="10.5" ry="11" fill="${f}"/><path d="M10 13c-4 2-5 10-2 13 3-1 5-6 5-11zM30 13c4 2 5 10 2 13-3-1-5-6-5-11z" fill="${ear}"/>${eyes2(20, 19, 4.3)}<ellipse cx="20" cy="26" rx="5" ry="3.8" fill="#f6ece0"/><ellipse cx="20" cy="24.2" rx="2" ry="1.4" fill="#1b1b1b"/><path d="M20 25.6v1.4q-1.5 1.2-2.6.4M20 27q1.5 1.2 2.6.4" stroke="#1b1b1b" stroke-width=".7" fill="none"/><path d="M18.6 28.4q1.4 2.6 2.8 0z" fill="#e8768a"/>` + faceAcc(r, 20, 10.5, 20, 19, 4.3); },
  // dog side profile with a tongue out, on grass
  (r, id) => { const f = avPick(r, ['#c99a62', '#f0c27a', '#6b4a32', '#efe2cf', '#2b2b2b']); return solid(hsl(rr(r, 190, 210), 60, 80)) + `<rect y="31" width="40" height="9" fill="#77b05c"/><path d="M6 30c0-5 3-8 8-8h10c2-5 6-8 10-6 2 1 3 3 2 5l-3 1c0 3-2 4-4 4v7l-2 1-1-5h-12l-1 5-2.4 1-1-6c-2 0-4-1-4-3z" fill="${f}"/><path d="M28 17c-2 2-2 5 0 7 1-2 2-4 1-7z" fill="${hsl(0, 0, 0, .25)}"/><circle cx="32" cy="18.5" r=".9" fill="#111"/><circle cx="37" cy="20.3" r="1" fill="#111"/><path d="M33.5 23q1 3 2.5 1.5l-.5-1.5z" fill="#e8768a"/><path d="M6 27c-3-1-4-4-3-6" stroke="${f}" stroke-width="2" fill="none" stroke-linecap="round"/>`; },
  (r, id) => solid(hsl(rr(r, 0, 360), 50, 80)) + `<path d="M8 8l6 9-3 2zM32 8l-6 9 3 2z" fill="#d9692b"/><path d="M8 14 20 34 32 14q-12-6-24 0z" fill="#e9772f"/><path d="M12 20q4 3 8 14 4-11 8-14-4 3-8 3t-8-3z" fill="#fff4e6"/>${eyes2(20, 19, 4.5, 1.2)}<circle cx="20" cy="31.5" r="1.5" fill="#1b1b1b"/>` + faceAcc(r, 20, 12, 20, 19, 4.5),
  // frog on a lily pad, from the side
  (r, id) => avFlat(hsl(195, 45, 45)) + `<path d="M0 24q10-2 20 0t20 0v16H0z" fill="${hsl(195, 50, 35)}"/><ellipse cx="20" cy="30" rx="15" ry="5" fill="#3f8f3f"/><path d="M20 30l12-4" stroke="${hsl(195, 50, 35)}" stroke-width="2"/><ellipse cx="20" cy="25" rx="8" ry="5.5" fill="#6cc04a"/><circle cx="16" cy="19.5" r="3" fill="#6cc04a"/><circle cx="24" cy="19.5" r="3" fill="#6cc04a"/><circle cx="16" cy="19.5" r="1.8" fill="#fff"/><circle cx="24" cy="19.5" r="1.8" fill="#fff"/><circle cx="16.4" cy="19.8" r="1" fill="#111"/><circle cx="24.4" cy="19.8" r="1" fill="#111"/><path d="M16 26q4 2 8 0" stroke="#2f6b26" stroke-width=".9" fill="none"/><circle cx="7" cy="27" r="1.6" fill="#f5a3c7"/>`,
  // owl on a branch at night
  (r, id) => { const f = avPick(r, ['#8a6a4a', '#b0905e', '#6f6f78']); return avFlat(hsl(235, 40, 20)) + starsN(r, 6) + `<circle cx="32" cy="8" r="3" fill="#f5edc4"/><path d="M0 33q20-4 40 1" stroke="#4a3426" stroke-width="2.4" fill="none"/><path d="M12 13l4 4h8l4-4v14q0 7-8 7t-8-7z" fill="${f}"/><circle cx="16.5" cy="21" r="3.4" fill="#fff6dc"/><circle cx="23.5" cy="21" r="3.4" fill="#fff6dc"/><circle cx="16.5" cy="21" r="1.7" fill="#1b1b1b"/><circle cx="23.5" cy="21" r="1.7" fill="#1b1b1b"/><path d="M19 24h2l-1 2z" fill="#f2a33a"/>`; },
  (r, id) => solid(hsl(rr(r, 180, 220), 50, 82)) + `<ellipse cx="20" cy="24" rx="12" ry="14" fill="#23262e"/><path d="M12 22q0-9 8-9t8 9q0 11-8 13t-8-13z" fill="#fff"/>${eyes2(20, 20, 3.6, 1.3)}<path d="M18 23h4l-2 2.6z" fill="#f2a33a"/><circle cx="14.5" cy="24" r="1.5" fill="#f4a5b5" opacity=".7"/><circle cx="25.5" cy="24" r="1.5" fill="#f4a5b5" opacity=".7"/>` + faceAcc(r, 20, 11, 20, 20, 3.6),
  // panda peeking up from the bottom edge
  (r, id) => solid(hsl(rr(r, 90, 150), 40, 75)) + `<circle cx="10" cy="22" r="5" fill="#222"/><circle cx="30" cy="22" r="5" fill="#222"/><ellipse cx="20" cy="34" rx="15" ry="13" fill="#fafafa"/><ellipse cx="14.5" cy="31" rx="3" ry="3.8" fill="#222" transform="rotate(-20 14.5 31)"/><ellipse cx="25.5" cy="31" rx="3" ry="3.8" fill="#222" transform="rotate(20 25.5 31)"/><circle cx="14.8" cy="30.6" r="1" fill="#fff"/><circle cx="25.2" cy="30.6" r="1" fill="#fff"/><ellipse cx="20" cy="36" rx="1.8" ry="1.2" fill="#222"/><path d="M6 40c0-3 2-5 4-5s3 2 3 5M27 40c0-3 1-5 3-5s4 2 4 5" fill="#222"/>`,
  (r, id) => { const f = avPick(r, ['#f3f0ec', '#c9a785', '#9a9a9a', '#e8d6c6']); return solid(hsl(rr(r, 0, 360), 50, 82)) + `<ellipse cx="15" cy="9" rx="3" ry="9" fill="${f}"/><ellipse cx="25" cy="9" rx="3" ry="9" fill="${f}" transform="rotate(${rr(r, 0, 30)} 25 16)"/><ellipse cx="15" cy="9" rx="1.4" ry="6" fill="#f2b5c4"/><ellipse cx="20" cy="24" rx="11" ry="10" fill="${f}"/>${eyes2(20, 22, 4.2)}<path d="M19 26h2l-1 1.2z" fill="#e47b8a"/>` + faceAcc(r, 20, 15, 20, 22, 4.2); },
  // little bird on a branch, side view
  (r, id) => { const c = hsl(rr(r, 0, 360), 70, 55); return solid(hsl(rr(r, 40, 60), 60, 88)) + `<path d="M0 30q20-6 40 0" stroke="#6b4a32" stroke-width="2" fill="none"/><path d="M30 27l4-4M8 28l-3-4" stroke="#6b4a32" stroke-width="1.2"/><ellipse cx="34" cy="22" rx="2" ry="1.2" fill="#6aa84f"/><path d="M12 24q0-10 9-10 6 0 7 5l3 1-3 1q-1 7-9 7-3 0-5-1l-6 3 3-5z" fill="${c}"/><path d="M15 21q5 5 10 0" fill="${hsl(0, 0, 100, .45)}"/><circle cx="25" cy="18" r="1" fill="#111"/><path d="M19 27l-1 2M22 27l1 2" stroke="#333" stroke-width=".7"/>`; },
  // goldfish in a round bowl
  (r, id) => solid(hsl(rr(r, 30, 60), 40, 86)) + `<path d="M8 12h24l2 4a13 13 0 1 1-28 0z" fill="#bfe6f7" opacity=".9"/><path d="M6.3 22a13.7 12 0 0 0 27.4 0z" fill="#7fc6ea"/><path d="M8 12h24" stroke="#9ad3ec" stroke-width="1.6"/><g transform="translate(${rr(r, -3, 3)} 0)"><ellipse cx="19" cy="25" rx="5" ry="3.4" fill="#f28a2e"/><path d="M24 25l4-3v6z" fill="#f28a2e"/><circle cx="16.5" cy="24.2" r=".8" fill="#111"/></g><circle cx="13" cy="20" r=".8" fill="#fff"/><circle cx="12" cy="17" r=".6" fill="#fff"/><path d="M14 33q2-3 4 0M23 33q1-4 3 0" stroke="#3f8a4c" stroke-width="1.2" fill="none"/>`,
  // jellyfish in deep water
  (r, id) => { const c = hsl(rr(r, 270, 340), 80, 72); return bgGrad('j' + id, hsl(220, 70, 25), hsl(240, 70, 10)) + `<path d="M11 18a9 8 0 0 1 18 0q-2 1.5-4.5 0t-4.5 0-4.5 0-4.5 0z" fill="${c}" opacity=".9"/><path d="M14 19q-2 5 0 9t0 9M18 19q2 5 0 9t1 8M22 19q-2 5 0 9t-1 8M26 19q2 5 0 9t0 9" stroke="${c}" stroke-width=".8" fill="none" opacity=".7"/><circle cx="17" cy="14" r="1" fill="#fff" opacity=".7"/>${starsN(r, 5)}`; },
  // butterfly
  (r, id) => { const c = hsl(rr(r, 0, 360), 75, 58), c2 = hsl(rr(r, 0, 360), 75, 45); return solid(hsl(rr(r, 60, 150), 40, 85)) + `<g transform="rotate(${rr(r, -20, 20)} 20 20)"><path d="M20 18C14 6 4 8 6 16c1 4 6 5 14 4zM20 18c6-12 16-10 14-2-1 4-6 5-14 4z" fill="${c}"/><path d="M20 21c-6 0-11 3-9 8 2 3 6 2 9-6zM20 21c6 0 11 3 9 8-2 3-6 2-9-6z" fill="${c2}"/><circle cx="11" cy="14" r="1.6" fill="#fff" opacity=".7"/><circle cx="29" cy="14" r="1.6" fill="#fff" opacity=".7"/><rect x="19.2" y="13" width="1.6" height="14" rx=".8" fill="#2a2a2a"/><path d="M20 13q-2-4-4-5M20 13q2-4 4-5" stroke="#2a2a2a" stroke-width=".6" fill="none"/></g>`; },
  // turtle seen from above
  (r, id) => solid(hsl(rr(r, 170, 200), 50, 60)) + `<g transform="rotate(${rr(r, -40, 40)} 20 20)"><ellipse cx="20" cy="9" rx="3" ry="3.6" fill="#86b86a"/><ellipse cx="11" cy="14" rx="2.4" ry="3.4" fill="#86b86a" transform="rotate(-40 11 14)"/><ellipse cx="29" cy="14" rx="2.4" ry="3.4" fill="#86b86a" transform="rotate(40 29 14)"/><ellipse cx="12" cy="28" rx="2.4" ry="3" fill="#86b86a"/><ellipse cx="28" cy="28" rx="2.4" ry="3" fill="#86b86a"/><ellipse cx="20" cy="21" rx="9.5" ry="10.5" fill="#5f8a3e"/><path d="M20 14l4 3v5l-4 3-4-3v-5zM20 14v-3M24 17l4-2M24 22l4 3M20 25v4M16 22l-4 3M16 17l-4-2" stroke="#3e5f27" stroke-width="1" fill="none"/></g>`,
  // capybara chilling in water with an orange on its head
  (r, id) => solid(hsl(rr(r, 180, 200), 50, 72)) + `<rect y="28" width="40" height="12" fill="${hsl(195, 55, 52)}"/><path d="M6 32c0-10 5-16 14-16 7 0 13 5 13 12v4z" fill="#a0764e"/><ellipse cx="29" cy="24" rx="5.6" ry="4.6" fill="#8d6643"/><circle cx="25" cy="21" r=".9" fill="#222"/><circle cx="16" cy="16.4" r="1.8" fill="#8d6643"/><circle cx="20" cy="13" r="3" fill="#f39a2b"/><path d="M20 10l1-1.5" stroke="#3e7a2a" stroke-width=".8"/><path d="M0 30q10-2 20 0t20 0" stroke="#d6eff7" stroke-width="1" fill="none"/>`,
  // hamster face, very close up
  (r, id) => solid(hsl(rr(r, 0, 360), 45, 82)) + `<g transform="translate(-6 -2) scale(1.3)"><ellipse cx="20" cy="22" rx="13" ry="11" fill="#e6b178"/><circle cx="11" cy="12" r="3" fill="#e6b178"/><circle cx="29" cy="12" r="3" fill="#e6b178"/><circle cx="11" cy="12" r="1.6" fill="#f2b5c4"/><ellipse cx="20" cy="26" rx="7" ry="5" fill="#fbecd9"/>${eyes2(20, 20, 4.6, 1.3)}<path d="M19.2 24h1.6l-.8 1z" fill="#e47b8a"/><circle cx="13" cy="24" r="1.4" fill="#f4a5b5" opacity=".6"/><circle cx="27" cy="24" r="1.4" fill="#f4a5b5" opacity=".6"/></g>` + faceAcc(r, 20, 10, 24, 19, 6),
];

/* ---------------- space ---------------- */
const SPACE = [
  (r, id) => { const h = rr(r, 0, 360), sky = hsl(rr(r, 230, 270), 45, 12); return solid(sky) + starsN(r, 10) + `<circle cx="20" cy="20" r="9" fill="${hsl(h, 55, 58)}"/><path d="M11.5 17q8.5-2 17 0M11.6 22q8.4 2 16.8 0" stroke="${hsl(h, 55, 45)}" stroke-width="1.6" fill="none"/><ellipse cx="20" cy="20" rx="16" ry="4.2" fill="none" stroke="${hsl(h + 40, 60, 75)}" stroke-width="1.6" transform="rotate(-18 20 20)"/>`; },
  (r, id) => { const sky = hsl(rr(r, 230, 270), 45, 12); return solid(sky) + starsN(r, 14) + `<circle cx="20" cy="20" r="10" fill="#f6e7a8"/><circle cx="24.5" cy="16.5" r="9" fill="${sky}"/>`; },
  (r, id) => { const h = rr(r, 260, 340), sky = hsl(250, 45, 10); return `<defs><radialGradient id="g${id}"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="${hsl(h, 80, 75)}"/><stop offset="1" stop-color="${sky}" stop-opacity="0"/></radialGradient></defs>` + solid(sky) + starsN(r, 16) + `<ellipse cx="20" cy="20" rx="17" ry="7" fill="url(#g${id})" transform="rotate(-25 20 20)"/>`; },
  (r, id) => avFlat(hsl(240, 45, 12)) + starsN(r, 12) + `<path d="M4 34 26 14" stroke="${hsl(190, 90, 75)}" stroke-width="3" stroke-linecap="round" opacity=".35"/><path d="M10 30 26 14" stroke="${hsl(190, 90, 85)}" stroke-width="1.6" stroke-linecap="round" opacity=".6"/><circle cx="27" cy="13" r="3.4" fill="#fff"/>`,
  // astronaut floating, whole body, tilted
  (r, id) => { const v = hsl(rr(r, 20, 60), 90, 60); return avFlat(hsl(240, 45, 10)) + starsN(r, 12) + `<g transform="rotate(${rr(r, -35, 35)} 20 21)"><rect x="13" y="20" width="14" height="11" rx="4" fill="#eceff3"/><rect x="11" y="22" width="4" height="9" rx="2" fill="#dfe3e8" transform="rotate(25 13 22)"/><rect x="25" y="22" width="4" height="9" rx="2" fill="#dfe3e8" transform="rotate(-35 27 22)"/><rect x="14.5" y="29" width="4.4" height="7" rx="2" fill="#dfe3e8"/><rect x="21" y="29" width="4.4" height="7" rx="2" fill="#dfe3e8"/><circle cx="20" cy="14" r="7" fill="#eceff3"/><ellipse cx="20" cy="14.4" rx="5" ry="4" fill="#1d2433"/><path d="M17 12.6q2-1.6 4.5-.6" stroke="${v}" stroke-width="1" fill="none"/><rect x="17" y="23" width="6" height="3" rx="1" fill="${v}"/></g>`; },
  // rocket lifting off
  (r, id) => bgGrad('rk' + id, hsl(240, 50, 18), hsl(260, 45, 40)) + starsN(r, 8, 20) + `<path d="M20 4c4 4 5 10 5 18h-10c0-8 1-14 5-18z" fill="#eef0f4"/><circle cx="20" cy="14" r="2.2" fill="${hsl(rr(r, 180, 220), 70, 55)}" stroke="#9aa3b2" stroke-width=".6"/><path d="M15 18l-4 6h4zM25 18l4 6h-4z" fill="${hsl(rr(r, 0, 20), 75, 55)}"/><path d="M16.5 22h7l-1.5 5q-2 3-4 0z" fill="#f6b33a"/><path d="M18 24h4l-2 6z" fill="#ffe7a0"/><ellipse cx="20" cy="37" rx="14" ry="4" fill="#c8ccd6" opacity=".7"/>`,
  // the Earth from orbit, partly in shadow
  (r, id) => `<defs><clipPath id="e${id}"><circle cx="20" cy="22" r="14"/></clipPath></defs>` + avFlat('#05070f') + starsN(r, 10) + `<circle cx="20" cy="22" r="14" fill="#2d6fd1"/><g clip-path="url(#e${id})"><path d="M8 14c4-2 8 0 9 3s-2 5 1 8-2 8-6 7-6-6-5-10 0-6 1-8zM24 10c3 0 7 3 8 6s-1 4-3 3-4 1-4 4-3 3-4 1 0-4-1-6 1-8 4-8z" fill="#3fa35b"/><path d="M6 22q10-3 28 2" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7"/><rect x="${rr(r, 22, 28)}" y="0" width="20" height="40" fill="#000" opacity=".45"/></g><circle cx="20" cy="22" r="14.5" fill="none" stroke="#8ec5ff" stroke-width=".8" opacity=".6"/>`,
  // solar eclipse ring
  (r, id) => avFlat('#04050a') + starsN(r, 8) + `<circle cx="20" cy="20" r="11" fill="#ffd58a" opacity=".25"/><circle cx="20" cy="20" r="9" fill="#fff3c9"/><circle cx="${20 + rr(r, -1, 1)}" cy="${20 + rr(r, -1, 1)}" r="8.4" fill="#04050a"/>`,
  // a constellation
  (r, id) => { const pts = Array.from({length: 6}, () => [rr(r, 5, 35), rr(r, 5, 35)]).sort((a, b) => a[0] - b[0]); return bgGrad('k' + id, hsl(rr(r, 220, 260), 50, 14), hsl(rr(r, 260, 300), 40, 24), 1, 1) + starsN(r, 14) + `<path d="M${pts.map(p => p.join(' ')).join('L')}" stroke="#a9c3ff" stroke-width=".6" fill="none" opacity=".8"/>` + pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="1.2" fill="#fff"/>`).join(''); },
  // UFO with a tractor beam
  (r, id) => { const c = hsl(rr(r, 90, 180), 70, 55); return avFlat('#14112b') + starsN(r, 10, 26) + `<path d="M14 16h12l8 22H6z" fill="${c}" opacity=".25"/><ellipse cx="20" cy="15" rx="12" ry="3.6" fill="#a8b0c0"/><path d="M14 13a6 5 0 0 1 12 0z" fill="${c}" opacity=".8"/><circle cx="13" cy="15.4" r=".9" fill="#ffd979"/><circle cx="20" cy="16.4" r=".9" fill="#ffd979"/><circle cx="27" cy="15.4" r=".9" fill="#ffd979"/><rect y="36" width="40" height="4" fill="#1d3a26"/><path d="M19 33l1-3 1 3z" fill="#fff"/>`; },
];

/* ---------------- original characters in the style of games and shows ---------------- */
const CHARACTERS = [
  (r, id) => { const plume = hsl(rr(r, 0, 360), 70, 50); return solid(hsl(rr(r, 0, 360), 45, 68)) + `<path d="M20 3q6 0 7 6-4-3-7-3z" fill="${plume}"/><path d="M11 18q0-11 9-11t9 11v12H11z" fill="#b8bec8"/><rect x="13" y="17" width="14" height="2.6" rx="1.3" fill="#2a2d33"/><path d="M20 20v9M16 23h8" stroke="#8a919c" stroke-width="1"/><path d="M6 40q2-9 14-10 12 1 14 10z" fill="#8a919c"/>`; },
  // knight's helmet in side profile with a sword behind
  (r, id) => solid(hsl(rr(r, 0, 360), 35, 30)) + `<path d="M8 36L32 6" stroke="#cfd5dd" stroke-width="2.4"/><path d="M28 10l4 4" stroke="#a07a3a" stroke-width="2.6"/><path d="M12 30c-2-12 3-20 12-20 5 0 8 4 8 9l-3 2v4l-4 1v4z" fill="#b8bec8"/><path d="M24 20h8" stroke="#2a2d33" stroke-width="1.8"/><path d="M15 12c3-5 8-7 12-5" stroke="${hsl(rr(r, 0, 360), 75, 50)}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  (r, id) => { const robe = hsl(rr(r, 220, 320), 55, 40), skin = avPick(r, SKIN); return solid(hsl(250, 40, 22)) + `<circle cx="33" cy="9" r="3" fill="${hsl(rr(r, 0, 360), 90, 70)}"/><path d="M33 12v26" stroke="#8a6a4a" stroke-width="1.6"/><path d="M5 40q2-10 15-11 13 1 15 11z" fill="${robe}"/><ellipse cx="20" cy="22" rx="6" ry="6.5" fill="${skin}"/><path d="M20 1 11 17h18z" fill="${robe}"/><path d="M9 17h22l-2 2H11z" fill="${hsl(45, 80, 55)}"/><circle cx="17.7" cy="22" r=".9" fill="#222"/><circle cx="22.3" cy="22" r=".9" fill="#222"/><path d="M14 26q6 9 12 0l-1 6q-5 4-10 0z" fill="#e8e8ef"/>`; },
  (r, id) => { const c = hsl(rr(r, 0, 360), 70, 58); return solid(hsl(rr(r, 0, 360), 40, 80)) + `<path d="M6 34q0-20 14-22 14 2 14 22z" fill="${c}"/><ellipse cx="13" cy="20" rx="3" ry="2" fill="#fff" opacity=".55"/><circle cx="16" cy="25" r="2" fill="#1b1b1b"/><circle cx="24" cy="25" r="2" fill="#1b1b1b"/><path d="M18 29q2 1.6 4 0" stroke="#1b1b1b" stroke-width="1" fill="none"/><ellipse cx="20" cy="35" rx="15" ry="2" fill="${hsl(0, 0, 0, .15)}"/>` + faceAcc(r, 20, 13, 24, 25, 4); },
  // a small round dragon, full body, wings out
  (r, id) => { const c = hsl(rr(r, 90, 300), 55, 50); return solid(hsl(rr(r, 0, 60), 70, 85)) + `<path d="M8 18c-5-3-7 2-6 6 3-2 6-2 8-1zM32 18c5-3 7 2 6 6-3-2-6-2-8-1z" fill="${c}" opacity=".7"/><ellipse cx="20" cy="26" rx="9" ry="8" fill="${c}"/><ellipse cx="20" cy="28" rx="5" ry="5" fill="#f4e3b0"/><circle cx="20" cy="15" r="7" fill="${c}"/><path d="M15 10l-1-4 3 3zM25 10l1-4-3 3z" fill="#f4e3b0"/>${eyes2(20, 14.5, 2.8, 1.1)}<path d="M18.5 18.5q1.5 1 3 0" stroke="#1b1b1b" stroke-width=".7" fill="none"/><path d="M28 32q6 1 6-4" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`; },
  (r, id) => { const c = hsl(rr(r, 0, 360), 30, 70), eye = hsl(rr(r, 0, 360), 90, 60); return solid(hsl(210, 25, 25)) + `<path d="M20 5v5" stroke="#999" stroke-width="1.4"/><circle cx="20" cy="4.5" r="1.8" fill="${eye}"/><rect x="9" y="10" width="22" height="18" rx="4" fill="${c}"/><rect x="12" y="14" width="16" height="7" rx="3.5" fill="#1d2330"/><circle cx="16" cy="17.5" r="2" fill="${eye}"/><circle cx="24" cy="17.5" r="2" fill="${eye}"/><path d="M15 24h10" stroke="#1d2330" stroke-width="1.4" stroke-dasharray="1.5 1"/><path d="M8 40q1-9 12-10 11 1 12 10z" fill="${c}"/>` + faceAcc(r, 20, 10, 22, 17.5, 4); },
  // one-eyed robot seen from the side, rolling on a wheel
  (r, id) => { const c = hsl(rr(r, 0, 360), 55, 55); return solid(hsl(rr(r, 0, 360), 30, 85)) + `<rect y="34" width="40" height="6" fill="${hsl(0, 0, 70)}"/><circle cx="20" cy="30" r="5" fill="#333"/><circle cx="20" cy="30" r="2" fill="#888"/><rect x="12" y="10" width="16" height="17" rx="5" fill="${c}"/><circle cx="23" cy="17" r="4" fill="#1d2330"/><circle cx="24" cy="17" r="2" fill="${hsl(rr(r, 160, 200), 90, 60)}"/><path d="M12 20h-4l-1 4" stroke="${c}" stroke-width="2" fill="none"/><path d="M20 10V5l3-1" stroke="#555" stroke-width="1" fill="none"/>`; },
  (r, id) => { const c = hsl(rr(r, 90, 180), 55, 55); return solid(hsl(270, 40, 20)) + starsN(r, 6) + `<path d="M20 6q12 0 12 13 0 13-12 16-12-3-12-16 0-13 12-13z" fill="${c}"/><ellipse cx="14.5" cy="20" rx="4" ry="5.5" fill="#111" transform="rotate(20 14.5 20)"/><ellipse cx="25.5" cy="20" rx="4" ry="5.5" fill="#111" transform="rotate(-20 25.5 20)"/><circle cx="15.5" cy="18.5" r="1" fill="#fff"/><circle cx="26.5" cy="18.5" r="1" fill="#fff"/><path d="M18 29q2 1 4 0" stroke="#1b1b1b" stroke-width=".9" fill="none"/>` + faceAcc(r, 20, 7, 22, 20, 5.5); },
  // a mirrored 8×8 pixel sprite
  (r, id) => { const c1 = hsl(rr(r, 0, 360), 70, 55), c2 = hsl(rr(r, 0, 360), 70, 35), px = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++){ const on = y === 3 && x === 1 ? 2 : r() < (y < 1 || y > 6 ? .35 : .65) ? 1 : 0; if (on){ [x, 7 - x].forEach(xx => px.push(`<rect x="${4 + xx * 4}" y="${4 + y * 4}" width="4.1" height="4.1" fill="${on === 2 ? '#fff' : (y + xx) % 3 ? c1 : c2}"/>`)); } }
    return solid(hsl(rr(r, 0, 360), 25, 18)) + px.join(''); },
  // pixel-art hero: little adventurer with a sword
  (r, id) => { const hair = hsl(rr(r, 0, 360), 60, 40), tunic = hsl(rr(r, 0, 360), 60, 45), skin = avPick(r, SKIN), P = (x, y, w, h, c) => `<rect x="${x * 2.5}" y="${y * 2.5}" width="${w * 2.5 + .05}" height="${h * 2.5 + .05}" fill="${c}"/>`;
    return solid(hsl(rr(r, 180, 220), 50, 70)) + P(0, 13, 16, 3, '#5a9a3a') + P(5, 2, 6, 2, hair) + P(4, 4, 8, 4, skin) + P(4, 4, 1, 2, hair) + P(11, 4, 1, 2, hair) + P(6, 5, 1, 1, '#111') + P(9, 5, 1, 1, '#111') + P(5, 8, 6, 4, tunic) + P(5, 12, 2, 1, '#4a3426') + P(9, 12, 2, 1, '#4a3426') + P(12, 3, 1, 6, '#d6dbe3') + P(11, 8, 3, 1, '#a07a3a'); },
  (r, id) => { const hair = hsl(rr(r, 0, 360), 75, 55), skin = avPick(r, SKIN.slice(0, 4)), eye = hsl(rr(r, 0, 360), 70, 45); return solid(hsl(rr(r, 0, 360), 50, 75)) + `<path d="M5 40q2-9 15-10 13 1 15 10z" fill="${hsl(rr(r, 0, 360), 45, 35)}"/><ellipse cx="20" cy="20" rx="8" ry="9" fill="${skin}"/><path d="M10 22 9 12l4 3 1-6 4 4 2-7 2 7 4-4 1 6 4-3-1 10-3-6-4 2-2-3-2 3-4-2z" fill="${hair}"/><ellipse cx="16.6" cy="21.5" rx="1.7" ry="2.4" fill="${eye}"/><ellipse cx="23.4" cy="21.5" rx="1.7" ry="2.4" fill="${eye}"/><circle cx="17" cy="20.6" r=".7" fill="#fff"/><circle cx="23.8" cy="20.6" r=".7" fill="#fff"/><path d="M19 26q1 .7 2 0" stroke="#7a3328" stroke-width=".8" fill="none"/>`; },
  // anime-style character in profile, hair blowing, speed lines
  (r, id) => { const hair = hsl(rr(r, 0, 360), 70, 50), skin = avPick(r, SKIN.slice(0, 4)); return solid(hsl(rr(r, 0, 360), 60, 85)) + Array.from({length: 7}, (_, k) => `<path d="M0 ${4 + k * 5.5}h${rr(r, 8, 20)}" stroke="#fff" stroke-width="1.2" opacity=".8"/>`).join('') + `<path d="M14 40c0-5 3-8 7-9l1-4c-2 0-3-1-3-3l-2-1 2-2c-1-6 3-10 8-10 5 0 8 4 7 10-1 3-2 5-4 6v3c3 1 5 4 6 10z" fill="${skin}"/><path d="M18 14c0-6 5-9 10-8 5 1 7 5 6 11l-2-3 1 6-3-4-1 4-2-4-4 2 1-3-3 1 1-3z" fill="${hair}"/><path d="M34 12l6-2-4 4 4 1-5 1" fill="${hair}"/><path d="M22.4 18.6l2 .6" stroke="#222" stroke-width="1.2"/><path d="M14 40c1-4 4-7 8-8 4 1 7 3 9 8z" fill="${hsl(rr(r, 0, 360), 45, 30)}"/>`; },
  (r, id) => { const c = hsl(rr(r, 160, 300), 70, 85); return solid(hsl(240, 35, 18)) + `<circle cx="20" cy="19" r="14" fill="${c}" opacity=".18"/><path d="M11 32V19q0-9 9-9t9 9v13l-3-2-3 2-3-2-3 2-3-2z" fill="${c}"/><ellipse cx="16.5" cy="20" rx="1.6" ry="2.2" fill="#2a2a44"/><ellipse cx="23.5" cy="20" rx="1.6" ry="2.2" fill="#2a2a44"/><ellipse cx="20" cy="25" rx="1.4" ry="1" fill="#2a2a44"/>`; },
  (r, id) => { const band = hsl(rr(r, 0, 360), 70, 50); return solid(hsl(rr(r, 0, 360), 40, 70)) + `<path d="M6 40q2-9 14-10 12 1 14 10z" fill="#23262e"/><ellipse cx="20" cy="20" rx="9" ry="10" fill="#23262e"/><rect x="11.5" y="17" width="17" height="6" rx="3" fill="${avPick(r, SKIN)}"/><circle cx="16.5" cy="20" r="1.1" fill="#1b1b1b"/><circle cx="23.5" cy="20" r="1.1" fill="#1b1b1b"/><rect x="11" y="13" width="18" height="2.6" fill="${band}"/><path d="M29 14l6-2-4 4 4 2-6-2z" fill="${band}"/>`; },
  // a mushroom creature in a forest
  (r, id) => { const cap = hsl(rr(r, 0, 30), 75, 50); return solid(hsl(rr(r, 90, 140), 35, 75)) + `<rect y="32" width="40" height="8" fill="#4f7a3a"/><path d="M14 24h12l-1 10h-10z" fill="#f4ead8"/>${eyes2(20, 28, 2.4, 1)}<path d="M6 24q0-14 14-14t14 14z" fill="${cap}"/><circle cx="13" cy="18" r="2" fill="#fff"/><circle cx="21" cy="14" r="2.4" fill="#fff"/><circle cx="28" cy="19" r="1.6" fill="#fff"/>`; },
  // potion bottle, glowing
  (r, id) => { const c = hsl(rr(r, 0, 360), 80, 55); return solid(hsl(rr(r, 230, 280), 35, 18)) + `<circle cx="20" cy="24" r="14" fill="${c}" opacity=".2"/><rect x="17" y="6" width="6" height="7" fill="#d9e2ec" opacity=".8"/><rect x="16" y="4" width="8" height="3" rx="1" fill="#8a5a33"/><path d="M17 13c-6 2-9 6-9 11a12 12 0 0 0 24 0c0-5-3-9-9-11z" fill="#d9e2ec" opacity=".35"/><path d="M8.6 25a11.4 11.4 0 0 0 22.8 0z" fill="${c}"/><circle cx="16" cy="28" r="1.4" fill="#fff" opacity=".6"/><circle cx="22" cy="31" r=".9" fill="#fff" opacity=".6"/><path d="M12 19q2-3 5-4" stroke="#fff" stroke-width="1" fill="none" opacity=".7"/>`; },
  // treasure chest, open, coins glinting
  (r, id) => solid(hsl(rr(r, 180, 260), 35, 30)) + `<path d="M8 20h24v14H8z" fill="#9a5a2a"/><path d="M8 20l2-9h20l2 9z" fill="#7a4520"/><path d="M8 20h24M20 20v14" stroke="#e8b84a" stroke-width="1.6"/><rect x="18" y="22" width="4" height="4" fill="#e8b84a"/>` + [[13, 18], [17, 16], [22, 17], [26, 18.5], [20, 19]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#f6cd4c" stroke="#d29d22" stroke-width=".5"/>`).join('') + `<path d="M30 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#fff"/>`,
  // a cloud mascot with a little rainbow
  (r, id) => solid(hsl(rr(r, 190, 220), 70, 75)) + `<path d="M6 30a6 6 0 0 1 4-10 8 8 0 0 1 15-3 6 6 0 0 1 9 6 4 4 0 0 1 0 8H8z" fill="#fff"/>${eyes2(19, 24, 3, 1)}<path d="M17.5 27q1.5 1.2 3 0" stroke="#1b1b1b" stroke-width=".7" fill="none"/><circle cx="13.5" cy="26" r="1.2" fill="#f4a5b5" opacity=".7"/><circle cx="24.5" cy="26" r="1.2" fill="#f4a5b5" opacity=".7"/><path d="M28 34q2-6 8-6M28 36q3-6 9-5" stroke="#f26b6b" stroke-width="1.2" fill="none"/><path d="M29 36.5q2.5-5 8.5-4" stroke="#f6c431" stroke-width="1.2" fill="none"/>`,
  // retro pixel spaceship
  (r, id) => { const c = hsl(rr(r, 0, 360), 70, 55), P = (x, y, w, h, col) => `<rect x="${x * 2.5}" y="${y * 2.5}" width="${w * 2.5 + .05}" height="${h * 2.5 + .05}" fill="${col}"/>`;
    return avFlat('#0b0b1a') + starsN(r, 10) + P(7, 3, 2, 2, c) + P(6, 5, 4, 3, '#d6dbe3') + P(7, 6, 2, 1, '#4fc3f7') + P(4, 7, 8, 2, '#d6dbe3') + P(2, 8, 2, 3, c) + P(12, 8, 2, 3, c) + P(5, 9, 6, 1, '#9aa3b2') + P(6, 10, 1, 2, '#f6b33a') + P(9, 10, 1, 2, '#f6b33a'); },
];

/* ---------------- food, drinks, hobbies and stuff ---------------- */
const THINGS = [
  (r, id) => { const cup = hsl(rr(r, 0, 360), 45, 55); return solid(hsl(rr(r, 0, 360), 45, 82)) + `<path d="M15 7q-2 3 0 5t0 5M20 6q-2 3 0 5t0 5M25 7q-2 3 0 5t0 5" stroke="#9a8a7a" stroke-width="1" fill="none" opacity=".7"/><path d="M10 19h18l-2 13q-.5 3-3.5 3h-7q-3 0-3.5-3z" fill="${cup}"/><path d="M28 21h2a3.5 3.5 0 0 1 0 7h-2.6" stroke="${cup}" stroke-width="2" fill="none"/><ellipse cx="19" cy="19" rx="9" ry="1.8" fill="#5a3a26"/>`; },
  // latte from straight above, with latte art
  (r, id) => solid(hsl(rr(r, 20, 40), 30, rr(r, 40, 60))) + `<path d="M0 8h40M0 16h40M0 24h40M0 32h40" stroke="#000" stroke-width=".4" opacity=".15"/><circle cx="20" cy="20" r="14" fill="#f4f1ec"/><path d="M33 17h4a3 3 0 0 1 0 6h-4" fill="none" stroke="#f4f1ec" stroke-width="2.4"/><circle cx="20" cy="20" r="11" fill="#b07a4b"/><path d="M20 27c-5-3-7-7-5-10 1-2 3-2 5 0 2-2 4-2 5 0 2 3 0 7-5 10z" fill="#f3e3cc"/><path d="M20 27v3" stroke="#f3e3cc" stroke-width="1.2"/>`,
  (r, id) => solid(hsl(rr(r, 0, 360), 45, 82)) + `<path d="M28 4 22 18M33 6 25 18" stroke="#b07a4a" stroke-width="1.4"/><path d="M6 20h28q0 13-14 14Q6 33 6 20z" fill="${hsl(rr(r, 0, 360), 55, 45)}"/><ellipse cx="20" cy="20" rx="14" ry="3" fill="#f2d39a"/><path d="M10 20q2-2 4 0t4 0 4 0 4 0 4 0" stroke="#f8e7b8" stroke-width="1" fill="none"/><circle cx="25" cy="19.4" r="2.4" fill="#fff"/><circle cx="25" cy="19.4" r="1.2" fill="#f5b83a"/><rect x="13" y="17.5" width="5" height="2.6" rx=".6" fill="#2f5a2a"/>`,
  (r, id) => solid(hsl(rr(r, 0, 360), 45, 82)) + `<path d="M23 3l-3 12" stroke="${hsl(rr(r, 0, 360), 70, 55)}" stroke-width="2.4" stroke-linecap="round"/><path d="M11 13h18l-2.5 22h-13z" fill="#fff" opacity=".85"/><path d="M11.6 18h16.8l-2 17h-12.8z" fill="${avPick(r, ['#d9b48f', '#c9a3d9', '#a7d6a0', '#f2c6a0'])}"/><rect x="10" y="12" width="20" height="2.6" rx="1.2" fill="#ddd"/>${[[16, 31], [19, 32], [22, 31], [24, 32.5], [17.5, 29], [21, 29.4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#3a2a22"/>`).join('')}`,
  // guitar, diagonal, close-up so it runs off the edge
  (r, id) => { const c = hsl(rr(r, 0, 40), 70, 45); return solid(hsl(rr(r, 0, 360), 30, 85)) + `<g transform="translate(-4 4) scale(1.3)"><path d="M26 14 33 7" stroke="#4a3426" stroke-width="2.4"/><path d="M19 15q4-4 7-1t-1 7q2 3-1 7-6 6-12 0t0-12q4-3 7-1z" fill="${c}"/><circle cx="18" cy="22" r="2.2" fill="#2b1e16"/><path d="M14.5 25.5 31 9" stroke="#e9e1d4" stroke-width=".5"/></g>`; },
  (r, id) => solid(hsl(rr(r, 0, 360), 40, 84)) + [[7, 28, 26, 0], [9, 22, 22, 1], [8, 16, 24, 2], [11, 10, 18, 3]].map(([x, y, w, k]) => `<rect x="${x}" y="${y}" width="${w}" height="6" rx="1" fill="${hsl(rr(r, 0, 360), 55, 45 + k * 4)}"/><rect x="${x + 2}" y="${y + 2}" width="${w - 6}" height="1" fill="#fff" opacity=".6"/>`).join(''),
  // open book with a pencil, from above
  (r, id) => solid(hsl(rr(r, 20, 40), 35, rr(r, 45, 65))) + `<g transform="rotate(${rr(r, -15, 15)} 20 20)"><path d="M4 11q8-2 16 1v20q-8-3-16-1z" fill="#fbf8f0"/><path d="M36 11q-8-2-16 1v20q8-3 16-1z" fill="#f3efe4"/><path d="M7 15q5-1 10 1M7 18q5-1 10 1M7 21q5-1 10 1M23 16q5-2 10-1M23 19q5-2 10-1M23 22q5-2 10-1" stroke="#b9b3a6" stroke-width=".6" fill="none"/><path d="M14 33l16-14 2 2-16 14-3 1z" fill="#f6c431"/><path d="M30 19l2 2 1.5-1.5-2-2z" fill="#f4a5b5"/></g>`,
  (r, id) => { const pot = hsl(rr(r, 10, 50), 55, 50); return solid(hsl(rr(r, 0, 360), 35, 84)) + `<path d="M20 26c-1-6-6-9-11-9 1 6 5 9 11 9zM20 26c1-7 5-11 11-12-1 7-5 11-11 12zM20 26c-2-6-1-12 1-16 2 5 2 11-1 16z" fill="#4a9a52"/><path d="M12 26h16l-2 10H14z" fill="${pot}"/>`; },
  // monstera leaves filling the frame
  (r, id) => solid('#e9e2d4') + [[8, 14, -30], [28, 12, 30], [20, 28, 0]].map(([x, y, a]) => `<g transform="rotate(${a} ${x} ${y})"><path d="M${x} ${y - 11}c8 2 10 8 9 13-1 4-5 8-9 9-4-1-8-5-9-9-1-5 1-11 9-13z" fill="${hsl(rr(r, 120, 150), 45, rr(r, 28, 40))}"/><path d="M${x} ${y - 10}v20M${x} ${y - 4}l6-3M${x} ${y - 4}l-6-3M${x} ${y + 2}l7-2M${x} ${y + 2}l-7-2" stroke="#e9e2d4" stroke-width="1.1"/></g>`).join(''),
  (r, id) => solid(hsl(rr(r, 0, 360), 40, 82)) + `<circle cx="20" cy="20" r="12" fill="#e87a2d"/><path d="M8 20h24M20 8v24M11.5 11.5q6 8.5 0 17M28.5 11.5q-6 8.5 0 17" stroke="#3a2210" stroke-width="1.1" fill="none"/>`,
  // a basketball swishing through a hoop
  (r, id) => solid(hsl(rr(r, 200, 230), 50, 70)) + `<rect x="10" y="4" width="20" height="13" fill="#fff" stroke="#c33" stroke-width="1"/><rect x="16" y="9" width="8" height="6" fill="none" stroke="#c33" stroke-width=".8"/><path d="M11 17h18" stroke="#e5642d" stroke-width="1.6"/><path d="M12 17l3 9h10l3-9M15 17l2 9M20 17v9M25 17l-2 9M13 21h14" stroke="#fff" stroke-width=".6" fill="none"/><circle cx="20" cy="22" r="5" fill="#e87a2d"/><path d="M15 22h10M20 17v10" stroke="#3a2210" stroke-width=".7"/>`,
  (r, id) => { const d = hsl(rr(r, 0, 360), 70, 55); return solid(hsl(rr(r, 0, 360), 40, 82)) + `<g transform="rotate(${rr(r, -45, 45)} 20 20)"><rect x="4" y="16" width="32" height="6" rx="3" fill="${d}"/><path d="M8 19h24" stroke="#fff" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/><circle cx="11" cy="25" r="2.5" fill="#333"/><circle cx="29" cy="25" r="2.5" fill="#333"/></g>`; },
  (r, id) => solid(hsl(rr(r, 0, 360), 40, 82)) + `<g transform="rotate(${rr(r, -40, 40)} 20 20)"><path d="M8 10q12-6 24 0L20 35z" fill="#f4c55a"/><path d="M8 10q12-6 24 0l-1.4 2.6q-10.6-5-21.2 0z" fill="#c98a3a"/>${[[16, 15], [23, 16], [20, 22], [18, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#c8402e"/>`).join('')}</g>`,
  (r, id) => { const bg = hsl(rr(r, 0, 360), 40, 82), ice = hsl(rr(r, 0, 360), 70, 72); return solid(bg) + `<circle cx="20" cy="21" r="12" fill="#d9a066"/><path d="M8.5 19q0-10 11.5-10t11.5 10q-1 4-4 3t-4 2-4-1-4 1-4-2-3-3z" fill="${ice}"/><circle cx="20" cy="20" r="3.6" fill="${bg}"/>${Array.from({length: 7}, () => `<rect x="${rr(r, 11, 29)}" y="${rr(r, 11, 19)}" width="2" height=".8" rx=".4" fill="${hsl(rr(r, 0, 360), 80, 55)}"/>`).join('')}`; },
  (r, id) => solid(hsl(rr(r, 0, 360), 40, 82)) + `<circle cx="20" cy="20" r="12" fill="#fafafa" stroke="#333" stroke-width="1"/><path d="M20 15l4.5 3.3-1.7 5.3h-5.6l-1.7-5.3z" fill="#222"/><path d="M20 15V8.5M24.5 18.3l6-2M22.8 23.6l3.7 5.2M17.2 23.6l-3.7 5.2M15.5 18.3l-6-2" stroke="#333" stroke-width="1"/>`,
  (r, id) => solid(hsl(rr(r, 0, 360), 40, 82)) + `<rect x="7" y="13" width="26" height="17" rx="3" fill="#2b2d33"/><rect x="12" y="10" width="7" height="4" rx="1" fill="#2b2d33"/><circle cx="20" cy="21.5" r="6" fill="#4d5560"/><circle cx="20" cy="21.5" r="3.6" fill="${hsl(rr(r, 0, 360), 50, 45)}"/><circle cx="18.8" cy="20.3" r="1" fill="#fff" opacity=".7"/><circle cx="29" cy="16" r="1.2" fill="#f0c040"/>`,
  // vinyl record, spinning off-centre
  (r, id) => solid(hsl(rr(r, 0, 360), 50, 70)) + `<circle cx="${rr(r, 18, 24)}" cy="${rr(r, 18, 24)}" r="17" fill="#141414"/><circle cx="20" cy="20" r="13" fill="none" stroke="#333" stroke-width=".4"/><circle cx="20" cy="20" r="10" fill="none" stroke="#333" stroke-width=".4"/><circle cx="20" cy="20" r="5.5" fill="${hsl(rr(r, 0, 360), 70, 55)}"/><circle cx="20" cy="20" r=".9" fill="#ddd"/><path d="M8 12a14 14 0 0 1 8-6" stroke="#fff" stroke-width=".8" opacity=".3" fill="none"/>`,
  // big over-ear headphones
  (r, id) => { const c = hsl(rr(r, 0, 360), 60, 50); return solid(hsl(rr(r, 0, 360), 35, 85)) + `<path d="M8 24c0-10 5-17 12-17s12 7 12 17" stroke="#2a2a33" stroke-width="3" fill="none"/><rect x="5" y="20" width="8" height="12" rx="3.5" fill="${c}"/><rect x="27" y="20" width="8" height="12" rx="3.5" fill="${c}"/><rect x="8.5" y="22" width="3" height="8" rx="1.4" fill="#2a2a33"/><rect x="28.5" y="22" width="3" height="8" rx="1.4" fill="#2a2a33"/>`; },
  // sneaker side view
  (r, id) => { const c = hsl(rr(r, 0, 360), 70, 55); return solid(hsl(rr(r, 0, 360), 30, 88)) + `<g transform="rotate(${rr(r, -12, 6)} 20 22)"><path d="M4 28c0-3 1-6 3-8l4-6c1-1 3-1 4 0l3 3 8 3c5 1 9 3 10 6l1 2z" fill="${c}"/><path d="M3 28h35v3c0 1-1 2-2 2H5c-1 0-2-1-2-2z" fill="#f4f4f4"/><path d="M14 17l3 4M16 16l3 4M18.5 16.5l2.5 3.5" stroke="#fff" stroke-width=".9"/><path d="M22 24q6-1 12 3" stroke="#fff" stroke-width="1.6" fill="none"/></g>`; },
  // cassette tape
  (r, id) => { const c = hsl(rr(r, 0, 360), 70, 60); return solid(hsl(rr(r, 0, 360), 30, 25)) + `<g transform="rotate(${rr(r, -15, 15)} 20 20)"><rect x="4" y="10" width="32" height="21" rx="2" fill="${c}"/><rect x="7" y="13" width="26" height="9" rx="1" fill="#fbf8f0"/><rect x="11" y="15" width="18" height="5" rx="2.5" fill="#333"/><circle cx="14" cy="17.5" r="1.8" fill="#eee"/><circle cx="26" cy="17.5" r="1.8" fill="#eee"/><path d="M10 31l2-5h16l2 5" fill="${hsl(0, 0, 0, .2)}"/></g>`; },
  // polaroid photo of a little landscape
  (r, id) => solid(hsl(rr(r, 0, 360), 25, rr(r, 30, 60))) + `<g transform="rotate(${rr(r, -14, 14)} 20 20)"><rect x="8" y="6" width="24" height="28" rx="1" fill="#fbfbf8"/><rect x="10" y="8" width="20" height="18" fill="${hsl(rr(r, 180, 220), 60, 70)}"/><circle cx="25" cy="12" r="2" fill="#fff3b0"/><path d="M10 26l6-7 4 4 4-5 6 8z" fill="${hsl(rr(r, 90, 150), 40, 40)}"/></g>`,
  (r, id) => solid(hsl(rr(r, 180, 240), 40, 80)) + `<rect x="6" y="18" width="28" height="10" rx="2" fill="#f3f0e6"/><rect x="6" y="18" width="28" height="4" fill="#e85a4f"/><ellipse cx="20" cy="17" rx="10" ry="4" fill="#1d1d1d"/><ellipse cx="20" cy="16.6" rx="6" ry="2.4" fill="#f28a4a"/><path d="M14 17q6-2 12 0" stroke="#fff" stroke-width=".6"/>`,
  // ice cream cone, tilted
  (r, id) => solid(hsl(rr(r, 0, 360), 55, 85)) + `<g transform="rotate(${rr(r, -20, 20)} 20 20)"><path d="M13 20l7 18 7-18z" fill="#e2a85c"/><path d="M15 23l8 6M14 21l10 8M25 23l-8 6" stroke="#b9803e" stroke-width=".6"/><circle cx="16" cy="18" r="5" fill="${hsl(rr(r, 0, 360), 70, 78)}"/><circle cx="24" cy="18" r="5" fill="${hsl(rr(r, 0, 360), 70, 78)}"/><circle cx="20" cy="12" r="5.6" fill="${hsl(rr(r, 0, 360), 70, 78)}"/><circle cx="20" cy="6" r="1.8" fill="#d6322b"/></g>`,
  // matcha bowl from above with a whisk
  (r, id) => solid('#e8e0d0') + `<circle cx="18" cy="21" r="13" fill="#2f3a35"/><circle cx="18" cy="21" r="10.5" fill="#86b448"/><path d="M12 19q3-2 6 0t6 0M13 23q3-2 6 0t5 0" stroke="#b8d77a" stroke-width=".8" fill="none"/><path d="M32 4l-6 13" stroke="#c9a46a" stroke-width="2.4"/><path d="M25 16l-3 6M26 17l-2 6M27 17l-1 6" stroke="#d8bc8c" stroke-width=".8"/>`,
  (r, id) => solid(hsl(rr(r, 0, 360), 45, 82)) + `<path d="M8 18a12 8 0 0 1 24 0z" fill="#e2a85c"/><circle cx="14" cy="14" r=".7" fill="#fff"/><circle cx="20" cy="12" r=".7" fill="#fff"/><circle cx="25" cy="14" r=".7" fill="#fff"/><path d="M7 19q3-2 6 0t6 0 6 0 6 0 2 0" stroke="#6ab04c" stroke-width="2.2" fill="none"/><rect x="8" y="21" width="24" height="3" rx="1" fill="#f2c94c"/><rect x="8" y="24" width="24" height="4" rx="2" fill="#7a3f22"/><path d="M8 29h24a0 0 0 0 1 0 0q0 4-4 4H12q-4 0-4-4z" fill="#e2a85c"/>`,
  // tennis racket and ball
  (r, id) => solid(hsl(rr(r, 180, 240), 45, 78)) + `<g transform="rotate(-35 20 20)"><ellipse cx="20" cy="13" rx="8" ry="10" fill="none" stroke="${hsl(rr(r, 0, 360), 65, 45)}" stroke-width="2"/><path d="M14 8h12M13 12h14M13 16h14M15 20h10M16 6v14M20 3v20M24 6v14" stroke="#ddd" stroke-width=".5"/><rect x="18.8" y="23" width="2.4" height="13" rx="1" fill="#333"/></g><circle cx="30" cy="30" r="4" fill="#d6e44a"/><path d="M27 27q3 3 6 6" stroke="#fff" stroke-width=".7" fill="none"/>`,
  // bicycle side view
  (r, id) => { const c = hsl(rr(r, 0, 360), 70, 50); return solid(hsl(rr(r, 0, 360), 35, 86)) + `<circle cx="10" cy="26" r="7" fill="none" stroke="#333" stroke-width="1.4"/><circle cx="30" cy="26" r="7" fill="none" stroke="#333" stroke-width="1.4"/><path d="M10 26l7-11h10l3 11M17 15l3 11 7-11M20 26l-10 0M15 12h4M26 12l1 3" stroke="${c}" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M24 11h4" stroke="#333" stroke-width="1.4"/>`; },
  // chess knight piece
  (r, id) => { const dark = r() < .5; return solid(dark ? '#efe7d6' : '#2c2a33') + `<path d="M0 34h40v6H0z" fill="${dark ? '#c8b896' : '#46424f'}"/><path d="M12 34h16v-3H12zM14 31c0-5 2-8 4-10l-6 1c-2-1-2-4 0-5l6-5c1-3 3-4 5-4 6 1 9 7 8 14l-1 9z" fill="${dark ? '#2c2a33' : '#f4efe4'}"/><circle cx="20" cy="13" r=".9" fill="${dark ? '#efe7d6' : '#2c2a33'}"/>`; },
];

/* ---------------- abstract, patterns and styled letters ---------------- */
const ABSTRACT = [
  (r, id) => { const h = rr(r, 0, 360); return bgGrad('x' + id, hsl(h, 70, 55), hsl(h + rr(r, 60, 180), 70, 55), 1, 1) + `<circle cx="${rr(r, 10, 30)}" cy="${rr(r, 10, 30)}" r="${rr(r, 5, 11)}" fill="#fff" opacity=".18"/>`; },
  (r, id) => { const h = rr(r, 0, 360); return solid(hsl(h, 40, 15)) + [16, 12, 8, 4].map((x, k) => `<circle cx="20" cy="20" r="${x}" fill="none" stroke="${hsl(h + k * 30, 70, 55)}" stroke-width="2.4"/>`).join(''); },
  (r, id) => { const h = rr(r, 0, 360); return solid(hsl(h, 70, 55)) + `<g transform="rotate(${avPick(r, [30, 45, -30, 60, 0, 90])} 20 20)">${[-20, -10, 0, 10, 20, 30].map(x => `<rect x="${x}" y="-10" width="5" height="60" fill="${hsl(h + 140, 70, 55)}" opacity=".7"/>`).join('')}</g>`; },
  (r, id) => { const h = rr(r, 0, 360); return solid(hsl(h, 30, 90)) + `<path d="M0 40 20 6l20 34z" fill="${hsl(h, 70, 55)}"/><path d="M8 40 26 12l14 28z" fill="${hsl(h + 60, 70, 55)}" opacity=".75"/><path d="M0 40 12 22l12 18z" fill="${hsl(h + 200, 70, 55)}" opacity=".8"/>`; },
  (r, id) => { const h = rr(r, 0, 360); return solid(hsl(h, 35, 92)) + Array.from({length: 4}, (_, k) => `<circle cx="${rr(r, 0, 40)}" cy="${rr(r, 0, 40)}" r="${rr(r, 7, 16)}" fill="${hsl(h + k * 70, 70, 55)}" opacity=".7"/>`).join(''); },
  (r, id) => { const h = rr(r, 0, 360); return solid(hsl(h, 70, 55)) + [12, 20, 28].map((y, k) => `<path d="M-2 ${y}q5.5-5 11 0t11 0 11 0 11 0" stroke="${hsl(h + 180, 70, 85)}" stroke-width="2.4" fill="none" opacity="${.9 - k * .2}"/>`).join(''); },
  // checkerboard, tilted
  (r, id) => { const a = hsl(rr(r, 0, 360), 60, 55), b = hsl(rr(r, 0, 360), 30, 92); let s = ''; for (let y = -2; y < 7; y++) for (let x = -2; x < 7; x++) if ((x + y) % 2 === 0) s += `<rect x="${x * 8}" y="${y * 8}" width="8" height="8" fill="${a}"/>`; return solid(b) + `<g transform="rotate(${avPick(r, [0, 45, 15])} 20 20)">${s}</g>`; },
  // halftone dots fading across
  (r, id) => { const h = rr(r, 0, 360); let s = ''; for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) s += `<circle cx="${x * 5 + 2}" cy="${y * 5 + 2}" r="${(.3 + (x + y) / 16 * 2).toFixed(2)}" fill="${hsl(h, 70, 35)}"/>`; return solid(hsl(h + 30, 70, 80)) + s; },
  // sunburst rays
  (r, id) => { const h = rr(r, 0, 360); return solid(hsl(h, 80, 60)) + Array.from({length: 12}, (_, k) => `<path d="M20 20L${20 + 40 * Math.cos(k * Math.PI / 6)} ${20 + 40 * Math.sin(k * Math.PI / 6)}L${20 + 40 * Math.cos((k + .5) * Math.PI / 6)} ${20 + 40 * Math.sin((k + .5) * Math.PI / 6)}z" fill="${hsl(h + 30, 85, 70)}"/>`).join('') + `<circle cx="20" cy="20" r="6" fill="${hsl(h + 50, 90, 85)}"/>`; },
  // colour blocks, like an old poster
  (r, id) => { const c = () => avPick(r, ['#e63946', '#f1c40f', '#1d4ed8', '#111', '#f4f1ea', '#2a9d8f']); return solid('#f4f1ea') + `<rect width="24" height="16" fill="${c()}"/><rect x="26" width="14" height="28" fill="${c()}"/><rect y="18" width="12" height="22" fill="${c()}"/><rect x="14" y="30" width="26" height="10" fill="${c()}"/><path d="M24 0v40M0 16h26M12 16v24M12 30h28M26 28h14" stroke="#111" stroke-width="1.6"/>`; },
  // concentric squares, rotated
  (r, id) => { const h = rr(r, 0, 360); return solid(hsl(h, 50, 20)) + `<g transform="rotate(${rr(r, 0, 45)} 20 20)">${[34, 26, 18, 10].map((s, k) => `<rect x="${20 - s / 2}" y="${20 - s / 2}" width="${s}" height="${s}" fill="${hsl(h + k * 25, 70, 40 + k * 10)}"/>`).join('')}</g>`; },
  // glitch bars
  (r, id) => solid('#0d0d12') + Array.from({length: 10}, () => `<rect x="${rr(r, -5, 30)}" y="${rr(r, 0, 38)}" width="${rr(r, 8, 30)}" height="${rr(r, 1, 4)}" fill="${avPick(r, ['#ff2e88', '#25f4ee', '#ffffff', '#7a5cff'])}" opacity="${rr(r, .5, 1)}"/>`).join(''),
  // a minimal smiley
  (r, id) => { const h = rr(r, 0, 360); return solid(hsl(h, 75, 60)) + `<circle cx="15" cy="17" r="1.8" fill="#111"/><circle cx="25" cy="17" r="1.8" fill="#111"/><path d="M13 24q7 6 14 0" stroke="#111" stroke-width="1.8" fill="none" stroke-linecap="round"/>`; },
];
// a styled letter or symbol (players who use their initial as a logo)
function avMonogram(r, id, b){
  const h = rr(r, 0, 360), ch = (b && b.name ? b.name.replace(/[^A-Za-z]/g, '')[0] || 'x' : 'x'), kind = avPick(r, ['serif', 'bold', 'outline', 'script', 'symbol']);
  const bg = kind === 'outline' ? solid(hsl(h, 30, 12)) : r() < .5 ? bgGrad('mo' + id, hsl(h, 70, 55), hsl(h + 60, 70, 45), 1, 1) : solid(hsl(h, 40, 88));
  const fill = kind === 'outline' ? 'none' : r() < .5 && kind !== 'serif' ? '#fff' : hsl(h + 180, 55, 25);
  if (kind === 'symbol') return bg + `<text x="20" y="28" text-anchor="middle" font-size="22" font-family="system-ui,sans-serif" fill="${fill}">${avPick(r, ['★', '♪', '☾', '✦', '♥', '⚡', '☀', '♣', '✿', '∞'])}</text>`;
  const fam = kind === 'serif' ? 'Georgia,serif' : kind === 'script' ? '"Brush Script MT",cursive' : 'system-ui,sans-serif';
  return bg + `<text x="20" y="${kind === 'script' ? 29 : 28.5}" text-anchor="middle" font-size="${kind === 'script' ? 26 : 22}" font-weight="${kind === 'bold' || kind === 'outline' ? 900 : 400}" font-style="${kind === 'serif' && r() < .5 ? 'italic' : 'normal'}" font-family='${fam}' fill="${fill}" ${kind === 'outline' ? `stroke="${hsl(h, 90, 65)}" stroke-width="1.2"` : ''}>${kind === 'serif' || kind === 'script' ? ch.toUpperCase() : (r() < .5 ? ch.toUpperCase() : ch.toLowerCase())}</text>`;
}

// each player picks a kind of picture; people and animals are most common, like on real profiles
const AV_KINDS = [['person', 22, PEOPLE], ['animal', 16, ANIMALS], ['nature', 14, NATURE], ['character', 14, CHARACTERS], ['thing', 14, THINGS], ['space', 6, SPACE], ['abstract', 6, ABSTRACT], ['mono', 3, null], ['none', 5, null]];
function avKind(r){ let x = r() * 100; for (const k of AV_KINDS){ x -= k[1]; if (x <= 0) return k; } return AV_KINDS[0]; }
// stickers and extras some people add on top
const AV_EXTRAS = [
  r => Array.from({length: 3}, () => { const x = rr(r, 4, 36), y = rr(r, 4, 16), k = rr(r, 1, 2); return `<path d="M${x} ${y - 2 * k}l${.5 * k} ${1.5 * k} ${1.5 * k} ${.5 * k}-${1.5 * k} ${.5 * k}-${.5 * k} ${1.5 * k}-${.5 * k}-${1.5 * k}-${1.5 * k}-${.5 * k} ${1.5 * k}-${.5 * k}z" fill="#fff"/>`; }).join(''),
  r => [0, 1].map(() => { const x = rr(r, 5, 35), y = rr(r, 4, 12); return `<path d="M${x} ${y + 3}l-2.6-2.6a1.5 1.5 0 0 1 2.6-2 1.5 1.5 0 0 1 2.6 2z" fill="${hsl(rr(r, 330, 360), 80, 62)}"/>`; }).join(''),
  r => `<g fill="#fff" opacity=".9"><path d="M${rr(r, 28, 33)} 5v6.5a1.6 1.6 0 1 1-1-1.4V6.5l4-1v5a1.6 1.6 0 1 1-1-1.4V6z"/></g>`,
  r => `<circle cx="33" cy="33" r="5" fill="${hsl(rr(r, 0, 360), 80, 55)}" stroke="#fff" stroke-width="1"/><text x="33" y="35" text-anchor="middle" font-size="5.4" font-family="sans-serif" fill="#fff">${avPick(r, ['★', '♥', '✓', '☀', '♪'])}</text>`,
  r => Array.from({length: 5}, () => `<circle cx="${rr(r, 3, 37)}" cy="${rr(r, 3, 37)}" r="${rr(r, .8, 2)}" fill="none" stroke="#fff" stroke-width=".6" opacity=".8"/>`).join(''),
  r => `<path d="M${rr(r, 2, 8)} 2l3 0-2 4h2.5l-4.5 6 1-4.5h-2z" fill="#ffd84a" stroke="#c89b00" stroke-width=".4"/>`,
  r => `<rect x="1.5" y="1.5" width="37" height="37" rx="18.5" fill="none" stroke="${hsl(rr(r, 0, 360), 80, 60)}" stroke-width="2.4" stroke-dasharray="${avPick(r, ['0', '3 2', '1 2'])}"/>`,
];
// photo filters some people use
const AV_FILTERS = ['<feColorMatrix type="saturate" values="0"/>', '<feColorMatrix type="matrix" values=".39 .77 .19 0 0 .35 .69 .17 0 0 .27 .53 .13 0 0 0 0 0 1 0"/>', '<feColorMatrix type="saturate" values="1.7"/>', '<feComponentTransfer><feFuncR type="linear" slope=".85" intercept=".12"/><feFuncG type="linear" slope=".85" intercept=".1"/><feFuncB type="linear" slope=".8" intercept=".16"/></feComponentTransfer>'];

function avatarSvg(i, b){
  let s = AV_CACHE.get(i); if (s !== undefined) return s;
  const r = avRng(i + 7), [kind, , list] = avKind(r);
  if (kind === 'none'){ AV_CACHE.set(i, ''); return ''; }
  const id = 'a' + i.toString(36);
  AVR = r;
  let body = kind === 'mono' ? avMonogram(r, id, b) : avPick(r, list)(r, id);
  // framing: some are zoomed in or cropped, some mirrored, a few get a photo filter or a thin ring
  const t = r(), zoom = t < .32 ? rr(r, 1.12, 1.55) : 1, flip = kind !== 'mono' && r() < .3, f = r() < .12 ? avPick(r, AV_FILTERS) : '', ring = r() < .06;
  const tilt = kind !== 'mono' && r() < .28 ? rr(r, -14, 14) : 0;
  if (zoom !== 1 || flip || tilt){
    const ox = zoom !== 1 ? rr(r, 20 - 20 / zoom, 20 + 20 / zoom) : 20, oy = zoom !== 1 ? rr(r, 20 - 20 / zoom, 20 + 20 / zoom) : 20;
    const cx = clampN(ox, 20 / zoom, 40 - 20 / zoom), cy = clampN(oy, 20 / zoom, 40 - 20 / zoom);
    body = `<g transform="translate(20 20) rotate(${tilt.toFixed(1)}) scale(${flip ? -zoom : zoom} ${zoom}) translate(${-cx} ${-cy})">${body}</g>`;
  }
  if (f) body = `<defs><filter id="f${id}">${f}</filter></defs><g filter="url(#f${id})">${body}</g>`;
  if (r() < .16) body += avPick(r, AV_EXTRAS)(r);
  if (ring) body += `<circle cx="20" cy="20" r="18.6" fill="none" stroke="#fff" stroke-width="1.4" opacity=".85"/>`;
  s = `<svg viewBox="0 0 40 40" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
  if (AV_CACHE.size > 6000) AV_CACHE.clear();
  AV_CACHE.set(i, s); return s;
}
// replaces the initials circle everywhere a player is shown; players without a picture keep it
avatar = function(b, cls){
  const i = b && b.i != null ? b.i : null, pic = i != null ? avatarSvg(i, b) : '';
  return pic ? `<span class="av pic ${cls || ''}" aria-hidden="true">${pic}</span>`
    : `<span class="av ${cls || ''}" style="--h:${b.hue}" aria-hidden="true">${esc(b.ini)}</span>`;
};
