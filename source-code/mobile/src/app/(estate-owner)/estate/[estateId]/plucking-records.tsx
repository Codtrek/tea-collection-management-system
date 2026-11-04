import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { format } from "date-fns";

import { EstateIcon, EstatePage, estateStyles as ui } from "@/components/estate-owner/EstatePage";
import PluckingWeightDialog from "@/components/estate-owner/PluckingWeightDialog";
import { AppText, Avatar } from "@/components/ui";
import { useEstateStore } from "@/store/estateStore";

export default function PluckingRecords() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const estate = useEstateStore((state) => state.estates.find((item) => item.id === estateId));
  const records = useEstateStore((state) => state.pluckingByEstate[estateId]);
  const updateWeight = useEstateStore((state) => state.updatePluckingWeight);
  const [editingId, setEditingId] = useState<number>();
  const editing = records?.find((record) => record.id === editingId);
  const total = records?.reduce((sum, record) => sum + record.weightKg, 0) ?? 0;

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
          <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={`Edit ${record.workerName}'s weight, ${record.weightKg} kilograms`}
            onPress={() => setEditingId(record.id)} style={({ pressed }) => [ui.row, ui.card, pressed && styles.pressed]}>
            <Avatar name={record.workerName} size={40} />
            <View style={ui.grow}>
              <AppText variant="bodySmall" style={ui.bold}>{record.workerName}</AppText>
              <AppText variant="caption" style={ui.muted}>{format(record.recordedAt, "d MMM yyyy, h:mm a")}</AppText>
            </View>
            <AppText variant="bodySmall" style={ui.bold}>{record.weightKg.toLocaleString()} kg</AppText>
            <EstateIcon name="pencil-outline" size={17} />
          </Pressable>
        )) : (
          <View style={ui.card}>
            <AppText variant="bodySmall" style={ui.muted}>No plucking records have been added yet.</AppText>
          </View>
        )}
        {editing && <PluckingWeightDialog key={editing.id} workerName={editing.workerName} initialWeight={editing.weightKg}
          onClose={() => setEditingId(undefined)} onConfirm={(weight) => {
            updateWeight(estateId, editing.id, weight);
            setEditingId(undefined);
          }} />}
      </> : <AppText>Estate not found.</AppText>}
    </EstatePage>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: "#e8fae4", borderRadius: 10, padding: 16 },
  pressed: { backgroundColor: "#eef9ec" },
});
