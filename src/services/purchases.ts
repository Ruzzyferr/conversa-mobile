import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

// Re-export types for use in other modules
export type { PurchasesOffering, PurchasesPackage };
import { Platform } from "react-native";
import { api } from "./api";

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize RevenueCat Purchases SDK
 * @param userId - Conversa user ID to sync across devices
 */
export async function initPurchases(userId: string): Promise<void> {
  if (isInitialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const apiKey =
      Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_RC_IOS_API_KEY
        : process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY;

    if (!apiKey) {
      const errorMsg = `RevenueCat API key not found for ${Platform.OS}. Premium features will not work.`;
      console.warn(errorMsg);
      throw new Error(errorMsg);
    }

    try {
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

      await Purchases.configure({ apiKey });
      await Purchases.logIn(userId);
      isInitialized = true;
      console.log("RevenueCat initialized for user:", userId);
    } catch (error) {
      if (isBillingUnavailable(error)) {
        console.warn("RevenueCat baslatilamadi (cihazda faturalandirma yok):", describe(error));
      } else {
        console.error("Failed to initialize RevenueCat:", error);
      }
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Ensure RevenueCat is initialized before making any Purchases calls
 * This function will try to get the user ID from the API if not provided
 */
async function ensureInitialized(userId?: string): Promise<void> {
  if (isInitialized) {
    return;
  }

  // If userId is provided, use it
  if (userId) {
    await initPurchases(userId);
    return;
  }

  // Otherwise, try to get user ID from API
  try {
    const me = await api.getMe();
    await initPurchases(me.user.id);
  } catch (error) {
    console.error("Failed to get user ID for RevenueCat initialization:", error);
    throw new Error("RevenueCat not initialized and cannot get user ID");
  }
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
 * Log out current user (useful for switching accounts)
 */
export async function logoutPurchases(): Promise<void> {
  try {
    if (isInitialized) {
      await Purchases.logOut();
    }
    isInitialized = false;
    initPromise = null; // Reset promise so initialization can be retried
  } catch (error) {
    console.error("Failed to logout from RevenueCat:", error);
    isInitialized = false;
    initPromise = null; // Reset even on error
    throw error;
  }
}

