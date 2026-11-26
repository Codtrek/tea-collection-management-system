import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AppButton, AppInput, AppText, Dropdown, PasswordInput, Screen } from "@/components/ui";
import Toast, { type ToastMessage } from "@/components/ui/Toast";
import { colors } from "@/theme/colors";
import { changeManagerAssignment, getOwnerEmployees, registerEstateManager, type EmployeeDirectory, type OwnerEmployee } from "../services/api/estate-owner.api";
import { getErrorMessages } from "../services/api/client";

import ManagerCard from "@/components/estate-owner/ManagerCard";
import { employeeStyles as styles } from "@/theme/employees";

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
  const [toast, setToast] = useState<ToastMessage | null>(null);

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
      } else setEstateId("");
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
    try {
      await changeManagerAssignment(employee.id, target, assign);
      const estateName = estates.find(item => item.id === target)?.name ?? employee.estateName ?? "the estate";
      setToast({ id: Date.now(), variant: "success", title: assign ? "Manager assigned" : "Assignment ended", detail: assign ? `${employee.name} now manages ${estateName}.` : `${employee.name} no longer manages ${estateName}.` });
    } catch (cause) {
      setToast({ id: Date.now(), variant: "error", title: assign ? "Couldn't assign the manager" : "Couldn't end the assignment", detail: "Check your connection and try again." });
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
        setForm(previous => ({ ...previous, [key]: value }));
      },
    };
  }

  async function submit() {
    if (saving) return;
    if (Object.values(form).some(value => !value.trim())) {
      setToast({ id: Date.now(), variant: "error", title: "Complete the manager details", detail: "Fill in every field before registering the manager." });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setToast({ id: Date.now(), variant: "error", title: "Passwords do not match", detail: "Enter the same password in both password fields." });
      return;
    }
    setSaving(true);
    try {
      const manager = await registerEstateManager({
        ...form, estateId: estateId ? Number(estateId) : undefined, name: form.name.trim(),
        phone: form.phone.trim(), nic: form.nic.trim().toUpperCase(), dateOfBirth: form.dateOfBirth.trim(),
      });
      setForm(emptyForm);
      setRegistering(false);
      setAttempt(value => value + 1);
      setToast({ id: Date.now(), variant: "success", title: "Manager registered", detail: manager.estateName ? `${manager.name} now manages ${manager.estateName}.` : `${manager.name} is ready for assignment.` });
    } catch (cause) {
      setToast({ id: Date.now(), variant: "error", title: "Couldn't register the manager", detail: "Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.page}><Screen header={<View style={styles.header}><AppText role="heading" aria-level={1} variant="heading">Employees</AppText></View>} scroll keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={styles.content}>
      {loading ? <ActivityIndicator color={colors.brandDark} /> : loadError ? (
        <>
          <AppText>{loadError}</AppText>
          <AppButton title="Retry" onPress={() => setAttempt(value => value + 1)} />
        </>
      ) : (
        <>
          <AppText role="heading" aria-level={2} variant="subHeading">Estate managers ({directory.employees.length})</AppText>
          {directory.employees.length === 0 && <AppText>No estate managers yet</AppText>}
          <View role="list" accessibilityLabel="Estate managers" style={styles.list}>
          {directory.employees.map(employee => (
            <ManagerCard key={employee.id} employee={employee} saving={saving} canAssign={estates.length > 0}
              onEnd={() => updateAssignment(employee)} onAssign={() => { setSelectedEmployee(employee.id); setDestination(""); }}>
              {selectedEmployee === employee.id && employee.estateId === null && <>
                <Dropdown accessibilityLabel="Assign to estate" value={destination} onChange={setDestination} options={estates.map(estate => ({ value: String(estate.id), label: estate.name }))} />
                <AppButton title="Confirm assignment" disabled={!destination || saving} loading={saving} onPress={() => updateAssignment(employee)} />
                <AppButton title="Cancel" variant="secondary" disabled={saving} onPress={() => setSelectedEmployee(null)} />
              </>}
            </ManagerCard>
          ))}
          </View>
          {registering && <>
          <AppText>Estate (optional)</AppText>
          <Dropdown accessibilityLabel="Estate" value={estateId} onChange={setEstateId} placeholder="Assign later"
            options={[{ value: "", label: "Assign later" }, ...estates.map(estate => ({ value: String(estate.id), label: estate.name }))]} />
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
    <View style={styles.footer}>
      <AppButton title={registering ? "Close registration" : "Register an estate manager"} disabled={saving} style={styles.primary} labelStyle={styles.primaryText}
        onPress={() => { setRegistering(!registering); setSelectedEmployee(null); setError(""); }} />
    </View><Toast message={toast} onDismiss={() => setToast(null)} /></View>
  );
}
