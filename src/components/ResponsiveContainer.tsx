import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useDeviceType } from '../hooks/useDeviceType';
import { colors } from '../theme/colors';

interface ResponsiveContainerProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    maxWidth?: number;
    fullHeight?: boolean;
    centerContent?: boolean;
    backgroundColor?: string;
}

/**
 * Container that centers content on tablets while filling width on phones.
 * Provides a consistent max-width experience across device sizes.
 */
export function ResponsiveContainer({
    children,
    style,
    maxWidth = 550,
    fullHeight = true,
    centerContent = true,
    backgroundColor = colors.backgroundDark,
}: ResponsiveContainerProps) {
    const { isTablet, screenWidth } = useDeviceType();

    return (
        <View style={[
            styles.outerContainer,
            fullHeight && styles.fullHeight,
            { backgroundColor },
        ]}>
            <View style={[
                styles.innerContainer,
                isTablet && centerContent && {
                    maxWidth,
                    width: '100%',
                    alignSelf: 'center',
                },
                fullHeight && styles.fullHeight,
                style,
            ]}>
                {children}
            </View>
        </View>
    );
}

/**
 * Wrapper that only affects tablets - leaves phones unchanged.
 * Use this for screens that already have their own container.
 */
export function TabletWrapper({
    children,
    maxWidth = 550,
    style,
}: {
    children: React.ReactNode;
    maxWidth?: number;
    style?: StyleProp<ViewStyle>;
}) {
    const { isTablet } = useDeviceType();

    if (!isTablet) {
        return <>{children}</>;
    }

    return (
        <View style={[
            styles.tabletWrapper,
            { maxWidth },
            style,
        ]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    innerContainer: {
        width: '100%',
    },
    fullHeight: {
        flex: 1,
    },
    tabletWrapper: {
        width: '100%',
        alignSelf: 'center',
    },
});
