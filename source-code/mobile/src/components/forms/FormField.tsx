import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export const FormField = ({ label, children, style, ...props }: any) => {
  return (
    <View style={[{ marginBottom: 14 }, style]} {...props}>
      <Text style={{
        fontFamily: fonts.default,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        color: colors.text.muted,
      }}>{label}</Text>
      {children}
    </View>
  );
};

export default FormField;
