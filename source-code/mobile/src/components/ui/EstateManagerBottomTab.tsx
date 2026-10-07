import BottomTab, {
  BottomTabItem,
} from "./BottomTab";

const tabs: BottomTabItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "grid-outline",
  },
  {
    key: "employees",
    label: "Employees",
    icon: "briefcase-outline",
  },
  {
    key: "photoEvidence",
    label: "Photo Evidence",
    icon: "camera-outline",
  },
  {
    key: "reports",
    label: "Reports",
    icon: "bar-chart-outline",
  },
];

interface Props {
  activeTab: string;
  onTabPress: (tab: BottomTabItem) => void;
}

export default function EstateManagerBottomTab({
  activeTab,
  onTabPress,
}: Props) {
  return (
    <BottomTab
      tabs={tabs}
      activeTab={activeTab}
      onTabPress={onTabPress}
    />
  );
}