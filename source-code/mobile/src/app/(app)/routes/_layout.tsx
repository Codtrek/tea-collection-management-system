import { Stack } from 'expo-router';

export default function RoutesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Routes' }} />
      <Stack.Screen name="new" options={{ title: 'New Route' }} />
      <Stack.Screen name="[id]" options={{ title: 'Route' }} />
    </Stack>
  );
}
