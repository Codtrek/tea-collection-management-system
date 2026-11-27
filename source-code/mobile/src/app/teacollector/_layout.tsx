import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  CollectorAuthNotice,
  useCollectorAuth,
} from "@/context/CollectorAuthContext";

export default function CollectorLayout() {
  const router = useRouter();
  const { status, restoreSession } = useCollectorAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    } else if (status === "password-change") {
      router.replace("/auth/collector-change-password");
    }
  }, [router, status]);

  if (status === "authenticated") {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      />
    );
  }

  if (status === "unavailable") {
    return (
      <CollectorAuthNotice
        message="Your saved sign-in was kept, but the server could not be reached. Connect and try again."
        onRetry={() => void restoreSession()}
        onSignIn={() => router.replace("/auth/login")}
      />
    );
  }

  return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Checking Collector sign-in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7FAF8",
  },
  loadingText: {
    color: "#52645A",
    fontSize: 15,
  },
});
