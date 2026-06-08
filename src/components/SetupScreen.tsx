import { useState } from 'react'
import type { PieceCountOption } from '../puzzle/types'
import { isPieceSizeAllowed } from '../config/unlock'
import UpsellModal from './UpsellModal'

interface SetupScreenProps {
  imageDataUrl: string
  /** Default puzzle name (e.g. "Puzzle 1"); editable here before starting. */
  imageName: string
  onStart: (pieceCount: PieceCountOption, name: string) => void
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
  // Roving-focus target within the radiogroup; may sit on a locked card so
  // keyboard users can discover (and be offered) locked sizes.
  const [focusedCount, setFocusedCount] = useState<PieceCountOption>(100)
  const [name, setName] = useState(imageName)
  const [showUpsell, setShowUpsell] = useState(false)
  // Bumped after an unlock so isPieceSizeAllowed() is re-evaluated on render.
  const [unlockVersion, setUnlockVersion] = useState(0)

  const handleSelect = (count: PieceCountOption) => {
    setFocusedCount(count)
    if (!isPieceSizeAllowed(count)) {
      setShowUpsell(true)
      return
    }
    setSelected(count)
  }

  // Arrow keys move roving focus across the radiogroup (including onto locked
  // cards); activation (Enter/Space/click) is what selects or offers an unlock.
  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const navKeys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!navKeys.includes(e.key)) return
    e.preventDefault()
    const currentIndex = Math.max(0, DIFFICULTIES.findIndex(d => d.count === focusedCount))
    const last = DIFFICULTIES.length - 1
    let nextIndex = currentIndex
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = currentIndex >= last ? 0 : currentIndex + 1
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = currentIndex <= 0 ? last : currentIndex - 1
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = last
        break
    }
    const next = DIFFICULTIES[nextIndex].count
    setFocusedCount(next)
    e.currentTarget.querySelector<HTMLElement>(`[data-count="${next}"]`)?.focus()
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
          {/* Left: image preview (display-only) + name */}
          <div>
            <div className={`dropzone${imageDataUrl ? ' has-img' : ''}`}>
              {imageDataUrl
                ? <img src={imageDataUrl} alt="Puzzle" />
                : <>
                    <div style={{ fontSize: 40 }}><Icon name="image" size={40} /></div>
                    <div className="dz-hint">No image selected</div>
                  </>
              }
            </div>

            <label className="setup-name">
              <span className="setup-name-label">Puzzle name</span>
              <input
                className="text-input"
                type="text"
                value={name}
                maxLength={60}
                placeholder={imageName}
                onChange={e => setName(e.target.value)}
                onBlur={() => { if (!name.trim()) setName(imageName) }}
              />
            </label>
          </div>

          {/* Right: difficulty */}
          <div>
            <h3 id="difficulty-label" style={{ marginBottom: 14, fontSize: '1.15rem', fontFamily: 'var(--font-head)' }}>Choose difficulty</h3>
            <div
              className="diff-grid"
              role="radiogroup"
              aria-labelledby="difficulty-label"
              onKeyDown={handleGridKeyDown}
            >
              {DIFFICULTIES.map(d => {
                const locked = !isPieceSizeAllowed(d.count)
                const isSelected = selected === d.count
                return (
                  <button
                    key={d.count}
                    type="button"
                    data-count={d.count}
                    role="radio"
                    aria-checked={isSelected}
                    // Roving tabindex: only the focused card is in the tab order.
                    tabIndex={focusedCount === d.count ? 0 : -1}
                    aria-label={`${d.count.toLocaleString()} pieces, ${d.label}, ${d.time}${locked ? ', locked — unlock with one-time purchase' : ''}`}
                    className={`diff-card${isSelected ? ' sel' : ''}${locked ? ' locked' : ''}`}
                    onClick={() => handleSelect(d.count)}
                    onFocus={() => setFocusedCount(d.count)}
                  >
                    {locked && (
                      <span className="diff-lock" title="Unlock with one-time purchase" aria-hidden="true">
                        <Icon name="lock" size={14} />
                      </span>
                    )}
                    <div className="num">{d.count.toLocaleString()}</div>
                    <div className="lab">{d.label}</div>
                    <div className="tm">{d.time}</div>
                  </button>
                )
              })}
            </div>

            <button
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 22, justifyContent: 'center' }}
              disabled={!imageDataUrl || !selectionAllowed}
              onClick={() => selectionAllowed && onStart(selected, name.trim() || imageName)}
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
