import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import PasswordRecoveryHeader from "@/components/auth/PasswordRecoveryHeader";
import { AppButton, AppText, Screen } from "@/components/ui";
import { usePasswordRecovery } from "@/context/PasswordRecoveryContext";
import { colors, spacing } from "@/theme";

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { phoneNumber } = usePasswordRecovery();
  const otpInputRef = useRef<TextInput>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpFocused, setOtpFocused] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (countdown === 0) {
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function handleVerify() {
    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Enter the 6-digit verification code.");
      return;
    }

    setOtpError("");
    // Temporary UI mock: accept any six-digit code until an OTP API is added.
    router.push("/auth/reset-password");
  }

  function handleResend() {
    if (countdown > 0) {
      return;
    }

    // Temporary UI mock: restart the timer without sending an SMS.
    setCountdown(60);
    setResendMessage("Demo only: a new code has not been sent.");
  }

  if (!phoneNumber) {
    return (
      <Screen style={styles.container}>
        <View style={styles.page}>
          <PasswordRecoveryHeader
            title="Verify your number"
            subtitle="Start a password recovery request first."
          />
          <AppButton
            title="Back to forgot password"
            onPress={() => router.replace("/auth/forgot-password")}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll style={styles.container}>
      <View style={styles.page}>
        <PasswordRecoveryHeader
          title="Verify your number"
          subtitle={`Enter the 6-digit code sent to ${phoneNumber}.`}
        />

        <View style={styles.otpField}>
          <AppText variant="bodySmall" style={styles.otpLabel}>
            Verification code
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Verification code, ${otp.length} of 6 digits entered`}
            onPress={() => otpInputRef.current?.focus()}
            style={styles.otpBoxes}
          >
            {Array.from({ length: 6 }, (_, index) => {
              const isActive = otpFocused && index === Math.min(otp.length, 5);
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    isActive && styles.otpBoxFocused,
                    otpError ? styles.otpBoxError : undefined,
                  ]}
                >
                  <AppText variant="heading" style={styles.otpDigit}>
                    {otp[index] ?? ""}
                  </AppText>
                </View>
              );
            })}
            <TextInput
              ref={otpInputRef}
              accessibilityLabel="Enter 6-digit verification code"
              autoComplete="one-time-code"
              caretHidden
              keyboardType="number-pad"
              maxLength={6}
              onBlur={() => setOtpFocused(false)}
              onChangeText={(value) => {
                setOtp(value.replace(/\D/g, "").slice(0, 6));
                setOtpError("");
              }}
              onFocus={() => setOtpFocused(true)}
              pointerEvents="none"
              style={styles.otpInput}
              textContentType="oneTimeCode"
              value={otp}
            />
          </Pressable>
          {otpError ? (
            <AppText variant="bodySmall" style={styles.otpError}>
              {otpError}
            </AppText>
          ) : null}
        </View>



        <AppButton title="Verify OTP" onPress={handleVerify} />

        <View style={styles.resendRow}>
          <AppText variant="bodySmall" style={styles.mutedText}>
            {countdown > 0
              ? `Resend code in ${formatCountdown(countdown)}`
              : "Didn't receive a code?"}
          </AppText>
          {countdown === 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleResend}
              style={styles.resendButton}
            >
              <AppText variant="bodySmall" style={styles.link}>
                Resend OTP
              </AppText>
            </Pressable>
          ) : null}
        </View>
        {resendMessage ? (
          <AppText variant="bodySmall" style={styles.resendMessage}>
            {resendMessage}
          </AppText>
        ) : null}
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
  page: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  otpField: {
    width: "100%",
    marginBottom: 18,
  },
  otpLabel: {
    color: colors.text.primary,
    fontWeight: "600",
    marginBottom: 7,
  },
  otpBoxes: {
    position: "relative",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
  },
  otpBox: {
    flex: 1,
    maxWidth: 54,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  otpBoxFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.brandSurface,
  },
  otpBoxError: {
    borderColor: colors.error,
    backgroundColor: "#FFF8F8",
  },
  otpDigit: {
    color: colors.text.primary,
  },
  otpInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
  },
  otpError: {
    color: colors.error,
    marginTop: 6,
  },
  mockNotice: {
    color: colors.text.secondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  resendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  mutedText: {
    color: colors.text.secondary,
  },
  resendButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
  },
  resendMessage: {
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
