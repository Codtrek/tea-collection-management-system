import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { colors } from "@/theme/colors";

export interface ToastMessage {
  id: number;
  variant: "success" | "error" | "info";
  title: string;
  detail: string;
}

interface ToastProps {
  message: ToastMessage | null;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(5000);
  const started = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message || message.variant === "error") return;
    remaining.current = 5000;
    setPaused(false);
  }, [message?.id, message?.variant]);

  useEffect(() => {
    if (!message || message.variant === "error" || paused) return;
    started.current = Date.now();
    timeout.current = setTimeout(onDismiss, remaining.current);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started.current));
    };
  }, [message, paused, onDismiss]);

  useEffect(() => {
    if (Platform.OS !== "web" || !message || message.variant === "error") return;
    const updateVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, [message]);

  useEffect(() => {
    if (Platform.OS !== "web" || !message) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [message, onDismiss]);

  if (!message) return null;
  const failed = message.variant === "error";
  const icon = failed ? "alert-circle" : message.variant === "success" ? "checkmark" : "information-circle";

  return <View role={failed ? "alert" : "status"} aria-live={failed ? "assertive" : "polite"}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    style={[styles.toast, failed && styles.error]}>
    <View aria-hidden style={[styles.iconCircle, failed && styles.errorIcon]}>
      <Ionicons name={icon} size={18} color={failed ? colors.error : colors.charcoal} />
    </View>
    <View style={styles.copy}>
      <AppText style={styles.title}>{message.title}</AppText>
      <AppText style={styles.detail}>{message.detail}</AppText>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={onDismiss}
      style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
      <Ionicons name="close" size={20} color={colors.charcoal} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  toast: { position: "absolute", zIndex: 100, top: 16, left: 16, right: 16, maxWidth: 440, alignSelf: "center", minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)", backgroundColor: "rgba(255,255,255,0.95)", shadowColor: colors.charcoal, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 8 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  errorIcon: { backgroundColor: colors.errorTint },
  copy: { flex: 1, paddingVertical: 10, gap: 2 },
  title: { color: colors.charcoal, fontWeight: "600" },
  detail: { color: colors.charcoalSecondary, fontSize: 13 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: 4, borderRadius: 12 },
  pressed: { backgroundColor: "#F3F4F6" },
  error: { backgroundColor: "rgba(254,242,242,0.97)" },
});
