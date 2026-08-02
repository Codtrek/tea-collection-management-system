import { View, ViewStyle, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { AppText, Screen } from '@/components/ui'
import { typography, colors, spacing } from '@/theme' 

interface AppCardProps {
    title: string;
    description: string;
    style?: ViewStyle;
    onPress: () => void;
}

export default function AppCard({ title, description, style, onPress } : AppCardProps) {
    return (
        <View style={[styles.cardContainer, style]}>
            <Pressable onPress={onPress}>
                <AppText style={styles.cardTitle}>{title}</AppText>
                <AppText style={styles.cardDescription}>{description}</AppText>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    cardContainer: {
        width: '100%',
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.default,
        borderRadius: 10,
        marginVertical: spacing.sm,
    },
    cardTitle: {
        ...typography.subheading,
        color: colors.primary,
        marginBottom: spacing.sm,
    },
    cardDescription: {
        ...typography.body,
        color: colors.text.secondary,
    },  
})