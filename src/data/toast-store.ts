import { create } from 'zustand';

export type ToastTone = 'error' | 'success' | 'info';

export type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastState = {
  items: ToastItem[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (message, tone = 'error') => {
    const text = message.trim();
    if (!text) return;
    const id = nextId++;
    set((s) => ({ items: [...s.items.slice(-3), { id, message: text, tone }] }));
    setTimeout(() => {
      useToastStore.getState().dismiss(id);
    }, 4200);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((item) => item.id !== id) })),
}));

export function toast(message: string, tone: ToastTone = 'error') {
  useToastStore.getState().push(message, tone);
}
