import { create } from 'zustand';

type AuthSheetState = {
  visible: boolean;
  onSuccess: (() => void) | null;
  open: (onSuccess?: () => void) => void;
  close: () => void;
};

export const useAuthSheet = create<AuthSheetState>((set) => ({
  visible: false,
  onSuccess: null,
  open: (onSuccess) => set({ visible: true, onSuccess: onSuccess ?? null }),
  close: () => set({ visible: false, onSuccess: null }),
}));
