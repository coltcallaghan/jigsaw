/**
 * Self-hosted fonts, bundled into the build via @fontsource so the app works
 * fully offline (Steam / desktop / mobile) — no Google Fonts CDN at runtime.
 *
 * Only the families + weights actually referenced in theme.css are imported,
 * and only the `latin` subset, to keep the bundle small. If a theme starts
 * using a new weight, add it here.
 *
 * Families per theme (see theme.css --font-head / --font-body):
 *   cartoon — Baloo 2 (head) + Nunito (body)
 *   modern  — Plus Jakarta Sans
 *   dark    — Space Grotesk
 *   arcade  — Press Start 2P (head) + Jersey 10 (body)
 */

// cartoon
import '@fontsource/baloo-2/latin-400.css'
import '@fontsource/baloo-2/latin-700.css'
import '@fontsource/baloo-2/latin-800.css'
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'

// modern
import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'

// dark
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-600.css'

// arcade
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource/jersey-10/latin-400.css'
