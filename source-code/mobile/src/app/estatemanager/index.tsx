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

  /* =====================================================
     DASHBOARD NAVIGATION
     ===================================================== */

  const openNotifications = () => {
    router.push("./notifications");
  };

  const openDailyPluckingDetails = () => {
    router.push("./DailyPluckingDetails");
  };

  const openFertilizerStock = () => {
    router.push("./fertilizer-stock");
  };

  /* =====================================================
     BOTTOM TAB NAVIGATION
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
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>

        {/* =====================================================
            MAIN CONTENT
            ===================================================== */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* =====================================================
              HEADER
              ===================================================== */}

          <View style={styles.header}>

            {/* PROFILE */}

            <View style={styles.profileSection}>

              <Avatar
                name="Rohan"
                size={42}
              />

              <View style={styles.profileText}>

                <AppText
                  variant="caption"
                  style={styles.welcomeText}
                >
                  Welcome back,
                </AppText>

                <AppText
                  variant="body"
                  style={styles.managerName}
                >
                  Manager Rohan
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.estateName}
                >
                  Nuwara Eliya Highlands
                </AppText>

              </View>

            </View>


            {/* NOTIFICATION BUTTON */}

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


          {/* =====================================================
              ESTATE BANNER
              ===================================================== */}

          <View style={styles.estateBanner}>

            <View style={styles.bannerIconContainer}>
              <Ionicons
                name="leaf-outline"
                size={32}
                color={colors.primary}
              />
            </View>

            <View style={styles.bannerTextContainer}>

              <AppText
                variant="subheading"
                style={styles.bannerTitle}
              >
                Tea Estate Highlands
              </AppText>

              <AppText
                variant="caption"
                style={styles.bannerSubtitle}
              >
                Nuwara Eliya
              </AppText>

            </View>

          </View>


          {/* =====================================================
              COLLECTION STATUS
              ===================================================== */}

          <AppText
            variant="caption"
            style={styles.sectionLabel}
          >
            COLLECTION STATUS
          </AppText>


          <View style={styles.progressCard}>

            <View style={styles.progressHeader}>

              <AppText
                variant="body"
                style={styles.progressTitle}
              >
                Daily Progress
              </AppText>

              <AppText
                variant="subheading"
                style={styles.progressPercentage}
              >
                82.7%
              </AppText>

            </View>


            {/* PROGRESS BAR */}

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>


            <AppText
              variant="caption"
              style={styles.progressDescription}
            >
              1,240 kg of 1,500 kg target collected
            </AppText>

          </View>


          {/* =====================================================
              DASHBOARD CARDS
              ===================================================== */}

          <View style={styles.cardsRow}>

            {/* DAILY TEA PLUCKING */}

            <Pressable
              style={styles.dashboardCard}
              onPress={openDailyPluckingDetails}
            >

              <View style={styles.cardIconBlue}>

                <Ionicons
                  name="leaf-outline"
                  size={25}
                  color="#5872A8"
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

              <AppText
                variant="caption"
                style={styles.cardSubtitle}
              >
                View daily details
              </AppText>

            </Pressable>


            {/* FERTILIZER STOCK */}

            <Pressable
              style={styles.dashboardCardGreen}
              onPress={openFertilizerStock}
            >

              <View style={styles.cardIconGreen}>

                <Ionicons
                  name="list-outline"
                  size={25}
                  color={colors.success}
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

              <AppText
                variant="caption"
                style={styles.cardSubtitle}
              >
                4,820 kg available
              </AppText>

            </Pressable>

          </View>


          {/* =====================================================
              TODAY'S SUMMARY
              ===================================================== */}

          <AppText
            variant="caption"
            style={styles.sectionLabel}
          >
            TODAY'S SUMMARY
          </AppText>


          <View style={styles.summaryCard}>

            {/* EMPLOYEES */}

            <View style={styles.summaryItem}>

              <View style={styles.summaryIcon}>

                <Ionicons
                  name="people-outline"
                  size={19}
                  color={colors.primary}
                />

              </View>

              <View style={styles.summaryText}>

                <AppText
                  variant="caption"
                  style={styles.summaryLabel}
                >
                  Employees
                </AppText>

                <AppText
                  variant="bodySmall"
                  style={styles.summaryValue}
                >
                  24
                </AppText>

              </View>

            </View>


            {/* DIVIDER */}

            <View style={styles.verticalDivider} />


            {/* TEA PLUCKED */}

            <View style={styles.summaryItem}>

              <View style={styles.summaryIcon}>

                <Ionicons
                  name="leaf-outline"
                  size={19}
                  color={colors.primary}
                />

              </View>

              <View style={styles.summaryText}>

                <AppText
                  variant="caption"
                  style={styles.summaryLabel}
                >
                  Tea Plucked
                </AppText>

                <AppText
                  variant="bodySmall"
                  style={styles.summaryValue}
                >
                  1,240 kg
                </AppText>

              </View>

            </View>


            {/* DIVIDER */}

            <View style={styles.verticalDivider} />


            {/* FERTILIZER */}

            <View style={styles.summaryItem}>

              <View style={styles.summaryIcon}>

                <Ionicons
                  name="flask-outline"
                  size={19}
                  color={colors.primary}
                />

              </View>

              <View style={styles.summaryText}>

                <AppText
                  variant="caption"
                  style={styles.summaryLabel}
                >
                  Fertilizer
                </AppText>

                <AppText
                  variant="bodySmall"
                  style={styles.summaryValue}
                >
                  4,820 kg
                </AppText>

              </View>

            </View>

          </View>


          {/* BOTTOM SPACE */}

          <View style={styles.bottomSpace} />

        </ScrollView>


        {/* =====================================================
            BOTTOM TAB
            ===================================================== */}

        <View style={styles.bottomTabContainer}>

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

  /* ============================================================
     SCREEN
     ============================================================ */

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
    paddingBottom: spacing.xl * 2,
  },


  /* ============================================================
     HEADER
     ============================================================ */

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
    fontSize: 10,
    lineHeight: 14,
  },

  managerName: {
    color: colors.text.primaryGreen,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
  },

  estateName: {
    color: colors.text.secondary,
    fontSize: 9,
    lineHeight: 13,
  },

  notificationButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },


  /* ============================================================
     ESTATE BANNER
     ============================================================ */

  estateBanner: {
    width: "100%",
    height: 148,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },

  bannerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
  },

  bannerTextContainer: {
    marginLeft: spacing.md,
  },

  bannerTitle: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: "600",
  },

  bannerSubtitle: {
    color: colors.text.secondary,
    fontSize: 10,
    marginTop: spacing.xs,
  },


  /* ============================================================
     SECTION LABEL
     ============================================================ */

  sectionLabel: {
    color: colors.text.tertiary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },


  /* ============================================================
     PROGRESS CARD
     ============================================================ */

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
    fontSize: 14,
    fontWeight: "500",
  },

  progressPercentage: {
    color: colors.success,
    fontSize: 16,
    fontWeight: "700",
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
    fontSize: 10,
  },


  /* ============================================================
     DASHBOARD CARDS
     ============================================================ */

  cardsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  dashboardCard: {
    flex: 1,
    minHeight: 130,
    backgroundColor: "#F1F5FF",
    borderWidth: 1,
    borderColor: "#D5DDEA",
    borderRadius: 8,
    padding: spacing.md,
  },

  dashboardCardGreen: {
    flex: 1,
    minHeight: 130,
    backgroundColor: "#EDF9F3",
    borderWidth: 1,
    borderColor: "#D1E8DC",
    borderRadius: 8,
    padding: spacing.md,
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
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },

  cardSubtitle: {
    color: colors.text.secondary,
    fontSize: 9,
    marginTop: spacing.xs,
  },


  /* ============================================================
     SUMMARY
     ============================================================ */

  summaryCard: {
    width: "100%",
    minHeight: 72,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },

  summaryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },

  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryText: {
    marginLeft: spacing.xs,
    flex: 1,
  },

  summaryLabel: {
    color: colors.text.secondary,
    fontSize: 8,
    lineHeight: 12,
  },

  summaryValue: {
    color: colors.text.primary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    marginTop: 1,
  },

  verticalDivider: {
    width: 1,
    height: 35,
    backgroundColor: colors.border.light,
  },


  /* ============================================================
     BOTTOM TAB
     ============================================================ */

  bottomSpace: {
    height: 80,
  },

  bottomTabContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

});