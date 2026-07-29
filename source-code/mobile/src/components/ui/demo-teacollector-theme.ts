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

export const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: "#FBEFD8", fg: c.amberDeep, label: "Pending" },
  accepted: { bg: "#E3EEE0", fg: c.sageDeep, label: "Accepted" },
  loaded: { bg: "#DCEAE1", fg: c.forest, label: "Loaded" },
  delivered: { bg: "#D8E8DD", fg: c.forestDeep, label: "Delivered" },
  cancelled: { bg: "#F5E1DC", fg: c.rust, label: "Cancelled" },
  waiting: { bg: "#FBEFD8", fg: c.amberDeep, label: "Waiting" },
  mismatch: { bg: "#F5E1DC", fg: c.rust, label: "Mismatch reported" },
  confirmed: { bg: "#E3EEE0", fg: c.sageDeep, label: "Confirmed" },
};
