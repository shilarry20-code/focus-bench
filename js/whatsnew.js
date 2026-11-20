/* ---------- What's new: every update to Focus Bench, newest first ----------
   Each update has feature sections and its bug fixes at the bottom. New changes go into the newest update until
   something big starts the next one. A dot on the panel button (and on More on phones) shows until you've opened
   the page, and after a change ships you get a one-time note. Whether you've seen it is kept per device. */
const UPDATES = [
  {n: 6, key: 3, name: 'Living Campus', when: 'Nov 19', secs: [
    ['Players', ['Every player has a major and a real class schedule that changes each semester', 'New usernames for everyone, modeled on real platforms, so names don’t keep repeating', 'Night owls study past midnight, and schedules vary from day to day']],
    ['Studying now', ['A live count of who’s studying, today’s busiest hours and trending classes, on the Ranked page and in the side panel', 'Hover over (or tap) an hour’s bar to see how many were studying', 'Live feed with For you, Top matches (top 1,000 players) and Everyone tabs']],
    ['Watching matches', ['Watch live top matches from the Top matches tab', 'Study along with them (normal focus time, no Elo)', 'Chat with the other spectators on your breaks']],
    ['Matches', ['Passing your opponent wins the match right away; your time keeps counting (shown as TBD) through your focus blocks until you pause or end your session, so a long session shows as a big win (breaks don’t end it)', 'Find your next match while you’re still studying after a win', 'No more draws: every match has a winner']],
    ['Feed', ['A new Feed page replaces global chat, with For you, Following and You tabs', 'Players post pictures of where they study, session receipts, match results and short updates, with captions and comments that know what’s in the picture', 'Make your own picture posts from presets: place, lighting, camera (including selfie), face, pose, hands, season and how you look', 'Share a session, match or rank, or post text', 'Like, comment, follow, and get notifications when people like, comment on or follow you', 'People who comment on your post can challenge you to a match', 'Outlines that keep objects from blending into the background', 'Most posts are now words over a dimmed picture, and your text posts get a background you can shuffle', 'Tap comment to open the post with its comments beside it, like Instagram (stacked on phones)']],
    ['Profiles', ['A new profile layout: picture with Posts, Followers and Following counts, bio, Follow / Message / Challenge, quick stats, and Posts, Stats, Ranked and Awards tabs', 'Every player has followers and following, from a few dozen to hundreds of thousands for the very top', 'Tap Followers or Following to see the list, search it and follow people from it', 'Follows you tags and “Followed by people you follow”', 'Write your own bio from Edit profile']],
    ['Messages', ['Chat is now Messages, just your DMs', 'Message someone who’s offline and they’ll answer once they’re back online', 'Come back after a while and someone may have messaged you while you were away', 'Everyone has their own go-to emojis from the whole range of faces, hands and hearts']],
    ['What’s new', ['This page, with a dot in the panel when there’s something new']]],
    fixes: ['Profile page zoomed out on phones', 'The feed said someone started studying while their profile showed Offline', 'Top matches showed one ± number instead of each side’s Elo change', 'Stars drawn in the wrong place on one profile picture', 'People chatting in a watch room sometimes showed as Offline', 'A live match could disappear without showing up under finished matches', 'Lag when coming back to the leaderboard or Ranked after a while', 'The Feed stayed empty if you opened it while the world was still loading', 'Some poses plus a hand gesture gave people three or four hands; gestures that need a busy hand are now greyed out', 'Desk lamps, tea bags, ramen chopsticks and charger cables looked detached', 'People in pictures had floating hands and gaps at the neck: every pose now has arms connected at the shoulders, a neck that reaches the shirt, and selfies show the arm holding the phone']},
  {n: 5, name: 'Shared World', when: 'Nov 18', secs: [
    ['The world', ['682,925 players, the same on every device', 'A daily world save so new devices load quickly']],
    ['Chat', ['People talk about real shows, music and games, with rotating topics and no repeats', 'Several of your messages in a row get one answer', 'Replies actually match the message they answer', 'Emotion emojis only, and no “speaking of…” lead-ins', 'Online players answer DMs within seconds; players who are studying take a few minutes']],
    ['Matches', ['Faster matchmaking', 'A bigger match chat you can scroll back through', 'DMs and match chat stay quiet during your focus blocks', 'Your opponent stays online for a while after a match']],
    ['Studying', ['Weak-spot quizzes built from your flagged and missed questions', 'Reset is now Log: it saves the time you’ve focused, then resets', 'Customizable keyboard shortcuts']],
    ['Gemini', ['Uses 3.5 Flash-Lite, then 3.1 Flash-Lite when it runs out', 'A requests-today counter in Settings']]],
    fixes: ['Leaderboards were scrambled', 'The side panel was laggy to open', 'Match chat showed “1 new” during a focus block', 'Your opponent messaged you or posted in global chat during a match', 'The Reset button didn’t save your time', 'DMs jumped up when you sent a message', 'The chat icon’s dots were off center']},
  {n: 4, name: 'Study Together', when: 'Nov 17', secs: [
    ['Quizzes', ['Practice quizzes inside study guides, with Guide and Practice quizzes tabs', 'A quiz editor and question banks', 'A quiz page with every question at once, flags and a mistake bank', 'Mixed tests from several quizzes, and your average score per quiz', 'Quiz history with review notes', 'Better instructions for making quizzes with AI']],
    ['Study guides and flashcards', ['Flashcard study mode: pick a section to study', 'A compact flashcards box', 'Archive study guides', 'Back-to-top buttons and centered single-column guides']],
    ['Side panel', ['Hide it; a glowing left edge brings it back']],
    ['Ranked', ['Recent matches on profiles, lined up with their calendars', 'One match per sitting, opponents matched by rating', 'Find a match when you want one']],
    ['Sync', ['Sync across devices with a GitHub gist', 'Your settings and rank win over a new device’s defaults']],
    ['Chat and DMs', ['A global chat room with tap-to-reply', 'Direct messages, challenges and friendly matches', 'Typing indicators and varied profile pictures', 'Match chat with your opponent', 'Delete messages and jump to the message a reply answers']],
    ['Stats and awards', ['Sessions with the same name are grouped for the day', 'Sensible rarities for guide and quiz achievements']]],
    fixes: ['Contents links in study guides', 'Words splitting in guide tables', 'The Settings section highlight', 'The accent color switching back to a custom color', 'Players said your name when talking to someone else', 'Players agreed to a challenge in DMs but never accepted it']},
  {n: 3, name: 'Leaderboards & Profiles', when: 'Nov 16', secs: [
    ['Leaderboards', ['11 leaderboard categories']],
    ['Ranks', ['100 Elo per division, with divisions running I to III', 'Distinguished Professor, Provost, Chancellor and Laureate', 'Paragon for the single top player', 'New emblems for every rank']],
    ['Players', ['250,000 players, each with their own study history']],
    ['Profiles', ['A popup and a full page with stats, leaderboard places, 6-month activity, a calendar of every session and achievements', 'Your own display name and avatar color']],
    ['Matches', ['Results show both times, with seconds on close finishes']],
    ['Study guides', ['Write them or import them as Markdown, text or JSON', 'Checklists and flashcards', 'Study a guide next to the timer']]],
    fixes: ['Some players had days longer than 24 hours', 'Rank icon marks didn’t match the division', 'Both sides of a match result showed the same time', 'Long guide contents were cut off']},
  {n: 2, name: 'Ranked', when: 'Nov 13', secs: [
    ['Timer', ['Stopwatch mode, which counts up until you’re done']],
    ['Layout', ['A redesign with separate pages (Focus, Stats, Ranked, Awards, Settings) and a quick dock']],
    ['Streaks', ['A daily study streak, where 10 minutes counts as a day']],
    ['Achievements', ['144 achievements with an Awards page and unlock pop-ups', 'Search, sort and filters, and badge details on hover']],
    ['Ranked', ['You’re matched automatically when you study, with Elo, ranks, a live match card, badges, a showcase and a ladder of 5,000 players']],
    ['Sessions', ['Switching tasks mid-session splits the time automatically']]],
    fixes: ['A new match started right after a win', 'Badge details vanished while you hovered over them', 'Switching between similar task names, like CNIT 182 → CNIT 176, didn’t split the time']},
  {n: 1, name: 'Release', when: 'Oct 27', secs: [
    ['Timer', ['Pomodoro, 52/17, Flowtime, Timebox and Custom modes', 'Rolling digits and a glowing ring', 'A mini clock you can pop out over other windows']],
    ['Sounds', ['White and brown noise', 'Realistic rain and thunder, with on-screen rain and lightning']],
    ['Look', ['Themes, fonts and colors to customize']],
    ['Log', ['Each session records what you were working on', 'Bars split by activity, with details on hover']],
    ['Sessions', ['Back-to-back sessions are grouped', 'Edit sessions and pick which ones to delete', 'A Calendar tab with weeks by default and a Month view']],
    ['Music', ['A Spotify player with study playlists', 'Music per activity and for breaks']],
    ['Backup', ['Backup and restore']]],
    fixes: ['Noise skipped a beat when it looped', 'Rain had fake-sounding plops', 'The Spotify player was blank in the downloaded copy', 'Log bars didn’t show what you were working on']}
];
// a fingerprint of the newest update, so anything added to it counts as new
// (key: the number an update had before older updates were added and the list was renumbered; leave it off new ones)
const wnKey = () => { const u = UPDATES[0]; return (u.key ?? u.n) + ':' + (u.secs.reduce((n, s) => n + s[1].length, 0) + u.fixes.length); };
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
