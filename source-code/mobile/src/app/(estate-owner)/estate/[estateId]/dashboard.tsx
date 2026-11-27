import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { EstatePage, estateStyles as ui } from "@/components/estate-owner/EstatePage";
import { AppText } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";
import { formatKg } from "@/utils/format";
import { CollectionRequestDetailsModal } from "@/components/collection-request/CollectionRequestDetailsModal";
import { teaGardenImage } from "@/data/estateOwnerEstates";
import { getOwnedEstates, type OwnedEstate } from "@/app/services/api/estate-owner.api";
import { getOwnerCollectionRequests, type OwnerCollectionRequest } from "@/app/services/api/collection-request.api";

export default function EstateDashboard() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const [estate, setEstate] = useState<OwnedEstate | null>(null);
  const [requests, setRequests] = useState<OwnerCollectionRequest[] | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<OwnerCollectionRequest | null>(null);
  const [estateError, setEstateError] = useState("");
  const [requestError, setRequestError] = useState("");

  useFocusEffect(useCallback(() => {
    let active = true;
    setEstate(null);
    setRequests(null);
    setSelectedRequest(null);
    setEstateError("");
    setRequestError("");

    void getOwnedEstates().then((estates) => {
      if (!active) return;
      const selected = estates.find((item) => String(item.id) === estateId);
      if (selected) setEstate(selected);
      else setEstateError("This estate is unavailable.");
    }).catch(() => { if (active) setEstateError("Could not load the estate."); });

    void getOwnerCollectionRequests().then((items) => {
      if (active) setRequests(items.filter((item) => String(item.estateId) === estateId));
    }).catch(() => { if (active) setRequestError("Could not load collection requests."); });
    return () => { active = false; };
  }, [estateId]));

  return (
    <EstatePage title="Estate dashboard">
      {estate ? (
        <>
          <Image source={{ uri: teaGardenImage }} placeholder={require("@/assets/images/estate1.jpg")}
            contentFit="cover" style={styles.photo} />
          <View style={ui.section}>
            <AppText variant="sectionHeading">{estate.name}</AppText>
            <AppText style={ui.muted}>{estate.location}</AppText>
          </View>
          <View style={ui.section}>
            <View style={ui.card}>
              <AppText variant="label">Year-to-date deliveries</AppText>
              <AppText variant="subHeading">
                {Number(estate.ytdDeliveriesKg).toLocaleString("en-LK", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg
              </AppText>
            </View>
          </View>
          <View style={ui.section}>
            <AppText variant="subHeading">Collection requests</AppText>
            {requestError ? <AppText accessibilityRole="alert">{requestError}</AppText>
              : !requests ? <AppText>Loading requests…</AppText>
              : !requests.length ? <AppText>No collection requests yet.</AppText>
              : <>
                <AppText style={ui.muted}>{requests.length} total · {requests.filter((r) => r.status === "open").length} pending</AppText>
                {requests.slice(0, 5).map((request) => (
                  <Pressable
                    key={request.id}
                    accessibilityRole="button"
                    accessibilityHint="Opens collection request details"
                    onPress={() => setSelectedRequest(request)}
                    style={({ pressed }) => [ui.card, ui.row, pressed && styles.pressed]}
                  >
                    <View style={ui.grow}>
                      <AppText variant="label">Request #{request.id}</AppText>
                      <AppText variant="caption">{new Date(request.createdAt).toLocaleDateString()}</AppText>
                      {request.teaWeightKg != null && (
                        <View style={ui.row}>
                          <Ionicons name="scale-outline" size={14} color={colors.text.tertiary} />
                          <AppText variant="caption">{formatKg(Number(request.teaWeightKg), 2)}</AppText>
                        </View>
                      )}
                    </View>
                    <AppText>{request.status === "open" ? "Pending" : request.status.charAt(0).toUpperCase() + request.status.slice(1)}</AppText>
                  </Pressable>
                ))}
              </>}
          </View>
          {selectedRequest && (
            <CollectionRequestDetailsModal
              request={selectedRequest}
              onUpdated={(updated) => {
                setRequests((items) => items?.map((item) => item.id === updated.id ? updated : item) ?? null);
                setSelectedRequest(updated);
              }}
              onClose={() => setSelectedRequest(null)}
              onDeleted={(id) => {
                setRequests((items) => items?.filter((item) => item.id !== id) ?? null);
                setSelectedRequest(null);
              }}
            />
          )}
        </>
      ) : <AppText>{estateError || "Loading estate…"}</AppText>}
    </EstatePage>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  photo: { width: "100%", height: 160, borderRadius: 16 },
});
