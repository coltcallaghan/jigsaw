const PIECES_KEY = 'jigsaw_lifetime_pieces'

/** Total pieces correctly placed across all puzzles, all time. */
export function getLifetimePieces(): number {
  try {
    const v = parseInt(localStorage.getItem(PIECES_KEY) ?? '0', 10)
    return Number.isFinite(v) && v >= 0 ? v : 0
  } catch {
    return 0
  }
}

/** Add to the lifetime counter and return the new total. */
export function addLifetimePieces(delta: number): number {
  const next = getLifetimePieces() + Math.max(0, delta)
  try {
    localStorage.setItem(PIECES_KEY, String(next))
  } catch {
    // best-effort; counter just won't persist this session
  }
  return next
}
