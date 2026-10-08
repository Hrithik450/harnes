import { create } from "zustand";

export interface AgentStep {
  id: string;
  title: string;
  subtitle?: string;
  status: "running" | "completed" | "failed";
}

interface AgentState {
  streamingThreads: Record<string, boolean>;
  stepsByThread: Record<string, AgentStep[]>;
  setStreamingThread: (threadId: string, isStreaming: boolean) => void;
  addStep: (threadId: string, step: AgentStep) => void;
  updateStep: (threadId: string, stepId: string, updates: Partial<AgentStep>) => void;
  clearSteps: (threadId: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  streamingThreads: {},
  stepsByThread: {},
  
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

  addStep: (threadId, step) =>
    set((state) => {
      const currentSteps = state.stepsByThread[threadId] || [];
      const existingIdx = currentSteps.findIndex((s) => s.id === step.id);
      
      if (existingIdx !== -1) {
        const newSteps = [...currentSteps];
        newSteps[existingIdx] = { ...newSteps[existingIdx], ...step };
        return {
          stepsByThread: {
            ...state.stepsByThread,
            [threadId]: newSteps,
          },
        };
      }
      
      return {
        stepsByThread: {
          ...state.stepsByThread,
          [threadId]: [...currentSteps, step],
        },
      };
    }),

  updateStep: (threadId, stepId, updates) =>
    set((state) => {
      const currentSteps = state.stepsByThread[threadId] || [];
      return {
        stepsByThread: {
          ...state.stepsByThread,
          [threadId]: currentSteps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
        },
      };
    }),

  clearSteps: (threadId) =>
    set((state) => {
      const newSteps = { ...state.stepsByThread };
      delete newSteps[threadId];
      return { stepsByThread: newSteps };
    }),
}));
