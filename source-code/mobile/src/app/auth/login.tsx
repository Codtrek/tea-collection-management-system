import { Image, StyleSheet, View, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen } from "@/components/ui";
import MobileLoginForm from "@/components/auth/MobileLoginForm";
import BrandLogo from "@/assets/brand/logo&wordmark/png/FullLogoWhite.png";
import { spacing } from "@/theme/spacing";
import { login } from "../services/api/auth.api";
import { completeCollectorSession, storePendingCollectorSession, } from "@/utils/collectorSession";

export default function LogInScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();

  async function persistSession(accessToken: string, user: object) {
    const serializedUser = JSON.stringify(user);
    if (Platform.OS === "web") {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", serializedUser);
      return;
    }

    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("user", serializedUser);
  }

  async function handleLogIn(phoneNumber: string, password: string) {
    
    const result = await login(phoneNumber, password);

    // Collection Agent login
    if ("agent" in result) {
      const session = {
        accessToken: result.accessToken,
        agent: result.agent,
      };

      if (result.mustChangePassword) {
        await storePendingCollectorSession(session);
        router.replace("./collector-change-password");
        return;
      }

      await completeCollectorSession(session);
      router.replace("/teacollector/teacollectorMobile");
      return;
    }

    // Estate Owner / Estate Manager login
    await persistSession(result.accessToken, result.user);

    switch (result.user.role) {
      case "Estate Owner":
        router.replace("/(estate-owner)/home");
        return;

      case "Estate Manager":
        router.replace("/estate-manager");
        return;

      default:
        throw new Error("This account does not have a mobile dashboard yet.");
    }
  }

  return (
    <Screen
      scroll
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      style={[styles.screen, { paddingTop: top + spacing.xl }]}
    >
      <View style={styles.page}>
        <Image source={BrandLogo} accessibilityLabel="Harboost" style={styles.logo} resizeMode="contain" />
        <View style={styles.card}>
          <MobileLoginForm portalStyle onSubmit={handleLogIn} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    width: "100%",
    maxWidth: "100%",
    backgroundColor: "#103D26",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: spacing.xl,
  },

  page: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: spacing.lg,
    paddingTop: 30,
  },

  logo: {
    width: 198,
    height: 44,
    alignSelf: "center",
    marginBottom: spacing.xl,
  },
});
