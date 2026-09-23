import { Platform } from "react-native";

export const fonts = {
  default: undefined,
  display: Platform.OS === "ios" ? "Georgia" : "serif",
} as const;