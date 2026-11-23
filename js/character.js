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
const CH_HAIRSTYLES = [['short', 'Short'], ['buzz', 'Buzz'], ['side', 'Side part'], ['curly', 'Curly'], ['spiky', 'Spiky'], ['bob', 'Bob'], ['long', 'Long'], ['bun', 'Bun'], ['afro', 'Afro']];
const CH_OUTFITS = [['hoodie', 'Hoodie'], ['tee', 'T-shirt'], ['sweater', 'Sweater'], ['coat', 'Lab coat'], ['blazer', 'Blazer']];
const CH_GLASSES = [['0', 'None'], ['1', 'Round'], ['2', 'Square']];
const CH_EYES = [['0', 'Round'], ['1', 'Happy'], ['2', 'Sleepy'], ['3', 'Almond'], ['4', 'Wide']];
const CH_EYE_C = ['#3b2a20', '#7a4a26', '#a8742a', '#4f8f4a', '#2f8f9a', '#4b86c6', '#2b3a8f', '#7d7d86', '#a0337a', '#d8473f'];
const CH_BROWS = [['0', 'Soft'], ['1', 'Straight'], ['2', 'Arched'], ['3', 'Thick']];
const CH_MOUTHS = [['0', 'Smile'], ['1', 'Grin'], ['2', 'Calm'], ['3', 'Oh']];
const CH_BGPAT = [['0', 'Plain'], ['1', 'Spotlight'], ['2', 'Stripe']];
const CH_GENDER = [['2', 'Neutral'], ['0', 'Masculine'], ['1', 'Feminine']];
const CH_BUILD = [['0', 'Slim'], ['1', 'Average'], ['2', 'Broad']];
const CH_BOTTOMS = [['jeans', 'Jeans'], ['joggers', 'Joggers'], ['shorts', 'Shorts'], ['skirt', 'Skirt']];
const CH_SHOES = [['sneakers', 'Sneakers'], ['boots', 'Boots'], ['slides', 'Slides']];
const CH_BOTTOM_C = ['#3a5a8c', '#2b3a4f', '#1d1a1a', '#6b6f78', '#a9b4c4', '#8a6a4a', '#5e7a55', '#b04a4a', '#e8e2d0', '#7a63b5'];
const CH_SHOE_C = ['#f1f1ec', '#1d1a1a', '#d8473f', '#4b86c6', '#e3b04b', '#5e9a6b', '#8a5a33', '#e87ca0'];
const CH_DEFAULT = {sk: 2, hc: 1, hs: 'short', ot: 'hoodie', oc: 0, gl: 0, hp: 0, ht: 0, ey: 0, mo: 0, bl: 0, bg: 0, bp: 1, gd: 2, bd: 1, bt: 'jeans', bc: 0, sn: 'sneakers', sc: 0, ls: 0, ec: 0, br: 0};

// a simulated player's look, worked out from their number
const CH_CACHE = new Map();
function chLookOf(i){
  const r = mulberry32((i * 2654435761 >>> 0) ^ 0x7f4a7c15), n = a => Math.floor(r() * a);
  const sk = [0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6][n(12)], natural = r() < .8;
  const o = {sk, hc: natural ? [0, 0, 1, 1, 1, 2, 2, 3, 4, 5, 6, 7][n(12)] : 8 + n(5), hs: CH_HAIRSTYLES[n(CH_HAIRSTYLES.length)][0],
    ot: CH_OUTFITS[n(CH_OUTFITS.length)][0], oc: n(CH_OUTFIT_C.length), gl: r() < .35 ? 1 + n(2) : 0, hp: r() < .15 ? 1 : 0, ht: r() < .08 ? 1 : 0,
    ey: [0, 0, 0, 1, 1, 2][n(6)], mo: [0, 0, 0, 1, 2, 3][n(6)], bl: r() < .25 ? 1 : 0, bg: n(CH_BG.length), bp: n(3)};
  o.gd = [0, 1, 2, 2][n(4)]; o.bd = [0, 1, 1, 2][n(4)]; o.bt = CH_BOTTOMS[n(4)][0]; o.bc = n(CH_BOTTOM_C.length); o.sn = CH_SHOES[n(3)][0]; o.sc = n(CH_SHOE_C.length); o.ls = o.gd === 1 && r() < .6 ? 1 : 0;
  o.ec = n(CH_EYE_C.length); o.br = n(CH_BROWS.length);
  return o;
}
// a saved look, cleaned so a bad or old value can never break the drawing
function chClean(l){
  const d = CH_DEFAULT, o = {}, num = (v, max, dv) => Number.isInteger(v) && v >= 0 && v < max ? v : dv;
  l = l || {};
  o.sk = num(l.sk, CH_SKIN.length, d.sk); o.hc = num(l.hc, CH_HAIR.length, d.hc); o.oc = num(l.oc, CH_OUTFIT_C.length, d.oc); o.bg = num(l.bg, CH_BG.length, d.bg);
  o.hs = CH_HAIRSTYLES.some(x => x[0] === l.hs) ? l.hs : d.hs; o.ot = CH_OUTFITS.some(x => x[0] === l.ot) ? l.ot : d.ot;
  o.gl = num(l.gl, 3, 0); o.ey = num(l.ey, CH_EYES.length, 0); o.ec = num(l.ec, CH_EYE_C.length, 0); o.br = num(l.br, CH_BROWS.length, 0); o.mo = num(l.mo, 4, 0); o.bp = num(l.bp, 3, d.bp);
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
  const L = chClean(look), skin = CH_SKIN[L.sk], hair = CH_HAIR[L.hc], top = CH_OUTFIT_C[L.oc], ink = '#1a1f2b', M = chBuild(L), cx = 60, dk = chShade(top, .78);
  let back = '', body = '', front = '';
  // hair that sits behind the head and shoulders
  if (L.hs === 'long') back += `<path d="M32 46C26 80 34 102 48 102L72 102C86 102 94 80 88 46Z" fill="${hair}"/>`;
  if (L.hs === 'afro') back += `<circle cx="60" cy="40" r="33" fill="${hair}"/>`;
  if (L.hs === 'bob') back += `<path d="M34 42C28 66 32 78 44 78L76 78C88 78 92 66 86 42Z" fill="${hair}"/>`;
  // legs, bottoms and shoes
  const pc = CH_BOTTOM_C[L.bc], pdk = chShade(pc, .8), shc = CH_SHOE_C[L.sc], legW = M.hp - 2, ankW = Math.round((1 + legW * .58) * 10) / 10;
  const outerAt = y => 1 + (M.hp - 1 - 1) + (ankW - (M.hp - 1)) * (y - 156) / 68;
  const leg = (s, y0, y1, fill) => `<path d="M${cx + s} ${y0}L${cx + s * outerAt(y0)} ${y0}L${cx + s * outerAt(y1)} ${y1}L${cx + s} ${y1}Z" fill="${fill}"/>`;
  let legs = `<ellipse cx="60" cy="239" rx="${Math.round(M.hp + 10)}" ry="5" fill="#000" opacity=".16"/>`;
  const long = L.bt === 'jeans' || L.bt === 'joggers';
  legs += leg(-1, 150, 226, skin) + leg(1, 150, 226, skin);
  if (long){
    legs += leg(-1, 146, 224, pc) + leg(1, 146, 224, pc) + `<path d="M${cx} 148V168" stroke="${pdk}" stroke-width="1.6"/>`;
    if (L.bt === 'joggers') legs += [-1, 1].map(s => `<path d="M${cx + s * outerAt(214)} 214L${cx + s * outerAt(224)} 224L${cx + s * 1} 224L${cx + s} 214Z" fill="${pdk}"/>`).join('');
  } else if (L.bt === 'shorts') legs += leg(-1, 146, 190, pc) + leg(1, 146, 190, pc);
  else legs += `<path d="M${cx - M.wa} 146H${cx + M.wa}L${cx + M.hp + 12} 192Q${cx} 199 ${cx - M.hp - 12} 192Z" fill="${pc}"/><path d="M${cx - M.hp - 4} 186Q${cx} 193 ${cx + M.hp + 4} 186" fill="none" stroke="${pdk}" stroke-width="1.6" opacity=".6"/>`;
  legs += `<rect x="${cx - M.wa}" y="144" width="${2 * M.wa}" height="6" rx="2" fill="${pdk}"/>`;
  for (const s of [-1, 1]){
    const mid = cx + s * (1 + ankW / 2), xa = mid - ankW / 2 - 1 - (s < 0 ? 8 : 0), xb = mid + ankW / 2 + 1 + (s > 0 ? 8 : 0);
    if (L.sn === 'boots') legs += `<rect x="${mid - ankW / 2 - 2}" y="208" width="${ankW + 4}" height="30" rx="4" fill="${shc}"/><rect x="${xa}" y="230" width="${xb - xa}" height="8" rx="3" fill="${shc}"/><rect x="${xa}" y="235" width="${xb - xa}" height="3.5" rx="1.5" fill="#1d1a1a" opacity=".6"/>`;
    else if (L.sn === 'slides') legs += `<rect x="${xa}" y="230" width="${xb - xa}" height="8" rx="3.5" fill="${skin}"/><rect x="${xa}" y="234.500" width="${xb - xa}" height="3.5" rx="1.5" fill="#3a4252"/><rect x="${mid - ankW / 2 - 1}" y="226" width="${ankW + 2}" height="6" rx="2" fill="${shc}"/>`;
    else legs += `<rect x="${xa}" y="222" width="${xb - xa}" height="16" rx="7" fill="${shc}"/><rect x="${xa}" y="234" width="${xb - xa}" height="4.500" rx="2" fill="#fff" opacity=".85"/><rect x="${xa}" y="234" width="${xb - xa}" height="4.500" rx="2" fill="none" stroke="#000" stroke-opacity=".15"/>`;
  }
  // outfit
  const hemY = {hoodie: 160, tee: 154, sweater: 160, coat: 190, blazer: 162}[L.ot], flare = L.ot === 'coat' ? 8 : 1;
  const garment = fill => `<path d="M${cx - M.ts} 108C${cx - M.ts} 92 ${cx - 26} 84 ${cx} 84C${cx + 26} 84 ${cx + M.ts} 92 ${cx + M.ts} 108L${cx + M.wa} 148Q${cx + M.wa} 154 ${cx + M.hp + flare} ${hemY}L${cx - M.hp - flare} ${hemY}Q${cx - M.wa} 154 ${cx - M.wa} 148Z" fill="${fill}"/>`;
  const sleeve = L.ot === 'coat' ? '#f1f1ec' : L.ot === 'blazer' ? '#2e3648' : top, sleeveEnd = L.ot === 'tee' ? 120 : 144;
  let arms = '';
  for (const s of [-1, 1]){
    const x = s < 0 ? cx - M.sw : cx + M.sw - 15;
    arms += `<rect x="${x}" y="94" width="15" height="54" rx="7.500" fill="${skin}"/><circle cx="${cx + s * (M.sw - 7.5)}" cy="148" r="7.500" fill="${skin}"/><rect x="${x}" y="94" width="15" height="${sleeveEnd - 94}" rx="7.500" fill="${sleeve}"/>`;
    if (L.ot === 'hoodie' || L.ot === 'sweater') arms += `<rect x="${x}" y="${sleeveEnd - 7}" width="15" height="7" rx="3" fill="${dk}"/>`;
    if (L.ot === 'coat') arms += `<rect x="${x}" y="${sleeveEnd - 5}" width="15" height="5" rx="2.500" fill="#c9cfda"/>`;
  }
  const band = `<rect x="${cx - M.hp - flare}" y="${hemY - 6}" width="${2 * (M.hp + flare)}" height="6" rx="2.500" fill="${dk}"/>`;
  if (L.ot === 'hoodie') body = garment(top) + `<path d="M42 86C48 102 72 102 78 86C70 94 50 94 42 86Z" fill="${dk}"/><path d="M54 96L53 112M66 96L67 112" stroke="${dk}" stroke-width="2" stroke-linecap="round"/><path d="M${cx - 18} 128H${cx + 18}L${cx + 22} 150H${cx - 22}Z" fill="${dk}" opacity=".5"/>` + band;
  else if (L.ot === 'tee') body = garment(top) + `<path d="M48 85C52 98 68 98 72 85Z" fill="${skin}"/>`;
  else if (L.ot === 'sweater') body = garment(top) + `<path d="M46 84C50 94 70 94 74 84L74 90C70 98 50 98 46 90Z" fill="${dk}"/><path d="M${cx - M.ts + 3} 118H${cx + M.ts - 3}M${cx - M.ts + 3} 126H${cx + M.ts - 3}" stroke="${dk}" stroke-width="1.5" opacity=".55"/>` + band;
  else if (L.ot === 'coat') body = garment('#f1f1ec') + `<path d="M60 88L46 124M60 88L74 124" stroke="#c9cfda" stroke-width="3" fill="none"/><path d="M46 86L60 108L74 86Z" fill="${top}"/><path d="M60 108V188" stroke="#c9cfda" stroke-width="2"/><path d="M${cx - M.hp + 2} 156H${cx - M.hp + 16}M${cx + M.hp - 16} 156H${cx + M.hp - 2}" stroke="#c9cfda" stroke-width="2.500" stroke-linecap="round"/>`;
  else body = garment('#2e3648') + `<path d="M47 86L60 112L73 86Z" fill="#f4f1e8"/><path d="M47 86L60 112L50 124M73 86L60 112L70 124" stroke="#1d2433" stroke-width="2.500" fill="none"/><circle cx="60" cy="140" r="2" fill="#1d2433"/>`;
  // neck, ears, head
  const neck = `<rect x="52" y="64" width="16" height="24" fill="${skin}"/><path d="M52 78Q60 84 68 78V84H52Z" fill="#000" opacity=".1"/>`;
  const head = `<circle cx="36.5" cy="53" r="4.2" fill="${skin}"/><circle cx="83.5" cy="53" r="4.2" fill="${skin}"/><ellipse cx="60" cy="50" rx="24" ry="25" fill="${skin}"/>`;
  // face
  const eyeY = 52, ec = CH_EYE_C[L.ec], ecd = chShade(ec, .55), sk = skin, ey = L.ey;
  const eye = (x, s) => {
    const iw = ey === 4 ? 4.1 : ey === 3 ? 3 : 3.4, y = ey === 2 ? eyeY + .6 : eyeY, ry = ey === 4 ? 5.4 : ey === 3 ? 4.1 : 4.6, rx = ey === 4 ? 5.9 : 5.5;
    let g = ey === 3 ? `<path d="M${x - s * 6} ${y + .8}Q${x} ${y - 5} ${x + s * 6} ${y - 1.4}Q${x} ${y + 4.2} ${x - s * 6} ${y + .8}Z" fill="#fff" stroke="${ink}" stroke-width=".7" stroke-linejoin="round"/>`
      : `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${ink}" stroke-width=".7"/>`;
    const ix = x + s * (ey === 3 ? .4 : .2), iy = y + (ey === 1 ? .5 : ey === 2 ? .4 : 0);
    g += `<circle cx="${ix}" cy="${iy}" r="${iw}" fill="${ec}" stroke="${ecd}" stroke-width=".6"/><circle cx="${ix}" cy="${iy}" r="${(iw * .46).toFixed(2)}" fill="${ink}"/><circle cx="${ix - 1.1}" cy="${iy - 1.2}" r="${(iw * .27).toFixed(2)}" fill="#fff"/><circle cx="${ix + 1.1}" cy="${iy + 1.1}" r="${(iw * .13).toFixed(2)}" fill="#fff" opacity=".8"/>`;
    if (ey === 1) g += `<path d="M${x - 7} ${y + 7}L${x - 7} ${y + 1.8}Q${x} ${y - 1.4} ${x + 7} ${y + 1.8}L${x + 7} ${y + 7}Z" fill="${sk}"/><path d="M${x - 5.6} ${y + 1.6}Q${x} ${y - 1} ${x + 5.6} ${y + 1.6}" fill="none" stroke="${ink}" stroke-width="1.2" stroke-linecap="round"/>`;
    if (ey === 2) g += `<path d="M${x - 7} ${y - 7}H${x + 7}V${y - .4}Q${x} ${y + 1.6} ${x - 7} ${y - .4}Z" fill="${sk}"/><path d="M${x - 5.8} ${y - .2}Q${x} ${y + 1.5} ${x + 5.8} ${y - .2}" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`;
    else if (ey !== 1) g += `<path d="M${x - rx} ${y - .3}Q${x} ${y - ry * 1.5} ${x + rx} ${y - .3}" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>`;
    return g;
  };
  const eyes = eye(51, -1) + eye(69, 1);
  const bc = chShade(hair, .72), bw = L.br === 3 ? 2.6 : 1.7, by = L.br === 2 ? 41.5 : 42.5;
  const bro = [`M${43} ${by + 1.6}Q${49} ${by - 1.2} ${57} ${by + .8}M${77} ${by + 1.6}Q${71} ${by - 1.2} ${63} ${by + .8}`, `M43 ${by + 1}L57 ${by}M77 ${by + 1}L63 ${by}`, `M43 ${by + 2}Q50 ${by - 3.4} 57 ${by + 1}M77 ${by + 2}Q70 ${by - 3.4} 63 ${by + 1}`, `M43 ${by + 1.4}Q49 ${by - .6} 57 ${by + .4}M77 ${by + 1.4}Q71 ${by - .6} 63 ${by + .4}`][L.br];
  const brows = `<path d="${bro}" fill="none" stroke="${bc}" stroke-width="${bw}" stroke-linecap="round"/>`;
  const mouth = L.mo === 1 ? `<path d="M52 61Q60 72 68 61Z" fill="${ink}"/><path d="M54 62.5H66" stroke="#fff" stroke-width="2"/>` : L.mo === 2 ? `<path d="M54 64H66" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`
    : L.mo === 3 ? `<ellipse cx="60" cy="64" rx="3.2" ry="3.8" fill="${ink}"/>` : `<path d="M52.5 62Q60 69 67.5 62" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;
  const blush = L.bl ? '<circle cx="44" cy="60" r="4" fill="#e8837a" opacity=".3"/><circle cx="76" cy="60" r="4" fill="#e8837a" opacity=".3"/>' : '';
  const nose = `<path d="M60 55V59" stroke="#000" stroke-width="1.6" stroke-linecap="round" opacity=".14"/>`;
  // front hair
  const cap = `<path d="M35 50C32 28 46 20 60 20C74 20 88 28 85 50C80 38 70 34 60 34C50 34 40 38 35 50Z" fill="${hair}"/>`;
  const hs = L.hs;
  if (hs === 'buzz') front += `<path d="M36 46C36 28 48 24 60 24C72 24 84 28 84 46C78 36 70 32 60 32C50 32 42 36 36 46Z" fill="${hair}" opacity=".9"/>`;
  else if (hs === 'side') front += `<path d="M34 52C30 26 50 18 66 22C80 24 90 36 85 52C82 40 74 34 62 34C50 36 42 42 34 52Z" fill="${hair}"/>`;
  else if (hs === 'curly') front += `<g fill="${hair}">${[[40, 36], [49, 28], [60, 24], [71, 28], [80, 36], [84, 46], [36, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</g>` + cap;
  else if (hs === 'spiky') front += `<path d="M34 50L36 28L44 36L48 20L56 32L62 17L68 32L76 20L78 36L86 28L86 50C80 38 70 34 60 34C50 34 40 38 34 50Z" fill="${hair}"/>`;
  else if (hs === 'bob') front += cap + `<path d="M34 48C30 62 34 72 42 72L46 50Z M86 48C90 62 86 72 78 72L74 50Z" fill="${hair}"/>`;
  else if (hs === 'long') front += cap + `<path d="M34 48C30 70 36 86 46 86L48 52Z M86 48C90 70 84 86 74 86L72 52Z" fill="${hair}"/>`;
  else if (hs === 'bun') front += `<circle cx="60" cy="16" r="11" fill="${hair}"/>` + cap;
  else if (hs === 'afro') front += `<path d="M36 48C34 30 46 22 60 22C74 22 86 30 84 48C78 38 70 34 60 34C50 34 42 38 36 48Z" fill="${hair}"/>`;
  else front += cap;
  // accessories
  let acc = '';
  if (L.gl) acc += `<g fill="none" stroke="${ink}" stroke-width="1.8">${L.gl === 1 ? '<circle cx="51" cy="52" r="7.5"/><circle cx="69" cy="52" r="7.5"/>' : '<rect x="43" y="45.5" width="15" height="13" rx="3"/><rect x="62" y="45.5" width="15" height="13" rx="3"/>'}<path d="M58.5 52H61.5"/></g>`;
  if (L.ht) acc += `<path d="M35 44C34 16 48 10 60 10C72 10 86 16 85 44Z" fill="${dk}"/><rect x="34" y="38" width="52" height="10" rx="4" fill="${top}"/>`;
  if (L.hp) acc += `<path d="M35 52C34 14 86 14 85 52" fill="none" stroke="#c9cfda" stroke-width="4.5"/><rect x="29" y="44" width="11" height="22" rx="5.5" fill="#3a4252"/><rect x="80" y="44" width="11" height="22" rx="5.5" fill="#3a4252"/>`;
  const lashes = L.ls ? `<path d="M45.800 50.500L42.800 48.200M47.600 48.800L45.800 45.600M74.200 50.500L77.200 48.200M72.400 48.800L74.200 45.600" stroke="${ink}" stroke-width="1.400" stroke-linecap="round"/>` : '';
  const skinHex = skin.toLowerCase(), OL = 'stroke="rgba(20,16,12,.72)" stroke-width="1.1" stroke-linejoin="round"';
  const ol = str => str.replace(/<(path|rect|circle|ellipse)\b([^>]*?)(\/?)>/g, (m, t, a, c) => /fill="none"|stroke=|opacity=|fill="#000"/.test(a) || a.toLowerCase().includes('fill="' + skinHex + '"') ? m : `<${t}${a} ${OL}${c}>`);
  return ol(back + legs + arms) + neck + ol(body) + head + blush + nose + eyes + brows + lashes + mouth + ol(front + acc);
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
function ccSwatches(key, list, d){ return `<div class="cc-sw">${list.map((c, k) => `<button type="button" class="cc-dot" data-cc="${key}" data-v="${k}" aria-pressed="${d[key] === k}" aria-label="${key} ${k + 1}" style="background:${c}"></button>`).join('')}</div>`; }
function ccTiles(key, list, d, crop, num){ return `<div class="cc-grid">${list.map(([v, l]) => `<button type="button" class="cc-tile" data-cc="${key}" data-v="${v}" aria-pressed="${String(d[key]) === String(v)}"><span class="cc-th">${chThumb(d, {[key]: num ? +v : v}, crop)}</span><span>${l}</span></button>`).join('')}</div>`; }
function ccToggles(items, d){ return `<div class="cc-grid">${items.map(([k, l, crop]) => `<button type="button" class="cc-tile" data-cc-tg="${k}" aria-pressed="${!!d[k]}"><span class="cc-th">${chThumb(d, {[k]: d[k] ? 0 : 1}, crop)}</span><span>${d[k] ? 'Remove ' : ''}${l}</span></button>`).join('')}</div>`; }
const ccH = t => `<h4 class="cc-h">${t}</h4>`;
function ccPanel(){
  const d = ccLook;
  return [
    ccH('Gender') + ccTiles('gd', CH_GENDER, d, 'full', true) + ccH('Body shape') + ccTiles('bd', CH_BUILD, d, 'full', true) + ccH('Skin tone') + ccSwatches('sk', CH_SKIN, d),
    ccH('Style') + ccTiles('hs', CH_HAIRSTYLES, d, 'head') + ccH('Hair color') + ccSwatches('hc', CH_HAIR, d),
    ccH('Eye shape') + ccTiles('ey', CH_EYES, d, 'face', true) + ccH('Eye color') + ccSwatches('ec', CH_EYE_C, d) + ccH('Eyebrows') + ccTiles('br', CH_BROWS, d, 'face', true) + ccH('Mouth') + ccTiles('mo', CH_MOUTHS, d, 'face', true) + ccH('Details') + ccToggles([['ls', 'Lashes', 'face'], ['bl', 'Blush', 'face']], d),
    ccH('Top') + ccTiles('ot', CH_OUTFITS, d, 'top') + ccH('Top color') + ccSwatches('oc', CH_OUTFIT_C, d),
    ccH('Bottoms') + ccTiles('bt', CH_BOTTOMS, d, 'bottoms') + ccH('Color') + ccSwatches('bc', CH_BOTTOM_C, d),
    ccH('Shoes') + ccTiles('sn', CH_SHOES, d, 'shoes') + ccH('Color') + ccSwatches('sc', CH_SHOE_C, d),
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
  if (full) el.querySelector('#ccTabs').innerHTML = CC_TABS.map((t, k) => `<button type="button" role="tab" class="cc-tab" data-cc-tab="${k}" aria-selected="${k === ccTab}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${t[2]}"/></svg><span>${t[0]}</span></button>`).join('');
  const body = el.querySelector('#ccBody'), top = body.scrollTop;
  body.innerHTML = ccPanel(); body.scrollTop = full ? 0 : top;
}
function ccOpen(){
  if (document.getElementById('cc')) return;
  ccLook = chMyLook(); ccTab = 0; ccView = CC_VIEWS.full.slice();
  document.body.insertAdjacentHTML('beforeend', `<div id="cc" class="cc" role="dialog" aria-modal="true" aria-label="Character creator">
    <div class="cc-bar"><button type="button" class="small-btn" data-cc-act="cancel">Cancel</button><b>Your character</b><button type="button" class="btn primary" data-cc-act="save">Done</button></div>
    <div class="cc-main"><div class="cc-left"><div class="cc-stage" id="ccStage"></div><div class="cc-btns"><button type="button" class="small-btn" data-cc-act="random">Randomize</button><button type="button" class="small-btn" data-cc-act="reset">Reset</button></div></div>
    <div class="cc-right"><div class="cc-tabs" id="ccTabs" role="tablist"></div><div class="cc-body" id="ccBody"></div></div></div></div>`);
  document.body.classList.add('cc-lock'); ccDraw(true);
  const first = document.querySelector('#cc [data-cc-act="save"]'); if (first) first.focus();
}
function ccClose(){ const el = document.getElementById('cc'); if (el) el.remove(); document.body.classList.remove('cc-lock'); }
function ccSave(){
  P.myLook = chClean(ccLook); chDraft = null; try { saveP(); } catch (e) {}
  const svg = chBust(chMyLook());
  document.querySelectorAll('#ccMini').forEach(x => x.innerHTML = svg);
  document.querySelectorAll('[data-flip="' + ME + '"] .af-b .av').forEach(x => x.innerHTML = svg);
  ccClose();
}
function ccMiniHtml(){ return `<div class="cc-mini"><span class="av pic xl" id="ccMini">${chBust(chMyLook())}</span><div><button type="button" class="btn" data-cc-act="open">Customize character</button><small class="hint">Body, hair, face, clothes and more. Drag your profile picture sideways to flip it to your character.</small></div></div>`; }
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
  else if (o){ const k = o.dataset.cc; ccLook[k] = ['hs', 'ot', 'bt', 'sn'].includes(k) ? o.dataset.v : +o.dataset.v; ccLook = chClean(ccLook); ccDraw(false); }
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('cc')) ccClose(); });
