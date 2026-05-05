import type { SyntaxNode as TSNode } from "web-tree-sitter";
import { type JumpEntry, OutlineEntry } from "../types.js";
import {
  type LanguageExtractor,
  type ExtractorResult,
  boundSignature,
  buildJumpEntry,
} from "./common.js";

export class RustExtractor implements LanguageExtractor {
  extract(root: TSNode): ExtractorResult {
    const entries: OutlineEntry[] = [];
    const jumpTable: JumpEntry[] = [];

    for (const child of root.children) {
      const kind = this.nodeKind(child.type);
      if (kind) {
        const entry = this.processDeclaration(child, false);
        if (entry) {
          entries.push(entry);
          jumpTable.push(buildJumpEntry(entry.name, entry.kind, child));
        }
      }
    }

    return { entries, jumpTable };
  }

  private nodeKind(nodeType: string): OutlineEntry["kind"] | undefined {
    switch (nodeType) {
      case "function_item":
        return "function";
      case "struct_item":
        return "class";
      case "trait_item":
        return "interface";
      case "type_item":
        return "type";
      case "enum_item":
        return "enum";
      case "impl_item":
        return "class";
      default:
        return undefined;
    }
  }

  private extractName(node: TSNode): string | undefined {
    const nameNode = node.childForFieldName("name");
    if (nameNode) return nameNode.text;

    if (node.type === "impl_item") {
      const typeNode = node.childForFieldName("type");
      const traitNode = node.childForFieldName("trait");
      if (traitNode && typeNode) {
        return `${traitNode.text} for ${typeNode.text}`;
      } else if (typeNode) {
        return typeNode.text;
      }
    }
    return undefined;
  }

  private isPublic(node: TSNode): boolean {
    return node.namedChildren.some((child) =>
      child.type === "visibility_modifier" && child.text.startsWith("pub")
    );
  }

  private extractFunctionSignature(node: TSNode): string | undefined {
    const nameNode = node.childForFieldName("name");
    const params = node.childForFieldName("parameters");
    const returnType = node.childForFieldName("return_type");

    let sig = nameNode ? nameNode.text : "";

    if (node.type === "impl_item") {
      const typeNode = node.childForFieldName("type");
      const traitNode = node.childForFieldName("trait");
      if (traitNode && typeNode) {
        return `impl ${traitNode.text} for ${typeNode.text}`;
      } else if (typeNode) {
        return `impl ${typeNode.text}`;
      }
    }

    if (params) sig += params.text;
    if (returnType) {
      const rt = returnType.text.replace(/^(->|:)\s*/, "");
      sig += ": " + rt;
    }
    return sig.length > 0 ? boundSignature(sig) : undefined;
  }

  private extractClassChildren(node: TSNode): OutlineEntry[] {
    const body = node.childForFieldName("body");
    if (!body) return [];

    const children: OutlineEntry[] = [];
    for (const child of body.namedChildren) {
      if (child.type === "function_item" || child.type === "function_signature_item") {
        const name = this.extractName(child);
        if (!name) continue;

        const sig = this.extractFunctionSignature(child);
        children.push(new OutlineEntry({
          kind: "method",
          name,
          exported: this.isPublic(child),
          ...(sig !== undefined ? { signature: sig } : {}),
        }));
      }
    }
    return children;
  }

  private processDeclaration(node: TSNode, inheritedExported: boolean): OutlineEntry | undefined {
    const kind = this.nodeKind(node.type);
    if (!kind) return undefined;

    const name = this.extractName(node);
    if (!name) return undefined;

    const isImpl = node.type === "impl_item";
    const exported = inheritedExported || this.isPublic(node);
    const sig = (kind === "function" || isImpl) ? this.extractFunctionSignature(node) : undefined;
    const children = (kind === "class" || kind === "interface" || isImpl)
      ? this.extractClassChildren(node)
      : undefined;

    return new OutlineEntry({
      kind,
      name,
      exported,
      ...(sig !== undefined ? { signature: sig } : {}),
      ...(children !== undefined && children.length > 0 ? { children } : {}),
    });
  }
}
