export interface ImportBindingDiagnostic {
  readonly code: "import_binding_shadowed";
  readonly severity: "warning";
  readonly language: "python" | "typescript" | "javascript" | "rust" | "go";
  readonly filePath: string;
  readonly range: {
    readonly startLine: number;
    readonly startColumn: number;
    readonly endLine: number;
    readonly endColumn: number;
  };
  readonly binding: string;
  readonly targetFilePath: string;
  readonly shadowKind: string;
  readonly message: string;
}
