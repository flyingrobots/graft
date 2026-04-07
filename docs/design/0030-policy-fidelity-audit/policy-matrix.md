# Policy Matrix

This matrix records the current truth on `main` after the 0024-0028
stack landed.

Legend:

- `Enforced` — policy is applied and the relevant inputs are present
- `Partial` — policy exists but options or refusal shape drift
- `Missing` — surface reads project content without policy evaluation
- `N/A` — not a project-content read surface
- `Undecided` — intentional-exception vs policy-gap contract is not yet
  written down

## Read surfaces

| Surface | Entry point | Policy location | `.graftignore` | Session depth | Budget | Refusal shape | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Read` PreToolUse hook | Claude hook | `handleReadHook()` inline | Yes | No | No | exit code `2` + stderr text | Partial | Hard-blocks `RefusedResult` only; outline/content governance is delegated to the post-hook. |
| `Read` PostToolUse hook | Claude hook | `handlePostReadHook()` inline | Yes | No | No | no refusal; advisory only | Partial | Educational by design; not equivalent to MCP bounded-read behavior. |
| `safe_read` | MCP | `safeRead()` plus cache re-checks in `safe-read.ts` | No | Yes | Yes | `projection: "refused"` | Partial | Strongest MCP surface, but still lacks `.graftignore` parity with hooks. |
| `file_outline` | MCP | none | No | No | No | no refusal path | Missing | Reads file content directly and returns outline/unsupported without policy evaluation. |
| `read_range` | MCP | server middleware (`policyCheck: true`) | No | Yes | Yes | `projection: "refused"` | Partial | Middleware checks only when `path` exists, which is fine here, but `.graftignore` is still absent. |
| `changed_since` | MCP | inline in `changed-since.ts` | No | Yes | No | `status: "refused"` | Partial | Manual path; budget and `.graftignore` do not flow through. |
| `graft_map` | MCP | none | No | No | No | no refusal path | Missing | Reads tracked files and parses them without policy evaluation. |
| `graft_diff` | MCP | none | No | No | No | no refusal path | Missing | Reads git/object content structurally with no policy filter. |
| `graft_since` | MCP | none | No | No | No | no refusal path | Missing | Thin wrapper over `graftDiff`; same policy gap. |
| `code_show` | MCP | `evaluatePrecisionPolicy()` after content load | No | Yes | Yes | `projection: "refused"` | Partial | Historical and live symbol reads are filtered, but `.graftignore` still does not apply. |
| `code_find` | MCP | middleware on explicit `path` plus `evaluatePrecisionPolicy()` per match | No | Yes | Yes | explicit refusal only on middleware path; per-match refusals are silently skipped | Partial | This is the sharpest current behavior drift. |
| `run_capture` | MCP | none | No | No | No | shell error only | Undecided | Can shell out and read anything. Needs an explicit exception or a governed replacement. |

## Non-read or session-only surfaces

| Surface | Entry point | Current policy posture | Status | Notes |
| --- | --- | --- | --- | --- |
| `doctor` | MCP | no project-content read | N/A | Reports health and repo-state metadata. |
| `stats` | MCP | no project-content read | N/A | Reports counters only. |
| `explain` | MCP | no project-content read | N/A | Static reason-code dictionary. |
| `set_budget` | MCP | no project-content read | N/A | Session control, not retrieval. |
| `state_save` | MCP | no project-content read | N/A | Writes state only. |
| `state_load` | MCP | reads `.graft/state.md`, not repo content | N/A | Session persistence, not bounded repo inspection. |
| `graft init` | CLI | scaffolding only | N/A | Writes `.graftignore`, `.gitignore`, `CLAUDE.md`; not a repo-read surface. |
| `graft index` | CLI | internal repo-history ingestion | Undecided | Reads git history for WARP indexing, but is not yet a user retrieval surface. |

## Main conclusions

1. The missing `.graftignore` flow is the highest-value fidelity gap.
2. Structural MCP tools are currently the largest ungoverned read
   surfaces.
3. `code_find` needs an explicit refusal contract instead of silent
   omission.
4. `run_capture` requires a policy-boundary decision, not just more
   implementation.
