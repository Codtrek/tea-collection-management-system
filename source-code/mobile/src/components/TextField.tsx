import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Fonts, FontSizes, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

import { ThemedText } from './ThemedText';

type Props = TextInputProps & {
  label: string;
  error?: string;
  isPassword?: boolean;
};

export function TextField({ label, error, isPassword, style, ...rest }: Props) {
  const colors = useThemeColors();
  const [secure, setSecure] = useState(isPassword);

  return (
    <View style={styles.container}>
      <ThemedText variant="label" color="textSecondary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.inputRow,
          { borderColor: error ? colors.destructive : colors.border, backgroundColor: colors.card },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text, fontFamily: Fonts.body }, style]}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={secure}
          autoCapitalize="none"
          {...rest}
        />
        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secure ? 'Show password' : 'Hide password'}
            hitSlop={12}
            onPress={() => setSecure((prev) => !prev)}
            style={styles.iconButton}
          >
            <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>
      {error ? (
        <ThemedText variant="small" color="destructive">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    minHeight: TouchTarget.min,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.base,
    paddingVertical: Spacing.two,
  },
  iconButton: {
    minWidth: TouchTarget.min - 12,
    minHeight: TouchTarget.min - 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
