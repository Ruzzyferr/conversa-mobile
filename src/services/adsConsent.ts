/**
 * Legal consent (Google UMP) + Apple App Tracking Transparency.
 *
 * Order, per Apple 5.1.2(i) and the ATT FAQ:
 *   1. UMP consent (GDPR/EEA message; no-op where consent is not required).
 *   2. ATT system dialog, ONLY when the status is still 'undetermined' AND the
 *      user did not decline the relevant legal consent choices. Apple: "You
 *      should not display the ATT prompt to users who have opted out of all
 *      relevant legal consent choices."
 *
 * There is no custom tracking screen anywhere in the app: the only tracking
 * prompt is Apple's own dialog. Nothing in the app is gated on the answer;
 * it only decides personalised vs non-personalised ad requests.
 *
 * Never throws.
 */

import { AppState, Platform } from 'react-native';

/** Resolves once the app is in the foreground ('active'). */
export function waitUntilActive(): Promise<void> {
  if (AppState.currentState === 'active') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sub.remove();
        resolve();
      }
    });
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Show Apple's system ATT dialog (iOS only) if the status is undetermined.
 * Waits until the app is active first: requesting while the app is not fully
 * active makes iOS return 'denied' without ever showing the dialog.
 * Returns true when tracking is allowed (always true off iOS).
 */
async function requestAppTrackingPermission(mayPrompt: boolean): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return true;
  }
  try {
    const att = await import('expo-tracking-transparency');
    const current = await att.getTrackingPermissionsAsync();
    if (current.status !== 'undetermined') {
      return current.granted;
    }
    if (!mayPrompt) {
      // User opted out of the legal consent choices: do not show ATT, and
      // treat tracking as not allowed.
      return false;
    }
    // Let a just-dismissed UMP form finish animating out, and make sure we
    // are still in the foreground before asking.
    await waitUntilActive();
    await delay(500);
    await waitUntilActive();
    const result = await att.requestTrackingPermissionsAsync();
    return result.granted;
  } catch (error) {
    console.warn('ATT request failed, treating tracking as not allowed:', error);
    return false;
  }
}

/**
 * Whether the user declined the legal consent choices that tracking depends
 * on. Only meaningful where GDPR applies; elsewhere nothing was declined.
 */
async function userDeclinedLegalConsent(AdsConsent: any, AdsConsentStatus: any): Promise<boolean> {
  try {
    const gdprApplies: boolean = await AdsConsent.getGdprApplies();
    if (!gdprApplies) {
      return false;
    }
    const info = await AdsConsent.getConsentInfo();
    if (info?.status !== (AdsConsentStatus?.OBTAINED ?? 'OBTAINED')) {
      // Consent required but not given (form dismissed / unavailable).
      return true;
    }
    const choices = await AdsConsent.getUserChoices();
    // Purpose 1 (store/access info on device) and Purpose 3 (personalised ads
    // profile) are what IDFA-based tracking needs.
    return !choices?.storeAndAccessInformationOnDevice || !choices?.createAPersonalisedAdsProfile;
  } catch (error) {
    // If we cannot tell, be conservative and do not prompt.
    console.warn('Could not read UMP user choices, skipping ATT prompt:', error);
    return true;
  }
}

/**
 * Run UMP then (maybe) ATT. Returns whether personalised ads are allowed.
 */
export async function runConsentAndTracking(AdsConsent: any, AdsConsentStatus: any): Promise<boolean> {
  let umpAllows = false;
  let declined = true;
  try {
    await AdsConsent.requestInfoUpdate();
    await AdsConsent.loadAndShowConsentFormIfRequired();
    const consentInfo = await AdsConsent.getConsentInfo();
    // OBTAINED: user answered, NOT_REQUIRED: outside EEA (no consent needed)
    umpAllows =
      consentInfo?.status === (AdsConsentStatus?.OBTAINED ?? 'OBTAINED') ||
      consentInfo?.status === (AdsConsentStatus?.NOT_REQUIRED ?? 'NOT_REQUIRED');
    declined = await userDeclinedLegalConsent(AdsConsent, AdsConsentStatus);
  } catch (error) {
    console.warn('UMP consent flow failed, falling back to non-personalized ads:', error);
    umpAllows = false;
    declined = true;
  }

  const attAllows = await requestAppTrackingPermission(!declined);
  const personalized = umpAllows && !declined && attAllows;
  console.log(`UMP allows: ${umpAllows}, declined: ${declined}, ATT allows: ${attAllows}, personalized ads: ${personalized}`);
  return personalized;
}
