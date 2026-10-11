import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { colors } from "@/theme/colors";

function RequestStatusPill({ status }: { status: RequestStatus }) {
  const tone = statusColors[status];

  return (
    <View style={[styles.statusPill, { backgroundColor: tone.background }]}>
      <AppText style={[styles.statusText, { color: tone.foreground }]}>
        {status}
      </AppText>
    </View>
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="bodySmall" style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="bodySmall" style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}