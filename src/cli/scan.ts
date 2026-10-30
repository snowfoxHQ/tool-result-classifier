import { readSessionFile, walkZstd } from "../session/reader.js";
import { createDshAdapter } from "../adapters/dsh.js";
import { classifyToolResult } from "../core/pipeline.js";

export function scan(dir: string) {
  let files = 0, toolResults = 0, failed = 0;
  const byTool: Record<string, { total: number; failed: number }> = {};
  const failedLines: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const f of walkZstd(dir)) {
    files++;
    const events: unknown[] = [];
    for (const line of readSessionFile(f).split("\n")) {
      if (!line.trim()) continue;
      try { events.push(JSON.parse(line)); } catch { /* skip bad line */ }
    }
    const adapter = createDshAdapter(events);   // 每个文件独立建映射
    for (const raw of events) {
      if (!adapter.isToolResult(raw)) continue;
      toolResults++;
      const tool = adapter.extractToolName(raw);
      byTool[tool] ??= { total: 0, failed: 0 };
      byTool[tool].total++;
      const v = classifyToolResult(raw, adapter);
      bySource[v.source] = (bySource[v.source] ?? 0) + 1;
      if (!v.ok) {
        failed++;
        byTool[tool].failed++;
        for (const l of v.failedLines) failedLines[l] = (failedLines[l] ?? 0) + 1;
      }
    }
  }

  console.log(JSON.stringify({
    files, toolResults, failed,
    rate: toolResults ? +(failed / toolResults).toFixed(3) : 0,
    bySource, byTool,
    topFailedLines: Object.entries(failedLines).sort((a, b) => b[1] - a[1]).slice(0, 5),
  }, null, 2));
}
