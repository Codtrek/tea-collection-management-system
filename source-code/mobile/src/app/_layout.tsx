// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          title: 'Home',
        }}
      />
      <Stack.Screen 
        name="teacollector/teacollectorMobile" 
        options={{
          title: 'Tea Collector',
        }}
      />
      <Stack.Screen 
        name="auth/signin" 
      />
      <Stack.Screen 
        name="auth/signup" 
      />
      <Stack.Screen 
        name="auth/change-password"
      />
    </Stack>
  );
}