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

/** A finished puzzle, kept so players can look back at completed work. */
export interface CompletedPuzzle {
  id: string
  imageName: string
  pieceCount: number
  imageDataUrl: string   // full finished image
  thumbnailUrl: string   // tiny preview for the list
  elapsed: number        // seconds taken
  completedAt: number
}

const MAX_SAVES = 5

// ─── IndexedDB plumbing ──────────────────────────────────────────────────────
//
// Saves embed the full-resolution image data URL, which can be several MB each —
// far beyond localStorage's ~5MB origin quota (which caused saves to silently
// fail). IndexedDB is also fully on-device (no network/cloud) but has a much
// larger quota, so full-res images persist reliably.

const DB_NAME = 'jigsaw'
const DB_VERSION = 2
const STORE = 'saves'
const COMPLETED_STORE = 'completed'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(COMPLETED_STORE)) {
        db.createObjectStore(COMPLETED_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode)
        const req = fn(transaction.objectStore(storeName))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
  )
}

function toMeta(data: SaveData): SaveMeta {
  return {
    id: data.id,
    imageName: data.imageName,
    pieceCount: data.pieceCount,
    placedCount: data.placedCount,
    updatedAt: data.updatedAt,
    thumbnailUrl: data.thumbnailUrl,
  }
}

// ─── Public API (async) ──────────────────────────────────────────────────────

/** List save metadata, newest first. */
export async function listSaves(): Promise<SaveMeta[]> {
  try {
    await migrateFromLocalStorage()
    const all = await tx<SaveData[]>(STORE, 'readonly', store => store.getAll() as IDBRequest<SaveData[]>)
    return all
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(toMeta)
  } catch {
    return []
  }
}

export async function getSave(id: string): Promise<SaveData | null> {
  try {
    const data = await tx<SaveData | undefined>(STORE, 'readonly', store => store.get(id) as IDBRequest<SaveData | undefined>)
    return data ?? null
  } catch {
    return null
  }
}

/** Persist a save, trimming to the most recent MAX_SAVES. Returns success. */
export async function writeSave(data: SaveData): Promise<boolean> {
  try {
    await tx(STORE, 'readwrite', store => store.put(data))
    await trimSaves()
    return true
  } catch {
    return false
  }
}

export async function deleteSave(id: string): Promise<void> {
  try {
    await tx(STORE, 'readwrite', store => store.delete(id))
  } catch {
    // best-effort
  }
}

/** Rename a saved puzzle; returns the refreshed metadata list. */
export async function renameSave(id: string, name: string): Promise<SaveMeta[]> {
  const trimmed = name.trim()
  if (!trimmed) return listSaves()
  try {
    const save = await getSave(id)
    if (save) {
      await tx(STORE, 'readwrite', store => store.put({ ...save, imageName: trimmed }))
    }
  } catch {
    // best-effort
  }
  return listSaves()
}

async function trimSaves(): Promise<void> {
  const all = await tx<SaveData[]>(STORE, 'readonly', store => store.getAll() as IDBRequest<SaveData[]>)
  if (all.length <= MAX_SAVES) return
  const stale = all.sort((a, b) => b.updatedAt - a.updatedAt).slice(MAX_SAVES)
  for (const save of stale) {
    await tx(STORE, 'readwrite', store => store.delete(save.id))
  }
}

// ─── Completed puzzles (kept indefinitely, not trimmed) ──────────────────────

/** List completed puzzles, newest first. */
export async function listCompleted(): Promise<CompletedPuzzle[]> {
  try {
    const all = await tx<CompletedPuzzle[]>(COMPLETED_STORE, 'readonly', store => store.getAll() as IDBRequest<CompletedPuzzle[]>)
    return all.sort((a, b) => b.completedAt - a.completedAt)
  } catch {
    return []
  }
}

export async function writeCompleted(data: CompletedPuzzle): Promise<boolean> {
  try {
    await tx(COMPLETED_STORE, 'readwrite', store => store.put(data))
    return true
  } catch {
    return false
  }
}

export async function deleteCompleted(id: string): Promise<void> {
  try {
    await tx(COMPLETED_STORE, 'readwrite', store => store.delete(id))
  } catch {
    // best-effort
  }
}

// ─── One-time migration from the old localStorage layout ─────────────────────

const LEGACY_INDEX_KEY = 'jigsaw_saves'
const LEGACY_PREFIX = 'jigsaw_save_'
let migrated = false

async function migrateFromLocalStorage(): Promise<void> {
  if (migrated) return
  migrated = true
  try {
    const raw = localStorage.getItem(LEGACY_INDEX_KEY)
    if (!raw) return
    const metas: SaveMeta[] = JSON.parse(raw)
    for (const meta of metas) {
      const saveRaw = localStorage.getItem(LEGACY_PREFIX + meta.id)
      if (!saveRaw) continue
      try {
        const save: SaveData = JSON.parse(saveRaw)
        await tx(STORE, 'readwrite', store => store.put(save))
      } catch {
        // skip a corrupt legacy entry
      }
      localStorage.removeItem(LEGACY_PREFIX + meta.id)
    }
    localStorage.removeItem(LEGACY_INDEX_KEY)
  } catch {
    // No legacy data or storage unavailable — nothing to migrate.
  }
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
