import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, View } from "react-native";

import { Screen, AppText, SearchBar } from "@/components/ui";
import { EstateCard } from "@/components/estate-owner";
import { colors, spacing } from "@/theme";

const estates = [
    {
        imageSrc: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
        name: "Kothmale Green Tea",
        location: "134/b, Up road, Kothmale",
        managerName: "K.P. Silva",
        areaAcres: 100,
        grade: "Grade A"
    },
    {
        imageSrc: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
        name: "Kothmale Green Tea",
        location: "134/b, Up road, Kothmale",
        managerName: "K.P. Kumara",
        areaAcres: 100,
        grade: "Grade A"
    },
    {
        imageSrc: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
        name: "Kothmale Green Tea",
        location: "134/b, Up road, Kothmale",
        managerName: "K.P. Silva",
        areaAcres: 100,
        grade: "Grade A"
    },
    {
        imageSrc: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
        name: "Kothmale Green Tea",
        location: "134/b, Up road, Kothmale",
        managerName: "K.P. Silva",
        areaAcres: 100,
        grade: "Grade A"
    }
];

export default function Estates() {
    const [search, setSearch] = useState("");
    const query = search.trim().toLowerCase();
    const filteredEstates = query
        ? estates.filter((estate) =>
            [estate.name, estate.location, estate.managerName, estate.grade]
                .some((value) => value.toLowerCase().includes(query))
        )
        : estates;

    return (
        <Screen style={styles.container}>
             <View style={styles.heading}>
                    <AppText variant="subheading" style={styles.heading}>
                        Estates
                    </AppText>
                </View>
                <View style={styles.searchSection}>
                    <AppText variant="label" style={styles.sectionTitle}>
                        All estates
                    </AppText>
                    <SearchBar
                        value={search}
                        placeholder="Search by name, location or manager"
                        onChangeText={setSearch}
                    />
                </View>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >

                {filteredEstates.length > 0 ? filteredEstates.map((estate, index) => (
                    <EstateCard
                        key={`${estate.name}-${index}`}
                        imageSrc={estate.imageSrc}
                        name={estate.name}
                        location={estate.location}
                        managerName={estate.managerName}
                        areaAcres={estate.areaAcres}
                        grade={estate.grade}
                    />
                )) : (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="search-outline" size={24} color={colors.brandDark} />
                        </View>
                        <AppText variant="subheading" style={styles.emptyTitle}>
                            No estates found
                        </AppText>
                        <AppText variant="bodySmall" style={styles.emptyCopy}>
                            Try another name, location or manager.
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
        marginBottom: spacing.sm,
    },
    title: {
        color: colors.text.primary,
    },
    summary: {
        minHeight: 92,
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.brandBorder,
        borderRadius: 20,
        backgroundColor: colors.brandSurface,
    },
    summaryIcon: {
        width: 46,
        height: 46,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.white,
        marginRight: spacing.md,
    },
    countBadge: {
        minWidth: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        backgroundColor: colors.brandDark,
        marginLeft: spacing.sm,
    },
    countText: {
        color: colors.white,
    },
    searchSection: {
        marginBottom: spacing.xs,
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