/**
 * Design tokens for the Tea Collection Management System mobile app.
 * Palette: earth-green + harvest-gold, WCAG-checked for outdoor/field-worker legibility.
 * Typography: Plus Jakarta Sans (single family, strong Dynamic Type / Android scaling support).
 */

export const Colors = {
  light: {
    primary: '#15803D',
    onPrimary: '#FFFFFF',
    secondary: '#22C55E',
    onSecondary: '#0F172A',
    accent: '#A16207',
    onAccent: '#FFFFFF',
    background: '#F0FDF4',
    foreground: '#14532D',
    card: '#FFFFFF',
    cardForeground: '#14532D',
    muted: '#E8F0F1',
    mutedForeground: '#64748B',
    border: '#BBF7D0',
    destructive: '#DC2626',
    onDestructive: '#FFFFFF',
    ring: '#15803D',
    text: '#14532D',
    textSecondary: '#64748B',
  },
  dark: {
    primary: '#4ADE80',
    onPrimary: '#052E16',
    secondary: '#22C55E',
    onSecondary: '#052E16',
    accent: '#EAB308',
    onAccent: '#1C1917',
    background: '#0B1512',
    foreground: '#ECFDF5',
    card: '#132018',
    cardForeground: '#ECFDF5',
    muted: '#1C2B22',
    mutedForeground: '#94A3B8',
    border: '#22392C',
    destructive: '#F87171',
    onDestructive: '#450A0A',
    ring: '#4ADE80',
    text: '#ECFDF5',
    textSecondary: '#94A3B8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  heading: 'PlusJakartaSans_700Bold',
  headingExtraBold: 'PlusJakartaSans_800ExtraBold',
  subheading: 'PlusJakartaSans_600SemiBold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
} as const;

export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,
  display: 32,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const TouchTarget = {
  min: 44,
} as const;

export const BottomTabInset = 0;
export const MaxContentWidth = 800;
