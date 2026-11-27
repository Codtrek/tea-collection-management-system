import { Image, Platform, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui";
import MobileLoginForm from "@/components/auth/MobileLoginForm";
import BrandLogo from "@/assets/brand/logo&wordmark/png/FullLogoGreen.png";
import { spacing } from "@/theme/spacing";
import { loginAgent } from "../services/api/auth.api";
import { useCollectorAuth } from "@/context/CollectorAuthContext";

export default function CollectorLoginScreen() {
  const router = useRouter();
  const { authenticate, beginPasswordChange } = useCollectorAuth();

  async function handleLogin(phoneNumber: string, password: string) {
    const result = await loginAgent(phoneNumber, password);
    const session = { accessToken: result.accessToken, agent: result.agent };

    if (result.mustChangePassword) {
      await beginPasswordChange(session);
      router.replace("/auth/collector-change-password");
      return;
    }

    await authenticate(session);
    router.replace("/teacollector/teacollectorMobile");
  }

  return (
    <Screen
      scroll
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      style={styles.screen}
    >
      <View style={styles.page}>
        <View style={styles.header}>
          <Image source={BrandLogo} style={styles.logo} resizeMode="contain" />
        </View>

        <MobileLoginForm
          onSubmit={handleLogin}
          showRegistration={false}
          forgotPasswordUserType="collection-agent"
        />
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
