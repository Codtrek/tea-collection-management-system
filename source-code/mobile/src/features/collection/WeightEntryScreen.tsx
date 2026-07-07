import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import {
  collectionService,
  estateService,
  evidenceSyncService,
  type CollectionRecord,
  type Estate,
} from '@/services';
import { useAuthStore } from '@/store/authStore';

export function WeightEntryScreen() {
  const user = useAuthStore((state) => state.user);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    estateService.listEstates().then(setEstates);
  }, []);

  useEffect(() => {
    if (!user) return;
    collectionService.listForCollector(user.id).then(setRecords);
  }, [user]);

  if (!user) return null;

  const weightKg = Number.parseFloat(weight);
  const canSave = selectedEstateId !== null && Number.isFinite(weightKg) && weightKg > 0;

  const handleSave = async () => {
    if (!selectedEstateId) return;
    const result = await collectionService.createRecord({
      collectorId: user.id,
      estateId: selectedEstateId,
      actualWeightKg: weightKg,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setWeight('');
    setSelectedEstateId(null);
    setRecords((prev) => [result.record, ...prev]);
  };

  const handleConfirmOwner = async (recordId: string) => {
    const result = await collectionService.confirmOwner(recordId);
    if (result.ok) {
      setRecords((prev) => prev.map((record) => (record.id === recordId ? result.record : record)));
    }
  };

  const handleCaptureEvidence = async (recordId: string) => {
    // No camera integration yet — a real capture would supply the device photo's local URI here.
    const localUri = `local-photo-${Date.now()}.jpg`;
    const result = await evidenceSyncService.captureEvidence(recordId, localUri);
    if (result.ok) {
      setRecords((prev) =>
        prev.map((record) => (record.id === recordId ? { ...record, evidenceStatus: result.status } : record)),
      );
    }
  };

  return (
    <ScreenContainer scroll>
      <ThemedText variant="title">Weight Entry</ThemedText>

      <ThemedText variant="subtitle">Estate</ThemedText>
      <View style={styles.list}>
        {estates.map((estate) => (
          <Card key={estate.id} onPress={() => setSelectedEstateId(estate.id)}>
            <ThemedText variant="bodyMedium">{estate.name}</ThemedText>
            {selectedEstateId === estate.id && <ThemedText color="primary">Selected</ThemedText>}
          </Card>
        ))}
      </View>

      <TextField
        label="Weight (kg)"
        placeholder="Weight in kg"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
      />

      {error && <ThemedText color="destructive">{error}</ThemedText>}

      <Button label="Save Record" onPress={handleSave} disabled={!canSave} />

      <ThemedText variant="subtitle">Today&apos;s records</ThemedText>
      <View style={styles.list}>
        {records.map((record) => (
          <Card key={record.id}>
            <ThemedText variant="bodyMedium">{`${record.estateName}: ${record.actualWeightKg} kg`}</ThemedText>
            {record.ownerConfirmed ? (
              <ThemedText color="primary">Confirmed by owner</ThemedText>
            ) : (
              <Button label="Owner Confirm" variant="outline" onPress={() => handleConfirmOwner(record.id)} />
            )}
            {record.evidenceStatus === 'none' && (
              <Button label="Add Evidence Photo" variant="outline" onPress={() => handleCaptureEvidence(record.id)} />
            )}
            {record.evidenceStatus === 'uploaded' && <ThemedText color="primary">Evidence uploaded</ThemedText>}
            {record.evidenceStatus === 'queued_offline' && (
              <ThemedText color="textSecondary">Evidence queued — will upload when back online</ThemedText>
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
});
