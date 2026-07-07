import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { pickupService, type PickupRequest } from '@/services';
import { useAuthStore } from '@/store/authStore';

export function PickupRequestListScreen() {
  const user = useAuthStore((state) => state.user);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!user) return;
    pickupService.listForCollector(user.id).then(setRequests);
  }, [user]);

  if (!user) return null;

  const handleAccept = async (id: string) => {
    const result = await pickupService.accept(id);
    if (result.ok) {
      setRequests((prev) => prev.filter((request) => request.id !== id));
    }
  };

  const confirmDecline = async () => {
    if (!decliningId) return;
    const result = await pickupService.decline(decliningId, reason);
    if (result.ok) {
      setRequests((prev) => prev.filter((request) => request.id !== decliningId));
      setDecliningId(null);
      setReason('');
    }
  };

  return (
    <ScreenContainer scroll>
      <ThemedText variant="title">Pickup Requests</ThemedText>

      {requests.length === 0 && <EmptyState icon="list-outline" title="No pickup requests" />}

      <View style={styles.list}>
        {requests.map((request) => (
          <Card key={request.id}>
            <ThemedText variant="bodyMedium">{request.estateName}</ThemedText>
            <View style={styles.actions}>
              <Button label="Accept" onPress={() => handleAccept(request.id)} />
              <Button label="Decline" variant="destructive" onPress={() => setDecliningId(request.id)} />
            </View>
            {decliningId === request.id && (
              <View style={styles.list}>
                <TextField
                  label="Reason"
                  placeholder="Reason for declining"
                  value={reason}
                  onChangeText={setReason}
                />
                <Button label="Confirm" onPress={confirmDecline} disabled={!reason.trim()} />
              </View>
            )}
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
