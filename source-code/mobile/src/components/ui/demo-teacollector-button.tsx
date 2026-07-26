import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { c } from './demo-teacollector-theme';

export const Btn = ({
  variant = 'primary',
  small = false,
  block = false,
  disabled = false,
  children,
  onPress,
  style,
  textStyle,
}: any) => {
  const variantStyles: Record<string, any> = {
    primary: styles.primaryBtn,
    danger: styles.dangerBtn,
    forest: styles.forestBtn,
    ghost: styles.ghostBtn,
    secondary: styles.secondaryBtn,
  };

  const variantTextStyles: Record<string, any> = {
    primary: styles.primaryBtnText,
    danger: styles.dangerBtnText,
    forest: styles.forestBtnText,
    ghost: styles.ghostBtnText,
    secondary: styles.secondaryBtnText,
  };

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.85}
      disabled={disabled}
      style={[
        styles.btn,
        small ? styles.btnSmall : styles.btnRegular,
        block && styles.btnBlock,
        variantStyles[variant] || styles.primaryBtn,
        disabled && styles.btnDisabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.btnText,
          variantTextStyles[variant] || styles.primaryBtnText,
          textStyle,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnRegular: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  btnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  btnBlock: {
    width: '100%',
  },

  btnDisabled: {
    opacity: 0.6,
  },

  primaryBtn: {
    backgroundColor: c.forest,
  },

  primaryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  dangerBtn: {
    backgroundColor: c.rust,
  },

  dangerBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  forestBtn: {
    backgroundColor: c.forestLight,
  },

  forestBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  ghostBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.2,
    borderColor: c.line,
  },

  ghostBtnText: {
    color: c.forestDeep,
    fontWeight: '600',
  },

  secondaryBtn: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
  },

  secondaryBtnText: {
    color: c.ink,
    fontWeight: '600',
  },

  btnText: {
    fontSize: 15,
  },
});