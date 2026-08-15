import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "./Avatar";
import AppText from "./AppText";
import { colors } from "@/theme/colors";
import { typography } from "@/theme";

interface HeaderProps {
  companyName: string;
  avatar?: string;
  onNotificationPress?: () => void;
}

export default function Header({
  companyName,
  avatar,
  onNotificationPress,
}: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Avatar image={avatar} name={companyName} />

        <AppText variant="heading" style={styles.title}>
          {companyName}
        </AppText>
      </View>

      <Pressable onPress={onNotificationPress}>
        <Ionicons
          name="notifications-outline"
          size={24}
          color={colors.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 70,
    width: "100%",
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    ...typography.subheading,
    marginLeft: 12,
    color: colors.text.secondary,
  },
});