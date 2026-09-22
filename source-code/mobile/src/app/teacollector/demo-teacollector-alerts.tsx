import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fontMono } from '@/components/ui/demo-teacollector-theme';

type NotificationType = 'pickup' | 'success' | 'warning' | 'info' | 'fertilizer';

interface Notification {
  icon: keyof typeof Ionicons.glyphMap;
  type: NotificationType;
  title: string;
  desc: string;
  time: string;
  read?: boolean;
}

interface DemoTeaCollectorAlertsProps {
  notifications: Notification[];
}

const notificationStyles: Record<
  NotificationType,
  { backgroundColor: string; color: string; label: string }
> = {
  pickup: {
    backgroundColor: colors.warningBackground,
    color: colors.warning,
    label: 'Pickup',
  },
  success: {
    backgroundColor: colors.successBackground,
    color: colors.success,
    label: 'Success',
  },
  warning: {
    backgroundColor: colors.errorBackground,
    color: colors.error,
    label: 'Attention',
  },
  info: {
    backgroundColor: colors.surface,
    color: colors.text.secondary,
    label: 'Update',
  },
  fertilizer: {
    backgroundColor: colors.successBackground,
    color: colors.primary,
    label: 'Fertilizer',
  },
};

export default function DemoTeaCollectorAlerts({
  notifications,
}: DemoTeaCollectorAlertsProps) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons name="notifications" size={24} color={colors.text.inverse} />
        </View>
        <View style={styles.summaryText}>
          <Text style={styles.summaryTitle}>Stay up to date</Text>
          <Text style={styles.summaryDescription}>
            {unreadCount > 0
              ? `You have ${unreadCount} new ${unreadCount === 1 ? 'alert' : 'alerts'}`
              : 'You are all caught up'}
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{unreadCount}</Text>
        </View>
      </View>

      <View style={styles.headingRow}>
        <Text style={styles.sectionLabel}>RECENT ALERTS</Text>
        <Text style={styles.totalText}>{notifications.length} total</Text>
      </View>

      <View style={styles.notificationCard}>
        {notifications.map((notification, index) => {
          const typeStyle = notificationStyles[notification.type];

          return (
            <View
              key={`${notification.title}-${index}`}
              style={[
                styles.notification,
                index < notifications.length - 1 && styles.notificationDivider,
              ]}
            >
              <View style={[styles.notificationIcon, { backgroundColor: typeStyle.backgroundColor }]}>
                <Ionicons name={notification.icon} size={20} color={typeStyle.color} />
              </View>
              <View style={styles.notificationBody}>
                <View style={styles.notificationTitleRow}>
                  <Text style={styles.notificationTitle} numberOfLines={1}>
                    {notification.title}
                  </Text>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notificationDescription}>{notification.desc}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.typeLabel, { color: typeStyle.color }]}>
                    {typeStyle.label}
                  </Text>
                  <Text style={styles.time}>{notification.time}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.success,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryText: {
    flex: 1,
    marginLeft: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  summaryDescription: {
    marginTop: 4,
    fontSize: 13,
    color: colors.text.inverse,
    opacity: 0.9,
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: colors.white,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: fontMono.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.text.tertiary,
  },
  totalText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  notificationCard: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  notification: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  notificationDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    backgroundColor: colors.primary,
  },
  notificationDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  time: {
    marginLeft: 10,
    fontFamily: fontMono.fontFamily,
    fontSize: 11,
    color: colors.text.tertiary,
  },
});
