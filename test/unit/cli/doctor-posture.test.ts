import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expectRepoGenericDoctorPosture, runDoctor } from "../../helpers/doctor.js";
import { cleanupTestRepo, createCommittedTestRepo } from "../../helpers/git.js";

function normalizeDoctorPostureForCommandParity(output: string): string {
  return output
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("next:")) return "  next: <runtime-posture>";
      if (trimmed.startsWith("concurrency:")) return "  concurrency: <runtime-posture>";
      return line;
    })
    .join("\n");
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

  it("Can I run `graft doctor` in a temp repo and read a concise health posture report without seeing raw JSON?", async () => {
    const repoDir = createCommittedTestRepo("graft-cli-doctor-posture-");
    try {
      const { stdout, stderr } = await runDoctor(repoDir, ["doctor"]);

      expect(stderr).toBe("");
      expectRepoGenericDoctorPosture(stdout);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Do top-level `graft doctor` and `graft diag doctor` use the same repo-generic posture rendering by default?", async () => {
    const repoDir = createCommittedTestRepo("graft-cli-diag-doctor-posture-");
    try {
      const topLevel = await runDoctor(repoDir, ["doctor"]);
      const grouped = await runDoctor(repoDir, ["diag", "doctor"]);

      expect(topLevel.stderr).toBe("");
      expect(grouped.stderr).toBe("");
      expectRepoGenericDoctorPosture(topLevel.stdout);
      expectRepoGenericDoctorPosture(grouped.stdout);
      expect(normalizeDoctorPostureForCommandParity(grouped.stdout)).toBe(
        normalizeDoctorPostureForCommandParity(topLevel.stdout),
      );
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Rejects product-boundary wording variants in doctor posture output", () => {
    const baseline = [
      "Graft Doctor",
      "Health",
      "Capability posture",
      "Repo footing",
      "Sludge scan",
      "not requested",
    ].join("\n");

    expect(() => {
      expectRepoGenericDoctorPosture(`${baseline}\ndependency-DAG`);
    }).toThrow();
    expect(() => {
      expectRepoGenericDoctorPosture(`${baseline}\nProject Management`);
    }).toThrow();
    expect(() => {
      expectRepoGenericDoctorPosture(`${baseline}\npre_commit gate`);
    }).toThrow();
  });

  it("Does `graft doctor --json` preserve the existing schema-validated CLI peer surface?", async () => {
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

  it("Can I tell whether sludge scanning was requested without doctor pretending sludge is a mandatory lint gate?", async () => {
    const repoDir = createCommittedTestRepo("graft-cli-doctor-sludge-posture-");
    try {
      const { stdout, stderr } = await runDoctor(repoDir, ["doctor"]);

      expect(stderr).toBe("");
      expect(stdout).toContain("Sludge scan");
      expect(stdout).toContain("not requested");
      expect(stdout).not.toContain("lint gate");
      expect(stdout).not.toContain("mandatory");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Is there no METHOD backlog, release, retro, dependency-DAG, or project-management state in the output?", async () => {
    const repoDir = createCommittedTestRepo("graft-cli-doctor-product-boundary-");
    try {
      const { stdout, stderr } = await runDoctor(repoDir, ["doctor"]);

      expect(stderr).toBe("");
      expectRepoGenericDoctorPosture(stdout);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Do tests prove the first slice does not mention drift-sentinel, structural-drift-detection, version-drift, or CI/pre-commit gate semantics?", async () => {
    const repoDir = createCommittedTestRepo("graft-cli-doctor-no-gate-");
    try {
      const { stdout, stderr } = await runDoctor(repoDir, ["doctor"]);

      expect(stderr).toBe("");
      expectRepoGenericDoctorPosture(stdout);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
