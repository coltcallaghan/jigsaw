import { Capacitor } from '@capacitor/core'

/** True when running inside a native Capacitor shell (iOS/Android). */
export const isNative = Capacitor.isNativePlatform()

/**
 * Largest puzzle piece count available for free on native builds.
 * Free tier covers: Kids (10), Casual (50), Beginner (100).
 * Larger sizes require the one-time unlock.
 */
export const FREE_PIECE_LIMIT = 100

/**
 * RevenueCat configuration for the one-time "unlock all sizes" purchase.
 *
 * - Set the public SDK keys in App Store Connect / Play Console via RevenueCat,
 *   then expose them at build time as Vite env vars (see .env.example).
 * - `UNLOCK_ENTITLEMENT` must match the entitlement identifier configured in the
 *   RevenueCat dashboard; `UNLOCK_PRODUCT_ID` the store product identifier.
 */
export const REVENUECAT_API_KEY = {
  ios: import.meta.env.VITE_RC_IOS_KEY ?? '',
  android: import.meta.env.VITE_RC_ANDROID_KEY ?? '',
} as const

export const UNLOCK_ENTITLEMENT = 'unlock_all_sizes'
export const UNLOCK_PRODUCT_ID = 'com.coltcallaghan.jigsaw.unlock_all'
