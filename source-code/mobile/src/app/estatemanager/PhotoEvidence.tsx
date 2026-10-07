import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
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

type EvidenceItem = {
  id: string;
  category: string;
  title: string;
  date: string;
  time: string;
};

const evidenceItems: EvidenceItem[] = [
  {
    id: "1",
    category: "Leaf Health",
    title: "Block A-12 Inspection",
    date: "OCT 24, 2023",
    time: "10:30 AM",
  },
  {
    id: "2",
    category: "General",
    title: "Terrace Perimeter Check",
    date: "OCT 23, 2023",
    time: "04:15 PM",
  },
  {
    id: "3",
    category: "Factory",
    title: "Processing Unit 04",
    date: "OCT 23, 2023",
    time: "09:08 AM",
  },
  {
    id: "4",
    category: "Botanical",
    title: "Tea Plant Growth",
    date: "OCT 22, 2023",
    time: "02:20 PM",
  },
];

export default function PhotoEvidence() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("photoEvidence");

  /* =====================================================
     NOTIFICATIONS
     ===================================================== */

  const openNotifications = () => {
    router.push("/estatemanager/Notification");
  };

  /* =====================================================
     CAPTURE EVIDENCE
     ===================================================== */

  const captureEvidence = () => {
    // Camera functionality can be connected later.
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
              paddingBottom: spacing.xl * 2 + insets.bottom,
            },
          ]}
        >

          {/* =================================================
              HEADER
              Same style as Estate Manager dashboard
              ================================================= */}

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


          {/* =================================================
              PAGE TITLE
              ================================================= */}

          <View style={styles.pageTitleRow}>

            <Ionicons
              name="images-outline"
              size={20}
              color={colors.text.primary}
            />

            <AppText
              variant="subheading"
              style={styles.pageTitle}
            >
              Photo Evidence
            </AppText>

          </View>


          {/* =================================================
              CAPTURE EVIDENCE CARD
              ================================================= */}

          <View style={styles.captureCard}>

            <Pressable
              style={({ pressed }) => [
                styles.cameraButton,
                pressed && styles.cameraButtonPressed,
              ]}
              onPress={captureEvidence}
            >
              <Ionicons
                name="camera"
                size={27}
                color={colors.white}
              />
            </Pressable>

            <AppText
              variant="bodySmall"
              style={styles.captureTitle}
            >
              Capture Evidence
            </AppText>

            <AppText
              variant="caption"
              style={styles.captureDescription}
            >
              Tap to add a geo-tagged field photo
            </AppText>

          </View>


          {/* =================================================
              RECENT UPLOADS
              ================================================= */}

          <View style={styles.uploadHeader}>

            <AppText
              variant="caption"
              style={styles.sectionTitle}
            >
              Recent Uploads
            </AppText>

            <AppText
              variant="caption"
              style={styles.sortText}
            >
              Sort: Newest
            </AppText>

          </View>


          {/* =================================================
              EVIDENCE CARDS
              ================================================= */}

          <View style={styles.evidenceList}>

            {evidenceItems.map((item, index) => (

              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.evidenceCard,
                  pressed && styles.evidenceCardPressed,
                ]}
              >

                {/* IMAGE PLACEHOLDER */}

                <View style={styles.imageContainer}>

                  <Image
                    source={{
                      uri:
                        index === 0
                          ? "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9"
                          : index === 1
                            ? "https://images.unsplash.com/photo-1500382017468-9049fed747ef"
                            : index === 2
                              ? "https://images.unsplash.com/photo-1565793298595-6a879b1d9492"
                              : "https://images.unsplash.com/photo-1516214104703-d870798883c5",
                    }}
                    style={styles.evidenceImage}
                  />

                </View>


                {/* DETAILS */}

                <View style={styles.evidenceDetails}>

                  <View style={styles.categoryContainer}>

                    <AppText
                      variant="caption"
                      style={styles.categoryText}
                    >
                      {item.category}
                    </AppText>

                  </View>

                  <AppText
                    variant="bodySmall"
                    style={styles.evidenceTitle}
                    numberOfLines={1}
                  >
                    {item.title}
                  </AppText>

                  <View style={styles.dateRow}>

                    <Ionicons
                      name="time-outline"
                      size={10}
                      color={colors.text.secondary}
                    />

                    <AppText
                      variant="caption"
                      style={styles.dateText}
                    >
                      {item.date} · {item.time}
                    </AppText>

                  </View>

                </View>


                {/* MORE BUTTON */}

                <Pressable
                  style={styles.moreButton}
                  hitSlop={8}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={14}
                    color={colors.text.secondary}
                  />
                </Pressable>

              </Pressable>

            ))}

          </View>

        </ScrollView>


        {/* =================================================
            BOTTOM TAB
            ================================================= */}

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

  /* ==========================================================
     SCREEN
     ========================================================== */

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


  /* ==========================================================
     HEADER
     Copied from the existing Estate Manager visual system
     ========================================================== */

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


  /* ==========================================================
     PAGE TITLE
     ========================================================== */

  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  pageTitle: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },


  /* ==========================================================
     CAPTURE CARD
     ========================================================== */

  captureCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },

  cameraButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },

  cameraButtonPressed: {
    opacity: 0.8,
  },

  captureTitle: {
    color: colors.text.primary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500",
    marginTop: spacing.sm,
  },

  captureDescription: {
    color: colors.text.secondary,
    fontSize: 9,
    lineHeight: 13,
    marginTop: spacing.xs,
  },


  /* ==========================================================
     UPLOAD HEADER
     ========================================================== */

  uploadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  sectionTitle: {
    color: colors.primary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
  },

  sortText: {
    color: colors.text.secondary,
    fontSize: 9,
  },


  /* ==========================================================
     EVIDENCE LIST
     ========================================================== */

  evidenceList: {
    width: "100%",
  },

  evidenceCard: {
    width: "100%",
    height: 67,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: spacing.sm,
  },

  evidenceCardPressed: {
    opacity: 0.8,
  },

  imageContainer: {
    width: 72,
    height: "100%",
    backgroundColor: colors.surface,
  },

  evidenceImage: {
    width: "100%",
    height: "100%",
  },

  evidenceDetails: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
  },

  categoryContainer: {
    alignSelf: "flex-start",
    backgroundColor: colors.successBackground,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 2,
  },

  categoryText: {
    color: colors.primary,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "600",
  },

  evidenceTitle: {
    color: colors.text.primary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  dateText: {
    color: colors.text.secondary,
    fontSize: 8,
    lineHeight: 11,
    marginLeft: 3,
  },

  moreButton: {
    width: 28,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
  },


  /* ==========================================================
     BOTTOM TAB
     ========================================================== */

  bottomTabContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
  },
});