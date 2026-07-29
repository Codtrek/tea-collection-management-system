import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Pill } from '@/components/ui/demo-teacollector-pill';
import { Btn } from '@/components/ui/demo-teacollector-button';
import { c, fontDisplay, fontMono } from "@/components/ui/demo-teacollector-theme";

export const FertRequestCard = ({ request, onViewDetails, onLoadFertilizer, onDeliverFertilizer }: any) => {
  const statusMap: any = {
    confirmed: { label: "Confirmed", action: "Load Fertilizer", handler: onLoadFertilizer },
    loaded: { label: "Loaded", action: "Deliver", handler: onDeliverFertilizer },
    delivered: { label: "Delivered", action: null, handler: null },
  };

  const currentStatus = statusMap[request.status];

  return (
    <View style={{
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: fontDisplay.fontFamily,
            fontWeight: '600',
            fontSize: 16,
          }}>{request.estateName}</Text>
          <Text style={{
            fontSize: 12,
            marginTop: 2,
            color: c.muted,
          }}>{request.fertilizerType} · {request.quantity} kg</Text>
          <Text style={{
            fontSize: 12,
            marginTop: 2,
            color: c.muted,
          }}>
            {request.status === "confirmed" && `Confirmed at ${request.confirmedAt}`}
            {request.status === "loaded" && `Loaded at ${request.loadedAt}`}
            {request.status === "delivered" && `Delivered at ${request.deliveredAt}`}
          </Text>
        </View>
        <Pill status={request.status} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Btn variant="ghost" small onPress={() => onViewDetails(request)}>
            View Details
          </Btn>
        </View>
        {currentStatus.action && (
          <View style={{ flex: 1 }}>
            <Btn variant="primary" small onPress={() => currentStatus.handler(request)}>
              {currentStatus.action}
            </Btn>
          </View>
        )}
      </View>
    </View>
  );
};

export const StopCard = ({ stop, onViewDetails, onArrivedDetails }: any) => {
  const clickable = stop.status === "pending" || stop.status === "accepted";

  const handleCardPress = () => {
    if (stop.status === "pending") onViewDetails(stop);
    if (stop.status === "accepted") onArrivedDetails(stop);
  };

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      disabled={!clickable}
      style={{
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.line,
        opacity: clickable ? 1 : 0.7,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{
            fontFamily: fontDisplay.fontFamily,
            fontWeight: '600',
            fontSize: 16,
          }}>{stop.name}</Text>
          <Text style={{
            fontSize: 12,
            marginTop: 2,
            color: c.muted,
          }}>
            {stop.status === "cancelled" && `Reason: ${stop.reason}`}
            {stop.status === "pending" && `Owner: ${stop.owner}`}
            {stop.status === "accepted" && `Accepted at ${stop.acceptedAt}`}
            {stop.status === "loaded" && "Awaiting factory drop-off"}
            {stop.status === "delivered" && "✓ Completed"}
          </Text>
        </View>
        <Pill status={stop.mismatch && stop.status === "delivered" ? "mismatch" : stop.status} />
      </View>

      {stop.status === "pending" && (
        <>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
            <Text style={{
              fontFamily: fontMono.fontFamily,
              fontSize: 12,
              color: c.forest,
            }}>~{stop.estWeight} kg</Text>
            <Text style={{
              fontFamily: fontMono.fontFamily,
              fontSize: 12,
              color: c.forest,
            }}>{stop.dist} km</Text>
          </View>
          <TouchableOpacity
            onPress={() => onViewDetails(stop)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginTop: 12,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1.5,
              borderColor: c.forestLight,
            }}
          >
            <Text style={{
              fontWeight: '600',
              fontSize: 15,
              color: c.forest,
            }}>View Details</Text>
            <Ionicons name="chevron-forward-outline" size={16} color={c.forest} />
          </TouchableOpacity>
        </>
      )}

      {stop.status === "accepted" && (
        <View style={{ marginTop: 12 }}>
          <Btn variant="forest" small onPress={() => {
            console.log("Navigate to", stop.name);
          }}>
            Navigate
          </Btn>
        </View>
      )}

      {stop.status === "loaded" && (
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontSize: 12,
            color: c.forest,
          }}>{stop.actualWeight} kg</Text>
        </View>
      )}

      {stop.status === "delivered" && (
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontSize: 12,
            color: c.muted,
          }}>{stop.actualWeight} kg delivered</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
