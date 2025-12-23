import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { typography } from '@/src/theme/typography';

interface AnimatedStepIndicatorProps {
    currentStep: number;
    totalSteps: number;
}

export const AnimatedStepIndicator: React.FC<AnimatedStepIndicatorProps> = ({
                                                                                currentStep,
                                                                                totalSteps,
                                                                            }) => {
    const ballAnimations = useRef(
        Array.from({ length: totalSteps }, () => ({
            scale: new Animated.Value(0.8),
            opacity: new Animated.Value(0.3),
            glow: new Animated.Value(0),
        }))
    ).current;

    const progressAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Animate progress line
        Animated.spring(progressAnimation, {
            toValue: currentStep - 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
        }).start();

        // Animate balls
        ballAnimations.forEach((anim, index) => {
            if (index < currentStep - 1) {
                // Completed steps
                Animated.parallel([
                    Animated.spring(anim.scale, {
                        toValue: 1,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.opacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.glow, {
                        toValue: 0.4,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start();
            } else if (index === currentStep - 1) {
                // Current step - pulsing animation
                Animated.parallel([
                    Animated.spring(anim.scale, {
                        toValue: 1.1,
                        tension: 40,
                        friction: 6,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.opacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.loop(
                        Animated.sequence([
                            Animated.timing(anim.glow, {
                                toValue: 1,
                                duration: 1000,
                                useNativeDriver: true,
                            }),
                            Animated.timing(anim.glow, {
                                toValue: 0.5,
                                duration: 1000,
                                useNativeDriver: true,
                            }),
                        ])
                    ),
                ]).start();
            } else {
                // Future steps
                Animated.parallel([
                    Animated.spring(anim.scale, {
                        toValue: 0.8,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.opacity, {
                        toValue: 0.3,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.glow, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        });
    }, [currentStep]);

    const progressWidth = progressAnimation.interpolate({
        inputRange: [0, totalSteps - 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.label}>
                    Adım {currentStep}/{totalSteps}
                </Text>
                <Text style={styles.percent}>
                    {Math.round((currentStep / totalSteps) * 100)}%
                </Text>
            </View>

            <View style={styles.indicatorContainer}>
                {/* Step balls */}
                <View style={styles.ballsContainer}>
                    {Array.from({ length: totalSteps }).map((_, index) => {
                        const anim = ballAnimations[index];
                        const stepNumber = index + 1;
                        const isCompleted = stepNumber < currentStep;
                        const isCurrent = stepNumber === currentStep;

                        const glowOpacity = anim.glow.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.6],
                        });

                        return (
                            <View key={index} style={styles.ballWrapper}>
                                {/* Glow effect */}
                                <Animated.View
                                    style={[
                                        styles.glowOuter,
                                        {
                                            opacity: glowOpacity,
                                            transform: [{ scale: anim.scale }],
                                        },
                                    ]}
                                />

                                {/* Glass ball */}
                                <Animated.View
                                    style={[
                                        styles.ball,
                                        {
                                            opacity: anim.opacity,
                                            transform: [{ scale: anim.scale }],
                                        },
                                    ]}
                                >
                                    {/* Glass inner reflection */}
                                    <View style={styles.glassInner} />

                                    {/* Step number or checkmark */}
                                    <View style={styles.ballContent}>
                                        {isCompleted ? (
                                            <Text style={styles.checkmark}>✓</Text>
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.stepNumber,
                                                    isCurrent && styles.stepNumberActive,
                                                ]}
                                            >
                                                {stepNumber}
                                            </Text>
                                        )}
                                    </View>
                                </Animated.View>
                            </View>
                        );
                    })}
                </View>

                {/* Background line */}
                <View style={styles.lineBackground} />

                {/* Animated progress line */}
                <Animated.View
                    style={[
                        styles.lineProgress,
                        {
                            width: progressWidth,
                        },
                    ]}
                />
            </View>
        </View>
    );
};

const BALL_SIZE = 44;
const GLOW_SIZE = 70;

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textDark,
        letterSpacing: 0.5,
    },
    percent: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
        color: colors.accent,
    },
    indicatorContainer: {
        position: 'relative',
        height: BALL_SIZE + 4,
        justifyContent: 'center',
    },
    lineBackground: {
        position: 'absolute',
        left: BALL_SIZE / 2,
        right: BALL_SIZE / 2,
        height: 2.5,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 1.25,
        zIndex: 0,
    },
    lineProgress: {
        position: 'absolute',
        left: BALL_SIZE / 2,
        height: 2.5,
        backgroundColor: colors.accent,
        borderRadius: 1.25,
        zIndex: 1,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
    },
    ballsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 2,
    },
    ballWrapper: {
        width: BALL_SIZE,
        height: BALL_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowOuter: {
        position: 'absolute',
        width: GLOW_SIZE,
        height: GLOW_SIZE,
        borderRadius: GLOW_SIZE / 2,
        backgroundColor: colors.accent,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
    },
    ball: {
        width: BALL_SIZE,
        height: BALL_SIZE,
        borderRadius: BALL_SIZE / 2,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    glassInner: {
        position: 'absolute',
        top: -BALL_SIZE * 0.15,
        left: -BALL_SIZE * 0.05,
        width: BALL_SIZE * 0.5,
        height: BALL_SIZE * 0.5,
        borderRadius: (BALL_SIZE * 0.5) / 2,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        transform: [{ rotate: '-45deg' }],
    },
    ballContent: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    stepNumber: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
        color: 'rgba(255, 255, 255, 0.4)',
        fontFamily: 'monospace',
    },
    stepNumberActive: {
        color: colors.accent,
        fontSize: typography.fontSize.base,
    },
    checkmark: {
        fontSize: typography.fontSize.base,
        color: colors.accent,
        fontWeight: typography.fontWeight.bold,
    },
});