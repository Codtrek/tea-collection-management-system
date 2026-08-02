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
  fontMono,
} from "@/components/ui/demo-teacollector-theme";
import { colors } from "@/theme/colors";

export default function DemoTeaCollectorFertilizer({
  requests,
  onViewDetails,
  onLoadFertilizer,
  onDeliverFertilizer,
}: any) {
  const groups = [
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
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {groups.map(
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
                  onLoadFertilizer={onLoadFertilizer}
                  onDeliverFertilizer={onDeliverFertilizer}
                />
              ))}
            </View>
          )
      )}

      {/* Empty State */}
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
            All requests have been completed
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  group: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontFamily: fontMono.fontFamily,
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