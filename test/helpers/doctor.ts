import { expect } from "vitest";
import { runCli } from "../../src/cli/main.js";
import { createBufferWriter } from "./init.js";

export const FORBIDDEN_PRODUCT_BOUNDARY_TERMS = [
  "METHOD",
  "backlog",
  "retro",
  "release",
  "dependency DAG",
  "project-management",
  "drift-sentinel",
  "structural-drift-detection",
  "version-drift",
  "CI gate",
  "pre-commit gate",
];

export async function runDoctor(repoDir: string, args: readonly string[]) {
  const stdout = createBufferWriter();
  const stderr = createBufferWriter();
  await runCli({
    cwd: repoDir,
    args,
    stdout,
    stderr,
  });
  return { stdout: stdout.text(), stderr: stderr.text() };
}

export function expectRepoGenericDoctorPosture(output: string): void {
  expect(output.trimStart().startsWith("{")).toBe(false);
  expect(output).toContain("Graft Doctor");
  expect(output).toContain("Health");
  expect(output).toContain("Capability posture");
  expect(output).toContain("Repo footing");
  expect(output).toContain("Sludge scan");
  expect(output).toContain("not requested");
  for (const forbidden of FORBIDDEN_PRODUCT_BOUNDARY_TERMS) {
    expect(output).not.toContain(forbidden);
  }
}
