/* ---------- lobby names ----------
   Names for the Elimination lobbies other players open. A long hand-written list, plus names built from a lobby's
   subject or the time of day, written the way that host tends to type (lowercase, Title Case, gamer caps, an emoji).
   Recently used names are skipped, so the same one rarely shows twice in a row. No AI requests needed. */
const LN_FULL = [
  // grinding and locking in
  'lock in or log off', 'locked in', 'no thoughts just study', 'grind szn', 'the grind never sleeps', 'eyes on the prize', 'heads down', 'zero distractions',
  'phone in the other room', 'airplane mode gang', 'do not disturb', 'silent grind', 'quiet quitting my phone', 'deep work only', 'tunnel vision', 'focus or perish',
  'one more chapter', 'just one more hour', 'the last push', 'run it back', 'stay seated', 'butt in chair', 'chair glued', 'no getting up', 'iron focus', 'monk mode',
  'flow state', 'get in the zone', 'the zone', 'study like a villain', 'main character studying', 'villain arc', 'redemption arc', 'comeback szn', 'lock in szn', 'grindset',
  'productive era', 'my academic weapon era', 'academic weapons only', 'academic comeback', 'gpa recovery', 'gpa rescue mission', 'saving my gpa', 'gpa or bust',
  'dean’s list or bust', 'scholarship protectors', 'keep the scholarship', 'honors kids', 'straight a energy', 'b+ is fine', 'c’s get degrees', 'pass the class',
  'just pass', 'surviving not thriving', 'barely surviving', 'hanging by a thread', 'we’re so back', 'it’s so over', 'cooked but studying', 'cooked',
  'fully cooked', 'let him cook', 'let them cook', 'cooking rn', 'studying is my cardio', 'brain gains', 'mental marathon', 'endurance test', 'stamina check', 'test of will',
  // cramming and deadlines
  'cram city', 'cram central', 'cram fam', 'cram session', 'panic studying', 'panic mode', 'pre-exam panic', 'exam eve', 'night before the exam', 'exam tomorrow help',
  'midterm survivors', 'midterm grind', 'midterms ate me', 'finals szn', 'finals week warriors', 'finals or die', 'dead week', 'dead week grind', 'reading week', 'syllabus speedrun',
  'deadline at midnight', 'due tonight', 'due in 6 hours', 'extension denied', 'no extensions', 'procrastinators anonymous', 'recovering procrastinators', 'started too late',
  'should’ve started earlier', 'last minute legends', 'chronic procrastinators', 'tomorrow me’s problem', 'future me says thanks', 'catching up', 'behind on everything',
  '3 weeks behind', 'lecture backlog', 'watching lectures at 2x', '2x speed lectures', 'unread textbook club', 'the textbook i never opened', 'reading the slides finally', 'syllabus week is over',
  // times of day
  '3am club', '3am library goblins', '2am thoughts', 'midnight oil', 'burning the midnight oil', 'past my bedtime', 'night owls', 'night shift', 'graveyard shift', 'insomniacs unite',
  'sleep is for the weak', 'sleep is optional', 'nocturnal scholars', 'moonlight studiers', 'after hours', 'late night lock in', 'late nite grind', 'witching hour', 'dawn patrol',
  'sunrise grind', 'early birds', '5am club', '6am lock in', 'before my 8am', 'survived my 8am', 'morning people (rare)', 'coffee before class', 'lunch break grind', 'between classes',
  'after class', 'afternoon slump', 'golden hour study', 'sunset session', 'weekend warriors', 'saturday grind', 'sunday scaries', 'sunday reset', 'monday motivation', 'friday night grind',
  // places
  'library crew', 'library goblins', 'library basement', 'quiet floor', 'the silent floor', 'study room 4b', 'back corner of the library', 'dorm desk', 'dorm room grind', 'bed is not a desk',
  'coffee shop vibes', 'cafe hoppers', 'kitchen table club', 'commuter crew', 'train studying', 'study hall', 'study hall 2', 'the study lounge', 'campus after dark', 'empty classroom',
  // snacks and caffeine
  'caffeine dependent', 'powered by espresso', 'iced coffee in winter', 'cold brew crew', 'matcha mafia', 'energy drink fund', 'redbull sponsored (not)', 'tea and textbooks', 'snack break when',
  'ramen and readings', 'instant noodle scholars', 'pizza after', 'brain food', 'hydrate or die', 'drink water pls', 'running on coffee', 'running on vibes', 'running on 4 hours of sleep',
  // vibes
  'lofi and chill', 'lofi beats to cry to', 'rain sounds', 'brown noise club', 'white noise gang', 'headphones on', 'noise cancelling', 'cozy study', 'cozy corner', 'cottagecore study',
  'dark academia', 'light academia', 'chaotic academia', 'that girl studying', 'romanticize studying', 'pinterest study aesthetic', 'candlelit', 'soft study hours', 'calm and focused', 'zen den',
  'stress free zone', 'no stress allowed', 'good vibes only', 'chill grinders', 'wholesome grind', 'gentle grind', 'slow and steady', 'pomodoro people', 'tomato timers', 'focus friends',
  'study buddies', 'study besties', 'accountability buddies', 'accountability squad', 'keep me honest', 'body doubling', 'virtual library', 'parallel play (study edition)', 'company while studying', 'nobody leaves early',
  // competitive and trash talk
  'last one standing', 'last one studying', 'outlast me', 'try to outlast me', 'you will break first', 'break first lose first', 'who blinks first', 'nobody takes breaks', 'no breaks no mercy',
  'zero break challenge', 'breaks are for the weak', 'bladder of steel', 'iron bladder club', 'endurance kings', 'stamina diff', 'skill issue', 'gg go next', 'sweat lobby', 'sweats only',
  'tryhards welcome', 'casuals beware', 'no mercy', 'king of the hill', 'battle royale but studying', 'the hunger games but finals', 'squad up', 'ranked practice', 'warmup lobby', 'scrims',
  'big brain lobby', 'galaxy brain', 'brainrot recovery', 'touch grass after', 'grass can wait', 'outside is closed', 'we don’t go outside', 'social life on hold', 'ghosting my friends for this', 'friends who study together',
  // funny
  'professor said open book', 'the curve will save us', 'pray for the curve', 'the curve is my religion', 'office hours tomorrow', 'emailing my prof at 3am', 'ta please', 'reading the rubric', 'the group project carriers', 'carrying my group',
  'my group did nothing', 'solo carrying', 'the quiz is worth 2%', 'participation points', 'attendance is mandatory', 'the syllabus lied', 'lecture was 3 hours', 'why is the exam cumulative', 'cumulative final victims', 'drop the lowest score pls',
  'plot twist: i studied', 'i will not open tiktok', 'tiktok can wait', 'instagram detox', 'doomscroll free zone', 'no reels allowed', 'deleted all my apps', 'screen time zero', 'phone jail', 'touch phone = lose',
  'study now cry later', 'cry later study now', 'emotional damage', 'brain cells left: 2', 'one brain cell', 'sharing one brain cell', 'neurons firing', 'loading…', 'buffering', 'error 404 motivation',
  'motivation not found', 'discipline > motivation', 'motivation is temporary', 'do it scared', 'just start', '5 more minutes', 'quick 25', 'pomo party', 'focus sprint', 'speedrun any%',
  // degree-life
  'premed suffering', 'pre-law grind', 'engineering tears', 'cs majors anonymous', 'leetcode later', 'nursing school survivors', 'stem kids', 'humanities hours', 'art kids studying too', 'business majors locked in',
  'grad school apps', 'thesis writers', 'dissertation dungeon', 'phd survivors', 'lab report hell', 'problem set party', 'pset grind', 'essay crisis', 'word count prayers', 'citation needed',
  'mcat grind', 'lsat lock in', 'gre prep', 'sat prep squad', 'boards prep', 'cpa grind', 'bar prep', 'nclex prep', 'step 1 grind', 'certification cram',
];
// subject shortcuts (matched against a major's name)
const LN_SUBJ = [[/organic|chem/i, ['orgo', 'chem', 'ochem', 'gen chem']], [/bio/i, ['bio', 'biochem', 'cell bio']], [/math|calc|statistic/i, ['calc', 'calc 2', 'linear alg', 'stats', 'diff eq']],
  [/physics/i, ['physics', 'phys 2', 'quantum']], [/computer|software|data/i, ['cs', 'data structures', 'algos', 'leetcode', 'discrete']], [/mechanical|civil|electrical|engineer/i, ['statics', 'thermo', 'circuits', 'dynamics', 'engineering']],
  [/nurs/i, ['nursing', 'pharm', 'patho', 'a&p']], [/psych/i, ['psych', 'neuro', 'research methods']], [/econ|finance|business|account/i, ['econ', 'accounting', 'finance', 'micro', 'macro']],
  [/history|politic|law/i, ['history', 'poli sci', 'con law']], [/english|literature|writing|journal/i, ['lit', 'essays', 'english']], [/art|design|architect/i, ['design', 'art history', 'studio']],
  [/med|health|kines/i, ['anatomy', 'physio', 'premed']], [/language|spanish|french/i, ['spanish', 'french', 'languages']]];
const LN_SUBJ_FMT = ['{s} grind', '{s} lock in', '{s} cram', '{s} or die', '{s} support group', '{s} survivors', '{s} hell', '{s} night', '{s} study hall', '{s} gang', '{s} besties', '{s} victims',
  '{s} final prep', '{s} midterm prep', '{s} exam tomorrow', 'pray for {s}', 'surviving {s}', 'i hate {s}', '{s} is my villain', 'me vs {s}', '{s} speedrun', '{s} at 2am', 'we love {s} (we don’t)',
  '{s} carriers', '{s} kids', '{s} misery', 'conquering {s}', '{s} no breaks', 'last one in {s} wins', '{s} sweats', '{s} for dummies', '{s} redemption arc', 'dropping {s} (jk)', '{s} pain', '{s} warriors'];
const LN_TIME = h => h < 5 ? ['3am', '2am', 'midnight', 'late night', 'after hours', 'insomnia'] : h < 9 ? ['sunrise', '6am', 'early', 'dawn', 'morning'] : h < 12 ? ['morning', 'pre-lunch', 'brunch'] : h < 17 ? ['afternoon', 'midday', 'post-lunch'] : h < 21 ? ['evening', 'sunset', 'after class', 'dinner time'] : ['late night', 'night', 'midnight', '11pm'];
const LN_CROWD = ['grind', 'crew', 'club', 'lock in', 'goblins', 'gang', 'grinders', 'session', 'squad', 'study hall', 'people', 'survivors', 'warriors', 'owls', 'scholars', 'sprint', 'marathon', 'focus room'];
const LN_GAMER = ['SWEAT LOBBY', 'no breaks no mercy', 'GG EZ', 'ranked warmup', 'tryhards only', 'stamina diff', 'TOUCH GRASS AFTER', 'skill issue', 'last one standing', 'carry me', 'diff', 'sweats only', 'NO SCOPE STUDYING', 'clutch or kick', '1v15 me'];
const LN_EMO = ['📚', '☕', '🔥', '💀', '🌙', '✨', '🧠', '😭', '🫡', '⏳', '🍵', '🎧'];
let lnRecent = [];
function lnHash(x){ let h = 2166136261; for (const c of String(x)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
// a name for a lobby hosted by bot w (subject optional); `rnd` is a 0..1 random function
function lobbyName(w, subject, rnd = Math.random){
  const host = w >= 0 ? bot(w).name : '', gamer = /TTV|xX|Xx|gg|GG|_\d{2,}$|^(the)?[A-Z][a-z]+[A-Z]/.test(host), hs = lnHash(host);
  const subj = subject && LN_SUBJ.find(([re]) => re.test(subject)), pickA = a => a[Math.floor(rnd() * a.length)];
  for (let tries = 0; tries < 12; tries++){
    const r = rnd(); let n;
    if (r < .08 && host) n = `${host}'s lobby`;
    else if (r < .28 && subj){ n = pickA(LN_SUBJ_FMT).replace('{s}', pickA(subj[1])); }
    else if (r < .38){ n = `${pickA(LN_TIME(new Date().getHours()))} ${pickA(LN_CROWD)}`; }
    else if (r < .46 && gamer) n = pickA(LN_GAMER);
    else n = pickA(LN_FULL);
    // the host's way of typing
    const s = hs % 10;
    if (n.indexOf("'s lobby") < 0){
      if (gamer && s < 4) n = n.toUpperCase();
      else if (s === 4 || s === 5) n = n.replace(/\b[a-z]/g, c => c.toUpperCase());
      else if (s === 6) n = n[0].toUpperCase() + n.slice(1);
    }
    if (rnd() < (s === 7 || s === 8 ? .6 : .12)) n += ' ' + LN_EMO[(hs >>> 4) % LN_EMO.length];
    const key = n.toLowerCase();
    if (lnRecent.includes(key) || (typeof EL !== 'undefined' && [...EL.list, ...EL.live].some(l => (l.name || '').toLowerCase() === key))) continue;
    lnRecent.push(key); if (lnRecent.length > 250) lnRecent.shift();
    return n;
  }
  return `${host || 'study'}'s lobby`;
}
