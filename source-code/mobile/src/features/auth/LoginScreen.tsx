import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { authService, type DemoAccount } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/types/user';

const DEMO_PASSWORD = 'password123';

export function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  const login = useAuthStore((state) => state.login);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  useEffect(() => {
    authService.getDemoAccounts().then(setDemoAccounts);
  }, []);

  const handleSubmit = async () => {
    const success = await login(phone, password);
    if (success) {
      router.replace('/(app)');
    }
  };

  const fillDemoAccount = (account: DemoAccount) => {
    setPhone(account.phone);
    setPassword(DEMO_PASSWORD);
    clearError();
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <ThemedText variant="display">Tea Collection</ThemedText>
        <ThemedText variant="body" color="textSecondary">
          Sign in to continue
        </ThemedText>
      </View>

      <TextField
        label="Phone number"
        placeholder="07XXXXXXXX"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        value={phone}
        onChangeText={(value) => {
          setPhone(value);
          clearError();
        }}
      />
      <TextField
        label="Password"
        placeholder="Enter your password"
        isPassword
        textContentType="password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearError();
        }}
      />

      {error ? (
        <ThemedText variant="small" color="destructive">
          {error}
        </ThemedText>
      ) : null}

      <Button label="Log in" onPress={handleSubmit} loading={isSubmitting} disabled={!phone || !password} />

      <View style={styles.demoSection}>
        <ThemedText variant="label" color="textSecondary">
          Demo accounts (backend not connected yet) — password: {DEMO_PASSWORD}
        </ThemedText>
        {demoAccounts.map((account) => (
          <Card key={account.phone} onPress={() => fillDemoAccount(account)} style={styles.demoCard}>
            <ThemedText variant="bodyMedium">{ROLE_LABELS[account.role]}</ThemedText>
            <ThemedText variant="small" color="textSecondary">
              {account.name} · {account.phone}
            </ThemedText>
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  demoSection: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  demoCard: {
    gap: 2,
  },
});
