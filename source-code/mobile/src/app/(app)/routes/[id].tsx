import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { RouteDetailScreen } from '@/features/routes/RouteDetailScreen';
import { routeService, type Route } from '@/services';

export default function RouteDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null | undefined>(undefined);

  useEffect(() => {
    routeService.getRouteById(id).then(setRoute);
  }, [id]);

  if (route === undefined) return null;

  if (route === null) {
    return (
      <ScreenContainer>
        <EmptyState icon="alert-circle-outline" title="Route not found" />
      </ScreenContainer>
    );
  }

  return <RouteDetailScreen route={route} />;
}
