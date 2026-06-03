import { isNative, FREE_PIECE_LIMIT } from './platform'

const KEY = 'jigsaw_unlocked'

/** Web/desktop builds are always fully unlocked; native gates large sizes. */
export const isUnlocked = (): boolean =>
  !isNative || localStorage.getItem(KEY) === 'true'

export const setUnlocked = (value: boolean): void => {
  localStorage.setItem(KEY, String(value))
}

export const isPieceSizeAllowed = (count: number): boolean =>
  isUnlocked() || count <= FREE_PIECE_LIMIT
