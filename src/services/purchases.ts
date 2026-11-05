import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

// Re-export types for use in other modules
export type { PurchasesOffering, PurchasesPackage };
import { Platform } from "react-native";
import { api } from "./api";

/** `Purchases.configure` has run. It must run exactly once per app process. */
let isConfigured = false;
/** RevenueCat app user id currently logged in, or null (anonymous / logged out). */
let currentUserId: string | null = null;
let initPromise: Promise<void> | null = null;
let pendingUserId: string | null = null;

/** RevenueCat app user id currently logged in, or null after logout / before init. */
export function getPurchasesUserId(): string | null {
  return currentUserId;
}

/**
 * Initialize RevenueCat Purchases SDK for a Conversa user.
 *
 * Safe to call repeatedly. On a shared phone the SDK used to stay logged in
 * as the PREVIOUS account: this returned early once initialized, so a second
 * user's purchase was attributed to the first user's RevenueCat id. Now a
 * different user id switches the SDK user with `Purchases.logIn`. A failed
 * attempt clears `initPromise` so the next call retries instead of replaying
 * the same rejected promise forever.
 *
 * @param userId - Conversa user ID to sync across devices
 */
export function initPurchases(userId: string): Promise<void> {
  if (isConfigured && currentUserId === userId) {
    return Promise.resolve();
  }
  if (initPromise && pendingUserId === userId) {
    return initPromise;
  }

  // Serialize behind any in-flight attempt (for another user) so configure /
  // logIn calls never interleave.
  const previous = initPromise ?? Promise.resolve();
  pendingUserId = userId;
  const attempt: Promise<void> = previous
    .catch(() => undefined)
    .then(() => doInitPurchases(userId))
    .finally(() => {
      if (initPromise === attempt) {
        initPromise = null;
        pendingUserId = null;
      }
    });
  initPromise = attempt;
  return attempt;
}

async function doInitPurchases(userId: string): Promise<void> {
  if (isConfigured && currentUserId === userId) return;

  try {
    if (!isConfigured) {
      const apiKey =
        Platform.OS === "ios"
          ? process.env.EXPO_PUBLIC_RC_IOS_API_KEY
          : process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY;

      if (!apiKey) {
        const errorMsg = `RevenueCat API key not found for ${Platform.OS}. Premium features will not work.`;
        console.warn(errorMsg);
        throw new Error(errorMsg);
      }

      // SDK'nin kendi gunlugunu kendi filtremizden geciriyoruz.
      //
      // RevenueCat, faturalandirmanin bulunmadigi cihazlarda ("Billing is not
      // available in this device") hata seviyesinde yaziyor. Bu bir arıza
      // degil, cihazin durumu; gelistirme derlemesinde LogBox'i tam ekran
      // acip uygulamanin ustunu kapatiyor, uretimde de hata gunluklerini
      // dolduruyordu.
      Purchases.setLogHandler((level, message) => {
        if (isBillingUnavailable(message)) {
          console.warn("[RevenueCat]", message);
          return;
        }
        if (level === "ERROR") console.error("[RevenueCat]", message);
        else if (level === "WARN") console.warn("[RevenueCat]", message);
        else if (__DEV__) console.log("[RevenueCat]", message);
      });

      // Configure directly with the app user id: no anonymous user is
      // created and nothing can be bought under one in between.
      await Purchases.configure({ apiKey, appUserID: userId });
      isConfigured = true;
      currentUserId = userId;
      attachCustomerInfoBridge();
      console.log("RevenueCat initialized for user:", userId);
      return;
    }

    // Already configured for another (or no) user: switch accounts.
    await Purchases.logIn(userId);
    currentUserId = userId;
    console.log("RevenueCat switched to user:", userId);
  } catch (error) {
    if (isBillingUnavailable(error)) {
      console.warn("RevenueCat baslatilamadi (cihazda faturalandirma yok):", describe(error));
    } else {
      console.error("Failed to initialize RevenueCat:", error);
    }
    throw error;
  }
}

/**
 * Ensure RevenueCat is initialized (for the right user) before making any
 * Purchases calls. Gets the user ID from the API if not provided.
 */
async function ensureInitialized(userId?: string): Promise<void> {
  if (userId) {
    await initPurchases(userId);
    return;
  }

  if (isConfigured && currentUserId) {
    return;
  }

  // Otherwise, try to get user ID from API
  let id: string;
  try {
    const me = await api.getMe();
    id = me.user.id;
  } catch (error) {
    console.error("Failed to get user ID for RevenueCat initialization:", error);
    throw new Error("RevenueCat not initialized and cannot get user ID");
  }
  await initPurchases(id);
}

// ---- Customer info updates -------------------------------------------------

type CustomerInfoListener = (info: CustomerInfo) => void;
const customerInfoListeners = new Set<CustomerInfoListener>();
let bridgeAttached = false;

/** Forward the SDK's single listener to every subscriber. Needs a configured SDK. */
function attachCustomerInfoBridge(): void {
  if (bridgeAttached) return;
  try {
    Purchases.addCustomerInfoUpdateListener((info) => {
      customerInfoListeners.forEach((listener) => {
        try {
          listener(info);
        } catch (error) {
          console.warn("customerInfo listener failed:", error);
        }
      });
    });
    bridgeAttached = true;
  } catch (error) {
    console.warn("Could not attach RevenueCat customerInfo listener:", error);
  }
}

/**
 * Subscribe to RevenueCat customer info changes (renewal, expiry, refund,
 * purchases made outside this screen). Returns an unsubscribe function.
 */
export function onCustomerInfoUpdate(listener: CustomerInfoListener): () => void {
  customerInfoListeners.add(listener);
  if (isConfigured) attachCustomerInfoBridge();
  return () => {
    customerInfoListeners.delete(listener);
  };
}

/**
 * Get current customer info from RevenueCat
 */
export async function getCustomerInfo(userId?: string): Promise<CustomerInfo> {
  try {
    await ensureInitialized(userId);
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error("Failed to get customer info:", error);
    throw error;
  }
}

/**
 * Check if user has premium entitlement from RevenueCat
 */
export function isPremiumFromCustomerInfo(customerInfo: CustomerInfo): boolean {
  // Check for premium entitlement (adjust identifier based on your RevenueCat setup)
  const premiumEntitlement = customerInfo.entitlements.active["premium"];
  return premiumEntitlement !== undefined;
}

/**
 * Get available offerings (packages) from RevenueCat
 */
export async function getOfferings(userId?: string): Promise<PurchasesOffering | null> {
  try {
    await ensureInitialized(userId);
    const offerings = await Purchases.getOfferings();

    // Debug logging (dev builds only - avoid dumping offerings JSON in production)
    if (__DEV__) {
      console.log("=== RevenueCat Offerings Debug ===");
      console.log("All offerings:", JSON.stringify(offerings.all, null, 2));
      console.log("Current offering:", offerings.current?.identifier);
      console.log("Available packages:", offerings.current?.availablePackages.map(p => ({
        identifier: p.identifier,
        packageType: p.packageType,
        productIdentifier: p.product.identifier,
      })));
      console.log("=================================");
    }

    // Return the current offering (usually the default)
    return offerings.current;
  } catch (error) {
    // Faturalandirmanin BULUNMADIGI cihaz bir hata degil, bir durumdur.
    //
    // Play Billing'i olmayan cihazlar var: Google servisleri olmayan
    // telefonlar, kurumsal profiller, emulatorler. Orada `getOfferings`
    // her zaman patliyor ve bunu `console.error` ile bildirmek hem log'u
    // dolduruyor hem de gelistirme derlemesinde LogBox'i tam ekran acip
    // uygulamanin ustunu kapatiyordu. Kullanici icin dogru davranis zaten
    // paketsiz bir odeme ekrani gostermek; bu yalnizca gurultuyu kesiyor.
    if (isBillingUnavailable(error)) {
      console.warn("Satin alma bu cihazda kullanilamiyor:", describe(error));
    } else {
      console.error("Failed to get offerings:", error);
    }
    throw error;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** RevenueCat'in "bu cihazda satin alma yok" dedigi durumlar. */
function isBillingUnavailable(error: unknown): boolean {
  const code = (error as { code?: string | number })?.code;
  if (code === "PURCHASE_NOT_ALLOWED" || code === "7" || code === 7) return true;
  const text = typeof error === "string" ? error : describe(error);
  return /BILLING_UNAVAILABLE|Billing is not available|not allowed to make the purchase|PurchaseNotAllowed/i.test(text);
}


/**
 * Purchase a premium package
 * @param packageToPurchase - The package to purchase
 */
export async function purchasePremium(
  packageToPurchase: PurchasesPackage,
  userId?: string
): Promise<CustomerInfo> {
  try {
    await ensureInitialized(userId);
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo;
  } catch (error: any) {
    // Handle user cancellation gracefully
    if (error.userCancelled) {
      throw new Error("Purchase cancelled");
    }
    console.error("Purchase failed:", error);
    throw error;
  }
}

/**
 * Purchase a consumable pack (boosts, favorites). Like `purchasePremium` but
 * also returns the store transaction id so the server can confirm exactly
 * this purchase was credited.
 */
export async function purchasePack(
  packageToPurchase: PurchasesPackage,
  userId?: string
): Promise<{ customerInfo: CustomerInfo; transactionId: string | null }> {
  try {
    await ensureInitialized(userId);
    const { customerInfo, transaction } = await Purchases.purchasePackage(packageToPurchase);
    return { customerInfo, transactionId: transaction?.transactionIdentifier ?? null };
  } catch (error: any) {
    if (error.userCancelled) {
      throw new Error("Purchase cancelled");
    }
    console.error("Pack purchase failed:", error);
    throw error;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(userId?: string): Promise<CustomerInfo> {
  try {
    await ensureInitialized(userId);
    return await Purchases.restorePurchases();
  } catch (error) {
    console.error("Failed to restore purchases:", error);
    throw error;
  }
}

/**
 * Log the RevenueCat SDK out of the current Conversa user. Call on logout,
 * account deletion and automatic session expiry, so the next account on the
 * same phone never buys or restores under the previous user's id.
 * Never throws: a failure here must not block signing out.
 */
export async function logoutPurchases(): Promise<void> {
  // Let an in-flight init finish first, or it would log the old user back in.
  if (initPromise) {
    await initPromise.catch(() => undefined);
  }
  const wasLoggedIn = isConfigured && currentUserId !== null;
  currentUserId = null;
  if (!wasLoggedIn) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    // logOut throws when the SDK user is already anonymous; nothing to undo.
    console.warn("Failed to logout from RevenueCat:", describe(error));
  }
}
