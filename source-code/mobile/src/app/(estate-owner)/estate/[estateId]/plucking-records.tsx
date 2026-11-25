import { useState } from "react";
import { Keyboard, Modal, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { format } from "date-fns";

import { EstateIcon, EstatePage, estateStyles as ui } from "@/components/estate-owner/EstatePage";
import { parsePluckingWeight } from "@/components/estate-owner/PluckingWeightDialog";
import { AppInput, AppText, Avatar } from "@/components/ui";
import { colors } from "@/theme";
import { useEstateStore } from "@/store/estateStore";

export default function PluckingRecords() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const estate = useEstateStore((state) => state.estates.find((item) => item.id === estateId));
  const records = useEstateStore((state) => state.pluckingByEstate[estateId]);
  const updateWeight = useEstateStore((state) => state.updatePluckingWeight);
  const [editingId, setEditingId] = useState<number>();
  const [draftWeight, setDraftWeight] = useState("");
  const [error, setError] = useState("");
  const [pendingWeight, setPendingWeight] = useState<number | null>(null);
  const editing = records?.find((record) => record.id === editingId);
  const total = records?.reduce((sum, record) => sum + record.weightKg, 0) ?? 0;

  function reviewChange() {
    const weight = parsePluckingWeight(draftWeight);
    if (weight === null) {
      setError("Enter a weight greater than zero.");
      return;
    }
    Keyboard.dismiss();
    setPendingWeight(weight);
  }

  return (
    <EstatePage title="Plucking records">
      {estate ? <>
        <View style={[ui.row, styles.summary]}>
          <View style={ui.grow}>
            <AppText variant="bodySmall" style={ui.muted}>{estate.name}</AppText>
            <AppText variant="heading" style={ui.bold}>{total.toLocaleString()} kg</AppText>
            <AppText variant="caption" style={ui.muted}>{records?.length ?? 0} {(records?.length ?? 0) === 1 ? "record" : "records"}</AppText>
          </View>
          <EstateIcon name="leaf-outline" size={34} />
        </View>

        {records?.length ? records.map((record) => (
          <View key={record.id} style={[ui.card, editingId === record.id && styles.expanded]}>
            <View style={ui.row}>
              <Avatar name={record.workerName} size={40} />
              <View style={ui.grow}>
                <AppText variant="bodySmall" style={ui.bold}>{record.workerName}</AppText>
                <AppText variant="caption" style={ui.muted}>{format(record.recordedAt, "d MMM yyyy, h:mm a")}</AppText>
              </View>
              <AppText variant="bodySmall" style={ui.bold}>{record.weightKg.toLocaleString()} kg</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${record.workerName}'s weight`}
                accessibilityState={{ expanded: editingId === record.id }} style={styles.editButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setEditingId(editingId === record.id ? undefined : record.id);
                  setDraftWeight(String(record.weightKg));
                  setError("");
                }}>
                <EstateIcon name={editingId === record.id ? "chevron-up-outline" : "pencil-outline"} size={18} />
              </Pressable>
            </View>
            {editingId === record.id && (
              <View style={styles.editor}>
                <AppInput label="Weight (kg)" accessibilityLabel="Weight in kilograms" keyboardType="decimal-pad"
                  value={draftWeight} error={error || undefined} onChangeText={(value) => {
                    setDraftWeight(value);
                    setError("");
                  }} />
                <View style={ui.row}>
                  <Pressable accessibilityRole="button" style={[ui.action, ui.outline, ui.grow]} onPress={() => {
                    Keyboard.dismiss();
                    setEditingId(undefined);
                  }}>
                    <AppText variant="bodySmall" style={ui.bold}>Cancel</AppText>
                  </Pressable>
                  <Pressable accessibilityRole="button" style={[ui.action, ui.grow]} onPress={reviewChange}>
                    <AppText variant="bodySmall" style={ui.white}>Save</AppText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )) : (
          <View style={ui.card}>
            <AppText variant="bodySmall" style={ui.muted}>No plucking records have been added yet.</AppText>
          </View>
        )}
        {editing && pendingWeight !== null && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setPendingWeight(null)}>
            <View style={styles.backdrop}>
              <View accessibilityViewIsModal style={[ui.card, styles.confirmation]}>
                <AppText variant="subHeading" style={ui.bold}>Are you sure you want to change this weight?</AppText>
                <AppText variant="bodySmall" style={ui.muted}>
                  {editing.workerName} · {editing.weightKg.toLocaleString()} kg to {pendingWeight.toLocaleString()} kg
                </AppText>
                <View style={ui.row}>
                  <Pressable accessibilityRole="button" style={[ui.action, ui.outline, ui.grow]} onPress={() => setPendingWeight(null)}>
                    <AppText variant="bodySmall" style={ui.bold}>Cancel</AppText>
                  </Pressable>
                  <Pressable accessibilityRole="button" style={[ui.action, ui.grow]} onPress={() => {
                    updateWeight(estateId, editing.id, pendingWeight);
                    setPendingWeight(null);
                    setEditingId(undefined);
                  }}>
                    <AppText variant="bodySmall" style={ui.white}>OK</AppText>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </> : <AppText>Estate not found.</AppText>}
    </EstatePage>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.brandSurface, borderRadius: 10, padding: 16 },
  expanded: { borderColor: colors.brandBorder },
  editButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.brandSurface, alignItems: "center", justifyContent: "center" },
  editor: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border.light, paddingTop: 12, gap: 12 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: 20 },
  confirmation: { width: "100%", maxWidth: 420, padding: 20, gap: 14 },
});
