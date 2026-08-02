import React from "react";
import BottomTab, { BottomTabItem } from "@/components/ui/BottomTab";

export interface TeaCollectorNavItem {
  id: string;
  label: string;
  icon: string;
}

export default function DemoTeaCollectorBottomTab({
  items,
  activeId,
  onSelect,
}: {
  items: TeaCollectorNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  // map incoming items to BottomTab's expected shape
  const tabs: BottomTabItem[] = items.map((it) => ({
    key: it.id,
    label: it.label,
    // keep the icon string as-is since BottomTab uses Ionicons keys
    icon: it.icon as any,
  }));

  return (
    <BottomTab
      tabs={tabs}
      activeTab={activeId}
      onTabPress={(tab) => onSelect(tab.key)}
    />
  );
}
