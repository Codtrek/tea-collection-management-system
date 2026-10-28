
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Header from "@/components/ui/Header";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function TeaEstateManagerDashboard() {
  const router = useRouter();

  // Dashboard navigation
  const openNotifications = () => {
    router.push("/estatemanager/Notification");
  };

  const openDailyPluckingDetails = () => {
    router.push("/estatemanager/DailyPluckingDetails");
  };

  const openFertilizerStock = () => {
    router.push("/estatemanager/FertilizerStock");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}

          <Header
          companyName="Estate Manager"
          onNotificationPress={openNotifications}
        />

          {/* Dashboard title */}

          <View style={styles.titleSection}>
            <AppText
              variant="heading"
              style={styles.pageTitle}
            >
              Estate Dashboard
            </AppText>

            <AppText
              variant="caption"
              style={styles.pageSubtitle}
            >
              Manage your estate operations.
            </AppText>
          </View>

          {/* Summary cards */}

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <View style={styles.summaryIcon}>
                  <Ionicons
                    name="people-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>

                <AppText
                  variant="caption"
                  style={styles.summaryLabel}
                >
                  Employees
                </AppText>
              </View>

              <AppText
                variant="heading"
                style={styles.summaryNumber}
              >
                24
              </AppText>

              <AppText
                variant="caption"
                style={styles.summaryDescription}
              >
                Registered employees
              </AppText>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <View style={styles.summaryIcon}>
                  <Ionicons
                    name="leaf-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>

                <AppText
                  variant="caption"
                  style={styles.summaryLabel}
                >
                  Today's Tea
                </AppText>
              </View>

              <AppText
                variant="heading"
                style={styles.summaryNumber}
              >
                1,250 kg
              </AppText>

              <AppText
                variant="caption"
                style={styles.summaryDescription}
              >
                Total collected today
              </AppText>
            </View>
          </View>

          {/* Quick actions */}

          <View style={styles.sectionHeader}>
            <AppText
              variant="subheading"
              style={styles.sectionTitle}
            >
              Quick Actions
            </AppText>

            <AppText
              variant="caption"
              style={styles.sectionSubtitle}
            >
              Manage daily operations
            </AppText>
          </View>

          <View style={styles.dashboardGrid}>
            <Pressable
              style={styles.dashboardCard}
              onPress={openFertilizerStock}
              accessibilityRole="button"
              accessibilityLabel="Open fertilizer stock"
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconContainer}>
                  <Ionicons
                    name="flask-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={colors.text.tertiary}
                />
              </View>

              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
              >
                Fertilizer Stock
              </AppText>

              <AppText
                variant="caption"
                style={styles.cardDescription}
              >
                View fertilizer supplies
              </AppText>
            </Pressable>

            <Pressable
              style={[
                styles.dashboardCard,
                styles.dashboardCardGreen,
              ]}
              onPress={openDailyPluckingDetails}
              accessibilityRole="button"
              accessibilityLabel="Open daily tea plucking"
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconContainer}>
                  <Ionicons
                    name="leaf-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={colors.text.tertiary}
                />
              </View>

              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
              >
                Daily Tea Plucking
              </AppText>

              <AppText
                variant="caption"
                style={styles.cardDescription}
              >
                View daily plucking details
              </AppText>
            </Pressable>
          </View>

          {/* Today's overview */}

          <View style={styles.sectionHeader}>
            <AppText
              variant="subheading"
              style={styles.sectionTitle}
            >
              Today's Overview
            </AppText>

            <AppText
              variant="caption"
              style={styles.sectionSubtitle}
            >
              Daily estate summary
            </AppText>
          </View>

          <View style={styles.overviewCard}>
            {/* Employees present */}

            <View style={styles.overviewRow}>
              <View style={styles.overviewLeft}>
                <View style={styles.smallIcon}>
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.overviewText}>
                  <AppText
                    variant="bodySmall"
                    style={styles.overviewTitle}
                  >
                    Employees Present
                  </AppText>

                  <AppText
                    variant="caption"
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

            {/* Tea collected */}

            <View style={styles.overviewRow}>
              <View style={styles.overviewLeft}>
                <View style={styles.smallIcon}>
                  <Ionicons
                    name="basket-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.overviewText}>
                  <AppText
                    variant="bodySmall"
                    style={styles.overviewTitle}
                  >
                    Tea Collected
                  </AppText>

                  <AppText
                    variant="caption"
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

            {/* Completed requests */}

            <View style={styles.overviewRow}>
              <View style={styles.overviewLeft}>
                <View style={styles.smallIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.overviewText}>
                  <AppText
                    variant="bodySmall"
                    style={styles.overviewTitle}
                  >
                    Completed Requests
                  </AppText>

                  <AppText
                    variant="caption"
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

          {/* Space above shared bottom navigation */}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Bottom navigation is intentionally not rendered here.
            Keep it in your shared layout or bottom-tab owner only. */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

  // Header

  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },

  profileSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  profileText: {
    flex: 1,
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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  // Page title

  titleSection: {
    marginBottom: spacing.lg,
  },

  pageTitle: {
    color: colors.text.primaryGreen,
  },

  pageSubtitle: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // Summary cards

  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  summaryCard: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 10,
  },

  summaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },

  summaryLabel: {
    flex: 1,
    color: colors.text.secondary,
  },

  summaryNumber: {
    color: colors.text.primary,
  },

  summaryDescription: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // Section headings

  sectionHeader: {
    marginBottom: spacing.sm,
  },

  sectionTitle: {
    color: colors.text.primaryGreen,
  },

  sectionSubtitle: {
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Quick action cards

  dashboardGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  dashboardCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 132,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  dashboardCardGreen: {
    backgroundColor: colors.successBackground,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  cardIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    color: colors.text.primary,
    fontWeight: "600",
  },

  cardDescription: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // Today's overview

  overviewCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
  },

  overviewRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },

  overviewLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  overviewText: {
    flex: 1,
    minWidth: 0,
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
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
  },

  // Bottom spacing

  bottomSpacing: {
    height: spacing.xl,
  },
});
