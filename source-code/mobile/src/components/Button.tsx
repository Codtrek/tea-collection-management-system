import { ActivityIndicator, Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

import { ThemedText } from './ThemedText';

type Variant = 'primary' | 'secondary' | 'outline' | 'destructive';

type Props = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
}: Props) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  const backgroundColor: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.muted,
    outline: 'transparent',
    destructive: colors.destructive,
  };
  const textColor: Record<Variant, 'onPrimary' | 'text' | 'primary' | 'onDestructive'> = {
    primary: 'onPrimary',
    secondary: 'text',
    outline: 'primary',
    destructive: 'onDestructive',
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: backgroundColor[variant],
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: colors.primary,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primary} />
      ) : (
        <ThemedText variant="subtitle" color={textColor[variant]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TouchTarget.min,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
