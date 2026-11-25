import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppInput,
  AppText,
  PasswordInput,
} from "@/components/ui";
import { colors } from "@/theme/colors";
import {
  getPhoneNumberError,
  getPhoneNumberResponseError,
} from "@/utils/phoneValidation";
import { getErrorMessages } from "@/app/services/api/client";

type LoginFieldErrors = {
  phoneNumber?: string;
  password?: string;
};

interface MobileLoginFormProps {
  onSubmit: (phoneNumber: string, password: string) => Promise<void>;
  portalStyle?: boolean;
  submitTitle?: string;
  showForgotPassword?: boolean;
  showRegistration?: boolean;
}

export default function MobileLoginForm({
  onSubmit,
  portalStyle = false,
  submitTitle = "Sign in",
  showForgotPassword = true,
  showRegistration = true,
}: MobileLoginFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  async function handleSubmit() {
    setFormError("");
    setFieldErrors({});

    const validationErrors: LoginFieldErrors = {};
    const normalizedPhoneNumber = phoneNumber.replace(/\s/g, "");
    const phoneError = getPhoneNumberError(normalizedPhoneNumber);
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
      await onSubmit(normalizedPhoneNumber, password);
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
    <View style={styles.form}>
      <AppInput
        floatingLabel={portalStyle}
        compact={portalStyle}
        containerStyle={portalStyle && styles.phoneSpacing}
        autoComplete="username"
        label="Phone number"
        placeholder="077 123 4567"
        placeholderTextColor={colors.text.tertiary}
        keyboardType="phone-pad"
        value={phoneNumber}
        error={fieldErrors.phoneNumber}
        onChangeText={(value) => {
          setPhoneNumber(value);
          setFieldErrors((current) => ({ ...current, phoneNumber: undefined }));
        }}
      />

      <PasswordInput
        floatingLabel={portalStyle}
        compact={portalStyle}
        autoComplete="current-password"
        label="Password"
        placeholder="Enter your password"
        placeholderTextColor={colors.text.tertiary}
        showLockIcon={false}
        value={password}
        visibilityButtonStyle={styles.visibilityButton}
        containerStyle={showForgotPassword ? styles.passwordWithRecovery : undefined}
        error={fieldErrors.password}
        onChangeText={(value) => {
          setPassword(value);
          setFieldErrors((current) => ({ ...current, password: undefined }));
        }}
      />

      {showForgotPassword ? (
        <Link href="/auth/change-password" asChild>
          <Pressable style={StyleSheet.flatten([styles.linkTarget, styles.forgotPassword])}>
            <AppText variant="bodySmall" style={styles.link}>
              Forgot password?
            </AppText>
          </Pressable>
        </Link>
      ) : null}

      {formError ? (
        <View style={styles.errorBox}>
          <AppText variant="bodySmall" style={styles.error}>
            {formError}
          </AppText>
        </View>
      ) : null}

      <AppButton
        title={submitTitle}
        onPress={handleSubmit}
        loading={loading}
        style={portalStyle ? styles.portalButton : undefined}
        labelStyle={portalStyle ? styles.portalButtonLabel : styles.submitLabel}
      />

      {showRegistration ? (
        <Link href="/auth/register" asChild>
          <Pressable style={StyleSheet.flatten([styles.linkTarget, styles.register])}>
            <AppText variant="bodySmall" style={styles.link}>
              Register as an estate owner
            </AppText>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: "100%",
  },

  passwordWithRecovery: {
    marginBottom: 0,
  },

  phoneSpacing: {
    marginBottom: 12,
  },

  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },

  visibilityButton: {
    width: 44,
    height: 44,
  },

  portalButton: {
    backgroundColor: "#1D6839",
    borderRadius: 9,
  },

  portalButtonLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },

  submitLabel: {
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

  linkTarget: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  register: {
    alignSelf: "center",
    marginTop: 16,
  },

  link: {
    color: "#1D6839",
    fontWeight: "700",
  },
});
