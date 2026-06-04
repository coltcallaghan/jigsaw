import { chromium } from 'playwright'

const URL = process.argv[2] || 'http://localhost:5174/'
const PHOTO = process.argv[3] || new URL('./sample.jpg', import.meta.url).pathname
const PIECES = process.argv[4] || '100'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } })
const logs = []
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`))

await page.goto(URL, { waitUntil: 'networkidle' })

// Privacy consent gate appears on first launch; accept it to reach the menu.
const consent = page.getByRole('button', { name: /accept & play/i })
if (await consent.count()) {
  await consent.first().click()
  await page.waitForTimeout(400)
}

// Menu → "New Puzzle" is a clickable .btn DIV (not a <button>); clicking it
// clicks a hidden file <input> via fileInputRef, which fires the chooser.
const newPuzzle = page.locator('.btn-primary', { hasText: 'New Puzzle' })
await newPuzzle.first().waitFor({ state: 'visible', timeout: 15000 })
const chooserPromise = page.waitForEvent('filechooser', { timeout: 15000 })
await newPuzzle.first().click()
const chooser = await chooserPromise
await chooser.setFiles(PHOTO)

// Setup screen: preview should show the photo. Pick difficulty + start.
await page.waitForSelector('.dropzone.has-img img', { timeout: 10000 })
await page.screenshot({ path: 'bench/shot-setup.png' })

// Select the requested difficulty by its exact piece-count label, then Start.
// (100 is the default selection, so this is idempotent for the common case.)
const wanted = Number(PIECES).toLocaleString()
await page.locator('.diff-card .num', { hasText: new RegExp(`^${wanted}$`) }).first().click()
await page.getByRole('button', { name: /start puzzle/i }).first().click()

// Puzzle board: wait for the canvas/pieces to mount, then screenshot.
await page.waitForTimeout(2500)
await page.screenshot({ path: 'bench/shot-puzzle.png' })

const canvasCount = await page.locator('canvas').count()
const trayNodes = await page.evaluate(() => document.querySelectorAll('.tray-slot').length)

console.log(`photo: ${PHOTO}`)
console.log(`pieces: ${PIECES}`)
console.log(`canvases on board: ${canvasCount}`)
console.log(`tray slots in DOM: ${trayNodes}`)
console.log(`screenshots: bench/shot-setup.png, bench/shot-puzzle.png`)
if (logs.length) console.log('\nbrowser logs:\n' + logs.slice(-20).join('\n'))

await browser.close()
