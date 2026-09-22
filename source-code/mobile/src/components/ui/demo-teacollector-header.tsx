import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontDisplay, fontMono } from './demo-teacollector-theme';
import { colors } from '@/theme/colors';

export const AppBar = ({ eyebrow, title, dark = false, sub, onProfilePress }: any) => {
  return (
    <View style={styles.appBar}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          {eyebrow && (
            <Text style={[styles.eyebrow, dark && styles.eyebrowDark]}>
              {eyebrow}
            </Text>
          )}

          <Text style={[styles.title, dark && styles.titleDark]}>
            {title}
          </Text>
        </View>

        {onProfilePress && (
          <Pressable
            onPress={onProfilePress}
            style={styles.profileButton}
            accessibilityLabel="Open profile"
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.text.primary} />
          </Pressable>
        )}
      </View>

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
    minHeight: 90,
    paddingHorizontal: 20,
    paddingTop: 18,
    backgroundColor: colors.surface,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  headerTextWrap: {
    flex: 1,
  },

  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 139, 78, 0.08)',
    marginTop: 4,
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