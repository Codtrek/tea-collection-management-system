import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { colors } from "@/theme";
interface Props { label: string; value?: string; onPress: () => void }
export default function UserDetail({ label, value, onPress }: Props) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${label}`} onPress={onPress} style={({pressed}) => [styles.row, {opacity: pressed ? 0.6 : 1}]}>
    <View style={styles.content}><AppText variant="bodySmall" style={styles.label}>{label}</AppText><AppText>{value || "Not added"}</AppText></View>
    <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
  </Pressable>;
}
const styles = StyleSheet.create({
  row: {flexDirection: "row", alignItems: "center", paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: colors.border.light},
  content: {flex: 1, gap: 6, paddingRight: 12}, label: {color: colors.text.secondary},
});
