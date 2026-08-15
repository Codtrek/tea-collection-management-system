import React from "react";

import {
  ScrollView,
  View,
  Text,
  StyleSheet,
} from "react-native";
import {
  RequestFilterTabs,
  RequestFilter,
} from "@/components/ui/demo-teacollector-requestfilter";
import { Ionicons } from "@expo/vector-icons";

import { Pill } from "@/components/ui/demo-teacollector-pill";
import { Btn } from "@/components/ui/demo-teacollector-button";
import { Card } from "@/components/ui/demo-teacollector-card";
import { StopCard } from "@/components/ui/demo-teacollector-cards";

import {
  fontDisplay,
  fontMono,
} from "@/components/ui/demo-teacollector-theme";

import { colors } from "@/theme/colors";

export default function DemoTeaCollectorCollect({
  stops,
  filter,
  setFilter,
  onViewDetails,
  onArrivedDetails,
  onGoToFactory,
  onGoToEstate,
  setSheet,
  history,
}: any) {
  /*
   * ========================================================
   * LOADED REQUESTS
   *
   * These are used ONLY for the existing
   * "Navigate to Factory" button.
   * ========================================================
   */

  const loaded = stops.filter(
    (s: any) => s.status === "loaded"
  );

  const totalLoaded = loaded.reduce(
    (sum: number, s: any) =>
      sum + (s.actualWeight || 0),
    0
  );

  /*
   * ========================================================
   * COLLECTION GROUPS
   * ========================================================
   */

  const groups = [
    {
      key: "pending",
      label: "Needs your response",
      items: stops.filter(
        (s: any) => s.status === "pending"
      ),
    },
    {
      key: "accepted",
      label: "Accepted",
      items: stops.filter(
        (s: any) => s.status === "accepted"
      ),
    },
    {
      key: "loaded",
      label: "Loaded",
      items: stops.filter(
        (s: any) => s.status === "loaded"
      ),
    },
    {
      key: "cancelled",
      label: "Cancelled",
      items: stops.filter(
        (s: any) => s.status === "cancelled"
      ),
    },
  ];

  /*
   * ========================================================
   * DELIVERED TODAY
   * ========================================================
   */

  const deliveredToday = stops.filter(
    (s: any) => s.status === "delivered"
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ===================================================
          FILTER TABS
      =================================================== */}

      <RequestFilterTabs
        filter={filter}
        setFilter={setFilter}
      />

      {/* ===================================================
          LOADED / FACTORY
      =================================================== */}

      {filter !== "history" && loaded.length > 0 && (
        <Card style={styles.loadedCard}>
          <View style={styles.loadedHeader}>
            <View style={styles.factoryIconContainer}>
              <Ionicons
                name="business-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.loadedTextContainer}>
              <Text style={styles.loadedTitle}>
                {loaded.length} stop{loaded.length > 1 ? "s" : ""} loaded · {totalLoaded} kg
              </Text>

              <Text style={styles.loadedSubtitle}>
                Ready whenever you head to Kotmale MPT
              </Text>
            </View>
          </View>

          <Btn
            variant="primary"
            block
            style={styles.factoryButton}
            onPress={onGoToFactory}
          >
            Navigate to Factory
          </Btn>
        </Card>
      )}

      {/* ===================================================
          ALL REQUESTS
      =================================================== */}

      {filter === "all" && (
        <>
          {groups
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <View key={g.key} style={styles.group}>
                <Text style={styles.sectionTitle}>
                  {g.label} · {g.items.length}
                </Text>
                {g.items.map((s: any) => (
                  <StopCard
                    key={s.id}
                    stop={s}
                    onViewDetails={onViewDetails}
                    onArrivedDetails={onArrivedDetails}
                    onGoToEstate={onGoToEstate}
                  />
                ))}
              </View>
            ))}
        </>
      )}

      {/* ===================================================
          INDIVIDUAL STATUS FILTERS
      =================================================== */}

      {filter !== "all" && filter !== "history" && (
        <>
          {groups
            .filter((g) => g.key === filter)
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <View key={g.key} style={styles.group}>
                <Text style={styles.sectionTitle}>
                  {g.label} · {g.items.length}
                </Text>
                {g.items.map((s: any) => (
                  <StopCard
                    key={s.id}
                    stop={s}
                    onViewDetails={onViewDetails}
                    onArrivedDetails={onArrivedDetails}
                    onGoToEstate={onGoToEstate}
                  />
                ))}
              </View>
            ))}

          {/* Show empty state if no items for this filter */}
          {groups
            .filter((g) => g.key === filter)
            .every((g) => g.items.length === 0) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No {filter} requests
              </Text>
            </View>
          )}
        </>
      )}

      {/* ===================================================
          HISTORY
      =================================================== */}

      {filter === "history" && (
        <>
          {/* Delivered Today */}
          {deliveredToday.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                Delivered today
              </Text>

              {deliveredToday.map((s: any) => (
                <View key={s.id} style={styles.historyCard}>
                  <View>
                    <Text style={styles.historyTitle}>
                      {s.name}
                    </Text>

                    <Text style={styles.historySubtitle}>
                      Today · {s.actualWeight} kg
                    </Text>
                  </View>

                  <Pill
                    status={s.mismatch ? "mismatch" : "delivered"}
                  />
                </View>
              ))}
            </>
          )}

          {/* Earlier This Week */}
          {history.length > 0 && (
            <>
              <Text style={styles.earlierTitle}>
                Earlier this week
              </Text>

              {history.map((h: any, i: number) => (
                <View key={i} style={styles.historyCard}>
                  <View>
                    <Text style={styles.historyTitle}>
                      {h.name}
                    </Text>

                    <Text style={styles.historySubtitle}>
                      {h.date} · {h.type} · {h.weight} kg
                    </Text>
                  </View>

                  <Pill status="delivered">
                    Delivered
                  </Pill>
                </View>
              ))}
            </>
          )}

          {/* Empty history state */}
          {deliveredToday.length === 0 && history.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No history available
              </Text>
            </View>
          )}
        </>
      )}

      {/* ===================================================
          REGISTER NEW ESTATE
      =================================================== */}

      {filter !== "history" && (
        <Btn
          variant="secondary"
          block
          style={styles.registerButton}
          onPress={() => setSheet("register")}
        >
          + Register New Estate
        </Btn>
      )}
    </ScrollView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     MAIN
  ======================================================= */

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  /* =======================================================
     LOADED / FACTORY
  ======================================================= */

  loadedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  loadedCard: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  factoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.successBackground,
  },

  loadedTextContainer: {
    flex: 1,
  },

  loadedTitle: {
    fontFamily: fontDisplay.fontFamily,
    fontWeight: "600",
    fontSize: 15,
    color: colors.text.primary,
  },

  loadedSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: colors.text.secondary,
  },

  factoryButton: {
    marginTop: 14,
  },

  /* =======================================================
     COLLECTION GROUPS
  ======================================================= */

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

  /* =======================================================
     REGISTER
  ======================================================= */

  registerButton: {
    marginTop: 8,
  },

  /* =======================================================
     HISTORY
  ======================================================= */

  historyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  historyTitle: {
    fontFamily: fontDisplay.fontFamily,
    fontWeight: "600",
    fontSize: 16,
    color: colors.text.primary,
  },

  historySubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: colors.text.secondary,
  },

  earlierTitle: {
    fontFamily: fontMono.fontFamily,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    marginBottom: 10,
    marginLeft: 2,
    marginTop: 16,
    fontSize: 11,
    color: colors.text.primaryGreen,
  },

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  emptyState: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyStateText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
  },
});