import { readFileSync, readdirSync, statSync } from "node:fs";
import { zstdDecompressSync } from "node:zlib";

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

export function decodeMultiFrameZstd(buf: Buffer): Buffer {
  const frames: Buffer[] = [];
  let offset = 0;
  while (offset < buf.length) {
    const idx = buf.indexOf(ZSTD_MAGIC, offset);
    if (idx === -1) break;
    const next = buf.indexOf(ZSTD_MAGIC, idx + 4);
    const end = next === -1 ? buf.length : next;
    frames.push(zstdDecompressSync(buf.subarray(idx, end)));
    offset = end;
  }
  return Buffer.concat(frames);
}

export function readSessionFile(path: string): string {
  const raw = readFileSync(path);
  const isZstd = raw.subarray(0, 4).equals(ZSTD_MAGIC);
  return isZstd ? decodeMultiFrameZstd(raw).toString("utf8") : raw.toString("utf8");
}

export function* walkZstd(target: string): Generator<string> {
  const st = statSync(target);
  if (st.isFile()) {
    if (target.endsWith(".zstd") || target.endsWith(".jsonl")) yield target;
    return;
  }
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    const p = `${target}/${entry.name}`;
    if (entry.isDirectory()) yield* walkZstd(p);
    else if (entry.name.endsWith(".zstd") || entry.name.endsWith(".jsonl")) yield p;
  }
}
