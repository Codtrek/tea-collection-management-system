import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FertRequestCard } from '@/components/ui/demo-teacollector-cards';
import { c, fontDisplay, fontMono, STATUS_STYLE } from '@/components/ui/demo-teacollector-theme';

export default function DemoTeaCollectorFertilizer({ requests, onViewDetails, onLoadFertilizer, onDeliverFertilizer }: any) {
  const groups = [
    { key: 'confirmed', label: 'Confirmed - Ready to Load', items: requests.filter((r: any) => r.status === 'confirmed') },
    { key: 'loaded', label: 'Loaded - Ready to Deliver', items: requests.filter((r: any) => r.status === 'loaded') },
    { key: 'delivered', label: 'Delivered', items: requests.filter((r: any) => r.status === 'delivered') },
  ];

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100 }}>
      {groups.map((g) => g.items.length > 0 && (
        <View key={g.key}>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 1.8,
            marginBottom: 10,
            marginLeft: 2,
            fontSize: 11,
            color: c.sageDeep,
          }}>
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
      ))}

      {requests.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Ionicons name="leaf-outline" size={48} color={c.muted} opacity={0.3} />
          <Text style={{ fontWeight: '600', marginTop: 12, color: c.muted }}>No fertilizer requests</Text>
          <Text style={{ fontSize: 15, color: c.muted }}>All requests have been completed</Text>
        </View>
      )}
    </ScrollView>
  );
}
