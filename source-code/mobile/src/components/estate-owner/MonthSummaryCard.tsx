import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "@/components/ui/AppText";
import { colors, spacing } from "@/theme";
import { formatKg, formatLKR } from "@/utils/format";
import type { MonthlySummary } from "@/types/estateOwner";

interface MonthSummaryCardProps {
  summary: MonthlySummary;
}

export default function MonthSummaryCard({ summary }: MonthSummaryCardProps) {
  return (
    <View style={styles.card}>
      <AppText variant="label" style={styles.eyebrow}>
        This month · {summary.month}
      </AppText>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <View style={styles.metricHeader}>
            <Ionicons name="scale-outline" size={16} color={colors.white} />
            <AppText variant="caption" style={styles.metricLabel}>
              Total weight
            </AppText>
          </View>
          <AppText variant="subheading" style={styles.metricValue} numberOfLines={1}>
            {formatKg(summary.totalWeightKg)}
          </AppText>
        </View>

        <View style={styles.divider} />

        <View style={styles.metric}>
          <View style={styles.metricHeader}>
            <Ionicons name="cash-outline" size={16} color={colors.white} />
            <AppText variant="caption" style={styles.metricLabel}>
              Revenue
            </AppText>
          </View>
          <AppText variant="subheading" style={styles.metricValue} numberOfLines={1}>
            {formatLKR(summary.revenue)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: spacing.lg,
    marginTop: spacing.md,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },

  eyebrow: {
    color: colors.white,
    opacity: 0.9,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  metrics: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: spacing.md,
  },

  metric: {
    flex: 1,
  },

  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  metricLabel: {
    color: colors.white,
    opacity: 0.9,
  },

  metricValue: {
    color: colors.white,
    marginTop: spacing.xs,
  },

  divider: {
    width: 1,
    backgroundColor: colors.white,
    opacity: 0.3,
    marginHorizontal: spacing.md,
  },
});
