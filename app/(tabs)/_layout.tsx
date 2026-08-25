import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions, TouchableOpacity, LayoutChangeEvent, Modal, ActivityIndicator } from 'react-native';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { typography } from '@/src/theme/typography';
import { SAFETY_REASON_LABEL_KEYS } from '@/src/components/chat/LeaveReasonModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services/api';
import { getToken } from '@/src/services/authStore';
import { badgeUpdater } from '@/src/utils/badgeUpdater';
import { registerPushToken, addNotificationResponseListener } from '@/src/services/pushNotifications';
import { useDeviceType } from '@/src/hooks/useDeviceType';
import { useSocket } from '@/src/state/socket';
import { MatchPopup } from '@/src/components/MatchPopup';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const TAB_COUNT = 4;

// Ensure the moderation warning modal is shown at most once per app session
let moderationWarningShownThisSession = false;

// Custom Tab Bar with sliding indicator
function CustomTabBar({ state, navigation, incomingRequestsCount, unreadMessagesCount, bottomMargin, isTablet }: any) {
  const { t } = useTranslation();
  const [tabWidth, setTabWidth] = useState(0);

  // Animated indicator position
  const indicatorPosition = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      indicatorPosition.value = withSpring(state.index * tabWidth, {
        damping: 20,
        stiffness: 200,
      });
    }
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
    width: tabWidth,
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTabWidth(width / TAB_COUNT);
  };

  const tabs = [
    { name: 'home', icon: 'home', outlineIcon: 'home-outline', label: t('tabs.home') },
    { name: 'chat', icon: 'chatbubbles', outlineIcon: 'chatbubbles-outline', label: t('tabs.chat') },
    { name: 'likes', icon: 'heart', outlineIcon: 'heart-outline', label: t('tabs.likes') },
    { name: 'profile', icon: 'person', outlineIcon: 'person-outline', label: t('tabs.profile') },
  ];

  // On tablets, center the tab bar with a max width
  const tabBarStyle = isTablet
    ? [styles.tabBarContainer, styles.tabBarTablet, { bottom: bottomMargin }]
    : [styles.tabBarContainer, { bottom: bottomMargin }];

  return (
    <View style={tabBarStyle} onLayout={handleLayout}>
      {/* Sliding Indicator */}
      {tabWidth > 0 && (
        <Animated.View style={[styles.indicatorWrapper, indicatorStyle]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.indicator}
          />
        </Animated.View>
      )}

      {/* Tab Buttons */}
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = tabs[index];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={isFocused ? tab.icon as any : tab.outlineIcon as any}
                  size={22}
                  color={isFocused ? colors.onMedia : 'rgba(255, 255, 255, 0.5)'}
                />
                {tab.name === 'likes' && incomingRequestsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {incomingRequestsCount > 99 ? '99+' : incomingRequestsCount}
                    </Text>
                  </View>
                )}
                {tab.name === 'chat' && unreadMessagesCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.label,
                { color: isFocused ? colors.onMedia : 'rgba(255, 255, 255, 0.5)' }
              ]}>
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isTablet } = useDeviceType();
  const { likesCount: realtimeLikesCount, newMatches, clearNewMatches } = useSocket();
  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [moderationWarning, setModerationWarning] = useState<{
    reason: string;
    warnedAt: string;
  } | null>(null);
  const [ackingWarning, setAckingWarning] = useState(false);
  const bottomMargin = Math.max(insets.bottom, 16);

  // Check for a pending moderation warning once per app session
  useEffect(() => {
    if (moderationWarningShownThisSession) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const me = await api.getMe();
        if (me.moderationWarning) {
          moderationWarningShownThisSession = true;
          setModerationWarning(me.moderationWarning);
        }
      } catch (error) {
        // Non-critical: skip the warning check on failure
      }
    })();
  }, []);

  const handleAckWarning = async () => {
    setAckingWarning(true);
    try {
      await api.ackModerationWarning();
    } catch (error) {
      // Best effort — still dismiss locally; backend will re-deliver if not acked
    } finally {
      setAckingWarning(false);
      setModerationWarning(null);
    }
  };

  // Combine API count with real-time socket updates
  const totalLikesCount = incomingRequestsCount + realtimeLikesCount;

  // Show match popup when new match arrives; hide it when the queue is
  // cleared elsewhere (e.g. likes screen shows its own match modal on accept).
  useEffect(() => {
    setShowMatchPopup(newMatches.length > 0);
  }, [newMatches]);

  const handleCloseMatchPopup = () => {
    setShowMatchPopup(false);
    clearNewMatches();
  };

  const loadIncomingRequestsCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const incoming = await api.getIncomingRequests();
      setIncomingRequestsCount(incoming.length);
    } catch (error) {
      setIncomingRequestsCount(0);
    }
  };

  const loadUnreadMessagesCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const result = await api.getUnreadMessageCount();
      setUnreadMessagesCount(result.unreadCount);
    } catch (error) {
      setUnreadMessagesCount(0);
    }
  };

  const loadAllCounts = async () => {
    await Promise.all([
      loadIncomingRequestsCount(),
      loadUnreadMessagesCount(),
    ]);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadAllCounts();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(loadAllCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = badgeUpdater.subscribe(loadAllCounts);
    return unsubscribe;
  }, []);

  // Push notifications: register token once logged-in, navigate on tap.
  // No-ops silently until Firebase credentials ship in the build.
  const router = useRouter();
  useEffect(() => {
    registerPushToken();
    const unsubscribe = addNotificationResponseListener((path) => {
      router.push(path as any);
    });
    return unsubscribe;
  }, []);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            incomingRequestsCount={totalLikesCount}
            unreadMessagesCount={unreadMessagesCount}
            bottomMargin={bottomMargin}
            isTablet={isTablet}
          />
        )}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Tabs.Screen name="home" options={{ title: t('tabs.home') }} />
        <Tabs.Screen name="chat" options={{ title: t('tabs.chat') }} />
        <Tabs.Screen name="likes" options={{ title: t('tabs.likes') }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
      </Tabs>

      {/* Match Popup */}
      <MatchPopup
        visible={showMatchPopup}
        match={newMatches[0] || null}
        onClose={handleCloseMatchPopup}
        onSendMessage={handleCloseMatchPopup}
      />

      {/* Moderation Warning Modal */}
      <Modal
        visible={moderationWarning !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.warningOverlay}>
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>{t('safety.warning_title')}</Text>
            <Text style={styles.warningBody}>
              {t('safety.warning_body', {
                reason: moderationWarning
                  ? t(SAFETY_REASON_LABEL_KEYS[moderationWarning.reason] ?? 'safety.reason_other')
                  : '',
              })}
            </Text>
            <Text style={styles.warningNote}>{t('safety.warning_note')}</Text>
            <TouchableOpacity
              style={[styles.warningButton, ackingWarning && styles.warningButtonDisabled]}
              onPress={handleAckWarning}
              disabled={ackingWarning}
              accessibilityRole="button"
            >
              {ackingWarning ? (
                <ActivityIndicator size="small" color={colors.onMedia} />
              ) : (
                <Text style={styles.warningButtonText}>{t('safety.warning_ack')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    backgroundColor: 'rgba(25, 25, 40, 0.98)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarTablet: {
    maxWidth: 500,
    left: 'auto' as const,
    right: 'auto' as const,
    alignSelf: 'center',
    width: '60%',
  },
  indicatorWrapper: {
    position: 'absolute',
    top: 8,
    left: 0,
    height: 48,
    paddingHorizontal: 8,
  },
  indicator: {
    flex: 1,
    borderRadius: 24,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.accentDark,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.onMedia,
    fontSize: 9,
    fontWeight: 'bold',
  },
  warningOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  warningCard: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  warningTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  warningBody: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  warningNote: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  warningButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningButtonDisabled: {
    opacity: 0.5,
  },
  warningButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.onMedia,
  },
});
