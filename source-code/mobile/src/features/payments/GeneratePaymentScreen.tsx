import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { estateService, factoryService, paymentService, type Estate, type MonthlyPayment } from '@/services';
import { useAuthStore } from '@/store/authStore';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function GeneratePaymentScreen() {
  const user = useAuthStore((state) => state.user);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [month, setMonth] = useState('');
  const [superRate, setSuperRate] = useState('');
  const [normalRate, setNormalRate] = useState('');
  const [transportRate, setTransportRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    estateService.listEstates().then(setEstates);
  }, []);

  useEffect(() => {
    factoryService.listFactories().then((factories) => setFactoryId(factories[0]?.id ?? null));
  }, []);

  useEffect(() => {
    paymentService.listAll().then(setPayments);
  }, []);

  if (!user) return null;

  const superRateValue = Number.parseFloat(superRate);
  const normalRateValue = Number.parseFloat(normalRate);
  const canGenerate =
    selectedEstateId !== null &&
    factoryId !== null &&
    MONTH_PATTERN.test(month) &&
    Number.isFinite(superRateValue) &&
    superRateValue > 0 &&
    Number.isFinite(normalRateValue) &&
    normalRateValue > 0;

  const handleGenerate = async () => {
    const estate = estates.find((candidate) => candidate.id === selectedEstateId);
    if (!estate || !factoryId) return;
    const transportRateValue = Number.parseFloat(transportRate);
    const result = await paymentService.generateForMonth({
      ownerId: estate.ownerId,
      factoryId,
      paymentMonth: month,
      superRatePerKg: superRateValue,
      normalRatePerKg: normalRateValue,
      transportRatePerKg: Number.isFinite(transportRateValue) ? transportRateValue : 0,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setPayments((prev) => [result.payment, ...prev]);
  };

  const handleFinalize = async (id: string) => {
    const result = await paymentService.finalize(id);
    if (result.ok) {
      setPayments((prev) => prev.map((payment) => (payment.id === id ? result.payment : payment)));
    }
  };

  return (
    <ScreenContainer scroll>
      <ThemedText variant="title">Monthly Payments</ThemedText>

      <ThemedText variant="subtitle">Estate</ThemedText>
      <View style={styles.list}>
        {estates.map((estate) => (
          <Card key={estate.id} onPress={() => setSelectedEstateId(estate.id)}>
            <ThemedText variant="bodyMedium">{estate.name}</ThemedText>
            {selectedEstateId === estate.id && <ThemedText color="primary">Selected</ThemedText>}
          </Card>
        ))}
      </View>

      <TextField label="Payment month" placeholder="YYYY-MM" value={month} onChangeText={setMonth} />
      <TextField
        label="Super rate (Rs/kg)"
        placeholder="Super rate per kg"
        value={superRate}
        onChangeText={setSuperRate}
        keyboardType="decimal-pad"
      />
      <TextField
        label="Normal rate (Rs/kg)"
        placeholder="Normal rate per kg"
        value={normalRate}
        onChangeText={setNormalRate}
        keyboardType="decimal-pad"
      />
      <TextField
        label="Transport rate (Rs/kg)"
        placeholder="Transport rate per kg"
        value={transportRate}
        onChangeText={setTransportRate}
        keyboardType="decimal-pad"
      />

      {error && <ThemedText color="destructive">{error}</ThemedText>}

      <Button label="Generate Payment" onPress={handleGenerate} disabled={!canGenerate} />

      <ThemedText variant="subtitle">Generated payments</ThemedText>
      <View style={styles.list}>
        {payments.map((payment) => (
          <Card key={payment.id}>
            <ThemedText variant="bodyMedium">{`${payment.paymentMonth} — Net: Rs ${payment.netAmount}`}</ThemedText>
            <ThemedText color="textSecondary">
              {`Gross: Rs ${payment.grossAmount} | Deductions: Rs ${
                payment.transportCost + payment.fertilizerDeductions + payment.advanceDeductions + payment.bankTransferFee
              }`}
            </ThemedText>
            <ThemedText color="textSecondary">{`Status: ${payment.status}`}</ThemedText>
            {payment.status === 'pending' && (
              <Button label="Finalize" variant="outline" onPress={() => handleFinalize(payment.id)} />
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
