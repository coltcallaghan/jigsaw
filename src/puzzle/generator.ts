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

/**
 * Render all pieces onto individual offscreen canvases.
 * Returns a Map from pieceId -> ImageBitmap (GPU-uploadable texture source).
 *
 * We over-draw by TAB_SIZE on each side so tabs don't get clipped.
 */
export async function renderPieceTextures(
  image: HTMLImageElement,
  pieces: PieceDefinition[]
): Promise<Map<number, ImageBitmap>> {
  const result = new Map<number, ImageBitmap>()

  await Promise.all(
    pieces.map(async (piece) => {
      const { srcX, srcY, srcW, srcH, edges } = piece
      // Pad must cover the full tab extent: TAB_SIZE * max(edge length)
      const pad = Math.max(srcW, srcH) * TAB_SIZE * 1.5

      const canvasW = srcW + pad * 2
      const canvasH = srcH + pad * 2

      const canvas = new OffscreenCanvas(Math.ceil(canvasW), Math.ceil(canvasH))
      const ctx = canvas.getContext('2d')!

      const path = new Path2D(buildPiecePath(edges, srcW, srcH))

      ctx.save()
      ctx.translate(pad, pad)
      ctx.clip(path)

      // Draw a region of the source image that covers the piece body AND its tabs.
      // Image pixel (srcX, srcY) must land at translated origin (0, 0), so we
      // draw from image offset (-srcX, -srcY) which covers the full tab area.
      const imgSrcX = Math.max(0, srcX - pad)
      const imgSrcY = Math.max(0, srcY - pad)
      const imgSrcW = Math.min(srcW + pad * 2, image.naturalWidth - imgSrcX)
      const imgSrcH = Math.min(srcH + pad * 2, image.naturalHeight - imgSrcY)
      const dstX = imgSrcX - srcX   // ≈ -pad (or clamped when near image edge)
      const dstY = imgSrcY - srcY

      ctx.drawImage(image, imgSrcX, imgSrcY, imgSrcW, imgSrcH, dstX, dstY, imgSrcW, imgSrcH)

      ctx.restore()

      const bitmap = await createImageBitmap(canvas)
      result.set(piece.id, bitmap)
    })
  )

  return result
}
