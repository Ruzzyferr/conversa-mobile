/**
 * Backend error codes the UI turns into friendly, localized messages.
 *
 * The backend answers { error: { code, message, requestId } } with:
 *   422 CONTENT_REJECTED             - message, display name or bio not allowed
 *   422 IMAGE_REJECTED               - uploaded profile/chat photo not allowed
 *   422 AGE_LOCKED                   - birth year can no longer be changed
 *   422 BIRTH_YEAR_REQUIRED          - first profile save without a birth year
 *   503 IMAGE_MODERATION_UNAVAILABLE - photo check down; user can retry
 * A flat { error: "CODE" } shape and a top-level { code, message } shape are
 * also read.
 *
 * UI code should show errors with `apiErrorMessage(error, t("x.fallback"))`:
 * it maps backend codes to translated text and never shows a raw axios or
 * server message ("Request failed with status code 429").
 */

import { AxiosError } from "axios";
import i18n from "@/src/i18n";

export const API_ERROR_CODES = [
  "CONTENT_REJECTED",
  "IMAGE_REJECTED",
  "AGE_LOCKED",
  "BIRTH_YEAR_REQUIRED",
  "IMAGE_MODERATION_UNAVAILABLE",
] as const;
export type KnownApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Thrown by the fetch-based upload helpers so callers can read the code. */
export class ApiResponseError extends Error {
  status: number;
  code: string | null;

  constructor(status: number, body: string, label = "Request failed") {
    super(`${label}: ${status} ${body}`);
    this.name = "ApiResponseError";
    this.status = status;
    this.code = codeFromBody(parseJson(body));
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function codeFromBody(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  if (typeof data.error === "string") return data.error;
  if (data.error && typeof data.error.code === "string") return data.error.code;
  if (typeof data.code === "string") return data.code;
  return null;
}

function bodyOf(error: unknown): any {
  if (error instanceof ApiResponseError) return null;
  const maybe = error as any;
  if (error instanceof AxiosError || maybe?.isAxiosError) return maybe.response?.data ?? null;
  return null;
}

/** HTTP status of an axios error / ApiResponseError, or null. */
export function getApiErrorStatus(error: unknown): number | null {
  if (error instanceof ApiResponseError) return error.status;
  const maybe = error as any;
  if (error instanceof AxiosError || maybe?.isAxiosError) {
    return typeof maybe.response?.status === "number" ? maybe.response.status : null;
  }
  return null;
}

/** English server message (for classification only, never shown). */
function serverMessage(error: unknown): string {
  const data = bodyOf(error);
  if (!data || typeof data !== "object") return "";
  if (data.error && typeof data.error.message === "string") return data.error.message;
  if (typeof data.message === "string") return data.message;
  return "";
}

/** True for a request that never got a response (offline, DNS, timeout). */
export function isNetworkError(error: unknown): boolean {
  const maybe = error as any;
  if (error instanceof AxiosError || maybe?.isAxiosError) return !maybe.response;
  return false;
}

/** Error code from an axios error, an ApiResponseError, or null. */
export function getApiErrorCode(error: unknown): string | null {
  if (error instanceof ApiResponseError) return error.code;
  if (error instanceof AxiosError) return codeFromBody(error.response?.data);
  const maybe = error as any;
  if (maybe?.isAxiosError) return codeFromBody(maybe.response?.data);
  return null;
}

const MESSAGE_KEYS: Record<KnownApiErrorCode, string> = {
  CONTENT_REJECTED: "errors.content_rejected",
  IMAGE_REJECTED: "errors.image_rejected",
  AGE_LOCKED: "errors.age_locked",
  BIRTH_YEAR_REQUIRED: "errors.birth_year_required",
  IMAGE_MODERATION_UNAVAILABLE: "errors.image_check_unavailable",
};

/**
 * Localized, non-technical message for a known backend code, or null when
 * the error is something else (callers then show their generic message).
 */
export function friendlyApiErrorMessage(error: unknown): string | null {
  const code = getApiErrorCode(error);
  if (code && (API_ERROR_CODES as readonly string[]).includes(code)) {
    return i18n.t(MESSAGE_KEYS[code as KnownApiErrorCode]);
  }
  return null;
}

/** Further codes the generic helper translates. */
const EXTRA_MESSAGE_KEYS: Record<string, string> = {
  RATE_LIMIT_EXCEEDED: "errors.rate_limited",
  TOO_MANY_REQUESTS: "errors.rate_limited",
  REQUEST_ALREADY_EXISTS: "errors.request_already_exists",
  REQUEST_ALREADY_SENT: "errors.request_already_sent",
  CONCURRENCY_FULL: "errors.concurrency_full",
  THROUGHPUT_FULL: "errors.throughput_full",
  AI_CONSENT_REQUIRED: "errors.ai_consent_required",
  TRACK_COOLDOWN: "errors.track_cooldown",
  PROOF_REQUIRED: "errors.proof_required",
  UNDER_18: "errors.under_18",
  EXAM_COOLDOWN: "errors.exam_cooldown",
  BOOST_UNAVAILABLE: "errors.boost_unavailable",
  BLOCKED: "errors.blocked",
  CODE_EXPIRED: "errors.code_expired",
  OTP_EXPIRED: "errors.code_expired",
  CODE_INVALID: "errors.code_invalid",
  INVALID_CODE: "errors.code_invalid",
  TOO_MANY_ATTEMPTS: "errors.too_many_attempts",
  CODE_TOO_MANY_ATTEMPTS: "errors.too_many_attempts",
  FIRST_MESSAGE_MUST_BE_TEXT: "errors.first_message_text",
  FIRST_MESSAGE_RESTRICTED: "errors.first_message_restricted",
  MALE_CANNOT_SEND_FIRST_MESSAGE: "errors.first_message_restricted",
  FIRST_MESSAGE_TOO_SHORT: "errors.first_message_too_short",
  ALREADY_VERIFIED: "errors.already_verified",
  VERIFICATION_PENDING: "errors.verification_pending",
  BOOST_ALREADY_ACTIVE: "errors.boost_already_active",
  NO_BOOSTS_REMAINING: "errors.no_boosts_remaining",
};

/**
 * The one way to turn any caught error into user-facing text.
 *
 * Order: known backend code -> network failure -> 429 -> `fallback`
 * (an already-translated string from the caller) -> generic text.
 * Raw `error.message` is never returned.
 */
export function apiErrorMessage(error: unknown, fallback?: string): string {
  const known = friendlyApiErrorMessage(error);
  if (known) return known;

  const code = getApiErrorCode(error);
  if (code && EXTRA_MESSAGE_KEYS[code]) return i18n.t(EXTRA_MESSAGE_KEYS[code]);
  // Zod age check on the profile ("You must be at least 18 years old").
  if (code === "VALIDATION_ERROR" && /18 years/i.test(serverMessage(error))) {
    return i18n.t("errors.under_18");
  }

  if (isNetworkError(error)) return i18n.t("errors.network");
  if (getApiErrorStatus(error) === 429) return i18n.t("errors.rate_limited");

  return fallback ?? i18n.t("errors.generic");
}

export type OtpErrorKind =
  | "invalid"
  | "expired"
  | "too_many_attempts"
  | "rate_limited"
  | "network"
  | "other";

/**
 * Why a verification code was refused. Reads codes first, then the English
 * server message (the backend currently answers 400 BAD_REQUEST with
 * "Invalid or expired verification code" / "Too many incorrect attempts").
 */
export function otpErrorKind(error: unknown): OtpErrorKind {
  const code = getApiErrorCode(error);
  if (code === "TOO_MANY_ATTEMPTS" || code === "CODE_TOO_MANY_ATTEMPTS") return "too_many_attempts";
  if (code === "CODE_EXPIRED" || code === "OTP_EXPIRED") return "expired";
  if (code === "CODE_INVALID" || code === "INVALID_CODE") return "invalid";
  if (isNetworkError(error)) return "network";
  const status = getApiErrorStatus(error);
  if (status === 429) return "rate_limited";

  const msg = serverMessage(error).toLowerCase();
  if (msg.includes("too many")) return "too_many_attempts";
  // "Invalid or expired" cannot be told apart; treat it as invalid (the
  // screen still offers a new code).
  if (msg.includes("invalid")) return "invalid";
  if (msg.includes("expired")) return "expired";
  if (status === 400) return "invalid";
  return "other";
}
