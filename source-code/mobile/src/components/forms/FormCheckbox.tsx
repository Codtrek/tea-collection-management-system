import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";

interface FormCheckboxProps {
  label?: string;
  checked: boolean;
  onValueChange: (checked: boolean) => void;

  disabled?: boolean;

  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export default function FormCheckbox({
  label,
  checked,
  onValueChange,
  disabled = false,
  containerStyle,
  labelStyle,
}: FormCheckboxProps) {
  return (
    <Pressable
      style={[styles.container, containerStyle]}
      onPress={() => {
        if (!disabled) {
          onValueChange(!checked);
        }
      }}
    >
      <View
        style={[
          styles.checkbox,
          checked && styles.checked,
          disabled && styles.disabled,
        ]}
      >
        {checked && (
          <Ionicons
            name="checkmark"
            size={16}
            color={colors.white}
          />
        )}
      </View>

      {label && (
        <Text
          style={[
            styles.label,
            disabled && styles.disabledLabel,
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
  },

  checked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  label: {
    marginLeft: 10,
    color: colors.text.primary,
    fontSize: 16,
  },

  disabled: {
    opacity: 0.5,
  },

  disabledLabel: {
    color: colors.text.disabled,
  },
});