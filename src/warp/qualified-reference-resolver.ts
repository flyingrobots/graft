// ---------------------------------------------------------------------------
// Qualified reference resolver — shared language-adapter contract
// ---------------------------------------------------------------------------

import type { PatchBuilderV2 } from "@git-stunts/git-warp";
import type { SupportedLang } from "../parser/lang.js";
import { emitAstAnchor } from "./ast-emitter.js";
import type { ImportBindingDiagnostic } from "./import-diagnostic.js";
import {
  goTargetDirectoryPath,
  resolveRustQualifiedModule,
} from "./qualified-reference-bindings.js";
import type {
  QualifiedReferenceAccess,
  QualifiedReferenceAnalysis,
  QualifiedReferenceContext,
  QualifiedReferenceLanguage,
  TSNode,
  UnresolvedQualifiedReferenceAccess,
} from "./qualified-reference-contract.js";
import { qualifiedReferenceAdapterFor } from "./qualified-reference-language-adapters.js";
import {
  importBindingAppliesAtIndex,
  pythonClassNamespaceAppliesAtIndex,
} from "./qualified-reference-shadows.js";
import { SymIdCodec } from "./sym-id-codec.js";

export type {
  DirectSymbolImportReference,
  GoReferenceContext,
  QualifiedReferenceAccess,
  QualifiedReferenceAnalysis,
  QualifiedReferenceContext,
  QualifiedReferenceLanguage,
  ResolvedImportBinding,
  UnresolvedQualifiedReferenceAccess,
} from "./qualified-reference-contract.js";
export {
  analyzeDirectSymbolImportReferences,
  resolveQualifiedImportBindings,
} from "./qualified-reference-bindings.js";

function walk(node: TSNode, visit: (candidate: TSNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function rustQualifiedTargetFilePath(
  targetFilePath: string | null,
  qualifier: readonly string[],
  context: QualifiedReferenceContext,
): string | null {
  if (targetFilePath === null || qualifier.length === 0) return targetFilePath;
  const directory = targetFilePath.includes("/")
    ? targetFilePath.slice(0, targetFilePath.lastIndexOf("/"))
    : "";
  const fileName = targetFilePath.slice(directory === "" ? 0 : directory.length + 1);
  const logicalRoot = fileName === "lib.rs" || fileName === "main.rs" || fileName === "mod.rs"
    ? directory
    : context.pathOps.join(directory, fileName.replace(/\.rs$/u, ""));
  const modulePath = context.pathOps.join(logicalRoot, ...qualifier);
  const candidates = [`${modulePath}.rs`, context.pathOps.join(modulePath, "mod.rs")];
  return candidates.find((candidate) => context.knownFiles.has(candidate)) ?? null;
}

export function analyzeQualifiedReferences(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  context: QualifiedReferenceContext,
): QualifiedReferenceAnalysis {
  const adapter = qualifiedReferenceAdapterFor(language);
  const discoveredBindings = adapter.resolveBindings(filePath, root, context);
  const bindings = discoveredBindings.filter((binding) =>
    binding.targetFilePath !== null || context.go?.declarations.has(binding.packageDirectory ?? "") === true,
  );
  const shadows = adapter.collectShadows(filePath, root, bindings, context);
  const accesses: QualifiedReferenceAccess[] = [];
  const unresolvedAccesses: UnresolvedQualifiedReferenceAccess[] = [];
  const unresolvedGoPackageDirectories = language === "go" && context.go !== undefined
    ? [...context.go.packageNames.entries()]
      .filter(([directory, packageName]) =>
        packageName === null &&
        !discoveredBindings.some((binding) => binding.packageDirectory === directory)
      )
      .map(([directory]) => directory)
    : [];
  const unresolvedGoAccessKeys = new Set<string>();
  walk(root, (node) => {
    const parts = adapter.accessParts(node);
    if (parts === null) return;
    const bindingCandidates = language === "rust" ? bindings : discoveredBindings;
    const binding = bindingCandidates
      .filter((candidate) =>
        candidate.name === parts.binding.text &&
        (language === "rust" || (
          (candidate.qualifiedPath ?? []).length === parts.qualifier.length &&
          (candidate.qualifiedPath ?? []).every((segment, index) => segment === parts.qualifier[index])
        )) &&
        node.startIndex >= (candidate.scopeStartIndex ?? root.startIndex) &&
        node.startIndex < (candidate.scopeEndIndex ?? root.endIndex) &&
        importBindingAppliesAtIndex(language, candidate, node.startIndex)
      )
      .sort((left, right) =>
        (right.scopeStartIndex ?? root.startIndex) - (left.scopeStartIndex ?? root.startIndex) ||
        right.importNode.startIndex - left.importNode.startIndex
      )[0];
    if (binding === undefined) {
      if (language === "rust") {
        if (["crate", "self", "super"].includes(parts.binding.type)) {
          const resolution = resolveRustQualifiedModule(
            [parts.binding.text, ...parts.qualifier].join("::"),
            filePath,
            context,
            node,
          );
          if (resolution.targetFilePath !== null) {
            accesses.push({
              binding: parts.binding.text,
              member: parts.member.text,
              targetFilePath: resolution.targetFilePath,
              node,
              shadow: null,
            });
          } else {
            for (const targetFilePath of resolution.unresolvedTargetFilePaths) {
              unresolvedAccesses.push({
                binding: parts.binding.text,
                member: parts.member.text,
                targetFilePath,
                node,
                shadow: null,
              });
            }
          }
          return;
        }
        const unresolvedBinding = discoveredBindings
          .filter((candidate) =>
            candidate.name === parts.binding.text &&
            candidate.unresolvedTargetFilePaths !== undefined &&
            candidate.unresolvedTargetFilePaths.length > 0 &&
            node.startIndex >= (candidate.scopeStartIndex ?? root.startIndex) &&
            node.startIndex < (candidate.scopeEndIndex ?? root.endIndex)
          )
          .sort((left, right) =>
            (right.scopeStartIndex ?? root.startIndex) - (left.scopeStartIndex ?? root.startIndex) ||
            right.importNode.startIndex - left.importNode.startIndex
          )[0];
        if (unresolvedBinding?.unresolvedTargetFilePaths !== undefined) {
          for (const targetFilePath of unresolvedBinding.unresolvedTargetFilePaths) {
            unresolvedAccesses.push({
              binding: unresolvedBinding.name,
              member: parts.member.text,
              targetFilePath,
              node,
              shadow: null,
            });
          }
        }
      }
      if (language === "go" && context.go !== undefined) {
        for (const packageDirectory of unresolvedGoPackageDirectories) {
          const key = [packageDirectory, parts.binding.text, parts.member.text].join("\0");
          if (unresolvedGoAccessKeys.has(key)) continue;
          unresolvedGoAccessKeys.add(key);
          unresolvedAccesses.push({
            binding: parts.binding.text,
            member: parts.member.text,
            targetDirectoryPath: goTargetDirectoryPath(context.go, packageDirectory, context.pathOps),
            node,
            shadow: null,
          });
        }
      }
      return;
    }
    const shadowRegion = shadows.find((region) =>
      region.binding === binding.name &&
      region.bindingImportStartIndex === binding.importNode.startIndex &&
      node.startIndex >= region.startIndex &&
      node.startIndex < region.endIndex &&
      region.namespaces.has(parts.namespace) &&
      (region.pythonClassScope === undefined || pythonClassNamespaceAppliesAtIndex(region.pythonClassScope, node.startIndex)),
    );
    const target = language === "go"
      ? context.go?.declarations.get(binding.packageDirectory ?? "")?.get(parts.member.text)
      : language === "rust"
        ? rustQualifiedTargetFilePath(binding.targetFilePath, parts.qualifier, context)
        : binding.targetFilePath;
    if (target === null || target === undefined) {
      if (language === "go" && context.go !== undefined) {
        const packageDirectory = binding.packageDirectory ?? "";
        unresolvedAccesses.push({
          binding: binding.name,
          member: parts.member.text,
          targetDirectoryPath: goTargetDirectoryPath(context.go, packageDirectory, context.pathOps),
          node,
          shadow: shadowRegion?.diagnostic ?? null,
        });
      }
      if (language === "rust" && binding.targetFilePath !== null) {
        unresolvedAccesses.push({
          binding: binding.name,
          member: parts.member.text,
          targetFilePath: binding.targetFilePath,
          node,
          shadow: shadowRegion?.diagnostic ?? null,
        });
      }
      return;
    }
    if (adapter.isUnsupportedWrite(node)) {
      unresolvedAccesses.push({
        binding: binding.name,
        member: parts.member.text,
        targetFilePath: target,
        node,
        shadow: null,
      });
      return;
    }
    const shadow = shadowRegion === undefined
      ? null
      : { ...shadowRegion.diagnostic, targetFilePath: target };
    accesses.push({ binding: binding.name, member: parts.member.text, targetFilePath: target, node, shadow });
  });
  const keyForDiagnostic = (diagnostic: ImportBindingDiagnostic): string => [
    diagnostic.binding,
    diagnostic.range.startLine,
    diagnostic.range.startColumn,
    diagnostic.shadowKind,
  ].join(":");
  const diagnosticsByRegion = new Map(
    shadows.map((region) => [keyForDiagnostic(region.diagnostic), region.diagnostic] as const),
  );
  if (language === "go") {
    for (const access of accesses) {
      if (access.shadow !== null) diagnosticsByRegion.set(keyForDiagnostic(access.shadow), access.shadow);
    }
  }
  const diagnostics = [...diagnosticsByRegion.values()];
  return { bindings, accesses, unresolvedAccesses, diagnostics };
}

/** Emit import-level file edges and precision-preserving qualified symbol edges. */
export function resolveQualifiedReferenceEdges(
  patch: PatchBuilderV2,
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  context: QualifiedReferenceContext,
  emitImportFileEdges: boolean,
): QualifiedReferenceAnalysis {
  const analysis = analyzeQualifiedReferences(language, filePath, root, context);
  if (emitImportFileEdges) {
    const importTargets = language === "go"
      ? analysis.bindings.flatMap((binding) =>
        (context.go?.packageFiles.get(binding.packageDirectory ?? "") ?? []).map((target) => ({ binding, target })),
      )
      : analysis.bindings.map((binding) => ({ binding, target: binding.targetFilePath }));
    const emitted = new Set<string>();
    for (const item of importTargets) {
      const binding = item.binding;
      const target = item.target;
      if (target === null) continue;
      const key = `${binding.name}:${target}`;
      if (emitted.has(key)) continue;
      emitted.add(key);
      const anchor = emitAstAnchor(patch, filePath, binding.importNode);
      patch.setProperty(anchor, "importedName", "*");
      patch.setProperty(anchor, "localName", binding.name);
      patch.setProperty(anchor, "filePath", filePath);
      patch.addEdge(anchor, `file:${target}`, "references");
    }
  }
  for (const access of analysis.accesses) {
    if (access.shadow !== null) continue;
    const anchor = emitAstAnchor(patch, filePath, access.node);
    patch.setProperty(anchor, "importedName", access.member);
    patch.setProperty(anchor, "localName", access.member);
    patch.setProperty(anchor, "filePath", filePath);
    patch.addEdge(anchor, SymIdCodec.encode(access.targetFilePath, access.member), "references");
  }
  return analysis;
}

export function isQualifiedReferenceLanguage(language: SupportedLang): language is QualifiedReferenceLanguage {
  return language === "python" || language === "ts" || language === "tsx" || language === "js" || language === "rust" || language === "go";
}
