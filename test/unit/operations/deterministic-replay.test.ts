import { describe, it, expect } from "vitest";
import {
  createSnapshotFs,
  replayToolCalls,

  type RecordedToolCall,
} from "../../../src/operations/deterministic-replay.js";

describe("operations: deterministic-replay", () => {
  describe("createSnapshotFs", () => {
    it("serves file contents from a snapshot map", async () => {
      const fs = createSnapshotFs({
        "src/app.ts": "export function main(): void {}\n",
        "README.md": "# Hello\n",
      });

      const content = await fs.readFile("src/app.ts", "utf-8");
      expect(content).toBe("export function main(): void {}\n");
    });

    it("throws on missing file", async () => {
      const fs = createSnapshotFs({});
      await expect(fs.readFile("missing.ts", "utf-8")).rejects.toThrow();
    });

    it("lists directory contents from snapshot keys", async () => {
      const fs = createSnapshotFs({
        "src/a.ts": "",
        "src/b.ts": "",
        "lib/c.ts": "",
      });

      const entries = await fs.readdir("src");
      expect(entries.sort()).toEqual(["a.ts", "b.ts"]);
    });
  });

  describe("replayToolCalls", () => {
    it("replays recorded calls and reports matches", async () => {
      const calls: RecordedToolCall[] = [
        { tool: "test_echo", args: { msg: "hi" }, expectedResult: { echo: "hi" } },
        { tool: "test_echo", args: { msg: "bye" }, expectedResult: { echo: "bye" } },
      ];

      const handler = (_tool: string, args: Record<string, unknown>) => Promise.resolve({
        echo: args["msg"],
      });

      const result = await replayToolCalls(calls, handler);

      expect(result.total).toBe(2);
      expect(result.matched).toBe(2);
      expect(result.mismatched).toBe(0);
      expect(result.passed).toBe(true);
    });

    it("detects mismatches between expected and actual results", async () => {
      const calls: RecordedToolCall[] = [
        { tool: "test_echo", args: { msg: "hi" }, expectedResult: { echo: "hi" } },
      ];

      const handler = () => Promise.resolve({ echo: "wrong" });

      const result = await replayToolCalls(calls, handler);

      expect(result.passed).toBe(false);
      expect(result.mismatched).toBe(1);
      expect(result.failures.length).toBe(1);
      expect(result.failures[0]!.index).toBe(0);
    });

    it("handles empty scenario", async () => {
      const result = await replayToolCalls([], () => Promise.resolve({}));

      expect(result.passed).toBe(true);
      expect(result.total).toBe(0);
    });
  });
});
