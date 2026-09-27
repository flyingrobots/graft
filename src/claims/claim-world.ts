import {
  artifactId,
  type ChainEdge,
  type ClaimTerm,
  type Decision,
  type Proposal,
  type Resolution,
  type UnusableEdge,
} from "@flyingrobots/contextual-claims";
import { type ClaimGraphReader, type ClaimGraphWriter, claimNodeId, encodeClaimTerm } from "./claim-warp.js";

/**
 * ClaimWorld: the outer WARP graph around ClaimWarp terms
 * (docs/design/CORE_claim-world.md; Contextual Claims 2 §6, §15.3, §21, §22.3).
 *
 * It records who extracted what from which artifact and when (extraction
 * attempts and their candidates, each candidate's term as ClaimWarp), which
 * relations were proposed between artifacts, which decisions adjudicated them,
 * which candidate selections were decided, and one receipt per ingest. The
 * three read questions are answered by walking this graph:
 *
 * - as of a date, which extraction attempts had entered the world;
 * - which artifact is current for a subject, by what approved chain
 *   (supersession), as of a date;
 * - the current reading: the current artifact's extraction attempts as of a
 *   date, and for each one which candidate is selected, and why.
 *
 * Candidate order is not an adjudication. A candidate is selected only by a
 * recorded selection decision or by a policy the caller names; otherwise the
 * reading says `unselected` and lists the candidates.
 */

export const LABEL = {
  extractedFrom: "extracted_from",
  candidateOf: "candidate_of",
  hasTerm: "has_term",
  fromArtifact: "from_artifact",
  toArtifact: "to_artifact",
  decides: "decides",
  keyedBy: "keyed_by",
  selects: "selects",
  recorded: "recorded",
} as const;

export interface WorldReader extends ClaimGraphReader {
  incoming(id: string): Promise<readonly { from: string; label: string; props: Record<string, unknown> }[]>;
  nodeIds(prefix: string): Promise<readonly string[]>;
}

export interface ClaimsDocumentInput {
  /** Where the document was read from, e.g. a repository path. */
  readonly path: string;
  readonly doc: {
    readonly artifact: { readonly artifactId: string; readonly contentHash?: string };
    readonly derivation: { readonly extractorId: string; readonly extractorVersion: string; readonly extractedAt: string };
    readonly candidates: readonly { readonly term: ClaimTerm; readonly assessment?: { readonly confidence?: string } }[];
  };
}

/** A decided candidate selection: which candidate of which document, by whom, when. */
export interface SelectionDecision {
  readonly path: string;
  readonly candidate: number;
  readonly by: string;
  readonly at: string;
  readonly reason?: string;
}

export interface WorldInput {
  readonly documents: readonly ClaimsDocumentInput[];
  /** In source order: the order decides which approved edge a walk takes first, as in `resolve`. */
  readonly proposals: readonly Proposal[];
  /** In log order: a later decision on the same proposal overrides an earlier one, as in `resolve`. */
  readonly decisions: readonly Decision[];
  readonly selections?: readonly SelectionDecision[];
  /** What this ingest read, e.g. a commit; recorded on the receipt. */
  readonly source: string;
  readonly receiptId: string;
}

export const extractionId = (path: string, extractedAt: string): string => `extraction:${path}@${extractedAt}`;
const artifactNode = (id: string): string => `artifact:${id}`;
const candidateNode = (extraction: string, i: number): string => `candidate:${extraction.slice("extraction:".length)}#${String(i)}`;

/**
 * Write one ingest into the world. Proposals and decisions are ordered by
 * (receipt id, position in this ingest), so receipt ids must sort in ingest
 * order when a world holds more than one.
 */
export function ingestWorld(w: ClaimGraphWriter, input: WorldInput): void {
  const receipt = `receipt:${input.receiptId}`;
  w.addNode(receipt);
  w.setProperty(receipt, "source", input.source);
  w.setProperty(receipt, "documents", input.documents.length);
  w.setProperty(receipt, "proposals", input.proposals.length);
  w.setProperty(receipt, "decisions", input.decisions.length);
  const record = (id: string): void => {
    w.addEdge(receipt, id, LABEL.recorded);
  };
  const ensureArtifact = (id: string): string => {
    const node = artifactNode(id);
    w.addNode(node);
    w.setProperty(node, "artifactId", id);
    return node;
  };

  // Decisions join proposals by content hash, across ingests, through one key node per hash.
  const ensureKey = (sha: string): string => {
    const node = `proposal-key:${sha}`;
    w.addNode(node);
    w.setProperty(node, "proposalSha256", sha);
    return node;
  };

  for (const { path, doc } of input.documents) {
    const ex = extractionId(path, doc.derivation.extractedAt);
    w.addNode(ex);
    w.setProperty(ex, "path", path);
    w.setProperty(ex, "artifactId", doc.artifact.artifactId);
    if (doc.artifact.contentHash !== undefined) w.setProperty(ex, "contentHash", doc.artifact.contentHash);
    w.setProperty(ex, "extractorId", doc.derivation.extractorId);
    w.setProperty(ex, "extractorVersion", doc.derivation.extractorVersion);
    w.setProperty(ex, "extractedAt", doc.derivation.extractedAt);
    w.setProperty(ex, "candidates", doc.candidates.length);
    w.addEdge(ex, ensureArtifact(doc.artifact.artifactId), LABEL.extractedFrom);
    record(ex);
    doc.candidates.forEach((candidate, i) => {
      const c = candidateNode(ex, i);
      w.addNode(c);
      w.setProperty(c, "ordinal", i);
      w.setProperty(c, "sourcePath", path);
      if (candidate.assessment?.confidence !== undefined) w.setProperty(c, "confidence", candidate.assessment.confidence);
      w.addEdge(c, ex, LABEL.candidateOf);
      w.setEdgeProperty(c, ex, LABEL.candidateOf, "ordinal", i);
      const root = encodeClaimTerm(w, c, candidate.term);
      w.addEdge(c, root, LABEL.hasTerm);
    });
  }

  input.proposals.forEach((p, seq) => {
    const id = `proposal:${input.receiptId}:${String(seq)}`;
    w.addNode(id);
    w.setProperty(id, "receipt", input.receiptId);
    w.setProperty(id, "seq", seq);
    w.setProperty(id, "relation", p.relation);
    w.setProperty(id, "from", p.from);
    w.setProperty(id, "to", p.to);
    w.setProperty(id, "proposalSha256", p.proposal_sha256);
    w.setProperty(id, "evidence", JSON.stringify(p.evidence ?? []));
    const from = artifactId(p.from);
    const to = artifactId(p.to);
    if (from !== null) w.addEdge(id, ensureArtifact(from), LABEL.fromArtifact);
    if (to !== null) w.addEdge(id, ensureArtifact(to), LABEL.toArtifact);
    w.addEdge(id, ensureKey(p.proposal_sha256), LABEL.keyedBy);
    record(id);
  });

  input.decisions.forEach((d, seq) => {
    const id = `decision:${input.receiptId}:${String(seq)}`;
    w.addNode(id);
    w.setProperty(id, "receipt", input.receiptId);
    w.setProperty(id, "seq", seq);
    w.setProperty(id, "decisionId", d.id);
    w.setProperty(id, "decision", d.decision);
    w.setProperty(id, "outcome", d.outcome);
    w.setProperty(id, "reason", d.reason);
    w.setProperty(id, "observer", d.observer);
    w.setProperty(id, "decidedAt", d.decided_at);
    w.setProperty(id, "proposalSha256", d.proposal_sha256);
    w.addEdge(id, ensureKey(d.proposal_sha256), LABEL.decides);
    record(id);
  });

  const extractionByPath = new Map(input.documents.map((d) => [d.path, extractionId(d.path, d.doc.derivation.extractedAt)]));
  (input.selections ?? []).forEach((s, seq) => {
    const ex = extractionByPath.get(s.path);
    if (ex === undefined) throw new Error(`ClaimWorld: selection names ${s.path}, which this ingest does not carry`);
    const id = `selection:${input.receiptId}:${String(seq)}`;
    w.addNode(id);
    w.setProperty(id, "by", s.by);
    w.setProperty(id, "at", s.at);
    w.setProperty(id, "candidate", s.candidate);
    if (s.reason !== undefined) w.setProperty(id, "reason", s.reason);
    w.addEdge(id, candidateNode(ex, s.candidate), LABEL.selects);
    record(id);
  });
}

const day = (iso: string): string => iso.slice(0, 10);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : Number.NaN);

/** As of `asOf` (compared by date, like `resolve`), the extraction attempts that had entered the world, sorted by id. */
export async function extractionsAsOf(r: WorldReader, asOf: string): Promise<string[]> {
  const out: string[] = [];
  for (const id of await r.nodeIds("extraction:")) {
    const props = await r.getNodeProps(id);
    if (props !== null && day(str(props["extractedAt"])) <= day(asOf)) out.push(id);
  }
  return out.sort();
}

interface WorldProposal {
  readonly node: string;
  readonly order: readonly [string, number];
  readonly p: Proposal;
  /** The governing decision: the last one in log order, as `resolve` does. */
  readonly d: Decision | null;
}

async function loadProposal(r: WorldReader, node: string): Promise<WorldProposal> {
  const props = (await r.getNodeProps(node)) ?? {};
  let governing: { order: readonly [string, number]; d: Decision } | null = null;
  const key = (await r.outgoing(node)).find((e) => e.label === LABEL.keyedBy);
  for (const e of key === undefined ? [] : await r.incoming(key.to)) {
    if (e.label !== LABEL.decides) continue;
    const dp = (await r.getNodeProps(e.from)) ?? {};
    const order = [str(dp["receipt"]), num(dp["seq"])] as const;
    if (governing !== null && compareOrder(governing.order, order) > 0) continue;
    governing = {
      order,
      d: {
        id: str(dp["decisionId"]),
        decision: str(dp["decision"]),
        outcome: typeof dp["outcome"] === "string" ? dp["outcome"] : null,
        reason: typeof dp["reason"] === "string" ? dp["reason"] : null,
        observer: str(dp["observer"]),
        decided_at: str(dp["decidedAt"]),
        proposal_sha256: str(dp["proposalSha256"]),
      },
    };
  }
  return {
    node,
    order: [str(props["receipt"]), num(props["seq"])],
    p: {
      relation: str(props["relation"]),
      from: str(props["from"]),
      to: str(props["to"]),
      evidence: JSON.parse(str(props["evidence"]) || "[]") as NonNullable<Proposal["evidence"]>,
      proposal_sha256: str(props["proposalSha256"]),
    },
    d: governing?.d ?? null,
  };
}

/** Ingest order: receipt id, then position within the ingest. */
function compareOrder(a: readonly [string, number], b: readonly [string, number]): number {
  return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1];
}
const byOrder = (a: WorldProposal, b: WorldProposal): number => compareOrder(a.order, b.order);
const bySeq = (xs: WorldProposal[]): WorldProposal[] => xs.sort(byOrder);

function touches(endpoint: string, subject: string): boolean {
  const id = artifactId(endpoint);
  if (id !== null) return id === subject;
  return new RegExp(`\\b${subject}\\b`).test(endpoint);
}

const SUPERSEDING = new Set(["supersedes", "replaces"]);

/**
 * Which artifact is current for `subject` as of `asOf`, answered from the
 * graph: the walk follows `to_artifact` edges into approved proposals and
 * out along their `from_artifact` edges. Same contract as the package's
 * `resolve`, which the tests hold it to.
 */
export async function resolveInWorld(r: WorldReader, subject: string, asOf: string): Promise<Resolution> {
  const out: Resolution = {
    subject,
    asOf,
    current: subject,
    superseded: [],
    chain: [],
    contradictedBy: [],
    cancelledBy: [],
    pending: [],
    notYetDecided: [],
    unaddressable: [],
    cycle: false,
  };
  const all = await Promise.all((await r.nodeIds("proposal:")).map((n) => loadProposal(r, n)));
  all.sort(byOrder);
  const usable = new Set<string>();
  for (const wp of all) {
    const { p, d } = wp;
    const near = touches(p.from, subject) || touches(p.to, subject);
    if (d === null) {
      if (near) out.pending.push(p);
      continue;
    }
    if (d.decision !== "approve") continue;
    if (day(d.decided_at) > day(asOf)) {
      if (near) out.notYetDecided.push(p);
      continue;
    }
    const from = artifactId(p.from);
    const to = artifactId(p.to);
    if (from === null || to === null) {
      if (!near) continue;
      const u: UnusableEdge = {
        relation: p.relation,
        from: p.from,
        to: p.to,
        reason: from === null && to === null
          ? "no artifact id on either endpoint — both are prose"
          : `no artifact id on the ${from !== null ? "'to'" : "'from'"} endpoint — it is prose`,
      };
      out.unaddressable.push(u);
      continue;
    }
    usable.add(wp.node);
  }
  const byNode = new Map(all.map((wp) => [wp.node, wp]));
  const endpoint = async (proposal: string, label: string): Promise<string | null> => {
    const e = (await r.outgoing(proposal)).find((x) => x.label === label);
    if (e === undefined) return null;
    const props = await r.getNodeProps(e.to);
    return str(props?.["artifactId"]);
  };
  /** Usable proposals whose `to` (or `from`) edge lands on this artifact, in source order. */
  const touching = async (artifact: string, label: string): Promise<WorldProposal[]> => {
    const hits: WorldProposal[] = [];
    for (const e of await r.incoming(artifactNode(artifact))) {
      if (e.label !== label || !usable.has(e.from)) continue;
      const wp = byNode.get(e.from);
      if (wp !== undefined) hits.push(wp);
    }
    return bySeq(hits);
  };

  const intoSubject = await touching(subject, LABEL.toArtifact);
  const outOfSubject = await touching(subject, LABEL.fromArtifact);
  for (const wp of bySeq([...intoSubject, ...outOfSubject.filter((x) => !intoSubject.includes(x))])) {
    if (wp.p.relation !== "contradicts") continue;
    const from = await endpoint(wp.node, LABEL.fromArtifact);
    const to = await endpoint(wp.node, LABEL.toArtifact);
    if (to === subject && from !== null) out.contradictedBy.push(from);
    else if (from === subject && to !== null) out.contradictedBy.push(to);
  }
  for (const wp of intoSubject) {
    if (wp.p.relation !== "cancels") continue;
    const from = await endpoint(wp.node, LABEL.fromArtifact);
    if (from !== null) out.cancelledBy.push(from);
    out.current = null;
  }
  if (out.current === null) return out;

  const seen = new Set<string>([subject]);
  let cursor = subject;
  for (;;) {
    const next = (await touching(cursor, LABEL.toArtifact)).find((wp) => SUPERSEDING.has(wp.p.relation));
    if (next === undefined) break;
    const from = await endpoint(next.node, LABEL.fromArtifact);
    if (from === null) break;
    if (seen.has(from)) {
      out.cycle = true;
      break;
    }
    out.superseded.push(cursor);
    const edge: ChainEdge = {
      relation: next.p.relation,
      from,
      to: cursor,
      decidedBy: next.d?.observer ?? "",
      decidedAt: next.d?.decided_at ?? "",
    };
    out.chain.push(edge);
    seen.add(from);
    cursor = from;
  }
  out.current = cursor;
  return out;
}

/** A named policy for choosing a candidate when no selection decision exists. */
export type CandidatePolicy = "sole-candidate";

export type CandidateSelection =
  | { readonly status: "selected"; readonly candidate: number; readonly by: { readonly decision: string } | { readonly policy: CandidatePolicy } }
  | { readonly status: "unselected"; readonly candidates: number };

export interface ExtractionReading {
  readonly extraction: string;
  readonly path: string;
  readonly extractedAt: string;
  readonly selection: CandidateSelection;
}

export interface CurrentReading {
  readonly resolution: Resolution;
  /** The current artifact's extraction attempts entered by `asOf`, sorted by id. Empty when the subject was cancelled. */
  readonly readings: readonly ExtractionReading[];
}

async function selectionFor(r: WorldReader, extraction: string, count: number, asOf: string, policy: CandidatePolicy | undefined): Promise<CandidateSelection> {
  let latest: { at: string; node: string; candidate: number } | null = null;
  for (const c of await r.incoming(extraction)) {
    if (c.label !== LABEL.candidateOf) continue;
    for (const s of await r.incoming(c.from)) {
      if (s.label !== LABEL.selects) continue;
      const props = (await r.getNodeProps(s.from)) ?? {};
      const at = str(props["at"]);
      if (day(at) > day(asOf)) continue;
      if (latest === null || at > latest.at || (at === latest.at && s.from > latest.node)) {
        latest = { at, node: s.from, candidate: num(props["candidate"]) };
      }
    }
  }
  if (latest !== null) return { status: "selected", candidate: latest.candidate, by: { decision: latest.node } };
  if (policy === "sole-candidate" && count === 1) return { status: "selected", candidate: 0, by: { policy } };
  return { status: "unselected", candidates: count };
}

/** The current reading of `subject` as of `asOf`. Candidate order never selects; see `CandidatePolicy`. */
export async function currentReading(r: WorldReader, subject: string, asOf: string, policy?: CandidatePolicy): Promise<CurrentReading> {
  const resolution = await resolveInWorld(r, subject, asOf);
  if (resolution.current === null) return { resolution, readings: [] };
  const entered = new Set(await extractionsAsOf(r, asOf));
  const readings: ExtractionReading[] = [];
  for (const e of await r.incoming(artifactNode(resolution.current))) {
    if (e.label !== LABEL.extractedFrom || !entered.has(e.from)) continue;
    const props = (await r.getNodeProps(e.from)) ?? {};
    readings.push({
      extraction: e.from,
      path: str(props["path"]),
      extractedAt: str(props["extractedAt"]),
      selection: await selectionFor(r, e.from, num(props["candidates"]), asOf, policy),
    });
  }
  readings.sort((a, b) => a.extraction.localeCompare(b.extraction));
  return { resolution, readings };
}

/** The ClaimWarp root of a candidate, for decoding its term. */
export const candidateTermId = (extraction: string, i: number): string => candidateNode(extraction, i);
export const candidateTermRoot = (extraction: string, i: number): string => claimNodeId(candidateNode(extraction, i), "$");
