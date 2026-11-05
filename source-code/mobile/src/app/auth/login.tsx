import { useState } from "react";
import { Image, StyleSheet, View, Pressable, Platform } from "react-native";
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
import BrandLogo from "@/assets/brand/logo&wordmark/png/FullLogoGreen.png";
import { getErrorMessages } from "../services/api/client";
import {
  getPhoneNumberError,
  getPhoneNumberResponseError,
} from "@/utils/phoneValidation";

type LoginFieldErrors = {
  phoneNumber?: string;
  password?: string;
};

export default function LogInScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
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

    setFormError("");
    setFieldErrors({});

  const validationErrors: LoginFieldErrors = {};
  const phoneError = getPhoneNumberError(phoneNumber);
  if (phoneError) {
    validationErrors.phoneNumber = phoneError;
  }
  if (!password) {
    validationErrors.password = "Enter your password.";
  }
  if (Object.keys(validationErrors).length > 0) {
    setFieldErrors(validationErrors);
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
    switch(result.user.role) {
      case "Estate Owner" :
        router.replace("/(estate-owner)/home");
        return;
      case "Estate Manager" :
        router.replace("/estate-manager");
        return;
      default :
        setFormError("This account does not have a mobile dashboard yet.");
    }

  } catch (error) {
    const messages = getErrorMessages(error, "Unable to log in.");
    const nextFieldErrors: LoginFieldErrors = {};
    const formMessages: string[] = [];

    messages.forEach((message) => {
      if (/phone number|account found/i.test(message)) {
        const phoneMessage = getPhoneNumberResponseError(message, "login");
        nextFieldErrors.phoneNumber = [nextFieldErrors.phoneNumber, phoneMessage]
          .filter(Boolean)
          .filter((value, index, values) => values.indexOf(value) === index)
          .join("\n");
      } else if (/password/i.test(message)) {
        nextFieldErrors.password = [nextFieldErrors.password, message]
          .filter(Boolean)
          .join("\n");
      } else {
        formMessages.push(message);
      }
    });

    setFieldErrors(nextFieldErrors);
    setFormError(formMessages.join("\n"));
  } finally {
    setLoading(false);
  }

  }

  return (
    <Screen scroll style={styles.screen}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Image source={BrandLogo} style={styles.logo} resizeMode="contain" />
          <View style={styles.eyebrowRow}>
          </View>
        </View>

        <View style={styles.formCard}>

          <View style={styles.form}>
            <AppInput
              label="Phone number"
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              value={phoneNumber}
              error={fieldErrors.phoneNumber}
              onChangeText={(value) => {
                setPhoneNumber(value);
                setFieldErrors((current) => ({ ...current, phoneNumber: undefined }));
              }}
            />

            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              error={fieldErrors.password}
              onChangeText={(value) => {
                setPassword(value);
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }}
            />

            <Pressable style={styles.forgotPassword}>
              <Link href="/auth/change-password" asChild>
                <AppText variant="bodySmall" style={styles.link}>
                  Forgot password?
                </AppText>
              </Link>
            </Pressable>

            {formError ? (
              <View style={styles.errorBox}>
                <AppText variant="bodySmall" style={styles.error}>
                  {formError}
                </AppText>
              </View>
            ) : null}

            <AppButton
              title="Sign in"
              onPress={handleLogIn}
              loading={loading}
            />
          </View>

          <View style={styles.registerContainer}>
            <AppText variant="bodySmall" style={styles.mutedText}>
              Estate Owner Registration?
            </AppText>
            <Link href="/auth/register" asChild>
              <Pressable>
                <AppText variant="bodySmall" style={styles.link}>
                  Create an account
                </AppText>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    width: "100%",
    maxWidth: "100%",
    backgroundColor: "transparent",
    paddingTop: spacing.xl,
    paddingBottom: 40,
  },

  page: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: 28,
    width: "100%",
  },

  logo: {
    width: 178,
    height: 38,
    marginBottom: 20,
  },

  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 7,
  },

  eyebrow: {
    color: colors.primary,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  title: {
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    color: colors.text.secondary,
    textAlign: "center",
    maxWidth: 300,
  },

  formCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5ECE7",
    shadowColor: "#193322",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  formTitle: {
    color: colors.text.primary,
    marginBottom: 5,
  },

  formSubtitle: {
    color: colors.text.secondary,
    marginBottom: 22,
  },

  form: {
    width: "100%",
  },

  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 20,
  },

  errorBox: {
    backgroundColor: colors.errorBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },

  error: {
    color: colors.error,
  },

  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 22,
  },

  link: {
    color: colors.primary,
    fontWeight: "700",
  },

  mutedText: {
    color: colors.text.secondary,
  },

  footerNote: {
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: 20,
  },
});
