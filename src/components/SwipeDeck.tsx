import React, { useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import SwipeableCard, { SwipeableCardHandle } from "./SwipeableCard";
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
  cardRef?: React.RefObject<SwipeableCardHandle | null>;
  cardHeight: number;
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
  cardRef,
  cardHeight,
}: StackCardProps<T>) {
  // Animated style for cards behind the top card. Bumble-style: cards behind
  // are perfectly aligned and INVISIBLE at rest (nothing peeks out around the
  // top card, even while its content scrolls); the next card fades/scales in
  // only while the top card is being dragged horizontally.
  const animatedStackStyle = useAnimatedStyle(() => {
    'worklet';
    if (isFirst) {
      return {};
    }

    const drag = Math.abs(topCardTranslateX.value);

    // Only the card directly behind the top one reveals during the drag;
    // deeper cards stay hidden until they move up the stack.
    const revealOpacity = stackDepth === 1
      ? interpolate(drag, [0, 24, windowWidth / 3], [0, 0.35, 1], Extrapolation.CLAMP)
      : 0;

    const revealScale = interpolate(
      drag,
      [0, windowWidth / 2],
      [0.96, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: revealScale }],
      opacity: revealOpacity,
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
        ref={isFirst ? cardRef : undefined}
        cardWidth={CARD_WIDTH}
        cardHeight={cardHeight}
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

// Export handle type for external use
export type SwipeDeckHandle = {
  swipeLeft: () => void;
  swipeRight: () => void;
  swipeBack: () => void;
};

type SwipeDeckProps<T> = {
  items: T[];
  renderCard: (item: T, isFirst: boolean) => React.ReactNode;
  onSwipeLeft: (item: T) => void;
  onSwipeRight: (item: T) => void;
  OverlayLabelRight?: () => React.ReactElement;
  OverlayLabelLeft?: () => React.ReactElement;
};

function SwipeDeckInner<T extends { userId?: string }>(
  {
    items,
    renderCard,
    onSwipeLeft,
    onSwipeRight,
    OverlayLabelRight,
    OverlayLabelLeft,
  }: SwipeDeckProps<T>,
  ref: React.ForwardedRef<SwipeDeckHandle>
) {
  // The card height used to be hardcoded to 720dp, which only ever matched
  // one screen size: taller phones showed a band of dead space between the
  // card and the tab bar, shorter ones had the card clipped by it. Measure
  // the box the layout hands us and fill it exactly.
  const [deckHeight, setDeckHeight] = useState(0);
  const onDeckLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && h !== deckHeight) setDeckHeight(h);
  };

  // Get the first 3 items to display in stack
  const stackItems = useMemo(() => items.slice(0, 3), [items]);

  // Track the top card's translateX for animating cards behind it
  const topCardTranslateX = useSharedValue(0);

  // Ref for the top card's SwipeableCard
  const topCardRef = useRef<SwipeableCardHandle>(null);

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

  // Expose swipe methods via ref
  useImperativeHandle(ref, () => ({
    swipeLeft: () => {
      topCardRef.current?.swipeLeft();
    },
    swipeRight: () => {
      topCardRef.current?.swipeRight();
    },
    swipeBack: () => {
      topCardRef.current?.swipeBack();
    },
  }));

  return (
    <View style={styles.container} onLayout={onDeckLayout}>
      {/* Nothing to lay out until the first measurement lands. */}
      <View style={styles.cardStack}>
        {deckHeight > 0 && stackItems.map((item, index) => {
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
              cardRef={topCardRef}
              cardHeight={deckHeight}
            />
          );
        })}
      </View>
    </View>
  );
}

// Export with forwardRef
export const SwipeDeck = forwardRef(SwipeDeckInner) as <T extends { userId?: string }>(
  props: SwipeDeckProps<T> & { ref?: React.ForwardedRef<SwipeDeckHandle> }
) => React.ReactElement;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
  },
  cardStack: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
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
