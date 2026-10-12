import React from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

export interface ThinkingStep {
  id?: string;
  title: string;
  subtitle?: string;
  status?: "running" | "completed" | "failed";
}

interface ChatThinkingStepsProps {
  steps: ThinkingStep[];
}

export function ChatThinkingSteps({ steps }: ChatThinkingStepsProps) {
  return (
    <div className="flex flex-col mb-4 py-2 px-3 md:px-2 w-full max-w-full transition-all duration-200">
      <div className="flex items-center space-x-3 mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bot/chief-animated.svg"
          alt="Thinking"
          className="w-5 h-5 opacity-90"
        />
        <span className="font-display font-medium bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-transparent animate-pulse tracking-wide">
          Chief is thinking...
        </span>
      </div>

      {steps.length > 0 && (
        <div className="relative max-h-48 overflow-y-auto pr-1 flex flex-col ml-8 mt-1">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const isRunning =
              step.status === "running" || (isLast && !step.status);
            const isFailed = step.status === "failed";
            const isCompleted = step.status === "completed";

            return (
              <div
                key={step.id || `step-${idx}`}
                className={`relative flex items-stretch gap-2.5 text-[13px] font-gothic transition-all duration-300 ${isRunning ? "opacity-100" : "opacity-75"}`}
              >
                <div className="relative flex flex-col items-center shrink-0 w-3.5">
                  <div className="z-10 mt-0.5 flex h-3.5 w-3.5 items-center justify-center">
                    {isRunning ? (
                      <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                    ) : isFailed ? (
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-3 w-3 text-zinc-500" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className="w-px flex-1 my-0.5 min-h-[14px]"
                      style={{
                        backgroundColor: "rgba(161, 161, 170, 0.2)",
                      }}
                    />
                  )}
                </div>
                <div
                  className={`flex flex-col min-w-0 flex-1 leading-snug ${!isLast ? "pb-2.5" : "pb-0.5"}`}
                >
                  <span
                    className={`${isRunning ? "text-zinc-300 font-medium" : "text-zinc-500"}`}
                  >
                    {step.title}
                  </span>
                  {step.subtitle && (
                    <span className="text-[12px] text-zinc-500 mt-0.5">
                      {step.subtitle}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
