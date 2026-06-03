import { Capacitor } from '@capacitor/core'

/** True when running inside a native Capacitor shell (iOS/Android). */
export const isNative = Capacitor.isNativePlatform()

/**
 * Largest puzzle piece count available for free on native builds.
 * Free tier covers: Kids (10), Casual (50), Beginner (100).
 * Larger sizes require the one-time unlock.
 */
export const FREE_PIECE_LIMIT = 100
