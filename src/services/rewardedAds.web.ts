/**
 * Web tarafi icin reklamsiz taklit.
 *
 * `react-native-google-mobile-ads` yalnizca native: web paketine
 * girdiginde `codegenNativeComponent` importu yuzunden BUTUN uygulama
 * derlenmiyor ve hicbir ekran acilmiyor. Metro `.web.ts` uzantisini once
 * cozdugu icin bu dosya native davranisa hic dokunmadan sorunu kapatir.
 *
 * Web'de reklam gostermiyoruz: odullu reklam akisi zaten magaza SDK'sina
 * bagli ve tarayicida karsiligi yok. Cagrilar sessizce "reklam yok"
 * doner, arayuz de bunu zaten ele aliyor.
 */

export function canServePersonalizedAds(): boolean {
  return false;
}

export function isAdsSdkInitialized(): boolean {
  return false;
}

export function initializeAds(): Promise<void> {
  return Promise.resolve();
}

export function ensureAdsInitialized(): Promise<void> {
  return Promise.resolve();
}

export interface RewardedAdResult {
  success: boolean;
  rewarded: boolean;
  error?: string;
}

export async function showRewardedAd(): Promise<RewardedAdResult> {
  return { success: false, rewarded: false, error: "ads_unavailable_on_web" };
}

export async function areAdsAvailable(): Promise<boolean> {
  return false;
}
