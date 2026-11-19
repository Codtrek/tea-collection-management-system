import React, { useState } from 'react';
import { Alert,  Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import type { CollectorProfile } from '@/utils/collectorSession';





interface DemoTeaCollectorProfileProps {
  profile?: CollectorProfile;
  onLogout: () => Promise<void>;
}

export default function DemoTeaCollectorProfile({
  profile,
  onLogout,
}: DemoTeaCollectorProfileProps) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>SR</Text>
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={13} color={colors.text.inverse} />
          </View>
        </View>
        <Text style={styles.name}>
          {profile?.name || "Collector"}
        </Text>
        <Text style={styles.role}>{profile?.role || "Role unavailable"}</Text>
        <Text style={styles.employeeId}>EMP-2291 · Kotmale MPT Factory</Text>
      </View>

      <Text style={styles.sectionLabel}>CONTACT INFORMATION</Text>
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="call-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Mobile number</Text>
            <Text style={styles.detailValue}>
              {profile?.phone || "Mobile number unavailable"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Email address</Text>
            <Text style={styles.detailValue}>
              {profile?.email || "Not provided"}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change password"
        onPress={() => Alert.alert('Change password', 'Password change will be available soon.')}
        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
      >
        <View style={styles.actionIcon}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.actionText}>Change password</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      </Pressable>



      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={() => setShowLogoutDialog(true)}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      {showLogoutDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIcon}>
              <Ionicons
                name="log-out-outline"
                size={28}
                color={colors.error}
              />
            </View>

            <Text style={styles.dialogTitle}>Log out?</Text>

            <Text style={styles.dialogMessage}>
              Are you sure you want to log out of your account?
            </Text>

            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setShowLogoutDialog(false)}
                disabled={isLoggingOut}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={isLoggingOut}
                onPress={async () => {
                  try {
                    setIsLoggingOut(true);
                    await onLogout();
                    setShowLogoutDialog(false);
                  } catch {
                    Alert.alert(
                      "Logout failed",
                      "Please try again."
                    );
                  } finally {
                    setIsLoggingOut(false);
                  }
                }}
                style={styles.confirmLogoutButton}
              >
                <Text style={styles.confirmLogoutText}>
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}



    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  profileCard: {
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: colors.success,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  avatarText: {
    fontFamily:fonts.default,
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text.primary,
    borderWidth: 2,
    borderColor: colors.white,
  },
  name: {
    fontFamily: fonts.default,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  role: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  employeeId: {
    marginTop: 8,
    fontFamily: fonts.default,
    fontSize: 11,
    color: colors.text.inverse,
    opacity: 0.85,
  },
  sectionLabel: {
    marginTop: 24,
    marginBottom: 10,
    fontFamily: fonts.default,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.text.tertiary,
  },
  detailsCard: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: colors.successBackground,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    marginBottom: 3,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
  },
  actionButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: colors.successBackground,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  logoutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: colors.errorBackground,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  pressed: {
    opacity: 0.75,
  },



  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  dialogIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorBackground,
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  dialogMessage: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
    lineHeight: 21,
  },
  dialogActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  confirmLogoutButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.error,
  },
  confirmLogoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

});
