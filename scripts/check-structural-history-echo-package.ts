#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  readStructuralHistorySchemaManifest,
  type StructuralHistorySchemaManifest,
} from "./check-structural-history-schema-artifacts.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_DESCRIPTOR_PATH = "schemas/graft-structural-history.echo-package.json";
const DEFAULT_PACKAGE_MANIFEST_PATH = "package.json";

export const STRUCTURAL_HISTORY_ECHO_PACKAGE_ID = "graft.structural-history";
export const STRUCTURAL_HISTORY_ECHO_PACKAGE_KIND = "echo-contract-package";

export type StructuralHistoryGeneratedArtifactKind =
  | "typescript"
  | "typescript-le-binary-codec";

export interface GraftPackageManifest {
  readonly name: string;
  readonly version: string;
}

export interface StructuralHistoryEchoPackageDescriptor {
  readonly descriptorVersion: 1;
  readonly package: {
    readonly id: string;
    readonly kind: string;
    readonly sourcePackageName: string;
    readonly sourcePackageVersion: string;
  };
  readonly schema: {
    readonly format: "graphql";
    readonly path: string;
    readonly sha256: string;
    readonly wesleyL1RegistryHash: string;
  };
  readonly generatedArtifacts: readonly {
    readonly kind: StructuralHistoryGeneratedArtifactKind;
    readonly path: string;
    readonly sha256: string;
    readonly generator: {
      readonly name: "wesley";
      readonly version: string;
    };
  }[];
  readonly echo: {
    readonly runtimeRequired: false;
    readonly packageInstallationRequired: false;
    readonly integrationStage: "descriptor-only";
    readonly typescriptClientBinding: "planned";
  };
  readonly contracts: {
    readonly recordTypes: readonly string[];
    readonly evidenceLabels: readonly string[];
    readonly operations: readonly string[];
  };
}

export interface StructuralHistoryEchoPackageDescriptorCheck {
  readonly descriptor: StructuralHistoryEchoPackageDescriptor;
  readonly expectedDescriptor: StructuralHistoryEchoPackageDescriptor;
  readonly violations: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Expected package manifest field ${key} to be a non-empty string.`);
  }

  return value;
}

export function readGraftPackageManifest(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT,
  packageManifestPath = DEFAULT_PACKAGE_MANIFEST_PATH,
): GraftPackageManifest {
  const packageManifestText = readFileSync(path.join(workspaceRoot, packageManifestPath), "utf8");
  const parsed = JSON.parse(packageManifestText) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Graft package manifest must be a JSON object.");
  }

  return {
    name: readString(parsed, "name"),
    version: readString(parsed, "version"),
  };
}

export function expectedStructuralHistoryEchoPackageDescriptor(
  manifest: StructuralHistorySchemaManifest,
  graftPackage: GraftPackageManifest,
): StructuralHistoryEchoPackageDescriptor {
  return {
    descriptorVersion: 1,
    package: {
      id: STRUCTURAL_HISTORY_ECHO_PACKAGE_ID,
      kind: STRUCTURAL_HISTORY_ECHO_PACKAGE_KIND,
      sourcePackageName: graftPackage.name,
      sourcePackageVersion: graftPackage.version,
    },
    schema: {
      format: "graphql",
      path: manifest.schemaPath,
      sha256: manifest.schemaSourceSha256,
      wesleyL1RegistryHash: manifest.wesleyL1RegistryHash,
    },
    generatedArtifacts: [
      {
        kind: "typescript",
        path: manifest.generatedTypesPath,
        sha256: manifest.generatedTypesSha256,
        generator: {
          name: "wesley",
          version: manifest.wesleyCliVersion,
        },
      },
      {
        kind: "typescript-le-binary-codec",
        path: manifest.generatedCodecPath,
        sha256: manifest.generatedCodecSha256,
        generator: {
          name: "wesley",
          version: manifest.wesleyCliVersion,
        },
      },
    ],
    echo: {
      runtimeRequired: false,
      packageInstallationRequired: false,
      integrationStage: "descriptor-only",
      typescriptClientBinding: "planned",
    },
    contracts: {
      recordTypes: manifest.requiredTypes,
      evidenceLabels: manifest.requiredEvidenceLabels,
      operations: manifest.requiredOperationConstants,
    },
  };
}

function stableJson(value: StructuralHistoryEchoPackageDescriptor): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function pathViolations(label: string, value: string): readonly string[] {
  if (value.trim().length === 0) {
    return [`${label} must be a non-empty repo-root-relative path.`];
  }
  if (path.isAbsolute(value)) {
    return [`${label} must be repo-root-relative, not absolute: ${value}`];
  }
  if (value.includes("\\")) {
    return [`${label} must use repo-root-relative POSIX separators: ${value}`];
  }
  if (value.split("/").includes("..")) {
    return [`${label} must not traverse outside the repository: ${value}`];
  }

  return [];
}

function descriptorPathViolations(descriptor: StructuralHistoryEchoPackageDescriptor): readonly string[] {
  return [
    ...pathViolations("schema.path", descriptor.schema.path),
    ...descriptor.generatedArtifacts.flatMap((artifact, index) =>
      pathViolations(`generatedArtifacts[${String(index)}].path`, artifact.path),
    ),
  ];
}

export function readStructuralHistoryEchoPackageDescriptor(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT,
  descriptorPath = DEFAULT_DESCRIPTOR_PATH,
): StructuralHistoryEchoPackageDescriptor {
  const descriptorText = readFileSync(path.join(workspaceRoot, descriptorPath), "utf8");
  return JSON.parse(descriptorText) as StructuralHistoryEchoPackageDescriptor;
}

export function checkStructuralHistoryEchoPackageDescriptor(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT,
  descriptorPath = DEFAULT_DESCRIPTOR_PATH,
): StructuralHistoryEchoPackageDescriptorCheck {
  const manifest = readStructuralHistorySchemaManifest(workspaceRoot);
  const graftPackage = readGraftPackageManifest(workspaceRoot);
  const expectedDescriptor = expectedStructuralHistoryEchoPackageDescriptor(manifest, graftPackage);
  const descriptorText = readFileSync(path.join(workspaceRoot, descriptorPath), "utf8");
  const descriptor = JSON.parse(descriptorText) as StructuralHistoryEchoPackageDescriptor;
  const expectedText = stableJson(expectedDescriptor);
  const violations: string[] = [];

  if (descriptorText !== expectedText) {
    violations.push(
      `${descriptorPath} does not match the deterministic descriptor derived from ` +
        "schemas/graft-structural-history.manifest.json and package.json.",
    );
  }
  violations.push(...descriptorPathViolations(descriptor));

  return {
    descriptor,
    expectedDescriptor,
    violations,
  };
}

const invokedPath = process.argv[1] === undefined ? null : pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  const result = checkStructuralHistoryEchoPackageDescriptor();
  if (result.violations.length > 0) {
    for (const violation of result.violations) {
      console.error(violation);
    }
    process.exitCode = 1;
  } else {
    console.log("Structural-history Echo package descriptor is in sync.");
  }
}
