import React, { useMemo, useState } from "react";
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
import Avatar from "@/components/ui/Avatar";
import EstateManagerBottomTab from "@/components/ui/EstateManagerBottomTab";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type Employee = {
  id: string;
  name: string;
  joinedDate: string;
  active: boolean;
};

const EMPLOYEES: Employee[] = [
  {
    id: "EMP001",
    name: "Arjun Das",
    joinedDate: "Jan 12, 2022",
    active: true,
  },
  {
    id: "EMP002",
    name: "Priya Sharma",
    joinedDate: "Mar 05, 2021",
    active: true,
  },
  {
    id: "EMP003",
    name: "Lakshmi Iyer",
    joinedDate: "Nov 20, 2023",
    active: true,
  },
  {
    id: "EMP004",
    name: "Rohan Mehta",
    joinedDate: "Aug 15, 2018",
    active: true,
  },
  {
    id: "EMP005",
    name: "Deepa Kaur",
    joinedDate: "Feb 28, 2024",
    active: true,
  },
  {
    id: "EMP006",
    name: "Sanjay Verma",
    joinedDate: "Jan 10, 2020",
    active: false,
  },
];

export default function Employees() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("employees");
  const [searchText, setSearchText] = useState("");

  /* =====================================================
     SEARCH + ALPHABETICAL SORT
     ===================================================== */

  const filteredEmployees = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return EMPLOYEES
      .filter((employee) => {
        if (!search) return true;

        return (
          employee.name.toLowerCase().includes(search) ||
          employee.id.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [searchText]);

  /* =====================================================
     NOTIFICATIONS
     ===================================================== */

  const openNotifications = () => {
    router.push("/estatemanager/Notification");
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

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <View style={styles.screen}>

        {/* =================================================
            MAIN CONTENT
            ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 120 + insets.bottom,
            },
          ]}
        >

          {/* =================================================
              HEADER
              Same structure as Estate Manager dashboard
              ================================================= */}

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


            {/* NOTIFICATION */}

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

          <View style={styles.titleRow}>

            <AppText
              variant="subheading"
              style={styles.pageTitle}
            >
              Employee Directory
            </AppText>

          </View>


          {/* =================================================
              SEARCH BAR
              ================================================= */}

          <View style={styles.searchContainer}>

            <Ionicons
              name="search-outline"
              size={16}
              color={colors.text.secondary}
            />

            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search employees..."
              placeholderTextColor={colors.text.secondary}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />

            {searchText.length > 0 && (
              <Pressable
                onPress={() => setSearchText("")}
                hitSlop={8}
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={colors.text.secondary}
                />
              </Pressable>
            )}

          </View>


          {/* =================================================
              SORT ROW
              ================================================= */}

          <View style={styles.sortRow}>

            <View style={styles.sortLeft}>

              <Ionicons
                name="swap-vertical-outline"
                size={13}
                color={colors.text.primary}
              />

              <AppText
                variant="caption"
                style={styles.sortText}
              >
                Sort by: Alphabetical (A-Z)
              </AppText>

            </View>

            <View style={styles.sortIndicator} />

          </View>


          {/* =================================================
              EMPLOYEE LIST
              ================================================= */}

          <View style={styles.employeeList}>

            {filteredEmployees.map((employee) => (

              <Pressable
                key={employee.id}
                style={({ pressed }) => [
                  styles.employeeCard,
                  employee.active
                    ? styles.employeeCardActive
                    : styles.employeeCardInactive,
                  pressed && styles.employeeCardPressed,
                ]}
              >

                {/* AVATAR */}

                <Avatar
                  name={employee.name}
                  size={40}
                />


                {/* EMPLOYEE DETAILS */}

                <View style={styles.employeeInfo}>

                  <AppText
                    variant="bodySmall"
                    style={styles.employeeName}
                  >
                    {employee.name}
                  </AppText>

                  <AppText
                    variant="caption"
                    style={styles.joinedText}
                  >
                    Joined {employee.joinedDate}
                  </AppText>

                </View>


                {/* STATUS */}

                <View
                  style={[
                    styles.statusContainer,
                    employee.active
                      ? styles.statusActive
                      : styles.statusInactive,
                  ]}
                >
                  <Ionicons
                    name="leaf"
                    size={16}
                    color={
                      employee.active
                        ? colors.primary
                        : colors.error
                    }
                  />
                </View>

              </Pressable>

            ))}


            {/* =================================================
                EMPTY SEARCH RESULT
                ================================================= */}

            {filteredEmployees.length === 0 && (

              <View style={styles.emptyState}>

                <View style={styles.emptyIcon}>

                  <Ionicons
                    name="people-outline"
                    size={28}
                    color={colors.text.secondary}
                  />

                </View>

                <AppText
                  variant="bodySmall"
                  style={styles.emptyTitle}
                >
                  No employees found
                </AppText>

                <AppText
                  variant="caption"
                  style={styles.emptyDescription}
                >
                  Try searching with another name.
                </AppText>

              </View>

            )}

          </View>

        </ScrollView>


        {/* =================================================
            ADD EMPLOYEE BUTTON
            ================================================= */}

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            {
              bottom: 65 + insets.bottom,
            },
            pressed && styles.addButtonPressed,
          ]}
        >
          <Ionicons
            name="add"
            size={28}
            color={colors.white}
          />
        </Pressable>


        {/* =================================================
            BOTTOM NAVIGATION
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
   Matched to the existing Estate Manager dashboard
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
     Same measurements as index.tsx
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
     TITLE
     ========================================================== */

  titleRow: {
    marginBottom: spacing.sm,
  },

  pageTitle: {
    color: colors.text.primary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },


  /* ==========================================================
     SEARCH
     ========================================================== */

  searchContainer: {
    width: "100%",
    height: 40,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },

  searchInput: {
    flex: 1,
    marginLeft: 6,
    paddingVertical: 0,
    fontSize: 10,
    color: colors.text.primary,
  },


  /* ==========================================================
     SORT
     ========================================================== */

  sortRow: {
    height: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },

  sortLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  sortText: {
    color: colors.text.secondary,
    fontSize: 9,
    marginLeft: 3,
  },

  sortIndicator: {
    width: 10,
    height: 4,
    borderRadius: 3,
    backgroundColor: colors.border.light,
  },


  /* ==========================================================
     EMPLOYEE CARDS
     ========================================================== */

  employeeList: {
    width: "100%",
  },

  employeeCard: {
    width: "100%",
    minHeight: 57,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  employeeCardActive: {
    borderColor: colors.primary,
  },

  employeeCardInactive: {
    borderColor: colors.border.light,
  },

  employeeCardPressed: {
    opacity: 0.8,
  },

  employeeInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  employeeName: {
    color: colors.text.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },

  joinedText: {
    color: colors.text.secondary,
    fontSize: 8,
    lineHeight: 12,
    marginTop: 1,
  },


  /* ==========================================================
     STATUS ICON
     ========================================================== */

  statusContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  statusActive: {
    backgroundColor: colors.successBackground,
  },

  statusInactive: {
    backgroundColor: "#FCEDEF",
  },


  /* ==========================================================
     EMPTY STATE
     ========================================================== */

  emptyState: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  emptyTitle: {
    color: colors.text.primary,
    fontWeight: "600",
  },

  emptyDescription: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },


  /* ==========================================================
     FLOATING ADD BUTTON
     ========================================================== */

  addButton: {
    position: "absolute",
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.text.primaryGreen,
    alignItems: "center",
    justifyContent: "center",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.18,
    shadowRadius: 3,

    elevation: 5,
  },

  addButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },


  /* ==========================================================
     BOTTOM NAVIGATION
     ========================================================== */

  bottomTabContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
  },
});