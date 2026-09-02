import React, { useState } from "react";
import {
  View,
  Image as RNImage,
  ImageProps as RNImageProps,
  ImageSourcePropType,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ImageStyle,
  ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";

/**
 * Performance-focused image wrapper.
 *
 * Today: wraps react-native <Image> and adds loading + error states.
 * Tomorrow (after `npx expo install expo-image`):
 *   - swap the import to `import { Image } from "expo-image"`
 *   - replace `RNImage` with `Image`
 *   - pass `cachePolicy="memory-disk"` and `transition={200}`
 *   - delete the local `loading` state (expo-image handles it)
 * Call sites do not change.
 */
export type OptimizedImageProps = Omit<RNImageProps, "source" | "style"> & {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  showLoader?: boolean;
  fallbackIconSize?: number;
};

export function OptimizedImage({
  source,
  style,
  containerStyle,
  resizeMode = "cover",
  showLoader = true,
  fallbackIconSize = 48,
  onLoadStart,
  onLoadEnd,
  onError,
  ...rest
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  /**
   * Yukleniyor halkasi icin guvenlik agi.
   *
   * `onLoad` / `onLoadEnd` her platformda guvenilir degil --
   * react-native-web'de onbellekten gelen gorseller icin atesenmeyebiliyor.
   * O zaman `loading` sonsuza kadar true kaliyor ve fotograf goruntulendigi
   * halde ustunde donen bir halka duruyor: deste kartinda her yuzun
   * ortasinda bir spinner vardi. Gorsel incelemede yakalandi.
   *
   * Takili kalan bir gosterge, hic olmayan gostergeden kotudur.
   */
  React.useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(id);
  }, [loading]);

  return (
    <View style={[styles.container, containerStyle]}>
      {!errored && (
        <RNImage
          {...rest}
          source={source}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoadStart={() => {
            setLoading(true);
            onLoadStart?.();
          }}
          // `onLoad` DA dinleniyor.
          //
          // react-native-web'de `onLoadEnd` her zaman atesleniyor degil
          // (ozellikle onbellekten gelen gorsellerde), ve o zaman `loading`
          // sonsuza kadar true kaliyordu: fotograf goruntuleniyor ama
          // ustunde donen bir halka duruyordu. Deste kartinda her yuzun
          // ortasinda bir spinner vardi.
          onLoad={(e) => {
            setLoading(false);
            rest.onLoad?.(e);
          }}
          onLoadEnd={() => {
            setLoading(false);
            onLoadEnd?.();
          }}
          onError={(e) => {
            setLoading(false);
            setErrored(true);
            onError?.(e);
          }}
        />
      )}

      {showLoader && loading && !errored && (
        <View style={styles.stateOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {errored && (
        <View style={styles.stateOverlay} pointerEvents="none">
          <MaterialIcons
            name="broken-image"
            size={fallbackIconSize}
            color={colors.textTertiary}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: colors.surfaceTint,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  stateOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});
