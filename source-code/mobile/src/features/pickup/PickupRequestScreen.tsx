import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { factoryService, pickupService, type Factory, type PickupRequest } from '@/services';
import { useAuthStore } from '@/store/authStore';

type Props = { estateId: string };

export function PickupRequestScreen({ estateId }: Props) {
  const user = useAuthStore((state) => state.user);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<PickupRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    factoryService.listFactories().then(setFactories);
    pickupService.getActiveRequestForEstate(estateId).then(setActiveRequest);
  }, [estateId]);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!factoryId) return;
    const result = await pickupService.createRequest({ estateId, ownerId: user.id, factoryId });
    if (result.ok) {
      setActiveRequest(result.request);
      setError(null);
    } else {
      setError(result.error);
    }
  };

  const handleCancel = async () => {
    if (!activeRequest) return;
    const result = await pickupService.cancel(activeRequest.id);
    if (result.ok) {
      setActiveRequest(null);
      setError(null);
    } else {
      setError(result.error);
    }
  };

  if (activeRequest) {
    return (
      <ScreenContainer scroll>
        <ThemedText variant="title">Pickup Request</ThemedText>
        <ThemedText variant="body" color="textSecondary">
          Status: {activeRequest.status}
        </ThemedText>
        {activeRequest.declineReason ? (
          <ThemedText variant="small" color="textSecondary">
            Reason: {activeRequest.declineReason}
          </ThemedText>
        ) : null}
        {activeRequest.status === 'pending' && <Button label="Cancel Request" variant="destructive" onPress={handleCancel} />}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <ThemedText variant="title">Request Pickup</ThemedText>
      <ThemedText variant="label" color="textSecondary">
        Select a factory
      </ThemedText>
      <View style={styles.list}>
        {factories.map((factory) => (
          <Card
            key={factory.id}
            onPress={() => setFactoryId(factory.id)}
            style={factoryId === factory.id ? styles.selected : undefined}
          >
            <ThemedText variant="bodyMedium">{factory.name}</ThemedText>
          </Card>
        ))}
      </View>

      {error ? (
        <ThemedText variant="small" color="destructive">
          {error}
        </ThemedText>
      ) : null}

      <Button label="Request Pickup" onPress={handleSubmit} disabled={!factoryId} />
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
