#!/usr/bin/env node
// Synthesizes all game audio as WAV files using pure Node (no deps, no external
// assets). Output is inherently copyright-free — every sample is generated from
// math here, so there is no source recording and no license to track.
//
//   node scripts/gen-audio.mjs
//
// Writes 6 SFX one-shots to public/audio/sfx/ and 4 looping theme beds to
// public/audio/music/. Re-run any time; it overwrites in place.

import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SFX_DIR = join(ROOT, 'public/audio/sfx')
const MUSIC_DIR = join(ROOT, 'public/audio/music')
mkdirSync(SFX_DIR, { recursive: true })
mkdirSync(MUSIC_DIR, { recursive: true })

const RATE = 44100

// ── WAV encoding (16-bit PCM mono) ───────────────────────────────────────────
function encodeWav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    data.writeInt16LE(Math.round(s * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)        // PCM chunk size
  header.writeUInt16LE(1, 20)         // PCM format
  header.writeUInt16LE(1, 22)         // mono
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)  // byte rate
  header.writeUInt16LE(2, 32)         // block align
  header.writeUInt16LE(16, 34)        // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

// ── Synthesis helpers ────────────────────────────────────────────────────────
const TAU = Math.PI * 2
const buf = secs => new Float32Array(Math.ceil(secs * RATE))
const tOf = i => i / RATE

// Exponential decay envelope (percussive one-shots).
const decay = (i, secs, k = 5) => Math.exp(-k * tOf(i) / secs)
// Short attack + decay (avoids click at onset).
function ad(i, secs, attack = 0.004) {
  const t = tOf(i)
  if (t < attack) return t / attack
  return Math.exp(-4 * (t - attack) / secs)
}

const sine = (f, t) => Math.sin(TAU * f * t)
const tri = (f, t) => 2 * Math.abs(2 * ((f * t) % 1) - 1) - 1
const square = (f, t) => (Math.sin(TAU * f * t) >= 0 ? 1 : -1)

function normalize(s, peak = 0.9) {
  let max = 0
  for (const v of s) max = Math.max(max, Math.abs(v))
  if (max === 0) return s
  const g = peak / max
  for (let i = 0; i < s.length; i++) s[i] *= g
  return s
}

function write(dir, name, samples) {
  const wav = encodeWav(samples)
  writeFileSync(join(dir, `${name}.wav`), wav)
  console.log(`  ${name}.wav  (${(wav.length / 1024).toFixed(0)} KB)`)
}

// ── SFX ──────────────────────────────────────────────────────────────────────

// piece_snap: a crisp two-tone click — piece locks into its solved position.
function pieceSnap() {
  const s = buf(0.12)
  for (let i = 0; i < s.length; i++) {
    const t = tOf(i)
    const e = decay(i, 0.12, 9)
    s[i] = (sine(880, t) * 0.6 + sine(1320, t) * 0.4) * e
  }
  return normalize(s, 0.8)
}

// piece_group: lighter, lower click — two loose pieces connect to each other.
function pieceGroup() {
  const s = buf(0.1)
  for (let i = 0; i < s.length; i++) {
    const t = tOf(i)
    const e = decay(i, 0.1, 11)
    s[i] = (sine(560, t) * 0.6 + sine(840, t) * 0.3) * e
  }
  return normalize(s, 0.65)
}

// piece_pickup: subtle upward whoosh/blip on drag start.
function piecePickup() {
  const s = buf(0.09)
  for (let i = 0; i < s.length; i++) {
    const t = tOf(i)
    const f = 300 + 500 * (t / 0.09)   // rising pitch
    s[i] = sine(f, t) * ad(i, 0.09, 0.003) * 0.5
  }
  return normalize(s, 0.5)
}

// tray_add: soft descending pop — piece stashed away.
function trayAdd() {
  const s = buf(0.1)
  for (let i = 0; i < s.length; i++) {
    const t = tOf(i)
    const f = 700 - 300 * (t / 0.1)    // falling pitch
    s[i] = sine(f, t) * ad(i, 0.1, 0.003) * 0.5
  }
  return normalize(s, 0.55)
}

// tray_retrieve: soft ascending pop — piece pulled back (inverse of tray_add).
function trayRetrieve() {
  const s = buf(0.1)
  for (let i = 0; i < s.length; i++) {
    const t = tOf(i)
    const f = 450 + 350 * (t / 0.1)    // rising pitch
    s[i] = sine(f, t) * ad(i, 0.1, 0.003) * 0.5
  }
  return normalize(s, 0.55)
}

// puzzle_complete: a short rising arpeggio fanfare (C–E–G–C major chord).
function puzzleComplete() {
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  const noteLen = 0.16
  const total = noteLen * notes.length + 0.4
  const s = buf(total)
  notes.forEach((f, n) => {
    const start = Math.floor(n * noteLen * RATE)
    const dur = total - n * noteLen
    for (let i = 0; i + start < s.length; i++) {
      const t = tOf(i)
      const e = Math.exp(-2.5 * t / dur)
      const v = (sine(f, t) * 0.5 + sine(f * 2, t) * 0.2 + tri(f, t) * 0.2) * e
      s[i + start] += v
    }
  })
  return normalize(s, 0.85)
}

// ui_click: a soft, short blip for menu/button presses — one per theme so the
// UI feedback matches each theme's character. Quiet and short so it's pleasant
// on repeat. `spec` picks the two partial frequencies, decay rate and waveform.
function uiClick({ f1, f2, k, wave, peak }) {
  const s = buf(0.06)
  for (let i = 0; i < s.length; i++) {
    const t = tOf(i)
    const e = decay(i, 0.06, k)
    s[i] = (wave(f1, t) * 0.7 + wave(f2, t) * 0.3) * e
  }
  return normalize(s, peak)
}

// Per-theme click character:
//   cartoon — bright, bouncy two-tone   modern — soft, clean high blip
//   dark    — low, muted thunk          arcade — retro square-wave blip
const UI_CLICKS = {
  cartoon: { f1: 660, f2: 990, k: 12, wave: sine, peak: 0.42 },
  modern: { f1: 880, f2: 1320, k: 16, wave: sine, peak: 0.32 },
  dark: { f1: 320, f2: 480, k: 18, wave: sine, peak: 0.4 },
  arcade: { f1: 740, f2: 1480, k: 13, wave: square, peak: 0.3 },
}

console.log('SFX:')
write(SFX_DIR, 'piece_snap', pieceSnap())
write(SFX_DIR, 'piece_group', pieceGroup())
write(SFX_DIR, 'piece_pickup', piecePickup())
write(SFX_DIR, 'tray_add', trayAdd())
write(SFX_DIR, 'tray_retrieve', trayRetrieve())
write(SFX_DIR, 'puzzle_complete', puzzleComplete())
console.log('UI clicks (per theme):')
for (const [theme, spec] of Object.entries(UI_CLICKS)) {
  write(SFX_DIR, `ui_click_${theme}`, uiClick(spec))
}

// ── Music (seamless looping beds, ~12s each) ─────────────────────────────────
// Each theme is a chord progression rendered so the end meets the start cleanly.
// These are functional ambient beds for testing — pleasant but intentionally
// simple; swap in hand-picked tracks before release if you want more character.

const LOOP = 12 // seconds; chosen so progressions land on the bar at the seam.

// Soft ADSR per note within the loop, with release that wraps into the loop.
function pad(s, freqs, start, dur, gain, wave = sine) {
  const a = 0.4, r = 0.6
  for (let i = 0; i < dur * RATE; i++) {
    const t = i / RATE
    let env
    if (t < a) env = t / a
    else if (t > dur - r) env = Math.max(0, (dur - t) / r)
    else env = 1
    const idx = (Math.floor(start * RATE) + i) % s.length
    let v = 0
    for (const f of freqs) v += wave(f, (Math.floor(start * RATE) + i) / RATE)
    s[idx] += (v / freqs.length) * env * gain
  }
}

// Simple sine "pluck" arpeggio note (for melodic motion).
function pluck(s, f, start, dur, gain, wave = sine) {
  const n = Math.floor(dur * RATE)
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    const env = Math.exp(-4 * t / dur) * Math.min(1, t / 0.01)
    const idx = (Math.floor(start * RATE) + i) % s.length
    s[idx] += wave(f, (Math.floor(start * RATE) + i) / RATE) * env * gain
  }
}

// Note frequencies (a small palette).
const N = {
  C3: 130.81, E3: 164.81, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
}

// cartoon: bright, bouncy major — ukulele-ish plucks over warm pads.
function musicCartoon() {
  const s = buf(LOOP)
  const chords = [[N.C3, N.E3, N.G3], [N.A3, N.C4, N.E4], [N.F4, N.A4, N.C5], [N.G3, N.B3, N.D4]]
  const bar = LOOP / 4
  chords.forEach((c, b) => pad(s, c, b * bar, bar, 0.22, tri))
  const mel = [N.C5, N.E5, N.G5, N.E5, N.A4, N.C5, N.E5, N.C5, N.F4, N.A4, N.C5, N.A4, N.G4, N.B4, N.D5, N.G4]
  mel.forEach((f, i) => pluck(s, f, i * (LOOP / 16), LOOP / 16, 0.3))
  return normalize(s, 0.55)
}

// modern: minimal lo-fi — sparse sine pads, gentle movement.
function musicModern() {
  const s = buf(LOOP)
  const chords = [[N.C3, N.G3, N.B3], [N.A3, N.E4, N.G4], [N.F4, N.C4, N.E4], [N.G3, N.D4, N.F4]]
  const bar = LOOP / 4
  chords.forEach((c, b) => pad(s, c, b * bar, bar, 0.3, sine))
  const mel = [N.E5, 0, N.D5, 0, N.C5, 0, N.G4, 0]
  mel.forEach((f, i) => { if (f) pluck(s, f, i * (LOOP / 8), LOOP / 8, 0.18) })
  return normalize(s, 0.45)
}

// dark: atmospheric drone — low sustained pads, slow minor movement.
function musicDark() {
  const s = buf(LOOP)
  const chords = [[N.C3, N.E3, N.G3], [N.C3, N.F4 / 2, N.A3], [N.A3 / 2, N.C4, N.E4], [N.G3, N.B3, N.D4]]
  const bar = LOOP / 2
  // Two long sustained halves for a drone feel.
  pad(s, chords[0], 0, bar, 0.4, sine)
  pad(s, chords[2], bar, bar, 0.4, sine)
  // Slow high shimmer.
  pluck(s, N.E5, 1, 3, 0.08, sine)
  pluck(s, N.G5, 7, 3, 0.07, sine)
  return normalize(s, 0.5)
}

// arcade: chiptune — square-wave bass + blippy melody.
function musicArcade() {
  const s = buf(LOOP)
  const bass = [N.C3, N.C3, N.G3, N.G3, N.A3, N.A3, N.F4 / 2, N.F4 / 2]
  bass.forEach((f, i) => pluck(s, f, i * (LOOP / 8), LOOP / 8, 0.28, square))
  const mel = [N.C5, N.E5, N.G5, N.E5, N.C5, N.G4, N.A4, N.C5, N.F4, N.A4, N.C5, N.A4, N.G4, N.D5, N.B4, N.G4]
  mel.forEach((f, i) => pluck(s, f, i * (LOOP / 16), LOOP / 16, 0.16, square))
  return normalize(s, 0.5)
}

console.log('Music (looping ~12s):')
write(MUSIC_DIR, 'cartoon', musicCartoon())
write(MUSIC_DIR, 'modern', musicModern())
write(MUSIC_DIR, 'dark', musicDark())
write(MUSIC_DIR, 'arcade', musicArcade())

// Compress music to AAC (.m4a) so the bundle stays small — the app loads
// audio/music/*.m4a (see src/audio/sounds.ts). SFX stay .wav (already tiny).
// Uses macOS's built-in afconvert; if unavailable, the raw .wav is left in
// place and you'll need to convert manually.
console.log('\nCompressing music to .m4a (AAC):')
for (const name of ['cartoon', 'modern', 'dark', 'arcade']) {
  const wavPath = join(MUSIC_DIR, `${name}.wav`)
  const m4aPath = join(MUSIC_DIR, `${name}.m4a`)
  try {
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '128000', wavPath, m4aPath])
    rmSync(wavPath)
    console.log(`  ${name}.m4a`)
  } catch {
    console.warn(`  ! afconvert failed for ${name}; left ${name}.wav (convert manually)`)
  }
}

console.log('\nDone.')
