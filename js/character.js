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
const CH_EYES = [['0', 'Dots'], ['1', 'Happy'], ['2', 'Sleepy']];
const CH_MOUTHS = [['0', 'Smile'], ['1', 'Grin'], ['2', 'Calm'], ['3', 'Oh']];
const CH_BGPAT = [['0', 'Plain'], ['1', 'Spotlight'], ['2', 'Stripe']];
const CH_DEFAULT = {sk: 2, hc: 1, hs: 'short', ot: 'hoodie', oc: 0, gl: 0, hp: 0, ht: 0, ey: 0, mo: 0, bl: 0, bg: 0, bp: 1};

// a simulated player's look, worked out from their number
const CH_CACHE = new Map();
function chLookOf(i){
  const r = mulberry32((i * 2654435761 >>> 0) ^ 0x7f4a7c15), n = a => Math.floor(r() * a);
  const sk = [0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6][n(12)], natural = r() < .8;
  return {sk, hc: natural ? [0, 0, 1, 1, 1, 2, 2, 3, 4, 5, 6, 7][n(12)] : 8 + n(5), hs: CH_HAIRSTYLES[n(CH_HAIRSTYLES.length)][0],
    ot: CH_OUTFITS[n(CH_OUTFITS.length)][0], oc: n(CH_OUTFIT_C.length), gl: r() < .35 ? 1 + n(2) : 0, hp: r() < .15 ? 1 : 0, ht: r() < .08 ? 1 : 0,
    ey: [0, 0, 0, 1, 1, 2][n(6)], mo: [0, 0, 0, 1, 2, 3][n(6)], bl: r() < .25 ? 1 : 0, bg: n(CH_BG.length), bp: n(3)};
}
// a saved look, cleaned so a bad or old value can never break the drawing
function chClean(l){
  const d = CH_DEFAULT, o = {}, num = (v, max, dv) => Number.isInteger(v) && v >= 0 && v < max ? v : dv;
  l = l || {};
  o.sk = num(l.sk, CH_SKIN.length, d.sk); o.hc = num(l.hc, CH_HAIR.length, d.hc); o.oc = num(l.oc, CH_OUTFIT_C.length, d.oc); o.bg = num(l.bg, CH_BG.length, d.bg);
  o.hs = CH_HAIRSTYLES.some(x => x[0] === l.hs) ? l.hs : d.hs; o.ot = CH_OUTFITS.some(x => x[0] === l.ot) ? l.ot : d.ot;
  o.gl = num(l.gl, 3, 0); o.ey = num(l.ey, 3, 0); o.mo = num(l.mo, 4, 0); o.bp = num(l.bp, 3, d.bp);
  o.hp = l.hp ? 1 : 0; o.ht = l.ht ? 1 : 0; o.bl = l.bl ? 1 : 0;
  return o;
}
const chShade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => f(c).toString(16).padStart(2, '0')).join(''); };

// the character on a 120 x 120 canvas (no background)
function chFigure(look){
  const L = chClean(look), skin = CH_SKIN[L.sk], hair = CH_HAIR[L.hc], top = CH_OUTFIT_C[L.oc], ink = '#1a1f2b';
  const shoulders = 'M10 124C10 94 34 84 60 84C86 84 110 94 110 124Z';
  let back = '', body = '', front = '';
  // hair that sits behind the head and shoulders
  if (L.hs === 'long') back += `<path d="M32 46C26 80 34 102 48 102L72 102C86 102 94 80 88 46Z" fill="${hair}"/>`;
  if (L.hs === 'afro') back += `<circle cx="60" cy="40" r="33" fill="${hair}"/>`;
  if (L.hs === 'bob') back += `<path d="M34 42C28 66 32 78 44 78L76 78C88 78 92 66 86 42Z" fill="${hair}"/>`;
  // outfit
  const dk = chShade(top, .78);
  if (L.ot === 'hoodie') body = `<path d="${shoulders}" fill="${top}"/><path d="M42 86C48 102 72 102 78 86C70 94 50 94 42 86Z" fill="${dk}"/><path d="M54 96L53 112M66 96L67 112" stroke="${dk}" stroke-width="2" stroke-linecap="round"/>`;
  else if (L.ot === 'tee') body = `<path d="${shoulders}" fill="${top}"/><path d="M48 85C52 98 68 98 72 85Z" fill="${skin}"/>`;
  else if (L.ot === 'sweater') body = `<path d="${shoulders}" fill="${top}"/><path d="M46 84C50 94 70 94 74 84L74 90C70 98 50 98 46 90Z" fill="${dk}"/><path d="M20 112H100M22 118H98" stroke="${dk}" stroke-width="1.5" opacity=".55"/>`;
  else if (L.ot === 'coat') body = `<path d="${shoulders}" fill="#f1f1ec"/><path d="M60 88L46 124M60 88L74 124" stroke="#c9cfda" stroke-width="3" fill="none"/><path d="M46 86L60 108L74 86Z" fill="${top}"/>`;
  else body = `<path d="${shoulders}" fill="#2e3648"/><path d="M47 86L60 112L73 86Z" fill="#f4f1e8"/><path d="M47 86L60 112L50 124M73 86L60 112L70 124" stroke="#1d2433" stroke-width="2.5" fill="none"/>`;
  // neck, ears, head
  const neck = `<rect x="52" y="64" width="16" height="24" fill="${skin}"/><path d="M52 78Q60 84 68 78V84H52Z" fill="#000" opacity=".1"/>`;
  const head = `<circle cx="36.5" cy="53" r="4.2" fill="${skin}"/><circle cx="83.5" cy="53" r="4.2" fill="${skin}"/><ellipse cx="60" cy="50" rx="24" ry="25" fill="${skin}"/>`;
  // face
  const eyeY = 52, eyes = L.ey === 1 ? `<path d="M46 ${eyeY + 1.5}Q51 ${eyeY - 4} 56 ${eyeY + 1.5}M64 ${eyeY + 1.5}Q69 ${eyeY - 4} 74 ${eyeY + 1.5}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`
    : L.ey === 2 ? `<path d="M46.5 ${eyeY}H55.5M64.5 ${eyeY}H73.5" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>` : `<circle cx="51" cy="${eyeY}" r="2.5" fill="${ink}"/><circle cx="69" cy="${eyeY}" r="2.5" fill="${ink}"/>`;
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
  return back + neck + body + head + blush + nose + eyes + mouth + front + acc;
}
// a picture of the character with its background, as a square svg
function chBust(look, id){
  const L = chClean(look), bg = CH_BG[L.bg], deco = L.bp === 1 ? `<circle cx="60" cy="52" r="46" fill="#fff" opacity=".28"/>` : L.bp === 2 ? `<path d="M0 90L120 30V70L0 124Z" fill="#fff" opacity=".2"/>` : '';
  return `<svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice"><rect width="120" height="120" fill="${bg}"/>${deco}${chFigure(L)}</svg>`;
}
function chBotSvg(i){ let s = CH_CACHE.get(i); if (s === undefined){ s = chBust(chLookOf(i)); if (CH_CACHE.size > 6000) CH_CACHE.clear(); CH_CACHE.set(i, s); } return s; }
const chMyLook = () => chClean(P.myLook || CH_DEFAULT);
// the character as a round picture, and the flip on profiles: tap the profile picture to see the character behind it
const chFlipped = new Set();         // profiles flipped to the character during this visit
function chFlip(w, cls){
  const svg = w === ME ? chBust(chMyLook()) : chBotSvg(BOTS[w] && BOTS[w].i != null ? BOTS[w].i : w);
  return `<button type="button" class="av-flip${chFlipped.has(w) ? ' flipped' : ''}" data-flip="${w}" aria-label="Flip between profile picture and character" title="Tap to flip">
    <span class="af-in"><span class="af-f">${pAvatar(w, cls)}</span><span class="af-b"><span class="av pic ${cls || ''}" aria-hidden="true">${svg}</span></span></span>
    <span class="af-tag" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M3 11V9a2 2 0 0 1 2-2h16"/><path d="M7 21l-4-4 4-4"/><path d="M21 13v2a2 2 0 0 1-2 2H3"/></svg></span></button>`;
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-flip]'); if (!f) return;
  e.preventDefault(); e.stopPropagation();
  const w = +f.dataset.flip, on = !f.classList.contains('flipped');
  f.classList.toggle('flipped', on); on ? chFlipped.add(w) : chFlipped.delete(w);
}, true);

/* ---------------- the character creator (a full screen, opened from Edit profile) ---------------- */
let chDraft = null;                  // the look being edited in Edit profile (kept so older saves still work)
function chStartEdit(){ chDraft = chMyLook(); }
let ccLook = null, ccTab = 0;
const CC_TABS = [
  ['Body', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6'],
  ['Hair', 'M5 13c0-5 3-9 7-9s7 4 7 9c-2-1-4-3-5-5-1 2-4 4-9 5z'],
  ['Face', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 10h.01M15 10h.01M8.5 14.5c1 1.5 2.2 2 3.5 2s2.500-.5 3.500-2'],
  ['Clothes', 'M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3c-.5 1.500-2 2.500-4 2.500S8.500 5.500 8 4z'],
  ['Extras', 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4zM17 14h3v5h-3z'],
  ['Backdrop', 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6']
];
// a small picture of the character with one thing changed (a crop of the head, or the whole figure)
const chThumb = (look, over, crop) => chBust(Object.assign({}, look, over)).replace('viewBox="0 0 120 120"', `viewBox="${crop === 'head' ? '24 6 72 72' : '0 0 120 120'}"`);
function ccSwatches(key, list, d){ return `<div class="cc-sw">${list.map((c, k) => `<button type="button" class="cc-dot" data-cc="${key}" data-v="${k}" aria-pressed="${d[key] === k}" aria-label="${key} ${k + 1}" style="background:${c}"></button>`).join('')}</div>`; }
function ccTiles(key, list, d, crop, num){ return `<div class="cc-grid">${list.map(([v, l]) => `<button type="button" class="cc-tile" data-cc="${key}" data-v="${v}" aria-pressed="${String(d[key]) === String(v)}"><span class="cc-th">${chThumb(d, {[key]: num ? +v : v}, crop)}</span><span>${l}</span></button>`).join('')}</div>`; }
function ccToggles(items, d){ return `<div class="cc-grid">${items.map(([k, l]) => `<button type="button" class="cc-tile" data-cc-tg="${k}" aria-pressed="${!!d[k]}"><span class="cc-th">${chThumb(d, {[k]: d[k] ? 0 : 1}, 'head')}</span><span>${d[k] ? 'Remove ' : ''}${l}</span></button>`).join('')}</div>`; }
const ccH = t => `<h4 class="cc-h">${t}</h4>`;
function ccPanel(){
  const d = ccLook;
  return [
    ccH('Skin tone') + ccSwatches('sk', CH_SKIN, d),
    ccH('Style') + ccTiles('hs', CH_HAIRSTYLES, d, 'head') + ccH('Hair color') + ccSwatches('hc', CH_HAIR, d),
    ccH('Eyes') + ccTiles('ey', CH_EYES, d, 'head', true) + ccH('Mouth') + ccTiles('mo', CH_MOUTHS, d, 'head', true) + ccH('Cheeks') + ccToggles([['bl', 'Blush']], d),
    ccH('Outfit') + ccTiles('ot', CH_OUTFITS, d, 'full') + ccH('Outfit color') + ccSwatches('oc', CH_OUTFIT_C, d),
    ccH('Glasses') + ccTiles('gl', CH_GLASSES, d, 'head', true) + ccH('Accessories') + ccToggles([['hp', 'Headphones'], ['ht', 'Beanie']], d),
    ccH('Color') + ccSwatches('bg', CH_BG, d) + ccH('Pattern') + ccTiles('bp', CH_BGPAT, d, 'full', true)
  ][ccTab];
}
function ccDraw(full){
  const el = document.getElementById('cc'); if (!el) return;
  el.querySelector('#ccStage').innerHTML = chBust(ccLook);
  if (full){
    el.querySelector('#ccTabs').innerHTML = CC_TABS.map((t, k) => `<button type="button" role="tab" class="cc-tab" data-cc-tab="${k}" aria-selected="${k === ccTab}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${t[1]}"/></svg><span>${t[0]}</span></button>`).join('');
  }
  const body = el.querySelector('#ccBody'), top = body.scrollTop;
  body.innerHTML = ccPanel(); if (!full) body.scrollTop = top;
}
function ccOpen(){
  if (document.getElementById('cc')) return;
  ccLook = chMyLook(); ccTab = 0;
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
function ccMiniHtml(){ return `<div class="cc-mini"><span class="av pic xl" id="ccMini">${chBust(chMyLook())}</span><div><button type="button" class="btn" data-cc-act="open">Customize character</button><small class="hint">Hair, face, clothes and more. Tap your profile picture to flip to your character.</small></div></div>`; }
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
  if (t){ ccTab = +t.dataset.ccTab; ccDraw(true); }
  else if (g){ const k = g.dataset.ccTg; ccLook[k] = ccLook[k] ? 0 : 1; ccLook = chClean(ccLook); ccDraw(false); }
  else if (o){ const k = o.dataset.cc; ccLook[k] = ['hs', 'ot'].includes(k) ? o.dataset.v : +o.dataset.v; ccLook = chClean(ccLook); ccDraw(false); }
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('cc')) ccClose(); });
