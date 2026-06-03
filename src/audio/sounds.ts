import type { Theme } from '../hooks/useSettings'

/**
 * Audio asset manifest.
 *
 * Drop CC0 / Pixabay-licensed files into `public/audio/...` matching the paths
 * below. Anything missing is silently skipped at runtime, so the game works
 * with a partial (or empty) set of files — see AudioManager.
 *
 * Recommended no-attribution sources:
 *   SFX   — kenney.nl (UI packs), pixabay.com/sound-effects, sfxr.me (arcade)
 *   Music — pixabay.com/music, freepd.com
 */

export type SfxKey =
  | 'piece_snap'      // piece locks to its solved position
  | 'piece_group'     // two loose pieces connect to each other
  | 'piece_pickup'    // drag start
  | 'puzzle_complete' // win fanfare
  | 'tray_add'        // piece stashed to tray
  | 'tray_retrieve'   // piece pulled back from tray

/** SFX are shared across themes — one file per event. */
export const SFX_SOURCES: Record<SfxKey, string> = {
  piece_snap: 'audio/sfx/piece_snap.mp3',
  piece_group: 'audio/sfx/piece_group.mp3',
  piece_pickup: 'audio/sfx/piece_pickup.mp3',
  puzzle_complete: 'audio/sfx/puzzle_complete.mp3',
  tray_add: 'audio/sfx/tray_add.mp3',
  tray_retrieve: 'audio/sfx/tray_retrieve.mp3',
}

/** One looping background track per theme, to match each theme's mood. */
export const MUSIC_SOURCES: Record<Theme, string> = {
  cartoon: 'audio/music/cartoon.mp3', // playful / bouncy
  modern: 'audio/music/modern.mp3',   // minimal / lo-fi
  dark: 'audio/music/dark.mp3',       // atmospheric / ambient
  arcade: 'audio/music/arcade.mp3',   // chiptune / 8-bit
}
