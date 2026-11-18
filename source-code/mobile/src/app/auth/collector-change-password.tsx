import { useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import {
  AppButton,
  AppText,
  PasswordInput,
  Screen,
} from "@/components/ui";
import { changeAgentPassword } from "../services/api/auth.api";
import { getErrorMessages } from "../services/api/client";
import {
  completeCollectorSession,
  getPendingCollectorSession,
  type CollectorSession,
} from "@/utils/collectorSession";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type PasswordFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function CollectorChangePasswordScreen() {
  const router = useRouter();
  const [session, setSession] = useState<CollectorSession>();
  const [loadingSession, setLoadingSession] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const pendingSession = await getPendingCollectorSession();
        if (active) {
          setSession(pendingSession);
          if (!pendingSession) {
            setFormError("Collector sign-in session expired. Please sign in again.");
          }
        }
      } catch (error) {
        if (active) {
          setFormError(getErrorMessages(error, "Unable to load your sign-in session.").join("\n"));
        }
      } finally {
        if (active) {
          setLoadingSession(false);
        }
      }
    }

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit() {
    setFormError("");
    const nextFieldErrors: PasswordFieldErrors = {};
    if (!currentPassword) {
      nextFieldErrors.currentPassword = "Enter your current password.";
    }
    if (!newPassword) {
      nextFieldErrors.newPassword = "Enter a new password.";
    } else if (newPassword === currentPassword) {
      nextFieldErrors.newPassword =
        "Choose a new password different from the current one.";
    } else if (newPassword.length < 8) {
      nextFieldErrors.newPassword =
        "The new password must be at least 8 characters.";
    } else if (newPassword.length > 72) {
      nextFieldErrors.newPassword =
        "The new password must be no more than 72 characters.";
    }
    if (!confirmPassword) {
      nextFieldErrors.confirmPassword = "Confirm your new password.";
    } else if (confirmPassword !== newPassword) {
      nextFieldErrors.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0 || !session) {
      return;
    }

    setLoading(true);
    try {
      await changeAgentPassword(
        session.accessToken,
        currentPassword,
        newPassword,
      );
    } catch (error) {
      const messages = getErrorMessages(error, "Unable to change password.");
      const fieldMessages: PasswordFieldErrors = {};
      const formMessages: string[] = [];

      messages.forEach((message) => {
        if (/current password/i.test(message)) {
          fieldMessages.currentPassword = message;
        } else if (/new password/i.test(message)) {
          fieldMessages.newPassword = message;
        } else {
          formMessages.push(message);
        }
      });

      setFieldErrors(fieldMessages);
      setFormError(formMessages.join("\n"));
      setLoading(false);
      return;
    }

    try {
      await completeCollectorSession(session);
      router.replace("/teacollector/teacollectorMobile");
    } catch {
      setFormError(
        "Your password was updated, but we couldn't save your session. Please sign in with your new password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll style={styles.container}>
      <View style={styles.header}>
        <AppText variant="heading" style={styles.title}>
          Change temporary password
        </AppText>
        <AppText variant="bodySmall" style={styles.subtitle}>
          Set a new password to continue to your Collector dashboard.
        </AppText>
      </View>

      {loadingSession ? (
        <AppText variant="bodySmall" style={styles.subtitle}>
          Loading your sign-in session...
        </AppText>
      ) : session ? (
        <View style={styles.form}>
          <PasswordInput
            label="Current password"
            placeholder="Enter current password"
            value={currentPassword}
            error={fieldErrors.currentPassword}
            onChangeText={(value) => {
              setCurrentPassword(value);
              setFieldErrors((current) => ({
                ...current,
                currentPassword: undefined,
              }));
            }}
          />
          <PasswordInput
            label="New password"
            placeholder="Enter new password"
            value={newPassword}
            error={fieldErrors.newPassword}
            onChangeText={(value) => {
              setNewPassword(value);
              setFieldErrors((current) => ({
                ...current,
                newPassword: undefined,
                confirmPassword: undefined,
              }));
            }}
          />
          <PasswordInput
            label="Confirm new password"
            placeholder="Confirm new password"
            value={confirmPassword}
            error={fieldErrors.confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setFieldErrors((current) => ({
                ...current,
                confirmPassword: undefined,
              }));
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
            title="Update password"
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      ) : (
        <View style={styles.form}>
          {formError ? (
            <View style={styles.errorBox}>
              <AppText variant="bodySmall" style={styles.error}>
                {formError}
              </AppText>
            </View>
          ) : null}
          <Link href="./collector-login">
            <AppText variant="bodySmall" style={styles.link}>
              Back to Collector sign in
            </AppText>
          </Link>
        </View>
      )}
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

  title: {
    color: colors.text.primaryGreen,
    marginBottom: spacing.xs,
    textAlign: "center",
  },

  subtitle: {
    color: colors.text.secondary,
    textAlign: "center",
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

  link: {
    color: colors.primary,
    fontWeight: "600",
    textAlign: "center",
  },
});
