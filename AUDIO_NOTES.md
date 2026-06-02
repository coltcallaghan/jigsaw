# Audio — Not Yet Implemented

Volume sliders (master, music, SFX) are persisted to localStorage via `useSettings` but have no runtime effect.

## What needs adding

### Music
- Background ambient music tracks (looping, crossfade on difficulty change)
- Suggested: Web Audio API or Howler.js
- Tracks stored in `public/audio/music/`
- Trigger: play on game start, pause on window blur, resume on focus

### SFX
Events that should have sound effects:
- `piece_snap` — short satisfying click when a piece locks to its solved position
- `piece_group` — lighter click when two pieces connect to each other
- `piece_pickup` — subtle whoosh on drag start
- `puzzle_complete` — celebratory fanfare
- `tray_add` / `tray_retrieve` — soft pop

### Wiring
1. Create `src/audio/AudioManager.ts` (singleton)
2. `AudioManager.play(sfx: SfxKey)` — respects `sfxVolume * masterVolume`
3. `AudioManager.playMusic(track: string)` — respects `musicVolume * masterVolume`
4. Call `AudioManager.play('piece_snap')` inside `PuzzleEngine.trySnap()` when a piece is placed
5. Expose `AudioManager.setMasterVolume / setMusicVolume / setSfxVolume` and call them from `useSettings` effect in `App.tsx`
