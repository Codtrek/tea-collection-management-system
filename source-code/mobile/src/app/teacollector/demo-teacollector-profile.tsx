import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fontDisplay, fontMono } from '@/components/ui/demo-teacollector-theme';

export default function DemoTeaCollectorProfile() {
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
        <Text style={styles.name}>Sunil Ranasinghe</Text>
        <Text style={styles.role}>Tea Collection Agent</Text>
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
            <Text style={styles.detailValue}>071 234 5678</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Email address</Text>
            <Text style={styles.detailValue}>sunil.ranasinghe@kotmalempt.com</Text>
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
        onPress={() =>
          Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive' },
          ])
        }
        style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
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
    fontFamily: fontDisplay.fontFamily,
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
    fontFamily: fontDisplay.fontFamily,
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
    fontFamily: fontMono.fontFamily,
    fontSize: 11,
    color: colors.text.inverse,
    opacity: 0.85,
  },
  sectionLabel: {
    marginTop: 24,
    marginBottom: 10,
    fontFamily: fontMono.fontFamily,
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
});
