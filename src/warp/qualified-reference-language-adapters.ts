import type {
  QualifiedAccessParts,
  QualifiedReferenceLanguage,
  QualifiedReferenceLanguageAdapter,
  TSNode,
} from "./qualified-reference-contract.js";
import { resolveQualifiedImportBindings } from "./qualified-reference-bindings.js";
import { collectShadowRegions } from "./qualified-reference-shadows.js";

function containsIndex(node: TSNode, index: number): boolean {
  return index >= node.startIndex && index < node.endIndex;
}

function pythonAccessParts(node: TSNode): QualifiedAccessParts | null {
  if (node.type !== "attribute") return null;
  const member = node.childForFieldName("attribute") ?? node.namedChildren[1];
  if (member?.type !== "identifier") return null;
  const qualifier: string[] = [];
  let binding = node.childForFieldName("object") ?? node.namedChildren[0];
  while (binding?.type === "attribute") {
    const attribute = binding.childForFieldName("attribute") ?? binding.namedChildren[1];
    if (attribute?.type !== "identifier") return null;
    qualifier.unshift(attribute.text);
    binding = binding.childForFieldName("object") ?? binding.namedChildren[0];
  }
  return binding?.type === "identifier"
    ? { binding, qualifier, member, namespace: "value" }
    : null;
}

function pythonUnsupportedWrite(node: TSNode): boolean {
  let cursor = node.parent;
  while (cursor !== null) {
    if (cursor.type === "delete_statement") return true;
    if (cursor.type === "assignment" || cursor.type === "augmented_assignment") {
      const left = cursor.childForFieldName("left") ?? cursor.namedChildren[0];
      return left !== undefined && containsIndex(left, node.startIndex);
    }
    if (cursor.type === "expression_statement" || cursor.type === "block" || cursor.type === "module") return false;
    cursor = cursor.parent;
  }
  return false;
}

function typescriptAccessParts(node: TSNode): QualifiedAccessParts | null {
  if (node.type === "member_expression") {
    const binding = node.childForFieldName("object");
    const member = node.childForFieldName("property");
    return binding?.type === "identifier" && member?.type === "property_identifier"
      ? { binding, qualifier: [], member, namespace: "value" }
      : null;
  }
  if (node.type === "nested_type_identifier") {
    const binding = node.childForFieldName("module");
    const member = node.childForFieldName("name");
    return binding?.type === "identifier" && member?.type === "type_identifier"
      ? { binding, qualifier: [], member, namespace: "type" }
      : null;
  }
  return null;
}

function javascriptAccessParts(node: TSNode): QualifiedAccessParts | null {
  if (node.type !== "member_expression") return null;
  const binding = node.childForFieldName("object");
  const member = node.childForFieldName("property");
  return binding?.type === "identifier" && member?.type === "property_identifier"
    ? { binding, qualifier: [], member, namespace: "value" }
    : null;
}

function rustAccessParts(node: TSNode): QualifiedAccessParts | null {
  if (node.type !== "scoped_identifier" && node.type !== "scoped_type_identifier") return null;
  const binding = node.childForFieldName("path");
  const member = node.childForFieldName("name");
  const expectedMemberType = node.type === "scoped_type_identifier" ? "type_identifier" : "identifier";
  return binding?.type === "identifier" && member?.type === expectedMemberType
    ? { binding, qualifier: [], member, namespace: "type" }
    : null;
}

function goAccessParts(node: TSNode): QualifiedAccessParts | null {
  if (node.type !== "selector_expression") return null;
  const binding = node.childForFieldName("operand");
  const member = node.childForFieldName("field");
  return binding?.type === "identifier" && member?.type === "field_identifier"
    ? { binding, qualifier: [], member, namespace: "value" }
    : null;
}

const noUnsupportedWrite = (): boolean => false;

function createAdapter(
  language: QualifiedReferenceLanguage,
  accessParts: QualifiedReferenceLanguageAdapter["accessParts"],
  isUnsupportedWrite: QualifiedReferenceLanguageAdapter["isUnsupportedWrite"] = noUnsupportedWrite,
): QualifiedReferenceLanguageAdapter {
  return {
    languages: [language],
    resolveBindings: (filePath, root, context) =>
      resolveQualifiedImportBindings(language, filePath, root, context),
    collectShadows: (filePath, root, bindings, context) =>
      collectShadowRegions(language, filePath, root, bindings, context),
    accessParts,
    isUnsupportedWrite,
  };
}

const pythonAdapter = createAdapter("python", pythonAccessParts, pythonUnsupportedWrite);
const typescriptAdapter = createAdapter("ts", typescriptAccessParts);
const tsxAdapter = createAdapter("tsx", typescriptAccessParts);
const javascriptAdapter = createAdapter("js", javascriptAccessParts);
const rustAdapter = createAdapter("rust", rustAccessParts);
const goAdapter = createAdapter("go", goAccessParts);

export const registeredQualifiedReferenceLanguages = [
  "python", "ts", "tsx", "js", "rust", "go",
] as const satisfies readonly QualifiedReferenceLanguage[];

const adapters = new Map<QualifiedReferenceLanguage, QualifiedReferenceLanguageAdapter>();
for (const adapter of [pythonAdapter, typescriptAdapter, tsxAdapter, javascriptAdapter, rustAdapter, goAdapter]) {
  for (const language of adapter.languages) adapters.set(language, adapter);
}

export function qualifiedReferenceAdapterFor(
  language: QualifiedReferenceLanguage,
): QualifiedReferenceLanguageAdapter {
  const adapter = adapters.get(language);
  if (adapter === undefined) throw new Error(`No qualified-reference adapter is registered for ${language}`);
  return adapter;
}
