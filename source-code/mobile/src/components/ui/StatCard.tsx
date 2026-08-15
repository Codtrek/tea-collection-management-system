import { View, StyleSheet, ViewStyle } from "react-native";
import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

import AppText from "./AppText";
import { colors, typography } from "@/theme";
import { spacing } from "@/theme/spacing";

const CARD_GAP = spacing.sm;
const HORIZONTAL_PADDING = spacing.lg; // Parent container's horizontal padding

interface StatCardProps {
  title: string;
  subtitle?: string;
  value1?: string;
  value2?: string;
  variant?: "primary" | "surface";
  width?: "full" | "half";
  style?: ViewStyle;
  children?: React.ReactNode;
}

export default function StatCard({
  title,
  subtitle,
  value1,
  value2,
  variant = "surface",
  width = "full",
  style,
  children,
}: StatCardProps) {
  const isPrimary = variant === "primary";
  const isHalfWidth = width === "half";

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
        variant={isHalfWidth ? "caption" : "label"}
        style={[
          styles.title,
          isPrimary && styles.primaryText,
        ]}
      >
        {title}
      </AppText>

      {subtitle && (
        <AppText
          variant={isHalfWidth ? "caption" : "bodySmall"}
          style={[
            styles.subtitle,
            isPrimary && styles.primarySubtitle,
          ]}
        >
          {subtitle}
        </AppText>
      )}

      {value1 && (
        <AppText
          variant={isHalfWidth ? "label" : "heading"}
          style={[
            styles.value,
            isPrimary && styles.primaryText,
          ]}
        >
          {value1}
        </AppText>
      )}

      {value2 && (
        <AppText
          variant={isHalfWidth ? "bodySmall" : "label"}
          style={[
            styles.value,
            isPrimary && styles.secondaryText,
          ]}
        >
          {value2}
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
    width: 200,
    height: 140,
  },

  primary: {
    backgroundColor: colors.black,
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

  secondaryText: {
    color: colors.primary,
  },

  primarySubtitle: {
    color: colors.white,
    opacity: 0.9,
  },
});