import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AppText from "./AppText";
import { colors } from "@/theme/colors";

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  accessibilityLabel: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  value?: string;
}

export default function Dropdown({
  accessibilityLabel,
  options,
  onChange,
  placeholder = "Select an option",
  value,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(true)}
        style={styles.trigger}
      >
        <AppText
          numberOfLines={1}
          style={[
            styles.triggerText,
            !selectedOption && styles.placeholder,
          ]}
        >
          {selectedOption?.label ?? placeholder}
        </AppText>
        <AppText style={styles.chevron}>▼</AppText>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close dropdown"
            onPress={() => setIsOpen(false)}
            style={styles.backdrop}
          />
          <View
            accessibilityLabel={`${accessibilityLabel} options`}
            style={styles.menu}
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={option.value}
                  onPress={() => selectOption(option.value)}
                  style={[
                    styles.option,
                    isSelected && styles.selectedOption,
                  ]}
                >
                  <AppText
                    style={[
                      styles.optionText,
                      isSelected && styles.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  triggerText: {
    flex: 1,
    color: colors.text.primary,
  },
  placeholder: {
    color: colors.text.placeholder,
  },
  chevron: {
    color: colors.text.secondary,
    fontSize: 10,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  menu: {
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.white,
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  option: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  selectedOption: {
    backgroundColor: colors.brandSurface,
  },
  optionText: {
    color: colors.text.primary,
  },
  selectedOptionText: {
    color: colors.brandDark,
    fontWeight: "600",
  },
});
