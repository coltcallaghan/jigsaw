import { chromium } from 'playwright'

const URL = process.argv[2] || 'http://localhost:5173/'
const PHOTO = process.argv[3] || new URL('./sample.jpg', import.meta.url).pathname

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } })
const logs = []
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`))

await page.goto(URL, { waitUntil: 'networkidle' })

const consent = page.getByRole('button', { name: /accept & play/i })
if (await consent.count()) { await consent.first().click(); await page.waitForTimeout(400) }

// Menu → New Puzzle (a .btn-primary DIV) → file chooser → setup → start.
const newPuzzle = page.locator('.btn-primary', { hasText: 'New Puzzle' })
await newPuzzle.first().waitFor({ state: 'visible', timeout: 15000 })
const chooserPromise = page.waitForEvent('filechooser', { timeout: 15000 })
await newPuzzle.first().click()
const chooser = await chooserPromise
await chooser.setFiles(PHOTO)

await page.waitForSelector('.dropzone.has-img img', { timeout: 10000 })
await page.getByRole('button', { name: /start puzzle/i }).first().click()
await page.waitForTimeout(2500)

// Open the in-game settings modal via the HUD gear button.
await page.getByRole('button', { name: /^settings$/i }).first().click()
await page.waitForTimeout(400)
const modalVisible = await page.locator('.settings-modal').isVisible()
await page.screenshot({ path: 'bench/shot-settings-modal.png' })

// Switch to Audio tab inside the modal to confirm the shared panel works.
await page.locator('.settings-modal .tab', { hasText: 'Audio' }).click()
await page.waitForTimeout(200)
await page.screenshot({ path: 'bench/shot-settings-audio.png' })

// Close via Escape and confirm it dismisses.
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
const modalAfterEsc = await page.locator('.settings-modal').count()

// Probe that the new audio decodes in-browser.
const audio = await page.evaluate(async () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const files = [
    'audio/sfx/ui_click_cartoon.wav', 'audio/sfx/ui_click_modern.wav',
    'audio/sfx/ui_click_dark.wav', 'audio/sfx/ui_click_arcade.wav',
  ]
  const out = []
  for (const f of files) {
    try {
      const r = await fetch('/' + f); const b = await r.arrayBuffer()
      const a = await ctx.decodeAudioData(b); out.push(`${f}: OK ${a.duration.toFixed(3)}s`)
    } catch (e) { out.push(`${f}: FAIL ${e.message}`) }
  }
  return out
})

console.log(`settings modal visible: ${modalVisible}`)
console.log(`modal after Escape (0 = closed): ${modalAfterEsc}`)
console.log('click audio:\n  ' + audio.join('\n  '))
console.log('screenshots: bench/shot-settings-modal.png, bench/shot-settings-audio.png')
const errs = logs.filter(l => l.startsWith('[pageerror]') || l.startsWith('[error]'))
if (errs.length) console.log('\nerrors:\n' + errs.join('\n'))

await browser.close()
