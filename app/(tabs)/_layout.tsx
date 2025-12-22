import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  focused?: boolean;
}) {
  return (
    <FontAwesome
      size={props.focused ? 24 : 22}
      style={{ marginBottom: -3 }}
      {...props}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const baseTabBarHeight = 28;
  const bottomPadding = insets.bottom > 0 ? Math.max(insets.bottom - 12, spacing.xs) : spacing.xs;
  const totalTabBarHeight = baseTabBarHeight + bottomPadding;
  const paddingTop = Math.max(bottomPadding / 5, spacing.xs);
  const paddingBottom = bottomPadding - paddingTop;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textSecondaryDark,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          marginBottom: 0,
          backgroundColor: colors.backgroundSecondaryDark,
          borderTopWidth: 1,
          borderTopColor: colors.borderDark,
          borderWidth: 0,
          height: totalTabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: paddingTop,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        headerStyle: {
          backgroundColor: colors.backgroundSecondaryDark,
        },
        headerTintColor: colors.textDark,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="comments" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="heart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="user" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
