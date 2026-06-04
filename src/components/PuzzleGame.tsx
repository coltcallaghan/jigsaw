import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PuzzleEngine } from '../puzzle/PuzzleEngine'
import { computeGrid, generatePieces } from '../puzzle/generator'
import type { PuzzleConfig } from '../puzzle/types'
import type { GameSettings } from '../hooks/useSettings'
import { snapFraction } from '../hooks/useSettings'
import type { SaveData, PieceState } from '../utils/saveGame'
import { writeSave, writeCompleted, makeThumbnail } from '../utils/saveGame'
import PieceTray from './PieceTray'
import ZoomPanControls from './ZoomPanControls'
import { getAchievementForPieceCount, unlockAchievement, unlockPieceMilestones } from '../steam/achievements'
import { addLifetimePieces } from '../utils/stats'
import { AudioManager } from '../audio/AudioManager'

interface PuzzleGameProps {
  config: PuzzleConfig
  savedState: PieceState[] | null
  savedElapsed: number
  settings: GameSettings
  onSettingsChange: (patch: Partial<GameSettings>) => void
  onBackToMenu: () => void
  onSave: (save: SaveData) => void
  /** Fired once the puzzle is finished (id of the now-completed puzzle). */
  onComplete: (completedId: string) => void
}

export default function PuzzleGame({
  config, savedState, savedElapsed, settings, onSettingsChange, onBackToMenu, onSave, onComplete,
}: PuzzleGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<PuzzleEngine | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const saveIdRef = useRef<string>(Date.now().toString())

  const [placed, setPlaced] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const INITIAL_GHOST = 0.4
  const [ghostOpacity, setGhostOpacity] = useState(INITIAL_GHOST)
  const [trayPieceIds, setTrayPieceIds] = useState<number[]>([])
  const [showTray, setShowTray] = useState(true)
  const [trayCollapsed, setTrayCollapsed] = useState(false)
  const [showGhostSlider, setShowGhostSlider] = useState(false)
  const [elapsed, setElapsed] = useState(savedElapsed)
  const [isLoading, setIsLoading] = useState(true)
  const startTimeRef = useRef<number>(0)
  const elapsedBaseRef = useRef<number>(savedElapsed)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Debounced autosave: coalesce rapid placements into one write.
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const placedRef = useRef(0)
  const restoringRef = useRef(false)
  // Last placed-count counted toward the lifetime total, so we only add the
  // delta of newly placed pieces (and never recount restored progress).
  const countedPlacedRef = useRef(0)

  const { cols, rows } = computeGrid(config.imageWidth, config.imageHeight, config.pieceCount)
  const total = cols * rows

  const pieceDefs = useMemo(
    () => generatePieces({ ...config, cols, rows }),
    [config, cols, rows]
  )

  const saveGame = useCallback(async (engine: PuzzleEngine, currentElapsed: number, placedCount: number) => {
    const pieces = engine.getSaveState()
    const thumbnail = await makeThumbnail(config.imageDataUrl)
    const save: SaveData = {
      id: saveIdRef.current,
      imageName: config.name,
      pieceCount: total,
      placedCount,
      createdAt: parseInt(saveIdRef.current),
      updatedAt: Date.now(),
      elapsed: currentElapsed,
      thumbnailUrl: thumbnail,
      config: { ...config, cols, rows },
      pieces,
    }
    await writeSave(save)
    onSave(save)
  }, [config, cols, rows, total, onSave])

  // Keep a stable handle to the latest saveGame so the engine-init effect and
  // handleComplete don't need it as a dependency (which would rebuild the puzzle
  // whenever the parent re-renders the onSave callback).
  const saveGameRef = useRef(saveGame)
  saveGameRef.current = saveGame

  // Stable handle to the onComplete prop (not memoized by the parent).
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const currentElapsed = useCallback(
    () => Math.floor(elapsedBaseRef.current + (Date.now() - startTimeRef.current) / 1000),
    []
  )

  // Autosave shortly after a piece is correctly placed; debounced so a flurry of
  // placements (or restoring a save) collapses into a single IndexedDB write.
  const AUTOSAVE_DELAY = 1500
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      const engine = engineRef.current
      if (engine && placedRef.current > 0) {
        void saveGameRef.current(engine, currentElapsed(), placedRef.current)
      }
    }, AUTOSAVE_DELAY)
  }, [currentElapsed])

  const handleComplete = useCallback(() => {
    setIsComplete(true)
    AudioManager.play('puzzle_complete')
    if (timerRef.current) clearInterval(timerRef.current)
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    const finalElapsed = currentElapsed()
    // Keep the finished puzzle so players can look back at it.
    void makeThumbnail(config.imageDataUrl, 240, 160).then(thumb => {
      void writeCompleted({
        id: saveIdRef.current,
        imageName: config.name,
        pieceCount: total,
        imageDataUrl: config.imageDataUrl,
        thumbnailUrl: thumb,
        elapsed: finalElapsed,
        completedAt: Date.now(),
      })
    })
    // Let the parent drop the in-progress save and refresh the menu lists.
    onCompleteRef.current(saveIdRef.current)
    const ach = getAchievementForPieceCount(config.pieceCount)
    if (ach) unlockAchievement(ach)
    unlockAchievement('FIRST_PUZZLE')
    if (finalElapsed < 600) unlockAchievement('SPEED_RUN')
  }, [config, total])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new PuzzleEngine({
      canvas,
      config,
      theme: settings.theme,
      outlines: settings.outlines,
      onProgress: (p) => {
        setPlaced(p)
        placedRef.current = p
        if (restoringRef.current) {
          // Restored progress: count it as already-placed, don't autosave.
          countedPlacedRef.current = p
          return
        }
        // Tally newly placed pieces toward the lifetime total + milestones.
        const delta = p - countedPlacedRef.current
        if (delta > 0) {
          countedPlacedRef.current = p
          const total = addLifetimePieces(delta)
          unlockPieceMilestones(total)
        }
        scheduleAutosave()
      },
      onComplete: handleComplete,
      onTrayUpdate: (ids) => setTrayPieceIds(ids),
      onReady: () => {
        engine.setGhostOpacity(INITIAL_GHOST)
        engine.setSnapSensitivity(snapFraction(settings.snapSensitivity))

        if (savedState && savedState.length > 0) {
          restoringRef.current = true
          engine.loadFromSave(savedState)
          restoringRef.current = false
        }

        setIsLoading(false)
        startTimeRef.current = Date.now()
        timerRef.current = setInterval(() => {
          setElapsed(Math.floor(elapsedBaseRef.current + (Date.now() - startTimeRef.current) / 1000))
        }, 1000)
      },
    })
    engineRef.current = engine

    const resizeObs = new ResizeObserver(() => {
      if (containerRef.current) engine.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    })
    if (containerRef.current) resizeObs.observe(containerRef.current)

    return () => {
      resizeObs.disconnect()
      if (timerRef.current) clearInterval(timerRef.current)
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
      engine.destroy()
    }
  }, [config, handleComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply settings changes live
  useEffect(() => {
    engineRef.current?.setSnapSensitivity(snapFraction(settings.snapSensitivity))
  }, [settings.snapSensitivity])

  useEffect(() => {
    engineRef.current?.setOutlines(settings.outlines)
  }, [settings.outlines])

  const handleGhostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setGhostOpacity(val)
    engineRef.current?.setGhostOpacity(val)
  }

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const handleRetrieve = (id: number) => {
    engineRef.current?.retrieveFromTray(id)
  }

  const handleBackToMenu = async () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    const engine = engineRef.current
    if (engine && placed > 0) {
      await saveGame(engine, currentElapsed(), placed)
    }
    onBackToMenu()
  }

  const CONFETTI_COLORS = ['#FF7A4D', '#36C5C0', '#8C6BFF', '#FFC23C', '#FF2E97', '#07F2E6']

  return (
    <div className="screen" onContextMenu={e => e.preventDefault()}>

      {/* HUD */}
      <div className="hud">
        <button className="back-link" onClick={handleBackToMenu}>← Menu</button>

        {settings.showPieceCount && (
          <div className="hud-group">
            <div className="progress-bar"><i style={{ width: `${(placed / total) * 100}%` }} /></div>
            <span className="progress-num">{placed}/{total}</span>
          </div>
        )}

        <div className="spacer" />

        {settings.showTimer && (
          <span className="stat">◴ {formatTime(elapsed)}</span>
        )}

        {/* Desktop: inline ghost slider. Mobile: a button that pops up the
            slider over the board (see below) so the HUD stays uncluttered. */}
        <div className="hud-group hide-mobile">
          <span className="stat" style={{ fontSize: '.85rem' }}>Ghost</span>
          <input className="rng" type="range" min={0} max={1.0} step={0.05}
            value={ghostOpacity} style={{ width: 88 }} onChange={handleGhostChange} />
        </div>

        <button
          className={`btn btn-sm show-mobile${showGhostSlider ? ' btn-primary' : ' btn-ghost'}`}
          onClick={() => setShowGhostSlider(v => !v)}
          title="Adjust ghost image opacity"
        >
          Ghost
        </button>

        <button className="btn btn-ghost btn-sm" onClick={() => engineRef.current?.addAllToTray()}>
          Tray all
        </button>

        <button
          className={`btn btn-sm hide-mobile${settings.outlines ? ' btn-primary' : ' btn-ghost'}`}
          onClick={() => onSettingsChange({ outlines: !settings.outlines })}
          title="Toggle piece edge outlines"
        >
          Outlines
        </button>

        <button
          className={`btn btn-sm hide-mobile${showTray ? ' btn-primary' : ' btn-ghost'}`}
          onClick={() => setShowTray(v => !v)}
        >
          Tray{trayPieceIds.length > 0 ? ` · ${trayPieceIds.length}` : ''}
        </button>

        <button
          className="btn btn-ghost btn-sm hide-mobile"
          title="Save progress"
          onClick={() => {
            const engine = engineRef.current
            if (!engine) return
            const cur = Math.floor(elapsedBaseRef.current + (Date.now() - startTimeRef.current) / 1000)
            void saveGame(engine, cur, placed)
          }}
        >
          Save
        </button>
      </div>

      {/* Game body */}
      <div className="game-body">
        <div className="play-wrap" ref={containerRef}>
          {isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 10, background: 'var(--board-felt)' }}>
              <div style={{ width: 44, height: 44, border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: 'var(--text-dim)' }}>Cutting {total.toLocaleString()} pieces…</span>
            </div>
          )}
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
          {!isLoading && (
            <ZoomPanControls
              onZoomIn={() => engineRef.current?.zoomIn()}
              onZoomOut={() => engineRef.current?.zoomOut()}
              onPan={(dx, dy) => engineRef.current?.pan(dx, dy)}
              onFit={() => engineRef.current?.centerCamera()}
            />
          )}

          {/* Mobile ghost-opacity popup — floats above the board so the
              puzzle stays visible while adjusting. */}
          {showGhostSlider && (
            <div className="ghost-popup">
              <span className="stat" style={{ fontSize: '.85rem' }}>Ghost</span>
              <input className="rng" type="range" min={0} max={1.0} step={0.05}
                value={ghostOpacity} onChange={handleGhostChange} />
              <button className="ghost-popup-close" onClick={() => setShowGhostSlider(false)} aria-label="Close">✕</button>
            </div>
          )}
        </div>

        {showTray && (
          <div className={`tray${trayCollapsed ? ' tray-collapsed' : ''}`}>
            <button
              className="tray-head"
              onClick={() => setTrayCollapsed(v => !v)}
              title={trayCollapsed ? 'Expand tray' : 'Collapse tray'}
            >
              <span>Piece Tray</span>
              <span className="tray-head-right">
                <span className="tray-count">{trayPieceIds.length}</span>
                <span className="tray-caret" aria-hidden>{trayCollapsed ? '▴' : '▾'}</span>
              </span>
            </button>
            {!trayCollapsed && (
              <PieceTray
                pieceIds={trayPieceIds}
                pieces={pieceDefs}
                imageDataUrl={config.imageDataUrl}
                imageWidth={config.imageWidth}
                imageHeight={config.imageHeight}
                theme={settings.theme}
                onRetrieve={handleRetrieve}
              />
            )}
          </div>
        )}
      </div>

      {/* Win overlay */}
      {isComplete && (
        <div className="win-overlay">
          {Array.from({ length: 60 }).map((_, i) => (
            <span key={i} className="confetti" style={{
              left: `${Math.random() * 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDuration: `${2.4 + Math.random() * 2.2}s`,
              animationDelay: `${Math.random() * 1.2}s`,
              borderRadius: i % 3 === 0 ? '50%' : '2px',
            }} />
          ))}
          <div className="card win-card fade-in">
            <div className="chip">Puzzle complete</div>
            <h2>Nicely done! 🎉</h2>
            <div className="win-stats">
              <div className="win-stat">
                <div className="v">{formatTime(elapsed)}</div>
                <div className="k">Time</div>
              </div>
              <div className="win-stat">
                <div className="v">{total.toLocaleString()}</div>
                <div className="k">Pieces</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
              <button className="btn btn-primary" onClick={onBackToMenu}>New Puzzle</button>
              <button className="btn btn-ghost" onClick={onBackToMenu}>Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
