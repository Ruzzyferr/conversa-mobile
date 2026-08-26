/**
 * Tiny persistent key/value store for small non-secret flags.
 *
 * Uses expo-secure-store because the app already ships it for the session
 * token, so there is no extra dependency; the values here are not secrets, they
 * just need to survive a restart. Every call is best-effort: a storage failure
 * must never break the flow that asked.
 */
let store: typeof import("expo-secure-store") | null = null;
const memory = new Map<string, string>();

async function load() {
  if (store) return store;
  try {
    store = await import("expo-secure-store");
    return store;
  } catch {
    return null;
  }
}

export async function getItem(key: string): Promise<string | null> {
  try {
    const s = await load();
    if (!s) return memory.get(key) ?? null;
    return await s.getItemAsync(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  memory.set(key, value);
  try {
    const s = await load();
    await s?.setItemAsync(key, value);
  } catch {
    // best effort
  }
}
