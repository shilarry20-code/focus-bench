/* ---------- achievements ---------- */
// Most are worked out from your session history, so they also unlock retroactively and come back
// after a restore. A few track things you do in the app (counters and "tried" sets in fb.ach).
var ACH = merge({u:{}, c:{}, s:{}, seeded:false}, store.get('fb.ach', {}));
const saveAch = () => store.set('fb.ach', ACH);
let achTimer = null;
function achQueue(){ clearTimeout(achTimer); achTimer = setTimeout(checkAch, 250); }
function achBump(k, n){ ACH.c[k] = (ACH.c[k] || 0) + (n || 1); saveAch(); achQueue(); }
function achSet(k, v){ const a = ACH.s[k] || (ACH.s[k] = []); if (v != null && !a.includes(v)){ a.push(v); saveAch(); achQueue(); } }

const TIERS = {
  bronze:{name:'Bronze', pts:5, c:'#b87333'},
  silver:{name:'Silver', pts:10, c:'#8d99aa'},
  gold:{name:'Gold', pts:25, c:'#d4a11a'},
  platinum:{name:'Platinum', pts:50, c:'#2fa9c0'},
  legendary:{name:'Legendary', pts:100, c:'#9d4bef'}
};
const ACH_CATS = {start:'Getting started', time:'Total time', sessions:'Session count', long:'Long sessions', day:'Big days', week:'Weeks & months', streak:'Streaks & habits', clock:'Time of day', dates:'Special dates', modes:'Timer modes', acts:'Activities & tasks', explore:'Exploring the app', ranked:'Ranked', meta:'Collector'};
const ACH_ICONS = {
  start:'<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  time:'<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  sessions:'<rect x="4" y="4" width="16" height="5" rx="1.5"/><rect x="4" y="10" width="16" height="5" rx="1.5"/><rect x="4" y="16" width="16" height="4" rx="1.5"/>',
  long:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  day:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  week:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 15l2.5 2.5L16 13"/>',
  streak:'<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/>',
  clock:'<path d="M20 15A8 8 0 1 1 9 4a6.5 6.5 0 0 0 11 11z"/>',
  dates:'<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  modes:'<circle cx="12" cy="12" r="9"/><path d="M12 12l4-4"/><circle cx="12" cy="12" r="1.5"/>',
  acts:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8" r="1.5"/>',
  explore:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  ranked:'<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
  meta:'<path d="M8 21h8M12 17v4M6 4h12v4a6 6 0 0 1-12 0z"/><path d="M6 6H3v1a3 3 0 0 0 3 3M18 6h3v1a3 3 0 0 1-3 3"/>'
};
// [id, category, tier, name, description, value(stats), goal, options]
const H = 60;
const ACHS = [
  ['first','start','bronze','First Step','Finish your first focus session.', s => s.n, 1],
  ['named','start','bronze','Name It','Log a session with a description of what you worked on.', s => s.named, 1],
  ['goal1','start','bronze','Goal Getter','Hit your daily goal for the first time.', s => s.goalDays, 1],
  ['note1','start','bronze','Parking Lot','Park a stray thought in Notes.', s => s.c.notes, 1],
  ['notedone','start','bronze','Cleared Your Head','Check off a parked note.', s => s.c.notesDone, 1],
  ['tag1','start','bronze','Personal Touch','Add an activity of your own.', s => s.c.tagsAdded, 1],

  ['t1','time','bronze','Warming Up','Focus for 1 hour in total.', s => s.total, 1*H, {u:'h'}],
  ['t5','time','bronze','Getting Serious','Focus for 5 hours in total.', s => s.total, 5*H, {u:'h'}],
  ['t10','time','silver','Ten-Hour Club','Focus for 10 hours in total.', s => s.total, 10*H, {u:'h'}],
  ['t25','time','silver','Quarter Century','Focus for 25 hours in total.', s => s.total, 25*H, {u:'h'}],
  ['t50','time','gold','Fifty Hours Deep','Focus for 50 hours in total.', s => s.total, 50*H, {u:'h'}],
  ['t100','time','gold','Centurion','Focus for 100 hours in total.', s => s.total, 100*H, {u:'h'}],
  ['t250','time','platinum','Deep Diver','Focus for 250 hours in total.', s => s.total, 250*H, {u:'h'}],
  ['t500','time','platinum','Scholar','Focus for 500 hours in total.', s => s.total, 500*H, {u:'h'}],
  ['t1000','time','legendary','The 1,000-Hour Mind','Focus for 1,000 hours in total.', s => s.total, 1000*H, {u:'h'}],

  ['n5','sessions','bronze','High Five','Finish 5 focus sessions.', s => s.n, 5],
  ['n10','sessions','bronze','Double Digits','Finish 10 focus sessions.', s => s.n, 10],
  ['n25','sessions','silver','Two Dozen and Change','Finish 25 focus sessions.', s => s.n, 25],
  ['n50','sessions','silver','Half Century','Finish 50 focus sessions.', s => s.n, 50],
  ['n100','sessions','gold','Triple Digits','Finish 100 focus sessions.', s => s.n, 100],
  ['n250','sessions','gold','The Grinder','Finish 250 focus sessions.', s => s.n, 250],
  ['n500','sessions','platinum','Focus Machine','Finish 500 focus sessions.', s => s.n, 500],
  ['n1000','sessions','platinum','A Thousand Blocks','Finish 1,000 focus sessions.', s => s.n, 1000],
  ['n2500','sessions','legendary','Unstoppable Force','Finish 2,500 focus sessions.', s => s.n, 2500],

  ['l30','long','bronze','Half-Hour Hero','Log a single session of 30 minutes or more.', s => s.maxSess, 30, {u:'m'}],
  ['l60','long','bronze','Hour of Power','Log a single session of 1 hour or more.', s => s.maxSess, 60, {u:'m'}],
  ['l90','long','silver','In the Zone','Log a single session of 90 minutes or more.', s => s.maxSess, 90, {u:'m'}],
  ['l120','long','silver','Two-Hour Tunnel','Log a single session of 2 hours or more.', s => s.maxSess, 120, {u:'m'}],
  ['l180','long','gold','Three-Hour Trance','Log a single session of 3 hours or more.', s => s.maxSess, 180, {u:'m'}],
  ['l240','long','platinum','Four Hours, No Blinking','Log a single session of 4 hours or more.', s => s.maxSess, 240, {u:'m'}],
  ['l360','long','legendary','Unbroken','Log a single session of 6 hours or more.', s => s.maxSess, 360, {u:'m'}],
  ['g3','long','bronze','Back to Back','Do 3 blocks of the same task back to back.', s => s.maxGroup, 3],
  ['g4p','long','silver','Full Cycle','Do 4 Pomodoro blocks of the same task back to back.', s => s.maxPomoGroup, 4],
  ['g6','long','silver','Chain Reaction','Do 6 blocks of the same task back to back.', s => s.maxGroup, 6],
  ['g8p','long','gold','Double Cycle','Do 8 Pomodoro blocks of the same task back to back.', s => s.maxPomoGroup, 8],
  ['g12','long','platinum','Iron Focus','Do 12 blocks of the same task back to back.', s => s.maxGroup, 12],

  ['d1','day','bronze','Solid Day','Focus for 1 hour in one day.', s => s.maxDay, 1*H, {u:'h'}],
  ['d2','day','bronze','Productive Day','Focus for 2 hours in one day.', s => s.maxDay, 2*H, {u:'h'}],
  ['d4','day','silver','Locked In','Focus for 4 hours in one day.', s => s.maxDay, 4*H, {u:'h'}],
  ['d6','day','gold','Six-Hour Grind','Focus for 6 hours in one day.', s => s.maxDay, 6*H, {u:'h'}],
  ['d8','day','platinum','Full Shift','Focus for 8 hours in one day.', s => s.maxDay, 8*H, {u:'h'}],
  ['d10','day','legendary','Marathon Day','Focus for 10 hours in one day.', s => s.maxDay, 10*H, {u:'h'}],
  ['d12','day','legendary','Twelve-Hour Legend','Focus for 12 hours in one day.', s => s.maxDay, 12*H, {u:'h'}],
  ['dn4','day','bronze','Four Square','Finish 4 sessions in one day.', s => s.maxDayN, 4],
  ['dn8','day','silver','Eight Is Great','Finish 8 sessions in one day.', s => s.maxDayN, 8],
  ['dn12','day','gold','Dozen Done','Finish 12 sessions in one day.', s => s.maxDayN, 12],
  ['dn16','day','platinum','Sixteen Blocks','Finish 16 sessions in one day.', s => s.maxDayN, 16],

  ['w5','week','bronze','Good Week','Focus for 5 hours in one week.', s => s.maxWeek, 5*H, {u:'h'}],
  ['w10','week','silver','Ten-Hour Week','Focus for 10 hours in one week.', s => s.maxWeek, 10*H, {u:'h'}],
  ['w20','week','gold','Twenty-Hour Week','Focus for 20 hours in one week.', s => s.maxWeek, 20*H, {u:'h'}],
  ['w30','week','platinum','Thirty-Hour Week','Focus for 30 hours in one week.', s => s.maxWeek, 30*H, {u:'h'}],
  ['w40','week','legendary','Full-Time Student','Focus for 40 hours in one week.', s => s.maxWeek, 40*H, {u:'h'}],
  ['m20','week','silver','Strong Month','Focus for 20 hours in one month.', s => s.maxMonth, 20*H, {u:'h'}],
  ['m50','week','gold','Fifty-Hour Month','Focus for 50 hours in one month.', s => s.maxMonth, 50*H, {u:'h'}],
  ['m100','week','legendary','Hundred-Hour Month','Focus for 100 hours in one month.', s => s.maxMonth, 100*H, {u:'h'}],
  ['dows','week','silver','Seven Flavors','Study on every day of the week at least once.', s => s.dows, 7],
  ['perfweek','week','gold','Perfect Week','Study every day of a Sunday-to-Saturday week.', s => s.perfectWeek, 7],

  ['s2','streak','bronze','Back Again','Study 2 days in a row (10+ minutes a day).', s => s.bestStreak, 2, {u:'d'}],
  ['s3','streak','bronze','Hat Trick','Study 3 days in a row (10+ minutes a day).', s => s.bestStreak, 3, {u:'d'}],
  ['s7','streak','silver','Week Streak','Study 7 days in a row (10+ minutes a day).', s => s.bestStreak, 7, {u:'d'}],
  ['s14','streak','gold','Fortnight','Study 14 days in a row (10+ minutes a day).', s => s.bestStreak, 14, {u:'d'}],
  ['s30','streak','platinum','Month of Momentum','Study 30 days in a row (10+ minutes a day).', s => s.bestStreak, 30, {u:'d'}],
  ['s60','streak','platinum','Two Months Strong','Study 60 days in a row (10+ minutes a day).', s => s.bestStreak, 60, {u:'d'}],
  ['s100','streak','legendary','Triple-Digit Streak','Study 100 days in a row (10+ minutes a day).', s => s.bestStreak, 100, {u:'d'}],
  ['s365','streak','legendary','Year of Focus','Study 365 days in a row (10+ minutes a day).', s => s.bestStreak, 365, {u:'d'}],
  ['gs3','streak','silver','On Target','Hit your daily goal 3 days in a row.', s => s.goalStreak, 3, {u:'d'}],
  ['gs7','streak','gold','Bullseye Week','Hit your daily goal 7 days in a row.', s => s.goalStreak, 7, {u:'d'}],
  ['gs30','streak','legendary','Goal Machine','Hit your daily goal 30 days in a row.', s => s.goalStreak, 30, {u:'d'}],
  ['da10','streak','bronze','Regular','Study on 10 different days.', s => s.daysActive, 10, {u:'d'}],
  ['da30','streak','silver','Habit Formed','Study on 30 different days.', s => s.daysActive, 30, {u:'d'}],
  ['da100','streak','gold','100 Days In','Study on 100 different days.', s => s.daysActive, 100, {u:'d'}],
  ['da250','streak','platinum','Dedicated','Study on 250 different days.', s => s.daysActive, 250, {u:'d'}],

  ['owl','clock','bronze','Night Owl','Start a session after 11 PM.', s => s.owl, 1],
  ['lunch','clock','bronze','Lunch Break Learner','Start a session between noon and 1 PM.', s => s.lunch, 1],
  ['weekend','clock','bronze','Weekend Warrior','Study on a Saturday or Sunday.', s => s.weekend, 1],
  ['early','clock','silver','Early Bird','Start a session between 5 and 7 AM.', s => s.early, 1],
  ['midnight','clock','silver','Midnight Oil','Start a session between midnight and 3 AM.', s => s.midnight, 1],
  ['monday','clock','silver','Monday Motivation','Study on a Monday before 9 AM.', s => s.monMorning, 1],
  ['fullwknd','clock','silver','Full Weekend','Study on both days of the same weekend.', s => s.fullWeekend, 1],
  ['allday','clock','silver','Dawn to Dusk','Start sessions in the morning, afternoon and evening of the same day.', s => s.allDay, 1],
  ['dawn','clock','gold','Before the Birds','Start a session between 4 and 5 AM.', s => s.dawn, 1],
  ['three','clock','gold','3 AM Club','Some say nothing good happens after 3 AM.', s => s.three, 1, {secret:1}],
  ['insomnia','clock','gold','Insomniac','Start sessions before 6 AM and after 11 PM on the same date.', s => s.insomniac, 1, {secret:1}],
  ['clock24','clock','legendary','Around the Clock','Start sessions in every one of the 24 hours of the day, over time.', s => s.hours, 24],

  ['comeback','dates','bronze','Comeback Kid','Come back and study after a week or more away.', s => s.comeback, 1, {secret:1}],
  ['fri13','dates','silver','Unlucky? Not You','Study on a Friday the 13th.', s => s.fri13, 1, {secret:1}],
  ['valentine','dates','silver','Studying Is My Valentine','Study on February 14.', s => s.sp['02-14'], 1, {secret:1}],
  ['spooky','dates','silver','Spooky Studies','Study on Halloween.', s => s.sp['10-31'], 1, {secret:1}],
  ['dot','dates','silver','On the Dot','Finish a Stopwatch session at exactly 60 minutes.', s => s.swDot, 1, {secret:1}],
  ['newyear','dates','gold','New Year, Same Grind','Study on January 1.', s => s.sp['01-01'], 1, {secret:1}],
  ['xmas','dates','gold','Holiday Grind','Study on December 25.', s => s.sp['12-25'], 1, {secret:1}],
  ['pi','dates','gold','Pi Time','Start or end a session at exactly 3:14.', s => s.pi, 1, {secret:1}],
  ['lucky7','dates','gold','Lucky Sevens','Finish 7 sessions on the 7th of a month.', s => s.lucky7, 1, {secret:1}],
  ['leap','dates','legendary','Leap of Focus','Study on February 29. Good luck.', s => s.sp['02-29'], 1, {secret:1}],

  ['m-pomodoro','modes','bronze','Tomato Timer','Finish a Pomodoro block.', s => s.modes.pomodoro, 1],
  ['m-fifty','modes','bronze','52/17 Club','Finish a 52/17 block.', s => s.modes.fifty, 1],
  ['m-flow','modes','bronze','Go With the Flow','Finish a Flowtime session.', s => s.modes.flow, 1],
  ['m-timebox','modes','bronze','Boxed In','Finish a Timebox session.', s => s.modes.timebox, 1],
  ['m-stopwatch','modes','bronze','Clock Watcher','Finish an assignment in Stopwatch mode.', s => s.modes.stopwatch, 1],
  ['m-custom','modes','bronze','Made to Measure','Finish a block in Custom mode.', s => s.modes.custom, 1],
  ['modeall','modes','silver','Mode Master','Finish a session in all six timer modes.', s => s.modeCount, 6],
  ['flow90','modes','gold','Flow State','Stay in one Flowtime stretch for 90 minutes or more.', s => s.flowMax, 90, {u:'m'}],
  ['sw10','modes','silver','Assignment Slayer','Finish 10 assignments in Stopwatch mode.', s => s.modes.stopwatch, 10],
  ['sw50','modes','gold','Homework Destroyer','Finish 50 assignments in Stopwatch mode.', s => s.modes.stopwatch, 50],
  ['sw150','modes','platinum','Assignment Annihilator','Finish 150 assignments in Stopwatch mode.', s => s.modes.stopwatch, 150],

  ['a3','acts','bronze','Variety Pack','Log time in 3 different activities.', s => s.actCount, 3],
  ['a6','acts','silver','Renaissance Student','Log time in 6 different activities.', s => s.actCount, 6],
  ['k10','acts','bronze','Busy Bee','Work on 10 differently named tasks.', s => s.taskCount, 10],
  ['k50','acts','silver','Many Hats','Work on 50 differently named tasks.', s => s.taskCount, 50],
  ['k200','acts','gold','Jack of All Trades','Work on 200 differently named tasks.', s => s.taskCount, 200],
  ['haul5','acts','silver','Long Haul','Work on the same task on 5 different days.', s => s.maxTaskDays, 5, {u:'d'}],
  ['haul15','acts','gold','Magnum Opus','Work on the same task on 15 different days.', s => s.maxTaskDays, 15, {u:'d'}],
  ['tag10','acts','silver','Specialist','Spend 10 hours on one activity.', s => s.maxTag, 10*H, {u:'h'}],
  ['round','acts','gold','Well Rounded','Spend at least 5 hours on each of 3 different activities.', s => s.tags5h, 3],
  ['tag50','acts','gold','Expert','Spend 50 hours on one activity.', s => s.maxTag, 50*H, {u:'h'}],
  ['tag100','acts','platinum','Master of One','Spend 100 hours on one activity.', s => s.maxTag, 100*H, {u:'h'}],

  ['mini','explore','bronze','Picture in Picture','Pop out the mini clock.', s => s.c.mini, 1],
  ['tunnel','explore','bronze','Tunnel Vision','Turn on focus mode.', s => s.c.focusMode, 1],
  ['amb','explore','bronze','Ambience','Focus with a background sound playing.', s => s.set.amb, 1],
  ['rain','explore','bronze','Rainy Day','Focus with the rain sound playing.', s => s.rain, 1],
  ['storm','explore','bronze','Stormchaser','Focus through a thunderstorm.', s => s.storm, 1],
  ['themes5','explore','bronze','Interior Designer','Try 5 different themes.', s => s.set.themes, 5],
  ['fonts5','explore','bronze','Typographer','Try 5 different timer fonts.', s => s.set.fonts, 5],
  ['accent','explore','bronze','Your Colors','Pick your own custom accent color.', s => s.set.accentUsed, 1],
  ['dj','explore','bronze','DJ','Add some music in the Music tab.', s => s.c.music, 1],
  ['backup','explore','bronze','Safety First','Make a backup of your data.', s => s.c.backup, 1],
  ['guide1','explore','bronze','Study Guide','Write or import your first study guide.', s => s.c.guides, 1],
  ['guidestudy','explore','bronze','By the Book','Start studying from a study guide.', s => s.c.guideStudy, 1],
  ['guide5','explore','silver','Librarian','Write or import 5 study guides.', s => s.c.guides, 5],
  ['guidedone','explore','gold','Covered Everything','Check off every item on a study guide.', s => s.c.guideDone, 1],
  ['quiz1','explore','bronze','Pop Quiz','Make or import a practice quiz for a study guide.', s => s.c.quizzes, 1],
  ['quiz100','explore','silver','Perfect Score','Get every question right on a practice quiz.', s => s.c.quizPerfect, 1],
  ['edit','explore','bronze','Revisionist','Edit a logged session.', s => s.c.edits, 1],
  ['del','explore','bronze','Clean Slate','Delete a logged session.', s => s.c.deletes, 1],
  ['bigpic','explore','bronze','The Big Picture','Open the monthly calendar.', s => s.c.calMonth, 1],
  ['trophy','explore','bronze','Trophy Hunter','Open the Achievements tab.', s => s.c.awards, 1],
  ['resets','explore','bronze','Commitment Issues','Reset the timer 10 times.', s => s.c.resets, 10, {secret:1}],
  ['curator','explore','silver','Curator','Add 5 things to your music.', s => s.c.music, 5],
  ['keys25','explore','silver','Keyboard Warrior','Use keyboard shortcuts 25 times.', s => s.c.keys, 25],
  ['notes25','explore','silver','Overthinker','Park 25 notes.', s => s.c.notes, 25],
  ['tidy25','explore','silver','Tidy Mind','Check off 25 parked notes.', s => s.c.notesDone, 25],
  ['fontsall','explore','silver','Type Nerd','Try every timer font.', s => s.set.fonts, Object.keys(DIGIT_FONTS).length],
  ['thunder50','explore','silver','Thunderstruck','Hear 50 claps of thunder.', s => s.c.thunder, 50, {secret:1}],
  ['themesall','explore','gold','Chameleon','Try every theme.', s => s.set.themes, Object.keys(THEMES).length],
  ['keys250','explore','gold','Who Needs a Mouse','Use keyboard shortcuts 250 times.', s => s.c.keys, 250, {secret:1}],

  ['r-win','ranked','bronze','First Win','Win a ranked match.', s => s.r.w, 1],
  ['r-10','ranked','bronze','Contender','Play 10 ranked matches.', s => s.r.played, 10],
  ['r-soph','ranked','bronze','Moving Up','Reach Sophomore in Ranked.', s => s.r.played ? s.r.best : 0, 900],
  ['r-ws5','ranked','silver','On a Roll','Win 5 ranked matches in a row.', s => s.r.bestWs, 5],
  ['r-schol','ranked','silver','Scholar Status','Reach Scholar in Ranked.', s => s.r.played ? s.r.best : 0, 1200],
  ['r-rev','ranked','silver','Revenge','Beat your nemesis, a player who has beaten you 5 or more times.', s => s.r.revenge, 1],
  ['r-hon','ranked','gold','With Honors','Reach Honors in Ranked.', s => s.r.played ? s.r.best : 0, 1500],
  ['r-dean','ranked','gold',"Dean's List","Reach Dean's List in Ranked.", s => s.r.played ? s.r.best : 0, 1800],
  ['r-upset','ranked','gold','Giant Slayer','Beat a player rated 300 or more above you.', s => s.r.bestUpset, 300],
  ['r-100','ranked','gold','Veteran','Play 100 ranked matches.', s => s.r.played, 100],
  ['r-ws10','ranked','platinum','Unbeatable','Win 10 ranked matches in a row.', s => s.r.bestWs, 10],
  ['r-val','ranked','platinum','Valedictorian','Reach Valedictorian in Ranked.', s => s.r.played ? s.r.best : 0, 2100],
  ['r-prof','ranked','legendary','Professor','Reach the Professor rank.', s => s.r.played ? s.r.best : 0, 2400],
  ['r-ten','ranked','legendary','Tenured','Win 10 ranked matches at the Professor rank.', s => s.r.profWins, 10],
  ['r-dprof','ranked','legendary','Distinguished','Reach Distinguished Professor in Ranked.', s => s.r.played ? s.r.best : 0, 2700],
  ['r-prov','ranked','legendary','Provost','Reach Provost in Ranked.', s => s.r.played ? s.r.best : 0, 3000],
  ['r-chan','ranked','legendary','Chancellor','Reach Chancellor in Ranked.', s => s.r.played ? s.r.best : 0, 3300],
  ['r-laur','ranked','legendary','Laureate','Reach Laureate in Ranked: 3,600 Elo.', s => s.r.played ? s.r.best : 0, 3600],
  ['r-para','ranked','legendary','Paragon','Become the Paragon: the single highest-rated player of all.', s => s.r.para, 1],
  ['r-reign','ranked','legendary','Long Reign','Hold the Paragon title for 7 days in a row.', s => s.r.reign, 7],

  ['col10','meta','bronze','Collector','Unlock 10 achievements.', s => s.unlocked, 10],
  ['col25','meta','silver','Trophy Shelf','Unlock 25 achievements.', s => s.unlocked, 25],
  ['col50','meta','gold','Trophy Room','Unlock 50 achievements.', s => s.unlocked, 50],
  ['colhalf','meta','platinum','Halfway There','Unlock half of all achievements.', s => s.unlocked, 0],
  ['colall','meta','legendary','Completionist','Unlock every other achievement. Seriously.', s => s.unlocked, 0]
].map(([id, cat, tier, name, desc, val, goal, o]) => ({id, cat, tier, name, desc, val, goal, u: o && o.u, secret: !!(o && o.secret)}));
ACHS.find(a => a.id === 'colhalf').goal = Math.ceil(ACHS.length / 2);
ACHS.find(a => a.id === 'colall').goal = ACHS.length - 1;

function streakOf(keys){
  let best = 0, run = 0, prev = null;
  for (const k of keys){
    const t = new Date(k + 'T12:00').getTime();
    run = prev != null && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  }
  return best;
}
function achStats(){
  const st = {n:0, total:0, maxSess:0, named:0, modes:{}, tags:{}, sp:{}, swDot:0, flowMax:0, early:0, dawn:0, owl:0, midnight:0, three:0, lunch:0, monMorning:0, weekend:0, fri13:0, pi:0};
  const tasks = new Set(), taskDays = {}, hours = new Set(), dows = new Set(), days = {}, partsByDay = {};
  for (const s of LOG){
    const start = s.t - s.min * 60000, d = new Date(start), e = new Date(s.t), h = d.getHours(), dow = d.getDay(), k = dayKey(s.t), sk = dayKey(start);
    st.n++; st.total += s.min; st.maxSess = Math.max(st.maxSess, s.min);
    const task = (s.task || '').trim().toLowerCase();
    if (task){ st.named++; tasks.add(task); (taskDays[task] = taskDays[task] || new Set()).add(k); }
    const tag = s.tag || 'General'; st.tags[tag] = (st.tags[tag] || 0) + s.min;
    const m = s.mode || 'pomodoro'; st.modes[m] = (st.modes[m] || 0) + 1;
    if (m === 'stopwatch' && s.min === 60) st.swDot++;
    if (m === 'flow') st.flowMax = Math.max(st.flowMax, s.min);
    hours.add(h); dows.add(dow);
    if (h === 3) st.three++; if (h === 4) st.dawn++; if (h >= 5 && h < 7) st.early++; if (h >= 23) st.owl++; if (h < 3) st.midnight++; if (h === 12) st.lunch++;
    if (dow === 1 && h < 9) st.monMorning++;
    if (dow === 0 || dow === 6) st.weekend++;
    if (dow === 5 && d.getDate() === 13) st.fri13++;
    const md = `${pad(d.getMonth()+1)}-${pad(d.getDate())}`; st.sp[md] = 1;
    if ([d, e].some(x => x.getHours() % 12 === 3 && x.getMinutes() === 14)) st.pi++;
    const day = days[k] || (days[k] = {min:0, n:0}); day.min += s.min; day.n++;
    const parts = partsByDay[sk] || (partsByDay[sk] = new Set());
    parts.add(h >= 5 && h < 12 ? 'am' : h >= 12 && h < 17 ? 'pm' : h >= 17 ? 'eve' : 'night');
    if (h < 6) parts.add('pre6'); if (h >= 23) parts.add('post23');
  }
  const keys = Object.keys(days).sort();
  st.daysActive = keys.length;
  st.bestStreak = streakOf(keys.filter(k => days[k].min >= 10));
  const goalKeys = keys.filter(k => days[k].min >= P.goalMin);
  st.goalDays = goalKeys.length; st.goalStreak = streakOf(goalKeys);
  st.maxDay = 0; st.maxDayN = 0; st.comeback = 0; st.lucky7 = 0; st.fullWeekend = 0;
  const weekMin = {}, weekDays = {}, monthMin = {};
  let prev = null;
  for (const k of keys){
    const r = days[k], dt = new Date(k + 'T12:00');
    st.maxDay = Math.max(st.maxDay, r.min); st.maxDayN = Math.max(st.maxDayN, r.n);
    if (prev != null && Math.round((dt - prev) / 864e5) >= 8) st.comeback = 1;
    prev = dt;
    if (dt.getDate() === 7 && r.n >= 7) st.lucky7 = 1;
    if (dt.getDay() === 6){ const nx = new Date(dt); nx.setDate(nx.getDate() + 1); if (days[dayKey(nx)]) st.fullWeekend = 1; }
    const wk = dayKey(startOfWeek(dt));
    weekMin[wk] = (weekMin[wk] || 0) + r.min; (weekDays[wk] = weekDays[wk] || new Set()).add(k);
    monthMin[k.slice(0, 7)] = (monthMin[k.slice(0, 7)] || 0) + r.min;
  }
  st.maxWeek = Math.max(0, ...Object.values(weekMin));
  st.maxMonth = Math.max(0, ...Object.values(monthMin));
  st.perfectWeek = Math.max(0, ...Object.values(weekDays).map(x => x.size));
  st.allDay = Object.values(partsByDay).some(p => p.has('am') && p.has('pm') && p.has('eve')) ? 1 : 0;
  st.insomniac = Object.values(partsByDay).some(p => p.has('pre6') && p.has('post23')) ? 1 : 0;
  st.hours = hours.size; st.dows = dows.size;
  st.taskCount = tasks.size;
  st.maxTaskDays = Math.max(0, ...Object.values(taskDays).map(x => x.size));
  st.actCount = Object.keys(st.tags).length;
  st.maxTag = Math.max(0, ...Object.values(st.tags));
  st.tags5h = Object.values(st.tags).filter(m => m >= 300).length;
  st.modeCount = ['pomodoro','fifty','flow','timebox','stopwatch','custom'].filter(m => st.modes[m]).length;
  let maxGroup = 0, maxPomo = 0;
  groupSessions(LOG.map((s, i) => ({s, i}))).forEach(g => {
    maxGroup = Math.max(maxGroup, g.items.length);
    if (g.items.every(x => (x.s.mode || 'pomodoro') === 'pomodoro')) maxPomo = Math.max(maxPomo, g.items.length);
  });
  st.maxGroup = maxGroup; st.maxPomoGroup = maxPomo;
  st.c = ACH.c;
  st.set = {}; Object.keys(ACH.s).forEach(k => st.set[k] = ACH.s[k].length);
  st.rain = (ACH.s.amb || []).includes('rain') ? 1 : 0;
  st.storm = (ACH.s.amb || []).includes('storm') ? 1 : 0;
  st.r = R ? {played: R.played, w: R.w, bestWs: R.bestWs, bestUpset: R.bestUpset, revenge: R.revenge, best: R.best, profWins: R.profWins, para: R.para && (R.para.h === ME || R.para.reign.me != null) ? 1 : 0, reign: R.para ? Math.floor(reignLongest(ME) / 864e5) : 0} : {played:0, w:0, bestWs:0, bestUpset:0, revenge:0, best:0, profWins:0, para:0, reign:0};
  st.unlocked = Object.keys(ACH.u).length;
  return st;
}
const achVal = (a, st) => { try { return +a.val(st) || 0; } catch(e){ return 0; } };
function checkAch(){
  const st = achStats(), fresh = [];
  let changedAny = true;
  while (changedAny){            // repeat so the "unlock N achievements" ones can chain
    changedAny = false;
    for (const a of ACHS){
      if (ACH.u[a.id]) continue;
      if (achVal(a, st) >= a.goal){ ACH.u[a.id] = Date.now(); fresh.push(a); st.unlocked++; changedAny = true; }
    }
  }
  if (!fresh.length){ if (!ACH.seeded){ ACH.seeded = true; saveAch(); } renderAchHeader(); return; }
  saveAch();
  if (!ACH.seeded){
    // first run: don't flood the screen with history you already earned
    ACH.seeded = true; saveAch();
    toast(`You've already earned ${fresh.length} achievement${fresh.length===1?'':'s'} from your history. Open the Achievements tab to see them.`);
  } else fresh.forEach(a => achPopQueue.push(a));
  renderAchHeader(); renderAwards(); achPopNext();
}

/* unlock pop-ups */
const achPopQueue = []; let achPopBusy = false;
function achIcon(a, cls){ return `<span class="ach-ic ${cls || ''}" style="--t:${TIERS[a.tier].c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ACH_ICONS[a.cat]}</svg></span>`; }
function achPopNext(){
  if (achPopBusy || !achPopQueue.length) return;
  achPopBusy = true;
  const a = achPopQueue.shift(), more = achPopQueue.length > 2 ? achPopQueue.splice(0).length : 0, T = TIERS[a.tier];
  const el = $('#achPop');
  el.innerHTML = `${achIcon(a, 'big')}<span class="ach-pop-tx"><small style="color:${T.c}">${T.name} achievement unlocked · +${T.pts}</small><b>${esc(a.name)}</b><span>${esc(a.desc)}</span>${more ? `<em>and ${more} more</em>` : ''}</span>`;
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  el.onclick = () => { el.hidden = true; achPopBusy = false; openTab('awards'); };
  if (AC && P.volume > 0){ const t = AC.currentTime + .02, v = P.volume; [784, 988, 1175, 1568].forEach((f, i) => tone(f, 'triangle', t + i * .08, .5, .16 * v)); }
  if (a.tier === 'gold' || a.tier === 'platinum' || a.tier === 'legendary') fx.burst();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.hidden = true; el.classList.remove('in','out'); achPopBusy = false; achPopNext(); }, 350); }, a.tier === 'legendary' ? 6500 : 4200);
}

/* header and Achievements tab */
function renderAchHeader(){
  const n = Object.keys(ACH.u).length;
  $('#achBtn b').textContent = n; $('#achBtn span').textContent = `/${ACHS.length}`;
}
const AF_DEFAULT = {q:'', sort:'cat', status:'all', tiers:[], rar:'all', cat:'all'};
let AF = Object.assign({}, AF_DEFAULT, P.achView || {}, {q:''});
const saveAF = () => { P.achView = {sort: AF.sort, status: AF.status, tiers: AF.tiers, rar: AF.rar, cat: AF.cat}; saveP(); };
const AF_SORTS = [['cat','Category'],['near','Closest to unlocking'],['rare','Rarest first'],['common','Most common first'],['tierDesc','Tier: Legendary first'],['tierAsc','Tier: Bronze first'],['recent','Recently unlocked'],['pts','Points'],['name','Name, A–Z']];
const TIER_ORDER = ['bronze','silver','gold','platinum','legendary'];
function achFiltered(st){
  const q = AF.q.trim().toLowerCase();
  return ACHS.filter(a => {
    const got = !!ACH.u[a.id], hidden = a.secret && !got;
    if (q && !(hidden ? 'secret achievement' : `${a.name} ${a.desc} ${ACH_CATS[a.cat]}`).toLowerCase().includes(q)) return false;
    if (AF.status === 'got' && !got) return false;
    if (AF.status === 'locked' && got) return false;
    if (AF.status === 'progress' && (got || hidden || a.goal <= 1 || achVal(a, st) <= 0)) return false;
    if (AF.status === 'secret' && !a.secret) return false;
    if (AF.tiers.length && !AF.tiers.includes(a.tier)) return false;
    if (AF.rar !== 'all'){ const r = typeof rarityOf === 'function' && R ? rarityOf(a.id) : null; if (r == null || r >= (AF.rar === 'ultra' ? .01 : .1)) return false; }
    if (AF.cat !== 'all' && a.cat !== AF.cat) return false;
    return true;
  });
}
function achSorted(list, st){
  const rar = id => { const r = typeof rarityOf === 'function' && R ? rarityOf(id) : null; return r == null ? 2 : r; };
  const prog = a => ACH.u[a.id] ? -1 : a.secret ? -.5 : Math.min(1, achVal(a, st) / a.goal);
  const by = {
    near: (a, b) => prog(b) - prog(a),
    rare: (a, b) => rar(a.id) - rar(b.id),
    common: (a, b) => rar(b.id) - rar(a.id),
    tierDesc: (a, b) => TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier),
    tierAsc: (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
    recent: (a, b) => (ACH.u[b.id] || 0) - (ACH.u[a.id] || 0),
    pts: (a, b) => TIERS[b.tier].pts - TIERS[a.tier].pts,
    name: (a, b) => 0
  }[AF.sort];
  const nm = a => a.secret && !ACH.u[a.id] ? 'Secret achievement' : a.name;
  return list.slice().sort((a, b) => (by ? by(a, b) : 0) || nm(a).localeCompare(nm(b)));
}
function afActive(){ return AF.q.trim() || AF.status !== 'all' || AF.tiers.length || AF.rar !== 'all' || AF.cat !== 'all'; }
function achProgressText(a, v){
  const f = x => a.u === 'h' ? (x >= 60 ? `${Math.floor(x / 60)}h${x % 60 ? ' ' + (x % 60) + 'm' : ''}` : `${Math.round(x)}m`) : a.u === 'm' ? fmtMin(Math.round(x)) : a.u === 'd' ? `${x} day${x===1?'':'s'}` : x.toLocaleString();
  return `${f(Math.min(v, a.goal))} / ${f(a.goal)}`;
}
function achCard(a, st){
  const got = ACH.u[a.id], T = TIERS[a.tier], hide = a.secret && !got, v = achVal(a, st), pct = Math.min(100, v / a.goal * 100);
  const when = got ? new Date(got).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : '';
  return `<li class="ach${got ? ' got' : ''}${hide ? ' secret' : ''}">${achIcon(a)}
    <span class="ach-tx"><b>${hide ? 'Secret achievement' : esc(a.name)}</b><span>${hide ? 'Keep studying to discover this one.' : esc(a.desc)}</span>
    ${got ? `<small>Unlocked ${when}${rarTxt(a.id)}</small>` : (!hide && a.goal > 1 ? `<span class="ach-prog"><i style="width:${pct}%;background:${T.c}"></i></span><small>${achProgressText(a, v)}</small>` : '')}</span>
    <span class="ach-tier" style="--t:${T.c}">${T.name}<em>+${T.pts}</em>${got && typeof R !== 'undefined' && R ? `<button class="ach-star${myFeatured().includes(a.id) ? ' on' : ''}" data-star="${a.id}" title="Feature on your match card" aria-label="Feature ${esc(a.name)} on your match card" aria-pressed="${myFeatured().includes(a.id)}">★</button>` : ''}</span></li>`;
}
function rarTxt(id){ if (typeof rarityOf !== 'function' || !R) return ''; const p = rarityOf(id); return p == null ? '' : ` · held by ${p < .001 ? '<0.1' : (p * 100).toFixed(p < .1 ? 1 : 0)}% of players`; }
function renderShowcase(){
  const el = $('#achShowcase'); if (!el || !R) return;
  const f = myFeatured();
  el.innerHTML = `<div class="sc-head"><div class="h first">Your showcase</div><span class="hint">${R.showcase ? 'Picked by you' : 'Auto: your rarest'}${R.showcase ? ' · <button class="link-btn" data-act="sc-auto">Use my rarest</button>' : ''}</span></div>
    <div class="sc-slots">${[0,1,2].map(k => { const a = f[k] && achById(f[k]); return a ? `<span class="sc-slot">${badgeHtml(a.id, 'lg')}<b>${esc(a.name)}</b><small>${TIERS[a.tier].name}${rarTxt(a.id)}</small></span>` : '<span class="sc-slot empty"><small>Empty</small></span>'; }).join('')}</div>
    <p class="hint">These show on your side of every ranked match. Tap ★ on an unlocked achievement to feature it.</p>`;
}
function renderAwards(){
  if (!$('#achList') || $('#page-awards').hidden) return;
  renderShowcase();
  const st = achStats(), got = ACHS.filter(a => ACH.u[a.id]), pts = got.reduce((n, a) => n + TIERS[a.tier].pts, 0), maxPts = ACHS.reduce((n, a) => n + TIERS[a.tier].pts, 0);
  $('#achSum').innerHTML = `<div class="ach-big"><b>${got.length}</b><span>/ ${ACHS.length} unlocked</span></div><div class="ach-pts"><b>${pts.toLocaleString()}</b><span>/ ${maxPts.toLocaleString()} points</span></div>
    <div class="ach-bar"><i style="width:${got.length / ACHS.length * 100}%"></i></div>
    <div class="ach-tiers">${Object.entries(TIERS).map(([k, T]) => { const all = ACHS.filter(a => a.tier === k); return `<span style="--t:${T.c}"><i></i>${T.name} <b>${all.filter(a => ACH.u[a.id]).length}/${all.length}</b></span>`; }).join('')}</div>`;
  // the closest locked ones, as a nudge
  const near = ACHS.filter(a => !ACH.u[a.id] && !a.secret && a.goal > 1 && a.cat !== 'meta').map(a => ({a, r: achVal(a, st) / a.goal})).filter(x => x.r > 0).sort((x, y) => y.r - x.r).slice(0, 3);
  $('#achNear').hidden = !near.length;
  $('#achNearList').innerHTML = near.map(x => achCard(x.a, st)).join('');
  // sort and filter controls
  $('#achSort').innerHTML = AF_SORTS.map(([v, l]) => `<option value="${v}" ${v===AF.sort?'selected':''}>${l}</option>`).join('');
  $('#achFilter').innerHTML = [['all','All'],['got','Unlocked'],['locked','Locked'],['progress','In progress'],['secret','Secret']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${AF.status===v}">${l}</button>`).join('');
  $('#achTierChips').innerHTML = TIER_ORDER.map(k => `<button data-v="${k}" style="--t:${TIERS[k].c}" aria-pressed="${AF.tiers.includes(k)}"><i></i>${TIERS[k].name}</button>`).join('');
  $('#achRarSeg').innerHTML = [['all','All'],['rare','Rare (under 10%)'],['ultra','Ultra rare (under 1%)']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${AF.rar===v}">${l}</button>`).join('');
  $('#achCatSel').innerHTML = `<option value="all">All categories</option>` + Object.entries(ACH_CATS).map(([k, l]) => `<option value="${k}" ${k===AF.cat?'selected':''}>${l}</option>`).join('');
  if ($('#achSearch').value !== AF.q) $('#achSearch').value = AF.q;
  const list = achSorted(achFiltered(st), st);
  let h = '';
  if (AF.sort === 'cat'){
    for (const [cat, label] of Object.entries(ACH_CATS)){
      const inCat = list.filter(a => a.cat === cat); if (!inCat.length) continue;
      const all = ACHS.filter(a => a.cat === cat);
      h += `<div class="h ach-h"><span>${label}</span><span>${all.filter(a => ACH.u[a.id]).length}/${all.length}</span></div><ul class="ach-list">${inCat.map(a => achCard(a, st)).join('')}</ul>`;
    }
  } else if (list.length) h = `<ul class="ach-list flat">${list.map(a => achCard(a, st)).join('')}</ul>`;
  const rarPending = AF.rar !== 'all' && !(R && R.rar);
  $('#achList').innerHTML = h || `<div class="empty">${rarPending ? 'Rarity is still being worked out. Give it a few seconds.' : 'No achievements match these filters.'}</div>`;
  $('#achCount').textContent = `Showing ${list.length} of ${ACHS.length}`;
  $('#achClear').hidden = !afActive();
}
$('#achSort').onchange = e => { AF.sort = e.target.value; saveAF(); renderAwards(); };
$('#achFilter').onclick = e => { const b = e.target.closest('button'); if (!b) return; AF.status = b.dataset.v; saveAF(); renderAwards(); };
$('#achTierChips').onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.v; AF.tiers = AF.tiers.includes(k) ? AF.tiers.filter(x => x !== k) : [...AF.tiers, k]; saveAF(); renderAwards(); };
$('#achRarSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; AF.rar = b.dataset.v; saveAF(); renderAwards(); if (AF.rar !== 'all' && typeof computeRarity === 'function') computeRarity(renderAwards); };
$('#achCatSel').onchange = e => { AF.cat = e.target.value; saveAF(); renderAwards(); };
let achSearchT = null;
$('#achSearch').addEventListener('input', e => { clearTimeout(achSearchT); achSearchT = setTimeout(() => { AF.q = e.target.value; renderAwards(); }, 120); });
$('#achClear').onclick = () => { AF = Object.assign({}, AF_DEFAULT, {sort: AF.sort}); $('#achSearch').value = ''; saveAF(); renderAwards(); };
$('#achFToggle').onclick = () => { const o = $('#achFPanel').classList.toggle('open'); $('#achFToggle').setAttribute('aria-expanded', o); };

/* ---------- notes ---------- */
const NOTE_ARCH_IC = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4.5" rx="1"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 13h4"/></svg>';
let noteArchOpen = false;
function renderNotes(){
  const live = NOTES.filter(n => !n.arch), arch = NOTES.filter(n => n.arch).sort((a, b) => b.arch - a.arch);
  $('#noteList').innerHTML = live.map(n => `<li class="${n.done?'done':''}"><input type="checkbox" data-id="${n.id}" ${n.done?'checked':''} aria-label="Done"><span>${esc(n.text)}</span><button data-arch="${n.id}" title="Archive" aria-label="Archive">${NOTE_ARCH_IC}</button><button data-del="${n.id}" aria-label="Delete">×</button></li>`).join('')
    || '<li style="border:0"><span class="lead" style="margin:0">Nothing parked.</span></li>';
  const box = $('#noteArch');
  if (box){
    box.hidden = !arch.length;
    box.innerHTML = arch.length ? `<details class="g-archived"${noteArchOpen ? ' open' : ''}><summary>Archived notes · ${arch.length}</summary><ul class="notes">${arch.map(n => `<li class="${n.done?'done':''}"><span>${esc(n.text)}</span><button data-unarch="${n.id}" title="Move back to your notes" aria-label="Unarchive" style="width:auto;padding:0 8px;font-size:12px">Restore</button><button data-del="${n.id}" aria-label="Delete">×</button></li>`).join('')}</ul></details>` : '';
  }
  renderQuickNotes();
}
const saveNotes = () => store.set('fb.notes', NOTES);

