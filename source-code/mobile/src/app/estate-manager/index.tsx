import { StyleSheet } from 'react-native'
import { AppText, Screen } from '@/components/ui'

export default function EstateManagerHome() {
  return (
    <Screen style={styles.container}>
      <AppText variant="heading">Estate Manager</AppText>
      <AppText>Manager dashboard coming soon.</AppText>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
})
