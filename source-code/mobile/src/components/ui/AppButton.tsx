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
  onPress: () => void;
  variant?: "primary" | "secondary";
  width?: "full" | "half";
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

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.container,
        styles[variant],
        styles[width],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <AppText
          variant="body"
          style={[
            styles.text,
            variant === "secondary" && styles.secondaryText,
          ]}
        >
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
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

  secondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  text: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  secondaryText: {
    color: colors.primary,
  },

  disabled: {
    opacity: 0.5,
  },
});