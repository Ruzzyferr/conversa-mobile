/**
 * Rewarded Ads Service using AdMob
 * 
 * IMPORTANT: AdMob only works in EAS dev builds, not in Expo Go.
 * Build with: eas build -p android --profile preview
 */

import Constants from 'expo-constants';

// Lazy import AdMob to avoid errors in Expo Go
let mobileAds: any = null;
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;

let isInitialized = false;
let isExpoGo = false;

/**
 * Check if we're running in Expo Go (where AdMob doesn't work)
 */
function checkExpoGo(): boolean {
  try {
    // Check execution environment
    if (Constants.executionEnvironment === 'storeClient') {
      return true; // Expo Go
    }
    // In Expo Go, appOwnership is 'expo'
    if (Constants.appOwnership === 'expo') {
      return true; // Expo Go
    }
    return false; // Development build or standalone
  } catch {
    // If check fails, assume Expo Go to be safe
    return true;
  }
}

/**
 * Lazy load AdMob module (only in dev builds, not Expo Go)
 */
async function loadAdMobModule(): Promise<boolean> {
  if (isExpoGo) {
    return false;
  }

  if (mobileAds) {
    return true; // Already loaded
  }

  try {
    const admobModule = await import('react-native-google-mobile-ads');
    mobileAds = admobModule.default;
    RewardedAd = admobModule.RewardedAd;
    RewardedAdEventType = admobModule.RewardedAdEventType;
    TestIds = admobModule.TestIds;
    return true;
  } catch (error) {
    console.warn('AdMob module not available (likely running in Expo Go):', error);
    isExpoGo = true;
    return false;
  }
}

/**
 * Initialize AdMob (call once on app start)
 * Swallows errors and logs them instead of throwing
 * Does nothing in Expo Go
 */
export async function initializeAds(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // Check if we're in Expo Go
  isExpoGo = checkExpoGo();
  if (isExpoGo) {
    console.log('AdMob skipped: Running in Expo Go (not supported)');
    return;
  }

  // Load AdMob module
  const moduleLoaded = await loadAdMobModule();
  if (!moduleLoaded) {
    console.warn('AdMob module not available');
    return;
  }

  try {
    await mobileAds().initialize();
    isInitialized = true;
    console.log('AdMob initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AdMob:', error);
    // Don't throw - let isInitialized stay false
    // showRewardedAd will handle the error gracefully
  }
}

export interface RewardedAdResult {
  success: boolean;
  error?: string;
}

/**
 * Show a rewarded ad
 * Returns a promise that resolves when the ad is watched and reward is earned
 * Returns error in Expo Go (not supported)
 */
export async function showRewardedAd(): Promise<RewardedAdResult> {
  // Check Expo Go first
  if (isExpoGo || checkExpoGo()) {
    return { success: false, error: 'Rewarded ads are not available in Expo Go. Please use a development build.' };
  }

  // Load AdMob module if not loaded
  const moduleLoaded = await loadAdMobModule();
  if (!moduleLoaded) {
    return { success: false, error: 'AdMob module not available' };
  }

  if (!isInitialized) {
    await initializeAds();
    if (!isInitialized) {
      return { success: false, error: 'AdMob not initialized' };
    }
  }

  // Get ad unit ID: Test ID in dev, production ID from env
  const adUnitId = __DEV__
    ? (TestIds?.REWARDED || 'ca-app-pub-3940256099942544/5224354917') // Fallback test ID
    : (Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID ||
       process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID);

  if (!adUnitId) {
    console.error('AdMob rewarded ad unit ID not configured');
    return { success: false, error: 'Ad unit ID not configured' };
  }

  if (!RewardedAd || !RewardedAdEventType) {
    return { success: false, error: 'AdMob module not loaded' };
  }

  return new Promise((resolve) => {
    const rewarded = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    let unsubscribeLoaded: (() => void) | null = null;
    let unsubscribeEarned: (() => void) | null = null;
    let unsubscribeDismissed: (() => void) | null = null;
    let unsubscribeFailedToShow: (() => void) | null = null;

    // Flags to ensure resolve is called only once
    let earned = false;
    let done = false;

    const cleanup = () => {
      if (unsubscribeLoaded) unsubscribeLoaded();
      if (unsubscribeEarned) unsubscribeEarned();
      if (unsubscribeDismissed) unsubscribeDismissed();
      if (unsubscribeFailedToShow) unsubscribeFailedToShow();
    };

    // Safe resolve function - only resolves once
    const safeResolve = (result: RewardedAdResult) => {
      if (done) {
        return;
      }
      done = true;
      cleanup();
      resolve(result);
    };

    // Handle ad loaded
    unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('Rewarded ad loaded, showing...');
      rewarded.show();
    });

    // Handle reward earned
    unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward: any) => {
        console.log('Reward earned:', reward);
        earned = true;
        safeResolve({ success: true });
      }
    );

    // Handle ad dismissed without reward
    // Use type assertion to access potentially available events
    const dismissedEvent = RewardedAdEventType?.DISMISSED || (RewardedAdEventType as any)?.CLOSED;
    if (dismissedEvent) {
      unsubscribeDismissed = rewarded.addAdEventListener(
        dismissedEvent,
        () => {
          console.log('Rewarded ad dismissed');
          // Only resolve with failure if reward wasn't earned
          // (earned event fires before dismissed event)
          if (!earned) {
            safeResolve({ success: false, error: 'Ad dismissed without earning reward' });
          }
        }
      );
    }

    // Handle failed to show
    const failedToShowEvent = RewardedAdEventType?.FAILED_TO_SHOW || (RewardedAdEventType as any)?.ERROR;
    if (failedToShowEvent) {
      unsubscribeFailedToShow = rewarded.addAdEventListener(
        failedToShowEvent,
        (error: any) => {
          console.error('Rewarded ad failed to show:', error);
          const errorMessage = error?.message || error?.toString() || 'Failed to show ad';
          safeResolve({ success: false, error: errorMessage });
        }
      );
    }

    // Load the ad - load() returns void, wrap in try-catch
    try {
      rewarded.load();
    } catch (error: any) {
      console.error('Failed to load rewarded ad:', error);
      safeResolve({ success: false, error: error?.message || 'Failed to load ad' });
    }
  });
}

/**
 * Check if ads are available
 * In production, check ad network availability
 */
export async function areAdsAvailable(): Promise<boolean> {
  if (!isInitialized) {
    try {
      await initializeAds();
    } catch (error) {
      console.error('Failed to initialize ads:', error);
      return false;
    }
  }
  return true;
}
