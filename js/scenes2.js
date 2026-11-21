/* ---------- clearer rooms for Feed pictures ----------
   Every indoor picture is built the same way so it reads at a glance: a light wall with a baseboard, a darker floor
   going back in perspective, furniture standing on the floor, and in front the desk (or table, counter, bed, couch)
   with a visible top, front edge and legs, its own material, and a shadow under it. The three always differ in
   brightness, whatever the lighting. */
const SC2_FLOOR = {stairwell: 'concrete', basement: 'carpet', kitchen: 'tile', parents: 'tile', lab: 'tile', biolab: 'tile', hospital: 'tile', laundromat: 'tile', diner: 'checker', bathtub: 'tile', classroom: 'tile',
  lecture: 'carpet', library: 'carpet', library2: 'carpet', stacks: 'carpet', carrel: 'carpet', complab: 'carpet', office: 'carpet', studyroom: 'carpet', dining: 'tile',
  makerspace: 'concrete', artstudio: 'concrete', gym: 'rubber', arcade: 'carpetdark', music: 'wood', cafe: 'wood', bookstore: 'wood', tent: 'tent'};
// lightness of an hsl() or #hex color, 0..100
function sc2L(col){
  const m = /hsl\(\s*[\d.]+\s+([\d.]+)%\s+([\d.]+)%/.exec(col); if (m) return +m[2];
  const h = col.replace('#', ''); if (h.length < 6) return 50;
  const [r, g, b] = [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16) / 255); return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 * 100;
}
// the room's colors: wall light, floor darker, desk standing out from the floor
function sc2Colors(S, c, r){
  const set = SC.SETTING[S.set], hue = S.hue || 0, rr = mulberry32((S.seed ^ 0x2f1) >>> 0);
  const wall = {paint: scH(hue + 15, 28, 83), brick: '#b4694f', wood: '#a9774c', tile: '#e4e8e3', concrete: '#c4c6c8', glass: '#cfe3e8', stone: '#b7ae9e', tent: '#e39a4a'}[set.wall] || scH(hue + 15, 28, 83);
  const fk = SC2_FLOOR[S.set] || 'wood';
  let floor = {wood: scPick(rr, ['#8a5a36', '#9b6a42', '#7a4f31', '#a5764d']), tile: scPick(rr, ['#6f7e88', '#7d766c', '#5f7380', '#7a6a5e']), checker: '#d9d4c8', carpet: scPick(rr, [scH(hue + 200, 26, 36), scH(hue + 160, 22, 38), '#4f5866', '#634f42', scH(hue + 330, 24, 36)]),
    carpetdark: '#2c2540', concrete: '#74777b', rubber: '#3d4148', tent: '#7d6a4a'}[fk];
  // the floor always sits well below the wall in brightness
  const gap = sc2L(wall) - sc2L(floor); if (gap < 32 && fk !== 'checker') floor = sc2Shade(floor, Math.min(.6, (32 - gap) / 60 + .1));
  // the desk: light wood or white when the floor is dark, dark wood or black when the floor is light
  const fl = sc2L(floor), desk = fl < 50 ? scPick(rr, ['#e9e3d6', '#d9b98a', '#f1efea', '#cfa979']) : scPick(rr, ['#5a3a24', '#3b3b40', '#6b4429']);
  const cab = scPick(rr, ['#5f7a8a', '#e8e3d8', '#7a8f6a', '#2f3a48', '#b8c4cf']);
  return {cab, wall, floor, fk, desk, trim: sc2L(wall) > 60 ? '#f6f3ec' : '#e8dfcf', base: sc2L(wall) > 60 ? scH(hue + 15, 12, 62) : '#5d3b25'};
}
const sc2Shade = (col, k) => `color-mix(in srgb, ${col} ${Math.round((1 - k) * 100)}%, #000)`;
const sc2Tint = (col, k) => `color-mix(in srgb, ${col} ${Math.round((1 - k) * 100)}%, #fff)`;
function sc2Floor(K, FY){
  let g = rc(-5, FY, 310, 305 - FY, K.floor, 0);
  const vx = 150, line = (x0, op) => ln(vx + (x0 - vx) * .28, FY, x0, 300, '#000', 1.4, ` opacity="${op}"`);
  const fx = (x0, y) => vx + (x0 - vx) * ((y - FY) / (300 - FY) * .72 + .28);           // where a floor line starting at x0 (at the bottom) is at height y
  const rows = n => Array.from({length: n}, (_, k) => FY + (300 - FY) * Math.pow((k + 1) / n, 1.5));
  if (K.fk === 'wood'){
    for (let x = -200; x <= 500; x += 46) g += line(x, .24);
    // plank ends, staggered, and a little grain
    const ys = [FY, ...rows(7)];
    // a plank's end is a short line straight across that one plank (between its two edges), at staggered depths
    for (let k = 0; k < ys.length - 1; k++) for (let x = -200; x < 500; x += 46){ const j = Math.round((x + 200) / 46); if ((j + k) % 3) continue; const y = ys[k] + (ys[k + 1] - ys[k]) * (((j * 37) % 10) / 10); g += ln(fx(x, y), y, fx(x + 46, y), y, '#000', 1.2, ' opacity=".2"'); }
    for (let k = 0; k < 26; k++){ const y = FY + 8 + ((k * 41) % (290 - FY)), x0 = -200 + ((k * 97) % 700); g += ln(fx(x0, y), y, fx(x0 + 18, y), y, '#fff', 1, ' opacity=".09"'); }
  }
  if (K.fk === 'concrete'){ for (let k = 0; k < 90; k++){ const x = (k * 67) % 300, y = FY + 4 + ((k * 29) % (296 - FY)); g += ci(x, y, k % 3 ? .9 : 1.5, k % 2 ? '#000' : '#fff', ` opacity="${k % 2 ? .12 : .1}"`); }
    g += pa(`M30 300 L${vx - 40} ${FY + 30} M${vx - 40} ${FY + 30} l18 -6`, 'none', ' stroke="#000" stroke-width="1.2" opacity=".18"') + rows(3).map(y => ln(0, y, 300, y, '#000', 1.2, ' opacity=".12"')).join(''); }
  if (K.fk === 'tent') for (let x = -100; x <= 400; x += 30) g += line(x, .12);
  if (K.fk === 'tile' || K.fk === 'checker' || K.fk === 'rubber'){
    for (let x = -260; x <= 560; x += 70) g += line(x, K.fk === 'checker' ? .15 : .16);
    for (let k = 1; k < 6; k++){ const y = FY + (300 - FY) * Math.pow(k / 6, 1.5); g += ln(0, y, 300, y, '#000', 1.2, ' opacity=".14"'); }
    if (K.fk === 'checker') for (let k = 0; k < 6; k++) for (let j = -10; j < 16; j++) if (((k + j) % 2 + 2) % 2){ const y0 = FY + (300 - FY) * Math.pow(k / 6, 1.5), y1 = FY + (300 - FY) * Math.pow((k + 1) / 6, 1.5), f = y => (y - FY) / (300 - FY) * .72 + .28;
      const xa = x => vx + (x - vx) * f(y0), xb = x => vx + (x - vx) * f(y1), X0 = -260 + j * 70 * 1, X1 = X0 + 70; g += pa(`M${xa(X0)} ${y0} L${xa(X1)} ${y0} L${xb(X1)} ${y1} L${xb(X0)} ${y1}z`, '#2c2c2e', ' opacity=".85"'); }
  }
  if (K.fk === 'carpet' || K.fk === 'carpetdark'){
    // a woven pattern that shrinks with distance
    rows(9).forEach((y, k) => { const n = 10 + k * 3, h = 2 + k * .6; for (let j = 0; j <= n; j++){ const x = (j + (k % 2) * .5) * 300 / n; g += pa(`M${(x - 4).toFixed(1)} ${y.toFixed(1)} l4 ${-h.toFixed(1)} l4 ${h.toFixed(1)}`, 'none', ` stroke="${K.fk === 'carpetdark' ? '#8a6ad0' : '#fff'}" stroke-width="1" opacity="${K.fk === 'carpetdark' ? .25 : .13}"`); } });
    for (let k = 0; k < 70; k++){ const x = (k * 53) % 300, y = FY + 6 + ((k * 37) % (294 - FY)); g += ci(x, y, 1.1, '#000', ' opacity=".12"'); }
  }
  if (K.fk === 'rubber') for (let k = 0; k < 80; k++){ const x = (k * 71) % 300, y = FY + 4 + ((k * 23) % (296 - FY)); g += ci(x, y, 1, ['#e57373', '#64b5f6', '#fff'][k % 3], ' opacity=".35"'); }
  if (K.fk === 'concrete') g += pa(`M40 300 L${vx - 30} ${FY + 20}`, 'none', ' stroke="#000" stroke-width="1" opacity=".12"');
  // light falls off toward the back wall
  g += rc(-5, FY, 310, 26, '#000', 0, ' opacity=".12"');
  return g;
}
// furniture in front, standing on the floor: returns {g, top} where top is the y props sit on
function sc2Furniture(kind, K, c, S, r){
  const D = K.desk, top = 222;
  const shadow = (y, w = 150) => `<ellipse cx="150" cy="${y}" rx="${w}" ry="10" fill="#000" opacity=".22"/>`;
  switch (kind){
    case 'desk': case 'table': case 'bench': {
      const t0 = kind === 'bench' ? 238 : 210, t1 = t0 + (kind === 'bench' ? 10 : 22), ap = t1 + (kind === 'bench' ? 8 : 12), legW = kind === 'table' ? 14 : 11;
      let g = shadow(296);
      g += rc(22, ap, legW, 305 - ap, sc2Shade(D, .35), 0) + rc(266 - legW, ap, legW, 305 - ap, sc2Shade(D, .35), 0);          // front legs
      g += rc(-10, t0, 320, t1 - t0, sc2Tint(D, .06), 0) + ln(-10, t0 + .5, 310, t0 + .5, '#fff', 1.5, ' opacity=".35"');      // top
      g += rc(-10, t1, 320, ap - t1, sc2Shade(D, .22), 0) + ln(-10, ap, 310, ap, '#000', 1.5, ' opacity=".25"');                 // front edge
      if (kind === 'desk') g += rc(206, ap, 60, 34, sc2Shade(D, .14), 0) + rc(228, ap + 14, 16, 3, sc2Shade(D, .5), 1);              // a drawer
      return {g: `<g class="ol">${g}</g>`, top: kind === 'bench' ? t0 + 5 : t0 + 12};
    }
    case 'counter': {
      const st = '#e9e6e0', cab = K.cab;
      let g = rc(-10, 220, 320, 85, cab, 0) + [0, 1, 2, 3].map(k => rc(4 + k * 76, 236, 68, 60, 'none', 3, ` stroke="${sc2Shade(cab, .25)}" stroke-width="2"`) + rc(34 + k * 76, 246, 8, 3, '#aaa', 1)).join('');
      g += rc(-10, 206, 320, 14, st, 0) + rc(-10, 218, 320, 3, '#000', 0, ' opacity=".18"');
      return {g: `<g class="ol">${g}</g>`, top: 214};
    }
    case 'lab': {
      let g = rc(-10, 226, 320, 80, '#c9ced3', 0) + [0, 1, 2, 3].map(k => rc(6 + k * 76, 236, 66, 28, 'none', 2, ' stroke="#9aa1a8" stroke-width="2"') + rc(32 + k * 76, 248, 14, 3, '#7d848b', 1) + rc(6 + k * 76, 270, 66, 30, 'none', 2, ' stroke="#9aa1a8" stroke-width="2"')).join('');
      g += rc(-10, 208, 320, 18, '#26292e', 0) + ln(-10, 209, 310, 209, '#fff', 1, ' opacity=".2"');
      return {g: `<g class="ol">${g}</g>`, top: 216};
    }
    case 'bed': {
      const sheet = c.a2;
      let g = shadow(298, 160) + rc(-10, 232, 320, 74, sc2Shade(sheet, .3), 0);                                                   // bed base
      g += pa(`M-10 214 Q60 202 150 210 T310 212 V256 Q150 266 -10 256z`, sheet) + pa(`M-10 236 Q150 248 310 236`, 'none', ' stroke="#fff" stroke-width="2" opacity=".3"');
      g += rc(10, 194, 70, 26, '#f4f1ea', 12) + pa('M20 208 q25 -8 50 0', 'none', ' stroke="#ddd" stroke-width="1.5"');            // pillow
      return {g: `<g class="ol">${g}</g>`, top: 226};
    }
    case 'couch': {
      const cc = c.couch;
      let g = shadow(296, 160) + rc(-10, 176, 320, 50, sc2Shade(cc, .08), 14);                                                    // back
      g += rc(-10, 220, 320, 46, cc, 10) + ln(150, 222, 150, 262, '#000', 1.5, ' opacity=".2"') + rc(-10, 262, 320, 22, sc2Shade(cc, .3), 4);   // seat
      g += rc(-14, 190, 34, 92, sc2Shade(cc, .15), 12) + rc(280, 190, 34, 92, sc2Shade(cc, .15), 12);                             // arms
      g += rc(26, 282, 8, 18, '#3b2a1e', 1) + rc(266, 282, 8, 18, '#3b2a1e', 1);
      return {g: `<g class="ol">${g}</g>`, top: 236};
    }
    case 'floor': {
      const rug = scPick(r, [c.a3, c.a1, '#d9c3a0', '#9fb8c9']);
      const g = `<ellipse cx="150" cy="262" rx="150" ry="34" fill="${rug}"/><ellipse cx="150" cy="262" rx="136" ry="28" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/>`;
      return {g, top: 262};
    }
    case 'cafetable': {
      const top = '#ece9e3';
      let g = `<ellipse cx="150" cy="296" rx="70" ry="8" fill="#000" opacity=".22"/>` + rc(142, 236, 16, 58, '#2f3236', 2) + `<ellipse cx="150" cy="294" rx="44" ry="7" fill="#2f3236"/>`;
      g += rc(6, 212, 288, 20, top, 12) + rc(6, 226, 288, 8, sc2Shade(top, .2), 4) + pa('M40 218 q30 4 60 -2 M180 224 q30 -6 70 0', 'none', ' stroke="#c9c4ba" stroke-width="1"');
      return {g: `<g class="ol">${g}</g>`, top: 220};
    }
    case 'flipdesk': {
      // the fold-down desk on the back of the seat in front
      let g = rc(-10, 236, 320, 70, '#7b3f3a', 6) + rc(-10, 244, 320, 6, '#5e2f2b', 0) + rc(-10, 212, 320, 14, '#d9c29a', 3) + rc(-10, 224, 320, 6, '#b89a6a', 2);
      return {g: `<g class="ol">${g}</g>`, top: 220};
    }
    case 'workbench': case 'worktable': {
      const top = kind === 'workbench' ? '#c49a62' : '#e9e3d6';
      let g = shadow(296) + rc(18, 240, 16, 64, '#5d3b25', 0) + rc(266, 240, 16, 64, '#5d3b25', 0) + rc(18, 272, 264, 6, '#6b4429', 0);
      g += rc(-10, 208, 320, 22, top, 0) + rc(-10, 228, 320, 14, sc2Shade(top, .3), 0) + ln(-10, 209, 310, 209, '#fff', 1.5, ' opacity=".35"');
      if (kind === 'worktable') g += [...Array(10)].map((_, k) => ci(10 + k * 31, 214 + (k * 7) % 12, 2 + k % 3, ['#e57373', '#64b5f6', '#ffd54f', '#81c784'][k % 4], ' opacity=".8" stroke="none"')).join('');
      return {g: `<g class="ol">${g}</g>`, top: 220};
    }
    case 'step': {
      // you're sitting on a concrete step: your things are on the step below
      let g = rc(-10, 214, 320, 26, '#b6b9bd', 0) + rc(-10, 214, 320, 4, '#8a8d91', 0) + rc(-10, 240, 320, 66, '#a9acb0', 0) + rc(-10, 240, 320, 4, '#8a8d91', 0) + rc(-10, 214, 320, 3, '#e0a630', 0);
      return {g: `<g class="ol">${g}</g>`, top: 230};
    }
    case 'sleepingbag': {
      let g = rc(-10, 220, 320, 90, '#2f6fa0', 18) + pa('M-10 240 q160 -12 320 0', 'none', ' stroke="#245a85" stroke-width="2"') + rc(230, 226, 80, 40, '#e9e6df', 14) + rc(-10, 286, 320, 4, '#e0a630', 2);
      return {g: `<g class="ol">${g}</g>`, top: 246};
    }
    case 'tubtray': {
      // the rim of the tub with a wooden tray across it
      // the tub: its far rim against the wall, the water inside, the thick near rim and side, a wooden tray across
      let g = pa('M34 166 L266 166 L318 240 L-18 240z', '#fbfbf9') + pa('M48 174 L252 174 L296 234 L4 234z', '#d9e2e4') + pa('M58 186 L242 186 L290 234 L10 234z', '#a9d4ea') +
        pa('M70 196 q40 -5 80 0 M120 214 q60 -6 120 0 M30 226 q50 -5 100 0', 'none', ' stroke="#fff" stroke-width="1.6" opacity=".7"') +
        rc(-18, 234, 336, 16, '#fbfbf9', 8) + rc(-18, 248, 336, 62, '#ecefef', 0) + ln(-18, 250, 318, 250, '#d6dadb', 2);
      g += pa('M-10 212 L310 212 L310 230 L-10 230z', '#b8875a') + rc(-10, 228, 320, 6, '#8a5a33', 0) + [60, 150, 240].map(x => ln(x, 213, x, 229, '#8a5a33', 1)).join('');
      return {g: `<g class="ol">${g}</g>`, top: 222};
    }
    case 'pew': {
      // the back of the pew in front, with its little book shelf
      let g = rc(-10, 222, 320, 84, '#6b4429', 4) + rc(-10, 222, 320, 6, '#8a5a33', 2) + rc(-10, 206, 320, 18, '#5d3b25', 2) + rc(20, 240, 70, 26, '#7a2e3a', 2) + rc(210, 240, 70, 26, '#7a2e3a', 2);
      return {g: `<g class="ol">${g}</g>`, top: 214};
    }
    case 'bleachers': {
      // aluminum bleachers: your things are on the bench beside you
      let g = rc(-10, 214, 320, 14, '#c9ccd1', 2) + rc(-10, 228, 320, 22, '#7d838a', 0) + rc(-10, 250, 320, 60, '#9aa0a6', 0) + ln(-10, 266, 310, 266, '#7d838a', 2);
      return {g: `<g class="ol">${g}</g>`, top: 222};
    }
    case 'bedfoot': {
      // the near half of your own bed (the back of the picture draws the rest): blanket folds, props lie on it
      const g = pa('M-10 250 Q80 236 160 252 T310 246', 'none', ' stroke="#000" stroke-width="2" opacity=".12"') + pa('M40 290 Q120 270 210 292', 'none', ' stroke="#fff" stroke-width="2" opacity=".22"');
      return {g, top: 244};
    }
    case 'floorbare': {
      return {g: '', top: 262};
    }
    case 'carrel': {
      // the carrel's desktop, right up against its back panel
      let g = rc(-10, 206, 320, 24, '#c49a62', 0) + rc(-10, 228, 320, 12, '#8a6a4a', 0) + rc(-10, 240, 320, 70, '#3b2a1e', 0) + ln(-10, 207, 310, 207, '#fff', 1.5, ' opacity=".3"');
      return {g: `<g class="ol">${g}</g>`, top: 220};
    }
    case 'seatrow': {
      // you're in a row of waiting-room chairs: your things are on the seat next to you
      let g = rc(-10, 196, 140, 44, '#3f6fa0', 10) + rc(-10, 236, 140, 18, '#2f5a85', 4) + rc(150, 196, 170, 44, '#3f6fa0', 10) + rc(150, 236, 170, 18, '#2f5a85', 4) + rc(-10, 254, 320, 6, '#9aa0a6', 1) + rc(60, 260, 8, 40, '#9aa0a6', 0) + rc(230, 260, 8, 40, '#9aa0a6', 0);
      return {g: `<g class="ol">${g}</g>`, top: 246};
    }
    case 'longtable': {
      let g = shadow(298, 160) + rc(-10, 210, 320, 18, '#d8b98a', 0) + rc(-10, 226, 320, 10, '#b8956a', 0) + rc(10, 236, 12, 70, '#8a6a4a', 0) + rc(278, 236, 12, 70, '#8a6a4a', 0) + rc(60, 211, 180, 14, '#e57373', 3, ' opacity=".9"');
      return {g: `<g class="ol">${g}</g>`, top: 220};
    }
    case 'booth': {
      let g = rc(-30, 120, 60, 190, '#a83232', 14) + rc(270, 120, 60, 190, '#a83232', 14) + rc(-30, 120, 60, 10, '#8a2626', 6) + rc(270, 120, 60, 10, '#8a2626', 6);     // booth seat backs either side
      g += rc(140, 240, 20, 65, '#8a8f96', 0) + rc(-10, 214, 320, 16, '#e6e2d6', 0) + rc(-10, 228, 320, 6, '#9aa0a6', 0);                 // table on a post
      return {g: `<g class="ol">${g}</g>`, top: 222};
    }
    case 'piano': {
      let g = rc(-10, 196, 320, 110, '#1b1b1b', 0) + rc(-10, 228, 320, 28, '#fafafa', 0) + [...Array(23)].map((_, k) => ln(k * 14, 228, k * 14, 256, '#999', 1)).join('') + [...Array(23)].map((_, k) => k % 7 === 2 || k % 7 === 6 ? '' : rc(k * 14 + 9, 228, 8, 16, '#1b1b1b', 1)).join('');
      g += rc(-10, 196, 320, 8, '#333', 0);
      return {g: `<g class="ol">${g}</g>`, top: 210};
    }
    default: return {g: scSurface(kind, c, 214), top: 226};
  }
}
function sc2Window(set, L, id, r, wx, wy, ww, wh, trim){
  let g = `<g>${scView(set.win, L, id, r, wx, wy, ww, wh)}${scFx(L, r, [wx, wy, ww, wh])}</g>`;
  g += rc(wx - 6, wy - 6, ww + 12, wh + 12, 'none', 3, ` stroke="${trim}" stroke-width="8"`) + ln(wx + ww / 2, wy, wx + ww / 2, wy + wh, trim, 5) + rc(wx - 12, wy + wh + 4, ww + 24, 7, trim, 2);   // frame, mullion, sill
  return g;
}
const SC2_OLDFRONT = scFront;
let SC2_BARE = false, SC2_LAYER = null;
// deep rooms show more floor (their floor line sits higher up the picture)
const SC2_FYO = {classroom: 114, union: 118};
// the thing in front, where the setting needs something other than its usual surface
const SC2_SURF = {kitchen: 'counter', parents: 'counter', cafe: 'cafetable', cafe2: 'cafetable', bookstore: 'cafetable'};
// rooms whose back wall is drawn as a whole (so everything on it lines up and makes sense for the place)
const SC2_BACK = {
  kitchen: (S, K, c, L, r, id, FY) => sc2Kitchen(S, K, c, L, r, id, FY),
  parents: (S, K, c, L, r, id, FY) => sc2Kitchen(S, K, c, L, r, id, FY),
  cafe: (S, K, c, L, r, id, FY) => sc2Cafe(S, K, c, L, r, id, FY),
  cafe2: (S, K, c, L, r, id, FY) => sc2Cafe(S, K, c, L, r, id, FY)
};
function sc2Kitchen(S, K, c, L, r, id, FY){
  const set = SC.SETTING[S.set], cab = K.cab, top = '#e9e6e0', ct = FY - 64;
  let g = '';
  // backsplash tiles between the counter and the upper cabinets
  for (let y = ct - 46; y < ct; y += 9) for (let x = (y % 18 ? 0 : -9); x < 300; x += 18) g += rc(x + .5, y + .5, 17, 8, '#f3f1ec', 1, ' stroke="#d6d1c6" stroke-width=".6"');
  g += sc2Window(set, L, id, r, 104, 22, 92, 62, K.trim);
  // upper cabinets either side of the window
  g += `<g class="ol">${rc(-4, 8, 92, 56, cab, 2)}${ln(42, 8, 42, 64, sc2Shade(cab, .25), 1.5)}${rc(34, 52, 5, 2.5, '#9aa0a6', 1)}${rc(45, 52, 5, 2.5, '#9aa0a6', 1)}
    ${rc(212, 8, 34, 56, cab, 2)}${rc(236, 52, 5, 2.5, '#9aa0a6', 1)}</g>`;
  // the counter run along the wall: cabinets, worktop, sink under the window, a stove
  g += `<g class="ol">${rc(-4, ct, 252, FY - ct, cab, 0)}${[0, 1, 2, 3].map(k => rc(2 + k * 50, ct + 14, 44, FY - ct - 22, 'none', 2, ` stroke="${sc2Shade(cab, .25)}" stroke-width="1.5"`) + rc(20 + k * 50, ct + 20, 8, 2.5, '#9aa0a6', 1)).join('')}
    ${rc(-4, ct - 6, 252, 7, top, 1)}
    <ellipse cx="150" cy="${ct - 3}" rx="26" ry="3" fill="#8a9096"/>${pa(`M150 ${ct - 4} v-16 q0 -6 8 -6 v4`, 'none', ' stroke="#b8bec4" stroke-width="3" stroke-linecap="round"')}
    ${rc(196, ct, 52, FY - ct, '#2f3236', 0)}${rc(202, ct + 16, 40, 30, '#1b1d20', 2)}${rc(206, ct + 8, 32, 3, '#9aa0a6', 1)}${[206, 218, 230].map(x => ci(x + 4, ct + 4, 1.6, '#c9ccd1')).join('')}
    ${rc(196, ct - 6, 52, 7, '#3a3d44', 1)}<ellipse cx="210" cy="${ct - 3}" rx="9" ry="2" fill="#1b1d20"/><ellipse cx="234" cy="${ct - 3}" rx="9" ry="2" fill="#1b1d20"/>
    ${pa(`M172 ${ct - 6} h18 v-14 q-9 -6 -18 0z`, c.a1)}</g>`;
  // the fridge
  g += `<g class="ol">${rc(250, 22, 54, FY - 22, '#e9ecef', 4)}${ln(250, 84, 304, 84, '#b9bec4', 1.5)}${rc(256, 52, 3, 24, '#9aa0a6', 1.5)}${rc(256, 92, 3, 30, '#9aa0a6', 1.5)}${rc(266, 98, 14, 12, c.a3, 1, ' transform="rotate(-6 273 104)"')}${rc(284, 30, 10, 14, '#f9e27a', 1)}</g>`;
  return g;
}
function sc2Cafe(S, K, c, L, r, id, FY){
  const set = SC.SETTING[S.set], ct = FY - 58, wood = '#5d3b25';
  let g = sc2Window(set, L, id, r, 168, 18, 116, 74, K.trim);
  // chalkboard menu
  g += `<g class="ol">${rc(12, 14, 124, 70, '#24302a', 3)}${rc(12, 14, 124, 70, 'none', 3, ' stroke="#6b4429" stroke-width="5"')}</g>${tx(74, 30, 'MENU', 9, '#f6f2e8')}` +
    [['latte', '4.5'], ['cold brew', '4'], ['matcha', '5'], ['croissant', '3.5']].map(([n, p], k) => tx(44, 45 + k * 10, n, 6, '#e8e3d6') + tx(112, 45 + k * 10, p, 6, '#f2d27a')).join('');
  // pendant lights
  g += [60, 226].map(x => ln(x, 0, x, 6, '#2c2c2a', 1.4)).join('') ;
  // the counter: espresso machine, cups, a pastry case, the register
  g += `<g class="ol">${rc(-4, ct, 308, FY - ct, wood, 0)}${[0, 1, 2, 3, 4, 5].map(k => ln(k * 52, ct + 8, k * 52, FY - 2, '#000', 1.2)).join('').replace(/stroke="#000"/g, 'stroke="#000" opacity=".2"')}
    ${rc(-4, ct - 6, 308, 7, '#2f2a26', 1)}
    ${rc(18, ct - 40, 62, 34, '#c9ccd1', 4)}${rc(18, ct - 40, 62, 8, '#9aa0a6', 3)}${rc(30, ct - 22, 8, 8, '#2f3236', 1)}${rc(58, ct - 22, 8, 8, '#2f3236', 1)}${rc(28, ct - 12, 12, 6, '#f6f2ea', 1)}${rc(56, ct - 12, 12, 6, '#f6f2ea', 1)}${ci(49, ct - 30, 4, '#2f3236')}
    ${[88, 96, 104].map((x, k) => rc(x, ct - 12 - k * 5, 9, 6 + k * 5, '#f6f2ea', 1)).join('')}
    ${rc(150, ct - 34, 88, 28, '#dfeef3', 3, ' fill-opacity=".85"')}${[[160, '#d9a35f'], [176, '#c58a4a'], [192, '#f4a3c4'], [208, '#d9a35f'], [224, '#c58a4a']].map(([x, f]) => `<ellipse cx="${x}" cy="${ct - 12}" rx="6" ry="3.5" fill="${f}"/>`).join('')}${ln(150, ct - 20, 238, ct - 20, '#9aa0a6', 1)}
    ${rc(256, ct - 24, 30, 18, '#2f3236', 2)}${rc(260, ct - 21, 22, 8, '#7fb3d5', 1)}</g>`;
  return g;
}
// ---- laying out a room's wall and furniture so nothing overlaps the window ----
// things that hang on the wall vs. things that stand on the floor; wide wall things push the window to the right
const SC2_WALL = new Set(['poster', 'shelf', 'clock', 'frame', 'whiteboard', 'chalkboard', 'menu', 'pegboard', 'monitors', 'labshelf', 'board', 'banners', 'projector', 'neonSign', 'cabinets']);
const SC2_WIDEWALL = new Set(['whiteboard', 'chalkboard', 'menu', 'pegboard', 'board', 'projector', 'monitors', 'banners']);
const SC2_SKIP = new Set(['hanging', 'lampGreen', 'microscope', 'beams', 'stringPorch', 'seats', 'counterCafe', 'rail', 'railing']);
function sc2WinBox(set){ return set.dec.some(d => SC2_WIDEWALL.has(d)) ? [196, 24, 92, 84] : [104, 24, 92, 84]; }
const SC2_DB = {};
function sc2DecBox(d, c, FY, L, cls){
  const k = d + ':' + FY; if (SC2_DB[k]) return SC2_DB[k];
  let b = null;
  try { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('style', 'position:absolute;left:-9999px;width:10px;height:10px'); svg.innerHTML = `<g>${SC.DEC[d](c, 0, FY, L, cls || 'x')}</g>`; document.body.appendChild(svg);
    const r = svg.firstChild.getBBox(); svg.remove(); if (r.width) b = {x: r.x, y: r.y, w: r.width, h: r.height}; } catch(e){}
  return (SC2_DB[k] = b);
}
function sc2Layout(set, S, c, L, FY){
  const win = set.win !== 'none', wide = set.dec.some(d => SC2_WIDEWALL.has(d)), W = win ? sc2WinBox(set) : null;
  // free stretches of wall: either side of the window (or the whole wall)
  const slots = !win ? [[6, 146], [154, 294]] : wide ? [[6, 186], [6, 186]] : [[6, 96], [204, 294]];
  let g = '', used = 0;
  set.dec.filter(d => SC.DEC[d] && !SC2_SKIP.has(d)).forEach(d => {
    const b = sc2DecBox(d, c, FY, L, S.cls); if (!b) return;
    const onWall = SC2_WALL.has(d), [x0, x1] = onWall && SC2_WIDEWALL.has(d) ? slots[0] : slots[used++ % 2];
    // floor things can be wider than the gap beside the window if they sit below it
    const maxW = onWall ? x1 - x0 : Math.max(x1 - x0, win && b.h < FY - (W[1] + W[3] + 12) ? 150 : x1 - x0);
    const sc = Math.min(1, maxW / b.w, (onWall ? FY - 18 : FY - 4) / b.h);
    const left = onWall || maxW === x1 - x0 ? (x0 + x1) / 2 - b.w * sc / 2 : (x0 < 150 ? x0 : x1 - b.w * sc);
    const top = onWall ? Math.max(6, Math.min(b.y, FY - 18 - b.h * sc)) : FY - b.h * sc;
    g += `<g class="ol" transform="translate(${(left - b.x * sc).toFixed(1)} ${(top - b.y * sc).toFixed(1)}) scale(${sc.toFixed(3)})">${SC.DEC[d](c, 0, FY, L, S.cls)}</g>`;
  });
  if (set.dec.includes('hanging')) g += `<g class="ol">${SC.DEC.hanging(c, 0, FY)}</g>`;
  return g;
}
// the close-up: everything behind the desk drawn soft, the desk and what's on it sharp
function sc2Layer(layer, S, c, L, r, id){ SC2_LAYER = layer; try { return scFront(S, c, L, r, id); } finally { SC2_LAYER = null; } }
function sc2Wall(K, set, x0, x1, FY){
  let g = rc(x0, 0, x1 - x0, FY, K.wall, 0) + rc(x0, 0, x1 - x0, FY, '#000', 0, ' opacity=".05"');
  if (set.wall === 'brick') for (let y = 0; y < FY - 8; y += 14) for (let x = x0 + ((y / 14) % 2 ? -14 : 0); x < x1; x += 28) g += rc(x + 1, y + 1, 26, 12, '#c47a60', 1, ' opacity=".5"');
  if (set.wall === 'wood') for (let x = x0; x < x1; x += 30) g += ln(x, 0, x, FY, '#000', 1, ' opacity=".14"');
  if (set.wall === 'tile') for (let y = 0; y < FY; y += 22) g += ln(x0, y, x1, y, '#000', 1, ' opacity=".06"');
  return g + rc(x0, FY - 9, x1 - x0, 9, K.base, 0) + ln(x0, FY - 9, x1, FY - 9, '#fff', 1, ' opacity=".35"');
}
// straight-on: wall, window, furniture against the wall, floor, then the desk or table in front with things on it
scFront = function(S, c, L, r, id, withProps = true){
  const set = SC.SETTING[S.set];
  if (set.k !== 'in') return SC2_OLDFRONT(S, c, L, r, id, withProps);
  const FY = SC2_FYO[S.set] || 184, K = sc2Colors(S, c, r), bare = SC2_BARE;     // bare: the wide shot draws the walls and floor itself
  // walls and floor first; everything else stands on them
  let g = bare ? '' : sc2Wall(K, set, 0, 300, FY) + sc2Floor(K, FY);
  const back = SC2_BACK[S.set];
  if (back) g += back(S, K, c, L, r, id, FY);
  else if (set.win !== 'none'){ const W = sc2WinBox(set); g += sc2Window(set, L, id, r, W[0], W[1], W[2], W[3], K.trim); }
  // furniture against the back wall, standing on the floor
  if (!back) g += sc2Layout(set, S, c, L, FY);
  if (S.season && !back) g += `<g class="ol" transform="translate(236 ${FY - 2}) scale(1.05)">${SC.SDEC[S.season](c)}</g>`;
  const F = sc2Furniture(SC2_SURF[S.set] || set.surf, K, c, S, r);
  if (SC2_LAYER === 'back') return g;
  if (SC2_LAYER === 'front') g = '';
  g += F.g;
  if (withProps){
    g += scPropsFront(S.props, c, r, F.top, 1.55, S.angle === 'shoulder' ? 152 : 14, 290).replace(/translate\(([\d.]+) ([\d.]+)\)/g, (m, x) => `translate(${x} ${F.top})`);
    if (S.cls && !back && !['whiteboard', 'chalkboard'].some(d => set.dec.includes(d))) g += scSticky(S.cls, 214 + scR(r, -6, 22), FY - 74, scR(r, -6, 6), 46);   // a sticky note on the wall
  }
  return g;
};

// how big a thing's from-above drawing really is (measured once in a hidden svg); rotation room included
const SC2_TB = {};
function sc2TopBox(k, c){
  if (SC2_TB[k]) return SC2_TB[k];
  let b = {x: 0, y: 0, w: 30, h: 30};
  try { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('style', 'position:absolute;left:-9999px;width:10px;height:10px'); svg.innerHTML = `<g>${SC.PROP[k].top(c)}</g>`; document.body.appendChild(svg);
    const r = svg.firstChild.getBBox(); svg.remove(); if (r.width) b = {x: r.x - 3, y: r.y - 3, w: r.width + 6, h: r.height + 6}; } catch(e){}
  return (SC2_TB[k] = b);
}
/* ---- from above: the desk from a standing person's view, with the floor around it and the chair pulled up ---- */
const SC2_OLDTOP = scTop;
scTop = function(S, c, L, r, id){
  const set = SC.SETTING[S.set];
  if (SC2_OUT[S.set]) return sc2TopOut(S, c, L, r, id);
  const surf = SC2_SURF[S.set] || set.surf;
  if (!['desk', 'table', 'bench', 'counter', 'lab', 'booth', 'cafetable'].includes(surf)) return SC2_OLDTOP(S, c, L, r, id);
  const K = sc2Colors(S, c, r), top = surf === 'counter' ? '#e9e6e0' : surf === 'cafetable' ? '#ece9e3' : surf === 'lab' ? '#2b2e33' : surf === 'booth' ? '#e6e2d6' : K.desk;
  let g = rc(0, 0, 300, 300, K.floor, 0);
  if (K.fk === 'wood') for (let y = 0; y < 300; y += 26) g += ln(0, y, 300, y, '#000', 1.2, ' opacity=".2"') + ln((y * 7) % 300, y, (y * 7) % 300, y + 26, '#000', 1.2, ' opacity=".2"');
  else if (K.fk === 'tile' || K.fk === 'checker') for (let k = 0; k < 300; k += 50) g += ln(k, 0, k, 300, '#000', 1.2, ' opacity=".18"') + ln(0, k, 300, k, '#000', 1.2, ' opacity=".18"');
  else for (let k = 0; k < 160; k++) g += ci((k * 53) % 300, (k * 37) % 300, 1.2, '#000', ' opacity=".12"');
  // the chair, pushed in at the front edge (a stool at a counter)
  if (surf !== 'counter') g += `<g class="ol">${rc(108, 246, 84, 62, '#2f3236', 16)}${rc(116, 252, 68, 48, '#3f434a', 12)}${pa('M104 300 q46 -26 92 0', 'none', ' stroke="#2f3236" stroke-width="12"')}</g>`;
  // the desk: shadow, top, front edge
  if (surf !== 'cafetable') g += rc(24, 20, 262, 226, '#000', 10, ' opacity=".25"');
  if (surf === 'cafetable') g += `<ellipse cx="152" cy="128" rx="140" ry="118" fill="#000" opacity=".22"/><g class="ol"><ellipse cx="150" cy="124" rx="140" ry="118" fill="${sc2Shade(top, .25)}"/><ellipse cx="150" cy="119" rx="140" ry="116" fill="${top}"/></g>`;
  else g += `<g class="ol">${rc(14, 8, 272, 222, top, 6)}${rc(14, 224, 272, 12, sc2Shade(top, .25), 3)}</g>`;
  if (sc2L(top) > 40 && !['counter', 'cafetable'].includes(surf)) for (let y = 22; y < 222; y += 18) g += pa(`M18 ${y} q70 ${scR(r, -4, 4).toFixed(1)} 135 0 t130 0`, 'none', ` stroke="${sc2Shade(top, .12)}" stroke-width="1.2"`);
  if (surf !== 'cafetable') g += rc(18, 12, 264, 6, '#fff', 3, ' opacity=".18"');
  // things on the desk: a bigger look from above (their top view, or their usual look when they don't have one)
  // six cells on the desk (three across, two deep); each thing is placed fully inside its cell
  const cells = [0, 1, 2, 3, 4, 5].sort(() => r() - .5), cw = 86, chh = 104;
  let k = 0;
  const slots = cells.map(i => [22 + (i % 3) * cw, 14 + Math.floor(i / 3) * chh]);
  for (const p of S.props){ const P = SC.PROP[p]; if (!P || k >= 5) continue; const [cx0, cy0] = slots[k++], rot = scR(r, -12, 12).toFixed(0);
    const bb = P.top ? sc2TopBox(p, c) : null, w = P.top ? bb.w * 1.9 : P.w * 1.6, h = P.top ? bb.h * 1.9 : (P.h || 20) * 1.6, sc = Math.min(1, (cw - 8) / w, (chh - 8) / h);
    const x = cx0 + (cw - w * sc) / 2 - (P.top ? bb.x * 1.9 : 0), y = cy0 + (chh - h * sc) / 2 - (P.top ? bb.y * 1.9 : 0);
    if (sc < 1){ g += `<g transform="translate(${x} ${y}) scale(${sc}) translate(${-x} ${-y})">`; }
    g += P.top ? `<ellipse cx="${x + bb.x * 1.9 + w / 2 + 3}" cy="${y + bb.y * 1.9 + h / 2 + 4}" rx="${w * .45}" ry="${h * .4}" fill="#000" opacity=".12"/>` : `<ellipse cx="${x + w / 2}" cy="${y + h}" rx="${w * .5}" ry="5" fill="#000" opacity=".2"/>`;
    g += P.top ? `<g class="ol" transform="translate(${x} ${y}) scale(1.9) rotate(${rot} ${bb.x + bb.w / 2} ${bb.y + bb.h / 2})">${P.top(c)}</g>` : `<g class="ol" transform="translate(${x} ${y + h}) scale(1.6)">${P.d(c)}</g>`;
    if (sc < 1) g += '</g>'; }
  if (S.cls && k < 6){ const [x, y] = slots[k]; g += scSticky(S.cls, x + 10, y + 18, scR(r, -12, 12), 62); }
  return g;
};

/* ---- a wide shot: the whole room, with the desk in the middle of it ---- */
const SC2_WIDE = {dorm: 'bed', dorm2: 'bed', apt: 'shelf', bed: 'shelf', floor: 'bed', library: 'shelf', library2: 'shelf', stacks: 'shelf', studyroom: 'plant', classroom: 'plant', livingroom: 'shelf', cafe: 'plant', cafe2: 'plant', kitchen: 'fridge', parents: 'fridge', office: 'shelf', bookstore: 'shelf'};
function sc2WideBody(S, c, L, r, id){ return sc2Wide(S, c, L, r, id, ''); }
function sc2Wide(S, c, L, r, id, light){
  // stepping back from your spot: the room behind is far away, so it hardly changes; your desk and things get smaller and sit lower,
  // and the chair you pulled back comes into view
  const set = SC.SETTING[S.set], back = sc2Layer('back', S, c, L, r, id), front = sc2Layer('front', S, c, L, r, id), s = .72;
  let g = back + `<g transform="translate(${150 - 150 * s} ${300 - 300 * s + 6}) scale(${s})">${front}</g>`;
  const surf = (SC2_OUT[S.set] ? '' : SC2_SURF[S.set] || set.surf);
  const noChair = !!SC2_OUT[S.set] || ['bed', 'bedfoot', 'floor', 'couch', 'counter', 'bleachers', 'pew', 'sleepingbag', 'floorbare', 'tubtray', 'step', 'booth', 'carrel', 'cafetable', 'seatrow'].includes(surf) || ['cafe', 'cafe2', 'kitchen', 'parents', 'bookstore'].includes(S.set);
  if (!noChair) g += `<g class="ol">${rc(116, 270, 68, 30, '#2f3236', 9)}${rc(146, 298, 8, 8, '#2f3236', 1)}</g>`;
  return g + light;
}

/* ---- a close-up: the things on the desk big and sharp, the room behind them soft ---- */
function sc2Close(S, c, L, r, id, light){
  const set = SC.SETTING[S.set], y0 = set.k === 'in' ? 120 : 140, inside = set.k === 'in' || !!SC2_OUT[S.set];
  const back = inside ? sc2Layer('back', S, c, L, r, id) : scFront(S, c, L, r, id), front = inside ? sc2Layer('front', S, c, L, r, id) : '';
  return `<defs><filter id="${id}bl" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>` +
    `<g transform="translate(-120 ${-y0 * 1.8 + 30}) scale(1.8)"><g filter="url(#${id}bl)">${back}</g>${front}</g>` + light;
}
{
  const _svg = sceneSvg;
  sceneSvg = function(S, uid){
    if (S.angle === 'door') S = {...S, angle: 'front'};
    if (S.angle !== 'wide' && S.angle !== 'close') return _svg.apply(this, arguments);
    // draw the usual way (for the sky, light and outline), then swap in the new body
    const id = 'sc' + (uid || S.seed).toString(36), r = mulberry32(S.seed ^ 0x51ab), L = SC.LIGHT[S.light], c = scPalette(S.hue, mulberry32(S.seed + 3));
    const amb = L.ao ? rc(0, 0, 300, 300, L.amb, 0, ` opacity="${L.ao}"`) : '';
    const body = S.angle === 'wide' ? sc2Wide(S, c, L, r, id, amb) : sc2Close(S, c, L, r, id, amb);
    return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" class="scene" role="img" aria-label="${esc(sceneDesc(S))}"><defs>${scSky(L, id).replace(/<\/?defs>/g, '')}</defs>${body}</svg>`;
  };
}

/* ---------- places, drawn as a whole ---------- */
// people in the background: simple figures that stand (or sit) on a line; back = seen from behind
const SC2_SKIN = ['#f6d7bd', '#f1c9a5', '#e8b48c', '#d79e74', '#c68863', '#a8714c', '#8d5a3b', '#6e4329', '#5c3a24'], SC2_HAIR = ['#2b1d14', '#1b1b1b', '#3b2416', '#5a3a22', '#7a4a26', '#a8743a', '#d9b25e', '#e8cf8a', '#7a2e1d', '#b5562c', '#9aa0a6', '#c46a8a', '#4a6ad0'];
// everyone looks different: skin, hair (short, buzz, long, ponytail, bun, curls, braids, a hijab), clothes (tee, hoodie, dress), glasses
function sc2Folk(x, fy, s, seed, o = {}){
  // every person is put together at random (but always the same for the same picture)
  const r = mulberry32(seed), pick = a => a[Math.floor(r() * a.length)];
  const skin = pick(SC2_SKIN), hair = r() < .08 ? pick(['#c46a8a', '#4a6ad0', '#7a5ad0', '#2e9a8a']) : pick(SC2_HAIR.slice(0, 11));
  const shirt = pick(['#3f6fa0', '#c0392b', '#2e7d5b', '#8e44ad', '#e0a630', '#34495e', '#d35400', '#16a085', '#7f8c8d', '#e57399', '#f4f1ea', '#1b1b1b', '#6d8f3e', '#b5562c', '#5fa8d3']), pants = pick(['#2c3e50', '#34495e', '#5d4037', '#1b1b1b', '#3d5a80', '#7a6a58', '#4a4a52', '#9aa6b5']);
  const style = pick(['short', 'short', 'buzz', 'long', 'long', 'pony', 'bun', 'curls', 'braids', 'hijab', 'bob', 'spiky']), top = pick(['tee', 'tee', 'hoodie', 'hoodie', 'dress', 'jacket']);
  const scarf = pick(['#2f3a48', '#7a2e3a', '#e8dcc8', '#2e7d5b', '#5fa8d3', '#c46a8a']);
  const face = {eyes: pick(['dot', 'dot', 'oval', 'happy']), brows: r() < .45, mouth: pick(['smile', 'smile', 'flat', 'o', 'grin']), blush: r() < .25, freckles: r() < .12, specs: r() < .22,
    beard: ['short', 'buzz', 'spiky'].includes(style) && r() < .2};
  const hy = fy - (o.sit ? 46 : 72) * s, R = 9 * s, f = v => v.toFixed(1), F = v => f(v * s);
  const hairAttr = `fill="${style === 'hijab' ? scarf : hair}"`;
  let behind = '', g = '';
  // ---- hair (or scarf) that hangs behind the body: one solid shape so nothing overlaps
  const drop = {long: 20, braids: 0, bob: 9, hijab: 22}[style];
  if (drop) behind += `<path d="M${f(x - R - 1.5 * s)} ${f(hy)} a${f(R + 1.5 * s)} ${f(R + 1.5 * s)} 0 0 1 ${f(2 * R + 3 * s)} 0 V${f(hy + drop * s)} q0 ${F(3)} ${F(-3)} ${F(3)} H${f(x - R + 1.5 * s)} q${F(-3)} 0 ${F(-3)} ${F(-3)}z" ${hairAttr}/>`;
  if (style === 'braids') behind += rc(x - R - 1 * s, hy, 4.5 * s, 22 * s, hair, 2 * s) + rc(x + R - 3.5 * s, hy, 4.5 * s, 22 * s, hair, 2 * s);
  if (style === 'curls'){ let cu = ''; for (let k = 0; k < 12; k++){ const a = k / 12 * Math.PI * 2; cu += `<circle cx="${f(x + Math.cos(a) * 10 * s)}" cy="${f(hy - 1 * s + Math.sin(a) * 10 * s)}" r="${F(4.2)}" fill="${hair}"/>`; } behind += cu + `<circle cx="${f(x)}" cy="${f(hy - 1 * s)}" r="${F(12)}" fill="${hair}" stroke="none"/>`; }
  if (style === 'pony' && o.back) behind += rc(x - 2.5 * s, hy + 2 * s, 5 * s, 16 * s, hair, 2.5 * s);
  if (style === 'bun') behind += ci(x, hy - R - 1 * s, 4.5 * s, hair);
  // ---- legs (or lap)
  if (!o.sit){ if (top === 'dress') g += rc(x - 6 * s, fy - 22 * s, 4.5 * s, 22 * s, skin, 2) + rc(x + 1.5 * s, fy - 22 * s, 4.5 * s, 22 * s, skin, 2); else g += rc(x - 7 * s, fy - 30 * s, 6 * s, 30 * s, pants, 2) + rc(x + 1 * s, fy - 30 * s, 6 * s, 30 * s, pants, 2); }
  else { const legs = o.legs || (o.back ? 0 : 22 * s), lc = top === 'dress' ? skin : pants; g += rc(x - 9 * s, fy - 22 * s, 18 * s, 10 * s, top === 'dress' ? shirt : pants, 3);
    if (legs) g += rc(x - 8 * s, fy - 14 * s, 6 * s, legs, lc, 2) + rc(x + 2 * s, fy - 14 * s, 6 * s, legs, lc, 2) + rc(x - 9 * s, fy - 14 * s + legs - 2 * s, 8 * s, 3 * s, '#2f3236', 1.5) + rc(x + 1 * s, fy - 14 * s + legs - 2 * s, 8 * s, 3 * s, '#2f3236', 1.5); }
  // ---- body and arms
  if (top === 'dress' && !o.sit) g += pa(`M${f(x - 10 * s)} ${f(hy + 10 * s)} h${F(20)} l${F(5)} ${F(41)} h${F(-30)}z`, shirt);
  else g += rc(x - 11 * s, hy + 10 * s, 22 * s, (o.sit ? 26 : 34) * s, shirt, 7 * s);
  if (top === 'jacket' && !o.back) g += ln(x, hy + 11 * s, x, hy + (o.sit ? 34 : 43) * s, sc2Shade(shirt, .4), 1.2 * s) + pa(`M${f(x - 5 * s)} ${f(hy + 10 * s)} l${F(5)} ${F(8)} l${F(5)} ${F(-8)}`, '#f4f1ea');
  if (top === 'hoodie') g += o.back ? pa(`M${f(x - 9 * s)} ${f(hy + 9 * s)} q0 ${F(13)} ${F(9)} ${F(13)} q${F(9)} 0 ${F(9)} ${F(-13)}z`, sc2Shade(shirt, .12)) : ln(x - 2 * s, hy + 12 * s, x - 2.5 * s, hy + 20 * s, '#eee', .8 * s) + ln(x + 2 * s, hy + 12 * s, x + 2.5 * s, hy + 20 * s, '#eee', .8 * s);
  const sleeve = d => pa(d, 'none', ` stroke="${shirt}" stroke-width="${F(5.5)}" stroke-linecap="round" stroke-linejoin="round"`);
  if (o.sit) g += sleeve(`M${f(x - 12 * s)} ${f(hy + 13 * s)} l${F(-3)} ${F(16)} l${F(7)} ${F(6)}`) + sleeve(`M${f(x + 12 * s)} ${f(hy + 13 * s)} l${F(3)} ${F(16)} l${F(-7)} ${F(6)}`) + (o.back ? '' : ci(x - 7 * s, hy + 35 * s, 2.6 * s, skin) + ci(x + 7 * s, hy + 35 * s, 2.6 * s, skin));
  else g += rc(x - 16 * s, hy + 12 * s, 6 * s, 22 * s, shirt, 3 * s) + rc(x + 10 * s, hy + 12 * s, 6 * s, 22 * s, shirt, 3 * s) + ci(x - 13 * s, hy + 35 * s, 2.6 * s, skin) + ci(x + 13 * s, hy + 35 * s, 2.6 * s, skin);
  // spiky hair: one shape that hugs the head, with points along the top (a full head of it from behind)
  const spikes = full => { const pts = [], n = 6, rb = R + .4 * s, rt = R + 4.6 * s;
    for (let k = 0; k <= n * 2; k++){ const a = Math.PI + k / (n * 2) * Math.PI, rr = k % 2 ? rb + (rt - rb) * Math.pow(-Math.sin(a), 1.5) : rb; pts.push(`${f(x + Math.cos(a) * rr)} ${f(hy + Math.sin(a) * rr)}`); }
    return `M${pts.join(' L')} ` + (full ? `A${f(rb)} ${f(rb)} 0 0 1 ${f(x - rb)} ${f(hy)}z` : `Q${f(x)} ${f(hy - 5 * s)} ${f(x - rb)} ${f(hy)}z`); };
  // ---- the head
  if (o.back){
    // from behind: all hair (or the scarf)
    g += style === 'curls' ? '' : style === 'spiky' ? `<path d="${spikes(true)}" fill="${hair}"/>` : `<circle cx="${f(x)}" cy="${f(hy)}" r="${f(R + .3 * s)}" ${hairAttr}/>`;
  } else {
    g += `<circle cx="${f(x)}" cy="${f(hy)}" r="${f(R)}" fill="${skin}" stroke="none"/>`;
    // the hairline (a fringe for most, a band of scarf for a hijab, almost nothing for a buzz cut)
    const cap = {buzz: 2.2, curls: 6, short: 5, long: 5, pony: 5, bun: 5, braids: 5, bob: 6.5, spiky: 5, hijab: 4}[style];
    g += style === 'spiky' ? `<path d="${spikes(false)}" fill="${hair}"/>` : `<path d="M${f(x - R - .4 * s)} ${f(hy)} a${f(R + .4 * s)} ${f(R + .4 * s)} 0 0 1 ${f(2 * R + .8 * s)} 0 q${f(-R - .4 * s)} ${F(-cap)} ${f(-2 * R - .8 * s)} 0z" ${hairAttr}/>`;
    if (style === 'pony') g += rc(x + R - 1.5 * s, hy - 3 * s, 4 * s, 12 * s, hair, 2 * s);
    if (face.beard) g += pa(`M${f(x - R + .5 * s)} ${f(hy + 1 * s)} q0 ${F(8)} ${f(R - .5 * s)} ${F(8)} q${f(R - .5 * s)} 0 ${f(R - .5 * s)} ${F(-8)} q${f(-R * .6)} ${F(4)} ${f(-R + .5 * s)} ${F(4)} q${f(-R * .4)} 0 ${f(-R + .5 * s)} ${F(-4)}z`, hair, ' stroke="none"');
    // the face: always visible on any skin tone
    if (face.blush) g += [-5, 5].map(d => ci(x + d * s, hy + 3.5 * s, 1.8 * s, '#f28b82', ' stroke="none" opacity=".55"')).join('');
    if (face.freckles) g += [[-5, 3], [-4, 4.4], [4, 3], [5, 4.4]].map(([a, b]) => ci(x + a * s, hy + b * s, .45 * s, '#8a5a3b', ' stroke="none"')).join('');
    if (face.eyes === 'happy') g += [-3, 3].map(d => pa(`M${f(x + (d - 1.5) * s)} ${f(hy + 1.4 * s)} q${F(1.5)} ${F(-1.8)} ${F(3)} 0`, 'none', ` stroke="#1b1b1b" stroke-width="${F(.9)}" stroke-linecap="round"`)).join('');
    else g += [-3, 3].map(d => `<ellipse cx="${f(x + d * s)}" cy="${f(hy + 1 * s)}" rx="${F(1.6)}" ry="${F(face.eyes === 'oval' ? 1.9 : 1.6)}" fill="#fff" stroke="none"/>` + ci(x + d * s, hy + 1.2 * s, .95 * s, '#1b1b1b', ' stroke="none"')).join('');
    if (face.brows) g += [-3, 3].map(d => ln(x + (d - 1.6) * s, hy - 1.9 * s, x + (d + 1.6) * s, hy - 2.2 * s, hair === '#e8cf8a' || hair === '#d9b25e' ? '#8a6a3a' : hair, .8 * s)).join('');
    const m = {smile: `M${f(x - 2.2 * s)} ${f(hy + 4.6 * s)} q${F(2.2)} ${F(1.8)} ${F(4.4)} 0`, flat: `M${f(x - 1.8 * s)} ${f(hy + 5 * s)} h${F(3.6)}`, grin: `M${f(x - 2.6 * s)} ${f(hy + 4.3 * s)} q${F(2.6)} ${F(3)} ${F(5.2)} 0z`, o: ''}[face.mouth];
    g += face.mouth === 'o' ? ci(x, hy + 5 * s, .9 * s, '#5a2a20', ' stroke="none"') : pa(m, face.mouth === 'grin' ? '#fff' : 'none', ` stroke="#5a2a20" stroke-width="${F(.8)}" stroke-linecap="round"`);
    if (face.specs) g += `<g fill="none" stroke="#222" stroke-width="${F(.7)}"><circle cx="${f(x - 3 * s)}" cy="${f(hy + 1 * s)}" r="${F(2.4)}"/><circle cx="${f(x + 3 * s)}" cy="${f(hy + 1 * s)}" r="${F(2.4)}"/><path d="M${f(x - .6 * s)} ${f(hy + 1 * s)} h${F(1.2)}"/></g>`;
  }
  return `<g class="ol">${behind}${g}</g>`;
}
const sc2Shelf = (x, y, w, items) => rc(x, y, w, 4, '#7a5638', 1) + items;
Object.assign(SC2_SURF, {lecture: 'flipdesk', complab: 'desk', makerspace: 'workbench', artstudio: 'worktable', music: 'piano', diner: 'booth', dining: 'longtable', lab: 'lab', biolab: 'lab'});
Object.assign(SC2_BACK, {
  // the back row of a lecture hall: the screen and lectern far below, rows of seats (with heads) in between
  lecture: (S, K, c, L, r, id, FY) => {
    let g = rc(0, 120, 300, 70, '#6f6a64', 0) + rc(0, 104, 300, 18, '#4a4642', 0);                                    // stage
    g += `<g class="ol">${rc(64, 12, 172, 88, '#f7f7f4', 2)}${rc(64, 12, 172, 6, '#2f3236', 1)}</g>` + (b => sc2Fit(150, 34, b[0], 9, 150, '#2f3236') + (b[1] ? sc2Fit(130, 50, b[1], 7, 100, '#3f6fa0') + sc2Fit(130, 64, b[2] || '', 6, 100, '#555') : [0, 1, 2].map(k => rc(84, 44 + k * 12, 100 - k * 22, 4, '#9aa6b5', 1, ' stroke="none"')).join('')))(sc2BoardText(S, ['LECTURE 14'])) + rc(196, 46, 26, 34, c.a3, 2, ' stroke="none"');
    g += `<g class="ol">${rc(214, 88, 18, 22, '#6b4429', 2)}${rc(210, 86, 26, 4, '#5d3b25', 1)}</g>` + sc2Folk(198, 112, .42, S.seed + 1, {arms: true});
    [[128, .55, 7], [150, .75, 6], [178, 1, 5]].forEach(([y, s, n], k) => {
      for (let j = 0; j < n; j++){ const x = (j + .5) * 300 / n + (k % 2 ? 14 : -10); if (r() < .55) g += sc2Folk(x, y + 4 * s, s * .9, S.seed + k * 13 + j, {back: true, sit: true}); }
      g += `<g class="ol">${rc(-10, y - 6 * s, 320, 22 * s, '#7b3f3a', 4)}${rc(-10, y + 12 * s, 320, 8 * s, '#5e2f2b', 0)}</g>`;
    });
    return g;
  },
  // a chemistry lab: a bench along the wall with glassware, reagent shelves, the fume hood
  lab: (S, K, c, L, r, id, FY) => sc2LabBack(S, K, c, L, r, id, FY, false),
  biolab: (S, K, c, L, r, id, FY) => sc2LabBack(S, K, c, L, r, id, FY, true),
  // a computer lab: a row of desks with monitors and people working
  complab: (S, K, c, L, r, id, FY) => {
    let g = `<g class="ol">${rc(10, 10, 80, 50, '#f7f7f4', 2)}</g>` + tx(50, 30, 'PRINT: 10¢', 7, '#c0392b') + tx(50, 44, 'no food pls', 6, '#555') + scDecClock(c, 250, 40);
    g += `<g class="ol">${rc(-4, FY - 70, 308, 8, '#d8d2c4', 1)}${rc(-4, FY - 62, 308, 4, '#b9b2a2', 0)}${[18, 140, 262].map(x => rc(x, FY - 62, 6, 62, '#8a8f96', 1)).join('')}</g>`;
    [40, 110, 180, 250].forEach((x, k) => { g += `<g class="ol">${rc(x - 24, FY - 112, 48, 34, '#2f3236', 3)}${rc(x - 21, FY - 109, 42, 28, k % 2 ? '#1e3a5f' : '#204a3a', 1)}${rc(x - 3, FY - 78, 6, 8, '#2f3236', 0)}${rc(x - 18, FY - 72, 36, 3, '#c9ccd1', 1)}</g>`;
      const seat = FY - 30, chair = `<g class="ol">${rc(x - 3, seat, 6, 24, '#55595f', 0)}${pa(`M${x - 16} ${FY} l16 -6 l16 6`, 'none', ' stroke="#2f3236" stroke-width="3"')}${rc(x - 15, seat - 4, 30, 6, '#2f3236', 3)}</g>`;
      if (k !== 2) g += chair + sc2Folk(x, seat + 8, .8, S.seed + 40 + k, {back: true, sit: true}) + `<g class="ol">${rc(x - 2, seat - 4, 4, 6, '#55595f', 0)}${rc(x - 15, seat - 19, 30, 16, '#2f3236', 5)}</g>`;
      else g += chair + `<g class="ol">${rc(x - 2, seat - 20, 4, 18, '#55595f', 0)}${rc(x - 14, seat - 36, 28, 22, '#2f3236', 6)}</g>`; });
    return g;
  },
  // a makerspace: pegboard of tools, shelves of bins, a 3D printer on a workbench
  makerspace: (S, K, c, L, r, id, FY) => {
    let g = `<g class="ol">${rc(10, 14, 140, 88, '#c9a26a', 2)}</g>` + [...Array(48)].map((_, k) => ci(18 + (k % 12) * 11.5, 22 + Math.floor(k / 12) * 20, 1.2, '#7a5638', ' stroke="none"')).join('');
    g += `<g class="ol">${pa('M26 30 h22 v6 h-22z', '#c0392b')}${rc(46, 26, 4, 32, '#7a5638', 1)}${pa('M64 28 l6 26 l-4 1 l-6 -26z', '#9aa0a6')}${ci(66, 27, 4, 'none', ' stroke="#9aa0a6" stroke-width="2.5"')}${pa('M86 30 l10 20 M96 30 l-10 20', 'none', ' stroke="#2f3236" stroke-width="2.4"')}${ci(84, 52, 3.4, 'none', ' stroke="#e0a630" stroke-width="2"')}${ci(98, 52, 3.4, 'none', ' stroke="#e0a630" stroke-width="2"')}${rc(112, 30, 26, 8, '#e0a630', 2)}${rc(110, 66, 30, 22, '#2f3236', 2)}${ci(125, 77, 6, '#9aa0a6')}</g>`;
    g += `<g class="ol">${rc(176, FY - 70, 120, 8, '#8a5a33', 1)}${rc(180, FY - 62, 6, 62, '#6b4429', 1)}${rc(286, FY - 62, 6, 62, '#6b4429', 1)}${rc(200, FY - 132, 66, 62, '#2f3236', 3)}${rc(206, FY - 126, 54, 46, '#3a3d44', 1)}${rc(222, FY - 92, 20, 10, c.a1, 2)}${rc(212, FY - 120, 42, 3, '#c9ccd1', 1)}${rc(226, FY - 117, 14, 6, '#c9ccd1', 1)}</g>`;
    g += `<g class="ol">${[0, 1].map(k => rc(170, 18 + k * 30, 126, 4, '#7a5638', 1) + [0, 1, 2, 3].map(j => rc(176 + j * 30, 2 + k * 30 + 2, 24, 14, [c.a1, '#e0a630', '#3f6fa0', '#7cb342'][(j + k) % 4], 2)).join('')).join('')}</g>`;
    return g;
  },
  // an art studio: easel with a canvas, canvases leaning on the wall, jars of brushes on a shelf
  artstudio: (S, K, c, L, r, id, FY) => {
    let g = sc2Window(SC.SETTING[S.set], L, id, r, 112, 18, 92, 70, K.trim);
    g += `<g class="ol">${ln(30, FY, 56, FY - 168, '#8a5a33', 4)}${ln(82, FY, 56, FY - 168, '#8a5a33', 4)}${ln(56, FY - 168, 56, FY, '#8a5a33', 3)}${rc(22, FY - 66, 68, 5, '#8a5a33', 1)}${rc(26, FY - 150, 60, 82, '#fbf9f2', 1)}</g>` +
      pa(`M30 ${FY - 90} q20 -30 50 -10 V${FY - 72} H30z`, c.a3, ' stroke="none"') + ci(66, FY - 128, 10, '#f2c14e', ' stroke="none"') + pa(`M30 ${FY - 98} l18 -18 l14 12 l18 -22 v54 H30z`, sc2Shade(c.a1, .1), ' stroke="none" opacity=".8"');
    g += `<g class="ol">${[0, 1, 2].map(k => `<g transform="rotate(${-8 + k * 3} ${222 + k * 22} ${FY})">${rc(206 + k * 22, FY - 80 + k * 8, 44, 80 - k * 8, ['#fbf9f2', c.a3, c.a2][k], 1)}</g>`).join('')}</g>`;
    g += `<g class="ol">${rc(214, 92, 82, 4, '#7a5638', 1)}${[0, 1, 2, 3].map(k => rc(220 + k * 19, 74, 12, 18, ['#e57373', '#64b5f6', '#ffd54f', '#81c784'][k], 2)).join('')}</g>` + [...Array(14)].map((_, k) => ci((k * 71) % 300, FY + 20 + (k * 37) % 90, 2 + k % 3, ['#e57373', '#64b5f6', '#ffd54f', '#81c784'][k % 4], ' stroke="none" opacity=".7"')).join('');
    return g;
  },
  // a practice room: foam panels, a music stand, a guitar on its stand, a little window
  music: (S, K, c, L, r, id, FY) => {
    let g = [...Array(12)].map((_, k) => { const x = 8 + (k % 6) * 48, y = 10 + Math.floor(k / 6) * 48; return `<g class="ol">${rc(x, y, 42, 42, '#3a3d44', 2)}</g>` + [0, 1, 2].map(j => (k + Math.floor(k / 6)) % 2 ? ln(x + 4, y + 10 + j * 11, x + 38, y + 10 + j * 11, '#2a2c30', 3) : ln(x + 10 + j * 11, y + 4, x + 10 + j * 11, y + 38, '#2a2c30', 3)).join(''); }).join('');
    g += `<g class="ol" transform="translate(30 ${FY}) scale(1.6)">${SC.PROP.headset.d(c)}</g><g class="ol" transform="translate(240 ${FY}) scale(1.5)">${SC.PROP.guitar.d(c)}</g>`;
    g += `<g class="ol">${rc(112, 112, 76, 20, '#f4ede0', 2)}</g>` + tx(150, 125, 'PRACTICE ROOM 3', 6, '#555');
    return g;
  },
  // a diner: the counter with stools and a pie case, menu boards, a neon sign
  diner: (S, K, c, L, r, id, FY) => {
    let g = `<text x="150" y="40" font-size="28" fill="none" stroke="#ff4fd8" stroke-width="2.4" font-family="ui-sans-serif,system-ui" font-weight="800" text-anchor="middle">DINER</text>`;
    g += `<g class="ol">${rc(10, 52, 90, 34, '#f7f2e6', 2)}${rc(200, 52, 90, 34, '#f7f2e6', 2)}</g>` + [['eggs', '6'], ['pancakes', '8'], ['coffee', '2']].map(([n, p], k) => tx(40, 62 + k * 9, n, 6, '#333') + tx(88, 62 + k * 9, p, 6, '#c0392b')).join('') + [['burger', '11'], ['fries', '4'], ['pie', '5']].map(([n, p], k) => tx(230, 62 + k * 9, n, 6, '#333') + tx(278, 62 + k * 9, p, 6, '#c0392b')).join('');
    const ct = FY - 60;
    g += `<g class="ol">${rc(-4, ct, 308, FY - ct, '#c9ccd1', 0)}${rc(-4, ct + 8, 308, 6, '#d32f2f', 0)}${rc(-4, ct - 6, 308, 7, '#e9e6df', 1)}${rc(100, ct - 34, 70, 28, '#dfeef3', 3)}</g>` + [116, 134, 152].map(x => `<ellipse cx="${x}" cy="${ct - 12}" rx="8" ry="4" fill="#d9a35f"/>`).join('');
    [30, 80, 200, 250].forEach(x => { g += `<g class="ol">${rc(x - 3, FY - 30, 6, 30, '#9aa0a6', 0)}${rc(x - 10, FY - 3, 20, 3, '#9aa0a6', 1)}</g>`;
      if (x === 80) g += sc2Folk(x, FY - 32 + 8.4, .7, S.seed + 5, {back: true, sit: true});
      g += `<g class="ol"><ellipse cx="${x}" cy="${FY - 32}" rx="14" ry="5" fill="#d32f2f"/></g>`; });
    return g;
  },
  // the dining hall: the food line behind the sneeze guard, long tables of people
  dining: (S, K, c, L, r, id, FY) => {
    // the serving line: a server behind the counter, food pans under the glass, heat lamps; students lining up with trays
    const ct = FY - 66;
    let g = `<g class="ol">${rc(70, 8, 160, 24, '#2f3236', 3)}</g>` + tx(150, 24, 'DINING HALL', 10, '#f2d27a');
    g += sc2Folk(150, ct + 4, .9, S.seed + 61, {arms: true}) + `<g class="ol">${rc(138, ct - 70, 24, 10, '#fff', 3)}</g>`;
    g += [60, 150, 240].map(x => `<g class="ol">${ln(x, 32, x, 52, '#2f3236', 1.5)}${pa(`M${x - 18} 62 l6 -10 h24 l6 10z`, '#c0392b')}</g><path d="M${x - 16} 64 l-6 26 h44 l-6 -26z" fill="#ffb347" opacity=".18"/>`).join('');
    g += `<g class="ol">${rc(-4, ct, 308, FY - ct, '#b9bec4', 0)}${[0, 1, 2, 3, 4].map(k => rc(6 + k * 60, ct + 14, 52, FY - ct - 20, 'none', 2, ' stroke="#9aa1a8" stroke-width="1.5"')).join('')}${rc(-4, ct - 6, 308, 7, '#e0e3e6', 1)}</g>`;
    g += [20, 80, 140, 200, 260].map((x, k) => `<g class="ol">${rc(x, ct - 12, 40, 8, '#8a9096', 1)}</g>` + rc(x + 3, ct - 15, 34, 5, ['#e8a33d', '#7cb342', '#c0392b', '#f2d27a', '#8d6e63'][k], 2, ' stroke="none"')).join('');
    g += `<g class="ol">${pa(`M-4 ${ct - 40} L304 ${ct - 40} L304 ${ct - 16} L-4 ${ct - 16}z`, '#dff1f6', ' fill-opacity=".5"')}${rc(-4, ct - 42, 308, 3, '#9aa1a8', 0)}</g>`;
    // the line, on the floor in front of the counter
    [40, 92, 232].forEach((x, k) => { g += `<g class="ol">${rc(x - 22, FY - 40, 44, 5, '#e57373', 1)}</g>` + sc2Folk(x, FY + 2, .78, S.seed + 70 + k, {back: true}); });
    return g;
  }
});
function scDecClock(c, x, y){ return `<g class="ol">${ci(x, y, 14, '#f1efe8')}</g>` + ln(x, y, x, y - 9, '#2c2c2a', 2) + ln(x, y, x + 6, y + 2, '#2c2c2a', 2); }
function sc2LabBack(S, K, c, L, r, id, FY, bio){
  const ct = FY - 62;
  let g = `<g class="ol">${rc(8, 16, 120, 4, '#bbb', 0)}${rc(8, 56, 120, 4, '#bbb', 0)}</g>` + [0, 1].map(k => [0, 1, 2, 3, 4].map(j => `<g class="ol">${rc(14 + j * 23, 22 + k * 40 - 8, 12, 26, ['#cde7f0', '#f7d6a8', '#d4f0c8', '#f4c6d6', '#e8e0ff'][(j + k) % 5], 2)}${rc(14 + j * 23, 22 + k * 40 - 12, 12, 4, '#555', 1)}</g>`).join('')).join('');
  g += `<g class="ol">${rc(150, 18, 60, 40, '#f7f2a8', 2)}</g>` + tx(180, 32, '⚠ GOGGLES', 7, '#2f3236') + tx(180, 46, 'ON AT ALL TIMES', 5, '#2f3236');
  // the bench along the wall
  g += `<g class="ol">${rc(-4, ct, 230, FY - ct, '#c9ced3', 0)}${[0, 1, 2, 3].map(k => rc(4 + k * 55, ct + 12, 48, FY - ct - 18, 'none', 2, ' stroke="#9aa1a8" stroke-width="1.5"')).join('')}${rc(-4, ct - 7, 230, 8, '#26292e', 1)}</g>`;
  g += bio ? `<g class="ol" transform="translate(40 ${ct - 6}) scale(1.6)">${sc2Microscope()}</g><g class="ol" transform="translate(120 ${ct - 6}) scale(1.4)">${SC.PROP.beaker.d(c)}</g><g class="ol" transform="translate(160 ${ct - 6}) scale(1.4)">${SC.PROP.testtubes.d(c)}</g>`
    : `<g class="ol" transform="translate(30 ${ct - 6}) scale(1.4)">${SC.PROP.flask.d(c)}</g><g class="ol" transform="translate(80 ${ct - 6}) scale(1.4)">${SC.PROP.beaker.d(c)}</g><g class="ol" transform="translate(130 ${ct - 6}) scale(1.4)">${SC.PROP.testtubes.d(c)}</g>`;
  // the fume hood
  g += `<g class="ol">${rc(232, 8, 70, FY - 8, '#c9ced3', 3)}${rc(240, 30, 56, 70, '#e6f2f5', 2)}${rc(240, 62, 56, 4, '#9aa1a8', 0)}${rc(232, 100, 70, 8, '#26292e', 0)}${rc(240, 116, 56, FY - 120, 'none', 2, ' stroke="#9aa1a8" stroke-width="1.5"')}</g>` + tx(267, 22, 'FUME HOOD', 5.5, '#555');
  return g;
}
function sc2Microscope(){ return pa('M2 0 h22 v-4 h-22z', '#2f3236') + pa('M16 -4 v-10 q0 -8 -8 -14', 'none', ' stroke="#2f3236" stroke-width="4" stroke-linecap="round"') + rc(4, -32, 7, 14, '#c9ccd1', 2) + rc(2, -12, 12, 3, '#2f3236', 1) + rc(5, -36, 5, 5, '#2f3236', 1); }
// batch 2
const sc2Lockers = (x0, x1, top, FY, col) => { let g = ''; for (let x = x0; x < x1; x += 30){ g += rc(x, top, 28, FY - top, col, 1) + [0, 1, 2].map(k => ln(x + 6, top + 8 + k * 4, x + 22, top + 8 + k * 4, sc2Shade(col, .35), 1.2)).join('') + rc(x + 20, top + (FY - top) * .45, 3, 10, '#c9ccd1', 1); } return `<g class="ol">${g}</g>`; };
const sc2Door = (x, FY, w, h, col, win) => `<g class="ol">${rc(x - 4, FY - h - 4, w + 8, h + 4, '#e8e3d8', 1)}${rc(x, FY - h, w, h, col, 1)}${win ? rc(x + w * .2, FY - h + 12, w * .6, h * .3, '#cfe3ef', 1) : ''}${ci(x + w - 9, FY - h * .48, 3, '#c9a26a')}</g>`;
const sc2Board = (x, y, w, h, c) => `<g class="ol">${rc(x, y, w, h, '#c9a26a', 2)}${rc(x, y, w, h, 'none', 2, ' stroke="#6b4429" stroke-width="3"')}${[[.08, .12, .3, .35, '#fff'], [.45, .1, .25, .4, '#f9e27a'], [.75, .18, .2, .3, c.a3], [.15, .58, .35, .3, '#f4c6d6'], [.6, .6, .3, .28, '#fff']].map(([a, b, ww, hh, f]) => rc(x + a * w, y + b * h, ww * w, hh * h, f, 1)).join('')}</g>` + [[.08, .12], [.45, .1], [.75, .18], [.15, .58], [.6, .6]].map(([a, b]) => ci(x + a * w + 6, y + b * h + 3, 1.6, '#d32f2f', ' stroke="none"')).join('');
Object.assign(SC2_SURF, {laundromat: 'table', gym: 'bench', lockerroom: 'bench', hospital: 'table', clinic: 'seatrow', waitingrm: 'seatrow', office: 'desk', officehrs: 'bench', hallway: 'bench'});
Object.assign(SC2_BACK, {
  laundromat: (S, K, c, L, r, id, FY) => {
    let g = `<g class="ol">${rc(90, 8, 120, 24, '#2f6fa0', 3)}</g>` + tx(150, 24, 'COIN LAUNDRY · OPEN 24H', 7, '#fff');
    // a row of dryers stacked on washers, all standing on the floor
    [[4, 0], [74, 1], [144, 2], [214, 3]].forEach(([x, k]) => {
      g += `<g class="ol">${rc(x, FY - 140, 66, 66, '#e9ecef', 3)}${rc(x, FY - 140, 66, 12, '#d6dade', 2)}<circle cx="${x + 33}" cy="${FY - 103}" r="19" fill="#9aa6ad" stroke="#c9ccd1" stroke-width="4"/>${ci(x + 52, FY - 134, 2.5, '#2f6fa0')}</g>`;
      g += `<g class="ol">${rc(x, FY - 72, 66, 72, '#f4f6f7', 3)}${rc(x, FY - 72, 66, 14, '#d6dade', 2)}<circle cx="${x + 33}" cy="${FY - 32}" r="21" fill="${k % 2 ? '#8fb8d0' : '#b8d4e2'}" stroke="#c9ccd1" stroke-width="4"/>${ci(x + 10, FY - 65, 2.5, '#7cb342')}${rc(x + 40, FY - 67, 18, 5, '#2f3236', 1)}</g>`;
      if (k % 2) g += pa(`M${x + 20} ${FY - 26} q13 8 26 0`, 'none', ' stroke="#fff" stroke-width="3" opacity=".6"') + ci(x + 28, FY - 36, 4, c.a1, ' stroke="none"') + ci(x + 38, FY - 30, 4, c.a3, ' stroke="none"');
    });
    g += `<g class="ol">${pa(`M284 ${FY} l-4 -30 h28 l-4 30z`, '#e8e3d8')}${pa(`M282 ${FY - 30} q8 -10 18 -2 q6 -6 6 2`, c.a2)}</g>`;
    return g;
  },
  gym: (S, K, c, L, r, id, FY) => {
    // the gym lobby: a check-in desk, a trophy case, banners, and the weight room through the glass
    let g = [0, 1, 2].map(k => `<g class="ol">${pa(`M${20 + k * 34} 6 h26 v34 l-13 -8 l-13 8z`, [c.a1, c.a2, c.a3][k])}</g>`).join('');
    // the weight room through a glass wall: its own floor, a dumbbell rack, two people working out
    g += `<defs><clipPath id="${id}gw"><rect x="130" y="10" width="166" height="108"/></clipPath></defs><g clip-path="url(#${id}gw)">${rc(130, 10, 166, 108, '#e7ebee', 0)}${rc(130, 92, 166, 26, '#3d4148', 0)}
      ${`<g class="ol">${rc(196, 70, 74, 5, '#2f3236', 1)}${rc(200, 75, 4, 20, '#2f3236', 0)}${rc(262, 75, 4, 20, '#2f3236', 0)}${[208, 222, 236, 250].map(x => rc(x, 62, 8, 9, '#55595f', 2)).join('')}</g>`}
      ${sc2Folk(166, 104, .62, S.seed + 81, {arms: true})}${sc2Folk(282, 104, .58, S.seed + 82, {})}</g>` + `<g class="ol">${rc(130, 10, 166, 108, 'none', 2, ' stroke="#9aa1a8" stroke-width="4"')}${ln(213, 10, 213, 118, '#9aa1a8', 3)}</g>`;
    g += `<g class="ol">${rc(10, 60, 80, 70, '#6b4429', 2)}${rc(14, 64, 72, 62, '#dff1f6', 1)}${pa('M30 100 h12 v8 h-12z M33 100 v-8 q-8 -2 -6 -8 h18 q2 6 -6 8 v8', '#e0a630')}${pa('M58 104 h12 v6 h-12z M61 104 v-6 q-6 -2 -5 -7 h14 q1 5 -5 7 v6', '#b8c4cf')}</g>`;
    // the check-in desk, with the person working it standing behind it
    g += sc2Folk(254, FY - 8, 1.1, S.seed + 83, {arms: true}) + `<g class="ol">${rc(120, FY - 56, 176, 56, '#2f3a48', 2)}${rc(116, FY - 62, 184, 7, '#e0e3e6', 1)}${rc(150, FY - 84, 30, 22, '#2f3236', 2)}${rc(162, FY - 62, 6, 0.1, '#2f3236', 0)}</g>` + tx(208, FY - 26, 'CHECK IN · SWIPE ID', 7, '#f2d27a');
    return g;
  },
  lockerroom: (S, K, c, L, r, id, FY) => {
    let g = sc2Lockers(0, 300, 22, FY, '#3f6fa0');
    g += `<g class="ol">${rc(20, FY - 26, 260, 8, '#c49a62', 2)}${rc(36, FY - 18, 8, 18, '#8a6a4a', 0)}${rc(256, FY - 18, 8, 18, '#8a6a4a', 0)}</g>`;
    return g;
  },
  hospital: (S, K, c, L, r, id, FY) => {
    // a break room: the kitchenette with coffee maker and microwave, the shift board, someone in scrubs
    const ct = FY - 62;
    let g = sc2Window(SC.SETTING[S.set], L, id, r, 20, 18, 82, 62, K.trim) + sc2Board(122, 16, 92, 62, c) + tx(168, 14, 'SHIFT SCHEDULE', 5.5, '#555') + scDecClock(c, 254, 40);
    g += `<g class="ol">${rc(-4, ct, 236, FY - ct, '#d6dade', 0)}${[0, 1, 2, 3].map(k => rc(4 + k * 56, ct + 12, 48, FY - ct - 18, 'none', 2, ' stroke="#b0b6bc" stroke-width="1.5"')).join('')}${rc(-4, ct - 6, 236, 7, '#e9e6e0', 1)}</g>`;
    g += `<g class="ol">${rc(26, ct - 34, 26, 28, '#2f3236', 3)}${rc(30, ct - 16, 16, 10, '#c9ccd1', 1)}${rc(30, ct - 14, 16, 8, '#5a321b', 0)}${rc(120, ct - 30, 52, 24, '#e9ecef', 3)}${rc(124, ct - 26, 32, 16, '#2f3236', 1)}${rc(160, ct - 24, 8, 12, '#c9ccd1', 1)}</g>`;
    g += `<g class="ol">${rc(240, 30, 60, FY - 30, '#e9ecef', 4)}${ln(240, 90, 300, 90, '#b9bec4', 1.5)}${rc(246, 60, 3, 22, '#9aa0a6', 1.5)}</g>` + sc2Folk(206, FY + 2, .85, S.seed + 91, {arms: true}).replace(/fill="(#3f6fa0|#c0392b|#2e7d5b|#8e44ad|#e0a630|#34495e|#d35400|#16a085|#7f8c8d)"/, 'fill="#5fb0b7"');
    return g;
  },
  clinic: (S, K, c, L, r, id, FY) => {
    // a clinic waiting room: the check-in window, a row of chairs with people waiting, a TV, a plant
    let g = `<g class="ol">${rc(16, 56, 110, 74, '#e8e3d8', 2)}</g><defs><clipPath id="${id}cw"><rect x="24" y="64" width="94" height="58"/></clipPath></defs>` +
      `<g clip-path="url(#${id}cw)">${rc(24, 64, 94, 58, '#dff1f6', 0)}${sc2Folk(71, 150, .9, S.seed + 101, {arms: true})}</g>` + `<g class="ol">${rc(24, 64, 94, 58, 'none', 1, ' stroke="#c9c2b2" stroke-width="2"')}${rc(16, 120, 110, 9, '#c9a26a', 1)}</g>` + tx(71, 52, 'CHECK IN', 7, '#2e7d5b');
    g += `<g class="ol">${rc(176, 20, 76, 44, '#1b1d20', 3)}${rc(180, 24, 68, 36, '#2e6b8a', 1)}</g>` + tx(214, 46, 'wash your hands :)', 5.5, '#fff');
    g += sc2Row(150, FY, 4, 34, c, S, [1, 3]) + `<g class="ol" transform="translate(268 ${FY}) scale(1.3)">${SC.PROP.monstera.d(c)}</g>`;
    return g;
  },
  waitingrm: (S, K, c, L, r, id, FY) => {
    // the DMV: NOW SERVING, the ticket machine, rows of chairs
    let g = `<g class="ol">${rc(70, 10, 160, 40, '#1b1d20', 3)}</g>` + tx(150, 26, 'NOW SERVING', 8, '#f2d27a') + tx(150, 43, 'B 42', 13, '#ff6b6b') + scDecClock(c, 262, 30);
    g += `<g class="ol">${rc(16, FY - 96, 30, 96, '#c0392b', 3)}${rc(22, FY - 84, 18, 12, '#f2d27a', 1)}${rc(24, FY - 64, 14, 3, '#2f3236', 1)}</g>` + tx(31, FY - 100, 'TAKE A NUMBER', 4.5, '#555');
    g += sc2Row(60, FY, 6, 36, c, S, [0, 2, 3, 5]);
    return g;
  },
  office: (S, K, c, L, r, id, FY) => {
    // a TA office: bookshelf, a whiteboard with office hours, a filing cabinet, the door
    let g = `<g class="ol">${rc(10, 16, 110, 70, '#f8f8f8', 3)}${rc(10, 16, 110, 70, 'none', 3, ' stroke="#bbb" stroke-width="3"')}</g>` + tx(65, 34, 'OFFICE HOURS', 7, '#2a5bd7') + (b => sc2Fit(65, 50, b[0], 7, 100, '#555') + sc2Fit(65, 66, b[1] || '', 7, 100, '#d32f2f') + sc2Fit(65, 79, b[2] || '', 6, 100, '#2e7d5b'))(sc2BoardText(S, ['Tue 2–4 · Thu 10–12', `${S.cls || 'pset 5'} due Fri!`]));
    g += `<g class="ol">${rc(140, FY - 150, 70, 150, '#6b4429', 2)}${[0, 1, 2, 3].map(k => rc(144, FY - 144 + k * 36, 62, 30, '#3b2a1e', 1) + [0, 1, 2, 3, 4, 5, 6].map(j => rc(146 + j * 8.6, FY - 140 + k * 36 + (j % 3), 7, 26 - (j % 3), [c.a1, c.a2, c.a3, '#f2c14e', '#8fb8c8', '#c0392b', '#7cb342'][(j + k) % 7], 1)).join('')).join('')}</g>`;
    g += `<g class="ol">${rc(222, FY - 76, 44, 76, '#9aa0a6', 2)}${[0, 1, 2].map(k => rc(226, FY - 72 + k * 24, 36, 20, 'none', 1, ' stroke="#7d848b" stroke-width="1.5"') + rc(238, FY - 64 + k * 24, 12, 3, '#55595f', 1)).join('')}${pa(`M228 ${FY - 76} l6 -14 l20 -2 l6 16z`, '#f4f1ea')}</g>`;
    g += `<g class="ol">${rc(16, FY - 40, 100, 6, '#c49a62', 1)}${rc(20, FY - 34, 6, 34, '#8a6a4a', 0)}${rc(106, FY - 34, 6, 34, '#8a6a4a', 0)}${rc(30, FY - 64, 30, 24, '#2f3236', 2)}${rc(70, FY - 50, 30, 10, '#f4f1ea', 1)}</g>`;
    return g;
  },
  officehrs: (S, K, c, L, r, id, FY) => {
    // the hallway outside a professor's office: their closed door, the sign-up sheet, another student waiting
    let g = sc2Door(150, FY, 74, 150, '#8a5a33', true) + `<g class="ol">${rc(160, FY - 166, 54, 10, '#f4f1ea', 1)}</g>` + tx(187, FY - 159, 'Prof. Alvarez', 5, '#333');
    g += `<g class="ol">${rc(234, FY - 120, 40, 52, '#fff', 1)}</g>` + tx(254, FY - 112, 'SIGN UP', 5, '#d32f2f') + [0, 1, 2, 3].map(k => ln(238, FY - 104 + k * 8, 270, FY - 104 + k * 8, '#9aa6b5', .8)).join('');
    g += sc2Board(16, 22, 110, 70, c);
    g += `<g class="ol">${rc(20, FY - 34, 80, 6, '#55595f', 2)}${rc(26, FY - 28, 5, 28, '#55595f', 0)}${rc(90, FY - 28, 5, 28, '#55595f', 0)}</g>` + sc2Folk(58, FY - 30, .78, S.seed + 111, {sit: true, legs: 30}) + `<g class="ol">${rc(44, FY - 48, 28, 6, c.a1, 1)}</g>`;
    return g;
  },
  hallway: (S, K, c, L, r, id, FY) => {
    // a school hallway: lockers, a classroom door, a bulletin board, people walking by
    let g = sc2Lockers(0, 120, 46, FY, '#4a7fb5') + sc2Door(136, FY, 64, 140, '#8a5a33', true) + `<g class="ol">${rc(150, FY - 158, 36, 10, '#2e7d5b', 1)}</g>` + tx(168, FY - 151, 'RM 204', 5.5, '#fff');
    g += sc2Board(214, 30, 80, 60, c);
    g += sc2Folk(96, FY + 2, .8, S.seed + 121, {}) + sc2Folk(250, FY + 2, .85, S.seed + 122, {arms: true});
    return g;
  }
});
// a row of joined waiting-room chairs on the floor; some with people in them
function sc2Row(x0, FY, n, w, c, S, occupied){
  let g = '';
  for (let k = 0; k < n; k++){ const x = x0 + k * w, seat = FY - 26;
    g += `<g class="ol">${rc(x + 2, seat - 26, w - 4, 26, '#3f6fa0', 6)}${rc(x + 2, seat, w - 4, 6, '#2f5a85', 2)}${rc(x + w / 2 - 2, seat + 6, 4, 20, '#9aa0a6', 0)}</g>`;
    if (occupied.includes(k)) g += sc2Folk(x + w / 2, seat + 8, .74, S.seed + 130 + k, {sit: true, legs: 22}); }
  return g + `<g class="ol">${rc(x0, FY - 3, n * w, 3, '#9aa0a6', 1)}</g>`;
}
// batch 3
Object.assign(SC2_SURF, {stairwell: 'step', basement: 'couch', attic: 'desk', barnoffice: 'table', hotel: 'desk', airport: 'seatrow', tent: 'sleepingbag', treehouse: 'floor', closet: 'desk'});
const sc2Exit = (x, y) => `<g class="ol">${rc(x, y, 36, 14, '#1f7a3a', 2)}</g>` + tx(x + 18, y + 10, 'EXIT', 8, '#fff');
Object.assign(SC2_BACK, {
  stairwell: (S, K, c, L, r, id, FY) => {
    // a flight of stairs seen from the side, climbing along the wall to a landing, with its handrail; the EXIT sign and floor number
    const x0 = 96, n = 10, run = 14, rise = 13, top = FY - n * rise, x1 = x0 + n * run;
    let g = sc2Exit(16, 14) + tx(40, 88, '3', 40, '#e0a630') + `<g class="ol">${rc(22, 112, 16, 28, '#c0392b', 5)}${rc(26, 106, 8, 8, '#2f3236', 2)}</g>` + `<g class="ol">${rc(252, 18, 40, 50, '#cfe3ef', 2)}${ln(272, 18, 272, 68, '#e8e3d8', 3)}</g>`;
    // the stairs: a sawtooth of treads and risers, the stringer underneath, the landing
    let d = `M${x0} ${FY}`; for (let k = 0; k < n; k++) d += ` V${FY - (k + 1) * rise} H${x0 + (k + 1) * run}`; d += ` H304 V${top + 12} H${x1 + 10} L${x0 + 26} ${FY}z`;
    g += `<g class="ol">${pa(d, '#8f9398')}${pa(`M${x0 + 26} ${FY} L${x1 + 10} ${top + 12} H304 V${FY} z`, '#6c7075')}</g>`;
    for (let k = 0; k < n; k++) g += ln(x0 + k * run, FY - (k + 1) * rise + .8, x0 + (k + 1) * run, FY - (k + 1) * rise + .8, '#e0a630', 1.6);
    // handrail with posts
    g += pa(`M${x0 - 4} ${FY - 44} L${x1} ${top - 40} H304`, 'none', ' stroke="#55595f" stroke-width="4" stroke-linecap="round"') + [0, 2, 4, 6, 8].map(k => ln(x0 + k * run + 7, FY - (k + 1) * rise, x0 + k * run + 7, FY - (k + 1) * rise - 38, '#55595f', 2)).join('') + [x1 + 20, x1 + 50].map(x => ln(x, top, x, top - 40, '#55595f', 2)).join('');
    return g;
  },
  basement: (S, K, c, L, r, id, FY) => {
    // a basement lounge: pipes along the ceiling, string lights, a vending machine, a poster, a beanbag
    let g = rc(0, 0, 300, 10, '#8a8d91', 0) + `<g class="ol">${rc(-4, 12, 308, 6, '#9aa0a6', 3)}${rc(-4, 22, 308, 4, '#b87333', 2)}</g>`;
    g += pa('M0 36 q75 18 150 0 t150 0', 'none', ' stroke="#2c2c2a" stroke-width="1.2"') + [...Array(12)].map((_, k) => ci(12 + k * 25, 40 + Math.sin(k * 1.3) * 6, 3, ['#ffd166', '#ff8fab', '#90e0ef'][k % 3], ' stroke="none"')).join('');
    g += `<g class="ol">${rc(214, FY - 140, 78, 140, '#c0392b', 4)}${rc(222, FY - 130, 50, 96, '#dff1f6', 2)}${[0, 1, 2, 3].map(k => [0, 1, 2].map(j => rc(226 + j * 15, FY - 124 + k * 22, 11, 14, ['#f2c14e', '#7cb342', '#e57373', '#64b5f6'][(j + k) % 4], 1)).join('')).join('')}${rc(278, FY - 120, 10, 30, '#2f3236', 1)}${rc(226, FY - 26, 40, 10, '#1b1d20', 1)}</g>`;
    g += `<g class="ol">${rc(24, 56, 54, 70, c.a3, 2)}</g>` + ci(51, 86, 14, c.a1, ' stroke="none" opacity=".8"');
    return g;
  },
  attic: (S, K, c, L, r, id, FY) => {
    // sloped roof on both sides with rafters, a round window in the gable, boxes and a plant on the floor
    let g = `<g class="ol">${pa(`M0 0 L96 0 L0 120z`, '#7a5638')}${pa(`M300 0 L204 0 L300 120z`, '#7a5638')}</g>` + [0, 1, 2].map(k => ln(20 + k * 26, 0, 0, 120 - (2 - k) * 40 + 0, '#5d3b25', 4) + ln(280 - k * 26, 0, 300, 120 - (2 - k) * 40, '#5d3b25', 4)).join('');
    g += `<defs><clipPath id="${id}rw"><circle cx="150" cy="58" r="36"/></clipPath></defs><g clip-path="url(#${id}rw)">${scView('sky', SC.LIGHT[S.light], id, r, 112, 20, 76, 76)}</g>` + `<g class="ol">${ci(150, 58, 38, 'none', ` stroke="${K.trim}" stroke-width="7"`)}${ln(150, 20, 150, 96, K.trim, 4)}${ln(112, 58, 188, 58, K.trim, 4)}</g>`;
    g += `<g class="ol">${rc(16, FY - 44, 50, 44, '#c9a26a', 2)}${rc(16, FY - 44, 50, 6, '#b08850', 1)}${rc(30, FY - 76, 40, 32, '#d8b98a', 2)}${rc(250, FY - 36, 40, 36, '#c9a26a', 2)}</g>` + tx(41, FY - 18, 'XMAS', 7, '#7a5638') + `<g class="ol" transform="translate(206 ${FY}) scale(1.4)">${SC.PROP.monstera.d(c)}</g>`;
    return g;
  },
  barnoffice: (S, K, c, L, r, id, FY) => {
    let g = sc2Window(SC.SETTING[S.set], SC.LIGHT[S.light], id, r, 106, 22, 88, 70, '#e8dcc8') + `<g class="ol">${pa('M30 40 q12 -16 24 0', 'none', ' stroke="#9aa0a6" stroke-width="6" stroke-linecap="round"')}</g>`;
    g += `<g class="ol">${rc(10, FY - 46, 72, 46, '#d9b65a', 6)}${rc(30, FY - 86, 70, 42, '#e0c06a', 6)}${rc(220, FY - 46, 76, 46, '#d9b65a', 6)}</g>` + [0, 1, 2, 3].map(k => ln(14, FY - 38 + k * 10, 78, FY - 38 + k * 10, '#b8963e', 1) + ln(224, FY - 38 + k * 10, 292, FY - 38 + k * 10, '#b8963e', 1)).join('');
    g += `<g class="ol">${ln(230, 56, 230, 74, '#2c2c2a', 1.5)}${rc(222, 74, 16, 22, '#e0a630', 3)}${rc(225, 78, 10, 12, '#fff3b0', 2)}</g>`;
    return g;
  },
  hotel: (S, K, c, L, r, id, FY) => {
    // a hotel room: curtains framing the city window, the bed's corner with a runner, a lamp and a framed print
    let g = sc2Window(SC.SETTING[S.set], SC.LIGHT[S.light], id, r, 112, 22, 120, 84, K.trim);
    g += `<g class="ol">${pa('M100 12 q8 50 0 104 h14 q-6 -52 0 -104z', '#7a2e3a')}${pa('M246 12 q-8 50 0 104 h-14 q6 -52 0 -104z', '#7a2e3a')}${rc(96, 8, 156, 6, '#5d3b25', 2)}</g>`;
    g += `<g class="ol">${rc(10, 32, 70, 52, '#c9a26a', 2)}${rc(14, 36, 62, 44, '#e9dfc8', 1)}</g>` + pa('M18 76 q14 -26 28 -10 q12 -16 26 10z', '#9fb8c9', ' stroke="none"');
    g += `<g class="ol">${rc(-20, FY - 60, 70, 60, '#f6f3ec', 4)}${rc(-20, FY - 34, 70, 12, '#7a2e3a', 0)}${rc(-20, FY - 74, 40, 16, '#fff', 6)}${rc(56, FY - 40, 34, 40, '#6b4429', 2)}${pa(`M64 ${FY - 40} v-24 M58 ${FY - 64} h12 l-3 -16 h-6z`, '#f4e3c3')}</g>`;
    g += `<g class="ol">${rc(256, FY - 40, 40, 40, '#6b4429', 2)}${rc(254, FY - 74, 44, 30, '#1b1d20', 2)}${rc(258, FY - 70, 36, 22, '#2e4a6a', 1)}</g>`;
    return g;
  },
  airport: (S, K, c, L, r, id, FY) => {
    // the window wall onto the tarmac: a plane parked at the gate with the jet bridge on it, then the gate sign and seats inside
    let g = rc(0, 0, 300, 62, '#a8d4ef', 0) + rc(0, 62, 300, 58, '#7d8287', 0) + pa('M0 90 h300', 'none', ' stroke="#f2d14e" stroke-width="2" stroke-dasharray="10 8"');
    // the plane: body, cockpit windows, a row of windows, wing, engine, tail
    g += `<g class="ol">${pa('M30 76 h190 q22 0 30 10 q-8 10 -30 10 h-190 q-14 0 -14 -10 q0 -10 14 -10z', '#f4f6f8')}${rc(30, 88, 210, 5, '#2f6fa0', 0)}
      ${pa('M28 76 l-14 -30 h14 l24 30z', '#2f6fa0')}${pa('M120 92 l-30 26 h20 l40 -26z', '#dfe3e7')}${rc(118, 98, 24, 12, '#c9ccd1', 6)}${pa('M236 80 q8 1 12 6 h-14z', '#2f3a48')}</g>` + [...Array(14)].map((_, k) => rc(50 + k * 12, 80, 5, 4, '#2f3a48', 1, ' stroke="none"')).join('');
    g += `<g class="ol">${pa('M300 74 L250 80 L250 96 L300 100z', '#c9ccd1')}${rc(272, 100, 6, 20, '#9aa0a6', 0)}</g>`;
    g += [0, 1, 2, 3, 4].map(k => rc(k * 75 - 3, 0, 6, 122, '#55595f', 0)).join('') + rc(0, 118, 300, 6, '#55595f', 0);
    g += `<g class="ol">${rc(14, 130, 96, 26, '#1b1d20', 2)}</g>` + tx(62, 141, 'GATE B12', 8, '#f2d27a') + tx(62, 151, 'BOSTON · 6:40 PM', 6, '#7ee787');
    g += sc2Row(130, FY, 4, 36, c, S, [0, 2]) + [[200, '#2f6fa0'], [118, '#c0392b']].map(([x, f]) => `<g class="ol">${rc(x, FY - 34, 22, 32, f, 4)}${rc(x + 8, FY - 46, 6, 12, 'none', 1, ' stroke="#2f3236" stroke-width="2"')}${ci(x + 4, FY - 1, 2.5, '#2f3236')}${ci(x + 18, FY - 1, 2.5, '#2f3236')}</g>`).join('');
    g += sc2Folk(286, FY + 2, .8, S.seed + 141, {});
    return g;
  },
  tent: (S, K, c, L, r, id, FY) => {
    // inside a tent: the sloped walls, the open door flap onto the trees, a lantern hanging from the top, a backpack
    let g = `<g class="ol">${pa('M0 0 L150 0 L0 190z', '#d98a3a')}${pa('M300 0 L150 0 L300 190z', '#d98a3a')}</g>` + pa('M150 0 L150 184', 'none', ' stroke="#b86e28" stroke-width="2"');
    g += `<defs><clipPath id="${id}td"><path d="M150 40 L206 184 L94 184z"/></clipPath></defs><g clip-path="url(#${id}td)">${scView('trees', SC.LIGHT[S.light], id, r, 90, 40, 120, 146)}</g>` + `<g class="ol">${pa('M150 40 L94 184 L112 184 q14 -60 38 -144z', '#c97a2e')}${pa('M150 40 L206 184 L188 184 q-14 -60 -38 -144z', '#c97a2e')}</g>`;
    g += `<g class="ol">${ln(150, 0, 150, 18, '#2c2c2a', 1.5)}${rc(142, 18, 16, 20, '#2f6b3c', 3)}${rc(145, 22, 10, 12, '#fff3b0', 2)}</g><circle cx="150" cy="30" r="34" fill="#ffd27a" opacity=".2"/>`;
    g += `<g class="ol" transform="translate(234 ${FY}) scale(1.4)">${SC.PROP.backpack.d(c)}</g>`;
    return g;
  },
  treehouse: (S, K, c, L, r, id, FY) => {
    // plank walls, a square window full of leaves, string lights, a pennant, the hatch in the floor
    let g = sc2Window(SC.SETTING[S.set], SC.LIGHT[S.light], id, r, 110, 30, 80, 70, '#8a5a33');
    g += pa('M10 22 q70 18 140 0 t140 0', 'none', ' stroke="#2c2c2a" stroke-width="1.2"') + [...Array(11)].map((_, k) => ci(18 + k * 26, 26 + Math.sin(k * 1.4) * 5, 3, ['#ffd166', '#ff8fab', '#90e0ef'][k % 3], ' stroke="none"')).join('');
    g += `<g class="ol">${pa('M24 50 h56 l-28 22z', c.a1)}${ln(24, 50, 80, 50, '#5d3b25', 2)}</g>` + tx(48, 58, 'NO ADULTS', 5, '#fff');
    g += `<g class="ol">${rc(214, FY - 10, 70, 10, '#3b2a1e', 1)}${pa(`M226 ${FY} v-56 M272 ${FY} v-56`, 'none', ' stroke="#c9a26a" stroke-width="2.5"')}${[0, 1, 2, 3].map(k => ln(226, FY - 12 - k * 13, 272, FY - 12 - k * 13, '#c9a26a', 2.5)).join('')}</g>`;
    return g;
  },
  closet: (S, K, c, L, r, id, FY) => {
    // a closet with its sliding doors pushed open: the top shelf of bins, clothes on hangers on the rod, shoes on a rack, the desk tucked inside
    let g = rc(0, 0, 300, FY, K.wall, 0) + `<g class="ol">${rc(26, 4, 248, FY - 4, '#e8e3d8', 2)}${rc(34, 12, 232, FY - 12, '#d9d2c4', 0)}</g>` + rc(34, 12, 232, 10, '#000', 0, ' opacity=".12"');
    g += `<g class="ol">${rc(34, 40, 232, 5, '#c9a26a', 1)}${[0, 1, 2, 3].map(k => rc(44 + k * 56, 18, 44, 22, [c.a3, '#e8dcc8', c.a1, '#b8c4cf'][k], 3)).join('')}${rc(34, 58, 232, 3, '#9aa0a6', 1.5)}</g>`;
    g += [...Array(8)].map((_, k) => { const x = 46 + k * 27, col = [c.a1, c.a2, '#e8e3d8', '#2f3a48', c.a3, '#c0392b', '#f4f1ea', '#6d8f3e'][k], len = 42 + (k * 13) % 30;
      return `<g class="ol">${pa(`M${x + 10} 59 q0 -6 4 -6 q4 0 4 4`, 'none', ' stroke="#9aa0a6" stroke-width="1.4"')}${pa(`M${x} 66 l10 -6 l10 6 v${len} h-20z`, col)}</g>`; }).join('');
    g += `<g class="ol">${rc(40, FY - 22, 100, 4, '#8a6a4a', 1)}${rc(40, FY - 8, 100, 4, '#8a6a4a', 1)}</g>` + [0, 1, 2].map(k => `<g class="ol">${pa(`M${48 + k * 30} ${FY - 22} v-7 q0 -5 9 -5 h11 v12z`, ['#f4f4f4', '#2f3236', c.a1][k])}</g>`).join('');
    // the sliding doors pushed to each side
    g += [[-6, 0], [262, 1]].map(([x]) => `<g class="ol">${rc(x, 4, 44, FY - 4, '#efe9dc', 2)}${[...Array(12)].map((_, k) => ln(x + 6, 14 + k * 13, x + 38, 14 + k * 13, '#cfc6b4', 1.4)).join('')}</g>`).join('');
    return g;
  }
});
// batch 4
// you're up in the stands: rows of bleachers step down in front of you (a few people sitting), then a railing, then the venue
function sc2Stands(S, c, top){
  let g = rc(-4, top + 14, 308, 240 - top, '#5d636a', 0) + `<g class="ol">${rc(-4, top, 308, 4, '#55595f', 1)}${[0, 1, 2, 3, 4, 5, 6].map(k => rc(k * 50, top, 3, 16, '#55595f', 0)).join('')}${rc(-4, top + 14, 308, 4, '#55595f', 1)}</g>`;
  [[top + 34, .6, [40, 150, 260]], [top + 62, .78, [90, 220]]].forEach(([y, sc, xs], k) => {
    xs.forEach((x, j) => { g += sc2Folk(x, y + 2, sc, S.seed + 200 + k * 9 + j, {back: true, sit: true}); });
    g += `<g class="ol">${rc(-4, y - 4, 308, 9, '#c9ccd1', 2)}${rc(-4, y + 5, 308, 10, '#7d838a', 0)}</g>`;
  });
  return g;
}
Object.assign(SC2_SURF, {greenhouse: 'workbench', bookstore: 'cafetable', bathtub: 'tubtray', hostelbunk: 'bed', frat: 'couch', chapel: 'pew', museum: 'bench', pool: 'bleachers', icearena: 'bleachers', bowling: 'booth', arcade: 'floorbare'});
const sc2Books = (x, y, w, h, rows, c) => { let g = rc(x, y, w, h, '#6b4429', 2); const rh = h / rows; for (let k = 0; k < rows; k++){ g += rc(x + 3, y + 3 + k * rh, w - 6, rh - 5, '#3b2a1e', 1); let bx = x + 5; while (bx < x + w - 8){ const bw = 4 + ((bx * 7 + k * 13) % 5); g += rc(bx, y + 5 + k * rh + ((bx + k) % 3), bw, rh - 9 - ((bx + k) % 3), ['#c0392b', '#2e7d5b', '#3f6fa0', '#e0a630', '#8e44ad', '#d35400', '#e8dcc8', c.a1][(bx + k * 3) % 8], 1); bx += bw + 1; } } return `<g class="ol">${g}</g>`; };
const sc2Frame = (x, y, w, h, fill) => `<g class="ol">${rc(x, y, w, h, '#b8923a', 2)}${rc(x + 4, y + 4, w - 8, h - 8, fill, 1)}</g>`;
Object.assign(SC2_BACK, {
  greenhouse: (S, K, c, L, r, id, FY) => {
    // glass walls on a white frame, benches of potted plants, a hanging basket
    let g = `<g>${scView('trees', SC.LIGHT[S.light], id, r, 0, 0, 300, FY - 60)}</g>` + rc(0, 0, 300, FY - 60, '#fff', 0, ' opacity=".18"');
    for (let x = 0; x <= 300; x += 60) g += rc(x - 2, 0, 4, FY - 60, '#f4f4f4', 0); g += rc(0, 40, 300, 3, '#f4f4f4', 0) + rc(0, FY - 62, 300, 4, '#f4f4f4', 0);
    [[8, 0], [158, 1]].forEach(([x0, k]) => { g += `<g class="ol">${rc(x0, FY - 52, 134, 6, '#8a6a4a', 1)}${rc(x0 + 6, FY - 46, 5, 46, '#6b4a2a', 0)}${rc(x0 + 123, FY - 46, 5, 46, '#6b4a2a', 0)}</g>`;
      for (let j = 0; j < 5; j++){ const px = x0 + 8 + j * 25; g += `<g class="ol">${pa(`M${px} ${FY - 66} h18 l-2 14 h-14z`, '#c97b4a')}${pa(`M${px + 9} ${FY - 66} q-10 -10 -4 -22 q8 6 4 22z M${px + 9} ${FY - 66} q10 -12 4 -24 q-8 8 -4 24z`, ['#4c9a5c', '#7ab55c', '#3a8a4a'][(j + k) % 3])}</g>` + ((j + k) % 3 === 0 ? ci(px + 9, FY - 88, 3, '#f48fb1', ' stroke="none"') : ''); } });
    g += `<g class="ol">${ln(150, 0, 150, 18, '#555', 1.2)}${pa('M136 18 h28 l-4 12 h-20z', '#c97b4a')}${pa('M140 30 q-6 16 -2 26 M150 30 q0 18 2 30 M160 30 q6 14 2 24', 'none', ' stroke="#4c9a5c" stroke-width="3"')}</g>`;
    return g;
  },
  bookstore: (S, K, c, L, r, id, FY) => {
    let g = sc2Books(-4, 6, 94, FY - 6, 5, c) + sc2Books(210, 6, 94, FY - 6, 5, c);
    g += `<g class="ol">${rc(104, 10, 92, 22, '#2f3a48', 3)}</g>` + tx(150, 25, 'BOOKS & COFFEE', 7.5, '#f2d27a') + [128, 172].map(x => ln(x, 32, x, 50, '#2c2c2a', 1.2) + `<g class="ol">${pa(`M${x - 10} 60 q10 -14 20 0z`, '#2c2c2a')}</g>`).join('');
    const ct = FY - 56;
    g += `<g class="ol">${rc(96, ct, 108, FY - ct, '#5d3b25', 0)}${rc(94, ct - 6, 112, 7, '#2f2a26', 1)}${rc(106, ct - 34, 40, 28, '#c9ccd1', 4)}${rc(116, ct - 16, 7, 7, '#2f3236', 1)}${rc(130, ct - 16, 7, 7, '#2f3236', 1)}${rc(156, ct - 26, 40, 20, '#dfeef3', 3)}</g>` + [166, 180].map(x => `<ellipse cx="${x}" cy="${ct - 12}" rx="6" ry="3.5" fill="#d9a35f"/>`).join('');
    return g;
  },
  bathtub: (S, K, c, L, r, id, FY) => {
    // the tiled wall at the end of the tub: shower head, knobs and spout in one line, a shelf of bottles, the curtain pulled aside
    let g = '';
    for (let y = 0; y < 240; y += 20) for (let x = (y / 20) % 2 ? -10 : 0; x < 300; x += 20) g += rc(x + .5, y + .5, 19, 19, '#eef3f4', 1, ' stroke="#c9d4d8" stroke-width=".8"');
    g += `<g class="ol">${rc(147, 34, 6, 118, '#b8bec4', 2)}${pa('M150 36 q0 -10 14 -10 h6', 'none', ' stroke="#b8bec4" stroke-width="5" stroke-linecap="round"')}${pa('M168 20 h18 l6 12 h-30z', '#c9ccd1')}
      ${ci(132, 128, 7, '#c9ccd1')}${ci(168, 128, 7, '#c9ccd1')}${rc(140, 158, 20, 10, '#c9ccd1', 3)}${rc(144, 166, 6, 8, '#c9ccd1', 2)}</g>` + [0, 1, 2, 3, 4].map(k => ln(172 + k * 4, 33, 168 + k * 6, 52, '#9ec5d6', 1)).join('') + tx(132, 131, 'H', 6, '#d32f2f') + tx(168, 131, 'C', 6, '#2a5bd7');
    g += `<g class="ol">${rc(20, 98, 80, 5, '#e9e6df', 1)}${rc(26, 74, 12, 24, '#c46a8a', 3)}${rc(42, 80, 12, 18, '#5fa8d3', 3)}${rc(58, 70, 14, 28, '#7cb342', 3)}${rc(76, 84, 16, 14, '#f4f1ea', 4)}</g>`;
    g += `<g class="ol">${rc(214, 0, 90, 4, '#9aa0a6', 2)}${pa('M222 4 q8 90 -2 182 h76 v-182z', sc2Tint(c.a3, .3))}${pa('M236 10 q6 80 0 166 M256 10 q4 80 0 166 M276 10 q4 80 0 166', 'none', ' stroke="#fff" stroke-width="2" opacity=".35"')}</g>`;
    return g;
  },
  hostelbunk: (S, K, c, L, r, id, FY) => {
    // other bunks across the room (someone asleep), lockers, backpacks on the floor, a window
    let g = sc2Window(SC.SETTING[S.set], SC.LIGHT[S.light], id, r, 112, 18, 76, 58, K.trim);
    const bunk = x => `<g class="ol">${rc(x, FY - 150, 7, 150, '#55595f', 1)}${rc(x + 93, FY - 150, 7, 150, '#55595f', 1)}${rc(x, FY - 104, 100, 10, '#55595f', 1)}${rc(x + 4, FY - 116, 92, 12, '#e8e3d8', 4)}${rc(x, FY - 34, 100, 10, '#55595f', 1)}${rc(x + 4, FY - 46, 92, 12, '#e8e3d8', 4)}</g>`;
    g += bunk(4) + `<g class="ol">${pa(`M14 ${FY - 116} q30 -16 70 -2 v4 h-70z`, c.a2)}${ci(20, FY - 120, 6, '#5a3a22')}</g>` + bunk(196) + `<g class="ol">${pa(`M206 ${FY - 46} q30 -14 74 -2 v4 h-74z`, c.a1)}</g>`;
    g += `<g class="ol">${rc(132, FY - 76, 46, 76, '#9aa0a6', 2)}${rc(134, FY - 74, 20, 72, '#a9b0b7', 1)}${rc(156, FY - 74, 20, 72, '#a9b0b7', 1)}${ci(150, FY - 40, 2, '#2f3236')}${ci(160, FY - 40, 2, '#2f3236')}</g>` + `<g class="ol" transform="translate(110 ${FY}) scale(.62)">${SC.PROP.backpack.d(c)}</g>`;
    return g;
  },
  frat: (S, K, c, L, r, id, FY) => {
    // a house party across the room: colored lights, a speaker, people dancing, red cups on a table
    let g = rc(0, 0, 300, FY, '#2a2040', 0, ' opacity=".55"');
    g += pa('M0 20 q75 22 150 4 t150 6', 'none', ' stroke="#2c2c2a" stroke-width="1.2"') + [...Array(12)].map((_, k) => ci(12 + k * 25, 26 + Math.sin(k * 1.2) * 7, 3.4, ['#ff4fd8', '#4fd8ff', '#ffe14f', '#7dff6b'][k % 4], ' stroke="none"')).join('');
    g += [[60, '#ff4fd8'], [240, '#4fd8ff']].map(([x, f]) => `<circle cx="${x}" cy="90" r="60" fill="${f}" opacity=".14"/>`).join('');
    g += `<g class="ol">${rc(14, FY - 72, 34, 72, '#1b1d20', 4)}${ci(31, FY - 50, 10, '#3a3d44')}${ci(31, FY - 20, 7, '#3a3d44')}</g>`;
    [80, 128, 176, 224].forEach((x, k) => { g += sc2Folk(x, FY + 2, .85, S.seed + 151 + k, {}); });
    g += `<g class="ol">${rc(244, FY - 34, 52, 6, '#8a5a33', 1)}${rc(250, FY - 28, 4, 28, '#6b4429', 0)}${rc(286, FY - 28, 4, 28, '#6b4429', 0)}${[252, 264, 276].map(x => pa(`M${x} ${FY - 34} l-1 -10 h9 l-1 10z`, '#d32f2f')).join('')}</g>`;
    return g;
  },
  chapel: (S, K, c, L, r, id, FY) => {
    // stone walls, tall stained-glass windows, the altar with candles, rows of pews with a few people
    let g = '';
    for (let y = 0; y < FY; y += 18) for (let x = (y / 18) % 2 ? -18 : 0; x < 300; x += 36) g += rc(x + 1, y + 1, 34, 16, '#b7ae9e', 2, ' stroke="#9a917f" stroke-width=".8"');
    [40, 230].forEach(x => { g += `<g class="ol">${pa(`M${x} 110 v-70 q0 -24 15 -30 q15 6 15 30 v70z`, '#3a3d44')}</g>` + [[0, '#c0392b'], [1, '#2e7d5b'], [2, '#3f6fa0'], [3, '#e0a630']].map(([k, f]) => rc(x + 3 + (k % 2) * 12, 40 + Math.floor(k / 2) * 34, 11, 32, f, 1, ' stroke="none" opacity=".85"')).join('') + `<path d="M${x + 3} 40 q12 -24 24 0z" fill="#8e44ad" opacity=".85"/>`; });
    g += `<g class="ol">${rc(110, 78, 80, 40, '#e8dcc8', 2)}${rc(104, 72, 92, 8, '#c9a26a', 1)}${pa('M150 30 v34 M140 42 h20', 'none', ' stroke="#b8923a" stroke-width="4"')}${[122, 178].map(x => rc(x - 3, 58, 6, 14, '#f4ede0', 1) + pa(`M${x} 50 q3 4 0 7 q-3 -3 0 -7z`, '#ffb547')).join('')}</g>`;
    [[132, .6], [156, .8]].forEach(([y, s], k) => { [60, 120, 200, 250].forEach((x, j) => { if ((j + k) % 2) g += sc2Folk(x, y + 4, s, S.seed + 161 + k * 7 + j, {back: true, sit: true}); }); g += `<g class="ol">${rc(-4, y - 10 * s, 308, 16 * s, '#6b4429', 2)}${rc(-4, y + 6 * s, 308, 10 * s, '#5d3b25', 0)}</g>`; });
    return g;
  },
  museum: (S, K, c, L, r, id, FY) => {
    // a gallery: paintings spaced on the wall, a sculpture on a plinth, visitors looking, a rope barrier
    let g = sc2Frame(14, 26, 76, 60, '#9fb8c9') + pa('M22 78 q16 -30 32 -10 q14 -18 28 10z', '#5b7a4a', ' stroke="none"') + ci(70, 44, 6, '#f2d27a', ' stroke="none"');
    g += sc2Frame(116, 16, 70, 88, '#e9dfc8') + rc(146, 66, 10, 12, '#e8b48c', 0, ' stroke="none"') + pa('M126 100 q25 -54 50 0z', '#3a3d44', ' stroke="none"') + ci(151, 56, 13, '#e8b48c', ' stroke="none"') + pa('M137 54 q14 -26 28 0 q-14 -9 -28 0z', '#3b2416', ' stroke="none"');
    g += sc2Frame(212, 30, 74, 54, '#2f3a48') + [...Array(6)].map((_, k) => ci(224 + k * 10, 44 + (k % 3) * 10, 2.5, '#f2d27a', ' stroke="none"')).join('');
    g += `<g class="ol">${rc(250, FY - 60, 34, 60, '#f4f1ea', 1)}${pa(`M258 ${FY - 60} q-2 -20 10 -30 q12 10 8 30z`, '#c9ccd1')}${ci(267, FY - 96, 7, '#c9ccd1')}</g>`;
    g += [70, 116].map(x => `<g class="ol">${rc(x - 2, FY - 34, 4, 34, '#b8923a', 1)}${ci(x, FY - 34, 3, '#b8923a')}</g>`).join('') + pa(`M70 ${FY - 30} q23 10 46 0`, 'none', ' stroke="#9a2030" stroke-width="3"');
    g += sc2Folk(44, FY + 2, .85, S.seed + 171, {back: true}) + sc2Folk(160, FY + 2, .85, S.seed + 172, {back: true}) + sc2Folk(200, FY + 2, .8, S.seed + 173, {back: true});
    return g;
  },
  pool: (S, K, c, L, r, id, FY) => {
    // from the stands: across the pool to the far wall (scoreboard, flags), the water below, the stands stepping down in front of you
    const yF = 62, yN = 128, X = (x, y) => 150 + (x - 150) * (.62 + .38 * (y - yF) / (yN - yF));
    let g = rc(0, 0, 300, yF, '#e4e8e3', 0) + `<g class="ol">${rc(80, 6, 140, 24, '#1b1d20', 3)}</g>` + tx(150, 22, 'HOME 42 · AWAY 38', 8, '#f2d27a');
    g += pa('M0 38 q75 10 150 0 t150 0', 'none', ' stroke="#555" stroke-width="1"') + [...Array(14)].map((_, k) => pa(`M${10 + k * 21} ${41 + Math.sin(k / 2) * 2} l5 7 l5 -7z`, ['#c0392b', '#f4f4f4', '#3f6fa0'][k % 3], ' stroke="none"')).join('');
    g += rc(0, yF - 4, 300, yN - yF + 30, '#d8dcd6', 0) + pa(`M${X(10, yF)} ${yF} L${X(290, yF)} ${yF} L${X(290, yN)} ${yN} L${X(10, yN)} ${yN}z`, '#2f95d0');
    for (let k = 1; k < 8; k++){ const x = 10 + k * 280 / 8; g += [...Array(16)].map((_, j) => { const t = j / 15, y = yF + (yN - yF) * t; return ci(X(x, y), y, .9 + 1.2 * t, j % 4 < 2 ? '#e53935' : '#fff', ' stroke="none"'); }).join(''); }
    [[80, 84], [190, 100], [130, 118]].forEach(([x, y], k) => { const sz = .5 + .5 * (y - yF) / (yN - yF); g += pa(`M${x - 14 * sz} ${y + 3 * sz} q${14 * sz} ${-5 * sz} ${28 * sz} 0`, 'none', ' stroke="#fff" stroke-width="1.6" opacity=".75"') + ci(x, y, 4 * sz, ['#f2d14e', '#1b1b1b', '#e57373'][k], ' stroke="none"'); });
    g += [40, 76, 112, 148, 184, 220, 256].map(x => `<g class="ol">${rc(X(x, yN) - 6, yN + 2, 12, 8, '#f4f4f4', 1)}</g>`).join('');
    return g + sc2Stands(S, c, 140);
  },
  icearena: (S, K, c, L, r, id, FY) => {
    // from the stands: across the rink to the far stands and scoreboard, the ice below inside its boards, rows of seats in front of you
    const yF = 60, yN = 128, X = (x, y) => 150 + (x - 150) * (.62 + .38 * (y - yF) / (yN - yF));
    let g = rc(0, 0, 300, yF, '#3a3d44', 0) + [...Array(26)].map((_, k) => ci(6 + k * 11.5, 40 + (k % 3) * 5, 3.4, ['#c0392b', '#3f6fa0', '#e0a630', '#7f8c8d', '#f4f1ea'][k % 5], ' stroke="none"')).join('');
    g += `<g class="ol">${ln(150, 0, 150, 4, '#555', 1.5)}${rc(100, 4, 100, 28, '#1b1d20', 3)}</g>` + tx(150, 17, 'HOME 2 · AWAY 1', 7, '#ff6b6b') + tx(150, 28, 'PERIOD 3 · 4:12', 5.5, '#f2d27a');
    g += pa(`M${X(10, yF)} ${yF} L${X(290, yF)} ${yF} L${X(290, yN)} ${yN} L${X(10, yN)} ${yN}z`, '#eef5f8');
    const hl = (y, col, w) => ln(X(10, y), y, X(290, y), y, col, w);
    g += hl(yF + 18, '#3f6fa0', 1.6) + hl(yF + 34, '#d32f2f', 2.4) + hl(yF + 52, '#3f6fa0', 1.8) + `<ellipse cx="150" cy="${yF + 34}" rx="24" ry="6" fill="none" stroke="#3f6fa0" stroke-width="1.2"/>`;
    g += `<g class="ol">${pa(`M${X(10, yF)} ${yF - 8} L${X(290, yF)} ${yF - 8} L${X(290, yF)} ${yF} L${X(10, yF)} ${yF}z`, '#f4f4f4')}${[0, 1, 2].map(k => rc(X(10, yF) + 8 + k * 60, yF - 7, 48, 5, [c.a1, '#e0a630', c.a3][k], 1)).join('')}</g>`;
    [[110, yF + 22], [200, yF + 36], [150, yF + 56]].forEach(([x, y], k) => { g += sc2Folk(x, y, .3 + .25 * (y - yF) / (yN - yF), S.seed + 181 + k, {}); });
    g += `<g class="ol">${pa(`M${X(10, yN)} ${yN} L${X(290, yN)} ${yN} L${X(290, yN)} ${yN + 10} L${X(10, yN)} ${yN + 10}z`, '#f4f4f4')}</g>` + rc(0, yN + 10, 300, 10, '#3a3d44', 0);
    return g + sc2Stands(S, c, 140);
  },
  bowling: (S, K, c, L, r, id, FY) => {
    // lanes running away from you to the lit pin decks, gutters, score screens hanging over them
    const vx = 150, vy = 70, yN = 214, P = (x, y) => vx + (x - vx) * (y - vy) / (yN - vy);
    let g = rc(0, 0, 300, yN, '#1b1d20', 0);
    g += [0, 1, 2].map(k => `<g class="ol">${rc(26 + k * 90, 10, 68, 30, '#2f3a48', 2)}</g>` + tx(60 + k * 90, 23, ['STRIKE!', 'LANE 7', 'LANE 8'][k], 7, ['#ffe14f', '#7ee787', '#7ee787'][k]) + tx(60 + k * 90, 35, '9 / X 7 2', 5, '#fff')).join('');
    const yb = 96;      // where the pin decks are
    g += rc(P(-240, yb), yb - 14, P(540, yb) - P(-240, yb), 14, '#f6efe0', 0) + rc(P(-240, yb), yb - 18, P(540, yb) - P(-240, yb), 4, '#2f3236', 0);
    [[-240, -40], [-20, 180], [200, 400]].forEach(([a, b], k) => {
      g += pa(`M${P(a, yb)} ${yb} L${P(b, yb)} ${yb} L${P(b, yN)} ${yN} L${P(a, yN)} ${yN}z`, '#d9b07a') + [0, 1, 2, 3, 4, 5].map(j => { const x = a + (b - a) * (j + 1) / 7; return ln(P(x, yb), yb, P(x, yN), yN, '#c09a62', .7); }).join('');
      const gl = a - 14, gr = b + 14; g += pa(`M${P(gl, yb)} ${yb} L${P(a, yb)} ${yb} L${P(a, yN)} ${yN} L${P(gl, yN)} ${yN}z`, '#55595f') + pa(`M${P(b, yb)} ${yb} L${P(gr, yb)} ${yb} L${P(gr, yN)} ${yN} L${P(b, yN)} ${yN}z`, '#55595f');
      const cx = P((a + b) / 2, yb); g += [[0, 0], [-2.4, -2], [2.4, -2], [-4.8, -4], [0, -4], [4.8, -4]].map(([dx, dy]) => rc(cx + dx - 1, yb - 8 + dy, 2, 6, '#fff', 1, ' stroke="#888" stroke-width=".3"')).join('');
    });
    g += [[-60, '#e0a630'], [80, '#3f6fa0']].map(([x, f], k) => { const y = 120 + k * 50; return ci(P(x, y), y, 2 + 6 * (y - vy) / (yN - vy), f, ' stroke="none"'); }).join('');
    g += `<text x="150" y="62" font-size="16" fill="none" stroke="#ff4fd8" stroke-width="1.6" font-family="ui-sans-serif,system-ui" font-weight="800" text-anchor="middle">BOWL</text>`;
    g += sc2Folk(110, yN - 2, .95, S.seed + 191, {back: true}) + `<g class="ol">${ci(128, yN - 40, 7, c.a1)}</g>`;
    return g;
  },
  arcade: (S, K, c, L, r, id, FY) => {
    // a closed arcade: a row of cabinets with glowing screens, a claw machine, the neon sign off for the night
    let g = rc(0, 0, 300, FY, '#141320', 0, ' opacity=".7"') + `<text x="150" y="32" font-size="22" fill="none" stroke="#7a3a7a" stroke-width="1.8" font-family="ui-sans-serif,system-ui" font-weight="800" text-anchor="middle">ARCADE</text>`;
    [[10, '#4fd8ff'], [74, '#ff4fd8'], [138, '#7dff6b']].forEach(([x, f]) => { g += `<g class="ol">${pa(`M${x} ${FY} V${FY - 120} l8 -14 h40 l8 14 V${FY}z`, '#2a2240')}${rc(x + 8, FY - 104, 40, 32, '#0d0d14', 2)}${rc(x + 4, FY - 66, 48, 12, '#3a3150', 1)}${ci(x + 18, FY - 60, 3, '#e53935')}${ci(x + 38, FY - 60, 3, '#ffe14f')}</g><rect x="${x + 11}" y="${FY - 101}" width="34" height="26" fill="${f}" opacity=".55"/><circle cx="${x + 28}" cy="${FY - 88}" r="30" fill="${f}" opacity=".08"/>`; });
    g += `<g class="ol">${rc(214, FY - 140, 76, 140, '#c0392b', 4)}${rc(222, FY - 130, 60, 70, '#dfeef3', 2)}${ln(252, FY - 130, 252, FY - 104, '#9aa0a6', 1.5)}${pa(`M246 ${FY - 104} l6 6 l6 -6`, 'none', ' stroke="#9aa0a6" stroke-width="2"')}${[230, 244, 262, 272].map((x, k) => ci(x, FY - 68, 6, ['#f48fb1', '#ffe14f', '#81d4fa', '#a5d6a7'][k])).join('')}</g>`;
    return g;
  }
});
// batch 5: rooms at home and around the library
const sc2Bed = (x, FY, w, c, col) => `<g class="ol">${rc(x, FY - 64, 10, 64, '#7a5638', 2)}${rc(x + w - 10, FY - 40, 10, 40, '#7a5638', 2)}${rc(x + 6, FY - 26, w - 12, 18, '#7a5638', 1)}${rc(x + 8, FY - 40, w - 16, 16, '#f4f1ea', 5)}${pa(`M${x + 34} ${FY - 42} h${w - 44} q4 14 0 20 h${-(w - 44)}z`, col)}${rc(x + 12, FY - 52, 30, 13, '#fbf9f2', 6)}</g>`;
const sc2Poster = (x, y, w, h, c, k) => `<g class="ol">${rc(x, y, w, h, [c.a3, '#2f3a48', '#f4ede0'][k % 3], 2)}</g>` + [ci(x + w / 2, y + h * .42, w * .26, c.a1, ' stroke="none" opacity=".85"'), pa(`M${x + 4} ${y + h - 6} l${w * .3} ${-h * .4} l${w * .2} ${h * .2} l${w * .3} ${-h * .3} l${w * .1} ${h * .5}z`, c.a2, ' stroke="none"'), tx(x + w / 2, y + h / 2 + 3, '★', w * .5, c.a1)][k % 3];
const sc2Lights = (y0, w = 300) => pa(`M0 ${y0} q${w / 4} 14 ${w / 2} 2 t${w / 2} 4`, 'none', ' stroke="#2c2c2a" stroke-width="1.1"') + [...Array(11)].map((_, k) => ci(14 + k * 26, y0 + 5 + Math.sin(k * 1.1) * 4, 2.8, ['#ffd166', '#ff8fab', '#90e0ef'][k % 3], ' stroke="none"')).join('');
const sc2Dresser = (x, FY, w, h, col) => `<g class="ol">${rc(x, FY - h, w, h, col, 2)}${[0, 1, 2].map(k => rc(x + 4, FY - h + 4 + k * (h - 8) / 3, w - 8, (h - 8) / 3 - 3, sc2Tint(col, .08), 1) + rc(x + w / 2 - 6, FY - h + 4 + k * (h - 8) / 3 + (h - 8) / 6 - 3, 12, 3, '#c9a26a', 1)).join('')}</g>`;
// rooms with a board whose words each post can set (bots' come from the AI with the caption)
const SC2_BOARDS = {classroom: 'chalkboard', studyroom: 'whiteboard', office: 'whiteboard', lecture: 'lecture slide'};
// what's written on a board: the post's own words (the poster or the AI picks them), else a default for the room
const sc2BoardText = (S, def) => Array.isArray(S.board) && S.board.length ? S.board.slice(0, 3).map(x => String(x).slice(0, 26)) : def;
// text that shrinks to fit a width
const sc2Fit = (x, y, t, size, w, col) => { if (!t) return ''; const fs = Math.min(size, w / Math.max(1, String(t).length * .56)); return tx(x, y, esc(String(t)), +fs.toFixed(1), col); };
// a student desk seen from behind: the desk top ahead of the seat, the chair, and maybe someone sitting at it
function sc2StuDesk(x, y, s, who, seed){
  const F = v => (v * s).toFixed(1), seat = y - 26 * s, wood = '#c49a62', metal = '#55595f';
  let g = `<g class="ol">${rc(x - 3 * s, y - 44 * s, 4 * s, 38 * s, metal, 0)}${rc(x - 27 * s, y - 50 * s, 54 * s, 6 * s, wood, 1)}${rc(x - 27 * s, y - 44 * s, 54 * s, 2.5 * s, '#9a7448', 0)}</g>`;
  g += `<g class="ol">${rc(x - 13 * s, seat, 26 * s, 4 * s, '#2f3a48', 1)}${rc(x - 12 * s, seat + 4 * s, 3 * s, 22 * s, metal, 0)}${rc(x + 9 * s, seat + 4 * s, 3 * s, 22 * s, metal, 0)}</g>`;
  if (who) g += sc2Folk(x, seat + 10 * s, s, seed, {back: true, sit: true});
  g += `<g class="ol">${rc(x - 2 * s, seat - 8 * s, 4 * s, 8 * s, metal, 0)}${rc(x - 12 * s, seat - (who ? 16 : 20) * s, 24 * s, 10 * s, '#2f3a48', 3)}</g>`;
  return g;
}
// a cafeteria table: people on the far side face you (the table hides their laps), people on the near side have their backs to you
function sc2EatTable(x, y, s, seed, seats){
  const far = [x - 22 * s, x + 22 * s], near = [x - 22 * s, x + 22 * s];
  let g = '';
  const bench = (by, foot) => `<g class="ol">${rc(x - 48 * s, by, 96 * s, 5 * s, '#8a6448', 1)}${rc(x - 42 * s, by + 5 * s, 4 * s, foot - by - 5 * s, '#55595f', 0)}${rc(x + 38 * s, by + 5 * s, 4 * s, foot - by - 5 * s, '#55595f', 0)}</g>`;
  g += bench(y - 16 * s, y - 4 * s);                                                                        // the far bench, behind the table
  far.forEach((fx, k) => { if (seats[k]) g += sc2Folk(fx, y - 6 * s, s, seed + k, {sit: true}); });
  g += `<g class="ol">${rc(x - 50 * s, y - 34 * s, 100 * s, 7 * s, '#c49a62', 1)}${rc(x - 46 * s, y - 27 * s, 92 * s, 3 * s, '#9a7448', 0)}${rc(x - 4 * s, y - 27 * s, 8 * s, 27 * s, '#55595f', 0)}</g>`;
  g += [[-28, 0], [26, 1]].map(([dx, k]) => `<g class="ol">${rc(x + dx * s - 6 * s, y - 40 * s, 12 * s, 7 * s, ['#f4f1ea', '#e8dcc8'][k], 2)}${ci(x + dx * s, y - 41 * s, 4 * s, ['#c0392b', '#e0a630'][k])}</g>`).join('');
  g += bench(y + 9 * s, y + 26 * s);                                                                       // the near bench, on your side
  near.forEach((nx, k) => { if (seats[k + 2]) g += sc2Folk(nx, y + 22 * s, s, seed + 5 + k, {back: true, sit: true}); });
  return g;
}
Object.assign(SC2_SURF, {bed: 'bedfoot', library2: 'table', stacks: 'table', carrel: 'carrel', studyroom: 'table', classroom: 'desk', union: 'table'});
Object.assign(SC2_BACK, {
  dorm: (S, K, c, L, r, id, FY) => sc2Window(SC.SETTING[S.set], L, id, r, 112, 22, 84, 70, K.trim) + sc2Lights(12) + sc2Bed(-10, FY, 116, c, c.a2) + sc2Poster(22, 40, 44, 56, c, 0) +
    sc2Dresser(226, FY, 70, 62, '#e8dcc8') + `<g class="ol">${rc(214, 70, 84, 5, '#7a5638', 1)}</g>` + [0, 1, 2, 3, 4].map(k => `<g class="ol">${rc(222 + k * 12, 46 + (k % 2) * 2, 10, 24 - (k % 2) * 2, [c.a1, c.a2, c.a3, '#c9a26a', '#8a5a33'][k], 1)}</g>`).join(''),
  dorm2: (S, K, c, L, r, id, FY) => {
    // a double: the bunk bed on one side, the roommate's corner (mini fridge, microwave, poster) on the other
    let g = sc2Window(SC.SETTING[S.set], L, id, r, 120, 22, 70, 64, K.trim);
    g += `<g class="ol">${rc(4, FY - 168, 8, 168, '#7a5638', 1)}${rc(98, FY - 168, 8, 168, '#7a5638', 1)}${rc(4, FY - 116, 102, 10, '#7a5638', 1)}${rc(8, FY - 130, 94, 14, '#f4f1ea', 5)}${rc(30, FY - 132, 70, 12, c.a1, 4)}${rc(4, FY - 30, 102, 10, '#7a5638', 1)}${rc(8, FY - 44, 94, 14, '#f4f1ea', 5)}${rc(30, FY - 46, 70, 12, c.a2, 4)}${[0, 1, 2].map(k => ln(98, FY - 116 + 26 + k * 22, 106, FY - 116 + 26 + k * 22, '#7a5638', 3)).join('')}</g>`;
    g += sc2Poster(212, 22, 44, 56, c, 1) + `<g class="ol">${rc(222, FY - 70, 56, 70, '#e9ecef', 3)}${ln(222, FY - 46, 278, FY - 46, '#b9bec4', 1.5)}${rc(228, FY - 64, 3, 14, '#9aa0a6', 1)}${rc(220, FY - 96, 60, 26, '#2f3236', 3)}${rc(224, FY - 92, 38, 18, '#55595f', 1)}${rc(266, FY - 92, 10, 18, '#3a3d44', 1)}</g>`;
    return g;
  },
  apt: (S, K, c, L, r, id, FY) => sc2Window(SC.SETTING[S.set], L, id, r, 104, 24, 92, 72, K.trim) + `<g class="ol">${rc(94, 16, 112, 4, '#5d3b25', 2)}${pa('M98 20 q6 50 0 92 h12 q-4 -46 0 -92z', c.a3)}${pa('M202 20 q-6 50 0 92 h-12 q4 -46 0 -92z', c.a3)}</g>` +
    `<g class="ol" transform="translate(18 ${FY}) scale(1.5)">${SC.PROP.monstera.d(c)}</g>` + sc2Frame(18, 30, 54, 42, '#9fb8c9') + sc2Bed(210, FY, 110, c, c.a1) + `<g class="ol">${rc(222, 66, 70, 5, '#7a5638', 1)}${rc(228, 44, 16, 22, '#e8dcc8', 2)}${rc(250, 52, 12, 14, '#c97b4a', 1)}${rc(266, 48, 18, 18, c.a2, 2)}</g>`,
  livingroom: (S, K, c, L, r, id, FY) => sc2Window(SC.SETTING[S.set], L, id, r, 106, 20, 88, 70, K.trim) + `<g class="ol">${ln(30, FY, 30, FY - 140, '#2c2c2a', 3)}${pa(`M14 ${FY - 140} h32 l-6 -22 h-20z`, '#f4e3c3')}${rc(20, FY - 4, 20, 4, '#2c2c2a', 1)}</g>` +
    sc2Frame(46, 26, 50, 40, '#e9dfc8') + `<g class="ol">${rc(206, FY - 34, 92, 34, '#6b4429', 2)}${rc(212, FY - 28, 38, 22, '#5d3b25', 1)}${rc(254, FY - 28, 38, 22, '#5d3b25', 1)}${rc(214, FY - 92, 80, 54, '#1b1d20', 3)}${rc(218, FY - 88, 72, 46, '#2e4a6a', 1)}${rc(250, FY - 38, 8, 4, '#1b1d20', 1)}</g>` + `<g class="ol" transform="translate(70 ${FY}) scale(1.2)">${SC.PROP.plant.d(c)}</g>`,
  bed: (S, K, c, L, r, id, FY) => {
    // sitting at the foot of your bed, looking up it: headboard against the wall, pillows, a nightstand and lamp each side, the blanket coming toward you
    const bl = c.a2;
    let g = sc2Window(SC.SETTING[S.set], L, id, r, 112, 14, 76, 56, K.trim) + sc2Lights(8) + sc2Poster(18, 30, 40, 50, c, 2) + sc2Poster(244, 28, 38, 48, c, 0);
    g += [[6, 52], [248, 294]].map(([a, b]) => `<g class="ol">${rc(a, FY - 52, b - a, 52, '#8a6448', 2)}${rc(a + 4, FY - 44, b - a - 8, 16, '#7a5638', 1)}${rc((a + b) / 2 - 5, FY - 38, 10, 3, '#c9a26a', 1)}${rc((a + b) / 2 - 6, FY - 60, 12, 8, '#e8dcc8', 2)}${ln((a + b) / 2, FY - 60, (a + b) / 2, FY - 76, '#2c2c2a', 2)}${pa(`M${(a + b) / 2 - 12} ${FY - 76} h24 l-5 -16 h-14z`, '#f4e3c3')}</g>`).join('');
    g += `<g class="ol">${rc(62, 84, 176, FY - 84, '#7a5638', 10)}${rc(70, 92, 160, 30, '#8a6448', 6)}</g>`;                                     // headboard
    g += `<g class="ol">${pa(`M66 138 L234 138 L330 305 L-30 305z`, '#f4f1ea')}</g>`;                                                              // the mattress and sheet
    g += `<g class="ol">${rc(76, 116, 70, 30, '#fbf9f2', 12)}${rc(154, 116, 70, 30, '#fbf9f2', 12)}</g>` + pa('M88 132 q22 -8 46 0 M166 132 q22 -8 46 0', 'none', ' stroke="#ddd" stroke-width="1.5"');
    g += `<g class="ol">${pa(`M58 160 Q150 150 242 160 L330 305 L-30 305z`, bl)}</g>` + pa('M58 160 Q150 150 242 160 L248 172 Q150 162 52 172z', '#fff', ' opacity=".35"') + pa('M90 200 Q150 186 210 204', 'none', ' stroke="#000" stroke-width="2" opacity=".12"');
    return g;
  },
  floor: (S, K, c, L, r, id, FY) => sc2Window(SC.SETTING[S.set], L, id, r, 112, 20, 84, 66, K.trim) + sc2Poster(28, 30, 50, 64, c, 1) + `<g class="ol">${rc(-10, FY - 40, 150, 40, '#7a5638', 3)}${rc(-6, FY - 56, 142, 20, c.a2, 6)}${rc(-2, FY - 66, 40, 14, '#fbf9f2', 6)}</g>` + sc2Dresser(214, FY, 80, 76, '#e8dcc8') + `<g class="ol">${rc(232, FY - 98, 44, 22, '#f4f1ea', 2)}</g>`,
  library: (S, K, c, L, r, id, FY) => sc2Books(-4, 6, 116, FY - 6, 5, c) + sc2Books(188, 6, 116, FY - 6, 5, c) + `<g class="ol">${rc(124, 30, 52, 24, '#2f3a48', 2)}</g>` + tx(150, 40, 'QUIET', 7, '#f2d27a') + tx(150, 50, 'PLEASE', 6, '#f2d27a') + sc2Folk(150, FY + 2, .85, S.seed + 211, {back: true}),
  library2: (S, K, c, L, r, id, FY) => {
    // a quiet corner: shelves either side of a tall arched window, a reading chair
    let g = sc2Books(-4, 6, 100, FY - 6, 5, c) + sc2Books(204, 6, 100, FY - 6, 5, c);
    g += `<defs><clipPath id="${id}aw"><path d="M112 150 V54 q38 -50 76 0 V150z"/></clipPath></defs><g clip-path="url(#${id}aw)">${scView('trees', L, id, r, 112, 10, 76, 140)}</g>` + `<g class="ol">${pa('M112 150 V54 q38 -50 76 0 V150z', 'none', ` stroke="${K.trim}" stroke-width="6"`)}${ln(150, 18, 150, 150, K.trim, 3)}${ln(112, 90, 188, 90, K.trim, 3)}</g>`;
    g += `<g class="ol">${rc(118, FY - 40, 64, 30, '#7a2e3a', 8)}${rc(112, FY - 58, 76, 22, '#7a2e3a', 8)}${rc(118, FY - 12, 6, 12, '#3b2a1e', 1)}${rc(176, FY - 12, 6, 12, '#3b2a1e', 1)}</g>`;
    return g;
  },
  stacks: (S, K, c, L, r, id, FY) => {
    // a study table tucked into the stacks: the ends of three tall shelf ranges, aisles of books between them, someone browsing
    let g = '';
    const ranges = [[-6, 54], [120, 180], [246, 306]], gaps = [[54, 120], [180, 246]];
    gaps.forEach(([a, b], k) => {
      g += sc2Books(a, 4, b - a, FY - 4, 6, c) + rc(a, 4, b - a, FY - 4, '#1b120c', 0, ' opacity=".35"') + `<path d="M${a} 4 h${b - a} v${FY - 4} h${-(b - a)}z" fill="#000" opacity=".12"/>`;
      if (k === (S.seed % 2)) g += sc2Folk((a + b) / 2, FY, .78, S.seed + 261, {});
    });
    ranges.forEach(([a, b], k) => {
      g += `<g class="ol">${rc(a, 0, b - a, FY, '#7a5638', 1)}${rc(a + 5, 10, b - a - 10, FY - 20, '#6b4429', 1)}${rc(a + 10, 30, b - a - 20, 18, '#f4f1ea', 1)}</g>` + tx((a + b) / 2, 42, ['PS 3500–3599', 'QA 76–99', 'QH 301–705'][k], 5.5, '#333');
    });
    return g;
  },
  carrel: (S, K, c, L, r, id, FY) => {
    // inside a study carrel: the back panel close up with a shelf, a corkboard and a lamp, the side panels framing you in
    let g = rc(0, 0, 300, FY, '#8a6448', 0) + `<g class="ol">${rc(30, 20, 240, 190, '#c49a62', 2)}${rc(30, 90, 240, 6, '#8a6a4a', 1)}${rc(46, 108, 110, 70, '#c9a26a', 2)}</g>`;
    g += [0, 1, 2, 3, 4, 5].map(k => `<g class="ol">${rc(44 + k * 13, 56 + (k % 2) * 3, 11, 34 - (k % 2) * 3, [c.a1, c.a2, c.a3, '#c0392b', '#e8dcc8', '#2e7d5b'][k], 1)}</g>`).join('') + [[56, 116, '#fff'], [92, 120, '#f9e27a'], [124, 114, '#f4c6d6'], [70, 146, c.a3]].map(([x, y, f]) => `<g class="ol">${rc(x, y, 26, 22, f, 1)}</g>` + ci(x + 13, y + 3, 1.6, '#d32f2f', ' stroke="none"')).join('');
    g += `<g class="ol">${rc(214, 200, 30, 6, '#2c2c2a', 2)}${ln(229, 200, 216, 140, '#2c2c2a', 3.5)}${ln(216, 140, 244, 120, '#2c2c2a', 3.5)}${pa('M236 112 l24 12 l-8 12 l-22 -12z', '#2e7d5b')}</g><path d="M246 132 l-30 70 h80 z" fill="#ffd27a" opacity=".22"/>`;
    g += `<g class="ol">${pa('M-10 0 L30 20 L30 230 L-10 260z', '#b08850')}${pa('M310 0 L270 20 L270 230 L310 260z', '#b08850')}</g>`;
    return g;
  },
  studyroom: (S, K, c, L, r, id, FY) => {
    // a small group study room: a big whiteboard covered in work, a clock above the door, a screen on the wall
    const b = sc2BoardText(S, [S.cls || '∫ f(x) dx', 'due Fri!!', 'ask TA']);
    let g = `<g class="ol">${rc(10, 18, 176, 104, '#f8f8f8', 3)}${rc(10, 18, 176, 104, 'none', 3, ' stroke="#bbb" stroke-width="3"')}${rc(30, 122, 130, 5, '#bbb', 1)}${rc(40, 117, 10, 5, '#2a5bd7', 1)}${rc(56, 117, 10, 5, '#d32f2f', 1)}</g>` +
      sc2Fit(98, 48, b[0], 15, 160, '#2a5bd7') + pa('M28 64 q30 -8 60 3 t60 -5', 'none', ' stroke="#d32f2f" stroke-width="2"') + sc2Fit(70, 90, b[1] || '', 9, 110, '#2e7d5b') + sc2Fit(146, 108, b[2] || '', 7, 70, '#555');
    g += sc2Door(214, FY, 70, 140, '#8a6448', true) + `<g class="ol">${rc(226, FY - 120, 46, 12, '#2f3a48', 1)}</g>` + tx(249, FY - 112, 'ROOM 214', 5.5, '#fff') + scDecClock(c, 249, 24);
    return g;
  },
  classroom: (S, K, c, L, r, id, FY) => {
    // the back of a classroom: the chalkboard and teacher's desk at the front, rows of student desks, some taken
    const b = sc2BoardText(S, [S.cls || 'ε-δ', 'quiz Thursday']);
    let g = `<g class="ol">${rc(40, 10, 220, 74, '#2f4f3a', 3)}${rc(40, 10, 220, 74, 'none', 3, ' stroke="#7a5638" stroke-width="5"')}${rc(60, 84, 180, 4, '#7a5638', 1)}</g>` + sc2Fit(150, 40, b[0], 16, 200, '#f6f2e8') + sc2Fit(150, 60, b[1] || '', 9, 200, '#f2d27a') + sc2Fit(150, 76, b[2] || '', 7, 200, '#cfe3d4') + scDecClock(c, 278, 30);
    g += `<g class="ol">${rc(108, 98, 84, 22, '#8a5a33', 2)}${rc(112, 120, 6, 14, '#6b4429', 0)}${rc(182, 120, 6, 14, '#6b4429', 0)}</g>`;
    [[146, .6, [38, 113, 188, 263]], [186, .82, [55, 150, 245]]].forEach(([y, sc, xs], k) => xs.forEach((x, j) => { g += sc2StuDesk(x, y, sc, (j * 5 + k * 3 + S.seed) % 3 !== 0, S.seed + 231 + k * 7 + j); }));
    return g;
  },
  union: (S, K, c, L, r, id, FY) => {
    // the student union: food court signs, banners, a big open hall with people eating at tables
    let g = [0, 1, 2, 3, 4].map(k => `<g class="ol">${pa(`M${14 + k * 58} 6 h34 v38 l-17 -9 l-17 9z`, [c.a1, '#e0a630', c.a3, '#c0392b', c.a2][k])}</g>`).join('');
    g += [['PIZZA', '#c0392b', 20], ['BOBA', '#8e44ad', 116], ['GRILL', '#2e7d5b', 212]].map(([t, col, x]) => `<g class="ol">${rc(x, 56, 70, 46, '#e8e3d8', 2)}${rc(x, 56, 70, 14, col, 2)}${rc(x + 6, 76, 58, 26, '#3a3d44', 1)}</g>` + tx(x + 35, 67, t, 8, '#fff')).join('');
    g += sc2EatTable(70, 160, .74, S.seed + 241, [1, 1, 0, 1]) + sc2EatTable(232, 160, .74, S.seed + 251, [1, 0, 1, 1]);
    g += sc2Folk(150, 206, .86, S.seed + 249, {});
    return g;
  }
});

/* ================= outdoors: sky, far scenery, a ground you can see the depth of, and a real thing to sit at ================= */
const sc2N = L => L.t === 'n';
const sc2Nt = (L, day, night) => sc2N(L) ? night : day;
// a ground plane from the horizon down, with a texture that shrinks with distance
function sc2Ground(kind, HY, L, col){
  const n = sc2N(L), rows = k => HY + (300 - HY) * Math.pow(k, 1.6), vx = 150;
  const C = col || {grass: n ? '#1f3a26' : '#7fb35f', sand: n ? '#5a5240' : '#ecd6a0', paver: n ? '#3a3a40' : '#c9c2b4', concrete: n ? '#34363c' : '#a9a9a6', dirt: n ? '#3a2f24' : '#b08a5a', field: n ? '#2e2a18' : '#d6bd62', water: n ? '#14283a' : '#3d86b0', deck: n ? '#3a2c20' : '#a0764c'}[kind];
  let g = rc(-5, HY, 310, 305 - HY, C, 0);
  const fx = (x0, y) => vx + (x0 - vx) * ((y - HY) / (300 - HY) * .8 + .2);
  if (kind === 'grass' || kind === 'field') for (let k = 0; k < 140; k++){ const t = ((k * 0.6180339) % 1), y = HY + 3 + (300 - HY) * Math.pow(t, 1.4), x = (k * 97 + (k % 7) * 13) % 300, h = 1.5 + (y - HY) / (300 - HY) * 6;
    g += pa(`M${x.toFixed(1)} ${y.toFixed(1)} l${(-h * .4).toFixed(1)} ${(-h).toFixed(1)} M${x.toFixed(1)} ${y.toFixed(1)} l${(h * .3).toFixed(1)} ${(-h * 1.1).toFixed(1)}`, 'none', ` stroke="${n ? '#0f2416' : kind === 'field' ? '#a8902e' : '#4f8a3c'}" stroke-width="1.1" opacity=".6"`); }
  if (kind === 'field') for (let k = 1; k < 9; k++){ const y = rows(k / 9); g += ln(0, y, 300, y, '#000', 1.2, ' opacity=".1"'); }
  if (kind === 'sand') for (let k = 0; k < 120; k++){ const y = HY + 3 + (300 - HY) * Math.pow(((k * .618) % 1), 1.3), x = (k * 83) % 300; g += ci(x, y, .6 + (y - HY) / 160, k % 2 ? '#fff' : '#8a6a3a', ' opacity=".3"'); }
  if (kind === 'paver' || kind === 'concrete' || kind === 'deck'){
    const step = kind === 'deck' ? 30 : kind === 'paver' ? 44 : 80;
    for (let x = -300; x <= 600; x += step) g += ln(fx(x, HY), HY, fx(x, 300), 300, '#000', 1.2, ` opacity="${kind === 'deck' ? .3 : .14}"`);
    if (kind !== 'deck') for (let k = 1; k < 8; k++){ const y = rows(k / 8); g += ln(0, y, 300, y, '#000', 1.2, ' opacity=".14"'); }
  }
  if (kind === 'water') for (let k = 0; k < 40; k++){ const t = (k * .618) % 1, y = HY + 4 + (300 - HY) * Math.pow(t, 1.5), x = (k * 71) % 300, w = 6 + (y - HY) / 6; g += ln(x, y, x + w, y, '#fff', 1.2, ' opacity=".35"'); }
  g += rc(-5, HY, 310, 6, '#fff', 0, ' opacity=".08"');
  return g;
}
const sc2Tree = (x, gy, s, L, k = 0) => { const n = sc2N(L), cols = n ? ['#16301f', '#1b3626'] : ['#4c9a5c', '#5aa469', '#3f8a4e', '#6aab55'];
  return `<ellipse cx="${x}" cy="${gy}" rx="${16 * s}" ry="${3.5 * s}" fill="#000" opacity=".2"/><g class="ol">${rc(x - 3 * s, gy - 30 * s, 6 * s, 30 * s, '#5a3f2a', 1)}${ci(x - 10 * s, gy - 40 * s, 15 * s, cols[(k + 1) % cols.length])}${ci(x + 10 * s, gy - 42 * s, 15 * s, cols[(k + 2) % cols.length])}${ci(x, gy - 56 * s, 18 * s, cols[k % cols.length])}</g>`; };
const sc2Pine = (x, gy, s, L) => `<g class="ol">${rc(x - 2 * s, gy - 8 * s, 4 * s, 8 * s, '#5a3f2a', 0)}${pa(`M${x} ${gy - 52 * s} l${14 * s} ${44 * s} h${-28 * s}z`, sc2Nt(L, '#2f6b45', '#132b1d'))}</g>`;
// a building with windows (lit at night)
function sc2Bldg(x, gy, w, h, col, L, o = {}){
  const n = sc2N(L); let g = `<g class="ol">${rc(x, gy - h, w, h, n ? sc2Shade(col, .55) : col, 0)}${o.roof ? pa(`M${x - 4} ${gy - h} l${w / 2 + 4} ${-o.roof} l${w / 2 + 4} ${o.roof}z`, n ? '#2a2422' : '#7c3a24') : ''}</g>`;
  const ww = o.win || 7, gap = o.gap || 6;
  for (let y = gy - h + 8; y < gy - 14; y += ww + gap + 2) for (let wx = x + 6; wx < x + w - ww - 3; wx += ww + gap){ const lit = n && ((wx * 7 + y * 3) % 5) < 2; g += rc(wx, y, ww, ww + 2, lit ? '#f6d77a' : n ? '#1c2030' : '#d6e4ee', 0, ' opacity=".9"'); }
  if (o.door) g += `<g class="ol">${rc(x + w / 2 - 7, gy - 18, 14, 18, n ? '#2a2422' : '#5d3b25', 1)}</g>`;
  return g;
}
const sc2Lamppost = (x, gy, s, L) => `<g class="ol">${rc(x - 1.5 * s, gy - 70 * s, 3 * s, 70 * s, '#2f3236', 0)}${rc(x - 5 * s, gy - 78 * s, 10 * s, 9 * s, sc2N(L) ? '#ffe08a' : '#e8e3d8', 2)}${rc(x - 7 * s, gy - 80 * s, 14 * s, 3 * s, '#2f3236', 1)}</g>` + (sc2N(L) ? ci(x, gy - 74 * s, 26 * s, '#ffd27a', ' opacity=".22"') : '');
const sc2Railing = (y, h, col, x0 = -5, x1 = 305, step = 14) => { let g = `<g class="ol">${rc(x0, y, x1 - x0, 5, col, 1)}${rc(x0, y + h, x1 - x0, 3, col, 0)}`; for (let x = x0 + 6; x < x1; x += step) g += rc(x, y + 5, 2.5, h - 5, col, 0); return g + '</g>'; };

// what you sit at, outdoors (props sit at `top`)
const SC2_OUTSURF = {
  parkbench: (c, L, wood) => { const w = wood || sc2Nt(L, '#a0703f', '#4a3622'); let g = `<ellipse cx="150" cy="298" rx="150" ry="9" fill="#000" opacity=".2"/>`;
    g += rc(20, 250, 12, 55, '#2f3236', 0) + rc(268, 250, 12, 55, '#2f3236', 0);
    [212, 228, 244].forEach((y, k) => { g += rc(-10, y, 320, 13, sc2Tint(w, k * .04), 2) + ln(-10, y + 1, 310, y + 1, '#fff', 1, ' opacity=".25"'); });
    return {g: `<g class="ol">${g}</g>`, top: 236}; },
  picnic: (c, L) => { const w = sc2Nt(L, '#b07d4a', '#4a3622'); let g = `<ellipse cx="150" cy="298" rx="150" ry="9" fill="#000" opacity=".2"/>` + pa('M40 300 L70 238 h14 L56 300z M260 300 L230 238 h-14 L244 300z', sc2Shade(w, .3));
    [0, 1, 2, 3].forEach(k => { g += rc(-10, 206 + k * 9, 320, 9, sc2Tint(w, (k % 2) * .06), 1); }); g += rc(-10, 242, 320, 7, sc2Shade(w, .25), 0);
    return {g: `<g class="ol">${g}</g>`, top: 224}; },
  blanket: (c, L) => { const a = c.a1, b = '#f4f1ea'; let g = pa('M30 228 L270 228 L320 305 L-20 305z', a);
    for (let k = 1; k < 6; k++){ const t = k / 6; g += ln(30 + (-20 - 30) * 0 + (270 - 30) * t + (( -20 - 30) + ((320 - 270) - (-20 - 30)) * t) * 0, 228, -20 + 340 * t, 305, b, 3, ' opacity=".45"'); }
    [244, 266, 290].forEach(y => { g += ln(-20, y, 320, y, b, 3, ' opacity=".45"'); });
    return {g: `<g class="ol">${pa('M30 228 L270 228 L320 305 L-20 305z', 'none')}</g>` + g, top: 262}; },
  towel: (c, L) => { let g = pa('M50 226 L250 226 L300 305 L0 305z', '#f4f1ea'); [[.0, .2, c.a1], [.4, .6, c.a2], [.8, 1, c.a1]].forEach(([a, b, col]) => { g += pa(`M${50 + 200 * a} 226 L${50 + 200 * b} 226 L${300 * b} 305 L${300 * a} 305z`, col); });
    return {g: `<g class="ol">${g}</g>`, top: 262}; },
  bleacher: (c, L) => { const m = sc2Nt(L, '#c3c9cf', '#4a4f56'); let g = rc(-10, 214, 320, 14, m, 2) + rc(-10, 228, 320, 6, sc2Shade(m, .3), 0) + rc(-10, 234, 320, 71, sc2Nt(L, '#5c636b', '#22262b'), 0) + rc(-10, 282, 320, 12, m, 2) + [30, 150, 270].map(x => rc(x, 234, 6, 48, '#3a3f45', 0)).join('');
    return {g: `<g class="ol">${g}</g>`, top: 224}; },
  ledge: (c, L) => { const s = sc2Nt(L, '#bdb8ae', '#45444a'); let g = rc(-10, 210, 320, 16, sc2Tint(s, .08), 1) + rc(-10, 226, 320, 79, s, 0); for (let y = 240; y < 300; y += 18) g += ln(-10, y, 310, y, '#000', 1, ' opacity=".15"'); for (let x = 20; x < 300; x += 60) g += ln(x + ((x / 60) % 2) * 30, 226, x + ((x / 60) % 2) * 30, 240, '#000', 1, ' opacity=".15"');
    return {g: `<g class="ol">${g}</g>`, top: 220}; },
  step: (c, L) => { const s = sc2Nt(L, '#d8d2c4', '#4a4840'); let g = rc(-10, 214, 320, 22, sc2Tint(s, .06), 0) + rc(-10, 236, 320, 26, sc2Shade(s, .15), 0) + rc(-10, 262, 320, 16, sc2Tint(s, .06), 0) + rc(-10, 278, 320, 30, sc2Shade(s, .15), 0);
    return {g: `<g class="ol">${g}</g>`, top: 226}; },
  rock: (c, L) => { const s = sc2Nt(L, '#9a958c', '#3e3d3a'); const g = pa('M-20 305 L-10 236 Q40 214 120 220 Q200 212 260 224 Q306 232 320 250 L320 305z', s) + pa('M30 250 q40 -8 80 4 M180 262 q30 -6 60 6', 'none', ' stroke="#000" stroke-width="1.5" opacity=".18"') + pa('M-10 236 Q40 214 120 220 Q200 212 260 224 Q306 232 320 250 L320 258 Q200 230 -10 246z', '#fff', ' opacity=".15"');
    return {g: `<g class="ol">${g}</g>`, top: 236}; },
  haybale: (c, L) => { const h = sc2Nt(L, '#e2c46a', '#5a4e2a'); let g = rc(-10, 208, 320, 97, h, 6); for (let k = 0; k < 60; k++){ const x = (k * 53) % 300, y = 214 + (k * 31) % 86; g += ln(x, y, x + 8, y - 2, sc2Shade(h, .3), 1, ' opacity=".5"'); } g += ln(-10, 236, 310, 236, '#8a5a33', 2) + ln(-10, 276, 310, 276, '#8a5a33', 2);
    return {g: `<g class="ol">${g}</g>`, top: 224}; },
  bistro: (c, L) => { const m = sc2Nt(L, '#3c4a44', '#1e2522'); const g = `<ellipse cx="150" cy="298" rx="80" ry="6" fill="#000" opacity=".25"/>` + rc(144, 238, 12, 62, m, 0) + pa('M110 300 h80 l-10 -8 h-60z', m) + `<ellipse cx="150" cy="226" rx="175" ry="22" fill="${m}"/><ellipse cx="150" cy="222" rx="175" ry="22" fill="${sc2Tint(m, .15)}"/>`;
    return {g: `<g class="ol">${g}</g>`, top: 228}; },
  hammock: (c, L) => { const f = c.a2; const g = pa('M-20 200 Q150 300 320 200 L320 305 L-20 305z', f) + [0, 1, 2, 3, 4].map(k => pa(`M-20 ${206 + k * 18} Q150 ${306 + k * 6} 320 ${206 + k * 18}`, 'none', ` stroke="#fff" stroke-width="2" opacity=".3"`)).join('');
    return {g: `<g class="ol">${g}</g>`, top: 262}; },
  // a low brick planter wall with a concrete cap, the kind you sit on outside a building
  brickwall: (c, L) => { const b = sc2Nt(L, '#a8553a', '#4a2a20'), cap = sc2Nt(L, '#e2ddd2', '#5a5852'); let g = `<ellipse cx="150" cy="210" rx="160" ry="6" fill="#000" opacity=".18"/>` + rc(-10, 224, 320, 81, b, 0);
    for (let k = 0; k < 6; k++){ const y = 224 + k * 14; g += ln(-10, y, 310, y, '#000', 1, ' opacity=".22"'); for (let x = (k % 2) * 18; x < 310; x += 36) g += ln(x, y, x, y + 14, '#000', 1, ' opacity=".22"'); }
    g += rc(-10, 206, 320, 18, cap, 2) + rc(-10, 222, 320, 4, '#000', 0, ' opacity=".15"');
    return {g: `<g class="ol">${g}</g>`, top: 216}; },
  // your own lap: jeans, knees up a little
  lap: (c, L) => { const j = sc2Nt(L, '#3d5a80', '#1e2c40'); const g = pa('M-10 305 L-10 236 Q40 214 120 226 L150 232 L180 226 Q260 214 310 236 L310 305z', j) + pa('M150 232 L150 305', 'none', ' stroke="#000" stroke-width="2" opacity=".25"') + pa('M30 244 q30 -10 60 0 M210 244 q30 -10 60 0', 'none', ' stroke="#fff" stroke-width="2" opacity=".15"');
    return {g: `<g class="ol">${g}</g>`, top: 238}; },
  // a seatback tray table, folded down
  tray: (c, L) => { const t = sc2Nt(L, '#c9ccd1', '#55595f'); const g = rc(10, 252, 280, 60, sc2Shade(t, .35), 0) + rc(-10, 206, 320, 32, t, 6) + rc(-10, 234, 320, 8, sc2Shade(t, .2), 0) + rc(130, 210, 40, 5, sc2Shade(t, .25), 2);
    return {g: `<g class="ol">${g}</g>`, top: 224}; },
  // a train's little table between facing seats
  traintable: (c, L) => { const t = sc2Nt(L, '#d8d2c4', '#4a4840'); const g = rc(84, 240, 18, 65, '#55595f', 0) + rc(-10, 206, 196, 30, t, 6) + rc(-10, 232, 196, 7, sc2Shade(t, .25), 3);
    return {g: `<g class="ol">${g}</g>`, top: 222, areas: [[6, 182, 222, 1.3]]}; },
  carseat: () => ({g: '', top: 248, areas: [[192, 212, 256, .7, 1], [264, 304, 238, .8]]}),
  // the plane's tray table, folded down on its two arms from the seat in front
  planetray: (c, L) => { const t = sc2Nt(L, '#c9ccd1', '#55595f'); const g = rc(30, 196, 8, 30, '#55595f', 2) + rc(196, 196, 8, 30, '#55595f', 2) + rc(18, 212, 198, 34, t, 6) + rc(18, 242, 198, 7, sc2Shade(t, .25), 3) + rc(96, 216, 40, 5, sc2Shade(t, .2), 2);
    return {g: `<g class="ol">${g}</g>`, top: 230, areas: [[24, 212, 230, 1.15]]}; },
  // the bus seat you're on, with room beside you for your things
  busseat: (c, L) => { const st = sc2Nt(L, '#3f6fa0', '#1e3550'); let g = rc(-10, 248, 320, 60, st, 10) + rc(-10, 248, 320, 8, sc2Tint(st, .1), 6) + ln(150, 252, 150, 305, '#000', 2, ' opacity=".25"');
    for (let k = 0; k < 14; k++) g += ci(10 + k * 22, 280, 2, '#000', ' opacity=".18"');
    return {g: `<g class="ol">${g}</g>`, top: 262, areas: [[156, 296, 262, 1.1], [20, 140, 262, 1.1]]}; },
  none: () => ({g: '', top: 262, areas: []}),
  lappass: () => ({g: '', top: 236, areas: [[64, 84, 276, .7, 1], [150, 290, 232, 1.05]]}),
  dockfront: () => ({g: '', top: 262})
};
// each place: (S, c, L, r, id) => {HY, g, surf}
const SC2_OUT = {
  rooftop: (S, c, L, r, id) => { const HY = 150;
    // the skyline stands behind the roof's own low wall, so the buildings' bottoms are hidden behind it
    let g = sc2Bldg(-4, HY, 50, 90, '#8b93a7', L) + sc2Bldg(44, HY, 40, 116, '#9aa3b5', L) + sc2Bldg(84, HY, 50, 70, '#a5adbd', L) + sc2Bldg(176, HY, 46, 102, '#8b93a7', L) + sc2Bldg(220, HY, 84, 80, '#a5adbd', L);
    g += `<g class="ol">${rc(98, HY - 100, 3, 30, '#55595f', 0)}${rc(117, HY - 100, 3, 30, '#55595f', 0)}${ln(98, HY - 70, 120, HY - 90, '#55595f', 1.5)}${rc(94, HY - 130, 30, 32, sc2Nt(L, '#8a5a33', '#3a2a1e'), 2)}${pa(`M92 ${HY - 130} l17 -12 l17 12z`, sc2Nt(L, '#6b4429', '#2a1e14'))}</g>`;   // a water tower standing on the roof of the low building
    g += sc2Ground('deck', HY, L) + `<g class="ol">${rc(-5, 122, 310, 28, sc2Nt(L, '#bdb8ae', '#45444a'), 0)}${rc(-5, 118, 310, 6, sc2Nt(L, '#d8d2c4', '#55534e'), 1)}</g>` + sc2Railing(96, 22, '#2f3236') + sc2Lights(92);
    g += `<g class="ol">${rc(214, HY + 8, 60, 34, sc2Nt(L, '#c9ccd1', '#4a4f56'), 2)}${[0, 1, 2, 3].map(k => ln(220 + k * 14, HY + 14, 220 + k * 14, HY + 36, '#7d848b', 2)).join('')}</g>` + sc2Folk(66, HY + 14, .8, S.seed + 381, {back: true});   // someone at the wall looking out at the city
    return {HY, g, surf: 'parkbench'}; },
  balcony: (S, c, L, r, id) => { const HY = 168; let g = sc2Bldg(70, 150, 50, 96, '#8b93a7', L) + sc2Bldg(118, 150, 44, 120, '#9aa3b5', L) + sc2Bldg(160, 150, 60, 84, '#a5adbd', L) + sc2Bldg(218, 150, 40, 104, '#8b93a7', L) + rc(60, 150, 200, 20, sc2Nt(L, '#6f7686', '#2a2e38'), 0);
    g += `<g class="ol">${rc(-5, 0, 70, 305, sc2Nt(L, '#d9cbb4', '#4a4238'), 0)}${rc(6, 30, 50, HY - 30, sc2Nt(L, '#cfe3ef', '#2a3444'), 1)}${ln(31, 30, 31, HY, '#e8e3d8', 3)}${rc(250, 0, 55, 305, sc2Nt(L, '#d9cbb4', '#4a4238'), 0)}</g>`;
    g += sc2Ground('deck', HY, L, sc2Nt(L, '#b9b2a2', '#3c3a36')) + `<g class="ol">${rc(60, 120, 192, 5, '#2f3236', 1)}${rc(60, 125, 192, HY - 125, '#cfe3ef', 0, ' opacity=".35"')}</g>` + `<g class="ol" transform="translate(206 ${HY + 4}) scale(1.4)">${SC.PROP.plant.d(c)}</g>`;
    return {HY, g, surf: 'bistro'}; },
  porch: (S, c, L, r, id) => { const HY = 150; let g = sc2Ground('grass', 120, L) + sc2Tree(40, 133, 1.1, L, 0) + sc2Tree(150, 128, .8, L, 1) + sc2Tree(250, 134, 1.2, L, 2) + `<g class="ol">${pa('M0 120 h300', 'none', ' stroke="#6b5a3a" stroke-width="2"')}</g>`;
    g += sc2Ground('deck', HY, L, sc2Nt(L, '#a7825a', '#3a2c20')) + sc2Railing(116, 34, sc2Nt(L, '#f4f1ea', '#8a8780'), -5, 305, 16) + `<g class="ol">${rc(-5, 0, 310, 24, sc2Nt(L, '#f4f1ea', '#5a5852'), 0)}${rc(-5, 24, 310, 6, sc2Nt(L, '#d9d4c8', '#44423e'), 0)}${rc(10, 30, 12, HY - 30, '#f4f1ea', 0)}${rc(278, 30, 12, HY - 30, '#f4f1ea', 0)}</g>` + sc2Lights(34);
    g += `<g class="ol">${pa(`M226 ${HY + 30} q20 6 40 0`, 'none', ' stroke="#6b4429" stroke-width="3"')}${rc(230, HY - 10, 32, 30, '#8a5a33', 3)}${rc(228, HY + 8, 36, 8, '#8a5a33', 2)}${rc(232, HY + 16, 4, 14, '#6b4429', 0)}${rc(256, HY + 16, 4, 14, '#6b4429', 0)}</g>`;
    return {HY, g, surf: 'picnic'}; },
  quad: (S, c, L, r, id) => { const HY = 132; let g = sc2Bldg(-6, HY, 90, 70, '#b5653f', L, {roof: 20, door: 1}) + `<g class="ol">${rc(120, HY - 110, 34, 110, sc2Nt(L, '#c9a26a', '#4a3c2a'), 0)}${pa(`M116 ${HY - 110} l21 -24 l21 24z`, sc2Nt(L, '#5a6a7a', '#2a2f38'))}${ci(137, HY - 86, 9, '#f4f1ea')}</g>` + sc2Bldg(200, HY, 106, 62, '#a0583a', L, {roof: 16, door: 1});
    g += sc2Ground('grass', HY, L) + pa(`M120 ${HY} L150 ${HY} L230 305 L40 305z`, sc2Nt(L, '#d8d0bf', '#3a3a3a'), ' opacity=".9"') + sc2Tree(96, HY + 10, .7, L, 1) + sc2Tree(184, HY + 12, .8, L, 2);
    g += sc2Folk(250, HY + 30, .55, S.seed + 301, {sit: true}) + sc2Folk(268, HY + 30, .55, S.seed + 302, {sit: true}) + `<ellipse cx="60" cy="${HY + 22}" rx="7" ry="2.5" fill="#e8dcc8"/>` + sc2Folk(30, HY + 34, .55, S.seed + 303, {});
    return {HY, g, surf: 'blanket'}; },
  bench: (S, c, L, r, id) => { const HY = 140; let g = sc2Bldg(130, HY, 120, 84, '#b5653f', L, {roof: 18, door: 1}) + sc2Bldg(-6, HY, 70, 60, '#c9a26a', L) + sc2Ground('grass', HY, L) + sc2Tree(90, HY + 12, 1, L, 0) + sc2Tree(272, HY + 14, 1, L, 2);
    g += pa(`M-5 ${HY + 18} L305 ${HY + 8} L305 ${HY + 40} L-5 ${HY + 56}z`, sc2Nt(L, '#d8d0bf', '#3a3a3a')) + sc2Lamppost(60, HY + 50, 1, L) + sc2Folk(170, HY + 34, .6, S.seed + 311, {}) + sc2Folk(210, HY + 32, .58, S.seed + 312, {});
    return {HY, g, surf: 'parkbench'}; },
  park: (S, c, L, r, id) => { const HY = 140; let g = sc2Ground('grass', HY, L) + sc2Tree(80, HY + 8, .9, L, 1) + sc2Tree(230, HY + 10, 1, L, 2) + sc2Tree(20, HY + 18, 1.3, L, 0) + sc2Tree(290, HY + 20, 1.4, L, 3);
    g += `<ellipse cx="150" cy="${HY + 20}" rx="70" ry="10" fill="${sc2Nt(L, '#5fa8d3', '#1a3040')}"/>` + pa(`M150 ${HY + 30} Q60 ${HY + 50} 30 305 h120 Q120 ${HY + 60} 170 ${HY + 32}z`, sc2Nt(L, '#d8c9a8', '#3a3a3a')) + sc2Folk(118, HY + 44, .6, S.seed + 321, {}) + `<g class="ol">${rc(124, HY + 36, 12, 7, '#c9955b', 3)}${rc(124, HY + 43, 2, 4, '#5d3b25', 0)}${rc(133, HY + 43, 2, 4, '#5d3b25', 0)}</g>`;
    return {HY, g, surf: 'picnic'}; },
  lake: (S, c, L, r, id) => { const HY = 140; let g = pa(`M-5 ${HY} L40 100 L90 ${HY - 14} L140 96 L210 ${HY - 8} L260 104 L305 ${HY}z`, sc2Nt(L, '#1c2c3a', '#6f8fa8')) + [10, 40, 70, 110, 160, 200, 240, 280].map((x, k) => sc2Pine(x, HY, .5 + (k % 3) * .1, L)).join('');
    g += sc2Ground('water', HY, L) + `<g class="ol">${pa(`M200 ${HY + 18} q18 6 36 0 l-4 5 h-28z`, '#c0392b')}</g>` + pa(`M120 ${HY + 30} L180 ${HY + 30} L330 305 L-30 305z`, sc2Nt(L, '#3a2c20', '#a0764c')) + [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = 120 + 60 * k / 8; return ln(a, HY + 30, -30 + 360 * k / 8, 305, '#000', 1.2, ' opacity=".3"'); }).join('') + `<g class="ol">${rc(118, HY + 22, 5, 12, '#5d3b25', 0)}${rc(177, HY + 22, 5, 12, '#5d3b25', 0)}</g>`;
    return {HY, g, surf: 'dockfront'}; },
  beach: (S, c, L, r, id) => { const HY = 130; let g = sc2Ground('water', HY, L, sc2Nt(L, '#13304a', '#2f7fb5')) + pa(`M-5 ${HY + 46} q40 -8 80 0 t80 0 t80 0 t80 0 V305 H-5z`, '#fff', ' opacity=".8"') + sc2Ground('sand', HY + 50, L).replace(/<rect x="-5" y="[\d.]+"/, m => m) ;
    g += `<g class="ol">${ln(244, 238, 226, 90, '#f4f1ea', 3)}${pa('M178 98 Q226 54 280 82 Q230 78 178 98z', '#d24a6a')}${pa('M178 98 Q226 54 280 82', 'none', ' stroke="#fff" stroke-width="2"')}</g>` + `<g class="ol">${pa(`M40 ${HY + 66} q10 -12 20 0z`, '#f2c14e')}</g>` + sc2Folk(90, HY + 62, .55, S.seed + 331, {});
    return {HY, g, surf: 'towel'}; },
  hammock: (S, c, L, r, id) => { const HY = 150; let g = sc2Ground('grass', HY, L) + sc2Tree(110, HY + 8, .7, L, 1) + sc2Tree(190, HY + 9, .75, L, 3) + `<g class="ol">${rc(-6, 0, 30, 305, '#6b4a30', 2)}${rc(276, 0, 30, 305, '#6b4a30', 2)}${ci(10, -10, 60, sc2Nt(L, '#16301f', '#4c9a5c'))}${ci(290, -10, 60, sc2Nt(L, '#16301f', '#5aa469'))}</g>` + pa('M22 140 L-10 204 M278 140 L310 204', 'none', ' stroke="#e8dcc8" stroke-width="2.5"');
    return {HY, g, surf: 'hammock'}; },
  stadium: (S, c, L, r, id) => {
    // up in the stands looking down at the field: the far stands, the field with its yard lines running toward you, rows of bleachers below you
    const HY = 100, F1 = 172, n = sc2N(L), vx = 150, X = (x, y) => vx + (x - vx) * (.62 + (y - HY) / (F1 - HY) * .38);
    let g = rc(-5, 34, 310, HY - 34, n ? '#2a2e38' : '#8a93a5', 0);
    for (let k = 0; k < 6; k++) g += rc(-5, 38 + k * 10, 310, 6, n ? '#3a404c' : (k % 2 ? '#3f6fa0' : '#4a7ab0'), 0);
    g += [60, 150, 240].map(x => rc(x - 4, 34, 8, HY - 34, n ? '#22262e' : '#c9ccd1', 0)).join('') + sc2Folk(30, 76, .32, S.seed + 371, {sit: true}) + sc2Folk(196, 66, .32, S.seed + 372, {sit: true}) + sc2Folk(110, 86, .32, S.seed + 373, {sit: true});
    g += `<g class="ol">${rc(110, 6, 80, 26, '#1b1d20', 2)}</g>` + tx(130, 23, 'HOME 0', 7, '#f2d27a') + tx(170, 23, 'AWAY 0', 7, '#f2d27a') + [16, 284].map(x => `<g class="ol">${rc(x - 2, 0, 4, 34, '#55595f', 0)}${rc(x - 14, -4, 28, 12, n ? '#fff8d0' : '#e8e3d8', 1)}</g>`).join('');
    // the field: mowing stripes and yard lines both run toward you
    g += rc(-5, HY, 310, F1 - HY, n ? '#1d4a2a' : '#4c9a5c', 0);
    for (let k = -12; k <= 12; k++){ const a = 150 + k * 22, b = a + 11; if (k % 2 === 0) g += pa(`M${X(a, HY)} ${HY} L${X(b, HY)} ${HY} L${X(b, F1)} ${F1} L${X(a, F1)} ${F1}z`, '#fff', ' opacity=".07"'); }
    for (let k = -6; k <= 6; k++){ const a = 150 + k * 44; g += ln(X(a, HY + 4), HY + 4, X(a, F1 - 6), F1 - 6, '#fff', 1.6, ' opacity=".8"'); }
    g += ln(-5, HY + 4, 305, HY + 4, '#fff', 2, ' opacity=".85"') + ln(-5, F1 - 6, 305, F1 - 6, '#fff', 2.5, ' opacity=".85"') + tx(X(106, 140), 140, '40', 9, '#fff', ' opacity=".8"') + tx(X(194, 140), 140, '40', 9, '#fff', ' opacity=".8"');
    // the rows below you, getting bigger as they get closer
    [[F1, 10], [F1 + 14, 12], [F1 + 30, 14]].forEach(([y, h], k) => { g += rc(-5, y, 310, h * .5, n ? '#2a2e33' : '#55595f', 0) + rc(-5, y + h * .5, 310, h * .6, n ? '#4a4f56' : '#c3c9cf', 1); });
    return {HY: 34, g, surf: 'bleacher'}; },
  courtyard: (S, c, L, r, id) => { const HY = 140; let g = sc2Bldg(-6, HY, 312, 96, '#b5653f', L) + [40, 110, 180, 250].map(x => `<g class="ol">${pa(`M${x - 18} ${HY} V${HY - 36} q18 -22 36 0 V${HY}z`, sc2Nt(L, '#4a3a30', '#1c1f28'))}</g>`).join('');
    g += sc2Ground('paver', HY, L) + `<g class="ol"><ellipse cx="150" cy="${HY + 34}" rx="56" ry="12" fill="${sc2Nt(L, '#bdb8ae', '#55595f')}"/>${rc(94, HY + 34, 112, 14, sc2Nt(L, '#a9a49a', '#4a4840'), 0)}<ellipse cx="150" cy="${HY + 34}" rx="48" ry="8" fill="${sc2Nt(L, '#5fa8d3', '#1a3040')}"/>${rc(146, HY + 2, 8, 32, sc2Nt(L, '#bdb8ae', '#55595f'), 1)}</g>` + pa(`M150 ${HY + 2} q-14 -16 -24 8 M150 ${HY + 2} q14 -16 24 8`, 'none', ' stroke="#9fd3f0" stroke-width="2"') + sc2Tree(26, HY + 44, .8, L, 0) + sc2Tree(276, HY + 44, .8, L, 2);
    return {HY, g, surf: 'bistro'}; },
  bikerack: (S, c, L, r, id) => { const HY = 140; let g = sc2Bldg(-6, HY, 180, 92, '#b5653f', L, {roof: 0, door: 1}) + sc2Ground('paver', HY, L) + sc2Tree(226, HY + 12, 1.1, L, 1);
    g += [0, 1, 2, 3, 4].map(k => { const x = 40 + k * 46, col = [c.a1, '#c0392b', '#2f3a48', c.a3, '#2e7d5b'][k]; return k === 3 ? '' : `<g class="ol" fill="none" stroke="${col}" stroke-width="2.5">${ci(x - 14, HY + 50, 11, 'none', ` stroke="#2f3236" stroke-width="2.5"`)}${ci(x + 14, HY + 50, 11, 'none', ` stroke="#2f3236" stroke-width="2.5"`)}${pa(`M${x - 14} ${HY + 50} L${x - 2} ${HY + 32} L${x + 12} ${HY + 32} L${x + 14} ${HY + 50} M${x - 2} ${HY + 32} L${x} ${HY + 50} L${x - 14} ${HY + 50} M${x + 12} ${HY + 32} l-2 -6`, 'none', ` stroke="${col}" stroke-width="2.5"`)}</g>`; }).join('') + `<g class="ol">${rc(10, HY + 58, 220, 4, '#8a8f96', 1)}</g>`;
    return {HY, g, surf: 'brickwall'}; },
  steps: (S, c, L, r, id) => { const HY = 110; let g = `<g class="ol">${rc(10, 0, 280, HY, sc2Nt(L, '#e2dccd', '#4a4840'), 0)}${pa('M0 22 L150 -10 L300 22z', sc2Nt(L, '#cfc8b6', '#3a3832'))}${rc(0, 22, 300, 8, sc2Nt(L, '#cfc8b6', '#3a3832'), 0)}${[30, 86, 142, 198, 254].map(x => rc(x, 30, 18, HY - 30, sc2Nt(L, '#f1ede2', '#55524a'), 0)).join('')}${rc(130, 60, 40, HY - 60, sc2Nt(L, '#5d3b25', '#1c1f28'), 0)}</g>` + tx(150, 18, 'LIBRARY', 8, sc2Nt(L, '#6b6358', '#bbb'));
    for (let k = 0; k < 7; k++){ const y = HY + k * 14 + k * k * .8; g += rc(-5, y, 310, 14 + k * 1.6, sc2Nt(L, k % 2 ? '#cfc8b6' : '#ddd6c6', k % 2 ? '#45433c' : '#4e4c44'), 0) + ln(-5, y, 305, y, '#000', 1, ' opacity=".2"'); }
    g += sc2Folk(64, HY + 44, .6, S.seed + 341, {sit: true}) + sc2Folk(232, HY + 62, .66, S.seed + 342, {sit: true}) + sc2Folk(180, HY + 24, .5, S.seed + 343, {});
    return {HY, g, surf: 'step'}; },
  farm: (S, c, L, r, id) => { const HY = 140; let g = sc2Ground('grass', HY - 20, L) + `<g class="ol">${rc(190, HY - 66, 70, 50, sc2Nt(L, '#5a1e1a', '#b03a2e'), 0)}${pa(`M186 ${HY - 66} l39 -26 l39 26z`, sc2Nt(L, '#2a2422', '#6b2a22'))}${rc(214, HY - 46, 22, 30, sc2Nt(L, '#2a1a14', '#f4f1ea'), 0)}${pa(`M214 ${HY - 46} l22 30 M236 ${HY - 46} l-22 30`, 'none', ` stroke="${sc2Nt(L, '#5a1e1a', '#b03a2e')}" stroke-width="2"`)}${rc(264, HY - 88, 24, 72, sc2Nt(L, '#3a3f45', '#c9ccd1'), 0)}${pa(`M264 ${HY - 88} q12 -16 24 0z`, sc2Nt(L, '#3a3f45', '#a9aeb4'))}</g>` + sc2Tree(40, HY - 10, .8, L, 0);
    g += sc2Ground('field', HY, L) + `<g class="ol">${rc(-5, HY - 6, 310, 3, '#8a6448', 0)}${rc(-5, HY + 2, 310, 3, '#8a6448', 0)}${[0, 1, 2, 3, 4, 5, 6].map(k => rc(k * 50, HY - 14, 4, 22, '#7a5638', 0)).join('')}</g>`;
    return {HY, g, surf: 'haybale'}; },
  garden: (S, c, L, r, id) => { const HY = 140; let g = sc2Ground('grass', HY, L) + `<g class="ol">${pa(`M170 ${HY} V${HY - 60} l40 -24 l40 24 V${HY}z`, sc2Nt(L, '#dcefe8', '#2a3444'), ' opacity=".95"')}${ln(210, HY - 84, 210, HY, '#9aa1a8', 2)}${ln(170, HY - 30, 250, HY - 30, '#9aa1a8', 2)}</g>` + sc2Tree(110, HY + 8, .8, L, 2) + sc2Tree(40, HY + 12, 1, L, 0) + sc2Tree(286, HY + 12, .9, L, 1);
    g += [[10, HY + 16, 110], [180, HY + 16, 110], [40, HY + 48, 90]].map(([x, y, w], k) => `<g class="ol">${rc(x, y, w, 14, '#7a5638', 1)}${rc(x + 3, y - 3, w - 6, 5, '#4a3626', 1)}</g>` + [...Array(Math.floor(w / 14))].map((_, j) => ci(x + 8 + j * 14, y - 6, 4.5, sc2Nt(L, '#1d3b2c', '#4c9a5c')) + (j % 2 ? ci(x + 8 + j * 14, y - 9, 2.2, ['#e57399', '#f2c14e', '#e8f0f2', '#b05ad0'][(j + k) % 4], ' stroke="none"') : '')).join('')).join('') + sc2Folk(230, HY + 32, .55, S.seed + 351, {});
    return {HY, g, surf: 'parkbench'}; },
  trail: (S, c, L, r, id) => { const HY = 150; let g = pa(`M-5 ${HY} L50 70 L100 120 L160 54 L230 116 L280 80 L305 ${HY}z`, sc2Nt(L, '#232a3e', '#8d9ab3')) + pa('M150 62 L160 54 L172 66 L164 64z M42 80 L50 70 L58 82z', '#fff', ' opacity=".9"') + pa(`M-5 ${HY} L60 110 L130 140 L200 104 L305 ${HY}z`, sc2Nt(L, '#1a2a24', '#5c8a6a'));
    g += rc(-5, HY, 310, 40, sc2Nt(L, '#16241c', '#4f7d58'), 0) + [...Array(14)].map((_, k) => sc2Pine(10 + k * 22, HY + 8 + (k % 3) * 6, .45 + (k % 2) * .1, L)).join('') + rc(-5, HY + 28, 310, 80, sc2Nt(L, '#2a2a28', '#8a857a'), 0) + sc2Railing(HY + 6, 26, '#6b4429', -5, 305, 40);
    return {HY, g, surf: 'rock'}; },
  busstop: (S, c, L, r, id) => { const HY = 150; let g = sc2Bldg(-6, 110, 80, 90, '#8b93a7', L, {door: 1}) + sc2Bldg(74, 110, 70, 70, '#b5653f', L, {door: 1}) + sc2Bldg(144, 110, 90, 96, '#9aa3b5', L, {door: 1}) + sc2Bldg(234, 110, 72, 80, '#a0583a', L, {door: 1}) + rc(-5, 110, 310, 8, sc2Nt(L, '#c9c2b4', '#3a3a40'), 0);
    g += rc(-5, 118, 310, HY - 118, sc2Nt(L, '#4a4a4e', '#222228'), 0) + [...Array(8)].map((_, k) => rc(k * 42, 132, 20, 3, '#f2d27a', 0)).join('') + `<g class="ol">${rc(186, 92, 120, 40, '#e0a630', 6)}${[0, 1, 2, 3].map(k => rc(196 + k * 26, 98, 20, 14, '#2a3444', 2)).join('')}${ci(206, 132, 8, '#1b1d20')}${ci(280, 132, 8, '#1b1d20')}${rc(196, 118, 104, 3, '#1b1d20', 0)}</g>`;
    g += sc2Ground('concrete', HY, L) + `<g class="ol">${rc(-5, 0, 310, 14, sc2Nt(L, '#2f3236', '#55595f'), 0)}${rc(-5, 14, 8, 290, '#55595f', 0)}${rc(297, 14, 8, 290, '#55595f', 0)}</g>` + rc(3, 14, 40, HY + 40, '#cfe3ef', 0, ' opacity=".25"') + `<g class="ol">${rc(250, 30, 40, 60, sc2Nt(L, '#f4f1ea', '#fff'), 1)}</g>` + tx(270, 46, 'ROUTE 4', 6, '#c0392b') + tx(270, 60, 'every 15', 5, '#555');
    return {HY, g, surf: 'parkbench', wood: '#8a9098'}; },
  parkinglot: (S, c, L, r, id) => {
    // the top deck: a row of stalls against the far wall (lines run toward you), cars parked inside them, the skyline past the wall
    const HY = 128, B = 190, vx = 150, X = (x, y) => vx + (x - vx) * (1 + (y - HY) / (B - HY) * .45);
    let g = sc2Bldg(-6, HY, 60, 96, '#8b93a7', L) + sc2Bldg(54, HY, 50, 66, '#a5adbd', L) + sc2Bldg(104, HY, 44, 112, '#9aa3b5', L) + sc2Bldg(148, HY, 70, 84, '#8b93a7', L) + sc2Bldg(218, HY, 88, 60, '#a5adbd', L);
    g += sc2Ground('concrete', HY, L) + `<g class="ol">${rc(-5, HY - 12, 310, 12, sc2Nt(L, '#bdb8ae', '#45444a'), 0)}</g>`;
    const xs = [-30, 30, 90, 150, 210, 270, 330], yl = HY + 44;
    xs.forEach(x => { g += ln(X(x, HY + 2), HY + 2, X(x, yl), yl, '#f2d27a', 2); });
    g += ln(X(-30, yl), yl, X(330, yl), yl, '#f2d27a', 1.5, ' opacity=".0"');
    [[60, '#c0392b'], [180, '#3f6fa0'], [240, '#e8e3d8']].forEach(([x, col]) => { const cx = X(x, HY + 24), w = 44; g += `<g class="ol">${rc(cx - w / 2, HY + 10, w, 20, col, 6)}${rc(cx - w / 2 + 6, HY + 1, w - 12, 13, col, 5)}${rc(cx - w / 2 + 9, HY + 4, w - 18, 8, '#cfe3ef', 2)}${rc(cx - w / 2 + 3, HY + 16, 8, 4, '#f6d77a', 1)}${rc(cx + w / 2 - 11, HY + 16, 8, 4, '#f6d77a', 1)}${rc(cx - w / 2 + 3, HY + 30, 7, 5, '#1b1d20', 1)}${rc(cx + w / 2 - 10, HY + 30, 7, 5, '#1b1d20', 1)}</g>`; });
    g += pa(`M150 ${HY + 62} l-8 0 l0 -10 l-6 0 l14 -12 l14 12 l-6 0 l0 10z`, '#f4f1ea', ' opacity=".7"');
    return {HY, g, surf: 'ledge'}; },
  planetarium: (S, c, L, r, id) => { const HY = 150; let g = `<g class="ol">${pa(`M70 ${HY - 40} A80 80 0 0 1 230 ${HY - 40}z`, sc2Nt(L, '#c9ccd1', '#e8ecef'))}${rc(60, HY - 40, 180, 40, sc2Nt(L, '#55595f', '#b9bec4'), 0)}${rc(126, HY - 30, 48, 30, sc2Nt(L, '#2a3444', '#ffe08a'), 1)}${ln(150, HY - 30, 150, HY, '#55595f', 2)}</g>` + tx(150, HY - 46, 'PLANETARIUM', 8, '#2f3236');
    g += sc2Ground('grass', HY, L) + pa(`M126 ${HY} L174 ${HY} L230 305 L70 305z`, sc2Nt(L, '#d8d0bf', '#3a3a3a')) + sc2Lamppost(40, HY + 30, 1, L) + sc2Lamppost(262, HY + 30, 1, L) + sc2Folk(110, HY + 26, .55, S.seed + 361, {});
    return {HY, g, surf: 'parkbench'}; },
  observatory: (S, c, L, r, id) => { const HY = 168; let g = `<g class="ol">${rc(206, HY - 60, 100, 60, sc2Nt(L, '#c9ccd1', '#55595f'), 0)}${pa(`M206 ${HY - 60} A50 50 0 0 1 306 ${HY - 60}z`, sc2Nt(L, '#e8ecef', '#8a8f96'))}${rc(246, HY - 108, 14, 48, sc2Nt(L, '#1b1d20', '#2a3444'), 0)}</g>`;
    g += sc2Ground('concrete', HY, L) + sc2Railing(HY - 40, 40, '#55595f', -5, 200, 22) + `<g class="ol">${pa(`M100 ${HY + 30} L120 ${HY - 30} L140 ${HY + 30} M120 ${HY - 30} L120 ${HY + 30}`, 'none', ' stroke="#2f3236" stroke-width="3"')}<g transform="rotate(-30 120 ${HY - 34})">${rc(76, HY - 44, 96, 18, '#f4f1ea', 6)}${rc(166, HY - 46, 12, 22, '#2f3236', 3)}</g></g>`;
    return {HY, g, surf: 'ledge'}; }
};

// the inside of a long cabin in one-point perspective. vx, vy: where the lines meet. A thing at depth s (1 = right in front of you,
// smaller = farther) sits at x = vx + X * s, y = vy + Y * s, so everything shrinks toward (vx, vy) together.
function sc2Cabin(o){
  const {id, L, r, vx, vy, s0, wallL, wallR, ceil, floor, view, winTop, winBot, wins, end} = o;
  const P = (X, Y, s) => [vx + X * s, vy + Y * s], pt = a => `${a[0].toFixed(1)} ${a[1].toFixed(1)}`;
  const X0 = o.halfL, X1 = o.halfR, Yc = o.top, Yf = o.bottom, S1 = 3;               // the cabin's walls, ceiling and floor in "world" units
  const box = s => [P(-X0, Yc, s), P(X1, Yc, s), P(X1, Yf, s), P(-X0, Yf, s)];
  const n = box(S1), f = box(s0);
  let g = `<path d="M${pt(n[0])} L${pt(n[1])} L${pt(f[1])} L${pt(f[0])}z" fill="${ceil}"/>` + `<path d="M${pt(n[3])} L${pt(n[2])} L${pt(f[2])} L${pt(f[3])}z" fill="${floor}"/>`;
  g += `<path d="M${pt(n[0])} L${pt(f[0])} L${pt(f[3])} L${pt(n[3])}z" fill="${wallL}"/>` + `<path d="M${pt(n[1])} L${pt(f[1])} L${pt(f[2])} L${pt(n[2])}z" fill="${wallR}"/>`;
  g += `<path d="M${pt(f[0])} L${pt(f[1])} L${pt(f[2])} L${pt(f[3])}z" fill="${end}"/>`;
  // windows along both walls: each one a quad between two depths
  let clip = '', frames = '';
  (wins || []).forEach(([a, b]) => [[-X0, 1], [X1, 1]].forEach(([X]) => { const q = [P(X, winTop, a), P(X, winTop, b), P(X, winBot, b), P(X, winBot, a)]; const d = `M${pt(q[0])} L${pt(q[1])} L${pt(q[2])} L${pt(q[3])}z`; clip += `<path d="${d}"/>`; frames += `<path d="${d}" fill="none" stroke="#2f3236" stroke-width="${(3 * a).toFixed(1)}" stroke-linejoin="round"/>`; }));
  if (clip) g += `<defs><clipPath id="${id}cw">${clip}</clipPath></defs><g clip-path="url(#${id}cw)">${scView(view, L, id, r, -5, -5, 310, vy + winBot * 1.2 + 10)}</g>` + frames;
  return {g, P, pt};
}
// a frame from a movie, a different kind of scene for each genre, with the progress bar
function sc2Movie(R, x, y, w, h){
  const gen = Math.floor(R() * 7), X = f => x + w * f, Y = f => y + h * f, bar = rc(x, y + h - 5, w, 5, '#000', 0, ' opacity=".6"') + rc(x + 2, y + h - 3.5, (w - 4) * (.15 + R() * .75), 2, '#ff4a4a', 0);
  let g = '';
  switch (gen){
    case 0: g = rc(x, y, w, h, '#f3a04a', 2) + ci(X(.55), Y(.5), h * .32, '#ffd166', ' stroke="none"') + ci(X(.55), Y(.5), h * .18, '#fff3c4', ' stroke="none"') + rc(X(.1), Y(.7), w * .3, h * .14, '#2a2a2a', 2, ' stroke="none"') + ci(X(.15), Y(.84), 2, '#111', ' stroke="none"') + ci(X(.35), Y(.84), 2, '#111', ' stroke="none"'); break;     // action: an explosion behind a car
    case 1: g = rc(x, y, w, h, '#f6b8c8', 2) + ci(X(.38), Y(.45), 5, '#f2c79a', ' stroke="none"') + ci(X(.62), Y(.45), 5, '#8d5524', ' stroke="none"') + rc(X(.38) - 5, Y(.45) + 5, 10, 12, '#7a2e3a', 3, ' stroke="none"') + rc(X(.62) - 5, Y(.45) + 5, 10, 12, '#3f6fa0', 3, ' stroke="none"') + tx(X(.5), Y(.3), '♥', 8, '#e0245e'); break;     // romance
    case 2: g = rc(x, y, w, h, '#14182a', 2) + ci(X(.75), Y(.28), 5, '#f4f1d0', ' stroke="none"') + pa(`M${X(.2)} ${Y(.9)} V${Y(.5)} l${w * .14} ${-h * .2} l${w * .14} ${h * .2} V${Y(.9)}z`, '#05060c', ' stroke="none"') + rc(X(.3), Y(.6), 3, 4, '#ffd166', 0, ' stroke="none"'); break;     // horror: a dark house under the moon
    case 3: g = rc(x, y, w, h, '#0b0d22', 2) + ci(X(.75), Y(.7), h * .35, '#c46a3a', ' stroke="none"') + [.1, .3, .5, .2, .6].map((f, i) => ci(X(f), Y(.15 + i * .12), .8, '#fff', ' stroke="none"')).join('') + pa(`M${X(.25)} ${Y(.42)} l12 -3 l4 3 l-4 3z`, '#c9ccd1', ' stroke="none"'); break;     // sci-fi: a ship near a planet
    case 4: g = rc(x, y, w, h, '#8fd3ff', 2) + ci(X(.8), Y(.25), 5, '#ffd166', ' stroke="none"') + ci(X(.3), Y(1.05), h * .5, '#7ac943', ' stroke="none"') + ci(X(.8), Y(1.1), h * .45, '#5fb33a', ' stroke="none"') + ci(X(.4), Y(.5), 5, '#ff8fab', ' stroke="none"') + ci(X(.38), Y(.48), 1, '#111', ' stroke="none"') + ci(X(.42), Y(.48), 1, '#111', ' stroke="none"'); break;     // animated: a cartoon critter on bright hills
    case 5: g = rc(x, y, w, h, '#e8894a', 2) + ci(X(.5), Y(.7), h * .28, '#ffcf6b', ' stroke="none"') + rc(x, Y(.72), w, h * .28, '#8a5a33', 0, ' stroke="none"') + pa(`M${X(.2)} ${Y(.75)} v-10 m0 4 h-3 v-3 m3 3 h3 v-4`, 'none', ' stroke="#2e5a2e" stroke-width="2.5"'); break;     // western: a cactus at sundown
    default: g = rc(x, y, w, h, '#2e6a9a', 2) + rc(x, Y(.6), w, h * .4, '#1f4f7a', 0, ' stroke="none"') + pa(`M${X(.45)} ${Y(.6)} l6 -10 l6 10z`, '#f4f1ea', ' stroke="none"') + ci(X(.7), Y(.75), 3, '#e0a630', ' stroke="none"');     // adventure: a sailboat at sea
  }
  return g + bar;
}
// what's playing on a seatback screen: the flight map with time left, a movie, a game, or a show
function sc2SeatScreen(S, x, y, w, h){
  // everything on the screen is cut off at its edges, like a real screen
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden">${sc2SeatScreen0(S, x, y, w, h)}</svg>`;
}
function sc2SeatScreen0(S, x, y, w, h){
  const R = mulberry32(S.seed ^ 0x5c4e), k = Math.floor(R() * 4);
  if (k === 0){ const hr = Math.floor(R() * 9), mn = Math.floor(R() * 60), f = .15 + R() * .7;
    return rc(x, y, w, h, '#2e4a6a', 2) + pa(`M${x + 8} ${y + h - 10} Q${x + w / 2} ${y + 4} ${x + w - 8} ${y + h - 10}`, 'none', ' stroke="#fff" stroke-width="1" stroke-dasharray="2 2" opacity=".7"') + ci(x + 8 + (w - 16) * f, y + h - 10 - Math.sin(Math.PI * f) * (h - 18) * .7, 2.2, '#ffd166', ' stroke="none"') + tx(x + w / 2, y + h - 3, `${hr}h ${String(mn).padStart(2, '0')}m left`, 5, '#fff'); }
  if (k === 1) return sc2Movie(R, x, y, w, h);
  if (k === 2){ let g = rc(x, y, w, h, '#14141c', 2); const cs = ['#e57373', '#64b5f6', '#ffd166', '#81c784', '#ba68c8'];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) if (R() < .45 + i * .08) g += rc(x + 18 + j * 7, y + 4 + i * 6, 6, 5, cs[(i + j) % 5], 0, ' stroke="none"');
    return g + tx(x + w - 8, y + 10, String(Math.floor(R() * 9000)), 4.5, '#fff'); }
  return rc(x, y, w, h, '#3a2a4a', 2) + ci(x + w * .35, y + h * .5, 7, '#f2c79a', ' stroke="none"') + rc(x + w * .35 - 7, y + h * .5 + 7, 14, 14, '#7a2e3a', 3, ' stroke="none"') + ci(x + w * .68, y + h * .5, 7, '#8d5524', ' stroke="none"') + rc(x + w * .68 - 7, y + h * .5 + 7, 14, 14, '#3f6fa0', 3, ' stroke="none"') + rc(x + 6, y + h - 9, w - 12, 6, '#000', 1, ' opacity=".5"') + rc(x + 10, y + h - 7.5, w - 20, 1.2, '#fff', 0, ' opacity=".8"') + rc(x + 10, y + h - 5, w - 28, 1.2, '#fff', 0, ' opacity=".8"');
}
// vehicles: the inside of the thing you're riding, with the view going by
const sc2Win = (id, k, L, r, x, y, w, h, rx, view, fx = true) => `<defs><clipPath id="${id}v${k}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath></defs><g clip-path="url(#${id}v${k})">${scView(view, L, id, r, x, y, w, h)}${fx ? scFx(L, r, [x, y, w, h]) : ''}</g>`;
Object.assign(SC2_OUT, {
  train: (S, c, L, r, id) => { const HY = 0, seat = sc2Nt(L, '#2f5a7a', '#1c3448');
    // a window seat at a table: the seat across from you, the windows running along the wall on your left, a wide aisle off to your right
    // with the seats on its far side running all the way down the car
    const C = sc2Cabin({id, L, r, vx: 196, vy: 104, s0: .16, halfL: 120, halfR: 190, top: -70, bottom: 120, winTop: -40, winBot: 20, wins: [[2.2, 1.2], [1, .62], [.55, .38], [.34, .25], [.23, .18]], view: 'field',
      wallL: sc2Nt(L, '#d9d4c8', '#45433c'), wallR: sc2Nt(L, '#cfc8b9', '#3c3a34'), ceil: sc2Nt(L, '#ece7dc', '#34343a'), floor: sc2Nt(L, '#6b6f75', '#2a2c30'), end: sc2Nt(L, '#c9c2b4', '#3a3832')});
    let g = C.g + `<g class="ol">${rc(190, 88, 12, 26, '#9aa1a8', 2)}${rc(192, 91, 8, 10, '#cfe3ef', 1)}</g>`;
    // the far side of the aisle: seat after seat down the car, a few heads showing over them
    [.2, .24, .29, .35, .43, .54, .7, .92, 1.25].forEach((sd, k) => { const [x0, y0] = C.P(96, -24, sd), [x1] = C.P(190, -24, sd), fl = C.P(0, 120, sd)[1];
      if (mulberry32(S.seed * 7 + k)() < .4) g += sc2Folk(x0 + (x1 - x0) * (mulberry32(S.seed + k)() < .5 ? .3 : .7), C.P(0, 34, sd)[1], sd * 1.6, S.seed + 393 + k, {back: true, sit: true});
      g += `<g class="ol">${rc(x0, y0, x1 - x0, fl - y0, seat, 8 * sd)}${rc(x0 + 4 * sd, y0 - 7 * sd, x1 - x0 - 8 * sd, 16 * sd, sc2Tint(seat, .1), 6 * sd)}${rc(x0 + 14 * sd, y0 - 5 * sd, x1 - x0 - 28 * sd, 8 * sd, '#f4f1ea', 3 * sd)}</g>`; });
    // the seat across the table from you, down to the floor, with someone in it
    const pants = ['#2c3e50', '#3d5a80', '#1b1b1b', '#5d4037', '#7a6a58', '#4a4a52'][S.seed % 6];
    g += `<g class="ol">${rc(14, 50, 160, 255, seat, 18)}${rc(26, 38, 136, 36, sc2Tint(seat, .08), 14)}${rc(54, 42, 80, 14, '#f4f1ea', 4)}${rc(14, 208, 160, 97, sc2Shade(seat, .18), 0)}</g>` + sc2Folk(94, 214, 2.3, S.seed + 391, {sit: true});
    g += `<g class="ol">${rc(8, 186, 172, 22, sc2Tint(seat, .1), 8)}${rc(4, 150, 16, 56, sc2Shade(seat, .2), 5)}${rc(168, 150, 16, 56, sc2Shade(seat, .2), 5)}</g>`;   // the seat cushion and armrests
    g += `<g class="ol">${rc(68, 236, 20, 54, pants, 4)}${rc(100, 236, 20, 54, pants, 4)}<ellipse cx="76" cy="292" rx="15" ry="7" fill="#2a2a2a"/><ellipse cx="112" cy="292" rx="15" ry="7" fill="#2a2a2a"/></g>`;   // their legs under the table
    return {HY, g, surf: 'traintable'}; },
  bus: (S, c, L, r, id) => { const HY = 0, seat = sc2Nt(L, '#3f6fa0', '#1e3550');
    // a window seat: rows of seats close together up both sides of a narrow aisle, windows all along, the windshield at the front
    const vx = 182, vy = 88;
    const C = sc2Cabin({id, L, r, vx, vy, s0: .18, halfL: 200, halfR: 200, top: -80, bottom: 120, winTop: -50, winBot: 30, wins: [[2.4, 1.1], [1, .62], [.6, .44], [.42, .33], [.32, .26], [.25, .2]], view: 'street',
      wallL: sc2Nt(L, '#d8d4cc', '#3a3d44'), wallR: sc2Nt(L, '#d0ccc4', '#363940'), ceil: sc2Nt(L, '#ece9e3', '#2a2c30'), floor: sc2Nt(L, '#55595f', '#24272b'), end: sc2Nt(L, '#2f3236', '#1b1d20')});
    let g = C.g + sc2Win(id, 0, L, r, ...C.P(-170, -60, .18), 340 * .18, 64 * .18, 2, 'street', false) + ln(...C.P(-200, -62, 3), ...C.P(-200, -62, .18), '#c9a26a', 3) + ln(...C.P(200, -62, 3), ...C.P(200, -62, .18), '#c9a26a', 3);
    // ribs on the aisle floor
    [.2, .24, .3, .38, .5, .7, 1, 1.5].forEach(sd => { g += ln(...C.P(-30, 120, sd), ...C.P(30, 120, sd), '#000', 1, ' opacity=".3"'); });
    // rows, far to near: a seat back with a grab bar, people in some of them
    [.24, .32, .44, .62, .9].forEach((sd, k) => [[-200, -32], [32, 200]].forEach(([a, b], side) => {  const [x0, y0] = C.P(a, 34, sd), [x1] = C.P(b, 34, sd), w = x1 - x0, h = C.P(0, 120, sd)[1] - y0;
      [.28, .72].forEach((f, q) => { if (mulberry32(S.seed * 13 + k * 4 + side * 2 + q)() < .38) g += sc2Folk(x0 + w * f, C.P(0, 82, sd)[1], sd * 1.6, S.seed + 395 + k * 4 + side * 2 + q, {back: true, sit: true}); });
      g += `<g class="ol">${rc(x0, y0, w, h, seat, 8 * sd)}${rc(x0, y0, w, 7 * sd, sc2Shade(seat, .25), 3 * sd)}${ln(x0 + 8 * sd, y0 - 6 * sd, x1 - 8 * sd, y0 - 6 * sd, '#c9ccd1', 4 * sd)}</g>`; }));
    // the seat right in front of you
    [[-200, -32], [32, 200]].forEach(([a, b2]) => { const sd = 1.3, [x0, y0] = C.P(a, 34, sd), [x1] = C.P(b2, 34, sd), fl = C.P(0, 120, sd)[1]; g += `<g class="ol">${rc(x0, y0, x1 - x0, fl - y0, seat, 14)}${rc(x0, y0, x1 - x0, 10, sc2Shade(seat, .25), 6)}${ln(x0 + 16, y0 - 9, x1 - 14, y0 - 9, '#c9ccd1', 5)}${rc(x1 - 18, y0 - 9, 4, 10, '#c9ccd1', 0)}${rc(x0 + 14, y0 - 9, 4, 10, '#c9ccd1', 0)}</g>`; });
    return {HY, g, surf: 'none'}; },
  plane: (S, c, L, r, id) => { const HY = 0, seat = sc2Nt(L, '#3a4a6a', '#1e2638');
    // a window seat: the seat in front with its screen and the tray folded down from it, the window on your left, the aisle and rows ahead on your right
    const vx = 200, vy = 92;
    const C = sc2Cabin({id, L, r, vx, vy, s0: .14, halfL: 150, halfR: 200, top: -60, bottom: 110, winTop: -30, winBot: 6, wins: [[1.6, 1.2], [.9, .72], [.58, .48], [.4, .34], [.29, .25]], view: 'clouds',
      wallL: sc2Nt(L, '#e8e6e1', '#3a3a3e'), wallR: sc2Nt(L, '#e2dfd8', '#36363a'), ceil: sc2Nt(L, '#f4f2ee', '#45454a'), floor: sc2Nt(L, '#5a6378', '#24272e'), end: sc2Nt(L, '#d9d6cf', '#2e2e32')});
    let g = C.g;
    // overhead bins along the right and the aisle's carpet runner
    g += `<g class="ol">${pa(`M${C.pt(C.P(200, -60, 3))} L${C.pt(C.P(200, -60, .14))} L${C.pt(C.P(200, -28, .14))} L${C.pt(C.P(130, -28, 3))}z`, sc2Nt(L, '#ece9e3', '#3a3a3e'))}</g>` + pa(`M${C.pt(C.P(30, 110, 3))} L${C.pt(C.P(80, 110, 3))} L${C.pt(C.P(80, 110, .14))} L${C.pt(C.P(30, 110, .14))}z`, sc2Nt(L, '#3f6fa0', '#1e3550'), ' opacity=".6"');
    // rows of seats on the far side of the aisle, far to near, some with people
    [.18, .22, .27, .33, .42, .55, .75, 1.05].forEach((sd, k) => { const [x, y] = C.P(104, -8, sd), w = 96 * sd, fl = C.P(0, 110, sd)[1]; if (sd < .9 && mulberry32(S.seed * 11 + k)() < .45) g += sc2Folk(x + w * (mulberry32(S.seed + k * 3)() < .5 ? .3 : .7), C.P(0, 44, sd)[1], sd * 1.2, S.seed + 401 + k, {back: true, sit: true}); g += `<g class="ol">${rc(x, y, w, fl - y, seat, 6 * sd)}${rc(x + 3 * sd, y - 5 * sd, w - 6 * sd, 12 * sd, sc2Tint(seat, .1), 4 * sd)}</g>`; });
    g += pa(`M-5 ${C.P(-150, -60, 1.6)[1]} L28 ${C.P(-150, -60, 1.38)[1]} L28 305 L-5 305z`, sc2Nt(L, '#e8e6e1', '#3a3a3e'), ' opacity="0"');
    // the seat in front of you, its screen, and the tray table on its arms
    g += `<g class="ol">${rc(24, 30, 186, 290, seat, 20)}${rc(36, 20, 162, 34, sc2Tint(seat, .1), 16)}${rc(76, 24, 84, 16, '#f4f1ea', 5)}${rc(82, 74, 72, 48, '#1b1d20', 4)}${rc(100, 140, 36, 6, '#55595f', 2)}</g>` + sc2SeatScreen(S, 86, 78, 64, 40);
    return {HY, g, surf: 'planetray'}; },
  car: (S, c, L, r, id) => (S.seed % 2 ? sc2CarPass : sc2CarIn)(S, c, L, r, id, 'parking'),
  gascar: (S, c, L, r, id) => (S.seed % 2 ? sc2CarPass : sc2CarIn)(S, c, L, r, id, 'gas'),
  ferry: (S, c, L, r, id) => { const HY = 140; let g = pa(`M-5 ${HY} L30 ${HY - 16} L80 ${HY - 8} L130 ${HY - 20} L170 ${HY - 6} L220 ${HY - 12} L305 ${HY}z`, sc2Nt(L, '#1c2c3a', '#6f8fa8')) + sc2Bldg(150, HY - 4, 20, 22, '#c9ccd1', L) + sc2Bldg(172, HY - 6, 14, 30, '#b9bec4', L);
    g += sc2Ground('water', HY, L, sc2Nt(L, '#13304a', '#2f6f9a')) + `<g class="ol">${pa(`M226 ${HY + 14} l40 0 l-6 8 h-30z`, '#f4f1ea')}${rc(238, HY + 4, 14, 10, '#f4f1ea', 1)}</g>`;
    g += sc2Ground('deck', 190, L, sc2Nt(L, '#a7825a', '#3a2c20')) + `<g class="ol">${rc(-5, 150, 310, 40, sc2Nt(L, '#f4f1ea', '#6a6862'), 0)}${rc(-5, 146, 310, 6, sc2Nt(L, '#2f6f9a', '#1e3550'), 1)}</g>` + sc2Railing(118, 30, sc2Nt(L, '#f4f1ea', '#8a8780'), -5, 305, 20);
    g += `<g class="ol">${ci(240, 166, 16, '#e8553a')}${ci(240, 166, 8, sc2Nt(L, '#f4f1ea', '#6a6862'))}</g>` + pa('M224 166 h8 M248 166 h8 M240 150 v8 M240 174 v8', 'none', ' stroke="#fff" stroke-width="5"') + sc2Folk(80, 194, .8, S.seed + 411, {back: true});
    return {HY, g, surf: 'parkbench', wood: sc2Nt(L, '#e8e3d8', '#5a5852')}; }
});

// what's on a car's center screen: the temperature (varies), and music or the map
function sc2CarScreen(S, x, y, L){
  const t = 64 + (S.seed >>> 3) % 15, mode = (S.seed >>> 5) % 3;
  let g = `<g class="ol">${rc(x, y, 54, 34, '#15171a', 4)}${rc(x + 3, y + 3, 48, 28, sc2Nt(L, '#1e3a5f', '#16304d'), 2)}</g>` + tx(x + 14, y + 13, `${t}°`, 7, '#6fd0ff');
  if (mode === 0) g += tx(x + 27, y + 25, ['♪ lofi beats', '♪ now playing', '♪ study mix', '♪ podcast'][(S.seed >>> 7) % 4], 4.5, '#cfe3ef') + rc(x + 30, y + 8, 18, 7, '#cfe3ef', 1, ' opacity=".3"');
  else if (mode === 1) g += pa(`M${x + 6} ${y + 27} q10 -10 18 -4 t22 -10`, 'none', ' stroke="#6fd0ff" stroke-width="1.5"') + ci(x + 46, y + 13, 2, '#ff6b4a', ' stroke="none"') + tx(x + 40, y + 11, 'P', 4, '#cfe3ef');
  else g += [0, 1, 2, 3, 4].map(k => rc(x + 28 + k * 4, y + 26 - (4 + ((S.seed >> k) & 7)), 2.5, 4 + ((S.seed >> k) & 7), '#6fd0ff', 0, ' stroke="none"')).join('');
  return g;
}
// a cupholder pair seen from above
const sc2Cups = (x, y, s = 1) => `<g class="ol">${rc(x, y, 40 * s, 20 * s, '#1b1d20', 6 * s)}${ci(x + 10 * s, y + 10 * s, 7 * s, '#0e0f11')}${ci(x + 30 * s, y + 10 * s, 7 * s, '#0e0f11')}</g>`;
// an automatic gear shifter: a leather boot in the console and the stick with its knob
const sc2Shifter = (x, y, s = 1) => `<g class="ol">${pa(`M${x - 12 * s} ${y + 14 * s} Q${x} ${y + 4 * s} ${x + 12 * s} ${y + 14 * s} L${x + 9 * s} ${y + 22 * s} H${x - 9 * s}z`, '#1b1d20')}${rc(x - 2.5 * s, y - 14 * s, 5 * s, 22 * s, '#2a2c30', 2)}${pa(`M${x - 7 * s} ${y - 14 * s} q0 -10 7 -10 q7 0 7 10 q-7 4 -14 0z`, '#3a3d42')}</g>` + rc(x + 14 * s, y - 2 * s, 12 * s, 16 * s, '#15171a', 2) + tx(x + 20 * s, y + 3 * s, 'P', 3.5 * s, '#ff6b4a') + tx(x + 20 * s, y + 8 * s, 'R', 3.5 * s, '#888') + tx(x + 20 * s, y + 13 * s, 'D', 3.5 * s, '#888');
function sc2CarIn(S, c, L, r, id, view){
  // from the driver's seat of a parked car: the wheel right in front of you with the gauges behind it, the center screen and console
  // to your right, and the passenger seat beyond them, where your things are
  const HY = 0, dash = sc2Nt(L, '#3a3d42', '#1e2024'), trim = sc2Nt(L, '#55595f', '#2a2c30'), seat = sc2Nt(L, '#4a4f58', '#24272c');
  let g = rc(-5, -5, 310, 310, '#2a2c30', 0) + sc2Win(id, 0, L, r, -5, 10, 310, 112, 0, view === 'gas' ? 'gas' : 'parking');
  if (view === 'gas') g += `<g class="ol">${rc(-5, 10, 310, 14, '#e8e3d8', 0)}${rc(-5, 24, 310, 5, '#d24a3a', 0)}${rc(160, 58, 26, 62, '#e8e3d8', 3)}${rc(164, 64, 18, 12, '#1b1d20', 1)}${rc(140, 29, 5, 93, '#c9ccd1', 0)}</g>` + tx(173, 86, '3.29', 5.5, '#d24a3a');
  g += pa('M-5 -5 H305 V18 Q150 4 -5 18z', '#24262a') + pa('M-5 10 L18 122 L-5 122z M305 10 L262 122 L305 122z', '#24262a') + `<g class="ol">${rc(176, 14, 46, 14, '#2f3236', 4)}${rc(180, 17, 38, 8, '#8a9aa8', 2)}${rc(196, 4, 6, 12, '#2f3236', 1)}</g>`;
  g += `<g class="ol">${pa('M-5 124 Q120 104 305 116 V196 H-5z', dash)}${pa('M-5 124 Q120 104 305 116 L305 124 Q120 112 -5 132z', sc2Tint(dash, .08))}</g>`;
  // the gauges, seen through the top of the wheel: speedometer and tach with ticks and needles
  g += `<g class="ol">${rc(52, 128, 104, 36, '#15171a', 12)}</g>` + [78, 130].map((x, k) => ci(x, 147, 14, '#0e0f11', ' stroke="#6fd0ff" stroke-width="1" stroke-opacity=".5"') + [...Array(7)].map((_, j) => { const a = Math.PI * (.8 + j * .233); return ln(x + Math.cos(a) * 10, 147 + Math.sin(a) * 10, x + Math.cos(a) * 13, 147 + Math.sin(a) * 13, '#cfe3ef', 1); }).join('') + ln(x, 147, x - 7, 141 + k * 2, '#ff6b4a', 1.6)).join('') + tx(104, 144, 'P', 7, '#6fd0ff') + tx(104, 154, '0 mph', 4, '#cfe3ef');
  // the driver's door on your left: its panel, the handle and the window switches
  g += `<g class="ol">${pa('M-5 150 L22 140 L30 305 L-5 305z', sc2Nt(L, '#4a4f58', '#24272c'))}${rc(4, 176, 16, 6, '#8a8f96', 3)}${rc(2, 196, 22, 12, '#2f3236', 3)}</g>`;
  // the center screen, vents, and the console running down between the seats with the shifter and cupholders
  g += sc2CarScreen(S, 184, 126, L) + `<g class="ol">${rc(186, 166, 50, 8, trim, 3)}${rc(250, 128, 34, 10, trim, 3)}</g>`;
  g += `<g class="ol">${pa('M180 196 L240 196 L262 305 L176 305z', trim)}</g>` + sc2Shifter(210, 206, 1) + sc2Cups(190, 242, 1.1);
  // the passenger seat, seen from the side at an angle
  g += `<g class="ol">${pa('M262 132 Q270 124 310 126 L310 236 L262 230z', seat)}${pa('M252 226 Q280 216 310 220 L310 305 L262 305z', sc2Tint(seat, .06))}</g>`;
  // the steering wheel, big and right in front of you
  g += `<g class="ol">${ci(104, 204, 66, 'none', ' stroke="#1b1d20" stroke-width="13"')}${pa('M44 214 L90 204 L118 204 L164 214 L156 228 L118 218 L90 218 L52 228z', '#1b1d20')}${rc(95, 214, 18, 46, '#1b1d20', 3)}${ci(104, 211, 15, '#2a2c30')}</g>`;
  return {HY, g, surf: 'carseat'};
}
function sc2CarPass(S, c, L, r, id, view){
  // from the passenger seat: the glovebox and dash in front of you, the screen and console to your left, the wheel and the driver's seat past them,
  // and your things on your lap
  const HY = 0, dash = sc2Nt(L, '#3a3d42', '#1e2024'), trim = sc2Nt(L, '#55595f', '#2a2c30'), seat = sc2Nt(L, '#4a4f58', '#24272c'), jeans = sc2Nt(L, '#3d5a80', '#1e2c40');
  let g = rc(-5, -5, 310, 310, '#2a2c30', 0) + sc2Win(id, 0, L, r, -5, 10, 310, 112, 0, view === 'gas' ? 'gas' : 'parking');
  if (view === 'gas') g += `<g class="ol">${rc(-5, 10, 310, 14, '#e8e3d8', 0)}${rc(-5, 24, 310, 5, '#d24a3a', 0)}${rc(120, 58, 26, 62, '#e8e3d8', 3)}${rc(124, 64, 18, 12, '#1b1d20', 1)}${rc(100, 29, 5, 93, '#c9ccd1', 0)}</g>` + tx(133, 86, '3.29', 5.5, '#d24a3a');
  g += pa('M-5 -5 H305 V18 Q150 4 -5 18z', '#24262a') + pa('M-5 10 L38 122 L-5 122z M305 10 L282 122 L305 122z', '#24262a') + `<g class="ol">${rc(70, 14, 46, 14, '#2f3236', 4)}${rc(74, 17, 38, 8, '#8a9aa8', 2)}${rc(90, 4, 6, 12, '#2f3236', 1)}</g>`;
  g += `<g class="ol">${pa('M-5 116 Q180 104 305 124 V214 H-5z', dash)}${pa('M-5 116 Q180 104 305 124 L305 132 Q180 112 -5 124z', sc2Tint(dash, .08))}</g>`;
  // the glovebox right in front of you, a vent
  g += `<g class="ol">${rc(150, 150, 120, 50, sc2Shade(dash, .1), 8)}${rc(196, 160, 28, 6, trim, 3)}${rc(240, 128, 40, 10, trim, 3)}</g>`;
  // the screen and console to your left, with the shifter and the cupholders
  g += sc2CarScreen(S, 70, 128, L) + `<g class="ol">${rc(72, 168, 50, 8, trim, 3)}${pa('M66 214 L126 214 L118 305 L40 305z', trim)}</g>` + sc2Shifter(92, 226, 1) + sc2Cups(62, 262, 1.1);
  // the wheel and the driver's seat at the far left
  g += `<g class="ol">${ci(-6, 176, 50, 'none', ' stroke="#1b1d20" stroke-width="11"')}${pa('M-60 186 L-14 176 L2 176 L44 186 L38 198 L2 190 L-14 190z', '#1b1d20')}${pa('M-5 214 L36 210 Q44 260 30 305 L-5 305z', seat)}</g>`;
  // your lap: two legs running away from you, knees at the glovebox, in whatever you're wearing today
  const R = mulberry32(S.seed ^ 0x1e65), kind = ['jeans', 'jeans', 'sweats', 'leggings', 'khakis', 'shorts', 'skirt', 'cargo'][Math.floor(R() * 8)];
  const col = {jeans: ['#3d5a80', '#5a7fa8', '#2a3a55', '#1b1b1b'], sweats: ['#7f8c8d', '#2c2c2e', '#4a5a6a', '#7a2e3a'], leggings: ['#1b1b1b', '#2c2c2e', '#3a2a4a'], khakis: ['#c9b38a', '#a8946a', '#6b7a5a'], shorts: ['#3d5a80', '#c9b38a', '#2c2c2e'], skirt: ['#2c2c2e', '#7a2e3a', '#3f6fa0', '#6d8f3e'], cargo: ['#6b7a5a', '#5d5040', '#4a4a52']}[kind][Math.floor(R() * 3)];
  const skin = SC2_SKIN[Math.floor(R() * SC2_SKIN.length)], dk = sc2Nt(L, col, sc2Shade(col, .45)), legL = 'M126 305 L150 230 Q170 214 196 222 L206 305z', legR = 'M206 305 L214 224 Q240 214 262 228 L292 305z';
  g += `<g class="ol">${pa('M290 305 L270 236 Q290 224 310 230 V305z', seat)}</g>`;
  if (kind === 'shorts' || kind === 'skirt'){
    // bare knees past the hem
    g += `<g class="ol">${pa(legL, skin)}${pa(legR, skin)}${pa(kind === 'skirt' ? 'M120 305 L146 262 Q210 246 272 262 L296 305z' : 'M128 305 L142 266 Q172 256 200 264 L204 305z M208 305 L212 264 Q244 256 270 266 L288 305z', dk)}</g>`;
    if (kind === 'skirt' && R() < .5) g += pa(legL + legR, '#1b1b1b', ' opacity=".35"');   // tights
  } else {
    g += `<g class="ol">${pa(legL, dk)}${pa(legR, dk)}</g>`;
    if (kind === 'jeans') g += pa('M172 240 q4 30 0 60 M236 240 q8 30 12 60', 'none', ' stroke="#d9a441" stroke-width="1.2" opacity=".6" stroke-dasharray="3 2"');
    if (kind === 'sweats') g += pa('M150 236 L132 305 M262 232 L284 305', 'none', ' stroke="#fff" stroke-width="3" opacity=".55"') + pa('M156 236 L138 305 M256 232 L278 305', 'none', ' stroke="#fff" stroke-width="3" opacity=".55"');
    if (kind === 'leggings') g += pa('M168 226 q6 4 10 0 M232 226 q6 4 10 0', 'none', ' stroke="#fff" stroke-width="1.5" opacity=".2"');
    if (kind === 'khakis') g += pa('M176 238 L178 305 M238 238 L244 305', 'none', ' stroke="#000" stroke-width="1.5" opacity=".18"');
    if (kind === 'cargo') g += `<g class="ol">${rc(140, 262, 26, 22, sc2Shade(dk, .12), 3)}${rc(246, 262, 26, 22, sc2Shade(dk, .12), 3)}</g>`;
  }
  return {HY, g, surf: 'lappass'};
}
const SC2_OUTNIGHT = ['rooftop', 'balcony', 'porch', 'quad', 'bench', 'lake', 'beach', 'stadium', 'courtyard', 'busstop', 'parkinglot', 'planetarium', 'observatory', 'trail'];
{
  const _front = scFront;
  scFront = function(S, c, L, r, id, withProps = true){
    const set = SC.SETTING[S.set], P = (set.k === 'out' || set.k === 'veh') && SC2_OUT[S.set];
    if (!P) return _front.apply(this, arguments);
    const R = mulberry32(S.seed ^ 0x7a11), o = P(S, c, L, R, id);
    let g = `<rect x="-5" y="-5" width="310" height="${o.HY + 5}" fill="url(#${id}s)"/>` + scFx(L, R, [0, 0, 300, o.HY]);
    // the far scenery is drawn over the sky; the sun, moon and stars go behind it
    g += o.g;
    const F = SC2_OUTSURF[o.surf](c, L, o.wood);
    if (SC2_LAYER === 'back') return g;
    if (SC2_LAYER === 'front') g = '';
    g += F.g;
    if (withProps && F.areas){ let left = S.props.slice(); F.areas.filter(([x0]) => S.angle !== 'shoulder' || x0 >= 140).forEach(([x0, x1, top, sc, one]) => {
      // a cupholder or a slot: holds just one thing, shrunk to fit
      if (one){ const k = left.findIndex(q => SC.PROP[q]); if (k < 0) return; const P = SC.PROP[left.splice(k, 1)[0]], s1 = Math.min(sc, (x1 - x0) / P.w); g += `<g class="ol" transform="translate(${(x0 + (x1 - x0 - P.w * s1) / 2).toFixed(1)} ${top}) scale(${s1.toFixed(3)})">${P.d(c)}</g>`; return; }
      const fit = []; let w = 0; while (left.length){ const P = SC.PROP[left[0]]; if (!P){ left.shift(); continue; } if (w + P.w * sc > x1 - x0) break; w += P.w * sc + 6; fit.push(left.shift()); }
      g += scPropsFront(fit, c, mulberry32(S.seed + x0), top, sc, x0, x1).replace(/translate\(([\d.]+) ([\d.]+)\)/g, (m, x) => `translate(${x} ${top})`); }); }
    else if (withProps) g += scPropsFront(S.props, c, r, F.top, 1.55, S.angle === 'shoulder' ? 152 : 14, 290).replace(/translate\(([\d.]+) ([\d.]+)\)/g, (m, x) => `translate(${x} ${F.top})`);
    return g;
  };
}

/* ---- what the AI is told about the details only these new pictures have (screens, which seat in the car) ---- */
function sc2Extra(S){
  if (!['front', 'close', 'shoulder', 'wide'].includes(S.angle)) return '';
  let d = '';
  if (S.set === 'plane'){
    const R = mulberry32(S.seed ^ 0x5c4e), k = Math.floor(R() * 4);
    if (k === 0){ const hr = Math.floor(R() * 9), mn = Math.floor(R() * 60); d = ` The seatback screen in front shows the flight map with ${hr}h ${String(mn).padStart(2, '0')}m left.`; }
    else if (k === 1){ const gen = Math.floor(R() * 7); d = ` The seatback screen in front is playing ${['an action movie (a car in front of an explosion)', 'a romance movie (two people and a heart)', 'a horror movie (a dark house under the moon)', 'a sci-fi movie (a spaceship near a planet)', 'an animated movie (a cartoon critter on bright hills)', 'a western (a cactus at sundown)', 'an adventure movie (a sailboat at sea)'][gen]}.`; }
    else if (k === 2) d = ' The seatback screen in front has a block-stacking game going.';
    else d = ' The seatback screen in front is playing a TV show (two people talking).';
  }
  if (S.set === 'car' || S.set === 'gascar'){
    const t = 64 + (S.seed >>> 3) % 15, mode = (S.seed >>> 5) % 3;
    d = ` Taken from the ${S.seed % 2 ? 'passenger' : "driver's"} seat. The car's screen says ${t}° and ${mode === 0 ? `is playing ${['lofi beats', 'some music', 'a study mix', 'a podcast'][(S.seed >>> 7) % 4]}` : mode === 1 ? 'shows a map' : 'shows music playing'}.`;
  }
  return d;
}

/* ---- from above, outdoors and on a train or plane: the ground around, what you're sitting at, your things on it ---- */
const SC2_TOPGROUND = {rooftop: 'deck', balcony: 'deck', porch: 'deck', quad: 'grass', bench: 'grass', park: 'grass', lake: 'deck', beach: 'sand', hammock: 'grass', stadium: 'concrete', courtyard: 'paver',
  bikerack: 'paver', steps: 'concrete', farm: 'field', garden: 'grass', trail: 'dirt', busstop: 'concrete', parkinglot: 'concrete', planetarium: 'grass', observatory: 'concrete', ferry: 'deck', train: 'cabin', plane: 'cabin'};
function sc2TopOut(S, c, L, r, id){
  const o = SC2_OUT[S.set](S, c, L, mulberry32(S.seed ^ 0x7a11), id), surf = o.surf, n = sc2N(L), gk = SC2_TOPGROUND[S.set] || 'concrete';
  const gcol = {grass: n ? '#1f3a26' : '#7fb35f', sand: n ? '#5a5240' : '#ecd6a0', paver: n ? '#3a3a40' : '#c9c2b4', concrete: n ? '#34363c' : '#a9a9a6', dirt: n ? '#3a2f24' : '#b08a5a', field: n ? '#2e2a18' : '#d6bd62', deck: n ? '#3a2c20' : '#a0764c', cabin: n ? '#2a2c30' : '#6b6f75'}[gk];
  let g = rc(0, 0, 300, 300, gcol, 0);
  if (gk === 'grass' || gk === 'field') for (let k = 0; k < 220; k++){ const x = (k * 53) % 300, y = (k * 37 + (k % 5) * 11) % 300; g += pa(`M${x} ${y} l-2 -5 M${x} ${y} l2 -6`, 'none', ` stroke="${n ? '#0f2416' : gk === 'field' ? '#a8902e' : '#4f8a3c'}" stroke-width="1.1" opacity=".6"`); }
  if (gk === 'sand') for (let k = 0; k < 200; k++) g += ci((k * 53) % 300, (k * 37) % 300, 1, k % 2 ? '#fff' : '#8a6a3a', ' opacity=".3"');
  if (gk === 'deck') for (let x = 0; x < 300; x += 24) g += ln(x, 0, x, 300, '#000', 1.2, ' opacity=".25"');
  if (gk === 'paver') for (let k = 0; k < 300; k += 40) g += ln(k, 0, k, 300, '#000', 1, ' opacity=".14"') + ln(0, k, 300, k, '#000', 1, ' opacity=".14"');
  if (gk === 'concrete' || gk === 'dirt' || gk === 'cabin') for (let k = 0; k < 160; k++) g += ci((k * 53) % 300, (k * 37) % 300, 1.2, '#000', ' opacity=".12"');
  // what you're sitting at, seen from above
  const box = [16, 10, 268, 220];
  const T = {
    parkbench: () => { const w = o.wood || sc2Nt(L, '#a0703f', '#4a3622'); return rc(20, 20, 264, 222, '#000', 8, ' opacity=".22"') + `<g class="ol">${[0, 1, 2, 3].map(k => rc(14, 10 + k * 56, 272, 48, sc2Tint(w, (k % 2) * .05), 4)).join('')}</g>`; },
    picnic: () => { const w = sc2Nt(L, '#b07d4a', '#4a3622'); return rc(20, 20, 264, 222, '#000', 8, ' opacity=".22"') + `<g class="ol">${[0, 1, 2, 3, 4].map(k => rc(14, 10 + k * 45, 272, 40, sc2Tint(w, (k % 2) * .06), 3)).join('')}</g>`; },
    blanket: () => { let b = `<g class="ol">${rc(10, 6, 280, 240, c.a1, 4)}</g>`; for (let k = 1; k < 7; k++) b += ln(10 + k * 40, 6, 10 + k * 40, 246, '#fff', 4, ' opacity=".4"') + ln(10, 6 + k * 34, 290, 6 + k * 34, '#fff', 4, ' opacity=".4"'); return b; },
    towel: () => `<g class="ol">${rc(30, 4, 240, 250, '#f4f1ea', 4)}${rc(30, 4, 48, 250, c.a1, 0)}${rc(126, 4, 48, 250, c.a2, 0)}${rc(222, 4, 48, 250, c.a1, 0)}</g>`,
    hammock: () => { let b = `<g class="ol"><ellipse cx="150" cy="130" rx="150" ry="110" fill="${c.a2}"/></g>`; for (let k = -4; k <= 4; k++) b += ln(150 + k * 30, 22, 150 + k * 30, 238, '#fff', 2, ' opacity=".25"'); return b; },
    bistro: () => { const m = sc2Nt(L, '#3c4a44', '#1e2522'); return `<ellipse cx="152" cy="130" rx="138" ry="118" fill="#000" opacity=".25"/><g class="ol"><ellipse cx="150" cy="124" rx="138" ry="118" fill="${sc2Tint(m, .15)}"/></g>` + [40, 80, 120].map(rr => `<ellipse cx="150" cy="124" rx="${rr}" ry="${rr * .85}" fill="none" stroke="#000" stroke-width="1" opacity=".18"/>`).join(''); },
    ledge: () => { const s2 = sc2Nt(L, '#bdb8ae', '#45444a'); return `<g class="ol">${rc(-5, 20, 310, 210, s2, 2)}</g>` + [80, 170, 260].map(x => ln(x, 20, x, 230, '#000', 1.2, ' opacity=".18"')).join(''); },
    brickwall: () => `<g class="ol">${rc(-5, 20, 310, 210, sc2Nt(L, '#e2ddd2', '#5a5852'), 2)}</g>` + [80, 170, 260].map(x => ln(x, 20, x, 230, '#000', 1.2, ' opacity=".18"')).join(''),
    step: () => `<g class="ol">${rc(-5, 0, 310, 150, sc2Nt(L, '#ddd6c6', '#4e4c44'), 0)}${rc(-5, 150, 310, 100, sc2Nt(L, '#cfc8b6', '#45433c'), 0)}</g>`,
    rock: () => `<g class="ol">${pa('M20 40 Q90 0 170 20 Q270 10 290 90 Q300 200 230 240 Q130 260 50 230 Q0 160 20 40z', sc2Nt(L, '#9a958c', '#3e3d3a'))}</g>` + pa('M80 90 q40 -10 70 10 M160 170 q30 -6 60 8', 'none', ' stroke="#000" stroke-width="1.5" opacity=".18"'),
    haybale: () => { let b = `<g class="ol">${rc(10, 6, 280, 240, sc2Nt(L, '#e2c46a', '#5a4e2a'), 6)}</g>`; for (let k = 0; k < 90; k++){ const x = 14 + (k * 53) % 270, y = 10 + (k * 31) % 230; b += ln(x, y, x + 9, y - 3, '#a8902e', 1, ' opacity=".6"'); } return b + ln(10, 90, 290, 90, '#8a5a33', 2) + ln(10, 170, 290, 170, '#8a5a33', 2); },
    bleacher: () => { const m = sc2Nt(L, '#c3c9cf', '#4a4f56'); return `<g class="ol">${[0, 1, 2, 3, 4].map(k => rc(-5, 4 + k * 50, 310, 44, sc2Tint(m, (k % 2) * .06), 2)).join('')}</g>`; },
    traintable: () => `<g class="ol">${rc(10, 10, 280, 220, sc2Nt(L, '#d8d2c4', '#4a4840'), 8)}</g>`,
    planetray: () => `<g class="ol">${rc(20, 10, 260, 220, sc2Nt(L, '#c9ccd1', '#55595f'), 10)}${rc(130, 16, 40, 6, '#9aa0a6', 2)}</g>`,
    dockfront: () => ''
  };
  g += (T[surf] || T.ledge)();
  // your things: six cells across what you're sitting at
  const cells = [0, 1, 2, 3, 4, 5].sort(() => r() - .5), cw = (box[2] - 10) / 3, chh = (box[3] - 10) / 2;
  let k = 0;
  for (const p of S.props){ const P = SC.PROP[p]; if (!P || k >= 6) continue; const i = cells[k++], cx0 = box[0] + 5 + (i % 3) * cw, cy0 = box[1] + 5 + Math.floor(i / 3) * chh, rot = scR(r, -12, 12).toFixed(0);
    const bb = P.top ? sc2TopBox(p, c) : null, w = P.top ? bb.w * 1.9 : P.w * 1.6, h = P.top ? bb.h * 1.9 : (P.h || 20) * 1.6, sc = Math.min(1, (cw - 8) / w, (chh - 8) / h);
    const x = cx0 + (cw - w * sc) / 2 - (P.top ? bb.x * 1.9 : 0), y = cy0 + (chh - h * sc) / 2 - (P.top ? bb.y * 1.9 : 0);
    if (sc < 1) g += `<g transform="translate(${x} ${y}) scale(${sc}) translate(${-x} ${-y})">`;
    g += P.top ? `<ellipse cx="${x + bb.x * 1.9 + w / 2 + 3}" cy="${y + bb.y * 1.9 + h / 2 + 4}" rx="${w * .45}" ry="${h * .4}" fill="#000" opacity=".14"/><g class="ol" transform="translate(${x} ${y}) scale(1.9) rotate(${rot} ${bb.x + bb.w / 2} ${bb.y + bb.h / 2})">${P.top(c)}</g>` : `<ellipse cx="${x + w / 2}" cy="${y + h}" rx="${w * .5}" ry="5" fill="#000" opacity=".2"/><g class="ol" transform="translate(${x} ${y + h}) scale(1.6)">${P.d(c)}</g>`;
    if (sc < 1) g += '</g>'; }
  // your knees at the bottom edge, so it's clear where you are
  g += `<g class="ol">${pa('M60 305 Q66 262 104 258 Q140 262 146 305z', sc2Nt(L, '#3d5a80', '#1e2c40'))}${pa('M154 305 Q160 262 196 258 Q234 262 240 305z', sc2Nt(L, '#3d5a80', '#1e2c40'))}</g>`;
  return g;
}

/* ---- selfies on a train, bus, plane or in a car: the camera faces you, so the background is what's behind you ---- */
function sc2SelfieBack(S, c, L, r, id){
  if (!['train', 'bus', 'plane', 'car', 'gascar'].includes(S.set)) return '';
  const R = mulberry32(S.seed ^ 0x2a7e);
  // the camera faces you, so left and right swap: your right side (the aisle, or the other front seat) is on the picture's left
  if (S.set === 'car' || S.set === 'gascar'){
    // looking back past you: the back seat under the rear window, the other front seat across the console, and on your side the door
    // (its window on top, the panel below) with the pillar your seat belt comes out of
    const seat = sc2Nt(L, '#4a4f58', '#24272c'), trim = sc2Nt(L, '#3a3d42', '#1e2024'), view = S.set === 'gascar' ? 'gas' : 'parking', driver = !(S.seed % 2);
    const M = x => driver ? x : 300 - x, lo = (a, b) => Math.min(M(a), M(b));   // the layout for the driver, mirrored for the passenger
    let g = rc(-5, -5, 310, 310, sc2Nt(L, '#55595f', '#2a2c30'), 0) + pa('M-5 -5 H305 V28 Q150 10 -5 28z', sc2Nt(L, '#6b6f75', '#24262a'));
    g += sc2Win(id, 9, L, r, 56, 26, 188, 64, 14, view) + `<g class="ol">${rc(56, 26, 188, 64, 'none', 14, ' stroke="#1b1d20" stroke-width="5"')}</g>`;
    // the back seat: a bench with three headrests
    g += `<g class="ol">${[90, 150, 210].map(x => rc(x - 20, 82, 40, 24, seat, 8)).join('')}${rc(30, 100, 240, 90, sc2Tint(seat, .05), 16)}${rc(30, 176, 240, 40, sc2Shade(seat, .1), 10)}</g>`;
    if (R() < .4) g += sc2Folk(R() < .5 ? 96 : 204, 196, 1.15, S.seed + 501, {sit: true}) + `<g class="ol">${rc(30, 178, 240, 12, sc2Shade(seat, .1), 4)}</g>`;
    // the other front seat, across the console
    g += `<g class="ol">${rc(lo(-10, 60), 150, 70, 160, seat, 16)}${rc(lo(-2, 52), 104, 54, 50, sc2Tint(seat, .08), 14)}${rc(lo(64, 96), 236, 32, 70, trim, 6)}</g>`;
    if (!driver) g += `<g class="ol">${ci(M(-8), 236, 46, 'none', ' stroke="#1b1d20" stroke-width="10"')}</g>`;
    // your side: the door runs from the edge of the picture (right next to the camera) back to the pillar behind you, so all its lines
    // close in toward the back of the car. f = 1 at the picture's edge, smaller going back.
    const VY = 70, X = f => M(150 + 160 * f), Y = (y, f) => VY + (y - VY) * f, F0 = .775;
    const quad = (y0, y1, f0 = F0, f1 = 1) => `${X(f1)} ${Y(y0, f1)} ${X(f0)} ${Y(y0, f0)} ${X(f0)} ${Y(y1, f0)} ${X(f1)} ${Y(y1, f1)}`;
    const winPts = quad(8, 150);
    g += `<defs><clipPath id="${id}dw"><polygon points="${winPts}"/></clipPath></defs><g clip-path="url(#${id}dw)">${rc(-10, 0, 320, 160, `url(#${id}s)`, 0)}${rc(-10, 0, 320, 160, '#1b2a38', 0, ' opacity=".45"')}${pa(`M${X(.86)} ${Y(140, .86)} L${X(.95)} ${Y(20, .95)} M${X(.92)} ${Y(140, .92)} L${X(1)} ${Y(50, 1)}`, 'none', ' stroke="#fff" stroke-width="3" opacity=".25"')}</g>`;
    g += `<polygon points="${winPts}" fill="none" stroke="#1b1d20" stroke-width="5" stroke-linejoin="round"/>`;
    const door = sc2Nt(L, '#8a8f96', '#3a3d42'), dk = sc2Nt(L, '#6b6f75', '#2a2c30');
    g += `<g class="ol"><polygon points="${quad(150, 330)}" fill="${door}"/><polygon points="${quad(150, 158)}" fill="${dk}"/><polygon points="${quad(188, 204)}" fill="${dk}"/><polygon points="${quad(170, 178, .84, .93)}" fill="#c9ccd1"/><polygon points="${quad(262, 288, .8, 1)}" fill="${dk}"/></g>`;
    g += `<ellipse cx="${X(.9)}" cy="${Y(236, .9)}" rx="6" ry="10" fill="${dk}" stroke="#1b1d20" stroke-width="1.5"/>`;
    g += `<g class="ol">${rc(lo(246, 274), 24, 28, 282, sc2Nt(L, '#6b6f75', '#2a2c30'), 3)}${rc(lo(252, 268), 118, 16, 22, '#2a2c30', 3)}</g>`;
    // your own seat, right behind you
    g += `<g class="ol">${rc(92, 60, 116, 70, sc2Tint(seat, .08), 22)}${rc(82, 120, 136, 190, seat, 20)}</g>`;
    return g;
  }
  // a cabin, looking toward the back. Your column of seats runs back along the window wall on the picture's right; across the aisle on
  // the left, the other column runs back along the far wall. The rows behind you face you.
  const cfg = {train: {seat: sc2Nt(L, '#2f5a7a', '#1c3448'), view: 'field', wins: [[1.2, .8], [.62, .45], [.38, .3], [.26, .21]], wall: sc2Nt(L, '#d9d4c8', '#45433c'), ceil: sc2Nt(L, '#ece7dc', '#34343a'), fl: sc2Nt(L, '#6b6f75', '#2a2c30'), mine: [-60, 60], far: [-250, -130], hl: 250, hr: 60},
    bus: {seat: sc2Nt(L, '#3f6fa0', '#1e3550'), view: 'street', wins: [[1.6, .9], [.7, .5], [.44, .34], [.3, .24]], wall: sc2Nt(L, '#d8d4cc', '#3a3d44'), ceil: sc2Nt(L, '#ece9e3', '#2a2c30'), fl: sc2Nt(L, '#55595f', '#24272b'), mine: [-60, 60], far: [-200, -100], hl: 200, hr: 60},
    plane: {seat: sc2Nt(L, '#3a4a6a', '#1e2638'), view: 'clouds', wins: [[1.3, 1], [.7, .58], [.45, .4], [.32, .29]], wall: sc2Nt(L, '#e8e6e1', '#3a3a3e'), ceil: sc2Nt(L, '#f4f2ee', '#45454a'), fl: sc2Nt(L, '#5a6378', '#24272e'), mine: [-60, 60], far: [-260, -130], hl: 260, hr: 60}}[S.set];
  const vx = 150, vy = 96;
  const C = sc2Cabin({id: id + 'r', L, r, vx, vy, s0: .16, halfL: cfg.hl, halfR: cfg.hr, top: -70, bottom: 120, winTop: -40, winBot: 20, wins: cfg.wins, view: cfg.view, wallL: sc2Shade(cfg.wall, .05), wallR: cfg.wall, ceil: cfg.ceil, floor: cfg.fl, end: sc2Shade(cfg.wall, .08)});
  let g = `<defs>${scSky(L, id + 'r').replace(/<\/?defs>/g, '')}</defs>` + C.g;
  [.22, .28, .36, .48, .66, .95].forEach((sd, k) => [cfg.far, cfg.mine].forEach(([a, b], side) => {
    if (side === 1 && sd > .7) return;   // the row right behind you is hidden by your own seat
    const [x0, y0] = C.P(a, -10, sd), [x1] = C.P(b, -10, sd), w = x1 - x0, fl = C.P(0, 120, sd)[1], cush = C.P(0, 64, sd)[1];
    g += `<g class="ol">${rc(x0, y0, w, fl - y0, cfg.seat, 8 * sd)}${rc(x0 + 4 * sd, y0 - 6 * sd, w - 8 * sd, 14 * sd, sc2Tint(cfg.seat, .1), 5 * sd)}</g>`;
    [.28, .72].forEach((f, q) => { if (mulberry32(S.seed * 5 + k * 4 + side * 2 + q)() < .4) g += sc2Folk(x0 + w * f, cush + 12 * sd * 1.5, sd * 1.5, S.seed + 520 + k * 4 + side * 2 + q, {sit: true}); });
    g += `<g class="ol">${rc(x0 - 2 * sd, cush, w + 4 * sd, 12 * sd, sc2Tint(cfg.seat, .06), 3 * sd)}</g>`; }));
  // your own seat right behind you
  // the wall beside you runs from the seat's edge toward the camera, one color top to bottom, so the seat sits right against it
  g += pa('M226 7 L310 -91 L310 305 L226 305z', cfg.wall) + `<g class="ol">${rc(70, 96, 160, 220, cfg.seat, 22)}${rc(86, 62, 128, 60, sc2Tint(cfg.seat, .08), 20)}${S.set !== 'bus' ? rc(110, 66, 80, 18, '#f4f1ea', 5) : ''}</g>`;
  return g;
}

/* ---- drawn over you in a selfie: in a car, your seat belt across your chest, from the pillar on your door side ---- */
function sc2SelfieFront(S, c, L){
  if (S.set !== 'car' && S.set !== 'gascar') return '';
  const driver = !(S.seed % 2), M = x => driver ? x : 300 - x;
  return `<g class="ol">${pa(`M${M(256)} 130 L${M(268)} 138 L${M(218)} 214 L${M(118)} 305 L${M(96)} 305 L${M(204)} 204z`, '#2f3236')}${rc(Math.min(M(250), M(266)), 124, 16, 14, '#8a8f96', 3)}</g>`;
}

/* ================= people in selfies and over-the-shoulder shots: real shoulders, clothes with details, a look that stays the same ================= */
// what someone wears and a few face details, always the same for the same person: worked out from their look, so a bot (or you)
// looks the same in every post
const SC2_TOPS = {tee: 'T-shirt', vneck: 'V-neck tee', hoodie: 'Hoodie', jacket: 'Zip jacket', sweater: 'Sweater', button: 'Button-up shirt'};
const SC2_PRINTS = {none: 'Plain', stripes: 'Stripes', word: 'Words', icon: 'A little picture', pocket: 'Pocket', ringer: 'Contrast trim', tiedye: 'Tie-dye'};
const SC2_WORDS = ['STUDY', 'COFFEE', 'zzz', '404', 'MATH', 'GO TEAM', 'NAP CLUB', 'HELLO', 'CHILL', 'LOFI', 'VIBES', 'ok.', 'SPACE', 'BOOKS', 'FOCUS', 'NOPE'];
const SC2_ICONS = ['star', 'heart', 'planet', 'smiley', 'bolt', 'wave', 'cup', 'note', 'pizza', 'atom', 'moon', 'flower'];
function sc2LookFill(L){
  // anything not set yet comes from a hash of the parts that are, so it never changes for that person
  const key = [L.skin, L.hair, L.style, L.glasses ? 1 : 0, L.outfit, L.hood ? 1 : 0].join('|');
  let h = 2166136261; for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  const r = mulberry32(h >>> 0), pick = a => a[Math.floor(r() * a.length)];
  const top = L.top || (L.hood && r() < .45 ? 'hoodie' : pick(['tee', 'tee', 'tee', 'vneck', 'jacket', 'sweater', 'button', 'hoodie']));
  const print = L.print || pick(['none', 'none', 'stripes', 'word', 'word', 'icon', 'icon', 'pocket', 'ringer', 'tiedye']);
  return {...L, top, print, word: L.word || pick(SC2_WORDS), icon: L.icon || pick(SC2_ICONS), trim: L.trim || pick(['#f4f1ea', '#1b1b1b', '#c0392b', '#e0a630', '#3f6fa0', '#2e7d5b']),
    inner: L.inner || pick(['#f4f1ea', '#1b1b1b', '#7f8c8d', '#c0392b', '#3f6fa0']), pants: L.pants || pick(['#2c3e50', '#3d5a80', '#1b1b1b', '#5d4037', '#7f8c8d', '#c9b38a', '#4a4a52']), freckles: L.freckles != null ? L.freckles : r() < .15, blush: L.blush != null ? L.blush : r() < .25};
}
function sc2Icon(k, x, y, s, col){
  switch (k){
    case 'star': return pa(`M${x} ${y - s} L${x + s * .3} ${y - s * .3} L${x + s} ${y - s * .25} L${x + s * .45} ${y + s * .2} L${x + s * .6} ${y + s} L${x} ${y + s * .55} L${x - s * .6} ${y + s} L${x - s * .45} ${y + s * .2} L${x - s} ${y - s * .25} L${x - s * .3} ${y - s * .3}z`, col);
    case 'heart': return pa(`M${x} ${y + s * .8} C${x - s * 1.4} ${y - s * .2} ${x - s * .6} ${y - s * 1.2} ${x} ${y - s * .4} C${x + s * .6} ${y - s * 1.2} ${x + s * 1.4} ${y - s * .2} ${x} ${y + s * .8}z`, col);
    case 'planet': return ci(x, y, s * .6, col) + `<ellipse cx="${x}" cy="${y}" rx="${s * 1.1}" ry="${s * .3}" fill="none" stroke="${col}" stroke-width="${s * .15}" transform="rotate(-20 ${x} ${y})"/>`;
    case 'smiley': return ci(x, y, s * .9, col) + ci(x - s * .3, y - s * .2, s * .12, '#1b1b1b', ' stroke="none"') + ci(x + s * .3, y - s * .2, s * .12, '#1b1b1b', ' stroke="none"') + pa(`M${x - s * .4} ${y + s * .2} q${s * .4} ${s * .4} ${s * .8} 0`, 'none', ` stroke="#1b1b1b" stroke-width="${s * .12}"`);
    case 'bolt': return pa(`M${x + s * .2} ${y - s} L${x - s * .6} ${y + s * .15} H${x} L${x - s * .2} ${y + s} L${x + s * .6} ${y - s * .15} H${x}z`, col);
    case 'wave': return pa(`M${x - s} ${y + s * .3} q${s * .5} ${-s * 1.2} ${s} 0 q${s * .5} ${-s * 1.2} ${s} 0`, 'none', ` stroke="${col}" stroke-width="${s * .3}" stroke-linecap="round"`);
    case 'cup': return rc(x - s * .55, y - s * .5, s * 1.1, s * 1.1, col, s * .2) + ci(x + s * .7, y, s * .3, 'none', ` stroke="${col}" stroke-width="${s * .18}"`) + pa(`M${x - s * .2} ${y - s * .7} q${s * .2} ${-s * .3} 0 ${-s * .6} M${x + s * .2} ${y - s * .7} q${s * .2} ${-s * .3} 0 ${-s * .6}`, 'none', ` stroke="${col}" stroke-width="${s * .1}"`);
    case 'note': return ci(x - s * .4, y + s * .5, s * .35, col) + rc(x - s * .12, y - s * .8, s * .14, s * 1.3, col, 0) + pa(`M${x - s * .05} ${y - s * .8} q${s * .6} ${s * .2} ${s * .5} ${s * .7}`, 'none', ` stroke="${col}" stroke-width="${s * .15}"`);
    case 'pizza': return pa(`M${x - s * .8} ${y - s * .6} L${x + s * .8} ${y - s * .6} L${x} ${y + s}z`, '#f2c14e') + rc(x - s * .85, y - s * .75, s * 1.7, s * .3, '#c98a3a', s * .1) + ci(x - s * .2, y - s * .2, s * .15, '#c0392b', ' stroke="none"') + ci(x + s * .2, y + s * .1, s * .15, '#c0392b', ' stroke="none"');
    case 'atom': return ci(x, y, s * .2, col) + [0, 60, 120].map(a => `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s * .35}" fill="none" stroke="${col}" stroke-width="${s * .1}" transform="rotate(${a} ${x} ${y})"/>`).join('');
    case 'moon': return pa(`M${x + s * .3} ${y - s * .9} A${s * .9} ${s * .9} 0 1 0 ${x + s * .3} ${y + s * .9} A${s * .55} ${s * .9} 0 0 1 ${x + s * .3} ${y - s * .9}z`, col);
    default: return [0, 72, 144, 216, 288].map(a => `<ellipse cx="${x}" cy="${y - s * .5}" rx="${s * .3}" ry="${s * .5}" fill="${col}" transform="rotate(${a} ${x} ${y})"/>`).join('') + ci(x, y, s * .28, '#f2c14e');
  }
}
let sc2BodyN = 0;
scBody = function(L0, cx, top, w, bot = 300){
  // shoulders that slope down from the neck, arms along the sides (with the sleeve seams), and the top's own details
  const L = sc2LookFill(L0), h = bot - top, sw = w * .42, col = L.outfit, dk = sc2Shade(col, .2), lt = sc2Tint(col, .12), id = 'b' + (sc2BodyN++);
  const shY = top + Math.min(h * .2, 26), neckW = w * .13;
  const body = `M${cx - sw - 8} ${bot + 4} L${cx - sw} ${shY + 18} Q${cx - sw} ${shY} ${cx - sw + 22} ${shY - 4} L${cx - neckW - 6} ${top} Q${cx} ${top + 10} ${cx + neckW + 6} ${top} L${cx + sw - 22} ${shY - 4} Q${cx + sw} ${shY} ${cx + sw} ${shY + 18} L${cx + sw + 8} ${bot + 4} Q${cx} ${bot + 10} ${cx - sw - 8} ${bot + 4}z`;   // the hem flares a little at the hips
  let g = '', over = '';
  // a hoodie's hood bunches up behind the neck
  if (L.top === 'hoodie') g += pa(`M${cx - neckW - 22} ${top + 8} Q${cx - neckW - 18} ${top - 22} ${cx} ${top - 24} Q${cx + neckW + 18} ${top - 22} ${cx + neckW + 22} ${top + 8}z`, dk);
  g += `<path d="${body}" fill="${col}"/>`;
  // the arms along the sides: a seam from the shoulder down
  // (no seams down the sides: an arm that's raised comes straight out of the shoulder)
  // the print on the front, clipped to the shirt
  // all-over prints stay on the front of the chest, clear of where the arms join, so a plain sleeve never clashes with them
  const px = cx, py = top + Math.min(h * .55, 90), pw = sw * .58, clip = `<defs><clipPath id="${id}"><path d="${body}"/><rect x="0" y="0" width="0" height="0"/></clipPath><clipPath id="${id}c"><rect x="${cx - pw}" y="${top + 26}" width="${pw * 2}" height="${h}" rx="10"/></clipPath></defs>`;
  const inkOn = c => sc2L ? (sc2L(c) > 60 ? '#1b1b1b' : '#f4f1ea') : '#f4f1ea';
  if (['tee', 'vneck', 'hoodie', 'sweater'].includes(L.top)){
    if (L.print === 'stripes') over += `${clip}<g clip-path="url(#${id}c)">${[0, 1, 2, 3, 4].map(k => rc(cx - sw - 10, top + 40 + k * 26, sw * 2 + 20, 11, L.trim, 0, ' stroke="none" opacity=".85"')).join('')}</g>`;
    if (L.print === 'tiedye') over += `<g opacity=".55">${[[-.25, .4, '#e57399'], [.25, .35, '#f2c14e'], [0, .75, '#5fa8d3'], [-.2, 1, '#7ac943'], [.3, .9, '#b05ad0']].map(([a, b, cc]) => ci(cx + a * sw, top + b * h * .6, sw * .32, cc, ' stroke="none" opacity=".9"')).join('')}</g>`;
    if (L.print === 'word') over += `<text x="${px}" y="${py}" font-size="${Math.min(22, sw * .28)}" font-weight="800" text-anchor="middle" fill="${inkOn(col)}" font-family="ui-rounded, system-ui, sans-serif" letter-spacing="1">${esc(L.word)}</text>`;
    if (L.print === 'icon') over += `<g class="ol">${sc2Icon(L.icon, px, py - 8, Math.min(18, sw * .2), Math.abs(sc2L(L.trim) - sc2L(col)) < 30 || L.trim === col ? inkOn(col) : L.trim)}</g>`;
    if (L.print === 'pocket') over += '%%POCKET%%';
  }
  // collars and fronts
  const T = L.top, pk = Math.min(26, sw * .42), pkY = top + Math.min(46, h * .22), pocket = pkY + pk * 1.1 < bot - 6 ? `<g class="ol">${rc(cx + sw * .22, pkY, pk, pk * 1.1, lt, 3)}${ln(cx + sw * .22, pkY + pk * .22, cx + sw * .22 + pk, pkY + pk * .22, dk, 1.5)}</g>` : '';
  if (T === 'tee' || T === 'hoodie' || T === 'sweater') over += pa(`M${cx - neckW - 6} ${top} Q${cx} ${top + 22} ${cx + neckW + 6} ${top}`, 'none', ` stroke="${L.print === 'ringer' ? L.trim : dk}" stroke-width="${T === 'sweater' ? 9 : 5}" stroke-linecap="round"`);
  if (T === 'sweater') over += [...Array(9)].map((_, k) => { const t = (k + .5) / 9, x = cx - neckW - 6 + (2 * neckW + 12) * t, y = top + 22 * 4 * t * (1 - t) * .5 + 0; return ln(x, y - 3, x, y + 3, sc2Shade(col, .35), 1); }).join('');
  if (T === 'vneck') over += pa(`M${cx - neckW - 6} ${top} L${cx} ${top + 34} L${cx + neckW + 6} ${top}`, L.skin, ' stroke="none"') + pa(`M${cx - neckW - 6} ${top} L${cx} ${top + 34} L${cx + neckW + 6} ${top}`, 'none', ` stroke="${L.print === 'ringer' ? L.trim : dk}" stroke-width="4" stroke-linejoin="round"`);
  if (T === 'hoodie') over += [-1, 1].map(d => ln(cx + d * 12, top + 10, cx + d * 14, top + 58, '#f4f1ea', 2.5) + rc(cx + d * 14 - 2, top + 56, 4, 8, '#bbb', 1)).join('');
  if (T === 'jacket') over += pa(`M${cx - neckW - 6} ${top} L${cx - 16} ${bot + 4} H${cx + 16} L${cx + neckW + 6} ${top} Q${cx} ${top + 10} ${cx - neckW - 6} ${top}z`, L.inner) + (L.print !== 'none' && L.print !== 'pocket' ? `<text x="${cx}" y="${py}" font-size="10" font-weight="800" text-anchor="middle" fill="${inkOn(L.inner)}" font-family="ui-rounded, system-ui, sans-serif">${esc(L.word.slice(0, 4))}</text>` : '') + [-1, 1].map(d => ln(cx + d * 16, top + 20, cx + d * 16, bot + 4, '#bbb', 2.5) + pa(`M${cx + d * (neckW + 6)} ${top} l${d * 14} -6 l${d * 6} 22z`, dk)).join('') + rc(cx + 12, top + 40, 6, 12, '#ccc', 1);
  if (T === 'button') over += pa(`M${cx - neckW - 8} ${top - 2} L${cx - 4} ${top + 24} L${cx - neckW - 14} ${top + 22}z M${cx + neckW + 8} ${top - 2} L${cx + 4} ${top + 24} L${cx + neckW + 14} ${top + 22}z`, lt) + ln(cx, top + 18, cx, bot + 4, dk, 2) + [0, 1, 2, 3].filter(k => top + 36 + k * 30 < bot - 4).map(k => ci(cx + 5, top + 36 + k * 30, 2.4, '#f4f1ea')).join('') + (L.print === 'pocket' || L.print === 'icon' ? pocket : '');
  return g + over.split('%%POCKET%%').join(pocket);
};
{
  // every look gets its extras before anything is drawn, so the head, body and arms all agree
  const _person = scPerson;
  scPerson = function(S, c, L, r){ return _person({...S, look: sc2LookFill(S.look || {})}, c, L, r); };
  const _look = scLook;
  scLook = function(i){ return sc2LookFill(_look(i)); };
}

{
  // long hair: locks that fall in front of the shoulders, and a part, so it reads as hair and not a hood
  const _front = scHairFront;
  scHairFront = function(L, cx, cy, s){
    let g = _front(L, cx, cy, s);
    if (L.style === 'long' || L.style === 'bob'){ const len = L.style === 'long' ? 1.55 : .75;
      g += [-1, 1].map(d => pa(`M${cx + d * s * .78} ${cy - s * .55} Q${cx + d * s * 1.12} ${cy + s * .2} ${cx + d * s * (L.style === 'long' ? 1.05 : 1.02)} ${cy + s * len} L${cx + d * s * .82} ${cy + s * len} Q${cx + d * s * .9} ${cy + s * .1} ${cx + d * s * .62} ${cy - s * .5}z`, L.hair)).join(''); }
    if (['short', 'long', 'side', 'pony', 'bun', 'bob'].includes(L.style)) g += pa(`M${cx - s * .15} ${cy - s * 1.02} q${s * .05} ${s * .3} ${-s * .1} ${s * .55}`, 'none', ` stroke="${sc2Shade(L.hair, .3)}" stroke-width="${Math.max(1.2, s * .03)}" opacity=".6"`);
    return g;
  };
}
{
  // fingers are drawn as thick skin-colored lines, which have no outline of their own. Give each one a dark line underneath
  // (drawn first, so the palm covers it), then lay the fingers back over the palm so where they join stays clean.
  const _hand = scHand;
  scHand = function(kind, L, x, y, s, c, ang){
    const out = kind === '_flat' ? scFlatHand(x, y, s, L.skin, ang) : _hand(kind, L, x, y, s, c), k = L.skin, re = new RegExp(`<line [^>]*stroke="${k.replace(/[#]/g, '#')}" stroke-width="([\\d.]+)"[^>]*/>`, 'g');
    const lines = out.match(re) || [];
    if (!lines.length) return out;
    const under = lines.map(l => l.replace(/stroke="[^"]+" stroke-width="([\d.]+)"/, (m, w) => `stroke="rgba(20,16,12,.75)" stroke-width="${(+w + 2.6).toFixed(1)}"`)).join('');
    return under + out.replace(re, '') + lines.join('');
  };
}

/* ================= heads, faces and hair for selfies (matching the people in the backgrounds) ================= */
Object.assign(SC.EXPR, {surprised: 'looking surprised', starstruck: 'starstruck', love: 'with heart eyes', confused: 'looking confused', annoyed: 'looking annoyed',
  bored: 'bored out of their mind', determined: 'looking determined', nervous: 'laughing nervously', relieved: 'looking relieved', cringe: 'cringing',
  excited: 'super excited', sob: 'sobbing', skeptical: 'looking skeptical', shy: 'looking shy', unimpressed: 'totally unimpressed'});
SC.EXPR_KEYS = Object.keys(SC.EXPR);
{
  const _fill = sc2LookFill;
  sc2LookFill = function(L){
    const F = _fill(L), key = [F.skin, F.hair, F.style, F.outfit].join('/');
    let h = 5381; for (let i = 0; i < key.length; i++) h = (h * 33 ^ key.charCodeAt(i)) >>> 0;
    const r = mulberry32(h), pick = a => a[Math.floor(r() * a.length)];
    return {...F, frames: F.frames || pick(['round', 'round', 'square', 'cat']), earring: F.earring != null ? F.earring : r() < .25,
      beard: F.beard != null ? F.beard : (['short', 'buzz', 'side', 'spiky', 'curly', 'afro'].includes(F.style) && r() < .18), scarf: F.scarf || pick(['#2f3a48', '#7a2e3a', '#e8dcc8', '#2e7d5b', '#5fa8d3', '#c46a8a', '#1b1b1b']),
      hat: F.hat || pick(['#c0392b', '#2f3a48', '#e0a630', '#2e7d5b', '#8e44ad', '#f4f1ea']),
      eyes: F.eyes || pick(['#4a2c1a', '#4a2c1a', '#4a2c1a', '#2b1a10', '#2b1a10', '#7a5a2a', '#3f7a4a', '#3f6fb0', '#6a7a8a'])};
  };
}
const SC2_EYES = {'#4a2c1a': 'Brown', '#2b1a10': 'Dark brown', '#7a5a2a': 'Hazel', '#3f7a4a': 'Green', '#3f6fb0': 'Blue', '#6a7a8a': 'Gray'};
const SC2_STYLES = {short: 'Short', long: 'Long', bun: 'Bun', curly: 'Curly', buzz: 'Buzz cut', side: 'Side part', afro: 'Afro', bob: 'Bob', spiky: 'Spiky', pony: 'Ponytail', braids: 'Braids', hijab: 'Hijab', bangs: 'Curtain bangs', beanie: 'Beanie'};
// the outline of the face: a rounded top, cheeks, and a soft chin
const sc2FacePath = (cx, cy, s) => `M${cx - s * .9} ${cy - s * .1} C${cx - s * .9} ${cy - s * 1.1} ${cx + s * .9} ${cy - s * 1.1} ${cx + s * .9} ${cy - s * .1} C${cx + s * .9} ${cy + s * .55} ${cx + s * .5} ${cy + s * 1.02} ${cx} ${cy + s * 1.02} C${cx - s * .5} ${cy + s * 1.02} ${cx - s * .9} ${cy + s * .55} ${cx - s * .9} ${cy - s * .1}z`;
// the hair cap over the top of the head, down to the temples, with the hairline given as the inside edge (right temple back to the left)
const sc2Cap = (cx, cy, s, hairline, wide = 1) => `M${cx - s * .97 * wide} ${cy + s * .05} C${cx - s * 1.02 * wide} ${cy - s * 1.3} ${cx + s * 1.02 * wide} ${cy - s * 1.3} ${cx + s * .97 * wide} ${cy + s * .05} ${hairline}z`;
scHairBack = function(L0, cx, cy, s){
  const L = sc2LookFill(L0), h = L.hair, f = v => +v.toFixed(1);
  switch (L.style){
    case 'long': return pa(`M${f(cx - s * 1.02)} ${f(cy)} C${f(cx - s * 1.1)} ${f(cy - s * 1.3)} ${f(cx + s * 1.1)} ${f(cy - s * 1.3)} ${f(cx + s * 1.02)} ${f(cy)} L${f(cx + s * 1.12)} ${f(cy + s * 1.85)} Q${f(cx)} ${f(cy + s * 2.05)} ${f(cx - s * 1.12)} ${f(cy + s * 1.85)}z`, h);
    case 'bangs': return pa(`M${f(cx - s * 1.02)} ${f(cy)} C${f(cx - s * 1.1)} ${f(cy - s * 1.3)} ${f(cx + s * 1.1)} ${f(cy - s * 1.3)} ${f(cx + s * 1.02)} ${f(cy)} L${f(cx + s * 1.05)} ${f(cy + s * 1.3)} Q${f(cx)} ${f(cy + s * 1.45)} ${f(cx - s * 1.05)} ${f(cy + s * 1.3)}z`, h);
    case 'bob': return pa(`M${f(cx - s * 1.05)} ${f(cy + s * .75)} V${f(cy)} C${f(cx - s * 1.1)} ${f(cy - s * 1.3)} ${f(cx + s * 1.1)} ${f(cy - s * 1.3)} ${f(cx + s * 1.05)} ${f(cy)} V${f(cy + s * .75)} Q${f(cx)} ${f(cy + s * .9)} ${f(cx - s * 1.05)} ${f(cy + s * .75)}z`, h);
    case 'afro': return ci(cx, cy - s * .25, s * 1.38, h);
    case 'curly': { let p = ''; for (let k = 0; k <= 12; k++){ const a = Math.PI * (.95 + k / 12 * 1.1); p += ci(cx + Math.cos(a) * s * 1.02, cy - s * .1 + Math.sin(a) * s * 1.02, s * .3, h); } return `<g>${p}${ci(cx, cy - s * .2, s * 1.02, h)}</g>`; }
    case 'bun': return ci(cx, cy - s * 1.12, s * .4, h) + pa(`M${f(cx - s * .3)} ${f(cy - s * .98)} q${f(s * .3)} ${f(s * .14)} ${f(s * .6)} 0`, 'none', ` stroke="${sc2Shade(h, .3)}" stroke-width="${f(s * .05)}" opacity=".7"`);
    case 'pony': return pa(`M${f(cx + s * .55)} ${f(cy - s * .75)} Q${f(cx + s * 1.5)} ${f(cy - s * .4)} ${f(cx + s * 1.18)} ${f(cy + s * 1.2)} Q${f(cx + s * .9)} ${f(cy + s * .2)} ${f(cx + s * .55)} ${f(cy - s * .1)}z`, h);
    case 'braids': return '';
    case 'hijab': return pa(`M${f(cx - s * 1.12)} ${f(cy + s * .1)} C${f(cx - s * 1.2)} ${f(cy - s * 1.45)} ${f(cx + s * 1.2)} ${f(cy - s * 1.45)} ${f(cx + s * 1.12)} ${f(cy + s * .1)} L${f(cx + s * 1.5)} ${f(cy + s * 1.9)} H${f(cx - s * 1.5)}z`, L.scarf);
    default: return '';
  }
};
scHairFront = function(L0, cx, cy, s){
  const L = sc2LookFill(L0), h = L.hair, dk = sc2Shade(h, .3), f = v => +v.toFixed(1), shine = pa(`M${f(cx - s * .5)} ${f(cy - s * .78)} q${f(s * .25)} ${f(-s * .16)} ${f(s * .5)} ${f(-s * .14)}`, 'none', ` stroke="#fff" stroke-width="${f(s * .06)}" stroke-linecap="round" opacity=".22"`);
  const part = (x, len = .3) => pa(`M${f(x)} ${f(cy - s * .95)} q${f(s * .03)} ${f(s * len * .5)} ${f(s * .02)} ${f(s * len)}`, 'none', ` stroke="${dk}" stroke-width="${f(Math.max(1.2, s * .035))}" opacity=".6"`);
  const C = (hl, w) => pa(sc2Cap(cx, cy, s, hl, w), h);
  switch (L.style){
    case 'buzz': return pa(sc2Cap(cx, cy, s, `Q${f(cx + s * .9)} ${f(cy - s * .55)} ${f(cx)} ${f(cy - s * .62)} Q${f(cx - s * .9)} ${f(cy - s * .55)} ${f(cx - s * .97)} ${f(cy + s * .05)}`, .97), h);
    case 'spiky': { const pts = []; for (let k = 0; k <= 12; k++){ const a = Math.PI + k / 12 * Math.PI, rr = s * (k % 2 ? 1.18 + .22 * Math.sin(k / 12 * Math.PI) : 1.0); pts.push(`${f(cx + Math.cos(a) * rr)} ${f(cy - s * .05 + Math.sin(a) * rr)}`); }
      return pa(`M${pts.join(' L')} Q${f(cx + s * .55)} ${f(cy - s * .5)} ${f(cx)} ${f(cy - s * .6)} Q${f(cx - s * .55)} ${f(cy - s * .5)} ${f(cx - s * 1.0)} ${f(cy - s * .05)}z`, h); }
    case 'side': return C(`Q${f(cx + s * .85)} ${f(cy - s * .5)} ${f(cx + s * .35)} ${f(cy - s * .58)} Q${f(cx - s * .4)} ${f(cy - s * .62)} ${f(cx - s * .55)} ${f(cy - s * .25)} Q${f(cx - s * .82)} ${f(cy - s * .2)} ${f(cx - s * .97)} ${f(cy + s * .05)}`) + part(cx + s * .4, .35) + shine;
    case 'afro': return C(`Q${f(cx + s * .9)} ${f(cy - s * .45)} ${f(cx)} ${f(cy - s * .6)} Q${f(cx - s * .9)} ${f(cy - s * .45)} ${f(cx - s * .97)} ${f(cy + s * .05)}`);
    case 'curly': { let g = C(`Q${f(cx + s * .9)} ${f(cy - s * .5)} ${f(cx)} ${f(cy - s * .55)} Q${f(cx - s * .9)} ${f(cy - s * .5)} ${f(cx - s * .97)} ${f(cy + s * .05)}`); for (let k = 0; k < 5; k++) g += ci(cx - s * .55 + k * s * .27, cy - s * .58, s * .16, h); return g; }
    case 'bob': return C(`Q${f(cx + s * .9)} ${f(cy - s * .35)} ${f(cx + s * .5)} ${f(cy - s * .42)} L${f(cx - s * .5)} ${f(cy - s * .42)} Q${f(cx - s * .9)} ${f(cy - s * .35)} ${f(cx - s * .97)} ${f(cy + s * .05)}`) + [-1, 1].map(d => pa(`M${f(cx + d * s * .97)} ${f(cy)} L${f(cx + d * s * 1.05)} ${f(cy + s * .75)} L${f(cx + d * s * .82)} ${f(cy + s * .72)} Q${f(cx + d * s * .86)} ${f(cy + s * .2)} ${f(cx + d * s * .78)} ${f(cy - s * .1)}z`, h)).join('') + shine;
    case 'bangs': return C(`Q${f(cx + s * .9)} ${f(cy - s * .1)} ${f(cx + s * .55)} ${f(cy - s * .35)} Q${f(cx + s * .15)} ${f(cy - s * .55)} ${f(cx)} ${f(cy - s * .8)} Q${f(cx - s * .15)} ${f(cy - s * .55)} ${f(cx - s * .55)} ${f(cy - s * .35)} Q${f(cx - s * .9)} ${f(cy - s * .1)} ${f(cx - s * .97)} ${f(cy + s * .05)}`) + [-1, 1].map(d => pa(`M${f(cx + d * s * .97)} ${f(cy)} L${f(cx + d * s * 1.05)} ${f(cy + s * 1.3)} L${f(cx + d * s * .84)} ${f(cy + s * 1.28)} Q${f(cx + d * s * .86)} ${f(cy + s * .3)} ${f(cx + d * s * .8)} ${f(cy - s * .1)}z`, h)).join('') + shine;
    case 'long': return C(`Q${f(cx + s * .85)} ${f(cy - s * .45)} ${f(cx + s * .1)} ${f(cy - s * .66)} L${f(cx)} ${f(cy - s * .9)} L${f(cx - s * .1)} ${f(cy - s * .66)} Q${f(cx - s * .85)} ${f(cy - s * .45)} ${f(cx - s * .97)} ${f(cy + s * .05)}`) + [-1, 1].map(d => pa(`M${f(cx + d * s * .97)} ${f(cy)} L${f(cx + d * s * 1.1)} ${f(cy + s * 1.85)} L${f(cx + d * s * .82)} ${f(cy + s * 1.8)} Q${f(cx + d * s * .88)} ${f(cy + s * .4)} ${f(cx + d * s * .8)} ${f(cy - s * .1)}z`, h)).join('') + shine;
    case 'braids': { let g = C(`Q${f(cx + s * .85)} ${f(cy - s * .45)} ${f(cx + s * .05)} ${f(cy - s * .66)} L${f(cx)} ${f(cy - s * .95)} L${f(cx - s * .05)} ${f(cy - s * .66)} Q${f(cx - s * .85)} ${f(cy - s * .45)} ${f(cx - s * .97)} ${f(cy + s * .05)}`);
      [-1, 1].forEach(d => { for (let k = 0; k < 6; k++) g += `<ellipse cx="${f(cx + d * s * (.98 + k * .02))}" cy="${f(cy + s * (.15 + k * .3))}" rx="${f(s * .16)}" ry="${f(s * .19)}" fill="${h}"/>`; g += rc(cx + d * s * 1.1 - s * .08, cy + s * 1.95, s * .16, s * .1, L.trim, 2); }); return g; }
    case 'hijab': return pa(`M${f(cx - s * 1.1)} ${f(cy + s * .2)} C${f(cx - s * 1.18)} ${f(cy - s * 1.4)} ${f(cx + s * 1.18)} ${f(cy - s * 1.4)} ${f(cx + s * 1.1)} ${f(cy + s * .2)} Q${f(cx + s * 1.05)} ${f(cy + s * 1.2)} ${f(cx)} ${f(cy + s * 1.25)} Q${f(cx - s * 1.05)} ${f(cy + s * 1.2)} ${f(cx - s * 1.1)} ${f(cy + s * .2)}z M${f(cx - s * .78)} ${f(cy - s * .05)} C${f(cx - s * .78)} ${f(cy - s * .9)} ${f(cx + s * .78)} ${f(cy - s * .9)} ${f(cx + s * .78)} ${f(cy - s * .05)} C${f(cx + s * .78)} ${f(cy + s * .55)} ${f(cx + s * .45)} ${f(cy + s * .98)} ${f(cx)} ${f(cy + s * .98)} C${f(cx - s * .45)} ${f(cy + s * .98)} ${f(cx - s * .78)} ${f(cy + s * .55)} ${f(cx - s * .78)} ${f(cy - s * .05)}z`, L.scarf, ' fill-rule="evenodd"') + pa(`M${f(cx - s * .3)} ${f(cy - s * .82)} q${f(s * .3)} ${f(-s * .08)} ${f(s * .6)} 0`, 'none', ` stroke="#fff" stroke-width="${f(s * .05)}" opacity=".2"`);
    case 'beanie': { const hat = L.hat; let g = [-1, 1].map(d => pa(`M${f(cx + d * s * .97)} ${f(cy - s * .2)} L${f(cx + d * s * 1.0)} ${f(cy + s * .55)} L${f(cx + d * s * .82)} ${f(cy + s * .45)} L${f(cx + d * s * .8)} ${f(cy - s * .2)}z`, h)).join('');
      g += pa(`M${f(cx - s * 1.0)} ${f(cy - s * .3)} C${f(cx - s * 1.05)} ${f(cy - s * 1.55)} ${f(cx + s * 1.05)} ${f(cy - s * 1.55)} ${f(cx + s * 1.0)} ${f(cy - s * .3)}z`, hat) + rc(cx - s * 1.04, cy - s * .5, s * 2.08, s * .32, sc2Shade(hat, .15), s * .1) + ci(cx, cy - s * 1.3, s * .2, sc2Tint(hat, .25));
      for (let k = -4; k <= 4; k++) g += ln(cx + k * s * .22, cy - s * .48, cx + k * s * .22, cy - s * .2, sc2Shade(hat, .35), Math.max(1, s * .03));
      return g; }
    case 'bun': case 'pony': return C(`Q${f(cx + s * .85)} ${f(cy - s * .5)} ${f(cx)} ${f(cy - s * .66)} Q${f(cx - s * .85)} ${f(cy - s * .5)} ${f(cx - s * .97)} ${f(cy + s * .05)}`) + pa(`M${f(cx - s * .6)} ${f(cy - s * .62)} Q${f(cx)} ${f(cy - s * 1.05)} ${f(cx + s * .6)} ${f(cy - s * .62)}`, 'none', ` stroke="${dk}" stroke-width="${f(Math.max(1.2, s * .03))}" opacity=".5"`) + shine;
    default: return C(`Q${f(cx + s * .9)} ${f(cy - s * .48)} ${f(cx + s * .3)} ${f(cy - s * .58)} Q${f(cx - s * .1)} ${f(cy - s * .52)} ${f(cx - s * .3)} ${f(cy - s * .62)} Q${f(cx - s * .9)} ${f(cy - s * .5)} ${f(cx - s * .97)} ${f(cy + s * .05)}`) + shine;
  }
};
// eyes, brows, mouth and extras: each expression is a mix of those parts
let sc2EyeCol = '#4a2c1a';
scFace = function(e, cx, cy, s, skin){
  const ink = '#2a1f1a', iris = sc2EyeCol, f = v => +v.toFixed(1), sw = f(Math.max(1.5, s * .055)), ex = s * .34, ey = cy - s * .02, my = cy + s * .5;
  const stroke = (d, w = sw, col = ink) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const fill = (d, col) => `<path d="${d}" fill="${col}" stroke="none"/>`;
  const both = fn => fn(cx - ex, -1) + fn(cx + ex, 1);
  const eye = (x, d, o = {}) => { const rx = s * .12, ry = s * (o.tall || .15), px = x + (o.look || 0) * s * .05, py = ey + (o.up || 0) * s * .04;
    return `<ellipse cx="${f(x)}" cy="${f(ey)}" rx="${f(rx)}" ry="${f(ry)}" fill="#fff" stroke="${ink}" stroke-width="${f(sw * .55)}"/>` + `<circle cx="${f(px)}" cy="${f(py + s * .02)}" r="${f(s * (o.small ? .055 : .085))}" fill="${iris}" stroke="none"/><circle cx="${f(px)}" cy="${f(py + s * .02)}" r="${f(s * (o.small ? .03 : .042))}" fill="${ink}" stroke="none"/>` + `<circle cx="${f(px + s * .025)}" cy="${f(py - s * .01)}" r="${f(s * .022)}" fill="#fff" stroke="none"/>` + (o.lid ? fill(`M${f(x - rx - 1)} ${f(ey - ry - 1)} H${f(x + rx + 1)} V${f(ey - ry * (1 - o.lid * 2))} H${f(x - rx - 1)}z`, skin) + stroke(`M${f(x - rx)} ${f(ey - ry * (1 - o.lid * 2))} H${f(x + rx)}`, f(sw * .8)) : ''); };
  const E = {
    open: () => both(x => eye(x)), look: () => both(x => eye(x, 0, {look: 1})), lookup: () => both(x => eye(x, 0, {up: -1})), wide: () => both(x => eye(x, 0, {tall: .19, small: 1})),
    happy: () => both(x => stroke(`M${f(x - s * .12)} ${f(ey + s * .03)} q${f(s * .12)} ${f(-s * .15)} ${f(s * .24)} 0`)),
    closed: () => both(x => stroke(`M${f(x - s * .12)} ${f(ey)} q${f(s * .12)} ${f(s * .08)} ${f(s * .24)} 0`)),
    half: () => both(x => eye(x, 0, {lid: .5})), heavy: () => both(x => eye(x, 0, {lid: .35, look: 0})), side: () => both(x => eye(x, 0, {lid: .4, look: 1})),
    squint: () => both((x, d) => stroke(`M${f(x - d * s * .13)} ${f(ey - s * .08)} l${f(d * s * .2)} ${f(s * .08)} l${f(-d * s * .2)} ${f(s * .08)}`)),
    wink: () => eye(cx - ex) + stroke(`M${f(cx + ex - s * .12)} ${f(ey + s * .03)} q${f(s * .12)} ${f(-s * .15)} ${f(s * .24)} 0`),
    dead: () => both(x => stroke(`M${f(x - s * .1)} ${f(ey - s * .1)} l${f(s * .2)} ${f(s * .2)} M${f(x + s * .1)} ${f(ey - s * .1)} l${f(-s * .2)} ${f(s * .2)}`)),
    star: () => both(x => sc2Icon('star', x, ey, s * .16, '#f2c14e')), heart: () => both(x => sc2Icon('heart', x, ey, s * .15, '#e0245e')),
    spiral: () => both(x => stroke(`M${f(x)} ${f(ey)} m${f(-s * .03)} 0 a${f(s * .03)} ${f(s * .03)} 0 1 1 ${f(s * .06)} 0 a${f(s * .07)} ${f(s * .07)} 0 1 1 ${f(-s * .13)} 0 a${f(s * .11)} ${f(s * .11)} 0 1 1 ${f(s * .21)} 0`, f(sw * .7)))
  };
  const browY = ey - s * .26, bl = s * .14;
  const B = {none: () => '', flat: () => both(x => stroke(`M${f(x - bl)} ${f(browY)} H${f(x + bl)}`)), up: () => both(x => stroke(`M${f(x - bl)} ${f(browY - s * .02)} q${f(bl)} ${f(-s * .1)} ${f(bl * 2)} 0`)),
    angry: () => both((x, d) => stroke(`M${f(x - d * bl)} ${f(browY - s * .06)} L${f(x + d * bl)} ${f(browY + s * .04)}`)), sad: () => both((x, d) => stroke(`M${f(x - d * bl)} ${f(browY + s * .04)} L${f(x + d * bl)} ${f(browY - s * .06)}`)),
    one: () => stroke(`M${f(cx - ex - bl)} ${f(browY)} H${f(cx - ex + bl)}`) + stroke(`M${f(cx + ex - bl)} ${f(browY - s * .04)} q${f(bl)} ${f(-s * .12)} ${f(bl * 2)} 0`)};
  const m = (d, w = sw) => stroke(d, w);
  const M = {
    smile: () => m(`M${f(cx - s * .24)} ${f(my - s * .04)} q${f(s * .24)} ${f(s * .22)} ${f(s * .48)} 0`), soft: () => m(`M${f(cx - s * .16)} ${f(my)} q${f(s * .16)} ${f(s * .1)} ${f(s * .32)} 0`),
    grin: () => fill(`M${f(cx - s * .28)} ${f(my - s * .06)} h${f(s * .56)} q0 ${f(s * .26)} ${f(-s * .28)} ${f(s * .26)} q${f(-s * .28)} 0 ${f(-s * .28)} ${f(-s * .26)}z`, '#fff') + m(`M${f(cx - s * .28)} ${f(my - s * .06)} h${f(s * .56)} q0 ${f(s * .26)} ${f(-s * .28)} ${f(s * .26)} q${f(-s * .28)} 0 ${f(-s * .28)} ${f(-s * .26)}z`, f(sw * .8)),
    laugh: () => fill(`M${f(cx - s * .28)} ${f(my - s * .08)} h${f(s * .56)} q0 ${f(s * .36)} ${f(-s * .28)} ${f(s * .36)} q${f(-s * .28)} 0 ${f(-s * .28)} ${f(-s * .36)}z`, '#7a2e2e') + fill(`M${f(cx - s * .14)} ${f(my + s * .2)} q${f(s * .14)} ${f(-s * .1)} ${f(s * .28)} 0 q${f(-s * .14)} ${f(s * .1)} ${f(-s * .28)} 0z`, '#e57373') + rc(cx - s * .24, my - s * .08, s * .48, s * .07, '#fff', 1, ' stroke="none"'),
    smirk: () => m(`M${f(cx - s * .16)} ${f(my + s * .02)} q${f(s * .2)} ${f(s * .05)} ${f(s * .32)} ${f(-s * .12)}`), flat: () => m(`M${f(cx - s * .18)} ${f(my)} H${f(cx + s * .18)}`),
    o: () => `<ellipse cx="${f(cx)}" cy="${f(my + s * .04)}" rx="${f(s * .09)}" ry="${f(s * .11)}" fill="#5a2323" stroke="none"/>`, big_o: () => `<ellipse cx="${f(cx)}" cy="${f(my + s * .06)}" rx="${f(s * .16)}" ry="${f(s * .2)}" fill="#5a2323" stroke="none"/>`,
    wavy: () => m(`M${f(cx - s * .24)} ${f(my)} l${f(s * .08)} ${f(-s * .06)} l${f(s * .08)} ${f(s * .06)} l${f(s * .08)} ${f(-s * .06)} l${f(s * .08)} ${f(s * .06)} l${f(s * .08)} ${f(-s * .06)}`),
    frown: () => m(`M${f(cx - s * .2)} ${f(my + s * .08)} q${f(s * .2)} ${f(-s * .18)} ${f(s * .4)} 0`), pout: () => m(`M${f(cx - s * .12)} ${f(my + s * .06)} q${f(s * .12)} ${f(-s * .1)} ${f(s * .24)} 0`),
    tongue: () => m(`M${f(cx - s * .22)} ${f(my - s * .04)} q${f(s * .22)} ${f(s * .18)} ${f(s * .44)} 0`) + fill(`M${f(cx - s * .06)} ${f(my + s * .04)} q${f(s * .1)} ${f(s * .24)} ${f(s * .2)} 0z`, '#e57373'),
    duck: () => fill(`M${f(cx - s * .15)} ${f(my)} q${f(s * .15)} ${f(-s * .14)} ${f(s * .3)} 0 q${f(-s * .15)} ${f(s * .16)} ${f(-s * .3)} 0z`, '#c2606a'),
    pen: () => m(`M${f(cx - s * .15)} ${f(my)} H${f(cx + s * .15)}`) + ln(cx - s * .1, my + s * .02, cx + s * .7, my - s * .1, '#1d4ed8', s * .07),
    fine: () => m(`M${f(cx - s * .28)} ${f(my - s * .06)} q${f(s * .28)} ${f(s * .12)} ${f(s * .56)} 0`) + m(`M${f(cx - s * .28)} ${f(my - s * .06)} l${f(-s * .04)} ${f(-s * .06)}`, f(sw * .8)),
    teeth: () => fill(`M${f(cx - s * .26)} ${f(my - s * .06)} h${f(s * .52)} v${f(s * .14)} h${f(-s * .52)}z`, '#fff') + m(`M${f(cx - s * .26)} ${f(my - s * .06)} h${f(s * .52)} v${f(s * .14)} h${f(-s * .52)}z M${f(cx - s * .26)} ${f(my + s * .01)} h${f(s * .52)}`, f(sw * .7)),
    wobble: () => fill(`M${f(cx - s * .24)} ${f(my + s * .12)} q${f(s * .24)} ${f(-s * .3)} ${f(s * .48)} 0z`, '#5a2323'), side: () => m(`M${f(cx - s * .08)} ${f(my + s * .02)} h${f(s * .24)}`)
  };
  const X = {
    blush: () => both(x => `<ellipse cx="${f(x + (x < cx ? -1 : 1) * s * .06)}" cy="${f(cy + s * .26)}" rx="${f(s * .14)}" ry="${f(s * .08)}" fill="#f28b9a" stroke="none" opacity=".5"/>`),
    tears: () => both(x => stroke(`M${f(x)} ${f(ey + s * .15)} q${f(-s * .05)} ${f(s * .3)} 0 ${f(s * .55)}`, f(s * .07), '#6ec6ff')),
    stream: () => both(x => `<path d="M${f(x - s * .07)} ${f(ey + s * .06)} h${f(s * .14)} l${f(s * .03)} ${f(s * .9)} h${f(-s * .2)}z" fill="#8fd3ff" stroke="none" opacity=".85"/>`),
    sweat: () => fill(`M${f(cx + s * .8)} ${f(cy - s * .5)} q${f(s * .1)} ${f(s * .18)} 0 ${f(s * .26)} q${f(-s * .1)} ${f(-s * .08)} 0 ${f(-s * .26)}z`, '#8fd3ff'),
    zzz: () => `<text x="${f(cx + s * .9)}" y="${f(cy - s * .9)}" font-size="${f(s * .38)}" fill="#fff" font-weight="700" font-family="ui-sans-serif,system-ui" opacity=".9">z z</text>`,
    melt: () => fill(`M${f(cx - s * .5)} ${f(cy + s * .8)} q0 ${f(s * .3)} ${f(s * .1)} ${f(s * .3)} q${f(s * .1)} 0 ${f(s * .1)} ${f(-s * .2)} q${f(s * .2)} ${f(s * .35)} ${f(s * .35)} 0 q${f(s * .1)} ${f(s * .2)} ${f(s * .25)} 0`, skin),
    sparkle: () => sc2Icon('star', cx + s * 1.0, cy - s * .75, s * .14, '#ffe14f'), sparkles: () => sc2Icon('star', cx + s * 1.0, cy - s * .75, s * .14, '#ffe14f') + sc2Icon('star', cx - s * 1.05, cy - s * .55, s * .1, '#ffe14f'),
    think: () => ci(cx + s * 1.05, cy - s * .8, s * .1, '#fff', ' opacity=".8"') + ci(cx + s * 1.25, cy - s * 1.05, s * .16, '#fff', ' opacity=".8"'),
    qmark: () => `<text x="${f(cx + s * .95)}" y="${f(cy - s * .7)}" font-size="${f(s * .5)}" fill="#fff" font-weight="800" font-family="ui-sans-serif,system-ui" stroke="#2a1f1a" stroke-width="1.2">?</text>`,
    vein: () => stroke(`M${f(cx + s * .55)} ${f(cy - s * .7)} l${f(s * .12)} ${f(s * .05)} M${f(cx + s * .62)} ${f(cy - s * .78)} l${f(s * .05)} ${f(s * .12)} M${f(cx + s * .75)} ${f(cy - s * .72)} l${f(-s * .1)} ${f(s * .08)}`, f(s * .05), '#d33'),
    lines: () => both(x => stroke(`M${f(x - s * .16)} ${f(cy + s * .2)} l${f(s * .1)} ${f(-s * .04)} M${f(x - s * .14)} ${f(cy + s * .28)} l${f(s * .12)} ${f(-s * .03)}`, f(sw * .6), '#c0392b')),
    breath: () => pa(`M${f(cx + s * .4)} ${f(my + s * .05)} q${f(s * .3)} ${f(-s * .1)} ${f(s * .5)} ${f(s * .05)}`, 'none', ` stroke="#fff" stroke-width="${f(s * .06)}" opacity=".7"`),
    shock: () => [0, 1, 2].map(k => stroke(`M${f(cx + (k - 1) * s * .3)} ${f(cy - s * 1.2)} l${f((k - 1) * s * .06)} ${f(-s * .16)}`, f(s * .05), '#2a1f1a')).join('')
  };
  const map = {smile: ['open', 'flat', 'smile', 'blush'], smirk: ['side', 'flat', 'smirk'], laugh: ['happy', 'up', 'laugh', 'blush'], proud: ['happy', 'up', 'smile', 'blush'], grin: ['open', 'up', 'grin'], soft: ['happy', 'flat', 'soft'],
    sleepy: ['half', 'flat', 'flat', 'zzz'], yawn: ['closed', 'up', 'big_o'], dead: ['dead', 'none', 'flat'], melt: ['heavy', 'sad', 'wavy', 'melt'], headdesk: ['closed', 'sad', 'flat'],
    panic: ['wide', 'up', 'big_o', 'sweat'], fakecry: ['closed', 'sad', 'wavy', 'tears'], grimace: ['squint', 'sad', 'teeth'], fine: ['open', 'sad', 'fine', 'sweat'], sweat: ['open', 'sad', 'wavy', 'sweat'],
    locked: ['open', 'angry', 'flat'], squint: ['squint', 'angry', 'flat'], pen: ['look', 'angry', 'pen'], think: ['lookup', 'one', 'smirk', 'think'],
    tongue: ['wink', 'up', 'tongue'], wink: ['wink', 'flat', 'smile'], duck: ['open', 'up', 'duck', 'blush'], side: ['side', 'angry', 'side'],
    surprised: ['wide', 'up', 'o', 'shock'], starstruck: ['star', 'up', 'grin'], love: ['heart', 'up', 'smile', 'blush'], confused: ['open', 'one', 'wavy', 'qmark'],
    annoyed: ['heavy', 'angry', 'pout', 'vein'], bored: ['heavy', 'flat', 'side', 'breath'], determined: ['open', 'angry', 'smirk'], nervous: ['open', 'sad', 'grin', 'sweat'],
    relieved: ['closed', 'up', 'soft', 'breath'], cringe: ['squint', 'sad', 'teeth', 'lines'], excited: ['happy', 'up', 'laugh', 'blush'], sob: ['closed', 'sad', 'wobble', 'stream'],
    skeptical: ['side', 'one', 'flat'], shy: ['look', 'sad', 'soft', 'blush'], unimpressed: ['heavy', 'flat', 'flat']}[e] || ['open', 'flat', 'smile'];
  return B[map[1]]() + E[map[0]]() + M[map[2]]() + (map[3] ? X[map[3]]() : '');
};
function sc2Collar(L, cx, top, s){
  const T = L.top, col = L.outfit, dk = sc2Shade(col, .2), w = s * .5, f = v => +v.toFixed(1);
  if (T === 'tee' || T === 'hoodie' || T === 'sweater') return `<path d="M${f(cx - w)} ${f(top + 1)} Q${f(cx)} ${f(top + 22)} ${f(cx + w)} ${f(top + 1)}" fill="none" stroke="${L.print === 'ringer' ? L.trim : dk}" stroke-width="${T === 'sweater' ? 8 : 5}" stroke-linecap="round"/>`;
  return '';
}
scHead = function(L0, cx, cy, s0, expr, tilt = 0, neckTo = cy + s0 * 1.2){
  // a slightly smaller head than before, with ears, a nose, a neck that narrows into the collar, and the person's own details
  const L = sc2LookFill(L0), s = s0 * .9, f = v => +v.toFixed(1), sk = L.skin, shade = sc2Shade(sk, .14);
  const neck = L.style === 'hijab' ? pa(`M${f(cx - s * 1.1)} ${f(cy + s * .1)} C${f(cx - s * 1.2)} ${f(neckTo - s * .1)} ${f(cx - s * 1.6)} ${f(neckTo + s * .1)} ${f(cx - s * 1.75)} ${f(neckTo + s * .55)} Q${f(cx)} ${f(neckTo + s * 1.25)} ${f(cx + s * 1.75)} ${f(neckTo + s * .55)} C${f(cx + s * 1.6)} ${f(neckTo + s * .1)} ${f(cx + s * 1.2)} ${f(neckTo - s * .1)} ${f(cx + s * 1.1)} ${f(cy + s * .1)}z`, L.scarf) + pa(`M${f(cx - s * .7)} ${f(neckTo + s * .25)} Q${f(cx)} ${f(neckTo + s * .65)} ${f(cx + s * .7)} ${f(neckTo + s * .25)} M${f(cx - s * 1.2)} ${f(neckTo + s * .3)} Q${f(cx - s * .9)} ${f(neckTo + s * .6)} ${f(cx - s * .6)} ${f(neckTo + s * .85)}`, 'none', ` stroke="${sc2Shade(L.scarf, .25)}" stroke-width="${f(Math.max(1.4, s * .04))}" opacity=".7"`) : `<path d="M${f(cx - s * .27)} ${f(cy + s * .6)} L${f(cx - s * .3)} ${f(neckTo - 4)} Q${f(cx - s * .32)} ${f(neckTo + 2)} ${f(cx - s * .42)} ${f(neckTo + 4)} Q${f(cx)} ${f(neckTo + 18)} ${f(cx + s * .42)} ${f(neckTo + 4)} Q${f(cx + s * .32)} ${f(neckTo + 2)} ${f(cx + s * .3)} ${f(neckTo - 4)} L${f(cx + s * .27)} ${f(cy + s * .6)}z" fill="${sk}"/>` + `<path d="M${f(cx - s * .27)} ${f(cy + s * .9)} Q${f(cx)} ${f(cy + s * 1.12)} ${f(cx + s * .27)} ${f(cy + s * .9)} V${f(cy + s * .8)} H${f(cx - s * .27)}z" fill="${shade}" stroke="none" opacity=".35"/>` + sc2Collar(L, cx, neckTo, s);
  // hair that hangs down the back is hidden behind the shoulders: it stops where the collar starts
  const hid = 'hb' + (sc2BodyN++), back = `<defs><clipPath id="${hid}"><rect x="-500" y="-500" width="1300" height="${f(neckTo + 503)}"/></clipPath></defs><g clip-path="url(#${hid})">${scHairBack(L, cx, cy, s)}</g>`;
  let g = [-1, 1].map(d => `<ellipse cx="${f(cx + d * s * .88)}" cy="${f(cy + s * .05)}" rx="${f(s * .15)}" ry="${f(s * .21)}" fill="${sk}"/><ellipse cx="${f(cx + d * s * .9)}" cy="${f(cy + s * .05)}" rx="${f(s * .07)}" ry="${f(s * .11)}" fill="${shade}" stroke="none" opacity=".9"/>`).join('');
  if (L.earring && L.style !== 'hijab') g += [-1, 1].map(d => ci(cx + d * s * .9, cy + s * .28, s * .05, '#f2c14e', ' stroke="none"')).join('');
  const line = ` fill="none" stroke="rgba(30,20,14,.45)" stroke-width="${f(Math.max(1.3, s * .035))}"`;
  g += [-1, 1].map(d => `<ellipse cx="${f(cx + d * s * .88)}" cy="${f(cy + s * .05)}" rx="${f(s * .15)}" ry="${f(s * .21)}"${line}/>`).join('');
  g += `<path d="${sc2FacePath(cx, cy, s)}" fill="${sk}"/><path d="${sc2FacePath(cx, cy, s)}"${line}/>`;
  sc2EyeCol = L.eyes;
  if (L.freckles) g += [[-.42, .22], [-.32, .3], [-.5, .3], [.42, .22], [.32, .3], [.5, .3]].map(([a, b]) => ci(cx + a * s, cy + b * s, s * .025, sc2Shade(sk, .35), ' stroke="none"')).join('');
  if (L.blush && !['smile', 'laugh', 'duck', 'love', 'shy'].includes(expr)) g += [-1, 1].map(d => `<ellipse cx="${f(cx + d * s * .45)}" cy="${f(cy + s * .28)}" rx="${f(s * .12)}" ry="${f(s * .06)}" fill="#f28b9a" stroke="none" opacity=".35"/>`).join('');
  if (L.beard) g += `<path d="M${f(cx - s * .86)} ${f(cy + s * .15)} C${f(cx - s * .8)} ${f(cy + s * .75)} ${f(cx - s * .45)} ${f(cy + s * 1.1)} ${f(cx)} ${f(cy + s * 1.1)} C${f(cx + s * .45)} ${f(cy + s * 1.1)} ${f(cx + s * .8)} ${f(cy + s * .75)} ${f(cx + s * .86)} ${f(cy + s * .15)} Q${f(cx + s * .55)} ${f(cy + s * .55)} ${f(cx)} ${f(cy + s * .4)} Q${f(cx - s * .55)} ${f(cy + s * .55)} ${f(cx - s * .86)} ${f(cy + s * .15)}z" fill="${L.hair}"/>`;
  // the nose: a soft shadow on one side and a little curve
  g += `<path d="M${f(cx + s * .02)} ${f(cy + s * .08)} q${f(s * .09)} ${f(s * .14)} ${f(-s * .03)} ${f(s * .2)}" fill="none" stroke="${sc2Shade(sk, .3)}" stroke-width="${f(Math.max(1.3, s * .045))}" stroke-linecap="round"/>`;
  g += scFace(expr, cx, cy, s, sk) + scHairFront(L, cx, cy, s);
  if (L.glasses){ const gw = f(Math.max(1.5, s * .05)), gy = cy - s * .02, lens = x => L.frames === 'square' ? rc(x - s * .2, gy - s * .16, s * .4, s * .32, 'none', s * .06, ` stroke="#2c2c2a" stroke-width="${gw}"`) : L.frames === 'cat' ? pa(`M${f(x - s * .21)} ${f(gy - s * .12)} Q${f(x)} ${f(gy - s * .2)} ${f(x + s * .23)} ${f(gy - s * .17)} Q${f(x + s * .22)} ${f(gy + s * .18)} ${f(x)} ${f(gy + s * .16)} Q${f(x - s * .22)} ${f(gy + s * .14)} ${f(x - s * .21)} ${f(gy - s * .12)}z`, 'none', ` stroke="#2c2c2a" stroke-width="${gw}"`) : ci(x, gy, s * .2, 'none', ` stroke="#2c2c2a" stroke-width="${gw}"`);
    g += lens(cx - s * .34) + lens(cx + s * .34) + ln(cx - s * .14, gy - s * .02, cx + s * .14, gy - s * .02, '#2c2c2a', gw); }
  const neckLine = L.style === 'hijab' ? '' : `<path d="M${f(cx - s * .27)} ${f(cy + s * .7)} L${f(cx - s * .3)} ${f(neckTo - 4)} Q${f(cx - s * .32)} ${f(neckTo + 2)} ${f(cx - s * .42)} ${f(neckTo + 4)} M${f(cx + s * .27)} ${f(cy + s * .7)} L${f(cx + s * .3)} ${f(neckTo - 4)} Q${f(cx + s * .32)} ${f(neckTo + 2)} ${f(cx + s * .42)} ${f(neckTo + 4)}" fill="none" stroke="rgba(30,20,14,.45)" stroke-width="${f(Math.max(1.3, s * .035))}"/>`;
  return (tilt ? `<g transform="rotate(${tilt} ${cx} ${cy})">${back}</g>` : back) + neck + neckLine + (tilt ? `<g transform="rotate(${tilt} ${cx} ${cy})">${g}</g>` : g);
};
{
  // bots sometimes get one of the newer hairstyles too (always the same one for the same bot)
  const _look = scLook;
  scLook = function(i){ const L = _look(i), r = mulberry32((i >>> 0) * 2654435761 + 7); if (r() < .3) L.style = ['braids', 'hijab', 'bangs', 'beanie', 'bangs', 'braids'][Math.floor(r() * 6)]; return sc2LookFill({...L, top: undefined, print: undefined}); };
}
// the back of your head and shoulders, for over-the-shoulder shots
function sc2BackHead(L0, cx, cy, s){
  const L = sc2LookFill(L0), cover = L.style === 'hijab' ? L.scarf : L.style === 'beanie' ? L.hat : L.hair, f = v => +v.toFixed(1);
  let g = pa(`M${cx - s * 1.85} 310 L${cx - s * 1.7} ${cy + s * 1.6} Q${cx - s * 1.55} ${cy + s * 1.12} ${cx - s * .45} ${cy + s * 1.05} Q${cx} ${cy + s * 1.15} ${cx + s * .45} ${cy + s * 1.05} Q${cx + s * 1.55} ${cy + s * 1.12} ${cx + s * 1.7} ${cy + s * 1.6} L${cx + s * 1.85} 310z`, L.outfit);   // shoulders sloping out from the neck
  if (L.top === 'hoodie') g += pa(`M${cx - s * .85} ${cy + s * 1.0} Q${cx} ${cy + s * 1.6} ${cx + s * .85} ${cy + s * 1.0} Q${cx} ${cy + s * .7} ${cx - s * .85} ${cy + s * 1.0}z`, sc2Shade(L.outfit, .15));
  const shoulders = g; g = '';   // the head part is narrowed below: a head is taller than it is wide
  g += rc(cx - s * .28, cy + s * .5, s * .56, s * .7, L.skin, s * .1);
  g += [-1, 1].map(d => `<ellipse cx="${f(cx + d * s * .9)}" cy="${f(cy + s * .1)}" rx="${f(s * .14)}" ry="${f(s * .2)}" fill="${L.skin}"/>`).join('');
  if (L.style === 'afro') g += ci(cx, cy - s * .2, s * 1.35, cover);
  else if (L.style === 'curly'){ for (let k = 0; k < 14; k++){ const a = k / 14 * Math.PI * 2; g += ci(cx + Math.cos(a) * s * .9, cy - s * .1 + Math.sin(a) * s * .9, s * .32, cover); } g += ci(cx, cy - s * .1, s * .95, cover); }
  else if (L.style === 'hijab') g += pa(`M${f(cx - s * 1.1)} ${f(cy + s * .2)} C${f(cx - s * 1.2)} ${f(cy - s * 1.4)} ${f(cx + s * 1.2)} ${f(cy - s * 1.4)} ${f(cx + s * 1.1)} ${f(cy + s * .2)} L${f(cx + s * 1.5)} ${f(cy + s * 1.7)} H${f(cx - s * 1.5)}z`, cover);
  else if (L.style === 'spiky'){ const pts = []; for (let k = 0; k <= 14; k++){ const a = Math.PI + k / 14 * Math.PI, rr = s * (k % 2 ? 1.12 : .92); pts.push(`${f(cx + Math.cos(a) * rr)} ${f(cy - s * .15 + Math.sin(a) * rr * 1.08)}`); } g += `<path d="M${pts.join(' L')} C${f(cx + s * .9)} ${f(cy + s * .55)} ${f(cx + s * .4)} ${f(cy + s * .72)} ${f(cx)} ${f(cy + s * .72)} C${f(cx - s * .4)} ${f(cy + s * .72)} ${f(cx - s * .9)} ${f(cy + s * .55)} ${f(cx - s * .92)} ${f(cy - s * .15)}z" fill="${cover}"/>`; }
  else {
    const len = {long: 1.9, bangs: 1.4, bob: .85, braids: .72}[L.style] || .72;
    g += pa(len > 1 ? `M${f(cx - s * .92)} ${f(cy)} C${f(cx - s * .95)} ${f(cy - s * 1.45)} ${f(cx + s * .95)} ${f(cy - s * 1.45)} ${f(cx + s * .92)} ${f(cy)} L${f(cx + s * 1.0)} ${f(cy + s * len)} Q${f(cx)} ${f(cy + s * (len + .12))} ${f(cx - s * 1.0)} ${f(cy + s * len)}z` : `M${f(cx - s * .9)} ${f(cy)} C${f(cx - s * .93)} ${f(cy - s * 1.45)} ${f(cx + s * .93)} ${f(cy - s * 1.45)} ${f(cx + s * .9)} ${f(cy)} C${f(cx + s * .88)} ${f(cy + s * len * .8)} ${f(cx + s * .4)} ${f(cy + s * len)} ${f(cx)} ${f(cy + s * len)} C${f(cx - s * .4)} ${f(cy + s * len)} ${f(cx - s * .88)} ${f(cy + s * len * .8)} ${f(cx - s * .9)} ${f(cy)}z`, L.style === 'beanie' ? L.hair : cover);
    if (L.style === 'beanie') g += pa(`M${f(cx - s * 1.02)} ${f(cy - s * .2)} C${f(cx - s * 1.05)} ${f(cy - s * 1.5)} ${f(cx + s * 1.05)} ${f(cy - s * 1.5)} ${f(cx + s * 1.02)} ${f(cy - s * .2)}z`, cover) + rc(cx - s * 1.05, cy - s * .38, s * 2.1, s * .3, sc2Shade(cover, .15), s * .1) + ci(cx, cy - s * 1.28, s * .2, sc2Tint(cover, .25));
    if (L.style === 'bun') g += ci(cx, cy - s * 1.0, s * .42, cover);
    if (L.style === 'pony') g += rc(cx - s * .16, cy - s * .2, s * .32, s * 1.3, cover, s * .16);
    if (L.style === 'braids') g += [-1, 1].map(d => [0, 1, 2, 3].map(k => `<ellipse cx="${f(cx + d * s * .35)}" cy="${f(cy + s * (.6 + k * .32))}" rx="${f(s * .17)}" ry="${f(s * .2)}" fill="${cover}"/>`).join('')).join('');
  }
  return `<g class="ol">${shoulders}${g}</g>`;
}
// the pen-in-mouth face was retired; older posts that had it show as "locked in"
delete SC.EXPR.pen; SC.EXPR_KEYS = Object.keys(SC.EXPR);
{
  const _svg = sceneSvg, _desc = sceneDesc;
  sceneSvg = function(S, uid){ return _svg(S.expr === 'pen' ? {...S, expr: 'locked'} : S, uid); };
  sceneDesc = function(S){ return _desc(S.expr === 'pen' ? {...S, expr: 'locked'} : S); };
}
