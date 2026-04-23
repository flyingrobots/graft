import { describe, it, expect } from "vitest";
import {
  parseReceiptsForReplay,
  renderReplayMarkdown,

} from "../../../src/operations/session-replay.js";

const SAMPLE_RECEIPTS = [
  '{"tool":"graft_map","path":"src/","ts":"2026-01-01T00:00:01Z","sessionId":"s1"}',
  '{"tool":"file_outline","path":"src/app.ts","ts":"2026-01-01T00:00:02Z","sessionId":"s1"}',
  '{"tool":"code_show","path":"src/app.ts","symbol":"main","ts":"2026-01-01T00:00:03Z","sessionId":"s1"}',
  '{"tool":"safe_read","path":"src/util.ts","ts":"2026-01-01T00:00:04Z","sessionId":"s1"}',
].join("\n");

describe("operations: session-replay", () => {
  describe("parseReceiptsForReplay", () => {
    it("parses NDJSON receipts into replay entries", () => {
      const entries = parseReceiptsForReplay(SAMPLE_RECEIPTS, "s1");

      expect(entries.length).toBe(4);
      expect(entries[0]!.tool).toBe("graft_map");
      expect(entries[1]!.tool).toBe("file_outline");
      expect(entries[2]!.symbol).toBe("main");
    });

    it("filters by session ID", () => {
      const mixed = SAMPLE_RECEIPTS + '\n{"tool":"safe_read","path":"x.ts","ts":"2026-01-01T00:00:05Z","sessionId":"other"}';
      const entries = parseReceiptsForReplay(mixed, "s1");

      expect(entries.length).toBe(4);
    });

    it("returns empty for unknown session", () => {
      const entries = parseReceiptsForReplay(SAMPLE_RECEIPTS, "nonexistent");
      expect(entries).toEqual([]);
    });
  });

  describe("renderReplayMarkdown", () => {
    it("produces a Markdown summary with tool calls in order", () => {
      const entries = parseReceiptsForReplay(SAMPLE_RECEIPTS, "s1");
      const md = renderReplayMarkdown(entries);

      expect(md).toContain("graft_map");
      expect(md).toContain("file_outline");
      expect(md).toContain("code_show");
      expect(md).toContain("src/app.ts");
    });

    it("renders empty session as no-activity message", () => {
      const md = renderReplayMarkdown([]);
      expect(md).toContain("No activity");
    });
  });
});
