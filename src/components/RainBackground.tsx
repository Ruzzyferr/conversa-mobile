import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '@/src/theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RainDrop {
    id: number;
    x: number;
    speed: number;
    length: number;
    opacity: number;
    delay: number;
    animatedValue: Animated.Value;
}

const createRainDrops = (count: number): RainDrop[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        speed: 2000 + Math.random() * 3000, // 2-5 seconds
        length: 60 + Math.random() * 100, // 60-160px - daha uzun
        opacity: 0.25 + Math.random() * 0.35, // 0.25-0.6 - daha görünür
        delay: Math.random() * 2000,
        animatedValue: new Animated.Value(0),
    }));
};

export const RainBackground: React.FC = () => {
    const [rainDrops] = useState<RainDrop[]>(() => createRainDrops(50));

    useEffect(() => {
        const animations = rainDrops.map((drop) => {
            const animate = () => {
                drop.animatedValue.setValue(0);
                Animated.timing(drop.animatedValue, {
                    toValue: 1,
                    duration: drop.speed,
                    useNativeDriver: true,
                }).start(() => animate());
            };

            setTimeout(() => animate(), drop.delay);

            return drop.animatedValue;
        });

        return () => {
            animations.forEach((anim) => anim.stopAnimation());
        };
    }, []);

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
        width: 2.5, // Daha kalın
        backgroundColor: colors.accent,
        borderRadius: 1.25,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8, // Daha parlak glow
        shadowRadius: 4,
        elevation: 8,
    },
});