import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { collectionService, factoryService, type CollectionRecord, type TeaGrade } from '@/services';
import { useAuthStore } from '@/store/authStore';

export function ReceivingScreen() {
  const user = useAuthStore((state) => state.user);
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [grade, setGrade] = useState<TeaGrade | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    collectionService.listPendingReceiving().then(setRecords);
  }, []);

  useEffect(() => {
    factoryService.listFactories().then((factories) => setFactoryId(factories[0]?.id ?? null));
  }, []);

  if (!user) return null;

  const weightKg = Number.parseFloat(weight);
  const canConfirm =
    receivingId !== null && factoryId !== null && grade !== null && Number.isFinite(weightKg) && weightKg > 0;

  const handleConfirm = async () => {
    if (!receivingId || !factoryId || !grade) return;
    const result = await collectionService.receiveAtFactory({
      collectionRecordId: receivingId,
      receivingOfficerId: user.id,
      factoryId,
      receivedWeightKg: weightKg,
      teaGrade: grade,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setRecords((prev) => prev.filter((record) => record.id !== receivingId));
    setReceivingId(null);
    setWeight('');
    setGrade(null);
    setNotice(
      result.complaint
        ? 'Weight mismatch complaint raised — collected and factory weights differ beyond the threshold.'
        : null,
    );
  };

  return (
    <ScreenContainer scroll>
      <ThemedText variant="title">Tea Receiving</ThemedText>

      {notice && <ThemedText color="destructive">{notice}</ThemedText>}
      {error && <ThemedText color="destructive">{error}</ThemedText>}

      {records.length === 0 && <EmptyState icon="scale-outline" title="No collections awaiting receiving" />}

      <View style={styles.list}>
        {records.map((record) => (
          <Card key={record.id}>
            <ThemedText variant="bodyMedium">{record.estateName}</ThemedText>
            <ThemedText color="textSecondary">{`Collected: ${record.actualWeightKg} kg`}</ThemedText>
            {receivingId !== record.id && <Button label="Receive" onPress={() => setReceivingId(record.id)} />}
            {receivingId === record.id && (
              <View style={styles.list}>
                <TextField
                  label="Factory weight (kg)"
                  placeholder="Weight in kg"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                />
                <ThemedText variant="label" color="textSecondary">
                  Tea grade
                </ThemedText>
                <View style={styles.actions}>
                  <Button
                    label="Super"
                    variant={grade === 'super' ? 'primary' : 'outline'}
                    fullWidth={false}
                    onPress={() => setGrade('super')}
                  />
                  <Button
                    label="Normal"
                    variant={grade === 'normal' ? 'primary' : 'outline'}
                    fullWidth={false}
                    onPress={() => setGrade('normal')}
                  />
                </View>
                <Button label="Confirm Receiving" onPress={handleConfirm} disabled={!canConfirm} />
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
