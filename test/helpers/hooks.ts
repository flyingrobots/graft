import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect } from "vitest";
import { HookInput } from "../../src/hooks/shared.js";
import { fixtureRoot } from "./fixtures.js";

export type ReadHookEventName = "PreToolUse" | "PostToolUse";

export interface HookOutputLike {
  exitCode: number;
  stderr: string;
}

export function makeReadHookInput(
  filePath: string,
  cwd: string,
  hookEventName: ReadHookEventName,
): HookInput {
  return new HookInput({
    session_id: "test-session",
    cwd,
    hook_event_name: hookEventName,
    tool_name: "Read",
    tool_input: { file_path: filePath },
  });
}

export function makeFixtureReadHookInput(
  filePath: string,
  hookEventName: ReadHookEventName,
  cwd: string = fixtureRoot(),
): HookInput {
  return makeReadHookInput(filePath, cwd, hookEventName);
}

export function refusalReasonFromHook(output: HookOutputLike): string | null {
  const match = /Refused: ([A-Z_]+)/.exec(output.stderr);
  return match?.[1] ?? null;
}

export function expectGovernedReadGuidance(stderr: string): void {
  expect(stderr).toContain("Governed read");
  expect(stderr).toContain("safe_read");
  expect(stderr).toContain("read_range");
}

export function expectPostReadEducation(stderr: string): void {
  expect(stderr).toContain("[graft]");
  expect(stderr).toContain("bypassed graft's governed path");
  expect(stderr).toContain("safe_read");
  expect(stderr).toContain("saving");
}

export function createTempHookDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function cleanupHookDir(tmpDir: string): void {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
