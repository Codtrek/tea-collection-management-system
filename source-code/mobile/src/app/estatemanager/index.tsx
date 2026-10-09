import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import EstateManagerBottomTab from "@/components/ui/EstateManagerBottomTab";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function TeaEstateManagerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("dashboard");

  /* =====================================================
     EXISTING DASHBOARD NAVIGATION
     ===================================================== */

  const openNotifications = () => {
    router.push("/estatemanager/Notification");
  };

  const openDailyPluckingDetails = () => {
    router.push("/estatemanager/DailyPluckingDetails");
  };

  const openFertilizerStock = () => {
    router.push("/estatemanager/FertilizerStock");
  };

  /* =====================================================
     EXISTING BOTTOM TAB NAVIGATION
     ===================================================== */

  const handleTabPress = (tab: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => {
    setActiveTab(tab.key);

    switch (tab.key) {
      case "dashboard":
        router.push("/estatemanager");
        break;

      case "employees":
        router.push("/estatemanager/Employees");
        break;

      case "photoEvidence":
        router.push("/estatemanager/PhotoEvidence");
        break;

      case "reports":
        router.push("/estatemanager/Reports");
        break;

      default:
        break;
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 90 + insets.bottom,
            },
          ]}
        >
          {/* ================= HEADER ================= */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <Avatar name="Rohan" size={42} />

              <View style={styles.profileText}>
                <AppText variant="caption" style={styles.welcomeText}>
                  Welcome back,
                </AppText>

                <AppText variant="body" style={styles.managerName}>
                  Manager Rohan
                </AppText>

                <AppText variant="caption" style={styles.estateName}>
                  Nuwara Eliya Highlands
                </AppText>
              </View>
            </View>

            <Pressable
              style={styles.notificationButton}
              onPress={openNotifications}
            >
              <Ionicons
                name="notifications-outline"
                size={23}
                color={colors.text.primaryGreen}
              />
            </Pressable>
          </View>

          {/* ================= ESTATE BANNER ================= */}
          <View style={styles.estateBanner}>
            <View style={styles.bannerPlaceholder}>
              <View style={styles.bannerIconContainer}>
                <Ionicons
                  name="leaf-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>

              <AppText variant="bodySmall" style={styles.bannerTitle}>
                Tea Estate Highlands
              </AppText>
            </View>
          </View>

          {/* ================= COLLECTION STATUS ================= */}
          <AppText variant="caption" style={styles.sectionLabel}>
            COLLECTION STATUS
          </AppText>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <AppText variant="body" style={styles.progressTitle}>
                Daily Progress
              </AppText>

              <AppText
                variant="subheading"
                style={styles.progressPercentage}
              >
                82.7%
              </AppText>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>

            <AppText
              variant="caption"
              style={styles.progressDescription}
            >
              1,240.5kg of 1,500kg target collected
            </AppText>
          </View>

          {/* ================= QUICK ACTION CARDS ================= */}
          <View style={styles.cardsRow}>
            {/* FERTILIZER STOCK */}
            <Pressable
              style={styles.dashboardCard}
              onPress={openFertilizerStock}
            >
              <View style={styles.cardIconBlue}>
                <Ionicons
                  name="bicycle-outline"
                  size={24}
                  color="#5872A8"
                />
              </View>

              <AppText variant="bodySmall" style={styles.cardTitle}>
                Fertilizer Stock
              </AppText>

              <AppText variant="caption" style={styles.cardSubtitle}>
                85% Available
              </AppText>
            </Pressable>

            {/* DAILY TEA PLUCKING */}
            <Pressable
              style={styles.dashboardCardGreen}
              onPress={openDailyPluckingDetails}
            >
              <View style={styles.cardIconGreen}>
                <Ionicons
                  name="list-outline"
                  size={24}
                  color={colors.success}
                />
              </View>

              <AppText variant="bodySmall" style={styles.cardTitle}>
                Daily Tea Plucking
              </AppText>

              <AppText variant="caption" style={styles.cardSubtitle}>
                1/3 Completed
              </AppText>
            </Pressable>
          </View>

          {/* Space for fixed bottom navigation */}
          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* ================= BOTTOM TAB ================= */}
        <View
          style={[
            styles.bottomTabContainer,
            {
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <EstateManagerBottomTab
            activeTab={activeTab}
            onTabPress={handleTabPress}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },

  /* ================= HEADER ================= */

  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    marginBottom: spacing.md,
  },

  profileSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  profileText: {
    marginLeft: spacing.sm,
  },

  welcomeText: {
    color: colors.text.secondary,
  },

  managerName: {
    color: colors.text.primaryGreen,
  },

  estateName: {
    color: colors.text.secondary,
  },

  notificationButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },

  /* ================= ESTATE BANNER ================= */

  estateBanner: {
    width: "100%",
    height: 148,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },

  bannerPlaceholder: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },

  bannerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },

  bannerTitle: {
    color: colors.text.primary,
  },

  /* ================= SECTION LABEL ================= */

  sectionLabel: {
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  /* ================= PROGRESS CARD ================= */

  progressCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  progressTitle: {
    color: colors.text.primary,
  },

  progressPercentage: {
    color: colors.success,
  },

  progressTrack: {
    width: "100%",
    height: 7,
    backgroundColor: "#E5E7EB",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },

  progressFill: {
    width: "82.7%",
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 5,
  },

  progressDescription: {
    color: colors.text.secondary,
  },

  /* ================= QUICK ACTION CARDS ================= */

  cardsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  dashboardCard: {
    flex: 1,
    minHeight: 132,
    backgroundColor: "#F1F5FF",
    borderWidth: 1,
    borderColor: "#D5DDEA",
    borderRadius: 8,
    padding: spacing.md,
    justifyContent: "flex-start",
  },

  dashboardCardGreen: {
    flex: 1,
    minHeight: 132,
    backgroundColor: "#EDF9F3",
    borderWidth: 1,
    borderColor: "#D1E8DC",
    borderRadius: 8,
    padding: spacing.md,
    justifyContent: "flex-start",
  },

  cardIconBlue: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#DCE5FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  cardIconGreen: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  cardTitle: {
    color: colors.text.primary,
  },

  cardSubtitle: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  /* ================= BOTTOM NAVIGATION ================= */

  bottomSpace: {
    height: 80,
  },

  bottomTabContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
  },
});