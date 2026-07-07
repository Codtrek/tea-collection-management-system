import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { authService, estateService, routeService, type DemoAccount, type Estate } from '@/services';
import { todayISODate } from '@/utils/date';

type StopSelection = { hasTeaPickup: boolean; hasFertilizerDelivery: boolean };

export function CreateRouteScreen() {
  const [collectors, setCollectors] = useState<DemoAccount[]>([]);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [collectorId, setCollectorId] = useState<string | null>(null);
  const [truckName, setTruckName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [stopSelections, setStopSelections] = useState<Record<string, StopSelection>>({});

  useEffect(() => {
    authService.getDemoAccounts().then((accounts) => setCollectors(accounts.filter((a) => a.role === 'collector')));
    estateService.listEstates().then(setEstates);
  }, []);

  const toggleTeaPickup = (estateId: string) => {
    setStopSelections((prev) => {
      const current = prev[estateId] ?? { hasTeaPickup: false, hasFertilizerDelivery: false };
      return { ...prev, [estateId]: { ...current, hasTeaPickup: !current.hasTeaPickup } };
    });
  };

  const stops = Object.entries(stopSelections)
    .filter(([, selection]) => selection.hasTeaPickup || selection.hasFertilizerDelivery)
    .map(([estateId, selection]) => ({ estateId, ...selection }));

  const canSubmit = collectorId !== null && stops.length > 0;

  const handleSubmit = async () => {
    if (!collectorId) return;
    const route = await routeService.createRoute({
      routeDate: todayISODate(),
      collectorId,
      truckName: truckName || undefined,
      driverName: driverName || undefined,
      stops,
    });
    router.replace(`/(app)/routes/${route.id}`);
  };

  return (
    <ScreenContainer scroll>
      <ThemedText variant="title">New Route</ThemedText>

      <TextField label="Truck" placeholder="Truck name/plate" value={truckName} onChangeText={setTruckName} />
      <TextField label="Driver" placeholder="Driver name" value={driverName} onChangeText={setDriverName} />

      <ThemedText variant="label" color="textSecondary">
        Collector
      </ThemedText>
      <View style={styles.list}>
        {collectors.map((collector) => (
          <Card
            key={collector.phone}
            onPress={() => setCollectorId(collector.id)}
            style={collectorId === collector.id ? styles.selected : undefined}
          >
            <ThemedText variant="bodyMedium">{collector.name}</ThemedText>
          </Card>
        ))}
      </View>

      <ThemedText variant="label" color="textSecondary">
        Estates on this route
      </ThemedText>
      <View style={styles.list}>
        {estates.map((estate) => (
          <Card
            key={estate.id}
            onPress={() => toggleTeaPickup(estate.id)}
            style={stopSelections[estate.id]?.hasTeaPickup ? styles.selected : undefined}
          >
            <ThemedText variant="bodyMedium">{estate.name}</ThemedText>
          </Card>
        ))}
      </View>

      <Button label="Create Route" onPress={handleSubmit} disabled={!canSubmit} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  selected: {
    borderWidth: 2,
  },
});
