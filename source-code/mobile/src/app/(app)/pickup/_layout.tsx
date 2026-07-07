import { Stack } from 'expo-router';

export default function PickupLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Pickup' }} />
    </Stack>
  );
}
