import { TextInputProps, StyleProp, ViewStyle, TextStyle } from "react-native";

import AppInput from "@/components/ui/AppInput";

interface FormTextInputProps extends TextInputProps {
	label?: string;
	helperText?: string;
	error?: string;
	containerStyle?: StyleProp<ViewStyle>;
	labelStyle?: StyleProp<TextStyle>;
	helperTextStyle?: StyleProp<TextStyle>;
	errorStyle?: StyleProp<TextStyle>;
}

export default function FormTextInput({
	label,
	helperText,
	error,
	containerStyle,
	labelStyle,
	helperTextStyle,
	errorStyle,
	...props
}: FormTextInputProps) {
	return (
		<AppInput
			{...props}
			label={label}
			helperText={helperText}
			error={error}
			containerStyle={containerStyle}
			labelStyle={labelStyle}
			helperTextStyle={helperTextStyle}
			errorStyle={errorStyle}
		/>
	);
}
