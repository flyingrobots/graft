import * as fs from "node:fs";
import * as path from "node:path";
import { InitAction } from "./init-model.js";

export {
  ensureCodexStartupTimeout,
  mergeClaudeHooksConfig,
  mergeClaudeMcpConfig,
  mergeClineMcpConfig,
  mergeCodexMcpConfig,
  mergeContinueMcpConfig,
  mergeCursorMcpConfig,
  mergeWindsurfMcpConfig,
} from "./init-client-config.js";
export { ensureTargetGitHooks } from "./init-target-hooks.js";

export function writeIfMissing(
  filePath: string,
  content: string,
  label: string,
): InitAction {
  if (fs.existsSync(filePath)) {
    return InitAction.exists(label);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return InitAction.create(label);
}

export function appendIfMissing(
  filePath: string,
  marker: string,
  content: string,
  label: string,
): InitAction {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf-8");
    if (existing.includes(marker)) {
      return InitAction.exists(label, "already has graft entry");
    }
    fs.appendFileSync(filePath, content);
    return InitAction.append(label);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.trimStart());
  return InitAction.create(label);
}
