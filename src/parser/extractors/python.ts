import type { SyntaxNode as TSNode } from "web-tree-sitter";
import { type JumpEntry, OutlineEntry } from "../types.js";
import {
  type ExtractorResult,
  type LanguageExtractor,
  boundSignature,
  buildJumpEntry,
} from "./common.js";

function isPublicPythonName(name: string): boolean {
  if (name.startsWith("__") && name.endsWith("__") && name.length > 4) {
    return true;
  }
  return !name.startsWith("_");
}

function isUppercaseConstantName(name: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/u.test(name);
}

export class PythonExtractor implements LanguageExtractor {
  extract(root: TSNode): ExtractorResult {
    const entries: OutlineEntry[] = [];
    const jumpTable: JumpEntry[] = [];

    for (const child of root.namedChildren) {
      const entry = this.processTopLevelStatement(child);
      if (entry) {
        entries.push(entry);
        jumpTable.push(buildJumpEntry(entry.name, entry.kind, child));
      }
    }

    return { entries, jumpTable };
  }

  private processTopLevelStatement(node: TSNode): OutlineEntry | undefined {
    const declaration = this.unwrapDecoratedDefinition(node);
    if (declaration) {
      return this.processDeclaration(declaration);
    }

    const constant = this.extractAssignment(node);
    if (constant && isUppercaseConstantName(constant.name)) {
      return new OutlineEntry({
        kind: "constant",
        name: constant.name,
        exported: true,
        signature: constant.signature,
      });
    }

    return undefined;
  }

  private unwrapDecoratedDefinition(node: TSNode): TSNode | undefined {
    if (node.type === "function_definition" || node.type === "class_definition") {
      return node;
    }
    if (node.type !== "decorated_definition") {
      return undefined;
    }
    return node.namedChildren.find((child) =>
      child.type === "function_definition" || child.type === "class_definition"
    );
  }

  private processDeclaration(node: TSNode): OutlineEntry | undefined {
    if (node.type === "function_definition") {
      return this.processFunction(node, "function");
    }
    if (node.type === "class_definition") {
      return this.processClass(node);
    }
    return undefined;
  }

  private processClass(node: TSNode): OutlineEntry | undefined {
    const name = this.extractName(node);
    if (!name) return undefined;
    const children = this.extractClassChildren(node);

    return new OutlineEntry({
      kind: "class",
      name,
      exported: isPublicPythonName(name),
      signature: this.extractClassSignature(node, name),
      ...(children.length > 0 ? { children } : {}),
    });
  }

  private processFunction(
    node: TSNode,
    kind: "function" | "method",
  ): OutlineEntry | undefined {
    const name = this.extractName(node);
    if (!name) return undefined;

    return new OutlineEntry({
      kind,
      name,
      exported: isPublicPythonName(name),
      signature: this.extractFunctionSignature(node, name),
    });
  }

  private extractName(node: TSNode): string | undefined {
    return node.childForFieldName("name")?.text;
  }

  private extractFunctionSignature(node: TSNode, name: string): string {
    const params = node.childForFieldName("parameters");
    const returnType = node.childForFieldName("return_type");
    const asyncPrefix = node.children.some((child) => child.type === "async") ? "async " : "";

    let sig = `${asyncPrefix}${name}`;
    if (params) sig += params.text;
    if (returnType) sig += `: ${returnType.text}`;
    return boundSignature(sig);
  }

  private extractClassSignature(node: TSNode, name: string): string {
    const superclasses = node.childForFieldName("superclasses");
    return boundSignature(`class ${name}${superclasses?.text ?? ""}`);
  }

  private extractClassChildren(node: TSNode): OutlineEntry[] {
    const body = node.childForFieldName("body");
    if (!body) return [];

    const children: OutlineEntry[] = [];
    for (const child of body.namedChildren) {
      const declaration = this.unwrapDecoratedDefinition(child);
      if (declaration?.type === "function_definition") {
        const method = this.processFunction(declaration, "method");
        if (method) children.push(method);
        continue;
      }

      const field = this.extractAssignment(child);
      if (field && isPublicPythonName(field.name)) {
        children.push(new OutlineEntry({
          kind: "field",
          name: field.name,
          exported: true,
          signature: field.signature,
        }));
      }
    }

    return children;
  }

  private extractAssignment(
    node: TSNode,
  ): { readonly name: string; readonly signature: string } | undefined {
    if (node.type !== "expression_statement") {
      return undefined;
    }

    const assignment = node.namedChildren.find((child) => child.type === "assignment");
    const left = assignment?.childForFieldName("left");
    if (!assignment || left?.type !== "identifier") {
      return undefined;
    }

    const typeNode = assignment.childForFieldName("type");
    const signature = typeNode
      ? `${left.text}: ${typeNode.text}`
      : assignment.text;

    return {
      name: left.text,
      signature: boundSignature(signature),
    };
  }
}
