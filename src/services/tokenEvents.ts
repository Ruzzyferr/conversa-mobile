/**
 * Auth token change notifications.
 *
 * setToken / clearToken (native and web authStore) call emitTokenChange so
 * long-lived connections (the app-wide socket, the chat socket) can reconnect
 * with the new token after login and disconnect on logout, without every
 * login/logout caller having to remember to do it.
 */

type TokenListener = (token: string | null) => void;

const listeners = new Set<TokenListener>();

export function onTokenChange(listener: TokenListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitTokenChange(token: string | null): void {
  listeners.forEach((listener) => {
    try {
      listener(token);
    } catch (error) {
      console.warn("[tokenEvents] listener failed:", error);
    }
  });
}
