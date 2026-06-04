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
  piece_snap: 'audio/sfx/piece_snap.wav',
  piece_group: 'audio/sfx/piece_group.wav',
  piece_pickup: 'audio/sfx/piece_pickup.wav',
  puzzle_complete: 'audio/sfx/puzzle_complete.wav',
  tray_add: 'audio/sfx/tray_add.wav',
  tray_retrieve: 'audio/sfx/tray_retrieve.wav',
}

/**
 * UI button-press click — one variant per theme so the feedback matches each
 * theme's character (played via AudioManager.playClick(theme)).
 */
export const UI_CLICK_SOURCES: Record<Theme, string> = {
  cartoon: 'audio/sfx/ui_click_cartoon.wav', // bright two-tone
  modern: 'audio/sfx/ui_click_modern.wav',   // soft clean blip
  dark: 'audio/sfx/ui_click_dark.wav',       // low muted thunk
  arcade: 'audio/sfx/ui_click_arcade.wav',   // retro square blip
}

/** One looping background track per theme, to match each theme's mood. */
export const MUSIC_SOURCES: Record<Theme, string> = {
  cartoon: 'audio/music/cartoon.wav', // playful / bouncy
  modern: 'audio/music/modern.wav',   // minimal / lo-fi
  dark: 'audio/music/dark.wav',       // atmospheric / ambient
  arcade: 'audio/music/arcade.wav',   // chiptune / 8-bit
}
