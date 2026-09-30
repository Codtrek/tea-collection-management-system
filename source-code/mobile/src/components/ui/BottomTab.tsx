import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import AppText from "@/components/ui/AppText";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export interface BottomTabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface BottomTabProps {
  tabs: BottomTabItem[];
  activeTab: string;
  onTabPress: (tab: BottomTabItem) => void;
  style?: ViewStyle;

  /**
   * Controls the appearance of the active tab.
   * "underline" keeps the existing design.
   * "pill" is used by the Estate Manager design.
   */
  activeStyle?: "underline" | "pill";
}

export default function BottomTab({
  tabs,
  activeTab,
  onTabPress,
  style,
  activeStyle = "underline",
}: BottomTabProps) {
  return (
    <View style={[styles.container, style]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              isActive &&
                activeStyle === "pill" &&
                styles.activeTabPill,
            ]}
            onPress={() => onTabPress(tab)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={
                isActive
                  ? colors.primary
                  : colors.text.secondary
              }
            />

            <AppText
              style={[
                styles.label,
                isActive && styles.activeLabel,
              ]}
            >
              {tab.label}
            </AppText>

            {activeStyle === "underline" && (
              <View
                style={[
                  styles.indicator,
                  isActive && styles.activeIndicator,
                ]}
              />
            )}
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
    justifyContent: "center",
    marginVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: 12,
  },

  activeTabPill: {
    backgroundColor: "#E8F8EE",
  },

  label: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.text.secondary,
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