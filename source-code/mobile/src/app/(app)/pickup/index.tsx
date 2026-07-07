import { useEffect, useState } from 'react';

import { PickupRequestListScreen } from '@/features/pickup/PickupRequestListScreen';
import { PickupRequestScreen } from '@/features/pickup/PickupRequestScreen';
import { estateService } from '@/services';
import { useAuthStore } from '@/store/authStore';

export default function PickupIndexRoute() {
  const user = useAuthStore((state) => state.user);
  const [estateId, setEstateId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'estate_owner') return;
    estateService.listEstates().then((estates) => {
      const owned = estates.find((estate) => estate.ownerId === user.id);
      setEstateId(owned?.id ?? null);
    });
  }, [user]);

  if (!user) return null;

  if (user.role === 'collector') {
    return <PickupRequestListScreen />;
  }

  if (user.role === 'estate_owner' && estateId) {
    return <PickupRequestScreen estateId={estateId} />;
  }

  return null;
}
