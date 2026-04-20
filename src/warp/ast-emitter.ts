// ---------------------------------------------------------------------------
// Full AST emitter — walks tree-sitter AST and emits every node into WARP
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import type { WarpHandle, WarpPatchBuilder } from "../ports/warp.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

function hashId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 12);
}

function astNodeId(filePath: string, node: TSNode): string {
  const hash = hashId(`${filePath}:${node.type}:${String(node.startIndex)}:${String(node.endIndex)}`);
  return `ast:${filePath}:${hash}`;
}

function emitNode(
  patch: WarpPatchBuilder,
  filePath: string,
  node: TSNode,
  parentId: string | undefined,
): void {
  const nodeId = astNodeId(filePath, node);
  patch.addNode(nodeId);
  patch.setProperty(nodeId, "type", node.type);
  patch.setProperty(nodeId, "named", node.isNamed());
  patch.setProperty(nodeId, "startRow", node.startPosition.row);
  patch.setProperty(nodeId, "startCol", node.startPosition.column);
  patch.setProperty(nodeId, "endRow", node.endPosition.row);
  patch.setProperty(nodeId, "endCol", node.endPosition.column);
  patch.setProperty(nodeId, "filePath", filePath);

  // Store text for leaf nodes (no children)
  if (node.childCount === 0) {
    patch.setProperty(nodeId, "text", node.text);
  }

  // Connect to parent
  if (parentId !== undefined) {
    patch.addEdge(parentId, nodeId, "child");
  }

  // Recurse into ALL children
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child !== null) {
      emitNode(patch, filePath, child, nodeId);
    }
  }
}

/**
 * Emit the complete tree-sitter CST for a file into the WARP graph.
 *
 * Every node (named and anonymous) becomes a graph node with ID
 * `ast:<filePath>:<hash>`. Parent-child relationships become `child`
 * edges. The file node gets a `contains` edge to the program root.
 */
export async function emitFullAst(
  warp: WarpHandle,
  filePath: string,
  root: TSNode,
): Promise<void> {
  await warp.patch((patch) => {
    const fileId = `file:${filePath}`;
    patch.addNode(fileId);
    patch.setProperty(fileId, "path", filePath);

    // Emit root's children as top-level AST nodes
    // (the root "program" node itself is also emitted)
    const rootId = astNodeId(filePath, root);
    patch.addNode(rootId);
    patch.setProperty(rootId, "type", root.type);
    patch.setProperty(rootId, "startRow", root.startPosition.row);
    patch.setProperty(rootId, "startCol", root.startPosition.column);
    patch.setProperty(rootId, "endRow", root.endPosition.row);
    patch.setProperty(rootId, "endCol", root.endPosition.column);
    patch.setProperty(rootId, "named", root.isNamed());
    patch.setProperty(rootId, "filePath", filePath);

    patch.addEdge(fileId, rootId, "contains");

    for (let i = 0; i < root.childCount; i++) {
      const child = root.child(i);
      if (child !== null) {
        emitNode(patch, filePath, child, rootId);
      }
    }
  });
}
