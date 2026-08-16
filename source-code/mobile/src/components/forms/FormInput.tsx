import React from 'react';
import { TextInput } from 'react-native';
import { c, fontMono } from '@/components/ui/demo-teacollector-theme';

export const FormInput = (props: any) => {
  const { style, ...rest } = props;

  return (
    <TextInput
      {...rest}
      style={[{
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: c.line,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        fontFamily: fontMono.fontFamily,
        color: c.ink,
      }, style]}
    />
  );
};

export default FormInput;
