import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import EstateManagerBottomTab from "@/components/ui/EstateManagerBottomTab";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

export default function TeaEstateManagerDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Temporary dashboard values
  const collected = 1240;
  const target = 1500;

  const progress = collected / target;
  const progressPercentage = (progress * 100).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>

        {/* ================= MAIN CONTENT ================= */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* ================= HEADER ================= */}

          <View style={styles.header}>

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

            {/* Notification */}

            <Pressable style={styles.notificationButton}>
              <Ionicons
                name="notifications-outline"
                size={23}
                color={colors.text.primaryGreen}
              />
            </Pressable>

          </View>


          {/* ================= ESTATE IMAGE ================= */}

          <View style={styles.estateImageContainer}>

            <Image
              source={{
                uri:
                  "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9",
              }}
              style={styles.estateImage}
              resizeMode="cover"
            />

          </View>


          {/* ================= COLLECTION STATUS ================= */}

          <AppText
            variant="caption"
            style={styles.sectionTitle}
          >
            COLLECTION STATUS
          </AppText>


          {/* Progress Card */}

          <View style={styles.progressCard}>

            <View style={styles.progressHeader}>

              <AppText
                variant="bodySmall"
                style={styles.dailyProgress}
              >
                Daily Progress
              </AppText>

              <AppText
                variant="body"
                style={styles.progressPercentage}
              >
                {progressPercentage}%
              </AppText>

            </View>


            {/* Progress Bar */}

            <View style={styles.progressBackground}>

              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress * 100}%`,
                  },
                ]}
              />

            </View>


            <AppText
              variant="caption"
              style={styles.progressText}
            >
              {collected.toLocaleString()}kg of{" "}
              {target.toLocaleString()}kg target collected
            </AppText>

          </View>


          {/* ================= DASHBOARD CARDS ================= */}

          <View style={styles.cardsRow}>

            {/* Collections Card */}

            <Pressable
              style={styles.dashboardCard}
              onPress={() => setActiveTab("dashboard")}
            >

              <View style={styles.blueIcon}>

                <Ionicons
                  name="bicycle-outline"
                  size={24}
                  color="#5473B5"
                />

              </View>

              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
              >
                Collections
              </AppText>

              <AppText
                variant="subheading"
                style={styles.cardValue}
              >
                12
              </AppText>

              <AppText
                variant="caption"
                style={styles.cardDescription}
              >
                Today's pickups
              </AppText>

            </Pressable>


            {/* Requests Card */}

            <Pressable
              style={styles.dashboardCard}
              onPress={() => setActiveTab("dashboard")}
            >

              <View style={styles.greenIcon}>

                <Ionicons
                  name="list-outline"
                  size={24}
                  color={colors.text.primaryGreen}
                />

              </View>

              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
              >
                Requests
              </AppText>

              <AppText
                variant="subheading"
                style={styles.cardValue}
              >
                8
              </AppText>

              <AppText
                variant="caption"
                style={styles.cardDescription}
              >
                Pending requests
              </AppText>

            </Pressable>

          </View>


          {/* Extra space so content doesn't hide behind bottom tab */}

          <View style={styles.bottomSpace} />

        </ScrollView>


        {/* ================= BOTTOM TAB ================= */}

        <View style={styles.bottomTab}>

          <EstateManagerBottomTab
            activeTab={activeTab}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
            }}
          />

        </View>

      </View>
    </SafeAreaView>
  );
}


/* ========================================================= */
/* STYLES */
/* ========================================================= */

const styles = StyleSheet.create({

  /* ================= SCREEN ================= */

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


  /* ================= HEADER ================= */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: spacing.md,
  },

  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileText: {
    marginLeft: spacing.sm,
  },

  welcomeText: {
    color: colors.text.tertiary,
  },

  managerName: {
    color: colors.text.primaryGreen,
    fontWeight: "700",
  },

  estateName: {
    color: colors.text.tertiary,
  },

  notificationButton: {
    width: 40,
    height: 40,

    alignItems: "center",
    justifyContent: "center",
  },


  /* ================= ESTATE IMAGE ================= */

  estateImageContainer: {
    width: "100%",
    height: 150,

    borderRadius: spacing.sm,
    overflow: "hidden",

    borderWidth: 1,
    borderColor: colors.border.light,

    backgroundColor: colors.surface,

    marginBottom: spacing.lg,
  },

  estateImage: {
    width: "100%",
    height: "100%",
  },


  /* ================= COLLECTION STATUS ================= */

  sectionTitle: {
    color: colors.text.tertiary,
    fontWeight: "600",

    letterSpacing: 0.7,

    marginBottom: spacing.sm,
  },

  progressCard: {
    backgroundColor: colors.background,

    borderWidth: 1,
    borderColor: colors.border.default,

    borderRadius: spacing.sm,

    padding: spacing.sm + 5,

    marginBottom: spacing.lg,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: spacing.sm,
  },

  dailyProgress: {
    color: colors.text.secondary,
  },

  progressPercentage: {
    color: colors.success,
    fontWeight: "700",
  },


  /* ================= PROGRESS BAR ================= */

  progressBackground: {
    height: 7,
    width: "100%",

    backgroundColor: "#E5EBF7",

    borderRadius: spacing.xs,
    overflow: "hidden",

    marginBottom: spacing.xs,
  },

  progressFill: {
    height: "100%",

    backgroundColor: colors.primary,

    borderRadius: spacing.xs,
  },

  progressText: {
    color: colors.text.tertiary,
  },


  /* ================= DASHBOARD CARDS ================= */

  cardsRow: {
    flexDirection: "row",

    gap: spacing.sm,
  },

  dashboardCard: {
    flex: 1,

    minHeight: 150,

    backgroundColor: colors.surface,

    borderWidth: 1,
    borderColor: colors.border.light,

    borderRadius: spacing.sm,

    padding: spacing.sm + 5,
  },

  blueIcon: {
    width: 38,
    height: 38,

    borderRadius: spacing.sm,

    backgroundColor: "#DDE6FA",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: spacing.sm,
  },

  greenIcon: {
    width: 38,
    height: 38,

    borderRadius: spacing.sm,

    backgroundColor: colors.successBackground,

    alignItems: "center",
    justifyContent: "center",

    marginBottom: spacing.sm,
  },

  cardTitle: {
    color: colors.text.secondary,
  },

  cardValue: {
    color: colors.text.primary,

    fontWeight: "700",

    marginTop: spacing.xs,
  },

  cardDescription: {
    color: colors.text.tertiary,

    marginTop: 2,
  },


  /* ================= BOTTOM NAVIGATION ================= */

  bottomSpace: {
    height: spacing.xl * 2,
  },

  bottomTab: {
    position: "absolute",

    left: 0,
    right: 0,
    bottom: 0,
  },
});