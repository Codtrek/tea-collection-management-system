import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useState } from "react";
import { deletePendingCollectionRequest, patchCollectionRequest, type OwnerCollectionRequest } from "@/app/services/api/collection-request.api";
import { AppButton, AppText } from "@/components/ui";
import { colors, spacing } from "@/theme";

interface Props {
  request: OwnerCollectionRequest;
  onClose: () => void;
  onDeleted: (id: number) => void;
  onUpdated: (request: OwnerCollectionRequest) => void;
}

export function CollectionRequestDetailsModal({ request, onClose, onDeleted, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(request.teaWeightKg ?? "");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteRequest() {
    setDeleting(true);
    setError("");
    try {
      const { id } = await deletePendingCollectionRequest(request.id);
      onDeleted(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the request.");
      setDeleting(false);
    }
  }

  async function saveWeight() {
    const input = weight.trim();
    const value = Number(input);
    if (!/^\d+(?:\.\d{1,2})?$/.test(input) || value <= 0 || value > 99999999.99) {
      setError("Invalid weight.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await patchCollectionRequest(request.id, { teaWeightKg: value });
      onUpdated({ ...request, teaWeightKg: value.toFixed(2) });
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the tea weight.");
    } finally {
      setSaving(false);
    }
  }

  const close = () => { if (!deleting && !saving) onClose(); };
  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Close request details"
          accessibilityRole="button"
          onPress={close}
        />
        <View style={styles.dialog} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.details} keyboardShouldPersistTaps="handled">
            <AppText variant="subHeading">{request.estate.name}</AppText>
            <AppText>Status: {request.status === "open" ? "Pending" : request.status}</AppText>
            <AppText>Requested: {new Date(request.createdAt).toLocaleString()}</AppText>
            <AppText>Requested by: {request.requestedBy?.name?.trim() || "Unknown requester"}</AppText>
            <AppText variant="label">Tea weight (kg)</AppText>
            {editing ? (
              <TextInput accessibilityLabel="Tea weight in kilograms" keyboardType="decimal-pad"
                style={styles.input} value={weight} onChangeText={setWeight} editable={!saving} autoFocus />
            ) : <AppText>{request.teaWeightKg == null ? "Not recorded" : `${request.teaWeightKg} kg`}</AppText>}
            <AppText variant="label">Notes</AppText>
            <AppText>{request.notes?.trim() || "No notes provided."}</AppText>
          </ScrollView>
          {request.status === "open" && (
            <>
              {confirming && <AppText>Permanently delete request #{request.id}?</AppText>}
              {error && <AppText accessibilityRole="alert">{error}</AppText>}
              {!confirming && <AppButton
                title={editing ? "Save weight" : "Edit weight"}
                loading={saving}
                onPress={editing ? saveWeight : () => { setEditing(true); setError(""); }}
              />}
              {!editing && <AppButton
                title={confirming ? "Confirm deletion" : "Delete"}
                variant="secondary"
                loading={deleting}
                onPress={confirming ? deleteRequest : () => setConfirming(true)}
              />}
            </>
          )}
          <AppButton title="Close" disabled={deleting || saving} onPress={close} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.border.light, borderRadius: 8, padding: spacing.sm },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  details: {
    gap: spacing.sm,
  },
});
