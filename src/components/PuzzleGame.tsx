import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PuzzleEngine } from '../puzzle/PuzzleEngine'
import { computeGrid } from '../puzzle/generator'
import type { PuzzleConfig } from '../puzzle/types'
import type { GameSettings } from '../hooks/useSettings'
import type { SaveData, PieceState } from '../utils/saveGame'
import { writeSave, makeThumbnail } from '../utils/saveGame'
import PieceTray from './PieceTray'
import ZoomPanControls from './ZoomPanControls'
import { getAchievementForPieceCount, unlockAchievement } from '../steam/achievements'

interface PuzzleGameProps {
  config: PuzzleConfig
  savedState: PieceState[] | null
  savedElapsed: number
  settings: GameSettings
  onBackToMenu: () => void
  onSave: (save: SaveData) => void
}

export default function PuzzleGame({
  config, savedState, savedElapsed, settings, onBackToMenu, onSave,
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
  const [elapsed, setElapsed] = useState(savedElapsed)
  const [isLoading, setIsLoading] = useState(true)
  const startTimeRef = useRef<number>(0)
  const elapsedBaseRef = useRef<number>(savedElapsed)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { cols, rows } = computeGrid(config.imageWidth, config.imageHeight, config.pieceCount)
  const pieceW = config.imageWidth / cols
  const pieceH = config.imageHeight / rows
  const total = cols * rows

  const saveGame = useCallback(async (engine: PuzzleEngine, currentElapsed: number, placedCount: number) => {
    const pieces = engine.getSaveState()
    const thumbnail = await makeThumbnail(config.imageDataUrl)
    const save: SaveData = {
      id: saveIdRef.current,
      imageName: config.imageDataUrl.slice(0, 50),
      pieceCount: total,
      placedCount,
      createdAt: parseInt(saveIdRef.current),
      updatedAt: Date.now(),
      elapsed: currentElapsed,
      thumbnailUrl: thumbnail,
      config: { ...config, cols, rows },
      pieces,
    }
    writeSave(save)
    onSave(save)
  }, [config, cols, rows, total, onSave])

  const handleComplete = useCallback(() => {
    setIsComplete(true)
    if (timerRef.current) clearInterval(timerRef.current)
    const ach = getAchievementForPieceCount(config.pieceCount)
    if (ach) unlockAchievement(ach)
    unlockAchievement('FIRST_PUZZLE')
    const secs = elapsedBaseRef.current + (Date.now() - startTimeRef.current) / 1000
    if (secs < 600) unlockAchievement('SPEED_RUN')
  }, [config.pieceCount])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new PuzzleEngine({
      canvas,
      config,
      onProgress: (p) => setPlaced(p),
      onComplete: handleComplete,
      onTrayUpdate: (ids) => setTrayPieceIds(ids),
      onReady: () => {
        engine.setGhostOpacity(INITIAL_GHOST)
        engine.setSnapSensitivity(settings.snapSensitivity)
        engine.setBackgroundColor(settings.backgroundColor)

        if (savedState && savedState.length > 0) {
          engine.loadFromSave(savedState)
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
      engine.destroy()
    }
  }, [config, handleComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply settings changes live
  useEffect(() => {
    engineRef.current?.setSnapSensitivity(settings.snapSensitivity)
    engineRef.current?.setBackgroundColor(settings.backgroundColor)
  }, [settings.snapSensitivity, settings.backgroundColor])

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
    const engine = engineRef.current
    if (engine && placed > 0) {
      const currentElapsed = Math.floor(elapsedBaseRef.current + (Date.now() - startTimeRef.current) / 1000)
      await saveGame(engine, currentElapsed, placed)
    }
    onBackToMenu()
  }

  return (
    <div
      className="flex flex-col w-full h-full"
      onContextMenu={e => e.preventDefault()}
    >
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-white/5" style={{ background: 'rgba(0,0,0,0.3)', minHeight: 44 }}>
        <button onClick={handleBackToMenu} className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Menu
        </button>

        <div className="flex-1" />

        {/* Progress */}
        {settings.showPieceCount && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-40 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(placed / total) * 100}%` }} />
            </div>
            <span className="text-gray-300 tabular-nums">{placed}/{total}</span>
          </div>
        )}

        {/* Timer */}
        {settings.showTimer && (
          <span className="text-gray-300 tabular-nums text-sm w-20 text-right">{formatTime(elapsed)}</span>
        )}

        {/* Save */}
        <button
          onClick={() => {
            const engine = engineRef.current
            if (!engine) return
            const cur = Math.floor(elapsedBaseRef.current + (Date.now() - startTimeRef.current) / 1000)
            void saveGame(engine, cur, placed)
          }}
          className="text-sm px-3 py-1 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Save progress"
        >
          💾 Save
        </button>

        {/* Ghost overlay slider */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Ghost</span>
          <input type="range" min={0} max={1.0} step={0.05} value={ghostOpacity}
            onChange={handleGhostChange} className="w-20 accent-blue-400" />
        </div>

        {/* Tray toggle */}
        <button
          onClick={() => setShowTray(v => !v)}
          className={`text-sm px-3 py-1 rounded transition-colors ${
            showTray ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          Tray {trayPieceIds.length > 0 ? `(${trayPieceIds.length})` : ''}
          <span className="text-xs opacity-50 ml-1">right-click</span>
        </button>

        {/* Add all to tray */}
        <button
          onClick={() => engineRef.current?.addAllToTray()}
          className="text-sm px-3 py-1 rounded bg-white/5 text-gray-400 hover:text-white transition-colors"
          title="Send every unplaced piece to the tray"
        >
          Add all to tray
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10" style={{ background: settings.backgroundColor }}>
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400">Cutting {total.toLocaleString()} pieces…</span>
            </div>
          )}
          <canvas ref={canvasRef} className="w-full h-full" />
          {!isLoading && (
            <ZoomPanControls
              onZoomIn={() => engineRef.current?.zoomIn()}
              onZoomOut={() => engineRef.current?.zoomOut()}
              onPan={(dx, dy) => engineRef.current?.pan(dx, dy)}
              onFit={() => engineRef.current?.centerCamera()}
            />
          )}
        </div>

        {showTray && (
          <div className="border-l border-white/5 flex flex-col overflow-hidden" style={{ width: 200, background: 'rgba(0,0,0,0.2)' }}>
            <div className="px-3 py-2 border-b border-white/5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Piece Tray
            </div>
            <PieceTray
              pieceIds={trayPieceIds}
              imageDataUrl={config.imageDataUrl}
              pieceWidth={pieceW}
              pieceHeight={pieceH}
              cols={cols}
              onRetrieve={handleRetrieve}
              onSendAll={() => trayPieceIds.forEach(id => engineRef.current?.retrieveFromTray(id))}
            />
          </div>
        )}
      </div>

      {/* Completion overlay */}
      {isComplete && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl border border-blue-500" style={{ background: settings.backgroundColor }}>
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl font-bold text-white">Puzzle Complete!</h2>
            <p className="text-gray-300 text-lg">
              {total.toLocaleString()} pieces in{' '}
              <span className="text-blue-400 font-semibold">{formatTime(elapsed)}</span>
            </p>
            <button onClick={onBackToMenu}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold transition-colors">
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
