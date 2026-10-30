export interface Verdict {
  ok: boolean;
  confidence: "certain" | "likely" | "heuristic";
  source: "exit-code" | "error-flag" | "content-heuristic";
  exitCode: number | null;
  failedLines: string[];
}

export interface Adapter {
  name: string;
  isToolResult(raw: unknown): boolean;
  extractToolName(raw: unknown): string;
  extractText(raw: unknown): string;
  normalize(raw: unknown): { isError?: boolean; exitCode?: number };
}

const EXIT_CODE_RE = /\[exit code:\s*(-?\d+)\]/gi;

export function classifyToolResult(raw: unknown, adapter: Adapter): Verdict {
  const text = adapter.extractText(raw);
  const n = adapter.normalize(raw);

  // 第 1 层：结构化退出码
  if (typeof n.exitCode === "number") {
    return mk(n.exitCode === 0, "certain", "exit-code", n.exitCode, text);
  }
  // 第 1 层：文本里的 [exit code: N]（取最后一个，末尾是最终结果）
  const matches = [...text.matchAll(EXIT_CODE_RE)];
  if (matches.length > 0) {
    const code = parseInt(matches[matches.length - 1][1], 10);
    return mk(code === 0, "certain", "exit-code", code, text);
  }
  // 第 2 层：isError
  if (typeof n.isError === "boolean") {
    return mk(!n.isError, "likely", "error-flag", null, text);
  }
  // 兜底：无依据，默认成功
  return mk(true, "heuristic", "content-heuristic", null, text);
}

function mk(ok: boolean, confidence: Verdict["confidence"], source: Verdict["source"],
            exitCode: number | null, text: string): Verdict {
  return { ok, confidence, source, exitCode, failedLines: ok ? [] : failedLines(text) };
}

function failedLines(text: string): string[] {
  return text.split("\n")
    .filter(l => /error|fail|exception|assert/i.test(l))
    .filter(l => !/triggerUncaughtException\(|^\s+at /.test(l))
    .map(l => l.trim())
    .slice(0, 3);
}
