/**
 * Interstitial Ads Service using AdMob
 * 
 * Shows full-screen ads at transition points (e.g., every 5 swipes)
 * IMPORTANT: AdMob only works in EAS dev builds, not in Expo Go.
 */

import Constants from 'expo-constants';

let mobileAds: any = null;
let InterstitialAd: any = null;
let AdEventType: any = null;
let TestIds: any = null;

let isInitialized = false;
let isExpoGo = false;
let currentAd: any = null;
let isAdLoading = false;

/**
 * Check if we're running in Expo Go
 */
function checkExpoGo(): boolean {
    try {
        if (Constants.executionEnvironment === 'storeClient') {
            return true;
        }
        if (Constants.appOwnership === 'expo') {
            return true;
        }
        return false;
    } catch {
        return true;
    }
}

/**
 * Lazy load AdMob module
 */
async function loadAdMobModule(): Promise<boolean> {
    if (isExpoGo) {
        return false;
    }

    if (mobileAds) {
        return true;
    }

    try {
        const admobModule = await import('react-native-google-mobile-ads');
        mobileAds = admobModule.default;
        InterstitialAd = admobModule.InterstitialAd;
        AdEventType = admobModule.AdEventType;
        TestIds = admobModule.TestIds;
        return true;
    } catch (error) {
        console.warn('AdMob module not available:', error);
        isExpoGo = true;
        return false;
    }
}

/**
 * Initialize interstitial ads
 */
export async function initializeInterstitialAds(): Promise<void> {
    if (isInitialized) {
        return;
    }

    isExpoGo = checkExpoGo();
    if (isExpoGo) {
        console.log('Interstitial ads skipped: Running in Expo Go');
        return;
    }

    const moduleLoaded = await loadAdMobModule();
    if (!moduleLoaded) {
        return;
    }

    try {
        await mobileAds().initialize();
        isInitialized = true;
        console.log('Interstitial ads initialized');
        // Preload first ad
        preloadInterstitialAd();
    } catch (error) {
        console.error('Failed to initialize interstitial ads:', error);
    }
}

/**
 * Get the interstitial ad unit ID
 */
function getInterstitialAdUnitId(): string | null {
    if (__DEV__) {
        return TestIds?.INTERSTITIAL || 'ca-app-pub-3940256099942544/1033173712';
    }
    return Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID ||
        process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID ||
        null;
}

/**
 * Preload an interstitial ad for quick display later
 */
export function preloadInterstitialAd(): void {
    if (isExpoGo || !isInitialized || isAdLoading || currentAd?.loaded) {
        return;
    }

    const adUnitId = getInterstitialAdUnitId();
    if (!adUnitId || !InterstitialAd) {
        return;
    }

    isAdLoading = true;

    try {
        currentAd = InterstitialAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: true,
        });

        currentAd.addAdEventListener(AdEventType.LOADED, () => {
            console.log('Interstitial ad preloaded');
            isAdLoading = false;
        });

        currentAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
            console.warn('Interstitial ad failed to load:', error);
            isAdLoading = false;
            currentAd = null;
        });

        currentAd.addAdEventListener(AdEventType.CLOSED, () => {
            console.log('Interstitial ad closed');
            currentAd = null;
            // Preload next ad
            setTimeout(() => preloadInterstitialAd(), 1000);
        });

        currentAd.load();
    } catch (error) {
        console.error('Failed to create interstitial ad:', error);
        isAdLoading = false;
    }
}

export interface InterstitialAdResult {
    success: boolean;
    error?: string;
}

/**
 * Show an interstitial ad
 * Returns immediately if ad not ready, or waits for ad to close
 */
export async function showInterstitialAd(): Promise<InterstitialAdResult> {
    if (isExpoGo || checkExpoGo()) {
        return { success: false, error: 'Ads not available in Expo Go' };
    }

    if (!isInitialized) {
        await initializeInterstitialAds();
        if (!isInitialized) {
            return { success: false, error: 'Ads not initialized' };
        }
    }

    // Check if ad is ready
    if (!currentAd?.loaded) {
        // Try to preload for next time
        preloadInterstitialAd();
        return { success: false, error: 'Ad not ready' };
    }

    return new Promise((resolve) => {
        try {
            const closeListener = currentAd.addAdEventListener(AdEventType.CLOSED, () => {
                closeListener();
                resolve({ success: true });
            });

            currentAd.show();
        } catch (error: any) {
            console.error('Failed to show interstitial ad:', error);
            resolve({ success: false, error: error?.message || 'Failed to show ad' });
        }
    });
}

/**
 * Check if interstitial ad is ready to show
 */
export function isInterstitialAdReady(): boolean {
    return !isExpoGo && isInitialized && currentAd?.loaded === true;
}
