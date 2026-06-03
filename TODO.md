# App TODO

Outstanding work **inside the app itself** (not release/store plumbing — that's in
[`STORE_CHECKLIST.md`](./STORE_CHECKLIST.md), packaging is in
[`MULTIPLATFORM_PLAN.md`](./MULTIPLATFORM_PLAN.md)).

Legend: 🔴 blocks a good first release · 🟡 should-have · 🟢 nice-to-have

---

## Audio 🔴

The audio **engine is fully wired** ([`src/audio/`](./src/audio/), see
[`AUDIO_NOTES.md`](./AUDIO_NOTES.md)) but **no sound files are committed** —
`public/audio/{sfx,music}/` contain only `.gitkeep`, so the game currently ships
silent. Missing files are skipped gracefully, so this is content-only work.

- [ ] Add 6 SFX files to `public/audio/sfx/` (exact names in
      [`public/audio/README.md`](./public/audio/README.md)):
      `piece_snap`, `piece_group`, `piece_pickup`, `puzzle_complete`,
      `tray_add`, `tray_retrieve` (`.mp3`).
- [ ] Add 4 looping music tracks to `public/audio/music/`:
      `cartoon`, `modern`, `dark`, `arcade` (`.mp3`).
- [ ] Source CC0 / Pixabay (no-attribution) assets only — links + per-theme
      search terms are in `public/audio/README.md`.
- [ ] Keep sizes small (music < 1–2 MB, SFX < 50 KB) — they ship in the bundle.
- [ ] Verify volume sliders + SFX/music toggles in Settings → Audio behave once
      real files are present.

## In-app purchase / size lockdown 🔴 (code DONE — needs store config)

The paid lock on large puzzle sizes is **implemented**: sizes over
`FREE_PIECE_LIMIT` (100) are locked on native, show a lock badge, and open the
themed `UpsellModal` (purchase + restore) via RevenueCat. Remaining is config,
not code:

- [ ] Create the RevenueCat project, the non-consumable product
      `com.coltcallaghan.jigsaw.unlock_all`, and entitlement `unlock_all_sizes`.
- [ ] Set `VITE_RC_IOS_KEY` / `VITE_RC_ANDROID_KEY` (CI secrets + local `.env`).
- [ ] Create the matching IAP product in App Store Connect and Play Console.
- [ ] Decide the unlock price.
- [ ] Manual QA on a device: locked card → modal → purchase → sizes unlock →
      restore on reinstall.
- [ ] (Optional) Revisit `FREE_PIECE_LIMIT` once you have pricing/UX feedback.

> Details and secret inventory: `STORE_CHECKLIST.md`.

## Steam achievements 🟡

[`src/steam/achievements.ts`](./src/steam/achievements.ts) is a **stub** — the IDs
and helpers exist but `unlockAchievement()` is **never called anywhere**, and it
relies on a `window.steamAPI` bridge that isn't wired in the Electron preload.

- [ ] Decide the achievement set (per-size completions + speed run are scaffolded).
- [ ] Expose a real Steamworks bridge (e.g. `steamworks.js`) via the Electron
      preload as `window.steamAPI`.
- [ ] Call `unlockAchievement(...)` on puzzle completion (`PuzzleGame.handleComplete`)
      using `getAchievementForPieceCount(count)` + `FIRST_PUZZLE` / `SPEED_RUN`.
- [ ] Define the achievements in the Steamworks dashboard with matching IDs.

## Setup screen — drag/replace image 🟡

[`SetupScreen.handleFile`](./src/components/SetupScreen.tsx) is a no-op: dropping
or "Replace image" on the setup screen does nothing (re-selection only works from
the main menu).

- [ ] Lift image selection state up, or pass an `onImageSelected` callback into
      `SetupScreen`, so drag-drop / replace actually swaps the image.

## Polish / nice-to-have 🟢

- [ ] Replace any remaining `console.log` (e.g. dev achievement logs) with a
      proper logger or strip in production builds.
- [ ] Confirm puzzle save/resume works across all 8 sizes (esp. 5000/10000 perf).
- [ ] Accessibility pass: keyboard nav, focus states, reduced-motion for confetti.
- [ ] Loading/progress indicator while generating very large puzzles.

---

_Keep this list current — tick items as they land, and move anything store/CI
related to `STORE_CHECKLIST.md`._
