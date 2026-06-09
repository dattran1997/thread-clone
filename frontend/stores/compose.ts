import { create } from "zustand";

interface ComposeStore {
  isOpen: boolean;
  /** Optional parentId for replying to a thread */
  parentId: string | null;
  open: (parentId?: string) => void;
  close: () => void;
}

export const useComposeStore = create<ComposeStore>()((set) => ({
  isOpen: false,
  parentId: null,
  open: (parentId) => set({ isOpen: true, parentId: parentId ?? null }),
  close: () => set({ isOpen: false, parentId: null }),
}));
