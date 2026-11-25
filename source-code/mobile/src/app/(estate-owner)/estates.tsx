import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { EstateCard } from "@/components/estate-owner";
import { teaGardenImage } from "@/data/estateOwnerEstates";
import { AppButton, AppText, GeneralHeader, Screen, SearchBar } from "@/components/ui";
import { getOwnedEstates, type OwnedEstate } from "../services/api/estate-owner.api";
import { colors, spacing } from "@/theme";

export default function Estates() {
  const [estateProfiles, setEstates] = useState<OwnedEstate[] | null>(null);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    let active = true;
    setEstates(null);
    setError("");
    void getOwnedEstates()
      .then((estates) => { if (active) setEstates(estates); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load estates.");
      });
    return () => { active = false; };
  }, []));
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredEstates = query
    ? estateProfiles?.filter((estate) =>
        [estate.name, estate.location].some(
          (value) => value.toLowerCase().includes(query)
        )
      )
    : estateProfiles;

  return (
    <Screen style={styles.container}
      header = {
        <GeneralHeader 
          title="Estates"
          description="Manage your estates and see insights!"
        />
      }
    >
      {/* <View style={styles.heading}>
        <View>
          <AppText variant="subHeading" style={styles.title}>
            Estates
          </AppText>
          <AppText variant="bodySmall" style={styles.subtitle}>
            Manage your tea-growing properties
          </AppText>
        </View>
        <View style={styles.countBadge}>
          <AppText variant="label" style={styles.countText}>
            {estateProfiles.length}
          </AppText>
        </View>
      </View> */}

      {/* <View style={styles.searchSection}> */}
        {/* <AppText variant="label" style={styles.sectionTitle}>
          All estates
        </AppText> */}
        {/* <View style={styles.searchInput}> */}
        {/* <SearchBar */}
          {/* value={search} */}
          {/* placeholder="Search by name, location or manager" */}
          {/* onChangeText={setSearch} */}
        {/* /> */}
        {/* </View> */}
        {/* <AppButton title="+ Add estate" width="auto" style={styles.addButton} onPress={() => router.push("/(estate-owner)/add-estate")} /> */}
      {/* </View> */}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchSection}>
        {/* <AppText variant="label" style={styles.sectionTitle}>
          All estates
        </AppText> */}
        <View style={styles.searchInput}>
          <SearchBar
          value={search}
          placeholder="Search by name or location"
          onChangeText={setSearch}
          />
        </View>
          <AppButton title="+ Add estate" width="auto" style={styles.addButton} onPress={() => router.push("/(estate-owner)/add-estate")} />
        </View>

        {error ? <AppText accessibilityRole="alert">{error}</AppText> : !filteredEstates ? (
          <AppText>Loading estates…</AppText>
        ) : filteredEstates.length > 0 ? (
          filteredEstates.map((estate) => (
            <EstateCard
              key={estate.id}
              imageSrc={teaGardenImage}
              name={estate.name}
              location={estate.location}
              onPress={() => router.push({
                pathname: "./estate/[estateId]/dashboard",
                params: { estateId: String(estate.id) },
              })}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search-outline"
                size={24}
                color={colors.brandDark}
              />
            </View>
            <AppText variant="subHeading" style={styles.emptyTitle}>
              No estates found
            </AppText>
            <AppText variant="bodySmall" style={styles.emptyCopy}>
              {query ? "Try another name or location." : "No estates are registered to your account."}
            </AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    paddingTop: spacing.lg,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.text.secondary,
  },
  countBadge: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.brandSurface,
  },
  countText: {
    color: colors.brandDark,
  },
  addButton: { height: 50, aspectRatio: undefined, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, minWidth: 0 },
  searchSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  scroll: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl * 1.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.brandSurface,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyCopy: {
    color: colors.text.secondary,
    textAlign: "center",
  },
});
