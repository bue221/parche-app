import { create } from 'zustand';

type CreateEventGateState = {
  visible: boolean;
  open: () => void;
  close: () => void;
};

export const useCreateEventGate = create<CreateEventGateState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
