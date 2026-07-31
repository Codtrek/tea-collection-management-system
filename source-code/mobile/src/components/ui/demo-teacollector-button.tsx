import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";

import { colors } from "@/theme/colors";

interface BtnProps {
  variant?: "primary" | "secondary" | "danger" | "navigation";
  small?: boolean;
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Btn = ({
  variant = "primary",
  small = false,
  block = false,
  disabled = false,
  loading = false,
  children,
  onPress,
  style,
  textStyle,
}: BtnProps) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : onPress}
      activeOpacity={0.85}
      disabled={isDisabled}
      style={[
        styles.container,

        small ? styles.small : styles.regular,

        block && styles.block,

        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        variant === "navigation" && styles.navigation,

        isDisabled && styles.disabled,

        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "secondary" || variant === "navigation"
              ? colors.primary
              : colors.white
          }
        />
      ) : (
        <Text
          style={[
            styles.text,

            variant === "secondary" && styles.secondaryText,
            variant === "danger" && styles.dangerText,
            variant === "navigation" && styles.navigationText,

            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  regular: {
    height: 52,
  },

  small: {
    height: 40,
    paddingHorizontal: 16,
  },

  block: {
    width: "100%",
  },

  /* =========================
     PRIMARY
  ========================= */

  primary: {
    backgroundColor: colors.primary,
  },

  /* =========================
     SECONDARY
  ========================= */

  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  /* =========================
     DANGER / DECLINE
  ========================= */

  danger: {
    backgroundColor: colors.error,
  },

  /* =========================
     ESTATE NAVIGATION
  ========================= */

  navigation: {
    backgroundColor: colors.successBackground,
    borderWidth: 1.5,
    borderColor: colors.success,
  },

  /* =========================
     TEXT
  ========================= */

  text: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },

  secondaryText: {
    color: colors.primary,
  },

  dangerText: {
    color: colors.white,
  },

  navigationText: {
    color: colors.success,
  },

  disabled: {
    opacity: 0.5,
  },
});