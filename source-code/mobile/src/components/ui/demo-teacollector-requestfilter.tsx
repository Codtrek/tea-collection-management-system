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

export type FertilizerRequestFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "loaded"
  | "delivered"
  | "cancelled";

type RequestFilterOption<T extends string> = {
  key: T;
  label: string;
};

export const collectionFilters: RequestFilterOption<RequestFilter>[] = [
  {
    key: "all",
    label: "All Requests",
  },
  {
    key: "pending",
    label: "Pending",
  },
  {
    key: "accepted",
    label: "Accepted",
  },
  {
    key: "loaded",
    label: "Loaded",
  },
  {
    key: "history",
    label: "Delivered",
  },
  {
    key: "cancelled",
    label: "Cancelled",
  },
];

const fertilizerFilters: RequestFilterOption<FertilizerRequestFilter>[] = [
  { key: "all", label: "All Requests" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "loaded", label: "Loaded" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

type RequestFilterProps<T extends string> = {
  filter: T;
  setFilter: (filter: T) => void;
  filters: RequestFilterOption<T>[];
};

export function RequestFilterTabs<T extends string>({
  filter,
  setFilter,
  filters,
}: RequestFilterProps<T>) {
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

export function FertilizerRequestFilterTabs({
  filter,
  setFilter,
}: {
  filter: FertilizerRequestFilter;
  setFilter: (filter: FertilizerRequestFilter) => void;
}) {
  return (
    <RequestFilterTabs
      filter={filter}
      setFilter={setFilter}
      filters={fertilizerFilters}
    />
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