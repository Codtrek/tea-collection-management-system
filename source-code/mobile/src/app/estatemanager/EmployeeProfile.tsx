
import React from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AppText from "@/components/ui/AppText";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type IconName = keyof typeof Ionicons.glyphMap;

export default function EmployeeProfile() {
  const router = useRouter();

  // Replace these sample values with the employee's real data.
  const employee = {
    name: "Rohan Perera",
    role: "Senior Estate Manager",
    employeeId: "EMP-2024-001",
    phone: "+94 77 123 4567",
    email: "rohan.perera@example.com",
    nic: "1998XXXXXXXX",
    emergencyContact: "Estate HQ (+94 22 222 3400)",
    experience: "8+ Yrs",
    managedDivisions: "4 Divs",
    workforce: "142",
    estate: "Nuwara Eliya Highlands",
    division: "Central Division • Blocks A–D",
    status: "Active On Duty",
  };

  const confirmLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out from this device?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            // Replace the current route with the sign-in page.
            router.replace("/auth/signin");
          },
        },
      ],
      { cancelable: true }
    );
  };

  const ProfileRow = ({
    icon,
    label,
    value,
    actionIcon,
  }: {
    icon: IconName;
    label: string;
    value: string;
    actionIcon?: IconName;
  }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>

      <View style={styles.infoContent}>
        <AppText variant="caption" style={styles.mutedText}>
          {label}
        </AppText>
        <AppText variant="bodySmall" style={styles.infoValue}>
          {value}
        </AppText>
      </View>

      {actionIcon ? (
        <Ionicons
          name={actionIcon}
          size={17}
          color={colors.text.secondary}
        />
      ) : null}
    </View>
  );

  const MenuRow = ({
    icon,
    title,
    subtitle,
    onPress,
    showDot = false,
  }: {
    icon: IconName;
    title: string;
    subtitle: string;
    onPress?: () => void;
    showDot?: boolean;
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.menuRow,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>

      <View style={styles.menuContent}>
        <AppText variant="body" style={styles.menuTitle}>
          {title}
        </AppText>
        <AppText variant="caption" style={styles.mutedText}>
          {subtitle}
        </AppText>
      </View>

      {showDot ? <View style={styles.statusDot} /> : null}

      <Ionicons
        name="chevron-forward"
        size={17}
        color={colors.text.tertiary}
      />
    </Pressable>
  );

  const showComingSoon = (feature: string) => {
    Alert.alert(feature, "This feature will be connected soon.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerButton}
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.text.primary}
            />
          </Pressable>

          <AppText variant="subheading" style={styles.headerTitle}>
            Manager Profile
          </AppText>

          <Pressable
            onPress={() => showComingSoon("Edit Profile")}
            style={styles.headerButton}
            accessibilityLabel="Edit profile"
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={colors.text.primary}
            />
          </Pressable>
        </View>

        {/* Employee details */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={43} color={colors.primary} />
          </View>

          <AppText variant="heading" style={styles.employeeName}>
            {employee.name}
          </AppText>

          <AppText variant="bodySmall" style={styles.role}>
            {employee.role}
          </AppText>

          <AppText variant="caption" style={styles.employeeId}>
            ID: {employee.employeeId}
          </AppText>

          <View style={styles.activeBadge}>
            <View style={styles.statusDot} />
            <AppText variant="caption" style={styles.activeText}>
              {employee.status}
            </AppText>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
              <AppText variant="subheading" style={styles.statValue}>
                {employee.experience}
              </AppText>
              <AppText variant="caption" style={styles.mutedText}>
                Experience
              </AppText>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="leaf-outline" size={18} color={colors.primary} />
              <AppText variant="subheading" style={styles.statValue}>
                {employee.managedDivisions}
              </AppText>
              <AppText variant="caption" style={styles.mutedText}>
                Divisions
              </AppText>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <AppText variant="subheading" style={styles.statValue}>
                {employee.workforce}
              </AppText>
              <AppText variant="caption" style={styles.mutedText}>
                Workforce
              </AppText>
            </View>
          </View>
        </View>

        {/* Contact and credentials */}
        <SectionTitle title="CONTACT & CREDENTIALS" />

        <View style={styles.card}>
          <ProfileRow
            icon="call-outline"
            label="Phone Number"
            value={employee.phone}
            actionIcon="call-outline"
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            icon="mail-outline"
            label="Work Email"
            value={employee.email}
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            icon="card-outline"
            label="National Identity Card"
            value={employee.nic}
          />
          <View style={styles.rowDivider} />

          <ProfileRow
            icon="medical-outline"
            label="Emergency Contact"
            value={employee.emergencyContact}
          />
        </View>

        {/* Estate assignment */}
        <SectionTitle title="ESTATE ASSIGNMENT & SCOPE" />

        <View style={styles.card}>
          <AppText variant="caption" style={styles.mutedText}>
            Assigned Production Estate
          </AppText>

          <View style={styles.estateHeading}>
            <Ionicons name="leaf" size={21} color={colors.primary} />
            <View style={styles.estateDetails}>
              <AppText variant="subheading" style={styles.estateName}>
                {employee.estate}
              </AppText>
              <AppText variant="caption" style={styles.mutedText}>
                {employee.division}
              </AppText>
            </View>
          </View>

          <View style={styles.estateBanner}>
            <Ionicons name="image-outline" size={28} color="#FFFFFF" />
            <View style={styles.bannerText}>
              <AppText variant="body" style={styles.bannerTitle}>
                Production Estate
              </AppText>
              <AppText variant="caption" style={styles.bannerSubtitle}>
                Estate overview
              </AppText>
            </View>
          </View>

          <AppText variant="body" style={styles.subsectionTitle}>
            Supervised Field Operations
          </AppText>

          <View style={styles.chipContainer}>
            {[
              "Tea Plucking Cycles",
              "Fertilizer Protocol",
              "Daily Yield Scales",
              "Pest & Flora Logs",
            ].map((item) => (
              <View key={item} style={styles.chip}>
                <Ionicons
                  name="checkmark-circle"
                  size={13}
                  color={colors.primary}
                />
                <AppText variant="caption" style={styles.chipText}>
                  {item}
                </AppText>
              </View>
            ))}
          </View>

          <AppText variant="body" style={styles.subsectionTitle}>
            Official Licensing
          </AppText>

          <View style={styles.licenseRow}>
            <View style={styles.licenseIcon}>
              <Ionicons
                name="ribbon-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.licenseContent}>
              <AppText variant="body" style={styles.menuTitle}>
                Certified Master Planter
              </AppText>
              <AppText variant="caption" style={styles.mutedText}>
                Professional certification record
              </AppText>
            </View>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.primary}
            />
          </View>
        </View>

        {/* Management tools */}
        <SectionTitle title="MANAGEMENT TOOLS & ACCESS" />

        <View style={styles.card}>
          <MenuRow
            icon="document-text-outline"
            title="Shift & Schedule History"
            subtitle="View past shifts and working timelines"
            onPress={() => showComingSoon("Shift & Schedule History")}
          />
          <View style={styles.rowDivider} />

          <MenuRow
            icon="people-outline"
            title="Assigned Machinery & Assets"
            subtitle="View machinery, tools and estate assets"
            onPress={() => showComingSoon("Assigned Machinery & Assets")}
          />
          <View style={styles.rowDivider} />

          <MenuRow
            icon="notifications-outline"
            title="Alert Notifications"
            subtitle="View alerts, updates and reminders"
            onPress={() => router.push("/estatemanager/Notification")}
            showDot
          />
          <View style={styles.rowDivider} />

          <MenuRow
            icon="shield-checkmark-outline"
            title="Security & PIN Authorization"
            subtitle="Manage security and login preferences"
            onPress={() => showComingSoon("Security & PIN Authorization")}
          />
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutPressed,
          ]}
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out from device"
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <AppText variant="body" style={styles.logoutText}>
            Log Out from Device
          </AppText>
        </Pressable>

        <AppText variant="caption" style={styles.footer}>
          Harboost Tea Collection Management System
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="caption" style={styles.sectionTitle}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  headerTitle: {
    color: colors.text.primary,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 15,
    backgroundColor: "#E7F7EC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "#CDEED7",
  },
  employeeName: {
    color: colors.text.primary,
    textAlign: "center",
  },
  role: {
    color: colors.text.secondary,
    marginTop: 3,
  },
  employeeId: {
    color: colors.text.tertiary,
    marginTop: 4,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: "#EAF8EE",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeText: {
    color: "#15803D",
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: colors.text.primary,
  },
  statDivider: {
    height: 45,
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 10,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EDF8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  mutedText: {
    color: colors.text.secondary,
  },
  infoValue: {
    color: colors.text.primary,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F0F1F3",
  },
  estateHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  estateDetails: {
    flex: 1,
  },
  estateName: {
    color: colors.text.primary,
  },
  estateBanner: {
    minHeight: 100,
    borderRadius: 10,
    backgroundColor: "#527B46",
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: 12,
    marginBottom: spacing.md,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  bannerSubtitle: {
    color: "#E8F5E9",
    marginTop: 3,
  },
  subsectionTitle: {
    color: colors.text.primary,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F9F2",
    borderWidth: 1,
    borderColor: "#D5EEDB",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    color: colors.text.primary,
  },
  licenseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: spacing.sm,
  },
  licenseIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#EDF8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  licenseContent: {
    flex: 1,
  },
  menuRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: spacing.sm,
  },
  menuIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: "#EDF8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  logoutButton: {
    minHeight: 48,
    marginTop: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  logoutPressed: {
    opacity: 0.65,
    backgroundColor: "#FEE2E2",
  },
  logoutText: {
    color: "#DC2626",
    fontWeight: "600",
  },
  footer: {
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
