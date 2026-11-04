import { useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppInput, AppText } from "@/components/ui";
import { EstateIcon, estateStyles as ui } from "./EstatePage";

export default function PluckingWeightDialog({ workerName, initialWeight, onClose, onConfirm }: {
  workerName: string;
  initialWeight?: number;
  onClose: () => void;
  onConfirm: (weight: number) => void;
}) {
  const editing = initialWeight !== undefined;
  const [amount, setAmount] = useState(editing ? String(initialWeight) : "");
  const [confirmedWeight, setConfirmedWeight] = useState<number | null>(null);
  const [error, setError] = useState("");
  const submitted = useRef(false);

  function reviewWeight() {
    const input = amount.trim().replace(",", ".");
    const weight = Number(input);
    if (!/^\d*\.?\d+$/.test(input) || !Number.isFinite(weight) || weight <= 0) {
      setError("Enter a weight greater than zero.");
      return;
    }
    Keyboard.dismiss();
    setError("");
    setConfirmedWeight(weight);
  }

  function back() {
    if (confirmedWeight === null) {
      onClose();
    } else {
      setConfirmedWeight(null);
      setError("");
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={back}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
          <View accessibilityViewIsModal style={[ui.card, styles.dialog]}>
            <View style={styles.icon}><EstateIcon name={editing ? "pencil-outline" : "leaf-outline"} /></View>
            <AppText variant="subHeading" style={ui.bold}>
              {confirmedWeight === null ? (editing ? "Edit plucking weight" : "Enter plucking weight") : (editing ? "Confirm weight change" : "Confirm plucking record")}
            </AppText>
            <AppText variant="bodySmall" style={ui.muted}>{workerName}</AppText>
            {confirmedWeight === null ? (
              <AppInput label="Weight (kg)" accessibilityLabel="Weight in kilograms" keyboardType="decimal-pad"
                value={amount} onChangeText={(value) => {
                  setAmount(value);
                  setError("");
                }} />
            ) : (
              <View style={styles.summary}>
                <AppText variant="bodySmall" style={ui.muted}>{editing ? "Replace the recorded weight?" : "Save this weight for the selected worker?"}</AppText>
                <AppText variant="subHeading" style={ui.bold}>
                  {editing ? `${initialWeight.toLocaleString()} kg → ` : ""}{confirmedWeight.toLocaleString()} kg
                </AppText>
              </View>
            )}
            {!!error && <AppText accessibilityRole="alert" variant="bodySmall" style={styles.error}>{error}</AppText>}
            <View style={ui.row}>
              <Pressable accessibilityRole="button" style={[ui.action, ui.outline, ui.grow]} onPress={back}>
                <AppText variant="bodySmall" style={ui.bold}>{confirmedWeight === null ? "Cancel" : "Go back"}</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" style={[ui.action, ui.grow]} onPress={() => {
                if (confirmedWeight === null) {
                  reviewWeight();
                } else if (!submitted.current) {
                  submitted.current = true;
                  onConfirm(confirmedWeight);
                }
              }}>
                <AppText variant="bodySmall" style={ui.white}>{confirmedWeight === null ? "Review" : "Confirm"}</AppText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#10241c80" },
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 420, alignSelf: "center", padding: 20, gap: 12 },
  icon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: "#e8fae4" },
  summary: { backgroundColor: "#e8fae4", padding: 12, borderRadius: 8, gap: 4 },
  error: { color: "#ad2020" },
});
