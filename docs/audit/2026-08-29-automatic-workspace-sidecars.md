# Automatic Workspace Sidecars Documentation Audit

Date: 2026-08-29

## Scope

This audit reconciles the first-call workspace-opening and isolated-sidecar
implementation with current user guides, architectural references, invariants,
public API policy, release documentation, and design-history records.

The audit used the live call graph and branch diff as authority. Historical
design packets were not rewritten to pretend they originally made today's
decisions; they received dated supersession notices instead.

## Inaccuracies Discovered

| Severity | Location | Inaccurate or incomplete claim | Resolution |
| :--- | :--- | :--- | :--- |
| High | `docs/MCP.md` | Daemon repository tools always fail until an explicit authorize-and-bind prelude. | Documented first-call opening from explicit routed `cwd`, unchanged active binding, and the remaining unbound-call rule. |
| High | `docs/TECHNICAL_TEARDOWN.md` | Multi-repo flow required explicit authorization/binding and loaded WARP from source `.git`. | Replaced both route-authority diagrams and described private repository/worktree/actor sidecars. |
| High | `docs/strategy/security-model.md` | Every repository access required explicit control-plane authorization and binding. | Defined explicit routed `cwd` as bounded same-user opening intent and retained explicit binding for calls without a route. |
| High | `docs/invariants/indexing-no-worktree-touch.md` | WARP objects under the source `.git` were an approved indexing mutation. | Strengthened the invariant: source worktree, refs, objects, config, and hooks must remain unchanged; only the private sidecar may change. |
| Medium | `docs/invariants/single-writer-honest.md` | Every Level 1 write used the global writer ID `graft`. | Reframed the invariant as one logical writer per actor sidecar with no cross-actor merge claim. |
| Medium | `README.md` and `docs/TECHNICAL_TEARDOWN.md` | The CLI was entirely stateless. | Distinguished process-local print-and-exit behavior from the stable private CLI WARP lane. |
| Medium | `docs/CLI.md` | `local-history-dag` read a repo-local WARP graph. | Documented the stable CLI actor sidecar and source-repository non-mutation. |
| Medium | `README.md` and `docs/CLI.md` | The stable CLI sidecar description omitted that separate same-worktree CLI processes intentionally share one operator lane. | Documented the shared CLI lane and directed parallel agents to independent MCP sessions. |
| Medium | `docs/design/WARP_automatic-isolated-workspace-sidecars.md` | The CLI identity decision mentioned an explicit caller namespace that no CLI surface accepts. | Removed the nonexistent override and recorded the actual stable CLI identity boundary. |
| Medium | `docs/public-api.md` | The advanced host surface omitted the new public `graphRoot` option. | Documented its default, storage boundary, and additive v0.13.0 classification. |
| High | `docs/public-api.md` and sidecar guides | The custom-root description did not state that blank, symlink-aliased, or source-overlapping roots must be rejected before storage mutation. | Documented and enforced the fail-closed root boundary for worktrees and common Git directories. |
| High | Docker isolation documentation | It described a networkless test container but did not account for network access in build steps after project source was copied. | Disabled the network for the remote-scrub and TypeScript-build layers and documented the post-copy boundary. |
| Medium | Five earlier design packets | Historical shared-ref, source-`.git`, prior-authorization, and host-test fallback assumptions looked current. | Added or expanded dated notices pointing to the superseding sidecar design while preserving the original records. |
| Low | `docs/SETUP.md` | Duplicate tool rows appeared outside the Markdown table, with receipt prose splitting the table. | Consolidated the table, restored `set_budget`, and kept one receipt/schema explanation. |
| Low | `src/warp/open.ts` | The adapter comment said every graph was backed by the source repository's `.git`. | Clarified that the composition root supplies persistence and production callers supply a bare sidecar. |
| Low | `README.md` documentation map | The setup guide was described only as workspace-binding documentation. | Updated the map to include first-call opening and control-plane posture. |
| Low | `docs/CLI.md` and `docs/MCP.md` | Related-doc links looked for `ADVANCED_GUIDE.md` inside `docs/`, where it does not exist. | Corrected both links to the repository-root guide and verified all relative links in the audited set. |
| Low | Audited living documentation | Dockerized Markdown lint found 56 structural violations after excluding the repository's established long-line and release-heading conventions. | Repaired missing blank lines, unlabeled fences, emphasis headings, and ordered-list prefixes; the same lint profile now reports zero errors. |

## Confirmed Current Truth

- A non-empty explicit `cwd` on a routed daemon repository tool is resolved by
  Git and opens only the exact containing worktree with default capabilities.
- Automatic opening records the session-opened worktree but does not change the
  active binding.
- `workspace_open` remains the activation and capability-configuration surface;
  lower-level authorize-and-bind tools remain available.
- Production WARP persistence is a private bare sidecar under
  `~/.graft/graphs`, keyed by canonical repository, worktree, and actor identity.
- One-shot CLI processes in one worktree share a stable CLI actor lane;
  independent MCP sessions provide parallel-agent isolation.
- Custom graph roots fail closed before storage mutation if they are blank,
  symlink-aliased, or overlap a source worktree or common Git directory.
- Existing source `refs/warp/*` are neither read as migration input nor deleted.
- All supported Vitest execution uses the pinned copy-in Docker path, which
  scrubs copied Git remotes, disables network access after project-source copy,
  and runs test containers without host mounts, network, Linux capabilities,
  or privilege escalation.

## Deliberate Limits

- Sidecar isolation does not prove actor ownership of overlapping live files.
- Sidecars are not merged across actors or worktrees.
- Separate same-worktree CLI processes intentionally share the stable CLI lane.
- Retention and pruning remain tracked debt.
- Historical records retain their original claims beneath explicit
  supersession notices.
