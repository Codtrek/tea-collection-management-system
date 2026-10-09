import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AppText from "@/components/ui/AppText";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function NewEmployeeRegistration() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [employeeName, setEmployeeName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [age, setAge] = useState(32);

  const handleClose = () => {
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  const handleRegister = () => {
    // Employee registration logic can be connected later.
    router.back();
  };

  const decreaseAge = () => {
    setAge((current) => Math.max(18, current - 1));
  };

  const increaseAge = () => {
    setAge((current) => current + 1);
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
              paddingBottom: 100 + insets.bottom,
            },
          ]}
        >
          {/* ================= HEADER ================= */}

          <View style={styles.header}>
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={8}
            >
              <Ionicons
                name="close"
                size={22}
                color={colors.text.primary}
              />
            </Pressable>

            <AppText
              variant="subheading"
              style={styles.headerTitle}
            >
              New Employee Registration
            </AppText>
          </View>

          {/* ================= AUTOMATED ENROLLMENT ================= */}

          <View style={styles.enrollmentCard}>
            <View style={styles.enrollmentIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={colors.primary}
              />
            </View>

            <View style={styles.enrollmentContent}>
              <AppText
                variant="caption"
                style={styles.enrollmentTitle}
              >
                AUTOMATED ESTATE ENROLLMENT
              </AppText>

              <AppText
                variant="caption"
                style={styles.enrollmentDescription}
              >
                New employees are automatically enrolled
                for biometric daily harvesting and
                RFID scale badges.
              </AppText>
            </View>
          </View>

          {/* ================= PHOTO ================= */}

          <View style={styles.photoCard}>
            <Pressable style={styles.photoButton}>
              <View style={styles.cameraContainer}>
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={colors.text.secondary}
                />

                <View style={styles.addBadge}>
                  <Ionicons
                    name="add"
                    size={15}
                    color={colors.white}
                  />
                </View>
              </View>

              <AppText
                variant="caption"
                style={styles.photoText}
              >
                Tap photo
              </AppText>
            </Pressable>

            <AppText
              variant="caption"
              style={styles.photoDescription}
            >
              Enter worker details for Nuwara Eliya tea estate
              enrollment and attendance tracking.
            </AppText>
          </View>

          {/* ================= PERSONAL INFORMATION ================= */}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="briefcase-outline"
                size={17}
                color={colors.primary}
              />

              <AppText
                variant="bodySmall"
                style={styles.sectionTitle}
              >
                Personal Information
              </AppText>
            </View>

            {/* EMPLOYEE NAME */}

            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <AppText
                  variant="caption"
                  style={styles.fieldLabel}
                >
                  Employee Name *
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.fieldHint}
                >
                  Primary Identity
                </AppText>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={colors.text.secondary}
                />

                <TextInput
                  value={employeeName}
                  onChangeText={setEmployeeName}
                  placeholder="e.g. Kamalanathan Perera"
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.input}
                />
              </View>
            </View>

            {/* ID NUMBER */}

            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <AppText
                  variant="caption"
                  style={styles.fieldLabel}
                >
                  Identity Card (NIC / ID) *
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.fieldHint}
                >
                  Official Record
                </AppText>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="card-outline"
                  size={14}
                  color={colors.text.secondary}
                />

                <TextInput
                  value={employeeId}
                  onChangeText={setEmployeeId}
                  placeholder="e.g. 198824501234 or 882451234V"
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.input}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* AGE */}

            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <AppText
                  variant="caption"
                  style={styles.fieldLabel}
                >
                  Age *
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.fieldHint}
                >
                  Years (18+)
                </AppText>
              </View>

              <View style={styles.ageRow}>
                <View style={styles.ageValueContainer}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={colors.text.secondary}
                  />

                  <AppText
                    variant="bodySmall"
                    style={styles.ageValue}
                  >
                    {age}
                  </AppText>
                </View>

                <Pressable
                  style={styles.ageButton}
                  onPress={decreaseAge}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={colors.text.primary}
                  />
                </Pressable>

                <Pressable
                  style={styles.ageButton}
                  onPress={increaseAge}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={colors.text.primary}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ================= BOTTOM ACTIONS ================= */}

        <View
          style={[
            styles.bottomActions,
            {
              paddingBottom: Math.max(
                insets.bottom,
                spacing.sm
              ),
            },
          ]}
        >
          <Pressable
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <AppText
              variant="bodySmall"
              style={styles.cancelText}
            >
              CANCEL
            </AppText>
          </Pressable>

          <Pressable
            style={styles.registerButton}
            onPress={handleRegister}
          >
            <Ionicons
              name="briefcase-outline"
              size={16}
              color={colors.white}
            />

            <AppText
              variant="bodySmall"
              style={styles.registerText}
            >
              Register Employee
            </AppText>
          </Pressable>
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

  /* ================= HEADER ================= */

  header: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  closeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },

  /* ================= ENROLLMENT ================= */

  enrollmentCard: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },

  enrollmentIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
  },

  enrollmentContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  enrollmentTitle: {
    color: colors.primary,
  },

  enrollmentDescription: {
    color: colors.text.secondary,
    marginTop: 2,
  },

  /* ================= PHOTO ================= */

  photoCard: {
    backgroundColor: colors.background,
    borderRadius: 7,
    padding: spacing.sm,
    alignItems: "center",
    marginBottom: spacing.md,
  },

  photoButton: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 95,
  },

  cameraContainer: {
    width: 56,
    height: 56,
    borderRadius: 9,
    backgroundColor: "#E8EDF9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  addBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  photoText: {
    color: colors.text.secondary,
    marginTop: 3,
  },

  photoDescription: {
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },

  /* ================= PERSONAL INFORMATION ================= */

  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: 7,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  sectionTitle: {
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },

  fieldContainer: {
    marginBottom: spacing.sm,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },

  fieldLabel: {
    color: colors.text.primary,
  },

  fieldHint: {
    color: colors.text.secondary,
  },

  inputContainer: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F3FB",
    borderRadius: 5,
    paddingHorizontal: spacing.sm,
  },

  input: {
    flex: 1,
    marginLeft: spacing.xs,
    paddingVertical: 0,
    color: colors.text.primary,
  },

  /* ================= AGE ================= */

  ageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  ageValueContainer: {
    flex: 1,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F3FB",
    borderRadius: 5,
    paddingHorizontal: spacing.sm,
  },

  ageValue: {
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },

  ageButton: {
    width: 38,
    height: 38,
    borderRadius: 5,
    backgroundColor: "#F0F3FB",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ================= BOTTOM ACTIONS ================= */

  bottomActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },

  cancelButton: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    backgroundColor: "#E8EDF9",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    color: colors.text.secondary,
  },

  registerButton: {
    flex: 1.5,
    height: 38,
    borderRadius: 6,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  registerText: {
    color: colors.white,
    marginLeft: spacing.xs,
  },
});