import React, { useRef, useState } from 'react'
import type { SaveMeta } from '../utils/saveGame'
import { deleteSave } from '../utils/saveGame'

interface MainMenuProps {
  onNewGame: (dataUrl: string, name: string) => void
  onContinue: () => void
  onLoadSave: (id: string) => void
  onSettings: () => void
  canContinue: boolean
  saves: SaveMeta[]
  onSavesChange: (saves: SaveMeta[]) => void
}

type View = 'main' | 'load'

const PIECE_COLORS = ['#FF7A4D', '#36C5C0', '#8C6BFF', '#FFC23C']
const PIECE_ROTS   = ['-8deg', '5deg', '-4deg', '9deg']

function MiniPiece({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" width="26" height="26">
      <path
        d="M9 6h8a3 3 0 0 1 6 0h8v8a3 3 0 0 1 0 6v8h-8a3 3 0 0 0-6 0H9v-8a3 3 0 0 0 0-6V6z"
        fill={color} stroke="rgba(0,0,0,.25)" strokeWidth="1.4"
      />
    </svg>
  )
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const s = { width: size, height: size, fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<string, React.ReactNode> = {
    plus: <><path d="M12 5v14M5 12h14" /></>,
    play: <polygon points="6 4 20 12 6 20" fill="currentColor" stroke="none" />,
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    gear: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 12a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7.3 7.3 0 0 0-1.7-1l-.4-2.5H10l-.4 2.5a7.3 7.3 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.3 7.3 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.3 7.3 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.06-.33.1-.66.1-1z" /></>,
    trash: <><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" /></>,
  }
  return <svg viewBox="0 0 24 24" {...s}>{paths[name]}</svg>
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MainMenu({ onNewGame, onContinue, onLoadSave, onSettings, canContinue, saves, onSavesChange }: MainMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [view, setView] = useState<View>('main')

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => onNewGame(e.target?.result as string, file.name)
    reader.readAsDataURL(file)
  }

  const handleElectronOpen = async () => {
    const api = (window as any).electronAPI
    if (api?.openImage) {
      const dataUrl: string | null = await api.openImage()
      if (dataUrl) onNewGame(dataUrl, 'image')
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSave(id)
    onSavesChange(saves.filter(s => s.id !== id))
  }

  if (view === 'load') {
    return (
      <div className="screen scroll fade-in">
        <div className="topbar">
          <button className="back-link" onClick={() => setView('main')}>← Back</button>
        </div>
        <div className="center-col" style={{ justifyContent: 'flex-start', paddingTop: 8 }}>
          <h1 className="page-title">Saved Puzzles</h1>
          <div className="saved-list">
            {saves.length === 0 && (
              <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
                No saved puzzles yet.
              </div>
            )}
            {saves.map(save => (
              <div key={save.id} className="saved-item" onClick={() => onLoadSave(save.id)}>
                {save.thumbnailUrl
                  ? <img className="saved-thumb" src={save.thumbnailUrl} alt="" />
                  : <div className="saved-thumb" style={{ background: 'var(--surface-2)' }} />
                }
                <div className="saved-meta">
                  <div className="t">{save.imageName}</div>
                  <div className="s">{save.pieceCount.toLocaleString()} pieces · {formatDate(save.updatedAt)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <span className="mini-bar"><i style={{ width: `${(save.placedCount / save.pieceCount) * 100}%` }} /></span>
                    <span style={{ fontSize: '.8rem', color: 'var(--text-dim)' }}>{save.placedCount}/{save.pieceCount}</span>
                  </div>
                </div>
                <button
                  className="btn btn-icon btn-ghost"
                  title="Delete"
                  onClick={e => handleDelete(save.id, e)}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen fade-in">
      <div className="center-col">
        {/* Brand */}
        <div className="brand-wrap">
          <div className="brand-mark">
            {PIECE_COLORS.map((c, i) => (
              <span key={i} className="pc" style={{ '--rot': PIECE_ROTS[i], background: c } as React.CSSProperties}>
                <MiniPiece color="#fff" />
              </span>
            ))}
          </div>
          <div className="brand-title">
            JIGSA<span className="o">W</span>
          </div>
          <div className="brand-sub">Turn any photo into a puzzle</div>
        </div>

        {/* Menu buttons */}
        <div className="menu-stack">
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={handleElectronOpen}
            className={`btn btn-primary btn-lg${isDragging ? ' btn-block' : ''}`}
            style={{ cursor: 'pointer', justifyContent: 'flex-start', paddingLeft: 24, width: '100%', transition: 'all .15s' }}
          >
            <Icon name="plus" /> New Puzzle
          </div>

          <button
            className="btn btn-lg"
            onClick={onContinue}
            disabled={!canContinue}
          >
            <Icon name="play" /> Continue
          </button>

          <button
            className="btn btn-lg"
            onClick={() => setView('load')}
            disabled={saves.length === 0}
          >
            <Icon name="folder" /> Load Saved
            {saves.length > 0 && <span className="badge">{saves.length}</span>}
          </button>

          <button className="btn btn-lg" onClick={onSettings}>
            <Icon name="gear" /> Settings
          </button>
        </div>

        <div style={{ color: 'var(--text-dim)', fontSize: '.82rem', marginTop: 6, textAlign: 'center' }}>
          Scroll / pinch to zoom · drag to pan · right-click a piece → tray
        </div>
      </div>

      <input
        ref={fileInputRef} type="file" accept="image/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        style={{ display: 'none' }}
      />
    </div>
  )
}
