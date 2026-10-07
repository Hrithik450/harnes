import { useCallback, useRef, startTransition } from "react";
import { useThreadStore } from "@/store/thread.store";
import { useThreadMessageStore } from "@/store/thread.message.store";
import { createThreadAction } from "@/lib/actions/chat/thread.action";
import { createMessageAction } from "@/lib/actions/chat/thread.messages.action";
import { useAgentStore } from "@/store/agent.store";
import { toast } from "sonner";
import { createSmoothStreamWriter } from "@/lib/smooth-stream-writer";

export function useChatStream() {
  const { addMessage, updateMessage, replaceMessage } = useThreadMessageStore();
  const { activeThreadId, setActiveThreadId, addThread, setNewThread } = useThreadStore();
  const { streamingThreads, setStreamingThread } = useAgentStore();

  const isStreaming = activeThreadId ? !!streamingThreads[activeThreadId] : false;

  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const writersRef = useRef<Record<string, ReturnType<typeof createSmoothStreamWriter>>>({});

  const stopStream = useCallback(() => {
    if (!activeThreadId) return;
    
    const controller = abortControllersRef.current[activeThreadId];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[activeThreadId];
    }
    
    const writer = writersRef.current[activeThreadId];
    if (writer) {
      writer.flush();
      writer.dispose();
      delete writersRef.current[activeThreadId];
    }
    setStreamingThread(activeThreadId, false);
  }, [activeThreadId, setStreamingThread]);

  const streamTurn = useCallback(
    async (userMessage: string) => {
      // ── Step 1: Immediate Optimistic UI ──────────────────────────────────
      let currentThreadId = activeThreadId;
      let isNewThread = false;
      let tempThreadId: string | null = null;

      const userTempId = "temp-user-" + Date.now().toString();
      const assistantTempId = "temp-assistant-" + (Date.now() + 1).toString();

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
        content: userMessage,
        created_at: new Date(),
      });
      
      // Abort any previous stream for THIS thread
      if (abortControllersRef.current[currentThreadId]) {
        abortControllersRef.current[currentThreadId].abort();
      }
      if (writersRef.current[currentThreadId]) {
        writersRef.current[currentThreadId].dispose();
      }

      const controller = new AbortController();
      abortControllersRef.current[currentThreadId] = controller;
      setStreamingThread(currentThreadId, true); // Show "Chief is thinking..."
      useAgentStore.getState().clearSteps(currentThreadId);

      // ── Step 2: Create Thread in DB if New ──────────────────────────────
      if (isNewThread && tempThreadId) {
        const threadRes = await createThreadAction(
          { title: "New Chat" },
          userMessage,
        );

        if (threadRes.success && threadRes.data) {
          const finalThreadId = threadRes.data.id;
          
          // Migrate temp thread state to real thread ID
          const currentMessages = useThreadMessageStore.getState().messagesByThread[tempThreadId] || [];
          useThreadMessageStore.getState().setMessages(finalThreadId, currentMessages.map(m => ({ ...m, thread_id: finalThreadId })));
          
          // Migrate steps and streaming state
          const currentSteps = useAgentStore.getState().stepsByThread[tempThreadId] || [];
          useAgentStore.getState().stepsByThread[finalThreadId] = currentSteps;
          
          setStreamingThread(finalThreadId, true);
          abortControllersRef.current[finalThreadId] = controller;
          delete abortControllersRef.current[tempThreadId];
          
          addThread(threadRes.data);
          setActiveThreadId(finalThreadId);
          setNewThread(true);
          currentThreadId = finalThreadId;
          
          window.history.replaceState(null, "", `/chat/${finalThreadId}`);
        } else {
          toast.error("Thread creation failed, please try later.");
          setStreamingThread(tempThreadId, false);
          return;
        }
      }

      const finalThreadId = currentThreadId;



      // ── Step 4: Stream response with smooth RAF-based rendering ───────────
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            threadId: finalThreadId,
          }),
          signal: controller.signal,
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let assistantContent = "";
        let assistantMessageAdded = false;

        const writer = createSmoothStreamWriter({
          charsPerSecond: 180,
          maxCharsPerFrame: 12,
          onFlush: (displayed) => {
            startTransition(() => {
              if (controller.signal.aborted) return;
              if (!assistantMessageAdded) {
                addMessage({
                  id: assistantTempId,
                  thread_id: finalThreadId,
                  role: "assistant",
                  content: displayed,
                  created_at: new Date(),
                });
                assistantMessageAdded = true;
              } else {
                updateMessage(finalThreadId, assistantTempId, { content: displayed });
              }
            });
          },
        });

        writersRef.current[finalThreadId] = writer;

        let buffer = "";

        while (true) {
          if (controller.signal.aborted) {
            reader.cancel();
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value, { stream: true });
          if (!chunkText) continue;

          buffer += chunkText;
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              
              try {
                const data = JSON.parse(dataStr);
                
                if (data.type === 'text-delta') {
                  const delta = data.delta ?? data.textDelta;
                  if (delta) {
                    assistantContent += delta;
                    writer.push(delta);
                  }
                } 
                else if (data.type === 'tool-input-available' || data.type === 'tool-call') {
                  const toolCallId = data.toolCallId;
                  const toolName = data.toolName;
                  
                  let args = data.input ?? data.args;
                  if (typeof args === "string") {
                    try { args = JSON.parse(args); } catch {}
                  }
                  
                  let title = `Using ${toolName.replace(/_/g, ' ')}`.replace(/fetch(_|\s)skill/ig, 'knowledge base');
                  let subtitle = "";
                  
                  if (args && typeof args === 'object') {
                    const typedArgs = args as Record<string, unknown>;
                    if (typeof typedArgs.title === 'string') {
                      title = typedArgs.title.replace(/fetch(_|\s)skill/ig, 'knowledge base');
                    }
                    if (typeof typedArgs.subtitle === 'string') subtitle = typedArgs.subtitle;
                  }
                  
                  useAgentStore.getState().addStep(finalThreadId, {
                    id: toolCallId,
                    title,
                    subtitle,
                    status: 'running'
                  });
                }
                else if (data.type === 'tool-output-available' || data.type === 'tool-result') {
                  useAgentStore.getState().updateStep(finalThreadId, data.toolCallId, {
                    status: 'completed'
                  });
                }
                else if (data.type === 'tool-output-error') {
                  useAgentStore.getState().updateStep(finalThreadId, data.toolCallId, {
                    status: 'failed'
                  });
                }
              } catch {
                // Ignore parse errors on partial chunks if any
              }
            }
          }
        }

        if (!controller.signal.aborted && writersRef.current[finalThreadId] === writer) {
          await writer.drain(800);
          writer.flush();
          const finalText = writer.getReceived();
          if (finalText) {
            startTransition(() => {
              updateMessage(finalThreadId, assistantTempId, { content: finalText });
            });
          }
          writer.dispose();
          delete writersRef.current[finalThreadId];
        }

        if (controller.signal.aborted) return;

        // ── Step 5: Persist messages sequentially ────────────────────────
        const savedUserMsgRes = await createMessageAction(
          {
            thread_id: finalThreadId,
            role: "user",
            content: userMessage,
          },
          userTempId,
        );

        if (savedUserMsgRes.success && savedUserMsgRes.data) {
          replaceMessage(finalThreadId, userTempId, savedUserMsgRes.data);
        } else {
          toast.error("User message could not be saved, please try later.");
        }

        const savedAssistantMsgRes = await createMessageAction(
          {
            thread_id: finalThreadId,
            role: "assistant",
            content: assistantContent,
          },
          assistantTempId,
        );

        if (savedAssistantMsgRes.success && savedAssistantMsgRes.data) {
          replaceMessage(finalThreadId, assistantTempId, savedAssistantMsgRes.data);
        } else {
          toast.error("Assistant message could not be saved, please try later.");
        }
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.name === "AbortError" || controller.signal.aborted)
        ) {
          return;
        }
        console.error("Stream error:", err);
        toast.error("Failed to generate response, please try later.");
      } finally {
        setStreamingThread(finalThreadId, false);
        setNewThread(false);
        if (abortControllersRef.current[finalThreadId] === controller) {
          delete abortControllersRef.current[finalThreadId];
        }
        if (writersRef.current[finalThreadId]) {
          writersRef.current[finalThreadId].dispose();
          delete writersRef.current[finalThreadId];
        }
      }
    },
    [
      activeThreadId,
      addMessage,
      updateMessage,
      replaceMessage,
      setStreamingThread,
      setActiveThreadId,
      addThread,
      setNewThread,
    ],
  );

  return { streamTurn, stopStream, isStreaming };
}
