import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "@/components/ui/AppText";
import { colors, spacing } from "@/theme";
import { formatKg } from "@/utils/format";
import type { ActiveDelivery, DeliveryStatus } from "@/types/estateOwner";
import StatusPill from "./StatusPill";
import type { PillTone } from "./StatusPill";

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  loading: "Loading",
  in_transit: "In transit",
  at_factory: "At factory",
};

const STATUS_TONES: Record<DeliveryStatus, PillTone> = {
  loading: "neutral",
  in_transit: "primary",
  at_factory: "success",
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

interface DeliveryListItemProps {
  delivery: ActiveDelivery;
  onPress?: () => void;
}

export default function DeliveryListItem({
  delivery,
  onPress,
}: DeliveryListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <AppText variant="body" style={styles.name} numberOfLines={1}>
          {delivery.estateName}
        </AppText>
        <StatusPill
          label={STATUS_LABELS[delivery.status]}
          tone={STATUS_TONES[delivery.status]}
        />
      </View>

      <View style={styles.metaRow}>
        <Meta icon="person-outline" text={delivery.collector} />
        <Meta icon="car-outline" text={delivery.vehicle} />
        <Meta icon="scale-outline" text={formatKg(delivery.weightKg)} />
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
