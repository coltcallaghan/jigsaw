import type { EdgeType, PieceDefinition, PieceEdges, PuzzleConfig } from './types'
import type { Theme } from '../hooks/useSettings'

const THEME_EDGE: Record<Theme, { color: string; width: number }> = {
  cartoon: { color: 'rgba(43,43,43,.55)',    width: 1.5 },
  modern:  { color: 'rgba(17,24,39,.12)',    width: 0.8 },
  dark:    { color: 'rgba(255,255,255,.25)', width: 1.0 },
  arcade:  { color: 'rgba(7,242,230,.6)',    width: 1.5 },
}

// Deterministic seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Compute grid dimensions (cols x rows) closest to the target piece count
 * while respecting the image aspect ratio.
 */
export function computeGrid(
  imageWidth: number,
  imageHeight: number,
  targetCount: number
): { cols: number; rows: number } {
  const ratio = imageWidth / imageHeight
  // rows * cols ≈ targetCount, cols/rows ≈ ratio
  // rows = sqrt(targetCount / ratio), cols = ratio * rows
  let rows = Math.round(Math.sqrt(targetCount / ratio))
  let cols = Math.round(rows * ratio)
  // Clamp to at least 2x2 and adjust until product is close enough
  rows = Math.max(2, rows)
  cols = Math.max(2, cols)
  return { cols, rows }
}

/**
 * Generate all piece definitions for a puzzle.
 * Edges are assigned so neighbouring pieces interlock: if piece A has a 'tab'
 * on its right edge, the piece to its right has a 'blank' on its left edge.
 */
export function generatePieces(config: PuzzleConfig): PieceDefinition[] {
  const { cols, rows, imageWidth, imageHeight } = config
  const rand = mulberry32(cols * 1000 + rows)

  // Horizontal edges: hEdges[row][col] is the bottom edge of piece (row, col)
  // and the top edge of piece (row+1, col). rows-1 internal horizontal seams.
  const hEdges: EdgeType[][] = Array.from({ length: rows - 1 }, () =>
    Array.from({ length: cols }, () => (rand() > 0.5 ? 'tab' : 'blank'))
  )

  // Vertical edges: vEdges[row][col] is the right edge of piece (row, col)
  // and the left edge of piece (row, col+1). cols-1 internal vertical seams.
  const vEdges: EdgeType[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols - 1 }, () => (rand() > 0.5 ? 'tab' : 'blank'))
  )

  const pieces: PieceDefinition[] = []
  const pieceW = imageWidth / cols
  const pieceH = imageHeight / rows

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const edges: PieceEdges = {
        top: row === 0 ? 'flat' : (hEdges[row - 1][col] === 'tab' ? 'blank' : 'tab'),
        bottom: row === rows - 1 ? 'flat' : hEdges[row][col],
        left: col === 0 ? 'flat' : (vEdges[row][col - 1] === 'tab' ? 'blank' : 'tab'),
        right: col === cols - 1 ? 'flat' : vEdges[row][col]
      }

      pieces.push({
        id: row * cols + col,
        col,
        row,
        edges,
        srcX: col * pieceW,
        srcY: row * pieceH,
        srcW: pieceW,
        srcH: pieceH,
        solvedX: col * pieceW + pieceW / 2,
        solvedY: row * pieceH + pieceH / 2
      })
    }
  }

  return pieces
}

// ─── SVG path helpers ────────────────────────────────────────────────────────

const TAB_SIZE = 0.35  // tab bump as fraction of edge length

/** Padding drawn around a piece body so its tabs aren't clipped (atlas + engine). */
export function piecePadding(srcW: number, srcH: number): number {
  return Math.max(srcW, srcH) * TAB_SIZE * 1.5
}
const TAB_NECK = 0.28  // neck width as fraction of edge length

/**
 * Build the SVG/Canvas path for one piece given its pixel dimensions.
 * Returns a Path2D-compatible string starting from top-left, going clockwise.
 *
 * The path includes tab/blank bumps on each edge so adjacent pieces interlock.
 * All coordinates are relative to (0,0) = top-left corner of the bounding box
 * (which is srcW x srcH).
 */
export function buildPiecePath(
  edges: PieceEdges,
  srcW: number,
  srcH: number
): string {
  const w = srcW
  const h = srcH

  const topPath = edgePath(edges.top, 0, 0, w, 0, false)
  const rightPath = edgePath(edges.right, w, 0, w, h, false)
  const bottomPath = edgePath(edges.bottom, w, h, 0, h, true)
  const leftPath = edgePath(edges.left, 0, h, 0, 0, true)

  return `M 0 0 ${topPath} ${rightPath} ${bottomPath} ${leftPath} Z`
}

/**
 * Build a single edge path segment from (x1,y1) to (x2,y2).
 * `reverse` flips the bump direction (used for bottom/left edges so the
 * puzzle face side is consistent).
 */
function edgePath(
  type: EdgeType,
  x1: number, y1: number,
  x2: number, y2: number,
  reverse: boolean
): string {
  if (type === 'flat') return `L ${x2} ${y2}`

  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)

  // Unit vector along edge
  const ux = dx / len
  const uy = dy / len

  // Right-perpendicular of the direction vector always points OUTWARD
  // for a clockwise path (top→right→bottom→left), giving correct tab direction.
  // Blank simply inverts the direction to create a concavity.
  let nx = uy
  let ny = -ux
  if (type === 'blank') { nx = -nx; ny = -ny }
  void reverse  // no longer needed — right-perp is correct for all edges

  // Key fractions along the edge
  const n1 = 0.5 - TAB_NECK / 2
  const n2 = 0.5 + TAB_NECK / 2

  // Points along the straight edge
  const p1x = x1 + ux * len * n1;  const p1y = y1 + uy * len * n1
  const p2x = x1 + ux * len * n2;  const p2y = y1 + uy * len * n2

  // Tab tip centre
  const tipCx = x1 + ux * len * 0.5 + nx * len * TAB_SIZE
  const tipCy = y1 + uy * len * 0.5 + ny * len * TAB_SIZE

  // Control points for smooth bezier curves
  const ctrl1x = p1x + nx * len * TAB_SIZE * 1.1
  const ctrl1y = p1y + ny * len * TAB_SIZE * 1.1
  const ctrl2x = p2x + nx * len * TAB_SIZE * 1.1
  const ctrl2y = p2y + ny * len * TAB_SIZE * 1.1

  return [
    `L ${p1x} ${p1y}`,
    `C ${ctrl1x} ${ctrl1y} ${tipCx} ${tipCy} ${tipCx} ${tipCy}`,
    `C ${tipCx} ${tipCy} ${ctrl2x} ${ctrl2y} ${p2x} ${p2y}`,
    `L ${x2} ${y2}`
  ].join(' ')
}

/** A piece's location within an atlas image (in atlas pixels). */
export interface PieceFrame {
  atlas: number   // index into PieceAtlasResult.atlases
  x: number
  y: number
  w: number
  h: number
}

export interface PieceAtlasResult {
  atlases: ImageBitmap[]
  frames: Map<number, PieceFrame>
}

// Cap each atlas at a conservatively-safe GPU texture size. 2048 is supported
// essentially everywhere (incl. older mobile GPUs); a handful of these replaces
// thousands of individual textures, avoiding IOSurface/texture exhaustion on
// large (5k/10k-piece) puzzles.
const ATLAS_MAX = 2048
// Gap between packed cells so neighbouring pieces never bleed across frames
// when the GPU samples with bilinear filtering.
const ATLAS_GAP = 2

/**
 * Render every piece and pack them into one or more texture atlases.
 *
 * Each piece is drawn (clipped to its jigsaw path, over-drawn by TAB_SIZE so
 * tabs aren't clipped) into a cell of a large shared canvas. The engine then
 * creates ONE GPU texture per atlas and frames each piece sprite to its cell —
 * so a 10,000-piece puzzle uses a few textures instead of 10,000.
 *
 * Pieces in a puzzle are all ~the same size, so a simple shelf/row packer is
 * both adequate and tight.
 */
export async function renderPieceTextures(
  image: HTMLImageElement,
  pieces: PieceDefinition[]
): Promise<PieceAtlasResult> {
  const frames = new Map<number, PieceFrame>()
  const atlases: ImageBitmap[] = []

  if (pieces.length === 0) return { atlases, frames }

  // Cell size: pieces share dimensions, but near image edges the padding is
  // clamped, so derive a uniform cell from the max padded extent. Cap the cell
  // so a single piece always fits within an atlas.
  const cellOf = (p: PieceDefinition) => {
    const pad = piecePadding(p.srcW, p.srcH)
    return { w: Math.ceil(p.srcW + pad * 2), h: Math.ceil(p.srcH + pad * 2), pad }
  }
  const cellW = Math.min(ATLAS_MAX, Math.max(...pieces.map(p => cellOf(p).w)))
  const cellH = Math.min(ATLAS_MAX, Math.max(...pieces.map(p => cellOf(p).h)))

  const colsPerAtlas = Math.max(1, Math.floor(ATLAS_MAX / (cellW + ATLAS_GAP)))
  const rowsPerAtlas = Math.max(1, Math.floor(ATLAS_MAX / (cellH + ATLAS_GAP)))
  const cellsPerAtlas = colsPerAtlas * rowsPerAtlas

  // Draw the pieces destined for one atlas onto its canvas, recording frames.
  const buildAtlas = async (slice: PieceDefinition[], atlasIndex: number) => {
    const usedRows = Math.ceil(slice.length / colsPerAtlas)
    const atlasW = Math.min(ATLAS_MAX, colsPerAtlas * (cellW + ATLAS_GAP))
    const atlasH = Math.min(ATLAS_MAX, Math.max(1, usedRows) * (cellH + ATLAS_GAP))
    const canvas = new OffscreenCanvas(atlasW, atlasH)
    const ctx = canvas.getContext('2d')!

    slice.forEach((piece, i) => {
      const { srcX, srcY, srcW, srcH, edges } = piece
      const { pad } = cellOf(piece)
      const col = i % colsPerAtlas
      const row = Math.floor(i / colsPerAtlas)
      const cellX = col * (cellW + ATLAS_GAP)
      const cellY = row * (cellH + ATLAS_GAP)

      ctx.save()
      // Origin at the cell, then the same pad translate + clip as before.
      ctx.translate(cellX + pad, cellY + pad)
      ctx.clip(new Path2D(buildPiecePath(edges, srcW, srcH)))

      const imgSrcX = Math.max(0, srcX - pad)
      const imgSrcY = Math.max(0, srcY - pad)
      const imgSrcW = Math.min(srcW + pad * 2, image.naturalWidth - imgSrcX)
      const imgSrcH = Math.min(srcH + pad * 2, image.naturalHeight - imgSrcY)
      const dstX = imgSrcX - srcX
      const dstY = imgSrcY - srcY
      ctx.drawImage(image, imgSrcX, imgSrcY, imgSrcW, imgSrcH, dstX, dstY, imgSrcW, imgSrcH)
      ctx.restore()

      frames.set(piece.id, { atlas: atlasIndex, x: cellX, y: cellY, w: cellW, h: cellH })
    })

    atlases[atlasIndex] = await createImageBitmap(canvas)
  }

  const slices: PieceDefinition[][] = []
  for (let i = 0; i < pieces.length; i += cellsPerAtlas) {
    slices.push(pieces.slice(i, i + cellsPerAtlas))
  }
  await Promise.all(slices.map((slice, idx) => buildAtlas(slice, idx)))

  return { atlases, frames }
}
