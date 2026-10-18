import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from "react-native";

import { colors } from "@/theme/colors";

export type RequestFilter =
  | "all"
  | "pending"
  | "accepted"
  | "loaded"
  | "cancelled"
  | "history";

type RequestFilterProps = {
  filter: RequestFilter;
  setFilter: (filter: RequestFilter) => void;
};

const filters = [
  {
    key: "all" as RequestFilter,
    label: "All Requests",
  },
  {
    key: "pending" as RequestFilter,
    label: "Pending",
  },
  {
    key: "accepted" as RequestFilter,
    label: "Accepted",
  },
  {
    key: "loaded" as RequestFilter,
    label: "Loaded",
  },
  {
    key: "cancelled" as RequestFilter,
    label: "Cancelled",
  },
  {
    key: "history" as RequestFilter,
    label: "History",
  },
];

export function RequestFilterTabs({
  filter,
  setFilter,
}: RequestFilterProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((item) => {
          const active = filter === item.key;

          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterButton,
                active && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  scrollContent: {
    gap: 8,
    paddingRight: 4,
  },

  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.secondary,
  },

  filterTextActive: {
    color: colors.white,
  },
});