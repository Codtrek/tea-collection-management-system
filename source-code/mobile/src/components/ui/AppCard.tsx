import { View, ViewStyle, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { AppText, Screen } from '@/components/ui'
import { typography, colors, spacing } from '@/theme' 


export default function AppCard({ children }: { children: React.ReactNode }) {
    return (
        <View style={[styles.cardContainer]}>
            {children}
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