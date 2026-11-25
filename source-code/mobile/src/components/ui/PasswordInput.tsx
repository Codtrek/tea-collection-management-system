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
	showLockIcon?: boolean;
	floatingLabel?: boolean;
	compact?: boolean;
	helperText?: string;
	error?: string;
	containerStyle?: StyleProp<ViewStyle>;
	LabelStyle?: StyleProp<TextStyle>;
	helperTextStyle?: StyleProp<TextStyle>;
	errorStyle?: StyleProp<TextStyle>;
	visibilityButtonStyle?: StyleProp<ViewStyle>;
}

export default function PasswordInput({
	label,
	showLockIcon = true,
	helperText,
	error,
	containerStyle,
	LabelStyle,
	helperTextStyle,
	errorStyle,
	visibilityButtonStyle,
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
			leftIcon={showLockIcon ? "lock-outline" : undefined}
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
						visibilityButtonStyle,
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
