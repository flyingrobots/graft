# Default governed read path

Source backlog item: `docs/method/backlog/up-next/SURFACE_default-governed-read-path.md`
Legend: SURFACE

## Sponsors

- Human: repo operator
- Agent: Codex

## Hill

When Claude hooks are installed, the normal path for large code reads
should route through graft's bounded-read contract before native `Read`
dumps the whole file into context. The first honest version is a hook
guardrail for large JS/TS reads plus docs that make the client boundary
explicit, not a fake claim that every client is now governed by default.

## Playback Questions

### Human

1. If I install the documented Claude hooks, do large JS/TS native
   `Read` calls get redirected to `safe_read` instead of silently
   bypassing the governor?
2. Do the docs now say clearly what "default governed" means today:
   Claude hook guardrails now, broader client/runtime integration later?

### Agent

1. Do the hooks share a smaller read-inspection seam instead of each
   mixing file IO, policy evaluation, and message shaping inline?
2. Is the redirect behavior explicit and bounded to cases where graft
   already has a structured alternative, rather than pretending to solve
   default-governed reads across every client?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: hook refusals should say
  exactly why the native read was blocked and which graft tool to call
  next
- Non-visual or alternate-reading expectations: keep the hook messages
  plain text, short, and deterministic so terminal and screen-reader
  users get the same instruction path

## Localization and Directionality

- Locale / wording / formatting assumptions: no locale-sensitive
  formatting; paths and tool names remain code-oriented English
- Logical direction / layout assumptions: left-to-right code and path
  formatting only

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: when native `Read`
  is allowed through versus redirected, and which graft follow-up tools
  apply next
- What must be attributable, evidenced, or governed: whether the block
  came from a hard refusal or from the governed-read redirect for a
  large code file

## Non-goals

- [ ] solving default-governed reads for Codex, Cursor, Continue, and
  other non-Claude clients in this cycle
- [ ] changing bounded-read semantics for unsupported file types
- [ ] claiming native reads can never bypass graft in every runtime

## Backlog Context

Recurring dogfood feedback from 2026-04-05 and 2026-04-07 is that
agents still forget to use Graft unless explicitly reminded. The tools
work when chosen, but the product still depends on conscious opt-in.

Hill:
- the normal file-read path should become Graft-governed by default, or
  close enough that using native read surfaces no longer defeats the
  product

Questions:
- should this happen via stronger client integration, better hooks, or
  both?
- what is the minimum integration path that changes behavior without
  making setup or failure modes unacceptable?
- how do we keep the system honest when native reads still exist outside
  Graft control?
- what is the product contract for "default" across Claude, Codex,
  Cursor, Continue, and other clients?

Deliverables:
- explicit adoption model for making Graft the default read path
- split between hook-based guardrails and true client/runtime
  integration
- follow-on backlog for the actual client-specific work

Why separate cycle:
- this is a product-adoption problem, not just a doc tweak
- the core feedback is not "the tools are bad" but "the tools are too
  easy to forget"

Related:
- `docs/method/backlog/up-next/SURFACE_system-wide-mcp-daemon-and-workspace-binding.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-multi-repo-agent-coordination.md`

Effort: L

## Scope

- introduce a shared hook read-inspection seam for file IO, path
  scoping, `.graftignore` loading, and policy evaluation
- make Claude `PreToolUse` block large JS/TS native reads with a
  deterministic redirect to `safe_read`
- keep `PostToolUse` as a backstop message for oversized code reads that
  still happen, while reusing the same inspection seam
- update README, GUIDE, and changelog language to describe the new
  boundary honestly
- capture the remaining non-Claude adoption work back into backlog

Attached debt in this cycle:

- `docs/method/backlog/bad-code/CLEAN_CODE_hook-pretooluse-read.md`
- `docs/method/backlog/bad-code/CLEAN_CODE_hook-posttooluse-read.md`

## Success Criteria

- large JS/TS reads are blocked by `PreToolUse` with actionable graft
  next steps
- banned-file refusals still work as before
- unsupported and out-of-scope files still pass through honestly
- hook behavior is covered by unit tests and cross-surface parity tests
- the remaining non-Claude default-read gap is explicit in backlog, not
  buried in narrative docs
