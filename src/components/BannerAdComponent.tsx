/**
 * Banner Ad Component using AdMob
 * 
 * Displays a banner ad at the bottom of screens.
 * Auto-hides for premium users.
 * IMPORTANT: AdMob only works in EAS dev builds, not in Expo Go.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePremium } from '@/src/state/premium';
import { canServePersonalizedAds } from '@/src/services/rewardedAds';
import { loadAdMob } from '@/src/services/admob';

// Must clear the floating tab bar so the banner is not hidden behind it.
import { tabBarClearance } from '@/src/config/layout';

// Lazy import for AdMob banner
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

/**
 * Load AdMob banner module
 */
async function loadBannerModule(): Promise<boolean> {
    if (BannerAd) return true;

    try {
        // Dogrudan import ETMIYORUZ: Metro dinamik importlari da statik
        // olarak izler ve native-only modulu web paketine sokar, bu da
        // butun uygulamanin derlenmemesine yol acar. Platform uzantili
        // sarmalayici cozumleme zamaninda ayrisiyor.
        const admobModule = await loadAdMob();
        if (!admobModule) return false;
        BannerAd = admobModule.BannerAd;
        BannerAdSize = admobModule.BannerAdSize;
        TestIds = admobModule.TestIds;
        return true;
    } catch (error) {
        console.warn('Banner ad module not available:', error);
        return false;
    }
}

/**
 * Check if running in Expo Go
 */
function isExpoGo(): boolean {
    try {
        if (Constants.executionEnvironment === 'storeClient') return true;
        if (Constants.appOwnership === 'expo') return true;
        return false;
    } catch {
        return true;
    }
}

/**
 * Get banner ad unit ID
 */
function getBannerAdUnitId(): string {
    if (__DEV__) {
        return TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111';
    }
    if (Platform.OS === 'ios') {
        return Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID ||
            process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID ||
            'ca-app-pub-2953141598487358/2026927291'; // Production iOS banner
    }
    return Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID ||
        process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID ||
        'ca-app-pub-2953141598487358/9667478087'; // Production banner
}

interface BannerAdComponentProps {
    style?: object;
}

export function BannerAdComponent({ style }: BannerAdComponentProps) {
    const { premiumEnabled, isLoading: isPremiumLoading } = usePremium();
    const insets = useSafeAreaInsets();
    const [isLoaded, setIsLoaded] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);

    useEffect(() => {
        if (isPremiumLoading || premiumEnabled || isExpoGo()) {
            setIsAvailable(false);
            return;
        }

        loadBannerModule().then((loaded) => {
            setIsLoaded(loaded);
            setIsAvailable(loaded);
        });
    }, [premiumEnabled, isPremiumLoading]);

    // Don't render while premium status is loading, for premium users, or in Expo Go
    if (isPremiumLoading || premiumEnabled || !isAvailable || !isLoaded || !BannerAd) {
        return null;
    }

    const adUnitId = getBannerAdUnitId();

    // Lift above the floating tab bar so the ad is fully visible (not hidden behind it).
    const bottomOffset = tabBarClearance(insets.bottom);

    return (
        <View style={[styles.container, style, { marginBottom: bottomOffset }]}>
            <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: !canServePersonalizedAds(),
                }}
                onAdLoaded={() => {
                    console.log('Banner ad loaded');
                }}
                onAdFailedToLoad={(error: any) => {
                    console.warn('Banner ad failed to load:', error);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
});
