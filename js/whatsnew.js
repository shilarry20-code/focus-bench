/* ---------- What's new: every update to Focus Bench, newest first ----------
   Each update has feature sections and its bug fixes at the bottom. New changes go into the newest update until
   something big starts the next one. A dot on the panel button (and on More on phones) shows until you've opened
   the page, and after a change ships you get a one-time note. Whether you've seen it is kept per device. */
const UPDATES = [
  {n: 3, name: 'Living Campus', when: 'Nov 19', secs: [
    ['Players', ['Every player has a major and a real class schedule that changes each semester', 'New usernames for everyone, modeled on real platforms, so names don’t keep repeating', 'Night owls study past midnight, and schedules vary from day to day']],
    ['Studying now', ['A live count of who’s studying, today’s busiest hours and trending classes, on the Ranked page and in the side panel', 'Live feed with For you, Top matches (top 1,000 players) and Everyone tabs']],
    ['Watching matches', ['Watch live top matches from the Top matches tab', 'Study along with them (normal focus time, no Elo)', 'Chat with the other spectators on your breaks']],
    ['Messages', ['Message someone who’s offline and they’ll answer once they’re back online']],
    ['What’s new', ['This page, with a dot in the panel when there’s something new']]],
    fixes: ['Profile page zoomed out on phones', 'The feed said someone started studying while their profile showed Offline', 'Top matches showed one ± number instead of each side’s Elo change', 'Stars drawn in the wrong place on one profile picture', 'People chatting in a watch room sometimes showed as Offline']},
  {n: 2, name: 'Shared World', when: 'Nov 18–19', secs: [
    ['The world', ['682,925 players, the same on every device', 'A daily world save so new devices load quickly']],
    ['Chat', ['People talk about real shows, music and games, with rotating topics and no repeats', 'Several of your messages in a row get one answer', 'Replies actually match the message they answer', 'Emotion emojis only, and no “speaking of…” lead-ins', 'Online players answer DMs within seconds; players who are studying take a few minutes']],
    ['Matches', ['Faster matchmaking', 'A bigger match chat you can scroll back through', 'DMs and match chat stay quiet during your focus blocks', 'Your opponent stays online for a while after a match']],
    ['Studying', ['Weak-spot quizzes built from your flagged and missed questions', 'Reset is now Log: it saves the time you’ve focused, then resets', 'Customizable keyboard shortcuts']],
    ['Gemini', ['Uses 3.5 Flash-Lite, then 3.1 Flash-Lite when it runs out', 'A requests-today counter in Settings']]],
    fixes: ['Leaderboards were scrambled', 'The side panel was laggy to open', 'Match chat showed “1 new” during a focus block', 'Your opponent messaged you or posted in global chat during a match', 'The Reset button didn’t save your time', 'DMs jumped up when you sent a message', 'The chat icon’s dots were off center']},
  {n: 1, name: 'Study Together', when: 'Nov 17–18', secs: [
    ['Quizzes', ['Practice quizzes inside study guides, with Guide and Practice quizzes tabs', 'A quiz editor and question banks', 'A quiz page with every question at once, flags and a mistake bank', 'Mixed tests from several quizzes, and your average score per quiz', 'Quiz history with review notes', 'Better instructions for making quizzes with AI']],
    ['Study guides and flashcards', ['Flashcard study mode: pick a section to study', 'A compact flashcards box', 'Archive study guides', 'Back-to-top buttons and centered single-column guides']],
    ['Side panel', ['Hide it; a glowing left edge brings it back']],
    ['Ranked', ['Recent matches on profiles, lined up with their calendars', 'One match per sitting, opponents matched by rating', 'Find a match when you want one']],
    ['Sync', ['Sync across devices with a GitHub gist', 'Your settings and rank win over a new device’s defaults']],
    ['Chat and DMs', ['A global chat room with tap-to-reply', 'Direct messages, challenges and friendly matches', 'Typing indicators and varied profile pictures', 'Match chat with your opponent', 'Delete messages and jump to the message a reply answers']],
    ['Stats and awards', ['Sessions with the same name are grouped for the day', 'Sensible rarities for guide and quiz achievements']]],
    fixes: ['Contents links in study guides', 'Words splitting in guide tables', 'The Settings section highlight', 'The accent color switching back to a custom color', 'Players said your name when talking to someone else', 'Players agreed to a challenge in DMs but never accepted it']}
];
// a fingerprint of the newest update, so anything added to it counts as new
const wnKey = () => { const u = UPDATES[0]; return u.n + ':' + (u.secs.reduce((n, s) => n + s[1].length, 0) + u.fixes.length); };
const wnSeen = () => store.get('fb.wnSeen', '');
function wnBadge(){
  const unseen = wnSeen() !== wnKey();
  document.querySelectorAll('.wn-dot').forEach(d => d.hidden = !unseen);
}
function renderWhatsNew(){
  const el = $('#wnBody'); if (!el) return;
  const fresh = wnSeen() !== wnKey();
  el.innerHTML = `<p class="hint wn-intro">Everything that’s changed in Focus Bench, newest first.</p>` + UPDATES.map((u, k) => `<details class="card wn"${k === 0 ? ' open' : ''}>
    <summary>${k === 0 && fresh ? '<b class="wn-new">New</b>' : ''}<span class="wn-t"><b>Update ${u.n} · ${esc(u.name)}</b><small>${esc(u.when)}</small></span><svg class="wn-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
    <div class="wn-b">${u.secs.map(([h, items]) => `<div class="wn-sec">${esc(h)}</div><ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}
    <div class="wn-sec wn-fix"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2l1.9 1.9M16 2l-1.9 1.9M9 7.1v-1a3 3 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.5 13H3M21 13h-3.5M6 9.5L3 8M18 9.5l3-1.5M6 17l-3 1M18 17l3 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Bug fixes</div><ul>${u.fixes.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></details>`).join('');
}
const _wnShown = onPageShown;
onPageShown = function(name){
  _wnShown(name);
  if (name === 'whatsnew'){ renderWhatsNew(); store.set('fb.wnSeen', wnKey()); wnBadge(); }
};
// once after an update ships: a short note (not on a brand-new install, where everything is new anyway)
setTimeout(() => {
  const seen = wnSeen();
  if (!seen) store.set('fb.wnToast', wnKey());        // first time: just the dot
  else if (seen !== wnKey() && store.get('fb.wnToast', '') !== wnKey()){ store.set('fb.wnToast', wnKey()); toast(`Updated: Update ${UPDATES[0].n} · ${UPDATES[0].name}. Open What’s new in the panel to see what changed.`); }
  wnBadge();
}, 2500);
