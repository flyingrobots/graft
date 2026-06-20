import { describe, expect, it } from "vitest";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { encodeCanonicalCbor, type CborValue } from "../../../src/echo/canonical-cbor.js";
import {
  deriveWorkspaceId,
  type WorkspaceIdentityInput,
} from "../../../src/mcp/workspace-registry.js";

const ROOT = process.cwd();

interface PersistedObjectContract {
  readonly kind: string;
  readonly schemaVersion: number;
  readonly storageOwner: string;
  readonly requiredFields: readonly string[];
  readonly forbiddenFields?: readonly string[];
  readonly allowedLifecycle?: readonly string[];
  readonly forbiddenLifecycle?: readonly string[];
}

interface MutatingOperationContract {
  readonly operation: string;
  readonly visibility: "public" | "internal";
  readonly classification: "plan-commit" | "internal-maintenance";
}

interface Slice0Contract {
  readonly schemaVersion: number;
  readonly contractId: string;
  readonly persistedObjects: readonly PersistedObjectContract[];
  readonly mutatingOperations: readonly MutatingOperationContract[];
  readonly scopeAlgebra: {
    readonly relations: readonly string[];
    readonly unknownBehaviorByConsumer: Record<string, string>;
  };
  readonly authorityInvariants: readonly {
    readonly id: string;
    readonly resource: string;
    readonly rule: string;
  }[];
  readonly errorTaxonomy: readonly string[];
}

interface IdentityVector {
  readonly case: string;
  readonly prefix: string;
  readonly input: WorkspaceIdentityInput;
  readonly canonicalPreimage: unknown;
  readonly canonicalCborHex: string;
  readonly sha256Hex: string;
  readonly expectedId: string;
}

interface StableIdVector {
  readonly case: string;
  readonly prefix: string;
  readonly canonicalPreimage: unknown;
  readonly canonicalCborHex: string;
  readonly sha256Hex: string;
  readonly expectedId: string;
  readonly stableIdentityExcludes?: readonly string[];
}

interface PlanDigestVector {
  readonly case: string;
  readonly digestExcludes: readonly string[];
  readonly plan: Record<string, unknown>;
  readonly canonicalCborHex: string;
  readonly expectedDigest: string;
}

interface ScopeRelationVector {
  readonly case: string;
  readonly relation: string;
}

interface StateTransitionVector {
  readonly case: string;
  readonly from: unknown;
  readonly operation: string;
  readonly to: unknown;
}

interface ReceiptRedactionVector {
  readonly case: string;
  readonly output: unknown;
  readonly forbiddenOutputFields: readonly string[];
}

interface VisibilityContextVector {
  readonly case: string;
  readonly workspaceViewId: string;
  readonly visibilityContext: Record<string, unknown>;
  readonly transientFields: readonly string[];
  readonly authorityRule: string;
}

interface Slice0Vectors {
  readonly schemaVersion: number;
  readonly contractId: string;
  readonly identityVectors: readonly IdentityVector[];
  readonly stableViewVectors: readonly StableIdVector[];
  readonly trackingScopeVectors: readonly StableIdVector[];
  readonly planDigestVectors: readonly PlanDigestVector[];
  readonly scopeRelationVectors: readonly ScopeRelationVector[];
  readonly stateTransitionVectors: readonly StateTransitionVector[];
  readonly receiptRedactionVectors: readonly ReceiptRedactionVector[];
  readonly visibilityContextVectors: readonly VisibilityContextVector[];
}

interface ConformanceClaim {
  readonly id: string;
  readonly claim: string;
  readonly enforcementPoint: readonly string[];
  readonly testEvidence: readonly {
    readonly status: "covered" | "required";
    readonly path?: string;
    readonly name?: string;
    readonly assertionIds?: readonly string[];
  }[];
  readonly supportedPlatformPosture: Record<string, string>;
  readonly failureBehavior: {
    readonly kind: string;
    readonly code: string;
  };
}

interface Slice0Conformance {
  readonly schemaVersion: number;
  readonly contractId: string;
  readonly exitGateCoverage: readonly {
    readonly gate: string;
    readonly claimIds: readonly string[];
  }[];
  readonly claims: readonly ConformanceClaim[];
}

function readJson(relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8")) as unknown;
}

const CONTRACT = readJson("schemas/graft-workspace-store-slice0.contract.json") as Slice0Contract;
const VECTORS = readJson("schemas/graft-workspace-store-slice0.vectors.json") as Slice0Vectors;
const CONFORMANCE = readJson(
  "schemas/graft-workspace-store-slice0.conformance.json",
) as Slice0Conformance;

const EXECUTABLE_CONFORMANCE_ASSERTIONS = new Set([
  "workspace-store.persisted-objects-versioned",
  "workspace-store.workspace-state-axes-separated",
  "workspace-store.history-binding-lifecycle-live-only",
  "workspace-store.scope-relations-include-unknown",
  "workspace-store.unknown-fails-closed-by-consumer",
  "workspace-registry.explicit-repository-evidence-required-for-incarnation-reuse",
]);

const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function sha256(bytes: Uint8Array): Buffer {
  return crypto.createHash("sha256").update(bytes).digest();
}

function base32Lower(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? "";
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? "";
  }
  return output;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCborValue(value: unknown): CborValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toCborValue(item));
  }
  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toCborValue(item)]),
    );
  }
  throw new Error(`unsupported CBOR fixture value type: ${typeof value}`);
}

function digestVector(prefix: string, preimage: unknown): {
  readonly id: string;
  readonly cborHex: string;
  readonly sha256Hex: string;
} {
  const cbor = encodeCanonicalCbor(toCborValue(preimage));
  const digest = sha256(cbor);
  return {
    id: `${prefix}${base32Lower(digest.subarray(0, 16))}`,
    cborHex: Buffer.from(cbor).toString("hex"),
    sha256Hex: digest.toString("hex"),
  };
}

function digestPlan(plan: Record<string, unknown>, excludes: readonly string[]): {
  readonly digest: string;
  readonly cborHex: string;
} {
  const excluded = new Set(excludes);
  const canonicalInput = Object.fromEntries(
    Object.entries(plan).filter(([key]) => !excluded.has(key)),
  );
  const cbor = encodeCanonicalCbor(toCborValue(canonicalInput));
  return {
    digest: `sha256:${sha256(cbor).toString("hex")}`,
    cborHex: Buffer.from(cbor).toString("hex"),
  };
}

function findPersistedObject(kind: string): PersistedObjectContract {
  const object = CONTRACT.persistedObjects.find((candidate) => candidate.kind === kind);
  if (object === undefined) {
    throw new Error(`missing persisted object contract: ${kind}`);
  }
  return object;
}

function objectHasKey(value: unknown, key: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => objectHasKey(item, key));
  }
  if (!isPlainRecord(value)) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(value, key) ||
    Object.values(value).some((item) => objectHasKey(item, key));
}

describe("workspace store Slice 0 contract artifacts", () => {
  it("version every persisted object and keep workspace state axes separate", () => {
    expect(CONTRACT.schemaVersion).toBe(1);
    expect(CONTRACT.contractId).toBe("graft.workspace-store.slice0");

    const kinds = new Set<string>();
    for (const object of CONTRACT.persistedObjects) {
      expect(kinds.has(object.kind)).toBe(false);
      kinds.add(object.kind);
      expect(object.schemaVersion).toBe(1);
      expect(object.storageOwner.length).toBeGreaterThan(0);
      expect(object.requiredFields).toContain("schemaVersion");
    }

    const workspace = findPersistedObject("workspace-metadata");
    expect(workspace.forbiddenFields).toEqual(expect.arrayContaining([
      "recordState",
      "exclusionPolicy",
      "historyStoreId",
      "history",
      "trackingAuthorization",
    ]));

    const binding = findPersistedObject("history-binding");
    expect(binding.allowedLifecycle).toEqual(["active", "paused"]);
    expect(binding.forbiddenLifecycle).toContain("off");
  });

  it("classifies all public mutations as plan/commit and keeps internal maintenance explicit", () => {
    const publicMutations = CONTRACT.mutatingOperations.filter((operation) =>
      operation.visibility === "public"
    );
    expect(publicMutations.length).toBeGreaterThan(0);
    expect(publicMutations.every((operation) => operation.classification === "plan-commit"))
      .toBe(true);
    expect(CONTRACT.mutatingOperations).toContainEqual({
      operation: "workspace.observe-successful-read",
      visibility: "internal",
      classification: "internal-maintenance",
    });
  });

  it("makes unknown scope comparison fail closed by consumer", () => {
    expect(CONTRACT.scopeAlgebra.relations).toEqual(expect.arrayContaining([
      "equivalent",
      "contains",
      "contained-by",
      "overlaps",
      "disjoint",
      "unknown",
    ]));
    expect(CONTRACT.scopeAlgebra.unknownBehaviorByConsumer).toMatchObject({
      authorization: "deny",
      "management-authority": "deny",
      "cache-reuse": "miss",
      "history-query": "insufficient-scope",
      "scope-expansion": "new-plan-required",
      "historical-filtering": "truncate-or-refuse",
    });
  });

  it("freezes the core authority invariants and error taxonomy", () => {
    expect(CONTRACT.authorityInvariants).toContainEqual({
      id: "workspace-view-id-is-not-authority",
      resource: "workspaceViewId",
      rule: "requires-current-visibility-context",
    });
    expect(CONTRACT.errorTaxonomy).toEqual(expect.arrayContaining([
      "WORKSPACE_TRACKING_REQUIRED",
      "HISTORY_UNAVAILABLE",
      "HISTORY_BINDING_AMBIGUOUS",
      "INSUFFICIENT_SCOPE",
      "INSUFFICIENT_HISTORY_COVERAGE",
      "WORKSPACE_EXCLUDED",
      "WORKSPACE_REPLACED",
      "OPERATION_PLAN_STALE",
    ]));
  });
});

describe("workspace store Slice 0 deterministic vectors", () => {
  it("derive canonical workspace IDs from the fixture preimages", () => {
    for (const vector of VECTORS.identityVectors) {
      const digest = digestVector(vector.prefix, vector.canonicalPreimage);
      expect(digest).toEqual({
        id: vector.expectedId,
        cborHex: vector.canonicalCborHex,
        sha256Hex: vector.sha256Hex,
      });
      expect(deriveWorkspaceId(vector.input)).toBe(vector.expectedId);
    }
  });

  it("derive stable view and tracking-scope IDs without transient grant fields", () => {
    for (const vector of [...VECTORS.stableViewVectors, ...VECTORS.trackingScopeVectors]) {
      const digest = digestVector(vector.prefix, vector.canonicalPreimage);
      expect(digest).toEqual({
        id: vector.expectedId,
        cborHex: vector.canonicalCborHex,
        sha256Hex: vector.sha256Hex,
      });
    }

    const [view] = VECTORS.stableViewVectors;
    expect(view?.stableIdentityExcludes).toEqual(expect.arrayContaining([
      "grantId",
      "grantEpoch",
      "policyDigest",
      "sessionId",
    ]));
  });

  it("derive plan digests from immutable plan contents while excluding approval bearer material", () => {
    for (const vector of VECTORS.planDigestVectors) {
      const digest = digestPlan(vector.plan, vector.digestExcludes);
      expect(digest).toEqual({
        digest: vector.expectedDigest,
        cborHex: vector.canonicalCborHex,
      });
      expect(vector.digestExcludes).toEqual(expect.arrayContaining([
        "planDigest",
        "approvalToken",
        "approvalSignature",
      ]));
    }
  });

  it("cover conservative scope relations, live binding transitions, redaction, and visibility context", () => {
    expect(new Set(VECTORS.scopeRelationVectors.map((vector) => vector.relation))).toEqual(
      new Set(["equivalent", "contains", "disjoint", "unknown"]),
    );
    expect(VECTORS.scopeRelationVectors.some((vector) => vector.case === "glob-algebra-not-proven"))
      .toBe(true);

    expect(VECTORS.stateTransitionVectors.some((vector) =>
      JSON.stringify(vector.to).includes("\"bindingLifecycle\":\"off\"")
    )).toBe(false);
    expect(VECTORS.stateTransitionVectors).toContainEqual({
      case: "purge-removes-binding",
      from: { bindingLifecycle: "paused" },
      operation: "approved-purge-history",
      to: "absent-binding",
    });

    for (const vector of VECTORS.receiptRedactionVectors) {
      for (const field of vector.forbiddenOutputFields) {
        expect(objectHasKey(vector.output, field)).toBe(false);
      }
    }

    const [visibility] = VECTORS.visibilityContextVectors;
    expect(visibility?.authorityRule).toBe("workspaceViewId-alone-confers-no-authority");
    expect(visibility?.transientFields).toEqual(expect.arrayContaining([
      "grantId",
      "grantEpoch",
      "scopeDigest",
      "policyDigest",
      "sessionId",
    ]));
  });
});

describe("workspace store Slice 0 threat and conformance matrix", () => {
  it("maps every G0 exit gate to concrete conformance claims", () => {
    expect(CONFORMANCE.schemaVersion).toBe(1);
    expect(CONFORMANCE.contractId).toBe(CONTRACT.contractId);
    expect(CONFORMANCE.exitGateCoverage).toHaveLength(5);

    const claimIds = new Set(CONFORMANCE.claims.map((claim) => claim.id));
    for (const gate of CONFORMANCE.exitGateCoverage) {
      expect(gate.claimIds.length).toBeGreaterThan(0);
      for (const claimId of gate.claimIds) {
        expect(claimIds.has(claimId)).toBe(true);
      }
    }
  });

  it("gives each security claim enforcement, executable evidence, platform posture, and failure behavior", () => {
    const claimIds = new Set<string>();
    for (const claim of CONFORMANCE.claims) {
      expect(claimIds.has(claim.id)).toBe(false);
      claimIds.add(claim.id);
      expect(claim.claim.length).toBeGreaterThan(0);
      expect(claim.enforcementPoint.length).toBeGreaterThan(0);
      expect(claim.testEvidence.length).toBeGreaterThan(0);
      expect(Object.keys(claim.supportedPlatformPosture).length).toBeGreaterThan(0);
      expect(claim.failureBehavior.kind.length).toBeGreaterThan(0);
      expect(claim.failureBehavior.code.length).toBeGreaterThan(0);
      expect(CONTRACT.errorTaxonomy).toContain(claim.failureBehavior.code);

      for (const evidence of claim.testEvidence) {
        if (evidence.status === "covered") {
          expect(evidence.path).toBeDefined();
          expect(fs.existsSync(path.join(ROOT, evidence.path ?? ""))).toBe(true);
          expect(evidence.assertionIds?.length ?? 0).toBeGreaterThan(0);
          for (const assertionId of evidence.assertionIds ?? []) {
            expect(EXECUTABLE_CONFORMANCE_ASSERTIONS.has(assertionId)).toBe(true);
          }
        } else {
          expect(evidence.name).toBeDefined();
        }
      }
    }
  });
});
