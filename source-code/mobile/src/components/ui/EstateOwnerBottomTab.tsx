import BottomTab, {
  BottomTabItem,
} from "./BottomTab";

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
    key: "collectings",
    label: "Collectings",
    icon: "basket-outline",
  },
  {
    key: "factories",
    label: "Factories",
    icon: "business-outline",
  },
];

interface Props {
  activeTab: string;
  onTabPress: (tab: BottomTabItem) => void;
}

export default function EstateOwnerBottomTab({
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