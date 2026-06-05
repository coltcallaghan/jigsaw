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
}

const TAB_PAD = 0.38
const OVERSCAN = 2 // extra rows/cols rendered beyond the viewport, each side

function PieceSlot({
  def, imageDataUrl, imageWidth, imageHeight, edgeStroke, onRetrieve,
}: {
  def: PieceDefinition
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  edgeStroke: string
  onRetrieve: (id: number) => void
}) {
  const { id, srcX, srcY, srcW, srcH, edges } = def
  const pad = Math.max(srcW, srcH) * TAB_PAD
  const vbW = srcW + pad * 2
  const vbH = srcH + pad * 2
  const path = buildPiecePath(edges, srcW, srcH)
  const clipId = `tc-${id}`
  return (
    <div
      className="tray-slot"
      title={`Piece ${id + 1} — click to return`}
      onClick={() => onRetrieve(id)}
    >
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
    </div>
  )
}

export default function PieceTray({ pieceIds, pieces, imageDataUrl, imageWidth, imageHeight, theme, columns = 2, onRetrieve }: PieceTrayProps) {
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
        {pieceIds.slice(first, last).map(id => {
          const def = defMap.get(id)
          return def ? (
            <PieceSlot key={id} def={def} imageDataUrl={imageDataUrl}
              imageWidth={imageWidth} imageHeight={imageHeight}
              edgeStroke={edgeStroke} onRetrieve={onRetrieve} />
          ) : null
        })}
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
          {slice.map(id => {
            const def = defMap.get(id)
            return def ? (
              <PieceSlot key={id} def={def} imageDataUrl={imageDataUrl}
                imageWidth={imageWidth} imageHeight={imageHeight}
                edgeStroke={edgeStroke} onRetrieve={onRetrieve} />
            ) : null
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="tray-body tray-virtual" ref={scrollRef}>
      {body}
    </div>
  )
}
