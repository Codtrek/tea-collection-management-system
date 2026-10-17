import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen, AppText, Dropdown, Stat } from "@/components/ui"
import { EstateAvatarWithDetails } from "@/components/estate";
import type { DropdownOption } from "@/components/ui/Dropdown";

const factories: DropdownOption[] = [
    { label: "Nuwara Eliya Tea Factory", value: "nuwara-eliya" },
    { label: "Pedro Tea Factory", value: "pedro" },
    { label: "Kandapola Tea Factory", value: "kandapola" },
];

export default function CollectionRequest() {
    const [factory, setFactory] = useState<string>();

    return(
        <Screen>
            <View>
                <View style={styles.title}>
                    <AppText variant="subHeading">Collection Request</AppText>
                </View>
                <EstateAvatarWithDetails
                    name="Nuwara Eliya Estate"
                    address="12-B, up road, Nuwara"
                    area="100 acres"
                    image="https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
                />
                <View style={styles.requestFactoryAndDate}>
                    <View style={styles.factory}>
                        <AppText style={styles.fieldLabel}>Factory</AppText>
                        <Dropdown
                            accessibilityLabel="Select factory"
                            options={factories}
                            onChange={setFactory}
                            placeholder="Select a factory"
                            value={factory}
                        />
                    </View>
                    <View style={styles.date}>
                        <AppText style={styles.fieldLabel}>Date</AppText>
                        <AppText variant="body">
                            {new Date().toLocaleDateString()}
                        </AppText>
                    </View>
                </View>
                <View style={styles.stats}>
                    <Stat stat="Weight" value="5 kg"/>
                    <Stat stat="Pluckers" value="3"/>
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    title: {
        marginBottom: 20,
    },
    requestFactoryAndDate: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 16,
        marginBottom: 20,
    },
    factory: {
        flex: 1,
        gap: 8,
    },
    date: {
        gap: 8,
        paddingBottom: 12,
    },
    fieldLabel: {
        fontWeight: "600",
    },
    stats: {
        flexDirection: "row",
        gap: 50,
    },
});