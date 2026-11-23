# Focus Desk (repo: focus-bench): notes for Claude

## How changes ship
1. New branch from the latest `main` → commit → PR → merge to `main` (the owner wants finished changes merged to
   `main` so they go live; a squash-merged PR can be reverted if the old version is needed).
2. Every shipped change gets a line in `js/whatsnew.js` and a `SYNC_VER` bump in `js/sync.js`.
3. Small changes (including small visual ones) don't need approval first; only big or complex updates do.
4. Never paste secrets (keys, tokens). The Firebase service-account JSON lives only in the GitHub secret `FIREBASE_SA`.

## Where things are
- Code: `~/focus-bench` on the owner's computer. Planning notes: the "Focus Bench" Obsidian vault
  (`C:\Users\shila\OneDrive\Documents\Focus Bench`), which should be kept up to date as features ship.
