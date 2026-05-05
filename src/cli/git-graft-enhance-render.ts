import type { GitGraftEnhanceModel } from "./git-graft-enhance-model.js";

export function renderGitGraftEnhance(model: GitGraftEnhanceModel): string {
  const lines = [
    "Git Graft Enhance",
    `range: ${model.range.since}..${model.range.head}`,
    "",
    "Structural",
    `files: ${String(model.structural.changedFiles)}`,
    `symbols: +${String(model.structural.addedSymbols)} -${String(model.structural.removedSymbols)} ~${String(model.structural.changedSymbols)}`,
    "",
    "Exports",
    `exports: ${model.exports.changed ? "changed" : "unchanged"}`,
    `semver impact: ${model.exports.semverImpact}`,
    `export symbols: +${String(model.exports.addedExports)} -${String(model.exports.removedExports)} ~${String(model.exports.changedExports)}`,
  ];

  if (model.structural.topFilesByChangeCount.length > 0) {
    lines.push("", "Top files");
    for (const file of model.structural.topFilesByChangeCount) {
      lines.push(`- ${file.path} (${file.status}, ${String(file.changeCount)}): ${file.summary}`);
    }
  }

  if (model.provenanceHints.length > 0) {
    lines.push("", "Provenance hints");
    for (const hint of model.provenanceHints) {
      const ambiguity = hint.ambiguous ? ", ambiguous symbol name" : "";
      if (hint.status === "available") {
        lines.push(
          `- ${hint.filePath}: ${hint.symbol} ${hint.changeKind} `
          + `(created: ${hint.createdInCommit ?? "unknown"}, last signature: ${hint.lastSignatureChange ?? "none"}, refs: ${String(hint.referenceCount ?? 0)}${ambiguity})`,
        );
      } else {
        lines.push(`- ${hint.filePath}: ${hint.symbol} ${hint.changeKind} unavailable (${hint.reason ?? "unknown"}${ambiguity})`);
      }
    }
  }

  if (model.warnings.length > 0) {
    lines.push("", "warnings:");
    for (const warning of model.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join("\n");
}
