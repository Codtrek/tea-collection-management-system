import React from "react";

import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

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
  segment,
  setSegment,
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
      key: "active",
      label: "Accepted",

      items: stops.filter(
        (s: any) => s.status === "accepted"
      ),
    },

    {
      key: "loaded-group",
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
          TODAY / HISTORY TOGGLE
      =================================================== */}

      <View style={styles.segmentContainer}>
        {["today", "hist"].map((seg) => (
          <TouchableOpacity
            key={seg}
            onPress={() => setSegment(seg)}
            style={[
              styles.segmentButton,

              segment === seg &&
                styles.segmentButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,

                segment === seg &&
                  styles.segmentTextActive,
              ]}
            >
              {seg === "today"
                ? "Today"
                : "History"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===================================================
          TODAY
      =================================================== */}

      {segment === "today" ? (
        <>
          {/* =================================================
              LOADED SUMMARY

              EXISTING FLOW — DO NOT REMOVE.

              This is the factory navigation.
          ================================================= */}

          {loaded.length > 0 && (
            <Card
              dark
              style={styles.loadedCard}
            >
              <View style={styles.loadedHeader}>
                <View
                  style={
                    styles.factoryIconContainer
                  }
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={colors.white}
                  />
                </View>

                <View
                  style={
                    styles.loadedTextContainer
                  }
                >
                  <Text
                    style={styles.loadedTitle}
                  >
                    {loaded.length} stop
                    {loaded.length > 1
                      ? "s"
                      : ""}{" "}
                    loaded · {totalLoaded} kg
                  </Text>

                  <Text
                    style={styles.loadedSubtitle}
                  >
                    Ready whenever you head to
                    Kotmale MPT
                  </Text>
                </View>
              </View>

              {/* EXISTING FACTORY NAVIGATION */}

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

          {/* =================================================
              COLLECTION GROUPS

              Accepted requests appear here.

              The Navigate to Estate button is INSIDE
              the accepted StopCard.
          ================================================= */}

          {groups
            .filter(
              (g) => g.items.length > 0
            )
            .map((g) => (
              <View
                key={g.key}
                style={styles.group}
              >
                <Text
                  style={styles.sectionTitle}
                >
                  {g.label} ·{" "}
                  {g.items.length}
                </Text>

                {g.items.map((s: any) => (
                  <StopCard
                    key={s.id}
                    stop={s}

                    /*
                     * Existing pending flow
                     */
                    onViewDetails={
                      onViewDetails
                    }

                    /*
                     * Existing arrived/details flow
                     */
                    onArrivedDetails={
                      onArrivedDetails
                    }

                    /*
                     * NEW:
                     * Navigate to the particular
                     * tea estate.
                     */
                    onGoToEstate={
                      onGoToEstate
                    }
                  />
                ))}
              </View>
            ))}

          {/* =================================================
              REGISTER NEW ESTATE
          ================================================= */}

          <Btn
            variant="secondary"
            block
            style={styles.registerButton}
            onPress={() =>
              setSheet("register")
            }
          >
            + Register New Estate
          </Btn>
        </>
      ) : (
        <>
          {/* =================================================
              DELIVERED TODAY
          ================================================= */}

          {deliveredToday.length > 0 && (
            <>
              <Text
                style={styles.sectionTitle}
              >
                Delivered today
              </Text>

              {deliveredToday.map(
                (s: any) => (
                  <View
                    key={s.id}
                    style={styles.historyCard}
                  >
                    <View>
                      <Text
                        style={
                          styles.historyTitle
                        }
                      >
                        {s.name}
                      </Text>

                      <Text
                        style={
                          styles.historySubtitle
                        }
                      >
                        Today ·{" "}
                        {s.actualWeight} kg
                      </Text>
                    </View>

                    <Pill
                      status={
                        s.mismatch
                          ? "mismatch"
                          : "delivered"
                      }
                    />
                  </View>
                )
              )}
            </>
          )}

          {/* =================================================
              EARLIER THIS WEEK
          ================================================= */}

          <Text
            style={styles.earlierTitle}
          >
            Earlier this week
          </Text>

          {history.map(
            (h: any, i: number) => (
              <View
                key={i}
                style={styles.historyCard}
              >
                <View>
                  <Text
                    style={
                      styles.historyTitle
                    }
                  >
                    {h.name}
                  </Text>

                  <Text
                    style={
                      styles.historySubtitle
                    }
                  >
                    {h.date} · {h.type} ·{" "}
                    {h.weight} kg
                  </Text>
                </View>

                <Pill status="delivered">
                  Delivered
                </Pill>
              </View>
            )
          )}
        </>
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
     TODAY / HISTORY
  ======================================================= */

  segmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  segmentButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },

  segmentButtonActive: {
    backgroundColor: colors.primary,
  },

  segmentText: {
    fontWeight: "600",
    fontSize: 15,
    textAlign: "center",
    color: colors.text.secondary,
  },

  segmentTextActive: {
    color: colors.white,
  },

  /* =======================================================
     LOADED / FACTORY
  ======================================================= */

  loadedCard: {
    marginBottom: 16,
  },

  loadedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  factoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.14)",
  },

  loadedTextContainer: {
    flex: 1,
  },

  loadedTitle: {
    fontFamily:
      fontDisplay.fontFamily,
    fontWeight: "600",
    fontSize: 15,
    color: colors.white,
  },

  loadedSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: "#BFE0C6",
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
    fontFamily:
      fontMono.fontFamily,
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
    fontFamily:
      fontDisplay.fontFamily,
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
    fontFamily:
      fontMono.fontFamily,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    marginBottom: 10,
    marginLeft: 2,
    marginTop: 16,
    fontSize: 11,
    color: colors.text.primaryGreen,
  },
});