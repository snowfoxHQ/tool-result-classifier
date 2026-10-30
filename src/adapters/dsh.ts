import type { Adapter } from "../core/pipeline.js";

interface DshEvent {
  type?: string;
  data?: {
    name?: string;
    callId?: string;
    message?: {
      toolCallId?: string;
      isError?: boolean;
      content?: Array<{ text?: string }>;
    };
  };
}

export function createDshAdapter(events: unknown[]): Adapter {
  const callNames = new Map<string, string>();
  for (const e of events) {
    const ev = e as DshEvent;
    if (ev?.type === "tool/call" && ev.data?.callId && ev.data?.name) {
      callNames.set(ev.data.callId, ev.data.name);
    }
  }
  return {
    name: "dsh",
    isToolResult(raw) {
      return (raw as DshEvent)?.type === "tool/result";
    },
    extractToolName(raw) {
      const id = (raw as DshEvent)?.data?.message?.toolCallId;   // ← 从 message 里取
      return (id && callNames.get(id)) || "unknown";
    },
    extractText(raw) {
      const c = (raw as DshEvent)?.data?.message?.content;
      if (!Array.isArray(c)) return "";
      return c.map(x => x?.text ?? "").join("\n");
    },
    normalize(raw) {
      return { isError: (raw as DshEvent)?.data?.message?.isError };
    },
  };
}
