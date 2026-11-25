import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getSignedInOwnerName } from "../services/api/estate-owner.api";
import { getOwnerCollectionRequests, type OwnerCollectionRequest } from "../services/api/collection-request.api";

import { AppText, Screen, Header, EstateOwnerBottomTab, GeneralHeader } from "@/components/ui";
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
import { colors, spacing } from "@/theme";

export default function EstateOwnerHome() {
  // const router = useRouter();

  // const handleTabPress = (tab: BottomTabItem) => {
  //   if (tab.key === "home") {
  //     router.navigate("/(estate-owner)/home");
  //   } else if (tab.key === "estates") {
  //     router.navigate("/(estate-owner)/estates");
  //   }
  // };

  const [signedInOwnerName, setSignedInOwnerName] = useState("");
  const [openRequests, setOpenRequests] = useState<OwnerCollectionRequest[] | null>(null);
  const [requestError, setRequestError] = useState("");

  useFocusEffect(useCallback(() => {
    let active = true;
    setSignedInOwnerName("");
    setOpenRequests(null);
    setRequestError("");
    void getOwnerCollectionRequests()
      .then((requests) => {
        if (active) setOpenRequests(requests.filter((request) => request.status === "open"));
      })
      .catch((error: unknown) => {
        if (active) setRequestError(error instanceof Error ? error.message : "Could not load collection requests.");
      });

    void getSignedInOwnerName()
      .then((name) => { if (active) setSignedInOwnerName(name); })
      .catch(() => { if (active) setSignedInOwnerName(""); });
    return () => { active = false; };
  }, []));

  return (
    <>
      {/* <Header
        username={ownerName}
        greeting="Good morning,"
        date={todayLabel}
        notificationCount={3}
        onNotificationPress={() => {
          // TODO: navigate to notifications once the route exists
        }}
      /> */}

      <Screen 
        // style={styles.container}
        header={
          <GeneralHeader
            title="Home"
            description={signedInOwnerName ? `Welcome back, ${signedInOwnerName}!` : "Welcome back!"}
            notificationCount={3}
            onNotificationPress={() => {
              // TODO: navigate to notifications once the route exists
            }}
          />
        }
        scroll={true}
        >
        {/* <GeneralHeader
          title="Home"
          description="Welcome Back!"
          notificationCount={3}
          onNotificationPress={() => {
            // TODO: navigate to notifications once the route exists
          }}
        /> */}

        {/* <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        > */}
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
            count={openRequests?.length}
          />
          <View style={styles.list}>
            {requestError ? <AppText>{requestError}</AppText>
              : openRequests === null ? <AppText>Loading requests…</AppText>
              : openRequests.length === 0 && <AppText>No pending collection requests.</AppText>}
            {openRequests?.map((request) => (
              <RequestListItem
                key={request.id}
                request={{
                  id: String(request.id),
                  estateName: request.estate.name,
                  requestedAt: new Date(request.createdAt).toLocaleString(),
                  status: "pending",
                }}
              />
            ))}
          </View>
        {/* </ScrollView> */}
              
        
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.white,
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
