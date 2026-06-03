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

interface DpadBtnProps {
  label: React.ReactNode
  onStart: () => void
  onStop: () => void
  title?: string
}

function DpadBtn({ label, onStart, onStop, title }: DpadBtnProps) {
  return (
    <button
      className="dpad-btn"
      title={title}
      onMouseDown={onStart}
      onMouseUp={onStop}
      onMouseLeave={onStop}
      onTouchStart={e => { e.preventDefault(); onStart() }}
      onTouchEnd={onStop}
      onContextMenu={e => e.preventDefault()}
    >
      {label}
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

  const fitBtn = (
    <button
      className="dpad-btn dpad-fit"
      title="Fit all pieces"
      onClick={onFit}
      onContextMenu={e => e.preventDefault()}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="1" y="1" width="5" height="5" rx="0.5" />
        <rect x="10" y="1" width="5" height="5" rx="0.5" />
        <rect x="1" y="10" width="5" height="5" rx="0.5" />
        <rect x="10" y="10" width="5" height="5" rx="0.5" />
      </svg>
    </button>
  )

  return (
    <div className="zoom-cluster" onContextMenu={e => e.preventDefault()}>
      {/* Pan/zoom buttons are desktop affordances — hidden on touch, where
          one-finger pan and pinch-zoom replace them (see theme.css). */}
      <div className="dpad">
        <span />
        <DpadBtn label="↑" onStart={up.start} onStop={up.stop} title="Pan up" />
        <span />
        <DpadBtn label="←" onStart={left.start} onStop={left.stop} title="Pan left" />
        {fitBtn}
        <DpadBtn label="→" onStart={right.start} onStop={right.stop} title="Pan right" />
        <span />
        <DpadBtn label="↓" onStart={down.start} onStop={down.stop} title="Pan down" />
        <span />
      </div>

      <div className="zoom-btns">
        <DpadBtn label="−" onStart={zOut.start} onStop={zOut.stop} title="Zoom out" />
        <DpadBtn label="+" onStart={zIn.start} onStop={zIn.stop} title="Zoom in" />
      </div>

      {/* On mobile, the d-pad grid collapses to just this Fit button. */}
      <div className="dpad-fit-mobile">{fitBtn}</div>
    </div>
  )
}
