import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import EstateManagerBottomTab from "@/components/ui/EstateManagerBottomTab";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function TeaEstateManagerDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("dashboard");

  // -----------------------------
  // Dashboard navigation
  // -----------------------------

  const openNotifications = () => {
    router.push("/estatemanager/Notification");
  };

  const openDailyPluckingDetails = () => {
    router.push("/estatemanager/DailyPluckingDetails");
  };

  const openFertilizerStock = () => {
    router.push("/estatemanager/FertilizerStock");
  };

  // -----------------------------
  // Bottom tab navigation
  // -----------------------------

  const handleTabPress = (tab: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => {
    setActiveTab(tab.key);

    switch (tab.key) {
      case "dashboard":
        router.push("/estatemanager/FertilizerStock");
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* -------------------------------- */}
          {/* Header */}
          {/* -------------------------------- */}

          <View style={styles.header}>
            <View style={styles.profileSection}>
              <Avatar
                name="Estate Manager"
                size={48}
              />

              <View style={styles.profileText}>
                <AppText
                  variant="bodySmall"
                  style={styles.greeting}
                >
                  Welcome back
                </AppText>

                <AppText
                  variant="subheading"
                  style={styles.managerName}
                >
                  Estate Manager
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

          {/* -------------------------------- */}
          {/* Dashboard title */}
          {/* -------------------------------- */}

          <View style={styles.titleSection}>
            <AppText
              variant="heading"
              style={styles.pageTitle}
            >
              Estate Dashboard
            </AppText>

            <AppText
              variant="bodySmall"
              style={styles.pageSubtitle}
            >
              Manage your estate operations
            </AppText>
          </View>

          {/* -------------------------------- */}
          {/* Summary cards */}
          {/* -------------------------------- */}

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons
                  name="people-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <AppText
                variant="heading"
                style={styles.summaryNumber}
              >
                24
              </AppText>

              <AppText
                variant="bodySmall"
                style={styles.summaryLabel}
              >
                Employees
              </AppText>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons
                  name="leaf-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <AppText
                variant="heading"
                style={styles.summaryNumber}
              >
                1,250 kg
              </AppText>

              <AppText
                variant="bodySmall"
                style={styles.summaryLabel}
              >
                Today's Tea
              </AppText>
            </View>
          </View>

          {/* -------------------------------- */}
          {/* Quick actions */}
          {/* -------------------------------- */}

          <AppText
            variant="subheading"
            style={styles.sectionTitle}
          >
            Quick Actions
          </AppText>

          <View style={styles.dashboardGrid}>
            {/* Daily Tea Plucking */}

            <Pressable
              style={styles.dashboardCard}
              onPress={openDailyPluckingDetails}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons
                  name="leaf-outline"
                  size={28}
                  color={colors.primary}
                />
              </View>

              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
              >
                Daily Tea
              </AppText>

              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
              >
                Plucking
              </AppText>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.text.tertiary}
                style={styles.cardArrow}
              />
            </Pressable>

            {/* Fertilizer Stock */}

            <Pressable
              style={styles.dashboardCardGreen}
              onPress={openFertilizerStock}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons
                  name="flask-outline"
                  size={28}
                  color={colors.primary}
                />
              </View>

              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
              >
                Fertilizer
              </AppText>

              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
              >
                Stock
              </AppText>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.text.tertiary}
                style={styles.cardArrow}
              />
            </Pressable>
          </View>

          {/* -------------------------------- */}
          {/* Today's overview */}
          {/* -------------------------------- */}

          <AppText
            variant="subheading"
            style={styles.sectionTitle}
          >
            Today's Overview
          </AppText>

          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewLeft}>
                <View style={styles.smallIcon}>
                  <Ionicons
                    name="people-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>

                <View>
                  <AppText
                    variant="body"
                    style={styles.overviewTitle}
                  >
                    Employees Present
                  </AppText>

                  <AppText
                    variant="bodySmall"
                    style={styles.overviewSubtitle}
                  >
                    Today's attendance
                  </AppText>
                </View>
              </View>

              <AppText
                variant="subheading"
                style={styles.overviewValue}
              >
                21 / 24
              </AppText>
            </View>

            <View style={styles.divider} />

            <View style={styles.overviewRow}>
              <View style={styles.overviewLeft}>
                <View style={styles.smallIcon}>
                  <Ionicons
                    name="basket-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>

                <View>
                  <AppText
                    variant="body"
                    style={styles.overviewTitle}
                  >
                    Tea Collected
                  </AppText>

                  <AppText
                    variant="bodySmall"
                    style={styles.overviewSubtitle}
                  >
                    Today's collection
                  </AppText>
                </View>
              </View>

              <AppText
                variant="subheading"
                style={styles.overviewValue}
              >
                1,250 kg
              </AppText>
            </View>

            <View style={styles.divider} />

            <View style={styles.overviewRow}>
              <View style={styles.overviewLeft}>
                <View style={styles.smallIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>

                <View>
                  <AppText
                    variant="body"
                    style={styles.overviewTitle}
                  >
                    Completed Requests
                  </AppText>

                  <AppText
                    variant="bodySmall"
                    style={styles.overviewSubtitle}
                  >
                    Collection requests
                  </AppText>
                </View>
              </View>

              <AppText
                variant="subheading"
                style={styles.overviewValue}
              >
                8
              </AppText>
            </View>
          </View>

          {/* Bottom spacing */}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* -------------------------------- */}
        {/* Bottom Navigation */}
        {/* -------------------------------- */}

        <EstateManagerBottomTab
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  // --------------------------------
  // Header
  // --------------------------------

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },

  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileText: {
    marginLeft: spacing.sm,
  },

  greeting: {
    color: colors.text.secondary,
    marginBottom: 2,
  },

  managerName: {
    color: colors.text.primary,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },

  // --------------------------------
  // Title
  // --------------------------------

  titleSection: {
    marginBottom: spacing.lg,
  },

  pageTitle: {
    color: colors.text.primary,
  },

  pageSubtitle: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // --------------------------------
  // Summary
  // --------------------------------

  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  summaryCard: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.successBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  summaryNumber: {
    color: colors.text.primary,
  },

  summaryLabel: {
    color: colors.text.secondary,
    marginTop: 2,
  },

  // --------------------------------
  // Sections
  // --------------------------------

  sectionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  // --------------------------------
  // Dashboard cards
  // --------------------------------

  dashboardGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  dashboardCard: {
    flex: 1,
    minHeight: 145,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    position: "relative",
  },

  dashboardCardGreen: {
    flex: 1,
    minHeight: 145,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.successBackground,
    borderWidth: 1,
    borderColor: colors.border.light,
    position: "relative",
  },

  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  cardTitle: {
    color: colors.text.primary,
    fontWeight: "600",
  },

  cardArrow: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
  },

  // --------------------------------
  // Today's overview
  // --------------------------------

  overviewCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
  },

  overviewRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  overviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  smallIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.successBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },

  overviewTitle: {
    color: colors.text.primary,
  },

  overviewSubtitle: {
    color: colors.text.secondary,
    marginTop: 2,
  },

  overviewValue: {
    color: colors.primary,
    marginLeft: spacing.sm,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border.light,
  },

  bottomSpacing: {
    height: spacing.xl,
  },
});