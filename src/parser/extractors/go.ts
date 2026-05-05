import type { SyntaxNode as TSNode } from "web-tree-sitter";
import { type JumpEntry, OutlineEntry } from "../types.js";
import {
  type ExtractorResult,
  type LanguageExtractor,
  boundSignature,
  buildJumpEntry,
} from "./common.js";

interface GoExtractedEntry {
  readonly entry: OutlineEntry;
  readonly node: TSNode;
}

function isExportedGoName(name: string): boolean {
  return /^[A-Z]/u.test(name);
}

function typeIdentifierText(node: TSNode | null): string | undefined {
  if (node === null) return undefined;
  if (node.type === "type_identifier") return node.text;
  for (const child of node.namedChildren) {
    const found = typeIdentifierText(child);
    if (found !== undefined) return found;
  }
  return undefined;
}

export class GoExtractor implements LanguageExtractor {
  extract(root: TSNode): ExtractorResult {
    const entries: OutlineEntry[] = [];
    const jumpTable: JumpEntry[] = [];

    for (const child of root.namedChildren) {
      for (const extracted of this.processTopLevel(child)) {
        entries.push(extracted.entry);
        jumpTable.push(buildJumpEntry(extracted.entry.name, extracted.entry.kind, extracted.node));
      }
    }

    return { entries, jumpTable };
  }

  private processTopLevel(node: TSNode): GoExtractedEntry[] {
    switch (node.type) {
      case "package_clause":
        return this.processPackage(node);
      case "function_declaration":
        return this.processFunction(node);
      case "method_declaration":
        return this.processMethod(node);
      case "type_declaration":
        return this.processTypeDeclaration(node);
      case "const_declaration":
        return this.processValueDeclaration(node, "constant");
      case "var_declaration":
        return this.processValueDeclaration(node, "variable");
      default:
        return [];
    }
  }

  private processPackage(node: TSNode): GoExtractedEntry[] {
    const name = node.namedChildren.find((child) => child.type === "package_identifier")?.text;
    if (!name) return [];

    return [{
      node,
      entry: new OutlineEntry({
        kind: "package",
        name,
        exported: false,
        signature: `package ${name}`,
      }),
    }];
  }

  private processFunction(node: TSNode): GoExtractedEntry[] {
    const name = node.childForFieldName("name")?.text;
    if (!name) return [];

    return [{
      node,
      entry: new OutlineEntry({
        kind: "function",
        name,
        exported: isExportedGoName(name),
        signature: this.functionSignature(node, name),
      }),
    }];
  }

  private processMethod(node: TSNode): GoExtractedEntry[] {
    const name = node.childForFieldName("name")?.text;
    if (!name) return [];

    const receiverType = typeIdentifierText(node.childForFieldName("receiver"));
    const entryName = receiverType ? `${receiverType}.${name}` : name;

    return [{
      node,
      entry: new OutlineEntry({
        kind: "method",
        name: entryName,
        exported: isExportedGoName(name),
        signature: this.functionSignature(node, name),
      }),
    }];
  }

  private processTypeDeclaration(node: TSNode): GoExtractedEntry[] {
    const entries: GoExtractedEntry[] = [];
    for (const spec of node.namedChildren.filter((child) => child.type === "type_spec")) {
      const name = spec.childForFieldName("name")?.text;
      const typeNode = spec.childForFieldName("type");
      if (!name || typeNode === null) continue;

      const kind = this.typeKind(typeNode);
      const children = this.typeChildren(typeNode);
      entries.push({
        node: spec,
        entry: new OutlineEntry({
          kind,
          name,
          exported: isExportedGoName(name),
          signature: `type ${name} ${typeNode.text.split(/\s+/u)[0] ?? typeNode.type}`,
          ...(children.length > 0 ? { children } : {}),
        }),
      });
    }
    return entries;
  }

  private typeKind(node: TSNode): OutlineEntry["kind"] {
    switch (node.type) {
      case "struct_type":
        return "class";
      case "interface_type":
        return "interface";
      default:
        return "type";
    }
  }

  private typeChildren(node: TSNode): OutlineEntry[] {
    if (node.type === "struct_type") {
      return this.structFields(node);
    }
    if (node.type === "interface_type") {
      return this.interfaceMethods(node);
    }
    return [];
  }

  private structFields(node: TSNode): OutlineEntry[] {
    const children: OutlineEntry[] = [];
    const declarations = node.namedChildren.flatMap((child) =>
      child.type === "field_declaration_list"
        ? child.namedChildren.filter((field) => field.type === "field_declaration")
        : []
    );

    for (const declaration of declarations) {
      const typeNode = declaration.childForFieldName("type");
      for (const nameNode of declaration.namedChildren.filter((child) => child.type === "field_identifier")) {
        children.push(new OutlineEntry({
          kind: "field",
          name: nameNode.text,
          exported: isExportedGoName(nameNode.text),
          signature: typeNode ? `${nameNode.text} ${typeNode.text}` : declaration.text,
        }));
      }
    }

    return children;
  }

  private interfaceMethods(node: TSNode): OutlineEntry[] {
    const children: OutlineEntry[] = [];
    for (const method of node.namedChildren.filter((child) => child.type === "method_spec")) {
      const name = method.childForFieldName("name")?.text;
      if (!name) continue;
      children.push(new OutlineEntry({
        kind: "method",
        name,
        exported: isExportedGoName(name),
        signature: this.functionSignature(method, name),
      }));
    }
    return children;
  }

  private processValueDeclaration(
    node: TSNode,
    kind: "constant" | "variable",
  ): GoExtractedEntry[] {
    const specType = kind === "constant" ? "const_spec" : "var_spec";
    const entries: GoExtractedEntry[] = [];

    for (const spec of node.namedChildren.filter((child) => child.type === specType)) {
      const typeNode = spec.childForFieldName("type");
      const valueNode = spec.childForFieldName("value");
      for (const nameNode of spec.namedChildren.filter((child) => child.type === "identifier")) {
        entries.push({
          node: spec,
          entry: new OutlineEntry({
            kind,
            name: nameNode.text,
            exported: isExportedGoName(nameNode.text),
            signature: this.valueSignature(nameNode.text, typeNode, valueNode),
          }),
        });
      }
    }

    return entries;
  }

  private valueSignature(
    name: string,
    typeNode: TSNode | null,
    valueNode: TSNode | null,
  ): string {
    let signature = name;
    if (typeNode) signature += ` ${typeNode.text}`;
    if (valueNode) signature += ` = ${valueNode.text}`;
    return boundSignature(signature);
  }

  private functionSignature(node: TSNode, name: string): string {
    const params = node.childForFieldName("parameters")?.text ?? "()";
    const result = node.childForFieldName("result")?.text;
    return boundSignature(`${name}${params}${result ? `: ${result}` : ""}`);
  }
}
