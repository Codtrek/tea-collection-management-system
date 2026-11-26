
import React, { useMemo, useState } from "react";
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
import Avatar from "@/components/ui/Avatar";
import GeneralHeader from "@/components/ui/GeneralHeader";
import SearchBar from "@/components/ui/SearchBar";

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

  const [searchText, setSearchText] = useState("");

  // Search employees and sort alphabetically.
  const filteredEmployees = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return EMPLOYEES
      .filter((employee) => {
        return (
          employee.name.toLowerCase().includes(search) ||
          employee.id.toLowerCase().includes(search)
        );
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );
  }, [searchText]);

  // Open employee registration.
  const openEmployeeRegistration = () => {
    router.push("/estatemanager/EmployeeRegistration");
  };

  // Open notifications.
  const openNotifications = () => {
    router.push("/estatemanager/Notification");
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <View style={styles.screen}>

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

          {/* GENERAL HEADER */}

          <GeneralHeader
            title="Your Estate Name"
            description="Estate Manager"
            onNotificationPress={openNotifications}
          />

          {/* PAGE TITLE */}

          <View style={styles.titleRow}>
            <AppText
              variant="subHeading"
              style={styles.pageTitle}
            >
              Employee Directory
            </AppText>

            <AppText
              variant="caption"
              style={styles.pageSubtitle}
            >
              View and manage your estate employees.
            </AppText>
          </View>

          {/* REUSABLE SEARCH BAR */}

          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search employees by name or ID..."
          />

          {/* SORT ROW */}

          <View style={styles.sortRow}>
            <View style={styles.sortLeft}>
              <Ionicons
                name="swap-vertical-outline"
                size={15}
                color={colors.text.secondary}
              />

              <AppText
                variant="caption"
                style={styles.sortText}
              >
                Sort by: Alphabetical (A-Z)
              </AppText>
            </View>

            <AppText
              variant="caption"
              style={styles.employeeCount}
            >
              {filteredEmployees.length} Employees
            </AppText>
          </View>

          {/* EMPLOYEE DIRECTORY */}

          <View style={styles.employeeList}>

            {filteredEmployees.map((employee) => (
              <Pressable
                key={employee.id}
                style={({ pressed }) => [
                  styles.employeePressable,
                  pressed && styles.employeeCardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`View ${employee.name} details`}
              >

                {/* REUSABLE APP CARD */}

                <AppCard>

                  <View style={styles.employeeCardContent}>

                    {/* EMPLOYEE AVATAR */}

                    <Avatar
                      name={employee.name}
                      size={44}
                    />

                    {/* EMPLOYEE INFORMATION */}

                    <View style={styles.employeeInfo}>

                      <AppText
                        variant="bodySmall"
                        style={styles.employeeName}
                      >
                        {employee.name}
                      </AppText>

                      <AppText
                        variant="caption"
                        style={styles.employeeId}
                      >
                        {employee.id}
                      </AppText>

                      <AppText
                        variant="caption"
                        style={styles.joinedText}
                      >
                        Joined {employee.joinedDate}
                      </AppText>

                    </View>

                    {/* EMPLOYEE STATUS */}

                    <View
                      style={[
                        styles.statusContainer,
                        employee.active
                          ? styles.statusActive
                          : styles.statusInactive,
                      ]}
                    >
                      <Ionicons
                        name={
                          employee.active
                            ? "checkmark-circle"
                            : "close-circle"
                        }
                        size={17}
                        color={
                          employee.active
                            ? colors.primary
                            : colors.error
                        }
                      />

                      <AppText
                        variant="caption"
                        style={[
                          styles.statusText,
                          employee.active
                            ? styles.activeText
                            : styles.inactiveText,
                        ]}
                      >
                        {employee.active ? "Active" : "Inactive"}
                      </AppText>
                    </View>

                  </View>

                </AppCard>

              </Pressable>
            ))}

            {/* EMPTY SEARCH RESULT */}

            {filteredEmployees.length === 0 && (
              <AppCard>

                <View style={styles.emptyState}>

                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="people-outline"
                      size={30}
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
                    Try searching with another name or employee ID.
                  </AppText>

                </View>

              </AppCard>
            )}

          </View>

        </ScrollView>

        {/* FLOATING ADD EMPLOYEE BUTTON */}

        <Pressable
          style={[
            styles.addButton,
            {
              bottom: 100 + insets.bottom,
            },
          ]}
          onPress={openEmployeeRegistration}
          accessibilityRole="button"
          accessibilityLabel="Add employee"
        >
          <Ionicons
            name="add"
            size={28}
            color={colors.white}
          />
        </Pressable>

        {/* BOTTOM NAVIGATION IS HANDLED BY SHARED LAYOUT */}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  // MAIN SCREEN

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

  // PAGE TITLE

  titleRow: {
    marginBottom: spacing.md,
  },

  pageTitle: {
    color: colors.text.primaryGreen,
  },

  pageSubtitle: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // SORT ROW

  sortRow: {
    minHeight: 30,
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
    marginLeft: spacing.xs,
  },

  employeeCount: {
    color: colors.primary,
  },

  // EMPLOYEE LIST

  employeeList: {
    width: "100%",
  },

  employeePressable: {
    width: "100%",
  },

  employeeCardPressed: {
    opacity: 0.75,
  },

  employeeCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  employeeInfo: {
    flex: 1,
    minWidth: 0,
  },

  employeeName: {
    color: colors.text.primary,
    fontWeight: "600",
  },

  employeeId: {
    color: colors.primary,
    marginTop: 2,
  },

  joinedText: {
    color: colors.text.secondary,
    marginTop: 2,
  },

  // EMPLOYEE STATUS

  statusContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    minWidth: 65,
  },

  statusActive: {
    backgroundColor: colors.successBackground,
  },

  statusInactive: {
    backgroundColor: "#FCEDEF",
  },

  statusText: {
    marginTop: 2,
    fontWeight: "600",
  },

  activeText: {
    color: colors.primary,
  },

  inactiveText: {
    color: colors.error,
  },

  // EMPTY STATE

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
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
  },

  emptyDescription: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  // FLOATING ADD BUTTON

  addButton: {
    position: "absolute",
    right: spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

});
