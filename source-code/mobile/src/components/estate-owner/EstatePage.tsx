import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Screen } from "@/components/ui";

export const estateGreen = "#118725";

export function EstateIcon({ name, size = 22 }: {
  name: ComponentProps<typeof Ionicons>["name"];
  size?: number;
}) {
  return <Ionicons name={name} size={size} color={estateGreen} />;
}

export function EstatePage({ title, children, onEdit }: {
  title: string;
  children: ReactNode;
  onEdit?: () => void;
}) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Screen scroll keyboardShouldPersistTaps="handled" style={[estateStyles.content, { paddingBottom: 28 + bottom }]} header={
      <SafeAreaView edges={["top"]} style={estateStyles.header}>
        <View style={estateStyles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={estateStyles.iconButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(estate-owner)/estates")}>
            <Ionicons name="arrow-back" size={23} color="#10241c" />
          </Pressable>
          <AppText variant="subHeading" style={estateStyles.bold}>{title}</AppText>
          {onEdit ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Edit estate" style={estateStyles.iconButton} onPress={onEdit}>
              <Ionicons name="pencil-outline" size={21} color="#10241c" />
            </Pressable>
          ) : <View style={estateStyles.iconButton} />}
        </View>
      </SafeAreaView>
    }>
      {children}
    </Screen>
  );
}

export const estateStyles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 12 },
  header: { backgroundColor: "#fff" },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 8, minHeight: 56 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  bold: { color: "#10241c", fontWeight: "700" },
  muted: { color: "#46566b" },
  section: { gap: 8, marginTop: 8 },
  card: { borderWidth: 1, borderColor: "#e0e6e9", borderRadius: 9, padding: 11, backgroundColor: "#fff" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  grow: { flex: 1 },
  action: { minHeight: 44, borderRadius: 9, backgroundColor: "#19833b", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 8 },
  outline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#19833b" },
  white: { color: "#fff", fontWeight: "700" },
});
