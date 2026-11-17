# Focus Bench

A customizable study timer: Pomodoro, 52/17, Flowtime, Timebox and custom modes, a floating mini clock, rain and thunderstorm sounds, a per-activity time log, a notes parking lot, and a Spotify player the timer can pause on breaks.

Everything you save (settings, history, notes) stays in your own browser.

Study guides can be written in the app or imported as Markdown/JSON, and each guide has a **Practice quizzes** tab next to the guide itself. Write quizzes in the editor or import them (the Import quiz dialog has copyable instructions for Claude). Each quiz is a question bank: every attempt draws a set (10 by default), favoring questions you haven't seen or got wrong, with shuffled choices. Every question shows on one page: answer in any order, flag the ones you're unsure about (flags last for that quiz only), and submit to see explanations and "what to review" notes. Then retake, retry the ones you missed, or copy your results to paste somewhere else. A **mixed test** combines questions from whichever of the guide's quizzes you pick, as many as you choose. Each guide also has a **mistake bank** of questions you got wrong, which you can practice until you get each one right twice in a row.

## Files

No build step. Open `index.html` directly or serve the folder (GitHub Pages).

- `index.html` – page markup
- `css/styles.css` – all styles
- `js/` – plain scripts, loaded in order by `index.html`: `core` (settings, timer), `log`, `spotify`, `effects`, `backup`, `achievements`, `audio`, `ui`, `ranked`, `quizzes`, `guides`, `leaderboards`, `app` (navigation and start-up)
