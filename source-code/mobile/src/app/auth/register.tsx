import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { Image, StyleSheet, View, Platform, Pressable } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Link, useRouter } from "expo-router";

import {
  Screen,
  AppText,
  AppInput,
  PasswordInput,
  PasswordStrengthMeter,
  AppButton,
} from "@/components/ui";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { register } from "../services/api/auth.api";
import { getErrorMessages } from "../services/api/client";
import BrandLogo from "@/assets/brand/logo&wordmark/png/FullLogoWhite.png";
import {
  getPhoneNumberError,
  getPhoneNumberResponseError,
} from "@/utils/phoneValidation";

type RegisterFieldErrors = {
  name?: string;
  phoneNumber?: string;
  NIC?: string;
  password?: string;
  confirmPassword?: string;
};

export default function SignUpScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [NIC, setNIC] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const passwordsMismatch = confirmPassword !== "" && confirmPassword !== password;

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
  async function handleRegister() {
    setFormError("");
    setFieldErrors({});
    setConfirmPasswordTouched(true);

    const normalizedPhoneNumber = phoneNumber.replace(/\s/g, "");
    const normalizedNIC = NIC.trim().toUpperCase();
    const validationErrors: RegisterFieldErrors = {};
    const phoneError = getPhoneNumberError(normalizedPhoneNumber);
    if (phoneError) {
      validationErrors.phoneNumber = phoneError;
    }
    if (!name.trim()) {
      validationErrors.name = "Enter your full name.";
    }
    if (!normalizedNIC) {
      validationErrors.NIC = "Enter your NIC number.";
    } else if (!/^(?:\d{12}|\d{9}[VX])$/.test(normalizedNIC)) {
      validationErrors.NIC = "Enter a valid old or new NIC number.";
    }
    if (!password) {
      validationErrors.password = "Create a password.";
    } else if (password.length < 8) {
      validationErrors.password = "Password must be at least 8 characters.";
    }
    if (!confirmPassword) {
      validationErrors.confirmPassword = "Confirm your password.";
    }
    if (passwordsMismatch || Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);

      await register(
        name,
        normalizedPhoneNumber,
        normalizedNIC,
        password,
        confirmPassword
      );

      router.replace("/(estate-owner)/home");

      // TODO:
      // Navigate to login or show success message
    } catch (error) {
      const messages = getErrorMessages(error, "Unable to register.");
      const nextFieldErrors: RegisterFieldErrors = {};
      const formMessages: string[] = [];

      messages.forEach((message) => {
        const normalizedMessage = message.toLowerCase();
        let field: keyof RegisterFieldErrors | undefined;

        if (/phone/.test(normalizedMessage)) {
          field = "phoneNumber";
        } else if (/nic/.test(normalizedMessage)) {
          field = "NIC";
        } else if (/confirm.?password|match/.test(normalizedMessage)) {
          field = "confirmPassword";
        } else if (/password/.test(normalizedMessage)) {
          field = "password";
        } else if (/name/.test(normalizedMessage)) {
          field = "name";
        }

        if (field) {
          const fieldMessage = field === "phoneNumber"
            ? getPhoneNumberResponseError(message, "register")
            : message;
          nextFieldErrors[field] = [nextFieldErrors[field], fieldMessage]
            .filter(Boolean)
            .filter((value, index, values) => values.indexOf(value) === index)
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
    <Screen
      scroll
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      style={[styles.screen, { paddingTop: top + spacing.lg, paddingBottom: bottom + spacing.lg }]}
    >
      <View style={styles.page}>
        <Image source={BrandLogo} accessibilityLabel="Harboost" style={styles.logo} resizeMode="contain" />
        <View style={styles.card}>


          <AppInput
            floatingLabel
            placeholderTextColor={colors.text.tertiary}
            label="Full name"
            placeholder="Kasun Perera"
            autoComplete="name"
            textContentType="name"
            maxLength={32}
            value={name}
            error={fieldErrors.name}
            onChangeText={(value) => {
              setName(value);
              setFieldErrors((current) => ({ ...current, name: undefined }));
            }}
          />

          <AppInput
            floatingLabel
            placeholderTextColor={colors.text.tertiary}
            label="Phone number"
            placeholder="077 123 4567"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            value={phoneNumber}
            error={fieldErrors.phoneNumber}
            onChangeText={(value) => {
              setPhoneNumber(value);
              setFieldErrors((current) => ({ ...current, phoneNumber: undefined }));
            }}
          />

          <AppInput
            floatingLabel
            placeholderTextColor={colors.text.tertiary}
            label="NIC number"
            placeholder="Enter your NIC"
            keyboardType="default"
            autoCapitalize="characters"
            value={NIC}
            helperText="Enter 12 digits, or 9 digits followed by V or X."
            helperTextStyle={styles.helperText}
            error={fieldErrors.NIC}
            onChangeText={(text) => {
              setNIC(text.toUpperCase());
              setFieldErrors((current) => ({ ...current, NIC: undefined }));
            }}
          />

          <PasswordInput
            floatingLabel
            showLockIcon={false}
            placeholderTextColor={colors.text.tertiary}
            label="Password"
            placeholder="Create a password"
            autoComplete="new-password"
            textContentType="newPassword"
            value={password}
            helperText="At least 8 characters"
            helperTextStyle={styles.helperText}
            error={fieldErrors.password}
            onChangeText={(value) => {
              setPassword(value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />

          {passwordFocused ? <PasswordStrengthMeter password={password} /> : null}

          <PasswordInput
            floatingLabel
            showLockIcon={false}
            placeholderTextColor={colors.text.tertiary}
            label="Confirm password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            textContentType="newPassword"
            value={confirmPassword}
            error={fieldErrors.confirmPassword ?? (
              confirmPasswordTouched && passwordsMismatch ? "Passwords do not match" : undefined
            )}
            onBlur={() => {
              if (confirmPassword) setConfirmPasswordTouched(true);
            }}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
            }}
          />

          {formError ? (
            <View style={styles.errorBox}>
              <AppText variant="bodySmall" style={styles.error}>
                {formError}
              </AppText>
            </View>
          ) : null}

          <AppButton
            title="Create account"
            onPress={handleRegister}
            loading={loading}
            style={styles.submitButton}
            labelStyle={styles.submitLabel}
          />

          <View style={styles.signinContainer}>
            <AppText variant="bodySmall" style={styles.mutedText}>
              Already have an account?
            </AppText>
            <Link href="/auth/login" asChild>
              <Pressable style={styles.signinLink}>
                <AppText variant="bodySmall" style={styles.link}>
                  Sign in
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
    backgroundColor: "#103D26",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  page: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: spacing.lg,
  },

  logo: {
    width: 198,
    height: 44,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },

  title: {
    color: colors.text.primary,
    marginBottom: spacing.lg,
    fontSize: 28,
    lineHeight: 34,
    width: "100%",
  },

  helperText: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },

  submitButton: {
    backgroundColor: "#1D6839",
    borderRadius: 9,
  },

  submitLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
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

  signinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 12,
  },

  signinLink: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },

  link: {
    color: "#1D6839",
    fontWeight: "700",
  },

  mutedText: {
    color: colors.text.secondary,
  },

});
