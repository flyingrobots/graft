// ---------------------------------------------------------------------------
// Full AST emitter — walks tree-sitter AST and emits every node into WARP
// ---------------------------------------------------------------------------

import type { WarpHandle, WarpPatchBuilder } from "../ports/warp.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

function astNodeId(filePath: string, node: TSNode): string {
  return `ast:${filePath}:${String(node.startIndex)}:${String(node.endIndex)}`;
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
  patch.setProperty(nodeId, "startRow", node.startPosition.row);
  patch.setProperty(nodeId, "startCol", node.startPosition.column);
  patch.setProperty(nodeId, "endRow", node.endPosition.row);
  patch.setProperty(nodeId, "endCol", node.endPosition.column);
  patch.setProperty(nodeId, "named", node.isNamed());
  patch.setProperty(nodeId, "filePath", filePath);

  // Store text only for leaf nodes (terminals)
  if (node.childCount === 0) {
    patch.setProperty(nodeId, "text", node.text);
  }

  // Field name (if this node is a named field of its parent)
  // We handle this in the child loop below since tree-sitter
  // exposes field names from the parent's perspective.

  // Connect to parent
  if (parentId !== undefined) {
    patch.addEdge(parentId, nodeId, "child");
  }

  // Recurse into children
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child !== null) {
      emitNode(patch, filePath, child, nodeId);
    }
  }
}

/**
 * Emit the full tree-sitter AST for a file into the WARP graph.
 *
 * Every tree-sitter node becomes a graph node with ID `ast:<filePath>:<row>:<col>`.
 * Parent-child relationships become `child` edges.
 * The file node gets `contains` edges to the root-level AST children.
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
