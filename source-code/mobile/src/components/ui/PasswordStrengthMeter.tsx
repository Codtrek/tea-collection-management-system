import { StyleSheet, View } from "react-native";

import AppText from "./AppText";
import { colors } from "@/theme/colors";

interface PasswordStrengthMeterProps {
  password: string;
}

const strengthStates = ["Weak", "Fair", "Good", "Strong"];

function getStrength(password: string) {
  const score = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (score <= 1) return { level: 1, label: strengthStates[0], color: colors.error };
  if (score <= 2) return { level: 2, label: strengthStates[1], color: colors.warning };
  if (score <= 4) return { level: 3, label: strengthStates[2], color: colors.primary };
  return { level: 4, label: strengthStates[3], color: colors.success };
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = getStrength(password);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="caption" style={styles.label}>
          Password strength
        </AppText>
        <AppText variant="caption" style={[styles.value, { color: strength.color }]}>
          {strength.label}
        </AppText>
      </View>

      <View style={styles.bar} accessibilityLabel={`Password strength: ${strength.label}`}>
        {strengthStates.map((state, index) => (
          <View
            key={state}
            style={[
              styles.segment,
              index < strength.level && { backgroundColor: strength.color },
              index === strengthStates.length - 1 && styles.lastSegment,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -8,
    marginBottom: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  label: {
    color: colors.text.secondary,
    fontWeight: "600",
  },

  value: {
    fontWeight: "700",
  },

  bar: {
    flexDirection: "row",
    width: "100%",
    height: 5,
    marginBottom: 10,
  },

  segment: {
    flex: 1,
    backgroundColor: colors.border.light,
    borderRadius: 999,
    marginRight: 4,
  },

  lastSegment: {
    marginRight: 0,
  },

});
