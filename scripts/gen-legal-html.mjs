/**
 * Generate standalone privacy.html + terms.html from the SAME source the app
 * shows in-game (src/legal/content.ts), so the hosted text required by the
 * App Store / Play / Steam listings can never drift from the bundled text.
 *
 * Output goes into public/, which Vite copies verbatim into the web build
 * (dist-web/). The generated files are gitignored — they are build artifacts.
 *
 * Run automatically as part of `npm run build:web`; run manually with:
 *   node scripts/gen-legal-html.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const SRC = resolve(root, 'src/legal/content.ts')
const OUT_DIR = resolve(root, 'public')

// content.ts is TypeScript; rather than add a TS loader, parse the plain-data
// block arrays out of it. The shape is simple and stable:
//   { type: 'h' | 'p' | 'li', text: '...' }
const source = readFileSync(SRC, 'utf8')

function literal(name) {
  const m = source.match(new RegExp(`export const ${name}\\s*=\\s*'([^']*)'`))
  return m ? m[1] : ''
}

const EFFECTIVE_DATE = literal('EFFECTIVE_DATE')
const CONTACT_EMAIL = literal('CONTACT_EMAIL')

/** Extract a LegalBlock[] export by name and return [{type,text}, ...]. */
function blocks(name) {
  const start = source.indexOf(`export const ${name}`)
  if (start === -1) throw new Error(`Could not find ${name} in content.ts`)
  const open = source.indexOf('[', start)
  const close = source.indexOf('\n]', open)
  const body = source.slice(open + 1, close)

  const out = []
  // Match each { type: '...', text: <string> } entry. The text string may be
  // backtick-, single-, or double-quoted (content.ts mixes all three, e.g.
  // "Children's privacy" is double-quoted because of the apostrophe).
  const re = /\{\s*type:\s*'(h|p|li)'\s*,\s*text:\s*(`([^`]*)`|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*,?\s*\}/g
  let m
  while ((m = re.exec(body)) !== null) {
    let text = m[3] ?? m[4] ?? m[5]
    // Resolve the ${...} template interpolations the source uses.
    text = text
      .replace(/\$\{EFFECTIVE_DATE\}/g, EFFECTIVE_DATE)
      .replace(/\$\{CONTACT_EMAIL\}/g, CONTACT_EMAIL)
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
    out.push({ type: m[1], text })
  }
  if (out.length === 0) throw new Error(`No blocks parsed from ${name}`)
  return out
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Render blocks to HTML, grouping consecutive <li> into a single <ul>. */
function renderBlocks(items) {
  const parts = []
  let inList = false
  for (const b of items) {
    if (b.type === 'li') {
      if (!inList) { parts.push('<ul>'); inList = true }
      parts.push(`  <li>${escapeHtml(b.text)}</li>`)
    } else {
      if (inList) { parts.push('</ul>'); inList = false }
      if (b.type === 'h') parts.push(`<h2>${escapeHtml(b.text)}</h2>`)
      else parts.push(`<p>${escapeHtml(b.text)}</p>`)
    }
  }
  if (inList) parts.push('</ul>')
  return parts.join('\n')
}

function page(title, items) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Jigsaw — ${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    line-height: 1.6; max-width: 720px; margin: 0 auto; padding: 2.5rem 1.25rem;
    color: #1a1a1a; background: #fff;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e6e6e6; background: #14161a; }
    a { color: #8ab4ff; }
  }
  h1 { font-size: 1.9rem; margin: 0 0 1.25rem; }
  h2 { font-size: 1.2rem; margin: 1.75rem 0 .5rem; }
  p, li { margin: .5rem 0; }
  ul { padding-left: 1.25rem; }
  footer { margin-top: 2.5rem; font-size: .85rem; opacity: .7; }
  nav { margin-bottom: 1.5rem; font-size: .9rem; }
</style>
</head>
<body>
<nav><a href="./">← Jigsaw</a> &nbsp;·&nbsp; <a href="./privacy.html">Privacy</a> &nbsp;·&nbsp; <a href="./terms.html">Terms</a></nav>
<h1>${escapeHtml(title)}</h1>
${renderBlocks(items)}
<footer>Jigsaw · Contact: <a href="mailto:${escapeHtml(CONTACT_EMAIL)}">${escapeHtml(CONTACT_EMAIL)}</a></footer>
</body>
</html>
`
}

const privacyBlocks = blocks('PRIVACY_POLICY')
const termsBlocks = blocks('TERMS_OF_USE')

// Drift guard: the number of parsed blocks must equal the number of `type:`
// entries in the source, or the regex silently dropped one (e.g. an unhandled
// quote style). Fail the build rather than ship an incomplete policy.
// Count only real data blocks ({ type: '...', text: ... }), not the
// `type: 'h' | 'p' | 'li'` interface declaration.
const sourceEntries = (source.match(/\{\s*type:\s*'(h|p|li)'\s*,\s*text:/g) || []).length
const parsed = privacyBlocks.length + termsBlocks.length
if (parsed !== sourceEntries) {
  throw new Error(
    `Legal block parse mismatch: parsed ${parsed} blocks but content.ts has ` +
    `${sourceEntries} entries. The generator regex likely missed a block.`
  )
}

const privacy = page('Privacy Policy', privacyBlocks)
const terms = page('Terms of Use', termsBlocks)

writeFileSync(resolve(OUT_DIR, 'privacy.html'), privacy)
writeFileSync(resolve(OUT_DIR, 'terms.html'), terms)

console.log('Generated public/privacy.html and public/terms.html from src/legal/content.ts')
