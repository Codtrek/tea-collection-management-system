import { useState } from "react";
import {
	View,
	TextInputProps,
	TextInput,
	Text,
	StyleSheet,
	StyleProp,
	ViewStyle,
	TextStyle,
} from "react-native";

// import {TextInput} from "react-native-paper";

import { colors } from "@/theme/colors";

interface AppInputProps extends TextInputProps {
	label?: string;
	helperText?: string;
	error?: string;
	containerStyle?: StyleProp<ViewStyle>;
	labelStyle?: StyleProp<TextStyle>;
	helperTextStyle?: StyleProp<TextStyle>;
	errorStyle?: StyleProp<TextStyle>;
	rightAccessory?: React.ReactNode;
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
	rightAccessory,
	...props
}: AppInputProps) {
	const [isFocused, setIsFocused] = useState(false);

	return (
		<View style={[styles.container, containerStyle]}>
			{label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}

			<View style={[
				styles.inputWrapper
				, isFocused && styles.focused
				, error && styles.errorInput
			]}>
				<TextInput
					{...props}
					underlineColorAndroid="transparent"
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
						styles.input
					]}
				/>

				{rightAccessory}


			</View>


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
		marginBottom: 16,
	},

	inputWrapper: {
		flexDirection: "row",
		width: "100%",
		alignItems: "center",
		borderWidth: 1,
		borderColor: colors.border.default,
		borderRadius: 12,
		backgroundColor: colors.surface,
		minHeight: 52,
		paddingHorizontal: 12,	
	},

	label: {
		marginBottom: 8,
		color: colors.text.primary,
		fontSize: 14,
		fontWeight: "600",
	},

	input: {
		flex: 1,
		paddingVertical: 14,
		color: colors.text.primary,
		fontSize: 16,
		paddingHorizontal: 0,
	},

	focused: {
		borderColor: colors.border.focused,
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
