import type { SyntaxNode as TSNode } from "web-tree-sitter";
import { type JumpEntry, OutlineEntry } from "../types.js";
import {
  type LanguageExtractor,
  type ExtractorResult,
  boundSignature,
  buildJumpEntry,
} from "./common.js";

const DECLARATION_NODE_TYPES = new Set([
  "schema_definition",
  "schema_extension",
  "object_type_definition",
  "object_type_extension",
  "interface_type_definition",
  "interface_type_extension",
  "input_object_type_definition",
  "input_object_type_extension",
  "enum_type_definition",
  "enum_type_extension",
  "scalar_type_definition",
  "scalar_type_extension",
  "union_type_definition",
  "union_type_extension",
  "directive_definition",
  "operation_definition",
  "fragment_definition",
]);

export class GraphqlExtractor implements LanguageExtractor {
  extract(root: TSNode): ExtractorResult {
    const entries: OutlineEntry[] = [];
    const jumpTable: JumpEntry[] = [];

    for (const definition of this.documentDefinitions(root)) {
      const declaration = this.findDeclaration(definition);
      if (declaration === undefined) {
        continue;
      }

      const entry = this.processDeclaration(declaration);
      if (entry === undefined) {
        continue;
      }

      entries.push(entry);
      jumpTable.push(buildJumpEntry(entry.name, entry.kind, declaration));
    }

    return { entries, jumpTable };
  }

  private documentDefinitions(root: TSNode): readonly TSNode[] {
    const document = root.namedChildren.find((child) => child.type === "document");
    if (document === undefined) {
      return root.namedChildren.filter((child) => child.type === "definition");
    }
    return document.namedChildren.filter((child) => child.type === "definition");
  }

  private findDeclaration(node: TSNode): TSNode | undefined {
    if (DECLARATION_NODE_TYPES.has(node.type)) {
      return node;
    }

    for (const child of node.namedChildren) {
      const declaration = this.findDeclaration(child);
      if (declaration !== undefined) {
        return declaration;
      }
    }

    return undefined;
  }

  private processDeclaration(node: TSNode): OutlineEntry | undefined {
    switch (node.type) {
      case "schema_definition":
      case "schema_extension":
        return new OutlineEntry({
          kind: "schema",
          name: node.type === "schema_extension" ? "extend schema" : "schema",
          exported: true,
          signature: this.headerSignature(node),
        });
      case "object_type_definition":
      case "object_type_extension":
        return this.processObjectType(node);
      case "interface_type_definition":
      case "interface_type_extension":
        return this.processInterfaceType(node);
      case "input_object_type_definition":
      case "input_object_type_extension":
        return this.processInputObjectType(node);
      case "enum_type_definition":
      case "enum_type_extension":
        return this.processEnumType(node);
      case "scalar_type_definition":
      case "scalar_type_extension":
        return this.processNamedType(node, "scalar");
      case "union_type_definition":
      case "union_type_extension":
        return this.processNamedType(node, "union");
      case "directive_definition":
        return this.processDirective(node);
      case "operation_definition":
        return this.processOperation(node);
      case "fragment_definition":
        return this.processFragment(node);
      default:
        return undefined;
    }
  }

  private processObjectType(node: TSNode): OutlineEntry | undefined {
    return this.processNamedType(node, "object", this.fieldChildren(node));
  }

  private processInterfaceType(node: TSNode): OutlineEntry | undefined {
    return this.processNamedType(node, "interface", this.fieldChildren(node));
  }

  private processInputObjectType(node: TSNode): OutlineEntry | undefined {
    return this.processNamedType(node, "input", this.inputFieldChildren(node));
  }

  private processEnumType(node: TSNode): OutlineEntry | undefined {
    return this.processNamedType(node, "enum", this.enumValueChildren(node));
  }

  private processNamedType(
    node: TSNode,
    kind: OutlineEntry["kind"] = "type",
    children: readonly OutlineEntry[] = [],
  ): OutlineEntry | undefined {
    const name = this.nameText(node);
    if (name === undefined) {
      return undefined;
    }

    return new OutlineEntry({
      kind,
      name: this.extensionName(node, name),
      exported: true,
      signature: this.headerSignature(node),
      ...(children.length > 0 ? { children } : {}),
    });
  }

  private processDirective(node: TSNode): OutlineEntry | undefined {
    const name = this.nameText(node);
    if (name === undefined) {
      return undefined;
    }

    return new OutlineEntry({
      kind: "directive",
      name: `@${name}`,
      exported: true,
      signature: this.headerSignature(node),
    });
  }

  private processOperation(node: TSNode): OutlineEntry {
    const operationType = this.childText(node, "operation_type") ?? "query";
    const name = this.nameText(node) ?? `<anonymous ${operationType}>`;
    const variables = this.childText(node, "variable_definitions") ?? "";
    return new OutlineEntry({
      kind: "operation",
      name,
      exported: true,
      signature: boundSignature(`${operationType} ${name}${variables}`),
    });
  }

  private processFragment(node: TSNode): OutlineEntry | undefined {
    const name = this.childText(node, "fragment_name");
    if (name === undefined) {
      return undefined;
    }

    const typeCondition = this.childText(node, "type_condition");
    const signature = typeCondition === undefined
      ? `fragment ${name}`
      : `fragment ${name} ${typeCondition}`;
    return new OutlineEntry({
      kind: "fragment",
      name,
      exported: true,
      signature: boundSignature(signature),
    });
  }

  private fieldChildren(node: TSNode): readonly OutlineEntry[] {
    const fields = this.child(node, "fields_definition");
    if (fields === undefined) {
      return [];
    }

    return fields.namedChildren
      .filter((child) => child.type === "field_definition")
      .flatMap((field) => this.fieldEntry(field));
  }

  private inputFieldChildren(node: TSNode): readonly OutlineEntry[] {
    const fields = this.child(node, "input_fields_definition");
    if (fields === undefined) {
      return [];
    }

    return fields.namedChildren
      .filter((child) => child.type === "input_value_definition")
      .flatMap((field) => this.fieldEntry(field));
  }

  private enumValueChildren(node: TSNode): readonly OutlineEntry[] {
    const values = this.child(node, "enum_values_definition");
    if (values === undefined) {
      return [];
    }

    return values.namedChildren
      .filter((child) => child.type === "enum_value_definition")
      .flatMap((value) => {
        const enumValue = this.childText(value, "enum_value");
        if (enumValue === undefined) {
          return [];
        }
        return [new OutlineEntry({
          kind: "enum_value",
          name: enumValue,
          exported: true,
        })];
      });
  }

  private fieldEntry(node: TSNode): readonly OutlineEntry[] {
    const name = this.nameText(node);
    if (name === undefined) {
      return [];
    }

    const args = this.childText(node, "arguments_definition") ?? "";
    const type = this.childText(node, "type");
    const signature = type === undefined
      ? `${name}${args}`
      : `${name}${args}: ${type}`;

    return [new OutlineEntry({
      kind: node.type === "input_value_definition" ? "input_field" : "field",
      name,
      exported: true,
      signature: boundSignature(signature),
    })];
  }

  private extensionName(node: TSNode, name: string): string {
    return node.type.endsWith("_extension") ? `extend ${name}` : name;
  }

  private headerSignature(node: TSNode): string {
    const body = node.namedChildren.find((child) =>
      child.type === "fields_definition"
      || child.type === "input_fields_definition"
      || child.type === "enum_values_definition"
      || child.type === "root_operation_type_definition"
      || child.type === "selection_set"
    );
    const raw = body === undefined
      ? node.text
      : node.text.slice(0, Math.max(0, body.startIndex - node.startIndex)).trim();
    return boundSignature(raw.replace(/\s*\{\s*$/, "").replace(/\s+/g, " "));
  }

  private nameText(node: TSNode): string | undefined {
    return this.childText(node, "name");
  }

  private childText(node: TSNode, childType: string): string | undefined {
    return this.child(node, childType)?.text;
  }

  private child(node: TSNode, childType: string): TSNode | undefined {
    return node.namedChildren.find((child) => child.type === childType);
  }
}
