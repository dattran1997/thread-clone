import { create } from "zustand";

interface NotificationStore {
  unreadCount: number;
  unreadMessages: number;
  setUnreadCount: (n: number) => void;
  setUnreadMessages: (n: number) => void;
  incrementUnread: () => void;
  incrementMessages: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  unreadCount: 0,
  unreadMessages: 0,

  setUnreadCount: (n) => set({ unreadCount: n }),
  setUnreadMessages: (n) => set({ unreadMessages: n }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  incrementMessages: () => set((s) => ({ unreadMessages: s.unreadMessages + 1 })),
  clearAll: () => set({ unreadCount: 0, unreadMessages: 0 }),
}));
