import { Image, StyleSheet, View, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { Screen } from "@/components/ui";
import MobileLoginForm from "@/components/auth/MobileLoginForm";
import BrandLogo from "@/assets/brand/logo&wordmark/png/FullLogoGreen.png";
import { spacing } from "@/theme/spacing";
import { login } from "../services/api/auth.api";
import { useCollectorAuth } from "@/context/CollectorAuthContext";

export default function LogInScreen() {
  const router = useRouter();
  const {
    authenticate,
    beginPasswordChange,
    activateEstateRole,
  } = useCollectorAuth();

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
        await beginPasswordChange(session);
        router.replace("/auth/collector-change-password");
        return;
      }

      await authenticate(session);
      router.replace("/teacollector/teacollectorMobile");
      return;
    }

    // Estate Owner / Estate Manager login
    await persistSession(result.accessToken, result.user);

    switch (result.user.role) {
      case "Estate Owner":
        await activateEstateRole("Estate Owner");
        router.replace("/(estate-owner)/home");
        return;

      case "Estate Manager":
        await activateEstateRole("Estate Manager");
        router.replace("/estate-manager");
        return;

      default:
        throw new Error("This account does not have a mobile dashboard yet.");
    }
  }

  return (
    <Screen scroll style={styles.screen}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Image source={BrandLogo} style={styles.logo} resizeMode="contain" />
        </View>

        <MobileLoginForm onSubmit={handleLogIn} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    width: "100%",
    maxWidth: "100%",
    backgroundColor: "transparent",
    paddingTop: spacing.xl,
    paddingBottom: 40,
  },

  page: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: 28,
    width: "100%",
  },

  logo: {
    width: 178,
    height: 38,
    marginBottom: 20,
  },
});
