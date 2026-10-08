import { useThreadStore } from "@/store/thread.store";
import { useCallback, useRef, startTransition } from "react";
import { useThreadMessageStore } from "@/store/thread.message.store";
import { createThreadAction } from "@/lib/actions/chat/thread.action";
import { createMessageAction } from "@/lib/actions/chat/thread.messages.action";
import { createSmoothStreamWriter } from "@/lib/smooth-stream-writer";
import { createThoughtRevealScheduler } from "@/lib/thought-reveal-scheduler";
import { useAgentStore } from "@/store/agent.store";

export function useChatStream() {
  const { addMessage, updateMessage, replaceMessage } = useThreadMessageStore();
  const { activeThreadId, setActiveThreadId, addThread } =
    useThreadStore();
  const { streamingThreads, setStreamingThread } = useAgentStore();

  const isStreaming = activeThreadId
    ? !!streamingThreads[activeThreadId]
    : false;

  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const writersRef = useRef<
    Record<string, ReturnType<typeof createSmoothStreamWriter>>
  >({});
  const revealersRef = useRef<
    Record<string, ReturnType<typeof createThoughtRevealScheduler>>
  >({});

  const stopStream = useCallback(() => {
    if (!activeThreadId) return;

    const controller = abortControllersRef.current[activeThreadId];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[activeThreadId];
    }

    const revealer = revealersRef.current[activeThreadId];
    if (revealer) {
      revealer.dispose();
      delete revealersRef.current[activeThreadId];
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

          // Migrate steps and streaming state
          const currentSteps =
            useAgentStore.getState().stepsByThread[tempThreadId] || [];
          useAgentStore.getState().stepsByThread[finalThreadId] = currentSteps;

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
          setStreamingThread(tempThreadId, false);
          return;
        }
      }

      // ── Step 4: Stream response ───────────────────────────────────────────
      // Thoughts are revealed on a client-side cadence; final text is buffered
      // and only released once every thought has been revealed, so the UI shows
      // "thinking → thoughts → text" in that order, every time.
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

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let assistantContent = "";
        let assistantMessageAdded = false;

        const writer = createSmoothStreamWriter({
          // The whole response is released at once, so catch-up would dump it.
          // A flat rate is what makes it read like a real stream.
          catchUp: false,
          charsPerSecond: 180,
          maxCharsPerFrame: 8,
          onFlush: (displayed) => {
            startTransition(() => {
              if (controller.signal.aborted) return;
              if (!assistantMessageAdded) {
                addMessage({
                  id: assistantTempId,
                  thread_id: currentThreadId,
                  role: "assistant",
                  content: displayed,
                  created_at: new Date(),
                });
                assistantMessageAdded = true;
              } else {
                updateMessage(currentThreadId, assistantTempId, {
                  content: displayed,
                });
              }
            });
          },
        });

        writersRef.current[currentThreadId] = writer;

        // Reveals thoughts one-by-one; the final text waits until this drains.
        const reveal = createThoughtRevealScheduler({
          onReveal: (thought) => {
            if (controller.signal.aborted) return;
            useAgentStore.getState().addStep(currentThreadId, {
              id: thought.id,
              title: thought.title,
              subtitle: thought.subtitle,
              status: "running",
            });
          },
          onComplete: (thoughtId) => {
            if (controller.signal.aborted) return;
            useAgentStore
              .getState()
              .updateStep(currentThreadId, thoughtId, { status: "completed" });
          },
        });

        revealersRef.current[currentThreadId] = reveal;

        // Text is buffered here until thoughts finish revealing.
        const pendingText: string[] = [];
        let textReleased = false;
        const releaseText = () => {
          if (textReleased || controller.signal.aborted) return;
          textReleased = true;
          for (const t of pendingText) writer.push(t);
          pendingText.length = 0;

          // Pace the reveal so the whole answer lands in a comfortable window:
          // ~3s for a one-liner, capping out around 9s for a long reply, so a
          // big response never drags and a short one never flashes past.
          const total = writer.getReceived().length;
          if (total > 0) {
            const targetSeconds = Math.min(9, Math.max(3, total / 220));
            writer.setCharsPerSecond(
              Math.min(420, Math.max(90, total / targetSeconds)),
            );
          }
        };

        const thoughtsDrained = reveal.whenDrained().then(() => {
          if (!controller.signal.aborted) releaseText();
        });

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

          // SSE events are separated by a blank line (\n\n). Parse whole blocks
          // only and keep the trailing partial block buffered; the `event:`
          // name can otherwise be lost if a chunk splits the event/data lines.
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || "";

          for (const block of blocks) {
            let eventName = "message";
            const dataLines: string[] = [];

            for (const line of block.split("\n")) {
              if (line.startsWith("event:")) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).replace(/^ /, ""));
              }
            }

            if (dataLines.length === 0) continue;
            const dataStr = dataLines.join("\n").trim();
            if (dataStr === "[DONE]") continue;

            let data: unknown;
            try {
              data = JSON.parse(dataStr);
            } catch {
              data = dataStr;
            }

            if (eventName === "thought") {
              const t = data as {
                id: string;
                title: string;
                subtitle?: string;
              };
              reveal.enqueue({ id: t.id, title: t.title, subtitle: t.subtitle });
            } else if (eventName === "thoughtsDone") {
              reveal.seal();
            } else if (eventName === "assistantResponse") {
              const textDelta = typeof data === "string" ? data : "";
              if (textDelta) {
                assistantContent += textDelta;
                if (textReleased) writer.push(textDelta);
                else pendingText.push(textDelta);
              }
            } else if (eventName === "error") {
              console.error("Server reported stream error:", data);
            }
          }
        }

        // The reader is done, so no further thoughts can arrive — seal here as a
        // safety net in case the server died before sending `thoughtsDone`.
        // Without this, `whenDrained()` could never resolve and the response
        // would never be released.
        reveal.seal();

        // Wait for the thought panel to finish, but never hang on cosmetics.
        await Promise.race([
          thoughtsDrained,
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ]);
        releaseText();

        if (
          !controller.signal.aborted &&
          writersRef.current[currentThreadId] === writer
        ) {
          // Let the released text reveal at its own pace, with a ceiling scaled
          // to how much there is to show. The timer also covers a backgrounded
          // tab, where requestAnimationFrame stops firing entirely.
          const pendingChars = writer.getReceived().length;
          await writer.drain(Math.max(4000, pendingChars * 16));
          writer.flush();
          const finalText = writer.getReceived();
          if (finalText) {
            startTransition(() => {
              updateMessage(currentThreadId, assistantTempId, {
                content: finalText,
              });
            });
          }
          writer.dispose();
          delete writersRef.current[currentThreadId];
        }

        reveal.dispose();
        if (revealersRef.current[currentThreadId] === reveal) {
          delete revealersRef.current[currentThreadId];
        }

        if (controller.signal.aborted) return;

        const savedUserMsgRes = await createMessageAction(
          {
            thread_id: currentThreadId,
            role: "user",
            content: userMessage,
          },
          userTempId,
        );

        if (savedUserMsgRes.success && savedUserMsgRes.data) {
          replaceMessage(currentThreadId, userTempId, savedUserMsgRes.data);
        } else {
          console.error("User message could not be saved, please try later.");
        }

        const savedAssistantMsgRes = await createMessageAction(
          {
            thread_id: currentThreadId,
            role: "assistant",
            content: assistantContent,
          },
          assistantTempId,
        );

        if (savedAssistantMsgRes.success && savedAssistantMsgRes.data) {
          replaceMessage(
            currentThreadId,
            assistantTempId,
            savedAssistantMsgRes.data,
          );
        } else {
          console.error(
            "Assistant message could not be saved, please try later.",
          );
        }
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.name === "AbortError" || controller.signal.aborted)
        ) {
          return;
        }
        console.error("Stream error:", err);
        console.error("Failed to generate response, please try later.");
      } finally {
        setStreamingThread(currentThreadId, false);
        if (abortControllersRef.current[currentThreadId] === controller) {
          delete abortControllersRef.current[currentThreadId];
        }
        if (writersRef.current[currentThreadId]) {
          writersRef.current[currentThreadId].dispose();
          delete writersRef.current[currentThreadId];
        }
        if (revealersRef.current[currentThreadId]) {
          revealersRef.current[currentThreadId].dispose();
          delete revealersRef.current[currentThreadId];
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
    ],
  );

  return { streamTurn, stopStream, isStreaming };
}
