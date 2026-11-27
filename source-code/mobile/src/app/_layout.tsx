// app/_layout.tsx
import { Stack } from "expo-router";
import { CollectorAuthProvider } from "@/context/CollectorAuthContext";
import { PasswordRecoveryProvider } from "@/context/PasswordRecoveryContext";

export default function RootLayout() {
  return (
    <CollectorAuthProvider>
      <PasswordRecoveryProvider>
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
          <Stack.Screen name="auth/collector-login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="auth/change-password" />
          <Stack.Screen name="auth/forgot-password" />
          <Stack.Screen name="auth/verify-otp" />
          <Stack.Screen name="auth/reset-password" />
        </Stack>
      </PasswordRecoveryProvider>
    </CollectorAuthProvider>
  );
}
