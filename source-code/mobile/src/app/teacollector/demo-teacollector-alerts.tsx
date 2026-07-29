import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { c, fontMono } from '@/components/ui/demo-teacollector-theme';

export default function DemoTeaCollectorAlerts({ notifications }: any) {
  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100 }}>
      <View style={{
        borderRadius: 16,
        paddingHorizontal: 16,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.line,
      }}>
        {notifications.map((n: any, i: number) => (
          <View key={i} style={{
            flexDirection: 'row',
            gap: 12,
            paddingVertical: 14,
            borderBottomWidth: i < notifications.length - 1 ? 1 : 0,
            borderBottomColor: c.line,
          }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: n.bg,
            }}>
              <Ionicons name={n.icon as any} size={17} color={n.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: c.ink }}>{n.title}</Text>
              <Text style={{ fontSize: 12, marginTop: 2, color: '#8A9082' }}>{n.desc}</Text>
            </View>
            <Text style={{
              fontFamily: fontMono.fontFamily,
              fontSize: 12,
              color: '#A7AC9C',
            }}>{n.time}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
