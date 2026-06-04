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
silent. Missing files are skipped gracefully, so this is content-only work
(licensed binaries must be sourced by hand — can't be code-generated).

Run **`npm run check:audio`** to see which of the 10 expected files are present.

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

## Legal / consent 🔴 (code DONE — needs review + hosted URL)

First-run blocking consent gate ([`ConsentGate`](./src/components/ConsentGate.tsx))
shows the bundled Privacy Policy + Terms; acceptance is versioned
([`utils/consent.ts`](./src/utils/consent.ts)). Both docs are always reachable
later via Settings → About. Declining shows a non-blocking "review required"
state with a way back to Accept — no doom loop.

- [ ] Review the draft wording in `src/legal/content.ts` (not legal advice).
- [ ] Host the same text at a public URL for the store listings.
- [ ] Bump `POLICY_VERSION` on material changes to re-prompt existing users.

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

## Steam achievements 🟡 (wired — needs App ID + dashboard config)

Fully wired: [`electron/steam.ts`](./electron/steam.ts) owns the `steamworks.js`
client in the main process, exposed to the renderer as `window.steamAPI` via the
preload. [`src/steam/achievements.ts`](./src/steam/achievements.ts) calls it.
`PuzzleGame` fires per-size completion + `FIRST_PUZZLE` + `SPEED_RUN`, plus the
cumulative **lifetime pieces-placed** milestones (100/1k/10k/100k/1M) tracked in
[`utils/stats.ts`](./src/utils/stats.ts). Everything degrades to a no-op without
Steam / an App ID, so nothing left in code.

Remaining (config / store, once the Steam app exists):
- [ ] Set `STEAM_APP_ID` (env) or ship `steam_appid.txt` with the numeric App ID.
- [ ] Define the achievements in the Steamworks dashboard with IDs matching
      `ACHIEVEMENTS`: `ACH_FIRST_PUZZLE`, `ACH_PUZZLE_*`, `ACH_SPEED_RUN`, and the
      lifetime tiers `ACH_PLACED_100/1000/10000/100000/1000000`.
- [ ] Verify on a Steam build that completing a puzzle unlocks the achievement.

## Polish / nice-to-have 🟢

- [x] Removed dev `console.log` from the achievements path.
- [x] Loading indicator while cutting pieces (spinner + "Cutting N pieces…").
- [x] `prefers-reduced-motion`: hides confetti + stops the loading spinner.
- [x] `aria-label`s on icon-only Rename/Delete buttons in Load Saved.
- [ ] Confirm puzzle save/resume works across all 8 sizes (esp. 5000/10000 perf)
      — manual QA on device/desktop. (Storage bug fixed; perf still unverified.)
- [ ] Fuller accessibility pass: keyboard nav through difficulty grid + focus
      order audit (beyond the labels above).

## Recently fixed

- [x] **Completed puzzles kept in the menu** — finishing a puzzle stores it in a
      separate IndexedDB store (full finished image + time taken), shown in a new
      "Completed" menu view; not subject to the 5-save in-progress trim. The
      finished puzzle is removed from "Load Saved".
- [x] **Lifetime pieces-placed achievements** — cumulative counter
      (`utils/stats.ts`) unlocks 100/1k/10k/100k/1M tiers as pieces are placed.
- [x] **Autosave on placement** — a debounced save (1.5s) now fires whenever a
      piece is correctly placed, plus on completion; back-to-menu/manual save
      still work. Progress survives an unexpected close, not just clean exits.
- [x] **Load Saved was empty / disabled** — saves embedded the full-res image and
      blew past localStorage's ~5MB quota, so `writeSave` silently failed. Moved
      the save store to on-device **IndexedDB** (full-res kept, larger quota) with
      a one-time migration from the old localStorage layout. (2026-06-04)
- [x] Saved puzzles previously stored a truncated data URL as their name — now
      store the real puzzle name (with backfill for old saves).

---

_Keep this list current — tick items as they land, and move anything store/CI
related to `STORE_CHECKLIST.md`._
