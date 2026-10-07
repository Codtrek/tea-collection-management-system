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

  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <View style={styles.screen}>

        {/* ================= MAIN CONTENT ================= */}

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

            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={colors.text.primaryGreen}
              />
            </Pressable>

            <View style={styles.profileSection}>

              <Avatar
                name="Rohan"
                size={34}
              />

              <View style={styles.profileText}>

                <AppText
                  variant="caption"
                  style={styles.estateName}
                >
                  HIGHLANDS ESTATE
                </AppText>

                <AppText
                  variant="bodySmall"
                  style={styles.managerName}
                >
                  Tea Manager
                </AppText>

              </View>

            </View>

            <Pressable
              style={styles.notificationButton}
              onPress={() =>
                router.push("/estatemanager/Notification")
              }
              hitSlop={8}
            >
              <Ionicons
                name="notifications-outline"
                size={19}
                color={colors.text.primaryGreen}
              />
            </Pressable>

          </View>


          {/* ================= TITLE ================= */}

          <AppText
            variant="body"
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


          {/* ================= SUMMARY CARDS ================= */}

          <View style={styles.summaryRow}>

            <View style={styles.summaryCard}>

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

            </View>


            <View style={styles.summaryCard}>

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

            </View>

          </View>


          {/* ================= RECENTLY BOUGHT ================= */}

          <AppText
            variant="label"
            style={styles.sectionTitle}
          >
            Recently Bought
          </AppText>

          <View style={styles.recentRow}>

            <View style={styles.recentCard}>

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


            <View style={styles.recentCard}>

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


          {/* ================= FERTILIZERS ================= */}

          <AppText
            variant="label"
            style={styles.sectionTitle}
          >
            Fertilizers
          </AppText>

          <View style={styles.fertilizerList}>

            {fertilizers.map((fertilizer) => {

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
                <Pressable
                  key={fertilizer.name}
                  style={styles.fertilizerCard}
                >

                  <View
                    style={[
                      styles.fertilizerIcon,
                      {
                        backgroundColor: iconBackground,
                      },
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
                        {
                          backgroundColor: iconColor,
                        },
                      ]}
                    />

                    <AppText
                      variant="caption"
                      style={[
                        styles.statusText,
                        {
                          color: iconColor,
                        },
                      ]}
                    >
                      {fertilizer.status}
                    </AppText>

                  </View>

                </Pressable>
              );
            })}

          </View>


          {/* ================= PURCHASE REQUEST ================= */}

          <Pressable
            style={styles.purchaseButton}
            onPress={() => {
              // Connect to purchase request page later
            }}
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


        {/* ================= BOTTOM NAVIGATION ================= */}

        <View
          style={[
            styles.bottomTab,
            {
              paddingBottom: insets.bottom,
            },
          ]}
        >

          <EstateManagerBottomTab
            activeTab={activeTab}
            onTabPress={(tab) => {

              setActiveTab(tab.key);

              if (tab.key === "dashboard") {
                router.back();
              }

            }}
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


  /* ================= HEADER ================= */

  header: {
    height: 42,

    flexDirection: "row",
    alignItems: "center",

    marginBottom: spacing.md,
  },

  backButton: {
    width: 36,
    height: 36,

    alignItems: "center",
    justifyContent: "center",
  },

  profileSection: {
    flex: 1,

    flexDirection: "row",
    alignItems: "center",

    marginLeft: spacing.xs,
  },

  profileText: {
    marginLeft: spacing.sm,
  },

  estateName: {
    color: colors.text.secondary,

    fontSize: 8,
    lineHeight: 12,

    fontWeight: "600",
  },

  managerName: {
    color: colors.text.primary,

    fontSize: 11,
    lineHeight: 15,

    fontWeight: "500",
  },

  notificationButton: {
    width: 36,
    height: 36,

    alignItems: "center",
    justifyContent: "center",
  },


  /* ================= TITLE ================= */

  pageTitle: {
    color: colors.text.primaryGreen,

    fontSize: 17,
    fontWeight: "700",

    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },

  description: {
    color: colors.text.secondary,

    fontSize: 9,
    lineHeight: 13,
  },


  /* ================= SUMMARY ================= */

  summaryRow: {
    flexDirection: "row",

    gap: spacing.sm,

    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  summaryCard: {
    flex: 1,

    minHeight: 90,

    backgroundColor: colors.background,

    borderWidth: 1,
    borderColor: colors.border.light,

    borderRadius: 6,

    padding: spacing.sm,
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

    fontSize: 8,
  },

  totalStock: {
    color: colors.text.primary,

    fontSize: 13,
    fontWeight: "700",

    marginTop: 2,
  },

  lowAlerts: {
    color: colors.error,

    fontSize: 13,
    fontWeight: "700",

    marginTop: 2,
  },


  /* ================= SECTIONS ================= */

  sectionTitle: {
    color: colors.text.secondary,

    fontSize: 9,
    fontWeight: "600",

    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },


  /* ================= RECENT ================= */

  recentRow: {
    flexDirection: "row",

    gap: spacing.sm,

    marginBottom: spacing.md,
  },

  recentCard: {
    flex: 1,

    backgroundColor: colors.background,

    borderWidth: 1,
    borderColor: colors.border.light,

    borderRadius: 6,

    padding: spacing.sm,
  },

  recentDateRow: {
    flexDirection: "row",
    alignItems: "center",

    marginBottom: spacing.xs,
  },

  recentDate: {
    color: colors.success,

    fontSize: 8,

    marginLeft: 3,
  },

  recentName: {
    color: colors.text.primary,

    fontSize: 11,
    fontWeight: "600",
  },

  recentQuantity: {
    color: colors.text.secondary,

    fontSize: 8,

    marginTop: 2,
  },


  /* ================= FERTILIZER LIST ================= */

  fertilizerList: {
    backgroundColor: colors.background,

    borderWidth: 1,
    borderColor: colors.border.light,

    borderRadius: 6,

    overflow: "hidden",
  },

  fertilizerCard: {
    minHeight: 48,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: spacing.sm,

    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
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

    fontSize: 9,
    lineHeight: 13,

    fontWeight: "600",
  },

  fertilizerQuantity: {
    color: colors.text.primary,

    fontSize: 9,
    lineHeight: 12,
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

  statusText: {
    fontSize: 7,

    fontWeight: "600",
  },


  /* ================= PURCHASE ================= */

  purchaseButton: {
    height: 32,

    backgroundColor: colors.primary,

    borderRadius: 5,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    marginTop: spacing.md,
  },

  purchaseButtonText: {
    color: colors.white,

    fontSize: 9,
    fontWeight: "600",

    marginLeft: spacing.xs,
  },


  /* ================= BOTTOM ================= */

  bottomTab: {
    position: "absolute",

    left: 0,
    right: 0,
    bottom: 0,
  },

});