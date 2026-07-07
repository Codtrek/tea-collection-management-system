import { ReceivingScreen } from '@/features/collection/ReceivingScreen';
import { WeightEntryScreen } from '@/features/collection/WeightEntryScreen';
import { useAuthStore } from '@/store/authStore';

export default function CollectionIndexRoute() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  if (user.role === 'collector') {
    return <WeightEntryScreen />;
  }

  if (user.role === 'receiving_officer') {
    return <ReceivingScreen />;
  }

  return null;
}
