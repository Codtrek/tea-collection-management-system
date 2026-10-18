import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Link } from "expo-router";

import {
  Screen,
  AppText,
  AppInput,
  PasswordInput,
  AppButton,
} from "@/components/ui";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSignUp() {
    console.log({
      name,
      email,
      password,
      confirmPassword,
    });

    // TODO:
    // Add signup API logic here
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
          Create Account
        </AppText>

        <AppText variant="bodySmall" style={styles.subtitle}>
          Sign up to get started
        </AppText>
      </View>

      <View style={styles.form}>
        <AppInput
          label="Full Name"
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
        />

        <AppInput
          label="Email"
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <PasswordInput
          label="Password"
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <AppButton
          title="Sign Up"
          onPress={handleSignUp}
        />

        <View style={styles.signinContainer}>
          <AppText variant="bodySmall">
            Already have an account?{" "}
          </AppText>

          <Link href="/auth/signin">
            <AppText
              variant="bodySmall"
              style={styles.link}
            >
              Sign In
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