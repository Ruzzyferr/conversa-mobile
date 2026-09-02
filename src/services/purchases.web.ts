import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

export type { PurchasesOffering, PurchasesPackage };

/**
 * Web'de satin alma yok.
 *
 * Ortak dosya `Platform.OS === "ios" ? IOS_KEY : ANDROID_KEY` yaziyor, yani
 * web'de RevenueCat'i ANDROID anahtariyla kurmaya calisiyordu. Uygulama
 * web'e cikmiyor -- web yalnizca inceleme kosumuz -- ama yanlis anahtarla
 * kurulum denemesi gurultuden ibaret degil: hata mesaji "Android icin anahtar
 * bulunamadi" diyerek yanlis yeri isaret ediyor.
 *
 * Bu dosya web'i acikca satin alinamaz kiliyor.
 */

const NOT_SUPPORTED = "Purchases are not available on web";

/**
 * Odeme ekraninin plan listesini web'de gozle inceleyebilmek icin sahte
 * paketler. Yalnizca gelistirme kosumunda ve yalnizca bayrak acikken; bir
 * yayin paketinde ikisi de dogru olamaz, dolayisiyla gercek kullaniciya
 * asla uydurma fiyat gosterilmez.
 */
function devOfferings(): PurchasesOffering | null {
  if (!__DEV__ || process.env.EXPO_PUBLIC_FAKE_OFFERINGS !== "1") return null;

  const pkg = (
    identifier: string,
    packageType: string,
    price: number,
    priceString: string
  ) =>
    ({
      identifier,
      packageType,
      product: { identifier, price, priceString },
    }) as unknown as PurchasesPackage;

  return {
    identifier: "dev",
    availablePackages: [
      pkg("$rc_weekly", "WEEKLY", 74.99, "₺74,99"),
      pkg("$rc_monthly", "MONTHLY", 199.99, "₺199,99"),
    ],
  } as unknown as PurchasesOffering;
}

export async function initPurchases(_userId: string): Promise<void> {
  // Sessizce hicbir sey yapmiyor: acilis akisi bunu cagiriyor ve web'de
  // atilan bir hata butun acilisi durdururdu.
}

export async function getOfferings(_userId?: string): Promise<PurchasesOffering | null> {
  return devOfferings();
}

export async function getCustomerInfo(_userId?: string): Promise<CustomerInfo> {
  throw new Error(NOT_SUPPORTED);
}

export function isPremiumFromCustomerInfo(_customerInfo: CustomerInfo): boolean {
  return false;
}

export async function purchasePremium(
  _pkg: PurchasesPackage,
  _userId?: string
): Promise<CustomerInfo> {
  throw new Error(NOT_SUPPORTED);
}

export async function restorePurchases(_userId?: string): Promise<CustomerInfo> {
  throw new Error(NOT_SUPPORTED);
}

export async function logoutPurchases(): Promise<void> {
  // yok
}
