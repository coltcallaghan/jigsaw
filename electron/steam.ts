/**
 * Steam integration for the Electron main process.
 *
 * steamworks.js is a native addon and only works when the Steam client is
 * running and a real App ID is configured. Everything here degrades to a no-op
 * otherwise (development, no App ID, Steam not running), so the app runs fine
 * without Steam — achievements simply don't fire.
 *
 * To enable: set STEAM_APP_ID (env) or place a `steam_appid.txt` next to the
 * executable containing the numeric App ID from Steamworks.
 */

type SteamClient = {
  achievement: {
    activate: (name: string) => boolean
    isActivated: (name: string) => boolean
  }
}

let client: SteamClient | null = null
let initialised = false

function resolveAppId(): number | null {
  const fromEnv = process.env.STEAM_APP_ID
  if (fromEnv && /^\d+$/.test(fromEnv)) return parseInt(fromEnv, 10)
  return null
}

/** Initialise the Steam client. Safe to call once at startup; never throws. */
export function initSteam(): void {
  if (initialised) return
  initialised = true

  const appId = resolveAppId()
  if (!appId) return // No App ID yet (pre-launch) — stay a no-op.

  try {
    // Lazy require so a missing/native-incompatible module can't crash startup.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const steamworks = require('steamworks.js')
    client = steamworks.init(appId) as SteamClient
  } catch {
    client = null // Steam not running or addon unavailable.
  }
}

/** Activate a Steam achievement by its API name. No-op when Steam is inactive. */
export function activateAchievement(name: string): boolean {
  if (!client) return false
  try {
    if (client.achievement.isActivated(name)) return true
    return client.achievement.activate(name)
  } catch {
    return false
  }
}
