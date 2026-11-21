/* ---------- pictures for the Feed: layered scenes drawn as SVG ----------
   A picture is a spec (setting, lighting, angle, props, class details, season, and for people an expression, pose and
   hand gesture) drawn into a 300×300 SVG. Specs come from a seed, so a post always shows the same picture on every
   device and nothing is stored but the spec. sceneDesc() turns a spec into plain words, so the players writing captions
   and comments know what's in the picture. Every piece is original. */
const SC = {};
const scPick = (r, a) => a[Math.floor(r() * a.length)];
const scR = (r, a, b) => a + r() * (b - a);
const scH = (h, s, l, a) => `hsl(${Math.round(((h % 360) + 360) % 360)} ${s}% ${l}%${a != null ? ' / ' + a : ''})`;

/* ---- lighting and weather (20) ---- */
// t: when it fits (n night, d day, m morning, e evening); w: weather; sky/amb colors; lamp: whether lamps are on
SC.LIGHT = {
  lamp:     {n: 'late night with the desk lamp on', t: 'n', sky: ['#151a3a', '#26215c'], amb: '#1b1640', ao: .35, lamp: 1, fx: 'stars'},
  screen:   {n: 'pitch dark except the screen glow', t: 'n', sky: ['#07080f', '#11131f'], amb: '#05060c', ao: .55, lamp: 0, glow: 1},
  nightlit: {n: 'late at night with the room lights on', t: 'n', sky: ['#10142c', '#1e2346'], amb: '#2a2f52', ao: .1, lamp: 0, fx: 'stars'},
  clearnight: {n: 'a clear night, street lights on', t: 'n', sky: ['#0c1230', '#1f2650'], amb: '#141a3a', ao: .28, lamp: 0, fx: 'stars'},
  am3:      {n: '3 AM, everything dark and quiet', t: 'n', sky: ['#0b0d1c', '#1a1d36'], amb: '#0a0b18', ao: .5, lamp: 1, fx: 'stars'},
  bluehour: {n: 'blue hour right after sunset', t: 'e', sky: ['#2b3f7a', '#6d7fc2'], amb: '#24346b', ao: .25, lamp: 1},
  sunrise:  {n: 'sunrise', t: 'm', sky: ['#f6a96b', '#fbe1b0'], amb: '#f2a86a', ao: .12, lamp: 0, fx: 'sun'},
  morning:  {n: 'bright morning sun', t: 'm', sky: ['#8ccaf2', '#d8eefc'], amb: '#fff3d1', ao: .08, lamp: 0, fx: 'sun'},
  midday:   {n: 'clear midday', t: 'd', sky: ['#5fb3ee', '#bfe2fa'], amb: '#ffffff', ao: .04, lamp: 0},
  overcast: {n: 'a gray overcast day', t: 'd', sky: ['#9aa1ab', '#c9ccd2'], amb: '#9aa1ab', ao: .15, lamp: 0, fx: 'clouds'},
  golden:   {n: 'golden hour', t: 'e', sky: ['#f3b65f', '#f9dca0'], amb: '#f4b25c', ao: .14, lamp: 0, fx: 'sun'},
  sunset:   {n: 'sunset', t: 'e', sky: ['#d6577a', '#f6a96b'], amb: '#d9607a', ao: .16, lamp: 1, fx: 'sun'},
  rain:     {n: 'rain on the window', t: 'any', w: 'rain', sky: ['#59626e', '#8a929c'], amb: '#4c5562', ao: .22, lamp: 1, fx: 'rain'},
  storm:    {n: 'a thunderstorm', t: 'any', w: 'rain', sky: ['#2c3140', '#4b5263'], amb: '#252a37', ao: .32, lamp: 1, fx: 'storm'},
  snow:     {n: 'snow falling outside', t: 'any', w: 'snow', sky: ['#a9b7c8', '#dfe7f0'], amb: '#c5d3e3', ao: .12, lamp: 1, fx: 'snow'},
  hail:     {n: 'hail coming down', t: 'any', w: 'snow', sky: ['#7d8794', '#aeb6c0'], amb: '#7d8794', ao: .2, lamp: 1, fx: 'hail'},
  fog:      {n: 'thick fog', t: 'm', sky: ['#c7ccd1', '#e6e8ea'], amb: '#d9dcdf', ao: .3, lamp: 0, fx: 'fog'},
  aurora:   {n: 'northern lights in the night sky', t: 'n', sky: ['#081a24', '#0f2f3a'], amb: '#0b2530', ao: .35, lamp: 1, fx: 'aurora'},
  heat:     {n: 'a hot hazy afternoon', t: 'd', w: 'hot', sky: ['#f2c879', '#fbe7b5'], amb: '#f6c56c', ao: .12, lamp: 0, fx: 'haze'},
  outage:   {n: 'a power outage, studying by candlelight', t: 'n', sky: ['#0c0d16', '#181a2a'], amb: '#120d08', ao: .55, lamp: 0, candle: 1},
  neon:     {n: 'a neon sign glowing through the window', t: 'n', sky: ['#1a0f2e', '#2c1550'], amb: '#3a1460', ao: .3, lamp: 0, fx: 'neon'},
  string:   {n: 'string lights on', t: 'e', sky: ['#1b2141', '#34306a'], amb: '#2a2350', ao: .28, lamp: 0, fx: 'string'}
};
SC.LIGHT_KEYS = Object.keys(SC.LIGHT);

/* ---- seasons and holidays (12): a decoration plus when it fits (months, 0 = Jan) ---- */
SC.SEASON = {
  halloween: {n: 'a little pumpkin for Halloween', mo: [9]},
  thanks:    {n: 'Thanksgiving leftovers', mo: [10]},
  winter:    {n: 'winter holiday lights', mo: [11, 0]},
  boots:     {n: 'snow boots drying by the door', mo: [11, 0, 1, 2]},
  valentine: {n: 'a heart box of chocolates', mo: [1]},
  blossom:   {n: 'a branch of spring blossoms', mo: [2, 3]},
  finals:    {n: 'finals-week chaos: paper everywhere', mo: [3, 4, 11]},
  movein:    {n: 'move-in boxes still not unpacked', mo: [7, 8, 0]},
  grad:      {n: 'a graduation cap on the books', mo: [4, 5]},
  fan:       {n: 'a desk fan for the heat', mo: [5, 6, 7]},
  lunar:     {n: 'red paper lanterns for Lunar New Year', mo: [0, 1]},
  gameday:   {n: 'a game-day foam finger', mo: [8, 9, 10]}
};

/* ---- settings (80): data recipes built from shared pieces ----
   k: in (indoors), out (outdoors), veh (vehicle); wall; win: what the window shows; surf: what things sit on;
   dec: furniture in the background; tag: who'd post it (all, lab, art, music, ath, ag, med, cs) */
const ST = (n, k, wall, win, surf, dec, tag = 'all') => ({n, k, wall, win, surf, dec, tag});
SC.SETTING = {
  dorm:        ST('a dorm room', 'in', 'paint', 'campus', 'desk', ['shelf', 'poster', 'bed']),
  dorm2:       ST('a cramped double dorm', 'in', 'paint', 'campus', 'desk', ['bunk', 'poster', 'clock']),
  apt:         ST('an apartment bedroom', 'in', 'paint', 'street', 'desk', ['plant', 'shelf', 'frame']),
  kitchen:     ST('the kitchen table', 'in', 'tile', 'trees', 'table', ['cabinets', 'fridge']),
  parents:     ST("their parents' kitchen", 'in', 'tile', 'trees', 'counter', ['cabinets', 'frame', 'clock']),
  livingroom:  ST('the living room couch', 'in', 'paint', 'street', 'couch', ['plant', 'frame', 'lampFloor']),
  bed:         ST('their bed', 'in', 'paint', 'campus', 'bed', ['poster', 'shelf']),
  floor:       ST('the floor of their room', 'in', 'paint', 'campus', 'floor', ['bed', 'poster']),
  library:     ST('the library', 'in', 'wood', 'none', 'table', ['stacks', 'lampGreen']),
  library2:    ST('a quiet library corner', 'in', 'wood', 'trees', 'table', ['stacks', 'clock']),
  stacks:      ST('deep in the library stacks', 'in', 'wood', 'none', 'floor', ['stacks', 'stacks2']),
  carrel:      ST('a library study carrel', 'in', 'wood', 'none', 'desk', ['shelf', 'lampFloor']),
  studyroom:   ST('a study room with a whiteboard', 'in', 'paint', 'none', 'table', ['whiteboard', 'clock']),
  lecture:     ST('the back row of a lecture hall', 'in', 'concrete', 'none', 'desk', ['seats', 'projector']),
  classroom:   ST('an empty classroom', 'in', 'paint', 'campus', 'desk', ['chalkboard', 'clock']),
  lab:         ST('a chem lab', 'in', 'tile', 'none', 'lab', ['labshelf', 'hood'], 'lab'),
  biolab:      ST('a bio lab', 'in', 'tile', 'none', 'lab', ['labshelf', 'microscope'], 'lab'),
  complab:     ST('a computer lab', 'in', 'paint', 'none', 'desk', ['monitors', 'clock'], 'cs'),
  makerspace:  ST('the makerspace', 'in', 'concrete', 'none', 'bench', ['pegboard', 'printer3d'], 'lab'),
  artstudio:   ST('an art studio', 'in', 'concrete', 'trees', 'table', ['easel', 'canvases'], 'art'),
  music:       ST('a music practice room', 'in', 'wood', 'none', 'piano', ['stand', 'poster'], 'music'),
  cafe:        ST('a cafe window seat', 'in', 'brick', 'street', 'table', ['menu', 'hanging']),
  cafe2:       ST('a busy coffee shop', 'in', 'wood', 'street', 'table', ['menu', 'counterCafe']),
  diner:       ST('a 24-hour diner booth', 'in', 'tile', 'street', 'booth', ['neonSign', 'counterCafe']),
  dining:      ST('the dining hall', 'in', 'paint', 'campus', 'table', ['trays', 'clock']),
  union:       ST('the student union', 'in', 'concrete', 'campus', 'table', ['banners', 'plant']),
  laundromat:  ST('the laundromat', 'in', 'tile', 'street', 'bench', ['washers']),
  gym:         ST('the gym lobby', 'in', 'concrete', 'campus', 'bench', ['lockers', 'banners'], 'ath'),
  lockerroom:  ST('the locker room', 'in', 'tile', 'none', 'bench', ['lockers'], 'ath'),
  hospital:    ST('a hospital break room', 'in', 'tile', 'street', 'table', ['cabinets', 'clock'], 'med'),
  clinic:      ST('a clinic waiting room', 'in', 'paint', 'street', 'chairs', ['frame', 'plant'], 'med'),
  office:      ST('a TA office', 'in', 'paint', 'campus', 'desk', ['shelf', 'whiteboard']),
  officehrs:   ST('office hours, waiting outside', 'in', 'paint', 'none', 'chairs', ['door', 'banners']),
  hallway:     ST('a hallway bench', 'in', 'paint', 'none', 'bench', ['lockers', 'door']),
  stairwell:   ST('a stairwell', 'in', 'concrete', 'none', 'stairs', ['rail']),
  basement:    ST('a basement study lounge', 'in', 'brick', 'none', 'couch', ['vending', 'poster']),
  attic:       ST('an attic room', 'in', 'wood', 'sky', 'desk', ['beams', 'plant']),
  greenhouse:  ST('the campus greenhouse', 'in', 'glass', 'trees', 'bench', ['plants'], 'ag'),
  barnoffice:  ST('a barn office', 'in', 'wood', 'field', 'desk', ['hay', 'frame'], 'ag'),
  hotel:       ST('a hotel desk', 'in', 'paint', 'city', 'desk', ['lampFloor', 'frame']),
  airport:     ST('an airport gate', 'in', 'glass', 'airport', 'chairs', ['board']),
  train:       ST('a train seat', 'veh', 'train', 'field', 'tray', []),
  bus:         ST('a bus seat', 'veh', 'train', 'street', 'lap', []),
  plane:       ST('a plane seat', 'veh', 'plane', 'clouds', 'tray', []),
  car:         ST('their parked car', 'veh', 'car', 'parking', 'lap', []),
  gascar:      ST('their car at a gas station', 'veh', 'car', 'gas', 'lap', []),
  bookstore:   ST('a bookstore cafe', 'in', 'wood', 'street', 'table', ['stacks', 'hanging']),
  rooftop:     ST('a rooftop', 'out', 'none', 'city', 'bench', ['railing']),
  balcony:     ST('their balcony', 'out', 'none', 'city', 'table', ['railing', 'plant']),
  porch:       ST('the porch', 'out', 'none', 'trees', 'table', ['stringPorch', 'railing']),
  quad:        ST('the quad', 'out', 'none', 'campus', 'grass', ['trees', 'tower']),
  bench:       ST('a campus bench', 'out', 'none', 'campus', 'bench', ['trees', 'lamppost']),
  park:        ST('a park', 'out', 'none', 'trees', 'grass', ['trees', 'path']),
  lake:        ST('a dock by a lake', 'out', 'none', 'lake', 'dock', ['trees']),
  beach:       ST('the beach', 'out', 'none', 'sea', 'sand', ['umbrella']),
  hammock:     ST('a hammock between two trees', 'out', 'none', 'trees', 'hammock', ['trees']),
  stadium:     ST('the empty stadium bleachers', 'out', 'none', 'stadium', 'bleachers', []),
  courtyard:   ST('a courtyard', 'out', 'none', 'campus', 'table', ['fountain', 'trees']),
  bikerack:    ST('next to the bike rack', 'out', 'none', 'campus', 'steps', ['bikes']),
  steps:       ST('the library steps', 'out', 'none', 'campus', 'steps', ['columns']),
  farm:        ST('the edge of a field', 'out', 'none', 'field', 'grass', ['fence'], 'ag'),
  garden:      ST('the campus garden', 'out', 'none', 'trees', 'bench', ['flowers'], 'ag'),
  trail:       ST('a trail overlook', 'out', 'none', 'mountains', 'rock', []),
  busstop:     ST('a bus stop', 'out', 'none', 'street', 'bench', ['shelter']),
  parkinglot:  ST('the top of a parking garage', 'out', 'none', 'city', 'ledge', []),
  tent:        ST('a tent', 'in', 'tent', 'trees', 'floor', ['lantern']),
  treehouse:   ST('a treehouse', 'in', 'wood', 'trees', 'floor', ['frame']),
  bathtub:     ST('an empty bathtub (it’s quiet)', 'in', 'tile', 'none', 'tub', []),
  closet:      ST('a closet turned study nook', 'in', 'paint', 'none', 'desk', ['clothes']),
  hostelbunk:  ST('a hostel bunk', 'in', 'paint', 'street', 'bed', ['bunk']),
  frat:        ST('a quiet corner at a house party', 'in', 'paint', 'street', 'couch', ['partyLights']),
  chapel:      ST('a campus chapel pew', 'in', 'stone', 'stained', 'pew', []),
  museum:      ST('a museum bench', 'in', 'paint', 'none', 'bench', ['paintings']),
  planetarium: ST('outside the planetarium', 'out', 'none', 'stars', 'bench', ['dome']),
  observatory: ST('the observatory deck', 'out', 'none', 'stars', 'ledge', ['telescope']),
  ferry:       ST('a ferry deck', 'veh', 'none', 'sea', 'bench', ['railing']),
  waitingrm:   ST('the DMV waiting room', 'in', 'paint', 'none', 'chairs', ['board', 'clock']),
  pool:        ST('the pool bleachers', 'in', 'tile', 'pool', 'bleachers', [], 'ath'),
  icearena:    ST('the ice rink stands', 'in', 'concrete', 'ice', 'bleachers', [], 'ath'),
  bowling:     ST('a bowling alley booth', 'in', 'wood', 'lanes', 'booth', ['neonSign']),
  arcade:      ST('a closed arcade', 'in', 'concrete', 'none', 'floor', ['arcadeMachines', 'neonSign'])
};
SC.SETTING_KEYS = Object.keys(SC.SETTING);

/* ---- camera angles (7) ---- */
SC.ANGLE = {front: 'straight on', top: 'from above', close: 'a close-up', shoulder: 'over the shoulder', wide: 'a wide shot of the whole room', selfie: 'a selfie'};
SC.ANGLE_KEYS = Object.keys(SC.ANGLE);

/* ---- people: expressions (24), poses (16), hand gestures (18) ---- */
SC.EXPR = {smile: 'smiling', smirk: 'smirking', laugh: 'laughing', proud: 'looking proud', grin: 'grinning', soft: 'with a soft smile',
  sleepy: 'half-asleep', yawn: 'mid-yawn', dead: 'with a dead-eyed stare', melt: 'melting', headdesk: 'face down on the desk',
  panic: 'panicking', fakecry: 'fake-crying', grimace: 'grimacing', fine: 'doing a "this is fine" smile', sweat: 'sweating nervously',
  locked: 'locked in', squint: 'squinting at their notes', pen: 'with a pen in their mouth', think: 'thinking hard',
  tongue: 'sticking their tongue out', wink: 'winking', duck: 'doing a duck face', side: 'giving the side-eye'};
SC.POSE = {arm: "from arm's length", high: 'from a high angle', low: 'from a low angle', mirror: 'in a mirror', bedtop: 'lying in bed, from above', half: 'with half their face accidentally cut off',
  books: 'leaning on a stack of books', chin: 'with their chin on their hand', slump: 'slumped over the laptop', stretch: 'stretching', blanket: 'wrapped in a blanket', cross: 'sitting cross-legged on the floor',
  friend: 'with a friend squeezing into the frame', petarms: 'holding their pet', petbomb: 'while their pet photobombs', point: 'pointing back at the view'};
SC.HAND = {none: '', peace: 'throwing a peace sign', thumbup: 'giving a thumbs up', thumbdown: 'giving a thumbs down', guns: 'doing finger guns', ok: 'making an OK sign', wave: 'waving',
  facepalm: 'facepalming', mouth: 'with a hand over their mouth', cheeks: 'with both hands on their cheeks', shrug: 'shrugging', pray: 'with praying hands', flex: 'flexing',
  coffee: 'raising a coffee', pentwirl: 'twirling a pen', cards: 'fanning out flashcards', test: 'holding up a test (score covered)', energy: 'holding an energy drink', help: 'holding a "send help" sign'};
// two hands per person: poses that already use some (holding the phone, stretching, chin on hands, a pet) leave fewer for a gesture
SC.POSE_HANDS = {arm: 1, high: 1, low: 1, half: 1, bedtop: 1, mirror: 1, point: 1, chin: 2, stretch: 2, petarms: 2};
SC.HAND_NEED = {none: 0, cheeks: 2, shrug: 2, pray: 2, help: 2};
const scHandOk = (pose, hand) => (SC.HAND_NEED[hand] ?? 1) <= 2 - (SC.POSE_HANDS[pose] || 0);
SC.EXPR_KEYS = Object.keys(SC.EXPR); SC.POSE_KEYS = Object.keys(SC.POSE); SC.HAND_KEYS = Object.keys(SC.HAND);

/* ---- props (85): drawn in a local box, (0,0) at bottom-left, y going up as negative. c = palette ----
   n: how it's described; w,h: size; g: group (study, tech, food, drink, decor, pet, music, med, lab, art, sport, misc);
   top: a top-down version for flat lays (optional) */
const PR = (n, w, h, g, d, top) => ({n, w, h, g, d, top});
const rc = (x, y, w, h, f, rx = 2, ex = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${ex}/>`;
const ci = (x, y, r, f, ex = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${ex}/>`;
const pa = (d, f, ex = '') => `<path d="${d}" fill="${f}"${ex}/>`;
const ln = (x1, y1, x2, y2, s, w = 2, ex = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" stroke-linecap="round"${ex}/>`;
const tx = (x, y, t, sz, f, ex = '') => `<text x="${x}" y="${y}" font-size="${sz}" fill="${f}" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600" text-anchor="middle"${ex}>${t}</text>`;
const steam = (x, y) => `<path d="M${x} ${y} q4 -7 0 -13 M${x + 8} ${y} q4 -7 0 -13" fill="none" stroke="#fff" stroke-width="2" opacity=".45"/>`;
SC.PROP = {
  mug:        PR('a mug of coffee', 30, 30, 'drink', c => rc(0, -28, 22, 28, c.a2, 4) + pa('M22 -22 q10 0 10 8 q0 8 -10 8', 'none', ` stroke="${c.a2}" stroke-width="4"`) + steam(5, -32), c => ci(16, 16, 16, '#f1efe8') + ci(16, 16, 12, '#6b3a1e')),
  latte:      PR('an iced latte', 22, 42, 'drink', c => pa('M0 -40 L22 -40 L19 0 L3 0z', '#e9dcc8', ' opacity=".9"') + rc(2, -30, 18, 22, '#b08463', 1) + ln(14, -50, 11, -38, c.a1, 3)),
  boba:       PR('a boba tea', 22, 46, 'drink', c => pa('M0 -40 L22 -40 L19 0 L3 0z', '#e8c9a8') + [4, 9, 14, 8, 13].map((x, k) => ci(x + 2, -5 - (k % 2) * 5, 2.3, '#3b2416')).join('') + ln(13, -54, 11, -38, '#2c2c2a', 4)),
  matcha:     PR('a matcha latte', 26, 26, 'drink', c => rc(0, -24, 26, 24, '#f1efe8', 6) + rc(3, -22, 20, 8, '#8fbf6a', 3)),
  energy:     PR('an energy drink', 14, 34, 'drink', c => rc(0, -34, 14, 34, c.a1, 3) + rc(0, -26, 14, 10, '#111', 1) + tx(7, -18, 'ZAP', 6, '#fff')),
  energy3:    PR('a stack of empty energy drink cans', 44, 34, 'drink', c => [0, 15, 30].map((x, k) => rc(x, -34, 14, 34, k % 2 ? c.a1 : c.a2, 3)).join('')),
  water:      PR('a water bottle', 16, 46, 'drink', c => rc(0, -40, 16, 40, c.a3, 5) + rc(3, -46, 10, 7, '#2c2c2a', 2), c => ci(10, 10, 9, c.a3) + ci(10, 10, 5, '#2c2c2a')),
  tea:        PR('a cup of tea', 30, 24, 'drink', c => pa('M0 -22 h24 v10 q0 12 -12 12 q-12 0 -12 -12z', '#f1efe8') + ln(15, -18, 26, -34, '#c9a26a', 1.5) + rc(24, -38, 6, 6, '#c9a26a', 1)),
  soda:       PR('a soda can', 14, 26, 'drink', c => rc(0, -26, 14, 26, '#d03a3a', 3) + ln(2, -14, 12, -14, '#fff', 2)),
  ramen:      PR('a cup of instant ramen', 30, 30, 'food', c => pa('M0 -26 h30 l-4 26 h-22z', '#f4f1ea') + rc(0, -30, 30, 6, '#d24a3a', 2) + ln(9, -26, 22, -46, '#c9a26a', 2) + ln(13, -26, 26, -46, '#c9a26a', 2), c => ci(16, 16, 15, '#f4f1ea') + ci(16, 16, 11, '#e7c27a')),
  pizza:      PR('a slice of pizza', 34, 18, 'food', c => pa('M0 0 L34 0 L17 -18z', '#f2c14e') + ci(12, -5, 3, '#c0392b') + ci(20, -7, 3, '#c0392b') + ln(0, 0, 34, 0, '#c98b3c', 4), c => pa('M0 30 L30 30 L15 0z', '#f2c14e') + ci(12, 22, 3, '#c0392b')),
  takeout:    PR('takeout boxes', 34, 30, 'food', c => pa('M2 -24 h30 l-3 24 h-24z', '#f4f1ea') + pa('M2 -24 l6 -6 h18 l6 6z', '#e8e3d8') + rc(14, -18, 6, 6, '#c0392b', 1)),
  snacks:     PR('a bag of chips', 28, 32, 'food', c => pa('M2 -30 h24 l2 30 h-28z', c.a1) + rc(6, -22, 16, 10, '#fff', 3) + tx(14, -14, 'chips', 6, c.a1)),
  cookies:    PR('a plate of cookies', 36, 14, 'food', c => rc(0, -4, 36, 4, '#f1efe8', 2) + [6, 18, 30].map(x => ci(x, -8, 6, '#c08a4a') + ci(x - 1, -9, 1.2, '#3b2416')).join(''), c => ci(20, 20, 18, '#f1efe8') + [12, 24, 18].map((x, k) => ci(x, 14 + k * 6, 6, '#c08a4a')).join('')),
  donut:      PR('a donut', 26, 12, 'food', c => pa('M0 0 q0 -12 13 -12 q13 0 13 12z', '#f4a3c4') + ci(13, -2, 3, '#e3c08f'), c => ci(14, 14, 13, '#f4a3c4') + ci(14, 14, 4, '#c08a4a')),
  sandwich:   PR('half a sandwich', 30, 18, 'food', c => pa('M0 0 L30 0 L0 -18z', '#e8c27a') + pa('M2 -2 L26 -2 L2 -14z', '#7cb342')),
  fruit:      PR('an apple', 18, 18, 'food', c => ci(9, -9, 9, '#c0392b') + ln(9, -18, 11, -23, '#5d3b25', 2), c => ci(10, 10, 9, '#c0392b')),
  banana:     PR('a banana', 30, 12, 'food', c => pa('M0 -10 q15 14 30 0 q-15 6 -30 0z', '#f2d14e')),
  candy:      PR('a pile of candy', 30, 10, 'food', c => [3, 10, 17, 24, 13].map((x, k) => ci(x + 2, -4 - (k === 4) * 6, 4, [c.a1, c.a2, '#f2d14e', c.a3, '#e57373'][k])).join('')),
  cereal:     PR('a bowl of cereal', 32, 16, 'food', c => pa('M0 -14 h32 q0 14 -16 14 q-16 0 -16 -14z', '#f1efe8') + [6, 12, 18, 24].map(x => ci(x + 2, -15, 2.5, '#e8b04a')).join('')),
  notebook:   PR('an open notebook', 50, 12, 'study', c => pa('M0 0 L24 -4 L24 -12 L0 -8z', '#f1efe8') + pa('M26 -4 L50 0 L50 -8 L26 -12z', '#f1efe8') + ln(25, -4, 25, -12, '#b4b2a9', 1.5), c => rc(0, 0, 60, 40, '#f1efe8', 2) + ln(30, 0, 30, 40, '#b4b2a9', 1.5) + [8, 14, 20, 26].map(y => ln(5, y, 26, y, '#9db0d6', 1) + ln(34, y, 55, y, '#9db0d6', 1)).join('')),
  notes:      PR('a stack of notes', 36, 10, 'study', c => [0, 3, 6].map(y => rc(y, -4 - y, 32, 4, '#f4f1ea', 1, ' stroke="#ddd" stroke-width=".5"')).join(''), c => rc(0, 0, 34, 44, '#f4f1ea', 1) + [8, 14, 20, 26, 32].map(y => ln(5, y, 29, y, '#888', 1)).join('')),
  textbook:   PR('a thick textbook', 40, 14, 'study', c => rc(0, -14, 40, 14, c.a2, 2) + rc(2, -12, 38, 3, '#f1efe8', 1), c => rc(0, 0, 44, 56, c.a2, 3) + rc(6, 10, 32, 8, '#f1efe8', 2)),
  books:      PR('a stack of books', 40, 30, 'study', c => rc(2, -10, 36, 10, c.a1, 2) + rc(0, -20, 38, 10, c.a2, 2) + rc(4, -30, 32, 10, c.a3, 2)),
  bookopen:   PR('an open book', 44, 14, 'study', c => pa('M0 0 q11 -8 22 -2 q11 -6 22 2 v-10 q-11 -8 -22 -2 q-11 -6 -22 2z', '#f6f3ec')),
  flashcards: PR('a stack of flashcards', 34, 14, 'study', c => [0, 4, 8].map(k => rc(k, -10 - k, 26, 10, k === 8 ? '#fff' : '#f4f1ea', 1, ' stroke="#ccc" stroke-width=".5"')).join(''), c => [0, 1, 2].map(k => rc(4 + k * 6, 4 + k * 5, 34, 22, '#fff', 2, ` stroke="#ccc" stroke-width=".6" transform="rotate(${k * 8 - 8} 20 15)"`)).join('')),
  highlighters: PR('highlighters', 30, 26, 'study', c => ['#f2e14e', '#f48fb1', '#81d4fa', '#a5d6a7'].map((f, k) => rc(k * 8, -26 + k, 6, 26 - k, f, 2)).join(''), c => ['#f2e14e', '#f48fb1', '#81d4fa'].map((f, k) => rc(2, 4 + k * 9, 36, 6, f, 3)).join('')),
  pens:       PR('a cup of pens', 20, 36, 'study', c => rc(0, -20, 20, 20, c.a3, 3) + ln(5, -20, 3, -34, '#2c2c2a', 2) + ln(10, -20, 11, -36, '#c0392b', 2) + ln(15, -20, 18, -32, '#1d4ed8', 2)),
  pencil:     PR('a pencil', 36, 6, 'study', c => rc(0, -5, 30, 5, '#f2c14e', 1) + pa('M30 -5 l6 2.5 l-6 2.5z', '#e8d29a'), c => rc(2, 2, 36, 5, '#f2c14e', 1)),
  sticky:     PR('sticky notes', 22, 22, 'study', c => rc(0, -22, 22, 22, '#f9e27a', 1), c => rc(0, 0, 22, 22, '#f9e27a', 1)),
  planner:    PR('a planner', 34, 8, 'study', c => rc(0, -8, 34, 8, c.a1, 2) + rc(30, -10, 4, 12, '#f2c14e', 1), c => rc(0, 0, 40, 50, '#f4f1ea', 2) + [0, 1, 2, 3].map(k => rc(4, 6 + k * 11, 32, 8, k % 2 ? '#e6eefc' : '#fdf3d7', 1)).join('')),
  calculator: PR('a graphing calculator', 18, 34, 'study', c => rc(0, -34, 18, 34, '#3a3a3a', 3) + rc(3, -31, 12, 9, '#b5c7a0', 1) + [0, 1, 2].map(r => [0, 1, 2].map(k => rc(3 + k * 4.5, -19 + r * 5, 3, 3, '#888', 1)).join('')).join(''), c => rc(0, 0, 22, 40, '#3a3a3a', 3) + rc(3, 3, 16, 11, '#b5c7a0', 1)),
  ruler:      PR('a ruler', 40, 5, 'study', c => rc(0, -5, 40, 5, '#e8d29a', 1), c => rc(0, 0, 50, 7, '#e8d29a', 1)),
  binder:     PR('a binder', 30, 34, 'study', c => rc(0, -34, 30, 34, c.a2, 2) + [8, 17, 26].map(y => ci(4, -y, 2, '#ccc')).join('')),
  pset:       PR('a problem set covered in work', 34, 6, 'study', c => rc(0, -6, 34, 6, '#fff', 1), c => rc(0, 0, 40, 52, '#fff', 1) + [8, 14, 20, 30, 36, 42].map((y, k) => ln(5, y, 20 + (k % 3) * 8, y, '#333', 1)).join('') + ci(30, 10, 5, 'none', ' stroke="#c0392b" stroke-width="1.5"')),
  laptop:     PR('a laptop', 56, 40, 'tech', c => pa('M6 -40 h44 v34 h-44z', '#2c2c2a') + rc(9, -37, 38, 28, c.scr, 1) + pa('M0 0 L56 0 L50 -6 L6 -6z', '#4a4a4a'), c => rc(0, 0, 70, 46, '#4a4a4a', 3) + rc(4, 4, 62, 30, '#3a3a3a', 2) + [0, 1, 2].map(r => rc(8, 6 + r * 8, 54, 5, '#5a5a5a', 1)).join('')),
  laptopcode: PR('a laptop full of code', 56, 40, 'tech', c => pa('M6 -40 h44 v34 h-44z', '#2c2c2a') + rc(9, -37, 38, 28, '#1e1e2e', 1) + [0, 1, 2, 3, 4].map(k => ln(12 + (k % 2) * 4, -33 + k * 5, 24 + ((k * 7) % 16), -33 + k * 5, ['#89b4fa', '#a6e3a1', '#f9e2af', '#f38ba8', '#cba6f7'][k], 1.6)).join('') + pa('M0 0 L56 0 L50 -6 L6 -6z', '#4a4a4a')),
  tablet:     PR('a tablet with handwritten notes', 30, 40, 'tech', c => rc(0, -40, 30, 40, '#2c2c2a', 3) + rc(2, -38, 26, 36, '#fff', 1) + [0, 1, 2, 3].map(k => pa(`M5 ${-32 + k * 7} q4 -3 8 0 t9 0`, 'none', ' stroke="#1d4ed8" stroke-width="1.2"')).join(''), c => rc(0, 0, 40, 54, '#2c2c2a', 4) + rc(3, 3, 34, 48, '#fff', 1)),
  phone:      PR('their phone', 14, 26, 'tech', c => rc(0, -26, 14, 26, '#1f1f1f', 3) + rc(1.5, -24.5, 11, 23, c.scr, 2), c => rc(0, 0, 16, 30, '#1f1f1f', 3) + rc(2, 2, 12, 26, c.scr, 2)),
  monitor:    PR('a second monitor', 60, 46, 'tech', c => rc(0, -46, 60, 36, '#2c2c2a', 2) + rc(3, -43, 54, 30, c.scr, 1) + rc(26, -10, 8, 8, '#4a4a4a', 0) + rc(16, -3, 28, 3, '#4a4a4a', 1)),
  headphones: PR('headphones', 30, 26, 'tech', c => pa('M3 -6 q0 -22 12 -22 q12 0 12 22', 'none', ` stroke="${c.a1}" stroke-width="3"`) + rc(0, -12, 7, 12, c.a1, 3) + rc(23, -12, 7, 12, c.a1, 3), c => pa('M6 20 q14 -22 28 0', 'none', ` stroke="${c.a1}" stroke-width="4"`) + ci(6, 22, 6, c.a1) + ci(34, 22, 6, c.a1)),
  earbuds:    PR('an earbuds case', 14, 10, 'tech', c => rc(0, -10, 14, 10, '#f4f4f4', 5), c => rc(0, 0, 14, 12, '#f4f4f4', 5)),
  keyboard:   PR('a mechanical keyboard', 54, 10, 'tech', c => rc(0, -10, 54, 10, '#3a3a3a', 2) + [0, 1, 2, 3, 4, 5, 6, 7].map(k => rc(3 + k * 6.3, -8, 5, 4, k === 3 ? c.a1 : '#d6d6d6', 1)).join(''), c => rc(0, 0, 64, 22, '#3a3a3a', 2) + [0, 1, 2].map(r => [...Array(9)].map((_, k) => rc(3 + k * 6.6, 3 + r * 6, 5, 4.5, (r + k) % 7 ? '#d6d6d6' : c.a1, 1)).join('')).join('')),
  mouse:      PR('a mouse', 14, 8, 'tech', c => pa('M0 0 q0 -8 7 -8 q7 0 7 8z', '#4a4a4a'), c => rc(0, 0, 12, 18, '#4a4a4a', 6)),
  charger:    PR('a tangled charger cable', 30, 8, 'tech', c => pa('M0 -2 q6 -8 12 0 t12 0 t6 -4', 'none', ' stroke="#f4f4f4" stroke-width="2"') + rc(28, -9, 6, 6, '#f4f4f4', 1)),
  controller: PR('a game controller (put away… mostly)', 30, 14, 'tech', c => pa('M2 -2 q-4 -12 8 -12 h10 q12 0 8 12 q-3 4 -8 0 h-10 q-5 4 -8 0z', '#3a3a3a') + ci(21, -8, 1.6, c.a1) + ci(8, -8, 1.6, '#ddd')),
  lamp:       PR('a desk lamp', 34, 56, 'decor', c => rc(0, -5, 20, 5, '#2c2c2a', 2) + ln(10, -4, 5, -30, '#2c2c2a', 3.5) + ln(5, -30, 20, -47, '#2c2c2a', 3.5) + ci(5, -30, 3, '#2c2c2a') + pa('M15 -50 h10 l7 15 h-24z', c.a1) + ci(20, -48, 2.6, '#2c2c2a')),
  plant:      PR('a little plant', 22, 34, 'decor', c => pa('M2 -14 h18 l-3 14 h-12z', '#c97b4a') + pa('M11 -14 q-12 -10 -6 -20 q8 4 6 20z M11 -14 q12 -12 6 -20 q-8 4 -6 20z M11 -14 q0 -14 0 -18', '#5aa469'), c => ci(12, 12, 11, '#c97b4a') + ci(12, 12, 9, '#5aa469')),
  succulent:  PR('a succulent', 18, 18, 'decor', c => rc(2, -8, 14, 8, '#e8dcc8', 2) + ci(9, -11, 6, '#7fb08a') + ci(5, -10, 3.5, '#9cc8a4') + ci(13, -10, 3.5, '#9cc8a4'), c => ci(10, 10, 9, '#e8dcc8') + ci(10, 10, 6, '#7fb08a')),
  cactus:     PR('a tiny cactus', 16, 28, 'decor', c => pa('M2 -10 h12 l-2 10 h-8z', '#c97b4a') + rc(5, -26, 6, 16, '#5aa469', 3) + rc(1, -21, 4, 7, '#5aa469', 2)),
  monstera:   PR('a monstera plant', 40, 54, 'decor', c => pa('M10 -14 h20 l-3 14 h-14z', '#e8dcc8') + pa('M20 -14 q-24 -16 -14 -38 q20 6 14 38z M20 -14 q24 -18 12 -40 q-18 8 -12 40z', '#2f8f5b')),
  candle:     PR('a candle', 14, 26, 'decor', c => rc(0, -16, 14, 16, '#f4ede0', 2) + ln(7, -16, 7, -20, '#2c2c2a', 1) + pa('M7 -28 q4 4 0 8 q-4 -4 0 -8z', '#f6b73c'), c => ci(10, 10, 9, '#f4ede0') + ci(10, 10, 3, '#f6b73c')),
  lavalamp:   PR('a lava lamp', 16, 40, 'decor', c => pa('M2 -6 L5 -34 h6 L14 -6z', c.a1, ' opacity=".7"') + ci(8, -16, 3, '#ffd166') + ci(9, -26, 2, '#ffd166') + rc(0, -6, 16, 6, '#c0c0c0', 1) + rc(4, -38, 8, 4, '#c0c0c0', 1)),
  clock:      PR('an alarm clock', 22, 22, 'decor', c => ci(11, -11, 10, '#f1efe8', ` stroke="${c.a2}" stroke-width="2"`) + ln(11, -11, 11, -17, '#333', 1.5) + ln(11, -11, 15, -9, '#333', 1.5)),
  photo:      PR('a polaroid', 20, 24, 'decor', c => rc(0, -24, 20, 24, '#fff', 1) + rc(2, -22, 16, 15, c.a3, 0), c => rc(0, 0, 22, 26, '#fff', 1, ' transform="rotate(-8 11 13)"') + rc(2, 2, 18, 16, c.a3, 0, ' transform="rotate(-8 11 13)"')),
  frame:      PR('a framed photo', 22, 26, 'decor', c => rc(0, -26, 22, 26, '#5d3b25', 2) + rc(3, -23, 16, 20, c.a3, 1)),
  figurine:   PR('a little figurine', 12, 22, 'decor', c => ci(6, -18, 4, c.a1) + rc(2, -14, 8, 14, c.a2, 3)),
  duck:       PR('a rubber duck', 18, 16, 'decor', c => ci(8, -6, 7, '#f6d743') + ci(13, -13, 4.5, '#f6d743') + pa('M17 -13 l5 1 l-5 2z', '#f08a24') + ci(14, -14, .9, '#222'), c => ci(10, 12, 8, '#f6d743') + ci(14, 6, 4.5, '#f6d743')),
  stressball: PR('a stress ball', 14, 14, 'decor', c => ci(7, -7, 7, c.a1), c => ci(8, 8, 7, c.a1)),
  crystal:    PR('a crystal', 12, 16, 'decor', c => pa('M6 -16 L12 -6 L9 0 H3 L0 -6z', '#c4b5fd')),
  vinyl:      PR('a record player', 44, 16, 'music', c => rc(0, -10, 44, 10, '#5d3b25', 2) + pa('M4 -10 h36 l-2 -4 h-32z', '#2c2c2a') + ln(36, -14, 28, -12, '#ccc', 1.5)),
  guitar:     PR('a guitar leaning on the wall', 22, 70, 'music', c => ci(11, -14, 11, '#c88a4a') + ci(11, -30, 8, '#c88a4a') + ci(11, -18, 3.5, '#2c2c2a') + rc(9, -70, 4, 40, '#5d3b25', 1)),
  headset:    PR('a music stand with sheet music', 30, 60, 'music', c => ln(15, 0, 15, -40, '#2c2c2a', 2) + rc(0, -58, 30, 20, '#2c2c2a', 1) + rc(2, -56, 26, 16, '#fff', 1) + [0, 1, 2].map(k => ln(4, -52 + k * 4, 26, -52 + k * 4, '#555', .7)).join('')),
  stetho:     PR('a stethoscope', 34, 14, 'med', c => pa('M2 -12 q6 14 16 2 q6 -8 14 -2', 'none', ' stroke="#2c2c2a" stroke-width="2"') + ci(30, -10, 4, '#b0b0b0'), c => pa('M4 4 q16 30 32 4', 'none', ' stroke="#2c2c2a" stroke-width="2"') + ci(36, 6, 5, '#b0b0b0')),
  medcards:   PR('drug flashcards', 30, 12, 'med', c => [0, 3].map(k => rc(k, -10 - k, 26, 10, '#e7f6ff', 1, ' stroke="#9ad" stroke-width=".5"')).join('') + tx(15, -6, 'Rx', 6, '#1d4ed8')),
  skeleton:   PR('a little anatomy model', 16, 34, 'med', c => ci(8, -30, 4.5, '#f1efe8') + rc(6, -25, 4, 14, '#f1efe8', 1) + ln(2, -20, 14, -20, '#f1efe8', 2) + ln(5, -11, 3, 0, '#f1efe8', 2) + ln(11, -11, 13, 0, '#f1efe8', 2)),
  goggles:    PR('lab goggles', 30, 12, 'lab', c => rc(0, -12, 30, 12, '#cde7f0', 5, ' stroke="#2c2c2a" stroke-width="1.5"') + ln(15, -12, 15, 0, '#2c2c2a', 1.5), c => rc(0, 0, 34, 14, '#cde7f0', 6, ' stroke="#2c2c2a" stroke-width="1.5"')),
  beaker:     PR('a beaker', 18, 26, 'lab', c => pa('M2 -26 h14 v4 l2 22 h-18 l2 -22z', '#e6f2f5', ' opacity=".9"') + pa('M1 -10 h16 l1 10 h-18z', c.a1, ' opacity=".7"')),
  flask:      PR('an Erlenmeyer flask', 22, 28, 'lab', c => pa('M8 -28 h6 v8 l8 20 h-22 l8 -20z', '#e6f2f5', ' opacity=".9"') + pa('M3 -8 h16 l3 8 h-22z', c.a3, ' opacity=".75"')),
  testtubes:  PR('a rack of test tubes', 30, 24, 'lab', c => rc(0, -10, 30, 4, '#5d3b25', 1) + [4, 12, 20].map((x, k) => rc(x, -24, 5, 22, '#e6f2f5', 2) + rc(x, -12, 5, 10, [c.a1, c.a2, c.a3][k], 2)).join('')),
  molkit:     PR('a molecule model kit', 30, 22, 'lab', c => ln(6, -6, 15, -16, '#888', 2) + ln(15, -16, 25, -6, '#888', 2) + ci(6, -6, 5, '#222') + ci(15, -16, 5, '#e53935') + ci(25, -6, 5, '#f4f4f4', ' stroke="#bbb"')),
  sketchbook: PR('a sketchbook', 40, 8, 'art', c => rc(0, -8, 40, 8, '#2c2c2a', 2), c => rc(0, 0, 48, 36, '#f6f3ec', 2) + pa('M8 26 q10 -18 20 -6 t14 -10', 'none', ' stroke="#555" stroke-width="1.5"')),
  paints:     PR('a watercolor palette', 34, 8, 'art', c => rc(0, -8, 34, 8, '#f4f4f4', 2) + ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5'].map((f, k) => ci(4 + k * 6.5, -4, 2.4, f)).join(''), c => rc(0, 0, 40, 18, '#f4f4f4', 3) + ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5'].map((f, k) => ci(5 + k * 7.5, 9, 3, f)).join('')),
  brushes:    PR('a jar of paintbrushes', 20, 36, 'art', c => rc(0, -18, 20, 18, '#cfe8f0', 3, ' opacity=".8"') + [4, 9, 14].map((x, k) => ln(x + 1, -18, x - 1 + k * 2, -36, '#c88a4a', 2)).join('')),
  dumbbell:   PR('a dumbbell', 34, 12, 'sport', c => rc(0, -12, 7, 12, '#3a3a3a', 2) + rc(27, -12, 7, 12, '#3a3a3a', 2) + rc(7, -8, 20, 4, '#9a9a9a', 1)),
  gymbag:     PR('a gym bag', 44, 24, 'sport', c => rc(0, -20, 44, 20, c.a2, 8) + pa('M12 -20 q10 -10 20 0', 'none', ' stroke="#2c2c2a" stroke-width="2"')),
  ball:       PR('a basketball', 22, 22, 'sport', c => ci(11, -11, 11, '#e07a2e') + ln(0, -11, 22, -11, '#5a2d10', 1) + ln(11, -22, 11, 0, '#5a2d10', 1)),
  skateboard: PR('a skateboard', 50, 10, 'sport', c => rc(0, -7, 50, 4, c.a1, 2) + ci(10, -2, 2.5, '#eee') + ci(40, -2, 2.5, '#eee')),
  cat:        PR('their cat', 34, 30, 'pet', c => pa('M2 0 q0 -18 14 -18 q12 0 14 18z', c.pet) + ci(26, -22, 8, c.pet) + pa('M20 -27 l2 -8 l4 6z M28 -29 l4 -6 l2 8z', c.pet) + ci(24, -22, 1, '#222') + ci(29, -22, 1, '#222') + pa('M2 -4 q-8 -6 -2 -14', 'none', ` stroke="${c.pet}" stroke-width="3"`), c => ci(18, 18, 13, c.pet) + ci(30, 10, 7, c.pet)),
  catsleep:   PR('their cat asleep on the notes', 36, 16, 'pet', c => pa('M0 0 q4 -16 18 -16 q14 0 18 16z', c.pet) + pa('M10 -6 q3 -2 6 0 M20 -6 q3 -2 6 0', 'none', ' stroke="#222" stroke-width="1"'), c => ci(20, 20, 16, c.pet) + pa('M8 28 q12 8 24 0', 'none', ` stroke="${c.pet}" stroke-width="5"`)),
  dog:        PR('their dog', 40, 34, 'pet', c => rc(2, -18, 30, 18, c.pet, 8) + ci(34, -24, 9, c.pet) + pa('M28 -30 q-4 6 -2 12 l4 -2z', '#000', ' opacity=".25"') + ci(37, -25, 1.2, '#222') + ci(42, -22, 2, '#222')),
  hamster:    PR('a hamster', 18, 12, 'pet', c => pa('M0 0 q0 -12 9 -12 q9 0 9 12z', '#e8b57a') + ci(13, -6, 1, '#222')),
  fishbowl:   PR('a fishbowl', 26, 24, 'pet', c => ci(13, -12, 12, '#cfe8f5', ' opacity=".8"') + pa('M10 -12 q4 -4 8 0 q-4 4 -8 0z M18 -12 l3 -3 v6z', '#f08a24')),
  tissues:    PR('a box of tissues', 26, 16, 'misc', c => rc(0, -12, 26, 12, '#a7c7e7', 2) + pa('M10 -12 q3 -8 6 0', '#fff')),
  pills:      PR('a vitamin bottle', 12, 18, 'misc', c => rc(0, -14, 12, 14, '#f08a24', 2) + rc(1, -18, 10, 4, '#fff', 1)),
  keys:       PR('their keys', 20, 10, 'misc', c => ci(5, -5, 4, 'none', ' stroke="#b0b0b0" stroke-width="1.5"') + rc(8, -6, 12, 3, '#c9a26a', 1)),
  glasses:    PR('a pair of glasses', 30, 10, 'misc', c => ci(7, -5, 6, 'none', ' stroke="#2c2c2a" stroke-width="2"') + ci(23, -5, 6, 'none', ' stroke="#2c2c2a" stroke-width="2"') + ln(13, -5, 17, -5, '#2c2c2a', 2), c => ci(10, 10, 7, 'none', ' stroke="#2c2c2a" stroke-width="2"') + ci(28, 10, 7, 'none', ' stroke="#2c2c2a" stroke-width="2"')),
  idcard:     PR('their student ID', 24, 6, 'misc', c => rc(0, -6, 24, 6, '#f4f4f4', 1), c => rc(0, 0, 30, 19, '#f4f4f4', 2) + rc(3, 3, 9, 12, c.a1, 1)),
  wallet:     PR('a wallet', 24, 6, 'misc', c => rc(0, -6, 24, 6, '#5d3b25', 2), c => rc(0, 0, 28, 20, '#5d3b25', 3)),
  umbrella:   PR('a wet umbrella', 12, 44, 'misc', c => pa('M6 -44 l6 30 h-12z', c.a2) + ln(6, -14, 6, 0, '#2c2c2a', 2)),
  tote:       PR('a tote bag', 30, 32, 'misc', c => rc(0, -24, 30, 24, '#e8dcc8', 3) + pa('M8 -24 q7 -12 14 0', 'none', ' stroke="#e8dcc8" stroke-width="2"') + ci(15, -12, 5, c.a1)),
  backpack:   PR('a backpack', 32, 40, 'misc', c => rc(0, -36, 32, 36, c.a2, 9) + rc(6, -20, 20, 14, '#000', 4, ' opacity=".18"'))
};
SC.PROP_KEYS = Object.keys(SC.PROP);
// which props suit which setting tags (pets stay out of libraries, lab gear goes to lab people, …)
SC.PROP_BAN = {library: ['cat', 'catsleep', 'dog', 'hamster', 'fishbowl', 'pizza', 'ramen', 'takeout', 'energy3'], library2: ['cat', 'catsleep', 'dog', 'hamster', 'fishbowl'], stacks: ['cat', 'catsleep', 'dog', 'hamster', 'fishbowl', 'mug'], lecture: ['cat', 'catsleep', 'dog', 'hamster', 'fishbowl', 'lavalamp', 'monstera', 'guitar'], lab: ['cat', 'catsleep', 'dog', 'hamster', 'pizza', 'ramen', 'donut', 'mug', 'latte', 'boba'], biolab: ['cat', 'catsleep', 'dog', 'hamster', 'pizza', 'ramen', 'donut', 'mug'], chapel: ['energy3', 'pizza', 'controller', 'cat', 'dog'], hospital: ['cat', 'catsleep', 'dog', 'hamster']};

/* ---- class details (~200): what's written on sticky notes, whiteboards, screens and book spines, by major ---- */
SC.CLASS = {
  cs: ['O(n log n)', 'segfault', 'git push', 'malloc()', 'BFS / DFS', 'NULL', '404', 'while(true)', 'stack trace', 'recursion'],
  eng: ['F = ma', 'ΣM = 0', 'free body', 'σ = F/A', 'τ = r × F', 'Q = mcΔT'],
  ece: ['V = IR', 'KCL', 'op-amp', 'Bode plot', 'H(s)', '0101 1100'],
  aero: ['Δv', 'L = ½ρv²SC', 'Mach 0.8', 'Isp', 'orbit', 'thrust/weight'],
  civil: ['moment diagram', 'w = 2 kN/m', 'slump test', 'truss', 'f\'c = 4 ksi'],
  che: ['ṁ in = ṁ out', 'CSTR', 'ΔG < 0', 'Raoult', 'McCabe-Thiele'],
  ie: ['μ ± 3σ', 'Gantt', 'queue M/M/1', 'LP: max z', 'takt time'],
  math: ['∫ f(x) dx', 'det(A) = 0', 'ε-δ', 'λ = 2', '∂f/∂x', '∑ 1/n²', 'e^iπ + 1 = 0'],
  phys: ['ψ(x)', 'E = hf', 'ΔxΔp ≥ ħ/2', '∇·E = ρ/ε₀', 'v = λf'],
  chem: ['SN2', 'pKa 4.7', 'PV = nRT', 'C₆H₆', 'ΔH°', 'Le Châtelier'],
  bio: ['ATP', 'Krebs cycle', 'mRNA → protein', 'mitosis', 'PCR', 'action potential'],
  nurse: ['NCLEX', 'q4h PRN', 'BP 120/80', 'SBAR', 'med math', 'ABCs'],
  pharm: ['t½', 'CYP450', 'mg/kg', 'Rx', 'AUC'],
  kin: ['VO₂ max', 'ATP-PC', 'ROM', 'reps × sets', 'Krebs'],
  vet: ['bovine', 'equine GI', 'rumen', 'vaccine schedule', 'TPR'],
  ag: ['N-P-K', 'yield/acre', 'soil pH 6.5', 'crop rotation', 'GMO'],
  env: ['CO₂ ppm', 'watershed', 'carbon cycle', '1.5°C', 'NEPA'],
  it: ['TCP/IP', '192.168.0.1', 'SQL JOIN', 'firewall', 'OSI model', 'ping'],
  aviation: ['METAR', 'V1 rotate', 'FL350', 'squawk 7700', 'crosswind'],
  biz: ['ROI', 'debits = credits', 'P&L', '4 Ps', 'NPV', 'SWOT', 'Assets = L + E'],
  econ: ['MR = MC', 'supply/demand', 'GDP', 'elasticity', 'Nash eq.'],
  psych: ['p < .05', 'Pavlov', 'n = 120', 'Piaget', 'CBT'],
  soc: ['Durkheim', 'n = 40 interviews', 'social capital', 'Weber'],
  polisci: ['Federalist 10', 'checks & balances', 'Marbury', 'IR theory'],
  hist: ['1789', 'primary source', 'WWI', 'Magna Carta', 'thesis'],
  hum: ['thesis statement', 'iambic pentameter', 'MLA', 'motif', 'Act III'],
  phil: ['cogito', 'Kant', 'trolley problem', 'a priori', 'Socrates'],
  comm: ['AP style', 'lede', 'press release', 'storyboard'],
  edu: ['lesson plan', 'Bloom', 'IEP', 'rubric'],
  design: ['kerning', 'grid', 'Pantone', 'wireframe', 'moodboard'],
  arts: ['♩ = 120', 'C major', 'chiaroscuro', 'act two', 'sketch #12'],
  hosp: ['RevPAR', 'event run sheet', 'menu cost %', 'check-in 3pm'],
  lang: ['hola / adiós', 'conjugate: ser', 'je suis', 'ありがとう', '谢谢', 'vocab ch. 7']
};
const scClass = (r, maj) => scPick(r, SC.CLASS[maj] || SC.CLASS.math);

/* ---- backgrounds: walls, what the window shows, furniture ---- */
function scWall(kind, c, L){
  const base = {paint: c.wall, brick: '#9b5a45', wood: '#7a5638', tile: '#d8dcd6', concrete: '#9a9a9a', glass: '#a9c3cc', stone: '#8d8678', tent: '#d9822b', train: '#5f6d7a', plane: '#d8d8d8', car: '#2c2f36', none: c.wall}[kind] || c.wall;
  let g = rc(0, 0, 300, 300, base, 0);
  if (kind === 'brick') for (let y = 0; y < 300; y += 14) for (let x = (y / 14) % 2 ? -14 : 0; x < 300; x += 28) g += rc(x + 1, y + 1, 26, 12, '#a8654f', 1, ' opacity=".55"');
  if (kind === 'wood') for (let x = 0; x < 300; x += 24) g += ln(x, 0, x, 300, '#000', 1, ' opacity=".12"');
  if (kind === 'tile') for (let y = 0; y < 300; y += 25) g += ln(0, y, 300, y, '#000', 1, ' opacity=".07"');
  if (kind === 'tent') g += pa('M0 0 L150 300 L300 0z', '#000', ' opacity=".08"');
  return g;
}
function scSky(L, id){ return `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.sky[0]}"/><stop offset="1" stop-color="${L.sky[1]}"/></linearGradient></defs>`; }
// what you see out a window or, outdoors, around you
function scView(win, L, id, r, x, y, w, h){
  let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}s)"/>`;
  const night = L.t === 'n', gy = y + h * .72, dk = night ? .55 : 1;
  const bldg = n => Array.from({length: n}, (_, k) => { const bw = w / n, bh = scR(r, h * .2, h * .6); let s = rc(x + k * bw, y + h - bh, bw - 2, bh, night ? '#1c1f33' : '#8b93a7', 0);
    for (let wy = y + h - bh + 6; wy < y + h - 6; wy += 9) for (let wx = x + k * bw + 4; wx < x + (k + 1) * bw - 6; wx += 8) if (r() < .45) s += rc(wx, wy, 4, 5, night ? '#f6d77a' : '#cfd8e6', 0, ` opacity="${night ? .85 : .6}"`); return s; }).join('');
  const trees = n => Array.from({length: n}, () => { const tx_ = x + scR(r, 0, w), th = scR(r, h * .25, h * .45); return rc(tx_ - 2, gy - th * .3, 4, th * .3 + 10, '#4a3626', 0) + ci(tx_, gy - th * .5, th * .32, night ? '#1d3b2c' : scPick(r, ['#4c9a5c', '#5aa469', '#3f8a4e', '#7ab55c'])); }).join('');
  const ground = f => rc(x, gy, w, y + h - gy, f, 0);
  switch (win){
    case 'city': g += bldg(6); break;
    case 'street': g += bldg(4) + rc(x, y + h - 8, w, 8, '#555', 0); break;
    case 'campus': g += ground(night ? '#1e3324' : '#7fb069') + rc(x + w * .55, gy - h * .45, w * .3, h * .45, night ? '#3a2f2a' : '#b5653f', 0) + pa(`M${x + w * .55} ${gy - h * .45} l${w * .15} -${h * .15} l${w * .15} ${h * .15}z`, night ? '#2a2422' : '#7c3a24') + trees(2); break;
    case 'trees': g += ground(night ? '#1e3324' : '#8cc06f') + trees(4); break;
    case 'field': g += ground(night ? '#2a2a18' : '#d9c26a') + rc(x, gy + 6, w, 3, '#000', 0, ' opacity=".1"'); break;
    case 'sea': case 'lake': g += rc(x, gy, w, y + h - gy, win === 'sea' ? '#2f7fb5' : '#3d7e8f', 0) + ln(x + 10, gy + 10, x + 40, gy + 10, '#fff', 1.5, ' opacity=".4"'); break;
    case 'mountains': g += pa(`M${x} ${gy} L${x + w * .3} ${y + h * .3} L${x + w * .55} ${gy} L${x + w * .75} ${y + h * .4} L${x + w} ${gy}z`, night ? '#2a2f45' : '#7d8aa3') + ground(night ? '#1e3324' : '#6aa35c'); break;
    case 'airport': g += ground('#7a7a7a') + pa(`M${x + w * .2} ${gy - 18} h${w * .5} l12 6 h-12 l-${w * .25} 10z`, '#f4f4f4'); break;
    case 'parking': case 'gas': g += bldg(3) + ground('#4a4a4a') + (win === 'gas' ? rc(x + w * .2, gy - 40, w * .6, 8, '#d24a3a', 1) : ''); break;
    case 'clouds': g += [.2, .5, .8].map(f => ci(x + w * f, y + h * .6, h * .18, '#fff', ' opacity=".9"')).join(''); break;
    case 'stadium': g += ground('#4c9a5c') + rc(x, y + h * .3, w, h * .25, '#7d8aa3', 0); break;
    case 'stars': g += ground('#141a26'); break;
    case 'stained': g = rc(x, y, w, h, '#2c2c2a', 0) + [0, 1, 2, 3].map(k => rc(x + 4 + k * (w - 8) / 4, y + 4, (w - 8) / 4 - 3, h - 8, ['#c0392b', '#2980b9', '#f1c40f', '#27ae60'][k], 1, ' opacity=".85"')).join(''); break;
    case 'pool': g = rc(x, y, w, h, '#3aa0c8', 0) + [0, 1, 2].map(k => ln(x, y + h * (k + 1) / 4, x + w, y + h * (k + 1) / 4, '#fff', 1.5, ' opacity=".6"')).join(''); break;
    case 'ice': g = rc(x, y, w, h, '#e9f4fa', 0) + ci(x + w / 2, y + h / 2, h * .2, 'none', ' stroke="#d24a3a" stroke-width="2"'); break;
    case 'lanes': g = rc(x, y, w, h, '#c9955b', 0) + [0, 1, 2, 3].map(k => ln(x + w * k / 4, y, x + w * k / 4, y + h, '#7a5638', 2)).join(''); break;
    case 'sky': break;
    default: g = rc(x, y, w, h, '#000', 0, ' opacity=".0"');
  }
  return g;
}
// furniture and things in the background (drawn along a back wall whose floor line is at y = fy)
SC.DEC = {
  shelf: (c, x, fy) => rc(x, fy - 120, 70, 6, '#7a5638', 1) + [0, 1, 2, 3, 4].map(k => rc(x + 4 + k * 13, fy - 146, 10, 26, [c.a1, c.a2, c.a3, '#c9a26a', '#8a5a33'][k], 1)).join(''),
  poster: (c, x, fy) => rc(x, fy - 190, 54, 70, c.a3, 2) + ci(x + 27, fy - 160, 14, c.a1, ' opacity=".8"'),
  bed: (c, x, fy) => rc(x - 20, fy - 40, 130, 40, c.a2, 6) + rc(x - 16, fy - 52, 40, 16, '#f1efe8', 6),
  bunk: (c, x, fy) => rc(x, fy - 150, 8, 150, '#7a5638', 1) + rc(x + 100, fy - 150, 8, 150, '#7a5638', 1) + rc(x, fy - 110, 108, 14, c.a2, 3) + rc(x, fy - 40, 108, 14, c.a1, 3),
  clock: (c, x, fy) => ci(x + 20, fy - 180, 16, '#f1efe8', ' stroke="#2c2c2a" stroke-width="3"') + ln(x + 20, fy - 180, x + 20, fy - 190, '#2c2c2a', 2) + ln(x + 20, fy - 180, x + 27, fy - 176, '#2c2c2a', 2),
  plant: (c, x, fy) => pa(`M${x} ${fy} h28 l-4 -30 h-20z`, '#c97b4a') + pa(`M${x + 14} ${fy - 30} q-30 -30 -10 -60 q20 20 10 60z M${x + 14} ${fy - 30} q30 -36 8 -64 q-16 26 -8 64z`, '#4c9a5c'),
  frame: (c, x, fy) => rc(x, fy - 170, 44, 34, '#5d3b25', 2) + rc(x + 4, fy - 166, 36, 26, c.a3, 1),
  lampFloor: (c, x, fy, L) => ln(x + 10, fy, x + 10, fy - 130, '#2c2c2a', 3) + pa(`M${x - 8} ${fy - 130} h36 l-8 -24 h-20z`, '#f4e3c3') + (L.lamp ? ci(x + 10, fy - 120, 40, '#ffd27a', ' opacity=".18"') : ''),
  lampGreen: (c, x, fy) => '',
  cabinets: (c, x, fy) => rc(x - 10, fy - 196, 140, 56, '#e8e3d8', 2) + ln(x + 60, fy - 196, x + 60, fy - 140, '#bbb', 2) + rc(x + 50, fy - 150, 6, 3, '#999', 1) + rc(x + 64, fy - 150, 6, 3, '#999', 1),
  fridge: (c, x, fy) => rc(x + 150, fy - 170, 60, 170, '#e9ecef', 4) + ln(x + 156, fy - 110, x + 156, fy - 90, '#999', 3),
  stacks: (c, x, fy) => [0, 1, 2, 3].map(s => rc(x - 30, fy - 60 - s * 45, 160, 5, '#5d3b25', 0) + [...Array(14)].map((_, k) => rc(x - 28 + k * 11, fy - 98 - s * 45, 9, 38 - (k * 7) % 10, [c.a1, c.a2, c.a3, '#8a5a33', '#c9a26a', '#2b3a8f'][(k + s) % 6], 1)).join('')).join(''),
  stacks2: (c, x, fy) => SC.DEC.stacks(c, x + 150, fy),
  whiteboard: (c, x, fy, L, cls) => rc(x - 10, fy - 200, 130, 80, '#f8f8f8', 3, ' stroke="#bbb" stroke-width="3"') + `<text x="${x + 55}" y="${fy - 155}" font-size="15" fill="#1d4ed8" text-anchor="middle" font-family="ui-sans-serif,system-ui">${esc(cls)}</text>` + ln(x, fy - 135, x + 80, fy - 140, '#c0392b', 2),
  chalkboard: (c, x, fy, L, cls) => rc(x - 20, fy - 205, 160, 85, '#2f4f3a', 3, ' stroke="#7a5638" stroke-width="5"') + `<text x="${x + 60}" y="${fy - 158}" font-size="15" fill="#f4f4f4" text-anchor="middle" font-family="ui-sans-serif,system-ui">${esc(cls)}</text>`,
  seats: (c, x, fy) => [0, 1, 2].map(k => rc(-10, fy - 60 - k * 40, 320, 16, '#6d4c41', 3, ` opacity="${.9 - k * .25}"`)).join(''),
  projector: (c, x, fy) => rc(x + 10, fy - 230, 100, 60, '#f4f4f4', 2, ' opacity=".9"'),
  labshelf: (c, x, fy) => rc(x - 10, fy - 150, 130, 5, '#bbb', 0) + [0, 1, 2, 3, 4].map(k => rc(x + k * 24, fy - 175, 12, 25, ['#cde7f0', '#f7d6a8', '#d4f0c8', '#f4c6d6', '#e6e6e6'][k], 3)).join(''),
  hood: (c, x, fy) => rc(x + 140, fy - 210, 110, 120, '#c9ced3', 3) + rc(x + 148, fy - 180, 94, 80, '#e6f2f5', 2, ' opacity=".8"'),
  microscope: (c, x, fy) => '',
  monitors: (c, x, fy) => [0, 1].map(k => rc(x - 20 + k * 120, fy - 120, 80, 50, '#2c2c2a', 3) + rc(x - 16 + k * 120, fy - 116, 72, 42, '#1e3a5f', 1)).join(''),
  pegboard: (c, x, fy) => rc(x - 10, fy - 200, 150, 90, '#c9a26a', 2) + [...Array(40)].map((_, k) => ci(x + (k % 10) * 14, fy - 190 + Math.floor(k / 10) * 20, 1.5, '#7a5638')).join(''),
  printer3d: (c, x, fy) => rc(x + 170, fy - 120, 70, 70, '#2c2c2a', 3) + rc(x + 178, fy - 112, 54, 50, '#555', 1),
  easel: (c, x, fy) => ln(x, fy, x + 30, fy - 160, '#7a5638', 4) + ln(x + 60, fy, x + 30, fy - 160, '#7a5638', 4) + rc(x + 5, fy - 150, 50, 60, '#f6f3ec', 1) + ci(x + 30, fy - 120, 14, c.a1, ' opacity=".7"'),
  canvases: (c, x, fy) => [0, 1, 2].map(k => rc(x + 150 + k * 10, fy - 70 + k * 6, 50, 64, ['#f6f3ec', c.a3, c.a1][k], 1)).join(''),
  stand: (c, x, fy) => SC.PROP.headset.d(c).replace(/^/, `<g transform="translate(${x + 160} ${fy}) scale(1.6)">`) + '</g>',
  menu: (c, x, fy) => rc(x, fy - 210, 110, 60, '#2c2c2a', 3) + [0, 1, 2].map(k => ln(x + 10, fy - 195 + k * 14, x + 90, fy - 195 + k * 14, '#f4f4f4', 2)).join(''),
  hanging: (c, x, fy) => [40, 150, 260].map(px => ln(px, 0, px, 50, '#2c2c2a', 1.5) + pa(`M${px - 16} 66 q16 -24 32 0z`, '#2c2c2a')).join(''),
  counterCafe: (c, x, fy) => rc(-10, fy - 50, 320, 50, '#5d3b25', 0),
  neonSign: (c, x, fy) => `<text x="${x + 60}" y="${fy - 170}" font-size="30" fill="none" stroke="#ff4fd8" stroke-width="2.5" font-family="ui-sans-serif,system-ui" text-anchor="middle">OPEN</text>`,
  trays: (c, x, fy) => [0, 1, 2].map(k => rc(x + k * 70, fy - 80, 60, 8, '#e57373', 2)).join(''),
  banners: (c, x, fy) => [0, 1, 2].map(k => pa(`M${x + k * 60} ${fy - 220} h40 v50 l-20 -12 l-20 12z`, [c.a1, c.a2, c.a3][k])).join(''),
  washers: (c, x, fy) => [0, 1, 2, 3].map(k => rc(-10 + k * 80, fy - 90, 70, 90, '#e9ecef', 4) + ci(25 + k * 80, fy - 45, 22, '#9ec5d6', ' stroke="#bbb" stroke-width="4"')).join(''),
  lockers: (c, x, fy) => [...Array(8)].map((_, k) => rc(-10 + k * 40, fy - 170, 36, 170, k % 2 ? '#4a7fb5' : '#3f6fa0', 1) + rc(-2 + k * 40, fy - 150, 18, 3, '#2c3e50', 1)).join(''),
  door: (c, x, fy) => rc(x + 170, fy - 190, 80, 190, '#8a5a33', 2) + ci(x + 236, fy - 95, 4, '#f2c14e'),
  rail: (c, x, fy) => ln(0, fy - 60, 300, fy - 160, '#555', 5) + ln(0, fy - 20, 300, fy - 120, '#777', 30, ' opacity=".35"'),
  vending: (c, x, fy) => rc(x + 170, fy - 190, 80, 190, '#c0392b', 4) + rc(x + 178, fy - 178, 50, 120, '#f4f4f4', 2, ' opacity=".9"'),
  beams: (c, x, fy) => pa('M0 0 L150 -10 L300 0 L300 30 L150 20 L0 30z', '#5d3b25', ' opacity=".7"'),
  plants: (c, x, fy) => [0, 1, 2, 3, 4, 5].map(k => pa(`M${-10 + k * 55} ${fy - 60} q10 -40 20 0 q12 -50 22 0z`, k % 2 ? '#4c9a5c' : '#7ab55c')).join(''),
  hay: (c, x, fy) => rc(x + 160, fy - 60, 90, 60, '#d9b65a', 6),
  board: (c, x, fy) => rc(x, fy - 215, 150, 50, '#1b1b1b', 3) + [0, 1, 2].map(k => ln(x + 10, fy - 200 + k * 13, x + 130, fy - 200 + k * 13, k ? '#f6d743' : '#7ee787', 2.5)).join(''),
  railing: (c, x, fy) => ln(0, fy - 70, 300, fy - 70, '#3a3a3a', 4) + [...Array(16)].map((_, k) => ln(k * 20, fy - 70, k * 20, fy, '#3a3a3a', 2)).join(''),
  stringPorch: (c, x, fy) => pa('M0 40 q150 60 300 0', 'none', ' stroke="#2c2c2a" stroke-width="1.5"') + [...Array(10)].map((_, k) => ci(15 + k * 30, 50 + Math.sin(k / 9 * Math.PI) * 28, 4, '#ffd27a')).join(''),
  trees: () => '', tower: () => '', path: () => '', fountain: (c, x, fy) => rc(x + 150, fy - 40, 100, 40, '#b0b8c0', 8) + pa(`M${x + 200} ${fy - 40} q-10 -30 0 -50 q10 20 0 50z`, '#9ad0ec', ' opacity=".8"'),
  bikes: (c, x, fy) => [0, 1, 2].map(k => ci(x + k * 50, fy - 18, 18, 'none', ' stroke="#2c2c2a" stroke-width="3"') + ci(x + k * 50 + 40, fy - 18, 18, 'none', ' stroke="#2c2c2a" stroke-width="3"')).join(''),
  columns: (c, x, fy) => [0, 1, 2, 3].map(k => rc(-10 + k * 90, fy - 200, 26, 200, '#e8e3d8', 1)).join(''),
  fence: (c, x, fy) => ln(0, fy - 40, 300, fy - 40, '#8a5a33', 4) + [...Array(8)].map((_, k) => ln(k * 42, fy - 55, k * 42, fy, '#8a5a33', 5)).join(''),
  flowers: (c, x, fy) => [...Array(12)].map((_, k) => ci(10 + k * 25, fy - 10 - (k % 3) * 6, 5, ['#e57373', '#f6d743', '#ba68c8', '#ffffff'][k % 4])).join(''),
  shelter: (c, x, fy) => rc(-10, fy - 200, 320, 10, '#555', 0) + ln(20, fy - 190, 20, fy, '#555', 4) + ln(280, fy - 190, 280, fy, '#555', 4),
  lantern: (c, x, fy) => rc(x + 200, fy - 50, 24, 40, '#f6d77a', 4, ' opacity=".9"') + ci(x + 212, fy - 30, 40, '#ffd27a', ' opacity=".18"'),
  clothes: (c, x, fy) => ln(0, 60, 300, 60, '#7a5638', 3) + [...Array(7)].map((_, k) => pa(`M${20 + k * 40} 62 h30 l4 70 h-38z`, [c.a1, c.a2, c.a3, '#555', '#e8dcc8'][k % 5])).join(''),
  partyLights: (c, x, fy) => [...Array(14)].map((_, k) => ci(10 + k * 21, 30 + (k % 2) * 10, 5, ['#ff4fd8', '#4fd8ff', '#ffe14f'][k % 3], ' opacity=".9"')).join(''),
  paintings: (c, x, fy) => [0, 1].map(k => rc(x - 10 + k * 150, fy - 200, 110, 80, '#c9a26a', 2) + rc(x - 4 + k * 150, fy - 194, 98, 68, [c.a3, c.a1][k], 1)).join(''),
  dome: (c, x, fy) => pa(`M${x + 60} ${fy} a90 90 0 0 1 180 0z`, '#cfd8e6'),
  telescope: (c, x, fy) => ln(x + 180, fy, x + 200, fy - 60, '#555', 4) + ln(x + 220, fy, x + 200, fy - 60, '#555', 4) + rc(x + 170, fy - 100, 80, 18, '#e8e8e8', 6, ' transform="rotate(-25 210 ' + (fy - 90) + ')"'),
  umbrella: (c, x, fy) => ln(x + 200, fy, x + 200, fy - 140, '#555', 3) + pa(`M${x + 130} ${fy - 140} q70 -60 140 0z`, c.a1),
  shelfArcade: () => '', arcadeMachines: (c, x, fy) => [0, 1, 2].map(k => rc(-10 + k * 110, fy - 170, 80, 170, ['#3b1d6e', '#1d3b6e', '#6e1d3b'][k], 4) + rc(k * 110, fy - 150, 60, 44, '#7ee787', 2, ' opacity=".7"')).join('')
};
// what things sit on
function scSurface(kind, c, y){
  const wood = '#8a5a33';
  switch (kind){
    case 'bed': return rc(-10, y, 320, 300 - y, c.a2, 0) + pa(`M0 ${y + 20} q150 -20 300 0`, 'none', ' stroke="#fff" stroke-width="3" opacity=".25"');
    case 'couch': return rc(-10, y - 20, 320, 320 - y, c.couch, 14) + rc(-10, y + 10, 320, 4, '#000', 0, ' opacity=".12"');
    case 'floor': case 'stairs': return rc(0, y, 300, 300 - y, kind === 'stairs' ? '#9a9a9a' : '#b98e5c', 0) + (kind === 'stairs' ? [0, 1, 2].map(k => ln(0, y + 20 + k * 30, 300, y + 20 + k * 30, '#777', 2)).join('') : '');
    case 'grass': return rc(0, y, 300, 300 - y, '#6aa35c', 0);
    case 'sand': return rc(0, y, 300, 300 - y, '#ead6a6', 0);
    case 'dock': return rc(0, y, 300, 300 - y, '#a0754c', 0) + [...Array(6)].map((_, k) => ln(0, y + 12 + k * 18, 300, y + 12 + k * 18, '#7a5638', 2)).join('');
    case 'rock': return pa(`M0 ${y} q150 -20 300 10 V300 H0z`, '#8d8678');
    case 'lab': return rc(-10, y, 320, 300 - y, '#2f3640', 0) + rc(-10, y, 320, 8, '#3d4652', 0);
    case 'lap': case 'tray': return rc(-10, y, 320, 300 - y, kind === 'tray' ? '#bdbdbd' : '#3c4a5c', 0);
    case 'booth': case 'pew': return rc(-10, y, 320, 300 - y, kind === 'pew' ? '#6d4c41' : '#a83232', 0) + rc(-10, y, 320, 6, '#000', 0, ' opacity=".2"');
    case 'bleachers': case 'steps': case 'ledge': return rc(0, y, 300, 300 - y, '#9aa0a6', 0) + [0, 1, 2].map(k => ln(0, y + 26 + k * 34, 300, y + 26 + k * 34, '#7d838a', 3)).join('');
    case 'hammock': return pa(`M-10 ${y - 10} q160 80 320 0 V300 H-10z`, c.a3);
    case 'tub': return rc(-10, y, 320, 300 - y, '#f4f4f4', 30);
    case 'piano': return rc(-10, y, 320, 300 - y, '#1b1b1b', 0) + [...Array(22)].map((_, k) => rc(k * 14, y + 4, 12, 30, '#fafafa', 1)).join('');
    case 'chairs': return rc(-10, y, 320, 300 - y, '#5f6b7a', 0);
    case 'counter': return rc(-10, y, 320, 300 - y, '#d9d4c7', 0);
    case 'bench': return rc(-10, y, 320, 300 - y, '#7a5638', 0) + ln(-10, y + 2, 310, y + 2, '#5d3b25', 4);
    default: return rc(-10, y, 320, 300 - y, kind === 'table' ? '#a5764a' : wood, 0) + rc(-10, y, 320, 5, '#000', 0, ' opacity=".12"');
  }
}
// weather and light on top of everything
function scFx(L, r, area){
  const [x, y, w, h] = area; let g = '';
  const inside = (px, py) => px > x && px < x + w && py > y && py < y + h;
  if (L.fx === 'stars' || L.fx === 'aurora') for (let k = 0; k < 18; k++){ const px = x + r() * w, py = y + r() * h * .6; g += ci(px.toFixed(1), py.toFixed(1), scR(r, .6, 1.6).toFixed(1), '#fff', ` opacity="${scR(r, .4, .9).toFixed(2)}"`); }
  if (L.fx === 'aurora') g += pa(`M${x} ${y + h * .35} q${w * .25} -${h * .25} ${w * .5} 0 t${w * .5} 0`, 'none', ` stroke="#3ddc97" stroke-width="${h * .12}" opacity=".35"`);
  if (L.fx === 'sun') g += ci(x + w * .78, y + h * .3, h * .12, '#fff3c4', ' opacity=".9"');
  if (L.fx === 'clouds' || L.fx === 'storm') g += [.2, .55, .85].map(f => ci(x + w * f, y + h * .2, h * .16, L.fx === 'storm' ? '#3a3f4f' : '#e6e8ea', ' opacity=".9"')).join('');
  if (L.fx === 'rain' || L.fx === 'storm') for (let k = 0; k < 30; k++){ const px = x + r() * w, py = y + r() * h; g += ln(px, py, px - 4, py + 14, '#dfe7f0', 1.2, ' opacity=".55"'); }
  if (L.fx === 'storm') g += pa(`M${x + w * .6} ${y} l-12 ${h * .3} h10 l-16 ${h * .3}`, 'none', ' stroke="#fff6a8" stroke-width="3"');
  if (L.fx === 'snow' || L.fx === 'hail') for (let k = 0; k < 34; k++) g += ci((x + r() * w).toFixed(1), (y + r() * h).toFixed(1), L.fx === 'hail' ? 1.6 : scR(r, 1.2, 2.6).toFixed(1), '#fff', ' opacity=".85"');
  if (L.fx === 'fog') g += rc(x, y, w, h, '#fff', 0, ' opacity=".45"');
  if (L.fx === 'haze') g += rc(x, y, w, h, '#ffd27a', 0, ' opacity=".18"');
  if (L.fx === 'neon') g += rc(x, y, w, h, '#ff4fd8', 0, ' opacity=".18"') + `<text x="${x + w / 2}" y="${y + h * .5}" font-size="${h * .22}" fill="none" stroke="#ff4fd8" stroke-width="2" text-anchor="middle" font-family="ui-sans-serif,system-ui">24/7</text>`;
  if (L.fx === 'string') g += pa(`M0 18 q150 40 300 0`, 'none', ' stroke="#2c2c2a" stroke-width="1.5"') + [...Array(12)].map((_, k) => ci(10 + k * 25, 22 + Math.sin(k / 11 * Math.PI) * 18, 3.5, '#ffd27a') + ci(10 + k * 25, 22 + Math.sin(k / 11 * Math.PI) * 18, 9, '#ffd27a', ' opacity=".2"')).join('');
  return g;
}

/* ---- seasonal decorations (drawn on the surface, right side) ---- */
SC.SDEC = {
  halloween: c => pa('M0 0 q-2 -22 16 -22 q18 0 16 22z', '#f08a24') + rc(14, -28, 4, 7, '#3a5f2a', 1) + pa('M8 -12 l3 -4 l3 4z M18 -12 l3 -4 l3 4z', '#3a2410'),
  thanks: c => SC.PROP.takeout.d(c) + pa('M34 -10 q8 -12 14 0z', '#c08a4a'),
  winter: c => pa('M0 -30 q30 20 60 0', 'none', ' stroke="#2c5f2d" stroke-width="2"') + [...Array(6)].map((_, k) => ci(5 + k * 10, -30 + Math.sin(k / 5 * Math.PI) * 12, 3, ['#e53935', '#fdd835', '#1e88e5'][k % 3])).join(''),
  boots: c => pa('M0 0 v-26 h12 v18 h12 v8z M28 0 v-26 h12 v18 h12 v8z', '#5d3b25'),
  valentine: c => pa('M16 -2 C-6 -16 4 -32 16 -22 C28 -32 38 -16 16 -2z', '#d81b60'),
  blossom: c => ln(0, 0, 30, -40, '#5d3b25', 2) + [[8, -12], [16, -22], [24, -32], [20, -14], [28, -26]].map(([x, y]) => ci(x, y, 4, '#f8bbd0')).join(''),
  finals: c => [0, 1, 2, 3].map(k => rc(k * 9, -6 - k * 3, 30, 4, '#fff', 1, ` transform="rotate(${k * 9 - 12} ${k * 9 + 15} ${-6 - k * 3})"`)).join(''),
  movein: c => rc(0, -30, 34, 30, '#c9a26a', 1) + rc(28, -22, 26, 22, '#b58e57', 1) + ln(0, -18, 34, -18, '#8a6a3a', 2),
  grad: c => SC.PROP.books.d(c) + pa('M2 -32 l18 -8 l18 8 l-18 8z', '#1b1b1b') + ln(36, -32, 38, -22, '#f2c14e', 1.5),
  fan: c => ci(16, -26, 15, 'none', ' stroke="#bbb" stroke-width="2"') + ci(16, -26, 3, '#888') + ln(16, -11, 16, 0, '#888', 3) + rc(6, -3, 20, 3, '#888', 1),
  lunar: c => [0, 1].map(k => rc(k * 22, -30, 18, 22, '#d32f2f', 9) + ln(k * 22 + 9, -36, k * 22 + 9, -30, '#2c2c2a', 1) + ln(k * 22 + 9, -8, k * 22 + 9, -2, '#f2c14e', 1.5)).join(''),
  gameday: c => pa('M6 0 v-20 h4 v-22 h6 v22 h6 v20z', c.a1)
};

/* ---- people ---- */
function scLook(i){
  const r = mulberry32((i >>> 0) * 977 + 31), natural = ['#1d1a1a', '#3b2a20', '#5d3b25', '#8a5a33', '#c9a26a', '#e8d29a', '#b4472b'];
  return {skin: scPick(r, SKIN), hair: r() < .85 ? scPick(r, natural) : scPick(r, HAIR), style: scPick(r, ['short', 'long', 'bun', 'curly', 'buzz', 'side', 'afro', 'bob', 'spiky', 'pony']),
    glasses: r() < .25, outfit: scH(r() * 360, scR(r, 25, 60), scR(r, 30, 60)), hood: r() < .4};
}
function scHairBack(L, cx, cy, s){
  const h = L.hair;
  switch (L.style){
    case 'long': return pa(`M${cx - s * 1.05} ${cy - s * .2} q0 ${-s * 1.2} ${s * 1.05} ${-s * 1.15} q${s * 1.05} ${-s * .05} ${s * 1.05} ${s * 1.15} v${s * 1.5} h${-s * 2.1}z`, h);
    case 'bob': return pa(`M${cx - s * 1.08} ${cy + s * .55} v${-s * .9} q0 ${-s * 1.05} ${s * 1.08} ${-s * 1.05} q${s * 1.08} 0 ${s * 1.08} ${s * 1.05} v${s * .9}z`, h);
    case 'afro': return ci(cx, cy - s * .2, s * 1.35, h);
    case 'curly': return [...Array(9)].map((_, k) => ci(cx + Math.cos(Math.PI + k * Math.PI / 8) * s * .95, cy - s * .15 + Math.sin(Math.PI + k * Math.PI / 8) * s * .95, s * .32, h)).join('');
    case 'bun': return ci(cx, cy - s * 1.25, s * .42, h);
    case 'pony': return pa(`M${cx + s * .7} ${cy - s * .6} q${s * .9} ${s * .3} ${s * .5} ${s * 1.4} q${-s * .1} ${-s * .8} ${-s * .6} ${-s * 1}z`, h);
    default: return '';
  }
}
function scHairFront(L, cx, cy, s){
  const h = L.hair;
  switch (L.style){
    case 'buzz': return pa(`M${cx - s * .98} ${cy - s * .25} q0 ${-s * .8} ${s * .98} ${-s * .8} q${s * .98} 0 ${s * .98} ${s * .8} q${-s * .98} ${-s * .4} ${-s * 1.96} 0z`, h, ' opacity=".85"');
    case 'spiky': return pa(`M${cx - s} ${cy - s * .2} l${s * .2} ${-s * .9} l${s * .25} ${s * .35} l${s * .25} ${-s * .6} l${s * .25} ${s * .5} l${s * .3} ${-s * .55} l${s * .25} ${s * .55} l${s * .25} ${-s * .4} l${s * .25} ${s * 1.05} q${-s} ${-s * .45} ${-s * 2} 0z`, h);
    case 'side': return pa(`M${cx - s} ${cy - s * .15} q${s * .1} ${-s * 1.1} ${s} ${-s * .95} q${s * .95} ${s * .1} ${s} ${s * .8} q${-s * .7} ${-s * .7} ${-s * 1.6} ${-s * .1} q${-s * .25} ${s * .1} ${-s * .4} ${s * .25}z`, h);
    case 'afro': case 'curly': return pa(`M${cx - s * .95} ${cy - s * .3} q${s * .95} ${-s * .9} ${s * 1.9} 0 q${-s * .95} ${-s * .35} ${-s * 1.9} 0z`, h);
    default: return pa(`M${cx - s} ${cy - s * .1} q0 ${-s * 1} ${s} ${-s * 1} q${s} 0 ${s} ${s * 1} q${-s * .45} ${-s * .55} ${-s * 1.05} ${-s * .5} q${-s * .55} ${s * .05} ${-s * .95} ${s * .5}z`, h);
  }
}
// eyes, brows, mouth and extras for each expression
function scFace(e, cx, cy, s, skin){
  const ey = cy - s * .05, ex = s * .36, ink = '#2a1f1a', sw = Math.max(1.6, s * .06);
  const dot = (x, y, r = s * .085) => ci(x, y, r, ink);
  const arcUp = (x, y) => pa(`M${x - s * .12} ${y + s * .03} q${s * .12} ${-s * .14} ${s * .24} 0`, 'none', ` stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"`);
  const lineE = (x, y, tilt = 0) => ln(x - s * .12, y + tilt, x + s * .12, y - tilt, ink, sw);
  const mouth = d => pa(d, 'none', ` stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"`);
  const my = cy + s * .42;
  const M = {
    smile: () => mouth(`M${cx - s * .26} ${my - s * .05} q${s * .26} ${s * .24} ${s * .52} 0`),
    grin: () => pa(`M${cx - s * .3} ${my - s * .08} h${s * .6} q0 ${s * .3} ${-s * .3} ${s * .3} q${-s * .3} 0 ${-s * .3} ${-s * .3}z`, '#fff', ` stroke="${ink}" stroke-width="${sw * .8}"`),
    laugh: () => pa(`M${cx - s * .28} ${my - s * .1} h${s * .56} q0 ${s * .4} ${-s * .28} ${s * .4} q${-s * .28} 0 ${-s * .28} ${-s * .4}z`, '#7a2e2e') + pa(`M${cx - s * .14} ${my + s * .2} q${s * .14} ${-s * .1} ${s * .28} 0`, '#e57373'),
    smirk: () => mouth(`M${cx - s * .18} ${my} q${s * .22} ${s * .05} ${s * .34} ${-s * .14}`),
    flat: () => ln(cx - s * .2, my, cx + s * .2, my, ink, sw),
    o: () => ci(cx, my + s * .04, s * .13, '#5a2323'),
    big_o: () => pa(`M${cx} ${my - s * .14} q${s * .2} 0 ${s * .2} ${s * .24} q0 ${s * .22} ${-s * .2} ${s * .22} q${-s * .2} 0 ${-s * .2} ${-s * .22} q0 ${-s * .24} ${s * .2} ${-s * .24}z`, '#5a2323'),
    wavy: () => mouth(`M${cx - s * .26} ${my} l${s * .1} ${-s * .07} l${s * .1} ${s * .07} l${s * .1} ${-s * .07} l${s * .1} ${s * .07} l${s * .1} ${-s * .07}`),
    frown: () => mouth(`M${cx - s * .22} ${my + s * .08} q${s * .22} ${-s * .2} ${s * .44} 0`),
    tongue: () => mouth(`M${cx - s * .24} ${my - s * .04} q${s * .24} ${s * .2} ${s * .48} 0`) + pa(`M${cx - s * .06} ${my + s * .04} q${s * .1} ${s * .26} ${s * .2} 0z`, '#e57373'),
    duck: () => pa(`M${cx - s * .16} ${my} q${s * .16} ${-s * .16} ${s * .32} 0 q${-s * .16} ${s * .18} ${-s * .32} 0z`, '#c2606a'),
    pen: () => ln(cx - s * .16, my, cx + s * .16, my, ink, sw) + ln(cx - s * .1, my + s * .02, cx + s * .7, my - s * .1, '#1d4ed8', s * .07),
    fine: () => mouth(`M${cx - s * .3} ${my - s * .06} q${s * .3} ${s * .14} ${s * .6} 0`) + ln(cx - s * .3, my - s * .06, cx - s * .34, my - s * .12, ink, sw * .8)
  };
  const E = {
    dot: () => dot(cx - ex, ey) + dot(cx + ex, ey), happy: () => arcUp(cx - ex, ey) + arcUp(cx + ex, ey), closed: () => lineE(cx - ex, ey) + lineE(cx + ex, ey),
    half: () => lineE(cx - ex, ey) + lineE(cx + ex, ey) + dot(cx - ex, ey + s * .05, s * .05) + dot(cx + ex, ey + s * .05, s * .05),
    wide: () => ci(cx - ex, ey, s * .14, '#fff', ` stroke="${ink}" stroke-width="${sw * .7}"`) + ci(cx + ex, ey, s * .14, '#fff', ` stroke="${ink}" stroke-width="${sw * .7}"`) + dot(cx - ex, ey, s * .06) + dot(cx + ex, ey, s * .06),
    wink: () => dot(cx - ex, ey) + arcUp(cx + ex, ey), squint: () => pa(`M${cx - ex - s * .12} ${ey - s * .07} l${s * .2} ${s * .07} l${-s * .2} ${s * .07} M${cx + ex + s * .12} ${ey - s * .07} l${-s * .2} ${s * .07} l${s * .2} ${s * .07}`, 'none', ` stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"`),
    dead: () => lineE(cx - ex, ey) + lineE(cx + ex, ey) + pa(`M${cx - ex - s * .12} ${ey + s * .1} q${s * .12} ${s * .08} ${s * .24} 0 M${cx + ex - s * .12} ${ey + s * .1} q${s * .12} ${s * .08} ${s * .24} 0`, 'none', ' stroke="#8a6f7a" stroke-width="1.4" opacity=".7"'),
    side: () => dot(cx - ex + s * .08, ey) + dot(cx + ex + s * .08, ey) + lineE(cx - ex, ey - s * .1) + lineE(cx + ex, ey - s * .1),
    sad: () => dot(cx - ex, ey) + dot(cx + ex, ey) + ln(cx - ex - s * .12, ey - s * .2, cx - ex + s * .1, ey - s * .14, ink, sw * .8) + ln(cx + ex + s * .12, ey - s * .2, cx + ex - s * .1, ey - s * .14, ink, sw * .8),
    focus: () => dot(cx - ex, ey) + dot(cx + ex, ey) + ln(cx - ex - s * .14, ey - s * .2, cx - ex + s * .12, ey - s * .14, ink, sw) + ln(cx + ex + s * .14, ey - s * .2, cx + ex - s * .12, ey - s * .14, ink, sw)
  };
  const X = {
    blush: () => ci(cx - ex - s * .08, cy + s * .22, s * .12, '#f28b9a', ' opacity=".45"') + ci(cx + ex + s * .08, cy + s * .22, s * .12, '#f28b9a', ' opacity=".45"'),
    tears: () => pa(`M${cx - ex} ${ey + s * .1} q${-s * .06} ${s * .3} ${-s * .02} ${s * .55} M${cx + ex} ${ey + s * .1} q${s * .06} ${s * .3} ${s * .02} ${s * .55}`, 'none', ' stroke="#6ec6ff" stroke-width="3" opacity=".9"'),
    sweat: () => pa(`M${cx + s * .85} ${cy - s * .45} q${s * .1} ${s * .18} 0 ${s * .26} q${-s * .1} ${-s * .08} 0 ${-s * .26}z`, '#8fd3ff'),
    zzz: () => `<text x="${cx + s * .9}" y="${cy - s * .9}" font-size="${s * .38}" fill="#fff" font-weight="700" font-family="ui-sans-serif,system-ui" opacity=".9">z z</text>`,
    melt: () => pa(`M${cx - s * .5} ${cy + s * .7} q0 ${s * .3} ${s * .1} ${s * .3} q${s * .1} 0 ${s * .1} ${-s * .2} q${s * .2} ${s * .35} ${s * .35} 0 q${s * .1} ${s * .2} ${s * .25} 0`, skin),
    sparkle: () => pa(`M${cx + s * .95} ${cy - s * .7} l${s * .05} ${s * .12} l${s * .12} ${s * .05} l${-s * .12} ${s * .05} l${-s * .05} ${s * .12} l${-s * .05} ${-s * .12} l${-s * .12} ${-s * .05} l${s * .12} ${-s * .05}z`, '#ffe14f'),
    think: () => ci(cx + s * 1.05, cy - s * .8, s * .1, '#fff', ' opacity=".8"') + ci(cx + s * 1.25, cy - s * 1.05, s * .16, '#fff', ' opacity=".8"')
  };
  const map = {smile: ['dot', 'smile', 'blush'], smirk: ['side', 'smirk'], laugh: ['happy', 'laugh', 'blush'], proud: ['happy', 'smile', 'sparkle'], grin: ['dot', 'grin'], soft: ['happy', 'smile'],
    sleepy: ['half', 'flat', 'zzz'], yawn: ['closed', 'big_o'], dead: ['dead', 'flat'], melt: ['half', 'wavy', 'melt'], headdesk: ['closed', 'flat'],
    panic: ['wide', 'big_o', 'sweat'], fakecry: ['closed', 'wavy', 'tears'], grimace: ['squint', 'grin'], fine: ['dot', 'fine', 'sweat'], sweat: ['sad', 'wavy', 'sweat'],
    locked: ['focus', 'flat'], squint: ['squint', 'flat'], pen: ['focus', 'pen'], think: ['side', 'smirk', 'think'],
    tongue: ['wink', 'tongue'], wink: ['wink', 'smile'], duck: ['dot', 'duck', 'blush'], side: ['side', 'flat']}[e] || ['dot', 'smile'];
  return E[map[0]]() + M[map[1]]() + (map[2] ? X[map[2]]() : '');
}
function scHead(L, cx, cy, s, expr, tilt = 0, neckTo = cy + s * 1.2){
  const neck = rc(cx - s * .28, cy + s * .5, s * .56, Math.max(s * .6, neckTo - cy - s * .5 + s * .12), L.skin, s * .2);   // neck, reaching the shoulders
  let g = scHairBack(L, cx, cy, s);
  g += `<ellipse cx="${cx}" cy="${cy}" rx="${s * .95}" ry="${s * 1.05}" fill="${L.skin}"/>`;
  g += ci(cx - s * .95, cy + s * .05, s * .17, L.skin) + ci(cx + s * .95, cy + s * .05, s * .17, L.skin);
  g += scFace(expr, cx, cy, s, L.skin) + scHairFront(L, cx, cy, s);
  if (L.glasses) g += ci(cx - s * .36, cy - s * .05, s * .22, 'none', ` stroke="#2c2c2a" stroke-width="${Math.max(1.5, s * .05)}"`) + ci(cx + s * .36, cy - s * .05, s * .22, 'none', ` stroke="#2c2c2a" stroke-width="${Math.max(1.5, s * .05)}"`) + ln(cx - s * .14, cy - s * .05, cx + s * .14, cy - s * .05, '#2c2c2a', Math.max(1.5, s * .05));
  return neck + (tilt ? `<g transform="rotate(${tilt} ${cx} ${cy})">${g}</g>` : g);
}
function scBody(L, cx, top, w, bot = 300){
  const h = bot - top;
  return pa(`M${cx - w / 2} ${bot} q0 ${-h * .85} ${w * .22} ${-h} h${w * .56} q${w * .22} ${h * .15} ${w * .22} ${h}z`, L.outfit) + (L.hood ? pa(`M${cx - w * .22} ${top + 4} q${w * .22} ${30} ${w * .44} 0`, 'none', ' stroke="#000" stroke-width="3" opacity=".18"') : '');
}
// hands: s = size, (x, y) the hand's center
function scHand(kind, L, x, y, s, c){
  const k = L.skin, palm = (px, py, rot = 0) => `<g transform="rotate(${rot} ${px} ${py})">` + rc(px - s * .45, py - s * .4, s * .9, s * .9, k, s * .3), end = '</g>';
  const fing = (px, py, ang, len) => ln(px, py, px + Math.cos(ang) * len, py + Math.sin(ang) * len, k, s * .26);
  const up = -Math.PI / 2;
  switch (kind){
    case 'peace': return palm(x, y) + fing(x - s * .15, y - s * .3, up - .25, s * .8) + fing(x + s * .15, y - s * .3, up + .25, s * .8) + end;
    case 'thumbup': return palm(x, y) + fing(x - s * .35, y - s * .2, up, s * .65) + end;
    case 'thumbdown': return palm(x, y) + fing(x - s * .35, y + s * .2, -up, s * .65) + end;
    case 'guns': return palm(x, y) + fing(x + s * .3, y - s * .1, 0, s * .85) + fing(x - s * .1, y - s * .35, up, s * .45) + end;
    case 'ok': return palm(x, y) + ci(x - s * .2, y - s * .45, s * .2, 'none', ` stroke="${k}" stroke-width="${s * .2}"`) + [0, 1, 2].map(j => fing(x + s * (.05 + j * .18), y - s * .3, up + .1 * j, s * .7)).join('') + end;
    case 'wave': return palm(x, y) + [-.5, -.2, .1, .4].map((a, j) => fing(x - s * .3 + j * s * .2, y - s * .3, up + a * .4, s * .75)).join('') + fing(x - s * .45, y, Math.PI + .5, s * .5) + end;
    case 'shrug': return palm(x, y, -20) + fing(x - s * .3, y - s * .3, up - .6, s * .55) + end + palm(x + s * 3.2, y, 20) + fing(x + s * 3.5, y - s * .3, up + .6, s * .55) + end;
    case 'pray': return rc(x - s * .3, y - s * .9, s * .6, s * 1.4, k, s * .3) + ln(x, y - s * .9, x, y + s * .4, '#000', 1, ' opacity=".2"');
    case 'flex': return pa(`M${x - s * 1.6} ${y + s * 1.2} q${s * .2} ${-s * 1.6} ${s * 1.2} ${-s * 1.6} q${s * .9} 0 ${s * .9} ${s * 1}`, 'none', ` stroke="${L.outfit}" stroke-width="${s * .9}" stroke-linecap="round"`) + ci(x - s * .9, y - s * .1, s * .5, k) + ci(x + s * .4, y - s * .7, s * .4, k);
    case 'coffee': return rc(x - s * .4, y - s * 1.2, s * .9, s * 1.1, c.a2, s * .15) + steam(x - s * .2, y - s * 1.3) + palm(x, y - s * .2) + end;
    case 'pentwirl': return palm(x, y) + ln(x - s * .6, y - s * .8, x + s * .6, y + s * .2, '#1d4ed8', s * .14) + end;
    case 'cards': return [0, 1, 2].map(j => rc(x - s * .5 + j * s * .25, y - s * 1.2, s * .7, s * 1, '#fff', 2, ` stroke="#bbb" stroke-width="1" transform="rotate(${(j - 1) * 14} ${x} ${y})"`)).join('') + palm(x, y + s * .2) + end;
    case 'test': return rc(x - s * .7, y - s * 1.8, s * 1.4, s * 1.8, '#fff', 2, ' stroke="#ccc"') + [0, 1, 2].map(j => ln(x - s * .5, y - s * 1.2 + j * s * .3, x + s * .4, y - s * 1.2 + j * s * .3, '#999', 1)).join('') + rc(x + s * .05, y - s * 1.7, s * .55, s * .4, '#f9e27a', 1) + palm(x, y + s * .1) + end;
    case 'energy': return rc(x - s * .3, y - s * 1.3, s * .6, s * 1.2, c.a1, s * .12) + palm(x, y - s * .1) + end;
    case 'help': return rc(x - s * 1.6, y - s * 1.6, s * 3.2, s * 1.3, '#fff', 3, ' stroke="#2c2c2a" stroke-width="2"') + `<text x="${x}" y="${y - s * .8}" font-size="${s * .55}" text-anchor="middle" fill="#c0392b" font-family="ui-sans-serif,system-ui" font-weight="800">send help</text>` + palm(x - s * 1.4, y) + end + palm(x + s * 1.4, y) + end;
    default: return '';
  }
}

// standing in the hallway, looking into the room through its open door
function scDoor(S, c, L, r, id, light){
  const night = L.t === 'n' || L.t === 'e', hall = scH(c.wall ? 30 : 30, 14, night ? 52 : 74), hall2 = scH(30, 12, night ? 44 : 66);
  const x0 = 92, x1 = 216, y0 = 46, y1 = 262, wood = scPick(r, ['#8a5a36', '#9b6b45', '#6f4a2f', '#b08060', '#e9e4da']), trim = scPick(r, ['#efeae0', '#d9cbb6', '#5d3b25']);
  const tag = scPick(r, ['#f9e27a', '#9fd3f0', '#f4b6c2', '#c7e9b0']);
  let g = `<defs><clipPath id="${id}dc"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/></clipPath></defs>`;
  // the room, seen through the doorway
  g += `<g clip-path="url(#${id}dc)">${rc(x0, y0, x1 - x0, y1 - y0, night ? '#3a3632' : '#e9e4da', 0)}${rc(x0, y0, x1 - x0, 6, '#000', 0, ' opacity=".08"')}<g transform="translate(${154 - 150 * .72} ${y0}) scale(.72)">${typeof sc2WideBody === 'function' ? sc2WideBody(S, c, L, r, id) : scFront(S, c, L, r, id)}${light}</g></g>`;
  // hallway: wall, baseboard, floor in perspective
  g += pa(`M0 0 H300 V268 H0z M${x0} ${y0} V${y1} H${x1} V${y0}z`, hall, ' fill-rule="evenodd"');
  g += pa('M0 0 L60 26 V258 L0 300z', hall2) + pa('M300 0 L250 22 V262 L300 300z', hall2, ' opacity=".9"');   // the hallway's side walls
  g += pa('M0 300 L60 258 H250 L300 300z', scH(28, 22, night ? 28 : 40)) + rc(60, 252, 190, 8, scH(30, 10, night ? 36 : 58), 0);
  // light from the room spilling onto the hallway floor
  g += pa(`M${x0} ${y1} L${x1} ${y1} L${x1 + 26} 300 L${x0 - 30} 300z`, L.lamp || night ? '#ffd27a' : '#fff6dd', ` opacity="${night ? .28 : .16}"`);
  // door frame (trim) and the open door, swung into the room on its hinges
  g += `<g class="ol">${rc(x0 - 9, y0 - 9, x1 - x0 + 18, 9, trim, 1)}${rc(x0 - 9, y0 - 9, 9, y1 - y0 + 9, trim, 1)}${rc(x1, y0 - 9, 9, y1 - y0 + 9, trim, 1)}`;
  g += pa(`M${x0} ${y0} L${x0 + 34} ${y0 + 12} L${x0 + 34} ${y1 - 8} L${x0} ${y1}z`, wood);
  g += pa(`M${x0 + 6} ${y0 + 22} L${x0 + 28} ${y0 + 29} L${x0 + 28} ${y0 + 92} L${x0 + 6} ${y0 + 90}z M${x0 + 6} ${y0 + 112} L${x0 + 28} ${y0 + 113} L${x0 + 28} ${y1 - 30} L${x0 + 6} ${y1 - 24}z`, 'none', ' stroke="#000" stroke-opacity=".18" stroke-width="2"');
  g += ci(x0 + 29, y0 + 106, 3.6, '#d9b45a') + ci(x0 - 3, y0 + 30, 2, '#9a9a9a') + ci(x0 - 3, y1 - 30, 2, '#9a9a9a');
  // a nameplate by the door and a light switch, like a dorm hallway
  g += rc(x1 + 16, y0 + 40, 26, 18, tag, 2) + ln(x1 + 20, y0 + 47, x1 + 38, y0 + 47, '#555', 1.2) + ln(x1 + 20, y0 + 52, x1 + 34, y0 + 52, '#555', 1.2);
  g += rc(x1 + 20, y0 + 92, 11, 18, '#f4f1ea', 2) + rc(x1 + 24, y0 + 96, 3, 9, '#cfc8bb', 1) + '</g>';
  if (night) g += rc(0, 0, 300, 300, '#0b0b1a', 0, ' opacity=".18"');
  return g;
}

/* ---- putting a picture together ---- */
function scPalette(h, r){
  return {a1: scH(h, 65, 55), a2: scH(h + 40, 45, 42), a3: scH(h - 50, 55, 72), wall: scH(h + 15, 22, 80), couch: scH(h + 160, 25, 45),
    pet: scPick(r, ['#e8b57a', '#8a8a8a', '#2c2c2c', '#f4f1ea', '#c97b4a', '#d9c3a0']), scr: scPick(r, ['#cfe3ff', '#e8f0ff', '#d9f2e3', '#fff3d6'])};
}
// lay props along a surface at height y; returns svg (front view)
function scPropsFront(keys, c, r, y, scale, x0 = 20, x1 = 280){
  let x = x0 + scR(r, 0, 20), g = '';
  for (const k of keys){ const P = SC.PROP[k]; if (!P) continue; const w = P.w * scale; if (x + w > x1) break;
    g += `<g class="ol" transform="translate(${x.toFixed(1)} ${y + scR(r, 2, 14).toFixed(1) * 1}) scale(${scale})">${P.d(c)}</g>`; x += w + scR(r, 6, 22); }
  return g;
}
function scSticky(text, x, y, rot, size = 52){
  return `<g transform="rotate(${rot} ${x + size / 2} ${y + size / 2})">${rc(x, y, size, size, '#f9e27a', 1)}<text x="${x + size / 2}" y="${y + size * .58}" font-size="${Math.min(13, size * 1.6 / Math.max(4, text.length))}" text-anchor="middle" fill="#3b3218" font-family="ui-sans-serif,system-ui" font-weight="600">${esc(text)}</text></g>`;
}
// straight-on scene: wall, window, furniture, surface, props
function scFront(S, c, L, r, id, withProps = true){
  const set = SC.SETTING[S.set], fy = 205;
  let g = '';
  if (set.k === 'out'){
    g += scView(set.win, L, id, r, 0, 0, 300, 215);
    g += scFx(L, r, [0, 0, 300, 215]);
  } else {
    g += scWall(set.wall, c, L);
    if (set.win !== 'none'){
      const wx = set.k === 'veh' ? 30 : 70, wy = set.k === 'veh' ? 30 : 34, ww = set.k === 'veh' ? 240 : 160, wh = set.k === 'veh' ? 120 : 112;
      g += `<g>${set.k === 'veh' ? `<clipPath id="${id}w"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="28"/></clipPath><g clip-path="url(#${id}w)">` : '<g>'}${scView(set.win, L, id, r, wx, wy, ww, wh)}${scFx(L, r, [wx, wy, ww, wh])}</g></g>`;
      if (set.k !== 'veh') g += rc(wx - 5, wy - 5, ww + 10, wh + 10, 'none', 3, ' stroke="#f1efe8" stroke-width="7"') + ln(wx + ww / 2, wy, wx + ww / 2, wy + wh, '#f1efe8', 4);
      else g += rc(wx, wy, ww, wh, 'none', 28, ' stroke="#1f1f1f" stroke-width="8"');
    }
  }
  set.dec.forEach((d, k) => { const f = SC.DEC[d]; if (f) g += `<g class="ol">${f(c, k ? 190 : 20, fy, L, S.cls)}</g>`; });
  if (S.season && set.k !== 'veh') g += `<g class="ol" transform="translate(${set.k === 'out' ? 30 : 230} ${fy}) scale(1.1)">${SC.SDEC[S.season](c)}</g>`;
  g += scSurface(set.surf, c, fy);
  if (withProps){
    g += scPropsFront(S.props, c, r, fy + 52, 1.25);
    if (S.cls && !['whiteboard', 'chalkboard'].some(d => set.dec.includes(d))) g += scSticky(S.cls, 205 + scR(r, -10, 30), fy + 10, scR(r, -8, 8), 56);
  }
  return g;
}
function scTop(S, c, L, r, id){
  const set = SC.SETTING[S.set], surf = {bed: c.a2, couch: c.couch, floor: '#b98e5c', grass: '#6aa35c', sand: '#ead6a6', dock: '#a0754c', lab: '#2f3640', lap: '#3c4a5c', tray: '#bdbdbd', booth: '#a83232', table: '#a5764a', counter: '#d9d4c7', tub: '#f4f4f4'}[set.surf] || '#8a5a33';
  let g = rc(0, 0, 300, 300, surf, 0);
  if (['table', 'desk', 'bench', 'dock', 'floor'].includes(set.surf)) for (let x = 0; x < 300; x += 38) g += ln(x, 0, x + 6, 300, '#000', 1.5, ' opacity=".08"');
  if (set.surf === 'bed') g += pa('M0 60 q150 -30 300 10 M0 220 q150 30 300 -10', 'none', ' stroke="#fff" stroke-width="5" opacity=".2"');
  const slots = [[25, 30], [150, 20], [40, 160], [170, 150], [110, 90], [220, 220], [20, 235], [230, 70]].sort(() => r() - .5);
  let k = 0;
  for (const p of S.props){ const P = SC.PROP[p]; if (!P || !P.top) continue; const [x, y] = slots[k++ % slots.length]; g += `<g class="ol" transform="translate(${x} ${y}) scale(1.7) rotate(${scR(r, -18, 18).toFixed(0)} 15 15)">${P.top(c)}</g>`; }
  if (S.cls) g += scSticky(S.cls, slots[k % slots.length][0], slots[k % slots.length][1], scR(r, -12, 12), 66);
  return g;
}
// an open hand seen from the back, fingers pointing `ang` (radians); used where a hand covers the face
function scFlatHand(x, y, s, col, ang = -Math.PI / 2){
  const ca = Math.cos(ang), sa = Math.sin(ang), P = (u, v) => [x + u * ca - v * sa, y + u * sa + v * ca].map(n => n.toFixed(1)).join(' ');
  let g = `<path d="M${P(-s * .1, -s * .38)} L${P(s * .25, -s * .38)} Q${P(s * .35, 0)} ${P(s * .25, s * .38)} L${P(-s * .1, s * .38)} Q${P(-s * .3, 0)} ${P(-s * .1, -s * .38)}z" fill="${col}"/>`;
  [-.27, -.09, .09, .27].forEach((v, k) => { const len = s * [.45, .55, .55, .48][k]; g += `<line x1="${P(s * .2, v * s * .9).replace(' ', '" y1="')}" x2="${P(s * .2 + len, v * s * .95).replace(' ', '" y2="')}" stroke="${col}" stroke-width="${(s * .17).toFixed(1)}" stroke-linecap="round"/>`; });
  return g;
}
function scPerson(S, c, L, r){
  const look = S.look, pose = S.pose, e = S.expr, hand = scHandOk(S.pose, S.hand) ? S.hand : 'none';
  let cx = 150, cy = 140, s = 62, tilt = 0, bodyW = null, top = null, bot = 300, g = '', front = '';
  const P = {high: () => { s = 70; cy = 150; bodyW = 165; }, low: () => { s = 54; cy = 122; bodyW = 200; }, mirror: () => { s = 50; cy = 115; },
    bedtop: () => { s = 64; cy = 135; bodyW = 180; }, half: () => { cx = 40; cy = 165; s = 92; bodyW = 230; }, books: () => { cx = 165; cy = 150; tilt = -14; s = 58; },
    chin: () => {}, slump: () => { cy = 205; tilt = 18; s = 60; top = 270; }, stretch: () => { cy = 150; s = 56; }, blanket: () => { s = 58; cy = 145; }, cross: () => { s = 34; cy = 118; bodyW = 94; bot = 228; },
    friend: () => { cx = 125; }, petarms: () => { cy = 125; s = 56; }, petbomb: () => {}, point: () => { cx = 110; s = 56; }, arm: () => {}};
  (P[pose] || P.arm)();
  if (top == null) top = cy + s * 1.32;
  if (bodyW == null) bodyW = s * 3.05;   // shoulders about three heads wide, not four
  // arms: sleeves from the shoulders (with an outline so they don't blend into the shirt), hands on the end
  const sw = s * .37, hs = s * .42, used = new Set(), ends = [];
  // hands are drawn in an upper-case copy of the skin color: the same color, but it keeps its outline (the face and neck don't)
  const HS = look.skin.toUpperCase(), LH = {...look, skin: HS};
  const sleeve = d => `<path d="${d}" fill="none" stroke="rgba(20,16,12,.7)" stroke-width="${(sw + 2.8).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${look.outfit}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const sh = side => [cx + side * bodyW * .33, top + Math.min((bot - top) * .2, 26) + sw * .6 + 2];   // tucked just inside the shoulder, so the arm never pokes out above it   // the arm starts at the shoulder itself
  const f1 = v => v.toFixed(1);
  const arm = (side, x, y, ex, ey) => { used.add(side); const [a, b] = sh(side); ends.push(ex == null ? [a, b, x, y] : [ex, ey, x, y]); return sleeve(ex == null ? `M${f1(a)} ${f1(b)} L${f1(x)} ${f1(y)}` : `M${f1(a)} ${f1(b)} L${f1(ex)} ${f1(ey)} L${f1(x)} ${f1(y)}`) + ci(a, b, sw / 2 + 1.8, look.outfit, ' opacity="1"'); };   // no outline where the arm meets the shoulder, so it joins the body
  const fist = (x, y, k = 1) => ci(x, y, hs * .48 * k, HS);
  if (pose === 'bedtop') g += `<ellipse cx="${cx}" cy="${cy + 10}" rx="125" ry="72" fill="#f4f1ea"/>` + scHairBack(look, cx, cy, s * 1.1);
  if (pose === 'friend'){ const f = scLook(S.seed + 7); g += scBody(f, 255, 222, 150) + scHead(f, 262, 150, 50, scPick(r, ['laugh', 'tongue', 'grin', 'wink']), 10, 222); }
  if (pose === 'cross'){
    // sitting cross-legged, seen from the front: two thighs running out from the hips to the knees, the shins folded across in
    // front (the right one over the left), a shoe at the end of each. All of it starts under the shirt's hem, so it's one body.
    const pc = look.pants || '#3c4a5c', lw = 34, d0 = 'rgba(20,16,12,.78)';
    const limb = d => `<path d="${d}" fill="none" stroke="${d0}" stroke-width="${lw + 3}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${pc}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const kL = [cx - 60, bot], kR = [cx + 60, bot];
    g += `<ellipse cx="${cx}" cy="${bot - 2}" rx="${bodyW * .43 + 4}" ry="20" fill="${pc}" opacity="1"/>`;                                       // the seat of the pants
    g += limb(`M${cx - 26} ${bot - 8} Q${cx - 50} ${bot - 10} ${kL[0]} ${kL[1]}`) + limb(`M${cx + 26} ${bot - 8} Q${cx + 50} ${bot - 10} ${kR[0]} ${kR[1]}`);   // thighs out to the knees
    g += limb(`M${kL[0]} ${kL[1]} Q${cx - 30} ${bot + 24} ${cx + 22} ${bot + 18}`) + `<ellipse cx="${cx + 34}" cy="${bot + 17}" rx="14" ry="8" fill="#2f3236"/>`;   // left shin, tucked under
    g += limb(`M${kR[0]} ${kR[1]} Q${cx + 30} ${bot + 30} ${cx - 22} ${bot + 24}`) + `<ellipse cx="${cx - 34}" cy="${bot + 23}" rx="14" ry="8" fill="#2f3236"/>${rc(cx - 48, bot + 26, 26, 3, '#d8d2c4', 1.5, ' opacity="1"')}`;   // right shin over it
  }


  g += scBody(look, cx, top, bodyW, pose === 'cross' ? bot - 18 : bot);   // sitting cross-legged, the shirt ends at the lap

  if (pose === 'bedtop') g += arm(-1, cx - s * 2.2, -20, cx - s * 1.5, top - s * .2) + pa(`M-10 ${f1(top + 34)} q160 -34 320 0 V310 H-10z`, c.a3) + pa(`M-10 ${f1(top + 34)} q160 -34 320 0`, 'none', ` stroke="#fff" stroke-width="6" opacity=".5"`);
  if (pose === 'blanket') g += pa(`M${cx - 120} 300 q-10 -160 120 -${300 - cy + s * 1.35} q130 ${10} 120 ${300 - cy + s * 1.35}z`, c.a3);
  g += scHead(look, cx, cy, s, e, tilt, top);
  if (pose === 'blanket') g += pa(`M${cx - s * 1.25} ${cy + s * .9} q-6 ${-s * 1.9} ${s * 1.25} ${-s * 2.1} q${s * 1.35} ${s * .2} ${s * 1.25} ${s * 2.1}`, 'none', ` stroke="${c.a3}" stroke-width="${s * .5}"`);
  // the arm holding the phone for a selfie reaches out of the frame
  if (pose === 'arm' || pose === 'low') front += arm(-1, cx - s * 2.6, 330);
  if (pose === 'high') front += arm(-1, -20, top - s * .9);
  // poses that use hands
  if (pose === 'chin'){ const hy = cy + s * 1.38; front += arm(-1, cx - hs * .2, hy + hs * .3, cx - s * .95, cy + s * 2.45) + arm(1, cx + hs * .2, hy + hs * .3, cx + s * .95, cy + s * 2.45) + scHand('pray', LH, cx, hy, hs * 1.1, c); }
  if (pose === 'stretch') [-1, 1].forEach(d => { front += arm(d, cx + d * s * 1.45, cy - s * 1.4, cx + d * s * 1.55, cy + s * .2) + fist(cx + d * s * 1.45, cy - s * 1.55); });
  if (pose === 'books') front += `<g transform="translate(20 ${cy + s * .9}) scale(2.2)">${SC.PROP.books.d(c)}</g>`;
  if (pose === 'slump') front += pa('M20 300 L60 255 H250 L280 300z', '#4a4a4a');
  if (pose === 'petarms' || pose === 'petbomb'){ const px = pose === 'petarms' ? cx - 40 : 196, py = pose === 'petarms' ? 300 : 316, sc = pose === 'petarms' ? 2.4 : 2.3; front += `<g transform="translate(${px} ${py}) scale(${sc})">${SC.PROP[r() < .5 ? 'cat' : 'dog'].d(c)}</g>`; }
  if (pose === 'petarms') front += arm(-1, cx - 40, 272, cx - s * 1.45, top + s * .9) + fist(cx - 40, 272) + arm(1, cx + 44, 266, cx + s * 1.45, top + s * .9) + fist(cx + 44, 266);
  if (pose === 'mirror'){ const py = cy + s * 1.5; front += arm(1, cx + 20, py + 44, cx + s * 1.25, py + 80) + rc(cx - 22, py, 44, 74, '#1f1f1f', 7) + rc(cx + 10, py + 30, hs * .9, hs * 1.1, HS, hs * .3); }
  if (pose === 'point') front += arm(1, 255, cy - s * .3, cx + s * 1.5, cy + s * 1.5) + ln(255, cy - s * .3, 285, cy - s * .75, look.skin, s * .16) + fist(255, cy - s * .3, .9);
  // the gesture: one hand on the free side, or both
  const side = used.has(1) ? -1 : 1, hx = side > 0 ? Math.min(268, cx + s * 1.35) : Math.max(32, cx - s * 1.35), hy = cy + s * .95;
  if (hand === 'facepalm') front += arm(side, cx + side * s * .45, cy - s * .2, cx + side * s * 1.35, cy + s * 2) + scHand('_flat', LH, cx + side * s * .4, cy - s * .3, s * .7, c, Math.atan2(-.25, -side));
  else if (hand === 'mouth') front += arm(side, cx + side * s * .35, cy + s * .62, cx + side * s * 1.3, cy + s * 2.2) + scHand('_flat', LH, cx + side * s * .3, cy + s * .48, s * .55, c, Math.atan2(-.15, -side));
  else if (hand === 'cheeks') [-1, 1].forEach(d => { front += arm(d, cx + d * s * .92, cy + s * .62, cx + d * s * 1.45, cy + s * 2.1) + scHand('_flat', LH, cx + d * s * .9, cy + s * .45, s * .48, c, -Math.PI / 2 - d * .15); });
  else if (hand === 'pray'){ const py = cy + s * 1.75; front += arm(-1, cx - hs * .2, py + hs * .3, cx - s * .95, cy + s * 2.6) + arm(1, cx + hs * .2, py + hs * .3, cx + s * .95, cy + s * 2.6) + scHand('pray', LH, cx, py, hs * 1.1, c); }
  else if (hand === 'shrug') [-1, 1].forEach(d => { const x = cx + d * s * 1.6, y = cy + s * 1.3; front += arm(d, x, y + hs * .25, cx + d * s * 1.4, cy + s * 2.15) + `<g transform="rotate(${d * 20} ${f1(x)} ${f1(y)})">${rc(x - hs * .5, y - hs * .3, hs, hs * .6, HS, hs * .25)}${ln(x + d * hs * .45, y - hs * .1, x + d * hs * .7, y - hs * .55, look.skin, hs * .26)}</g>`; });
  else if (hand === 'help'){ const y = cy + s * 2.3, k = hs * 1.4; front += arm(-1, cx - k * 1.4, y, cx - s * 1.3, y + s * .5) + arm(1, cx + k * 1.4, y, cx + s * 1.3, y + s * .5) + scHand('help', LH, cx, y, k, c); }
  else if (hand === 'flex'){ const [a0, b0] = sh(side), ex = cx + side * s * 1.75, ey = cy + s * 1.45, fx = cx + side * s * 1.55, fy = cy + s * .5;
    front += arm(side, fx, fy + hs * .3, ex, ey)  + fist(fx, fy, 1.05); }
  else if (hand !== 'none') front += arm(side, hx, hy + hs * .55, cx + side * s * 1.5, cy + s * 2.1) + scHand(hand, LH, hx, hy, hs * 1.15, c);
  // sitting cross-legged: free hands rest on the knees
  if (pose === 'cross') [-1, 1].forEach(d => { if (!used.has(d)) front += arm(d, cx + d * 58, bot - 8, cx + d * 46, top + 34) + fist(cx + d * 58, bot - 8, .8); });   // hands resting on the knees   // hands resting on the knees
  // skin (face, ears, neck, hands, arms) has no outline, only hair, clothes and things do
  const skins = [look.skin]; if (pose === 'friend') skins.push(scLook(S.seed + 7).skin);
  const cuffs = ends.map(([x0, y0, x, y]) => { const dx = x - x0, dy = y - y0, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, a0 = Math.min(hs * .95, l * .5);
    return `<path d="M${f1(x - ux * a0)} ${f1(y - uy * a0)} L${f1(x - ux * hs * .22)} ${f1(y - uy * hs * .22)}" fill="none" stroke="${look.outfit}" stroke-width="${f1(sw - 1)}" stroke-linecap="butt"/>`; }).join('');
  let out = g + front + cuffs; skins.forEach(k => { out = out.split(`fill="${k}"`).join(`fill="${k}" stroke="none"`); });
  return `<g class="ol">${out}</g>`;
}
function sceneSvg(S, uid){
  if (S.angle === 'door') S = {...S, angle: 'front'};   // retired angle
  const id = 'sc' + (uid || S.seed).toString(36), r = mulberry32(S.seed ^ 0x51ab), L = SC.LIGHT[S.light], c = scPalette(S.hue, mulberry32(S.seed + 3));
  let body = '';
  const amb = L.ao ? rc(0, 0, 300, 300, L.amb, 0, ` opacity="${L.ao}"`) : '';
  const inside = SC.SETTING[S.set].k === 'in', lampGlow = L.lamp && inside && S.angle !== 'top' ? `<radialGradient id="${id}g"><stop offset="0" stop-color="#ffd27a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient><circle cx="${scR(r, 60, 240).toFixed(0)}" cy="220" r="150" fill="url(#${id}g)"/>` : '';
  const glow = L.glow && inside ? `<radialGradient id="${id}q"><stop offset="0" stop-color="#9ec5ff" stop-opacity=".4"/><stop offset="1" stop-color="#9ec5ff" stop-opacity="0"/></radialGradient><circle cx="150" cy="230" r="170" fill="url(#${id}q)"/>` : '';
  const candle = L.candle && inside ? `<radialGradient id="${id}c"><stop offset="0" stop-color="#ffb347" stop-opacity=".5"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient><circle cx="80" cy="240" r="130" fill="url(#${id}c)"/>` + `<g class="ol" transform="translate(70 262) scale(1.4)">${SC.PROP.candle.d(c)}</g>` : '';
  const light = amb + lampGlow + glow + candle;
  switch (S.angle){
    case 'top': body = scTop(S, c, L, r, id) + amb; break;
    case 'close': body = `<g transform="translate(-180 -330) scale(2.1)">${scFront(S, c, L, r, id)}</g>` + light; break;
    case 'wide': body = rc(0, 0, 300, 300, '#b98e5c', 0) + `<g transform="translate(40 18) scale(.73)">${scFront(S, c, L, r, id)}</g>` + rc(0, 236, 300, 64, '#b98e5c', 0) + rc(20, 250, 120, 40, c.a3, 8, ' opacity=".7"') + light; break;
    case 'door': body = scFront(S, c, L, r, id) + light; break;   // the doorway shot was retired; old posts that had it show straight on
    case 'shoulder': body = scFront(S, c, L, r, id) + light + (typeof sc2BackHead === 'function' ? sc2BackHead(S.look, 80, 188, 50) : `<g class="ol">${scHairBack(S.look, 70, 250, 70) + ci(70, 250, 66, S.look.hair)}</g>`); break;
    case 'selfie': body = ((typeof sc2SelfieBack === 'function' && sc2SelfieBack(S, c, L, r, id)) || `<g transform="translate(-30 -60) scale(1.2)">${scFront(S, c, L, r, id, false)}</g>`) + rc(0, 0, 300, 300, '#fff', 0, ' opacity=".12"') + light + scPerson(S, c, L, r) + (typeof sc2SelfieFront === 'function' ? sc2SelfieFront(S, c, L) : ''); break;
    default: body = scFront(S, c, L, r, id) + light;
  }
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" class="scene" role="img" aria-label="${esc(sceneDesc(S))}"><defs>${scSky(L, id).replace(/<\/?defs>/g, '')}</defs>${body}</svg>`;
}

/* ---- choosing a picture ---- */
const SC_TAG_OK = {lab: ['chem', 'bio', 'che', 'pharm', 'vet', 'nurse'], cs: ['cs', 'it', 'ece', 'math'], art: ['design', 'arts'], music: ['arts'], ath: ['kin'], ag: ['ag', 'vet', 'env'], med: ['nurse', 'pharm', 'bio', 'kin']};
const SC_GROUP_OK = {lab: ['chem', 'bio', 'che', 'pharm', 'vet'], med: ['nurse', 'pharm', 'bio', 'kin', 'vet'], art: ['design', 'arts'], music: ['arts'], sport: ['kin']};
const SC_COMMON = ['dorm', 'dorm', 'library', 'library', 'cafe', 'apt', 'bed', 'kitchen', 'studyroom', 'dorm2', 'livingroom', 'library2', 'cafe2', 'floor'];
const SC_NIGHT_OUT = ['rooftop', 'balcony', 'porch', 'observatory', 'planetarium', 'parkinglot', 'courtyard', 'quad', 'bench', 'lake', 'beach', 'stadium', 'busstop'];
const SC_NOPROPS = ['bus'];
const SC_MAXPROPS = {car: 2, gascar: 2, plane: 4, train: 4};   // only so much fits on a tray, a little table or a car seat   // places where nothing is set down (you're holding on in a moving bus)
// which selfie poses make sense where: lying in bed needs a bed, cross-legged needs a floor or the ground, slumping needs a desk,
// a mirror needs to be indoors, and nobody brings a pet onto a bus
const SC_BEDS = ['dorm', 'dorm2', 'apt', 'bed', 'hostelbunk', 'hotel', 'frat', 'tent', 'treehouse'];
const SC_FLOORS = ['floor', 'quad', 'beach', 'tent'];   // places where you're actually sitting on the floor, a blanket or a towel (not a bench, table or couch)
function scPoseOk(set, k){
  const st = SC.SETTING[set], veh = st.k === 'veh', surf = (typeof SC2_SURF !== 'undefined' && SC2_SURF[set]) || st.surf;
  if (k === 'bedtop') return SC_BEDS.includes(set);
  if (k === 'cross') return SC_FLOORS.includes(set);
  if (k === 'slump' || k === 'books') return ['desk', 'table', 'counter', 'lab', 'booth', 'cafetable', 'carrel', 'workbench', 'worktable', 'longtable', 'flipdesk'].includes(surf) && !veh;
  if (k === 'mirror') return st.k === 'in';
  if (k === 'petarms' || k === 'petbomb') return !veh && !['lab', 'biolab', 'complab', 'hospital', 'clinic', 'lecture', 'classroom', 'library', 'library2', 'stacks', 'carrel', 'studyroom', 'museum', 'chapel', 'gym', 'pool', 'icearena'].includes(set);
  if (k === 'blanket' || k === 'stretch') return !['bus', 'car', 'gascar'].includes(set);
  return true;
}
const SC_DARK_LIGHTS = ['lamp', 'screen', 'am3', 'outage'];
const SC_PRIVATE = ['dorm', 'dorm2', 'apt', 'kitchen', 'parents', 'livingroom', 'bed', 'floor', 'carrel', 'office', 'basement', 'attic', 'barnoffice', 'hotel', 'tent', 'treehouse', 'bathtub', 'closet', 'hostelbunk', 'frat', 'studyroom'];
function lightFor(r, hour, month){
  const tt = hour >= 22 || hour < 5 ? 'n' : hour < 10 ? 'm' : hour < 17 ? 'd' : 'e';
  const cold = [10, 11, 0, 1, 2].includes(month), hot = [5, 6, 7].includes(month);
  const ok = SC.LIGHT_KEYS.filter(k => { const L = SC.LIGHT[k]; if (L.w === 'snow' && !cold) return false; if (L.w === 'hot' && !hot) return false; return L.t === tt || (L.t === 'any' && r() < .5); });
  return scPick(r, ok.length ? ok : ['lamp']);
}
// ctx: {seed, hue, maj, hour, month, look, outgoing, mood ('win' | 'exam' | 'tired' | ''), want: {set, light, angle, props, season, expr, pose, hand}}
function sceneSpec(ctx){
  const r = mulberry32((ctx.seed >>> 0) ^ 0x9e37), w = ctx.want || {}, maj = ctx.maj || 'math';
  let light = w.light || lightFor(r, ctx.hour, ctx.month), L = SC.LIGHT[light];
  // where
  let set = w.set;
  if (!set){
    const pool = SC.SETTING_KEYS.filter(k => { const s = SC.SETTING[k]; if (s.tag !== 'all' && !(SC_TAG_OK[s.tag] || []).includes(maj) && r() > .08) return false;
      if (s.k === 'out' && (L.w === 'rain' || L.w === 'snow')) return false; if (s.k === 'out' && L.t === 'n' && !SC_NIGHT_OUT.includes(k)) return false; return true; });
    set = r() < .45 ? scPick(r, SC_COMMON.filter(k => pool.includes(k)).concat(pool.slice(0, 1))) : scPick(r, pool);
  }
  // dark-room lighting (desk lamp only, screen glow, 3 AM, candlelight) only happens somewhere private; public places keep their lights on at night
  if (!w.light && SC_DARK_LIGHTS.includes(light) && SC.SETTING[set].k === 'in' && !SC_PRIVATE.includes(set)) light = 'nightlit';
  if (!w.light && (SC_DARK_LIGHTS.includes(light) || light === 'nightlit') && SC.SETTING[set].k === 'out') light = 'clearnight';
  if (!w.light && light === 'clearnight' && SC.SETTING[set].k !== 'out') light = 'nightlit';
  if (!w.light && ['lamp', 'am3', 'outage', 'screen'].includes(light) && SC.SETTING[set].k === 'veh') light = 'nightlit';
  if (!w.light && light === 'screen' && SC.SETTING[set].k === 'out') light = 'clearnight';
  // how
  let angle = w.angle || (() => { const wts = {front: 30, top: 22, close: 12, shoulder: 8, wide: 8, selfie: ctx.outgoing ? 20 : 8}; let x = r() * Object.values(wts).reduce((a, b) => a + b, 0); for (const [k, v] of Object.entries(wts)){ x -= v; if (x < 0) return k; } return 'front'; })();
  // a doorway shot only makes sense indoors; nobody shoots a car or a bus from above
  if (!w.angle && angle === 'door' && SC.SETTING[set].k !== 'in') angle = 'front';
  if (!w.angle && (angle === 'top' || angle === 'close' || angle === 'shoulder') && ['car', 'gascar', 'bus'].includes(set)) angle = 'front';
  if (!w.angle && angle === 'wide' && SC.SETTING[set].k === 'veh') angle = 'front';
  // what's around
  let props = w.props;
  if (!props){
    const ban = SC.PROP_BAN[set] || [], okp = k => !ban.includes(k) && (angle !== 'top' || SC.PROP[k].top);
    const by = g => SC.PROP_KEYS.filter(k => SC.PROP[k].g === g && okp(k));
    const take = (g, n = 1) => { const a = by(g); for (let i = 0; i < n && a.length; i++) props.push(a.splice(Math.floor(r() * a.length), 1)[0]); };
    props = [];
    take('study', 1 + Math.floor(r() * 2)); take('drink'); if (r() < .7) take('tech'); if (r() < .5) take('decor'); if (r() < .4) take('food');
    const special = Object.keys(SC_GROUP_OK).find(g => SC_GROUP_OK[g].includes(maj)); if (special && r() < .6) take(special);
    if (r() < .15) take('pet'); if (r() < .12) take('misc');
    props = [...new Set(props)].sort(() => r() - .5).slice(0, 6);
  }
  if (SC_NOPROPS.includes(set)) props = [];
  if (SC_MAXPROPS[set]) props = props.slice(0, SC_MAXPROPS[set]);
  const season = w.season !== undefined ? w.season : (() => { const ss = Object.keys(SC.SEASON).filter(k => SC.SEASON[k].mo.includes(ctx.month)); return ss.length && r() < .35 ? scPick(r, ss) : null; })();
  const cls = w.cls !== undefined ? w.cls : (r() < .7 ? scClass(r, maj) : '');
  // who, for selfies
  const mood = ctx.mood || (L.t === 'n' ? 'tired' : '');
  const EXP = {win: ['proud', 'grin', 'laugh', 'smirk', 'smile'], exam: ['panic', 'fakecry', 'grimace', 'fine', 'sweat', 'locked'], tired: ['sleepy', 'yawn', 'dead', 'melt', 'fine', 'soft']}[mood];
  const expr = w.expr || (EXP && r() < .7 ? scPick(r, EXP) : scPick(r, SC.EXPR_KEYS));
  const HND = {win: ['flex', 'guns', 'peace', 'thumbup'], exam: ['pray', 'help', 'facepalm', 'cheeks'], tired: ['coffee', 'energy', 'none', 'facepalm']}[mood];
  let hand = w.hand || (HND && r() < .6 ? scPick(r, HND) : (r() < .3 ? 'none' : scPick(r, SC.HAND_KEYS)));
  const pose = w.pose || scPick(r, SC.POSE_KEYS.filter(k => scPoseOk(set, k)));
  if (!scHandOk(pose, hand)) hand = 'none';
  return {seed: ctx.seed >>> 0, hue: ctx.hue || 0, maj, set, light, angle, props, season, cls, look: ctx.look || scLook(ctx.seed), expr, pose, hand};
}
// plain words for the players writing captions and comments
function sceneDesc(S){
  if (S.angle === 'door') S = {...S, angle: 'front'};
  const set = SC.SETTING[S.set], L = SC.LIGHT[S.light], list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const props = SC_NOPROPS.includes(S.set) ? [] : S.props.map(k => SC.PROP[k] && SC.PROP[k].n).filter(Boolean);
  let d = S.angle === 'selfie' ? `A selfie ${SC.POSE[S.pose]}. They're ${SC.EXPR[S.expr]}${SC.HAND[S.hand] && scHandOk(S.pose, S.hand) ? `, ${SC.HAND[S.hand]}` : ''}.` : `A photo taken ${SC.ANGLE[S.angle] === 'straight on' ? 'straight on' : SC.ANGLE[S.angle].replace(/^a /, 'as a ')}.`;
  d += ` Setting: ${set.n}, ${L.n}.`;
  if (props.length && S.angle !== 'selfie') d += ` In the picture: ${list(props)}.`;
  const sc2Drawn = typeof SC2_OUT !== 'undefined' && (SC2_OUT[S.set] || SC2_BACK[S.set]) && ['front', 'close', 'shoulder', 'selfie'].includes(S.angle);   // the new outdoor and vehicle pictures have no sticky note or season decor
  if (S.cls && S.angle !== 'selfie' && !sc2Drawn) d += ` A note says "${S.cls}".`;
  const bk = typeof SC2_BOARDS !== 'undefined' && SC2_BOARDS[S.set]; const bw = Array.isArray(S.board) && S.board.length ? S.board : S.cls ? [S.cls] : null; if (bk && bw && S.angle !== 'selfie') d += ` The ${bk} says "${bw.join(' / ')}".`;
  if (S.season && !sc2Drawn) d += ` Also ${SC.SEASON[S.season].n}.`;
  if (typeof sc2Extra === 'function') d += sc2Extra(S);
  return d;
}
