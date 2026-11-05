import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getToken } from '@/src/services/authStore';
import { api } from '@/src/services/api';
import { apiErrorMessage, getApiErrorStatus } from '@/src/services/apiErrors';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { typography } from '@/src/theme/typography';

export default function Index() {
  const router = useRouter();
  const { t } = useTranslation();
  // Set when the launch check failed for a reason other than a bad session
  // (offline, server down, 429): stay signed in and offer a retry.
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthAndRedirect = async () => {
    setLaunchError(null);
    let token: string | null = null;
    try {
      token = await getToken();
    } catch (error) {
      console.error('Error reading token:', error);
    }

    if (!token) {
      // No session: welcome screen.
      router.replace('/(auth)/welcome');
      return;
    }

    try {
      const me = await api.getMe();

      // Eğer profile yoksa profile setup'a yönlendir
      if (!me.profileExists) {
        router.replace('/(auth)/profile-setup');
        return;
      }

      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Auth check failed:', error);
      // Only an invalid session (401) signs the user out to Welcome. Offline
      // or a server hiccup must not throw a logged-in user out of the app.
      if (getApiErrorStatus(error) === 401) {
        router.replace('/(auth)/welcome');
        return;
      }
      setLaunchError(apiErrorMessage(error, t('launch.error_body')));
    }
  };

  if (launchError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
          padding: spacing.xl,
        }}
      >
        <Text
          style={{
            color: colors.textDark,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            textAlign: 'center',
            marginBottom: spacing.sm,
          }}
        >
          {t('launch.error_title')}
        </Text>
        <Text
          style={{
            color: colors.textSecondaryDark,
            fontSize: typography.fontSize.base,
            textAlign: 'center',
            marginBottom: spacing.lg,
          }}
        >
          {launchError}
        </Text>
        <TouchableOpacity
          onPress={checkAuthAndRedirect}
          accessibilityRole="button"
          style={{
            backgroundColor: colors.primary,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.xl,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: colors.textInverse, fontWeight: typography.fontWeight.semibold }}>
            {t('common.retry')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state - bir View döndürmek hooks'ların düzgün çalışması için gerekli
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
