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
  submitTitle?: string;
  showForgotPassword?: boolean;
  showRegistration?: boolean;
}

export default function MobileLoginForm({
  onSubmit,
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
      await onSubmit(phoneNumber, password);
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

      {showForgotPassword ? (
        <Pressable style={styles.forgotPassword}>
          <Link href="/auth/change-password" asChild>
            <AppText variant="bodySmall" style={styles.link}>
              Forgot password?
            </AppText>
          </Link>
        </Pressable>
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
      />

      {showRegistration ? (
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
