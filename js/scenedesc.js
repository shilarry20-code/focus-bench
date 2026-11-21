/* ---------- what a picture shows, in words ----------
   The people writing captions and comments only know a picture through this description, so it has to say what is
   really in it and nothing else. The picture is drawn once more with a label on every item, decoration, piece of
   furniture, window, note and person; it's laid out off-screen, and only what ends up inside the frame (enough of it
   to notice) gets described. That way a decoration a selfie leaves out, or a mug cut off by a close-up, never comes up.
   Results are kept per picture, so each one is only measured once. */
let SC_TRACK = false, SC_DESCING = false;
const scMark = (kind, key, svg) => SC_TRACK && svg ? `<g data-it="${kind}:${key}">${svg}</g>` : svg;
(function scTrackWrap(){
  const wrapObj = (obj, kind, field) => Object.keys(obj).forEach(k => {
    const o = obj[k]; if (!o) return;
    if (field){ ['d', 'top'].forEach(f => { const fn = o[f]; if (typeof fn === 'function' && !fn._tr){ o[f] = function(){ return scMark(kind, k, fn.apply(this, arguments)); }; o[f]._tr = 1; } }); }
    else if (typeof o === 'function' && !o._tr){ obj[k] = function(){ return scMark(kind, k, o.apply(this, arguments)); }; obj[k]._tr = 1; }
  });
  wrapObj(SC.PROP, 'p', true); wrapObj(SC.SDEC, 's'); wrapObj(SC.DEC, 'f');
  const wrapFn = (name, kind) => { const fn = window[name]; if (typeof fn !== 'function') return null; return function(){ return scMark(kind, 'x', fn.apply(this, arguments)); }; };
  const f1 = wrapFn('sc2Folk', 'who'); if (f1) sc2Folk = f1;
  const f2 = wrapFn('sc2Window', 'win'); if (f2) sc2Window = f2;
  const f3 = wrapFn('scSticky', 'note'); if (f3) scSticky = f3;
  // furniture the newer rooms draw with their own helpers (labelled with the key SC_FURN describes)
  const furn = (name, key) => { const fn = window[name] || (() => { try { return eval(name); } catch(e){ return null; } })(); if (typeof fn !== 'function') return;
    const w = function(){ return scMark('f', key, fn.apply(this, arguments)); }; eval(`${name} = w`); };
  [['sc2Bed', 'bed'], ['sc2Poster', 'poster'], ['sc2Frame', 'frame'], ['sc2Books', 'shelf'], ['sc2Lights', 'stringPorch'], ['sc2Dresser', 'dresser'], ['sc2Door', 'door'], ['sc2Lockers', 'lockers'],
   ['sc2Tree', 'trees'], ['sc2Pine', 'pines'], ['sc2Lamppost', 'lamppost'], ['sc2Bldg', 'buildings'], ['sc2EatTable', 'tables'], ['sc2StuDesk', 'desks']].forEach(([n, k]) => furn(n, k));
  // indoors, the old window view counts as a window (outdoors it's the whole background)
  const _view = scView; scView = function(win, L, id, r, x, y, w, h){ const g = _view.apply(this, arguments); return w < 290 ? scMark('win', 'x', g) : g; };
})();

// draw the picture with labels and see what landed in the frame: {p: Set, s: Set, f: Set, win: n, note: n, who: n}
const SC_SEEN = new Map();
function scSeen(S){
  const key = JSON.stringify(S); if (SC_SEEN.has(key)) return SC_SEEN.get(key);
  const out = {p: new Set(), s: new Set(), f: new Set(), win: 0, note: 0, who: 0};
  let host = null;
  try {
    SC_TRACK = true; SC_DESCING = true;
    const svg = sceneSvg(S, 'trk' + (S.seed >>> 0).toString(36));
    SC_TRACK = false; SC_DESCING = false;
    host = document.createElement('div');
    host.setAttribute('style', 'position:fixed;left:-2000px;top:0;width:300px;height:300px;visibility:hidden;pointer-events:none;contain:strict');
    host.innerHTML = svg; document.body.appendChild(host);
    const root = host.querySelector('svg'); root.setAttribute('width', '300'); root.setAttribute('height', '300');
    const R = root.getBoundingClientRect();
    host.querySelectorAll('[data-it]').forEach(el => {
      if (el.parentElement && el.parentElement.closest('[data-it]') && el.dataset.it.split(':')[0] === el.parentElement.closest('[data-it]').dataset.it.split(':')[0]) return;   // the same thing drawn inside itself
      const b = el.getBoundingClientRect(); if (!b.width || !b.height) return;
      const w = Math.max(0, Math.min(b.right, R.right) - Math.max(b.left, R.left)), h = Math.max(0, Math.min(b.bottom, R.bottom) - Math.max(b.top, R.top));
      const vis = w * h, all = b.width * b.height;
      if (vis < 140 || vis / all < .4) return;               // too little of it in the frame to notice
      const [kind, k] = el.dataset.it.split(':');
      if (kind === 'p' || kind === 's' || kind === 'f') out[kind].add(k); else out[kind]++;
    });
  } catch(e){ console.error(e); }
  finally { SC_TRACK = false; SC_DESCING = false; if (host) host.remove(); }
  if (SC_SEEN.size > 400) SC_SEEN.delete(SC_SEEN.keys().next().value);
  SC_SEEN.set(key, out);
  return out;
}

const SC_FURN = {shelf: 'a bookshelf', poster: 'a poster on the wall', bed: 'a bed', bunk: 'bunk beds', clock: 'a wall clock', plant: 'a potted plant', frame: 'a framed picture', lampFloor: 'a floor lamp',
  cabinets: 'kitchen cabinets', fridge: 'a fridge', stacks: 'rows of bookshelves', stacks2: 'rows of bookshelves', whiteboard: 'a whiteboard', chalkboard: 'a chalkboard', seats: 'rows of lecture seats',
  projector: 'a projector screen', labshelf: 'lab shelves of bottles', hood: 'a fume hood', microscope: 'a microscope', monitors: 'rows of computer monitors', pegboard: 'a tool pegboard', printer3d: 'a 3D printer',
  easel: 'an easel', canvases: 'canvases leaning on the wall', stand: 'a music stand', menu: 'a menu board', hanging: 'hanging plants', counterCafe: 'the café counter', neonSign: 'a neon sign', trays: 'stacks of trays',
  banners: 'banners on the wall', washers: 'washing machines', lockers: 'lockers', door: 'a door', rail: 'a railing', vending: 'a vending machine', beams: 'wooden beams', plants: 'plants', hay: 'hay bales',
  board: 'a notice board', railing: 'a railing', stringPorch: 'string lights', trees: 'trees', bikes: 'parked bikes', columns: 'stone columns', fence: 'a fence', flowers: 'flowers', shelter: 'a bus shelter',
  lantern: 'a lantern', clothes: 'clothes on a rack', partyLights: 'party lights', paintings: 'paintings on the walls', dome: 'the planetarium dome', telescope: 'a telescope', umbrella: 'a big umbrella',
  shelfArcade: 'arcade shelves', arcadeMachines: 'arcade machines', dresser: 'a dresser', pines: 'pine trees', lamppost: 'a lamppost', buildings: 'buildings', tables: 'other tables', desks: 'rows of desks'};
const SC_VIEW = {city: 'city buildings', street: 'the street', campus: 'campus', trees: 'trees', field: 'fields', sea: 'the ocean', lake: 'a lake', mountains: 'mountains', airport: 'the airport',
  parking: 'a parking lot', gas: 'a gas station', clouds: 'clouds', stadium: 'the stadium', stars: 'stars', stained: 'stained glass', pool: 'the pool', ice: 'the ice rink', lanes: 'bowling lanes', sky: 'sky'};
const SC_SURFW = {desk: 'a desk', table: 'a table', bench: 'a workbench', workbench: 'a workbench', counter: 'the kitchen counter', cafetable: 'a little café table', lab: 'a lab bench', booth: 'a booth table',
  bed: 'their bed', couch: 'the couch', floor: 'the floor', piano: 'the piano', grass: 'the grass', sand: 'the sand', dock: 'the dock', rock: 'a rock', lap: 'their lap', tray: 'a tray table', tub: 'the edge of the tub',
  tubtray: 'a tray across the tub', pew: 'a pew', bleachers: 'the bleachers', steps: 'the steps', stairs: 'the stairs', ledge: 'a ledge', hammock: 'a hammock', chairs: 'a row of chairs'};
const SC_TIME = {m: 'morning', d: 'daytime', e: 'evening', n: 'night'};
const SC_PRINT = {stripes: 'striped', ringer: 'ringer', tiedye: 'tie-dye', pocket: 'pocket'};
const scList = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const scHairWord = h => { const m = {'#1d1a1a': 'black', '#3b2a20': 'dark brown', '#5d3b25': 'brown', '#8a5a33': 'light brown', '#c9a26a': 'dirty blond', '#e8d29a': 'blond', '#b4472b': 'red'}; return m[String(h).toLowerCase()] || 'dyed'; };

// opt: {t: when it was posted} for the time of day when the light doesn't say
sceneDesc = function(S, opt = {}){
  if (SC_DESCING) return '';
  if (S.angle === 'door') S = {...S, angle: 'front'};
  const set = SC.SETTING[S.set], L = SC.LIGHT[S.light]; if (!set || !L) return '';
  const seen = scSeen(S), selfie = S.angle === 'selfie', parts = [];
  // the shot
  const where = set.k === 'out' ? 'outdoors' : set.k === 'veh' ? 'in a vehicle' : 'indoors';
  if (selfie) parts.push(`A selfie ${SC.POSE[S.pose]}, ${where}.`);
  else parts.push(`A photo taken ${S.angle === 'front' ? 'straight on' : S.angle === 'wide' ? (set.k === 'in' ? 'as a wide shot of the whole room' : 'as a wide shot') : SC.ANGLE[S.angle].replace(/^a /, 'as a ')}, ${where}.`);
  // where and when
  let tod = SC_TIME[L.t];
  if (!tod && opt.t){ const h = new Date(typeof worldT === 'function' ? worldT(opt.t) : opt.t).getHours(); tod = h < 5 || h >= 21 ? 'night' : h < 11 ? 'morning' : h < 17 ? 'daytime' : 'evening'; }
  // the light's name was written for a room ("rain on the window"); outdoors it's just the weather
  const ln = set.k === 'out' ? L.n.replace(' on the window', '').replace(' outside', '').replace(' through the window', '') : L.n;
  parts.push(`Setting: ${set.n}${tod ? `, ${tod}` : ''} (${ln}).`);
  const surf = (typeof SC2_SURF !== 'undefined' && SC2_SURF[S.set]) || set.surf;
  const named = /table|desk|couch|bed\b|bench|bleachers|seat|floor|counter|carrel|steps|stairs|pew|tub|booth|sand|grass|dock|hammock/i.test(set.n);   // the setting already says what they're at
  if (SC_SURFW[surf] && !selfie && set.k !== 'veh' && !named) parts.push(`${S.angle === 'top' ? 'Looking down at' : 'Their things are on'} ${SC_SURFW[surf]}.`);
  const furn = [...new Set([...seen.f].map(k => SC_FURN[k]).filter(Boolean))];
  if (furn.length) parts.push(`In the background: ${scList(furn.slice(0, 5))}.`);
  if (seen.win && set.k === 'in' && SC_VIEW[set.win]) parts.push(`Out the window: ${SC_VIEW[set.win]}.`);
  if (seen.who) parts.push(seen.who === 1 ? 'One other person is in the shot.' : seen.who <= 3 ? `A few other people are around (${seen.who}).` : `Lots of other people are around (${seen.who}).`);
  // the person, for selfies
  if (selfie){
    const lk = S.look || {}, hand = SC.HAND[S.hand] && scHandOk(S.pose, S.hand) ? `, ${SC.HAND[S.hand]}` : '';
    const ex = SC.EXPR[S.expr] || ''; parts.push(/^with /.test(ex) ? `They're making a face ${ex}${hand}.` : `They're ${ex}${hand}.`);
    const top = typeof SC2_TOPS !== 'undefined' && SC2_TOPS[lk.top] ? SC2_TOPS[lk.top].toLowerCase() : lk.hood ? 'hoodie' : 'shirt';
    const print = lk.print === 'word' && lk.word ? ` that says "${lk.word}"` : lk.print === 'icon' ? ' with a little picture on it' : '';
    const pre = {short: 'short', long: 'long', curly: 'curly', spiky: 'spiky', buzz: 'buzzed'}[lk.style], post = {bun: ' in a bun', side: ' with a side part', afro: ' in an afro', bob: ' in a bob', pony: ' in a ponytail', braids: ' in braids', bangs: ' with curtain bangs'}[lk.style] || '';
    const hair = lk.style === 'hijab' ? 'a hijab' : lk.style === 'beanie' ? 'a beanie' : `${pre ? pre + ' ' : ''}${scHairWord(lk.hair)} hair${post}`;
    parts.push(`Wearing a ${SC_PRINT[lk.print] ? SC_PRINT[lk.print] + ' ' : ''}${top}${print}; ${hair}${lk.glasses ? ', glasses' : ''}.`);
  }
  // their things
  const pets = [], items = [];
  if (!SC_NOPROPS.includes(S.set)) [...seen.p].forEach(k => { const P = SC.PROP[k]; if (!P) return; (P.g === 'pet' ? pets : items).push(P.n); });
  if (items.length) parts.push(`Items in view: ${scList(items)}.`);
  if (pets.length) parts.push(`Pet: ${scList(pets)}.`);
  if (seen.s.size) parts.push(`Decoration: ${scList([...seen.s].map(k => SC.SEASON[k] && SC.SEASON[k].n).filter(Boolean))}.`);
  // words you can read in it
  if (S.cls && seen.note) parts.push(`A sticky note says "${S.cls}".`);
  const bk = typeof SC2_BOARDS !== 'undefined' && SC2_BOARDS[S.set], bw = Array.isArray(S.board) && S.board.length ? S.board : S.cls ? [S.cls] : null;
  if (bk && bw && !selfie) parts.push(`The ${bk} says "${bw.join(' / ')}".`);
  else if (S.cls && !selfie && (seen.f.has('whiteboard') || seen.f.has('chalkboard'))) parts.push(`The ${seen.f.has('whiteboard') ? 'whiteboard' : 'chalkboard'} says "${S.cls}".`);
  if (typeof sc2Extra === 'function') { const x = sc2Extra(S).trim(); if (x) parts.push(x); }
  return parts.join(' ');
};
