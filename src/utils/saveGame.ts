import type { PuzzleConfig } from '../puzzle/types'

export interface PieceState {
  id: number
  x: number
  y: number
  placed: boolean
  inTray: boolean
  groupId: number | null
}

export interface SaveMeta {
  id: string
  imageName: string
  pieceCount: number
  placedCount: number
  updatedAt: number
  thumbnailUrl: string   // tiny data-url
}

export interface SaveData extends SaveMeta {
  createdAt: number
  elapsed: number
  config: PuzzleConfig & { cols: number; rows: number }
  pieces: PieceState[]
}

const INDEX_KEY = 'jigsaw_saves'
const PREFIX = 'jigsaw_save_'
const MAX_SAVES = 5

export function listSaves(): SaveMeta[] {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') } catch { return [] }
}

export function getSave(id: string): SaveData | null {
  try {
    const raw = localStorage.getItem(PREFIX + id)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(PREFIX + data.id, JSON.stringify(data))
    const list = listSaves().filter(s => s.id !== data.id)
    list.unshift({
      id: data.id,
      imageName: data.imageName,
      pieceCount: data.pieceCount,
      placedCount: data.placedCount,
      updatedAt: data.updatedAt,
      thumbnailUrl: data.thumbnailUrl,
    })
    while (list.length > MAX_SAVES) {
      const old = list.pop()!
      localStorage.removeItem(PREFIX + old.id)
    }
    localStorage.setItem(INDEX_KEY, JSON.stringify(list))
    return true
  } catch { return false }
}

export function deleteSave(id: string): void {
  localStorage.removeItem(PREFIX + id)
  const list = listSaves().filter(s => s.id !== id)
  localStorage.setItem(INDEX_KEY, JSON.stringify(list))
}

/** Rename a saved puzzle, updating both the index and the full save record. */
export function renameSave(id: string, name: string): SaveMeta[] {
  const trimmed = name.trim()
  if (!trimmed) return listSaves()

  const list = listSaves().map(s => (s.id === id ? { ...s, imageName: trimmed } : s))
  localStorage.setItem(INDEX_KEY, JSON.stringify(list))

  const save = getSave(id)
  if (save) {
    localStorage.setItem(PREFIX + id, JSON.stringify({ ...save, imageName: trimmed }))
  }
  return list
}

/** Downscale an image data-url to a tiny thumbnail. */
export function makeThumbnail(dataUrl: string, maxW = 120, maxH = 80): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(maxW / img.width, maxH / img.height)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.6))
    }
    img.onerror = () => resolve('')
    img.src = dataUrl
  })
}
