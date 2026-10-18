import { z } from "zod";

/**
 * Universal contract for any UI action (questionnaires, sliders, cards, pickers, etc.)
 */
export interface UiAction<
  TPayload = Record<string, unknown>,
  TState = Record<string, unknown>,
> {
  type: string;
  id: string;
  payload: TPayload;
  state?: TState;
}

/**
 * Props passed to any registered UI action card component.
 */
export interface UiActionComponentProps<
  TPayload = Record<string, unknown>,
  TState = Record<string, unknown>,
> {
  messageId: string;
  id: string;
  payload: TPayload;
  state?: TState;
  onComplete?: (state: TState, responseText: string) => Promise<void> | void;
  isStreaming?: boolean;
}

/**
 * Zod schema for validating the base structure of a UI action block.
 */
export const BaseUiActionSchema = z.object({
  type: z.string().min(1),
  id: z.string().default(() => "action_" + Date.now().toString()),
  payload: z.record(z.string(), z.unknown()).default({}),
  state: z.record(z.string(), z.unknown()).optional(),
});

import type { Asset } from "./asset.types";

/**
 * Universal message content schema supporting text, embedded action, hidden flag, and structured assets.
 */
export interface MessageContent {
  text: string;
  action?: UiAction;
  isHidden?: boolean;
  assets?: Asset;
}
