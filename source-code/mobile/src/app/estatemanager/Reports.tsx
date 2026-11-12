
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
import AppCard from "@/components/ui/AppCard";
import FormCheckbox from "@/components/forms/FormCheckbox";
import GeneralHeader from "@/components/ui/GeneralHeader";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type ReportPeriod = "Weekly" | "Monthly" | "Yearly";

interface Dataset {
  id: string;
  label: string;
  checked: boolean;
}

interface RecentReport {
  id: string;
  type: string;
  title: string;
  details: string;
  size: string;
  location: string;
}

const initialDatasets: Dataset[] = [
  {
    id: "fertilizer",
    label: "Fertilizer Stock",
    checked: true,
  },
  {
    id: "attendance",
    label: "Staff Attendance",
    checked: false,
  },
];

const recentReports: RecentReport[] = [
  {
    id: "1",
    type: "PDF",
    title: "July Complete Estate Audit",
    details: "Monthly • Generated Aug 01",
    size: "4.8 MB",
    location: "Master",
  },
  {
    id: "2",
    type: "XLSX",
    title: "Weekly Plucking Report",
    details: "Weekly • Generated Jul 28",
    size: "1.1 MB",
    location: "Master",
  },
];

export default function Reports() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedPeriod, setSelectedPeriod] =
    useState<ReportPeriod>("Weekly");

  const [datasets, setDatasets] =
    useState<Dataset[]>(initialDatasets);

  const toggleDataset = (id: string, checked: boolean) => {
    setDatasets((current) =>
      current.map((dataset) =>
        dataset.id === id
          ? { ...dataset, checked }
          : dataset
      )
    );
  };

  const handleGenerateReport = () => {
    // Connect report generation functionality here later.
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
          {/* GENERAL HEADER */}
          <GeneralHeader
            title="Your Estate Name"
            description="Estate Manager"
            onNotificationPress={() =>
              router.push("/estatemanager/Notification")
            }
          />

          {/* PAGE HEADER */}
          <View style={styles.pageHeader}>
            <AppText
              variant="subHeading"
              style={styles.pageTitle}
            >
              Generate Reports
            </AppText>

            <AppText
              variant="caption"
              style={styles.pageDescription}
            >
              Generate, preview and download operational summaries.
            </AppText>
          </View>

          {/* GENERATE REPORT CARD */}
          <AppCard>
            {/* CARD HEADER */}
            <View style={styles.generateHeader}>
              <View style={styles.reportIconContainer}>
                <Ionicons
                  name="bar-chart-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>

              <View style={styles.generateHeaderText}>
                <AppText
                  variant="bodySmall"
                  style={styles.generateTitle}
                >
                  Generate Report
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.generateSubtitle}
                >
                  Export calibrated field records
                </AppText>
              </View>

              <Ionicons
                name="options-outline"
                size={19}
                color={colors.text.secondary}
              />
            </View>

            {/* PERIOD SELECTOR */}
            <View style={styles.periodSelector}>
              {(
                ["Weekly", "Monthly", "Yearly"] as ReportPeriod[]
              ).map((period) => {
                const selected = selectedPeriod === period;

                return (
                  <Pressable
                    key={period}
                    style={[
                      styles.periodButton,
                      selected && styles.periodButtonActive,
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <AppText
                      variant="caption"
                      style={[
                        styles.periodText,
                        selected && styles.periodTextActive,
                      ]}
                    >
                      {period}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* TARGET ESTATE */}
            <AppText
              variant="caption"
              style={styles.fieldLabel}
            >
              TARGET ESTATE / SECTOR
            </AppText>

            <Pressable style={styles.selectField}>
              <View style={styles.selectFieldLeft}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={colors.primary}
                />

                <AppText
                  variant="caption"
                  style={styles.selectText}
                >
                  Nuwara Eliya Highlands - Main Division
                </AppText>
              </View>

              <Ionicons
                name="chevron-down"
                size={15}
                color={colors.text.secondary}
              />
            </Pressable>

            {/* OPERATIONAL DATASETS */}
            <AppText
              variant="caption"
              style={styles.datasetLabel}
            >
              INCLUDE OPERATIONAL DATASETS
            </AppText>

            <View style={styles.datasetGrid}>
              {datasets.map((dataset) => (
                <View
                  key={dataset.id}
                  style={styles.datasetItem}
                >
                  <FormCheckbox
                    label={dataset.label}
                    checked={dataset.checked}
                    onValueChange={(checked) =>
                      toggleDataset(dataset.id, checked)
                    }
                    containerStyle={styles.checkboxContainer}
                    labelStyle={styles.datasetText}
                  />
                </View>
              ))}
            </View>

            {/* EFFECTIVE RANGE */}
            <View style={styles.rangeField}>
              <View style={styles.rangeLeft}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={colors.primary}
                />

                <AppText
                  variant="caption"
                  style={styles.rangeLabel}
                >
                  Effective Range:
                </AppText>
              </View>

              <AppText
                variant="bodySmall"
                style={styles.rangeValue}
              >
                Week 34, 2024
              </AppText>
            </View>

            {/* GENERATE BUTTON */}
            <Pressable
              style={styles.generateButton}
              onPress={handleGenerateReport}
            >
              <Ionicons
                name="flash-outline"
                size={19}
                color={colors.text.primary}
              />

              <AppText
                variant="bodySmall"
                style={styles.generateButtonText}
              >
                Generate Report
              </AppText>
            </Pressable>
          </AppCard>

          {/* RECENTLY CREATED */}
          <View style={styles.recentHeader}>
            <View style={styles.recentTitleRow}>
              <AppText
                variant="bodySmall"
                style={styles.recentTitle}
              >
                Recently Created
              </AppText>

              <View style={styles.newBadge}>
                <AppText
                  variant="caption"
                  style={styles.newBadgeText}
                >
                  New
                </AppText>
              </View>
            </View>

            <Pressable>
              <AppText
                variant="caption"
                style={styles.seeAllText}
              >
                See All
              </AppText>
            </Pressable>
          </View>

          {/* RECENT REPORT LIST */}
          <View style={styles.reportsList}>
            {recentReports.map((report) => (
              <AppCard key={report.id}>
                <View style={styles.reportCardTop}>
                  <View style={styles.fileIconContainer}>
                    <AppText
                      variant="caption"
                      style={styles.fileType}
                    >
                      {report.type}
                    </AppText>
                  </View>

                  <View style={styles.reportInfo}>
                    <AppText
                      variant="bodySmall"
                      style={styles.reportTitle}
                      numberOfLines={1}
                    >
                      {report.title}
                    </AppText>

                    <AppText
                      variant="caption"
                      style={styles.reportDetails}
                      numberOfLines={1}
                    >
                      {report.details}
                    </AppText>
                  </View>

                  <AppText
                    variant="caption"
                    style={styles.reportSize}
                  >
                    {report.size}
                  </AppText>
                </View>

                <View style={styles.reportCardBottom}>
                  <View style={styles.locationRow}>
                    <Ionicons
                      name="folder-outline"
                      size={13}
                      color={colors.text.secondary}
                    />

                    <AppText
                      variant="caption"
                      style={styles.locationText}
                    >
                      {report.location}
                    </AppText>
                  </View>

                  <View style={styles.reportActions}>
                    <Pressable style={styles.actionButton}>
                      <Ionicons
                        name="eye-outline"
                        size={17}
                        color={colors.text.secondary}
                      />
                    </Pressable>

                    <Pressable
                      style={[
                        styles.actionButton,
                        styles.downloadButton,
                      ]}
                    >
                      <Ionicons
                        name="download-outline"
                        size={17}
                        color={colors.primary}
                      />
                    </Pressable>
                  </View>
                </View>
              </AppCard>
            ))}
          </View>

          <View style={styles.bottomSpace} />
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

  // PAGE HEADER
  pageHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  pageTitle: {
    color: colors.text.primaryGreen,
  },

  pageDescription: {
    color: colors.text.secondary,
    marginTop: 2,
    maxWidth: 280,
  },

  // GENERATE CARD
  generateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  reportIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
  },

  generateHeaderText: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  generateTitle: {
    color: colors.text.primary,
  },

  generateSubtitle: {
    color: colors.text.secondary,
    marginTop: 1,
  },

  // PERIOD SELECTOR
  periodSelector: {
    height: 30,
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderRadius: 6,
    padding: 2,
    marginBottom: spacing.sm,
  },

  periodButton: {
    flex: 1,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  periodButtonActive: {
    backgroundColor: colors.primary,
  },

  periodText: {
    color: colors.text.secondary,
  },

  periodTextActive: {
    color: colors.text.primary,
  },

  // TARGET ESTATE
  fieldLabel: {
    color: colors.text.secondary,
    marginBottom: 3,
  },

  selectField: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 5,
    backgroundColor: "#F5F7FC",
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  selectFieldLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.xs,
  },

  selectText: {
    color: colors.text.primary,
    marginLeft: 4,
  },

  // DATASETS
  datasetLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },

  datasetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  datasetItem: {
    width: "47%",
  },

  checkboxContainer: {
    alignItems: "center",
  },

  datasetText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
  },

  // EFFECTIVE RANGE
  rangeField: {
    minHeight: 34,
    backgroundColor: "#EEF8F3",
    borderRadius: 5,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  rangeLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  rangeLabel: {
    color: colors.text.secondary,
    marginLeft: 4,
  },

  rangeValue: {
    color: colors.text.primary,
  },

  // GENERATE BUTTON
  generateButton: {
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  generateButtonText: {
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },

  // RECENT REPORTS HEADER
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  recentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  recentTitle: {
    color: colors.text.primary,
  },

  newBadge: {
    backgroundColor: colors.successBackground,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 4,
  },

  newBadgeText: {
    color: colors.success,
  },

  seeAllText: {
    color: colors.text.primaryGreen,
  },

  // REPORT LIST
  reportsList: {
    gap: spacing.sm,
  },

  reportCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  fileIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },

  fileType: {
    color: "#D64B4B",
  },

  reportInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  reportTitle: {
    color: colors.text.primary,
  },

  reportDetails: {
    color: colors.text.secondary,
    marginTop: 1,
  },

  reportSize: {
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },

  reportCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationText: {
    color: colors.text.secondary,
    marginLeft: 3,
  },

  reportActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: "#F2F4F8",
    alignItems: "center",
    justifyContent: "center",
  },

  downloadButton: {
    backgroundColor: colors.successBackground,
  },

  bottomSpace: {
    height: spacing.xl * 2,
  },
});
