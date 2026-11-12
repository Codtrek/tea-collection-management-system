
import React from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AppText from "@/components/ui/AppText";
import GeneralHeader from "@/components/ui/GeneralHeader";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type IconName = keyof typeof Ionicons.glyphMap;

export default function EmployeeProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Replace these sample values with the logged-in user's data.
  const user = {
    name: "Kalana Ekanayake",
    growth: "+12.5%",
    estates: "3",
    avatar: "",
  };

  const confirmLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out from this device?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => router.replace("/auth/login"),
        },
      ],
      { cancelable: true }
    );
  };

  const handleMenuPress = (title: string) => {
    switch (title) {
      case "Change Password":
        router.push("/auth/change-password");
        break;

      case "Personal Information":
        Alert.alert(
          "Personal Information",
          "Your personal information will be available here soon."
        );
        break;

      case "Help & Support":
        Alert.alert(
          "Help & Support",
          "Contact your system administrator for assistance."
        );
        break;

      case "About":
        Alert.alert(
          "About Harboost",
          "Harboost Tea Collection Management System."
        );
        break;

      default:
        break;
    }
  };

  const MenuItem = ({
    icon,
    title,
    onPress,
  }: {
    icon: IconName;
    title: string;
    onPress: () => void;
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Ionicons
        name={icon}
        size={19}
        color={colors.text.primary}
      />

      <AppText variant="bodySmall" style={styles.menuText}>
        {title}
      </AppText>

      <Ionicons
        name="chevron-forward"
        size={17}
        color={colors.text.tertiary}
      />
    </Pressable>
  );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: spacing.xl + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* GENERAL HEADER */}
        <GeneralHeader
          title="Tea Estates"
          description="Estate Manager"
          onNotificationPress={() =>
            router.push("/estatemanager/Notification")
          }
        />

        {/* PROFILE INFORMATION */}
        <View style={styles.profileContent}>
          {/* PROFILE IMAGE */}
          <View style={styles.avatarWrapper}>
            {user.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons
                  name="person"
                  size={36}
                  color={colors.primary}
                />
              </View>
            )}
          </View>

          <AppText variant="body" style={styles.userName}>
            {user.name}
          </AppText>

          {/* STATISTICS */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <AppText variant="caption" style={styles.statLabel}>
                Growth
              </AppText>

              <AppText variant="bodySmall" style={styles.growthValue}>
                {user.growth}
              </AppText>
            </View>

            <View style={styles.statItem}>
              <AppText variant="caption" style={styles.statLabel}>
                Estates
              </AppText>

              <AppText variant="bodySmall" style={styles.statValue}>
                {user.estates}
              </AppText>
            </View>
          </View>
        </View>

        {/* ACCOUNT SECTION */}
        <View style={styles.section}>
          <AppText variant="bodySmall" style={styles.sectionTitle}>
            Account
          </AppText>

          <View style={styles.menuContainer}>
            <MenuItem
              icon="person-outline"
              title="Personal Information"
              onPress={() => handleMenuPress("Personal Information")}
            />

            <MenuItem
              icon="create-outline"
              title="Change Password"
              onPress={() => handleMenuPress("Change Password")}
            />
          </View>
        </View>

        {/* SUPPORT SECTION */}
        <View style={styles.section}>
          <AppText variant="bodySmall" style={styles.sectionTitle}>
            Support
          </AppText>

          <View style={styles.menuContainer}>
            <MenuItem
              icon="help-circle-outline"
              title="Help & Support"
              onPress={() => handleMenuPress("Help & Support")}
            />

            <MenuItem
              icon="information-circle-outline"
              title="About"
              onPress={() => handleMenuPress("About")}
            />
          </View>
        </View>

        {/* LOGOUT */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutPressed,
          ]}
          onPress={confirmLogout}
          accessibilityRole="button"
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color="#DC2626"
          />

          <AppText variant="bodySmall" style={styles.logoutText}>
            Log Out
          </AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// STYLES
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  scrollView: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
  },

  // PROFILE CONTENT
  profileContent: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },

  avatarWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginTop: -38,
    marginLeft: spacing.sm,
    borderWidth: 3,
    borderColor: colors.surface,
    overflow: "hidden",
    backgroundColor: "#E5F5EA",
  },

  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 38,
  },

  avatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  userName: {
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
    fontWeight: "600",
  },

  // STATISTICS
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },

  statLabel: {
    color: colors.text.secondary,
  },

  statValue: {
    color: colors.text.primary,
    fontWeight: "600",
  },

  growthValue: {
    color: colors.primary,
    fontWeight: "600",
  },

  // SECTIONS
  section: {
    marginTop: spacing.md,
  },

  sectionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    fontWeight: "600",
  },

  menuContainer: {
    gap: spacing.xs,
  },

  // MENU ITEMS
  menuItem: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 13,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  menuItemPressed: {
    opacity: 0.65,
  },

  menuText: {
    flex: 1,
    color: colors.text.primary,
  },

  // LOGOUT
  logoutButton: {
    minHeight: 46,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    backgroundColor: "#FFF7F7",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },

  logoutPressed: {
    opacity: 0.65,
  },

  logoutText: {
    color: "#DC2626",
    fontWeight: "600",
  },
});
