import { Stack } from 'expo-router';

export default function PaymentsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Payments' }} />
    </Stack>
  );
}
