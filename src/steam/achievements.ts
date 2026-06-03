// Steam achievements.
// The Electron main process owns the steamworks.js client (see electron/steam.ts)
// and exposes `window.steamAPI.activateAchievement` via the preload bridge. On
// web/mobile (or when Steam isn't running / no App ID) this degrades to a no-op.

interface SteamBridge {
  activateAchievement: (name: string) => Promise<boolean>
}

export const ACHIEVEMENTS = {
  FIRST_PUZZLE: 'ACH_FIRST_PUZZLE',
  PUZZLE_10: 'ACH_PUZZLE_10',
  PUZZLE_50: 'ACH_PUZZLE_50',
  PUZZLE_100: 'ACH_PUZZLE_100',
  PUZZLE_500: 'ACH_PUZZLE_500',
  PUZZLE_1000: 'ACH_PUZZLE_1000',
  PUZZLE_2000: 'ACH_PUZZLE_2000',
  PUZZLE_5000: 'ACH_PUZZLE_5000',
  PUZZLE_10000: 'ACH_PUZZLE_10000',
  SPEED_RUN: 'ACH_SPEED_RUN',
} as const

type AchievementKey = keyof typeof ACHIEVEMENTS

function getSteamBridge(): SteamBridge | null {
  const bridge = (window as unknown as { steamAPI?: SteamBridge }).steamAPI
  return bridge ?? null
}

export function unlockAchievement(key: AchievementKey): void {
  const id = ACHIEVEMENTS[key]
  const bridge = getSteamBridge()
  if (!bridge) return // Not running under Steam — no-op.
  // Fire-and-forget; failures (Steam offline, etc.) are intentionally ignored.
  void bridge.activateAchievement(id).catch(() => {})
}

export function getAchievementForPieceCount(count: number): AchievementKey | null {
  const map: Record<number, AchievementKey> = {
    10: 'PUZZLE_10',
    50: 'PUZZLE_50',
    100: 'PUZZLE_100',
    500: 'PUZZLE_500',
    1000: 'PUZZLE_1000',
    2000: 'PUZZLE_2000',
    5000: 'PUZZLE_5000',
    10000: 'PUZZLE_10000',
  }
  return map[count] ?? null
}
