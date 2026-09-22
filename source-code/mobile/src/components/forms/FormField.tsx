import React from 'react';
import { View, Text } from 'react-native';
import { c } from '@/components/ui/demo-teacollector-theme';

export const FormField = ({ label, children, style, ...props }: any) => {
  return (
    <View style={[{ marginBottom: 14 }, style]} {...props}>
      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        color: c.muted,
      }}>{label}</Text>
      {children}
    </View>
  );
};

export default FormField;
