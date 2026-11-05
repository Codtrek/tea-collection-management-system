import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Pressable,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { FormCheckbox } from "@/components/forms";
import { AppButton, AppInput, AppText, Avatar, Screen } from "@/components/ui";
import { estateProfiles } from "@/data/estateOwnerEstates";
import {
  getEstateWorkers,
  saveEstateWorkers,
} from "@/data/estateWorkers";
import type { EstateWorker } from "@/data/estateWorkers";
import { colors, spacing } from "@/theme";

export default function EstateWorkers() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const estate = estateProfiles.find((profile) => profile.id === estateId);
  const [workers, setWorkers] = useState<EstateWorker[]>(() =>
    estate ? getEstateWorkers(estate.id) : []
  );
  const [isAddWorkerVisible, setIsAddWorkerVisible] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [workerContact, setWorkerContact] = useState("");
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(estate-owner)/estates");
    }
  };
  const screenHeader = (
    <View style={styles.screenHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={goBack}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </Pressable>
      <AppText variant="subHeading" style={styles.screenTitle}>
        Estate workers
      </AppText>
    </View>
  );

  if (!estate) {
    return (
      <Screen header={screenHeader}>
        <View style={styles.notFound}>
          <AppText variant="bodySmall">Estate not found.</AppText>
          <AppButton
            title="Back to estates"
            onPress={() => router.replace("/(estate-owner)/estates")}
          />
        </View>
      </Screen>
    );
  }

  const updateWorker = (
    workerId: string,
    update: Partial<EstateWorker>
  ) => {
    setWorkers((currentWorkers) =>
      currentWorkers.map((worker) =>
        worker.id === workerId ? { ...worker, ...update } : worker
      )
    );
  };

  const openAddWorker = () => {
    setWorkerName("");
    setWorkerContact("");
    setIsAddWorkerVisible(true);
  };

  const addWorker = () => {
    const name = workerName.trim();
    const contactNumber = workerContact.trim();

    if (!name || !contactNumber) {
      Alert.alert(
        "Worker details required",
        "Enter the worker's name and contact number."
      );
      return;
    }

    setWorkers((currentWorkers) => [
      ...currentWorkers,
      {
        id: `worker-${Date.now()}-${currentWorkers.length}`,
        name,
        role: "Tea plucker",
        contactNumber,
        present: false,
      },
    ]);
    setIsAddWorkerVisible(false);
  };

  const callWorker = (worker: EstateWorker) => {
    Alert.alert(
      worker.name,
      worker.contactNumber,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call",
          onPress: () => {
            void Linking.openURL(`tel:${worker.contactNumber}`).catch(() => {
              Alert.alert(
                "Unable to call",
                "Calling is not available on this device."
              );
            });
          },
        },
      ]
    );
  };

  const saveAttendance = () => {
    const hasIncompleteWorker = workers.some(
      (worker) =>
        !worker.name.trim() ||
        !worker.contactNumber.trim()
    );

    if (hasIncompleteWorker) {
      Alert.alert(
        "Worker details required",
        "Each worker needs a name and contact number."
      );
      return;
    }

    saveEstateWorkers(
      estate.id,
      workers.map((worker) => ({
        ...worker,
        name: worker.name.trim(),
        contactNumber: worker.contactNumber.trim(),
      }))
    );
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({
        pathname: "/(estate-owner)/estate/[estateId]",
        params: { estateId: estate.id },
      });
    }
  };

  const presentCount = workers.filter((worker) => worker.present).length;

  return (
    <Screen header={screenHeader}>
      <View style={styles.content}>
        <View style={styles.intro}>
          <AppText variant="sectionHeading" style={styles.estateName}>
            {estate.name}
          </AppText>
          <AppText variant="bodySmall" style={styles.subtitle}>
            Add worker details and mark who is present today.
          </AppText>
        </View>

        <View style={styles.attendanceSummary}>
          <Ionicons name="people-outline" size={18} color={colors.brandDark} />
          <AppText variant="bodySmall" style={styles.summaryText}>
            {presentCount} of {workers.length} workers present
          </AppText>
        </View>

        {workers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={32} color={colors.text.tertiary} />
            <AppText variant="bodySmall" style={styles.emptyText}>
              No workers added yet. Add a worker to get started.
            </AppText>
          </View>
        ) : (
          workers.map((worker) => (
            <View key={worker.id} style={styles.workerCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Call options for ${worker.name}`}
                onPress={() => callWorker(worker)}
                style={({ pressed }) => [
                  styles.workerDetails,
                  pressed && styles.pressed,
                ]}
              >
                <Avatar name={worker.name} size={48} />
                <View style={styles.workerInfo}>
                  <AppText variant="bodySmall" style={styles.workerName}>
                    {worker.name}
                  </AppText>
                  <AppText variant="caption" style={styles.workerContact}>
                    {worker.contactNumber}
                  </AppText>
                </View>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={colors.brandDark}
                />
              </Pressable>
              <FormCheckbox
                label="Present"
                checked={worker.present}
                onValueChange={(present) =>
                  updateWorker(worker.id, { present })
                }
                containerStyle={styles.workerCheckbox}
                labelStyle={styles.checkboxLabel}
              />
            </View>
          ))
        )}

        <Pressable
          accessibilityRole="button"
          onPress={openAddWorker}
          style={({ pressed }) => [
            styles.addWorkerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.brandDark} />
          <AppText variant="label" style={styles.addWorkerText}>
            Add worker
          </AppText>
        </Pressable>

        <AppButton
          title="Save attendance"
          onPress={saveAttendance}
          style={styles.saveButton}
        />
      </View>
      <Modal
        visible={isAddWorkerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddWorkerVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close add worker form"
            onPress={() => setIsAddWorkerVisible(false)}
            style={styles.modalBackdrop}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoiding}
          >
            <View style={styles.addWorkerModal}>
              <View style={styles.modalHeading}>
                <AppText variant="sectionHeading" style={styles.workerTitle}>
                  Add worker
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close add worker form"
                  onPress={() => setIsAddWorkerVisible(false)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={22} color={colors.text.secondary} />
                </Pressable>
              </View>
              <AppInput
                label="Name"
                placeholder="Enter worker's name"
                value={workerName}
                onChangeText={setWorkerName}
                autoCapitalize="words"
                returnKeyType="next"
                containerStyle={styles.modalInput}
              />
              <AppInput
                label="Contact number"
                placeholder="Enter contact number"
                value={workerContact}
                onChangeText={setWorkerContact}
                keyboardType="phone-pad"
                returnKeyType="done"
                containerStyle={styles.modalInput}
              />
              <AppButton title="Add worker" onPress={addWorker} />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: 36,
    backgroundColor: colors.white,
  },
  screenTitle: {
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.xl,
  },
  intro: {
    marginBottom: spacing.md,
  },
  estateName: {
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.text.secondary,
  },
  attendanceSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.brandSurface,
  },
  summaryText: {
    color: colors.brandDark,
    fontWeight: "600",
  },
  workerCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  workerDetails: {
    minHeight: 62,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  workerTitle: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  workerInfo: {
    flex: 1,
    gap: 4,
  },
  workerName: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  workerContact: {
    color: colors.text.secondary,
  },
  workerCheckbox: {
    flexDirection: "column-reverse",
    gap: 4,
  },
  checkboxLabel: {
    marginLeft: 0,
    fontSize: 11,
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  emptyText: {
    color: colors.text.secondary,
    textAlign: "center",
  },
  addWorkerButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    borderRadius: 14,
    backgroundColor: colors.brandSurface,
  },
  addWorkerText: {
    color: colors.brandDark,
  },
  saveButton: {
    maxHeight: 54,
  },
  pressed: {
    opacity: 0.75,
  },
  notFound: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: "rgba(16, 24, 7, 0.35)",
  },
  keyboardAvoiding: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  addWorkerModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  modalInput: {
    marginBottom: spacing.sm,
  },
  modalHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
});
