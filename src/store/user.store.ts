import { create } from "zustand";
import type { UserRecord } from "@/lib/drizzle/schema";

interface UserState {
  user: UserRecord | null;
  isLoading: boolean;
  setUser: (user: UserRecord | null) => void;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user, isLoading: false }),
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Failed to log out:", e);
    } finally {
      set({ user: null, isLoading: false });
      window.location.reload();
    }
  },
}));
