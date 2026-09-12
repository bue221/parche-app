import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'parche.theme';

type ThemeState = {
  pref: ThemePref;
  hydrated: boolean;
  setPref: (pref: ThemePref) => void;
  hydrate: () => Promise<void>;
};

export const useThemePref = create<ThemeState>((set) => ({
  pref: 'system',
  hydrated: false,
  setPref: (pref) => {
    set({ pref });
    void AsyncStorage.setItem(KEY, pref).catch(() => undefined);
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') {
        set({ pref: raw, hydrated: true });
        return;
      }
    } catch {
      /* keep system */
    }
    set({ hydrated: true });
  },
}));
