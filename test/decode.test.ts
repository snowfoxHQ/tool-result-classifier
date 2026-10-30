import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { decodeMultiFrameZstd } from "../src/session/reader.js";

test("多帧 zstd 必须解出所有帧（27 帧，不是 1 帧）", () => {
  const buf = readFileSync("test/fixtures/dsh/sample.v4.jsonl.zstd");
  const out = decodeMultiFrameZstd(buf).toString("utf8");
  const lines = out.split("\n").filter(Boolean);
  console.log(`解出 ${lines.length} 行 / ${out.length} 字节`);
  // 27 帧的文件，如果只解第一帧会是个位数行、几百字节
  assert.ok(lines.length > 20, `应解出 >20 行，实际 ${lines.length}（只解第一帧会很少）`);
  assert.ok(out.length > 3000, `应解出 >3000 字节，实际 ${out.length}`);
});
