
import React from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EstateManagerBottomTab from "@/components/ui/EstateManagerBottomTab";
import type { BottomTabItem } from "@/components/ui/EstateManagerBottomTab";
import { colors } from "@/theme/colors";

export default function EstateManagerLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const activeTab = pathname.endsWith("/Employees")
    ? "employees"
    : pathname.endsWith("/PhotoEvidence")
    ? "photoEvidence"
    : pathname.endsWith("/Reports")
    ? "reports"
    : pathname.endsWith("/EmployeeProfile")
    ? "profile"
    : "dashboard";

  const handleTabPress = (tab: BottomTabItem) => {
    const routes: Record<string, string> = {
      dashboard: "/estatemanager",
      employees: "/estatemanager/Employees",
      photoEvidence: "/estatemanager/PhotoEvidence",
      reports: "/estatemanager/Reports",
      profile: "/estatemanager/EmployeeProfile",
    };

    const route = routes[tab.key];

    if (route && pathname !== route) {
      router.replace(route as never);
    }
  };

  return (
    <View style={styles.container}>
      {/* Page content takes the available space above the tab */}
      <View style={styles.pageContent}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            contentStyle: {
              backgroundColor: colors.surface,
            },
          }}
        />
      </View>

      {/* Bottom navigation stays in its own layout area */}
      <View
        style={[
          styles.bottomTabContainer,
          { paddingBottom: insets.bottom },
        ]}
      >
        <EstateManagerBottomTab
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  pageContent: {
    flex: 1,
  },
  bottomTabContainer: {
    flexShrink: 0,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
});
