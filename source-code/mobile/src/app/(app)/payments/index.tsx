import { GeneratePaymentScreen } from '@/features/payments/GeneratePaymentScreen';
import { PaymentStatementsScreen } from '@/features/payments/PaymentStatementsScreen';
import { useAuthStore } from '@/store/authStore';

export default function PaymentsIndexRoute() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  if (user.role === 'factory_admin') {
    return <GeneratePaymentScreen />;
  }

  if (user.role === 'estate_owner') {
    return <PaymentStatementsScreen />;
  }

  return null;
}
