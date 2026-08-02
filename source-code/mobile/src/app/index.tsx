import { useEffect } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Image } from "react-native";

import Screen from "@/components/ui/Screen";
import AppText from "@/components/ui/AppText";

import BrandLogo from "@/assets/brand/logo&wordmark/png/FullLogoGreen.png";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("./(onboarding)");
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Screen style={styles.container}>  
      <Image source={BrandLogo} style={styles.logo} resizeMode="contain"/>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 150,
  }
});