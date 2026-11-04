/**
 * Post-login permission sequence. ONE place decides when the app asks for
 * anything, so system prompts never stack.
 *
 * Sequence (started by the main tab layout, i.e. signed in + onboarded):
 *   1. wait until AppState is 'active', then ~1.5s more (also absorbs the
 *      transient tab mount during sign-up; the caller cancels on unmount)
 *   2. confirm a session exists and the profile is complete
 *   3. ads: UMP consent -> ATT system dialog (only if undetermined and legal
 *      consent not declined) -> mobileAds().initialize()
 *   4. short pause, wait until active again
 *   5. push: in-app explainer -> system notification prompt -> token register
 *
 * ATT always finishes before the push explainer appears. Nothing is gated on
 * the ATT answer.
 */

import { api } from './api';
import { getToken } from './authStore';
import { registerPushToken } from './pushNotifications';
import { startAdsConsentFlow } from './rewardedAds';
import { delay, waitUntilActive } from './adsConsent';

const START_DELAY_MS = 1500;
const BETWEEN_PROMPTS_MS = 1000;

let sequenceRan = false;

export async function runPostLoginPermissions(isCancelled: () => boolean): Promise<void> {
  if (sequenceRan) return;

  await waitUntilActive();
  await delay(START_DELAY_MS);
  if (isCancelled()) return;
  await waitUntilActive();
  if (isCancelled()) return;

  try {
    const token = await getToken();
    if (!token) return;
    const me = await api.getMe();
    if (!me?.profileExists) return;
  } catch {
    // Offline or session check failed: try again on the next tab mount.
    return;
  }
  if (isCancelled() || sequenceRan) return;
  sequenceRan = true;

  try {
    await startAdsConsentFlow();
  } catch (error) {
    console.warn('Ads consent flow failed:', error);
  }

  await delay(BETWEEN_PROMPTS_MS);
  await waitUntilActive();
  await registerPushToken();
}
