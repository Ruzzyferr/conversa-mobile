/**
 * Web tarafi icin reklamsiz taklit. Gerekcesi rewardedAds.web.ts ile ayni.
 */

export async function initializeInterstitialAds(): Promise<void> {}

export function preloadInterstitialAd(): void {}

export interface InterstitialAdResult {
  success: boolean;
  error?: string;
}

export async function showInterstitialAd(): Promise<InterstitialAdResult> {
  return { success: false, error: "ads_unavailable_on_web" };
}

export function isInterstitialAdReady(): boolean {
  return false;
}
