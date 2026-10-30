import BottomTab, {
  BottomTabItem,
} from "./BottomTab";

import {ViewStyle} from "react-native"

const tabs: BottomTabItem[] = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
  },
  {
    key: "estates",
    label: "Estates",
    icon: "leaf-outline",
  },
  {
    key: "requests",
    label: "Requests",
    icon: "document-text-outline",
  },
  {
    key: "insights",
    label: "Insights",
    icon: "analytics-outline",
  },
  {
    key: "profile",
    label: "Profile",
    icon: "person-outline",
  }
];

interface Props {
  activeTab: string;
  onTabPress: (tab: BottomTabItem) => void;
  style?: ViewStyle,
}

export default function EstateOwnerBottomTab({
  activeTab,
  onTabPress,
  style,
}: Props) {
  return (
    <BottomTab
      tabs={tabs}
      activeTab={activeTab}
      onTabPress={onTabPress}
      style={style}
    />
  );
}