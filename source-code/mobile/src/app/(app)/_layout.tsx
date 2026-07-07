import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';

import { Fonts, FontSizes } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { startConnectivitySync } from '@/services/sync/connectivitySync';
import { useAuthStore } from '@/store/authStore';

export default function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const colors = useThemeColors();

  useEffect(() => {
    if (!user) return;
    return startConnectivitySync();
  }, [user]);

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { fontFamily: Fonts.heading, color: colors.text },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: Fonts.subheading, fontSize: FontSizes.xs },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="routes" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="pickup" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="collection" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="payments" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
