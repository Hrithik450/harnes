/**
 * Derives the "thoughts" shown in the loading UI for a single LLM step.
 *
 * Design goal: STABILITY. We never rely solely on the model emitting
 * <thought> tags (it does so inconsistently). Instead we build the thought
 * list from everything we actually know about the step, in priority order,
 * and GUARANTEE at least two thoughts so the UI never renders empty or jumps.
 *
 * One LLM call (one step) => at least two thoughts.
 */

export interface Thought {
  title: string;
  subtitle?: string;
}

interface LooseToolCall {
  toolName?: string;
  // ai@v7 uses `input`; older shapes used `args`. Read both defensively.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any;
}

interface LooseStep {
  text?: string;
  toolCalls?: LooseToolCall[];
}

/** Human-readable labels for the tools, used when the model gave nothing. */
const TOOL_LABELS: Record<string, string> = {
  fetch_skill: "the skill guidelines",
  search_web: "the web",
  scrape_landing_page: "the landing page",
  get_search_volume: "search volume data",
  search_ad_library: "the Meta Ad Library",
  validate_meta_interests: "Meta interest data",
};

const THOUGHT_TAG = /<thought>([\s\S]*?)<\/thought>/g;

function stripThoughtTags(text: string): string {
  return text.replace(THOUGHT_TAG, "").trim();
}

function extractTaggedThoughts(text: string): string[] {
  const out: string[] = [];
  // Fresh regex each call: the global flag makes .exec stateful on a shared instance.
  const re = /<thought>([\s\S]*?)<\/thought>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const t = match[1].replace(/\s+/g, " ").trim();
    if (t) out.push(t);
  }
  return out;
}

function toolInput(call: LooseToolCall): Record<string, unknown> {
  return (call.input ?? call.args ?? {}) as Record<string, unknown>;
}

/**
 * @param step      the finished LLM step (from onStepFinish)
 * @param stepIndex zero-based index of this LLM call in the run
 */
export function extractThoughts(step: LooseStep, stepIndex: number): Thought[] {
  const text = step.text ?? "";
  const toolCalls = step.toolCalls ?? [];
  const thoughts: Thought[] = [];
  const seen = new Set<string>();

  const push = (t: Thought) => {
    const key = t.title.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    thoughts.push({ title: t.title.trim(), subtitle: t.subtitle?.trim() });
  };

  // 1) Model-authored thoughts (the good stuff, when present).
  for (const t of extractTaggedThoughts(text)) {
    push({ title: t.slice(0, 120) });
  }

  // 2) Thoughts the model attached to its tool calls (title/subtitle params).
  for (const call of toolCalls) {
    const input = toolInput(call);
    const title = input.title;
    if (typeof title === "string" && title.trim()) {
      push({
        title,
        subtitle:
          typeof input.subtitle === "string" ? input.subtitle : undefined,
      });
    }
  }

  // 3) Synthesize an "action" thought when the model gave us none but DID
  //    call tools — the action itself is the thought.
  if (toolCalls.length > 0 && thoughts.length === 0) {
    const labels = toolCalls
      .map((c) => TOOL_LABELS[c.toolName ?? ""] ?? c.toolName ?? "a tool")
      .filter(Boolean);
    push({ title: `Looking up ${labels.join(" and ")}.` });
  }

  // 4) Guarantee at least two thoughts. Pad with context-appropriate
  //    fallbacks so a bare step still renders a believable two-step flow.
  const producedProse =
    toolCalls.length === 0 && stripThoughtTags(text).length > 0;
  const fallbacks: Thought[] =
    stepIndex === 0
      ? [
          { title: "Understanding your request and intent." },
          { title: "Planning the best approach to take." },
        ]
      : producedProse
        ? [
            { title: "Reviewing everything I gathered." },
            { title: "Composing the final response." },
          ]
        : [
            { title: "Reviewing the results from the last step." },
            { title: "Deciding what to do next." },
          ];

  for (const f of fallbacks) {
    if (thoughts.length >= 2) break;
    push(f);
  }

  // Keep the panel tidy — never flood the UI with a wall of thoughts.
  return thoughts.slice(0, 4);
}

export { stripThoughtTags };
