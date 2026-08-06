import { useState } from "react";
import { StyleSheet, View, Pressable, Platform} from "react-native";
import { Link, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { login } from "../services/api/auth.api";


import {
  Screen,
  AppText,
  AppInput,
  PasswordInput,
  AppButton,
} from "@/components/ui";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function LogInScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
//this function won't be necessary when running on mobile
  async function persistSession(accessToken: string, user: object) {
    const serializedUser = JSON.stringify(user);
    if (Platform.OS === "web") {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", serializedUser);
      return;
    }

    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("user", serializedUser);
  }

  async function handleLogIn() {
    console.log({
      phoneNumber,
      password,
    });

    setError("");

  if (!phoneNumber || !password) {
    setError("Please enter your phone number and password.");
    return;
  }

  try {
    setLoading(true);

    const result = await login(phoneNumber, password);

    console.log("Logged in user:", result.user);
    console.log("Access token:", result.accessToken);
    console.log(result.user.role);

    await persistSession(result.accessToken, result.user);

    if (result.user.role === "Estate Owner") {
      router.replace("/(estate-owner)/home");
      return;
    }

    setError("This account does not have a mobile dashboard yet.");
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Unable to log in.",
    );
  } finally {
    setLoading(false);
  }

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
          Login Portal
        </AppText>

      </View>

      <View style={styles.form}>
        <AppInput
          label="Phone Number"
          placeholder="Enter your phone number"
          keyboardType="numeric"
          autoCapitalize="none"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
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
          title="Log In"
          onPress={handleLogIn}
        />

        <View style={styles.registerContainer}>
          <AppText variant="bodySmall">
            Don't have an account?{" "}
          </AppText>

          <Link href="/auth/register" asChild>
            <Pressable>
              <AppText
                variant="bodySmall"
                style={styles.link}
              >
                Register
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: Platform.OS === 'web' ? 393 : '100%',
    alignSelf: "center",    
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

  registerContainer: {
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