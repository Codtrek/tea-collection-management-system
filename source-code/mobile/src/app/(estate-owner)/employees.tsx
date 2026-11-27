import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { AppButton, AppInput, AppText, Dropdown, PasswordInput, Screen } from "@/components/ui";
import { colors } from "@/theme/colors";
import { changeManagerAssignment, getOwnerEmployees, registerEstateManager, type EmployeeDirectory, type OwnerEmployee } from "../services/api/estate-owner.api";
import { getErrorMessages } from "../services/api/client";

const emptyForm = { name: "", phone: "", nic: "", dateOfBirth: "", password: "", confirmPassword: "" };

export default function Employees() {
  const { estateId: requestedEstate } = useLocalSearchParams<{ estateId?: string }>();
  const [directory, setDirectory] = useState<EmployeeDirectory>({ employees: [], availableEstates: [] });
  const [registering, setRegistering] = useState(Boolean(requestedEstate));
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [destination, setDestination] = useState("");
  const estates = directory.availableEstates;
  const [estateId, setEstateId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    getOwnerEmployees().then((result) => {
      if (!active) return;
      setDirectory(result);
      setSelectedEmployee(null);
      const items = result.availableEstates;
      if (requestedEstate && items.some(item => String(item.id) === requestedEstate)) {
        setEstateId(requestedEstate);
        setRegistering(true);
      } else setEstateId(items.length === 1 ? String(items[0].id) : "");
    }).catch((cause) => {
      if (active) setLoadError(getErrorMessages(cause, "Could not load employees.").join("\n"));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt, requestedEstate]));

  async function updateAssignment(employee: OwnerEmployee) {
    const assign = employee.estateId === null;
    const target = employee.estateId ?? Number(destination);
    if (!target || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await changeManagerAssignment(employee.id, target, assign);
      setSuccess(assign ? `Assigned ${employee.name} to ${estates.find(item => item.id === target)?.name}.` : `Ended ${employee.name}'s assignment to ${employee.estateName}.`);
    } catch (cause) {
      setError(getErrorMessages(cause, "Could not change this assignment.").join("\n"));
    } finally {
      setSaving(false);
      setAttempt(value => value + 1);
    }
  }

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
      setRegistering(false);
      setAttempt(value => value + 1);
      setSuccess(`${manager.name} is now registered as manager of ${manager.estateName}.`);
    } catch (cause) {
      setError(getErrorMessages(cause, "Could not register the manager.").join("\n"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen pageTitle="Employees" scroll keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={{ paddingBottom: 24 }}>
      {error ? <AppText accessibilityLiveRegion="polite" style={{ color: colors.error }}>{error}</AppText> : null}
      {success ? <AppText accessibilityLiveRegion="polite" style={{ color: colors.brandDark }}>{success}</AppText> : null}
      {loading ? <ActivityIndicator color={colors.brandDark} /> : loadError ? (
        <>
          <AppText>{loadError}</AppText>
          <AppButton title="Retry" onPress={() => setAttempt(value => value + 1)} />
        </>
      ) : (
        <>
          <AppText variant="subHeading">Estate managers</AppText>
          {directory.employees.length === 0 && <AppText>No estate managers registered yet.</AppText>}
          {directory.employees.map(employee => (
            <View key={employee.id} style={{ gap: 8, paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border.light }}>
              <AppText variant="sectionHeading">{employee.name}</AppText>
              <AppText>{employee.estateName ?? "Unassigned"}</AppText>
              {selectedEmployee === employee.id ? (
                <>
                  {employee.estateId === null ? (
                    <Dropdown accessibilityLabel="Assign to estate" value={destination} onChange={setDestination}
                      options={estates.map(estate => ({ value: String(estate.id), label: estate.name }))} />
                  ) : <AppText>End this manager’s assignment to {employee.estateName}?</AppText>}
                  <AppButton title={employee.estateId === null ? "Confirm assignment" : "Confirm end of assignment"}
                    loading={saving} disabled={employee.estateId === null && !destination} onPress={() => updateAssignment(employee)} />
                  <AppButton title="Cancel" variant="secondary" disabled={saving} onPress={() => setSelectedEmployee(null)} />
                </>
              ) : <AppButton title={employee.estateId === null ? "Assign to estate" : "End assignment"} variant="secondary"
                disabled={saving || (employee.estateId === null && !estates.length)} onPress={() => {
                  setSelectedEmployee(employee.id);
                  setDestination(estates.length === 1 ? String(estates[0].id) : "");
                  setError("");
                  setSuccess("");
                  setRegistering(false);
                }} />}
            </View>
          ))}
          {!estates.length ? <AppText style={{ marginVertical: 12 }}>No estates are available for a manager assignment.</AppText> :
            <AppButton title={registering ? "Close registration" : "Register an estate manager"} disabled={saving}
              onPress={() => { setRegistering(!registering); setSelectedEmployee(null); setError(""); }} />}
          {registering && estates.length > 0 && <>
          <AppText>Estate</AppText>
          <Dropdown accessibilityLabel="Estate" value={estateId} onChange={setEstateId} placeholder="Select an estate"
            options={estates.map(estate => ({ value: String(estate.id), label: estate.name }))} />
          <AppInput label="Manager name" maxLength={32} containerStyle={{ marginTop: 18 }} {...field("name")} />
          <AppInput label="Phone number" keyboardType="phone-pad" {...field("phone")} />
          <AppInput label="NIC" autoCapitalize="characters" maxLength={12} {...field("nic")} />
          <AppInput label="Date of birth" placeholder="YYYY-MM-DD" maxLength={10} {...field("dateOfBirth")} />
          <PasswordInput label="Password" helperText="Use at least 8 characters." {...field("password")} />
          <PasswordInput label="Confirm password" {...field("confirmPassword")} />
          <AppButton title="Register manager" loading={saving} onPress={submit} />
          </>}
        </>
      )}
    </Screen>
  );
}
