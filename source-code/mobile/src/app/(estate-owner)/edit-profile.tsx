import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppButton, AppInput, AppText, Screen } from "@/components/ui";
import { type ProfileField, profileLabels, readOwnerProfile, saveOwnerProfileField } from "@/utils/ownerProfile";
import { getPhoneNumberError } from "@/utils/phoneValidation";
export default function EditProfile() {
  const {field: param} = useLocalSearchParams<{field?: string | string[]}>();
  const field: ProfileField | null = param === "name" || param === "phone" || param === "email" ? param : null;
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setReady(false); setLoading(true); setError("");
    readOwnerProfile().then(user => {
      if (!active) return;
      if (!user || !field) throw new Error("Please sign in and select a profile detail.");
      setValue(user[field] ?? ""); setReady(true);
    }).catch(() => {if (active) setError("Unable to load this detail. Please sign in again.");})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [field]);
  async function save() {
    if (!field || !ready || saving) return;
    const trimmed = value.trim();
    const validation = field === "name" ? (!trimmed ? "Enter your name." : trimmed.length > 32 ? "Use 32 characters or fewer." : undefined)
      : field === "phone" ? getPhoneNumberError(trimmed)
      : trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? "Enter a valid e-mail address." : undefined;
    if (validation) {setError(validation); return;}
    setSaving(true); setError("");
    try {await saveOwnerProfileField(field, trimmed); router.back();}
    catch (error) {setError(error instanceof Error ? error.message : "Unable to save changes. Please try again.");}
    finally {setSaving(false);}
  }
  const label = field ? profileLabels[field] : "detail";
  return <Screen>
    <View style={styles.content}>
      <AppText variant="heading">Additional information</AppText>
      {loading ? <AppText>Loading...</AppText> : (
        <AppInput label={label} value={value} editable={ready && !saving} error={error}
          onChangeText={text => {setValue(text); setError("");}}
          keyboardType={field === "phone" ? "phone-pad" : field === "email" ? "email-address" : "default"}
          autoCapitalize={field === "name" ? "words" : "none"} autoCorrect={false}
          helperText={field === "email" ? "Optional. Clear to remove your e-mail." : "Replace the current value with your new details."} />
      )}
      <View style={styles.footer}>
        <AppButton title="Save" loading={saving} disabled={!ready || loading} onPress={() => void save()} />
      </View>
    </View>
  </Screen>;
}
const styles = StyleSheet.create({
  content: {flex: 1, paddingTop: 56, paddingBottom: 24, gap: 24},
  footer: {marginTop: "auto"},
});
