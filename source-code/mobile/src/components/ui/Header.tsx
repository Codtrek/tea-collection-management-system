import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "./AppText";
import { colors } from "@/theme/colors";
import { typography } from "@/theme";

interface HeaderProps {
  username: string;
  greeting?: string;
  date?: string;
  notificationCount?: number;
  onNotificationPress?: () => void;
}

export default function Header({
  username,
  greeting = "Welcome",
  date,
  notificationCount = 0,
  onNotificationPress,
}: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {date && (
          <AppText variant="caption" style={styles.date}>
            {date}
          </AppText>
        )}

        <AppText variant="heading" style={styles.title}>
          {greeting} {username}
        </AppText>
      </View>

      <Pressable
        onPress={onNotificationPress}
        hitSlop={8}
        style={styles.bell}
      >
        <Ionicons
          name="notifications-outline"
          size={24}
          color={colors.text.primary}
        />

        {notificationCount > 0 && (
          <View style={styles.badge}>
            <AppText variant="caption" style={styles.badgeText}>
              {notificationCount > 9 ? "9+" : notificationCount}
            </AppText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 100,
    width: "100%",
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    // marginTop: 10,
  },

  left: {
    flex: 1,
    paddingRight: 12,
  },

  date: {
    color: colors.text.primary,
    opacity: 0.7,
    marginBottom: 2,
  },

  title: {
    ...typography.label,
    color: colors.text.primary,
  },

  bell: {
    position: "relative",
  },

  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: colors.white,
    fontWeight: "700",
    lineHeight: 14,
  },
});