/**
 * ClaimWarp round trip (docs/design/CORE_claim-warp.md).
 *
 * Promise: `decodeClaimWarp(encodeClaimTerm(t))` reproduces `t` byte for byte
 * under JSON.stringify, for every constructor, through both an in-memory graph
 * and Graft's git-warp graph; child order is carried by `role` and `ordinal`
 * edge properties; `assertValidClaimWarp` refuses a malformed subgraph and
 * names the node.
 * Oracle: the invented fixtures below, compared as serialized bytes.
 * RED: observed before claim-warp.ts existed (module not found).
 */
import { describe, expect, it } from "vitest";
import type { ClaimTerm } from "@flyingrobots/contextual-claims";
import {
  type ClaimGraphReader,
  type ClaimGraphWriter,
  CLAIM_CHILD,
  assertValidClaimWarp,
  claimNodeId,
  decodeClaimWarp,
  encodeClaimTerm,
} from "../../../src/claims/claim-warp.js";
import { gitWarpClaimReader, writeClaimTerm } from "../../../src/claims/claim-warp-git.js";
import { openWarp } from "../../../src/warp/open.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

class MemoryGraph implements ClaimGraphWriter, ClaimGraphReader {
  readonly nodes = new Map<string, Record<string, unknown>>();
  readonly edges = new Map<string, { from: string; to: string; label: string; props: Record<string, unknown> }>();
  addNode(id: string): void {
    if (!this.nodes.has(id)) this.nodes.set(id, {});
  }
  setProperty(id: string, key: string, value: unknown): void {
    const props = this.nodes.get(id);
    if (props === undefined) throw new Error(`no node ${id}`);
    props[key] = value;
  }
  addEdge(from: string, to: string, label: string): void {
    this.edges.set(`${from}\0${to}\0${label}`, { from, to, label, props: {} });
  }
  setEdgeProperty(from: string, to: string, label: string, key: string, value: unknown): void {
    const edge = this.edges.get(`${from}\0${to}\0${label}`);
    if (edge === undefined) throw new Error(`no edge ${from} -> ${to}`);
    edge.props[key] = value;
  }
  getNodeProps(id: string): Promise<Record<string, unknown> | null> {
    const props = this.nodes.get(id);
    return Promise.resolve(props === undefined ? null : { ...props });
  }
  outgoing(id: string): Promise<{ to: string; label: string; props: Record<string, unknown> }[]> {
    return Promise.resolve([...this.edges.values()].filter((e) => e.from === id).reverse());
  }
}

const rosa = { kind: "named", sourceName: "Rosa" };
const atom = (predicate: string, object: unknown = true): ClaimTerm =>
  ({ kind: "atom", claim: { subject: { kind: "anonymous", localId: "venue" }, predicate, object } }) as ClaimTerm;

const FIXTURES = {
  atom: atom("is_booked_for", { day: "Friday", seats: 40, confirmed: null }),
  scope: { kind: "scope", frame: { kind: "speech", speaker: rosa }, body: atom("is_booked") } as ClaimTerm,
  group: { kind: "group", items: [atom("a"), atom("b"), atom("c")] },
  alternative: { kind: "alternative", options: [atom("friday"), atom("saturday")] },
  negation: { kind: "negation", body: atom("has_projector") },
  guard: { kind: "guard", condition: atom("rain"), body: atom("moves_indoors") },
  concession: { kind: "concession", even_if: atom("is_small"), still: atom("is_booked") },
  nested: {
    kind: "scope",
    frame: { kind: "observation", author: { kind: "named", sourceName: "Omar" }, extra: [1, "two"] },
    body: {
      kind: "group",
      items: [
        { kind: "guard", condition: atom("rain"), body: { kind: "negation", body: atom("outdoors") } },
        { kind: "alternative", options: [atom("x"), { kind: "concession", even_if: atom("late"), still: atom("fed") }] },
      ],
    },
  } as ClaimTerm,
  // key order differs from the usual one; decode must keep it
  reordered: JSON.parse('{"body":{"claim":{"object":1,"predicate":"p","subject":{"localId":"s","kind":"anonymous"}},"kind":"atom"},"kind":"negation"}') as ClaimTerm,
} satisfies Record<string, ClaimTerm>;

describe("ClaimWarp over an in-memory graph", () => {
  for (const [name, term] of Object.entries(FIXTURES)) {
    it(`round-trips ${name} byte for byte`, async () => {
      const g = new MemoryGraph();
      encodeClaimTerm(g, "T1", term);
      const back = await decodeClaimWarp(g, "T1");
      expect(JSON.stringify(back)).toBe(JSON.stringify(term));
    });
  }

  it("carries child order as role and ordinal edge properties", () => {
    const g = new MemoryGraph();
    encodeClaimTerm(g, "T1", FIXTURES.group);
    const edges = [...g.edges.values()].filter((e) => e.label === CLAIM_CHILD);
    expect(edges.map((e) => [e.to, e.props["role"], e.props["ordinal"]])).toEqual([
      [claimNodeId("T1", "$.items[0]"), "items", 0],
      [claimNodeId("T1", "$.items[1]"), "items", 1],
      [claimNodeId("T1", "$.items[2]"), "items", 2],
    ]);
  });

  it("addresses a guard's body as guarded", () => {
    const g = new MemoryGraph();
    encodeClaimTerm(g, "T1", FIXTURES.guard);
    expect(g.nodes.has(claimNodeId("T1", "$.guarded"))).toBe(true);
  });

  it("keeps two terms apart by term id", async () => {
    const g = new MemoryGraph();
    encodeClaimTerm(g, "T1", FIXTURES.group);
    encodeClaimTerm(g, "T2", FIXTURES.guard);
    expect(JSON.stringify(await decodeClaimWarp(g, "T2"))).toBe(JSON.stringify(FIXTURES.guard));
    expect(JSON.stringify(await decodeClaimWarp(g, "T1"))).toBe(JSON.stringify(FIXTURES.group));
  });

  it("refuses to encode an unknown constructor, naming the path", () => {
    const bad = { kind: "group", items: [atom("a"), { kind: "maybe" }] } as unknown as ClaimTerm;
    expect(() => encodeClaimTerm(new MemoryGraph(), "T1", bad)).toThrow(/unknown constructor "maybe" at \$\.items\[1\]/);
  });

  it("refuses a subgraph with a gap in its ordinals", async () => {
    const g = new MemoryGraph();
    encodeClaimTerm(g, "T1", FIXTURES.group);
    g.setEdgeProperty(claimNodeId("T1", "$"), claimNodeId("T1", "$.items[1]"), CLAIM_CHILD, "ordinal", 5);
    await expect(assertValidClaimWarp(g, "T1")).rejects.toThrow(/ordinals/);
  });

  it("refuses a guard missing its condition", async () => {
    const g = new MemoryGraph();
    encodeClaimTerm(g, "T1", FIXTURES.guard);
    g.edges.delete(`${claimNodeId("T1", "$")}\0${claimNodeId("T1", "$.condition")}\0${CLAIM_CHILD}`);
    await expect(assertValidClaimWarp(g, "T1")).rejects.toThrow(/needs exactly one condition/);
  });

  it("refuses a node whose constructor was changed", async () => {
    const g = new MemoryGraph();
    encodeClaimTerm(g, "T1", FIXTURES.negation);
    g.setProperty(claimNodeId("T1", "$"), "kind", "atom");
    await expect(assertValidClaimWarp(g, "T1")).rejects.toThrow(/atom .* has a child in role body/);
  });
});

describe("ClaimWarp over Graft's git-warp graph", () => {
  it("round-trips every fixture through committed WARP patches", async () => {
    const dir = createTestRepo("graft-claim-warp-");
    try {
      git(dir, "commit --allow-empty -m init");
      const ctx = { app: await openWarp({ cwd: dir }), strandId: null };
      const entries = Object.entries(FIXTURES);
      for (const [name, term] of entries) await writeClaimTerm(ctx, name, term);
      const reopened = { app: await openWarp({ cwd: dir }), strandId: null };
      const reader = await gitWarpClaimReader(reopened);
      for (const [name, term] of entries) {
        expect(JSON.stringify(await decodeClaimWarp(reader, name)), name).toBe(JSON.stringify(term));
      }
    } finally {
      cleanupTestRepo(dir);
    }
  }, 30_000);
});
