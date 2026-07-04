import { Text, type TextProps } from 'react-native';

import { Fonts, FontSizes } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

export type ThemedTextVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyMedium'
  | 'label'
  | 'small';

type Props = TextProps & {
  variant?: ThemedTextVariant;
  color?: 'text' | 'textSecondary' | 'primary' | 'accent' | 'destructive' | 'onPrimary' | 'onDestructive';
};

const VARIANT_STYLE: Record<ThemedTextVariant, { fontFamily: string; fontSize: number; lineHeight: number }> = {
  display: { fontFamily: Fonts.headingExtraBold, fontSize: FontSizes.display, lineHeight: FontSizes.display * 1.2 },
  title: { fontFamily: Fonts.heading, fontSize: FontSizes.xxl, lineHeight: FontSizes.xxl * 1.2 },
  subtitle: { fontFamily: Fonts.subheading, fontSize: FontSizes.lg, lineHeight: FontSizes.lg * 1.3 },
  body: { fontFamily: Fonts.body, fontSize: FontSizes.base, lineHeight: FontSizes.base * 1.5 },
  bodyMedium: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.base, lineHeight: FontSizes.base * 1.5 },
  label: { fontFamily: Fonts.subheading, fontSize: FontSizes.sm, lineHeight: FontSizes.sm * 1.4 },
  small: { fontFamily: Fonts.body, fontSize: FontSizes.xs, lineHeight: FontSizes.xs * 1.4 },
};

export function ThemedText({ variant = 'body', color = 'text', style, ...rest }: Props) {
  const colors = useThemeColors();
  return (
    <Text
      style={[VARIANT_STYLE[variant], { color: colors[color] }, style]}
      {...rest}
    />
  );
}
