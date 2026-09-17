import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontDisplay, fontMono } from './demo-teacollector-theme';
import { colors } from '@/theme/colors';

export const AppBar = ({ eyebrow, title, dark = false, sub }: any) => {
  return (
    <View style={styles.appBar}>

      {eyebrow && (
        <Text style={[styles.eyebrow, dark && styles.eyebrowDark]}>
          {eyebrow}
        </Text>
      )}

      <Text style={[styles.title, dark && styles.titleDark]}>
        {title}
      </Text>

      {sub && (
        <View style={styles.subRow}>
          {sub.map((item: string, index: number) => (
            <Text
              key={`${item}-${index}`}
              style={[styles.subText, dark && styles.subTextDark]}
            >
              {item}
            </Text>
          ))}
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({

  appBar: {
    height: 90,
    paddingHorizontal: 20,
    paddingTop: 18,
    backgroundColor: colors.surface,
  },

  eyebrow: {
    fontFamily: fontMono.fontFamily,
    fontSize: 11,
    color: colors.text.primaryGreen,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  eyebrowDark: {
    color: colors.text.primaryGreen,
  },

  title: {
    fontFamily: fontDisplay.fontFamily,
    fontWeight: '700',
    fontSize: 22,
    color: colors.text.primary,
    marginTop: 2,
  },

  titleDark: {
    color: colors.text.primary,
  },

  subRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },

  subText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginRight: 10,
  },

  subTextDark: {
    color: colors.text.secondary,
  },

});