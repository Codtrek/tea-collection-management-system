
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AppText from "@/components/ui/AppText";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type Fertilizer = {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  packageSize: string;
  stock: string;
  badge: string;
  badgeColor: string;
  badgeBackground: string;
  defaultQuantity: number;
  selected: boolean;
};

const initialFertilizers: Fertilizer[] = [
  {
    id: "urea",
    name: "Urea (Nitrogen 46%)",
    subtitle: "Rapid vegetative foliage flush & canopy development",
    category: "Flush Booster",
    packageSize: "50 kg Bag",
    stock: "420 Bags in Depot",
    badge: "46%",
    badgeColor: "#178451",
    badgeBackground: "#DDF5E8",
    defaultQuantity: 15,
    selected: true,
  },
  {
    id: "mop",
    name: "MOP (Potassium 60%)",
    subtitle: "Stem strengthening & seasonal drought resistance",
    category: "Stem Vigour",
    packageSize: "50 kg Bag",
    stock: "210 Bags in Depot",
    badge: "60%",
    badgeColor: "#3673B8",
    badgeBackground: "#E2EEFF",
    defaultQuantity: 10,
    selected: true,
  },
  {
    id: "zinc",
    name: "Zinc Sulphate",
    subtitle: "Foliar spray for tea leaf and bud formation",
    category: "Micronutrient",
    packageSize: "25 kg Pack",
    stock: "64 Units in Depot",
    badge: "Zn",
    badgeColor: "#737373",
    badgeBackground: "#EEEEEE",
    defaultQuantity: 0,
    selected: false,
  },
  {
    id: "rock",
    name: "Rock Phosphate (ERP)",
    subtitle: "Slow release root enrichment for young plants",
    category: "Root Mass",
    packageSize: "50 kg Bag",
    stock: "180 Bags in Depot",
    badge: "ERP",
    badgeColor: "#737373",
    badgeBackground: "#EEEEEE",
    defaultQuantity: 0,
    selected: false,
  },
];

const urgencyOptions = ["Normal", "Urgent", "Flush Round"] as const;
type Urgency = (typeof urgencyOptions)[number];

export default function FertilizerRequestForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fertilizers, setFertilizers] =
    useState<Fertilizer[]>(initialFertilizers);
  const [urgency, setUrgency] = useState<Urgency>("Normal");
  const [destination, setDestination] = useState(
    "North Ridge Slope - Block B (14.2 ha.)"
  );
  const [requiredDate, setRequiredDate] = useState("2026-10-28");
  const [notes, setNotes] = useState("");

  const selectedCount = fertilizers.filter(
    (fertilizer) => fertilizer.selected
  ).length;

  const selectedQuantity = fertilizers
    .filter((fertilizer) => fertilizer.selected)
    .reduce((total, fertilizer) => total + fertilizer.defaultQuantity, 0);

  const closeForm = () => {
    router.back();
  };

  const toggleFertilizer = (id: string) => {
    setFertilizers((current) =>
      current.map((fertilizer) =>
        fertilizer.id === id
          ? {
              ...fertilizer,
              selected: !fertilizer.selected,
              defaultQuantity: !fertilizer.selected
                ? Math.max(1, fertilizer.defaultQuantity)
                : 0,
            }
          : fertilizer
      )
    );
  };

  const changeQuantity = (id: string, amount: number) => {
    setFertilizers((current) =>
      current.map((fertilizer) => {
        if (fertilizer.id !== id) return fertilizer;

        const nextQuantity = Math.max(
          0,
          fertilizer.defaultQuantity + amount
        );

        return {
          ...fertilizer,
          defaultQuantity: nextQuantity,
          selected: nextQuantity > 0,
        };
      })
    );
  };

  const allocateBatch = (amount: number) => {
    setFertilizers((current) => {
      const selected = current.filter((item) => item.selected);

      if (selected.length === 0) {
        Alert.alert(
          "Select a fertilizer",
          "Select at least one fertilizer before allocating a batch."
        );
        return current;
      }

      const perItem = Math.floor(amount / selected.length);
      const remainder = amount % selected.length;
      let selectedIndex = 0;

      return current.map((item) => {
        if (!item.selected) return item;

        const quantity = perItem + (selectedIndex < remainder ? 1 : 0);
        selectedIndex += 1;

        return {
          ...item,
          defaultQuantity: quantity,
          selected: quantity > 0,
        };
      });
    });
  };

  const submitRequest = () => {
    if (selectedCount === 0) {
      Alert.alert(
        "No fertilizer selected",
        "Please select at least one fertilizer."
      );
      return;
    }

    if (!requiredDate.trim()) {
      Alert.alert("Required date", "Please enter the required date.");
      return;
    }

    // Connect this action to your backend/API when it is available.
    Alert.alert(
      "Request submitted",
      "Your fertilizer request has been prepared successfully.",
      [{ text: "OK", onPress: closeForm }]
    );
  };

  const formatDateHint = "YYYY-MM-DD";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <AppText variant="subheading">Fertilizer Supply Request</AppText>
            <AppText variant="caption" style={styles.headerSubtitle}>
              Select quantities and dispatch details
            </AppText>
          </View>

          <Pressable
            onPress={closeForm}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close fertilizer request form"
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={colors.text.primary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 20 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="label" style={styles.sectionLabel}>
            SELECT FERTILIZERS
          </AppText>

          {fertilizers.map((fertilizer) => (
            <View key={fertilizer.id} style={styles.fertilizerCard}>
              <View style={styles.fertilizerTop}>
                <Pressable
                  style={styles.checkboxArea}
                  onPress={() => toggleFertilizer(fertilizer.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: fertilizer.selected }}
                  accessibilityLabel={`Select ${fertilizer.name}`}
                >
                  <View
                    style={[
                      styles.checkbox,
                      fertilizer.selected && styles.checkboxSelected,
                    ]}
                  >
                    {fertilizer.selected && (
                      <Ionicons
                        name="checkmark"
                        size={15}
                        color={colors.white}
                      />
                    )}
                  </View>
                </Pressable>

                <View style={styles.fertilizerInfo}>
                  <AppText variant="label" style={styles.fertilizerName}>
                    {fertilizer.name}
                  </AppText>
                  <AppText
                    variant="caption"
                    style={styles.fertilizerSubtitle}
                  >
                    {fertilizer.subtitle}
                  </AppText>
                </View>

                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: fertilizer.badgeBackground },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{ color: fertilizer.badgeColor }}
                  >
                    {fertilizer.category}
                  </AppText>
                </View>
              </View>

              <View style={styles.stockInfo}>
                <View style={styles.stockItem}>
                  <Ionicons
                    name="cube-outline"
                    size={12}
                    color={colors.text.secondary}
                  />
                  <AppText variant="caption" style={styles.stockText}>
                    {fertilizer.packageSize}
                  </AppText>
                </View>
                <View style={styles.stockItem}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={12}
                    color={colors.success}
                  />
                  <AppText variant="caption" style={styles.stockText}>
                    {fertilizer.stock}
                  </AppText>
                </View>
              </View>

              <View style={styles.quantityRow}>
                <AppText variant="caption" style={styles.quantityLabel}>
                  Requisition Quantity
                </AppText>

                <View style={styles.quantityControls}>
                  <Pressable
                    onPress={() => changeQuantity(fertilizer.id, -1)}
                    style={styles.quantityButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease ${fertilizer.name} quantity`}
                  >
                    <Ionicons
                      name="remove"
                      size={17}
                      color={colors.text.primary}
                    />
                  </Pressable>

                  <AppText
                    variant="label"
                    style={styles.quantityValue}
                  >
                    {fertilizer.defaultQuantity}
                  </AppText>

                  <AppText variant="caption" style={styles.quantityUnit}>
                    bags
                  </AppText>

                  <Pressable
                    onPress={() => changeQuantity(fertilizer.id, 1)}
                    style={styles.quantityButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Increase ${fertilizer.name} quantity`}
                  >
                    <Ionicons
                      name="add"
                      size={17}
                      color={colors.text.primary}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.quickAllocation}>
            <View style={styles.quickHeader}>
              <AppText variant="label" style={styles.quickTitle}>
                QUICK BATCH ALLOCATION
              </AppText>
              <AppText variant="caption" style={styles.quickSubtitle}>
                Distribute to selected
              </AppText>
            </View>

            <View style={styles.batchButtons}>
              {[5, 10, 25].map((quantity) => (
                <Pressable
                  key={quantity}
                  style={styles.batchButton}
                  onPress={() => allocateBatch(quantity)}
                >
                  <Ionicons
                    name="add"
                    size={13}
                    color={colors.text.primaryGreen}
                  />
                  <AppText variant="caption" style={styles.batchButtonText}>
                    {quantity} Bags
                  </AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="caption" style={styles.batchHint}>
              Selected items: {selectedCount} · Total quantity:{" "}
              {selectedQuantity} bags
            </AppText>
          </View>

          <AppText variant="subheading" style={styles.dispatchTitle}>
            Dispatch &amp; Urgency
          </AppText>

          <AppText variant="label" style={styles.fieldLabel}>
            PRIORITY LEVEL
          </AppText>

          <View style={styles.urgencyContainer}>
            {urgencyOptions.map((option) => (
              <Pressable
                key={option}
                onPress={() => setUrgency(option)}
                style={[
                  styles.urgencyOption,
                  urgency === option && styles.urgencySelected,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: urgency === option }}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.urgencyText,
                    urgency === option && styles.urgencyTextSelected,
                  ]}
                >
                  {option.toUpperCase()}
                </AppText>
              </Pressable>
            ))}
          </View>

          <AppText variant="label" style={styles.fieldLabel}>
            DESTINATION DIVISION BLOCK
          </AppText>

          <Pressable
            style={styles.selectField}
            onPress={() =>
              Alert.alert(
                "Destination block",
                "Choose a destination:",
                [
                  {
                    text: "North Ridge Slope - Block B",
                    onPress: () =>
                      setDestination(
                        "North Ridge Slope - Block B (14.2 ha.)"
                      ),
                  },
                  {
                    text: "South Valley - Block A",
                    onPress: () => setDestination("South Valley - Block A"),
                  },
                  {
                    text: "East Field - Block C",
                    onPress: () => setDestination("East Field - Block C"),
                  },
                  { text: "Cancel", style: "cancel" },
                ]
              )
            }
          >
            <AppText variant="bodySmall" style={styles.selectText}>
              {destination}
            </AppText>
            <Ionicons
              name="chevron-down"
              size={18}
              color={colors.text.secondary}
            />
          </Pressable>

          <AppText variant="label" style={styles.fieldLabel}>
            REQUIRED BY DATE
          </AppText>

          <View style={styles.dateField}>
            <TextInput
              value={requiredDate}
              onChangeText={setRequiredDate}
              placeholder={formatDateHint}
              placeholderTextColor={colors.text.tertiary}
              style={styles.dateInput}
              accessibilityLabel="Required by date"
            />
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.text.secondary}
            />
          </View>

          <AppText variant="label" style={styles.fieldLabel}>
            AGRONOMIST NOTES (OPTIONAL)
          </AppText>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Schedule ahead of monsoon rains. Direct application to inter-row pruning channels."
            placeholderTextColor={colors.text.tertiary}
            multiline
            textAlignVertical="top"
            style={styles.notesInput}
          />
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, spacing.sm) },
          ]}
        >
          <Pressable
            onPress={closeForm}
            style={styles.cancelButton}
            accessibilityRole="button"
          >
            <AppText variant="label" style={styles.cancelText}>
              CANCEL
            </AppText>
          </Pressable>

          <Pressable
            onPress={submitRequest}
            style={styles.submitButton}
            accessibilityRole="button"
          >
            <Ionicons
              name="send"
              size={15}
              color={colors.white}
            />
            <AppText variant="label" style={styles.submitText}>
              Submit
            </AppText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  headerSubtitle: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  fertilizerCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  fertilizerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxArea: {
    paddingTop: 2,
    paddingRight: spacing.sm,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkboxSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  fertilizerInfo: {
    flex: 1,
    paddingRight: 4,
  },
  fertilizerName: {
    color: colors.text.primary,
  },
  fertilizerSubtitle: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  categoryBadge: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginLeft: 3,
  },
  stockInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginLeft: 25,
  },
  stockItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stockText: {
    color: colors.text.secondary,
  },
  quantityRow: {
    backgroundColor: colors.background,
    borderRadius: 7,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quantityLabel: {
    color: colors.text.secondary,
    flex: 1,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quantityButton: {
    width: 29,
    height: 27,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3E9F5",
  },
  quantityValue: {
    color: colors.text.primary,
    minWidth: 18,
    textAlign: "center",
  },
  quantityUnit: {
    color: colors.text.secondary,
  },
  quickAllocation: {
    backgroundColor: "#F0F3FF",
    borderRadius: 9,
    padding: spacing.sm,
    marginTop: 2,
  },
  quickHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
  },
  quickTitle: {
    color: colors.text.primaryGreen,
  },
  quickSubtitle: {
    color: colors.text.secondary,
  },
  batchButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  batchButton: {
    flex: 1,
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 5,
    gap: 2,
  },
  batchButtonText: {
    color: colors.text.primary,
  },
  batchHint: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  dispatchTitle: {
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  urgencyContainer: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 7,
    backgroundColor: "#EAF0FF",
    marginBottom: spacing.sm,
  },
  urgencyOption: {
    flex: 1,
    minHeight: 33,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  urgencySelected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  urgencyText: {
    color: colors.text.secondary,
    textAlign: "center",
  },
  urgencyTextSelected: {
    color: colors.text.primaryGreen,
  },
  selectField: {
    minHeight: 43,
    borderRadius: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  selectText: {
    flex: 1,
    color: colors.text.primary,
  },
  dateField: {
    minHeight: 43,
    borderRadius: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  dateInput: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 0,
    color: colors.text.primary,
    fontSize: 14,
  },
  notesInput: {
    minHeight: 84,
    borderRadius: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF0FF",
  },
  cancelText: {
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 1.5,
    height: 46,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  submitText: {
    color: colors.white,
  },
});
