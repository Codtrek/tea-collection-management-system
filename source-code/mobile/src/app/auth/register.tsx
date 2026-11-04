import { useState  } from "react";
import { Image, StyleSheet, View, Platform, Pressable } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Link , useRouter} from "expo-router";

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
import BrandLogo from "@/assets/brand/logo&wordmark/png/FullLogoGreen.png";
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
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [NIC, setNIC] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [loading, setLoading] = useState(false);

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

    const validationErrors: RegisterFieldErrors = {};
    const phoneError = getPhoneNumberError(phoneNumber);
    if (phoneError) {
      validationErrors.phoneNumber = phoneError;
    }
    if (!name.trim()) {
      validationErrors.name = "Enter your full name.";
    }
    if (!NIC.trim()) {
      validationErrors.NIC = "Enter your NIC number.";
    } else if (!/^(?:\d{12}|\d{9}[VX])$/.test(NIC.trim())) {
      validationErrors.NIC = "Enter a valid old or new NIC number.";
    }
    if (!password) {
      validationErrors.password = "Create a password.";
    } else if (password.length < 8) {
      validationErrors.password = "Password must be at least 8 characters.";
    }
    if (!confirmPassword) {
      validationErrors.confirmPassword = "Confirm your password.";
    } else if (password !== confirmPassword) {
      validationErrors.confirmPassword = "Passwords do not match.";
    }
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);

      await register(
        name,
        phoneNumber,
        NIC,
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
    <Screen scroll style={styles.screen}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Image source={BrandLogo} style={styles.logo} resizeMode="contain" />
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <AppText variant="caption" style={styles.eyebrow}>
              ESTATE OWNER PROFILE
            </AppText>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.form}>
            <AppInput
              label="Full name"
              placeholder="Eg: Kasun Perera"
              maxLength={32}
              value={name}
              error={fieldErrors.name}
              onChangeText={(value) => {
                setName(value);
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }}
            />

            <AppInput
              label="Phone number"
              placeholder="Eg: 0712345678"
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              error={fieldErrors.phoneNumber}
              onChangeText={(value) => {
                setPhoneNumber(value);
                setFieldErrors((current) => ({ ...current, phoneNumber: undefined }));
              }}
            />

            <AppInput
              label="NIC number"
              placeholder="Eg: 20XXXXXXXXXX or 123456789V"
              keyboardType="default"
              autoCapitalize="characters"
              maxLength={12}
              value={NIC}
              helperText="Use your 12-digit or legacy 9-digit NIC."
              error={fieldErrors.NIC}
              onChangeText={(text) => {
                setNIC(text.toUpperCase());
                setFieldErrors((current) => ({ ...current, NIC: undefined }));
              }}
            />

            <PasswordInput
              label="Password"
              placeholder="Create a password"
              value={password}
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
              label="Confirm password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              error={fieldErrors.confirmPassword}
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
            />
          </View>

          <View style={styles.signinContainer}>
            <AppText variant="bodySmall" style={styles.mutedText}>
              Already have an account?
            </AppText>
            <Link href="/auth/login" asChild>
              <Pressable>
                <AppText variant="bodySmall" style={styles.link}>
                  Sign in
                </AppText>
              </Pressable>
            </Link>
          </View>
        </View>

        <AppText variant="caption" style={styles.footerNote}>
          Your information is securely protected.
        </AppText>
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
    paddingBottom: 48,
  },

  page: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },

  header: {
    width: "100%",
    alignItems: "center",
    marginBottom: 28,
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
    maxWidth: 320,
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

  formHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  formTitle: {
    color: colors.text.primary,
    marginBottom: 5,
  },

  formSubtitle: {
    color: colors.text.secondary,
  },

  stepBadge: {
    backgroundColor: "#EAF8EF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 12,
  },

  stepText: {
    color: colors.primary,
    fontWeight: "700",
  },

  form: {
    width: "100%",
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
    marginTop: 22,
  },

  link: {
    color: colors.primary,
    fontWeight: "700",
  },

  mutedText: {
    color: colors.text.secondary,
  },

  terms: {
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 14,
  },

  footerNote: {
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: 20,
  },
});
