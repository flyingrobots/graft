import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expectRepoGenericDoctorPosture, runDoctor } from "../../test/helpers/doctor.js";
import { cleanupTestRepo, createCommittedTestRepo } from "../../test/helpers/git.js";

describe("CORE_graft-doctor playback", () => {
  let previousExitCode: typeof process.exitCode;

  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it("Can I run `graft doctor` in a temp repo and read a concise health posture report without seeing raw JSON?", async () => {
    const repoDir = createCommittedTestRepo("graft-doctor-playback-human-");
    try {
      const result = await runDoctor(repoDir, ["doctor"]);

      expect(result.stderr).toBe("");
      expectRepoGenericDoctorPosture(result.stdout);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Can I tell whether sludge scanning was requested without doctor pretending sludge is a mandatory lint gate?", async () => {
    const repoDir = createCommittedTestRepo("graft-doctor-playback-sludge-");
    try {
      const result = await runDoctor(repoDir, ["doctor"]);

      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Sludge scan");
      expect(result.stdout).toContain("not requested");
      expect(result.stdout).not.toContain("mandatory");
      expect(result.stdout).not.toContain("lint gate");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Is there no METHOD backlog, release, retro, dependency-DAG, or project-management state in the output?", async () => {
    const repoDir = createCommittedTestRepo("graft-doctor-playback-no-method-");
    try {
      const result = await runDoctor(repoDir, ["doctor"]);

      expect(result.stderr).toBe("");
      expectRepoGenericDoctorPosture(result.stdout);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Does `graft doctor --json` preserve the existing schema-validated CLI peer surface?", async () => {
    const repoDir = createCommittedTestRepo("graft-doctor-playback-json-");
    try {
      const result = await runDoctor(repoDir, ["doctor", "--json"]);
      const parsed = JSON.parse(result.stdout) as {
        _schema: { id: string };
        projectRoot?: string;
        runtimeObservability?: unknown;
        repoConcurrency?: unknown;
        integrityChecks?: unknown;
      };

      expect(result.stderr).toBe("");
      expect(parsed._schema.id).toBe("graft.cli.diag_doctor");
      expect(parsed.projectRoot).toBe(repoDir);
      expect(parsed.runtimeObservability).toBeDefined();
      expect(parsed.repoConcurrency).toBeDefined();
      expect(parsed.integrityChecks).toBeUndefined();
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Do top-level `graft doctor` and `graft diag doctor` use the same repo-generic posture rendering by default?", async () => {
    const repoDir = createCommittedTestRepo("graft-doctor-playback-alias-");
    try {
      const topLevel = await runDoctor(repoDir, ["doctor"]);
      const grouped = await runDoctor(repoDir, ["diag", "doctor"]);

      expect(topLevel.stderr).toBe("");
      expect(grouped.stderr).toBe("");
      expectRepoGenericDoctorPosture(topLevel.stdout);
      expectRepoGenericDoctorPosture(grouped.stdout);
      expect(grouped.stdout.trimStart().startsWith("{")).toBe(false);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Do tests prove the first slice does not mention drift-sentinel, structural-drift-detection, version-drift, or CI/pre-commit gate semantics?", async () => {
    const repoDir = createCommittedTestRepo("graft-doctor-playback-no-gate-");
    try {
      const result = await runDoctor(repoDir, ["doctor"]);

      expect(result.stderr).toBe("");
      expectRepoGenericDoctorPosture(result.stdout);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
