/**
 * Rewarded Ads Service using AdMob
 * 
 * IMPORTANT: AdMob only works in EAS dev builds, not in Expo Go.
 * Build with: eas build -p android --profile preview
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Lazy import AdMob to avoid errors in Expo Go
let mobileAds: any = null;
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;
let AdsConsent: any = null;
let AdsConsentStatus: any = null;

let isInitialized = false;
let isExpoGo = false;

// UMP consent state: default false (non-personalized) until consent is known
let personalizedAdsAllowed = false;

// Shared initialization promise so all ad surfaces (rewarded, interstitial,
// banner) reuse a single mobileAds().initialize() + UMP consent flow
let initPromise: Promise<void> | null = null;

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
    AdsConsent = admobModule.AdsConsent;
    AdsConsentStatus = admobModule.AdsConsentStatus;
    return true;
  } catch (error) {
    console.warn('AdMob module not available (likely running in Expo Go):', error);
    isExpoGo = true;
    return false;
  }
}

/**
 * Whether consent allows serving personalized ads.
 * Defaults to false (non-personalized) until the UMP consent flow resolves.
 */
export function canServePersonalizedAds(): boolean {
  return personalizedAdsAllowed;
}

/**
 * Whether the AdMob SDK finished initializing successfully
 */
export function isAdsSdkInitialized(): boolean {
  return isInitialized;
}

/**
 * Run the UMP (User Messaging Platform) consent flow for GDPR/EEA compliance.
 * Never throws - consent failure must not block app startup or ad init.
 */
async function requestUmpConsent(): Promise<void> {
  try {
    await AdsConsent.requestInfoUpdate();
    await AdsConsent.loadAndShowConsentFormIfRequired();

    const consentInfo = await AdsConsent.getConsentInfo();
    // OBTAINED: user gave consent, NOT_REQUIRED: outside EEA (no consent needed)
    // UNKNOWN/REQUIRED: no consent yet -> stick to non-personalized ads
    personalizedAdsAllowed =
      consentInfo?.status === (AdsConsentStatus?.OBTAINED ?? 'OBTAINED') ||
      consentInfo?.status === (AdsConsentStatus?.NOT_REQUIRED ?? 'NOT_REQUIRED');
    console.log(`UMP consent status: ${consentInfo?.status}, personalized ads: ${personalizedAdsAllowed}`);
  } catch (error) {
    // Log and continue with non-personalized ads
    console.warn('UMP consent flow failed, falling back to non-personalized ads:', error);
    personalizedAdsAllowed = false;
  }
}

/**
 * Initialize AdMob (call once on app start)
 * Runs the UMP consent flow before SDK initialization.
 * Swallows errors and logs them instead of throwing
 * Does nothing in Expo Go
 */
export function initializeAds(): Promise<void> {
  if (!initPromise) {
    initPromise = doInitializeAds();
  }
  return initPromise;
}

/**
 * Shared initialization promise - other ad services (interstitial, banner)
 * should await this instead of calling mobileAds().initialize() themselves
 */
export function ensureAdsInitialized(): Promise<void> {
  return initializeAds();
}

async function doInitializeAds(): Promise<void> {
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

  // Run the UMP consent flow BEFORE initializing the SDK (AdMob EEA policy)
  await requestUmpConsent();

  try {
    await mobileAds().initialize();
    isInitialized = true;
    console.log('AdMob initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AdMob:', error);
    // Don't throw - let isInitialized stay false
    // showRewardedAd will handle the error gracefully
    // Reset the shared promise so a later call can retry initialization
    initPromise = null;
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
/**
 * @param ssv one-time proof issued by POST /rewards/ad-token. AdMob echoes it
 *   back to the backend in the signed server-side-verification callback,
 *   which is what proves the ad was really watched — without it the reward
 *   endpoint has to take the client's word for it.
 */
export async function showRewardedAd(
  ssv?: { nonce: string; userId: string }
): Promise<RewardedAdResult> {
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
    : Platform.OS === 'ios'
      ? (Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID ||
         process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID)
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
      requestNonPersonalizedAdsOnly: !canServePersonalizedAds(),
      ...(ssv
        ? {
            serverSideVerificationOptions: {
              userId: ssv.userId,
              customData: ssv.nonce,
            },
          }
        : {}),
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
