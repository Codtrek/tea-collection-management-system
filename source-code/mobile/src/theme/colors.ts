import { ImageBackground } from "react-native";

export const colors = {
  // Brand
  primary: "#53CF81",
  charcoal: "#111827",
  charcoalSecondary: "#4B5563",
  successTint: "#EAF8EF",
  errorTint: "#FEF2F2",
  assignedTint: "#F3F4F6",
  unassignedTint: "#FEF3C7",
  pressedGreen: "#4BC779",
  focusOffset: "#FFFFFF",
  toastRadius: 16,
  toastShadow: "rgba(17,24,39,0.10)",
  brandDark: "#1B8B4E",
  brandSurface: "#EDF8F1",
  brandBorder: "#CAEBD5",

  // Backgrounds
  background: "#FFFFFF",
  backgroundGray: "#eeeeee",
  surface: "#F9FAFB",
  ImageBackground: "#d8dde2",
  overlay: "#00000080",

  // Text
  text: {
    primaryGreen: "#53CF81",
    primary: "#101807",
    secondary: "#4B5563",
    tertiary: "#6B7280",
    placeholder: "#9CA3AF",
    disabled: "#D1D5DB",
    inverse: "#FFFFFF",
    muted: "#6B7263",
  },

  // Borders
  border: {
    default: "#D1D5DB",
    light: "#E5E7EB",
    focused: "#53CF81",
  },

  // Status
  success: "#16A34A",
  error: "#DC2626",
  warning: "#F59E0B",

  // Status backgrounds
  successBackground: "#DCFCE7",
  errorBackground: "#FEE2E2",
  warningBackground: "#FEF3C7",

  // Common
  white: "#FFFFFF",
  black: "#000000",

  disabled: "#D1D5DB",
} as const;
