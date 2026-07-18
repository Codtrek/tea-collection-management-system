import { StyleSheet } from "react-native";

import { AppText, AppButton, Screen } from "@/components/ui";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

import HStack from "@/components/layout/Hstack";
import VStack from "@/components/layout/Vstack";

export default function OnboardingScreen() {
  return (
    <Screen style={styles.container}>

      <VStack spacing={20}>

        {/* App name */}
        <AppText
          variant="heading"
          style={styles.brandTitle}
        >
          Harboost
        </AppText>


        {/* Welcome message */}
        <VStack spacing={8}>

          <AppText style={styles.title}>
            Welcome to TestingPage
          </AppText>

          <AppText style={styles.description}>
            Manage your tea collection easily and efficiently
          </AppText>

        </VStack>


        {/* Buttons */}
        <HStack spacing={16}>

          <AppButton
            title="Login"
            width="half"
            onPress={() => console.log("Login pressed")}
          />

          <AppButton
            title="Register"
            width="half"
            variant="secondary"
            onPress={() => console.log("Register pressed")}
          />

        </HStack>


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