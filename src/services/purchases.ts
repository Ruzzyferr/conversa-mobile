import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { Platform } from "react-native";

let isInitialized = false;

/**
 * Initialize RevenueCat Purchases SDK
 * @param userId - Swiip user ID to sync across devices
 */
export async function initPurchases(userId: string): Promise<void> {
  if (isInitialized) {
    return;
  }

  const apiKey =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_RC_IOS_API_KEY
      : process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY;

  if (!apiKey) {
    console.warn(
      `RevenueCat API key not found for ${Platform.OS}. Premium features will not work.`
    );
    return;
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
}

/**
 * Get current customer info from RevenueCat
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  try {
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
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
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
  packageToPurchase: PurchasesPackage
): Promise<CustomerInfo> {
  try {
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
export async function restorePurchases(): Promise<CustomerInfo> {
  try {
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
    await Purchases.logOut();
    isInitialized = false;
  } catch (error) {
    console.error("Failed to logout from RevenueCat:", error);
    throw error;
  }
}

