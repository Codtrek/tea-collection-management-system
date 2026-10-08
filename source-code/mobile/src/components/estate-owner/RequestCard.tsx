import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/components/ui/AppText";
import { colors, spacing } from "@/theme";
import type { RequestItem, RequestStatus } from "@/types/estateOwner";
import StatusPill, { type PillTone } from "./StatusPill";

const STATUS_TONES: Record<RequestStatus, PillTone> = {
  Pending: "warning",
  Accepted: "success",
  "On the way": "primary",
  Completed: "neutral",
};

export function RequestStatusPill({ status }: { status: RequestStatus }) {
  return (
    <StatusPill label={status} tone={STATUS_TONES[status]} />
  );
}

export default function RequestCard({
  request,
  onPress,
}: {
  request: RequestItem;
  onPress: () => void;
}) {
  const isCollection = request.category === "collection";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${isCollection ? "collection" : "fertiliser"} request from ${request.estate}`}
      onPress={onPress}
      style={({ pressed }) => [styles.requestCard, pressed && styles.pressed]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.estateTitle}>
          <View
            style={[
              styles.categoryIcon,
              !isCollection && styles.fertiliserIcon,
            ]}
          >
            <Ionicons
              name={isCollection ? "leaf-outline" : "flask-outline"}
              size={18}
              color={colors.brandDark}
            />
          </View>
          <View style={styles.estateText}>
            <AppText variant="label" style={styles.estateName} numberOfLines={1}>
              {request.estate}
            </AppText>
            <AppText variant="caption" style={styles.requestAbout} numberOfLines={1}>
              {request.about}
            </AppText>
          </View>
        </View>
        <RequestStatusPill status={request.status} />
      </View>

      <View style={styles.cardBottomRow}>
        <View style={styles.cardMeta}>
          <AppText variant="caption" style={styles.metaLabel}>
            Amount
          </AppText>
          <AppText variant="bodySmall" style={styles.amount}>
            {request.amount}
          </AppText>
        </View>
        <View style={[styles.cardMeta, styles.managerMeta]}>
          <AppText variant="caption" style={styles.metaLabel}>
            Manager
          </AppText>
          <AppText variant="bodySmall" style={styles.managerName} numberOfLines={1}>
            {request.manager}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  requestCard: {
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.75,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  estateTitle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.brandSurface,
  },
  fertiliserIcon: {
    backgroundColor: "#F0FDF4",
  },
  estateText: {
    flex: 1,
  },
  estateName: {
    color: colors.text.primary,
  },
  requestAbout: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cardMeta: {
    minWidth: 80,
  },
  managerMeta: {
    flex: 1,
    marginLeft: spacing.md,
  },
  metaLabel: {
    color: colors.text.tertiary,
  },
  amount: {
    color: colors.text.primary,
    marginTop: 2,
  },
  managerName: {
    color: colors.text.primary,
    marginTop: 2,
  },
});