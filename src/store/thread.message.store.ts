import { create } from "zustand";
import { type ThreadMessage } from "@/lib/repositories/types/thread.message.types";

interface ThreadMessageState {
  messagesByThread: Record<string, ThreadMessage[]>;
  addMessage: (message: ThreadMessage) => void;
  deleteMessage: (threadId: string, id: string) => void;
  updateMessage: (threadId: string, id: string, updatedMessage: Partial<ThreadMessage>) => void;
  replaceMessage: (threadId: string, tempId: string, savedMessage: ThreadMessage) => void;
  setMessages: (threadId: string, messages: ThreadMessage[]) => void;
}

export const useThreadMessageStore = create<ThreadMessageState>((set) => ({
  messagesByThread: {},

  addMessage: (message) =>
    set((state) => {
      const threadId = message.thread_id;
      const currentMessages = state.messagesByThread[threadId] || [];
      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: [...currentMessages, message],
        },
      };
    }),

  deleteMessage: (threadId, id) =>
    set((state) => {
      const currentMessages = state.messagesByThread[threadId] || [];
      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: currentMessages.filter((m) => m.id !== id),
        },
      };
    }),

  updateMessage: (threadId, id, updatedMessage) =>
    set((state) => {
      const currentMessages = state.messagesByThread[threadId] || [];
      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: currentMessages.map((m) =>
            m.id === id ? { ...m, ...updatedMessage } : m
          ),
        },
      };
    }),

  replaceMessage: (threadId, tempId, savedMessage) =>
    set((state) => {
      const currentMessages = state.messagesByThread[threadId] || [];
      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: currentMessages.map((m) =>
            m.id === tempId ? { ...m, ...savedMessage, id: m.id, content: m.content } : m
          ),
        },
      };
    }),

  setMessages: (threadId, messages) =>
    set((state) => {
      const currentMessages = state.messagesByThread[threadId] || [];
      // Preserve any temporary messages (e.g., actively streaming ones) that aren't in the DB yet
      const tempMessages = currentMessages.filter((m) => m.id.startsWith("temp-"));
      
      // We assume `messages` from DB doesn't contain these temp messages.
      // We simply append the temp messages to the end of the DB messages.
      // Or rather, we should deduplicate just in case.
      const dbMessageIds = new Set(messages.map((m) => m.id));
      const tempMessagesToKeep = tempMessages.filter((m) => !dbMessageIds.has(m.id));

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: [...messages, ...tempMessagesToKeep],
        },
      };
    }),
}));
