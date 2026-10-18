"use client";

import React, { useState, useRef } from "react";
import { Check, ChevronLeft, ChevronRight, Send, AlertCircle } from "lucide-react";
import type { UiActionComponentProps } from "@/lib/types";
import type { FormPayload, FormState, FormField } from "./form.types";

export function FormCard({
  payload,
  state,
  onComplete,
  isStreaming,
}: UiActionComponentProps<FormPayload, FormState>) {
  const fields: FormField[] = payload?.fields || [];
  const totalSteps = fields.length;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocalSubmitted, setIsLocalSubmitted] = useState(false);
  const lastStepChangeTimeRef = useRef(0);

  // Form values state: maps field id -> string value (or string[])
  const [values, setValues] = useState<Record<string, string | string[]>>(() => {
    return (state?.values as Record<string, string | string[]>) || {};
  });

  // Track if "other" was chosen for choice fields
  const [customOtherText, setCustomOtherText] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (state?.values) {
      for (const [k, v] of Object.entries(state.values)) {
        if (typeof v === "string" && v.startsWith("Other: ")) {
          initial[k] = v.replace(/^Other:\s*/, "");
        }
      }
    }
    return initial;
  });

  const isResolved =
    isLocalSubmitted ||
    Boolean(state?.values && Object.keys(state.values).length > 0);

  if (totalSteps === 0) {
    return (
      <div className="my-3 w-full max-w-xl rounded-xl border border-red-500/30 bg-red-950/20 p-3.5 text-red-300 font-gothic flex items-start gap-2.5 text-xs">
        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-200">Invalid Form</p>
          <p className="mt-0.5 text-red-400/80">
            The form payload does not contain any fields to display.
          </p>
        </div>
      </div>
    );
  }

  // --- RESOLVED VIEW (Completed form read-only summary) ---
  if (isResolved) {
    const resolvedValues = (state?.values || values) as Record<string, string | string[]>;
    return (
      <div className="my-3 w-full max-w-full sm:max-w-xl rounded-xl border border-zinc-700/80 bg-[#1f1f1f] p-3.5 sm:p-4 text-zinc-100 shadow-lg font-gothic transition-all">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
              <Check className="h-2.5 w-2.5 stroke-[2.5]" />
            </span>
            <span>Answers Recorded</span>
          </div>
          {payload.title && (
            <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[200px]">
              {payload.title}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {fields.map((field, idx) => {
            const rawVal = resolvedValues[field.id];
            const displayVal = Array.isArray(rawVal)
              ? rawVal.join(", ")
              : typeof rawVal === "string"
              ? rawVal.trim()
              : "";

            return (
              <div key={field.id} className="space-y-1">
                <span className="text-[12px] font-medium text-zinc-400 block">
                  {totalSteps > 1 ? `${idx + 1}. ` : ""}
                  {field.question}
                </span>
                <div className="text-xs text-zinc-200 bg-[#161616] rounded-lg p-2.5 border border-zinc-800 whitespace-pre-wrap break-words">
                  {displayVal || <span className="text-zinc-500 italic">None provided</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- ACTIVE MULTI-STEP WIZARD VIEW ---
  const currentField = fields[currentStepIndex];
  const isLastStep = currentStepIndex === totalSteps - 1;
  const currentVal = values[currentField.id];

  const isOtherSelected =
    typeof currentVal === "string" && currentVal.startsWith("Other: ");

  // Validation for the current step
  const isCurrentStepValid = (() => {
    if (currentField.required === false) return true;

    if (currentField.type === "choice") {
      if (isOtherSelected) {
        return Boolean(customOtherText[currentField.id]?.trim());
      }
      return Boolean(currentVal);
    }

    if (currentField.type === "multiselect") {
      return Array.isArray(currentVal) && currentVal.length > 0;
    }

    // text or textarea
    return typeof currentVal === "string" && currentVal.trim().length > 0;
  })();

  const handleSelectChoice = (option: string) => {
    if (isSubmitting) return;
    setValues((prev) => ({
      ...prev,
      [currentField.id]: option,
    }));
  };

  const handleSelectOther = () => {
    if (isSubmitting) return;
    const currentCustom = customOtherText[currentField.id] || "";
    setValues((prev) => ({
      ...prev,
      [currentField.id]: currentCustom.trim() ? `Other: ${currentCustom.trim()}` : "Other: ",
    }));
  };

  const handleCustomOtherChange = (val: string) => {
    if (isSubmitting) return;
    setCustomOtherText((prev) => ({ ...prev, [currentField.id]: val }));
    setValues((prev) => ({
      ...prev,
      [currentField.id]: val.trim() ? `Other: ${val.trim()}` : "Other: ",
    }));
  };

  const handleToggleMultiSelect = (option: string) => {
    if (isSubmitting) return;
    const currentArr = Array.isArray(currentVal) ? [...currentVal] : [];
    const idx = currentArr.indexOf(option);
    if (idx >= 0) {
      currentArr.splice(idx, 1);
    } else {
      currentArr.push(option);
    }
    setValues((prev) => ({
      ...prev,
      [currentField.id]: currentArr,
    }));
  };

  const handleTextChange = (text: string) => {
    if (isSubmitting) return;
    setValues((prev) => ({
      ...prev,
      [currentField.id]: text,
    }));
  };

  const handleNext = () => {
    if (!isCurrentStepValid || isLastStep || isSubmitting) return;
    lastStepChangeTimeRef.current = Date.now();
    setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = () => {
    if (currentStepIndex === 0 || isSubmitting) return;
    lastStepChangeTimeRef.current = Date.now();
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Critical guard: if somehow triggered before the last step, advance instead of submitting!
    if (!isLastStep) {
      handleNext();
      return;
    }

    // Debounce protection: ignore accidental submission if step was changed less than 350ms ago (click bleed-through)
    if (Date.now() - lastStepChangeTimeRef.current < 350) {
      return;
    }

    if (!isCurrentStepValid || isSubmitting || isStreaming) return;

    setIsSubmitting(true);
    setIsLocalSubmitted(true);

    try {
      // Build natural language prompt text for the AI
      const lines = fields.map((f, i) => {
        const prefix = totalSteps > 1 ? `${i + 1}. ` : "";
        const val = values[f.id];
        let formatted = "";

        if (Array.isArray(val)) {
          formatted = val.join(", ");
        } else if (typeof val === "string" && val.startsWith("Other: ")) {
          const custom = customOtherText[f.id]?.trim() || val.replace(/^Other:\s*/, "");
          formatted = `The user chose other: "${custom}"`;
        } else {
          formatted = (val as string)?.trim() || "(skipped)";
        }

        return `${prefix}${f.question}: ${formatted}`;
      });

      const responseText = `User submitted form answers:\n${lines.join("\n")}`;

      if (onComplete) {
        await onComplete(
          {
            values,
          },
          responseText,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLastStep) {
          handleSubmit(e);
        } else {
          handleNext();
        }
      }}
      className="my-3 w-full max-w-full sm:max-w-xl rounded-xl border border-zinc-700/80 bg-[#1f1f1f] p-3.5 sm:p-4 text-zinc-100 shadow-lg font-gothic transition-all"
    >
      {/* Header with Title and Step Dots */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span>
            {payload.title
              ? `${payload.title} (${currentStepIndex + 1}/${totalSteps})`
              : `Step ${currentStepIndex + 1} of ${totalSteps}`}
          </span>
          {currentField.required === false && (
            <span className="text-[10px] text-zinc-500 font-mono">(optional)</span>
          )}
        </div>

        {totalSteps > 1 && (
          <div className="flex items-center gap-1.5">
            {fields.map((f, i) => {
              const val = values[f.id];
              const isFilled = Array.isArray(val)
                ? val.length > 0
                : typeof val === "string" && val.trim().length > 0;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    if (!isSubmitting) {
                      lastStepChangeTimeRef.current = Date.now();
                      setCurrentStepIndex(i);
                    }
                  }}
                  title={`Go to step ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === currentStepIndex
                      ? "w-4 bg-zinc-200"
                      : isFilled
                      ? "w-1.5 bg-zinc-500 hover:bg-zinc-400"
                      : "w-1.5 bg-zinc-800 border border-zinc-700"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Field Question Prompt */}
      <div className="mb-3.5">
        <h4 className="text-[14px] sm:text-[15px] font-medium text-zinc-100 leading-snug">
          {totalSteps > 1 ? `${currentStepIndex + 1}. ` : ""}
          {currentField.question}
        </h4>
      </div>

      {/* Field Content Rendering */}
      <div className="mb-4">
        {/* Choice (Single Select) */}
        {currentField.type === "choice" && (
          <div className="space-y-2">
            {(currentField.options || []).map((option) => {
              const isSelected = currentVal === option && !isOtherSelected;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSelectChoice(option)}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-left text-[13px] font-medium transition-all flex items-center justify-between shadow-sm cursor-pointer ${
                    isSelected
                      ? "border-zinc-500 bg-[#2c2c2c] text-zinc-100"
                      : "border-zinc-800 bg-[#161616] text-zinc-300 hover:border-zinc-700 hover:bg-[#202020]"
                  }`}
                >
                  <span className="flex-1">{option}</span>
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                        : "border-zinc-700 bg-transparent"
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}

            {/* Custom "Other" option */}
            {currentField.allow_other !== false && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSelectOther}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-left text-[13px] font-medium transition-all flex items-center justify-between shadow-sm cursor-pointer ${
                    isOtherSelected
                      ? "border-zinc-500 bg-[#2c2c2c] text-zinc-100"
                      : "border-zinc-800 bg-[#161616] text-zinc-300 hover:border-zinc-700 hover:bg-[#202020]"
                  }`}
                >
                  <span className="flex-1">Other (specify below)</span>
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isOtherSelected
                        ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                        : "border-zinc-700 bg-transparent"
                    }`}
                  >
                    {isOtherSelected && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
                  </div>
                </button>

                {isOtherSelected && (
                  <input
                    type="text"
                    disabled={isSubmitting}
                    autoFocus
                    value={customOtherText[currentField.id] || ""}
                    onChange={(e) => handleCustomOtherChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isLastStep) {
                          handleSubmit();
                        } else if (isCurrentStepValid) {
                          handleNext();
                        }
                      }
                    }}
                    placeholder="Type your custom answer..."
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-[#161616] text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Multi-Select */}
        {currentField.type === "multiselect" && (
          <div className="space-y-2">
            {(currentField.options || []).map((option) => {
              const isSelected =
                Array.isArray(currentVal) && currentVal.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleToggleMultiSelect(option)}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-left text-[13px] font-medium transition-all flex items-center justify-between shadow-sm cursor-pointer ${
                    isSelected
                      ? "border-zinc-500 bg-[#2c2c2c] text-zinc-100"
                      : "border-zinc-800 bg-[#161616] text-zinc-300 hover:border-zinc-700 hover:bg-[#202020]"
                  }`}
                >
                  <span className="flex-1">{option}</span>
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                      isSelected
                        ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                        : "border-zinc-700 bg-transparent"
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Text Input */}
        {currentField.type === "text" && (
          <input
            type="text"
            disabled={isSubmitting}
            autoFocus
            value={(currentVal as string) || ""}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                if (isLastStep) {
                  handleSubmit();
                } else if (isCurrentStepValid) {
                  handleNext();
                }
              }
            }}
            placeholder={currentField.placeholder || "Enter your answer here..."}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-700 bg-[#161616] text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all shadow-inner"
          />
        )}

        {/* Textarea */}
        {currentField.type === "textarea" && (
          <textarea
            rows={3}
            disabled={isSubmitting}
            autoFocus
            value={(currentVal as string) || ""}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={currentField.placeholder || "Enter details here..."}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-700 bg-[#161616] text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all shadow-inner resize-y min-h-[72px]"
          />
        )}
      </div>

      {/* Footer Navigation Controls */}
      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/80">
        <div>
          {currentStepIndex > 0 ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBack();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isLastStep ? (
            <button
              key="form-nav-btn-next"
              type="button"
              disabled={!isCurrentStepValid || isSubmitting}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNext();
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm ${
                isCurrentStepValid && !isSubmitting
                  ? "bg-zinc-200 text-zinc-900 hover:bg-white cursor-pointer"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
              }`}
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              key="form-nav-btn-submit"
              type="button"
              disabled={!isCurrentStepValid || isSubmitting || isStreaming}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(e);
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm ${
                isCurrentStepValid && !isSubmitting && !isStreaming
                  ? "bg-zinc-200 text-zinc-900 hover:bg-white cursor-pointer"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border border-zinc-600 border-t-zinc-200" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  <span>{payload.submit_label || "Submit Answers"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
