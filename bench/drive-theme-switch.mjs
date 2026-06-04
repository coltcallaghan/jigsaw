import { chromium } from 'playwright'
import { fileURLToPath } from 'url'

const TARGET = process.argv[2] || 'http://localhost:5173/'
const PHOTO = process.argv[3] || fileURLToPath(new URL('./sample.jpg', import.meta.url))
const PIECES = process.argv[4] || '100'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 })
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
// Larger puzzle => small pieces, the case where outlines used to vanish.
await page.locator('.diff-card .num', { hasText: new RegExp(`^${PIECES}$`) }).first().click()
await page.getByRole('button', { name: /start puzzle/i }).first().click()
await page.waitForTimeout(3000)

const play = page.locator('.play-wrap')
const canvas = page.locator('canvas').first()
const box = await canvas.boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height / 2

// 1) Fit-all (zoomed out): small pieces. This is where outlines used to vanish.
await play.screenshot({ path: `bench/shot-sw-${PIECES}-fit-cartoon.png` })
console.log(`fit-all ${PIECES}pc cartoon -> bench/shot-sw-${PIECES}-fit-cartoon.png`)

// 2) Zoom in with the wheel and recapture — outlines should stay constant thickness.
for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -300); await page.waitForTimeout(60) }
await page.mouse.move(cx, cy)
await page.waitForTimeout(400)
await play.screenshot({ path: `bench/shot-sw-${PIECES}-zoom-cartoon.png` })
console.log(`zoomed ${PIECES}pc cartoon -> bench/shot-sw-${PIECES}-zoom-cartoon.png`)

// Switch theme MID-PUZZLE (no reload) and recapture at the zoomed-in view.
async function switchTheme(name, shot) {
  await page.getByRole('button', { name: /^settings$/i }).first().click()
  await page.waitForTimeout(300)
  await page.locator('.theme-preview', { has: page.locator('.theme-preview-name', { hasText: new RegExp(name, 'i') }) }).first().click()
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  await play.screenshot({ path: shot })
  console.log(`switched to ${name} -> ${shot}`)
}

await switchTheme('Dark', `bench/shot-sw-${PIECES}-zoom-dark.png`)
await switchTheme('Arcade', `bench/shot-sw-${PIECES}-zoom-arcade.png`)
await switchTheme('Modern', `bench/shot-sw-${PIECES}-zoom-modern.png`)

const errs = logs.filter(l => l.startsWith('[pageerror]') || l.startsWith('[error]'))
console.log(errs.length ? '\nERRORS:\n' + errs.join('\n') : '\nno page errors')
await browser.close()
