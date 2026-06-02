import React, { useCallback, useEffect, useRef } from 'react'

interface ZoomPanControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onPan: (dx: number, dy: number) => void
  onFit: () => void
}

const PAN_STEP = 120
const REPEAT_DELAY = 350
const REPEAT_INTERVAL = 80

function useHoldRepeat(action: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    action()
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(action, REPEAT_INTERVAL)
    }, REPEAT_DELAY)
  }, [action])

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  useEffect(() => stop, [stop])
  return { start, stop }
}

const btnBase = `
  flex items-center justify-center rounded-lg select-none cursor-pointer
  bg-white/5 border border-white/10 text-gray-400
  hover:bg-blue-500/30 hover:border-blue-400/60 hover:text-white
  active:bg-blue-600/50 active:scale-95
  transition-all duration-100 text-sm font-bold
`

interface BtnProps {
  label: React.ReactNode
  onStart: () => void
  onStop: () => void
  title?: string
  size?: number
}

function Btn({ label, onStart, onStop, title, size = 38 }: BtnProps) {
  return (
    <button
      title={title}
      onMouseDown={onStart}
      onMouseUp={onStop}
      onMouseLeave={onStop}
      onTouchStart={(e) => { e.preventDefault(); onStart() }}
      onTouchEnd={onStop}
      onContextMenu={(e) => e.preventDefault()}
      className={btnBase}
      style={{ width: size, height: size }}
    >
      {label}
    </button>
  )
}

function FitBtn({ onFit }: { onFit: () => void }) {
  return (
    <button
      title="Fit all pieces"
      onClick={onFit}
      onContextMenu={(e) => e.preventDefault()}
      className={btnBase}
      style={{ width: 38, height: 38 }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="5" height="5" rx="0.5" />
        <rect x="10" y="1" width="5" height="5" rx="0.5" />
        <rect x="1" y="10" width="5" height="5" rx="0.5" />
        <rect x="10" y="10" width="5" height="5" rx="0.5" />
      </svg>
    </button>
  )
}

export default function ZoomPanControls({ onZoomIn, onZoomOut, onPan, onFit }: ZoomPanControlsProps) {
  const up    = useHoldRepeat(useCallback(() => onPan(0,  PAN_STEP), [onPan]))
  const down  = useHoldRepeat(useCallback(() => onPan(0, -PAN_STEP), [onPan]))
  const left  = useHoldRepeat(useCallback(() => onPan( PAN_STEP, 0), [onPan]))
  const right = useHoldRepeat(useCallback(() => onPan(-PAN_STEP, 0), [onPan]))
  const zIn   = useHoldRepeat(onZoomIn)
  const zOut  = useHoldRepeat(onZoomOut)

  return (
    <div
      className="absolute bottom-4 left-4 z-10 flex flex-col items-center gap-2"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* D-pad with fit in centre */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: 'repeat(3, 38px)', gridTemplateRows: 'repeat(3, 38px)' }}
      >
        {/* row 1 */}
        <div />
        <Btn label="↑" onStart={up.start} onStop={up.stop} title="Pan up" />
        <div />
        {/* row 2 */}
        <Btn label="←" onStart={left.start} onStop={left.stop} title="Pan left" />
        <FitBtn onFit={onFit} />
        <Btn label="→" onStart={right.start} onStop={right.stop} title="Pan right" />
        {/* row 3 */}
        <div />
        <Btn label="↓" onStart={down.start} onStop={down.stop} title="Pan down" />
        <div />
      </div>

      {/* Zoom strip below d-pad */}
      <div className="flex gap-1">
        <Btn label="−" onStart={zOut.start} onStop={zOut.stop} title="Zoom out" />
        <Btn label="+" onStart={zIn.start} onStop={zIn.stop} title="Zoom in" />
      </div>
    </div>
  )
}
