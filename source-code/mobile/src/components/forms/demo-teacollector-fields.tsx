import React from "react";
import { View, Text, TextInput } from "react-native";
import { c, fontMono } from "@/components/ui/demo-teacollector-theme";

export const Select = ({ value, onChange, placeholder, options }: any) => {
  return (
    <View style={{
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.line,
      backgroundColor: "#fff",
      overflow: 'hidden',
    }}>
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

export const Field = ({ label, children }: any) => {
  return (
    <View style={{ marginBottom: 14 }}>
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

export const Input = (props: any) => {
  return (
    <TextInput
      {...props}
      style={[{
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: c.line,
        backgroundColor: "#fff",
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        fontFamily: fontMono.fontFamily,
        color: c.ink,
      }, props.style]}
    />
  );
};
