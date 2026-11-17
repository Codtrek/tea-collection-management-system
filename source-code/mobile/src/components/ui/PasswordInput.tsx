import {useState} from "react";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {
	Pressable,
	StyleProp,
	StyleSheet,
	TextInputProps,
	ViewStyle,
	TextStyle
} from "react-native";

import { colors } from "@/theme/colors";
import AppInput from "./AppInput";


interface PasswordInputProps extends TextInputProps {
	label?: string;
	helperText?: string;
	error?: string;
	containerStyle?: StyleProp<ViewStyle>;
	LabelStyle?: StyleProp<TextStyle>;
	helperTextStyle?: StyleProp<TextStyle>;
	errorStyle?: StyleProp<TextStyle>;
}

export default function PasswordInput({
	label,
	helperText,
	error,
	containerStyle,
	LabelStyle,
	helperTextStyle,
	errorStyle,
	...props
}: PasswordInputProps) {
	const [isPasswordVisible, setIsPasswordVisible] = useState(false)

	function togglePasswordVisibility() {
		setIsPasswordVisible(!isPasswordVisible)
	}

	return (
		
		<AppInput
			{...props}
			label={label}
			leftIcon="lock-outline"
			secureTextEntry={!isPasswordVisible}
			helperText={helperText}
			error={error}
			containerStyle={containerStyle}
			labelStyle={LabelStyle}
			helperTextStyle={helperTextStyle}
			errorStyle={errorStyle}
			rightAccessory={
				<Pressable
					onPress={togglePasswordVisibility}
					accessibilityRole="button"
					accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
					hitSlop={4}
					style={({ pressed }) => [
						styles.visibilityButton,
						pressed && styles.visibilityButtonPressed,
					]}
				>
					<MaterialCommunityIcons
						name={isPasswordVisible ? "eye-off" : "eye"}
						size={22}
						color={colors.text.secondary}
					/>
				</Pressable>
			}
		/>
		
	)

}

const styles = StyleSheet.create({
	visibilityButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},

	visibilityButtonPressed: {
		backgroundColor: colors.brandBorder,
	},
})
