/**
 * Backend error codes the UI turns into friendly, localized messages.
 *
 * The backend answers HTTP 422 with:
 *   { error: "CONTENT_REJECTED" } - message, display name or bio not allowed
 *   { error: "IMAGE_REJECTED" }   - uploaded profile/chat photo not allowed
 *   { error: "AGE_LOCKED" }       - birth year can no longer be changed
 * Older endpoints use { error: { code, message } }; both shapes are read.
 */

import { AxiosError } from "axios";
import i18n from "@/src/i18n";

export const API_ERROR_CODES = ["CONTENT_REJECTED", "IMAGE_REJECTED", "AGE_LOCKED"] as const;
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
