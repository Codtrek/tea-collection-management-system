import React from "react";
import { View, TouchableOpacity, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { c } from "@/components/ui/demo-teacollector-theme";

export interface TeaCollectorNavItem {
  id: string;
  label: string;
  icon: string;
}

export default function DemoTeaCollectorNav({
  items,
  activeId,
  onSelect,
}: {
  items: TeaCollectorNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 10,
      paddingBottom: Platform.OS === 'ios' ? 20 : 10,
      backgroundColor: 'rgba(253,251,245,0.94)',
      borderTopWidth: 1,
      borderTopColor: c.line,
    }}>
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={{
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Ionicons name={item.icon as any} size={21} color={active ? c.forest : "#98A08A"} />
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: active ? c.forest : "#98A08A",
            }}>
              {item.label}
            </Text>
            <View style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.amber,
              opacity: active ? 1 : 0,
            }} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
