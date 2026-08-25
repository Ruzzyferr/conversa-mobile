import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, AccessibilityInfo } from 'react-native';
import { colors } from '@/src/theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Ambient background for the auth screens.
 *
 * Three things this component used to get wrong, all of them visible in a
 * release build:
 *
 * 1. The animation loop outlived the screen. `timing(...).start(cb)` calls cb
 *    with {finished:false} when it is stopped, and cb recursed unconditionally
 *    — so the unmount cleanup *restarted* the loop instead of ending it. Four
 *    auth screens x 50 drops meant ~200 animation loops still ticking for the
 *    rest of the session. `running` now gates the recursion, and the pending
 *    start timers are cleared.
 * 2. Every drop carried `elevation: 8`, which asks Android for a real shadow
 *    layer per view. Fifty of them is a lot of compositing for decoration; the
 *    glow now comes from colour alone.
 * 3. The streaks were `accent` (#FF5B84) at up to 0.6 opacity — a hot pink
 *    against a purple brand, bright enough to read as lines struck through the
 *    headline rather than as depth behind it. They now use the brand's light
 *    indigo, dimmer, so they sit behind the content.
 */
const DROP_COUNT = 28;

interface RainDrop {
    id: number;
    x: number;
    speed: number;
    length: number;
    opacity: number;
    delay: number;
    animatedValue: Animated.Value;
}

const createRainDrops = (count: number): RainDrop[] =>
    Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        speed: 2600 + Math.random() * 3400,
        length: 60 + Math.random() * 110,
        opacity: 0.08 + Math.random() * 0.14,
        delay: Math.random() * 2600,
        animatedValue: new Animated.Value(0),
    }));

export const RainBackground: React.FC = () => {
    const rainDrops = useMemo(() => createRainDrops(DROP_COUNT), []);
    const runningRef = useRef(true);

    useEffect(() => {
        runningRef.current = true;
        const timers: ReturnType<typeof setTimeout>[] = [];

        // Someone who has asked the OS to reduce motion should not get a
        // screenful of moving lines; the drops stay put as a static texture.
        let cancelled = false;
        AccessibilityInfo.isReduceMotionEnabled()
            .then((reduceMotion) => {
                if (cancelled || reduceMotion) return;
                rainDrops.forEach((drop) => {
                    const animate = () => {
                        if (!runningRef.current) return;
                        drop.animatedValue.setValue(0);
                        Animated.timing(drop.animatedValue, {
                            toValue: 1,
                            duration: drop.speed,
                            useNativeDriver: true,
                        }).start(({ finished }) => {
                            if (finished) animate();
                        });
                    };
                    timers.push(setTimeout(animate, drop.delay));
                });
            })
            .catch(() => {
                /* reduce-motion is unknowable here; leave the drops static. */
            });

        return () => {
            cancelled = true;
            runningRef.current = false;
            timers.forEach(clearTimeout);
            rainDrops.forEach((drop) => drop.animatedValue.stopAnimation());
        };
    }, [rainDrops]);

    return (
        <View style={styles.container} pointerEvents="none">
            {rainDrops.map((drop) => {
                const translateY = drop.animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-drop.length - 100, SCREEN_HEIGHT + 100],
                });

                return (
                    <Animated.View
                        key={drop.id}
                        style={[
                            styles.rainDrop,
                            {
                                left: drop.x,
                                height: drop.length,
                                opacity: drop.opacity,
                                transform: [{ translateY }],
                            },
                        ]}
                    />
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.backgroundDark,
        overflow: 'hidden',
    },
    rainDrop: {
        position: 'absolute',
        top: 0,
        width: 1.5,
        backgroundColor: colors.primaryLight,
        borderRadius: 0.75,
    },
});
