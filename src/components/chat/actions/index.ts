import React from "react";
import { z } from "zod";
import type { UiActionComponentProps } from "@/lib/types";
import { FormPayloadSchema } from "./form/form.types";
import { FormCard } from "./form/form.card";

export interface UiActionRegistryEntry {
  schema: z.ZodTypeAny;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<UiActionComponentProps<any, any>>;
}

/**
 * Universal UI Action Registry.
 * - form: Universal Multi-Step Form (handles choice, text, textarea, multiselect, etc.)
 */
export const uiActionRegistry: Record<string, UiActionRegistryEntry> = {
  form: {
    schema: FormPayloadSchema,
    component: FormCard,
  },
};

/**
 * Helper to retrieve an action registry entry safely.
 */
export function getUiActionEntry(
  type: string,
): UiActionRegistryEntry | undefined {
  return uiActionRegistry[type];
}

export * from "./form/form.types";
export * from "./form/form.card";
