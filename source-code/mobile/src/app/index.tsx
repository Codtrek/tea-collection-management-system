import { StyleSheet } from "react-native";

import { AppText, AppButton, Screen, AppInput, PasswordInput } from "@/components/ui";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

import HStack from "@/components/layout/Hstack";
import VStack from "@/components/layout/Vstack";

export default function OnboardingScreen() {
  return (
    <Screen style={styles.container}>

      <VStack>
        <AppText style={styles.brandTitle}>Welcome! to Harboost</AppText>
        <AppText style={styles.title}>Sign in to your account</AppText>
        <AppText style={styles.description}>Please sign in to access your account</AppText>
        <AppInput label="Username" helperText="Enter your username"/>
        <PasswordInput label="Password" helperText="Enter your password" />
        <AppButton title="Sign In" onPress={() => {}} />
      </VStack>


    </Screen>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },


  brandTitle: {
    ...typography.heading,
    color: colors.text.primaryGreen,
    textAlign: "center",
  },


  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },


  description: {
    fontSize: 16,
    textAlign: "center",
    color: colors.text.secondary,
  },

});