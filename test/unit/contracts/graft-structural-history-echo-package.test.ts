import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { readStructuralHistorySchemaManifest } from "../../../scripts/check-structural-history-schema-artifacts.js";
import {
  checkStructuralHistoryEchoPackageDescriptor,
  expectedStructuralHistoryEchoPackageDescriptor,
  readGraftPackageManifest,
  readStructuralHistoryEchoPackageDescriptor,
} from "../../../scripts/check-structural-history-echo-package.js";

function writeFixtureDescriptor(options: { readonly descriptorVersion?: number } = {}): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-echo-package-descriptor-"));
  const manifest = readStructuralHistorySchemaManifest();
  const graftPackage = readGraftPackageManifest();
  const descriptor = {
    ...expectedStructuralHistoryEchoPackageDescriptor(manifest, graftPackage),
    ...options,
  };

  fs.mkdirSync(path.join(workspaceRoot, "schemas"), { recursive: true });
  fs.writeFileSync(
    path.join(workspaceRoot, "schemas/graft-structural-history.manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(workspaceRoot, "package.json"),
    `${JSON.stringify(graftPackage, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(workspaceRoot, "schemas/graft-structural-history.echo-package.json"),
    `${JSON.stringify(descriptor, null, 2)}\n`,
  );

  return workspaceRoot;
}

describe("Graft structural-history Echo package descriptor", () => {
  it("stays deterministically derived from schema authority and package identity", () => {
    const result = checkStructuralHistoryEchoPackageDescriptor();

    expect(result.violations).toEqual([]);
    expect(result.descriptor).toEqual(result.expectedDescriptor);
  });

  it("describes a descriptor-only Echo boundary with repo-root-relative paths", () => {
    const descriptor = readStructuralHistoryEchoPackageDescriptor();

    expect(descriptor.package).toEqual({
      id: "graft.structural-history",
      kind: "echo-contract-package",
      sourcePackageName: "@flyingrobots/graft",
      sourcePackageVersion: readGraftPackageManifest().version,
    });
    expect(descriptor.echo).toEqual({
      runtimeRequired: false,
      packageInstallationRequired: false,
      integrationStage: "descriptor-only",
      typescriptClientBinding: "planned",
    });
    expect(descriptor.schema.path).toBe("schemas/graft-structural-history.graphql");
    expect(path.isAbsolute(descriptor.schema.path)).toBe(false);
    for (const artifact of descriptor.generatedArtifacts) {
      expect(path.isAbsolute(artifact.path)).toBe(false);
      expect(artifact.path.includes("\\")).toBe(false);
    }
  });

  it("fails Graft-local checks when the descriptor drifts", () => {
    const workspaceRoot = writeFixtureDescriptor({ descriptorVersion: 2 });

    try {
      expect(checkStructuralHistoryEchoPackageDescriptor(workspaceRoot).violations).toContain(
        "schemas/graft-structural-history.echo-package.json does not match the deterministic descriptor derived from " +
          "schemas/graft-structural-history.manifest.json and package.json.",
      );
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});
