import { useThreadStore } from "@/store/thread.store";
import { useCallback, useRef } from "react";
import { useThreadMessageStore } from "@/store/thread.message.store";
import { createThreadAction } from "@/lib/actions/chat/thread.action";
import { updateMessageContentAction } from "@/lib/actions/chat/thread.messages.action";
import { useAgentStore } from "@/store/agent.store";
import type { ThreadMessage } from "@/lib/repositories/types/thread.message.types";
import type { MessageContent } from "@/lib/types";
import { toast } from "sonner";

export async function persistAssistantMessage(
  threadId: string,
  messageId: string,
  content: MessageContent,
): Promise<ThreadMessage | null> {
  if (messageId.startsWith("temp-")) {
    return null;
  }
  const res = await updateMessageContentAction(messageId, content);
  if (res.success && res.data) {
    useThreadMessageStore
      .getState()
      .updateMessage(threadId, messageId, { content: res.data.content });
    return res.data;
  }
  return null;
}

export function useChatStream() {
  const { addMessage, replaceMessage } = useThreadMessageStore();
  const { addThread, activeThreadId, setActiveThreadId } = useThreadStore();
  const { setStreamingThread, streamingThreads } = useAgentStore();

  const isStartingTurnRef = useRef<Record<string, boolean>>({});
  const lastTurnTimeRef = useRef<Record<string, number>>({});
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  const isStreaming = activeThreadId
    ? Boolean(streamingThreads[activeThreadId])
    : false;

  const stopStream = useCallback(() => {
    if (activeThreadId && abortControllersRef.current[activeThreadId]) {
      abortControllersRef.current[activeThreadId].abort();
      delete abortControllersRef.current[activeThreadId];
      setStreamingThread(activeThreadId, false);
    }
  }, [activeThreadId, setStreamingThread]);

  const streamTurn = useCallback(
    async (userMessage: string, options?: { isHidden?: boolean }) => {
      let currentThreadId = activeThreadId;
      let isNewThread = false;
      let tempThreadId: string | null = null;

      const now = Date.now();
      const threadKey = currentThreadId || "new_thread";
      const lastTime = lastTurnTimeRef.current[threadKey] || 0;

      // Re-entry & double-invocation protection (< 300ms debounce)
      if (isStartingTurnRef.current[threadKey] || now - lastTime < 300) {
        return;
      }

      isStartingTurnRef.current[threadKey] = true;
      lastTurnTimeRef.current[threadKey] = now;

      const userTempId = "temp-user-" + Date.now().toString();

      if (!currentThreadId) {
        isNewThread = true;
        tempThreadId = "temp-thread-" + Date.now().toString();
        currentThreadId = tempThreadId;
        setActiveThreadId(tempThreadId);
      }

      // Add optimistic user message immediately so UI updates instantly
      addMessage({
        id: userTempId,
        thread_id: currentThreadId,
        role: "user",
        content: {
          text: userMessage,
          isHidden: options?.isHidden ?? false,
        },
        created_at: new Date(),
      });

      // Abort any previous request for THIS thread
      if (abortControllersRef.current[currentThreadId]) {
        abortControllersRef.current[currentThreadId].abort();
        delete abortControllersRef.current[currentThreadId];
      }

      const controller = new AbortController();
      abortControllersRef.current[currentThreadId] = controller;
      setStreamingThread(currentThreadId, true);

      if (isNewThread && tempThreadId) {
        const threadRes = await createThreadAction(
          { title: "New Chat" },
          userMessage,
        );

        if (threadRes.success && threadRes.data) {
          const finalThreadId = threadRes.data.id;

          const currentMessages =
            useThreadMessageStore.getState().messagesByThread[tempThreadId] ||
            [];
          useThreadMessageStore.getState().setMessages(
            finalThreadId,
            currentMessages.map((m) => ({ ...m, thread_id: finalThreadId })),
          );

          // Clean up tempThreadId from store
          useThreadMessageStore.setState((state) => {
            const nextMap = { ...state.messagesByThread };
            delete nextMap[tempThreadId];
            return { messagesByThread: nextMap };
          });

          setStreamingThread(tempThreadId, false);
          setStreamingThread(finalThreadId, true);
          abortControllersRef.current[finalThreadId] = controller;
          delete abortControllersRef.current[tempThreadId];

          addThread(threadRes.data);
          setActiveThreadId(finalThreadId);
          currentThreadId = finalThreadId;

          window.history.replaceState(null, "", `/chat/${finalThreadId}`);
        } else {
          console.error("Thread creation failed, please try later.");
          isStartingTurnRef.current[threadKey] = false;
          setStreamingThread(tempThreadId, false);
          return;
        }
      }

      isStartingTurnRef.current[threadKey] = false;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            threadId: currentThreadId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Please login before sending messages");
            return;
          }
          let errorDetail = "";
          try {
            const errJson = await response.json();
            errorDetail =
              (errJson && (errJson.message || errJson.error)) ||
              JSON.stringify(errJson);
          } catch {
            errorDetail = await response.text().catch(() => "");
          }
          throw new Error(
            errorDetail || `Server responded with ${response.status}`,
          );
        }

        const data = await response.json();

        if (data.userMessage && currentThreadId) {
          replaceMessage(currentThreadId, userTempId, data.userMessage);
        }

        if (data.message) {
          addMessage({
            ...data.message,
            created_at: new Date(data.message.created_at || Date.now()),
          });
        } else if (data.text) {
          addMessage({
            id: crypto.randomUUID(),
            thread_id: currentThreadId,
            role: "assistant",
            content: { text: data.text },
            created_at: new Date(),
          });
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          console.log("[useChat:Aborted] Request was stopped by user.");
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          "[useChat:Error] Failed to fetch assistant response:",
          msg,
        );
        toast.error(
          msg || "Something went wrong while generating the response.",
        );
      } finally {
        if (currentThreadId) {
          delete abortControllersRef.current[currentThreadId];
          setStreamingThread(currentThreadId, false);
        }
      }
    },
    [
      activeThreadId,
      addMessage,
      replaceMessage,
      addThread,
      setActiveThreadId,
      setStreamingThread,
    ],
  );

  return {
    streamTurn,
    stopStream,
    isStreaming,
  };
}
