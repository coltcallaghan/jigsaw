import { chromium } from 'playwright'

const URL = process.argv[2] || 'http://localhost:5173/'
const PHOTO = process.argv[3] || new URL('./sample.jpg', import.meta.url).pathname
const THEME = process.argv[4] || 'cartoon'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle' })

const consent = page.getByRole('button', { name: /accept & play/i })
if (await consent.count()) { await consent.first().click(); await page.waitForTimeout(400) }

await page.evaluate(t => {
  const cur = JSON.parse(localStorage.getItem('jigsaw_settings') || '{}')
  // Force outlines on, small piece count for clear edges.
  localStorage.setItem('jigsaw_settings', JSON.stringify({ ...cur, theme: t, outlines: true }))
}, THEME)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)

const newPuzzle = page.locator('.btn-primary', { hasText: 'New Puzzle' })
await newPuzzle.first().waitFor({ state: 'visible', timeout: 15000 })
const chooserPromise = page.waitForEvent('filechooser', { timeout: 15000 })
await newPuzzle.first().click()
await (await chooserPromise).setFiles(PHOTO)

await page.waitForSelector('.dropzone.has-img img', { timeout: 10000 })
// Pick the smallest difficulty (10 pieces) for big, clearly-outlined pieces.
await page.locator('.diff-card .num', { hasText: /^10$/ }).first().click()
await page.getByRole('button', { name: /start puzzle/i }).first().click()
await page.waitForTimeout(2800)

// Screenshot just the play area (the board canvas) so piece edges fill frame.
await page.locator('.play-wrap').screenshot({ path: `bench/shot-pieces-${THEME}.png` })
console.log(`${THEME}: captured bench/shot-pieces-${THEME}.png`)
await browser.close()
