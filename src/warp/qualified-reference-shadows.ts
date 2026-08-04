import type { ImportBindingDiagnostic } from "./import-diagnostic.js";
import { goTargetDirectoryPath } from "./qualified-reference-bindings.js";
import type {
  QualifiedReferenceContext,
  QualifiedReferenceLanguage,
  ResolvedImportBinding,
  ShadowRegion,
  TSNode,
} from "./qualified-reference-contract.js";

function walk(node: TSNode, visit: (candidate: TSNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function languageName(language: QualifiedReferenceLanguage): ImportBindingDiagnostic["language"] {
  if (language === "ts" || language === "tsx") return "typescript";
  if (language === "js") return "javascript";
  return language;
}

function nearestAncestor(node: TSNode, types: ReadonlySet<string>): TSNode | null {
  let cursor = node.parent;
  while (cursor !== null) {
    if (types.has(cursor.type)) return cursor;
    cursor = cursor.parent;
  }
  return null;
}

function directMatchingIdentifier(
  node: TSNode | null | undefined,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  if (node === null || node === undefined) return [];
  return ["identifier", "type_identifier", "package_identifier", "shorthand_property_identifier_pattern"].includes(node.type) && bindings.has(node.text)
    ? [node]
    : [];
}

function matchingBindingIdentifiers(
  language: QualifiedReferenceLanguage,
  node: TSNode | null | undefined,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  const direct = directMatchingIdentifier(node, bindings);
  if (direct.length > 0 || node === null || node === undefined) return direct;

  if (language === "python") {
    if (node.type === "dotted_name" && node.namedChildren.length === 1) {
      return directMatchingIdentifier(node.namedChildren[0], bindings);
    }
    if (["default_parameter", "typed_parameter", "typed_default_parameter"].includes(node.type)) {
      return matchingBindingIdentifiers(language, node.childForFieldName("name") ?? node.childForFieldName("parameter") ?? node.namedChildren[0], bindings);
    }
    if (["parameters", "lambda_parameters", "case_pattern", "pattern_list", "tuple_pattern", "list_pattern", "dict_pattern", "union_pattern", "list_splat_pattern", "dictionary_splat_pattern", "as_pattern", "as_pattern_target"].includes(node.type)) {
      return node.namedChildren.flatMap((child) => matchingBindingIdentifiers(language, child, bindings));
    }
    return [];
  }

  if (language === "ts" || language === "tsx" || language === "js") {
    if (node.type === "pair_pattern") {
      return matchingBindingIdentifiers(language, node.childForFieldName("value") ?? node.namedChildren.at(-1), bindings);
    }
    if (node.type === "assignment_pattern") {
      return matchingBindingIdentifiers(language, node.childForFieldName("left") ?? node.namedChildren[0], bindings);
    }
    if (["required_parameter", "optional_parameter"].includes(node.type)) {
      return matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.childForFieldName("name") ?? node.namedChildren[0], bindings);
    }
    if (node.type === "rest_pattern") {
      return matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.namedChildren[0], bindings);
    }
    if (["formal_parameters", "object_pattern", "array_pattern"].includes(node.type)) {
      return node.namedChildren.flatMap((child) => matchingBindingIdentifiers(language, child, bindings));
    }
    return [];
  }

  if (language === "rust") {
    if (node.type === "parameter") {
      return matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.namedChildren[0], bindings);
    }
    if (node.type === "tuple_struct_pattern" || node.type === "struct_pattern") {
      const type = node.childForFieldName("type");
      return node.namedChildren
        .filter((child) => child.startIndex !== type?.startIndex)
        .flatMap((child) => matchingBindingIdentifiers(language, child, bindings));
    }
    if (node.type === "field_pattern") {
      return matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.childForFieldName("name") ?? node.namedChildren.at(-1), bindings);
    }
    if (["parameters", "closure_parameters", "match_pattern", "tuple_pattern", "slice_pattern", "reference_pattern", "mut_pattern", "or_pattern"].includes(node.type)) {
      return node.namedChildren.flatMap((child) => matchingBindingIdentifiers(language, child, bindings));
    }
    return [];
  }

  if (["parameter_declaration", "variadic_parameter_declaration"].includes(node.type)) {
    return node.namedChildren
      .filter((child) => child.type === "identifier")
      .flatMap((child) => directMatchingIdentifier(child, bindings));
  }
  if (node.type === "expression_list") {
    return node.namedChildren.flatMap((child) => directMatchingIdentifier(child, bindings));
  }
  return [];
}

function pythonDeletionIdentifiers(
  node: TSNode,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  if (node.type === "attribute" || node.type === "subscript") return [];
  const direct = directMatchingIdentifier(node, bindings);
  if (direct.length > 0) return direct;
  return node.namedChildren.flatMap((child) => pythonDeletionIdentifiers(child, bindings));
}

function matchingRustUseBindingIdentifiers(
  node: TSNode | null | undefined,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  if (node === null || node === undefined) return [];
  if (node.type === "use_as_clause") {
    return directMatchingIdentifier(node.childForFieldName("alias") ?? node.namedChildren.at(-1), bindings);
  }
  if (node.type === "scoped_identifier") {
    return directMatchingIdentifier(node.childForFieldName("name") ?? node.namedChildren.at(-1), bindings);
  }
  if (node.type === "identifier") return directMatchingIdentifier(node, bindings);
  if (node.type === "use_list" || node.type === "scoped_use_list") {
    return node.namedChildren.flatMap((child) => matchingRustUseBindingIdentifiers(child, bindings));
  }
  return [];
}

function matchingRustTypeParameterIdentifiers(
  node: TSNode,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  if (node.type === "type_identifier") return directMatchingIdentifier(node, bindings);
  if (node.type === "constrained_type_parameter" || node.type === "optional_type_parameter") {
    const name = node.namedChildren[0];
    return name === undefined ? [] : matchingRustTypeParameterIdentifiers(name, bindings);
  }
  if (node.type === "type_parameters") {
    return node.namedChildren.flatMap((child) => matchingRustTypeParameterIdentifiers(child, bindings));
  }
  return [];
}

function matchingGoSpecIdentifiers(
  node: TSNode,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  const identifiers: TSNode[] = [];
  for (const child of node.namedChildren) {
    if (child.type !== "identifier") break;
    identifiers.push(...directMatchingIdentifier(child, bindings));
  }
  return identifiers;
}

function diagnosticFor(
  language: QualifiedReferenceLanguage,
  filePath: string,
  binding: string,
  targetFilePath: string,
  shadowKind: string,
  node: TSNode,
): ImportBindingDiagnostic {
  return {
    code: "import_binding_shadowed",
    severity: "warning",
    language: languageName(language),
    filePath,
    range: {
      startLine: node.startPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1,
    },
    binding,
    targetFilePath,
    shadowKind,
    message: `Import binding '${binding}' is shadowed; affected qualified accesses were excluded from reference inference.`,
  };
}

const PYTHON_LEXICAL_SCOPE_TYPES = new Set(["function_definition", "lambda", "class_definition"]);
const PYTHON_DECLARATION_SCOPE_TYPES = new Set(["function_definition", "class_definition"]);
const PYTHON_IMPORT_STATEMENT_TYPES = new Set(["import_statement", "import_from_statement"]);
const PYTHON_COMPREHENSION_TYPES = new Set(["list_comprehension", "set_comprehension", "dictionary_comprehension", "generator_expression"]);
const PYTHON_ASSIGNMENT_TYPES = new Set(["assignment", "augmented_assignment", "named_expression", "for_statement", "for_in_clause"]);
const TYPESCRIPT_FUNCTION_TYPES = new Set([
  "function_declaration", "function_expression", "generator_function_declaration", "generator_function",
  "arrow_function", "method_definition",
]);
const TYPESCRIPT_BLOCK_TYPES = new Set(["statement_block", "switch_statement", "program"]);
const TYPESCRIPT_LOCAL_TYPES = new Set(["variable_declarator", "assignment_expression"]);
const TYPESCRIPT_LOOP_TYPES = new Set(["for_statement", "for_in_statement"]);
const TYPESCRIPT_DECLARATION_TYPES = new Set(["lexical_declaration", "variable_declaration"]);
const TYPESCRIPT_SCOPED_LOOP_TYPES = new Set(["for_in_statement", "for_of_statement"]);
const RUST_IMPORT_SCOPE_TYPES = new Set(["block", "declaration_list"]);
const RUST_USE_DECLARATION_TYPES = new Set(["use_declaration"]);
const RUST_DECLARATION_TYPES = new Set(["function_item", "struct_item", "enum_item", "type_item", "const_item", "static_item", "union_item", "trait_item", "mod_item"]);
const RUST_TYPE_NAMESPACE_DECLARATION_TYPES = new Set(["struct_item", "enum_item", "type_item", "union_item", "trait_item", "mod_item"]);
const GO_FUNCTION_TYPES = new Set(["function_declaration", "method_declaration", "func_literal"]);
const GO_BLOCK_TYPES = new Set(["block"]);
const GO_LEXICAL_SCOPE_TYPES = new Set([
  "block", "expression_case", "type_case", "communication_case", "default_case",
]);
const GO_LOCAL_TYPES = new Set(["short_var_declaration", "var_spec", "const_spec", "assignment_statement"]);
const GO_LOOP_TYPES = new Set(["for_statement"]);
const GO_CONTROL_TYPES = new Set(["if_statement", "expression_switch_statement", "type_switch_statement"]);
const GO_DECLARATION_TYPES = new Set(["function_declaration", "type_spec"]);

function containsIndex(node: TSNode, index: number): boolean {
  return index >= node.startIndex && index < node.endIndex;
}

export function pythonClassNamespaceAppliesAtIndex(classScope: TSNode, index: number): boolean {
  let cursor = classScope;
  let child = cursor.namedChildren.find((candidate) => containsIndex(candidate, index));
  while (child !== undefined) {
    if (PYTHON_LEXICAL_SCOPE_TYPES.has(child.type)) {
      const body = child.childForFieldName("body") ?? child;
      if (containsIndex(body, index)) return false;
    }
    if (PYTHON_COMPREHENSION_TYPES.has(child.type)) {
      const outermostForClause = child.namedChildren.find((candidate) => candidate.type === "for_in_clause");
      const iterable = outermostForClause?.childForFieldName("right") ?? outermostForClause?.namedChildren.at(-1);
      if (iterable === undefined || !containsIndex(iterable, index)) return false;
    }
    cursor = child;
    child = cursor.namedChildren.find((candidate) => containsIndex(candidate, index));
  }
  return true;
}

function pythonClassScopeForBindingIdentifier(identifier: TSNode): TSNode | undefined {
  let scope = nearestAncestor(identifier, PYTHON_LEXICAL_SCOPE_TYPES);
  if (scope !== null) {
    const declarationName = scope.childForFieldName("name");
    if (declarationName !== null && containsIndex(declarationName, identifier.startIndex)) {
      scope = nearestAncestor(scope, PYTHON_LEXICAL_SCOPE_TYPES);
    }
  }
  if (scope?.type !== "class_definition") return undefined;
  const comprehension = nearestAncestor(identifier, PYTHON_COMPREHENSION_TYPES);
  if (comprehension !== null && containsIndex(scope, comprehension.startIndex)) return undefined;
  return scope;
}

export function importBindingAppliesAtIndex(
  language: QualifiedReferenceLanguage,
  binding: ResolvedImportBinding,
  index: number,
): boolean {
  if (language !== "python") return true;
  const importScope = nearestAncestor(binding.importNode, PYTHON_LEXICAL_SCOPE_TYPES);
  if (importScope?.type !== "class_definition") return true;
  return pythonClassNamespaceAppliesAtIndex(importScope, index);
}

interface ShadowCollector {
  readonly root: TSNode;
  readonly bindings: readonly ResolvedImportBinding[];
  readonly bindingNames: ReadonlySet<string>;
  readonly regions: ShadowRegion[];
  readonly resolvedImportDeclarationStarts: ReadonlySet<number>;
  readonly addAll: (
    identifiers: readonly TSNode[],
    kind: string,
    start: number,
    end: number,
    namespaces?: ReadonlySet<"value" | "type">,
  ) => void;
}

function createShadowCollector(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  bindings: readonly ResolvedImportBinding[],
  context: QualifiedReferenceContext,
): ShadowCollector {
  const bindingNames = new Set(bindings.map((binding) => binding.name));
  const targetForBinding = (binding: ResolvedImportBinding): string => {
    const packageDirectory = binding.packageDirectory ?? "";
    const packageDeclarations = context.go?.declarations.get(packageDirectory);
    const goTarget = packageDeclarations === undefined
      ? undefined
      : [...packageDeclarations.values()].find((value): value is string => value !== null) ??
        context.go?.packageFiles.get(packageDirectory)?.[0];
    const goDirectory = context.go === undefined
      ? undefined
      : goTargetDirectoryPath(context.go, packageDirectory, context.pathOps);
    return binding.targetFilePath ?? goTarget ?? goDirectory ?? "";
  };
  const activeBinding = (bindingName: string, scopeStart: number): ResolvedImportBinding | undefined =>
    bindings
      .filter((binding) =>
        binding.name === bindingName &&
        scopeStart >= (binding.scopeStartIndex ?? root.startIndex) &&
        scopeStart < (binding.scopeEndIndex ?? root.endIndex) &&
        importBindingAppliesAtIndex(language, binding, scopeStart)
      )
      .sort((left, right) =>
        (right.scopeStartIndex ?? root.startIndex) - (left.scopeStartIndex ?? root.startIndex) ||
        right.importNode.startIndex - left.importNode.startIndex
      )[0];
  const regions: ShadowRegion[] = [];
  const resolvedImportDeclarationStarts = new Set(bindings.flatMap((binding) => {
    if (binding.importNode.type === "mod_item") return [binding.importNode.startIndex];
    const declaration = nearestAncestor(binding.importNode, RUST_USE_DECLARATION_TYPES);
    return declaration === null ? [] : [declaration.startIndex];
  }));
  return {
    root,
    bindings,
    bindingNames,
    regions,
    resolvedImportDeclarationStarts,
    addAll: (identifiers, kind, start, end, namespaces = new Set(["value", "type"])): void => {
      for (const identifier of identifiers) {
        const binding = activeBinding(identifier.text, start);
        if (binding === undefined) continue;
        const target = targetForBinding(binding);
        const diagnostic = diagnosticFor(language, filePath, identifier.text, target, kind, identifier);
        const pythonClassScope = language === "python"
          ? pythonClassScopeForBindingIdentifier(identifier)
          : undefined;
        regions.push({
          binding: identifier.text,
          bindingImportStartIndex: binding.importNode.startIndex,
          startIndex: start,
          endIndex: end,
          diagnostic,
          namespaces,
          ...(pythonClassScope !== undefined ? { pythonClassScope } : {}),
        });
      }
    },
  };
}

function collectPythonShadowRegions(collector: ShadowCollector): void {
  const { root, bindings, bindingNames, addAll } = collector;
  const declaredOuterNames = new WeakMap<TSNode, ReadonlySet<string>>();
  const outerNamesForScope = (scope: TSNode): ReadonlySet<string> => {
    const existing = declaredOuterNames.get(scope);
    if (existing !== undefined) return existing;
    const names = new Set<string>();
    const visit = (node: TSNode): void => {
      if (node !== scope && PYTHON_LEXICAL_SCOPE_TYPES.has(node.type)) return;
      if (node.type === "global_statement" || node.type === "nonlocal_statement") {
        walk(node, (candidate) => {
          if (candidate.type === "identifier" && bindingNames.has(candidate.text)) names.add(candidate.text);
        });
        return;
      }
      for (const child of node.namedChildren) visit(child);
    };
    visit(scope);
    declaredOuterNames.set(scope, names);
    return names;
  };
  for (const binding of bindings) {
    const statement = nearestAncestor(binding.importNode, PYTHON_IMPORT_STATEMENT_TYPES);
    const scope = statement === null ? null : nearestAncestor(statement, PYTHON_LEXICAL_SCOPE_TYPES);
    if (statement === null || (scope?.type !== "function_definition" && scope?.type !== "lambda")) continue;
    const body = scope.childForFieldName("body") ?? scope;
    const alias = binding.importNode.type === "aliased_import"
      ? binding.importNode.childForFieldName("alias") ?? binding.importNode.namedChildren.at(-1)
      : binding.importNode.namedChildren.find((child) => child.type === "identifier" && child.text === binding.name);
    addAll(directMatchingIdentifier(alias, bindingNames), "import_declaration", body.startIndex, statement.endIndex);
  }
  walk(root, (node) => {
    if (node.type === "function_definition" || node.type === "lambda") {
      const parameters = node.childForFieldName("parameters");
      const body = node.childForFieldName("body") ?? node.namedChildren.at(-1);
      if (body !== undefined) addAll(matchingBindingIdentifiers("python", parameters, bindingNames), "parameter", body.startIndex, body.endIndex);
    }
    if (PYTHON_ASSIGNMENT_TYPES.has(node.type)) {
      const left = node.childForFieldName("left") ?? node.childForFieldName("target") ?? node.namedChildren[0];
      const identifiers = left?.type === "attribute" || left?.type === "subscript"
        ? []
        : matchingBindingIdentifiers("python", left, bindingNames);
      if (identifiers.length > 0) {
        const comprehension = nearestAncestor(node, PYTHON_COMPREHENSION_TYPES);
        const scope = nearestAncestor(node, PYTHON_LEXICAL_SCOPE_TYPES);
        const outerNames = scope === null ? new Set<string>() : outerNamesForScope(scope);
        const outerIdentifiers = identifiers.filter((identifier) => outerNames.has(identifier.text));
        const localIdentifiers = identifiers.filter((identifier) => !outerNames.has(identifier.text));
        const outermostForClause = comprehension?.namedChildren.find((child) => child.type === "for_in_clause");
        if (node.type === "named_expression") {
          const body = scope?.childForFieldName("body") ?? scope;
          const start = scope?.type === "function_definition" || scope?.type === "lambda"
            ? body?.startIndex ?? scope.startIndex
            : node.startIndex;
          addAll(localIdentifiers, scope === null ? "assignment" : "local_binding", start, body?.endIndex ?? root.endIndex);
          addAll(outerIdentifiers, "assignment", node.startIndex, body?.endIndex ?? root.endIndex);
        } else if (comprehension !== null && node.type === "for_in_clause" && node.startIndex === outermostForClause?.startIndex) {
          const element = comprehension.namedChildren[0];
          const iterable = node.childForFieldName("right") ?? node.namedChildren.at(-1);
          if (element !== undefined) {
            addAll(identifiers, "comprehension_binding", element.startIndex, element.endIndex);
          }
          addAll(identifiers, "comprehension_binding", iterable?.endIndex ?? node.endIndex, comprehension.endIndex);
        } else if (comprehension !== null) {
          addAll(identifiers, "comprehension_binding", comprehension.startIndex, comprehension.endIndex);
        }
        else if (scope !== null) {
          const body = scope.childForFieldName("body") ?? scope;
          const start = scope.type === "function_definition" || scope.type === "lambda" ? body.startIndex : node.startIndex;
          addAll(localIdentifiers, node.type === "for_statement" ? "loop_binding" : "local_binding", start, body.endIndex);
          addAll(outerIdentifiers, "assignment", node.startIndex, body.endIndex);
        } else {
          addAll(identifiers, node.type === "for_statement" ? "loop_binding" : "assignment", node.startIndex, root.endIndex);
        }
      }
    }
    if (node.type === "delete_statement") {
      const scope = nearestAncestor(node, PYTHON_LEXICAL_SCOPE_TYPES);
      if (scope?.type === "function_definition" || scope?.type === "lambda") {
        const body = scope.childForFieldName("body") ?? scope;
        addAll(pythonDeletionIdentifiers(node, bindingNames), "deletion", body.startIndex, body.endIndex);
      }
    }
    if (node.type === "function_definition" || node.type === "class_definition") {
      const identifiers = matchingBindingIdentifiers("python", node.childForFieldName("name"), bindingNames);
      if (identifiers.length > 0) {
        const scope = nearestAncestor(node, PYTHON_DECLARATION_SCOPE_TYPES);
        const body = scope?.childForFieldName("body");
        const start = scope?.type === "function_definition" ? body?.startIndex ?? scope.startIndex : node.startIndex;
        addAll(identifiers, node.type === "class_definition" ? "class_declaration" : "function_declaration", start, body?.endIndex ?? root.endIndex);
      }
    }
    if (node.type === "except_clause") {
      const asPattern = node.namedChildren.find((child) => child.type === "as_pattern");
      const target = asPattern?.namedChildren.find((child) => child.type === "as_pattern_target");
      const scope = nearestAncestor(node, PYTHON_LEXICAL_SCOPE_TYPES);
      const scopeBody = scope?.childForFieldName("body") ?? scope;
      const start = scope?.type === "function_definition" || scope?.type === "lambda"
        ? scopeBody?.startIndex ?? scope.startIndex
        : target?.startIndex ?? node.startIndex;
      addAll(
        matchingBindingIdentifiers("python", target, bindingNames),
        "except_binding",
        start,
        scopeBody?.endIndex ?? root.endIndex,
      );
    }
    if (node.type === "with_item") {
      const asPattern = node.namedChildren.find((child) => child.type === "as_pattern");
      const alias = asPattern?.childForFieldName("alias") ?? asPattern?.namedChildren.find((child) => child.type === "as_pattern_target");
      const identifiers = matchingBindingIdentifiers("python", alias, bindingNames);
      if (identifiers.length > 0) {
        const scope = nearestAncestor(node, PYTHON_LEXICAL_SCOPE_TYPES);
        const body = scope?.childForFieldName("body") ?? scope;
        const start = scope?.type === "function_definition" || scope?.type === "lambda" ? body?.startIndex ?? scope.startIndex : node.startIndex;
        addAll(identifiers, "with_binding", start, body?.endIndex ?? root.endIndex);
      }
    }
    if (node.type === "case_clause") {
      const pattern = node.childForFieldName("pattern") ?? node.namedChildren[0];
      const identifiers = matchingBindingIdentifiers("python", pattern, bindingNames);
      if (identifiers.length > 0) {
        const scope = nearestAncestor(node, PYTHON_LEXICAL_SCOPE_TYPES);
        const body = scope?.childForFieldName("body") ?? scope;
        const start = scope?.type === "function_definition" || scope?.type === "lambda" ? body?.startIndex ?? scope.startIndex : node.startIndex;
        addAll(identifiers, "pattern_binding", start, body?.endIndex ?? root.endIndex);
      }
    }
  });
}

function collectTypeScriptShadowRegions(
  language: "ts" | "tsx" | "js",
  collector: ShadowCollector,
): void {
  const { root, bindingNames, addAll } = collector;
  const valueNamespace = new Set<"value" | "type">(["value"]);
  const typeNamespace = new Set<"value" | "type">(["type"]);
  const bothNamespaces = new Set<"value" | "type">(["value", "type"]);
  walk(root, (node) => {
    const functionNode = nearestAncestor(node, TYPESCRIPT_FUNCTION_TYPES);
    const functionBody = functionNode?.childForFieldName("body") ?? functionNode?.namedChildren.at(-1);
    if (TYPESCRIPT_FUNCTION_TYPES.has(node.type)) {
      const body = node.childForFieldName("body") ?? node.namedChildren.at(-1);
      const parameters = node.childForFieldName("parameters") ?? node.childForFieldName("parameter");
      if (body !== undefined) {
        addAll(
          matchingBindingIdentifiers(language, parameters, bindingNames),
          "parameter",
          parameters?.startIndex ?? node.startIndex,
          body.endIndex,
          valueNamespace,
        );
      }
    }
    if (node.type === "function_expression" || node.type === "generator_function") {
      const name = node.childForFieldName("name") ?? node.namedChildren.find((child) => child.type === "identifier");
      const body = node.childForFieldName("body") ?? node.namedChildren.at(-1);
      if (body !== undefined) {
        addAll(
          matchingBindingIdentifiers(language, name, bindingNames),
          "function_declaration",
          body.startIndex,
          body.endIndex,
          valueNamespace,
        );
      }
    }
    if (node.type === "class") {
      const name = node.childForFieldName("name") ?? node.namedChildren.find((child) => child.type === "type_identifier");
      const body = node.childForFieldName("body") ?? node.namedChildren.find((child) => child.type === "class_body");
      if (body !== undefined) {
        addAll(
          matchingBindingIdentifiers(language, name, bindingNames),
          "type_declaration",
          body.startIndex,
          body.endIndex,
          bothNamespaces,
        );
      }
    }
    if (TYPESCRIPT_LOCAL_TYPES.has(node.type)) {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.childForFieldName("name") ?? node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const enclosingLoop = nearestAncestor(node, TYPESCRIPT_LOOP_TYPES);
      const loopBody = enclosingLoop?.childForFieldName("body");
      const loop = enclosingLoop !== null && (loopBody === null || loopBody === undefined || node.startIndex < loopBody.startIndex) ? enclosingLoop : null;
      let scope = loop ?? nearestAncestor(node, TYPESCRIPT_BLOCK_TYPES) ?? root;
      if (node.type === "variable_declarator") {
        const declaration = nearestAncestor(node, TYPESCRIPT_DECLARATION_TYPES);
        if (declaration?.type === "variable_declaration") scope = functionBody ?? root;
      }
      const declarationPoint = node.type === "assignment_expression" ? node.startIndex : scope.startIndex;
      addAll(identifiers, loop === null ? "local_binding" : "loop_binding", declarationPoint, scope.endIndex, valueNamespace);
    }
    if (node.type === "catch_clause") {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("parameter") ?? node.namedChildren[0], bindingNames);
      const body = node.childForFieldName("body") ?? node;
      addAll(identifiers, "catch_binding", body.startIndex, body.endIndex, valueNamespace);
    }
    if (TYPESCRIPT_SCOPED_LOOP_TYPES.has(node.type)) {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const body = node.childForFieldName("body") ?? node;
      addAll(identifiers, "loop_binding", body.startIndex, body.endIndex, valueNamespace);
    }
    if (node.type === "function_declaration" || node.type === "generator_function_declaration" ||
        node.type === "class_declaration" || node.type === "enum_declaration") {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("name"), bindingNames);
      const scope = nearestAncestor(node, TYPESCRIPT_BLOCK_TYPES) ?? root;
      const kind = node.type === "class_declaration" || node.type === "enum_declaration"
        ? "type_declaration"
        : "function_declaration";
      addAll(
        identifiers,
        kind,
        scope.startIndex,
        scope.endIndex,
        node.type === "class_declaration" || node.type === "enum_declaration" ? bothNamespaces : valueNamespace,
      );
    }
    if (node.type === "interface_declaration" || node.type === "type_alias_declaration") {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("name"), bindingNames);
      const scope = nearestAncestor(node, TYPESCRIPT_BLOCK_TYPES) ?? root;
      addAll(identifiers, "type_declaration", scope.startIndex, scope.endIndex, typeNamespace);
    }
  });
}

function collectRustShadowRegions(collector: ShadowCollector): void {
  const { root, bindings, bindingNames, resolvedImportDeclarationStarts, addAll } = collector;
  const typeNamespace = new Set<"value" | "type">(["type"]);
  walk(root, (node) => {
    if (node.type === "type_parameters") {
      const scope = nearestAncestor(node, RUST_DECLARATION_TYPES) ?? root;
      addAll(
        matchingRustTypeParameterIdentifiers(node, bindingNames),
        "type_declaration",
        scope.startIndex,
        scope.endIndex,
        typeNamespace,
      );
    }
    if (node.type === "use_declaration") {
      const scope = nearestAncestor(node, RUST_IMPORT_SCOPE_TYPES);
      if (scope !== null) {
        const argument = node.childForFieldName("argument") ?? node.namedChildren[0];
        const identifiers = matchingRustUseBindingIdentifiers(argument, bindingNames).filter((identifier) =>
          !bindings.some((binding) => {
            const declaration = nearestAncestor(binding.importNode, RUST_USE_DECLARATION_TYPES);
            return declaration?.startIndex === node.startIndex &&
              binding.name === identifier.text &&
              identifier.startIndex >= binding.importNode.startIndex &&
              identifier.endIndex <= binding.importNode.endIndex;
          })
        );
        addAll(identifiers, "import_declaration", scope.startIndex, scope.endIndex);
      }
    }
    if (RUST_TYPE_NAMESPACE_DECLARATION_TYPES.has(node.type)) {
      if (resolvedImportDeclarationStarts.has(node.startIndex)) return;
      const identifiers = matchingBindingIdentifiers("rust", node.childForFieldName("name"), bindingNames);
      const scope = nearestAncestor(node, RUST_IMPORT_SCOPE_TYPES) ?? root;
      const kind = node.type === "mod_item" ? "module_declaration" : "type_declaration";
      addAll(identifiers, kind, scope.startIndex, scope.endIndex, typeNamespace);
    }
  });
}

function collectGoShadowRegions(collector: ShadowCollector): void {
  const { root, bindingNames, addAll } = collector;
  walk(root, (node) => {
    const functionNode = nearestAncestor(node, GO_FUNCTION_TYPES);
    const functionBody = functionNode?.childForFieldName("body") ?? functionNode?.namedChildren.at(-1);
    if ((node.type === "parameter_declaration" || node.type === "variadic_parameter_declaration") && functionBody !== undefined) {
      addAll(matchingBindingIdentifiers("go", node, bindingNames), "parameter", functionBody.startIndex, functionBody.endIndex);
    }
    if (GO_LOCAL_TYPES.has(node.type)) {
      const identifiers = node.type === "var_spec" || node.type === "const_spec"
        ? matchingGoSpecIdentifiers(node, bindingNames)
        : matchingBindingIdentifiers("go", node.childForFieldName("pattern") ?? node.childForFieldName("name") ?? node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const enclosingLoop = nearestAncestor(node, GO_LOOP_TYPES);
      const loopBody = enclosingLoop?.childForFieldName("body");
      const loop = enclosingLoop !== null && (loopBody === null || loopBody === undefined || node.startIndex < loopBody.startIndex) ? enclosingLoop : null;
      const controlStatement = nearestAncestor(node, GO_CONTROL_TYPES);
      const initializer = controlStatement?.childForFieldName("initializer");
      const initializedControl = controlStatement !== null && initializer !== null && initializer !== undefined &&
          node.startIndex >= initializer.startIndex && node.endIndex <= initializer.endIndex
        ? controlStatement
        : null;
      const scope = loop ?? initializedControl ?? nearestAncestor(node, GO_LEXICAL_SCOPE_TYPES) ?? root;
      addAll(identifiers, loop === null ? (node.type === "assignment_statement" ? "assignment" : "local_binding") : "loop_binding", node.endIndex, scope.endIndex);
    }
    if (node.type === "range_clause") {
      const identifiers = matchingBindingIdentifiers("go", node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const loop = nearestAncestor(node, GO_LOOP_TYPES);
      const body = loop?.childForFieldName("body");
      if (loop !== null) addAll(identifiers, "range_binding", body?.startIndex ?? node.endIndex, loop.endIndex);
    }
    if (node.type === "receive_statement" && node.parent?.type === "communication_case") {
      const identifiers = matchingBindingIdentifiers("go", node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      addAll(identifiers, "pattern_binding", node.endIndex, node.parent.endIndex);
    }
    if (node.type === "type_switch_statement") {
      const alias = node.namedChildren.find((child) => child.type === "expression_list");
      const firstCase = node.namedChildren.find((child) => child.type === "type_case" || child.type === "default_case");
      if (firstCase !== undefined) {
        addAll(matchingBindingIdentifiers("go", alias, bindingNames), "pattern_binding", firstCase.startIndex, node.endIndex);
      }
    }
    if (GO_DECLARATION_TYPES.has(node.type)) {
      const identifiers = matchingBindingIdentifiers("go", node.childForFieldName("name"), bindingNames);
      const scope = nearestAncestor(node, GO_BLOCK_TYPES) ?? root;
      addAll(identifiers, node.type === "type_spec" ? "type_declaration" : "function_declaration", node.startIndex, scope.endIndex);
    }
  });
}

export function collectShadowRegions(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  bindings: readonly ResolvedImportBinding[],
  context: QualifiedReferenceContext,
): readonly ShadowRegion[] {
  const collector = createShadowCollector(language, filePath, root, bindings, context);
  if (language === "python") collectPythonShadowRegions(collector);
  else if (language === "rust") collectRustShadowRegions(collector);
  else if (language === "go") collectGoShadowRegions(collector);
  else collectTypeScriptShadowRegions(language, collector);

  const unique = new Map<string, ShadowRegion>();
  for (const region of collector.regions) {
    const key = [
      region.binding,
      region.diagnostic.range.startLine,
      region.diagnostic.range.startColumn,
      region.diagnostic.shadowKind,
      region.startIndex,
      region.endIndex,
    ].join(":");
    unique.set(key, region);
  }
  return [...unique.values()];
}
