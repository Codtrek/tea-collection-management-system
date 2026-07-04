import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/store/authStore';

import { ROLE_DASHBOARDS } from './roleDashboards';

export function DashboardScreen() {
  const user = useAuthStore((state) => state.user);
  const colors = useThemeColors();

  if (!user) {
    return null;
  }

  const dashboard = ROLE_DASHBOARDS[user.role];

  return (
    <ScreenContainer scroll>
      <ThemedText variant="label" color="textSecondary">
        {dashboard.greetingRole}
      </ThemedText>
      <ThemedText variant="title">Hello, {user.name.split(' ')[0]}</ThemedText>

      <View style={styles.list}>
        {dashboard.items.map((item) => (
          <Card key={item.label} style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <ThemedText variant="bodyMedium">{item.label}</ThemedText>
              <ThemedText variant="small" color="textSecondary">
                Coming soon
              </ThemedText>
            </View>
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
