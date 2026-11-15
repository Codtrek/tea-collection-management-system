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
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
	leftIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
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
	leftIcon,
	rightAccessory,
	...props
}: AppInputProps) {
	const [isFocused, setIsFocused] = useState(false);
	const iconColor = error
		? colors.error
		: isFocused
			? colors.brandDark
			: colors.text.tertiary;

	return (
		<View style={[styles.container, containerStyle]}>
			{label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}

			<View
				style={[
					styles.inputWrapper,
					isFocused && styles.focused,
					error && styles.errorInput,
				]}
			>
				{leftIcon ? (
					<MaterialCommunityIcons
						name={leftIcon}
						size={21}
						color={iconColor}
						style={styles.leadingIcon}
					/>
				) : null}

				<TextInput
					{...props}
					underlineColorAndroid="transparent"
					selectionColor={colors.primary}
					onFocus={(event) => {
						setIsFocused(true);
						onFocus?.(event);
					}}
					onBlur={(event) => {
						setIsFocused(false);
						onBlur?.(event);
					}}
					placeholderTextColor={colors.text.placeholder}
					style={[styles.input, style]}
				/>

				{rightAccessory ? (
					<View style={styles.trailingAccessory}>{rightAccessory}</View>
				) : null}
			</View>

			{error ? (
				<View style={styles.messageRow}>
					<MaterialCommunityIcons
						name="alert-circle-outline"
						size={14}
						color={colors.error}
					/>
					<Text style={[styles.errorText, errorStyle]}>{error}</Text>
				</View>
			) : null}
			{!error && helperText ? (
				<Text style={[styles.helperText, helperTextStyle]}>{helperText}</Text>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: "100%",
		marginBottom: 18,
	},

	inputWrapper: {
		flexDirection: "row",
		width: "100%",
		alignItems: "center",
		borderWidth: 1,
		borderColor: colors.border.default,
		borderRadius: 14,
		backgroundColor: colors.white,
		minHeight: 56,
		paddingHorizontal: 14,
	},

	label: {
		marginBottom: 7,
		color: colors.text.primary,
		fontSize: 14,
		fontWeight: "600",
	},

	input: {
		flex: 1,
		paddingVertical: 15,
		color: colors.text.primary,
		fontSize: 16,
		lineHeight: 22,
		paddingHorizontal: 0,
	},

	focused: {
		borderColor: colors.primary,
		borderWidth: 2,
		backgroundColor: colors.brandSurface,
	},

	errorInput: {
		borderColor: colors.error,
		backgroundColor: "#FFF8F8",
	},

	leadingIcon: {
		marginRight: 10,
	},

	trailingAccessory: {
		marginLeft: 8,
	},

	messageRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 6,
		marginTop: 6,
	},

	helperText: {
		marginTop: 6,
		color: colors.text.secondary,
		fontSize: 12,
	},

	errorText: {
		flex: 1,
		color: colors.error,
		fontSize: 12,
		lineHeight: 16,
	},
});
