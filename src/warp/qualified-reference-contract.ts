import type { PathOps } from "../ports/paths.js";
import type { ImportBindingDiagnostic } from "./import-diagnostic.js";

export type TSNode = import("web-tree-sitter").SyntaxNode;

export type QualifiedReferenceLanguage = "python" | "ts" | "tsx" | "js" | "rust" | "go";
export type QualifiedReferenceNamespace = "value" | "type";

export interface GoReferenceContext {
  readonly modulePath: string;
  readonly moduleDirectory: string;
  readonly packageNames: ReadonlyMap<string, string | null>;
  readonly packageFiles: ReadonlyMap<string, readonly string[]>;
  /** package directory -> exported name -> unique declaring file, or null when ambiguous */
  readonly declarations: ReadonlyMap<string, ReadonlyMap<string, string | null>>;
}

export interface QualifiedReferenceContext {
  readonly pathOps: PathOps;
  readonly knownFiles: ReadonlySet<string>;
  readonly go?: GoReferenceContext | undefined;
}

export interface ResolvedImportBinding {
  readonly name: string;
  readonly targetFilePath: string | null;
  readonly unresolvedTargetFilePaths?: readonly string[] | undefined;
  readonly qualifiedPath?: readonly string[] | undefined;
  readonly scopeStartIndex?: number | undefined;
  readonly scopeEndIndex?: number | undefined;
  readonly packageDirectory?: string | undefined;
  readonly importNode: TSNode;
}

export interface QualifiedReferenceAccess {
  readonly binding: string;
  readonly member: string;
  readonly targetFilePath: string;
  readonly node: TSNode;
  readonly shadow: ImportBindingDiagnostic | null;
}

export interface UnresolvedQualifiedReferenceAccess {
  readonly binding: string;
  readonly member: string;
  readonly targetDirectoryPath?: string | undefined;
  readonly targetFilePath?: string | undefined;
  readonly node: TSNode;
  readonly shadow: ImportBindingDiagnostic | null;
}

export interface QualifiedReferenceAnalysis {
  readonly bindings: readonly ResolvedImportBinding[];
  readonly accesses: readonly QualifiedReferenceAccess[];
  readonly unresolvedAccesses: readonly UnresolvedQualifiedReferenceAccess[];
  readonly diagnostics: readonly ImportBindingDiagnostic[];
}

export interface DirectSymbolImportReference {
  readonly importedName: string;
  readonly targetFilePath: string;
}

export interface ShadowRegion {
  readonly binding: string;
  readonly bindingImportStartIndex: number;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly diagnostic: ImportBindingDiagnostic;
  readonly pythonClassScope?: TSNode | undefined;
  readonly namespaces: ReadonlySet<QualifiedReferenceNamespace>;
}

export interface QualifiedAccessParts {
  readonly binding: TSNode;
  readonly qualifier: readonly string[];
  readonly member: TSNode;
  readonly namespace: QualifiedReferenceNamespace;
}

export interface QualifiedReferenceLanguageAdapter {
  readonly languages: readonly QualifiedReferenceLanguage[];
  resolveBindings(
    filePath: string,
    root: TSNode,
    context: QualifiedReferenceContext,
  ): readonly ResolvedImportBinding[];
  collectShadows(
    filePath: string,
    root: TSNode,
    bindings: readonly ResolvedImportBinding[],
    context: QualifiedReferenceContext,
  ): readonly ShadowRegion[];
  accessParts(node: TSNode): QualifiedAccessParts | null;
  isUnsupportedWrite(node: TSNode): boolean;
}
