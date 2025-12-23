import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { PremiumProvider } from '@/src/state/premium';
import { initializeAds } from '@/src/services/rewardedAds';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Removed unstable_settings - using index.tsx for initial routing instead

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    // Return null during loading - Expo Router handles this correctly
    // Using View here can cause hook issues if colors is not ready
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Initialize AdMob on app start (only in dev builds, not Expo Go)
  useEffect(() => {
    // Initialize ads silently - it will check for Expo Go internally
    initializeAds().catch(() => {
      // Silently fail - ads are optional and don't work in Expo Go
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PremiumProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: colors.backgroundSecondaryDark,
                },
                headerTintColor: colors.textDark,
                headerTitleStyle: {
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.lg,
                },
                contentStyle: {
                  backgroundColor: colors.backgroundDark,
                },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="premium"
                options={{
                  title: "Premium",
                  presentation: "modal",
                }}
              />
              <Stack.Screen
                name="conversation/[id]"
                options={{
                  title: "Chat",
                }}
              />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
          </ThemeProvider>
        </PremiumProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
