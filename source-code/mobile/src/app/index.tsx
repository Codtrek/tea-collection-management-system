import { useEffect } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Image } from "react-native";

import Screen from "@/components/ui/Screen";
import BrandLogo from "@/assets/brand/logo&wordmark/png/FullLogoGreen.png";
import {
  CollectorAuthNotice,
  useCollectorAuth,
} from "@/context/CollectorAuthContext";

export default function SplashScreen() {
  const router = useRouter();
  const { status, restoreSession } = useCollectorAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/teacollector/teacollectorMobile");
    } else if (status === "password-change") {
      router.replace("/auth/collector-change-password");
    } else if (status === "unauthenticated") {
      router.replace("./(onboarding)");
    }
  }, [router, status]);

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
    <Screen>
      <Image source={BrandLogo} style={styles.logo} resizeMode="contain" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 150,
  }
});