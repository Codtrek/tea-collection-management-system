import { useColorScheme } from "@/hooks/use-color-scheme";

import { colors as lightColors } from "@/theme/colors";

const darkTheme = {
	background: "#0F172A",
	surface: "#111827",
	textPrimary: "#F9FAFB",
	textSecondary: "#D1D5DB",
	textMuted: "#9CA3AF",
	placeholder: "#6B7280",
	border: "#374151",
	primary: lightColors.primary,
	error: lightColors.error,
	inverse: "#FFFFFF",
};

const lightTheme = {
	background: lightColors.background,
	surface: lightColors.surface,
	textPrimary: lightColors.text.primary,
	textSecondary: lightColors.text.secondary,
	textMuted: lightColors.text.tertiary,
	placeholder: lightColors.text.placeholder,
	border: lightColors.border.default,
	primary: lightColors.primary,
	error: lightColors.error,
	inverse: lightColors.white,
};

export function useTheme() {
	const colorScheme = useColorScheme();
	const isDark = colorScheme === "dark";

	return {
		colorScheme,
		isDark,
		colors: isDark ? darkTheme : lightTheme,
	};
}

