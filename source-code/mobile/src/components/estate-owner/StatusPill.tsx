import { StyleSheet, View } from "react-native";

import AppText from "@/components/ui/AppText";
import { colors, spacing } from "@/theme";

export type PillTone =
  | "success"
  | "warning"
  | "error"
  | "primary"
  | "neutral";

interface StatusPillProps {
  label: string;
  tone?: PillTone;
}

const TONES: Record<PillTone, { backgroundColor: string; color: string }> = {
  success: { backgroundColor: colors.successBackground, color: colors.success },
  warning: { backgroundColor: colors.warningBackground, color: colors.warning },
  error: { backgroundColor: colors.errorBackground, color: colors.error },
  primary: { backgroundColor: colors.primary, color: colors.white },
  neutral: { backgroundColor: colors.surface, color: colors.text.secondary },
};

export default function StatusPill({
  label,
  tone = "neutral",
}: StatusPillProps) {
  const toneStyle = TONES[tone];

  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.backgroundColor }]}>
      <AppText variant="caption" style={[styles.text, { color: toneStyle.color }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  text: {
    fontWeight: "600",
  },
});
