# Focus Bench

A study timer that turns studying into a game you play alongside a whole world of other students. You run focus sessions, and around them there is ranked competition, a social feed, messages, stories and leaderboards, all made from your real study time. The other players are simulated: their days, sessions, matches, posts and stories are worked out from the time and each player, so everyone sees the same world on every device.

## What's in it

**Focus**
- Timer modes: Pomodoro, 52/17, Flowtime, Timebox and custom. Also a floating mini clock, rain and thunderstorm sounds, a Spotify player the timer can pause on breaks, and a per-activity time log.
- Streaks, daily totals, levels and XP, and achievements (Awards).
- Stats: your history, charts and totals.

**Ranked**
- 1v1 matches: you're matched with a player near your rating, and whoever studies longer wins. Elo, ranks and placement matches.
- Group matches with 4, 8 or 16 players: everyone studies at once, each round allows a little break time, going over it or stopping knocks you out, and the last one studying wins. Find match on the Ranked page or right on the Focus tab.
- Replays of any match, yours or anyone's. They "download" with a progress bar and have a timeline, a lead graph, a who's-ahead graph for groups, per-player stats at any moment, and the match chat. Chat in other players' replays is written by Gemini and only happens on their breaks.
- Watch live top matches between top-1,000 players. The view can be enlarged, and it has a viewers' chat plus the players' own match chat.

**Lobbies**
- Hundreds of casual group lobbies of any size from 3 to 16 and any rules (relaxed, hardcore, sudden death, longer or shorter rounds). They fill up as players trickle in and are the same on every device.
- Search, joinable/not joinable filters, and a player-count slider.
- Create your own lobby.

**Feed**
- Posts from the people you follow: pictures of where they study, session cards, match results and text posts. Each has comments that grow over time.
- Likes, comments and shares on every post, a list of who liked it, insights on your own posts, and sharing a post to anyone in your DMs.
- Stories like Instagram, in the same row as the live matches. They last 24 hours, and some people post most days while others post rarely. You get a full-screen viewer (Instagram's desktop layout on a computer), replies and reactions that land in DMs with the story attached, and your own stories with a list of who viewed them.
- A live feed of what's happening: sessions starting, matches, top matches.

**Messages**
- Discord-style DMs and group chats with search, replies, reactions and challenges. People answer with Gemini, write like college students, and only when they're actually online.
- @mentions with autocomplete across the app.

**Leaderboards**
- Daily, weekly and all-time boards, a 7-day rank chart, and rivals.

**Study tools**
- Study guides written in the app or imported as Markdown or JSON. Each guide has practice quizzes built from question banks, mixed tests, a mistake bank, and flashcards.
- Notes, including a parking lot for stray thoughts while you focus.

**What's new** lists every update.

## Data and sync

- Everything you save lives in your own browser (localStorage and IndexedDB). Optional sync through a private GitHub gist keeps your devices in step.
- The shared feed (comments everyone sees) is stored in Firestore.
- Gemini (free tier; Flash-Lite models) writes chat, DMs, comments and replay chat when you add your own API key in Settings. Without a key the app falls back to built-in lines.

## Files

No build step. Open `index.html` directly or serve the folder (it's hosted on GitHub Pages).

- `index.html`: page markup and the order the scripts load in
- `css/styles.css`: all styles
- `js/`: plain scripts (no modules), including:
  - **Core:** `core` (settings, timer), `log`, `ui`, `keys`, `app` (navigation and start-up)
  - **Players and pictures:** `names`, `people`, `topics`, `avatars`, `scenes` (the simulated players, their avatars and the study-scene pictures)
  - **Competition:** `ranked`, `elim` (lobbies and group matches), `elwatch`, `replay`, `rpdl`, `watch`, `matchchat`
  - **Social:** `feed`, `fdbuild`, `social`, `insights`, `share`, `stories`, `livefeed`, `cloud`
  - **Chat:** `chat`, `cbcore`, `dms`, `groups`, `dc`, `atlist`
  - **Leaderboards and progress:** `leaderboards`, `lb2`, `levels`, `achievements`, `challenges`, `minis`
  - **Study tools:** `guides`, `quizzes`, `flashcards`
  - **Settings:** `sync`, `backup`, `spotify`, `audio`, `effects`, `whatsnew`
- `tools/` and `.github/workflows/`: the overnight jobs that update the simulated world and write new feed comments (`comments.mjs` writes to Firestore with the `FIREBASE_SA` secret)
