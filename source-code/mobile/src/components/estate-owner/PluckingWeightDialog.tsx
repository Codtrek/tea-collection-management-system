import { useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppInput, AppText } from "@/components/ui";
import { colors } from "@/theme";
import { EstateIcon, estateStyles as ui } from "./EstatePage";

export function parsePluckingWeight(amount: string): number | null {
  const input = amount.trim().replace(",", ".");
  const weight = Number(input);
  return /^\d*\.?\d+$/.test(input) && Number.isFinite(weight) && weight > 0 ? weight : null;
}

export default function PluckingWeightDialog({ workerName, onClose, onConfirm }: {
  workerName: string;
  onClose: () => void;
  onConfirm: (weight: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const [confirmedWeight, setConfirmedWeight] = useState<number | null>(null);
  const [error, setError] = useState("");
  const submitted = useRef(false);

  function reviewWeight() {
    const weight = parsePluckingWeight(amount);
    if (weight === null) {
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
            <View style={styles.icon}><EstateIcon name="leaf-outline" /></View>
            <AppText variant="subHeading" style={ui.bold}>
              {confirmedWeight === null ? "Enter plucking weight" : "Confirm plucking record"}
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
                <AppText variant="bodySmall" style={ui.muted}>Save this weight for the selected worker?</AppText>
                <AppText variant="subHeading" style={ui.bold}>
                  {confirmedWeight.toLocaleString()} kg
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
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 420, alignSelf: "center", padding: 20, gap: 12 },
  icon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: colors.brandSurface },
  summary: { backgroundColor: colors.brandSurface, padding: 12, borderRadius: 8, gap: 4 },
  error: { color: colors.error },
});
