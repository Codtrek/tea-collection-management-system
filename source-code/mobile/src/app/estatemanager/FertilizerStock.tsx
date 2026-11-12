
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
import GeneralHeader from "@/components/ui/GeneralHeader";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

interface Fertilizer {
  name: string;
  quantity: string;
  status: "HIGH STOCK" | "LOW STOCK" | "CRITICAL";
  icon: keyof typeof Ionicons.glyphMap;
}

const fertilizers: Fertilizer[] = [
  {
    name: "Urea",
    quantity: "1,250 kg",
    status: "HIGH STOCK",
    icon: "flask-outline",
  },
  {
    name: "Muriate of Potash",
    quantity: "150 kg",
    status: "LOW STOCK",
    icon: "water-outline",
  },
  {
    name: "Rock Phosphate",
    quantity: "2,400 kg",
    status: "HIGH STOCK",
    icon: "triangle-outline",
  },
  {
    name: "Zinc Sulphate",
    quantity: "20 kg",
    status: "CRITICAL",
    icon: "warning-outline",
  },
  {
    name: "Dolomite",
    quantity: "1,100 kg",
    status: "HIGH STOCK",
    icon: "grid-outline",
  },
];

export default function FertilizerStock() {
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
              paddingBottom: 100 + insets.bottom,
            },
          ]}
        >
          {/* HEADER WITH BACK BUTTON */}
          <View style={styles.headerContainer}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color={colors.text.primaryGreen}
              />
            </Pressable>

            <View style={styles.generalHeaderWrapper}>
              <GeneralHeader
                title="Your Estate Name"
                description="Estate Manager"
                onNotificationPress={() =>
                  router.push("/estatemanager/Notification")
                }
              />
            </View>
          </View>

          {/* PAGE TITLE */}
          <View style={styles.pageHeader}>
            <AppText
              variant="subHeading"
              style={styles.pageTitle}
            >
              Fertilizer Stock
            </AppText>

            <AppText
              variant="caption"
              style={styles.description}
            >
              Real-time inventory for Highlands Estate
            </AppText>

            <AppText
              variant="caption"
              style={styles.description}
            >
              plantation blocks.
            </AppText>
          </View>

          {/* SUMMARY CARDS */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCardWrapper}>
              <AppCard>
                <View style={styles.summaryIconGreen}>
                  <Ionicons
                    name="archive-outline"
                    size={17}
                    color={colors.success}
                  />
                </View>

                <AppText
                  variant="caption"
                  style={styles.summaryLabel}
                >
                  Total Stock
                </AppText>

                <AppText
                  variant="bodySmall"
                  style={styles.totalStock}
                >
                  4,820 kg
                </AppText>
              </AppCard>
            </View>

            <View style={styles.summaryCardWrapper}>
              <AppCard>
                <View style={styles.summaryIconRed}>
                  <Ionicons
                    name="warning-outline"
                    size={17}
                    color={colors.error}
                  />
                </View>

                <AppText
                  variant="caption"
                  style={styles.summaryLabel}
                >
                  Low Alerts
                </AppText>

                <AppText
                  variant="bodySmall"
                  style={styles.lowAlerts}
                >
                  2 Items
                </AppText>
              </AppCard>
            </View>
          </View>

          {/* RECENTLY BOUGHT */}
          <AppText
            variant="label"
            style={styles.sectionTitle}
          >
            Recently Bought
          </AppText>

          <AppCard>
            <View style={styles.recentRow}>
              <View style={styles.recentItem}>
                <View style={styles.recentDateRow}>
                  <Ionicons
                    name="time-outline"
                    size={11}
                    color={colors.success}
                  />

                  <AppText
                    variant="caption"
                    style={styles.recentDate}
                  >
                    MAY 12
                  </AppText>
                </View>

                <AppText
                  variant="bodySmall"
                  style={styles.recentName}
                >
                  Urea
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.recentQuantity}
                >
                  500 kg added
                </AppText>
              </View>

              <View style={styles.recentItem}>
                <View style={styles.recentDateRow}>
                  <Ionicons
                    name="time-outline"
                    size={11}
                    color={colors.success}
                  />

                  <AppText
                    variant="caption"
                    style={styles.recentDate}
                  >
                    MAY 08
                  </AppText>
                </View>

                <AppText
                  variant="bodySmall"
                  style={styles.recentName}
                >
                  Dolomite
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.recentQuantity}
                >
                  250 kg added
                </AppText>
              </View>
            </View>
          </AppCard>

          {/* FERTILIZERS */}
          <AppText
            variant="label"
            style={styles.sectionTitle}
          >
            Fertilizers
          </AppText>

          <AppCard>
            <View style={styles.fertilizerList}>
              {fertilizers.map((fertilizer, index) => {
                const isHighStock =
                  fertilizer.status === "HIGH STOCK";

                const isLowStock =
                  fertilizer.status === "LOW STOCK";

                const iconColor = isHighStock
                  ? colors.success
                  : isLowStock
                    ? colors.warning
                    : colors.error;

                const iconBackground = isHighStock
                  ? colors.successBackground
                  : isLowStock
                    ? colors.warningBackground
                    : colors.errorBackground;

                return (
                  <View
                    key={fertilizer.name}
                    style={[
                      styles.fertilizerCard,
                      index === fertilizers.length - 1 &&
                        styles.lastFertilizerCard,
                    ]}
                  >
                    <View
                      style={[
                        styles.fertilizerIcon,
                        { backgroundColor: iconBackground },
                      ]}
                    >
                      <Ionicons
                        name={fertilizer.icon}
                        size={17}
                        color={iconColor}
                      />
                    </View>

                    <View style={styles.fertilizerInfo}>
                      <AppText
                        variant="caption"
                        style={styles.fertilizerName}
                      >
                        {fertilizer.name}
                      </AppText>

                      <AppText
                        variant="caption"
                        style={styles.fertilizerQuantity}
                      >
                        {fertilizer.quantity}
                      </AppText>
                    </View>

                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: iconColor },
                        ]}
                      />

                      <AppText
                        variant="caption"
                        style={[
                          styles.statusText,
                          { color: iconColor },
                        ]}
                      >
                        {fertilizer.status}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          </AppCard>

          {/* REQUEST FERTILIZER BUTTON */}
          <Pressable
            style={styles.purchaseButton}
            onPress={() =>
              router.push("/estatemanager/FertilizerRequest")
            }
          >
            <Ionicons
              name="cart-outline"
              size={16}
              color={colors.white}
            />

            <AppText
              variant="bodySmall"
              style={styles.purchaseButtonText}
            >
              Request Fertilizer
            </AppText>
          </Pressable>
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

  /* HEADER */

  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  backButton: {
    width: 34,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },

  generalHeaderWrapper: {
    flex: 1,
  },

  /* PAGE HEADER */

  pageHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  pageTitle: {
    color: colors.text.primaryGreen,
    marginBottom: spacing.xs,
  },

  description: {
    color: colors.text.secondary,
  },

  /* SUMMARY */

  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  summaryCardWrapper: {
    flex: 1,
  },

  summaryIconGreen: {
    width: 29,
    height: 29,
    borderRadius: 7,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },

  summaryIconRed: {
    width: 29,
    height: 29,
    borderRadius: 7,
    backgroundColor: colors.errorBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },

  summaryLabel: {
    color: colors.text.secondary,
  },

  totalStock: {
    color: colors.text.primary,
    marginTop: 2,
  },

  lowAlerts: {
    color: colors.error,
    marginTop: 2,
  },

  /* SECTION TITLES */

  sectionTitle: {
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },

  /* RECENTLY BOUGHT */

  recentRow: {
    flexDirection: "row",
    gap: spacing.md,
  },

  recentItem: {
    flex: 1,
  },

  recentDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },

  recentDate: {
    color: colors.success,
    marginLeft: 3,
  },

  recentName: {
    color: colors.text.primary,
  },

  recentQuantity: {
    color: colors.text.secondary,
    marginTop: 2,
  },

  /* FERTILIZER LIST */

  fertilizerList: {
    width: "100%",
  },

  fertilizerCard: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  lastFertilizerCard: {
    borderBottomWidth: 0,
  },

  fertilizerIcon: {
    width: 28,
    height: 28,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  fertilizerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  fertilizerName: {
    color: colors.text.primary,
  },

  fertilizerQuantity: {
    color: colors.text.secondary,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },

  statusText: {},

  /* REQUEST BUTTON */

  purchaseButton: {
    height: 38,
    backgroundColor: colors.primary,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },

  purchaseButtonText: {
    color: colors.white,
    marginLeft: spacing.xs,
  },
});
