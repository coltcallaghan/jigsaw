import React, { useCallback } from 'react'

interface PieceTrayProps {
  pieceIds: number[]
  imageDataUrl: string
  pieceWidth: number
  pieceHeight: number
  cols: number
  onRetrieve: (id: number) => void
  onSendAll: () => void
}

export default function PieceTray({
  pieceIds,
  imageDataUrl,
  pieceWidth,
  pieceHeight,
  cols,
  onRetrieve,
  onSendAll,
}: PieceTrayProps) {
  const thumbSize = 56
  const scale = thumbSize / Math.max(pieceWidth, pieceHeight)

  if (pieceIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2">
        <span className="text-2xl">📦</span>
        <span>Tray is empty</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b border-navy-700">
        <span className="text-xs text-gray-400">{pieceIds.length} pieces</span>
        <button
          onClick={onSendAll}
          className="text-xs text-blue-400 hover:text-blue-200 transition-colors"
        >
          Scatter all
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-1 content-start">
        {pieceIds.map((id) => {
          const row = Math.floor(id / cols)
          const col = id % cols
          return (
            <button
              key={id}
              onClick={() => onRetrieve(id)}
              title={`Piece ${id + 1} (row ${row + 1}, col ${col + 1})`}
              className="relative rounded overflow-hidden border border-navy-700 hover:border-blue-400 transition-colors"
              style={{ width: thumbSize, height: thumbSize }}
            >
              <div
                style={{
                  width: pieceWidth * scale,
                  height: pieceHeight * scale,
                  backgroundImage: `url(${imageDataUrl})`,
                  backgroundSize: `${cols * pieceWidth * scale}px auto`,
                  backgroundPosition: `-${col * pieceWidth * scale}px -${row * pieceHeight * scale}px`,
                  transform: `translate(${(thumbSize - pieceWidth * scale) / 2}px, ${(thumbSize - pieceHeight * scale) / 2}px)`,
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
