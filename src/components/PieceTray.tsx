import React from 'react'
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
  onRetrieve: (id: number) => void
}

const TAB_PAD = 0.38

export default function PieceTray({ pieceIds, pieces, imageDataUrl, imageWidth, imageHeight, theme, onRetrieve }: PieceTrayProps) {
  const defMap = React.useMemo(() => {
    const m = new Map<number, PieceDefinition>()
    for (const p of pieces) m.set(p.id, p)
    return m
  }, [pieces])

  // Light themes need a dark stroke; dark themes need a light stroke
  const edgeStroke = theme === 'cartoon' || theme === 'modern'
    ? 'rgba(43,43,43,.45)'
    : 'rgba(255,255,255,.45)'

  return (
    <div className="tray-body">
      {pieceIds.length === 0 && (
        <div className="tray-empty">Tray is empty.<br />Right-click a piece to stash it.</div>
      )}
      {pieceIds.map(id => {
        const def = defMap.get(id)
        if (!def) return null
        const { srcX, srcY, srcW, srcH, edges } = def
        const pad = Math.max(srcW, srcH) * TAB_PAD
        const vbW = srcW + pad * 2
        const vbH = srcH + pad * 2
        const path = buildPiecePath(edges, srcW, srcH)
        const clipId = `tc-${id}`
        return (
          <div
            key={id}
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
      })}
    </div>
  )
}
