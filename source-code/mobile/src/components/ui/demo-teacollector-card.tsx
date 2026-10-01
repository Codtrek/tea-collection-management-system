import React from 'react';
import { View, StyleSheet } from 'react-native';


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
    borderWidth: 1,

  },

  cardDark: {
    borderColor: 'transparent',
  },
});