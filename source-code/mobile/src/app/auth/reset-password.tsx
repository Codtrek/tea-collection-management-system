import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import PasswordRecoveryHeader from "@/components/auth/PasswordRecoveryHeader";
import { AppButton, AppText, PasswordInput, Screen } from "@/components/ui";
import { usePasswordRecovery } from "@/context/PasswordRecoveryContext";
import { colors, spacing } from "@/theme";
import { getPasswordRecoveryLoginHref } from "@/utils/passwordRecovery";

interface PasswordErrors {
  newPassword?: string;
  confirmPassword?: string;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { userType, clearRecovery } = usePasswordRecovery();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    },
    [],
  );

  function handleResetPassword() {
    const nextErrors: PasswordErrors = {};
    if (!newPassword) {
      nextErrors.newPassword = "Enter a new password.";
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = "Use at least 8 characters.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your new password.";
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !userType) {
      return;
    }

    // Temporary UI mock: no password is stored or changed by this screen.
    setSuccessMessage("Demo reset complete. Returning to sign in...");
    redirectTimer.current = setTimeout(() => {
      const loginHref = getPasswordRecoveryLoginHref(userType);
      clearRecovery();
      router.replace(loginHref);
    }, 900);
  }

  if (!userType) {
    return (
      <Screen style={styles.container}>
        <View style={styles.page}>
          <PasswordRecoveryHeader
            title="Reset password"
            subtitle="Start a password recovery request first."
          />
          <AppButton
            title="Back to forgot password"
            onPress={() => router.replace("/auth/forgot-password")}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll style={styles.container}>
      <View style={styles.page}>
        <PasswordRecoveryHeader
          title="Create a new password"
          subtitle="Choose a new password for your account."
        />

        <PasswordInput
          label="New password"
          placeholder="Enter new password"
          autoComplete="new-password"
          textContentType="newPassword"
          value={newPassword}
          error={errors.newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            setErrors((current) => ({
              ...current,
              newPassword: undefined,
              confirmPassword: undefined,
            }));
          }}
        />

        <PasswordInput
          label="Confirm new password"
          placeholder="Confirm new password"
          autoComplete="new-password"
          textContentType="newPassword"
          value={confirmPassword}
          error={errors.confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setErrors((current) => ({
              ...current,
              confirmPassword: undefined,
            }));
          }}
        />

        <AppText variant="bodySmall" style={styles.mockNotice}>
          Demo only: this screen does not update your account password.
        </AppText>

        {successMessage ? (
          <AppText variant="bodySmall" style={styles.successMessage}>
            {successMessage}
          </AppText>
        ) : null}

        <AppButton
          title="Reset Password"
          onPress={handleResetPassword}
          disabled={Boolean(successMessage)}
        />
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
  successMessage: {
    color: colors.success,
    marginBottom: spacing.md,
    textAlign: "center",
  },
});
