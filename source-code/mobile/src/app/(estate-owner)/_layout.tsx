import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { router, Stack, usePathname } from "expo-router";

import { EstateOwnerBottomTab } from "@/components/ui";
import type { BottomTabItem } from "@/components/ui/BottomTab";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/theme/spacing";

export default function EstateOwnerLayout() {
    const pathname = usePathname();
    const activeTab = pathname.endsWith("/estates") ? "estates" : "home";

    useEffect(() => {
        router.prefetch("/(estate-owner)/home");
        router.prefetch("/(estate-owner)/estates");
    }, []);

    const handleTabPress = (tab: BottomTabItem) => {
        if (tab.key === "home") {
            router.replace("/(estate-owner)/home");
        }else if (tab.key === "estates") {
            router.replace("/(estate-owner)/estates");
        }
    };

    const insets = useSafeAreaInsets();


    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        animation: "none",
                    }}
                />
            </View>

            <View style={[styles.bottomTab, { paddingBottom: insets.bottom }]}>

                <EstateOwnerBottomTab
                    activeTab={activeTab}
                    onTabPress={handleTabPress}
                    style={styles.bottomTab}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    content: {
        flex: 1,
    },

    bottomTab: {
    width: "100%",
    alignSelf: "stretch",
  },
});
