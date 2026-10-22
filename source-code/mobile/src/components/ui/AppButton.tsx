
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from "react-native";

import AppText from "./AppText";
import { colors } from "@/theme/colors";

interface AppButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
  width?: "full" | "half" | "auto" | ViewStyle["width"];
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function AppButton({
  title,
  onPress,
  variant = "primary",
  width = "full",
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  const buttonWidth: ViewStyle["width"] =
    width === "full"
      ? "100%"
      : width === "half"
        ? undefined
        : width === "auto"
          ? undefined
          : width;
  const buttonSizingStyle: ViewStyle =
    width === "half" ? { flex: 1, minWidth: 0 } : { width: buttonWidth };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      style={[
        styles.container,
        styles[variant],
        buttonSizingStyle,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <AppText variant="bodySmall">{title}</AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 4,
    maxHeight: 50,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  primary: {
    backgroundColor: colors.primary,
  },

  secondary: {
    backgroundColor: colors.backgroundGray,
  },

  disabled: {
    opacity: 0.5,
  },
});
