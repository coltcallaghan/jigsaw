import { chromium } from 'playwright'
import { fileURLToPath } from 'url'

const TARGET = process.argv[2] || 'http://localhost:5173/'
const PHOTO = process.argv[3] || fileURLToPath(new URL('./sample.jpg', import.meta.url))
const PIECES = process.argv[4] || '5000'   // label as shown in the diff card (e.g. "5,000")

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
const logs = []
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`))

await page.goto(TARGET, { waitUntil: 'networkidle' })
const consent = page.getByRole('button', { name: /accept & play/i })
if (await consent.count()) { await consent.first().click(); await page.waitForTimeout(400) }

await page.evaluate(() => {
  const cur = JSON.parse(localStorage.getItem('jigsaw_settings') || '{}')
  localStorage.setItem('jigsaw_settings', JSON.stringify({ ...cur, theme: 'cartoon', outlines: true }))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)

const newPuzzle = page.locator('.btn-primary', { hasText: 'New Puzzle' })
await newPuzzle.first().waitFor({ state: 'visible', timeout: 15000 })
const chooserPromise = page.waitForEvent('filechooser', { timeout: 15000 })
await newPuzzle.first().click()
await (await chooserPromise).setFiles(PHOTO)
await page.waitForSelector('.dropzone.has-img img', { timeout: 10000 })

const label = Number(PIECES).toLocaleString()
await page.locator('.diff-card .num', { hasText: new RegExp(`^${label.replace(',', ',')}$`) }).first().click()
await page.getByRole('button', { name: /start puzzle/i }).first().click()
await page.waitForTimeout(5000)

const play = page.locator('.play-wrap')
await play.screenshot({ path: `bench/shot-big-${PIECES}-fit.png` })
console.log(`fit-all ${PIECES} -> bench/shot-big-${PIECES}-fit.png`)

// Zoom in over a piece cluster (upper-left of the canvas, where scattered
// pieces sit) to where a player would actually place pieces.
const box = await page.locator('canvas').first().boundingBox()
const px = box.x + box.width * 0.30
const py = box.y + box.height * 0.25
await page.mouse.move(px, py)
for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -300); await page.waitForTimeout(40); await page.mouse.move(px, py) }
await page.waitForTimeout(400)
await play.screenshot({ path: `bench/shot-big-${PIECES}-zoom.png` })
console.log(`zoomed ${PIECES} -> bench/shot-big-${PIECES}-zoom.png`)

const errs = logs.filter(l => l.startsWith('[pageerror]') || l.startsWith('[error]'))
console.log(errs.length ? '\nERRORS:\n' + errs.join('\n') : '\nno page errors')
await browser.close()
