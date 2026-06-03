import React, { useState } from 'react'
import type { GameSettings, Theme } from '../hooks/useSettings'

interface ThemePreview {
  id: Theme
  label: string
  font: string
  bg: string
  text: string
  accent: string     // brand highlight colour (the "W"), matching brand-title .o
  border: string     // fixed border colour so the card keeps its own look
  radius: string     // theme's corner radius
  weight: number     // theme's heading weight
  spacing: string    // theme's heading letter-spacing
  markSize: string   // wordmark font-size (arcade's pixel font is smaller)
}

// Each preview is rendered with FIXED values (not active-theme tokens) so it
// always shows that theme's true look regardless of the current theme.
// Values mirror the theme.css tokens for each theme.
const THEMES: ThemePreview[] = [
  { id: 'cartoon', label: 'Cartoon', font: "'Baloo 2', system-ui, sans-serif",          bg: '#FFE7C2', text: '#3A2A22', accent: '#FF7A4D', border: '#2B2B2B', radius: '14px', weight: 800, spacing: '0',      markSize: '1.5rem' },
  { id: 'modern',  label: 'Modern',  font: "'Plus Jakarta Sans', system-ui, sans-serif", bg: '#F4F6FB', text: '#111827', accent: '#4F46E5', border: '#E4E8EF', radius: '11px', weight: 700, spacing: '-.02em', markSize: '1.4rem' },
  { id: 'dark',    label: 'Dark',    font: "'Space Grotesk', system-ui, sans-serif",     bg: '#0A0D14', text: '#EAEEF7', accent: '#6C8CFF', border: '#2A3142', radius: '11px', weight: 600, spacing: '-.01em', markSize: '1.4rem' },
  { id: 'arcade',  label: 'Arcade',  font: "'Press Start 2P', system-ui, sans-serif",    bg: '#140426', text: '#FDEBFF', accent: '#FF2E97', border: '#07F2E6', radius: '2px',  weight: 400, spacing: '0',      markSize: '.78rem' },
]

interface SettingsScreenProps {
  settings: GameSettings
  onChange: (patch: Partial<GameSettings>) => void
  onReset: () => void
  onBack: () => void
}

type Tab = 'visual' | 'audio' | 'gameplay'

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 52, height: 30, borderRadius: 999,
        border: 'var(--border-w) solid var(--ink)',
        background: on ? 'var(--primary)' : 'var(--surface-2)',
        position: 'relative', cursor: 'pointer', transition: '.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 24 : 2,
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        transition: '.2s', boxShadow: '0 1px 3px rgba(0,0,0,.4)',
      }} />
    </button>
  )
}

export default function SettingsScreen({ settings, onChange, onReset, onBack }: SettingsScreenProps) {
  const [tab, setTab] = useState<Tab>('visual')
  const set = <K extends keyof GameSettings>(k: K, v: GameSettings[K]) => onChange({ [k]: v } as Partial<GameSettings>)

  return (
    <div className="screen scroll fade-in">
      <div className="topbar">
        <button className="back-link" onClick={onBack}>← Back</button>
      </div>

      <div className="center-col" style={{ justifyContent: 'flex-start', paddingTop: 8, gap: 24 }}>
        <h1 className="page-title">Settings</h1>

        <div className="tabs">
          {(['visual', 'audio', 'gameplay'] as Tab[]).map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="card" style={{ width: 'min(560px, 94vw)' }}>
          {tab === 'visual' && <>
            <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
              <div>
                <div className="lab">Theme</div>
                <div className="desc">Visual style and colour palette</div>
              </div>
              <div className="theme-preview-grid">
                {THEMES.map(t => {
                  const selected = settings.theme === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`theme-preview${selected ? ' sel' : ''}`}
                      style={{
                        background: t.bg,
                        color: t.text,
                        borderColor: t.border,
                        borderRadius: t.radius,
                        boxShadow: selected ? `0 0 0 3px ${t.accent}` : undefined,
                      }}
                      onClick={() => set('theme', t.id)}
                      title={t.label}
                      aria-pressed={selected}
                    >
                      <span className="theme-preview-mark"
                        style={{ fontFamily: t.font, fontSize: t.markSize, fontWeight: t.weight, letterSpacing: t.spacing }}>
                        JIGSA<span style={{ color: t.accent }}>W</span>
                      </span>
                      <span className="theme-preview-name" style={{ fontFamily: t.font, color: t.accent }}>
                        {t.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="setting-row">
              <div>
                <div className="lab">Brightness</div>
                <div className="desc">Adjusts overall screen brightness</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-head)', minWidth: 44, textAlign: 'right' }}>{settings.brightness}%</span>
                <input className="rng" type="range" min="60" max="120" value={settings.brightness} style={{ width: 150 }}
                  onChange={e => set('brightness', parseInt(e.target.value))} />
              </div>
            </div>
            <div className="setting-row">
              <div>
                <div className="lab">Piece edge outlines</div>
                <div className="desc">Subtle stroke around each piece</div>
              </div>
              <Toggle on={settings.outlines} onClick={() => set('outlines', !settings.outlines)} />
            </div>
          </>}

          {tab === 'audio' && <>
            <div className="setting-row">
              <div><div className="lab">Master volume</div></div>
              <input className="rng" type="range" min="0" max="100" value={settings.masterVolume} style={{ width: 170 }}
                onChange={e => set('masterVolume', parseInt(e.target.value))} />
            </div>
            <div className="setting-row">
              <div><div className="lab">Sound effects</div><div className="desc">Satisfying click when a piece locks</div></div>
              <Toggle on={settings.sfxEnabled} onClick={() => set('sfxEnabled', !settings.sfxEnabled)} />
            </div>
            <div className="setting-row">
              <div><div className="lab">SFX volume</div></div>
              <input className="rng" type="range" min="0" max="100" value={settings.sfxVolume} style={{ width: 170 }}
                onChange={e => set('sfxVolume', parseInt(e.target.value))} />
            </div>
            <div className="setting-row">
              <div><div className="lab">Background music</div><div className="desc">Looping track matched to the theme</div></div>
              <Toggle on={settings.musicEnabled} onClick={() => set('musicEnabled', !settings.musicEnabled)} />
            </div>
            <div className="setting-row">
              <div><div className="lab">Music volume</div></div>
              <input className="rng" type="range" min="0" max="100" value={settings.musicVolume} style={{ width: 170 }}
                onChange={e => set('musicVolume', parseInt(e.target.value))} />
            </div>
          </>}

          {tab === 'gameplay' && <>
            <div className="setting-row">
              <div>
                <div className="lab">Snap assist</div>
                <div className="desc">How close a piece must be to lock in</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-head)', minWidth: 64 }}>
                  {settings.snapSensitivity < 22 ? 'Precise' : settings.snapSensitivity > 40 ? 'Generous' : 'Normal'}
                </span>
                <input className="rng" type="range" min="14" max="52" value={settings.snapSensitivity} style={{ width: 140 }}
                  onChange={e => set('snapSensitivity', parseInt(e.target.value))} />
              </div>
            </div>
            <div className="setting-row">
              <div><div className="lab">Ghost image on by default</div><div className="desc">Faint reference image behind the board</div></div>
              <Toggle on={settings.ghostDefault} onClick={() => set('ghostDefault', !settings.ghostDefault)} />
            </div>
            <div className="setting-row">
              <div><div className="lab">Show timer</div></div>
              <Toggle on={settings.showTimer} onClick={() => set('showTimer', !settings.showTimer)} />
            </div>
            <div className="setting-row">
              <div><div className="lab">Show piece count</div></div>
              <Toggle on={settings.showPieceCount} onClick={() => set('showPieceCount', !settings.showPieceCount)} />
            </div>
          </>}
        </div>

        <button className="back-link" onClick={onReset}>Reset to defaults</button>
      </div>
    </div>
  )
}
