import { Capacitor } from '@capacitor/core'
import {
  isNative,
  REVENUECAT_API_KEY,
  UNLOCK_ENTITLEMENT,
  UNLOCK_PRODUCT_ID,
} from './platform'
import { setUnlocked } from './unlock'

/**
 * Thin wrapper around RevenueCat for the single one-time "unlock all sizes"
 * purchase. On web/desktop this is a no-op — those builds are always unlocked.
 *
 * RevenueCat is the source of truth for entitlement on native; the localStorage
 * flag (see unlock.ts) is only an offline cache refreshed by `syncEntitlement`.
 */

type Purchases = typeof import('@revenuecat/purchases-capacitor').Purchases

let purchasesPromise: Promise<Purchases | null> | null = null

async function getPurchases(): Promise<Purchases | null> {
  if (!isNative) return null
  if (!purchasesPromise) {
    purchasesPromise = (async () => {
      const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor')
      const apiKey =
        Capacitor.getPlatform() === 'ios'
          ? REVENUECAT_API_KEY.ios
          : REVENUECAT_API_KEY.android
      if (!apiKey) {
        throw new Error('RevenueCat API key is not configured for this platform')
      }
      await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR })
      await Purchases.configure({ apiKey })
      return Purchases
    })()
  }
  return purchasesPromise
}

function hasUnlockEntitlement(info: { entitlements: { active: Record<string, unknown> } }): boolean {
  return Boolean(info.entitlements.active[UNLOCK_ENTITLEMENT])
}

/** Refresh cached unlock state from RevenueCat. Safe to call on app start. */
export async function syncEntitlement(): Promise<boolean> {
  const purchases = await getPurchases()
  if (!purchases) return true // web/desktop: always unlocked
  try {
    const { customerInfo } = await purchases.getCustomerInfo()
    const unlocked = hasUnlockEntitlement(customerInfo)
    setUnlocked(unlocked)
    return unlocked
  } catch {
    // Offline or transient error — fall back to the cached flag.
    return false
  }
}

/** Trigger the store purchase flow. Returns true if the unlock is now active. */
export async function purchaseUnlock(): Promise<boolean> {
  const purchases = await getPurchases()
  if (!purchases) return true
  const { customerInfo } = await purchases.purchaseStoreProduct({
    product: await getUnlockProduct(purchases),
  })
  const unlocked = hasUnlockEntitlement(customerInfo)
  setUnlocked(unlocked)
  return unlocked
}

/** Restore a previous purchase (required by App Store / Play policy). */
export async function restorePurchases(): Promise<boolean> {
  const purchases = await getPurchases()
  if (!purchases) return true
  const { customerInfo } = await purchases.restorePurchases()
  const unlocked = hasUnlockEntitlement(customerInfo)
  setUnlocked(unlocked)
  return unlocked
}

async function getUnlockProduct(purchases: Purchases) {
  const { products } = await purchases.getProducts({ productIdentifiers: [UNLOCK_PRODUCT_ID] })
  const product = products[0]
  if (!product) {
    throw new Error(`Store product "${UNLOCK_PRODUCT_ID}" was not found`)
  }
  return product
}
