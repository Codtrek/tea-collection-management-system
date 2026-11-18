
import React from "react";
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
import AppCard from "@/components/ui/AppCard";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
          {/* HEADER */}
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.text.primaryGreen}
              />
            </Pressable>

            <AppText
              variant="subHeading"
              style={styles.headerTitle}
            >
              Notifications
            </AppText>

            <View style={styles.headerSpacer} />
          </View>

          {/* LOW STOCK ALERT */}
          <AppCard>
            <View style={styles.alertHeader}>
              <Ionicons
                name="warning"
                size={17}
                color={colors.error}
              />

              <AppText
                variant="bodySmall"
                style={styles.alertTitle}
              >
                Low Stock Alert
              </AppText>
            </View>

            <View style={styles.fertilizerContent}>
              <View style={styles.fertilizerLeft}>
                <AppText
                  variant="caption"
                  style={styles.inventoryLabel}
                >
                  FERTILIZER INVENTORY
                </AppText>

                <AppText
                  variant="bodySmall"
                  style={styles.fertilizerName}
                >
                  Muriate of Potash
                </AppText>
              </View>

              <View style={styles.stockAmount}>
                <AppText
                  variant="body"
                  style={styles.stockValue}
                >
                  150 kg
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.remainingText}
                >
                  Remaining
                </AppText>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.orderDetails}>
              <View>
                <AppText
                  variant="caption"
                  style={styles.detailLabel}
                >
                  Last Ordered
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.detailValue}
                >
                  Oct 12, 2023
                </AppText>
              </View>

              <View>
                <AppText
                  variant="caption"
                  style={styles.detailLabel}
                >
                  Est. Depletion
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.depletionValue}
                >
                  5 days
                </AppText>
              </View>
            </View>

            <Pressable style={styles.requestButton}>
              <Ionicons
                name="cart-outline"
                size={16}
                color={colors.white}
              />

              <AppText
                variant="bodySmall"
                style={styles.requestButtonText}
              >
                Request Fertilizer
              </AppText>
            </Pressable>
          </AppCard>

          {/* RECENT ACTIVITY */}
          <AppText
            variant="caption"
            style={styles.recentActivityTitle}
          >
            Recent Activity
          </AppText>

          {/* NOTIFICATION 1 */}
          <AppCard>
            <View style={styles.notificationCard}>
              <View style={styles.notificationIconBlue}>
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color="#5473B5"
                />
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.notificationTitleRow}>
                  <AppText
                    variant="bodySmall"
                    style={styles.notificationTitle}
                  >
                    New Photo Evidence Uploaded
                  </AppText>

                  <AppText
                    variant="caption"
                    style={styles.timeText}
                  >
                    12m
                  </AppText>
                </View>

                <AppText
                  variant="caption"
                  style={styles.notificationDescription}
                >
                  3 new logs added to "Soil Health - Block A"
                </AppText>
              </View>
            </View>
          </AppCard>

          {/* NOTIFICATION 2 */}
          <AppCard>
            <View style={styles.notificationCard}>
              <View style={styles.notificationIconGreen}>
                <Ionicons
                  name="bicycle-outline"
                  size={20}
                  color={colors.success}
                />
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.notificationTitleRow}>
                  <AppText
                    variant="bodySmall"
                    style={styles.notificationTitle}
                  >
                    Plucking Progress Update
                  </AppText>

                  <AppText
                    variant="caption"
                    style={styles.timeText}
                  >
                    2h
                  </AppText>
                </View>

                <AppText
                  variant="caption"
                  style={styles.notificationDescription}
                >
                  Block B is at 85% completion for today's cycle.
                </AppText>
              </View>
            </View>
          </AppCard>

          {/* NOTIFICATION 3 */}
          <AppCard>
            <View style={styles.notificationCard}>
              <View style={styles.notificationIconPurple}>
                <Ionicons
                  name="bar-chart-outline"
                  size={20}
                  color="#6879B8"
                />
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.notificationTitleRow}>
                  <AppText
                    variant="bodySmall"
                    style={styles.notificationTitle}
                  >
                    Daily Report Ready
                  </AppText>

                  <AppText
                    variant="caption"
                    style={styles.timeText}
                  >
                    5h
                  </AppText>
                </View>

                <AppText
                  variant="caption"
                  style={styles.notificationDescription}
                >
                  Summary of yield, labor, and weather for Oct 24.
                </AppText>
              </View>
            </View>
          </AppCard>

          {/* NO MORE NOTIFICATIONS */}
          <View style={styles.noMoreContainer}>
            <View style={styles.clockCircle}>
              <Ionicons
                name="time-outline"
                size={45}
                color={colors.border.default}
              />
            </View>

            <AppText
              variant="caption"
              style={styles.noMoreText}
            >
              No further notifications
            </AppText>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },

  // HEADER
  header: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  backButton: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    color: colors.text.primaryGreen,
    marginLeft: spacing.xs,
  },

  headerSpacer: {
    width: 35,
  },

  // LOW STOCK ALERT
  alertHeader: {
    minHeight: 35,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
  },

  alertTitle: {
    color: colors.error,
    marginLeft: spacing.sm,
  },

  fertilizerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },

  fertilizerLeft: {
    flex: 1,
  },

  inventoryLabel: {
    color: colors.text.secondary,
    marginBottom: 2,
  },

  fertilizerName: {
    color: colors.text.primary,
  },

  stockAmount: {
    alignItems: "flex-end",
  },

  stockValue: {
    color: colors.error,
  },

  remainingText: {
    color: colors.text.tertiary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.sm,
  },

  orderDetails: {
    flexDirection: "row",
    gap: spacing.xl,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },

  detailLabel: {
    color: colors.text.tertiary,
  },

  detailValue: {
    color: colors.text.primary,
  },

  depletionValue: {
    color: colors.error,
  },

  requestButton: {
    height: 34,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  requestButtonText: {
    color: colors.white,
    marginLeft: spacing.xs,
  },

  // RECENT ACTIVITY
  recentActivityTitle: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },

  // NOTIFICATION CARDS
  notificationCard: {
    minHeight: 61,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },

  notificationContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationTitle: {
    flex: 1,
    color: colors.text.primary,
  },

  timeText: {
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },

  notificationDescription: {
    color: colors.text.secondary,
    marginTop: 2,
  },

  // NOTIFICATION ICONS
  notificationIconBlue: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#DDE6FA",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationIconGreen: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationIconPurple: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E4E7F5",
    alignItems: "center",
    justifyContent: "center",
  },

  // NO MORE NOTIFICATIONS
  noMoreContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },

  clockCircle: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  noMoreText: {
    color: colors.text.tertiary,
  },
});
