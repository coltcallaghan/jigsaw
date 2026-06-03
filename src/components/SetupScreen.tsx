import React, { useRef, useState } from 'react'
import type { PieceCountOption } from '../puzzle/types'
import { isPieceSizeAllowed } from '../config/unlock'
import UpsellModal from './UpsellModal'

interface SetupScreenProps {
  imageDataUrl: string
  imageName: string
  onStart: (pieceCount: PieceCountOption) => void
  onBack: () => void
}

const DIFFICULTIES: { count: PieceCountOption; label: string; time: string }[] = [
  { count: 10,    label: 'Kids',     time: '2–5 min' },
  { count: 50,    label: 'Casual',   time: '5–15 min' },
  { count: 100,   label: 'Beginner', time: '15–30 min' },
  { count: 500,   label: 'Easy',     time: '1–3 hrs' },
  { count: 1000,  label: 'Medium',   time: '3–6 hrs' },
  { count: 2000,  label: 'Hard',     time: '6–12 hrs' },
  { count: 5000,  label: 'Expert',   time: '1–3 days' },
  { count: 10000, label: 'Master',   time: '3–7 days' },
]

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const s = { width: size, height: size, fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<string, React.ReactNode> = {
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5L5 20" /></>,
    sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor" stroke="none" />,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  }
  return <svg viewBox="0 0 24 24" {...s}>{paths[name]}</svg>
}

export default function SetupScreen({ imageDataUrl, imageName, onStart, onBack }: SetupScreenProps) {
  const [selected, setSelected] = useState<PieceCountOption>(100)
  const [isDragging, setIsDragging] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)
  // Bumped after an unlock so isPieceSizeAllowed() is re-evaluated on render.
  const [unlockVersion, setUnlockVersion] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    // image is already loaded — we'd need to call back up, but for now just trigger browse
  }

  const handleSelect = (count: PieceCountOption) => {
    if (!isPieceSizeAllowed(count)) {
      setShowUpsell(true)
      return
    }
    setSelected(count)
  }

  // unlockVersion is read so this recomputes after a purchase/restore.
  void unlockVersion
  const selectionAllowed = isPieceSizeAllowed(selected)

  return (
    <div className="screen scroll fade-in">
      <div className="topbar">
        <button className="back-link" onClick={onBack}>← Back</button>
      </div>

      <div className="center-col" style={{ justifyContent: 'flex-start', paddingTop: 8 }}>
        <h1 className="page-title">New Puzzle</h1>

        <div className="setup-grid">
          {/* Left: image preview */}
          <div>
            <div className={`dropzone${imageDataUrl ? ' has-img' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileInputRef.current?.click()}
            >
              {imageDataUrl
                ? <img src={imageDataUrl} alt="Puzzle" />
                : <>
                    <div style={{ fontSize: 40 }}><Icon name="image" size={40} /></div>
                    <div className="dz-hint">Drop a photo here<br />or click to browse</div>
                  </>
              }
              {imageDataUrl && <div className="dz-replace">Replace image</div>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 10 }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {imageName || 'No image selected'}
              </span>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          {/* Right: difficulty */}
          <div>
            <h3 style={{ marginBottom: 14, fontSize: '1.15rem', fontFamily: 'var(--font-head)' }}>Choose difficulty</h3>
            <div className="diff-grid">
              {DIFFICULTIES.map(d => {
                const locked = !isPieceSizeAllowed(d.count)
                return (
                  <div
                    key={d.count}
                    className={`diff-card${selected === d.count ? ' sel' : ''}${locked ? ' locked' : ''}`}
                    onClick={() => handleSelect(d.count)}
                  >
                    {locked && (
                      <span className="diff-lock" title="Unlock with one-time purchase" aria-label="Locked">
                        <Icon name="lock" size={14} />
                      </span>
                    )}
                    <div className="num">{d.count.toLocaleString()}</div>
                    <div className="lab">{d.label}</div>
                    <div className="tm">{d.time}</div>
                  </div>
                )
              })}
            </div>

            <button
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 22, justifyContent: 'center' }}
              disabled={!imageDataUrl || !selectionAllowed}
              onClick={() => selectionAllowed && onStart(selected)}
            >
              <Icon name="sparkle" /> Start Puzzle — {selected.toLocaleString()} pieces
            </button>
          </div>
        </div>
      </div>

      {showUpsell && (
        <UpsellModal
          onClose={() => setShowUpsell(false)}
          onUnlocked={() => {
            setShowUpsell(false)
            setUnlockVersion(v => v + 1)
          }}
        />
      )}
    </div>
  )
}
