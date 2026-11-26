import { useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { employeeStyles as styles } from "@/theme/employees";
import type { OwnerEmployee } from "@/app/services/api/estate-owner.api";

export default function ManagerCard({ employee, saving, canAssign, onEnd, onAssign, children }: {
  employee: OwnerEmployee; saving: boolean; canAssign: boolean;
  onEnd: () => Promise<void>; onAssign: () => void; children: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const trigger = useRef<View>(null);
  function close() {
    setConfirm(false);
    setMenu(false);
    trigger.current?.focus();
  }
  const initials = employee.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  return <View role="listitem" style={styles.card}>
    <View style={styles.row}>
      <View aria-hidden style={styles.avatar}><AppText style={styles.avatarText}>{initials}</AppText></View>
      <View style={styles.details}>
        <AppText style={{ fontWeight: "600" }}>{employee.name}</AppText>
        <AppText style={styles.secondary}>{employee.estateName ? <><Ionicons name="leaf-outline" /> {employee.estateName}</> : "No estate assigned"}</AppText>
      </View>
      <AppText style={employee.estateId === null ? styles.unassignedBadge : styles.assignedBadge}>{employee.estateId === null ? "Unassigned" : "Assigned"}</AppText>
      <Pressable ref={trigger} role="button" aria-label={`More actions for ${employee.name}`} aria-haspopup="menu" aria-expanded={menu}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        onPress={() => setMenu(!menu)}>
        <Ionicons name="ellipsis-horizontal" size={24} />
      </Pressable>
    </View>
    {menu && <View role="menu">
      <Pressable role="menuitem" disabled={saving || (employee.estateId === null && !canAssign)} style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        onPress={() => { setMenu(false); if (employee.estateId === null) onAssign(); else setConfirm(true); }}>
        <AppText style={employee.estateId === null ? undefined : styles.danger}>{employee.estateId === null ? "Assign to estate" : "End assignment"}</AppText>
      </Pressable>
    </View>}
    {children}
    <Modal visible={confirm} transparent animationType="none" onRequestClose={close}>
      <View style={styles.overlay}><View role="dialog" aria-modal accessibilityLabel="End assignment?" style={styles.dialog}>
        <AppText role="heading" variant="subHeading">End assignment?</AppText>
        <AppText>{employee.name} will no longer manage {employee.estateName}.</AppText>
        <Pressable role="button" disabled={saving} onPress={close} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><AppText>Cancel</AppText></Pressable>
        <Pressable role="button" disabled={saving} onPress={async () => { await onEnd(); close(); }} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          {saving ? <ActivityIndicator /> : <AppText style={styles.danger}>End assignment</AppText>}
        </Pressable>
      </View></View>
    </Modal>
  </View>;
}
