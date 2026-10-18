import { Text, TextProps, StyleSheet } from "react-native";
import { typography, TypographyVariant } from "@/theme/typography";

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
}

export default function AppText({
  variant = "body",
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles.base,
        typography[variant],
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: "#000000",
  },
});