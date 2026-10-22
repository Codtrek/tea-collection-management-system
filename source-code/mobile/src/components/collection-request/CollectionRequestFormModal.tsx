import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, Modal, KeyboardAvoidingView } from "react-native";

import { AppButton, AppText } from "@/components/ui";
import { colors, spacing } from "@/theme";

interface CollectionRequestFormModalProps {
  visible: boolean;
  editingRecordId: string | null;
  pluckerName: string;
  weight: string;
  formError: string;
  onClose: () => void;
  onChangePluckerName: (value: string) => void;
  onChangeWeight: (value: string) => void;
  onSubmit: () => void;
  onDelete: () => void;
}

export function CollectionRequestFormModal({
  visible,
  editingRecordId,
  pluckerName,
  weight,
  formError,
  onClose,
  onChangePluckerName,
  onChangeWeight,
  onSubmit,
  onDelete,
}: CollectionRequestFormModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close add record form"
          style={styles.modalTint}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.dialogScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dialog}>
              <AppText variant="body" style={styles.sheetTitle}>
                {editingRecordId ? "Edit record" : "New record"}
              </AppText>

              <View style={styles.formField}>
                <AppText variant="bodySmall" style={styles.formLabel}>
                  Plucker:
                </AppText>
                <TextInput
                  accessibilityLabel="Plucker name"
                  value={pluckerName}
                  onChangeText={onChangePluckerName}
                  placeholder="Enter plucker name"
                  placeholderTextColor={colors.text.placeholder}
                  returnKeyType="next"
                  style={styles.formInput}
                />
              </View>

              <View style={styles.formField}>
                <AppText variant="bodySmall" style={styles.formLabel}>
                  Weight:
                </AppText>
                <TextInput
                  accessibilityLabel="Weight in kilograms"
                  value={weight}
                  onChangeText={onChangeWeight}
                  placeholder="0.0"
                  placeholderTextColor={colors.text.placeholder}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  style={styles.formInput}
                />
              </View>

              {formError ? (
                <AppText
                  accessibilityRole="alert"
                  variant="caption"
                  style={styles.formError}
                >
                  {formError}
                </AppText>
              ) : null}

              <View style={styles.sheetActions}>
                {editingRecordId ? (
                  <>
                    <AppButton
                      title="Save"
                      variant="primary"
                      width="half"
                      onPress={onSubmit}
                    />
                    <AppButton
                      title="Delete"
                      variant="secondary"
                      width="half"
                      onPress={onDelete}
                    />
                  </>
                ) : (
                  <>
                    <AppButton
                      title="+ Add"
                      variant="primary"
                      width="half"
                      onPress={onSubmit}
                    />
                    <AppButton
                      title="Cancel"
                      variant="secondary"
                      width="half"
                      onPress={onClose}
                    />
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  modalTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  dialogScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  dialog: {
    minHeight: 285,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.white,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  sheetTitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  formField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  formLabel: {
    width: 60,
    color: colors.text.primary,
  },
  formInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 16,
    backgroundColor: colors.surface,
    color: colors.text.primary,
    fontSize: 16,
  },
  formError: {
    color: colors.error,
    marginTop: -spacing.sm,
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: "auto",
    paddingTop: spacing.lg,
  },
});
