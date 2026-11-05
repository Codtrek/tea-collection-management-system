import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "@/components/ui/AppText";
import { colors, spacing } from "@/theme";
import type { Estate } from "@/types/estateOwner";

interface EstateListItemProps {
  estate: Estate;
  onPress?: () => void;
}

export default function EstateListItem({
  estate,
  onPress,
}: EstateListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="leaf-outline" size={20} color={colors.primary} />
      </View>

      <View style={styles.body}>
        <AppText variant="body" style={styles.name} numberOfLines={1}>
          {estate.name}
        </AppText>
        <AppText variant="caption" style={styles.meta}>
          {estate.location}
        </AppText>
        <AppText variant="caption" style={styles.meta}>
          {estate.areaAcres} acres · {estate.grade} grade
        </AppText>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.text.tertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 16,
    padding: spacing.md,
  },

  pressed: {
    opacity: 0.7,
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  body: {
    flex: 1,
  },

  name: {
    color: colors.text.primary,
    fontWeight: "600",
  },

  meta: {
    color: colors.text.secondary,
    marginTop: 2,
  },
});
