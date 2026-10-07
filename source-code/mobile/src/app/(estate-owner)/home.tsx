import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Header, EstateOwnerBottomTab } from "@/components/ui";
import type { BottomTabItem } from "@/components/ui/BottomTab";
import {
  MonthSummaryCard,
  SectionHeader,
  EstateListItem,
  RequestListItem,
  DeliveryListItem,
} from "@/components/estate-owner";
import {
  activeDeliveries,
  monthlySummary,
  ownerName,
  pendingRequests,
  registeredEstates,
  todayLabel,
} from "@/data/estateOwnerHome";
import { spacing } from "@/theme";

export default function EstateOwnerHome() {
  // const router = useRouter();

  // const handleTabPress = (tab: BottomTabItem) => {
  //   if (tab.key === "home") {
  //     router.navigate("/(estate-owner)/home");
  //   } else if (tab.key === "estates") {
  //     router.navigate("/(estate-owner)/estates");
  //   }
  // };

  return (
    <>
      <Header
        username={ownerName}
        greeting="Good morning,"
        date={todayLabel}
        notificationCount={3}
        onNotificationPress={() => {
          // TODO: navigate to notifications once the route exists
        }}
      />

      <Screen style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MonthSummaryCard summary={monthlySummary} />

          <SectionHeader
            title="Active Deliveries"
            count={activeDeliveries.length}
            onViewAll={() => {}}
          />
          <View style={styles.list}>
            {activeDeliveries.map((delivery) => (
              <DeliveryListItem
                key={delivery.id}
                delivery={delivery}
                onPress={() => {}}
              />
            ))}
          </View>

          <SectionHeader
            title="Pending Requests"
            count={pendingRequests.length}
            onViewAll={() => {}}
          />
          <View style={styles.list}>
            {pendingRequests.map((request) => (
              <RequestListItem
                key={request.id}
                request={request}
                onPress={() => {}}
              />
            ))}
          </View>
        </ScrollView>

        
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },

  scroll: {
    flex: 1,
    width: "100%",
  },

  scrollContent: {
    // paddingBottom: spacing.lg,
  },

  list: {
    gap: spacing.sm,
  },

});
