import { View, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { AppText, Screen } from '@/components/ui'
import { userRoles } from '@/data/userRoles'
import { typography, colors, spacing } from '@/theme'

export default function SelectRoleScreen() {
  const router = useRouter()

  return (
    <Screen style={styles.container}>
      <AppText style={styles.pageTitle}>Select Your Role</AppText>
      {userRoles.map((role) => (
        <Pressable
          key={role.id}
          style={styles.roleContainer}
          onPress={() => router.push(role.route)}
        >
          <AppText style={styles.userRoleTitle}>{role.role}</AppText>
          <AppText>{role.description}</AppText>
        </Pressable>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleContainer: {
    width: '100%',
    marginVertical: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  userRoleTitle: {
    ...typography.subheading,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  pageTitle: {
    ...typography.heading,
    color: colors.black,
    marginBottom: spacing.lg,
  }

})