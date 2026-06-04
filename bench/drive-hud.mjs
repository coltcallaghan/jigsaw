import { chromium } from 'playwright'

const URL = process.argv[2] || 'http://localhost:5173/'
const PHOTO = process.argv[3] || new URL('./sample.jpg', import.meta.url).pathname
const THEME = process.argv[4] || 'cartoon'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } })
await page.goto(URL, { waitUntil: 'networkidle' })

const consent = page.getByRole('button', { name: /accept & play/i })
if (await consent.count()) { await consent.first().click(); await page.waitForTimeout(400) }

// Set theme directly via localStorage so we can test each theme's HUD.
await page.evaluate(t => {
  const cur = JSON.parse(localStorage.getItem('jigsaw_settings') || '{}')
  localStorage.setItem('jigsaw_settings', JSON.stringify({ ...cur, theme: t }))
}, THEME)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)

const newPuzzle = page.locator('.btn-primary', { hasText: 'New Puzzle' })
await newPuzzle.first().waitFor({ state: 'visible', timeout: 15000 })
const chooserPromise = page.waitForEvent('filechooser', { timeout: 15000 })
await newPuzzle.first().click()
await (await chooserPromise).setFiles(PHOTO)

await page.waitForSelector('.dropzone.has-img img', { timeout: 10000 })
await page.getByRole('button', { name: /start puzzle/i }).first().click()
await page.waitForTimeout(2500)

// Screenshot just the HUD strip so the gear is clearly visible.
const hud = page.locator('.hud')
await hud.screenshot({ path: `bench/shot-hud-${THEME}.png` })
const gearBox = await page.getByRole('button', { name: /^settings$/i }).first().boundingBox()
console.log(`${THEME}: gear button box = ${JSON.stringify(gearBox)}`)
await browser.close()
