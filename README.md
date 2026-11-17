# Focus Bench

A customizable study timer: Pomodoro, 52/17, Flowtime, Timebox and custom modes, a floating mini clock, rain and thunderstorm sounds, a per-activity time log, a notes parking lot, and a Spotify player the timer can pause on breaks.

Everything you save (settings, history, notes) stays in your own browser.

Study guides can be written in the app or imported as Markdown/JSON, and each guide has a **Practice quizzes** tab next to the guide itself: import quizzes (the Import quiz dialog has copyable instructions for Claude), take them one question at a time with explanations and "what to review" notes, then retake, retry just the ones you missed, or copy your results to paste somewhere else.

## Files

No build step. Open `index.html` directly or serve the folder (GitHub Pages).

- `index.html` – page markup
- `css/styles.css` – all styles
- `js/` – plain scripts, loaded in order by `index.html`: `core` (settings, timer), `log`, `spotify`, `effects`, `backup`, `achievements`, `audio`, `ui`, `ranked`, `quizzes`, `guides`, `leaderboards`, `app` (navigation and start-up)
