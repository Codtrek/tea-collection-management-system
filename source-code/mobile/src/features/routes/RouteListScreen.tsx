import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { routeService, type Route } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { todayISODate } from '@/utils/date';

const FACTORY_ROLES = ['factory_admin', 'factory_officer', 'factory_manager'];

export function RouteListScreen() {
  const user = useAuthStore((state) => state.user);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  const isFactoryStaff = user ? FACTORY_ROLES.includes(user.role) : false;

  useEffect(() => {
    if (!user) return;
    const today = todayISODate();
    const load = isFactoryStaff
      ? routeService.listRoutesForDate(today)
      : routeService.listRoutesForCollector(user.id, today);
    load.then((result) => {
      setRoutes(result);
      setLoading(false);
    });
  }, [user, isFactoryStaff]);

  if (!user) return null;

  return (
    <ScreenContainer scroll>
      <ThemedText variant="title">{isFactoryStaff ? 'Manage Routes' : "Today's Route"}</ThemedText>

      {isFactoryStaff && (
        <Button label="+ New Route" onPress={() => router.push('/(app)/routes/new')} variant="secondary" />
      )}

      {!loading && routes.length === 0 && (
        <EmptyState
          icon="map-outline"
          title="No route scheduled"
          description={isFactoryStaff ? 'No routes have been created for today yet.' : 'No route assigned to you today.'}
        />
      )}

      <View style={styles.list}>
        {routes.map((route) => (
          <Card key={route.id} onPress={() => router.push(`/(app)/routes/${route.id}`)}>
            <ThemedText variant="bodyMedium">{route.truckName ?? 'Route'}</ThemedText>
            <ThemedText variant="small" color="textSecondary">
              {route.routeDate} · {route.status} · {route.stops.length} stop(s)
            </ThemedText>
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
});
