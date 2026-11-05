import { Pressable, StyleSheet, View } from "react-native";

import AppText from "@/components/ui/AppText";
import { colors, spacing } from "@/theme";

interface SectionHeaderProps {
  title: string;
  count?: number;
  onViewAll?: () => void;
}

export default function SectionHeader({
  title,
  count,
  onViewAll,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <AppText variant="subheading" style={styles.title}>
          {title}
        </AppText>

        {typeof count === "number" && (
          <View style={styles.countBadge}>
            <AppText variant="caption" style={styles.countText}>
              {count}
            </AppText>
          </View>
        )}
      </View>

      {onViewAll && (
        <Pressable onPress={onViewAll} hitSlop={8}>
          <AppText variant="label" style={styles.viewAll}>
            View all
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  title: {
    color: colors.text.primary,
  },

  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    color: colors.text.secondary,
    fontWeight: "600",
  },

  viewAll: {
    color: colors.primary,
    fontWeight: "600",
  },
});
