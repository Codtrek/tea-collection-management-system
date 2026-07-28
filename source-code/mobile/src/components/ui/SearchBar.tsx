import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppInput from "./AppInput";
import { colors } from "@/theme/colors";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Filter estates by name or variety...",
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name="search"
        size={20}
        color={colors.text.secondary}
        style={styles.icon}
      />

      <AppInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 14,

    backgroundColor: colors.white,

    paddingHorizontal: 12,
  },

  icon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    minHeight: 48,
  },
});