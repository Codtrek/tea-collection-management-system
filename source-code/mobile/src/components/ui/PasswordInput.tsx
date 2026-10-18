import {useState} from "react";
import {MaterialCommunityIcons, MaterialIcons} from "@expo/vector-icons";
import {
	Pressable,
	StyleProp,
	StyleSheet,
	View,
	Text,
	TextInputProps,
	ViewStyle,
	TextStyle
} from "react-native";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
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
			secureTextEntry={!isPasswordVisible}
			helperText={helperText}
			error={error}
			containerStyle={containerStyle}
			labelStyle={LabelStyle}
			helperTextStyle={helperTextStyle}
			errorStyle={errorStyle}
			rightAccessory={
				<Pressable onPress={togglePasswordVisibility}>
					<MaterialCommunityIcons
						name={isPasswordVisible ? "eye-off" : "eye"}
						size={24}
						color="gray"
					/>
				</Pressable>
			}
		/>
		
	)

}

const styles = StyleSheet.create({
	
})