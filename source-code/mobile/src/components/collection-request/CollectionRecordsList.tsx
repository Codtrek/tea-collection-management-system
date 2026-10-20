import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppCard, AppText, Avatar } from "@/components/ui";
import { colors, spacing } from "@/theme";
import type { CollectionRecord } from "@/types/collectionRequest";

interface CollectionRecordsListProps {
  records: CollectionRecord[];
  onEditRecord: (record: CollectionRecord) => void;
}

export function CollectionRecordsList({
  records,
  onEditRecord,
}: CollectionRecordsListProps) {
  return (
    <AppCard>
      <AppText variant="sectionHeading" style={styles.recordsTitle}>
        Collection records
      </AppText>

      {records.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="leaf-outline"
            size={24}
            color={colors.text.tertiary}
          />
          <AppText variant="bodySmall" style={styles.emptyTitle}>
            No collection records yet
          </AppText>
          <AppText variant="caption" style={styles.emptyDescription}>
            Plucker weights will appear here once records are added.
          </AppText>
        </View>
      ) : (
        records.map((record, index) => (
          <Pressable
            key={record.id}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${record.pluckerName}, ${record.weightKg} kilograms`}
            onPress={() => onEditRecord(record)}
            style={[
              styles.recordRow,
              index < records.length - 1 && styles.recordDivider,
            ]}
          >
            <Avatar image={record.image} name={record.pluckerName} size={36} />
            <AppText variant="bodySmall" style={styles.pluckerName}>
              {record.pluckerName}
            </AppText>
            <AppText variant="bodySmall" style={styles.recordWeight}>
              {record.weightKg} kg
            </AppText>
          </Pressable>
        ))
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  recordsTitle: {
    marginBottom: spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontWeight: "600",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    color: colors.text.secondary,
    textAlign: "center",
  },
  recordRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  recordDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  pluckerName: {
    flex: 1,
    color: colors.text.primary,
  },
  recordWeight: {
    color: colors.text.primary,
  },
});
