import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { Btn } from './demo-teacollector-button';

interface ConfirmationWarningProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  intent?: 'warning' | 'success';
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmationWarning({
  visible,
  title,
  message,
  confirmLabel,
  intent = 'warning',
  onCancel,
  onConfirm,
}: ConfirmationWarningProps) {
  const isSuccess = intent === 'success';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss confirmation"
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />
        <View
          accessibilityRole="alert"
          style={styles.dialog}
        >
          <View style={[styles.iconContainer, isSuccess && styles.successIconContainer]}>
            <Ionicons
              name={isSuccess ? 'checkmark-circle-outline' : 'warning-outline'}
              size={28}
              color={isSuccess ? colors.success : colors.warning}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Btn variant="ghost" block onPress={onCancel}>Go back</Btn>
            </View>
            <View style={styles.action}>
              <Btn
                variant={isSuccess ? 'primary' : 'danger'}
                block
                onPress={onConfirm}
              >
                {confirmLabel}
              </Btn>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(16, 24, 7, 0.48)',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: 24,
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 28,
    backgroundColor: colors.warningBackground,
  },
  successIconContainer: {
    backgroundColor: colors.successBackground,
  },
  title: {
    color: colors.text.primary,
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: colors.text.secondary,
    fontFamily: fonts.default,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  action: {
    flex: 1,
  },
});