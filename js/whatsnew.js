/* ---------- What's new: every update to Focus Bench, newest first ----------
   Each update has feature sections and its bug fixes at the bottom. New changes go into the newest update until
   something big starts the next one. A dot on the panel button (and on More on phones) shows until you've opened
   the page, and after a change ships you get a one-time note. Whether you've seen it is kept per device. */
const UPDATES = [
  {n: 16, name: 'Shared Feed', when: 'Nov 20', secs: [
    ['Shared feed', ['Turn it on in Settings → Shared feed and sign in with Google: your feed (posts, comments, likes, follows and notifications) lives in your own free Firebase database, so every device shows the same thing', 'One device writes new posts and comments at a time: whichever you used last. The others follow along, so your free Gemini requests aren’t spent twice', 'The first device to sign in uploads its feed; other devices switch to it (your own posts are kept)', 'Settings shows today’s reads and writes against Firebase’s free daily limits']],
    ['Feed', ['Posts now stay for 90 days (the top posts of all time, your own posts and ones you liked stay longer)']]],
    fixes: []},
  {n: 15, name: 'Levels', when: 'Nov 20', secs: [
    ['Levels', ['Earn XP and level up: 1 XP per minute studied, +25 for hitting your daily goal, +30 per ranked win, XP for every challenge, and +25 to +500 for achievements', 'Your whole history counts, so you start at the level you’ve already earned', 'Early levels come quickly, then each one takes a bit more (40 XP more than the last)', 'Your level and XP bar sit in the top bar and under the timer, with +XP pops and a level-up banner', 'A level card on your profile shows today’s XP and where all your XP came from', 'Level badges next to names in the Feed, leaderboards, chat, DMs and profiles, coloured by tier: Grey, Bronze (10), Silver (25), Gold (50), Diamond (75) and Legendary (100)', 'Everyone else has a level too, and there’s a new Level board under Awards']],
    ['Challenges', ['Each challenge gives XP by how hard it is (daily 20–40, weekly 100–150, monthly 300–400), plus a bonus for finishing a whole set (+50, +200, +500)', 'Only daily challenges can be rerolled now']],
    ['Daily goal', ['Your daily goal is now minutes studied instead of focus blocks, so every timer mode counts the same. It starts from about what your old goal meant; change it in Settings → Timer', 'The dots in the top bar became a progress bar toward the goal']]],
    fixes: ['Your posts didn’t sync between devices: your posts (with their comments), who you follow and your followers now sync with everything else', 'On phones the page behind an open post (or any pop-up) could still scroll', 'Opening comments on a phone jumped straight into the comment box and brought up the keyboard', 'Insights are only on your own posts now', 'The level chip in the top bar didn’t match the other chips: it now has the same shape, with a star coloured by your tier', 'Level badges sat on their own stretched line in some places: they now sit right next to the name', 'Tapping a name on an open post closed the post: the mini profile now opens on top, and closing it (or pressing Escape) takes you back to the post', 'Reopening the app made every comment, reply, like and follow from while it was closed show up as “just now”: they now keep the time they actually happened', 'In match chats and watched-match room chats, a message and its reply could arrive at the same moment: messages now come in one at a time, a couple of seconds apart']},
  {n: 14, name: 'Challenges', when: 'Nov 20', secs: [
    ['Challenges', ['A Challenges card on the Focus page: 3 daily, 4 weekly and 5 monthly challenges with progress bars, resetting at midnight, on Mondays and on the 1st', 'They fit how you study: targets are based on your usual study time, ranked ones only show up if you play ranked, and none of them ask you to gain Elo or reach a rating', 'One free reroll a day to swap a challenge you don’t want', 'Your ranked challenges also show on the Ranked page', 'Each challenge has its own icon, colour-coded: blue for studying, amber for ranked, pink for the Feed']],
    ['Feed', ['More picture posts: about 60% of posts are pictures (and match or session cards) and 40% are text']],
    ['Leaderboards', ['Two new Rating boards: Ranked wins and Win % (to one decimal, at least 20 rated games to appear)', 'Win rates on the Ranked page and on profiles now show one decimal, and profiles show each player’s overall win rate']]],
    fixes: ['The Win % board topped out around 80%: with this many players the best records now reach the mid 90s', 'Every player now has a real win/loss record: each match they play adds a win or a loss (the same ones in their match history), so win rates move with their results, and players who sit longer than others near their rating win more', 'Some records didn’t match the match history on the same profile (100% with losses showing): any match in someone’s history now counts in their record exactly', 'People who just liked, commented on or followed you showed as offline right away: now they stay online for a while after', 'Comments on your posts all arrived at the same moment: now people find your post a minute or several apart']},
  {n: 13, name: 'Insights', when: 'Nov 20', secs: [
    ['Post insights', ['Tap the chart button on any of your posts (or View insights under it) to see how it did: people reached, new followers, a reach ring for followers and everyone else, likes over time (total or per hour), an engagement breakdown, top comments, and a bar chart next to your recent posts', 'On other people’s posts the same button shows the public numbers: likes, comments, replies and when it was posted']],
    ['Feed', ['Tap a post’s like count to see who liked it, and follow them from the list', 'Tap a name or picture in your notifications to open their profile, and clear your notifications with the Clear button']],
    ['Profiles', ['Profile pop-ups show whether someone is online, studying or offline']]],
    fixes: ['Opening a post’s comments jumped to the bottom instead of starting at the top', 'Comments kept turning into people talking about their own major and classes: now they stay on the post']},
  {n: 12, name: 'New Faces', when: 'Nov 19', secs: [
    ['Profile pictures', ['About 120 new picture designs: food (donuts, ramen, bubble tea, sushi and more), new animals (foxes, axolotls, otters, sloths, bees…), everyday things, places and skies, little blob characters, sports balls and patterns', 'Each design picks its own colours, details and moods per player, so far fewer people share a lookalike picture']]],
    fixes: ['Posters kept commenting on their own posts: now they only answer comments (about one answer for every 8 comments), and the extra ones were cleared from existing posts', 'Players coming back online almost always opened DM replies with “sorry, just saw this”: now most just answer what you said', 'Players could send two or three texts at the exact same moment (after a focus block, when you reopened the app, or when they messaged first): now each text arrives a few seconds after the last', 'In the last two hours before the daily reset, the comment builder left a couple hundred Gemini requests unused: now it uses all but 30']},
  {n: 11, name: 'Your Own Clock', when: 'Nov 19', secs: [
    ['Ranked matches', ['You and your opponent each study on your own clock: yours counts while you focus, theirs runs on their own schedule of study blocks and breaks, even while you’re on a break or away', 'The match card shows their time, and whether they’re studying, on a break or stopped', 'Stopping your timer (pause, log or finish) locks in your time; the match waits for them to finish, and if they pass you, you lose', 'If they stop first and you’re ahead, you win right away and your time keeps counting until you stop', 'Some opponents push on for another block when they’d stop behind you', 'Close the app after stopping and the match still settles: their time comes from their schedule, so the result is there when you come back, dated when it was decided']]],
    fixes: []},
  {n: 10, name: 'The Podium', when: 'Nov 19', secs: [
    ['Leaderboards', ['Categories grouped with icons: Rating, Time, Streaks, Records and Awards', 'Filter by Everyone, Following, Your major or Rivals', 'A podium for the top 3, with a crown for #1 and dots for anyone studying right now', 'Your standing card: your place, a chart of your rank over the last two weeks, and how far to the next player and the next top-% mark', 'Cybersecurity is a new major, and the major list is in alphabetical order', 'Arrows showing who moved up or down since yesterday, and New for anyone who just entered the top 50', 'Scroll the whole board from #1 to the last player, jump to yourself, and keep your own row pinned while you scroll', 'A chart of where everyone stands, reset countdowns on the weekly and monthly boards, and last period’s top 3', 'Streak flames, “still going” tags, record dates and rarest badges on the boards they fit']]],
    fixes: []},
  {n: 9, name: 'Going Viral', when: 'Nov 19', secs: [
    ['Feed', ['Hot, Top (today, this week, this month, all time) and New tabs, each with an icon', 'Your notifications moved to the heart next to New post, with a small picture of the post that opens it', 'Likes come from how many followers someone has, so big accounts get thousands and a post can go viral', 'Big posts get hundreds to thousands of comments over time, with replies folded under each comment (View replies) and the most liked first', 'Like comments and replies with the heart next to them, with the count under it like Instagram', 'About 30% more posts a day', 'Posts are kept for 30 days, plus the all-time top 1,000, in bigger storage on your device']],
    ['Live in the Feed', ['A Live now strip above the posts: live top matches to watch, and people you follow (and rivals) who are studying', 'On wide screens, a side column with who’s studying now, today’s hours, trending classes and what’s happening, with Watch buttons', 'A Live tab with the full live feed, which moved here from the Ranked page (the studying-now count in the side panel opens it)', 'Hover over (or tap) any subject in the live feed for a card: how many are studying it right now, how many studied it today, when it was busiest and which majors study it most']],
    ['Comment builder', ['Fills big posts with comments using only leftover Gemini requests, with a daily cap and an off switch in Settings → Chat', 'Keeps building overnight through a GitHub workflow while the app is closed, and merges in when you open it', 'The request counter adds up every device through gist sync, and only one device builds at a time']],
    ['Talking points', ['Players start posts, DMs and chats from about 3,000 different topics that fit them, the time of day and the season, so openers stop repeating', 'They talk about real and made-up shows, music, games and celebrities (gossip included), and others play along', 'Openers vary instead of starting the same way']]],
    fixes: ['The comment builder settings didn’t show up in Settings → Chat', 'The Gemini request counter left out retries, errors and your other devices, so it read low']},
  {n: 8, name: 'Profiles', when: 'Nov 19', secs: [
    ['Profiles', ['A new profile layout: picture with Posts, Followers and Following counts, bio, Follow / Message / Challenge, quick stats, and Posts, Stats, Ranked and Awards tabs', 'Write your own bio from Edit profile']],
    ['Followers', ['Every player has followers and following, from a few dozen to hundreds of thousands for the very top', 'Tap Followers or Following to see the list, search it and follow people from it', 'Follows you tags and “Followed by people you follow”']]],
    fixes: ['Opening a profile from a post left the post open on top']},
  {n: 7, name: 'The Feed', when: 'Nov 19', secs: [
    ['Feed', ['A new Feed page replaces global chat', 'Players post pictures of where they study, session receipts, match results and text posts, with captions and comments that know what’s in the picture', 'Text posts: big words on a color, gradient or pattern card (notebook paper, graph paper, dots, stripes, waves, confetti and more)', 'Like, comment, follow, and get notifications when people like, comment on or follow you', 'People who comment on your post can challenge you to a match', 'Tap comment to open the post with its comments beside it, like Instagram (stacked on phones), with answers threaded under the comment they answer']],
    ['Your posts', ['Make picture posts from presets: place, lighting, camera (including selfie), face, pose, hands, season and how you look', 'Share a session, match or rank, or post text on a card you pick']],
    ['Pictures', ['Outlines that keep objects from blending into the background', 'Arms connected at the shoulders, a neck that reaches the shirt, and the arm holding the phone in selfies', 'A hallway view through an open door for the doorway camera angle']],
    ['Messages', ['Chat is now Messages, just your DMs']]],
    fixes: ['The Feed stayed empty if you opened it while the world was still loading', 'The Feed took several seconds to open while the world was catching up', 'Some poses plus a hand gesture gave people three or four hands; gestures that need a busy hand are greyed out', 'Desk lamps, tea bags, ramen chopsticks and charger cables looked detached', 'Players answered comments with a new comment instead of a reply']},
  {n: 6, key: 3, name: 'Living Campus', when: 'Nov 19', secs: [
    ['Players', ['Every player has a major and a real class schedule that changes each semester', 'New usernames for everyone, modeled on real platforms, so names don’t keep repeating', 'Night owls study past midnight, and schedules vary from day to day']],
    ['Studying now', ['A live count of who’s studying, today’s busiest hours and trending classes, on the Ranked page and in the side panel', 'Hover over (or tap) an hour’s bar to see how many were studying', 'Live feed with For you, Top matches (top 1,000 players) and Everyone tabs']],
    ['Watching matches', ['Watch live top matches from the Top matches tab', 'Study along with them (normal focus time, no Elo)', 'Chat with the other spectators on your breaks']],
    ['Matches', ['Passing your opponent wins the match right away; your time keeps counting (shown as TBD) through your focus blocks until you pause or end your session', 'Find your next match while you’re still studying after a win', 'No more draws: every match has a winner']],
    ['Messages', ['Message someone who’s offline and they’ll answer once they’re back online', 'Come back after a while and someone may have messaged you while you were away', 'Everyone has their own go-to emojis from the whole range of faces, hands and hearts']],
    ['What’s new', ['This page, with a dot in the panel when there’s something new']]],
    fixes: ['Profile page zoomed out on phones', 'The feed said someone started studying while their profile showed Offline', 'Top matches showed one ± number instead of each side’s Elo change', 'Stars drawn in the wrong place on one profile picture', 'People chatting in a watch room sometimes showed as Offline', 'A live match could disappear without showing up under finished matches', 'Lag when coming back to the leaderboard or Ranked after a while']},
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
    ${u.fixes.length ? `<div class="wn-sec wn-fix"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2l1.9 1.9M16 2l-1.9 1.9M9 7.1v-1a3 3 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.5 13H3M21 13h-3.5M6 9.5L3 8M18 9.5l3-1.5M6 17l-3 1M18 17l3 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Bug fixes</div><ul>${u.fixes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></details>`).join('');
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
