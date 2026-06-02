import { useCallback, useState } from 'react'

export type Theme = 'cartoon' | 'modern' | 'dark' | 'arcade'

export interface GameSettings {
  // Visual
  theme: Theme
  brightness: number        // 60 – 120 (percentage, matching design)
  outlines: boolean
  // Audio — stubbed; see AUDIO_NOTES.md
  masterVolume: number      // 0 – 100
  musicVolume: number       // 0 – 100
  sfxVolume: number         // 0 – 100
  sfxEnabled: boolean
  musicEnabled: boolean
  // Gameplay
  snapSensitivity: number   // 14 – 52 (maps to SNAP_DISTANCE)
  ghostDefault: boolean
  showTimer: boolean
  showPieceCount: boolean
  rotatePieces: boolean
}

export const DEFAULT_SETTINGS: GameSettings = {
  theme: 'cartoon',
  brightness: 100,
  outlines: true,
  masterVolume: 70,
  musicVolume: 50,
  sfxVolume: 70,
  sfxEnabled: true,
  musicEnabled: false,
  snapSensitivity: 30,
  ghostDefault: true,
  showTimer: true,
  showPieceCount: true,
  rotatePieces: false,
}

const KEY = 'jigsaw_settings'

function migrate(raw: Record<string, unknown>): Partial<GameSettings> {
  const out: Record<string, unknown> = { ...raw }
  // brightness was stored as a float (0.5–1.5) in the old schema; new schema is 60–120 (int %)
  if (typeof out.brightness === 'number' && out.brightness <= 2) {
    out.brightness = Math.round(out.brightness * 100)
  }
  // snapSensitivity was stored as a float (0.3–0.8); new schema is 14–52
  if (typeof out.snapSensitivity === 'number' && out.snapSensitivity <= 1) {
    out.snapSensitivity = Math.round(14 + ((out.snapSensitivity - 0.3) / 0.5) * 38)
  }
  return out as Partial<GameSettings>
}

function load(): GameSettings {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored) return { ...DEFAULT_SETTINGS, ...migrate(JSON.parse(stored)) }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<GameSettings>(load)

  const setSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettingsState({ ...DEFAULT_SETTINGS })
    localStorage.removeItem(KEY)
  }, [])

  return { settings, setSettings, resetSettings }
}

/** Map snapSensitivity (14–52) to SNAP_DISTANCE fraction (0.2–0.8) */
export function snapFraction(sensitivity: number): number {
  return 0.2 + ((sensitivity - 14) / (52 - 14)) * 0.6
}
