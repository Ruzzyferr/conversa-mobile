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
      await Purchases.configure({ apiKey });
      await Purchases.logIn(userId);
      isInitialized = true;
      console.log("RevenueCat initialized for user:", userId);
    } catch (error) {
      console.error("Failed to initialize RevenueCat:", error);
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

    // Debug logging
    console.log("=== RevenueCat Offerings Debug ===");
    console.log("All offerings:", JSON.stringify(offerings.all, null, 2));
    console.log("Current offering:", offerings.current?.identifier);
    console.log("Available packages:", offerings.current?.availablePackages.map(p => ({
      identifier: p.identifier,
      packageType: p.packageType,
      productIdentifier: p.product.identifier,
    })));
    console.log("=================================");

    // Return the current offering (usually the default)
    return offerings.current;
  } catch (error) {
    console.error("Failed to get offerings:", error);
    throw error;
  }
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

