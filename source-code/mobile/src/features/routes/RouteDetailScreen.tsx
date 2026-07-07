import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { routeService, type Route } from '@/services';
import { useAuthStore } from '@/store/authStore';

const FACTORY_ROLES = ['factory_admin', 'factory_officer', 'factory_manager'];

type Props = { route: Route };

export function RouteDetailScreen({ route: initialRoute }: Props) {
  const user = useAuthStore((state) => state.user);
  const [route, setRoute] = useState(initialRoute);
  const [pendingAction, setPendingAction] = useState<'delay' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const isOwnCollector = user.role === 'collector' && user.id === route.collectorId;
  const isFactoryStaff = FACTORY_ROLES.includes(user.role);

  const handleStart = async () => {
    const result = await routeService.startRoute(route.id, user.id);
    if (result.ok) {
      setRoute(result.route);
      setError(null);
    } else {
      setError(result.error);
    }
  };

  const submitReason = async () => {
    const action = pendingAction === 'delay' ? routeService.setDelayed : routeService.setCancelled;
    const result = await action(route.id, reason);
    if (result.ok) {
      setRoute(result.route);
      setError(null);
      setPendingAction(null);
      setReason('');
    } else {
      setError(result.error);
    }
  };

  return (
    <ScreenContainer scroll>
      <ThemedText variant="title">{route.truckName ?? 'Route'}</ThemedText>
      <ThemedText variant="body" color="textSecondary">
        {route.routeDate} · Status: {route.status}
      </ThemedText>
      {route.statusReason ? (
        <ThemedText variant="small" color="textSecondary">
          Reason: {route.statusReason}
        </ThemedText>
      ) : null}

      <View style={styles.list}>
        {route.stops.map((stop) => (
          <Card key={stop.id}>
            <ThemedText variant="bodyMedium">{stop.estateName}</ThemedText>
            <ThemedText variant="small" color="textSecondary">
              {stop.hasTeaPickup ? 'Tea pickup' : ''}
              {stop.hasTeaPickup && stop.hasFertilizerDelivery ? ' · ' : ''}
              {stop.hasFertilizerDelivery ? 'Fertilizer delivery' : ''}
            </ThemedText>
          </Card>
        ))}
      </View>

      {error ? (
        <ThemedText variant="small" color="destructive">
          {error}
        </ThemedText>
      ) : null}

      {isOwnCollector && route.status === 'scheduled' && <Button label="Start Route" onPress={handleStart} />}

      {isFactoryStaff && (route.status === 'scheduled' || route.status === 'active') && (
        <View style={styles.list}>
          <Button label="Delay Route" variant="secondary" onPress={() => setPendingAction('delay')} />
          <Button label="Cancel Route" variant="destructive" onPress={() => setPendingAction('cancel')} />
        </View>
      )}

      {pendingAction && (
        <View style={styles.list}>
          <TextField label="Reason" placeholder="Reason for this change" value={reason} onChangeText={setReason} />
          <Button label="Confirm" onPress={submitReason} disabled={!reason.trim()} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
});
