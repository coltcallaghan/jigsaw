#!/usr/bin/env node
// Reports which expected audio files are present/missing in public/audio/.
// The game runs fine without them (missing files are skipped at runtime), so
// this is a release-readiness check, not a build gate. Exits 0 always; pass
// --strict to exit 1 when any file is missing (useful in a pre-release CI step).

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(root, 'public')

// Keep in sync with src/audio/sounds.ts.
const THEMES = ['cartoon', 'modern', 'dark', 'arcade']

const SFX = [
  'piece_snap', 'piece_group', 'piece_pickup',
  'puzzle_complete', 'tray_add', 'tray_retrieve',
].map(k => `audio/sfx/${k}.wav`)

const UI_CLICKS = THEMES.map(t => `audio/sfx/ui_click_${t}.wav`)

// Music loops are AAC (.m4a) — compressed; SFX stay .wav (tiny).
const MUSIC = THEMES.map(t => `audio/music/${t}.m4a`)

const expected = [...SFX, ...UI_CLICKS, ...MUSIC]
const missing = expected.filter(rel => !existsSync(join(PUBLIC, rel)))
const present = expected.length - missing.length

console.log(`Audio assets: ${present}/${expected.length} present`)
if (missing.length) {
  console.log('\nMissing (game will be silent for these — see public/audio/README.md):')
  for (const rel of missing) console.log(`  - public/${rel}`)
} else {
  console.log('All audio assets present.')
}

if (process.argv.includes('--strict') && missing.length) process.exit(1)
