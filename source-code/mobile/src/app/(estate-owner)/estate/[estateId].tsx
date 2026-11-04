import { useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { isToday } from "date-fns";

import { EstateIcon, EstatePage, estateGreen, estateStyles as ui } from "@/components/estate-owner/EstatePage";
import { RequestListItem } from "@/components/estate-owner";
import { AppButton, AppInput, AppText, Avatar } from "@/components/ui";
import { getAttendanceSavedAt, useSavedEstateWorkers } from "@/data/estateWorkers";
import { useEstateStore } from "@/store/estateStore";

const formatTime = (time: number) => new Date(time).toLocaleTimeString("en-LK", { hour: "numeric", minute: "2-digit" });

export default function EstateDetails() {
  const { estateId, collectionFactory, collectionWeightKg, collectionRequestedAt } = useLocalSearchParams<{
    estateId: string;
    collectionFactory?: string;
    collectionWeightKg?: string;
    collectionRequestedAt?: string;
  }>();
  const estate = useEstateStore((state) => state.estates.find((profile) => profile.id === estateId));
  const records = useEstateStore((state) => state.pluckingByEstate[estateId]);
  const updateEstate = useEstateStore((state) => state.updateEstate);
  const workers = useSavedEstateWorkers(estate?.id);
  const [form, setForm] = useState<"edit" | "factory" | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  if (!estate) {
    return <EstatePage title="Estate details"><AppText>Estate not found.</AppText></EstatePage>;
  }

  const presentCount = workers?.filter((worker) => worker.present).length ?? 0;
  const attendanceTime = getAttendanceSavedAt(estate.id);
  const latestRecord = records?.[0];
  const todayRecords = records?.filter((record) => isToday(record.recordedAt)) ?? [];
  const awaiting = records?.reduce((total, record) => total + record.weightKg, 0) ?? 0;
  const requestedAt = collectionRequestedAt ? new Date(collectionRequestedAt) : undefined;
  const requestWeight = Number(collectionWeightKg);
  const pending = collectionFactory && requestedAt && Number.isFinite(requestedAt.getTime()) && Number.isFinite(requestWeight) && requestWeight > 0
    ? { id: requestedAt.toISOString(), estateName: estate.name, factory: collectionFactory, estimatedWeightKg: requestWeight, requestedAt: requestedAt.toLocaleDateString("en-GB"), status: "pending" as const }
    : undefined;
  const activities = todayRecords.map((record) => ({
    title: "Plucking recorded",
    detail: `${record.weightKg.toLocaleString()} kg · ${record.workerName}`,
    time: record.recordedAt,
    icon: "leaf-outline" as const,
  }));
  const todayActivities = [
    ...activities,
    ...(attendanceTime && isToday(attendanceTime) ? [{
      title: "Worker attendance updated",
      detail: `${presentCount} workers marked present`,
      time: attendanceTime,
      icon: "people-outline" as const,
    }] : []),
  ].sort((a, b) => b.time - a.time);

  function openForm(next: "edit" | "factory") {
    if (!estate) return;
    setName(next === "edit" ? estate.name : "");
    setLocation(next === "edit" ? estate.location : "");
    setAmount(next === "edit" ? String(estate.areaAcres) : "");
    setError("");
    setForm(next);
  }

  function saveForm() {
    if (!estate || !form) return;
    const trimmedName = name.trim();
    const address = location.trim();
    if (!trimmedName || !address) {
      setError("Enter a name and address.");
      return;
    }
    if (form === "factory") {
      if (estate.factories.some((factory) => factory.name.toLowerCase() === trimmedName.toLowerCase())) {
        setError("This factory is already assigned.");
        return;
      }
      updateEstate(estate.id, { factories: [...estate.factories, { name: trimmedName, address }] });
    } else {
      const value = Number(amount.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) {
        setError("Enter an area greater than zero.");
        return;
      }
      updateEstate(estate.id, { name: trimmedName, location: address, areaAcres: value });
    }
    setForm(null);
  }

  return (
    <EstatePage title="Estate details" onEdit={() => openForm("edit")}>
      <View style={styles.identity}>
        <Image
          source={estate.imageSrc || require("@/assets/images/estate1.jpg")}
          placeholder={require("@/assets/images/estate1.jpg")}
          contentFit="cover"
          placeholderContentFit="cover"
          style={styles.hero}
        />
        <AppText variant="heading" style={ui.bold}>{estate.name}</AppText>
        <View style={ui.row}>
          <EstateIcon name="location-outline" size={16} />
          <AppText variant="bodySmall" style={[ui.muted, ui.grow]}>{estate.location}</AppText>
        </View>
        <View style={ui.row}>
          <EstateIcon name="scan-outline" size={16} />
          <AppText variant="bodySmall">{estate.areaAcres} acres</AppText>
          <View style={styles.divider} />
          <EstateIcon name="leaf-outline" size={17} />
          <AppText variant="bodySmall">{estate.grade === "Not graded" ? estate.grade : `${estate.grade} grade`}</AppText>
        </View>
      </View>

      <View style={styles.identity}>
        <AppText variant="bodySmall" style={ui.muted}>Assigned factories</AppText>
        <View style={styles.factories}>
          {estate.factories.map((factory) => (
            <AppText key={factory.name} variant="caption" style={styles.chip}>{factory.name}</AppText>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="Assign factory" hitSlop={7} style={styles.addFactory} onPress={() => openForm("factory")}>
            <EstateIcon name="add" size={19} />
          </Pressable>
        </View>
      </View>

      <View style={ui.section}>
        <AppText variant="subHeading" style={ui.bold}>Estate information</AppText>
        <View style={[ui.card, ui.row]}>
          <Avatar name={estate.managerName} size={42} />
          <View style={ui.grow}>
            <AppText variant="caption" style={ui.muted}>Estate manager</AppText>
            <AppText variant="bodySmall" style={ui.bold}>{estate.managerName}</AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Call ${estate.managerName}`} style={styles.call}
            onPress={() => Linking.openURL(`tel:${estate.managerPhone}`).catch(() => Alert.alert("Unable to call", "Calling is unavailable on this device."))}>
            <EstateIcon name="call-outline" size={18} />
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" style={[ui.card, ui.row]} onPress={() => router.push({
          pathname: "/(estate-owner)/workers/[estateId]", params: { estateId: estate.id },
        })}>
          <EstateIcon name="people-outline" size={26} />
          <View style={ui.grow}>
            <AppText variant="bodySmall" style={ui.bold}>Estate workers</AppText>
            <AppText variant="caption" style={ui.muted}>{workers?.length ?? 0} workers · {attendanceTime && isToday(attendanceTime) ? presentCount : 0} active today</AppText>
          </View>
          <Ionicons name="chevron-forward" size={17} color="#46566b" />
        </Pressable>
      </View>

      <View style={ui.section}>
        <AppText variant="subHeading" style={ui.bold}>Tea plucking</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={`View plucking records, ${awaiting.toLocaleString()} kilograms awaiting collection`}
          style={({ pressed }) => [ui.row, styles.awaiting, pressed && styles.pressed]} onPress={() => router.push({
            pathname: "/(estate-owner)/estate/[estateId]/plucking-records", params: { estateId: estate.id },
          })}>
          <View style={ui.grow}>
            <AppText variant="bodySmall" style={ui.muted}>Awaiting collection</AppText>
            <AppText variant="heading" style={ui.bold}>{awaiting.toLocaleString()} kg</AppText>
            <AppText variant="caption" style={ui.muted}>Plucked tea leaves not yet collected</AppText>
            <AppText variant="caption" style={styles.recordsLink}>View plucking records</AppText>
          </View>
          <EstateIcon name="leaf-outline" size={36} />
          <EstateIcon name="chevron-forward" size={17} />
        </Pressable>
        <Pressable accessibilityRole="button" style={ui.action} onPress={() => router.push({
          pathname: "/(estate-owner)/estate/[estateId]/add-plucking-record", params: { estateId: estate.id },
        })}>
          <Ionicons name="add" size={20} color="#fff" />
          <AppText variant="bodySmall" style={ui.white}>Add plucking record</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" style={[ui.action, ui.outline]} onPress={() => router.push({
          pathname: "/(shared)/collectionRequest", params: { estateId: estate.id },
        })}>
          <EstateIcon name="car-outline" size={19} />
          <AppText variant="bodySmall">Request collection</AppText>
        </Pressable>
        <View style={ui.row}>
          <EstateIcon name="time-outline" size={15} />
          <AppText variant="caption" style={ui.muted}>
            {latestRecord ? `Last recorded ${isToday(latestRecord.recordedAt) ? "today" : new Date(latestRecord.recordedAt).toLocaleDateString("en-GB")} at ${formatTime(latestRecord.recordedAt)}` : "No plucking records added yet"}
          </AppText>
        </View>
      </View>

      {pending && <RequestListItem request={pending} title={pending.factory} showFactory={false} highlight />}

      <Pressable accessibilityRole="button" style={[ui.card, ui.row]} onPress={() => router.push({
        pathname: "/(estate-owner)/estate/[estateId]/performance", params: { estateId: estate.id },
      })}>
        <EstateIcon name="stats-chart-outline" size={25} />
        <View style={ui.grow}>
          <AppText variant="bodySmall" style={ui.bold}>Estate performance</AppText>
          <AppText variant="caption" style={ui.muted}>Plucking, revenue and worker insights</AppText>
        </View>
        <Ionicons name="chevron-forward" size={17} color="#46566b" />
      </Pressable>

      <View style={ui.section}>
        <AppText variant="subHeading" style={ui.bold}>Today’s activities</AppText>
        {todayActivities.length === 0 && <AppText variant="bodySmall" style={ui.muted}>No activities recorded today.</AppText>}
        {todayActivities.map((activity, index) => (
          <View style={[ui.row, styles.activity]} key={`${activity.time}-${index}`}>
            <View style={styles.activityIcon}><EstateIcon name={activity.icon} size={19} /></View>
            <View style={ui.grow}>
              <AppText variant="bodySmall" style={ui.bold}>{activity.title}</AppText>
              <AppText variant="caption" style={ui.muted}>{activity.detail}</AppText>
            </View>
            <AppText variant="caption" style={ui.muted}>{formatTime(activity.time)}</AppText>
          </View>
        ))}
      </View>

      <Modal visible={form !== null} transparent animationType="fade" onRequestClose={() => setForm(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            <View style={[ui.card, styles.form]}>
              <AppText variant="subHeading" style={ui.bold}>{form === "edit" ? "Edit estate" : "Assign factory"}</AppText>
              <AppInput label={form === "edit" ? "Estate name" : "Factory name"} value={name} onChangeText={setName} />
              <AppInput label="Address" value={location} onChangeText={setLocation} />
              {form === "edit" && <AppInput label="Area (acres)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />}
              {!!error && <AppText accessibilityRole="alert" variant="bodySmall" style={styles.error}>{error}</AppText>}
              <AppButton title="Save" onPress={saveForm} />
              <AppButton title="Cancel" onPress={() => setForm(null)} variant="secondary" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </EstatePage>
  );
}

const styles = StyleSheet.create({
  identity: { gap: 5 },
  hero: { width: "100%", height: 128, borderRadius: 8, backgroundColor: "#e5f6e2" },
  divider: { width: 1, height: 16, backgroundColor: "#e0e6e9", marginHorizontal: 6 },
  factories: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: "#eefbea", borderWidth: 1, borderColor: "#bbebbb", color: "#10241c" },
  addFactory: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: estateGreen, alignItems: "center", justifyContent: "center" },
  call: { backgroundColor: "#eefbea", width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  awaiting: { backgroundColor: "#e8fae4", borderRadius: 9, padding: 13 },
  pressed: { opacity: 0.75 },
  recordsLink: { color: estateGreen, fontWeight: "700", marginTop: 6 },
  activity: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#e0e6e9" },
  activityIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e8fae4", alignItems: "center", justifyContent: "center" },
  modal: { flex: 1, backgroundColor: "#0007" },
  modalContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  form: { gap: 12, padding: 18, width: "100%", maxWidth: 420, alignSelf: "center" },
  error: { color: "#ad2020" },
});
