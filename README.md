# tool-result-classifier

判定 agent 工具调用成功/失败的小工具。零依赖，带证据。

## 实测（本机 31 个 dsh 会话）

- 538 次工具调用，66 次失败，失败率 **12.3%**
- `pwsh` 占失败 56%（207 次调用 / 37 次失败）
- **25 次有退出码可对照的调用，`isError` 全部漏标**（退出码 1 但 `isError: false`）

## 用法

扫描真实会话（zstd 多帧自动解码）：
npx tsx -e "import { scan } from './src/cli/scan.ts'; scan(process.argv[1])" ~/.dsh/sessions

扫描合成 fixture（验证判定逻辑）：
npx tsx -e "import { scan } from './src/cli/scan.ts'; scan('test/fixtures/dsh/synthetic.jsonl')"

## 判定管线

4 层降级，先命中先返回：

1. **退出码**（`certain`）：结构化 `exitCode` 或文本 `[exit code: N]`
2. **错误标志**（`likely`）：`isError` / `error` / `ok` / `status`
3. **stderr 标记**（`likely`）
4. **文本启发式**（`heuristic`）

## 状态

实验性。适配器目前只有 dsh。下一步：`--suspicious`（量化 `isError` 漏判率）。

## Development / 开发测试

```bash
# 安装依赖
npm install

# 运行合成数据测试（验证多帧解码与判定逻辑）
node --test --experimental-test-isolation=none