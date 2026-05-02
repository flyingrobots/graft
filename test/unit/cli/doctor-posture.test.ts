import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/main.js";
import { cleanupTestRepo, createCommittedTestRepo } from "../../helpers/git.js";
import { createBufferWriter } from "../../helpers/init.js";

const FORBIDDEN_PRODUCT_BOUNDARY_TERMS = [
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

async function runDoctor(repoDir: string, args: readonly string[]) {
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

function expectRepoGenericDoctorPosture(output: string): void {
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

describe("cli: doctor repo-generic posture", () => {
  let previousExitCode: typeof process.exitCode;

  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it("renders top-level graft doctor as deterministic repo-generic posture text by default", async () => {
    const repoDir = createCommittedTestRepo("graft-cli-doctor-posture-");
    try {
      const { stdout, stderr } = await runDoctor(repoDir, ["doctor"]);

      expect(stderr).toBe("");
      expectRepoGenericDoctorPosture(stdout);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("renders graft diag doctor through the same repo-generic posture surface by default", async () => {
    const repoDir = createCommittedTestRepo("graft-cli-diag-doctor-posture-");
    try {
      const { stdout, stderr } = await runDoctor(repoDir, ["diag", "doctor"]);

      expect(stderr).toBe("");
      expectRepoGenericDoctorPosture(stdout);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("preserves the schema-validated JSON doctor peer surface when requested", async () => {
    const repoDir = createCommittedTestRepo("graft-cli-doctor-json-");
    try {
      const { stdout, stderr } = await runDoctor(repoDir, ["doctor", "--json"]);
      const parsed = JSON.parse(stdout) as {
        _schema: { id: string };
        projectRoot?: string;
        runtimeObservability?: unknown;
        repoConcurrency?: unknown;
        integrityChecks?: unknown;
      };

      expect(stderr).toBe("");
      expect(parsed._schema.id).toBe("graft.cli.diag_doctor");
      expect(parsed.projectRoot).toBe(repoDir);
      expect(parsed.runtimeObservability).toBeDefined();
      expect(parsed.repoConcurrency).toBeDefined();
      expect(parsed.integrityChecks).toBeUndefined();
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
