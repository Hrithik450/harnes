import type { MessageContent, UiAction } from "@/lib/types/ui.action.types";
import { AssetSchema, type Asset } from "@/lib/types/asset.types";

/**
 * Normalizes any message content (raw string or MessageContent object) into a strict MessageContent object.
 * Single source of truth for assets is message.content.assets (JSONB).
 * Strips any legacy HTML comments from text so text remains pure Markdown.
 */
export function normalizeMessageContent(
  content: MessageContent | string | null | undefined,
): MessageContent {
  if (!content) {
    return { text: "", isHidden: false };
  }

  let text = "";
  let action: UiAction | undefined;
  let isHidden = false;
  let assets: Asset | undefined;

  if (typeof content === "string") {
    text = content;
  } else {
    text = typeof content.text === "string" ? content.text : "";
    action = content.action as UiAction | undefined;
    isHidden = content.isHidden === true;
    const rawAsset = content.assets;
    if (rawAsset && typeof rawAsset === "object") {
      const parsed = AssetSchema.safeParse(rawAsset);
      if (parsed.success) {
        assets = parsed.data;
      }
    }
  }

  // If assets is not yet resolved, attempt to extract and validate it from <!-- ASSET_METADATA: ... -->
  if (!assets && text.includes("<!-- ASSET_METADATA:")) {
    const match = /<!--\s*ASSET_METADATA:\s*([\s\S]*?)\s*-->/.exec(text);
    if (match) {
      try {
        const parsed = AssetSchema.safeParse(JSON.parse(match[1]));
        if (parsed.success) {
          assets = parsed.data;
        } else {
          console.warn(
            "[normalizeMessageContent] Invalid AssetSchema metadata:",
            parsed.error,
          );
        }
      } catch (err) {
        console.warn(
          "[normalizeMessageContent] Failed to parse ASSET_METADATA JSON:",
          err,
        );
      }
    }
  }

  // Always strip any lingering ASSET_METADATA comments so stored text remains 100% clean Markdown
  if (text.includes("<!-- ASSET_METADATA:")) {
    text = text.replace(/<!--\s*ASSET_METADATA:\s*[\s\S]*?-->/g, "").trimEnd();
  }

  return {
    text,
    action,
    isHidden,
    assets,
  };
}

/**
 * Helper to extract text from a MessageContent object.
 */
export function extractMessageText(content: MessageContent | unknown): string {
  if (content && typeof content === "object") {
    return (content as MessageContent).text || "";
  }
  return typeof content === "string" ? content : "";
}

/**
 * Helper to check if a message should be hidden from UI rendering.
 */
export function isMessageHidden(message: {
  content: unknown;
  isHidden?: boolean;
}): boolean {
  if (message.isHidden === true) return true;
  if (message.content && typeof message.content === "object") {
    return (message.content as Record<string, unknown>).isHidden === true;
  }
  return false;
}

/**
 * Splits text into non-empty, clean content lines.
 * Handles cross-platform line breaks (\r?\n), trims whitespace,
 * and filters out empty lines or double newlines (\n\n) so blank lines
 * are never counted in total lines or slicing windows.
 */
export function splitMessageLines(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

/**
 * Injects user-selected action state into the <ui-action>{ ... }</ui-action> XML block.
 */
export function injectActionStateIntoMarkdown(
  markdownText: string,
  state: Record<string, unknown>,
): string {
  return markdownText.replace(
    /<ui-action>\s*([\s\S]*?)\s*<\/ui-action>/g,
    (fullMatch, jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (state.values) {
          parsed.values = {
            ...(parsed.values || {}),
            ...(state.values as Record<string, unknown>),
          };
        }
        parsed.state = {
          ...(parsed.state || {}),
          ...state,
        };
        return "<ui-action>\n" + JSON.stringify(parsed, null, 2) + "\n</ui-action>";
      } catch (err) {
        console.error(
          "[MessageUtils:injectActionStateIntoMarkdown:ParseError] Failed to parse JSON in ui-action block:",
          err,
          "Raw jsonStr:",
          jsonStr,
        );
        return fullMatch;
      }
    },
  );
}
