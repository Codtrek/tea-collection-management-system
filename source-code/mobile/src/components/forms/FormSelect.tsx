import React from 'react';
import { View, TextInput } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export const FormSelect = ({ value, onChange, placeholder, style, ...props }: any) => {
  return (
    <View style={[{
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border.default,
      backgroundColor: colors.background,
      overflow: 'hidden',
    }, style]} {...props}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        style={{
          fontFamily: fonts.default,
          fontSize: 15,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: value ? colors.text.primary : colors.text.muted,
        }}
      />
    </View>
  );
};

export default FormSelect;
