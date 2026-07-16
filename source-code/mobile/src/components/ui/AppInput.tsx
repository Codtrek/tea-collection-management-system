import { useState } from "react";
import {
	TextInput,
	TextInputProps,
	View,
	Text,
	StyleSheet,
	StyleProp,
	ViewStyle,
	TextStyle,
} from "react-native";

import { colors } from "@/theme/colors";

interface AppInputProps extends TextInputProps {
	label?: string;
	helperText?: string;
	error?: string;
	containerStyle?: StyleProp<ViewStyle>;
	labelStyle?: StyleProp<TextStyle>;
	helperTextStyle?: StyleProp<TextStyle>;
	errorStyle?: StyleProp<TextStyle>;
}

export default function AppInput({
	label,
	helperText,
	error,
	containerStyle,
	labelStyle,
	helperTextStyle,
	errorStyle,
	style,
	onFocus,
	onBlur,
	...props
}: AppInputProps) {
	const [isFocused, setIsFocused] = useState(false);

	return (
		<View style={[styles.container, containerStyle]}>
			{label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}

			<TextInput
				{...props}
				onFocus={(event) => {
					setIsFocused(true);
					onFocus?.(event);
				}}
				onBlur={(event) => {
					setIsFocused(false);
					onBlur?.(event);
				}}
				placeholderTextColor={colors.text.placeholder}
				style={[
					styles.input,
					isFocused && styles.focused,
					error && styles.errorInput,
					style,
				]}
			/>

			{error ? <Text style={[styles.errorText, errorStyle]}>{error}</Text> : null}
			{!error && helperText ? (
				<Text style={[styles.helperText, helperTextStyle]}>{helperText}</Text>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: "100%",
	},

	label: {
		marginBottom: 8,
		color: colors.text.primary,
		fontSize: 14,
		fontWeight: "600",
	},

	input: {
		minHeight: 52,
		borderWidth: 1,
		borderColor: colors.border.default,
		borderRadius: 12,
		backgroundColor: colors.surface,
		paddingHorizontal: 16,
		paddingVertical: 14,
		color: colors.text.primary,
		fontSize: 16,
	},

	focused: {
		borderColor: colors.primary,
	},

	errorInput: {
		borderColor: colors.error,
	},

	helperText: {
		marginTop: 6,
		color: colors.text.secondary,
		fontSize: 12,
	},

	errorText: {
		marginTop: 6,
		color: colors.error,
		fontSize: 12,
	},
});
