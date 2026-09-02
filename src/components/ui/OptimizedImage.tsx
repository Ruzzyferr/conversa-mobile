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

/** Kaynagin kimligi: ayni URI, ayni gorsel. */
function sourceKey(source: ImageSourcePropType): string {
  if (Array.isArray(source)) return source.map(sourceKey).join("|");
  if (typeof source === "number") return `local:${source}`;
  return (source as { uri?: string })?.uri ?? "";
}

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
  const key = sourceKey(source);

  /**
   * Kaynagi URI'sine gore sabitliyoruz.
   *
   * Cagri yerleri `source={{ uri: photos[0] }}` yaziyor: her render YENI bir
   * nesne. react-native-web bunu yeni bir kaynak sayip gorseli bastan
   * yukluyor, bu da `onLoadStart` -> `setLoading(true)` -> yeniden render ->
   * yeni nesne -> ... seklinde SONSUZ bir donguye giriyordu. Gorunen sonucu
   * fotograf yuklendigi halde ustunde hic durmayan bir halkaydi; gorunmeyen
   * sonucu her karede yeniden istenen bir gorsel.
   *
   * URI ayni kaldigi surece ayni nesneyi veriyoruz, dongu kapaniyor.
   */
  const stableSource = React.useMemo(() => source, [key]);

  /**
   * Yalnizca bu URI'yi ilk kez yuklerken halka goster.
   *
   * `loading`'i her `onLoadStart`'ta true'ya cekmek, onbellekten gelen bir
   * gorselde bile bir kare boyunca halka gosteriyordu.
   */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [erroredKey, setErroredKey] = useState<string | null>(null);
  const loading = loadedKey !== key && erroredKey !== key;
  const errored = erroredKey === key;

  /**
   * Guvenlik agi.
   *
   * `onLoad` / `onLoadEnd` her platformda guvenilir degil --
   * react-native-web'de onbellekten gelen gorseller icin atesenmeyebiliyor.
   * Takili kalan bir gosterge, hic olmayan gostergeden kotudur.
   */
  React.useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setLoadedKey(key), 2500);
    return () => clearTimeout(id);
  }, [loading, key]);

  return (
    <View style={[styles.container, containerStyle]}>
      {!errored && (
        <RNImage
          {...rest}
          source={stableSource}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoadStart={onLoadStart}
          onLoad={(e) => {
            setLoadedKey(key);
            rest.onLoad?.(e);
          }}
          onLoadEnd={() => {
            setLoadedKey(key);
            onLoadEnd?.();
          }}
          onError={(e) => {
            setErroredKey(key);
            onError?.(e);
          }}
        />
      )}

      {showLoader && loading && (
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
