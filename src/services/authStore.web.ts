/**
 * Web tarafi oturum deposu.
 *
 * `expo-secure-store` native-only bir modul. Web'de import'u basarili
 * oluyor ama metodlari calismiyor, o yuzden authStore.ts icindeki
 * try/catch yedegi hic devreye girmiyordu: kod dogrulaniyor, token
 * yazilamiyor ve kullanici "Failed to store token" hatasiyla giris
 * ekraninda kaliyordu. Yani web'de oturum acmak HIC mumkun degildi.
 *
 * Burada localStorage kullaniyoruz. Bu bir sir deposu degil -- ama web
 * hedefinde daha iyi bir secenek de yok ve uygulamayi magazaya native
 * olarak gonderiyoruz; web yalnizca gelistirme ve dogrulama icin.
 */

const TOKEN_KEY = "conversa_auth_token";

/** localStorage gizli sekmede ya da site verileri kapaliyken atabilir. */
function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

const memory = new Map<string, string>();

export async function getToken(): Promise<string | null> {
  const s = storage();
  if (!s) return memory.get(TOKEN_KEY) ?? null;
  try {
    return s.getItem(TOKEN_KEY);
  } catch {
    return memory.get(TOKEN_KEY) ?? null;
  }
}

export async function setToken(token: string): Promise<void> {
  memory.set(TOKEN_KEY, token);
  const s = storage();
  if (!s) return;
  try {
    s.setItem(TOKEN_KEY, token);
  } catch {
    // Bellekteki kopya yeterli: oturum en azindan bu sekme boyunca yasar.
  }
}

export async function clearToken(): Promise<void> {
  memory.delete(TOKEN_KEY);
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(TOKEN_KEY);
  } catch {
    // yoksay
  }
}
