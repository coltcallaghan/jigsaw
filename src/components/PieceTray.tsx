import React, { useEffect, useRef, useState } from 'react'
import type { PieceDefinition } from '../puzzle/types'
import type { Theme } from '../hooks/useSettings'
import { buildPiecePath } from '../puzzle/generator'

interface PieceTrayProps {
  pieceIds: number[]
  pieces: PieceDefinition[]
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  theme: Theme
  /** Desktop grid column count (driven by the tray piece-size slider). */
  columns?: number
  onRetrieve: (id: number) => void
  /**
   * Drag a piece from the tray onto the board. Receives the drop point in
   * client coords; returns true if the board consumed it (piece left the tray),
   * false if it should stay stashed.
   */
  onDropToBoard?: (id: number, clientX: number, clientY: number) => boolean
  /**
   * Hands the parent a hit-test it can call during a board→tray drag: given a
   * client point, returns the tray insertion index, or null if outside the tray.
   * Lets a piece dropped into the tray land at the slot under the cursor.
   */
  registerDropHitTest?: (fn: ((clientX: number, clientY: number) => number | null) | null) => void
  /**
   * Tray index where a piece currently being dragged from the board would land,
   * or null when nothing is hovering. Draws an insertion marker at that slot.
   */
  dropIndicatorIndex?: number | null
}

const TAB_PAD = 0.38
const OVERSCAN = 2 // extra rows/cols rendered beyond the viewport, each side
// Pointer travel (px) before a press on a slot becomes a drag instead of a tap.
const DRAG_THRESHOLD = 6

/** The SVG render of a single piece — shared by tray slots and the drag preview. */
function PieceArt({
  def, imageDataUrl, imageWidth, imageHeight, edgeStroke,
}: {
  def: PieceDefinition
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  edgeStroke: string
}) {
  const { id, srcX, srcY, srcW, srcH, edges } = def
  const pad = Math.max(srcW, srcH) * TAB_PAD
  const vbW = srcW + pad * 2
  const vbH = srcH + pad * 2
  const path = buildPiecePath(edges, srcW, srcH)
  const clipId = `tc-${id}`
  return (
    <svg viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <image
          href={imageDataUrl}
          x={-srcX} y={-srcY}
          width={imageWidth} height={imageHeight}
          preserveAspectRatio="none"
        />
      </g>
      <path d={path} fill="none" stroke={edgeStroke} strokeWidth={Math.max(srcW, srcH) * 0.014} />
    </svg>
  )
}

function PieceSlot({
  def, index, marker, imageDataUrl, imageWidth, imageHeight, edgeStroke, onRetrieve, onDragStart,
}: {
  def: PieceDefinition
  index: number
  marker: 'before' | 'after' | null
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  edgeStroke: string
  onRetrieve: (id: number) => void
  onDragStart: (id: number, e: React.PointerEvent) => void
}) {
  const markerClass = marker ? ` drop-${marker}` : ''
  return (
    <div
      className={`tray-slot${markerClass}`}
      data-tray-index={index}
      title={`Piece ${def.id + 1} — drag onto the board, or click to return`}
      onPointerDown={e => onDragStart(def.id, e)}
      onClick={() => onRetrieve(def.id)}
    >
      <PieceArt def={def} imageDataUrl={imageDataUrl}
        imageWidth={imageWidth} imageHeight={imageHeight} edgeStroke={edgeStroke} />
    </div>
  )
}

interface DragState {
  id: number
  pointerId: number
  startX: number
  startY: number
  x: number
  y: number
  active: boolean   // crossed the threshold → showing the floating preview
  size: number      // preview edge length in px
}

export default function PieceTray({ pieceIds, pieces, imageDataUrl, imageWidth, imageHeight, theme, columns = 2, onRetrieve, onDropToBoard, registerDropHitTest, dropIndicatorIndex }: PieceTrayProps) {
  const defMap = React.useMemo(() => {
    const m = new Map<number, PieceDefinition>()
    for (const p of pieces) m.set(p.id, p)
    return m
  }, [pieces])

  const edgeStroke = theme === 'cartoon' || theme === 'modern'
    ? 'rgba(43,43,43,.45)'
    : 'rgba(255,255,255,.45)'

  const isTouch = typeof window !== 'undefined'
    && window.matchMedia?.('(pointer: coarse)').matches

  // ── Drag-out-of-tray ───────────────────────────────────────────────────────
  // A press that travels past DRAG_THRESHOLD becomes a drag: we show a floating
  // preview following the pointer and, on release, ask the board to take the
  // piece. A press that never moves stays a click (→ onRetrieve).
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag
  // Suppresses the synthetic click that fires after a drag release.
  const suppressClickRef = useRef(false)

  const beginDrag = (id: number, e: React.PointerEvent) => {
    if (!onDropToBoard) return
    // Touch is left as tap-to-retrieve: on the horizontal touch strip a drag
    // gesture races the scroll container and reads as flaky. Mouse/pen only.
    if (e.pointerType === 'touch') return
    if (e.button !== undefined && e.button !== 0) return  // left/primary only
    const target = e.currentTarget as HTMLElement
    const size = target.getBoundingClientRect().width || 80
    setDrag({
      id, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      x: e.clientX, y: e.clientY,
      active: false, size,
    })
  }

  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
      const active = d.active || moved > DRAG_THRESHOLD
      // Once dragging, stop the tray from scrolling under the gesture.
      if (active) e.preventDefault()
      setDrag({ ...d, x: e.clientX, y: e.clientY, active })
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) { setDrag(null); return }
      if (d.active) {
        // A real drag happened — try to drop on the board and swallow the click.
        suppressClickRef.current = true
        onDropToBoard?.(d.id, e.clientX, e.clientY)
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag, onDropToBoard])

  const handleSlotRetrieve = (id: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onRetrieve(id)
  }

  // ── Virtualization ─────────────────────────────────────────────────────────
  // Touch layout is a horizontal single-row strip (scrolls X); desktop is a
  // vertical 2-column grid (scrolls Y). Either way we render only the slots in
  // (or near) the viewport, so render cost is independent of total piece count.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [scroll, setScroll] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const onScroll = () => setScroll(isTouch ? el.scrollLeft : el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { ro.disconnect(); el.removeEventListener('scroll', onScroll) }
  }, [isTouch])

  const GAP = 8
  const PAD = 10
  const count = pieceIds.length

  // Expose a hit-test so a board piece dropped into the tray lands at the slot
  // under the cursor (insert-at-position), not just appended. Reads live DOM so
  // it's correct regardless of scroll/virtualization. Registered for the parent.
  useEffect(() => {
    if (!registerDropHitTest) return
    const hitTest = (clientX: number, clientY: number): number | null => {
      const body = scrollRef.current
      if (!body) return null
      const br = body.getBoundingClientRect()
      if (clientX < br.left || clientX > br.right || clientY < br.top || clientY > br.bottom) {
        return null
      }
      const slots = Array.from(body.querySelectorAll<HTMLElement>('.tray-slot[data-tray-index]'))
      if (slots.length === 0) return 0   // empty tray → first slot

      // Nearest slot by centre distance; insert before/after by which half the
      // cursor falls in (horizontal for the touch strip, vertical for the grid).
      let best: { idx: number; after: boolean; dist: number } | null = null
      for (const el of slots) {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dist = Math.hypot(clientX - cx, clientY - cy)
        const after = isTouch ? clientX > cx : clientY > cy
        if (!best || dist < best.dist) {
          best = { idx: parseInt(el.dataset.trayIndex ?? '0', 10), after, dist }
        }
      }
      if (!best) return count
      return best.after ? best.idx + 1 : best.idx
    }
    registerDropHitTest(hitTest)
    return () => registerDropHitTest(null)
  }, [registerDropHitTest, isTouch, count])

  // The floating preview, portaled to the body so it isn't clipped by the tray.
  const dragPreview = drag?.active ? (() => {
    const def = defMap.get(drag.id)
    if (!def) return null
    return (
      <div
        className="tray-drag-ghost"
        style={{
          left: drag.x, top: drag.y,
          width: drag.size, height: drag.size,
        }}
      >
        <PieceArt def={def} imageDataUrl={imageDataUrl}
          imageWidth={imageWidth} imageHeight={imageHeight} edgeStroke={edgeStroke} />
      </div>
    )
  })() : null

  if (count === 0) {
    return (
      <div className="tray-body" ref={scrollRef}>
        <div className="tray-empty">
          Tray is empty.<br />
          {isTouch ? 'Long-press' : 'Right-click'} a piece to stash it.
        </div>
      </div>
    )
  }

  // Slot size: touch strip sizes slots to the row height; desktop grid uses
  // two columns of the available width.
  const inner = (isTouch ? box.h : box.w) - PAD * 2
  let body: React.ReactNode

  // Which slot (if any) carries the insertion marker, and on which edge. The
  // marker sits before slot `dropIndicatorIndex`; when that's past the last
  // slot (append), it sits after the final slot instead.
  const markerFor = (trayIndex: number): 'before' | 'after' | null => {
    if (dropIndicatorIndex == null) return null
    if (trayIndex === dropIndicatorIndex) return 'before'
    if (dropIndicatorIndex >= count && trayIndex === count - 1) return 'after'
    return null
  }

  const renderSlot = (id: number, trayIndex: number) => {
    const def = defMap.get(id)
    return def ? (
      <PieceSlot key={id} def={def} index={trayIndex} marker={markerFor(trayIndex)}
        imageDataUrl={imageDataUrl}
        imageWidth={imageWidth} imageHeight={imageHeight}
        edgeStroke={edgeStroke} onRetrieve={handleSlotRetrieve} onDragStart={beginDrag} />
    ) : null
  }

  if (!box.w || !box.h) {
    // First paint before measurement — render nothing heavy; effect will size us.
    body = null
  } else if (isTouch) {
    const slot = Math.max(1, box.h - PAD * 2)
    const stride = slot + GAP
    const total = count * stride - GAP
    const first = Math.max(0, Math.floor(scroll / stride) - OVERSCAN)
    const visible = Math.ceil(box.w / stride) + OVERSCAN * 2
    const last = Math.min(count, first + visible)
    const lead = first * stride
    body = (
      <div className="tray-rail" style={{ width: total }}>
        <div style={{ width: lead, flex: '0 0 auto' }} />
        {pieceIds.slice(first, last).map((id, i) => renderSlot(id, first + i))}
      </div>
    )
  } else {
    const cols = Math.max(1, Math.round(columns))
    const slot = Math.max(1, (inner - GAP * (cols - 1)) / cols)
    const stride = slot + GAP
    const rows = Math.ceil(count / cols)
    const total = rows * stride - GAP
    const firstRow = Math.max(0, Math.floor(scroll / stride) - OVERSCAN)
    const visibleRows = Math.ceil(box.h / stride) + OVERSCAN * 2
    const lastRow = Math.min(rows, firstRow + visibleRows)
    const lead = firstRow * stride
    const slice = pieceIds.slice(firstRow * cols, lastRow * cols)
    body = (
      <div style={{ height: total, position: 'relative' }}>
        <div className="tray-grid" style={{ position: 'absolute', top: lead, left: 0, right: 0, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {slice.map((id, i) => renderSlot(id, firstRow * cols + i))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`tray-body tray-virtual${drag?.active ? ' tray-dragging' : ''}`}
        ref={scrollRef}
      >
        {body}
      </div>
      {dragPreview}
    </>
  )
}
