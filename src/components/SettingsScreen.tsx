import type { GameSettings } from '../hooks/useSettings'
import SettingsPanel from './SettingsPanel'

interface SettingsScreenProps {
  settings: GameSettings
  onChange: (patch: Partial<GameSettings>) => void
  onReset: () => void
  onBack: () => void
}

export default function SettingsScreen({ settings, onChange, onReset, onBack }: SettingsScreenProps) {
  return (
    <div className="screen scroll fade-in">
      <div className="topbar">
        <button className="back-link" onClick={onBack}>← Back</button>
      </div>

      <div className="center-col" style={{ justifyContent: 'flex-start', paddingTop: 8, gap: 24 }}>
        <h1 className="page-title">Settings</h1>
        <SettingsPanel settings={settings} onChange={onChange} onReset={onReset} />
      </div>
    </div>
  )
}
