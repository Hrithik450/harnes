import { create } from "zustand";

interface ConnectorState {
  isModalOpen: boolean;
  activeConfigProvider: string | null;
  openModal: () => void;
  closeModal: () => void;
  openConfig: (provider: string) => void;
  closeConfig: () => void;
}

export const useConnectorStore = create<ConnectorState>((set) => ({
  isModalOpen: false,
  activeConfigProvider: null,
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false, activeConfigProvider: null }),
  openConfig: (provider: string) =>
    set({ isModalOpen: true, activeConfigProvider: provider }),
  closeConfig: () => set({ activeConfigProvider: null }),
}));
