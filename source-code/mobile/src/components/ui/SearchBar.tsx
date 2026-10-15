import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
        color={colors.primary}
        style={styles.icon}
      />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.placeholder}
        underlineColorAndroid="transparent"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    // backgroundColor: colors.surface,
    paddingHorizontal: 14,
    marginBottom: 16,
  },

  icon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: colors.text.primary,
    fontSize: 16,
  },
});