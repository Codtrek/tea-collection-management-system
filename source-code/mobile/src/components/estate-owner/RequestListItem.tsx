import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "@/components/ui/AppText";
import { colors, spacing } from "@/theme";
import { formatKg } from "@/utils/format";
import type { PickupRequest, PickupRequestStatus } from "@/types/estateOwner";
import StatusPill from "./StatusPill";
import type { PillTone } from "./StatusPill";

const STATUS_LABELS: Record<PickupRequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

const STATUS_TONES: Record<PickupRequestStatus, PillTone> = {
  pending: "warning",
  accepted: "success",
  declined: "error",
  expired: "neutral",
};

type IconName = ComponentProps<typeof Ionicons>["name"];

function Meta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={colors.text.tertiary} />
      <AppText variant="caption" style={styles.metaText}>
        {text}
      </AppText>
    </View>
  );
}

interface RequestListItemProps {
  request: PickupRequest;
  onPress?: () => void;
}

export default function RequestListItem({
  request,
  onPress,
}: RequestListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <AppText variant="body" style={styles.name} numberOfLines={1}>
          {request.estateName}
        </AppText>
        <StatusPill
          label={STATUS_LABELS[request.status]}
          tone={STATUS_TONES[request.status]}
        />
      </View>

      <View style={styles.metaRow}>
        <Meta icon="business-outline" text={request.factory} />
        <Meta
          icon="scale-outline"
          text={formatKg(request.estimatedWeightKg)}
        />
        <Meta icon="time-outline" text={request.requestedAt} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 16,
    padding: spacing.md,
  },

  pressed: {
    opacity: 0.7,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  name: {
    flex: 1,
    color: colors.text.primary,
    fontWeight: "600",
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  metaText: {
    color: colors.text.secondary,
  },
});
