import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

import { ThemedText } from './ThemedText';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
};

export function EmptyState({ icon, title, description }: Props) {
  const colors = useThemeColors();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.mutedForeground} />
      <ThemedText variant="subtitle" style={styles.centerText}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText variant="body" color="textSecondary" style={styles.centerText}>
          {description}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
});
