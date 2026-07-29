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
}

export default function BottomTab({
  tabs,
  activeTab,
  onTabPress,
  style,
}: BottomTabProps) {
  return (
    <View style={[styles.container, style]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress(tab)}
          >
            <Ionicons
              name={tab.icon}
              size={24}
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

            <View
              style={[
                styles.indicator,
                isActive &&
                  styles.activeIndicator,
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
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text.secondary,
  },

  activeLabel: {
    color: colors.primary,
    fontWeight: "600",
  },

  indicator: {
    marginTop: 6,
    width: 28,
    height: 3,
    borderRadius: 99,
    backgroundColor: "transparent",
  },

  activeIndicator: {
    backgroundColor: colors.primary,
  },
});