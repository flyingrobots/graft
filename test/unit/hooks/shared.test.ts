import { describe, it, expect } from "vitest";
import { parseHookInput, safeRelativePath } from "../../../src/hooks/shared.js";

describe("hooks: shared utilities", () => {
  // -----------------------------------------------------------------------
  // parseHookInput
  // -----------------------------------------------------------------------
  describe("parseHookInput", () => {
    it("parses valid input", () => {
      const raw = JSON.stringify({
        session_id: "s1",
        cwd: "/home/user/project",
        hook_event_name: "PreToolUse",
        tool_name: "Read",
        tool_input: { file_path: "/home/user/project/src/index.ts" },
      });
      const input = parseHookInput(raw);
      expect(input.session_id).toBe("s1");
      expect(input.cwd).toBe("/home/user/project");
      expect(input.tool_input.file_path).toBe(
        "/home/user/project/src/index.ts",
      );
    });

    it("parses optional fields", () => {
      const raw = JSON.stringify({
        session_id: "s1",
        cwd: "/tmp",
        hook_event_name: "PostToolUse",
        tool_name: "Read",
        tool_input: { file_path: "/tmp/f.ts", offset: 10, limit: 50 },
        tool_result: "file contents",
      });
      const input = parseHookInput(raw);
      expect(input.tool_input.offset).toBe(10);
      expect(input.tool_input.limit).toBe(50);
      expect(input.tool_result).toBe("file contents");
    });

    it("throws on non-object input", () => {
      expect(() => parseHookInput('"hello"')).toThrow("JSON object");
    });

    it("throws on missing session_id", () => {
      const raw = JSON.stringify({
        cwd: "/tmp",
        tool_input: { file_path: "/tmp/f.ts" },
      });
      expect(() => parseHookInput(raw)).toThrow("session_id");
    });

    it("throws on missing cwd", () => {
      const raw = JSON.stringify({
        session_id: "s1",
        tool_input: { file_path: "/tmp/f.ts" },
      });
      expect(() => parseHookInput(raw)).toThrow("cwd");
    });

    it("throws on missing tool_input", () => {
      const raw = JSON.stringify({
        session_id: "s1",
        cwd: "/tmp",
      });
      expect(() => parseHookInput(raw)).toThrow("tool_input");
    });

    it("throws on missing file_path", () => {
      const raw = JSON.stringify({
        session_id: "s1",
        cwd: "/tmp",
        tool_input: {},
      });
      expect(() => parseHookInput(raw)).toThrow("file_path");
    });

    it("throws on invalid JSON", () => {
      expect(() => parseHookInput("not json")).toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // safeRelativePath
  // -----------------------------------------------------------------------
  describe("safeRelativePath", () => {
    it("returns relative path for file inside cwd", () => {
      expect(safeRelativePath("/project", "/project/src/index.ts")).toBe(
        "src/index.ts",
      );
    });

    it("returns null for file outside cwd (../ prefix)", () => {
      expect(safeRelativePath("/project", "/etc/passwd")).toBeNull();
    });

    it("returns null for file in parent directory", () => {
      expect(safeRelativePath("/project/sub", "/project/other.ts")).toBeNull();
    });

    it("returns filename for file directly in cwd", () => {
      expect(safeRelativePath("/project", "/project/file.ts")).toBe("file.ts");
    });
  });
});
