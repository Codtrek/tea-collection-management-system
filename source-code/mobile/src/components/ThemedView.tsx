import { View, type ViewProps } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

type Props = ViewProps & {
  variant?: 'background' | 'card' | 'muted';
};

export function ThemedView({ variant = 'background', style, ...rest }: Props) {
  const colors = useThemeColors();
  const backgroundColor =
    variant === 'card' ? colors.card : variant === 'muted' ? colors.muted : colors.background;
  return <View style={[{ backgroundColor }, style]} {...rest} />;
}
