import { useEffect } from 'react'
import type { GameSettings } from '../hooks/useSettings'
import SettingsPanel from './SettingsPanel'

interface SettingsModalProps {
  settings: GameSettings
  onChange: (patch: Partial<GameSettings>) => void
  onReset: () => void
  onClose: () => void
}

/**
 * In-game settings, shown as a dialog over the puzzle board. Reuses the same
 * SettingsPanel as the full-screen Settings page. Closes on backdrop click or
 * Escape; the inner panel stops propagation so clicks inside don't dismiss it.
 */
export default function SettingsModal({ settings, onChange, onReset, onClose }: SettingsModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="win-overlay" onClick={onClose}>
      <div
        className="settings-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="settings-modal-head">
          <h2 style={{ margin: 0 }}>Settings</h2>
          <button className="settings-modal-close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>
        <SettingsPanel settings={settings} onChange={onChange} onReset={onReset} />
      </div>
    </div>
  )
}
