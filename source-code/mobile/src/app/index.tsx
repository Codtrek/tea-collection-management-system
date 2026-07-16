import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, AppButton, Screen } from "@/components/ui";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export default function OnboardingScreen() {
  return (
    <>
      <Screen style={styles.content}>
        <AppText variant="heading" style={styles.brandTitle}>Harboost</AppText>
      </Screen>
    </>
  )
}

const styles =StyleSheet.create({
  brandTitle: {
    ...typography.heading,
    color: colors.text.primaryGreen,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  }
})
