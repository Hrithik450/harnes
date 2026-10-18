import { create } from "zustand";
import { type ThreadMessage } from "@/lib/repositories/types/thread.message.types";

interface ThreadMessageState {
  messagesByThread: Record<string, ThreadMessage[]>;
  addMessage: (message: ThreadMessage) => void;
  deleteMessage: (threadId: string, id: string) => void;
  updateMessage: (
    threadId: string,
    id: string,
    updatedMessage: Partial<ThreadMessage>,
  ) => void;
  replaceMessage: (
    threadId: string,
    tempId: string,
    savedMessage: ThreadMessage,
  ) => void;
  setMessages: (threadId: string, messages: ThreadMessage[]) => void;
}

export const useThreadMessageStore = create<ThreadMessageState>((set) => ({
  messagesByThread: {},

  addMessage: (message) =>
    set((state) => {
      const threadId = message.thread_id;
      const currentMessages = state.messagesByThread[threadId] || [];
      // If message with this ID already exists, update in-place rather than creating duplicate
      if (currentMessages.some((m) => m.id === message.id)) {
        return {
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: currentMessages.map((m) =>
              m.id === message.id ? { ...m, ...message } : m,
            ),
          },
        };
      }
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
            m.id === id ? { ...m, ...updatedMessage } : m,
          ),
        },
      };
    }),

  replaceMessage: (threadId, tempId, savedMessage) =>
    set((state) => {
      const currentMessages = state.messagesByThread[threadId] || [];
      // If the saved message is already present in currentMessages (e.g. delivered via setMessages from DB),
      // remove the temp placeholder instead of renaming it into a duplicate savedMessage.
      const alreadyHasSaved = currentMessages.some(
        (m) => m.id === savedMessage.id,
      );
      if (alreadyHasSaved) {
        return {
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: currentMessages.filter((m) => m.id !== tempId),
          },
        };
      }

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: currentMessages.map((m) =>
            m.id === tempId
              ? {
                  ...savedMessage,
                  ...m,
                  id: savedMessage.id,
                  content: m.content || savedMessage.content,
                }
              : m,
          ),
        },
      };
    }),

  setMessages: (threadId, messages) =>
    set((state) => {
      const currentMessages = state.messagesByThread[threadId] || [];
      const currentMap = new Map(currentMessages.map((m) => [m.id, m]));

      // Merge incoming messages, preserving any richer local action state
      const merged = messages.map((m) => {
        const local = currentMap.get(m.id);
        if (local && local.content) {
          const localText =
            typeof local.content === "string"
              ? local.content
              : local.content.text || "";
          if (
            localText.includes("<ui-action>") &&
            localText.includes('"values"')
          ) {
            return {
              ...m,
              content: local.content,
            };
          }
        }
        return m;
      });

      const incomingIds = new Set(merged.map((m) => m.id));

      // Keep only genuine pending in-memory messages that are not yet persisted to DB.
      // If a temporary optimistic message (e.g. temp-user-*) matches an incoming message
      // with the same role and text, it has already been persisted and should be dropped.
      const nonDbToKeep = currentMessages.filter((localMsg) => {
        if (incomingIds.has(localMsg.id)) return false;

        if (localMsg.id.startsWith("temp-")) {
          const localText =
            typeof localMsg.content === "string"
              ? localMsg.content
              : localMsg.content?.text || "";

          const alreadyRepresented = merged.some((incomingMsg) => {
            if (incomingMsg.role !== localMsg.role) return false;
            const incomingText =
              typeof incomingMsg.content === "string"
                ? incomingMsg.content
                : incomingMsg.content?.text || "";
            return incomingText.trim() === localText.trim();
          });

          if (alreadyRepresented) {
            return false;
          }
        }

        return true;
      });

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: [...merged, ...nonDbToKeep],
        },
      };
    }),
}));
