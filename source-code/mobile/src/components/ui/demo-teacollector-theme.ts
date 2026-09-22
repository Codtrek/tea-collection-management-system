import { Platform } from "react-native";

export const c = {
  forest: "#1F3D2B",
  forestDeep: "#152A1E",
  forestLight: "#3C6247",
  mist: "#F4F1E8",
  card: "#FDFBF5",
  amber: "#C68A2E",
  amberDeep: "#9C6A1C",
  rust: "#AE4530",
  sage: "#8A9C7E",
  sageDeep: "#5F7454",
  gold: "#D9B45C",
  line: "#E4DFD0",
  ink: "#20241C",
  muted: "#6B7263",
};

export const fontDisplay = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };
export const fontMono = { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' };
