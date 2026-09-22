import React from 'react';
import { View, TextInput } from 'react-native';
import { c, fontMono } from '@/components/ui/demo-teacollector-theme';

export const FormSelect = ({ value, onChange, placeholder, style, ...props }: any) => {
  return (
    <View style={[{
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.line,
      backgroundColor: '#fff',
      overflow: 'hidden',
    }, style]} {...props}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        style={{
          fontFamily: fontMono.fontFamily,
          fontSize: 15,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: value ? c.ink : c.muted,
        }}
      />
    </View>
  );
};

export default FormSelect;
