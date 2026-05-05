import type { SyntaxNode as TSNode } from "web-tree-sitter";
import { OutlineEntry } from "../types.js";
import {
  type LanguageExtractor,
  type ExtractorResult,
  boundSignature,
  buildJumpEntry,
} from "./common.js";

export class TypescriptExtractor implements LanguageExtractor {
  extract(root: TSNode): ExtractorResult {
    const entries: OutlineEntry[] = [];
    const jumpTable: any[] = [];

    for (const child of root.children) {
      if (child.type === "export_statement") {
        const inner = child.namedChildren.find(
          (c) =>
            c.type === "function_declaration" ||
            c.type === "generator_function_declaration" ||
            c.type === "class_declaration" ||
            c.type === "interface_declaration" ||
            c.type === "type_alias_declaration" ||
            c.type === "enum_declaration",
        );

        if (inner) {
          const entry = this.processDeclaration(inner, true);
          if (entry) {
            entries.push(entry);
            jumpTable.push(buildJumpEntry(entry.name, entry.kind, child));
          }
          continue;
        }

        const lexical = child.namedChildren.find(
          (c) => c.type === "lexical_declaration",
        );
        if (lexical) {
          const lexEntries = this.processLexicalExport(lexical);
          for (const entry of lexEntries) {
            entries.push(entry);
            jumpTable.push(buildJumpEntry(entry.name, entry.kind, child));
          }
          continue;
        }

        const exportClause = child.namedChildren.find(
          (c) => c.type === "export_clause",
        );
        if (exportClause) {
          for (const spec of exportClause.namedChildren) {
            if (spec.type === "export_specifier") {
              const nameNode = spec.childForFieldName("alias") ?? spec.childForFieldName("name");
              if (nameNode) {
                entries.push(new OutlineEntry({ kind: "export", name: nameNode.text, exported: true }));
                jumpTable.push(buildJumpEntry(nameNode.text, "export", child));
              }
            }
          }
          continue;
        }

        const moduleSpecifier = child.namedChildren.find((c) => c.type === "string");
        const hasWildcard = child.children.some((c) => c.type === "*" || c.type === "namespace_export");
        if (hasWildcard && moduleSpecifier) {
          const name = `* from ${moduleSpecifier.text}`;
          entries.push(new OutlineEntry({ kind: "export", name, exported: true }));
          jumpTable.push(buildJumpEntry(name, "export", child));
          continue;
        }
      } else {
        const kind = this.nodeKind(child.type);
        if (kind) {
          const entry = this.processDeclaration(child, false);
          if (entry) {
            entries.push(entry);
            jumpTable.push(buildJumpEntry(entry.name, entry.kind, child));
          }
        }
      }
    }

    return { entries, jumpTable };
  }

  private nodeKind(nodeType: string): OutlineEntry["kind"] | undefined {
    switch (nodeType) {
      case "function_declaration":
      case "generator_function_declaration":
        return "function";
      case "class_declaration":
        return "class";
      case "method_definition":
        return "method";
      case "interface_declaration":
        return "interface";
      case "type_alias_declaration":
        return "type";
      case "enum_declaration":
        return "enum";
      default:
        return undefined;
    }
  }

  private extractName(node: TSNode): string | undefined {
    return node.childForFieldName("name")?.text;
  }

  private extractFunctionSignature(node: TSNode): string | undefined {
    const nameNode = node.childForFieldName("name");
    if (!nameNode) return undefined;

    const params = node.childForFieldName("parameters");
    const returnType = node.childForFieldName("return_type");

    let sig = nameNode.text;
    if (params) sig += params.text;
    if (returnType) {
      const rt = returnType.text.replace(/^:\s*/, "");
      sig += ": " + rt;
    }
    return boundSignature(sig);
  }

  private extractClassChildren(node: TSNode): OutlineEntry[] {
    const body = node.childForFieldName("body");
    if (!body) return [];

    const children: OutlineEntry[] = [];
    for (const child of body.namedChildren) {
      if (child.type === "method_definition") {
        const name = this.extractName(child);
        if (!name) continue;

        const sig = this.extractFunctionSignature(child);
        children.push(new OutlineEntry({
          kind: "method",
          name,
          exported: false,
          ...(sig !== undefined ? { signature: sig } : {}),
        }));
      }
    }
    return children;
  }

  private processDeclaration(node: TSNode, exported: boolean): OutlineEntry | undefined {
    const kind = this.nodeKind(node.type);
    if (!kind) return undefined;

    const name = this.extractName(node);
    if (!name) return undefined;

    const sig = kind === "function" ? this.extractFunctionSignature(node) : undefined;
    const children = kind === "class" ? this.extractClassChildren(node) : undefined;

    return new OutlineEntry({
      kind,
      name,
      exported,
      ...(sig !== undefined ? { signature: sig } : {}),
      ...(children !== undefined && children.length > 0 ? { children } : {}),
    });
  }

  private processLexicalExport(node: TSNode): OutlineEntry[] {
    const entries: OutlineEntry[] = [];
    for (const child of node.namedChildren) {
      if (child.type === "variable_declarator") {
        const name = this.extractName(child);
        if (!name) continue;

        const value = child.childForFieldName("value");
        if (value && (value.type === "arrow_function" || value.type === "function")) {
          const sig = this.extractArrowSignature(name, value);
          entries.push(new OutlineEntry({
            kind: "function",
            name,
            exported: true,
            ...(sig !== undefined ? { signature: sig } : {}),
          }));
        } else {
          entries.push(new OutlineEntry({ kind: "export", name, exported: true }));
        }
      }
    }
    return entries;
  }

  private extractArrowSignature(name: string, arrowNode: TSNode): string | undefined {
    const params = arrowNode.childForFieldName("parameters");
    const returnType = arrowNode.childForFieldName("return_type");

    let sig = name;
    if (params) sig += params.text;
    if (returnType) {
      const rt = returnType.text.replace(/^:\s*/, "");
      sig += ": " + rt;
    }
    return boundSignature(sig);
  }
}
