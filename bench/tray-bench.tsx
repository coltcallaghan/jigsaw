import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import PieceTray from '../src/components/PieceTray'
import { computeGrid, generatePieces } from '../src/puzzle/generator'
import type { PuzzleConfig } from '../src/puzzle/types'

// Real photo (DSC03029.jpg, 5472×3648) served by Vite and read into a data URL
// at startup, so the benchmark exercises the same SVG-clip + image-decode path
// the app uses with an actual photograph rather than a synthetic rectangle.
const IMG_W = 5472
const IMG_H = 3648

async function loadImage(): Promise<string> {
  const res = await fetch('/bench/sample.jpg')
  if (!res.ok) throw new Error(`failed to load sample image: ${res.status}`)
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function buildDefs(pieceCount: number) {
  const cfg: PuzzleConfig = {
    imageDataUrl: '', imageWidth: IMG_W, imageHeight: IMG_H,
    cols: 0, rows: 0, pieceCount, name: 'bench',
  }
  const { cols, rows } = computeGrid(IMG_W, IMG_H, pieceCount)
  const defs = generatePieces({ ...cfg, cols, rows })
  return defs
}

const host = document.getElementById('root')!
const root = createRoot(host)

// Exposed to Playwright: render the tray with N pieces and return ms taken.
//
// The tray virtualizes: it renders only the slots inside the measured viewport
// box, which the ResizeObserver/scroll effect sets a tick AFTER first paint.
// On the first commit `box` is {0,0} so the body is `null` — fast but not
// representative. We therefore split the work:
//   1. mount + let the measuring effect run and commit the populated window
//      (OUTSIDE the timer — this is one-time setup, and the RAF idle wait
//      would otherwise dominate the number),
//   2. then time ONLY a synchronous re-render commit, at which point `box` is
//      already non-zero so the real populated window renders under flushSync.
// `nonce` forces React to do a genuine re-render commit (not bail out) while
// `box` state persists across it, so we measure the populated render cost.
let nonce = 0
let img: string | null = null
;(window as unknown as { benchTray: (n: number) => Promise<number> }).benchTray = async (n: number) => {
  if (img === null) img = await loadImage()
  const defs = buildDefs(n)
  const ids = defs.map(d => d.id)
  const render = () =>
    root.render(
      <div key="bench" data-nonce={nonce} style={{ width: 220, height: 600, display: 'flex', flexDirection: 'column' }}>
        <PieceTray
          pieceIds={ids}
          pieces={defs}
          imageDataUrl={img!}
          imageWidth={IMG_W}
          imageHeight={IMG_H}
          theme="cartoon"
          onRetrieve={() => {}}
        />
      </div>
    )

  // ── Setup (untimed): mount and let measurement settle into a populated commit.
  flushSync(render)
  void host.offsetHeight
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  void host.offsetHeight

  // ── Measure (timed): re-render the now-measured (populated) window synchronously.
  nonce++
  const t0 = performance.now()
  flushSync(render)
  void host.offsetHeight
  const ms = performance.now() - t0

  ;(window as unknown as { benchNodeCount: number }).benchNodeCount = host.querySelectorAll('*').length
  return Math.round(ms * 100) / 100
}
