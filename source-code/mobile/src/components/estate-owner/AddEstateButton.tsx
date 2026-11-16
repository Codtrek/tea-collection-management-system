import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { colors } from "@/theme";

interface AddEstateButtonProps {
  onPress?: () => void;
}

export default function AddEstateButton({ onPress }: AddEstateButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Add estate"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="add" size={30} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 20,
    top: 70,
    zIndex: 1,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: colors.primary,
    shadowColor: "#102516",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
