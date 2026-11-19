// app/_layout.tsx
import { Stack } from "expo-router";
import { CollectorAuthProvider } from "@/context/CollectorAuthContext";

export default function RootLayout() {
  return (
    <CollectorAuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Home",
          }}
        />
        <Stack.Screen
          name="teacollector"
          options={{
            title: "Tea Collector",
          }}
        />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="auth/change-password" />
      </Stack>
    </CollectorAuthProvider>
  );
}
