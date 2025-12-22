// Lazy import to avoid errors in Expo Go
let SecureStore: any = null;

const TOKEN_KEY = "swiip_auth_token";

/**
 * Load SecureStore module (lazy)
 */
async function loadSecureStore() {
  if (SecureStore) {
    return SecureStore;
  }
  
  try {
    SecureStore = await import("expo-secure-store");
    return SecureStore;
  } catch (error) {
    console.warn("SecureStore not available, using in-memory fallback:", error);
    // In-memory fallback for Expo Go compatibility
    SecureStore = {
      _storage: new Map<string, string>(),
      getItemAsync: async (key: string) => {
        return SecureStore._storage.get(key) || null;
      },
      setItemAsync: async (key: string, value: string) => {
        SecureStore._storage.set(key, value);
      },
      deleteItemAsync: async (key: string) => {
        SecureStore._storage.delete(key);
      },
    };
    return SecureStore;
  }
}

/**
 * Get token from SecureStore (with fallback)
 */
export async function getToken(): Promise<string | null> {
  try {
    const store = await loadSecureStore();
    if (store.getItemAsync) {
      return await store.getItemAsync(TOKEN_KEY);
    }
    return null;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
}

/**
 * Set token in SecureStore (with fallback)
 */
export async function setToken(token: string): Promise<void> {
  try {
    const store = await loadSecureStore();
    if (store.setItemAsync) {
      await store.setItemAsync(TOKEN_KEY, token);
      return;
    }
    throw new Error("SecureStore not available");
  } catch (error) {
    console.error("Error setting token:", error);
    throw new Error("Failed to store token");
  }
}

/**
 * Clear token from SecureStore (with fallback)
 */
export async function clearToken(): Promise<void> {
  try {
    const store = await loadSecureStore();
    if (store.deleteItemAsync) {
      await store.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error clearing token:", error);
  }
}

