import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AppButton, AppInput, AppText, Dropdown, PasswordInput, Screen } from "@/components/ui";
import { colors } from "@/theme/colors";
import { getOwnedEstates, registerEstateManager, type OwnedEstate } from "../services/api/estate-owner.api";
import { getErrorMessages } from "../services/api/client";

const emptyForm = { name: "", phone: "", nic: "", dateOfBirth: "", password: "", confirmPassword: "" };

export default function Employees() {
  const { estateId: requestedEstate } = useLocalSearchParams<{ estateId?: string }>();
  const [estates, setEstates] = useState<OwnedEstate[]>([]);
  const [estateId, setEstateId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    getOwnedEstates().then((items) => {
      if (!active) return;
      setEstates(items);
      if (requestedEstate && items.some(item => String(item.id) === requestedEstate)) setEstateId(requestedEstate);
      else if (items.length === 1) setEstateId(String(items[0].id));
    }).catch((cause) => {
      if (active) setLoadError(getErrorMessages(cause, "Could not load estates.").join("\n"));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt, requestedEstate]);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      editable: !saving,
      onChangeText: (value: string) => {
        setSuccess("");
        setError("");
        setForm(previous => ({ ...previous, [key]: value }));
      },
    };
  }

  async function submit() {
    if (saving) return;
    setSuccess("");
    setError("");
    if (!estateId || Object.values(form).some(value => !value.trim())) {
      setError("Select an estate and complete all fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const manager = await registerEstateManager({
        ...form, estateId: Number(estateId), name: form.name.trim(),
        phone: form.phone.trim(), nic: form.nic.trim().toUpperCase(), dateOfBirth: form.dateOfBirth.trim(),
      });
      setForm(emptyForm);
      setSuccess(`${manager.name} is now registered as manager of ${manager.estateName}.`);
    } catch (cause) {
      setError(getErrorMessages(cause, "Could not register the manager.").join("\n"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen pageTitle="Employees" scroll keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={{ paddingBottom: 24 }}>
      <AppText variant="subHeading" style={{ marginBottom: 16 }}>Register an estate manager</AppText>
      {loading ? <ActivityIndicator color={colors.brandDark} /> : loadError ? (
        <>
          <AppText>{loadError}</AppText>
          <AppButton title="Retry" onPress={() => setAttempt(value => value + 1)} />
        </>
      ) : estates.length === 0 ? <AppText>You need an estate before you can register a manager.</AppText> : (
        <>
          <AppText>Estate</AppText>
          <Dropdown accessibilityLabel="Estate" value={estateId} onChange={setEstateId} placeholder="Select an estate"
            options={estates.map(estate => ({ value: String(estate.id), label: estate.name }))} />
          <AppInput label="Manager name" maxLength={32} containerStyle={{ marginTop: 18 }} {...field("name")} />
          <AppInput label="Phone number" keyboardType="phone-pad" {...field("phone")} />
          <AppInput label="NIC" autoCapitalize="characters" maxLength={12} {...field("nic")} />
          <AppInput label="Date of birth" placeholder="YYYY-MM-DD" maxLength={10} {...field("dateOfBirth")} />
          <PasswordInput label="Password" helperText="Use at least 8 characters." {...field("password")} />
          <PasswordInput label="Confirm password" {...field("confirmPassword")} />
          {error ? <AppText accessibilityLiveRegion="polite" style={{ color: colors.error }}>{error}</AppText> : null}
          {success ? <AppText accessibilityLiveRegion="polite" style={{ color: colors.brandDark }}>{success}</AppText> : null}
          <AppButton title="Register manager" loading={saving} onPress={submit} />
        </>
      )}
    </Screen>
  );
}
