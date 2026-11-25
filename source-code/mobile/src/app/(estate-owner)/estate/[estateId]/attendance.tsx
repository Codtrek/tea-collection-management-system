import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { isToday } from "date-fns";

import { EstateIcon, EstatePage, estateStyles as ui } from "@/components/estate-owner/EstatePage";
import { FormCheckbox } from "@/components/forms";
import { AppText, Avatar } from "@/components/ui";
import { getAttendanceSavedAt, getEstateWorkers, saveEstateWorkers, useSavedEstateWorkers } from "@/data/estateWorkers";
import { useEstateStore } from "@/store/estateStore";

export default function EstateAttendance() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const estate = useEstateStore((state) => state.estates.find((item) => item.id === estateId));
  const workers = useSavedEstateWorkers(estateId);
  const savedAt = getAttendanceSavedAt(estateId);
  const savedToday = savedAt !== undefined && isToday(savedAt);
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const presentCount = workers?.filter((worker) => changes[worker.id] ?? (savedToday && worker.present)).length ?? 0;

  function saveAttendance() {
    const currentWorkers = getEstateWorkers(estateId);
    const lastSavedAt = getAttendanceSavedAt(estateId);
    const hasAttendanceToday = lastSavedAt !== undefined && isToday(lastSavedAt);
    saveEstateWorkers(estateId, currentWorkers.map((worker) => ({
      ...worker,
      present: changes[worker.id] ?? (hasAttendanceToday && worker.present),
    })));
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: "/(estate-owner)/estate/[estateId]", params: { estateId } });
    }
  }

  return (
    <EstatePage title="Worker attendance">
      {estate ? <>
        {/* <AppText variant="bodySmall" style={ui.bold}>{estate.name}</AppText> */}
        <View style={[ui.card, ui.row]}>
          <EstateIcon name="calendar-outline" />
          <AppText variant="bodySmall" style={ui.bold}>{presentCount} of {workers?.length ?? 0} marked present today</AppText>
        </View>
        {workers?.length ? <>
          {workers.map((worker) => (
            <View key={worker.id} style={[ui.card, ui.row]}>
              <Avatar name={worker.name} size={42} />
              <View style={ui.grow}>
                <AppText variant="bodySmall" style={ui.bold}>{worker.name}</AppText>
                <AppText variant="caption" style={ui.muted}>{worker.role}</AppText>
              </View>
              <FormCheckbox
                label="Present"
                checked={changes[worker.id] ?? (savedToday && worker.present)}
                onValueChange={(present) => setChanges((current) => ({ ...current, [worker.id]: present }))}
              />
            </View>
          ))}
          <Pressable accessibilityRole="button" style={ui.action} onPress={saveAttendance}>
            <AppText variant="bodySmall" style={ui.white}>Save attendance</AppText>
          </Pressable>
        </> : <>
          <AppText variant="bodySmall" style={ui.muted}>Add workers to the estate before marking attendance.</AppText>
          <Pressable accessibilityRole="button" style={[ui.action, ui.outline]} onPress={() => router.push({
            pathname: "/(estate-owner)/workers/[estateId]", params: { estateId },
          })}>
            <AppText variant="bodySmall" style={ui.bold}>Open worker directory</AppText>
          </Pressable>
        </>}
      </> : <AppText>Estate not found.</AppText>}
    </EstatePage>
  );
}
