# App TODO

Outstanding work **inside the app itself** (not release/store plumbing — that's in
[`STORE_CHECKLIST.md`](./STORE_CHECKLIST.md), packaging is in
[`MULTIPLATFORM_PLAN.md`](./MULTIPLATFORM_PLAN.md)).

Legend: 🔴 blocks a good first release · 🟡 should-have · 🟢 nice-to-have

---

## Audio ✅ (DONE — signed off 2026-06-06)

The audio **engine is fully wired** ([`src/audio/`](./src/audio/), see
[`AUDIO_NOTES.md`](./AUDIO_NOTES.md)) and **all expected files are committed** —
`npm run check:audio` reports **14/14 present** (6 SFX + 4 per-theme UI clicks as
`.wav`, 4 per-theme music loops as `.m4a`). The game ships with sound.

- [x] 6 SFX in `public/audio/sfx/` (`piece_snap`, `piece_group`, `piece_pickup`,
      `puzzle_complete`, `tray_add`, `tray_retrieve`).
- [x] 4 per-theme UI click SFX (`ui_click_{cartoon,modern,dark,arcade}`).
- [x] 4 per-theme looping music tracks (`{cartoon,modern,dark,arcade}`).
- [x] **Music compressed to AAC `.m4a`** — the 4 loops were uncompressed `.wav`
      (~4.2 MB total); converted via `afconvert` to ~120–195 KB each, dropping
      the audio bundle to ~800 KB (~81% smaller). `gen-audio.mjs` now
      auto-converts on regen; verified the `.m4a` loops decode + loop via
      `HTMLAudioElement` (the API the app uses). (2026-06-05)
- [x] Volume sliders + SFX/music toggles behave correctly (signed off 2026-06-06).
- [x] Generated machine-made copyright-free audio confirmed as the final choice
      (signed off 2026-06-06).

## Legal / consent 🔴 (code DONE — needs review + hosted URL)

First-run blocking consent gate ([`ConsentGate`](./src/components/ConsentGate.tsx))
shows the bundled Privacy Policy + Terms; acceptance is versioned
([`utils/consent.ts`](./src/utils/consent.ts)). Both docs are always reachable
later via Settings → About. Declining shows a non-blocking "review required"
state with a way back to Accept — no doom loop.

- [ ] Review the draft wording in `src/legal/content.ts` (not legal advice).
- [x] **Hostable public URL prepared** — `scripts/gen-legal-html.mjs` generates
      `privacy.html` + `terms.html` from the SAME `src/legal/content.ts` (single
      source of truth; runs automatically in `npm run build:web`, also
      `npm run gen:legal`). Output lands in `dist-web/`.
- [x] **GitHub Pages live** — auto-deploys the web build on every push to `main`
      (`.github/workflows/deploy.yml`). Game + policy pages are served at
      `https://coltcallaghan.github.io/jigsaw/`,
      `…/privacy.html`, `…/terms.html` (verified 200). Paste the policy URLs into
      the App Store / Play / Steam listings.
- [ ] Bump `POLICY_VERSION` on material changes to re-prompt existing users
      (regenerates the hosted pages on next `build:web` automatically).

## In-app purchase / size lockdown 🔴 (code DONE — needs store config)

The paid lock on large puzzle sizes is **implemented**: sizes over
`FREE_PIECE_LIMIT` (100) are locked on native, show a lock badge, and open the
themed `UpsellModal` (purchase + restore) via RevenueCat. Remaining is config,
not code:

- [x] RevenueCat project + non-consumable product
      `com.coltcallaghan.jigsaw.unlock_all` + entitlement `unlock_all_sizes`
      (product attached). No Offering needed — app fetches product by ID.
- [x] Local `.env` set with the sandbox (`test_`) key for device testing.
- [ ] Add real App Store + Play apps in RevenueCat (product is sandbox-only now)
      and set production `VITE_RC_IOS_KEY` / `VITE_RC_ANDROID_KEY` in CI secrets.
- [ ] Create the matching IAP product in App Store Connect and Play Console.
- [ ] Decide the unlock price (sandbox product is $2.99 for now).
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
- [x] **GPU texture exhaustion fixed via texture atlas** — pieces used to get
      one `Texture.from(bitmap)` each (10000 GPU surfaces → IOSurface exhaustion
      on large puzzles). `renderPieceTextures` now packs pieces into a few
      2048² atlases (shelf-packed) and each piece sprite frames its sub-rect of a
      shared atlas source, collapsing thousands of surfaces → a handful. Verified
      pieces render full image content + correct positioning at 500pc, 0 GPU
      errors. (2026-06-05) — still worth a device check at 10000.
- [x] **Fonts bundled for offline.** All UI fonts are now self-hosted via
      `@fontsource` (imported in `src/fonts.ts`, latin subset only) and the
      Google Fonts CDN `<link>`s are removed from `index.html`. Verified: the
      production build emits the woff2 files and renders correctly with the CDN
      blocked (no network font fetch). (2026-06-04)
- [x] App metadata + working macOS build (2026-06-04). `author` = "Colt
      Callaghan"; bundle `productName` = "Jigsaw" with display name
      `CFBundleDisplayName` = "Jigsaw: Your photos, your puzzle". A colon/commas
      in productName broke Electron's helper-app lookup ("Unable to find helper
      app") — keep the bundle name plain, put the pretty name in the display
      field. Upgraded Electron 28 → 42 (+ electron-builder 26, electron-vite 5)
      for macOS 26 / Apple-silicon support. Verified the packaged arm64 `.dmg`
      launches and runs (ad-hoc signed).
  - **Local mac build:** `npm run package:mac:local` — builds + packages an
    unsigned DMG to `~/Docs/jigsaw/release` (a NON-iCloud folder; `~/Documents`
    is file-provider managed and re-stamps `com.apple.FinderInfo`, which
    `codesign` rejects). Hardened runtime is off for unsigned. An `afterPack`
    hook (`scripts/afterPack.cjs`) strips xattrs before signing. The default
    `npm run package:mac` (output `release/`) is for CI / signed release builds.
  - Unsigned builds prompt for keychain ("jigsaw Safe Storage", Chromium cookie
    encryption) on launch — expected; a real Developer ID signature removes it.
- [ ] Fuller accessibility pass: keyboard nav through difficulty grid + focus
      order audit (beyond the labels above).
- [ ] **Bump GitHub Actions off Node 20 before Sep 2026** (cosmetic; nothing
      breaks now). All 7 workflows in `.github/workflows/` use `actions/*@v4`
      (checkout, setup-node, setup-java, upload-artifact, deploy-pages, etc.)
      which run on the Node 20 runtime — GitHub deprecates it: forced to Node 24
      on **2026-06-16**, removed **2026-09-16**. Fix by bumping to action
      versions that support Node 24, or set
      `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` in the workflows.
- [ ] **Theme-styled puzzle images** (parked 2026-06-04). Idea: restyle the
      photo per theme so it matches the theme's look (e.g. cartoon = "Mario"
      illustration, arcade = neon). Findings from a spike:
  - **Arcade is easy + effective:** a live PixiJS `ColorMatrixFilter`
    (saturation + contrast + slight brightness) on `piecesLayer` + the ghost
    sprite. ~15 lines, no deps, fully offline, toggles instantly on theme
    switch. Worth doing standalone whenever wanted.
  - **Cartoon is the hard one:** pure-canvas filters (posterize + edge-ink +
    edge-preserving box blur) only ever produce a *stylized photo*, never
    hand-drawn game art — tuning ranged from too-subtle → radioactive →
    painterly-but-still-a-photo. A genuine "Mario" look needs a trained
    style-transfer model (e.g. TF.js, bundleable for offline but multi-MB +
    ~1–3s/image). Decide if that weight/latency is worth it before retrying.
  - Constraint: must stay **offline** (Capacitor/Steam) — rules out any
    image-to-image API.
  - Mid-game theme switches already work for outlines/felt/borders
    (`PuzzleEngine.setTheme`, committed). Baked image restyle would re-slice
    all piece textures on switch (cost scales with piece count).

## Recently fixed

- [x] **Resizable tray + piece-size slider (desktop)** — drag the tray's left
      edge to resize it (width clamped 180–560px, persisted); a slider sets the
      grid column count 1–6 (bigger ↔ smaller pieces, persisted). Both hidden on
      touch (bottom-sheet layout). (2026-06-05)
- [x] **Fixed board flashing black while resizing the tray** — the board's
      `ResizeObserver` resized the WebGL renderer on every pointermove (and
      occasionally to a zero size → incomplete framebuffer → black frame). Now:
      resizes are coalesced to one per animation frame, skipped entirely during
      an active tray drag (one clean resize on release), and `engine.resize()`
      ignores zero/unchanged dimensions. (2026-06-05)
- [x] **Continue now re-fetches the save from IndexedDB** (same path as Load
      Saved) instead of trusting the in-memory autosave snapshot, so Continue and
      Load behave identically. (2026-06-05)
- [x] **PixiJS v8 deprecation cleared** — pieces are now a `Container` holding an
      inner image `Sprite` + edge/border `Graphics`, instead of adding children
      to a `Sprite` (which Pixi v8 deprecates: "Only Containers will be allowed
      to add children"). Verified no warnings/errors and pieces render + drag
      correctly. (2026-06-04)
- [x] **All audio committed** — 14/14 files present (`npm run check:audio`); the
      game no longer ships silent. (2026-06-04)
- [x] **Theme-aware, zoom-adaptive piece outlines** — outlines now restyle per
      theme live (`PuzzleEngine.setTheme`), stay a constant on-screen thickness
      when zoomed, and are capped so they never swamp tiny pieces on 5k/10k
      puzzles. (2026-06-04)
- [x] **In-game settings modal** — settings (incl. live theme switch) reachable
      mid-puzzle via the HUD gear. (2026-06-04)
- [x] **Completion now lands correctly** — the finished puzzle is written before
      the menu refreshes (was a race, so it didn't appear in Completed), and the
      active puzzle is marked finished so "Continue" no longer reopens it on an
      empty board.
- [x] **No save limit** — removed the old 5-save cap on in-progress puzzles;
      both in-progress and completed are now bounded only by device storage. A
      "storage almost full" banner appears (via the Storage API) when usage is
      near quota, so users can delete puzzles instead of hitting silent failures.
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
