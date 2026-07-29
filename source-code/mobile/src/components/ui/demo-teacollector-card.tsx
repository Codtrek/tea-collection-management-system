import React from 'react';
import { View, StyleSheet } from 'react-native';
import { c } from './demo-teacollector-theme';

export const Card = ({ children, dark = false, style }: any) => {
  return (
    <View style={[styles.card, dark && styles.cardDark, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
  },

  cardDark: {
    backgroundColor: c.forest,
    borderColor: 'transparent',
  },
});