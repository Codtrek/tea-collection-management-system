import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Screen } from "@/components/ui";
import { colors, spacing } from "@/theme";

// type RequestCategory = "collection" | "fertiliser";
type RequestStatus = "Pending" | "Accepted" | "On the way" | "Completed";

// interface RequestItem {
//   id: string;
//   category: RequestCategory;
//   estate: string;
//   about: string;
//   amount: string;
//   manager: string;
//   managerContact: string;
//   requestedAt: string;
//   status: RequestStatus;
// }

type RequestFilter = "All" | "Collections" | "Fertilisers";

const requests: RequestItem[] = [
  {
    id: "COL-2025-0142",
    category: "collection",
    estate: "Kothmale Green Tea",
    about: "Fresh tea leaves",
    amount: "250 kg",
    manager: "K.P. Silva",
    managerContact: "077 123 4567",
    requestedAt: "Today, 8:45 AM",
    status: "Pending",
  },
  {
    id: "FERT-2025-0086",
    category: "fertiliser",
    estate: "Hill Breeze Gardens",
    about: "Urea 46%",
    amount: "50 kg",
    manager: "N. Kumara",
    managerContact: "071 234 5678",
    requestedAt: "Today, 7:30 AM",
    status: "Accepted",
  },
  {
    id: "COL-2025-0141",
    category: "collection",
    estate: "Riverside Tea Estate",
    about: "Fresh tea leaves",
    amount: "180 kg",
    manager: "M. Perera",
    managerContact: "076 345 6789",
    requestedAt: "Yesterday, 2:15 PM",
    status: "On the way",
  },
  {
    id: "FERT-2025-0085",
    category: "fertiliser",
    estate: "Kothmale Green Tea",
    about: "NPK 20-10-10",
    amount: "25 kg",
    manager: "K.P. Silva",
    managerContact: "077 123 4567",
    requestedAt: "Yesterday, 10:20 AM",
    status: "Completed",
  },
];

const filters: RequestFilter[] = ["All", "Collections", "Fertilisers"];

const statusColors: Record<RequestStatus, { foreground: string; background: string }> = {
  Pending: { foreground: "#B45309", background: "#FEF3C7" },
  Accepted: { foreground: colors.brandDark, background: colors.brandSurface },
  "On the way": { foreground: "#1D4ED8", background: "#DBEAFE" },
  Completed: { foreground: colors.text.secondary, background: colors.surface },
};

function RequestStatusPill({ status }: { status: RequestStatus }) {
  const tone = statusColors[status];

  return (
    <View style={[styles.statusPill, { backgroundColor: tone.background }]}>
      <AppText style={[styles.statusText, { color: tone.foreground }]}>
        {status}
      </AppText>
    </View>
  );
}

function RequestCard({
  request,
  onPress,
}: {
  request: RequestItem;
  onPress: () => void;
}) {
  const isCollection = request.category === "collection";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${isCollection ? "collection" : "fertiliser"} request from ${request.estate}`}
      onPress={onPress}
      style={({ pressed }) => [styles.requestCard, pressed && styles.pressed]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.estateTitle}>
          <View
            style={[
              styles.categoryIcon,
              !isCollection && styles.fertiliserIcon,
            ]}
          >
            <Ionicons
              name={isCollection ? "leaf-outline" : "flask-outline"}
              size={18}
              color={colors.brandDark}
            />
          </View>
          <View style={styles.estateText}>
            <AppText variant="label" style={styles.estateName} numberOfLines={1}>
              {request.estate}
            </AppText>
            <AppText variant="caption" style={styles.requestAbout} numberOfLines={1}>
              {request.about}
            </AppText>
          </View>
        </View>
        <RequestStatusPill status={request.status} />
      </View>

      <View style={styles.cardBottomRow}>
        <View style={styles.cardMeta}>
          <AppText variant="caption" style={styles.metaLabel}>
            Amount
          </AppText>
          <AppText variant="bodySmall" style={styles.amount}>
            {request.amount}
          </AppText>
        </View>
        <View style={[styles.cardMeta, styles.managerMeta]}>
          <AppText variant="caption" style={styles.metaLabel}>
            Manager
          </AppText>
          <AppText variant="bodySmall" style={styles.managerName} numberOfLines={1}>
            {request.manager}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
      </View>
    </Pressable>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="bodySmall" style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="bodySmall" style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

export default function Requests() {
  const [filter, setFilter] = useState<RequestFilter>("All");
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const insets = useSafeAreaInsets();

  const visibleRequests = requests.filter((request) => {
    if (filter === "Collections") return request.category === "collection";
    if (filter === "Fertilisers") return request.category === "fertiliser";
    return true;
  });

  const callManager = async (phone: string) => {
    const phoneUrl = `tel:${phone.replace(/[^\d+]/g, "")}`;
    try {
      const canCall = await Linking.canOpenURL(phoneUrl);
      if (!canCall) {
        Alert.alert("Calling unavailable", "This device cannot place phone calls.");
        return;
      }
      await Linking.openURL(phoneUrl);
    } catch {
      Alert.alert("Unable to call", "Please try calling the manager again.");
    }
  };

  return (
    <Screen style={styles.screen}>
      <AppText variant="heading" style={styles.pageTitle}>
        Requests
      </AppText>
      <AppText variant="bodySmall" style={styles.pageSubtitle}>
        View and follow up on estate requests
      </AppText>

      <View style={styles.filterRow}>
        {filters.map((item) => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(item)}
              style={[styles.filterButton, active && styles.activeFilterButton]}
            >
              <AppText
                variant="label"
                style={[styles.filterText, active && styles.activeFilterText]}
              >
                {item}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {visibleRequests.length > 0 ? (
          visibleRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onPress={() => setSelectedRequest(request)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={28} color={colors.text.tertiary} />
            <AppText variant="label" style={styles.emptyTitle}>
              No requests yet
            </AppText>
            <AppText variant="caption" style={styles.emptyCopy}>
              Requests in this category will appear here.
            </AppText>
          </View>
        )}
      </ScrollView>

      <Modal
        transparent
        visible={selectedRequest !== null}
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close request details"
            style={styles.modalBackdrop}
            onPress={() => setSelectedRequest(null)}
          />
          {selectedRequest && (
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeading}>
                  <AppText variant="subheading" style={styles.sheetTitle}>
                    {selectedRequest.category === "collection"
                      ? "Collection request"
                      : "Fertiliser request"}
                  </AppText>
                  <AppText variant="caption" style={styles.requestId}>
                    {selectedRequest.id}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close request details"
                  hitSlop={10}
                  onPress={() => setSelectedRequest(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={21} color={colors.text.secondary} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.detailContent}
              >
                <View style={styles.detailCard}>
                  <DetailRow label="Estate" value={selectedRequest.estate} />
                  <DetailRow
                    label={selectedRequest.category === "collection" ? "Requested" : "Fertiliser"}
                    value={selectedRequest.about}
                  />
                  <DetailRow
                    label={selectedRequest.category === "collection" ? "Estimated amount" : "Amount"}
                    value={selectedRequest.amount}
                  />
                  <DetailRow label="Request date & time" value={selectedRequest.requestedAt} />
                  <View style={styles.detailRow}>
                    <AppText variant="bodySmall" style={styles.detailLabel}>
                      Request status
                    </AppText>
                    <RequestStatusPill status={selectedRequest.status} />
                  </View>
                </View>

                <AppText variant="label" style={styles.managerHeading}>
                  Requested by
                </AppText>
                <View style={styles.managerCard}>
                  <View style={styles.managerAvatar}>
                    <Ionicons name="person-outline" size={19} color={colors.brandDark} />
                  </View>
                  <View style={styles.managerContact}>
                    <AppText variant="label" style={styles.managerDetailName}>
                      {selectedRequest.manager}
                    </AppText>
                    <AppText variant="caption" style={styles.managerPhone}>
                      {selectedRequest.managerContact}
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${selectedRequest.manager}`}
                    onPress={() => void callManager(selectedRequest.managerContact)}
                    style={styles.callButton}
                  >
                    <Ionicons name="call" size={18} color={colors.white} />
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: "100%",
    paddingTop: spacing.lg,
  },
  pageTitle: {
    color: colors.text.primary,
  },
  pageSubtitle: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  filterButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.white,
  },
  activeFilterButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  activeFilterText: {
    color: colors.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  requestCard: {
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.75,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  estateTitle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.brandSurface,
  },
  fertiliserIcon: {
    backgroundColor: "#F0FDF4",
  },
  estateText: {
    flex: 1,
  },
  estateName: {
    color: colors.text.primary,
  },
  requestAbout: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cardMeta: {
    minWidth: 80,
  },
  managerMeta: {
    flex: 1,
    marginLeft: spacing.md,
  },
  metaLabel: {
    color: colors.text.tertiary,
  },
  amount: {
    color: colors.text.primary,
    marginTop: 2,
  },
  managerName: {
    color: colors.text.primary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl * 1.5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  emptyCopy: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(16, 24, 7, 0.35)",
  },
  sheet: {
    height: "58%",
    minHeight: 390,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.white,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    alignSelf: "center",
    borderRadius: 99,
    backgroundColor: colors.border.default,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sheetHeading: {
    flex: 1,
  },
  sheetTitle: {
    color: colors.text.primary,
  },
  requestId: {
    color: colors.text.tertiary,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.surface,
    marginLeft: spacing.sm,
  },
  detailContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  detailCard: {
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  detailRow: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailLabel: {
    flex: 1,
    color: colors.text.secondary,
  },
  detailValue: {
    flex: 1.2,
    color: colors.text.primary,
    fontWeight: "600",
    textAlign: "right",
  },
  managerHeading: {
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  managerCard: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 16,
  },
  managerAvatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.brandSurface,
  },
  managerContact: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  managerDetailName: {
    color: colors.text.primary,
  },
  managerPhone: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  callButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.brandDark,
  },
});