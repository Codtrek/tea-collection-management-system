import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FertRequestCard } from "@/components/ui/demo-teacollector-cards";
import {
  FertilizerRequestFilter,
  FertilizerRequestFilterTabs,
} from "@/components/ui/demo-teacollector-requestfilter";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

export default function DemoTeaCollectorFertilizer({
  requests,
  filter,
  setFilter,
  onViewDetails,
  onAcceptFertilizer,
  onLoadFertilizer,
  onNavigateToFertilizerEstate,
}: {
  requests: any[];
  filter: FertilizerRequestFilter;
  setFilter: (filter: FertilizerRequestFilter) => void;
  onViewDetails?: (request: any) => void;
  onAcceptFertilizer?: (request: any) => void;
  onLoadFertilizer?: (request: any) => void;
  onNavigateToFertilizerEstate?: (request: any) => void;
}) {
  const groups = [
    {
      key: "pending",
      label: "Pending Requests",
      items: requests.filter(
        (r: any) => r.status === "pending"
      ),
    },
    {
      key: "confirmed",
      label: "Confirmed - Ready to Load",
      items: requests.filter(
        (r: any) => r.status === "confirmed"
      ),
    },
    {
      key: "loaded",
      label: "Loaded - Ready to Deliver",
      items: requests.filter(
        (r: any) => r.status === "loaded"
      ),
    },
    {
      key: "delivered",
      label: "Delivered",
      items: requests.filter(
        (r: any) => r.status === "delivered"
      ),
    },
    {
      key: "cancelled",
      label: "Cancelled",
      items: requests.filter(
        (r: any) => r.status === "cancelled"
      ),
    },
    {
      key: "declined",
      label: "Declined",
      items: requests.filter(
        (r: any) => r.status === "declined"
      ),
    },
  ];

  const visibleGroups =
    filter === "all"
      ? groups
      : groups.filter((group) => group.key === filter);
  const hasVisibleRequests = visibleGroups.some(
    (group) => group.items.length > 0
  );

  return (
    <View style={styles.container}>
      <View style={styles.stickyFilter}>
        <FertilizerRequestFilterTabs
          filter={filter}
          setFilter={setFilter}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {visibleGroups.map(
          (g) =>
            g.items.length > 0 && (
              <View key={g.key} style={styles.group}>
                <Text style={styles.sectionTitle}>
                  {g.label} · {g.items.length}
                </Text>

                {g.items.map((r: any) => (
                  <FertRequestCard
                    key={r.id}
                    request={r}
                    onViewDetails={onViewDetails}
                    onAcceptFertilizer={onAcceptFertilizer}
                    onLoadFertilizer={onLoadFertilizer}
                    onNavigateToFertilizerEstate={onNavigateToFertilizerEstate}
                  />
                ))}
              </View>
            )
        )}

        {requests.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="leaf-outline"
              size={48}
              color={colors.text.secondary}
              style={styles.emptyIcon}
            />

            <Text style={styles.emptyTitle}>
              No fertilizer requests
            </Text>

            <Text style={styles.emptySubtitle}>
              There are no fertilizer requests yet
            </Text>
          </View>
        )}
        {requests.length > 0 && !hasVisibleRequests && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              No {filter} fertilizer requests
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  stickyFilter: {
    backgroundColor: colors.background,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 10,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  group: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontFamily: fonts.default,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    marginBottom: 10,
    marginLeft: 2,
    fontSize: 11,
    color: colors.text.primaryGreen,
  },

  /*
   * Empty State
   */
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },

  emptyIcon: {
    opacity: 0.3,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 12,
    color: colors.text.secondary,
  },

  emptySubtitle: {
    fontSize: 15,
    marginTop: 4,
    color: colors.text.secondary,
  },
});