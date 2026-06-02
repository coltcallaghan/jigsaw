// Steam achievements stub.
// When steamworks.js is configured with a real Steam App ID, replace these
// with actual Steamworks calls via the greenworks/steamworks.js API.

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

function isSteamAvailable(): boolean {
  return typeof (window as any).steamAPI !== 'undefined'
}

export function unlockAchievement(key: AchievementKey): void {
  const id = ACHIEVEMENTS[key]
  if (isSteamAvailable()) {
    try {
      ;(window as any).steamAPI.activateAchievement(id, () => {
        console.log(`Achievement unlocked: ${id}`)
      })
    } catch {
      // Steam not initialised in dev mode
    }
  } else {
    console.log(`[Dev] Achievement unlocked: ${id}`)
  }
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
