/**
 * AI data-sharing consent (App Store guideline 5.1.2(i)).
 *
 * Before any content leaves the app for a third-party AI service we ask once,
 * naming what is sent and to whom (see AiConsentSheet). The answer lives on
 * the server (`aiConsent` on GET /auth/me, POST /auth/me/ai-consent) so it
 * follows the account across devices, and the server enforces it: AI routes
 * and voice-note upload answer 403 AI_CONSENT_REQUIRED unless granted.
 *
 * This module only caches the answer and lets screens subscribe to it.
 */
import { api } from "./api";
import { getApiErrorCode } from "./apiErrors";
import { onTokenChange } from "./tokenEvents";

export type AiConsent = "granted" | "declined" | null;

/** undefined = not loaded yet. */
let cached: AiConsent | undefined;
let inflight: Promise<AiConsent> | null = null;
/** Bumped on every reset so a load started for the previous account is dropped. */
let generation = 0;
const listeners = new Set<(value: AiConsent) => void>();

function publish(value: AiConsent) {
  cached = value;
  listeners.forEach((fn) => fn(value));
}

/** Current answer; fetched from /auth/me the first time. Never throws. */
export async function loadAiConsent(force = false): Promise<AiConsent> {
  if (!force && cached !== undefined) return cached;
  if (inflight) return inflight;
  const gen = generation;
  const request = (async (): Promise<AiConsent> => {
    try {
      const me = await api.getMe();
      const raw = (me.user as { aiConsent?: AiConsent }).aiConsent ?? null;
      const value: AiConsent = raw === "granted" || raw === "declined" ? raw : null;
      if (gen !== generation) return null; // account changed meanwhile
      publish(value);
      return value;
    } catch {
      // Unknown: answer "not asked" so the sheet is shown rather than the
      // request being sent silently, but leave the cache unset so the next
      // call asks the server again instead of trusting this guess forever.
      return gen === generation ? (cached ?? null) : null;
    } finally {
      // Only clear our own slot: a reset may have started a newer load.
      if (gen === generation) inflight = null;
    }
  })();
  inflight = request;
  return request;
}

export function getCachedAiConsent(): AiConsent | undefined {
  return cached;
}

/** Stores the answer on the server, then locally. Throws if the server call fails. */
export async function saveAiConsent(granted: boolean): Promise<AiConsent> {
  const res = await api.setAiConsent(granted);
  const value: AiConsent =
    res?.aiConsent === "granted" || res?.aiConsent === "declined"
      ? res.aiConsent
      : granted
        ? "granted"
        : "declined";
  publish(value);
  return value;
}

export function subscribeAiConsent(fn: (value: AiConsent) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** True when the server refused because consent is missing. */
export function isAiConsentRequiredError(error: unknown): boolean {
  if (getApiErrorCode(error) === "AI_CONSENT_REQUIRED") {
    // Server and cache disagree (e.g. revoked on another device): resync.
    if (cached === "granted") publish(null);
    return true;
  }
  return false;
}

/** Forget the cached answer (on logout / account switch). */
export function resetAiConsentCache() {
  generation++;
  cached = undefined;
  inflight = null;
}

// Every login, logout and account switch: the answer belongs to the account.
onTokenChange(() => {
  resetAiConsentCache();
});
