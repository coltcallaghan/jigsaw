import type { Theme } from '../hooks/useSettings'
import { SFX_SOURCES, MUSIC_SOURCES, type SfxKey } from './sounds'

/**
 * Singleton audio engine for SFX and per-theme background music.
 *
 * Built on HTMLAudioElement (no external dependency). Missing files are
 * tolerated: a failed load disables that one sound and is never retried, so
 * the game runs fine with a partial or empty `public/audio/` directory.
 *
 * Volumes follow AUDIO_NOTES.md: effective = category × master (each 0–1).
 */

interface VolumeState {
  master: number  // 0–1
  music: number   // 0–1
  sfx: number     // 0–1
  sfxEnabled: boolean
  musicEnabled: boolean
}

const BASE = import.meta.env.BASE_URL ?? '/'

function resolve(path: string): string {
  // Join BASE_URL with the asset path, collapsing any double slash.
  return `${BASE}${path}`.replace(/([^:])\/\/+/g, '$1/')
}

class AudioManagerImpl {
  private volumes: VolumeState = {
    master: 0.7, music: 0.5, sfx: 0.7, sfxEnabled: true, musicEnabled: false,
  }

  // Preloaded SFX templates; cloned per play so they can overlap.
  private sfxTemplates: Map<SfxKey, HTMLAudioElement> = new Map()
  private brokenSfx: Set<SfxKey> = new Set()

  private music: HTMLAudioElement | null = null
  private musicTheme: Theme | null = null
  private brokenMusic: Set<Theme> = new Set()

  private blurBound = false

  // ─── Volume / settings ─────────────────────────────────────────────────

  setVolumes(v: Partial<VolumeState>): void {
    this.volumes = { ...this.volumes, ...v }
    // Reflect live changes on the currently-playing music
    if (this.music) {
      this.music.volume = this.musicGain()
      if (!this.volumes.musicEnabled || this.musicGain() === 0) this.pauseMusic()
      else if (this.music.paused) void this.music.play().catch(() => {})
    }
  }

  private musicGain(): number {
    return this.volumes.musicEnabled ? this.volumes.master * this.volumes.music : 0
  }

  private sfxGain(): number {
    return this.volumes.sfxEnabled ? this.volumes.master * this.volumes.sfx : 0
  }

  // ─── SFX ───────────────────────────────────────────────────────────────

  /** Play a one-shot sound effect. No-ops if disabled, muted, or file missing. */
  play(key: SfxKey): void {
    const gain = this.sfxGain()
    if (gain <= 0 || this.brokenSfx.has(key)) return

    let template = this.sfxTemplates.get(key)
    if (!template) {
      template = new Audio(resolve(SFX_SOURCES[key]))
      template.preload = 'auto'
      template.addEventListener('error', () => this.brokenSfx.add(key), { once: true })
      this.sfxTemplates.set(key, template)
    }

    // Clone so rapid repeats (many snaps) can overlap without cutting off.
    const node = template.cloneNode(true) as HTMLAudioElement
    node.volume = gain
    node.play().catch(() => { this.brokenSfx.add(key) })
  }

  // ─── Music ─────────────────────────────────────────────────────────────

  /** Start (or switch to) the looping track for a theme. */
  playMusic(theme: Theme): void {
    this.bindBlurOnce()

    if (this.musicTheme === theme && this.music) {
      // Same track already loaded — just ensure it's playing/audible
      this.music.volume = this.musicGain()
      if (this.musicGain() > 0 && this.music.paused) void this.music.play().catch(() => {})
      return
    }

    this.stopMusic()
    if (this.brokenMusic.has(theme)) return

    const el = new Audio(resolve(MUSIC_SOURCES[theme]))
    el.loop = true
    el.preload = 'auto'
    el.volume = this.musicGain()
    el.addEventListener('error', () => { this.brokenMusic.add(theme); if (this.music === el) this.music = null }, { once: true })

    this.music = el
    this.musicTheme = theme
    if (this.musicGain() > 0) el.play().catch(() => {})
  }

  pauseMusic(): void {
    this.music?.pause()
  }

  stopMusic(): void {
    if (this.music) {
      this.music.pause()
      this.music.currentTime = 0
      this.music = null
      this.musicTheme = null
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  /** Pause music when the tab/window loses focus; resume on return. */
  private bindBlurOnce(): void {
    if (this.blurBound || typeof window === 'undefined') return
    this.blurBound = true
    window.addEventListener('blur', () => this.pauseMusic())
    window.addEventListener('focus', () => {
      if (this.music && this.musicGain() > 0) void this.music.play().catch(() => {})
    })
  }
}

export const AudioManager = new AudioManagerImpl()
