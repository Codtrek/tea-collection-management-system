import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, View } from "react-native";

import AppText from "@/components/ui/AppText";
import { colors, spacing } from "@/theme";

interface EstateCardProps {
  imageSrc: string;
  name: string;
  location: string;
  managerName: string;
  areaAcres: number;
  grade: string;
  onPress?: () => void;
}

export default function EstateCard({
  imageSrc,
  name,
  location,
  managerName,
  areaAcres,
  grade,
  onPress,
}: EstateCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageSrc }} style={styles.image} />
        <View style={styles.gradeBadge}>
          <Ionicons name="leaf" size={14} color={colors.primary} />
          <AppText variant="caption" style={styles.gradeText} numberOfLines={1}>
            {grade}
          </AppText>
        </View>
      </View>

      <View style={styles.content}>
        <AppText variant="subheading" style={styles.name} numberOfLines={1}>
          {name}
        </AppText>

        <View style={styles.detailRow}>
          <Ionicons
            name="location-outline"
            size={16}
            color={colors.text.secondary}
          />
          <AppText variant="bodySmall" style={styles.detailText} numberOfLines={1}>
            {location}
          </AppText>
        </View>

        <View style={styles.managerRow}>
          <View style={styles.managerInfo}>
            <Ionicons
              name="person-outline"
              size={16}
              color={colors.text.secondary}
            />
            <AppText
              variant="bodySmall"
              style={styles.detailText}
              numberOfLines={1}
            >
              {managerName}
            </AppText>
          </View>

          {onPress ? (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.text.tertiary}
            />
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.areaRow}>
          <Ionicons name="expand-outline" size={15} color={colors.primary} />
          <AppText variant="caption" style={styles.areaText}>
            {areaAcres} acres
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 18,
    marginVertical: spacing.sm,
    shadowColor: "#102516",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  pressed: {
    opacity: 0.92,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 150,
    backgroundColor: colors.surface,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradeBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  gradeText: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  content: {
    padding: spacing.md,
  },
  name: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  detailText: {
    flex: 1,
    minWidth: 0,
    color: colors.text.secondary,
  },
  managerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  managerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
    marginVertical: spacing.sm,
  },
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  areaText: {
    color: colors.text.secondary,
    fontWeight: "600",
  },
});
