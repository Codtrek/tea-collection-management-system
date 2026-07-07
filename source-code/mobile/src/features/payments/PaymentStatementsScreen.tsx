import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { paymentService, type MonthlyPayment } from '@/services';
import { useAuthStore } from '@/store/authStore';

export function PaymentStatementsScreen() {
  const user = useAuthStore((state) => state.user);
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);

  useEffect(() => {
    if (!user) return;
    paymentService.listForOwner(user.id).then(setPayments);
  }, [user]);

  if (!user) return null;

  return (
    <ScreenContainer scroll>
      <ThemedText variant="title">Payment Statements</ThemedText>

      {payments.length === 0 && <EmptyState icon="document-text-outline" title="No payment statements yet" />}

      <View style={styles.list}>
        {payments.map((payment) => (
          <Card key={payment.id}>
            <ThemedText variant="bodyMedium">{payment.paymentMonth}</ThemedText>
            <ThemedText color="textSecondary">{`Super: ${payment.superWeightKg} kg | Normal: ${payment.normalWeightKg} kg`}</ThemedText>
            <ThemedText color="textSecondary">
              {`Gross: Rs ${payment.grossAmount} | Deductions: Rs ${
                payment.transportCost + payment.fertilizerDeductions + payment.advanceDeductions + payment.bankTransferFee
              }`}
            </ThemedText>
            <ThemedText variant="bodyMedium">{`Net: Rs ${payment.netAmount}`}</ThemedText>
            <ThemedText color="primary">{`Status: ${payment.status}`}</ThemedText>
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
