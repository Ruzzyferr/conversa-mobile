/**
 * Web tarafi kucuk anahtar/deger deposu. Gerekcesi authStore.web.ts ile
 * ayni: expo-secure-store web'de calismiyor.
 */
const memory = new Map<string, string>();

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export async function getItem(key: string): Promise<string | null> {
  const s = storage();
  if (!s) return memory.get(key) ?? null;
  try {
    return s.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  memory.set(key, value);
  const s = storage();
  if (!s) return;
  try {
    s.setItem(key, value);
  } catch {
    // yoksay
  }
}
