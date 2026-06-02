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

function MenuBtn({
  onClick, children, disabled = false, primary = false, danger = false
}: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; primary?: boolean; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-64 py-3 rounded-xl text-base font-semibold transition-all duration-150 select-none
        ${disabled
          ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
          : primary
            ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border border-blue-500/50 shadow-lg shadow-blue-900/30'
            : danger
              ? 'bg-red-900/30 hover:bg-red-700/50 text-red-300 border border-red-700/30'
              : 'bg-white/5 hover:bg-white/10 active:bg-white/15 text-gray-200 border border-white/8'
        }
      `}
    >
      {children}
    </button>
  )
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MainMenu({ onNewGame, onContinue, onLoadSave, onSettings, canContinue, saves, onSavesChange }: MainMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [view, setView] = useState<View>('main')

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onNewGame(e.target?.result as string, file.name)
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
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSave(id)
    onSavesChange(saves.filter(s => s.id !== id))
  }

  if (view === 'load') {
    return (
      <div className="flex flex-col items-center justify-start w-full h-full pt-16 px-8 gap-6">
        <button onClick={() => setView('main')} className="absolute top-6 left-6 text-gray-400 hover:text-white text-sm transition-colors">
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-white">Saved Puzzles</h2>
        {saves.length === 0 ? (
          <p className="text-gray-500 mt-8">No saved puzzles yet.</p>
        ) : (
          <div className="flex flex-col gap-3 w-full max-w-lg overflow-y-auto">
            {saves.map(save => (
              <button
                key={save.id}
                onClick={() => onLoadSave(save.id)}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
              >
                {save.thumbnailUrl
                  ? <img src={save.thumbnailUrl} alt="" className="w-16 h-12 rounded-lg object-cover border border-white/10 shrink-0" />
                  : <div className="w-16 h-12 rounded-lg bg-white/5 border border-white/10 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{save.imageName}</div>
                  <div className="text-xs text-gray-400">
                    {save.pieceCount.toLocaleString()} pieces · {save.placedCount}/{save.pieceCount} placed
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{formatDate(save.updatedAt)}</div>
                </div>
                <button
                  onClick={e => handleDelete(save.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded transition-all"
                  title="Delete save"
                >
                  ✕
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-10">
      {/* Title */}
      <div className="flex flex-col items-center gap-2 select-none">
        <h1 className="text-7xl font-black tracking-tight text-white">JIGSAW</h1>
        <p className="text-gray-500 text-sm tracking-widest uppercase">Turn any image into a puzzle</p>
      </div>

      {/* Menu buttons */}
      <div className="flex flex-col items-center gap-3">
        {/* New game — drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={handleElectronOpen}
          className={`
            w-64 py-3 rounded-xl text-base font-semibold transition-all duration-150 cursor-pointer select-none
            flex items-center justify-center gap-2 border
            ${isDragging
              ? 'bg-blue-600/40 border-blue-400 text-white scale-[1.02]'
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border-blue-500/50 shadow-lg shadow-blue-900/30'
            }
          `}
        >
          🖼️ New Puzzle
        </div>

        <MenuBtn onClick={onContinue} disabled={!canContinue}>
          ▶ Continue
        </MenuBtn>

        <MenuBtn onClick={() => setView('load')} disabled={saves.length === 0}>
          📂 Load Saved {saves.length > 0 && <span className="text-xs opacity-60 ml-1">({saves.length})</span>}
        </MenuBtn>

        <MenuBtn onClick={onSettings}>
          ⚙️ Settings
        </MenuBtn>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        className="hidden" />

      <p className="text-gray-700 text-xs absolute bottom-4 select-none">
        Scroll / pinch to zoom · Drag to pan · Right-click piece → tray
      </p>
    </div>
  )
}
