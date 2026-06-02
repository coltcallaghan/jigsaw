import { useCallback, useEffect, useState } from 'react'

export interface GameSettings {
  // Visual
  backgroundColor: string
  brightness: number        // 0.5 – 1.5
  // Audio — stubbed; see AUDIO_NOTES.md
  masterVolume: number      // 0 – 1
  musicVolume: number       // 0 – 1
  sfxVolume: number         // 0 – 1
  // Gameplay
  snapSensitivity: number   // 0.3 – 0.8 (maps to SNAP_DISTANCE)
  showTimer: boolean
  showPieceCount: boolean
}

export const DEFAULT_SETTINGS: GameSettings = {
  backgroundColor: '#1a1a2e',
  brightness: 1.0,
  masterVolume: 1.0,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  snapSensitivity: 0.5,
  showTimer: true,
  showPieceCount: true,
}

const KEY = 'jigsaw_settings'

function load(): GameSettings {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
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
