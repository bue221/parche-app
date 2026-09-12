import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'parche.onboarding.v1';

type OnboardingState = {
  seen: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  complete: () => void;
};

export const useOnboarding = create<OnboardingState>((set) => ({
  seen: Platform.OS === 'web',
  hydrated: Platform.OS === 'web',
  hydrate: async () => {
    if (Platform.OS === 'web') {
      set({ seen: true, hydrated: true });
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(KEY);
      set({ seen: raw === '1', hydrated: true });
    } catch {
      set({ seen: false, hydrated: true });
    }
  },
  complete: () => {
    set({ seen: true });
    void AsyncStorage.setItem(KEY, '1').catch(() => undefined);
  },
}));
