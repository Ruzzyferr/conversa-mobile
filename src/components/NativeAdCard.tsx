/**
 * Native Ad Card Component
 * 
 * A styled ad card that fits in with the discovery feed.
 * Shows a placeholder ad card for non-premium users.
 * IMPORTANT: AdMob only works in EAS dev builds, not in Expo Go.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import { usePremium } from '@/src/state/premium';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 2;

interface NativeAdCardProps {
    style?: object;
}

// Placeholder ad card for when native ads aren't available
function PlaceholderAdCard({ style }: NativeAdCardProps) {
    return (
        <View style={[styles.container, style]}>
            <LinearGradient
                colors={[colors.primary + '30', colors.backgroundSecondaryDark]}
                style={styles.gradient}
            >
                <View style={styles.adBadge}>
                    <Text style={styles.adBadgeText}>AD</Text>
                </View>
                <View style={styles.content}>
                    <View style={styles.iconPlaceholder}>
                        <Text style={styles.iconEmoji}>📢</Text>
                    </View>
                    <Text style={styles.headline}>Sponsored Content</Text>
                    <Text style={styles.body}>Discover new experiences</Text>
                    <View style={styles.ctaButton}>
                        <Text style={styles.ctaText}>Learn More</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

export function NativeAdCard({ style }: NativeAdCardProps) {
    const { premiumEnabled } = usePremium();

    // Don't render for premium users
    if (premiumEnabled) {
        return null;
    }

    // Use placeholder for all cases
    // Note: react-native-google-mobile-ads doesn't export NativeAdView components
    // Native ads require custom native module setup which is complex
    // Using styled placeholder that fits the feed design
    return <PlaceholderAdCard style={style} />;
}

const styles = StyleSheet.create({
    container: {
        width: CARD_WIDTH,
        minHeight: 200,
        borderRadius: 24,
        overflow: 'hidden',
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderDark,
    },
    gradient: {
        flex: 1,
        padding: spacing.lg,
    },
    adBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: colors.primary + '40',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    adBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.primary,
        letterSpacing: 1,
    },
    content: {
        alignItems: 'center',
        paddingTop: spacing.lg,
    },
    icon: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginBottom: spacing.md,
    },
    iconPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    iconEmoji: {
        fontSize: 28,
    },
    headline: {
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
        color: colors.textDark,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    body: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondaryDark,
        textAlign: 'center',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
    },
    media: {
        width: '100%',
        height: 150,
        borderRadius: 12,
        marginBottom: spacing.md,
    },
    ctaButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    ctaText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: typography.fontSize.sm,
    },
});
