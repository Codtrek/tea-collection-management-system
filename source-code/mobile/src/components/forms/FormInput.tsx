import React from 'react';
import { TextInput } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export const FormInput = (props: any) => {
  const { style, ...rest } = props;

  return (
    <TextInput
      {...rest}
      style={[{
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.border.default,
        backgroundColor: colors.background,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        fontFamily: fonts.default,
        color: colors.text.primary,
      }, style]}
    />
  );
};

export default FormInput;
