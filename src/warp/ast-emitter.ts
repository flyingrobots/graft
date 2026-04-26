// ---------------------------------------------------------------------------
// AST snapshot attachment — keeps bulky syntax trees out of graph state
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import type { PatchBuilderV2 } from "@git-stunts/git-warp";
import type { WarpContext } from "./context.js";
import { patchGraph } from "./context.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

const AST_SNAPSHOT_MIME = "application/vnd.graft.ast+json";

function hashId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 12);
}

function astNodeId(filePath: string, node: TSNode): string {
  const hash = hashId(`${filePath}:${node.type}:${String(node.startIndex)}:${String(node.endIndex)}`);
  return `ast:${filePath}:${hash}`;
}

interface AstSnapshotNode {
  readonly type: string;
  readonly named: boolean;
  readonly startRow: number;
  readonly startCol: number;
  readonly endRow: number;
  readonly endCol: number;
  readonly text?: string | undefined;
  readonly children?: readonly AstSnapshotNode[] | undefined;
}

interface AstSnapshot {
  readonly schema: "graft.ast-snapshot.v1";
  readonly filePath: string;
  readonly root: AstSnapshotNode;
}

function astSnapshotNode(node: TSNode): AstSnapshotNode {
  const children: AstSnapshotNode[] = [];
  for (let index = 0; index < node.childCount; index++) {
    const child = node.child(index);
    if (child !== null) children.push(astSnapshotNode(child));
  }

  return {
    type: node.type,
    named: node.isNamed(),
    startRow: node.startPosition.row,
    startCol: node.startPosition.column,
    endRow: node.endPosition.row,
    endCol: node.endPosition.column,
    ...(children.length === 0 ? { text: node.text } : {}),
    ...(children.length > 0 ? { children } : {}),
  };
}

function astSnapshot(filePath: string, root: TSNode): AstSnapshot {
  return {
    schema: "graft.ast-snapshot.v1",
    filePath,
    root: astSnapshotNode(root),
  };
}

/**
 * Emit a tiny AST root anchor into graph state.
 *
 * The full tree belongs in an attached blob, not materialized WARP graph
 * state. This anchor preserves a stable graph join point for tools that need
 * to know a file has an attached AST snapshot.
 *
 * Call this inside a `warp.patch()` callback to co-locate AST emission
 * with other graph operations in the same atomic commit.
 */
export function emitAstNodes(
  patch: PatchBuilderV2,
  filePath: string,
  root: TSNode,
): void {
  const fileId = `file:${filePath}`;

  const rootId = astNodeId(filePath, root);
  patch.addNode(rootId);
  patch.setProperty(rootId, "type", root.type);
  patch.setProperty(rootId, "named", root.isNamed());
  patch.setProperty(rootId, "startRow", root.startPosition.row);
  patch.setProperty(rootId, "startCol", root.startPosition.column);
  patch.setProperty(rootId, "endRow", root.endPosition.row);
  patch.setProperty(rootId, "endCol", root.endPosition.column);
  patch.setProperty(rootId, "filePath", filePath);
  patch.setProperty(rootId, "summaryOnly", true);

  patch.addEdge(fileId, rootId, "contains_ast");
}

/**
 * Attach the complete tree-sitter CST as node content on the file node.
 *
 * The blob remains reachable through the WARP patch commit tree, but the
 * materialized graph only carries the `_content` OID and metadata.
 */
export async function attachAstSnapshot(
  patch: PatchBuilderV2,
  filePath: string,
  root: TSNode,
): Promise<void> {
  const fileId = `file:${filePath}`;
  const content = Buffer.from(JSON.stringify(astSnapshot(filePath, root)), "utf8");
  await patch.attachContent(fileId, content, {
    mime: AST_SNAPSHOT_MIME,
  });
}

/**
 * Standalone convenience: emit the AST root anchor and attach the full AST
 * snapshot as blob content in one patch.
 */
export async function emitFullAst(
  ctx: WarpContext,
  filePath: string,
  root: TSNode,
): Promise<void> {
  await patchGraph(ctx, async (patch) => {
    const fileId = `file:${filePath}`;
    patch.addNode(fileId);
    patch.setProperty(fileId, "path", filePath);
    emitAstNodes(patch, filePath, root);
    await attachAstSnapshot(patch, filePath, root);
  });
}
