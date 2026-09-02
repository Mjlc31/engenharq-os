import { create } from "zustand";

interface AppState {
  isOnline: boolean;
  setOnline: (status: boolean) => void;
  // TODO: Fila offline
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  setOnline: (status) => set({ isOnline: status }),
}));
