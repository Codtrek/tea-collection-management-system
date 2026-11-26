
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
import AppCard from "@/components/ui/AppCard";
import GeneralHeader from "@/components/ui/GeneralHeader";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function TeaEstateManagerDashboard() {
  const router = useRouter();

  // Dashboard navigation
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
          {/* General Header */}
          <GeneralHeader
            title="Your Estate Name"
            description="Estate Manager"
            onNotificationPress={() =>
              router.push("/estatemanager/Notification")
            }
          />

          {/* Dashboard Title */}
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

          {/* Summary Section */}
          <View style={styles.sectionHeader}>
            <AppText
              variant="subHeading"
              style={styles.sectionTitle}
            >
              Estate Summary
            </AppText>

            <AppText
              variant="caption"
              style={styles.sectionSubtitle}
            >
              Your estate at a glance
            </AppText>
          </View>

          {/* Employees Summary Card */}
          <AppCard>
            <View style={styles.summaryCardContent}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="people-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <AppText
                variant="bodySmall"
                style={styles.summaryLabel}
              >
                Registered Employees
              </AppText>

              <AppText
                variant="heading"
                style={styles.summaryNumber}
              >
                24
              </AppText>
            </View>
          </AppCard>

          {/* Today's Tea Summary Card */}
          <AppCard>
            <View style={styles.summaryCardContent}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="leaf-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <AppText
                variant="bodySmall"
                style={styles.summaryLabel}
              >
                Today's collected Tea
              </AppText>

              <AppText
                variant="heading"
                style={styles.summaryNumber}
              >
                1,250 kg
              </AppText>
            </View>
          </AppCard>

          {/* Quick Actions Section */}
          <View style={styles.sectionHeader}>
            <AppText
              variant="subHeading"
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

          {/* Fertilizer Stock Card */}
          <Pressable
            onPress={openFertilizerStock}
            accessibilityRole="button"
            accessibilityLabel="Open fertilizer stock"
            style={({ pressed }) => [
              styles.pressableCard,
              pressed && styles.pressedCard,
            ]}
          >
            <AppCard>
              <View style={styles.actionCardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons
                    name="flask-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.cardText}>
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
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text.tertiary}
                />
              </View>
            </AppCard>
          </Pressable>

          {/* Daily Tea Plucking Card */}
          <Pressable
            onPress={openDailyPluckingDetails}
            accessibilityRole="button"
            accessibilityLabel="Open daily tea plucking"
            style={({ pressed }) => [
              styles.pressableCard,
              pressed && styles.pressedCard,
            ]}
          >
            <AppCard>
              <View style={styles.actionCardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons
                    name="leaf-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.cardText}>
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
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text.tertiary}
                />
              </View>
            </AppCard>
          </Pressable>

          {/* Today's Overview Section */}
          <View style={styles.sectionHeader}>
            <AppText
              variant="subHeading"
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

          {/* Employees Present Card */}
          <AppCard>
            <View style={styles.overviewContent}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="people-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <View style={styles.cardText}>
                <AppText
                  variant="bodySmall"
                  style={styles.cardTitle}
                >
                  Employees Present
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.cardDescription}
                >
                  Today's attendance
                </AppText>
              </View>

              <AppText
                variant="subHeading"
                style={styles.overviewValue}
              >
                21 / 24
              </AppText>
            </View>
          </AppCard>

          {/* Tea Collected Card */}
          <AppCard>
            <View style={styles.overviewContent}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="basket-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <View style={styles.cardText}>
                <AppText
                  variant="bodySmall"
                  style={styles.cardTitle}
                >
                  Tea Collected
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.cardDescription}
                >
                  Today's collection
                </AppText>
              </View>

              <AppText
                variant="subHeading"
                style={styles.overviewValue}
              >
                1,250 kg
              </AppText>
            </View>
          </AppCard>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
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

  // Dashboard Title
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

  // Section Headings
  sectionHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  sectionTitle: {
    color: colors.text.primaryGreen,
  },

  sectionSubtitle: {
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Estate Summary Cards
  summaryCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  summaryLabel: {
    flex: 1,
    color: colors.text.secondary,
  },

  summaryNumber: {
    color: colors.text.primary,
    textAlign: "right",
  },

  // Common Card Content
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
  },

  cardText: {
    flex: 1,
    minWidth: 0,
  },

  cardLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },

  cardTitle: {
    color: colors.text.primary,
    fontWeight: "600",
  },

  cardDescription: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // Quick Action Cards
  pressableCard: {
    width: "100%",
  },

  pressedCard: {
    opacity: 0.75,
  },

  actionCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  // Today's Overview Cards
  overviewContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  overviewValue: {
    color: colors.primary,
    marginLeft: spacing.xs,
  },

  // Bottom Spacing
  bottomSpacing: {
    height: spacing.xl,
  },
});
