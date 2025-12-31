import React, {
    forwardRef,
    useImperativeHandle,
    useCallback,
    PropsWithRef,
} from 'react';
import Animated, {
    useSharedValue,
    withSpring,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    runOnJS,
    withTiming,
    Easing,
    useAnimatedReaction,
} from 'react-native-reanimated';
import {
    GestureDetector,
    Gesture,
} from 'react-native-gesture-handler';
import {
    resetPosition,
    updatePosition,
    snapPoint,
    windowWidth,
    windowHeight,
    userConfig,
} from './swipeUtils';
import OverlayLabel from './OverlayLabel';

export type SwipeableCardHandle = {
    swipeBack: () => void;
    swipeLeft: () => void;
    swipeRight: () => void;
    swipeTop: () => void;
    swipeBottom: () => void;
};

export type SwipeableCardOptions = PropsWithRef<{
    cardWidth?: number;
    cardHeight?: number;
    translateXRange?: number[];
    translateYRange?: number[];
    cardStyle?: any;
    scaleValue?: number;
    onSwipedLeft?: () => void;
    onSwipedRight?: () => void;
    onSwipedTop?: () => void;
    onSwipedBottom?: () => void;
    disableRightSwipe?: boolean;
    disableTopSwipe?: boolean;
    disableLeftSwipe?: boolean;
    disableBottomSwipe?: boolean;
    inputRotationRange?: number[];
    outputRotationRange?: number[];
    inputOverlayLabelRightOpacityRange?: number[];
    outputOverlayLabelRightOpacityRange?: number[];
    inputOverlayLabelLeftOpacityRange?: number[];
    outputOverlayLabelLeftOpacityRange?: number[];
    inputOverlayLabelTopOpacityRange?: number[];
    outputOverlayLabelTopOpacityRange?: number[];
    inputOverlayLabelBottomOpacityRange?: number[];
    outputOverlayLabelBottomOpacityRange?: number[];
    OverlayLabelRight?: () => React.ReactElement;
    OverlayLabelLeft?: () => React.ReactElement;
    OverlayLabelTop?: () => React.ReactElement;
    OverlayLabelBottom?: () => React.ReactElement;
    onTranslateXChange?: (translateX: ReturnType<typeof useSharedValue<number>>) => void;
    children?: React.ReactNode;
}>;

const SwipeableCard = forwardRef<SwipeableCardHandle, SwipeableCardOptions>(
    (
        {
            cardWidth = windowWidth,
            cardHeight = windowHeight,
            translateXRange = [-windowWidth / 2, 0, windowWidth / 2],
            translateYRange = [-windowHeight / 2, 0, windowHeight / 2],
            cardStyle = {},
            scaleValue = 1,
            onSwipedLeft = () => { },
            onSwipedRight = () => { },
            onSwipedTop = () => { },
            onSwipedBottom = () => { },
            disableRightSwipe = false,
            disableTopSwipe = false,
            disableLeftSwipe = false,
            disableBottomSwipe = false,
            inputRotationRange = [-windowWidth, 0, windowWidth],
            outputRotationRange = [-10, 0, 10],
            inputOverlayLabelRightOpacityRange = [0, windowWidth / 2],
            outputOverlayLabelRightOpacityRange = [0, 1],
            inputOverlayLabelLeftOpacityRange = [0, -windowWidth / 2],
            outputOverlayLabelLeftOpacityRange = [0, 1],
            inputOverlayLabelTopOpacityRange = [0, -windowHeight / 2],
            outputOverlayLabelTopOpacityRange = [0, 1],
            inputOverlayLabelBottomOpacityRange = [0, windowHeight / 2],
            outputOverlayLabelBottomOpacityRange = [0, 1],
            OverlayLabelRight,
            OverlayLabelLeft,
            OverlayLabelTop,
            OverlayLabelBottom,
            onTranslateXChange,
            children,
        },
        ref
    ) => {
        const translateX = useSharedValue(0);
        const translateY = useSharedValue(0);
        const scale = useSharedValue(1);

        useAnimatedReaction(
            () => translateX.value,
            (value) => {
                'worklet';
                if (onTranslateXChange) {
                    onTranslateXChange(translateX);
                }
            }
        );

        const startX = useSharedValue(0);
        const startY = useSharedValue(0);

        const panGesture = Gesture.Pan()
            .activeOffsetX([-10, 10]) // Only activate if moved horizontally significantly
            .failOffsetY([-5, 5])     // Fail IMMEDIATELY if moved vertically (lets ScrollView take over)
            .onStart(() => {
                'worklet';
                startX.value = translateX.value;
                // startY.value = translateY.value; // Disable vertical start tracking

                if (scaleValue !== 1)
                    scale.value = withTiming(Number(scaleValue), {
                        easing: Easing.inOut(Easing.ease),
                    });
            })
            .onUpdate((event) => {
                'worklet';
                translateX.value = event.translationX + startX.value;
                // translateY.value = event.translationY + startY.value; // Disable vertical movement
            })
            .onEnd((event) => {
                'worklet';
                const absTranslationX = Math.abs(event.translationX);
                // const absTranslationY = Math.abs(event.translationY);

                // Swipe için gereken minimum mesafe (%40)
                const swipeThresholdX = (cardWidth ?? windowWidth) * 0.4;

                // Hızlı swipe için velocity kontrolü
                const hasHighVelocityX = Math.abs(event.velocityX) > 1000;

                const isHorizontalSwipe = absTranslationX > swipeThresholdX || hasHighVelocityX;

                // Snap point hesapla
                // const destX = snapPoint(...) - removed unused calculation if logic is simplified

                // Yatay swipe (sağ/sol)
                if (isHorizontalSwipe) {
                    if (event.translationX > 0 && !disableRightSwipe) {
                        // Sağa swipe
                        translateX.value = withSpring(windowWidth + (cardWidth ?? windowWidth), {
                            velocity: event.velocityX,
                        });
                        onSwipedRight && runOnJS(onSwipedRight)();
                    } else if (event.translationX < 0 && !disableLeftSwipe) {
                        // Sola swipe
                        translateX.value = withSpring(-windowWidth - (cardWidth ?? windowWidth), {
                            velocity: event.velocityX,
                        });
                        onSwipedLeft && runOnJS(onSwipedLeft)();
                    } else {
                        // Disabled ise merkeze dön
                        resetPosition(translateX, translateY);
                    }
                }
                // Yeterli hareket yok, merkeze dön
                else {
                    resetPosition(translateX, translateY);
                }

                if (scaleValue !== 1)
                    scale.value = withTiming(1, {
                        easing: Easing.inOut(Easing.ease),
                    });
            });

        const animatedStyle = useAnimatedStyle(() => {
            const rotation = interpolate(
                translateX.value,
                inputRotationRange,
                outputRotationRange,
                {
                    extrapolateRight: Extrapolation.CLAMP,
                    extrapolateLeft: Extrapolation.CLAMP,
                }
            );

            return {
                transform: [
                    {
                        translateX: translateX.value,
                    },
                    {
                        translateY: translateY.value,
                    },
                    {
                        rotate: `${rotation}deg`,
                    },
                    {
                        scale: scale.value,
                    },
                ],
            };
        });

        const swipeBack = useCallback(() => {
            translateY.value = withSpring(0, userConfig);
            translateX.value = withSpring(0, userConfig);
        }, [translateY, translateX]);

        const swipeRight = useCallback(() => {
            translateY.value = withSpring(0, userConfig);
            translateX.value = withSpring(windowWidth + (cardWidth ?? windowWidth), userConfig);
            setTimeout(() => onSwipedRight && onSwipedRight(), 300);
        }, [translateY, translateX, cardWidth, onSwipedRight]);

        const swipeLeft = useCallback(() => {
            translateY.value = withSpring(0, userConfig);
            translateX.value = withSpring(-windowWidth - (cardWidth ?? windowWidth), userConfig);
            setTimeout(() => onSwipedLeft && onSwipedLeft(), 300);
        }, [translateY, translateX, cardWidth, onSwipedLeft]);

        const swipeTop = useCallback(() => {
            translateY.value = withSpring(-windowHeight, userConfig);
            setTimeout(() => onSwipedTop && onSwipedTop(), 300);
        }, [translateY, onSwipedTop]);

        const swipeBottom = useCallback(() => {
            translateY.value = withSpring(windowHeight, userConfig);
            setTimeout(() => onSwipedBottom && onSwipedBottom(), 300);
        }, [translateY, onSwipedBottom]);

        useImperativeHandle(ref, () => ({
            swipeBack: () => swipeBack(),
            swipeRight: () => swipeRight(),
            swipeLeft: () => swipeLeft(),
            swipeTop: () => swipeTop(),
            swipeBottom: () => swipeBottom(),
        }));

        return (
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[
                        cardStyle,
                        {
                            width: cardWidth,
                            height: cardHeight,
                        },
                        animatedStyle,
                    ]}
                >
                    {OverlayLabelLeft && (
                        <OverlayLabel
                            inputRange={inputOverlayLabelLeftOpacityRange}
                            outputRange={outputOverlayLabelLeftOpacityRange}
                            Component={OverlayLabelLeft}
                            opacityValue={translateX}
                        />
                    )}
                    {OverlayLabelRight && (
                        <OverlayLabel
                            inputRange={inputOverlayLabelRightOpacityRange}
                            outputRange={outputOverlayLabelRightOpacityRange}
                            Component={OverlayLabelRight}
                            opacityValue={translateX}
                        />
                    )}
                    {OverlayLabelTop && (
                        <OverlayLabel
                            inputRange={inputOverlayLabelTopOpacityRange}
                            outputRange={outputOverlayLabelTopOpacityRange}
                            Component={OverlayLabelTop}
                            opacityValue={translateY}
                        />
                    )}
                    {OverlayLabelBottom && (
                        <OverlayLabel
                            inputRange={inputOverlayLabelBottomOpacityRange}
                            outputRange={outputOverlayLabelBottomOpacityRange}
                            Component={OverlayLabelBottom}
                            opacityValue={translateY}
                        />
                    )}

                    {children}
                </Animated.View>
            </GestureDetector>
        );
    }
);

export default SwipeableCard;