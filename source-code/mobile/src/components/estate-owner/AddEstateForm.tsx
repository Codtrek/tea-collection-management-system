import { useRef, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { AppButton, AppInput, AppText, Screen } from "@/components/ui";
import { colors, spacing, typography } from "@/theme";
import { useEstateStore } from "@/store/estateStore";
import { registerOwnedEstate, type CreateEstateInMobile } from "@/app/services/api/estate-owner.api";
import { teaGardenImage } from "@/data/estateOwnerEstates";

export default function AddEstateForm() {
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState("");
  const [name, setName] = useState("");
  const [acres, setAcres] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [assignManager, setAssignManager] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState(false);
  const submitted = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const addEstate = useEstateStore((state) => state.addEstate);

  async function pickPhoto() {
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
        setErrors((current) => ({ ...current, photo: "" }));
      }
    } catch {
      Alert.alert("Unable to open photos", "Please try selecting your estate photo again.");
    } finally { setPicking(false); }
  }

  function next() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Enter the estate name.";
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(acres.trim()) || Number(acres) <= 0) nextErrors.acres = "Enter a positive area with up to two decimal places.";
    if (!address.trim()) nextErrors.address = "Enter the estate address.";
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) { setStep(2); scroll.current?.scrollTo({ y: 0, animated: false }); }
  }

  async function save() {
    if (submitted.current) return;
    submitted.current = true;
    setSaving(true);
    setErrors({});
    const details: CreateEstateInMobile = { name: name.trim(), address: address.trim(), areaAcres: Number(acres) };
    try {
      const estate = await registerOwnedEstate(details);
      addEstate({ id: String(estate.id), name: estate.name, location: estate.location, areaAcres: details.areaAcres,
        imageSrc: photo || teaGardenImage, managerName: "You (estate owner)", managerPhone: "" });
      if (assignManager) {
        router.replace({ pathname: "/(estate-owner)/employees", params: { estateId: String(estate.id) } });
      } else {
        router.replace("/(estate-owner)/estates");
      }
    } catch (cause) {
      submitted.current = false;
      setSaving(false);
      setErrors({ save: cause instanceof Error ? cause.message : "Could not register the estate." });
    }
  }

  function back() {
    if (submitted.current) return;
    if (step === 2) { setStep(1); setErrors({}); }
    else if (router.canGoBack()) router.back();
    else router.replace("/(estate-owner)/estates");
  }
  const inputTheme = { labelStyle: styles.inputLabel, errorStyle: styles.inputCaption };
  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={spacing.md} onPress={back}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <AppText variant="subHeading">Add estate</AppText>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppText variant="caption" style={styles.step}>STEP {step} OF 2</AppText>
          <View style={styles.progress}><View style={styles.progressActive} /><View style={[styles.progressPart, step === 2 && styles.progressActive]} /></View>
          <AppText variant="heading">{step === 1 ? "Estate details" : "Who will manage it?"}</AppText>
          <AppText variant="bodySmall" style={styles.description}>{step === 1 ? "Add a photo and a few details about your estate." : "Manage the estate yourself or assign an estate manager. Manager details are optional."}</AppText>
          {step === 1 ? <>
            <AppText variant="bodySmall" style={styles.inputLabel}>Estate photo (optional, this session only)</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel={photo ? "Change estate photo" : "Choose estate photo"} disabled={picking} onPress={pickPhoto} style={styles.photo}>
              {photo ? <Image source={{ uri: photo }} style={styles.preview} /> : <Ionicons name="camera-outline" size={32} color={colors.brandDark} />}
              <AppText variant="bodySmall" style={styles.photoLabel}>{picking ? "Opening photos…" : photo ? "Change photo" : "Choose estate photo"}</AppText>
            </Pressable>
            {!!errors.photo && <AppText variant="caption" style={styles.error}>{errors.photo}</AppText>}
            <AppInput {...inputTheme} label="Estate name" accessibilityLabel="Estate name" maxLength={100} placeholder="e.g. Kothmale Green Tea" value={name} onChangeText={setName} error={errors.name} />
            <AppInput {...inputTheme} label="Area (acres)" accessibilityLabel="Area in acres" placeholder="e.g. 12.5" keyboardType="decimal-pad" value={acres} onChangeText={setAcres} error={errors.acres} />
            <AppInput {...inputTheme} label="Estate address" accessibilityLabel="Estate address" placeholder="Street, town or village" multiline value={address} onChangeText={setAddress} error={errors.address} />
            <AppButton title="Continue" onPress={next} />
          </> : <>
            {([false, true] as const).map((assigned) => <Pressable key={String(assigned)} accessibilityRole="radio" accessibilityState={{ checked: assignManager === assigned }} onPress={() => { setAssignManager(assigned); setErrors({}); }} style={[styles.option, assignManager === assigned && styles.selected]}>
              <Ionicons name={assignManager === assigned ? "radio-button-on" : "radio-button-off"} size={22} color={colors.brandDark} />
              <View style={styles.flex}><AppText variant="sectionHeading">{assigned ? "Register an estate manager" : "I'll manage this estate"}</AppText><AppText variant="bodySmall" style={styles.muted}>{assigned ? "Continue to Employees after registering the estate." : "You can add a manager later."}</AppText></View>
            </Pressable>)}
            {!!errors.save && <AppText accessibilityRole="alert" style={styles.error}>{errors.save}</AppText>}
            <AppText variant="bodySmall" style={styles.muted}>Payment method: Cash</AppText>
            <AppButton title="Register estate" loading={saving} style={styles.save} onPress={save} />
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.lg },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  content: { paddingBottom: spacing.xl },
  step: { color: colors.brandDark },
  progress: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
  progressActive: { flex: 1, height: spacing.xs, borderRadius: spacing.xs, backgroundColor: colors.brandDark },
  progressPart: { flex: 1, height: spacing.xs, borderRadius: spacing.xs, backgroundColor: colors.border.light },
  description: { color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  inputLabel: { ...typography.bodySmall, fontWeight: "600", color: colors.text.primary },
  inputCaption: { ...typography.caption },
  photo: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.brandBorder, borderRadius: spacing.md, backgroundColor: colors.brandSurface, alignItems: "center", justifyContent: "center", minHeight: 160, overflow: "hidden", marginTop: spacing.sm, marginBottom: spacing.md },
  preview: { width: "100%", height: 160 },
  photoLabel: { color: colors.brandDark, padding: spacing.sm },
  error: { color: colors.error, marginBottom: spacing.md },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.border.default, borderRadius: spacing.md, padding: spacing.md, marginBottom: spacing.sm },
  selected: { backgroundColor: colors.brandSurface, borderColor: colors.brandDark },
  muted: { color: colors.text.secondary },
  managerFields: { marginTop: spacing.md },
  save: { marginTop: spacing.md },
  skip: { marginTop: spacing.sm },
});
