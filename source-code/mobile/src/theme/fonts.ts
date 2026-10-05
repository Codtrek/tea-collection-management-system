import { Platform } from "react-native";

export const fonts = {
   default: Platform.OS === "ios" ? "System" : "sans-serif",
  display: Platform.OS === "ios" ? "System" : "sans-serif",
} as const;