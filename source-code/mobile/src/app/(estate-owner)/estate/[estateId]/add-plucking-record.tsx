import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { isToday } from "date-fns";

import { EstateIcon, EstatePage, estateStyles as ui } from "@/components/estate-owner/EstatePage";
import PluckingWeightDialog from "@/components/estate-owner/PluckingWeightDialog";
import { AppInput, AppText, Avatar } from "@/components/ui";
import { colors } from "@/theme";
import { getAttendanceSavedAt, getSavedEstateWorkers, useSavedEstateWorkers } from "@/data/estateWorkers";
import { useEstateStore } from "@/store/estateStore";

export default function SelectPluckingWorker() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const estate = useEstateStore((state) => state.estates.find((item) => item.id === estateId));
  const addRecord = useEstateStore((state) => state.addPluckingRecord);
  const workers = useSavedEstateWorkers(estateId);
  const [query, setQuery] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>();
  const attendanceTime = getAttendanceSavedAt(estateId);
  const attendanceSavedToday = attendanceTime !== undefined && isToday(attendanceTime);
  const present = attendanceSavedToday ? (workers ?? []).filter((worker) => worker.present) : [];
  const search = query.trim().toLowerCase();
  const matches = present.filter((worker) => worker.name.toLowerCase().includes(search));
  const selected = present.find((worker) => worker.id === selectedWorkerId);

  return (
    <EstatePage title="Add plucking record">
      {estate ? <>
        <View style={styles.intro}>
          <AppText variant="heading" style={ui.bold}>Select a worker</AppText>
          <AppText variant="bodySmall" style={ui.muted}>{estate.name}</AppText>
        </View>
        {present.length ? <>
          <AppInput accessibilityLabel="Search workers" placeholder="Search by name" leftIcon="magnify"
            value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
          <AppText variant="caption" style={ui.muted}>{present.length} marked present today</AppText>
          {matches.length ? matches.map((worker) => (
            <Pressable key={worker.id} accessibilityRole="button" style={({ pressed }) => [ui.card, ui.row, pressed && styles.pressed]}
              onPress={() => {
                Keyboard.dismiss();
                setSelectedWorkerId(worker.id);
              }}>
              <Avatar name={worker.name} size={42} />
              <View style={ui.grow}>
                <AppText variant="bodySmall" style={ui.bold}>{worker.name}</AppText>
                <AppText variant="caption" style={ui.muted}>{worker.role || "Estate worker"}</AppText>
              </View>
              <EstateIcon name="chevron-forward" size={18} />
            </Pressable>
          )) : (
            <AppText variant="bodySmall" style={ui.muted}>No present workers match your search.</AppText>
          )}
        </> : (
          <View style={[ui.card, styles.empty]}>
            <EstateIcon name="people-outline" size={28} />
            <AppText variant="subHeading" style={ui.bold}>{attendanceSavedToday ? "No workers marked present" : "Attendance required"}</AppText>
            <AppText variant="bodySmall" style={ui.muted}>Mark and save today’s attendance before adding a plucking record.</AppText>
            <Pressable accessibilityRole="button" style={ui.action} onPress={() => router.push({
              pathname: "/(estate-owner)/workers/[estateId]", params: { estateId },
            })}>
              <AppText variant="bodySmall" style={ui.white}>{attendanceSavedToday ? "Update attendance" : "Mark attendance"}</AppText>
            </Pressable>
          </View>
        )}
        {selected && <PluckingWeightDialog key={selected.id} workerName={selected.name} onClose={() => setSelectedWorkerId(undefined)}
          onConfirm={(weightKg) => {
            const savedAt = getAttendanceSavedAt(estateId);
            const worker = getSavedEstateWorkers(estateId)?.find((item) => item.id === selected.id && item.present);
            if (savedAt === undefined || !isToday(savedAt) || !worker) {
              setSelectedWorkerId(undefined);
              return;
            }

            addRecord(estateId, { workerId: worker.id, workerName: worker.name, weightKg, recordedAt: Date.now() });
            setSelectedWorkerId(undefined);
            router.dismissTo({ pathname: "/(estate-owner)/estate/[estateId]", params: { estateId } });
          }} />}
      </> : <AppText>Estate not found.</AppText>}
    </EstatePage>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 3, marginTop: 4 },
  empty: { gap: 10, padding: 16 },
  pressed: { backgroundColor: colors.brandSurface },
});
