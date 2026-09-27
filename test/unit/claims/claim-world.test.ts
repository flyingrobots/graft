/**
 * ClaimWorld (docs/design/CORE_claim-world.md).
 *
 * Promise: from the outer graph alone, Graft answers (1) which extraction
 * attempts had entered the world as of a date, (2) which artifact is current
 * for a subject as of a date and by what chain, and (3) the current reading,
 * and each answer equals the one computed from the same JSON: the package's
 * `resolve` over the proposals and decisions, and a date filter over the
 * documents. Candidate order never selects: only a recorded selection or a
 * named policy does.
 * Oracle: `resolve` from @flyingrobots/contextual-claims and plain filters over
 * the invented fixtures below, through an in-memory graph and through git-warp
 * with the world split across two ingests.
 * RED: observed before claim-world.ts existed (module not found).
 */
import { describe, expect, it } from "vitest";
import { type ClaimTerm, type Decision, type Proposal, canonical, resolve } from "@flyingrobots/contextual-claims";
import { createHash } from "node:crypto";
import { decodeClaimWarp } from "../../../src/claims/claim-warp.js";
import {
  type ClaimsDocumentInput,
  type WorldInput,
  type WorldReader,
  candidateTermId,
  currentReading,
  extractionId,
  extractionsAsOf,
  ingestWorld,
  resolveInWorld,
} from "../../../src/claims/claim-world.js";
import { gitWarpClaimReader, writeClaimWorld } from "../../../src/claims/claim-warp-git.js";
import { openWarp } from "../../../src/warp/open.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

interface E { from: string; to: string; label: string; props: Record<string, unknown> }

class MemoryWorld implements WorldReader {
  readonly nodes = new Map<string, Record<string, unknown>>();
  readonly edges = new Map<string, E>();
  addNode(id: string): void {
    if (!this.nodes.has(id)) this.nodes.set(id, {});
  }
  setProperty(id: string, key: string, value: unknown): void {
    const p = this.nodes.get(id);
    if (p === undefined) throw new Error(`no node ${id}`);
    p[key] = value;
  }
  addEdge(from: string, to: string, label: string): void {
    const k = `${from}\0${to}\0${label}`;
    if (!this.edges.has(k)) this.edges.set(k, { from, to, label, props: {} });
  }
  setEdgeProperty(from: string, to: string, label: string, key: string, value: unknown): void {
    const e = this.edges.get(`${from}\0${to}\0${label}`);
    if (e === undefined) throw new Error("no edge");
    e.props[key] = value;
  }
  getNodeProps(id: string): Promise<Record<string, unknown> | null> {
    const p = this.nodes.get(id);
    return Promise.resolve(p === undefined ? null : { ...p });
  }
  outgoing(id: string): Promise<E[]> {
    return Promise.resolve([...this.edges.values()].filter((e) => e.from === id));
  }
  incoming(id: string): Promise<E[]> {
    // reversed on purpose: nothing may depend on edge enumeration order
    return Promise.resolve([...this.edges.values()].filter((e) => e.to === id).reverse());
  }
  nodeIds(prefix: string): Promise<string[]> {
    return Promise.resolve([...this.nodes.keys()].filter((n) => n.startsWith(prefix)));
  }
}

const atom = (p: string): ClaimTerm => ({ kind: "atom", claim: { subject: { kind: "anonymous", localId: "hall" }, predicate: p, object: true } });

function doc(path: string, artifactId: string, extractedAt: string, n: number): ClaimsDocumentInput {
  return {
    path,
    doc: {
      artifact: { artifactId, contentHash: "sha256:" + "0".repeat(64) },
      derivation: { extractorId: "fixture", extractorVersion: "1.0.0", extractedAt },
      candidates: Array.from({ length: n }, (_, i) => ({ term: atom(`reading_${String(i)}`), assessment: { confidence: "high" } })),
    },
  };
}

function proposal(relation: string, from: string, to: string): Proposal {
  const raw = { relation, from, to };
  return { relation, from, to, evidence: [], proposal_sha256: createHash("sha256").update(canonical(raw), "utf8").digest("hex") };
}

function decide(p: Proposal, decision: string, at: string, id: string): Decision {
  return { id, decision, outcome: null, reason: null, observer: "hall-committee", decided_at: at, proposal_sha256: p.proposal_sha256 };
}

const DOCS = [
  doc("claims/a1.claims.json", "A1", "2026-01-01T09:00:00Z", 1),
  doc("claims/a2.claims.json", "A2", "2026-01-05T09:00:00Z", 2),
  doc("claims/a3.claims.json", "A3", "2026-01-20T09:00:00Z", 2),
  doc("claims/a3-topup.claims.json", "A3", "2026-02-10T09:00:00Z", 1),
  doc("claims/a5.claims.json", "A5", "2026-01-02T09:00:00Z", 1),
];

const P = {
  a2a1: proposal("supersedes", "A2 the second booking note", "A1"),
  a3a2: proposal("replaces", "A3", "A2 the second booking note"),
  a4a5: proposal("cancels", "A4", "A5"),
  a6a1: proposal("contradicts", "A6", "A1"),
  prose: proposal("supersedes", "the caretaker's later email", "A1"),
  pending: proposal("supersedes", "A7", "A3"),
  rejected: proposal("supersedes", "A9", "A3"),
  flip: proposal("supersedes", "A8", "A5"),
  cyc1: proposal("supersedes", "A10", "A11"),
  cyc2: proposal("supersedes", "A11", "A10"),
};
const FIRST: Decision[] = [
  decide(P.a2a1, "approve", "2026-01-10T12:00:00Z", "d1"),
  decide(P.a4a5, "approve", "2026-01-03T12:00:00Z", "d2"),
  decide(P.a6a1, "approve", "2026-01-04T12:00:00Z", "d3"),
  decide(P.prose, "approve", "2026-01-04T12:00:00Z", "d4"),
  decide(P.rejected, "reject", "2026-01-25T12:00:00Z", "d5"),
  decide(P.flip, "approve", "2026-01-06T12:00:00Z", "d6"),
];
// The second ingest carries decisions on proposals from the first.
const SECOND: Decision[] = [
  decide(P.a3a2, "approve", "2026-02-01T12:00:00Z", "d7"),
  decide(P.flip, "reject", "2026-02-02T12:00:00Z", "d8"),
  decide(P.cyc1, "approve", "2026-01-01T12:00:00Z", "d9"),
  decide(P.cyc2, "approve", "2026-01-01T12:00:00Z", "d10"),
];
const PROPOSALS = Object.values(P);

const INGESTS: WorldInput[] = [
  { documents: DOCS.slice(0, 3), proposals: PROPOSALS, decisions: FIRST, source: "fixture@1", receiptId: "r1" },
  {
    documents: DOCS.slice(3),
    proposals: [],
    decisions: SECOND,
    selections: [],
    source: "fixture@2",
    receiptId: "r2",
  },
];

const SUBJECTS = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A10", "A11", "A99"];
const DATES = ["2026-01-01", "2026-01-04", "2026-01-06", "2026-01-15", "2026-02-01", "2026-02-05", "2026-03-01"];

const jsonResolve = (subject: string, asOf: string) => resolve({ subject, asOf, proposals: PROPOSALS, decisions: [...FIRST, ...SECOND] });
const jsonAsOf = (asOf: string) => DOCS.filter((d) => d.doc.derivation.extractedAt.slice(0, 10) <= asOf).map((d) => extractionId(d.path, d.doc.derivation.extractedAt)).sort();
function jsonReading(subject: string, asOf: string) {
  const r = jsonResolve(subject, asOf);
  return r.current === null ? [] : DOCS.filter((d) => d.doc.artifact.artifactId === r.current && d.doc.derivation.extractedAt.slice(0, 10) <= asOf).map((d) => d.path).sort();
}

async function agreesWithJson(world: WorldReader): Promise<void> {
  for (const asOf of DATES) {
    expect(await extractionsAsOf(world, asOf), `as-of ${asOf}`).toEqual(jsonAsOf(asOf));
    for (const subject of SUBJECTS) {
      expect(await resolveInWorld(world, subject, asOf), `${subject} @ ${asOf}`).toEqual(jsonResolve(subject, asOf));
      const reading = await currentReading(world, subject, asOf);
      expect(reading.readings.map((x) => x.path).sort(), `reading ${subject} @ ${asOf}`).toEqual(jsonReading(subject, asOf));
    }
  }
}

function memoryWorld(ingests: readonly WorldInput[] = INGESTS): MemoryWorld {
  const w = new MemoryWorld();
  for (const i of ingests) ingestWorld(w, i);
  return w;
}

describe("ClaimWorld over an in-memory graph", () => {
  it("answers as-of, supersession and current reading as the JSON does, for every subject and date", async () => {
    await agreesWithJson(memoryWorld());
  });

  it("walks a two-step chain once both decisions are in, and not before", async () => {
    const w = memoryWorld();
    expect((await resolveInWorld(w, "A1", "2026-01-15")).current).toBe("A2");
    const later = await resolveInWorld(w, "A1", "2026-02-05");
    expect(later.current).toBe("A3");
    expect(later.chain.map((c) => [c.relation, c.from, c.to])).toEqual([["supersedes", "A2", "A1"], ["replaces", "A3", "A2"]]);
  });

  it("lets a later decision in a later ingest override an earlier approval", async () => {
    const w = memoryWorld();
    expect((await resolveInWorld(w, "A5", "2026-01-06")).current).toBeNull(); // cancelled by A4 first
    expect((await resolveInWorld(w, "A8", "2026-03-01")).current).toBe("A8");
  });

  it("never selects candidate zero by position", async () => {
    const w = memoryWorld();
    const reading = await currentReading(w, "A1", "2026-02-15");
    expect(reading.resolution.current).toBe("A3");
    for (const r of reading.readings) expect(r.selection.status).toBe("unselected");
    const a3 = reading.readings.find((r) => r.path === "claims/a3.claims.json");
    expect(a3?.selection).toEqual({ status: "unselected", candidates: 2 });
  });

  it("selects by a named policy only where that policy applies", async () => {
    const reading = await currentReading(memoryWorld(), "A3", "2026-02-15", "sole-candidate");
    const byPath = new Map(reading.readings.map((r) => [r.path, r.selection]));
    expect(byPath.get("claims/a3.claims.json")).toEqual({ status: "unselected", candidates: 2 });
    expect(byPath.get("claims/a3-topup.claims.json")).toEqual({ status: "selected", candidate: 0, by: { policy: "sole-candidate" } });
  });

  it("selects by a recorded decision, from its date on", async () => {
    const withSelection: WorldInput[] = [
      ...INGESTS,
      {
        documents: DOCS.slice(2, 3),
        proposals: [],
        decisions: [],
        selections: [{ path: "claims/a3.claims.json", candidate: 1, by: "hall-committee", at: "2026-02-20T00:00:00Z", reason: "reading 1 names the right hall" }],
        source: "fixture@3",
        receiptId: "r3",
      },
    ];
    const w = memoryWorld(withSelection);
    const before = await currentReading(w, "A3", "2026-02-19");
    const after = await currentReading(w, "A3", "2026-02-21");
    const pick = (r: typeof before) => r.readings.find((x) => x.path === "claims/a3.claims.json")?.selection;
    expect(pick(before)).toEqual({ status: "unselected", candidates: 2 });
    expect(pick(after)).toEqual({ status: "selected", candidate: 1, by: { decision: "selection:r3:0" } });
  });

  it("keeps each candidate's term decodable from the world", async () => {
    const w = memoryWorld();
    const ex = extractionId("claims/a2.claims.json", "2026-01-05T09:00:00Z");
    expect(await decodeClaimWarp(w, candidateTermId(ex, 1))).toEqual(atom("reading_1"));
  });
});

describe("ClaimWorld over Graft's git-warp graph", () => {
  it("answers as the JSON does after two committed ingests, reopened from disk", async () => {
    const dir = createTestRepo("graft-claim-world-");
    try {
      git(dir, "commit --allow-empty -m init");
      const ctx = { app: await openWarp({ cwd: dir }), strandId: null };
      for (const i of INGESTS) await writeClaimWorld(ctx, i);
      const reader = await gitWarpClaimReader({ app: await openWarp({ cwd: dir }), strandId: null });
      await agreesWithJson(reader);
    } finally {
      cleanupTestRepo(dir);
    }
  }, 60_000);
});
