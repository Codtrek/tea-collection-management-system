import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Link } from "expo-router";

import {
  Screen,
  AppText,
  PasswordInput,
  AppButton,
} from "@/components/ui";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleChangePassword() {
    console.log({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    // TODO:
    // Call change password API
  }

  return (
    <Screen scroll style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <AppText variant="heading" style={styles.logoText}>
            🌿
          </AppText>
        </View>

        <AppText variant="heading" style={styles.title}>
          Change Password
        </AppText>

        <AppText variant="bodySmall" style={styles.subtitle}>
          Update your account password
        </AppText>
      </View>

      <View style={styles.form}>
        <PasswordInput
          label="Current Password"
          placeholder="Enter current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <PasswordInput
          label="New Password"
          placeholder="Enter new password"
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <PasswordInput
          label="Confirm New Password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <AppButton
          title="Update Password"
          onPress={handleChangePassword}
        />

        <View style={styles.signinContainer}>
          <AppText variant="bodySmall">
            Remember your password?{" "}
          </AppText>

          <Link href="/auth/signin">
            <AppText
              variant="bodySmall"
              style={styles.link}
            >
              Back to Sign In
            </AppText>
          </Link>
        </View>
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

  header: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },

  logoText: {
    color: colors.primary,
  },

  title: {
    color: colors.text.primaryGreen,
    marginBottom: spacing.xs,
  },

  subtitle: {
    color: colors.text.secondary,
  },

  form: {
    width: "100%",
  },

  signinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
  },

  link: {
    color: colors.primary,
    fontWeight: "600",
  },
});