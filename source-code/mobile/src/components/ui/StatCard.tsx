import { View, StyleSheet, ViewStyle } from "react-native";

import AppText from "./AppText";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

interface AppCardProps {
  title: string;
  subtitle?: string;
  value?: string;
  variant?: "primary" | "surface";
  width?: "full" | "half";
  style?: ViewStyle;
  children?: React.ReactNode;
}

export default function AppCard({
  title,
  subtitle,
  value,
  variant = "surface",
  width = "full",
  style,
  children,
}: AppCardProps) {
  const isPrimary = variant === "primary";

  return (
    <View
      style={[
        styles.container,
        styles[variant],
        styles[width],
        style,
      ]}
    >
      <AppText
        variant="subheading"
        style={[
          styles.title,
          isPrimary && styles.primaryText,
        ]}
      >
        {title}
      </AppText>

      {subtitle && (
        <AppText
          variant="bodySmall"
          style={[
            styles.subtitle,
            isPrimary && styles.primarySubtitle,
          ]}
        >
          {subtitle}
        </AppText>
      )}

      {value && (
        <AppText
          variant="heading"
          style={[
            styles.value,
            isPrimary && styles.primaryText,
          ]}
        >
          {value}
        </AppText>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    padding: spacing.md,
    marginVertical: spacing.sm,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },

  full: {
    width: "100%",
  },

  half: {
    flex: 1,
  },

  primary: {
    backgroundColor: colors.primary,
  },

  surface: {
    backgroundColor: colors.surface,
  },

  title: {
    color: colors.text.primary,
  },

  subtitle: {
    marginTop: spacing.xs,
    color: colors.text.secondary,
  },

  value: {
    marginTop: spacing.md,
    color: colors.text.primary,
  },

  primaryText: {
    color: colors.white,
  },

  primarySubtitle: {
    color: colors.white,
    opacity: 0.9,
  },
});