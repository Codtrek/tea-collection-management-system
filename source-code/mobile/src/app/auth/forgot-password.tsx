import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import PasswordRecoveryHeader from "@/components/auth/PasswordRecoveryHeader";
import { AppButton, AppInput, AppText, Screen } from "@/components/ui";
import { usePasswordRecovery } from "@/context/PasswordRecoveryContext";
import { colors, spacing } from "@/theme";
import { getPhoneNumberError } from "@/utils/phoneValidation";
import {
  getPasswordRecoveryLoginHref,
  isPasswordRecoveryUserType,
} from "@/utils/passwordRecovery";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { userType: userTypeParam } = useLocalSearchParams<{
    userType?: string;
  }>();
  const initialUserType = isPasswordRecoveryUserType(userTypeParam)
    ? userTypeParam
    : "estate-owner";
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const { startRecovery } = usePasswordRecovery();

  function handleSendOtp() {
    const error = getPhoneNumberError(phoneNumber);
    setPhoneError(error ?? "");
    if (error) {
      return;
    }

    startRecovery(initialUserType, phoneNumber.trim());
    router.push("/auth/verify-otp");
  }

  return (
    <Screen scroll style={styles.container}>
      <View style={styles.page}>
        <PasswordRecoveryHeader
          title="Forgot password?"
          subtitle="Enter your mobile number to receive a verification code."
        />

        <AppInput
          label="Mobile number"
          placeholder="Enter your 10-digit mobile number"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={10}
          value={phoneNumber}
          error={phoneError}
          onChangeText={(value) => {
            setPhoneNumber(value.replace(/\D/g, ""));
            setPhoneError("");
          }}
        />



        <AppButton title="Send OTP" onPress={handleSendOtp} />

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.replace(getPasswordRecoveryLoginHref(initialUserType))
          }
          style={styles.backLink}
        >
          <AppText variant="bodySmall" style={styles.link}>
            Back to sign in
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingVertical: spacing.xl,
  },
  page: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  mockNotice: {
    color: colors.text.secondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  backLink: {
    alignSelf: "center",
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
  },
});
