import { create } from "zustand";
import { type Thread } from "@/lib/repositories/types/thread.types";

interface ThreadState {
  activeThreadId: string | null;
  threads: Thread[];
  newThread: boolean;
  setActiveThreadId: (id: string | null) => void;
  setThreads: (threads: Thread[]) => void;
  addThread: (thread: Thread) => void;
  updateThread: (id: string, updatedThread: Partial<Thread>) => void;
  replaceThread: (tempId: string, savedThread: Thread) => void;
  setNewThread: (value: boolean) => void;
}

export const useThreadStore = create<ThreadState>((set) => ({
  activeThreadId: null,
  threads: [],
  newThread: false,
  setActiveThreadId: (id) => set({ activeThreadId: id }),
  setThreads: (threads) => set({ threads }),
  setNewThread: (value) => set({ newThread: value }),

  addThread: (thread) =>
    set((state) => ({
      threads: [thread, ...state.threads], // prepend new threads
    })),

  updateThread: (id, updatedThread) =>
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === id ? { ...t, ...updatedThread } : t,
      ),
    })),

  replaceThread: (tempId, savedThread) =>
    set((state) => {
      // If the replaced thread was active, update activeThreadId too
      const isActive = state.activeThreadId === tempId;
      return {
        threads: state.threads.map((t) => (t.id === tempId ? savedThread : t)),
        activeThreadId: isActive ? savedThread.id : state.activeThreadId,
      };
    }),
}));
