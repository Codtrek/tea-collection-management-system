import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = ViewProps & {
  scroll?: boolean;
};

export function ScreenContainer({ scroll = false, style, children, ...rest }: Props) {
  const colors = useThemeColors();
  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? { contentContainerStyle: [styles.scrollContent, style] }
    : { style: [styles.content, style] };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <Container {...containerProps} {...rest}>
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
