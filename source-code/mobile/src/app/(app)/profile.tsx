import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/types/user';

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!user) {
    return null;
  }

  return (
    <ScreenContainer>
      <Card style={styles.card}>
        <ThemedText variant="title">{user.name}</ThemedText>
        <ThemedText variant="body" color="textSecondary">
          {ROLE_LABELS[user.role]}
        </ThemedText>
        <ThemedText variant="body" color="textSecondary">
          {user.phone}
        </ThemedText>
      </Card>

      <View style={styles.spacer} />

      <Button
        label="Log out"
        variant="destructive"
        onPress={() => {
          logout();
          router.replace('/(auth)/login');
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
  },
  spacer: {
    flex: 1,
  },
});
