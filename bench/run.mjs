import { chromium } from 'playwright'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const SIZES = [100, 500, 1000, 2000, 5000, 10000]

const server = await createServer({
  root: process.cwd(),
  plugins: [react()],
  server: { port: 5199 },
  logLevel: 'error',
})
await server.listen()

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('http://localhost:5199/bench/index.html')
await page.waitForFunction(() => typeof window.benchTray === 'function')

// CPU throttle factor via args: `node run.mjs 4` simulates a 4x-slower CPU.
const throttle = Number(process.argv[2] || 1)
if (throttle > 1) {
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setCPUThrottlingRate', { rate: throttle })
}

// Warmup (discarded): the first render pays one-time JIT compilation and the
// initial photo decode, which would otherwise be charged entirely to the first
// measured size and make small counts look slower than large ones.
await page.evaluate(n => window.benchTray(n), SIZES[0])
await page.evaluate(n => window.benchTray(n), SIZES[SIZES.length - 1])

console.log(`\nTray render benchmark  (CPU throttle: ${throttle}x)`)
console.log('pieces      render(ms)   DOM nodes')
console.log('------      ----------   ---------')
for (const n of SIZES) {
  // Best-of-N: discard scheduler/GC jitter; the floor is the real render cost.
  let ms = Infinity
  for (let i = 0; i < 5; i++) {
    ms = Math.min(ms, await page.evaluate(n => window.benchTray(n), n))
  }
  const nodes = await page.evaluate(() => window.benchNodeCount)
  console.log(`${String(n).padStart(6)}      ${String(ms).padStart(7)}     ${String(nodes).padStart(7)}`)
}

await browser.close()
await server.close()
