import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useState } from "react";
import { deletePendingCollectionRequest, type OwnerCollectionRequest } from "@/app/services/api/collection-request.api";
import { AppButton, AppText } from "@/components/ui";
import { colors, spacing } from "@/theme";

interface Props {
  request: OwnerCollectionRequest;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

export function CollectionRequestDetailsModal({ request, onClose, onDeleted }: Props) {
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

  const close = () => { if (!deleting) onClose(); };
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
          <ScrollView contentContainerStyle={styles.details}>
            <AppText variant="subHeading">{request.estate.name}</AppText>
            <AppText>Status: {request.status === "open" ? "Pending" : request.status}</AppText>
            <AppText>Requested: {new Date(request.createdAt).toLocaleString()}</AppText>
            <AppText variant="label">Notes</AppText>
            <AppText>{request.notes?.trim() || "No notes provided."}</AppText>
          </ScrollView>
          {request.status === "open" && (
            <>
              {confirming && <AppText>Permanently delete request #{request.id}?</AppText>}
              {error && <AppText accessibilityRole="alert">{error}</AppText>}
              <AppButton
                title={confirming ? "Confirm deletion" : "Delete"}
                variant="secondary"
                loading={deleting}
                onPress={confirming ? deleteRequest : () => setConfirming(true)}
              />
            </>
          )}
          <AppButton title="Close" disabled={deleting} onPress={close} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
