import { useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, AppText, Dropdown, Stat, AppCard, Avatar, AppButton } from "@/components/ui"
import { EstateAvatarWithDetails } from "@/components/estate";
import type { DropdownOption } from "@/components/ui/Dropdown";
import { colors, spacing } from "@/theme";

interface CollectionRecord {
    id: string;
    pluckerName: string;
    weightKg: number;
    image?: string;
}

const factories: DropdownOption[] = [
    { label: "Nuwara Eliya Tea Factory", value: "nuwara-eliya" },
    { label: "Pedro Tea Factory", value: "pedro" },
    { label: "Kandapola Tea Factory", value: "kandapola" },
];

export default function CollectionRequest() {
    const [factory, setFactory] = useState<string>();
    const [collectionRecords, setCollectionRecords] = useState<CollectionRecord[]>([]);
    const [isAddRecordVisible, setIsAddRecordVisible] = useState(false);
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [pluckerName, setPluckerName] = useState("");
    const [weight, setWeight] = useState("");
    const [formError, setFormError] = useState("");
    const totalWeight = collectionRecords.reduce((total, record) => total + record.weightKg, 0);

    const closeAddRecord = () => {
        setIsAddRecordVisible(false);
        setEditingRecordId(null);
        setPluckerName("");
        setWeight("");
        setFormError("");
    };

    const handleAddRecord = () => {
        const trimmedName = pluckerName.trim();
        const weightKg = Number(weight);

        if (!trimmedName || !Number.isFinite(weightKg) || weightKg <= 0) {
            setFormError("Enter the plucker's name and a weight greater than zero.");
            return;
        }

        setCollectionRecords((records) => [
            ...records,
            {
                id: `${Date.now()}-${records.length}`,
                pluckerName: trimmedName,
                weightKg,
            },
        ]);
        closeAddRecord();
    };

    const openAddRecord = () => {
        setEditingRecordId(null);
        setPluckerName("");
        setWeight("");
        setFormError("");
        setIsAddRecordVisible(true);
    };

    const openEditRecord = (record: CollectionRecord) => {
        setEditingRecordId(record.id);
        setPluckerName(record.pluckerName);
        setWeight(String(record.weightKg));
        setFormError("");
        setIsAddRecordVisible(true);
    };

    const handleSaveRecord = () => {
        const trimmedName = pluckerName.trim();
        const weightKg = Number(weight);

        if (!trimmedName || !Number.isFinite(weightKg) || weightKg <= 0) {
            setFormError("Enter the plucker's name and a weight greater than zero.");
            return;
        }

        setCollectionRecords((records) =>
            records.map((record) =>
                record.id === editingRecordId
                    ? { ...record, pluckerName: trimmedName, weightKg }
                    : record
            )
        );
        closeAddRecord();
    };

    const handleDeleteRecord = () => {
        setCollectionRecords((records) =>
            records.filter((record) => record.id !== editingRecordId)
        );
        closeAddRecord();
    };

    return(
        <Screen>
            <View style={styles.content}>
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
                    <Stat stat="Weight" value={`${totalWeight} kg`}/>
                    <Stat stat="Pluckers" value={String(collectionRecords.length)}/>
                </View>
                <AppCard>
                    <AppText variant="sectionHeading" style={styles.recordsTitle}>
                        Collection records
                    </AppText>
                    {collectionRecords.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons
                                name="leaf-outline"
                                size={24}
                                color={colors.text.tertiary}
                            />
                            <AppText variant="bodySmall" style={styles.emptyTitle}>
                                No collection records yet
                            </AppText>
                            <AppText variant="caption" style={styles.emptyDescription}>
                                Plucker weights will appear here once records are added.
                            </AppText>
                        </View>
                    ) : (
                        collectionRecords.map((record, index) => (
                            <Pressable
                                key={record.id}
                                accessibilityRole="button"
                                accessibilityLabel={`Edit ${record.pluckerName}, ${record.weightKg} kilograms`}
                                onPress={() => openEditRecord(record)}
                                style={[
                                    styles.recordRow,
                                    index < collectionRecords.length - 1 && styles.recordDivider,
                                ]}
                            >
                                <Avatar
                                    image={record.image}
                                    name={record.pluckerName}
                                    size={36}
                                />
                                <AppText variant="bodySmall" style={styles.pluckerName}>
                                    {record.pluckerName}
                                </AppText>
                                <AppText variant="bodySmall" style={styles.recordWeight}>
                                    {record.weightKg} kg
                                </AppText>
                            </Pressable>
                        ))
                    )}
                </AppCard>
                </View>
                <View style={styles.actions}>
                    <AppButton
                        title="+ Add record"
                        variant="secondary"
                        width="half"
                        onPress={openAddRecord}
                    />
                    <AppButton
                        title="Request pickup"
                        variant="primary"
                        width="half"
                        onPress={() => {}}
                    />
                </View>
            </View>
            <Modal
                visible={isAddRecordVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={closeAddRecord}
            >
                <View style={styles.modalRoot}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Close add record form"
                        style={styles.modalTint}
                        onPress={closeAddRecord}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.keyboardAvoidingView}
                    >
                        <ScrollView
                            contentContainerStyle={styles.dialogScrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.dialog}>
                                <AppText variant="body" style={styles.sheetTitle}>
                                    {editingRecordId ? "Edit record" : "New record"}
                                </AppText>
                                <View style={styles.formField}>
                                    <AppText variant="bodySmall" style={styles.formLabel}>
                                        Plucker:
                                    </AppText>
                                    <TextInput
                                        accessibilityLabel="Plucker name"
                                        value={pluckerName}
                                        onChangeText={setPluckerName}
                                        placeholder="Enter plucker name"
                                        placeholderTextColor={colors.text.placeholder}
                                        returnKeyType="next"
                                        style={styles.formInput}
                                    />
                                </View>
                                <View style={styles.formField}>
                                    <AppText variant="bodySmall" style={styles.formLabel}>
                                        Weight:
                                    </AppText>
                                    <TextInput
                                        accessibilityLabel="Weight in kilograms"
                                        value={weight}
                                        onChangeText={setWeight}
                                        placeholder="0.0"
                                        placeholderTextColor={colors.text.placeholder}
                                        keyboardType="decimal-pad"
                                        returnKeyType="done"
                                        style={styles.formInput}
                                    />
                                </View>
                                {formError ? (
                                    <AppText
                                        accessibilityRole="alert"
                                        variant="caption"
                                        style={styles.formError}
                                    >
                                        {formError}
                                    </AppText>
                                ) : null}
                                <View style={styles.sheetActions}>
                                    {editingRecordId ? (
                                        <>
                                            <AppButton
                                                title="Save"
                                                variant="primary"
                                                width="half"
                                                onPress={handleSaveRecord}
                                            />
                                            <AppButton
                                                title="Delete"
                                                variant="secondary"
                                                width="half"
                                                onPress={handleDeleteRecord}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <AppButton
                                                title="+ Add"
                                                variant="primary"
                                                width="half"
                                                onPress={handleAddRecord}
                                            />
                                            <AppButton
                                                title="Cancel"
                                                variant="secondary"
                                                width="half"
                                                onPress={closeAddRecord}
                                            />
                                        </>
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingTop: 20,
    },
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
        marginBottom: 20,
    },
    recordsTitle: {
        marginBottom: spacing.sm,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        backgroundColor: colors.surface,
    },
    emptyTitle: {
        color: colors.text.primary,
        fontWeight: "600",
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    emptyDescription: {
        color: colors.text.secondary,
        textAlign: "center",
    },
    recordRow: {
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
    recordDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border.light,
    },
    pluckerName: {
        flex: 1,
        color: colors.text.primary,
    },
    recordWeight: {
        color: colors.text.primary,
    },
    actions: {
        flexDirection: "row",
        gap: spacing.md,
        marginTop: "auto",
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
    },
    modalRoot: {
        flex: 1,
    },
    modalTint: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0, 0, 0, 0.38)",
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    dialogScrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
    },
    dialog: {
        minHeight: 285,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        borderRadius: 20,
        backgroundColor: colors.white,
        elevation: 8,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
    },
    sheetTitle: {
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    formField: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    formLabel: {
        width: 60,
        color: colors.text.primary,
    },
    formInput: {
        flex: 1,
        height: 48,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.default,
        borderRadius: 16,
        backgroundColor: colors.surface,
        color: colors.text.primary,
        fontSize: 16,
    },
    formError: {
        color: colors.error,
        marginTop: -spacing.sm,
    },
    sheetActions: {
        flexDirection: "row",
        gap: spacing.md,
        marginTop: "auto",
        paddingTop: spacing.lg,
    },
});