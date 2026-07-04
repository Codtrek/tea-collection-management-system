import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { authService } from '@/services';
import type { User } from '@/types/user';

import { secureStorage } from './secureStorage';

type AuthState = {
  user: User | null;
  hasHydrated: boolean;
  isSubmitting: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      isSubmitting: false,
      error: null,
      login: async (phone, password) => {
        set({ isSubmitting: true, error: null });
        const result = await authService.login(phone, password);
        if (!result.ok) {
          set({ isSubmitting: false, error: result.error });
          return false;
        }
        set({ isSubmitting: false, user: result.user, error: null });
        return true;
      },
      logout: () => set({ user: null, error: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'tea-collection-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ user: state.user }) as unknown as AuthState,
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);
