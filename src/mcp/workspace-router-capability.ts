// ---------------------------------------------------------------------------
// workspace-router-capability — capability profile resolution for binding
//
// Determines which capability profile applies when a workspace is bound,
// whether in repo_local mode (always the local profile) or daemon mode
// (delegated to the authorization policy).
// ---------------------------------------------------------------------------
import {
  DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE,
  type ResolvedWorkspace,
  type WorkspaceAuthorizationPolicy,
  type WorkspaceCapabilityProfile,
  type WorkspaceMode,
} from "./workspace-router-model.js";

/**
 * Resolve the capability profile for a workspace binding attempt.
 *
 * In `repo_local` mode the default local profile is always returned.
 * In `daemon` mode the authorization policy is consulted; `null` means
 * the workspace is not authorized.
 */
export async function resolveCapabilityProfile(input: {
  readonly mode: WorkspaceMode;
  readonly resolved: ResolvedWorkspace;
  readonly authorizationPolicy?: WorkspaceAuthorizationPolicy | undefined;
}): Promise<WorkspaceCapabilityProfile | null> {
  if (input.mode === "repo_local") {
    return DEFAULT_REPO_LOCAL_CAPABILITY_PROFILE;
  }
  return (await input.authorizationPolicy?.getCapabilityProfile(input.resolved)) ?? null;
}
