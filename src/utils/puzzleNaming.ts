const COUNTER_KEY = 'jigsaw_puzzle_counter'

/**
 * Returns the next sequential puzzle name ("Puzzle 1", "Puzzle 2", …) and
 * advances the persisted counter. Each newly loaded image gets the next number,
 * independent of the source file name.
 */
export function nextPuzzleName(): string {
  const current = readCounter()
  const next = current + 1
  try {
    localStorage.setItem(COUNTER_KEY, String(next))
  } catch {
    // localStorage unavailable (private mode, etc.) — naming still works for the
    // session via the returned value; persistence is best-effort.
  }
  return `Puzzle ${next}`
}

function readCounter(): number {
  try {
    const raw = localStorage.getItem(COUNTER_KEY)
    const value = raw ? parseInt(raw, 10) : 0
    return Number.isFinite(value) && value >= 0 ? value : 0
  } catch {
    return 0
  }
}
