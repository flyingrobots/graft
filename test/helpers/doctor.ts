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

function normalizeForbiddenTermText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactForbiddenTermText(value: string): string {
  return normalizeForbiddenTermText(value).replaceAll(" ", "");
}

function hasForbiddenTermVariant(output: string, forbidden: string): boolean {
  const normalizedOutput = normalizeForbiddenTermText(output);
  const normalizedForbidden = normalizeForbiddenTermText(forbidden);
  if (normalizedOutput.includes(normalizedForbidden)) return true;

  const compactForbidden = compactForbiddenTermText(forbidden);
  const compactOutput = compactForbiddenTermText(output);
  return normalizedForbidden.includes(" ") && compactOutput.includes(compactForbidden);
}

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
    expect(hasForbiddenTermVariant(output, forbidden)).toBe(false);
  }
}
