import { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
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

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSignIn() {
    console.log({
      email,
      password,
    });

    // TODO:
    // Authenticate user
    // router.replace("/teacollector/teacollectorMobile");
  }

  return (
    <Screen scroll style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <AppText variant="heading" style={styles.logoText}>
            🌿
          </AppText>
        </View>

        <AppText variant="heading" style={styles.title}>
          Tea Collection
        </AppText>

        <AppText variant="bodySmall" style={styles.subtitle}>
          Sign in to continue
        </AppText>
      </View>

      <View style={styles.form}>
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
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.forgotPassword}>
          <Link href="/auth/change-password" asChild>
            <AppText variant="bodySmall" style={styles.link}>
              Forgot Password?
            </AppText>
          </Link>
        </Pressable>

        <AppButton
          title="Sign In"
          onPress={handleSignIn}
        />

        <View style={styles.signupContainer}>
          <AppText variant="bodySmall">
            Don't have an account?{" "}
          </AppText>

          <Link href="/auth/signup" asChild>
            <Pressable>
              <AppText
                variant="bodySmall"
                style={styles.link}
              >
                Sign Up
              </AppText>
            </Pressable>
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

  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
    width: "100%",
  },

  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,

    borderWidth: 2,
    borderColor: colors.primary,
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
    marginTop: spacing.lg,
  },

  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: spacing.lg,
  },

  signupContainer: {
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