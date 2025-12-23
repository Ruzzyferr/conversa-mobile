import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import SwipeableCard from "./SwipeableCard";
import { windowWidth } from "./swipeUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;

// Separate component for each card to avoid closure issues in useAnimatedStyle
type StackCardProps<T> = {
  item: T;
  index: number;
  isFirst: boolean;
  stackDepth: number;
  topCardTranslateX: ReturnType<typeof useSharedValue<number>>;
  renderCard: (item: T, isFirst: boolean) => React.ReactNode;
  onSwipeLeft: (item: T) => void;
  onSwipeRight: (item: T) => void;
  OverlayLabelRight?: () => React.ReactElement;
  OverlayLabelLeft?: () => React.ReactElement;
  onTranslateXChange?: (translateX: ReturnType<typeof useSharedValue<number>>) => void;
};

function StackCard<T extends { userId?: string }>({
  item,
  index,
  isFirst,
  stackDepth,
  topCardTranslateX,
  renderCard,
  onSwipeLeft,
  onSwipeRight,
  OverlayLabelRight,
  OverlayLabelLeft,
  onTranslateXChange,
}: StackCardProps<T>) {
  // Calculate static values outside worklet
  const baseScale = 1 - stackDepth * 0.04;
  const baseTranslateY = stackDepth * 12;
  const baseOpacity = Math.max(0.9, 1.0 - stackDepth * 0.03);

  // Animated style for cards behind the top card
  const animatedStackStyle = useAnimatedStyle(() => {
    'worklet';
    if (isFirst) {
      return {};
    }
    
    // Cards behind should scale up slightly when top card is swiped
    const scaleMultiplier = interpolate(
      Math.abs(topCardTranslateX.value),
      [0, windowWidth / 2],
      [1, 1.02],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { scale: baseScale * scaleMultiplier },
        { translateY: baseTranslateY },
      ],
      opacity: baseOpacity,
    };
  });

  const cardStyle = isFirst
    ? {
        zIndex: 10 - index,
      }
    : {
        zIndex: 10 - index - 1,
      };

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        cardStyle,
        animatedStackStyle,
      ]}
      pointerEvents={isFirst ? "auto" : "none"}
    >
      <SwipeableCard
        cardWidth={CARD_WIDTH}
        cardHeight={650}
        translateXRange={[-windowWidth / 2, 0, windowWidth / 2]}
        inputRotationRange={[-windowWidth, 0, windowWidth]}
        outputRotationRange={[-10, 0, 10]}
        inputOverlayLabelRightOpacityRange={[0, windowWidth / 2]}
        outputOverlayLabelRightOpacityRange={[0, 1]}
        inputOverlayLabelLeftOpacityRange={[0, -windowWidth / 2]}
        outputOverlayLabelLeftOpacityRange={[0, 1]}
        OverlayLabelRight={OverlayLabelRight}
        OverlayLabelLeft={OverlayLabelLeft}
        onSwipedRight={() => onSwipeRight(item)}
        onSwipedLeft={() => onSwipeLeft(item)}
        onTranslateXChange={onTranslateXChange}
        cardStyle={styles.card}
      >
        {renderCard(item, isFirst)}
      </SwipeableCard>
    </Animated.View>
  );
}

type SwipeDeckProps<T> = {
  items: T[];
  renderCard: (item: T, isFirst: boolean) => React.ReactNode;
  onSwipeLeft: (item: T) => void;
  onSwipeRight: (item: T) => void;
  OverlayLabelRight?: () => React.ReactElement;
  OverlayLabelLeft?: () => React.ReactElement;
};

export function SwipeDeck<T extends { userId?: string }>({
  items,
  renderCard,
  onSwipeLeft,
  onSwipeRight,
  OverlayLabelRight,
  OverlayLabelLeft,
}: SwipeDeckProps<T>) {
  // Get the first 3 items to display in stack
  const stackItems = useMemo(() => items.slice(0, 3), [items]);

  // Track the top card's translateX for animating cards behind it
  const topCardTranslateX = useSharedValue(0);

  const handleSwipeRight = (item: T) => {
    onSwipeRight(item);
  };

  const handleSwipeLeft = (item: T) => {
    onSwipeLeft(item);
  };

  // Update topCardTranslateX when first card's translateX changes
  // This function will be called from worklet context
  const handleTopCardTranslateXChange = (translateX: ReturnType<typeof useSharedValue<number>>) => {
    'worklet';
    topCardTranslateX.value = translateX.value;
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardStack}>
        {stackItems.map((item, index) => {
          const isFirst = index === 0;
          const itemId = (item as any).userId;
          const stableKey = itemId ?? `card-${index}`;

          return (
            <StackCard
              key={stableKey}
              item={item}
              index={index}
              isFirst={isFirst}
              stackDepth={index}
              topCardTranslateX={topCardTranslateX}
              renderCard={renderCard}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              OverlayLabelRight={OverlayLabelRight}
              OverlayLabelLeft={OverlayLabelLeft}
              onTranslateXChange={isFirst ? handleTopCardTranslateXChange : undefined}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    minHeight: 650,
  },
  cardStack: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
    minHeight: 650,
  },
  cardWrapper: {
    position: "absolute",
    width: "100%",
    maxWidth: 400,
    top: 0,
    alignSelf: "center",
  },
  card: {
    width: "100%",
    height: "100%",
  },
});
