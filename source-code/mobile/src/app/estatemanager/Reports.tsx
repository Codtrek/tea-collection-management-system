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
import EstateManagerBottomTab from "@/components/ui/EstateManagerBottomTab";

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
    id: "plucking",
    label: "Plucking Yield",
    checked: true,
  },
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
  {
    id: "expense",
    label: "Expense & Advances",
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

  const [activeTab, setActiveTab] = useState("reports");
  const [selectedPeriod, setSelectedPeriod] =
    useState<ReportPeriod>("Weekly");

  const [datasets, setDatasets] =
    useState<Dataset[]>(initialDatasets);

  const toggleDataset = (id: string) => {
    setDatasets((current) =>
      current.map((dataset) =>
        dataset.id === id
          ? {
              ...dataset,
              checked: !dataset.checked,
            }
          : dataset
      )
    );
  };

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

  const handleGenerateReport = () => {
    // Report generation logic can be connected later.
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
            <View style={styles.headerText}>
              <AppText
                variant="subheading"
                style={styles.headerTitle}
              >
                Generate Reports
              </AppText>

              <AppText
                variant="caption"
                style={styles.headerDescription}
              >
                Generate, preview and download operational
                summaries.
              </AppText>
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

          {/* ================= GENERATE REPORT CARD ================= */}

          <View style={styles.generateCard}>
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
              {(["Weekly", "Monthly", "Yearly"] as ReportPeriod[]).map(
                (period) => {
                  const selected =
                    selectedPeriod === period;

                  return (
                    <Pressable
                      key={period}
                      style={[
                        styles.periodButton,
                        selected && styles.periodButtonActive,
                      ]}
                      onPress={() =>
                        setSelectedPeriod(period)
                      }
                    >
                      <AppText
                        variant="caption"
                        style={[
                          styles.periodText,
                          selected &&
                            styles.periodTextActive,
                        ]}
                      >
                        {period}
                      </AppText>
                    </Pressable>
                  );
                }
              )}
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

            {/* DATASETS */}

            <AppText
              variant="caption"
              style={styles.datasetLabel}
            >
              INCLUDE OPERATIONAL DATASETS
            </AppText>

            <View style={styles.datasetGrid}>
              {datasets.map((dataset) => (
                <Pressable
                  key={dataset.id}
                  style={styles.datasetItem}
                  onPress={() =>
                    toggleDataset(dataset.id)
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      dataset.checked &&
                        styles.checkboxChecked,
                    ]}
                  >
                    {dataset.checked && (
                      <Ionicons
                        name="checkmark"
                        size={11}
                        color={colors.white}
                      />
                    )}
                  </View>

                  <AppText
                    variant="caption"
                    style={styles.datasetText}
                    numberOfLines={1}
                  >
                    {dataset.label}
                  </AppText>
                </Pressable>
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
          </View>

          {/* ================= RECENTLY CREATED ================= */}

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

          {/* ================= REPORT LIST ================= */}

          <View style={styles.reportsList}>
            {recentReports.map((report) => (
              <View
                key={report.id}
                style={styles.reportCard}
              >
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
              </View>
            ))}
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* ================= BOTTOM NAVIGATION ================= */}

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
  minHeight: 60,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: spacing.md,
},

headerText: {
  flex: 1,
},

headerTitle: {
  color: colors.text.primaryGreen,
},

headerDescription: {
  color: colors.text.secondary,
  marginTop: 2,
  maxWidth: 250,
},

notificationButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
},
  /* ================= GENERATE CARD ================= */

  generateCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },

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

  /* ================= PERIOD SELECTOR ================= */

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

  /* ================= FORM ================= */

  fieldLabel: {
    color: colors.text.secondary,
    marginBottom: 3,
  },

  selectField: {
    height: 34,
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

  datasetLabel: {
    color: colors.text.secondary,
    marginBottom: 3,
  },

  datasetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: spacing.sm,
  },

  datasetItem: {
    width: "48%",
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F3FB",
    borderRadius: 5,
    paddingHorizontal: 5,
  },

  checkbox: {
    width: 13,
    height: 13,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },

  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  datasetText: {
    flex: 1,
    color: colors.text.primary,
    marginLeft: 4,
  },

  /* ================= RANGE ================= */

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

  /* ================= GENERATE BUTTON ================= */

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

  /* ================= RECENT REPORTS ================= */

  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  reportsList: {
    gap: spacing.sm,
  },

  reportCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 7,
    padding: spacing.sm,
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

  /* ================= BOTTOM NAVIGATION ================= */

  bottomSpace: {
    height: spacing.xl * 2,
  },

  bottomTabContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
  },
});