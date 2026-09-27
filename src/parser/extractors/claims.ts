import type { SyntaxNode as TSNode } from "web-tree-sitter";
import {
  frameRefOf,
  parsePath,
  subjectLabel,
  walkTerm,
  type ClaimTerm,
  type PathSegment,
} from "@flyingrobots/contextual-claims";
import { type JumpEntry, OutlineEntry } from "../types.js";
import { type ExtractorResult, boundSignature, buildJumpEntry } from "./common.js";

/**
 * Outline for a contextual-claims result document
 * (docs/design/CORE_claims-source-files.md).
 *
 * The claim model comes from @flyingrobots/contextual-claims: `walkTerm` gives
 * every node's canonical path, constructor and frame; `frameRefOf` and
 * `subjectLabel` give the frame's source-relative holder. Graft adds only what
 * it owns: where each node sits in the JSON bytes. The outline is
 * administrative: it says where a claim is and what shape it has, never
 * whether it is supported or true.
 */

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

/** A claims result by content: a string artifact id and a list of candidates that carry a term object. */
export function isClaimsDocument(value: unknown): value is Json & { candidates: Json[] } {
  if (!isObject(value)) return false;
  const artifact = value["artifact"];
  const candidates = value["candidates"];
  return (
    isObject(artifact) &&
    typeof artifact["artifactId"] === "string" &&
    Array.isArray(candidates) &&
    candidates.length > 0 &&
    candidates.every((c) => isObject(c) && isObject(c["term"]))
  );
}

/** The JSON key that holds each path segment's child. A guard's body is addressed `.guarded` but stored under `body`. */
const SEGMENT_KEY: Readonly<Record<PathSegment["at"], string>> = {
  body: "body",
  condition: "condition",
  guarded: "body",
  even_if: "even_if",
  still: "still",
  items: "items",
  options: "options",
};

function pairValue(obj: TSNode, key: string): TSNode | undefined {
  for (const pair of obj.namedChildren) {
    if (pair.type !== "pair") continue;
    const k = pair.childForFieldName("key");
    if (k === null) continue;
    let name: unknown;
    try {
      name = JSON.parse(k.text);
    } catch {
      continue;
    }
    if (name === key) return pair.childForFieldName("value") ?? undefined;
  }
  return undefined;
}

/** The syntax node of the term object at a canonical path, walking from the term's own node. */
function nodeAt(termNode: TSNode, path: string): TSNode | undefined {
  const segments = parsePath(path);
  if (segments === null) return undefined;
  let node: TSNode | undefined = termNode;
  for (const segment of segments) {
    if (node?.type !== "object") return undefined;
    const child = pairValue(node, SEGMENT_KEY[segment.at]);
    if ("index" in segment) {
      node = child?.type === "array" ? child.namedChildren[segment.index] : undefined;
    } else {
      node = child;
    }
  }
  return node;
}

function signatureOf(term: ClaimTerm): string {
  switch (term.kind) {
    case "atom":
      return `atom ${term.claim.predicate}`;
    case "scope": {
      const ref = frameRefOf(term.frame);
      return `scope ${ref.kind}${ref.holder ? `(${subjectLabel(ref.holder)})` : ""}`;
    }
    default:
      return term.kind;
  }
}

/** Build the claims outline, or null when the document is not a claims result. */
export function extractClaimsOutline(root: TSNode, value: unknown): (ExtractorResult & { partial?: boolean }) | null {
  if (!isClaimsDocument(value)) return null;
  const top = root.namedChildren[0];
  const candidatesNode = top ? pairValue(top, "candidates") : undefined;
  if (top === undefined || candidatesNode?.type !== "array") return null;

  const artifactId = (value["artifact"] as Json)["artifactId"] as string;
  const jumpTable: JumpEntry[] = [];
  const state = { partial: false }; // set inside the candidate callback below

  const candidateEntries = value.candidates.map((candidate, index) => {
    const candidateNode = candidatesNode.namedChildren[index];
    const termNode = candidateNode ? pairValue(candidateNode, "term") : undefined;
    const name = `candidate[${String(index)}]`;
    if (candidateNode) jumpTable.push(buildJumpEntry(name, "object", candidateNode));

    let visits: ReturnType<typeof walkTerm> = [];
    try {
      visits = walkTerm(candidate["term"] as ClaimTerm);
    } catch {
      state.partial = true; // a node without a known constructor: outline what can be shown
    }
    // walkTerm returns every node in tree order; rebuild the nesting from paths.
    const children = new Map<string, string[]>();
    const signatures = new Map<string, string>();
    for (const visit of visits) {
      signatures.set(visit.path, boundSignature(signatureOf(visit.term)));
      const parent = parentPath(visit.path);
      if (parent !== null) children.set(parent, [...(children.get(parent) ?? []), visit.path]);
      const node = termNode ? nodeAt(termNode, visit.path) : undefined;
      if (node) jumpTable.push(buildJumpEntry(visit.path, visit.term.kind === "atom" ? "field" : "object", node));
    }
    const build = (path: string): OutlineEntry => {
      const kids = (children.get(path) ?? []).map(build);
      return new OutlineEntry({
        kind: "object",
        name: path,
        exported: true,
        signature: signatures.get(path) ?? "",
        ...(kids.length > 0 ? { children: kids } : {}),
      });
    };
    const roots = signatures.has("$") ? [build("$")] : [];
    return new OutlineEntry({
      kind: "object",
      name,
      exported: true,
      signature: boundSignature(`candidate ${String(index)}`),
      ...(roots.length > 0 ? { children: roots } : {}),
    });
  });

  jumpTable.unshift(buildJumpEntry(artifactId, "object", top));
  const entries = [
    new OutlineEntry({
      kind: "object",
      name: artifactId,
      exported: true,
      signature: boundSignature(`claims ${artifactId} · ${String(value.candidates.length)} candidate(s)`),
      children: candidateEntries,
    }),
  ];
  return state.partial ? { entries, jumpTable, partial: true } : { entries, jumpTable };
}

/** The canonical path one segment up, or null for the root. */
function parentPath(path: string): string | null {
  if (path === "$") return null;
  const m = /^(.*)(\.[A-Za-z_]+|\[\d+\])$/.exec(path);
  if (!m) return null;
  const up = m[1] ?? "$";
  // `.items[0]` is one segment: strip a trailing `.items`/`.options` left after removing `[i]`.
  return /\.(items|options)$/.test(up) ? up.replace(/\.(items|options)$/, "") || "$" : up;
}
