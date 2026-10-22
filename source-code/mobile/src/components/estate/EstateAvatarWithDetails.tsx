import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText, Avatar } from "@/components/ui";
import { colors } from "@/theme";

interface EstateAvatarWithDetailsProps {
  name: string;
  address: string;
  area: string;
  image: string;
  size?: number;
  compact?: boolean;
}

export default function EstateAvatarWithDetails({
  name,
  address,
  area,
  image,
  size = 80,
  compact = false,
}: EstateAvatarWithDetailsProps) {
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <Avatar image={image} size={size} />
      <View style={styles.detailsContainer}>
        <AppText
          variant={compact ? "bodySmall" : "sectionHeading"}
          style={styles.name}
          numberOfLines={1}
        >
          {name}
        </AppText>
        <View style={styles.detailRow}>
          {compact ? (
            <Ionicons
              name="location-outline"
              size={12}
              color={colors.text.secondary}
            />
          ) : null}
          <AppText
            variant={compact ? "caption" : "bodySmall"}
            style={styles.detailText}
            numberOfLines={1}
          >
            {address}
          </AppText>
        </View>
        <AppText
          variant={compact ? "caption" : "label"}
          style={[styles.detailText, compact && styles.areaText]}
        >
          {area}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  compactContainer: {
    gap: 10,
    marginBottom: 12,
  },
  detailsContainer: {
    flex: 1,
    flexDirection: "column",
  },
  name: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  detailText: {
    color: colors.text.secondary,
  },
  areaText: {
    marginLeft: 15,
    color: colors.text.tertiary,
  },
});