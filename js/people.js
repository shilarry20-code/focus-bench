/* ---------- who the players are: majors, class schedules and usernames ----------
   Every player has a major. Each semester they take 4–6 classes: 2–3 from their major, 1–2 from related
   majors, and sometimes a gen-ed. STEM majors also pull from the shared foundation (calc, physics, chem).
   Usernames mix the styles you see on real platforms (real-name handles, aesthetic lowercase, jokes,
   default-looking ones, major puns, gamer tags, nicknames, a few old-school ones), from big name pools
   (js/names.js) weighted so common names show up more without any one name taking over.
   Everything is worked out from each player's seed, so nothing here is stored. */

// class kinds decide the task names: L language, W reading/writing, B lab science, C code, D studio/design; none = problem sets
const MAJORS = [
  {k: 'cs', n: 'Computer science', w: 9, stem: 1, rel: ['math', 'it', 'eng'], c: 'Data structures:C|Discrete math|Algorithms|Systems programming:C|Databases:C|Computer architecture|Operating systems:C|Machine learning:C|Software engineering:C|Compilers:C|Computer graphics:C|Artificial intelligence:C|Human-computer interaction:D|Theory of computation',
    t: 'segfault nullptr recursion bigO kernel stackoverflow sudo regex gitpush compiler bytecode async lambda bitflip'},
  {k: 'eng', n: 'Mechanical engineering', w: 7, stem: 1, rel: ['math', 'phys', 'aero', 'ie'], c: 'Thermodynamics|Statics|Dynamics|Fluid mechanics|Materials science:B|Mechanical design:D|Heat transfer|Controls|Mechanics of materials|Engineering economics',
    t: 'torque statics gearbox piston flywheel bolt cad.monkey freebody stress.strain thermo'},
  {k: 'ece', n: 'Electrical engineering', w: 5, stem: 1, rel: ['math', 'phys', 'cs'], c: 'Circuits:B|Signals and systems|Electronics:B|Digital logic|Electromagnetics|Microcontrollers:C|Power systems',
    t: 'ohm capacitor resistor voltage diode transistor fourier op.amp breadboard'},
  {k: 'aero', n: 'Aerospace engineering', w: 4, stem: 1, rel: ['eng', 'math', 'phys'], c: 'Aerodynamics|Propulsion|Orbital mechanics|Flight structures|Aircraft design:D|Spacecraft design',
    t: 'thrustvector machnumber liftoff orbit delta.v apogee jetwash'},
  {k: 'civil', n: 'Civil engineering', w: 3, stem: 1, rel: ['eng', 'math', 'env'], c: 'Structural analysis|Soil mechanics:B|Transportation engineering|Surveying|Construction management|Concrete design',
    t: 'rebar beam.me.up concrete surveyor bridgebuilder'},
  {k: 'che', n: 'Chemical engineering', w: 3, stem: 1, rel: ['chem', 'math', 'eng'], c: 'Mass transfer|Reaction engineering|Process design:D|Separations|Chemical thermodynamics',
    t: 'reactor molarflow distill catalyst batchreactor'},
  {k: 'ie', n: 'Industrial engineering', w: 3, stem: 1, rel: ['math', 'biz', 'eng'], c: 'Operations research|Quality control|Ergonomics|Manufacturing systems|Supply chain engineering|Simulation:C',
    t: 'sixsigma kaizen leanqueue bottleneck'},
  {k: 'math', n: 'Mathematics', w: 3, stem: 1, rel: ['cs', 'phys', 'econ'], c: 'Calculus III|Linear algebra|Differential equations|Probability|Real analysis:W|Abstract algebra|Numerical methods:C|Combinatorics|Statistics|Regression analysis',
    t: 'eigenvalue integral qed epsilon delta.epsilon lemma sigma derivative'},
  {k: 'phys', n: 'Physics', w: 2, stem: 1, rel: ['math', 'eng', 'chem'], c: 'Physics II:B|Modern physics|Quantum mechanics|Astronomy|Electricity and magnetism|Classical mechanics',
    t: 'quark entropy photon schrodinger darkmatter neutrino'},
  {k: 'chem', n: 'Chemistry', w: 2, stem: 1, rel: ['bio', 'che', 'math'], c: 'Organic chemistry:B|Physical chemistry|Analytical chemistry:B|Inorganic chemistry|Biochem:B',
    t: 'benzene titration mole.cule beaker covalent'},
  {k: 'bio', n: 'Biology (pre-med)', w: 7, stem: 1, rel: ['chem', 'nurse', 'psych'], c: 'Biology:B|Organic chemistry:B|Anatomy:B|Genetics|Biochem:B|Neuroscience|Cell biology:B|Microbiology:B|Physiology|Ecology|Evolution|Immunology|Molecular biology:B',
    t: 'mitochondria premed petridish krebs dna.helix ribosome organelle'},
  {k: 'nurse', n: 'Nursing', w: 5, stem: 1, rel: ['bio', 'psych', 'kin'], c: 'Nursing pharmacology|Pathophysiology|Health assessment:B|Nutrition|Public health:W|Maternal health|Mental health nursing:W',
    t: 'nurse scrubs nightshift.rn stethoscope futureRN carecard'},
  {k: 'pharm', n: 'Pharmacy', w: 2, stem: 1, rel: ['chem', 'bio'], c: 'Pharmacology|Medicinal chemistry:B|Pharmaceutics:B|Pharmacy law:W|Drug interactions',
    t: 'pharmD capsule rx.queen pilltray'},
  {k: 'kin', n: 'Kinesiology', w: 2, stem: 1, rel: ['bio', 'nurse', 'psych'], c: 'Exercise physiology:B|Biomechanics|Motor learning|Sports nutrition|Anatomy:B',
    t: 'gymrat legday deadlift.daily protein.shake'},
  {k: 'vet', n: 'Animal sciences (pre-vet)', w: 2, stem: 1, rel: ['bio', 'ag'], c: 'Animal anatomy:B|Animal physiology|Animal nutrition|Vet microbiology:B|Animal behavior',
    t: 'prevet catvet horsegirl cowcuddler'},
  {k: 'ag', n: 'Agriculture', w: 3, stem: 1, rel: ['bio', 'env', 'econ'], c: 'Agronomy|Soil science:B|Agricultural economics|Horticulture:B|Food science:B|Plant pathology',
    t: 'farmkid cornfield tractor soilnerd harvest'},
  {k: 'env', n: 'Environmental science', w: 2, stem: 1, rel: ['bio', 'ag', 'civil'], c: 'Climate science|Environmental policy:W|Hydrology|Geology:B|Conservation biology',
    t: 'treehugger rainforest carbon.zero glacier'},
  {k: 'it', n: 'Computer and information technology', w: 4, stem: 1, rel: ['cs', 'biz'], c: 'Networking:C|Cybersecurity:C|IT architecture|Web development:C|Data analytics:C|Cloud computing:C|Systems analysis:D|Python programming:C|Database administration:C',
    t: 'packetloss firewall localhost ping404 sysadmin pingpong.tcp'},
  {k: 'aviation', n: 'Aviation', w: 2, stem: 1, rel: ['aero', 'phys', 'biz'], c: 'Flight theory|Aviation weather|Air traffic control|Aircraft systems|Aviation safety:W',
    t: 'cleared4takeoff runway27 tailwind mayday.mayday cockpit'},
  {k: 'biz', n: 'Business', w: 8, rel: ['econ', 'math', 'comm'], c: 'Accounting|Marketing:W|Finance|Business law:W|Management:W|Supply chain|Investments|Corporate finance|Business analytics:C|Entrepreneurship:W|Organizational behavior:W|Intermediate accounting|Auditing',
    t: 'ledger stonks spreadsheet balancesheet hustle debitcredit'},
  {k: 'econ', n: 'Economics', w: 3, rel: ['biz', 'math', 'polisci'], c: 'Microeconomics|Macroeconomics|Econometrics:C|Game theory|Labor economics|Intermediate macro',
    t: 'supplydemand invisiblehand keynes utility.max'},
  {k: 'psych', n: 'Psychology', w: 5, rel: ['bio', 'soc', 'edu'], c: 'Psychology:W|Developmental psych:W|Research methods:W|Abnormal psych:W|Cognitive psych|Social psych:W|Statistics',
    t: 'freudian cognitive dopamine overthinker'},
  {k: 'soc', n: 'Sociology', w: 2, rel: ['psych', 'polisci', 'hum'], c: 'Sociology:W|Criminology:W|Anthropology:W|Research methods:W|Social inequality:W',
    t: 'fieldnotes ethnography sociologist'},
  {k: 'polisci', n: 'Political science', w: 3, rel: ['hist', 'econ', 'comm'], c: 'Political science:W|International relations:W|Constitutional law:W|Comparative politics:W|Public policy:W',
    t: 'prelaw moot.court filibuster caucus'},
  {k: 'hist', n: 'History', w: 2, rel: ['hum', 'polisci'], c: 'World history:W|US history:W|Classics:W|History of science:W|Modern Europe:W',
    t: 'archivist primary.source historian'},
  {k: 'hum', n: 'English', w: 2, rel: ['hist', 'comm', 'lang'], c: 'Literature:W|Creative writing:W|Technical writing:W|Linguistics|Shakespeare:W|Poetry workshop:W',
    t: 'bookworm semicolon footnote ink.blot thesaurus'},
  {k: 'phil', n: 'Philosophy', w: 1, rel: ['hum', 'hist', 'polisci'], c: 'Philosophy:W|Ethics:W|Logic|Religious studies:W|Philosophy of mind:W',
    t: 'existential cogito socratic stoic'},
  {k: 'comm', n: 'Communication', w: 3, rel: ['hum', 'biz', 'design'], c: 'Communication:W|Public speaking:W|Journalism:W|Media studies:W|Public relations:W|Video production:D',
    t: 'onair mic.check headline pressrelease'},
  {k: 'edu', n: 'Education', w: 3, rel: ['psych', 'hum'], c: 'Educational psychology:W|Classroom management:W|Curriculum design:D|Child development:W|Teaching methods:W',
    t: 'futureteacher gradebook redpen'},
  {k: 'design', n: 'Design', w: 3, rel: ['comm', 'cs', 'arts'], c: 'Graphic design:D|Industrial design:D|Architecture:D|UX design:D|Typography:D|Design history:W',
    t: 'kerning pantone wireframe moodboard pixelpusher'},
  {k: 'arts', n: 'Arts', w: 2, rel: ['design', 'hum'], c: 'Music theory|Art history:W|Film studies:W|Studio art:D|Music history:W|Theater:D',
    t: 'treble.clef sketchbook encore paintbrush'},
  {k: 'hosp', n: 'Hospitality and tourism', w: 2, rel: ['biz', 'comm'], c: 'Hospitality management:W|Event planning:D|Food service operations|Tourism:W|Revenue management',
    t: 'checkin roomservice eventplanner'},
  {k: 'lang', n: 'Languages', w: 1, rel: ['hum', 'comm'], c: 'Spanish:L|French:L|Chinese:L|Japanese:L|German:L|Korean:L|Arabic:L|Italian:L|Linguistics',
    t: 'polyglot bonjour.hola duolingo.streak'}
];
const FOUNDATION = 'Calculus I|Calculus II|Calculus III|Physics I:B|Physics II:B|General chemistry:B|Statistics'.split('|');
const GENEDS = 'Spanish:L|French:L|Chinese:L|Japanese:L|German:L|Korean:L|American Sign Language:L|Italian:L|Psychology:W|Sociology:W|Public speaking:W|Ethics:W|World history:W|US history:W|Literature:W|Creative writing:W|Art history:W|Music theory|Film studies:W|Philosophy:W|Microeconomics|Statistics|Nutrition|Astronomy|Climate science|Political science:W|Anthropology:W|Technical writing:W|Communication:W'.split('|');
const CLASS_KIND = new Map(), MAJOR_BY = {};
[...MAJORS.flatMap(m => m.c.split('|')), ...FOUNDATION, ...GENEDS].forEach(x => { const [n, k] = x.split(':'); if (!CLASS_KIND.has(n) || k) CLASS_KIND.set(n, k || ''); });
MAJORS.forEach(m => { m.cls = m.c.split('|').map(x => x.split(':')[0]); m.terms = m.t.split(' '); MAJOR_BY[m.k] = m; });
const FOUND = FOUNDATION.map(x => x.split(':')[0]), GEN = GENEDS.map(x => x.split(':')[0]);
const SUBJECTS = [...CLASS_KIND.keys()];
const MAJ_W = MAJORS.reduce((n, m) => n + m.w, 0);
// one random number in, one major out (weighted, so business and CS are common and philosophy is rare)
function majorAt(u){ let x = u * MAJ_W; for (const m of MAJORS){ x -= m.w; if (x < 0) return m; } return MAJORS[0]; }
const semIndex = d => d.getFullYear() * 3 + (d.getMonth() >= 7 ? 2 : d.getMonth() >= 4 ? 1 : 0);
// a player's classes for the semester holding date d: the first is the one they study most
function scheduleFor(i, maj, d){
  const rr = mulberry32(ROSTER_SEED * 3 + i * 613 + semIndex(d) * 104729), n = 4 + Math.floor(rr() * 3), list = [];
  const add = x => { if (x && !list.includes(x)) list.push(x); };
  const nCore = 2 + (rr() < .5 ? 1 : 0), yr = Math.floor(mulberry32(i * 31 + 5)() * 4);    // year in school: 0 freshman to 3 senior
  for (let t = 0; t < 30 && list.length < nCore; t++) add(maj.cls[Math.floor(Math.pow(rr(), 1.3) * maj.cls.length)]);
  if (maj.stem && yr < 2 && rr() < .8) add(FOUND[Math.floor(rr() * (yr ? FOUND.length : 5))]);   // underclassmen take the basics
  const nRel = 1 + (rr() < .45 ? 1 : 0);
  for (let t = 0; t < 30 && list.length < nCore + nRel + (maj.stem && yr < 2 ? 1 : 0); t++){ const r = MAJOR_BY[maj.rel[Math.floor(rr() * maj.rel.length)]]; add(r.cls[Math.floor(rr() * r.cls.length)]); }
  for (let t = 0; t < 30 && list.length < n; t++) add(rr() < .6 ? GEN[Math.floor(rr() * GEN.length)] : maj.cls[Math.floor(rr() * maj.cls.length)]);
  return list.slice(0, n);
}

/* ---------- usernames ---------- */
const NG = NAME_GROUPS.map(g => ({...g, first: g.first.split(' '), last: g.last.split(' ')})), NG_W = NG.reduce((n, g) => n + g.w, 0);
const zipf = (rnd, a, k = 1.5) => a[Math.floor(Math.pow(rnd(), k) * a.length)];
function nameGroup(rnd){ let x = rnd() * NG_W; for (const g of NG){ x -= g.w; if (x < 0) return g; } return NG[0]; }
const lc = s => s.toLowerCase(), cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const AES_A = 'velvet static moth sunroom quiet linen rainy honey dusk fern cedar lilac lumen opal pale soft ghost paper cloudy salt slow golden hazy glass blue violet tidal petal ember ivory olive plum mint frost low sleepy faded moon starlit wild cherry autumn winter june august saturn lunar coral sage cotton velour amber meadow willow silver indigo misty sundae peach dew rose ocean citrus clover hush tender lazy hollow sunny pastel blush dreamy wispy mossy foggy crimson navy cobalt dusky nectar sorbet lemon strawberry velveteen saltwater windy pine birch spruce maple heather larkspur poppy tulip daisy iris lotus marigold juniper aspen hazel ginger cocoa caramel vanilla cinnamon chai latte espresso porcelain satin chiffon denim corduroy paperback vinyl cassette polaroid sepia neon pixel analog'.split(' ');
const AES_B = 'notes library hours garden room letters tapes window chapter pages diary hum light afternoon archive orbit signal season fields bloom radio motel daydream static club tape cinema hallway lantern rain avenue sketches poems waves studio corner shelf margins postcards porch attic balcony terrace greenhouse bakery bookshop cafe teahouse observatory planetarium meadow orchard harbor lighthouse island tides weather mornings evenings sundays weekdays reverie lullaby melody chorus verse stanza hymn journal sketchbook polaroids films reels stills frames pixels'.split(' ');
const JOKES = 'procrastinator9000 onemorechapter notready4finals ate_the_syllabus crying_in_lab failingorgo 3am_cramming syllabus_ignorer certified_overthinker will_study_for_snacks lowkey_failing barely_passing academic_weapon academic_victim gpa_in_shambles curve_destroyer curve_beneficiary sleep_is_optional caffeine_dependent ctrl_alt_defeat officehours_regular backrow_sleeper frontrow_menace notetaking_goblin flashcard_fiend study_goblin library_ghost thesis_avoider deadline_speedrunner lastminute_legend pomodoro_survivor finals_are_fake chronic_procrastinator professional_napper exam_szn_victim retaking_calc dropped_physics_twice ochem_ruined_me whyami_premed lab_coat_villain group_project_carry group_project_ghost i_read_the_textbook didnt_read_the_textbook printer_jammer wifi_is_down highlighter_addict mildly_studying technically_studying studying_allegedly fake_productivity hyperfocus_haver quiz_tomorrow_oops send_help_finals touch_grass_later grade_inflation_fan open_book_please partialcredit_please curve_pls extra_credit_hunter'.split(' ');
const JOKE_T = ['{s}_survivor', '{s}survivor', 'crying_in_{p}', 'crying.in.{p}', '{h}am_{vb}', '{h}am{vb}', 'certified_{s}_hater', 'certified{s}enjoyer', '{s}_enjoyer', 'will_{vb}_for_{f}', '{f}_powered', '{f}powered{s}', 'living_in_{p}', '{s}_ruined_me', '{s}ruinedme', 'professional_{vr}', 'pro{vr}', 'chronic_{vr}', '{s}_is_my_villain', 'ate_{n}_{f}s_today', 'not_{vg}_rn', 'mid_{vg}', 'lowkey_{vg}', 'currently_{vg}', '{vg}_until_{t}', 'just_{vg}', '{f}_and_{s}', '{s}_at_{h}am', '{s}_flop', '{s}_goblin', '{s}_gremlin', '{s}_demon', 'help_me_{s}', 'my_{s}_grade', '{s}_ptsd', 'failing_{s}_again', 'passing_{s}_somehow', '{s}_carried_me', 'down_bad_for_{f}', 'need_more_{f}', '{f}_addict', '{f}_in_{p}', '{vr}_of_{p}', 'the_{p}_{vr}', '{t}_{vr}', 'aced_{s}_once', 'barely_{vg}'];
const JK = {p: 'library lab hicks wally stacks dorm mycar officehours lecture backrow basement thequad studyroom attic cafe parkinglot'.split(' '), h: '2 3 4 5 6'.split(' '),
  vb: 'cram study crash grind panic nap snack doomscroll cry vibe spiral'.split(' '), vg: 'cramming studying crashing grinding panicking napping snacking doomscrolling crying vibing spiraling procrastinating locking_in coping manifesting'.split(' '),
  vr: 'crammer napper panicker snacker grinder procrastinator overthinker doomscroller crier yapper skimmer highlighter'.split(' '),
  f: 'ramen coffee boba matcha bagel cereal pizza taco energydrink pretzel donut burrito noodle espresso chai croissant'.split(' '), n: '2 3 4 5 6 7'.split(' '), t: 'finals midterms graduation friday summer spring_break sunrise deadline'.split(' ')};
const SUBJ_NICK = {'Organic chemistry': 'orgo', 'General chemistry': 'genchem', 'Calculus I': 'calc', 'Calculus II': 'calc2', 'Calculus III': 'calc3', 'Thermodynamics': 'thermo', 'Statistics': 'stats', 'Physics I': 'physics', 'Physics II': 'physics2', 'Biochem': 'biochem', 'Data structures': 'datastructs', 'Discrete math': 'discrete', 'Linear algebra': 'linalg', 'Differential equations': 'diffeq', 'Microeconomics': 'micro', 'Macroeconomics': 'macro', 'Accounting': 'accounting', 'Anatomy': 'anatomy', 'Nursing pharmacology': 'pharm', 'Pharmacology': 'pharm', 'Pathophysiology': 'patho', 'Quantum mechanics': 'quantum', 'Real analysis': 'analysis', 'Fluid mechanics': 'fluids', 'Signals and systems': 'signals', 'Operating systems': 'os', 'Machine learning': 'ml', 'Mechanics of materials': 'mechmat', 'Electromagnetics': 'emag'};
const subjNick = c => SUBJ_NICK[c] || c.toLowerCase().split(' ').find(w => w.length >= 4 && !['and', 'with', 'intro'].includes(w)) || c.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8);
const NICKS = 'Mochi Biscuit Pickle Noodle Waffles Pumpkin Bean Peanut Sprout Pebble Nugget Toast Muffin Tater Gizmo Ziggy Bubbles Scooter Pip Bambi Cricket Dumpling Kiwi Mango Pancake Pretzel Taco Sushi Boba Clover Juniper Marble Comet Pixel Echo Rocket Badger Goose Moose Otter Ferret Duckie Froggy Honk Wombat Yeti CornHusk Craybell Toaster Turnip Radish Cabbage Sprinkles Doodle Fizz Jellybean Cosmo Nova Juno Quill Kestrel Vexel Zephyr Onyx Rune Sable Ash Lark Fable Kilo Tango Bravo Lumen Halcyon Cinder Basil Pesto Gnocchi Ravioli Churro Tofu Miso Ramune Taffy Fudge Brownie Cookie Cupcake Nacho Tamale Empanada Bao Onigiri Mango Papaya Guava Lychee Plum Fig Olive Acorn Pinecone Thistle Bramble Puddle Snowball Frosty Sunny Breezy Stormy Thunder Chipmunk Hamster Gerbil Hedgehog Platypus Narwhal Axolotl Capybara Quokka Lemur Sloth Koala Panda Llama Alpaca Gecko Newt Toad Beetle Firefly Moth Bumble Puffin Pelican Flamingo Penguin Walrus Manatee Squid Octo Shrimp Lobster Crab Clam Barnacle Pickles Dill Chive Sage Rosemary Thyme Paprika Wasabi Sriracha Ketchup Mustard Relish Gravy Biscuits Scone Crumpet Bagel'.split(' ');
const G_CORE = 'Viper Soundwave Vastic Raptor Phantom Blaze Shadow Nova Frost Venom Havoc Apex Vortex Reaper Specter Drift Pulse Rift Zero Nyx Onyx Static Ghost Echo Vandal Hex Glitch Turbo Nitro Cipher Sniper Rogue Titan Fury Storm Volt Fang Saber'.split(' ');
const G_A = 'Vex Kry Zan Thra Mor Nyx Xal Dra Vy Kai Ro Sy Zer Kor Fen Lux Vor Ash Bly Cyr Dex Ez Fyr Gor Hal Jax Kel Lyr Mak Nox Ory Pax Quin Rav Sil Tor Ulf Vil Wyn Xen Yor Zyl'.split(' '), G_B = 'lix tor nyx rax vex zen ion ar is eth us an ix or ek yx ul on ia en ar os ex um ira'.split(' ');
const gcore = rnd => rnd() < .45 ? G_CORE[Math.floor(rnd() * G_CORE.length)] : G_A[Math.floor(rnd() * G_A.length)] + G_B[Math.floor(rnd() * G_B.length)];
const OLD = ['xX_{w}_Xx', 'Xx{w}xX', '{l}1337', 'xx{w}xx', 'iiTz{w}', '{l}_pwnz'];
const leet = s => s.replace(/e/g, '3').replace(/a/g, '4').replace(/o/g, '0').replace(/i/g, '1').replace(/s/g, '5');
const yr2 = rnd => String(2 + Math.floor(rnd() * 6)).padStart(2, '0');            // birth years '02–'07
const num = rnd => { const u = rnd(); return u < .35 ? String(1 + Math.floor(rnd() * 99)) : u < .55 ? yr2(rnd) : u < .75 ? String(Math.floor(rnd() * 1000)).padStart(3, '0') : u < .85 ? ['7', '13', '23', '22', '11', '99', '00', '01'][Math.floor(rnd() * 8)] : String(20 + Math.floor(rnd() * 7)) + yr2(rnd); };
const nick = (rnd, f) => { const l = lc(f), u = rnd(); return u < .4 ? l : u < .55 && l.length > 4 ? l.slice(0, 3 + Math.floor(rnd() * 2)) + (rnd() < .5 ? 'y' : 'ie') : u < .7 ? l + l.slice(-1).repeat(1 + Math.floor(rnd() * 2)) : u < .8 && l.length > 4 ? l.slice(0, 4) : l; };
function makeName(i, maj){
  const rnd = mulberry32((ROSTER_SEED ^ 0x9e3779b9) + i * 2654435761), g = nameGroup(rnd), f = zipf(rnd, g.first), L = zipf(rnd, rnd() < .85 ? g.last : NG[0].last, 1.3), st = rnd();
  const pick1 = a => a[Math.floor(rnd() * a.length)];
  let s;
  if (st < .30){                    // real-name handles: emilyrodz, j.okafor, sam_k04, maddiee
    const n = nick(rnd, f), l = lc(L), t = Math.floor(rnd() * 14);
    s = [n + l, n + '.' + l, n + '_' + l, n + l[0] + (rnd() < .6 ? num(rnd) : ''), n[0] + l, n + l.slice(0, 3 + Math.floor(rnd() * 2)), n + num(rnd), n + l + num(rnd), n + '.' + l[0] + num(rnd), cap(f) + cap(L), 'its' + n + (rnd() < .6 ? l[0] : ''), n + '_' + l[0] + yr2(rnd), 'the' + n + l, n + '.' + l + num(rnd)][t];
    if (rnd() < .1) s = s.replace(/^./, c => c.toUpperCase());
  } else if (st < .45){             // aesthetic lowercase / band-name style
    const a = pick1(AES_A), b = pick1(AES_B), t = Math.floor(rnd() * 8);
    s = [a + b, a + '.' + b, a + '_' + b, 'the' + a + b, a + 's' + (rnd() < .6 ? '.' + num(rnd) : ''), b + '.' + a, a + b + '.' + yr2(rnd), lc(nick(rnd, f)) + '.' + a, a + '.' + b + '.' + num(rnd)][Math.min(8, t + (rnd() < .2 ? 1 : 0))];
  } else if (st < .57){             // jokes and self-roasts
    if (rnd() < .2){ s = pick1(JOKES); const u = rnd(); if (u < .25) s = s.replace(/_/g, ''); else if (u < .4) s = s.split('_').map(cap).join(''); if (rnd() < .6) s += num(rnd); }
    else { const subj = subjNick(pick1(maj.cls)); s = pick1(JOKE_T).replace(/\{(\w+)\}/g, (_, k) => k === 's' ? subj : pick1(JK[k])); const u = rnd(); if (u < .2) s = s.replace(/_/g, ''); else if (u < .3) s = s.replace(/_/g, '.'); if (rnd() < .35) s += num(rnd); }
  } else if (st < .67){             // default-looking: Familiar_Tip_8451, user20186
    const u = rnd(), d4 = String(1000 + Math.floor(rnd() * 9000));
    s = u < .55 ? `${pick1(RD_ADJ)}_${pick1(RD_NOUN)}_${d4}` : u < .75 ? `${pick1(RD_ADJ)}-${pick1(RD_NOUN)}-${d4}` : u < .88 ? 'user' + (10000 + Math.floor(rnd() * 9e6)) : u < .95 ? pick1(RD_ADJ) + pick1(RD_NOUN) + d4.slice(0, 2) : 'student' + d4;
  } else if (st < .77){             // major-flavored: segfault_sam, thrustvector
    const tm = pick1(maj.terms), n = nick(rnd, f), t = Math.floor(rnd() * 7);
    const tt = tm.replace(/\./g, ''); s = [tm + '_' + n, n + tt, tt + num(rnd), tm + num(rnd), n + '.' + tt, tm + '_' + n[0] + num(rnd), 'not' + tt + num(rnd)][t];
  } else if (st < .87){             // gamer tags: ImViper, ohSoundwave, JackyyyyC, Reverse2k_TTV
    const c = gcore(rnd), t = Math.floor(rnd() * 12), nn = rnd() < .5 ? num(rnd) : '';
    s = ['Im' + c + nn, 'oh' + c + nn, 'King' + c + nn, c + nn + 'TTV', 'TTV_' + c + nn, c + 'GG' + nn, 'x' + c + num(rnd), cap(f) + 'y'.repeat(3 + Math.floor(rnd() * 3)) + L[0], c + (rnd() < .5 ? 'z' : 'x') + nn, 'Real' + c + nn, cap(f) + c, c + Math.floor(1 + rnd() * 9) + 'k_TTV'][t];
  } else if (st < .95){             // nicknames and random words: GareBear, Mochi, CornHusk
    const w = pick1(NICKS), t = Math.floor(rnd() * 8);
    s = [w + num(rnd), w + num(rnd), lc(w) + num(rnd), cap(lc(f).slice(0, 4)) + 'Bear' + (rnd() < .5 ? num(rnd) : ''), w + pick1(NICKS), lc(w) + '.' + lc(f), lc(w) + '_' + lc(pick1(NICKS)), w + pick1(NICKS) + num(rnd)][t];
  } else {                          // old-school, rare
    const w = rnd() < .5 ? gcore(rnd) : cap(nick(rnd, f));
    s = pick1(OLD).replace('{w}', w).replace('{l}', leet(lc(w)));
  }
  return s.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 26) || 'player' + i;
}
