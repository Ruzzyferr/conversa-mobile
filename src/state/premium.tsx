import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { AppState } from "react-native";
import type { CustomerInfo } from "react-native-purchases";
import { api } from "@/src/services/api";
import {
  initPurchases,
  getCustomerInfo,
  isPremiumFromCustomerInfo,
  onCustomerInfoUpdate,
  getPurchasesUserId,
} from "@/src/services/purchases";
import { getToken } from "@/src/services/authStore";
import { onTokenChange } from "@/src/services/tokenEvents";

interface PremiumContextType {
  premiumEnabled: boolean;
  isLoading: boolean;
  refreshPremiumStatus: () => Promise<void>;
  /**
   * Apply the result of a completed purchase or restore right away, then
   * confirm with the server. Returns the premium state that was applied.
   */
  applyPurchaseResult: (customerInfo: CustomerInfo) => Promise<boolean>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

/**
 * After the store confirms a purchase, the server may not know yet (the
 * webhook and RevenueCat's REST view can lag by seconds). During this window
 * a server "not premium" does not downgrade the UI while RevenueCat itself
 * still reports the entitlement active.
 */
const PURCHASE_GRACE_MS = 5 * 60 * 1000;
/** Do not hammer the API when the app flips foreground/background quickly. */
const FOREGROUND_MIN_INTERVAL_MS = 30 * 1000;

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Every refresh/purchase takes a ticket; only the newest one may write the
  // state. A slow /billing/status read started before a purchase used to
  // land after it and flip the user back to free until restart.
  const seqRef = useRef(0);
  const graceUntilRef = useRef(0);
  const lastRefreshRef = useRef(0);
  const premiumRef = useRef(premiumEnabled);
  premiumRef.current = premiumEnabled;
  /** Mirrors whether a session token exists (kept current by onTokenChange). */
  const hasTokenRef = useRef(true);

  const refreshPremiumStatus = useCallback(async () => {
    const seq = ++seqRef.current;
    const isCurrent = () => seq === seqRef.current;
    lastRefreshRef.current = Date.now();
    try {
      // `isLoading` starts true and only covers the first load: toggling it
      // on every foreground refresh made banner ads blink in and out.
      const token = await getToken();
      if (!token) {
        hasTokenRef.current = false;
        if (isCurrent()) setPremiumEnabled(false);
        return;
      }

      let me;
      try {
        me = await api.getMe();
      } catch (error: any) {
        console.error("Failed to get user info:", error?.message || error);
        // Keep the last known state: a network blip must not hide paid perks.
        return;
      }

      // Signed out (or switched account) while /auth/me was in flight: do not
      // log RevenueCat back in as the previous user.
      if (!isCurrent() || !hasTokenRef.current) return;

      // RevenueCat is logged in as THIS user (switches account if needed).
      try {
        await initPurchases(me.user.id);
      } catch (error) {
        console.warn("RevenueCat initialization failed:", error);
      }

      // Server is the source of truth for gating.
      let serverPremium = me.user.isPremium || false;
      try {
        const billingStatus = await api.getBillingStatus();
        serverPremium = billingStatus.isPremium;
      } catch (error: any) {
        console.warn("Failed to get billing status, using /auth/me:", error?.message || String(error));
      }

      let finalPremium = serverPremium;
      try {
        const customerInfo = await getCustomerInfo(me.user.id);
        const rcPremium = isPremiumFromCustomerInfo(customerInfo);
        if (rcPremium !== serverPremium) {
          // Ask the server to reconcile against RevenueCat (server-to-server)
          // and take ITS answer: that covers a missed webhook (purchase or
          // renewal) as well as an expiry/refund the webhook has not
          // delivered yet.
          try {
            const synced = await api.syncBilling({ customerInfo });
            finalPremium = synced.isPremium;
          } catch (syncError) {
            console.warn("Failed to sync billing info:", syncError);
          }
          if (!finalPremium && rcPremium && Date.now() < graceUntilRef.current) {
            finalPremium = true;
          }
        }
      } catch (error) {
        // RevenueCat unavailable (web, no billing): server status stands.
        if (__DEV__) console.warn("Failed to get RevenueCat customer info:", error);
      }

      if (isCurrent()) setPremiumEnabled(finalPremium);
    } catch (error: any) {
      console.error("Failed to refresh premium status:", error?.message || String(error));
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, []);

  const applyPurchaseResult = useCallback(async (customerInfo: CustomerInfo) => {
    const rcPremium = isPremiumFromCustomerInfo(customerInfo);
    // Invalidate any refresh that started before the purchase finished.
    const seq = ++seqRef.current;
    if (rcPremium) {
      graceUntilRef.current = Date.now() + PURCHASE_GRACE_MS;
      setPremiumEnabled(true);
      setIsLoading(false);
    }

    let applied = rcPremium;
    try {
      const synced = await api.syncBilling({ customerInfo });
      // The server confirming premium always wins; a server "no" only wins
      // when the store also says no (the grace window covers webhook lag).
      applied = synced.isPremium || rcPremium;
    } catch (error) {
      console.warn("Billing sync after purchase failed:", error);
    }
    if (seq === seqRef.current) {
      setPremiumEnabled(applied);
      setIsLoading(false);
    }
    return applied;
  }, []);

  // Initial load.
  useEffect(() => {
    refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  // Login / logout (including the automatic logout on an expired session):
  // never carry the previous account's premium into the next one.
  useEffect(() => {
    return onTokenChange((token) => {
      if (!token) {
        hasTokenRef.current = false;
        seqRef.current++;
        graceUntilRef.current = 0;
        setPremiumEnabled(false);
        setIsLoading(false);
        return;
      }
      hasTokenRef.current = true;
      // Hide ads until the new account's premium state is known: without this
      // a premium user saw banner ads for the seconds the refresh took.
      setPremiumEnabled(false);
      setIsLoading(true);
      refreshPremiumStatus();
    });
  }, [refreshPremiumStatus]);

  // Expiry, renewal and refunds happen while the app is closed: re-check
  // when it comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (!hasTokenRef.current) return;
      if (Date.now() - lastRefreshRef.current < FOREGROUND_MIN_INTERVAL_MS) return;
      refreshPremiumStatus();
    });
    return () => sub.remove();
  }, [refreshPremiumStatus]);

  // RevenueCat pushes customer info changes (renewal, expiry, a purchase
  // finishing in the background). Re-check through the server, which
  // reconciles against RevenueCat itself.
  useEffect(() => {
    return onCustomerInfoUpdate((info) => {
      // Purchases.logOut() fires this listener with the anonymous user's info:
      // refreshing then would log RevenueCat back in as the old account.
      if (!hasTokenRef.current || getPurchasesUserId() === null) return;
      const rcPremium = isPremiumFromCustomerInfo(info);
      if (rcPremium === premiumRef.current) return;
      refreshPremiumStatus();
    });
  }, [refreshPremiumStatus]);

  return (
    <PremiumContext.Provider
      value={{
        premiumEnabled,
        isLoading,
        refreshPremiumStatus,
        applyPurchaseResult,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextType {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
}

/**
 * Poll a counter until it rises above `before` (store purchases of consumable
 * packs are credited by the RevenueCat webhook, which can lag a few seconds).
 * Returns the new value, or null if it did not rise within the attempts.
 */
export async function waitForCountIncrease(
  read: () => Promise<number | null | undefined>,
  before: number,
  attempts = 5,
  intervalMs = 1000
): Promise<number | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const value = await read();
      if (typeof value === "number" && value > before) return value;
    } catch {
      // keep polling
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return null;
}

export type PackKind = "boost" | "favorite";

/** Purchased (pack) balance from the server, or null when it cannot be read. */
export async function readPackBalance(kind: PackKind): Promise<number | null> {
  try {
    const status = await api.getBillingStatus();
    const n = kind === "boost" ? status.purchasedBoosts : status.purchasedFavorites;
    return typeof n === "number" ? n : null;
  } catch {
    return null;
  }
}

/** Everything usable right now (weekly premium allowance + packs), or null. */
async function readUsableTotal(kind: PackKind): Promise<number | null> {
  try {
    if (kind === "boost") {
      const status = await api.getBoostStatus();
      return typeof status.boostsRemaining === "number" ? status.boostsRemaining : null;
    }
    const usage = await api.getUsage();
    const n = usage.usage?.favoritesRemaining;
    return typeof n === "number" ? n : null;
  } catch {
    return null;
  }
}

/**
 * After the store charged for a pack: the server reconciles with RevenueCat
 * and waits up to ~5s for the credit (`purchase-boost`), then we poll the
 * purchased balance a few more times. Returns the new usable balance, or
 * null if the credit has not shown up yet (callers then say it will appear
 * shortly; they must NEVER report a failed purchase here, the user has paid).
 * Never throws.
 */
export async function confirmPackCredit(
  kind: PackKind,
  before: number | null,
  transactionId: string | null = null
): Promise<number | null> {
  let credited = false;
  let after: number | null = null;
  try {
    const res = await api.purchaseBoost({
      ...(transactionId ? { transactionId } : {}),
      ...(kind === "boost" && before !== null ? { previousCount: before } : {}),
    });
    const n = kind === "boost" ? res.purchasedBoosts : res.purchasedFavorites;
    after = typeof n === "number" ? n : null;
    credited =
      res.credited === true ||
      (before !== null && after !== null && after > before);
  } catch {
    // never surfaces after payment
  }

  if (!credited && before !== null) {
    credited = (await waitForCountIncrease(() => readPackBalance(kind), before)) !== null;
  }
  if (!credited) return null;

  // Refresh premium-independent caches and show the real usable count.
  api.syncBilling().catch(() => undefined);
  return (await readUsableTotal(kind)) ?? after;
}
