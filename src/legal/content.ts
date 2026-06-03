/**
 * Bundled legal text shown in the first-run consent gate and Settings → About.
 *
 * ⚠️ DRAFT — review before release. This wording is a reasonable starting point
 * for what the app actually does (local-only data, no accounts, store-handled
 * purchases), but it is NOT legal advice. Have it checked, host the same text at
 * a public URL (required by the App Store / Play listing), and set CONTACT_EMAIL
 * and the effective date below.
 *
 * Bumping POLICY_VERSION re-shows the consent gate to everyone on next launch.
 */

export const POLICY_VERSION = 1
export const EFFECTIVE_DATE = '2026-06-03'
export const CONTACT_EMAIL = 'colt.callaghan@hasc.org.uk'

/** Lightweight blocks rendered by LegalDoc (no Markdown engine needed). */
export interface LegalBlock {
  type: 'h' | 'p' | 'li'
  text: string
}

export const PRIVACY_POLICY: LegalBlock[] = [
  { type: 'p', text: `Effective date: ${EFFECTIVE_DATE}` },
  { type: 'p', text: 'Jigsaw is a single-player puzzle game. We have designed it to collect as little as possible — your puzzles and settings stay on your device.' },

  { type: 'h', text: 'What we store' },
  { type: 'li', text: 'Your saved puzzles, progress, settings, and (on mobile) whether you have purchased the full-size unlock — all stored locally on your device.' },
  { type: 'li', text: 'The images you choose are turned into puzzles entirely on your device. They are not uploaded to us.' },

  { type: 'h', text: 'What we do NOT do' },
  { type: 'li', text: 'No accounts, no sign-in, and no personal profile.' },
  { type: 'li', text: 'No advertising and no third-party analytics or tracking SDKs.' },
  { type: 'li', text: 'We do not sell or share any personal data, because we do not collect it.' },

  { type: 'h', text: 'Purchases' },
  { type: 'p', text: 'On mobile, the one-time unlock is processed by Apple (App Store) or Google (Play) and managed via RevenueCat. We never see your card details. Those providers process the transaction under their own privacy policies. On Steam and desktop the game is fully unlocked and no in-app purchase is made.' },

  { type: 'h', text: "Children's privacy" },
  { type: 'p', text: 'The game is family-friendly and does not knowingly collect personal information from anyone, including children.' },

  { type: 'h', text: 'Your choices' },
  { type: 'p', text: 'Because data lives on your device, you can clear it at any time by deleting saved puzzles in-game or by uninstalling the app.' },

  { type: 'h', text: 'Contact' },
  { type: 'p', text: `Questions about this policy: ${CONTACT_EMAIL}` },
]

export const TERMS_OF_USE: LegalBlock[] = [
  { type: 'p', text: `Effective date: ${EFFECTIVE_DATE}` },
  { type: 'p', text: 'By using Jigsaw you agree to these terms.' },

  { type: 'h', text: 'Your content' },
  { type: 'p', text: 'You may only use images you own or have the right to use. You are responsible for the images you load into the game. They are processed locally and are not transmitted to us.' },

  { type: 'h', text: 'Purchases' },
  { type: 'p', text: 'In-app purchases are final and handled by the relevant store (Apple / Google). Refunds are governed by that store’s policies.' },

  { type: 'h', text: 'Acceptable use' },
  { type: 'li', text: 'Do not attempt to reverse engineer, tamper with, or misuse the app.' },
  { type: 'li', text: 'Do not use the app for unlawful purposes.' },

  { type: 'h', text: 'No warranty' },
  { type: 'p', text: 'The game is provided “as is”, without warranties of any kind. To the extent permitted by law, we are not liable for any loss arising from its use.' },

  { type: 'h', text: 'Changes' },
  { type: 'p', text: 'We may update these terms; continued use after an update means you accept the revised terms.' },

  { type: 'h', text: 'Contact' },
  { type: 'p', text: `Questions about these terms: ${CONTACT_EMAIL}` },
]
