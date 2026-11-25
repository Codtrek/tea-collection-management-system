import { useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import { EstateIcon, EstatePage, estateStyles as ui } from "@/components/estate-owner/EstatePage";
import { AppInput, AppText, Avatar } from "@/components/ui";
import { addEstateWorker, useSavedEstateWorkers } from "@/data/estateWorkers";
import { useEstateStore } from "@/store/estateStore";
import { colors } from "@/theme";

export default function EstateWorkers() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const estate = useEstateStore((state) => state.estates.find((item) => item.id === estateId));
  const workers = useSavedEstateWorkers(estateId);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const search = query.trim().toLowerCase();
  const phoneSearch = /^[+\d ()-]+$/.test(search) ? search.replace(/\D/g, "") : "";
  const matches = workers?.filter((worker) =>
    worker.name.toLowerCase().includes(search) ||
    (phoneSearch !== "" && worker.contactNumber.replace(/\D/g, "").includes(phoneSearch))
  ) ?? [];

  function openAddWorker() {
    Keyboard.dismiss();
    setName("");
    setContact("");
    setError("");
    setAdding(true);
  }

  function saveWorker() {
    const workerName = name.trim();
    const number = contact.trim();
    if (!workerName || !number) {
      setError("Enter the worker's name and contact number.");
      return;
    }
    if (!/^\+?[\d ()-]+$/.test(number) || !/\d/.test(number)) {
      setError("Enter a valid contact number.");
      return;
    }
    addEstateWorker(estateId, workerName, number);
    setQuery("");
    setAdding(false);
  }

  function callWorker(number: string) {
    const dialNumber = number.replace(/[ ()-]/g, "");
    void Linking.openURL(`tel:${dialNumber}`).catch(() =>
      Alert.alert("Unable to call", "Calling is unavailable on this device.")
    );
  }

  return (
    <EstatePage title="Estate workers">
      {estate ? <>
        {/* <AppText variant="heading" style={ui.bold}>{estate.name}</AppText> */}
        <View style={ui.row}>
          <AppInput accessibilityLabel="Search workers" placeholder="Search by name or number"
            leftIcon="magnify" containerStyle={[ui.grow, styles.searchInput]} value={query} onChangeText={setQuery}
            autoCorrect={false} returnKeyType="search" />
          <Pressable accessibilityRole="button" accessibilityLabel="Add worker" style={styles.addButton} onPress={openAddWorker}>
            <Ionicons name="add" size={25} color={colors.text.inverse} />
          </Pressable>
        </View>
        <AppText variant="caption" style={ui.muted}>{matches.length} {matches.length === 1 ? "worker" : "workers"}</AppText>
        {matches.length ? matches.map((worker) => (
          <View key={worker.id} style={[ui.card, ui.row]}>
            <Avatar name={worker.name} size={42} />
            <View style={ui.grow}>
              <AppText variant="bodySmall" style={ui.bold}>{worker.name}</AppText>
              <AppText variant="caption" style={ui.muted}>{worker.contactNumber}</AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Call ${worker.name}`}
              style={styles.callButton} onPress={() => callWorker(worker.contactNumber)}>
              <EstateIcon name="call-outline" size={20} />
            </Pressable>
          </View>
        )) : (
          <View style={[ui.card, styles.empty]}>
            <EstateIcon name="people-outline" size={26} />
            <AppText variant="bodySmall" style={ui.muted}>{workers?.length ? "No workers match your search." : "No workers added yet."}</AppText>
          </View>
        )}

        {adding && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setAdding(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
                <View accessibilityViewIsModal style={[ui.card, styles.form]}>
                  <AppText variant="subHeading" style={ui.bold}>Add worker</AppText>
                  <AppInput label="Name" accessibilityLabel="Worker name" value={name} onChangeText={setName} autoCapitalize="words" />
                  <AppInput label="Contact number" accessibilityLabel="Contact number" value={contact} onChangeText={setContact} keyboardType="phone-pad" />
                  {!!error && <AppText accessibilityRole="alert" variant="bodySmall" style={styles.error}>{error}</AppText>}
                  <View style={ui.row}>
                    <Pressable accessibilityRole="button" style={[ui.action, ui.outline, ui.grow]} onPress={() => setAdding(false)}>
                      <AppText variant="bodySmall" style={ui.bold}>Cancel</AppText>
                    </Pressable>
                    <Pressable accessibilityRole="button" style={[ui.action, ui.grow]} onPress={saveWorker}>
                      <AppText variant="bodySmall" style={ui.white}>Add worker</AppText>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
        )}
      </> : <AppText>Estate not found.</AppText>}
    </EstatePage>
  );
}

const styles = StyleSheet.create({
  searchInput: { marginBottom: 0 },
  addButton: { width: 56, alignSelf: "stretch", borderRadius: 14, backgroundColor: colors.brandDark, alignItems: "center", justifyContent: "center" },
  callButton: { width: 44, height: 44, borderRadius: 9, backgroundColor: colors.brandSurface, alignItems: "center", justifyContent: "center" },
  empty: { gap: 8, alignItems: "center", padding: 18 },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  modalContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  form: { width: "100%", maxWidth: 420, alignSelf: "center", padding: 18, gap: 12 },
  error: { color: colors.error },
});
