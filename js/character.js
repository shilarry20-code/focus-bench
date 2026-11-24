/* ---------- characters: everyone's picture is their character ----------
   Every player (you and the simulated ones) is a small drawn character: skin, hair, outfit, glasses, headphones,
   a beanie, a face and a background colour. A character is a short "look" object, for example
   {sk: 2, hc: 1, hs: 'short', ot: 'hoodie', oc: 0, gl: 0, hp: 0, ht: 0, ey: 0, mo: 0, bl: 0, bg: 0, bp: 0},
   and the same look always draws the same picture. Simulated players get their look from their number, so they look
   the same on every device; yours is saved in your settings (P.myLook) and syncs. Nothing is downloaded: it's all
   SVG drawn here. chFigure() draws the character on a 120 x 120 canvas (head at 60,50) so the same parts can be
   reused for bigger scenes later. */

const CH_SKIN = ['#f6d7c3', '#eec4a5', '#e0ac85', '#c98e64', '#a86f48', '#7c4f31', '#5b3a24'];
const CH_HAIR = ['#1d1a1a', '#3b2a20', '#5d3b25', '#8a5a33', '#c9a26a', '#e8d29a', '#b4472b', '#7d7d86', '#2b3a8f', '#a0337a', '#2f8f6b', '#e7e7ea', '#f08cb6'];
const CH_OUTFIT_C = ['#c9805a', '#4b86c6', '#5e9a6b', '#7a63b5', '#3a4252', '#d8473f', '#e3b04b', '#6fa38a', '#b9c2cf', '#e87ca0', '#2f3e5c', '#f1f1ec'];
const CH_BG = ['#f2d675', '#9cc5e8', '#b7dcc2', '#d9c2f0', '#f4b9a8', '#e8b44a', '#8fb3a8', '#c9cfda', '#f0a8c0', '#5b7f9e', '#3a4252', '#c9805a'];
const CH_HAIRSTYLES = [['short', 'Short'], ['buzz', 'Buzz'], ['side', 'Side part'], ['curly', 'Curly'], ['spiky', 'Spiky'], ['bob', 'Bob'], ['long', 'Long'], ['bun', 'Bun'], ['afro', 'Afro'], ['bald', 'Bald'], ['mohawk', 'Mohawk'], ['pigtails', 'Pigtails'], ['ponytail', 'Ponytail'], ['braid', 'Braid'], ['curtains', 'Curtains'], ['wavy', 'Wavy'], ['slick', 'Slick']];
const CH_OUTFITS = [['hoodie', 'Hoodie'], ['tee', 'T-shirt'], ['sweater', 'Sweater'], ['coat', 'Lab coat'], ['blazer', 'Blazer'], ['tank', 'Tank'], ['polo', 'Polo'], ['jacket', 'Jacket'], ['jersey', 'Jersey'], ['turtle', 'Turtleneck']];
const CH_GLASSES = [['0', 'None'], ['1', 'Round'], ['2', 'Square'], ['3', 'Aviator'], ['4', 'Cat-eye'], ['5', 'Shades']];
const CH_EYES = [['0', 'Round'], ['1', 'Happy'], ['2', 'Sleepy'], ['3', 'Tall'], ['4', 'Big']];
const CH_EYE_C = ['#3b2a20', '#7a4a26', '#a8742a', '#4f8f4a', '#2f8f9a', '#4b86c6', '#2b3a8f', '#7d7d86', '#a0337a', '#d8473f'];
const CH_BROWS = [['0', 'Soft'], ['1', 'Straight'], ['2', 'Arched'], ['3', 'Thick']];
const CH_MOUTHS = [['0', 'Smile'], ['1', 'Grin'], ['2', 'Calm'], ['3', 'Oh'], ['4', 'Smirk'], ['5', 'Laugh'], ['6', 'Frown'], ['7', 'Tongue'], ['8', 'Cat'], ['9', 'Soft']];
const CH_BGPAT = [['0', 'Plain'], ['1', 'Spotlight'], ['2', 'Stripe']];
const CH_GENDER = [['2', 'Neutral'], ['0', 'Masculine'], ['1', 'Feminine']];
const CH_BUILD = [['0', 'Slim'], ['1', 'Average'], ['2', 'Broad']];
const CH_BOTTOMS = [['jeans', 'Jeans'], ['joggers', 'Joggers'], ['shorts', 'Shorts'], ['skirt', 'Skirt'], ['cargo', 'Cargo'], ['leggings', 'Leggings'], ['capris', 'Capris']];
const CH_SHOES = [['sneakers', 'Sneakers'], ['boots', 'Boots'], ['slides', 'Slides'], ['hightops', 'High-tops'], ['loafers', 'Loafers'], ['heels', 'Heels'], ['sandals', 'Sandals']];
const CH_BOTTOM_C = ['#3a5a8c', '#2b3a4f', '#1d1a1a', '#6b6f78', '#a9b4c4', '#8a6a4a', '#5e7a55', '#b04a4a', '#e8e2d0', '#7a63b5'];
const CH_SHOE_C = ['#f1f1ec', '#1d1a1a', '#d8473f', '#4b86c6', '#e3b04b', '#5e9a6b', '#8a5a33', '#e87ca0'];
const CH_FACES = [['0', 'Round'], ['1', 'Oval'], ['2', 'Wide'], ['3', 'Square'], ['4', 'Heart'], ['5', 'Long'], ['6', 'Diamond'], ['7', 'Pear'], ['8', 'Full']];
const CH_NOSES = [['0', 'Line'], ['1', 'Button'], ['2', 'Hooked'], ['3', 'Wide'], ['4', 'Pointed']];
const CH_EARS = [['0', 'Round'], ['1', 'Pointed'], ['2', 'Big'], ['3', 'Small']];
const CH_FACIAL = [['0', 'None'], ['1', 'Stubble'], ['2', 'Mustache'], ['3', 'Beard']];
const CH_POSES = [['0', 'Relaxed'], ['1', 'Arms out'], ['2', 'Wave']];
const CH_HATS = [['0', 'None'], ['1', 'Beanie'], ['2', 'Bucket'], ['3', 'Headband']];
const CH_EARRINGS = [['0', 'None'], ['1', 'Studs'], ['2', 'Hoops'], ['3', 'Dangles']];
const CH_DEFAULT = {sk: 2, hc: 1, hs: 'short', ot: 'hoodie', oc: 0, gl: 0, hp: 0, ht: 0, ey: 0, mo: 0, bl: 0, bg: 0, bp: 1, gd: 2, bd: 1, bt: 'jeans', bc: 0, sn: 'sneakers', sc: 0, ls: 0, ec: 0, br: 0, eh: '', oh: '', bh: '', sh: '', fs: 0, nz: 0, ea: 0, fh: 0, fk: 0, ap: 0, ha: 0, eg: 0, sf: 0, nk: 0};

// a simulated player's look, worked out from their number
const CH_CACHE = new Map();
function chLookOf(i){
  const r = mulberry32((i * 2654435761 >>> 0) ^ 0x7f4a7c15), n = a => Math.floor(r() * a);
  const sk = [0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6][n(12)], natural = r() < .8;
  const o = {sk, hc: natural ? [0, 0, 1, 1, 1, 2, 2, 3, 4, 5, 6, 7][n(12)] : 8 + n(5), hs: CH_HAIRSTYLES[n(9)][0],
    ot: CH_OUTFITS[n(5)][0], oc: n(CH_OUTFIT_C.length), gl: r() < .35 ? 1 + n(2) : 0, hp: r() < .15 ? 1 : 0, ht: r() < .08 ? 1 : 0,
    ey: [0, 0, 0, 1, 1, 2][n(6)], mo: [0, 0, 0, 1, 2, 3][n(6)], bl: r() < .25 ? 1 : 0, bg: n(CH_BG.length), bp: n(3)};
  o.gd = [0, 1, 2, 2][n(4)]; o.bd = [0, 1, 1, 2][n(4)]; o.bt = CH_BOTTOMS[n(4)][0]; o.bc = n(CH_BOTTOM_C.length); o.sn = CH_SHOES[n(3)][0]; o.sc = n(CH_SHOE_C.length); o.ls = o.gd === 1 && r() < .6 ? 1 : 0;
  o.ec = n(CH_EYE_C.length); o.br = n(CH_BROWS.length);
  if (r() < .3) o.mo = 4 + n(6); if (r() < .15) n(7);   // old lip-color draw, kept so every bot's look stays the same
  // newer options, drawn last so older looks never change; most bots keep the plain version
  if (r() < .5) o.fs = n(5); if (r() < .4) o.nz = n(CH_NOSES.length); if (r() < .3) o.ea = n(CH_EARS.length);
  if (r() < .25) o.fk = 1; if (r() < .2 && o.gd !== 1) o.fh = 1 + n(3); if (r() < .25) n(3); if (r() < .2) o.ap = n(3);
  if (r() < .12) o.ha = 1 + n(3); if (r() < .15) o.eg = 1 + n(3); if (r() < .1) o.sf = 1; if (r() < .1) o.nk = 1;
  if (r() < .25) o.hs = CH_HAIRSTYLES[9 + n(8)][0]; if (r() < .2) o.ot = CH_OUTFITS[5 + n(5)][0]; if (r() < .2) o.bt = CH_BOTTOMS[4 + n(3)][0]; if (r() < .2) o.sn = CH_SHOES[3 + n(4)][0];
  if (r() < .1) o.gl = 3 + n(3);
  return o;
}
// a saved look, cleaned so a bad or old value can never break the drawing
function chClean(l){
  const d = CH_DEFAULT, o = {}, num = (v, max, dv) => Number.isInteger(v) && v >= 0 && v < max ? v : dv;
  l = l || {};
  o.sk = num(l.sk, CH_SKIN.length, d.sk); o.hc = num(l.hc, CH_HAIR.length, d.hc); o.oc = num(l.oc, CH_OUTFIT_C.length, d.oc); o.bg = num(l.bg, CH_BG.length, d.bg);
  o.hs = CH_HAIRSTYLES.some(x => x[0] === l.hs) ? l.hs : d.hs; o.ot = CH_OUTFITS.some(x => x[0] === l.ot) ? l.ot : d.ot;
  o.gl = num(l.gl, CH_GLASSES.length, 0); o.ey = num(l.ey, CH_EYES.length, 0); o.ec = num(l.ec, CH_EYE_C.length, 0); o.br = num(l.br, CH_BROWS.length, 0); o.mo = num(l.mo, CH_MOUTHS.length, 0);
  const hex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : ''; o.eh = hex(l.eh); o.oh = hex(l.oh); o.bh = hex(l.bh); o.sh = hex(l.sh);   // an eye color picked freely instead of from the list
  o.bp = num(l.bp, 3, d.bp);
  o.fs = num(l.fs, CH_FACES.length, 0); o.nz = num(l.nz, CH_NOSES.length, 0); o.ea = num(l.ea, CH_EARS.length, 0); o.fh = num(l.fh, CH_FACIAL.length, 0); o.ap = num(l.ap, CH_POSES.length, 0); o.ha = num(l.ha, CH_HATS.length, 0); o.eg = num(l.eg, CH_EARRINGS.length, 0);
  o.fk = l.fk ? 1 : 0; o.sf = l.sf ? 1 : 0; o.nk = l.nk ? 1 : 0;
  o.hp = l.hp ? 1 : 0; o.ht = l.ht ? 1 : 0; o.bl = l.bl ? 1 : 0; o.ls = l.ls ? 1 : 0;
  o.gd = num(l.gd, 3, d.gd); o.bd = num(l.bd, 3, d.bd); o.bc = num(l.bc, CH_BOTTOM_C.length, d.bc); o.sc = num(l.sc, CH_SHOE_C.length, d.sc);
  o.bt = CH_BOTTOMS.some(x => x[0] === l.bt) ? l.bt : d.bt; o.sn = CH_SHOES.some(x => x[0] === l.sn) ? l.sn : d.sn;
  return o;
}
const chShade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => f(c).toString(16).padStart(2, '0')).join(''); };

// widths of the body, from gender and build
function chBuild(L){
  const sw = [52, 45, 50][L.gd] + [-5, 0, 5][L.bd], r = v => Math.round(v * 10) / 10;
  return {sw, ts: sw - 12, wa: r(sw * [.7, .6, .66][L.gd] * [.9, 1, 1.14][L.bd]), hp: r(sw * [.62, .74, .68][L.gd] * [.94, 1, 1.1][L.bd])};
}
// the whole character on a 120 x 240 canvas (no background). The head and shoulders sit at the top, so the top 120 is the portrait.
function chFigure(look){
  const L = chClean(look), skin = CH_SKIN[L.sk], hair = CH_HAIR[L.hc], top = L.oh || CH_OUTFIT_C[L.oc], ink = '#1a1f2b', M = chBuild(L), cx = 60, dk = chShade(top, .78);
  let back = '', body = '', front = '';
  // hair is drawn in two layers: one behind the head and shoulders, one in front. Every style is built from the head's own size, so it follows the face shape.
  const hw = [24, 22, 26, 24, 24, 21, 24, 22, 26][L.fs], HT = [25, 24, 27, 26, 27.5, 23, 25, 26, 25][L.fs], l = 59 - hw, r = 61 + hw, dy = HT - 25, tie = top, hs = L.hs, T = HT - 5;
  const P = p => `${+p[0].toFixed(2)} ${+p[1].toFixed(2)}`, mir = p => [120 - p[0], p[1]];
  // a hair piece that frames the face, as one shape: from the left tip, over the head, down to the right tip, then back up along the face
  const frame = (side, bot, botIn, inX, hairline) => {
    const st = [l - 1, 52]; let d = `M60 ${T}C${l + 9} ${T} ${l - 1} ${HT + 3} ${P(st)}`;
    side.forEach(([a, b, c]) => d += `C${P(a)} ${P(b)} ${P(c)}`);
    const ob = side[side.length - 1][2];
    d += `Q${(ob[0] + botIn) / 2} ${bot + 3} ${botIn} ${bot - 1}L${inX} 46${hairline}L${120 - inX} 46L${120 - botIn} ${bot - 1}Q${(240 - ob[0] - botIn) / 2} ${bot + 3} ${P(mir(ob))}`;
    for (let i = side.length - 1; i >= 0; i--) d += `C${P(mir(side[i][1]))} ${P(mir(side[i][0]))} ${P(mir(i ? side[i - 1][2] : st))}`;
    return `<path d="${d}C${r + 1} ${HT + 3} ${r - 9} ${T} 60 ${T}Z" fill="${hair}"/>`;
  };
  const arc = (a, b, sw, k) => { const c = (Math.hypot(b[0] - a[0], b[1] - a[1]) * (k || .58)).toFixed(2); return `A${c} ${c} 0 0 ${sw} ${P(b)}`; };
  const backFill = bot => `<path d="M${l + 2} 40H${r - 2}V${bot - 3}Q60 ${bot + 1} ${l + 2} ${bot - 3}Z" fill="${hair}"/>`;
  const HAIR = {
    long: () => frame([[[l - 4, 68], [l - 4, 88], [l - 2, 104]]], 104, l + 10, l + 4, `C${l + 5} ${HT + 9} 50 ${HT + 5} 57 ${HT + 5}C62 ${HT + 6} ${r - 5} ${HT + 9} ${r - 4} 46`),
    bob: () => frame([[[l - 5, 60], [l - 5, 72], [l + 1, 77]]], 78, l + 9, l + 4, `C${l + 4} 40 ${l + 6} 37.500 ${l + 10} 37.500Q60 40 ${r - 10} 37.500C${r - 6} 37.500 ${r - 4} 40 ${r - 4} 46`),
    wavy: () => frame([[[l - 8, 60], [l + 1, 68], [l - 4, 78]], [[l - 9, 88], [l - 1, 96], [l - 3, 106]]], 106, l + 9, l + 4, `C${l + 4} ${HT + 8} 50 ${HT + 4} 58 ${HT + 6}C66 ${HT + 8} ${r - 6} ${HT + 12} ${r - 4} 46`),
    curly: () => {
      const rx = hw + 6, ry = 50 - HT + 8, o = [];
      for (let k = 0; k <= 9; k++){ const a = (-198 + k * 24) * Math.PI / 180, sn = Math.sin(a); o.push([60 + rx * Math.cos(a), 50 + ry * sn * (sn > 0 ? .55 : 1)]); }
      const inn = [[r - 2, 58], [r - 3, 48], [r - 9, HT + 12], [67, HT + 14], [60, HT + 13], [53, HT + 14], [l + 9, HT + 12], [l + 3, 48], [l + 2, 58]];
      let d = `M${P(o[0])}`; for (let k = 1; k < o.length; k++) d += arc(o[k - 1], o[k], 1);
      d += arc(o[o.length - 1], inn[0], 1); for (let k = 1; k < inn.length; k++) d += arc(inn[k - 1], inn[k], 1);
      return `<path d="${d + arc(inn[inn.length - 1], o[0], 1)}Z" fill="${hair}"/>`;
    },
    spiky: () => {
      const rx = hw + 1, ry = 50 - HT + 3, o = [];
      for (let k = 0; k <= 12; k++){ const a = (-195 + k * 17.5) * Math.PI / 180, sn = Math.sin(a), tip = k % 2, sc = tip ? 1 + .5 * Math.max(.3, -sn) : 1;
        o.push([60 + rx * Math.cos(a) * sc + (tip ? (k / 12 - .5) * 8 : 0), 50 + ry * sn * sc]); }
      const inn = [[r - 1, 50], [r - 5, 42], [70, HT + 10], [66, HT + 15], [61, HT + 10], [55, HT + 15], [50, HT + 10], [l + 5, 42], [l + 1, 50]];
      return `<path d="M${o.map(P).join('L')}L${inn.map(P).join('L')}Z" fill="${hair}" stroke-linejoin="round"/>`;
    },
    braid: () => {
      // a side braid: the hair is swept over to one side, gathered behind the ear, and the braid hangs over the shoulder.
      // Its pieces alternate left and right and get a little narrower toward the end, like a real braid.
      const n = 6, h = 8.200, y0 = 58, x0 = r + 1, cxAt = t => x0 - 3 * t, wAt = t => 6.800 - 2.600 * t, yb = y0 + n * h, dk2 = chShade(hair, .55);
      const Lp = [], Rp = [];
      for (let k = 0; k <= n; k++){ const t = k / n; Lp.push([cxAt(t) - wAt(t), y0 + k * h]); }
      for (let k = 0; k < n; k++){ const t = (k + .5) / n; Rp.push([cxAt(t) + wAt(t), y0 + (k + .5) * h]); }
      Rp.push([cxAt(1) + wAt(1), yb]);
      let d = `M${P(Lp[0])}`;
      for (let k = 1; k <= n; k++) d += arc(Lp[k - 1], Lp[k], 0, .6);
      d += `Q${P([cxAt(1), yb + 2])} ${P(Rp[n])}`;
      for (let k = n; k >= 1; k--) d += arc(Rp[k], Rp[k - 1], 0, .6);
      d += arc(Rp[0], Lp[0], 0, .7) + 'Z';
      let cr = '';
      for (let k = 1; k < n; k++){ const c = cxAt((k + .3) / n); cr += `M${P([Lp[k][0] + .6, Lp[k][1]])}Q${P([c - 1, Lp[k][1] + 1])} ${P([c + 1.500, Lp[k][1] + h * .48])}`; }
      for (let k = 0; k < n; k++){ const c = cxAt((k + .8) / n); cr += `M${P([Rp[k][0] - .6, Rp[k][1]])}Q${P([c + 1, Rp[k][1] + 1])} ${P([c - 1.500, Rp[k][1] + h * .48])}`; }
      const cb = cxAt(1), tuft = `<path d="M${cb - 3.500} ${yb}C${cb - 7} ${yb + 6} ${cb - 4} ${yb + 10} ${cb} ${yb + 11}C${cb + 4} ${yb + 10} ${cb + 7} ${yb + 6} ${cb + 3.500} ${yb}Z" fill="${hair}"/>`;
      const braid = tuft + `<path d="${d}" fill="${hair}"/><path d="${cr}" fill="none" stroke="${dk2}" stroke-width="1.100" stroke-linecap="round"/><rect x="${cb - 4.500}" y="${yb - 2}" width="9" height="4" rx="2" fill="${tie}"/>`;
      // the hair on the head, swept to the braid side and gathered behind the ear, as one piece over the top of the braid
      const head = `<path d="M${l} 54C${l - 1} ${HT + 3} ${l + 9} ${T} 60 ${T}C${r - 9} ${T} ${r + 1} ${HT + 3} ${r + 1} 50C${r + 3} 55 ${x0 + 6} 58 ${x0 + 6.500} 62Q${x0} 67 ${x0 - 6} 62C${r - 3} 58 ${r - 4} 53 ${r - 4} 47C${r - 7} ${HT + 11} 66 ${HT + 7} 58 ${HT + 8}C50 ${HT + 9} ${l + 5} 41 ${l + 3} 48L${l + 1.500} 54Z" fill="${hair}"/>`;
      return braid + head;
    }
  };
  const tail = (q, x, y, w, len) => `<path d="M${x} ${y}C${x + q * w} ${y + 4} ${x + q * w * 1.1} ${y + len * .6} ${x + q * w * .5} ${y + len}C${x - q * 2} ${y + len * .7} ${x - q * 4} ${y + 8} ${x - q * 6} ${y + 2}Z" fill="${hair}"/>`;
  const wave = (x0, q) => `M${x0} 44C${x0 - q * 9} 58 ${x0 + q * 4} 66 ${x0 - q * 3} 80C${x0 - q * 8} 92 ${x0 + q * 6} 98 ${x0 + q * 12} 102`;
  if (hs === 'pigtails') back += tail(-1, l - 1, 36, 15, 44) + tail(1, r + 1, 36, 15, 44);
  else if (hs === 'ponytail') back += `<path d="M70 ${22 + dy}C98 ${12 + dy} 108 44 96 74C91 56 86 42 78 34Z" fill="${hair}"/>`;
  else if (hs === 'wavy') back += backFill(106);
  else if (hs === 'long') back += backFill(104);
  else if (hs === 'bob') back += backFill(78);
  else if (hs === 'afro') back += `<circle cx="60" cy="${39 + dy}" r="33" fill="${hair}"/>`;

  // legs, bottoms and shoes
  const pc = L.bh || CH_BOTTOM_C[L.bc], pdk = chShade(pc, .8), shc = L.sh || CH_SHOE_C[L.sc], legW = M.hp - 2, ankW = Math.round((1 + legW * .58) * 10) / 10;
  // the legs part a little toward the ankles, so the feet have a small gap between them
  const innerAt = y => 1 + Math.max(0, Math.min(1, (y - 160) / 66)) * 2.600;
  const outerAt = y => innerAt(y) + (M.hp - 1 - 1) + (ankW - (M.hp - 1)) * (y - 156) / 68;
  const leg = (s, y0, y1, fill) => `<path d="M${cx + s * innerAt(y0)} ${y0}L${cx + s * outerAt(y0)} ${y0}L${cx + s * outerAt(y1)} ${y1}L${cx + s * innerAt(y1)} ${y1}Z" fill="${fill}"/>`;
  let legs = `<ellipse cx="60" cy="239" rx="${Math.round(M.hp + 10)}" ry="5" fill="#000" opacity=".16"/>`;
  const hemY = {hoodie: 160, tee: 154, sweater: 160, coat: 190, blazer: 162, tank: 154, polo: 156, jacket: 164, jersey: 158, turtle: 158}[L.ot], flare = L.ot === 'coat' ? 8 : 1;
  const yT = L.ot === 'coat' ? 172 : hemY - 4;   // bottoms start just under the top's hem
  const long = ['jeans', 'joggers', 'cargo', 'leggings'].includes(L.bt);
  legs += leg(-1, Math.max(150, yT), 226, skin) + leg(1, Math.max(150, yT), 226, skin);
  if (long){
    legs += leg(-1, yT, 224, pc) + leg(1, yT, 224, pc) + `<path d="M${cx} ${yT}V${yT + 20}" stroke="${pdk}" stroke-width="1.6"/>`;
    if (L.bt === 'joggers') legs += [-1, 1].map(s => `<path d="M${cx + s * outerAt(214)} 214L${cx + s * outerAt(224)} 224L${cx + s * innerAt(224)} 224L${cx + s * innerAt(214)} 214Z" fill="${pdk}"/>`).join('');
    if (L.bt === 'cargo') legs += [-1, 1].map(q => `<rect x="${q < 0 ? cx - M.hp + 1 : cx + M.hp - 13}" y="168" width="12" height="13" rx="2" fill="${pdk}"/>`).join('');
    if (L.bt === 'leggings') legs += [-1, 1].map(q => `<path d="M${cx + q * 6} 160L${cx + q * (outerAt(200) - 2)} 205" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>`).join('');
  } else if (L.bt === 'shorts' || L.bt === 'capris') { const e = L.bt === 'capris' ? 204 : 190; legs += leg(-1, yT, e, pc) + leg(1, yT, e, pc); }
  else legs += `<path d="M${cx - M.hp} ${yT}H${cx + M.hp}L${cx + M.hp + 12} 192Q${cx} 199 ${cx - M.hp - 12} 192Z" fill="${pc}"/><path d="M${cx - M.hp - 4} 186Q${cx} 193 ${cx + M.hp + 4} 186" fill="none" stroke="${pdk}" stroke-width="1.6" opacity=".6"/>`;
  for (const s of [-1, 1]){
    const mid = cx + s * (innerAt(226) + ankW / 2);
    // feet point outward (left foot left, right foot right), so each shoe is drawn from the side.
    // Everything below is drawn for a right foot around the ankle center and mirrored for the left one.
    const h = ankW / 2, t = h + 15, sole = chShade(shc, .6), lift = L.sn === 'heels' ? 5 : 0, OLs = 'stroke="rgba(20,16,12,.72)" stroke-width="1.100" stroke-linejoin="round"';
    const footD = `M${-h} 220L${-h + 1} ${232 - lift}Q${-h + 1} ${238 - lift} ${-h + 3} ${238 - lift}L${t - 4} 238Q${t} 238 ${t} 234.500Q${t} 231 ${t - 5} 230L${h + 2} 227Q${h} 226 ${h} 220`;
    let f = `<path d="${footD}Z" fill="${skin}" stroke="none"/><path d="${footD}" fill="none" ${OLs}/>`;
    const solePad = (y, c, hgt = 3.500) => `<rect x="${-h - .500}" y="${y}" width="${t + 1.500 + h}" height="${hgt}" rx="${hgt / 2}" fill="${c}"/>`;
    const lace = ys => ys.map(y => `M${h + (y - 222) * .5} ${y}l3.500 -1.600`).join('');
    if (L.sn === 'hightops') f += `<path d="M${-h + .500} 211L${-h} 235H${t + 1}Q${t + 2} 229 ${t - 6} 228.500L${h + 3} 227L${h + 1.500} 211Z" fill="${shc}"/>` + solePad(234.500, '#f4f1e8', 4) + `<path d="M${t - 7} 235Q${t - 6} 230 ${t - 1} 230.500" fill="none" stroke="#f4f1e8" stroke-width="1.200"/><circle cx="${-h + 2}" cy="219" r="2.300" fill="#f4f1e8"/><path d="M${h + 1.500} 214l3 -1.400M${h + 1.700} 218.500l3 -1.400M${h + 2} 223l3.200 -1.400" stroke="#f4f1e8" stroke-width="1.300" stroke-linecap="round"/>`;
    else if (L.sn === 'boots') f += `<path d="M${-h + .500} 207L${-h} 235H${t + 1}Q${t + 2} 229 ${t - 6} 228.500L${h + 3} 227L${h + 1.500} 207Z" fill="${shc}"/>` + solePad(234.500, '#1d1a1a', 4) + `<rect x="${-h - .500}" y="233" width="7" height="5.500" rx="1" fill="#1d1a1a"/><path d="M${-h + .500} 211H${h + 1.500}" stroke="${chShade(shc, .7)}" stroke-width="1.400"/>`;
    else if (L.sn === 'loafers') f += `<path d="M${-h + .500} 229L${-h} 236H${t + 1}Q${t + 2} 230 ${t - 6} 229.500Q${h + 4} 231 ${h + 2} 230Q0 231 ${-h + .500} 229Z" fill="${shc}"/>` + solePad(235.500, '#1d1a1a', 2.800) + `<path d="M${h + 3} 231.500H${t - 6}" stroke="${chShade(shc, .65)}" stroke-width="1.600"/><rect x="${h + 6}" y="230.500" width="4" height="2.400" rx=".8" fill="${chShade(shc, .65)}"/>`;
    else if (L.sn === 'heels') f += `<path d="M${-h + 1} 226Q${-h} 230 ${-h + 1} 233L${t - 3} 239Q${t + 1} 239 ${t + 1} 235.500Q${t + 1} 231.500 ${t - 5} 231Q${h + 5} 233.500 ${h + 1.500} 231Q${0} 229.500 ${-h + 1} 226Z" fill="${shc}"/><path d="M${-h + 2} 233.300L${-h + 5.500} 234.300L${-h + 4.200} 240.500H${-h + 3}Z" fill="${sole}"/>`;
    else if (L.sn === 'sandals') f += solePad(237.200, sole, 3) + `<path d="M${t - 10} 229.500Q${t - 8} 228.500 ${t - 5} 230L${t - 4} 237.500H${t - 10}Z" fill="${shc}"/><rect x="${-h + 1}" y="221.500" width="${2 * h + 2}" height="3" rx="1.500" fill="${shc}"/><rect x="${-h}" y="223" width="3" height="14" rx="1.500" fill="${shc}"/>`;
    else if (L.sn === 'slides') f += solePad(236.500, sole, 4) + `<path d="M${h - 1} 226.500Q${h + 5} 225.500 ${t - 3} 230L${t - 2} 237H${h - 2}Z" fill="${shc}"/>`;
    else f += `<path d="M${-h + .500} 223L${-h} 235H${t + 1}Q${t + 2} 229 ${t - 6} 228.500L${h + 3} 227L${h + 1} 223Z" fill="${shc}"/>` + solePad(234.500, '#f4f1e8', 4) + `<path d="M${t - 7} 235Q${t - 6} 230 ${t - 1} 230.500" fill="none" stroke="${chShade(shc, .75)}" stroke-width="1.200"/><path d="M${-h + 1} 232Q${h + 2} 228 ${t - 8} 232" fill="none" stroke="${chShade(shc, .72)}" stroke-width="1.600" stroke-linecap="round"/><path d="${lace([224, 227])}" stroke="${chShade(shc, .6)}" stroke-width="1.200" stroke-linecap="round"/>`;
    legs += `<g transform="translate(${mid} 0) scale(${s} 1)">${f}</g>`;
  }
  // outfit
  // the neckline is cut into the top itself (w: half its width at the shoulders; cut: the path from its left edge to its right edge)
  const crew = (w, d) => `C${cx - w} ${d} ${cx + w} ${d} ${cx + w} 84`, vee = (w, d) => `L${cx} ${d}L${cx + w} 84`;
  const garment = (fill, w = 10, cut = crew(10, 92)) => `<path d="M${cx - M.ts} 112C${cx - M.ts - 1} 107 ${cx - M.sw + 1.500} 107 ${cx - M.sw + 1.500} 100C${cx - M.sw + 1.500} 91 ${cx - w - 7} 84 ${cx - w} 84${cut}C${cx + w + 7} 84 ${cx + M.sw - 1.500} 91 ${cx + M.sw - 1.500} 100C${cx + M.sw - 1.500} 107 ${cx + M.ts + 1} 107 ${cx + M.ts} 112C${cx + M.ts} 126 ${cx + M.wa} 132 ${cx + M.wa} 140C${cx + M.wa} ${(140 + hemY) / 2} ${cx + M.hp + flare} ${hemY - 7} ${cx + M.hp + flare} ${hemY - 2.500}Q${cx + M.hp + flare} ${hemY} ${cx + M.hp + flare - 2.500} ${hemY}L${cx - M.hp - flare + 2.500} ${hemY}Q${cx - M.hp - flare} ${hemY} ${cx - M.hp - flare} ${hemY - 2.500}C${cx - M.hp - flare} ${hemY - 7} ${cx - M.wa} ${(140 + hemY) / 2} ${cx - M.wa} 140C${cx - M.wa} 132 ${cx - M.ts} 126 ${cx - M.ts} 112Z" fill="${fill}"/>`;
  const sleeve = L.ot === 'tank' ? skin : L.ot === 'coat' ? '#f1f1ec' : L.ot === 'blazer' ? '#2e3648' : top, sleeveEnd = ['tee', 'polo', 'jersey'].includes(L.ot) ? 120 : L.ot === 'tank' ? 96 : 144;
  let arms = '';
  const HL = 'stroke="rgba(20,16,12,.72)" stroke-width="1.1" stroke-linejoin="round"';
  const hand = (hx, hy, s) => `<ellipse cx="${hx - s * 5.800}" cy="${hy - .500}" rx="2.600" ry="4.200" fill="${skin}" ${HL} transform="rotate(${s * 24} ${hx - s * 5.800} ${hy - .500})"/><path d="M${hx - 6.500} ${hy - 7}H${hx + 6.500}V${hy + 2}A6.500 6.500 0 0 1 ${hx - 6.500} ${hy + 2}Z" fill="${skin}" stroke="none"/><path d="M${hx - 6.500} ${hy - 4}V${hy + 2}A6.500 6.500 0 0 0 ${hx + 6.500} ${hy + 2}V${hy - 4}" fill="none" ${HL}/>`;
  for (const s of [-1, 1]){
    const a0 = arms.length;
    const x = s < 0 ? cx - M.sw : cx + M.sw - 15;
    arms += `<rect x="${x}" y="94" width="15" height="54" rx="7.500" fill="${skin}"/>${hand(cx + s * (M.sw - 7.5), 148, s)}<rect x="${x}" y="94" width="15" height="${sleeveEnd - 94}" rx="7.500" fill="${sleeve}"/>`;
    if (L.ot === 'hoodie' || L.ot === 'sweater') arms += `<rect x="${x}" y="${sleeveEnd - 7}" width="15" height="7" rx="3" fill="${dk}"/>`;
    if (L.ot === 'tank') arms = arms.slice(0, a0) + arms.slice(a0).replace(/<rect x="[^"]*" y="94" width="15" height="2"[^>]*\/>/, '');
    if (L.ot === 'coat') arms += `<rect x="${x}" y="${sleeveEnd - 5}" width="15" height="5" rx="2.500" fill="#c9cfda"/>`;
    const rot = L.ap === 1 ? -s * 14 : L.ap === 2 && s > 0 ? -168 : 0; if (rot) arms = arms.slice(0, a0) + `<g transform="rotate(${rot} ${cx + s * (M.sw - 7.500)} 96)">` + arms.slice(a0) + '</g>';
  }
  const band = `<rect x="${cx - M.hp - flare}" y="${hemY - 6}" width="${2 * (M.hp + flare)}" height="6" rx="2.500" fill="${dk}"/>`;
  const ring = (w, d, c, sw) => `<path d="M${cx - w} 84.500C${cx - w} ${d} ${cx + w} ${d} ${cx + w} 84.500" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`;
  const under = (c, w = 9) => garment(c, w, crew(w, 91));   // a shirt worn under an open coat or blazer
  if (L.ot === 'hoodie') body = garment(top) + ring(10, 92, dk, 2.400) + `<path d="M56 91L55 110M64 91L65 110" stroke="${dk}" stroke-width="1.800" stroke-linecap="round"/><circle cx="55" cy="111" r="1.300" fill="${dk}"/><circle cx="65" cy="111" r="1.300" fill="${dk}"/><path d="M${cx - 18} 128H${cx + 18}L${cx + 22} 150H${cx - 22}Z" fill="${dk}" opacity=".5"/>` + band;
  else if (L.ot === 'tee') body = garment(top) + ring(10, 92, dk, 1.600);
  else if (L.ot === 'sweater') body = garment(top) + ring(10, 92, dk, 3.200) + `<path d="M${cx - M.ts + 3} 118H${cx + M.ts - 3}M${cx - M.ts + 3} 126H${cx + M.ts - 3}" stroke="${dk}" stroke-width="1.5" opacity=".55"/>` + band;
  else if (L.ot === 'coat') body = under(top) + garment('#f1f1ec', 12, `L${cx - 3} 126L${cx} 128L${cx + 3} 126L${cx + 12} 84`) + `<path d="M${cx - 12} 84.500L${cx - 18} 104L${cx - 4} 122M${cx + 12} 84.500L${cx + 18} 104L${cx + 4} 122" stroke="#c9cfda" stroke-width="1.800" fill="none" stroke-linejoin="round"/><path d="M60 128V188" stroke="#c9cfda" stroke-width="2"/><path d="M${cx - M.hp + 2} 156H${cx - M.hp + 16}M${cx + M.hp - 16} 156H${cx + M.hp - 2}" stroke="#c9cfda" stroke-width="2.500" stroke-linecap="round"/>`;
  else if (L.ot === 'tank') body = garment(skin) + `<path d="M${cx - 22} 84H${cx - 13}Q${cx} 106 ${cx + 13} 84H${cx + 22}Q${cx + M.ts - 4} 110 ${cx + M.wa} 142L${cx + M.hp + 1} 151.500Q${cx + M.hp + 1} 154 ${cx + M.hp - 1.500} 154L${cx - M.hp + 1.500} 154Q${cx - M.hp - 1} 154 ${cx - M.hp - 1} 151.500L${cx - M.wa} 142Q${cx - M.ts + 4} 110 ${cx - 22} 84Z" fill="${top}"/>`;
  else if (L.ot === 'polo') body = garment(top, 9, `C${cx - 9} 88 ${cx - 3} 95 ${cx} 97C${cx + 3} 95 ${cx + 9} 88 ${cx + 9} 84`) + `<path d="M${cx - 10} 83L${cx - 1} 97L${cx - 9} 100L${cx - 17} 88Z" fill="${top}"/><path d="M${cx + 10} 83L${cx + 1} 97L${cx + 9} 100L${cx + 17} 88Z" fill="${top}"/><path d="M60 98V118" stroke="${dk}" stroke-width="1.600"/><circle cx="60" cy="105" r="1.200" fill="#fff"/><circle cx="60" cy="112" r="1.200" fill="#fff"/>`;
  else if (L.ot === 'jacket') body = garment(top) + ring(10, 92, dk, 3) + `<path d="M60 92V164" stroke="${dk}" stroke-width="2.200"/><rect x="58.200" y="93" width="3.600" height="6" rx="1" fill="#d8dce4"/><path d="M${cx - M.hp + 4} 140H${cx - 8}M${cx + 8} 140H${cx + M.hp - 4}" stroke="${dk}" stroke-width="2" stroke-linecap="round"/>`;
  else if (L.ot === 'jersey') body = garment(top, 12, vee(12, 102)) + `<path d="M${cx - 10.500} 85L60 99.500L${cx + 10.500} 85" fill="none" stroke="#fff" stroke-width="2.400" stroke-linejoin="round"/><text x="60" y="136" font-size="22" font-weight="800" text-anchor="middle" fill="#fff" font-family="Inter,Arial,sans-serif">7</text><rect x="${cx - M.hp}" y="${hemY - 11}" width="${2 * M.hp}" height="3" fill="#fff"/>`;
  else if (L.ot === 'turtle') body = garment(top, 9.500, `L${cx - 9} 73Q${cx} 70.500 ${cx + 9} 73L${cx + 9.500} 84`) + `<path d="M${cx - 9} 79Q${cx} 81.500 ${cx + 9} 79" fill="none" stroke="${dk}" stroke-width="1.400"/><path d="M${cx - M.ts + 3} 120H${cx + M.ts - 3}" stroke="${dk}" stroke-width="1.600"/>`;
  else body = under('#f4f1e8') + garment('#2e3648', 12, `L${cx} 116L${cx + 12} 84`) + `<path d="M${cx - 12} 84.500L${cx - 16} 100L${cx - 2} 113M${cx + 12} 84.500L${cx + 16} 100L${cx + 2} 113" stroke="#1d2433" stroke-width="1.800" fill="none" stroke-linejoin="round"/><circle cx="60" cy="128" r="2" fill="#1d2433"/><circle cx="60" cy="140" r="2" fill="#1d2433"/>`;
  // neck, ears, head
  const neck = `<rect x="52" y="64" width="16" height="24" fill="${skin}"/><path d="M50 84H70L74 90V106H46V90Z" fill="${skin}"/><path d="M52 78Q60 84 68 78V84H52Z" fill="#000" opacity=".1"/>`;
  const earX = hw - .5, earR = [4.2, 3.6, 5.8, 3][L.ea];
  const earPath = q => L.ea === 1 ? `<path d="M${60 + q * earX} 50L${60 + q * (earX + 9)} 41L${60 + q * (earX + 3)} 58Z" fill="${skin}"/>` : `<circle cx="${60 + q * earX}" cy="53" r="${earR}" fill="${skin}"/>`;
  const faceShape = [`<ellipse cx="60" cy="50" rx="24" ry="25" fill="${skin}"/>`, `<ellipse cx="60" cy="51" rx="22" ry="27" fill="${skin}"/>`, `<ellipse cx="60" cy="50.500" rx="26" ry="23.500" fill="${skin}"/>`,
    `<rect x="36" y="26" width="48" height="50" rx="17" fill="${skin}"/>`, `<path d="M36 44C36 30 48 25 60 28C72 25 84 30 84 44C84 60 70 77 60 77C50 77 36 60 36 44Z" fill="${skin}"/>`,
    `<ellipse cx="60" cy="51" rx="21" ry="28" fill="${skin}"/>`,
    `<path d="M60 25C69 25 76 31 80 41C84 50 84 56 80 63C74 72 66 77 60 77C54 77 46 72 40 63C36 56 36 50 40 41C44 31 51 25 60 25Z" fill="${skin}"/>`,
    `<path d="M60 26C70 26 78 32 80 44C82 57 82 66 75 72C70 76 65 77 60 77C55 77 50 76 45 72C38 66 38 57 40 44C42 32 50 26 60 26Z" fill="${skin}"/>`,
    `<path d="M60 25C74 25 85 33 86 47C87 65 76 77 60 77C44 77 33 65 34 47C35 33 46 25 60 25Z" fill="${skin}"/>`][L.fs];
  const head = (['bob', 'long', 'wavy', 'curly'].includes(L.hs) ? '' : earPath(-1) + earPath(1)) + faceShape;   // hair that covers the ears hides them
  // face
  const eyeY = 52, ec = L.eh || CH_EYE_C[L.ec], ecd = chShade(ec, .55), sk = skin, ey = L.ey;
  const eye = (x, s) => {
    const rx = ey === 3 ? 2.6 : ey === 4 ? 4.2 : 3.4, ry = ey === 3 ? 4.4 : ey === 4 ? 4.6 : 3.7, y = eyeY + (ey === 2 ? .8 : 0);
    // a simple eye: a colored oval with a dark pupil and one highlight
    let g = `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${ec}"/><ellipse cx="${x}" cy="${y + .4}" rx="${(rx * .5).toFixed(2)}" ry="${(ry * .5).toFixed(2)}" fill="${ink}"/><circle cx="${x - 1}" cy="${y - 1.3}" r="${(rx * .3).toFixed(2)}" fill="#fff"/>`;
    if (ey === 1) g += `<path d="M${x - 6} ${y + 7} L${x - 6} ${y + 1.6} Q${x} ${y - 1.6} ${x + 6} ${y + 1.6} L${x + 6} ${y + 7} Z" fill="${sk}"/><path d="M${x - 4.6} ${y + 1.4} Q${x} ${y - 1.2} ${x + 4.6} ${y + 1.4}" fill="none" stroke="${ink}" stroke-width="1.3" stroke-linecap="round"/>`;
    if (ey === 2) g += `<path d="M${x - 6} ${y - 7} H${x + 6} V${y - .6} H${x - 6} Z" fill="${sk}"/><path d="M${x - 4.8} ${y - .6} H${x + 4.8}" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`;
    return g;
  };
  const eyes = eye(51, -1) + eye(69, 1);
  const bc = chShade(hair, .72), bw = L.br === 3 ? 2.6 : 1.7, by = L.br === 2 ? 41.5 : 42.5;
  const bro = [`M${43} ${by + 1.6}Q${49} ${by - 1.2} ${57} ${by + .8}M${77} ${by + 1.6}Q${71} ${by - 1.2} ${63} ${by + .8}`, `M43 ${by + 1}L57 ${by}M77 ${by + 1}L63 ${by}`, `M43 ${by + 2}Q50 ${by - 3.4} 57 ${by + 1}M77 ${by + 2}Q70 ${by - 3.4} 63 ${by + 1}`, `M43 ${by + 1.4}Q49 ${by - .6} 57 ${by + .4}M77 ${by + 1.4}Q71 ${by - .6} 63 ${by + .4}`][L.br];
  const brows = `<path d="${bro}" fill="none" stroke="${bc}" stroke-width="${bw}" stroke-linecap="round"/>`;
  const lp = '#1a1f2b', lw = 2, st = `fill="none" stroke="${lp}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"`, dark = '#5a2323';
  const mouth = [
    `<path d="M52.5 62Q60 69 67.5 62" ${st}/>`,
    `<path d="M51.5 60.800Q60 63 68.500 60.800Q66.500 71 60 71Q53.500 71 51.500 60.800Z" fill="${dark}" stroke="${lp}" stroke-width="${lw * .8}" stroke-linejoin="round"/><path d="M53.200 62H66.800" stroke="#fff" stroke-width="2.400" stroke-linecap="round"/>`,
    `<path d="M54 64H66" ${st}/>`,
    `<ellipse cx="60" cy="64" rx="3.200" ry="3.800" fill="${dark}" stroke="${lp}" stroke-width="${lw * .8}"/>`,
    `<path d="M53 63.500Q59 66.500 68 60.500" ${st}/>`,
    `<path d="M51 60.500Q60 62.500 69 60.500Q67 72.500 60 72.500Q53 72.500 51 60.500Z" fill="${dark}" stroke="${lp}" stroke-width="${lw * .8}" stroke-linejoin="round"/><path d="M55 70Q60 66.200 65 70Q60 73 55 70Z" fill="#e57373"/>`,
    `<path d="M53 66.500Q60 60.500 67 66.500" ${st}/>`,
    `<path d="M52.500 62Q60 69 67.500 62" ${st}/><path d="M57 65.600Q60 76 63.500 65.600Z" fill="#e57373" stroke="${dark}" stroke-width="1" stroke-linejoin="round"/>`,
    `<path d="M52 62Q56 66.500 60 62Q64 66.500 68 62" ${st}/>`,
    `<path d="M55.500 63.500Q60 66.500 64.500 63.500" ${st}/><path d="M53.500 62.500L52.500 61.500M66.500 62.500L67.500 61.500" stroke="#000" stroke-opacity=".25" stroke-width="1.200" stroke-linecap="round"/>`
  ][L.mo];
  const blush = L.bl ? '<circle cx="44" cy="60" r="4" fill="#e8837a" opacity=".3"/><circle cx="76" cy="60" r="4" fill="#e8837a" opacity=".3"/>' : '';
  const nst = 'fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  const nose = [`<path d="M60 55V59" stroke="#000" stroke-width="1.6" stroke-linecap="round" opacity=".14"/>`, `<path d="M57.500 58.500Q60 61 62.500 58.500" ${nst}/>`, `<path d="M60.500 51L58.500 58Q60 60 62.500 58" ${nst}/>`,
    `<path d="M55.500 58Q60 61.500 64.500 58" ${nst}/><path d="M56.500 56.500L55.500 58M63.500 56.500L64.500 58" ${nst}/>`, `<path d="M60 50.500L57.500 59H62.500" ${nst}/>`][L.nz];
  const fhs = L.fh === 1 ? `<path d="M39 56Q41 74 60 77Q79 74 81 56Q70 68 60 68Q50 68 39 56Z" fill="${hair}" opacity=".3"/>`
    : L.fh === 2 ? `<path d="M51 60Q55 56.500 60 58.500Q65 56.500 69 60Q65 62 60 60.500Q55 62 51 60Z" fill="${hair}"/>`
    : L.fh === 3 ? `<path d="M38 54Q36 80 60 83Q84 80 82 54Q80 70 70 72Q60 67 50 72Q40 70 38 54Z" fill="${hair}"/><path d="M51 60Q55 56.500 60 58.500Q65 56.500 69 60Q65 62 60 60.500Q55 62 51 60Z" fill="${hair}"/>` : '';
  const freck = L.fk ? [[46, 58], [49, 60.500], [44, 61], [71, 58], [74, 60.500], [76, 61], [53, 59.500], [67, 59.500]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#a8643c" opacity=".55"/>`).join('') : '';
  // front hair
  const cap = (up, inner) => `<path d="M${l} 52C${l - 1} ${HT + 3} ${l + 9} ${HT - up} 60 ${HT - up}C${r - 9} ${HT - up} ${r + 1} ${HT + 3} ${r} 52C${r - 2} 43 ${r - 8} ${HT + inner - 1} 60 ${HT + inner}C${l + 8} ${HT + inner - 1} ${l + 2} 43 ${l} 52Z" fill="${hair}"/>`;
  const strip = (q, x, bottom) => { const m = 46 + (bottom - 46) * .55; return `<path d="M${x} 46C${x + q * 3} ${m} ${x + q * 2} ${bottom - 4} ${x + q} ${bottom}Q${x - q * 3} ${bottom + 1} ${x - q * 8} ${bottom - 3}C${x - q * 9} ${m} ${x - q * 8} 56 ${x - q * 7} 48Z" fill="${hair}"/>`; };
  if (hs === 'buzz') front += cap(2, 9).replace('fill="', 'opacity=".92" fill="');
  else if (hs === 'side') front += `<path d="M${l} 52C${l - 2} ${HT + 2} ${l + 10} ${HT - 7} 62 ${HT - 6}C${r - 4} ${HT - 5} ${r + 1} ${HT + 4} ${r} 52C${r - 3} 45 ${r - 8} 40 66 ${HT + 8}C54 ${HT + 11} ${l + 8} 42 ${l} 52Z" fill="${hair}"/>`;
  else if (hs === 'curly') front += HAIR.curly();
  else if (hs === 'spiky') front += HAIR.spiky();
  else if (hs === 'bob') front += HAIR.bob();
  else if (hs === 'long') front += HAIR.long();
  else if (hs === 'bun') front += `<circle cx="60" cy="${14 + dy}" r="11" fill="${hair}"/><rect x="51" y="${23 + dy}" width="18" height="4" rx="2" fill="${tie}"/>` + cap(5, 10);
  else if (hs === 'bald') front += '';
  else if (hs === 'mohawk') front += `<path d="M${l + 1} 48C${l + 1} ${HT + 2} ${l + 12} ${HT - 1} 60 ${HT - 1}C${r - 12} ${HT - 1} ${r - 1} ${HT + 2} ${r - 1} 48C${r - 6} 38 ${r - 12} ${HT + 8} 60 ${HT + 8}C${l + 12} ${HT + 8} ${l + 6} 38 ${l + 1} 48Z" fill="${hair}" opacity=".3"/><path d="M53 ${HT + 9}L50 ${HT - 14}Q60 ${HT - 22} 70 ${HT - 14}L67 ${HT + 9}Z" fill="${hair}"/>`;
  else if (hs === 'pigtails') front += cap(5, 10) + [-1, 1].map(q => `<rect x="${(q < 0 ? l - 1 : r + 1) - 4}" y="34" width="8" height="6" rx="3" fill="${tie}"/>`).join('');
  else if (hs === 'ponytail') front += cap(5, 10) + `<rect x="73" y="${27 + dy}" width="8" height="6" rx="3" fill="${tie}" transform="rotate(30 77 ${30 + dy})"/>`;
  else if (hs === 'braid') front += HAIR.braid();
  else if (hs === 'curtains') front += `<path d="M${l} 56C${l - 2} ${HT + 2} ${l + 10} ${HT - 5} 60 ${HT - 5}C59 ${HT + 8} 52 ${HT + 17} ${l + 9} 49L${l + 6} 56Z M${r} 56C${r + 2} ${HT + 2} ${r - 10} ${HT - 5} 60 ${HT - 5}C61 ${HT + 8} 68 ${HT + 17} ${r - 9} 49L${r - 6} 56Z" fill="${hair}"/>`;
  else if (hs === 'wavy') front += HAIR.wavy();
  else if (hs === 'slick') front += cap(8, 5) + `<path d="M${l + 8} ${HT - 2}C46 ${HT - 12} 74 ${HT - 12} ${r - 8} ${HT - 2}" fill="none" stroke="${chShade(hair, .6)}" stroke-width="1.200" stroke-linecap="round"/>`;
  else if (hs === 'afro') front += `<path d="M${l + 1} 50C${l - 1} ${HT} ${l + 10} ${HT - 4} 60 ${HT - 4}C${r - 10} ${HT - 4} ${r + 1} ${HT} ${r - 1} 50C${r - 6} 40 ${r - 12} ${HT + 8} 60 ${HT + 8}C${l + 12} ${HT + 8} ${l + 6} 40 ${l + 1} 50Z" fill="${hair}" stroke="none"/><path d="M${l + 1} 50C${l + 6} 40 ${l + 12} ${HT + 8} 60 ${HT + 8}C${r - 12} ${HT + 8} ${r - 6} 40 ${r - 1} 50" fill="none" stroke="rgba(20,16,12,.72)" stroke-width="1.100" stroke-linejoin="round"/>`;
  else front += cap(5, 9);
  // accessories
  let acc = '';
  if (L.gl){
    const fr = [null, '<circle cx="51" cy="52" r="7.5"/><circle cx="69" cy="52" r="7.5"/>', '<rect x="43" y="45.5" width="15" height="13" rx="3"/><rect x="62" y="45.5" width="15" height="13" rx="3"/>',
      '<path d="M43 47H58V53Q58 60 50.500 60Q43 60 43 53Z"/><path d="M77 47H62V53Q62 60 69.500 60Q77 60 77 53Z"/>',
      '<path d="M43 51Q43 46 47 46L58 48V55Q56 59 50 59Q43 59 43 51Z"/><path d="M77 51Q77 46 73 46L62 48V55Q64 59 70 59Q77 59 77 51Z"/>',
      `<rect x="43" y="46" width="15" height="11" rx="4" fill="${ink}"/><rect x="62" y="46" width="15" height="11" rx="4" fill="${ink}"/>`][L.gl];
    acc += `<g fill="none" stroke="${ink}" stroke-width="1.8">${fr}<path d="M58 51H62"/></g>`;
  }
  if (L.ha === 1) acc += `<path d="M35 44C34 14 86 14 85 44Z" fill="${top}"/><rect x="34" y="37" width="52" height="9" rx="4.500" fill="${dk}"/><circle cx="60" cy="14" r="5" fill="${dk}"/>`;
  if (L.ha === 2) acc += `<path d="M38 40C38 18 82 18 82 40Z" fill="${top}"/><ellipse cx="60" cy="40" rx="31" ry="6.500" fill="${dk}"/>`;
  if (L.ha === 3) acc += `<path d="M35 38Q60 26 85 38L85 45Q60 33 35 45Z" fill="${top}"/>`;
  if (L.eg){ const gold = '#e3b04b'; acc += [-1, 1].map(q => { const x = 60 + q * earX; return L.eg === 1 ? `<circle cx="${x}" cy="57.500" r="1.800" fill="${gold}"/>` : L.eg === 2 ? `<circle cx="${x}" cy="61" r="3.600" fill="none" stroke="${gold}" stroke-width="1.400"/>` : `<path d="M${x} 57.500V63" stroke="${gold}" stroke-width="1.200"/><circle cx="${x}" cy="65" r="2.200" fill="${gold}"/>`; }).join(''); }
  if (L.sf) acc += `<path d="M43 80Q60 94 77 80L79 91Q60 104 41 91Z" fill="${CH_OUTFIT_C[(L.oc + 5) % 12]}"/><path d="M66 94L75 116L67 118L61 98Z" fill="${CH_OUTFIT_C[(L.oc + 5) % 12]}"/>`;
  if (L.nk) acc += `<path d="M47 86Q60 106 73 86" fill="none" stroke="#e3b04b" stroke-width="1.400"/><circle cx="60" cy="100" r="2.600" fill="#e3b04b" stroke="#8a6a1a" stroke-width=".8"/>`;
  if (L.ht) acc += `<path d="M35 44C34 16 48 10 60 10C72 10 86 16 85 44Z" fill="${dk}"/><rect x="34" y="38" width="52" height="10" rx="4" fill="${top}"/>`;
  if (L.hp) acc += `<path d="M35 52C34 14 86 14 85 52" fill="none" stroke="#c9cfda" stroke-width="4.5"/><rect x="29" y="44" width="11" height="22" rx="5.5" fill="#3a4252"/><rect x="80" y="44" width="11" height="22" rx="5.5" fill="#3a4252"/>`;
  const lashes = L.ls ? `<path d="M45.800 50.500L42.800 48.200M47.600 48.800L45.800 45.600M74.200 50.500L77.200 48.200M72.400 48.800L74.200 45.600" stroke="${ink}" stroke-width="1.400" stroke-linecap="round"/>` : '';
  const skinHex = skin.toLowerCase(), OL = 'stroke="rgba(20,16,12,.72)" stroke-width="1.1" stroke-linejoin="round"';
  const ol = str => str.replace(/<(path|rect|circle|ellipse)\b([^>]*?)(\/?)>/g, (m, t, a, c) => /fill="none"|stroke=|opacity=|fill="#000"/.test(a) || a.toLowerCase().includes('fill="' + skinHex + '"') ? m : `<${t}${a} ${OL}${c}>`);
  return ol(back + legs + arms) + neck + ol(body) + head + blush + freck + fhs + nose + eyes + brows + lashes + mouth + ol(front + acc);
}
// a picture of the character with its background; the default view is the square portrait (head and shoulders)
function chFull(look, view){
  const L = chClean(look), bg = CH_BG[L.bg], deco = L.bp === 1 ? `<circle cx="60" cy="52" r="46" fill="#fff" opacity=".28"/>` : L.bp === 2 ? `<path d="M0 90L120 30V70L0 124Z" fill="#fff" opacity=".2"/>` : '';
  return `<svg viewBox="${view || '0 0 120 120'}" preserveAspectRatio="xMidYMid slice"><rect x="-400" y="-400" width="1000" height="1000" fill="${bg}"/>${deco}${chFigure(L)}</svg>`;
}
const chBust = look => chFull(look);
function chBotSvg(i){ let s = CH_CACHE.get(i); if (s === undefined){ s = chBust(chLookOf(i)); if (CH_CACHE.size > 6000) CH_CACHE.clear(); CH_CACHE.set(i, s); } return s; }
const chMyLook = () => chClean(P.myLook || CH_DEFAULT);
// the character as a round picture, and the flip on profiles: tap the profile picture to see the character behind it
const chFlipped = new Set();         // profiles flipped to the character during this visit
function chFlip(w, cls){
  const svg = w === ME ? chBust(chMyLook()) : chBotSvg(BOTS[w] && BOTS[w].i != null ? BOTS[w].i : w);
  return `<button type="button" class="av-flip${chFlipped.has(w) ? ' flipped' : ''}" data-flip="${w}" aria-label="Profile picture. Drag sideways to flip to the character" title="Drag to flip">
    <span class="af-in"><span class="af-f">${pAvatar(w, cls)}</span><span class="af-b"><span class="av pic ${cls || ''}" aria-hidden="true">${svg}</span></span></span></button>`;
}
// hold and drag the picture sideways: it turns with the mouse (or finger) and settles on whichever side is nearer
let chDrag = null;
document.addEventListener('pointerdown', e => {
  const f = e.target.closest('.av-flip'); if (!f || e.button) return;
  chDrag = {f, id: e.pointerId, x: e.clientX, a: f.classList.contains('flipped') ? 180 : 0, ang: null};
  try { f.setPointerCapture(e.pointerId); } catch (_) {}
}, true);
document.addEventListener('pointermove', e => {
  if (!chDrag || e.pointerId !== chDrag.id) return;
  const dx = e.clientX - chDrag.x; if (chDrag.ang === null && Math.abs(dx) < 4) return;
  chDrag.f.classList.add('dragging');
  chDrag.ang = chDrag.a + dx * 1.3;
  chDrag.f.querySelector('.af-in').style.transform = `rotateY(${chDrag.ang}deg)`;
}, true);
function chDragEnd(e){
  if (!chDrag || e.pointerId !== chDrag.id) return;
  const {f, ang} = chDrag; chDrag = null; if (ang === null) return;
  const inn = f.querySelector('.af-in'), turns = Math.round(ang / 180), on = Math.abs(turns) % 2 === 1, w = +f.dataset.flip;
  f.classList.remove('dragging'); inn.style.transform = `rotateY(${turns * 180}deg)`;
  setTimeout(() => {                         // swap the inline angle for the class without a visible jump
    f.classList.add('dragging'); f.classList.toggle('flipped', on); inn.style.transform = '';
    on ? chFlipped.add(w) : chFlipped.delete(w);
    requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('dragging')));
  }, 620);
}
document.addEventListener('pointerup', chDragEnd, true);
document.addEventListener('pointercancel', chDragEnd, true);
document.addEventListener('click', e => {      // keyboard: Enter or Space on the picture
  const f = e.target.closest('.av-flip'); if (!f) return;
  e.preventDefault(); e.stopPropagation();
  if (e.detail === 0){ const w = +f.dataset.flip, on = !f.classList.contains('flipped'); f.classList.toggle('flipped', on); on ? chFlipped.add(w) : chFlipped.delete(w); }
}, true);

/* ---------------- the character creator (a full screen, opened from Edit profile) ---------------- */
let chDraft = null;                  // the look being edited in Edit profile (kept so older saves still work)
function chStartEdit(){ chDraft = chMyLook(); }
let ccLook = null, ccTab = 0, ccAnim = 0;
// camera views [x, y, width, height] on the 120 x 240 canvas; the stage is 4:5, so every view is too
const CC_VIEWS = {full: [-40, -5, 200, 250], head: [24, -4, 72, 90], face: [28, 20, 64, 80], top: [2, 62, 116, 145], bottoms: [6, 118, 108, 135], shoes: [20, 168, 80, 100]};
let ccView = CC_VIEWS.full;
const CC_THUMB = {head: '24 0 72 72', face: '34 28 52 52', top: '10 62 100 100', bottoms: '10 132 100 100', shoes: '20 182 80 80', full: '-65 -5 250 250'};
const CC_TABS = [
  ['Body', 'full', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6'],
  ['Hair', 'head', 'M5 13c0-5 3-9 7-9s7 4 7 9c-2-1-4-3-5-5-1 2-4 4-9 5z'],
  ['Face', 'face', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 10h.01M15 10h.01M8.5 14.5c1 1.5 2.2 2 3.5 2s2.5-.5 3.5-2'],
  ['Tops', 'top', 'M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3c-.5 1.5-2 2.5-4 2.500S8.500 5.500 8 4z'],
  ['Bottoms', 'bottoms', 'M7 3h10l1 18h-5l-1-9-1 9H6z'],
  ['Shoes', 'shoes', 'M3 16c4 0 5-3 6-6l3 1c1 2 3 3 9 3v4H3z'],
  ['Extras', 'head', 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4zM17 14h3v5h-3z'],
  ['Backdrop', 'full', 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6']
];
// a small picture of the character with one thing changed
const chThumb = (look, over, crop) => chFull(Object.assign({}, look, over), CC_THUMB[crop]);
function ccSwatches(key, list, d, hexKey){
  const free = hexKey && d[hexKey];
  return `<div class="ccr-sw">${list.map((c, k) => `<button type="button" class="ccr-dot" data-cc="${key}" data-v="${k}" aria-pressed="${d[key] === k && !free}" aria-label="${key} ${k + 1}" style="background:${c}"></button>`).join('')}${hexKey ? `<label class="ccr-dot ccr-custom" aria-pressed="${!!free}" title="Pick any color" style="background:${free || 'conic-gradient(#e53935,#fdd835,#43a047,#00acc1,#3949ab,#d81b60,#e53935)'}"><input type="color" data-cc-hex="${hexKey}" value="${free || list[d[key]] || '#888888'}" aria-label="Custom color"></label>` : ''}</div>`;
}
function ccTiles(key, list, d, crop, num){ return `<div class="ccr-grid">${list.map(([v, l]) => `<button type="button" class="ccr-tile" data-cc="${key}" data-v="${v}" aria-pressed="${String(d[key]) === String(v)}"><span class="ccr-th">${chThumb(d, {[key]: num ? +v : v}, crop)}</span><span>${l}</span></button>`).join('')}</div>`; }
function ccToggles(items, d){ return `<div class="ccr-grid">${items.map(([k, l, crop]) => `<button type="button" class="ccr-tile" data-cc-tg="${k}" aria-pressed="${!!d[k]}"><span class="ccr-th">${chThumb(d, {[k]: d[k] ? 0 : 1}, crop)}</span><span>${d[k] ? 'Remove ' : ''}${l}</span></button>`).join('')}</div>`; }
const ccH = t => `<h4 class="ccr-h">${t}</h4>`;
function ccPanel(){
  const d = ccLook;
  return [
    ccH('Gender') + ccTiles('gd', CH_GENDER, d, 'full', true) + ccH('Body shape') + ccTiles('bd', CH_BUILD, d, 'full', true) + ccH('Skin tone') + ccSwatches('sk', CH_SKIN, d),
    ccH('Style') + ccTiles('hs', CH_HAIRSTYLES, d, 'head') + ccH('Hair color') + ccSwatches('hc', CH_HAIR, d),
    ccH('Face shape') + ccTiles('fs', CH_FACES, d, 'face', true) + ccH('Eye shape') + ccTiles('ey', CH_EYES, d, 'face', true) + ccH('Eye color') + ccSwatches('ec', CH_EYE_C, d, 'eh') + ccH('Eyebrows') + ccTiles('br', CH_BROWS, d, 'face', true) + ccH('Mouth') + ccTiles('mo', CH_MOUTHS, d, 'face', true) + ccH('Details') + ccToggles([['ls', 'Lashes', 'face'], ['bl', 'Blush', 'face']], d),
    ccH('Top') + ccTiles('ot', CH_OUTFITS, d, 'top') + ccH('Top color') + ccSwatches('oc', CH_OUTFIT_C, d, 'oh'),
    ccH('Bottoms') + ccTiles('bt', CH_BOTTOMS, d, 'bottoms') + ccH('Color') + ccSwatches('bc', CH_BOTTOM_C, d, 'bh'),
    ccH('Shoes') + ccTiles('sn', CH_SHOES, d, 'shoes') + ccH('Color') + ccSwatches('sc', CH_SHOE_C, d, 'sh'),
    ccH('Glasses') + ccTiles('gl', CH_GLASSES, d, 'head', true) + ccH('Accessories') + ccToggles([['hp', 'Headphones', 'head'], ['ht', 'Beanie', 'head']], d),
    ccH('Color') + ccSwatches('bg', CH_BG, d) + ccH('Pattern') + ccTiles('bp', CH_BGPAT, d, 'full', true)
  ][ccTab];
}
function ccStageView(){ const s = document.querySelector('#ccStage svg'); if (s) s.setAttribute('viewBox', ccView.map(v => +v.toFixed(2)).join(' ')); }
// the camera glides to the part you are working on
function ccCam(name){
  const to = CC_VIEWS[name], from = ccView.slice(), t0 = performance.now();
  cancelAnimationFrame(ccAnim);
  if (matchMedia('(prefers-reduced-motion:reduce)').matches){ ccView = to; ccStageView(); return; }
  const step = now => {
    const k = Math.min(1, (now - t0) / 560), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    ccView = from.map((v, i) => v + (to[i] - v) * e); ccStageView(); if (k < 1) ccAnim = requestAnimationFrame(step);
  };
  ccAnim = requestAnimationFrame(step);
}
function ccDraw(full){
  const el = document.getElementById('cc'); if (!el) return;
  el.querySelector('#ccStage').innerHTML = chFull(ccLook, ccView.join(' '));
  if (full) el.querySelector('#ccTabs').innerHTML = CC_TABS.map((t, k) => `<button type="button" role="tab" class="ccr-tab" data-cc-tab="${k}" aria-selected="${k === ccTab}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${t[2]}"/></svg><span>${t[0]}</span></button>`).join('');
  const body = el.querySelector('#ccBody'), top = body.scrollTop;
  body.innerHTML = ccPanel(); body.scrollTop = full ? 0 : top;
}
function ccOpen(){
  if (document.getElementById('cc')) return;
  ccLook = chMyLook(); ccTab = 0; ccView = CC_VIEWS.full.slice();
  document.body.insertAdjacentHTML('beforeend', `<div id="cc" class="ccr" role="dialog" aria-modal="true" aria-label="Character creator">
    <div class="ccr-bar"><button type="button" class="small-btn" data-cc-act="cancel">Cancel</button><b>Your character</b><button type="button" class="btn primary" data-cc-act="save">Done</button></div>
    <div class="ccr-main"><div class="ccr-left"><div class="ccr-stage" id="ccStage"></div><div class="ccr-btns"><button type="button" class="small-btn" data-cc-act="random">Randomize</button><button type="button" class="small-btn" data-cc-act="reset">Reset</button></div></div>
    <div class="ccr-right"><div class="ccr-tabs" id="ccTabs" role="tablist"></div><div class="ccr-body" id="ccBody"></div></div></div></div>`);
  document.body.classList.add('ccr-lock'); ccDraw(true);
  const first = document.querySelector('#cc [data-cc-act="save"]'); if (first) first.focus();
}
function ccClose(){ const el = document.getElementById('cc'); if (el) el.remove(); document.body.classList.remove('ccr-lock'); }
function ccSave(){
  P.myLook = chClean(ccLook); chDraft = null; try { saveP(); } catch (e) {}
  const svg = chBust(chMyLook());
  document.querySelectorAll('#ccMini').forEach(x => x.innerHTML = svg);
  document.querySelectorAll('[data-flip="' + ME + '"] .af-b .av').forEach(x => x.innerHTML = svg);
  ccClose();
}
function ccMiniHtml(){ return `<div class="ccr-mini"><span class="av pic xl" id="ccMini">${chBust(chMyLook())}</span><div><button type="button" class="btn" data-cc-act="open">Customize character</button><small class="hint">Body, hair, face, clothes and more. Drag your profile picture sideways to flip it to your character.</small></div></div>`; }
document.addEventListener('click', e => {
  const a = e.target.closest('[data-cc-act]');
  if (a){
    const k = a.dataset.ccAct; e.preventDefault();
    if (k === 'open') ccOpen(); else if (k === 'cancel') ccClose(); else if (k === 'save') ccSave();
    else if (ccLook){ ccLook = k === 'reset' ? chClean(CH_DEFAULT) : chClean(chLookOf(Math.floor(Math.random() * 1e9))); ccDraw(false); }
    return;
  }
  if (!ccLook || !e.target.closest('#cc')) return;
  const t = e.target.closest('[data-cc-tab]'), o = e.target.closest('[data-cc]'), g = e.target.closest('[data-cc-tg]');
  if (t){ ccTab = +t.dataset.ccTab; ccDraw(true); ccCam(CC_TABS[ccTab][1]); }
  else if (g){ const k = g.dataset.ccTg; ccLook[k] = ccLook[k] ? 0 : 1; ccLook = chClean(ccLook); ccDraw(false); }
  else if (o){ const k = o.dataset.cc; ccLook[k] = ['hs', 'ot', 'bt', 'sn'].includes(k) ? o.dataset.v : +o.dataset.v; if (k === 'ec') ccLook.eh = ''; if (k === 'oc') ccLook.oh = ''; if (k === 'bc') ccLook.bh = ''; if (k === 'sc') ccLook.sh = ''; ccLook = chClean(ccLook); ccDraw(false); }
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('cc')) ccClose(); });

// the free color picker: the preview follows the color while you drag, the panel redraws when you let go
document.addEventListener('input', e => { const i = e.target.closest && e.target.closest('[data-cc-hex]'); if (!i || !ccLook) return; ccLook[i.dataset.ccHex] = i.value; ccLook = chClean(ccLook); const st = document.querySelector('#ccStage'); if (st) st.innerHTML = chFull(ccLook, ccView.join(' ')); });
document.addEventListener('change', e => { const i = e.target.closest && e.target.closest('[data-cc-hex]'); if (i && ccLook) ccDraw(false); });
