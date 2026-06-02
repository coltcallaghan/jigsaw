import React, { useRef, useState } from 'react'
import type { PieceCountOption } from '../puzzle/types'
import { PIECE_COUNT_OPTIONS } from '../puzzle/types'

interface SetupScreenProps {
  imageDataUrl: string
  imageName: string
  onStart: (pieceCount: PieceCountOption) => void
  onBack: () => void
}

const DIFFICULTY_LABELS: Record<number, string> = {
  10: 'Kids',
  50: 'Casual',
  100: 'Beginner',
  500: 'Easy',
  1000: 'Medium',
  2000: 'Hard',
  5000: 'Expert',
  10000: 'Master',
}

const ESTIMATED_TIME: Record<number, string> = {
  10: '2–5 min',
  50: '5–15 min',
  100: '15–30 min',
  500: '1–3 hrs',
  1000: '3–6 hrs',
  2000: '6–12 hrs',
  5000: '1–3 days',
  10000: '3–7 days',
}

export default function SetupScreen({ imageDataUrl, imageName, onStart, onBack }: SetupScreenProps) {
  const [selected, setSelected] = useState<PieceCountOption>(500)

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-8 px-8">
      {/* Back */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors text-sm"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white">Choose Difficulty</h2>

      {/* Image preview */}
      <div className="rounded-xl overflow-hidden border border-navy-700 shadow-lg max-w-xs">
        <img
          src={imageDataUrl}
          alt="Puzzle preview"
          className="w-full max-h-48 object-cover"
        />
        <div className="px-3 py-2 text-xs text-gray-400 truncate" title={imageName}>
          {imageName}
        </div>
      </div>

      {/* Piece count grid */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-xl">
        {PIECE_COUNT_OPTIONS.map((count) => {
          const isSelected = selected === count
          return (
            <button
              key={count}
              onClick={() => setSelected(count)}
              className={`flex flex-col items-center gap-1 rounded-xl p-4 border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-600/20 text-white'
                  : 'border-navy-700 bg-navy-800 text-gray-400 hover:border-blue-700 hover:text-white'
              }`}
            >
              <span className="text-2xl font-bold">{count.toLocaleString()}</span>
              <span className="text-xs font-semibold uppercase tracking-wide">
                {DIFFICULTY_LABELS[count]}
              </span>
              <span className="text-xs opacity-60">{ESTIMATED_TIME[count]}</span>
            </button>
          )
        })}
      </div>

      {/* Start button */}
      <button
        onClick={() => onStart(selected)}
        className="px-10 py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl text-white text-lg font-semibold shadow-lg transition-colors"
      >
        Start Puzzle — {selected.toLocaleString()} pieces
      </button>
    </div>
  )
}
