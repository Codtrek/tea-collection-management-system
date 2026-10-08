import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export interface BottomTabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const tabs: BottomTabItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "grid-outline",
  },
  {
    key: "employees",
    label: "Employees",
    icon: "briefcase-outline",
  },
  {
    key: "photoEvidence",
    label: "Evidence",
    icon: "camera-outline",
  },
  {
    key: "reports",
    label: "Reports",
    icon: "bar-chart-outline",
  },
];

interface Props {
  activeTab: string;
  onTabPress: (tab: BottomTabItem) => void;
}

export default function EstateManagerBottomTab({
  activeTab,
  onTabPress,
}: Props) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress(tab)}
          >
            {/* Fixed icon area keeps all icons aligned */}
            <View style={styles.iconContainer}>
              <Ionicons
                name={tab.icon}
                size={20}
                color={
                  isActive
                    ? colors.primary
                    : colors.text.secondary
                }
              />
            </View>

            {/* Fixed label area keeps the underline aligned */}
            <View style={styles.labelContainer}>
              <AppText
                style={[
                  styles.label,
                  isActive && styles.activeLabel,
                ]}
              >
                {tab.label}
              </AppText>
            </View>

            {/* Active underline */}
            <View
              style={[
                styles.indicator,
                isActive && styles.activeIndicator,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 72,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: 12,
    paddingTop: spacing.xs,
  },

  /*
   * Every icon gets exactly the same vertical space.
   * This prevents the two-line "Photo Evidence"
   * label from moving its icon upward.
   */
  iconContainer: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  /*
   * Every label gets the same height.
   * "Photo Evidence" can use two lines without
   * affecting the position of the other elements.
   */
  labelContainer: {
    height: 32,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  label: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text.secondary,
    textAlign: "center",
  },

  activeLabel: {
    color: colors.primary,
    fontWeight: "600",
  },

  indicator: {
    marginTop: spacing.xs,
    width: 28,
    height: 3,
    borderRadius: 99,
    backgroundColor: "transparent",
  },

  activeIndicator: {
    backgroundColor: colors.primary,
  },
});