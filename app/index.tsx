import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getToken } from '@/src/services/authStore';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';

export default function Index() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const token = await getToken();
      
      if (!token) {
        // Token yoksa welcome ekranına git
        router.replace('/(auth)/welcome');
        return;
      }

      // Token varsa, geçerli olup olmadığını kontrol et
      try {
        const me = await api.getMe();
        
        // Eğer profile yoksa profile setup'a yönlendir
        if (!me.profileExists) {
          router.replace('/(auth)/profile-setup');
          return;
        }

        // Her şey tamamsa ana ekrana yönlendir
        router.replace('/(tabs)/home');
      } catch (error) {
        // Token geçersizse welcome'a yönlendir
        console.error('Auth check failed:', error);
        router.replace('/(auth)/welcome');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      router.replace('/(auth)/welcome');
    } finally {
      setIsChecking(false);
    }
  };

  // Loading state - bir View döndürmek hooks'ların düzgün çalışması için gerekli
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

