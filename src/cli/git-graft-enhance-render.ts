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

  if (model.warnings.length > 0) {
    lines.push("", "warnings:");
    for (const warning of model.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join("\n");
}
