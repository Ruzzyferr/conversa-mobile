import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/src/services/api";
import { initPurchases, getCustomerInfo, isPremiumFromCustomerInfo } from "@/src/services/purchases";
import { getToken } from "@/src/services/authStore";
// import { configureNotifications, registerPushToken } from "@/src/services/pushNotifications";

interface PremiumContextType {
  premiumEnabled: boolean;
  isLoading: boolean;
  refreshPremiumStatus: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPremiumStatus = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) {
        setPremiumEnabled(false);
        setIsLoading(false);
        return;
      }

      // Get user info from backend
      let me;
      try {
        me = await api.getMe();
      } catch (error: any) {
        console.error("Failed to get user info:", error?.message || error);
        // If we can't get user info, we can't determine premium status
        setPremiumEnabled(false);
        setIsLoading(false);
        return;
      }

      const userId = me.user.id;

      // Initialize RevenueCat with user ID (for purchase flow only)
      try {
        await initPurchases(userId);
      } catch (error) {
        console.warn("RevenueCat initialization failed:", error);
      }

      // Get premium status from server (server is source of truth)
      // Use /billing/status for detailed info, or fallback to /auth/me
      let serverPremium = false;
      try {
        const billingStatus = await api.getBillingStatus();
        serverPremium = billingStatus.isPremium;
      } catch (error: any) {
        // Fallback to /auth/me if billing endpoint fails
        // This can happen if backend is not fully configured or network issue
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes("Network Error") || errorMsg.includes("timeout")) {
          console.warn("Network error getting billing status, using /auth/me fallback");
        } else {
          console.warn("Failed to get billing status, using /auth/me:", errorMsg);
        }
        serverPremium = me.user.isPremium || false;
      }

      // RevenueCat status is only for UI hints, not for server gating
      // The server will be updated via webhooks when purchase completes
      setPremiumEnabled(serverPremium);

      // Optionally log RevenueCat customerInfo for debugging (doesn't update server)
      try {
        const customerInfo = await getCustomerInfo();
        const rcPremium = isPremiumFromCustomerInfo(customerInfo);
        
        // Log discrepancy for debugging (webhook should fix it)
        if (rcPremium !== serverPremium) {
          console.warn(
            `Premium status mismatch: RevenueCat=${rcPremium}, Server=${serverPremium}. Webhook should sync.`
          );
          // Optionally send customerInfo for debugging (doesn't update premium)
          try {
            await api.syncBilling({ customerInfo });
          } catch (syncError) {
            // Ignore sync errors - it's just for debugging
            console.warn("Failed to sync billing info:", syncError);
          }
        }
      } catch (error) {
        // RevenueCat check failed, but we still have server status
        console.warn("Failed to get RevenueCat customer info:", error);
      }
    } catch (error: any) {
      // Catch-all for any unexpected errors
      const errorMsg = error?.message || String(error);
      console.error("Failed to refresh premium status:", errorMsg);
      // Fallback to false - don't crash the app
      setPremiumEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh on mount and register push token
  useEffect(() => {
    const initialize = async () => {
      // Push notifications disabled - Firebase credentials not configured
      // await configureNotifications();
      await refreshPremiumStatus();
      
      // Register push token after auth is confirmed
      // const token = await getToken();
      // if (token) {
      //   await registerPushToken();
      // }
    };
    
    initialize();
  }, []);

  return (
    <PremiumContext.Provider
      value={{
        premiumEnabled,
        isLoading,
        refreshPremiumStatus,
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

