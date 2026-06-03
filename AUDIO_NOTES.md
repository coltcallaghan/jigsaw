# Audio — Implemented

The audio engine is wired up. Volume/enable settings persist via `useSettings`
and drive playback at runtime. **Audio files are not committed** — drop CC0 /
Pixabay-licensed files into `public/audio/` (see `public/audio/README.md`).
Missing files are silently skipped, so the game runs without any audio present.

## Architecture

- `src/audio/sounds.ts` — asset manifest: SFX keys → paths, theme → music path.
- `src/audio/AudioManager.ts` — singleton engine (HTMLAudioElement based).
  - `play(sfx)` — one-shot SFX, cloned per play so repeats overlap. Respects `sfx × master`.
  - `playMusic(theme)` / `pauseMusic()` / `stopMusic()` — looping per-theme track. Respects `music × master`.
  - `setVolumes({...})` — live volume/enable updates.
  - Auto-pauses music on window blur, resumes on focus.
  - Tolerates missing files: a load error disables that sound permanently (no retry).

## Wiring

- `App.tsx` — pushes settings → `AudioManager.setVolumes()`; starts/stops theme
  music on entering/leaving the `game` screen.
- `PuzzleEngine` — fires `piece_snap`, `piece_group`, `piece_pickup`,
  `tray_add`, `tray_retrieve` at the relevant moments.
- `PuzzleGame.handleComplete` — fires `puzzle_complete`.
- `SettingsScreen` (Audio tab) — master/SFX/music volume sliders + SFX/music toggles.

## SFX events

| Key | When |
|-----|------|
| `piece_snap` | a piece locks to its solved position |
| `piece_group` | two pieces connect to each other |
| `piece_pickup` | drag start |
| `puzzle_complete` | puzzle finished |
| `tray_add` | piece stashed to tray (incl. "Tray all") |
| `tray_retrieve` | piece pulled back from tray |

## Note on autoplay
Browsers block audio until the user interacts with the page. Since all SFX are
triggered by user actions (dragging/snapping) and music starts after navigating
into a game (a click), this is not an issue in practice.
