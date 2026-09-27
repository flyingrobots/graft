import type { ClaimTerm } from "@flyingrobots/contextual-claims";

/**
 * ClaimWarp: a claim term as a typed WARP subgraph, and back
 * (docs/design/CORE_claim-warp.md; Contextual Claims 2 §3.2, §4, §22.1).
 *
 * Each term node becomes one graph node, named by its canonical path under the
 * term's id. Each parent-child link becomes one `claim_child` edge whose
 * `role` (body, guarded, condition, even_if, still, items, options) and
 * `ordinal` are edge properties, so child order lives in the graph rather than
 * in an array. A node's non-child fields are kept verbatim, with its key order,
 * so `JSON.stringify(decode(encode(t))) === JSON.stringify(t)`.
 *
 * The codec talks to two small ports, not to git-warp: any graph that can add
 * nodes, edges and properties and read them back (git-warp today, an Echo WARP
 * backend later) can carry ClaimWarp.
 */

/** The write half of a graph, as used by ClaimWarp. git-warp's PatchBuilderV2 satisfies it. */
export interface ClaimGraphWriter {
  addNode(id: string): unknown;
  setProperty(id: string, key: string, value: unknown): unknown;
  addEdge(from: string, to: string, label: string): unknown;
  setEdgeProperty(from: string, to: string, label: string, key: string, value: unknown): unknown;
}

/** The read half. */
export interface ClaimGraphReader {
  getNodeProps(id: string): Promise<Record<string, unknown> | null>;
  /** Outgoing edges of one node with their properties. */
  outgoing(id: string): Promise<readonly { to: string; label: string; props: Record<string, unknown> }[]>;
}

export const CLAIM_CHILD = "claim_child";
export const CLAIM_WARP_VERSION = "claim-warp/1";

type Role = "body" | "guarded" | "condition" | "even_if" | "still" | "items" | "options";

/** For each constructor, its child slots: the role on the edge, the JSON key it is stored under, and whether it is a list. */
const SLOTS: Readonly<Record<ClaimTerm["kind"], readonly { role: Role; key: string; list: boolean }[]>> = {
  atom: [],
  scope: [{ role: "body", key: "body", list: false }],
  negation: [{ role: "body", key: "body", list: false }],
  group: [{ role: "items", key: "items", list: true }],
  alternative: [{ role: "options", key: "options", list: true }],
  guard: [
    { role: "condition", key: "condition", list: false },
    { role: "guarded", key: "body", list: false },
  ],
  concession: [
    { role: "even_if", key: "even_if", list: false },
    { role: "still", key: "still", list: false },
  ],
};

const isKind = (k: unknown): k is ClaimTerm["kind"] => typeof k === "string" && Object.hasOwn(SLOTS, k);

/** The graph node id of the term node at a canonical path. */
export function claimNodeId(termId: string, path: string): string {
  return `claim:${termId}:${path}`;
}

function childPath(parent: string, role: Role, ordinal: number, list: boolean): string {
  return list ? `${parent}.${role}[${String(ordinal)}]` : `${parent}.${role}`;
}

/** Write a claim term into the graph under `termId`. Returns the root node id. */
export function encodeClaimTerm(writer: ClaimGraphWriter, termId: string, term: ClaimTerm): string {
  const encodeAt = (node: unknown, path: string): string => {
    if (typeof node !== "object" || node === null || Array.isArray(node)) {
      throw new Error(`ClaimWarp: the node at ${path} is not an object`);
    }
    const record = node as Record<string, unknown>;
    const kind = record["kind"];
    if (!isKind(kind)) throw new Error(`ClaimWarp: unknown constructor ${JSON.stringify(kind)} at ${path}`);
    const id = claimNodeId(termId, path);
    const slots = SLOTS[kind];
    const childKeys = new Set(slots.map((s) => s.key));
    writer.addNode(id);
    writer.setProperty(id, "claimWarp", CLAIM_WARP_VERSION);
    writer.setProperty(id, "termId", termId);
    writer.setProperty(id, "path", path);
    writer.setProperty(id, "kind", kind);
    writer.setProperty(id, "keys", JSON.stringify(Object.keys(record)));
    for (const [key, value] of Object.entries(record)) {
      if (key === "kind" || childKeys.has(key)) continue;
      writer.setProperty(id, `f:${key}`, JSON.stringify(value));
    }
    for (const slot of slots) {
      const value = record[slot.key];
      const children: unknown[] = slot.list ? (Array.isArray(value) ? value : []) : [value];
      if (slot.list && !Array.isArray(value)) throw new Error(`ClaimWarp: ${kind} at ${path} has no ${slot.key} list`);
      children.forEach((child, ordinal) => {
        const childId = encodeAt(child, childPath(path, slot.role, ordinal, slot.list));
        writer.addEdge(id, childId, CLAIM_CHILD);
        writer.setEdgeProperty(id, childId, CLAIM_CHILD, "role", slot.role);
        writer.setEdgeProperty(id, childId, CLAIM_CHILD, "ordinal", ordinal);
      });
    }
    return id;
  };
  return encodeAt(term, "$");
}

interface ReadNode {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children: readonly { role: string; ordinal: number; id: string }[];
}

async function readNode(reader: ClaimGraphReader, id: string): Promise<ReadNode> {
  const props = await reader.getNodeProps(id);
  if (props === null) throw new Error(`ClaimWarp: node ${id} is missing`);
  const edges = await reader.outgoing(id);
  const children = edges
    .filter((e) => e.label === CLAIM_CHILD)
    .map((e) => {
      const role = e.props["role"];
      const ordinal = e.props["ordinal"];
      if (typeof role !== "string" || typeof ordinal !== "number" || !Number.isInteger(ordinal) || ordinal < 0) {
        throw new Error(`ClaimWarp: edge ${id} -> ${e.to} has no valid role and ordinal`);
      }
      return { role, ordinal, id: e.to };
    });
  return { id, props, children };
}

/**
 * Check that the subgraph under `termId` is a well-formed ClaimWarp: every node
 * carries a known constructor and the version tag, each slot has exactly the
 * children its constructor allows with ordinals 0..n-1, no node is reached
 * twice, and each node's path matches its position. Throws with the offending
 * node named; returns the number of nodes checked.
 */
export async function assertValidClaimWarp(reader: ClaimGraphReader, termId: string): Promise<number> {
  const seen = new Set<string>();
  const check = async (id: string, path: string): Promise<void> => {
    if (seen.has(id)) throw new Error(`ClaimWarp: node ${id} is reached twice`);
    seen.add(id);
    const node = await readNode(reader, id);
    const { props } = node;
    if (props["claimWarp"] !== CLAIM_WARP_VERSION) throw new Error(`ClaimWarp: ${id} has no ${CLAIM_WARP_VERSION} tag`);
    if (props["termId"] !== termId) throw new Error(`ClaimWarp: ${id} belongs to term ${String(props["termId"])}`);
    if (props["path"] !== path) throw new Error(`ClaimWarp: ${id} records path ${String(props["path"])}, found at ${path}`);
    const kind = props["kind"];
    if (!isKind(kind)) throw new Error(`ClaimWarp: ${id} has unknown constructor ${JSON.stringify(kind)}`);
    const keys = parseKeys(id, props["keys"]);
    if (!keys.includes("kind")) throw new Error(`ClaimWarp: ${id} key order omits kind`);
    const slots = SLOTS[kind];
    const roles = new Set<string>(slots.map((s) => s.role));
    for (const child of node.children) {
      if (!roles.has(child.role)) throw new Error(`ClaimWarp: ${kind} ${id} has a child in role ${child.role}`);
    }
    for (const slot of slots) {
      if (!keys.includes(slot.key)) throw new Error(`ClaimWarp: ${id} key order omits ${slot.key}`);
      const inRole = node.children.filter((c) => c.role === slot.role).sort((a, b) => a.ordinal - b.ordinal);
      if (!slot.list && inRole.length !== 1) {
        throw new Error(`ClaimWarp: ${kind} ${id} needs exactly one ${slot.role}, has ${String(inRole.length)}`);
      }
      if (slot.list && inRole.length === 0) throw new Error(`ClaimWarp: ${kind} ${id} has an empty ${slot.role}`);
      for (const [i, child] of inRole.entries()) {
        if (child.ordinal !== i) throw new Error(`ClaimWarp: ${kind} ${id} ${slot.role} ordinals are not 0..${String(inRole.length - 1)}`);
        await check(child.id, childPath(path, slot.role, i, slot.list));
      }
    }
    for (const key of keys) {
      if (key === "kind" || slots.some((s) => s.key === key)) continue;
      if (typeof props[`f:${key}`] !== "string") throw new Error(`ClaimWarp: ${id} is missing field ${key}`);
    }
  };
  await check(claimNodeId(termId, "$"), "$");
  return seen.size;
}

function parseKeys(id: string, raw: unknown): string[] {
  if (typeof raw !== "string") throw new Error(`ClaimWarp: ${id} has no key order`);
  const keys: unknown = JSON.parse(raw);
  if (!Array.isArray(keys) || !keys.every((k) => typeof k === "string")) throw new Error(`ClaimWarp: ${id} key order is malformed`);
  return keys;
}

/** Read the term under `termId` back out of the graph. Validates first. */
export async function decodeClaimWarp(reader: ClaimGraphReader, termId: string): Promise<ClaimTerm> {
  await assertValidClaimWarp(reader, termId);
  const decodeAt = async (id: string): Promise<Record<string, unknown>> => {
    const node = await readNode(reader, id);
    const kind = node.props["kind"] as ClaimTerm["kind"];
    const slots = SLOTS[kind];
    const out: Record<string, unknown> = {};
    for (const key of parseKeys(id, node.props["keys"])) {
      if (key === "kind") {
        out[key] = kind;
        continue;
      }
      const slot = slots.find((s) => s.key === key);
      if (slot === undefined) {
        out[key] = JSON.parse(node.props[`f:${key}`] as string) as unknown;
        continue;
      }
      const inRole = node.children.filter((c) => c.role === slot.role).sort((a, b) => a.ordinal - b.ordinal);
      const decoded = await Promise.all(inRole.map((c) => decodeAt(c.id)));
      out[key] = slot.list ? decoded : decoded[0];
    }
    return out;
  };
  return (await decodeAt(claimNodeId(termId, "$"))) as ClaimTerm;
}
