import { create } from 'zustand';

type AuthSheetState = {
  visible: boolean;
  bootPrompted: boolean;
  onSuccess: (() => void) | null;
  open: (onSuccess?: () => void) => void;
  close: () => void;
  markBootPrompted: () => void;
};

export const useAuthSheet = create<AuthSheetState>((set) => ({
  visible: false,
  bootPrompted: false,
  onSuccess: null,
  open: (onSuccess) => set({ visible: true, onSuccess: onSuccess ?? null }),
  close: () => set({ visible: false, onSuccess: null }),
  markBootPrompted: () => set({ bootPrompted: true }),
}));
