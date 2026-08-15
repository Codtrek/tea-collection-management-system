
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { Pill } from "@/components/ui/demo-teacollector-pill";
import { Btn } from "@/components/ui/demo-teacollector-button";

import {
  c,
  fontDisplay,
  fontMono,
} from "@/components/ui/demo-teacollector-theme";

import { colors } from "@/theme/colors";

/* =========================================================
   HOME / STATS CARDS
   These lightweight statistic cards are used on the home screen
   to show high-level metrics (pending, loaded, delivered, collected).
   They follow the colors defined in theme/colors.ts and expose a
   small API so the home screen can pass an array of stats.
========================================================= */

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: "primary" | "success" | "warning" | "muted";
  iconName?: React.ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  variant = "primary",
  iconName,
  onPress,
}) => {
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "success"
      ? colors.success
      : variant === "warning"
      ? colors.warning
      : colors.surface; // muted fallback

  const textColor =
    variant === "primary" || variant === "success" || variant === "warning"
      ? colors.white
      : c.ink;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={[
        statStyles.statCard,
        { backgroundColor: variant === "muted" ? colors.surface : bg },
      ]}
    >
      <View style={statStyles.statRow}>
        {iconName && (
          <View
            style={[
              statStyles.iconWrap,
              { backgroundColor:bg },
            ]}
          >
            <Ionicons
              name={iconName}
             size={33}
              color={variant === "muted" ? colors.text.primary : colors.text.inverse}
            />
          </View>
        )}

        <View style={statStyles.statTextWrap}>
          <Text
            style={[
              statStyles.statValue,
              { color: variant === "muted" ? c.ink : colors.white },
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>

          <Text
            style={[
              statStyles.statTitle,
              { color: variant === "muted" ? c.muted : colors.white },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text style={[statStyles.statSubtitle, { color: c.muted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface HomeStatsRowProps {
  stats: Array<{
    id: string;
    title: string;
    value: string | number;
    subtitle?: string;
    variant?: "primary" | "success" | "warning" | "muted";
    iconName?: React.ComponentProps<typeof Ionicons>["name"];
    onPress?: () => void;
  }>;
  style?: any;
}

export const HomeStatsRow: React.FC<HomeStatsRowProps> = ({ stats, style }) => {
  return (
    <View style={[statStyles.rowWrap, style]}>
      {stats.map((s) => (
        <StatCard
          key={s.id}
          title={s.title}
          value={s.value}
          subtitle={s.subtitle}
          variant={s.variant}
          iconName={s.iconName}
          onPress={s.onPress}
        />
      ))}
    </View>
  );
};

/* =========================================================
   FERTILIZER REQUEST CARD
========================================================= */

interface FertRequestCardProps {
  request: any;
  onViewDetails?: (request: any) => void;
  onLoadFertilizer?: (request: any) => void;
  onDeliverFertilizer?: (request: any) => void;
}

export const FertRequestCard = ({
  request,
  onViewDetails,
  onLoadFertilizer,
  onDeliverFertilizer,
}: FertRequestCardProps) => {
  const statusMap: any = {
    confirmed: {
      label: "Confirmed",
      action: "Load Fertilizer",
      handler: onLoadFertilizer,
    },

    loaded: {
      label: "Loaded",
      action: "Deliver",
      handler: onDeliverFertilizer,
    },

    delivered: {
      label: "Delivered",
      action: null,
      handler: null,
    },
  };

  const currentStatus = statusMap[request.status];

  return (
    <View style={styles.card}>
      {/* =========================
          HEADER
      ========================= */}

      <View style={styles.header}>
        <View style={styles.mainInfo}>
          <Text style={styles.title}>
            {request.estateName || "Tea Estate"}
          </Text>

          <Text style={styles.subtitle}>
            {request.fertilizerType || "Fertilizer"} ·{" "}
            {request.quantity} kg
          </Text>

          <Text style={styles.timeText}>
            {request.status === "confirmed" &&
              `Confirmed at ${request.confirmedAt}`}

            {request.status === "loaded" &&
              `Loaded at ${request.loadedAt}`}

            {request.status === "delivered" &&
              `Delivered at ${request.deliveredAt}`}
          </Text>
        </View>

        <Pill status={request.status} />
      </View>

      {/* =========================
          BUTTONS
      ========================= */}

      <View style={styles.buttonRow}>
        {/* View Details */}

        <View style={styles.buttonWrapper}>
          <Btn
            variant="secondary"
            small
            block
            onPress={() => onViewDetails?.(request)}
          >
            View Details
          </Btn>
        </View>

        {/* Status Action */}

        {currentStatus?.action && (
          <View style={styles.buttonWrapper}>
            <Btn
              variant="primary"
              small
              block
              onPress={() =>
                currentStatus.handler?.(request)
              }
            >
              {currentStatus.action}
            </Btn>
          </View>
        )}
      </View>
    </View>
  );
};

/* =========================================================
   TEA COLLECTION STOP CARD
========================================================= */

interface StopCardProps {
  stop: any;

  /*
   * Existing flow:
   * Pending -> request details
   */
  onViewDetails?: (stop: any) => void;

  /*
   * Existing flow:
   * Accepted -> continue collection process
   */
  onArrivedDetails?: (stop: any) => void;

  /*
   * NEW:
   * Accepted -> navigate to particular tea estate
   */
  onGoToEstate?: (stop: any) => void;
}

export const StopCard = ({
  stop,
  onViewDetails,
  onArrivedDetails,
  onGoToEstate,
}: StopCardProps) => {
  const isPending = stop.status === "pending";
  const isAccepted = stop.status === "accepted";
  const isLoaded = stop.status === "loaded";
  const isDelivered = stop.status === "delivered";
  const isCancelled = stop.status === "cancelled";

  return (
    <View style={styles.card}>
      {/* =================================================
          MAIN CARD CONTENT

          Pending:
          tapping the card continues to existing details flow.

          Accepted:
          tapping the card continues to existing
          collection/arrival flow.

          This is IMPORTANT — we are not removing
          onArrivedDetails.
      ================================================== */}

      <TouchableOpacity
        disabled={!isPending && !isAccepted}
        activeOpacity={0.85}
        onPress={() => {
          if (isPending) {
            onViewDetails?.(stop);
          }

          if (isAccepted) {
            onArrivedDetails?.(stop);
          }
        }}
      >
        {/* =================================================
            HEADER
        ================================================== */}

        <View style={styles.header}>
          {/* Estate Information */}

          <View style={styles.mainInfo}>
            <Text style={styles.title}>
              {stop.name || "Tea Estate"}
            </Text>

            {stop.address && (
              <Text style={styles.subtitle}>
                {stop.address}
              </Text>
            )}

            {stop.location && (
              <Text style={styles.subtitle}>
                {stop.location}
              </Text>
            )}

            {/* Status Information */}

            <Text style={styles.timeText}>
              {isCancelled &&
                `Reason: ${stop.reason || "Cancelled"}`}

              {isPending &&
                `Owner: ${stop.owner || "Estate Owner"}`}

              {isAccepted &&
                `Accepted at ${stop.acceptedAt || "—"}`}

              {isLoaded &&
                "Awaiting factory drop-off"}

              {isDelivered &&
                "✓ Completed"}
            </Text>
          </View>

          {/* Status */}

          <Pill
            status={
              stop.mismatch && isDelivered
                ? "mismatch"
                : stop.status
            }
          />
        </View>

        {/* =================================================
            PENDING REQUEST
        ================================================== */}

        {isPending && (
          <>
            {/* Estimated weight + distance */}

            <View style={styles.metaRow}>
              {stop.estWeight != null && (
                <Text style={styles.metaText}>
                  ~{stop.estWeight} kg
                </Text>
              )}

              {stop.dist != null && (
                <Text style={styles.metaText}>
                  {stop.dist} km
                </Text>
              )}
            </View>

            {/* Existing View Details button */}

            <Btn
              variant="secondary"
              small
              block
              onPress={() => onViewDetails?.(stop)}
              style={styles.viewDetailsButton}
            >
              View Details
            </Btn>
          </>
        )}

        {/* =================================================
            ACCEPTED REQUEST
        ================================================== */}

        {isAccepted && (
          <>
            {/* Keep existing accepted information */}

            <View style={styles.metaRow}>
              {stop.estWeight != null && (
                <Text style={styles.metaText}>
                  ~{stop.estWeight} kg
                </Text>
              )}

              {stop.dist != null && (
                <Text style={styles.metaText}>
                  {stop.dist} km
                </Text>
              )}
            </View>

          </>
        )}

        {/* =================================================
            LOADED REQUEST

            Keep existing loaded information.

            Factory navigation is NOT added here.
            It remains in DemoTeaCollectorCollect.
        ================================================== */}

        {isLoaded && (
          <View style={styles.metaRow}>
            {stop.actualWeight != null && (
              <Text style={styles.metaText}>
                {stop.actualWeight} kg
              </Text>
            )}
          </View>
        )}

        {/* =================================================
            DELIVERED
        ================================================== */}

        {isDelivered && (
          <View style={styles.metaRow}>
            {stop.actualWeight != null && (
              <Text style={styles.mutedMetaText}>
                {stop.actualWeight} kg delivered
              </Text>
            )}
          </View>
        )}

        {/* =================================================
            CANCELLED
        ================================================== */}

      </TouchableOpacity>

      {/* =================================================
          NEW NAVIGATION BUTTON

          This is OUTSIDE the TouchableOpacity.

          Therefore:
          - Clicking the card -> existing collection flow
          - Clicking Navigate -> estate navigation

          They are completely separate actions.
      ================================================== */}

      {isAccepted && (
        <View style={styles.actionContainer}>
          <Btn
            variant="navigation"
            small
            block
            onPress={() => {
              console.log(
                "Navigate to estate:",
                stop.name
              );

              onGoToEstate?.(stop);
            }}
          >
            Navigate to Estate
          </Btn>
        </View>
      )}

    </View>
  );
};

const statStyles = StyleSheet.create({
 rowWrap: {
   flexDirection: "row",
   flexWrap: "wrap",
   gap: 10,
   marginBottom: 12,
 },

 statCard: {
   width: "48%",
   borderRadius: 16,
   paddingVertical: 18,
   paddingHorizontal: 16,
   marginBottom: 12,
   shadowColor: "#000",
   shadowOpacity: 0.04,
   shadowRadius: 8,
   elevation: 2,
   borderWidth: 1,
   borderColor: c.line,
   alignSelf: "flex-start",
 },


 statRow: {
   flexDirection: "row",
   alignItems: "center",
   gap: 10,
 },

 iconWrap: {
   width: 60,
   height: 60,
   borderRadius: 16,
   alignItems: "center",
   justifyContent: "center",
   marginRight: 12,
 },


 statTextWrap: {
   flex: 1,
 },

 statValue: {
   fontFamily: fontDisplay.fontFamily,
   fontSize: 26,
   fontWeight: "700",
   lineHeight: 30,
 },

 statTitle: {
   fontSize: 14,
   marginTop: 4,
 },

 statSubtitle: {
   fontSize: 11,
   marginTop: 6,
 },
});

/* =========================================================
  STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     COMMON CARD
  ======================================================= */

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  mainInfo: {
    flex: 1,
  },

  title: {
    fontFamily: fontDisplay.fontFamily,
    fontWeight: "600",
    fontSize: 16,
    color: c.ink,
  },

  subtitle: {
    fontSize: 12,
    marginTop: 2,
    color: c.muted,
  },

  timeText: {
    fontSize: 12,
    marginTop: 4,
    color: c.muted,
  },

  /* =======================================================
     META INFORMATION
  ======================================================= */

  metaRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 10,
  },

  metaText: {
    fontFamily: fontMono.fontFamily,
    fontSize: 12,
    color: c.forest,
  },

  mutedMetaText: {
    fontFamily: fontMono.fontFamily,
    fontSize: 12,
    color: c.muted,
  },

  /* =======================================================
     PENDING → VIEW DETAILS
  ======================================================= */

  viewDetailsButton: {
    width: "100%",
    marginTop: 12,
  },

  /* =======================================================
     ACCEPTED → EXISTING FLOW
  ======================================================= */

  continueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: c.forestLight,
  },

  continueText: {
    fontWeight: "600",
    fontSize: 13,
    color: c.forest,
  },

  /* =======================================================
     ACCEPTED → NEW ESTATE NAVIGATION
  ======================================================= */

  actionContainer: {
    marginTop: 14,
    width: "100%",
  },

  /* =======================================================
     CANCELLED
  ======================================================= */

  cancelledContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.errorBackground,
  },

  cancelledText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },

  /* =======================================================
     FERTILIZER BUTTONS
  ======================================================= */

  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  buttonWrapper: {
    flex: 1,
  },
});


