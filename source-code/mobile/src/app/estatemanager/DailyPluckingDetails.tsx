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

interface PluckingRecord {
  date: string;
  weight: string;
}

const pluckingRecords: PluckingRecord[] = [
  {
    date: "14 Aug, 2024",
    weight: "450.5 kg",
  },
  {
    date: "13 Aug, 2024",
    weight: "482.1 kg",
  },
  {
    date: "12 Aug, 2024",
    weight: "410.8 kg",
  },
  {
    date: "11 Aug, 2024",
    weight: "501.4 kg",
  },
];

export default function DailyPlucking() {
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
              paddingBottom: 100 + insets.bottom,
            },
          ]}
        >

          {/* ================= HEADER ================= */}

          <View style={styles.header}>

            {/* Back button */}

            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color={colors.text.primary}
              />
            </Pressable>

            <AppText
              variant="subheading"
              style={styles.headerTitle}
            >
              Daily Tea Plucking
            </AppText>

            {/* Header notification */}

            <Pressable
              style={styles.headerNotification}
              onPress={() =>
                router.push("/estatemanager/Notification")
              }
              hitSlop={8}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.text.primary}
              />
            </Pressable>

          </View>


          {/* ================= MONTH ================= */}

          <AppText
            variant="caption"
            style={styles.fieldLabel}
          >
            SELECT MONTH
          </AppText>

          <Pressable style={styles.monthSelector}>

            <AppText
              variant="bodySmall"
              style={styles.monthText}
            >
              August 2024
            </AppText>

            <Ionicons
              name="chevron-down"
              size={17}
              color={colors.text.secondary}
            />

          </Pressable>


          {/* ================= RECORDS TITLE ================= */}

          <AppText
            variant="caption"
            style={styles.recordsTitle}
          >
            AUGUST RECORDS
          </AppText>


          {/* ================= RECORD LIST ================= */}

          <View style={styles.recordsContainer}>

            {pluckingRecords.map((record, index) => (

              <Pressable
                key={record.date}
                style={[
                  styles.recordRow,
                  index === pluckingRecords.length - 1 &&
                    styles.lastRecordRow,
                ]}
              >

                {/* Calendar icon */}

                <View style={styles.calendarContainer}>

                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.success}
                  />

                </View>


                {/* Date */}

                <AppText
                  variant="bodySmall"
                  style={styles.recordDate}
                >
                  {record.date}
                </AppText>


                {/* Weight */}

                <AppText
                  variant="bodySmall"
                  style={styles.recordWeight}
                >
                  {record.weight}
                </AppText>

              </Pressable>

            ))}

          </View>


          {/* ================= ADD BUTTON ================= */}

          <Pressable
            style={[
              styles.addButton,
              {
                bottom: 65 + insets.bottom,
              },
            ]}
            onPress={() => {
              // Add daily plucking record later
            }}
          >
            <Ionicons
              name="add"
              size={28}
              color={colors.white}
            />
          </Pressable>


          {/* Space for bottom tab */}

          <View style={styles.bottomSpace} />

        </ScrollView>


        {/* ================= BOTTOM TAB ================= */}

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


/* ========================================================= */
/* STYLES */
/* ========================================================= */

const styles = StyleSheet.create({

  /* ================= SCREEN ================= */

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

    marginBottom: spacing.lg,
  },

  backButton: {
    width: 36,
    height: 36,

    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,

    color: colors.text.primaryGreen,

    marginLeft: spacing.xs,
  },

  headerNotification: {
    width: 36,
    height: 36,

    alignItems: "center",
    justifyContent: "center",
  },


  /* ================= MONTH ================= */

  fieldLabel: {
    color: colors.text.secondary,

    fontSize: 9,
    fontWeight: "500",

    marginBottom: spacing.xs,
  },

  monthSelector: {
    height: 38,

    backgroundColor: colors.background,

    borderWidth: 1,
    borderColor: colors.border.light,

    borderRadius: 5,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: spacing.sm,

    marginBottom: spacing.lg,
  },

  monthText: {
    color: colors.text.primary,

    fontSize: 11,
  },


  /* ================= RECORDS ================= */

  recordsTitle: {
    color: colors.text.secondary,

    fontSize: 9,
    fontWeight: "500",

    marginBottom: spacing.sm,
  },

  recordsContainer: {
    backgroundColor: colors.background,

    borderWidth: 1,
    borderColor: colors.border.light,

    borderRadius: 6,

    overflow: "hidden",
  },

  recordRow: {
    height: 48,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: spacing.sm,

    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  lastRecordRow: {
    borderBottomWidth: 0,
  },

  calendarContainer: {
    width: 27,
    height: 27,

    borderRadius: 7,

    backgroundColor: "#EAF4FF",

    alignItems: "center",
    justifyContent: "center",

    marginRight: spacing.sm,
  },

  recordDate: {
    flex: 1,

    color: colors.text.primary,

    fontSize: 11,
  },

  recordWeight: {
    color: colors.primary,

    fontSize: 13,
    fontWeight: "700",
  },


  /* ================= ADD BUTTON ================= */

  addButton: {
    position: "absolute",

    right: spacing.xs,

    width: 39,
    height: 39,

    borderRadius: 9,

    backgroundColor: "#00834B",

    alignItems: "center",
    justifyContent: "center",

    elevation: 4,

    shadowColor: colors.black,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.2,
    shadowRadius: 3,
  },


  /* ================= BOTTOM ================= */

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