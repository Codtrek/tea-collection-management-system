
import React, { useState } from "react";
import * as ImagePicker from "expo-image-picker";

import {
  View,
  StyleSheet,
  Alert,
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
import AppCard from "@/components/ui/AppCard";
import GeneralHeader from "@/components/ui/GeneralHeader";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type EvidenceItem = {
  id: string;
  category: string;
  title: string;
  date: string;
  time: string;
  uri?: string;
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

  const [capturedEvidence, setCapturedEvidence] =
    useState<EvidenceItem[]>([]);

  const allEvidenceItems = [
    ...capturedEvidence,
    ...evidenceItems,
  ];

  // Capture photo evidence
  const captureEvidence = async () => {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Allow Harboost to access your camera to capture photo evidence."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const now = new Date();

      const date = now
        .toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
        .toUpperCase();

      const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const newEvidence: EvidenceItem = {
        id: `captured-${now.getTime()}`,
        category: "Captured Photo",
        title: "Field Evidence",
        date,
        time,
        uri: result.assets[0].uri,
      };

      setCapturedEvidence((current) => [
        newEvidence,
        ...current,
      ]);

    } catch (error) {
      console.error("Unable to open camera:", error);

      Alert.alert(
        "Camera Error",
        "The camera could not be opened. Please close and reopen the app, then try again."
      );
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

          {/* GENERAL HEADER */}

          <GeneralHeader
            title="Your Estate Name"
            description="Estate Manager"
            onNotificationPress={() =>
              router.push("/estatemanager/Notification")
            }
          />

          {/* PAGE TITLE */}

          <View style={styles.pageTitleRow}>
            <Ionicons
              name="images-outline"
              size={20}
              color={colors.text.primary}
            />

            <AppText
              variant="subHeading"
              style={styles.pageTitle}
            >
              Photo Evidence
            </AppText>
          </View>

          {/* CAPTURE EVIDENCE CARD */}

          <View style={styles.captureCard}>
            <Pressable
              style={({ pressed }) => [
                styles.cameraButton,
                pressed && styles.cameraButtonPressed,
              ]}
              onPress={captureEvidence}
              accessibilityRole="button"
              accessibilityLabel="Capture photo evidence"
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

          {/* RECENT UPLOADS HEADER */}

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

          {/* RECENT UPLOADS USING APPCARD */}

          <View style={styles.evidenceList}>

            {allEvidenceItems.map((item, index) => (

              <AppCard key={item.id}>

                <View style={styles.evidenceContent}>

                  {/* IMAGE */}

                  <View style={styles.imageContainer}>
                    <Image
                      source={{
                        uri:
                          item.uri ??
                          (index === 0
                            ? "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9"
                            : index === 1
                              ? "https://images.unsplash.com/photo-1500382017468-9049fed747ef"
                              : index === 2
                                ? "https://images.unsplash.com/photo-1565793298595-6a879b1d9492"
                                : "https://images.unsplash.com/photo-1516214104703-d870798883c5"),
                      }}
                      style={styles.evidenceImage}
                    />
                  </View>

                  {/* EVIDENCE DETAILS */}

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
                        size={12}
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
                    accessibilityRole="button"
                    accessibilityLabel={`More options for ${item.title}`}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={16}
                      color={colors.text.secondary}
                    />
                  </Pressable>

                </View>

              </AppCard>

            ))}

          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// STYLES

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

  // PAGE TITLE

  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  pageTitle: {
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },

  // CAPTURE EVIDENCE

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
    marginTop: spacing.sm,
  },

  captureDescription: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // RECENT UPLOADS HEADER

  uploadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  sectionTitle: {
    color: colors.primary,
  },

  sortText: {
    color: colors.text.secondary,
  },

  // EVIDENCE LIST

  evidenceList: {
    width: "100%",
  },

  evidenceContent: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  imageContainer: {
    width: 72,
    height: 76,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },

  evidenceImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  evidenceDetails: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },

  categoryContainer: {
    alignSelf: "flex-start",
    backgroundColor: colors.successBackground,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 3,
  },

  categoryText: {
    color: colors.primary,
  },

  evidenceTitle: {
    color: colors.text.primary,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  dateText: {
    color: colors.text.secondary,
    marginLeft: 3,
  },

  moreButton: {
    width: 26,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

});
