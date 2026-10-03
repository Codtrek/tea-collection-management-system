import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

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
  const [activeTab, setActiveTab] = useState("home");

  const handleTabPress = (tab: BottomTabItem) => {
    setActiveTab(tab.key);

    // Later you can navigate here if needed
    // router.push(...)
  };

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
            title="My Estates"
            count={registeredEstates.length}
            onViewAll={() => {}}
          />
          <View style={styles.list}>
            {registeredEstates.map((estate) => (
              <EstateListItem
                key={estate.id}
                estate={estate}
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

        <EstateOwnerBottomTab
          activeTab={activeTab}
          onTabPress={handleTabPress}
          style={styles.bottomTab}
        />
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
    paddingBottom: spacing.lg,
  },

  list: {
    gap: spacing.sm,
  },

  bottomTab: {
    width: "100%",
    marginTop: spacing.sm,
    alignSelf: "stretch",
  },
});
