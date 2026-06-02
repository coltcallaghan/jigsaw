import React, { useState } from 'react'
import type { GameSettings } from '../hooks/useSettings'

interface SettingsScreenProps {
  settings: GameSettings
  onChange: (patch: Partial<GameSettings>) => void
  onReset: () => void
  onBack: () => void
}

type Tab = 'visual' | 'audio' | 'gameplay'

const BACKGROUND_PRESETS = [
  { label: 'Midnight', value: '#1a1a2e' },
  { label: 'Ocean', value: '#0d1b2a' },
  { label: 'Forest', value: '#0f1f0f' },
  { label: 'Dusk', value: '#1f0d2a' },
  { label: 'Slate', value: '#1c1c2e' },
  { label: 'Warm', value: '#1f1510' },
]

function Row({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <div>
        <div className="text-sm text-white">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function Slider({ value, min, max, step, onChange }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-28 accent-blue-400"
    />
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-6 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-gray-600'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-1'}`} />
    </button>
  )
}

const STUB = (
  <span className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-0.5">
    Not yet implemented
  </span>
)

export default function SettingsScreen({ settings, onChange, onReset, onBack }: SettingsScreenProps) {
  const [tab, setTab] = useState<Tab>('visual')

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
        tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col w-full h-full items-center justify-start pt-8 px-4">
      <button onClick={onBack} className="absolute top-6 left-6 text-gray-400 hover:text-white text-sm transition-colors">
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/5 rounded-xl p-1">
        {tabBtn('visual', '🎨 Visual')}
        {tabBtn('audio', '🔊 Audio')}
        {tabBtn('gameplay', '🎮 Gameplay')}
      </div>

      {/* Tab content */}
      <div className="w-full max-w-lg bg-white/3 rounded-2xl border border-white/8 p-6 flex flex-col">
        {tab === 'visual' && <>
          <Row label="Background colour">
            <div className="flex gap-1.5 flex-wrap justify-end">
              {BACKGROUND_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => onChange({ backgroundColor: p.value })}
                  title={p.label}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${
                    settings.backgroundColor === p.value ? 'border-blue-400 scale-110' : 'border-white/10 hover:border-white/40'
                  }`}
                  style={{ background: p.value }}
                />
              ))}
            </div>
          </Row>

          <Row label="Brightness" sub="Adjusts the overall screen brightness">
            <span className="text-xs text-gray-500 w-8 text-right">{Math.round(settings.brightness * 100)}%</span>
            <Slider value={settings.brightness} min={0.4} max={1.6} step={0.05}
              onChange={v => onChange({ brightness: v })} />
          </Row>
        </>}

        {tab === 'audio' && <>
          <div className="mb-4 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
            Audio is not yet implemented. Volume sliders are saved but have no effect until music and sound effects are added.
          </div>
          <Row label="Master volume">
            <span className="text-xs text-gray-500 w-8 text-right">{Math.round(settings.masterVolume * 100)}%</span>
            <Slider value={settings.masterVolume} min={0} max={1} step={0.05}
              onChange={v => onChange({ masterVolume: v })} />
          </Row>
          <Row label="Music volume">
            <span className="text-xs text-gray-500 w-8 text-right">{Math.round(settings.musicVolume * 100)}%</span>
            <Slider value={settings.musicVolume} min={0} max={1} step={0.05}
              onChange={v => onChange({ musicVolume: v })} />
          </Row>
          <Row label="SFX volume" sub="Piece snap, completion sounds">
            <span className="text-xs text-gray-500 w-8 text-right">{Math.round(settings.sfxVolume * 100)}%</span>
            <Slider value={settings.sfxVolume} min={0} max={1} step={0.05}
              onChange={v => onChange({ sfxVolume: v })} />
          </Row>
        </>}

        {tab === 'gameplay' && <>
          <Row label="Snap sensitivity" sub="How close a piece needs to be to snap">
            <span className="text-xs text-gray-500 w-10 text-right">
              {settings.snapSensitivity < 0.4 ? 'Tight' : settings.snapSensitivity > 0.65 ? 'Loose' : 'Normal'}
            </span>
            <Slider value={settings.snapSensitivity} min={0.3} max={0.8} step={0.05}
              onChange={v => onChange({ snapSensitivity: v })} />
          </Row>
          <Row label="Show timer">
            <Toggle value={settings.showTimer} onChange={v => onChange({ showTimer: v })} />
          </Row>
          <Row label="Show piece count">
            <Toggle value={settings.showPieceCount} onChange={v => onChange({ showPieceCount: v })} />
          </Row>
        </>}
      </div>

      <button
        onClick={onReset}
        className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        Reset to defaults
      </button>
    </div>
  )
}
