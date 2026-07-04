import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const user = useAuthStore((state) => state.user);
  return <Redirect href={user ? '/(app)' : '/(auth)/login'} />;
}
