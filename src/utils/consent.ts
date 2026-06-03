import { POLICY_VERSION } from '../legal/content'

const KEY = 'jigsaw_consent_version'

/**
 * True once the user has accepted the current policy version. Bumping
 * POLICY_VERSION invalidates prior acceptance so the gate re-shows.
 */
export function hasAcceptedCurrentPolicy(): boolean {
  try {
    return parseInt(localStorage.getItem(KEY) ?? '0', 10) >= POLICY_VERSION
  } catch {
    return false
  }
}

export function acceptCurrentPolicy(): void {
  try {
    localStorage.setItem(KEY, String(POLICY_VERSION))
  } catch {
    // Storage unavailable — acceptance won't persist, gate re-shows next launch.
  }
}
