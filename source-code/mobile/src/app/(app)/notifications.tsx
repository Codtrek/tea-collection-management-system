import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';

export default function Notifications() {
  return (
    <ScreenContainer>
      <EmptyState
        icon="notifications-outline"
        title="No notifications yet"
        description="Route and pickup updates will show up here once connected to the backend."
      />
    </ScreenContainer>
  );
}
