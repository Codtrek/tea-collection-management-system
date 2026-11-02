import { StyleSheet, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/components/ui/AppText";
import { colors, spacing } from "@/theme";

interface GeneralHeaderProps {
  title?: string;
  description?: string;
  notificationCount?: number;
  children?: React.ReactNode;
  onNotificationPress?: () => void;
  onBackPress?: () => void;
  showNotifications?: boolean;
}

export default function GeneralHeader({
  title, description, children, notificationCount = 0,
  onNotificationPress, onBackPress, showNotifications = true,
}: GeneralHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.subContainer}>
        <View style={styles.headingRow}>
          {onBackPress && (
            <Pressable onPress={onBackPress} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </Pressable>
          )}
          <View style={styles.headingText}>
            {title ? <AppText variant="subHeading" style={styles.title}>{title}</AppText> : null}
            {description ? <AppText variant="bodySmall" style={styles.description}>{description}</AppText> : null}
          </View>
        </View>
        {showNotifications && (
          <Pressable onPress={onNotificationPress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <AppText variant="caption" style={styles.badgeText}>{notificationCount > 9 ? "9+" : notificationCount}</AppText>
              </View>
            )}
          </Pressable>
        )}
      </View>
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%", height: 150, backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingTop: 40,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  subContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headingRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headingText: { flex: 1 },
  backButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  title: { color: colors.black, marginBottom: spacing.xs },
  description: { color: colors.black },
  badge: {
    position: "absolute", top: -6, right: -8, minWidth: 18, height: 18,
    paddingHorizontal: 4, borderRadius: 999, backgroundColor: colors.error,
    alignItems: "center", justifyContent: "center",
  },
  badgeText: { color: colors.white, fontWeight: "700", lineHeight: 14 },
  children: { marginTop: spacing.md },
});
