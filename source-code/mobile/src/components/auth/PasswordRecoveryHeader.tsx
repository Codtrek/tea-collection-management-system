import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui";
import { colors, spacing } from "@/theme";

interface PasswordRecoveryHeaderProps {
  title: string;
  subtitle: string;
}

export default function PasswordRecoveryHeader({
  title,
  subtitle,
}: PasswordRecoveryHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <AppText variant="heading" style={styles.logoText}>
          🌿
        </AppText>
      </View>
      <AppText variant="heading" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="bodySmall" style={styles.subtitle}>
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  logoText: {
    color: colors.primary,
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
});
