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
import { usePremium } from '@/src/state/premium';

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
        const admobModule = await import('react-native-google-mobile-ads');
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
    return Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID ||
        process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID ||
        'ca-app-pub-3940256099942544/6300978111'; // Fallback to test
}

interface BannerAdComponentProps {
    style?: object;
}

export function BannerAdComponent({ style }: BannerAdComponentProps) {
    const { premiumEnabled } = usePremium();
    const [isLoaded, setIsLoaded] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);

    useEffect(() => {
        if (premiumEnabled || isExpoGo()) {
            setIsAvailable(false);
            return;
        }

        loadBannerModule().then((loaded) => {
            setIsLoaded(loaded);
            setIsAvailable(loaded);
        });
    }, [premiumEnabled]);

    // Don't render for premium users or in Expo Go
    if (premiumEnabled || !isAvailable || !isLoaded || !BannerAd) {
        return null;
    }

    const adUnitId = getBannerAdUnitId();

    return (
        <View style={[styles.container, style]}>
            <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
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
