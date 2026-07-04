import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

// expo-secure-store has no working implementation under expo-router's
// server-side static rendering (Node has no window/Keychain), so web
// uses localStorage directly, guarded for that SSR pass.
const webStorage: StateStorage = {
  getItem: async (name) => (typeof window === 'undefined' ? null : window.localStorage.getItem(name)),
  setItem: async (name, value) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(name, value);
  },
  removeItem: async (name) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(name);
  },
};

const nativeStorage: StateStorage = {
  getItem: async (name) => (await SecureStore.getItemAsync(name)) ?? null,
  setItem: async (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: async (name) => SecureStore.deleteItemAsync(name),
};

export const secureStorage: StateStorage = Platform.OS === 'web' ? webStorage : nativeStorage;
