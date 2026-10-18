import { create } from "zustand";

interface AgentState {
  streamingThreads: Record<string, boolean>;
  setStreamingThread: (threadId: string, isStreaming: boolean) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  streamingThreads: {},

  setStreamingThread: (threadId, isStreaming) =>
    set((state) => {
      const newStreamingThreads = { ...state.streamingThreads };
      if (isStreaming) {
        newStreamingThreads[threadId] = true;
      } else {
        delete newStreamingThreads[threadId];
      }
      return { streamingThreads: newStreamingThreads };
    }),
}));
