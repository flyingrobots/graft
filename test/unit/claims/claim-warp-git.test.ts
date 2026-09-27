/**
 * ClaimWarp and ClaimWorld over Graft's git-warp graph
 * (docs/design/CORE_claim-warp.md, docs/design/CORE_claim-world.md).
 *
 * Promise: through committed WARP patches reopened from disk, a claim term
 * decodes byte for byte; the world answers supersession as the package's
 * `resolve` does over the same JSON, including a decision written in a later
 * ingest than its proposal; and an admitted artifact file attached to a node
 * reads back byte for byte against its sha256. The codecs and their in-memory
 * tests live in @flyingrobots/contextual-claims; this file tests only the
 * git-warp adapter.
 * Oracle: the invented fixtures below; `resolve` from the package.
 * RED: observed before the adapter could read attachments (no getContent on
 * the reader: the attachment test failed) and before it existed.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  type ClaimTerm,
  type Decision,
  type Proposal,
  canonical,
  decodeClaimWarp,
  readArtifactFile,
  resolve,
  resolveInWorld,
} from "@flyingrobots/contextual-claims";
import { gitWarpClaimReader, writeClaimTerm, writeClaimWorld } from "../../../src/claims/claim-warp-git.js";
import { openWarp } from "../../../src/warp/open.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

const atom = (p: string): ClaimTerm => ({ kind: "atom", claim: { subject: { kind: "anonymous", localId: "hall" }, predicate: p, object: true } });
const TERM: ClaimTerm = {
  kind: "scope",
  frame: { kind: "speech", speaker: { kind: "named", sourceName: "Rosa" } },
  body: { kind: "group", items: [{ kind: "guard", condition: atom("rain"), body: atom("indoors") }, { kind: "negation", body: atom("outdoors") }] },
};

function proposal(relation: string, from: string, to: string): Proposal {
  return { relation, from, to, evidence: [], proposal_sha256: createHash("sha256").update(canonical({ relation, from, to }), "utf8").digest("hex") };
}
const decide = (p: Proposal, at: string, id: string): Decision =>
  ({ id, decision: "approve", outcome: null, reason: null, observer: "hall-committee", decided_at: at, proposal_sha256: p.proposal_sha256 });

async function withRepo(prefix: string, fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = createTestRepo(prefix);
  try {
    git(dir, "commit --allow-empty -m init");
    await fn(dir);
  } finally {
    cleanupTestRepo(dir);
  }
}
const open = async (dir: string) => ({ app: await openWarp({ cwd: dir }), strandId: null });

describe("claims over Graft's git-warp graph", () => {
  it("decodes a committed term byte for byte after reopening", () =>
    withRepo("graft-claimwarp-git-", async (dir) => {
      await writeClaimTerm(await open(dir), "T1", TERM);
      const back = await decodeClaimWarp(await gitWarpClaimReader(await open(dir)), "T1");
      expect(JSON.stringify(back)).toBe(JSON.stringify(TERM));
    }), 30_000);

  it("resolves as the JSON does when a decision arrives in a later ingest", () =>
    withRepo("graft-claimworld-git-", async (dir) => {
      const a2a1 = proposal("supersedes", "A2", "A1");
      const a3a2 = proposal("supersedes", "A3", "A2");
      const first: Decision[] = [decide(a2a1, "2026-01-10T00:00:00Z", "d1")];
      const second: Decision[] = [decide(a3a2, "2026-02-01T00:00:00Z", "d2")];
      const ctx = await open(dir);
      await writeClaimWorld(ctx, { documents: [], proposals: [a2a1, a3a2], decisions: first, source: "fixture@1", receiptId: "r1" });
      await writeClaimWorld(ctx, { documents: [], proposals: [], decisions: second, source: "fixture@2", receiptId: "r2" });
      const reader = await gitWarpClaimReader(await open(dir));
      for (const asOf of ["2026-01-05", "2026-01-15", "2026-02-15"]) {
        const json = resolve({ subject: "A1", asOf, proposals: [a2a1, a3a2], decisions: [...first, ...second] });
        expect(await resolveInWorld(reader, "A1", asOf), asOf).toEqual(json);
      }
    }), 30_000);

  it("reads an attached artifact file back byte for byte", () =>
    withRepo("graft-claimworld-attach-", async (dir) => {
      const bytes = new TextEncoder().encode("## Record 1\nThe hall is booked for Friday.\n");
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      await writeClaimWorld(
        await open(dir),
        { documents: [], proposals: [], decisions: [], source: "fixture", receiptId: "r1" },
        [{ path: "sources/hall-minutes/normalized.txt", role: "normalized", bytes, sha256, mime: "text/plain", artifactId: "A1" }],
      );
      const reader = await gitWarpClaimReader(await open(dir));
      expect(await readArtifactFile(reader, "sources/hall-minutes/normalized.txt")).toEqual(bytes);
    }), 30_000);
});
