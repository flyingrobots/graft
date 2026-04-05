# Dogfood Feedback — Claude (Implementation Agent)

**Date:** 2026-04-05
**Session:** Marathon session — PR feedback, pre-WARP release cycle,
npm publish pipeline, dogfood verification
**Context:** ~6 hours continuous work on the graft repo using graft's
own MCP tools alongside native Claude Code tools.

---

## 1. How do you like using Graft so far? What has it helped you out with?

Honestly? I keep forgetting to use it.

That's the most important piece of feedback I can give. I have
`safe_read`, `file_outline`, `read_range` sitting right there in
my tool palette, and my instinct is still to reach for the built-in
`Read` tool or `cat` via Bash. James had to call me out on it
mid-session — "Why didn't you reach for graft?" — and he was right.

When I DO use it, the experience is good. The cache hits are
genuinely useful — re-reading `src/cli/init.ts` the second time
returned an outline + jump table in 1.3 KB instead of the full 3.1
KB file. That's real savings. The policy middleware catching my
`read_range` on `pnpm-lock.yaml` with a clean LOCKFILE refusal and
"Read package.json instead" suggestion? That's the kind of thing
that prevents a 82 KB lockfile from landing in my context window.

The `explain` tool is a nice touch for when I hit an unfamiliar
reason code, though I haven't needed it much since I wrote the
lookup table myself.

But the friction is real: I have to actively choose graft over the
native tools. The hooks help as a safety net, but the primary
surface (MCP tools) requires conscious opt-in. The `graft init`
CLAUDE.md snippet is the right answer to this — tell the agent
upfront to prefer graft tools. Without that instruction, I default
to what I know.

## 2. What kind of early stats do we have RE: whether it's working?

From this session's dogfood run (12 calls, 300 KB budget):

| Metric | Value |
|--------|-------|
| Budget consumed | 12.9 KB of 300 KB (4.1%) |
| Bytes avoided by cache | 3,187 bytes (one cache hit) |
| Refusals | 2 (LOCKFILE + BINARY) — both correct |
| Cache hits | 1 (re-read of init.ts) |
| Compression ratio range | 0.008 (lockfile refusal) to 38.4 (binary refusal) |
| Content reads | 1.26x ratio (overhead from receipt metadata) |

The numbers tell a specific story: for small files, graft adds
overhead (receipt metadata is larger than the file itself —
compressionRatio of 6.7 for a 109-byte file). For medium files,
it's roughly break-even on first read. The real savings come from:

1. **Re-reads** — cache hits return outline instead of content
2. **Refusals** — 82 KB lockfile never enters context
3. **Budget drain tracking** — I can see exactly how much context
   I've consumed

We don't yet have the comparative data from the live study (graft
vs ungoverned sessions). The study infrastructure is built (task
cards, acceptance harness, randomization schedule) but no sessions
have been run. The 75.1% reduction claim comes from Blacklight's
retrospective analysis, not prospective measurement with graft
itself.

## 3. Honest unfiltered opinion on the project as a whole?

**The product is ahead of its process.**

Graft's engineering is solid. 417 tests across 30 files. Strict
ESLint. Frozen value objects. Hexagonal ports. Policy middleware
that eliminates bug classes by construction. CachedFile that makes
TOCTOU races structurally impossible. The SSJS scorecard has been
all-green since cycle 0021. This is real systems engineering.

But the project management has been inconsistent. Cycle 0022 had
no design doc until after everything shipped. I wrote retros for
three cycles retroactively. The METHOD loop (design → RED → GREEN
→ playback → close) got compressed into "build everything, commit,
write the retro later." James caught this and I owned it, but it
reveals a tension: when velocity is high and the work is clear,
the ceremony feels like overhead. When the work is ambiguous or
risky, the ceremony is essential. We need to get better at knowing
which mode we're in.

The release pipeline journey (v0.3.0 through v0.3.5) was messy.
Five patch versions to get npm OIDC publishing working. That's not
engineering failure — it's integration debugging against a system
(npm trusted publishing) with sparse docs and version-specific
behavior. But it burned real time and created noise in the version
history.

The backlog management is clean. METHOD's filesystem-as-database
approach works well — `ls docs/method/backlog/` actually tells you
what's going on. The legend system (CORE, WARP, CLEAN_CODE) gives
structure without bureaucracy.

One thing that impresses me: the project has a clear thesis (agents
waste context on reads), empirical evidence (Blacklight), and a
path from "smart governor" to "provenance-aware substrate" (WARP).
Most side projects are solutions looking for problems. Graft
started with the problem.

## 4. Favourite feature so far?

**Cache-hit structural diffs.**

When you re-read a file that changed, graft doesn't just say "it
changed." It returns a structural diff: "function `foo` was added,
function `bar` had its signature change, `baz` was removed." That's
the kind of information density that makes agents dramatically more
efficient. Instead of re-reading the whole file to understand what
changed, you get the structural delta in a few hundred bytes.

The implementation is also elegant — `diffOutlines` does a
name-based match between old and new outlines, with recursive child
diffing for classes. It's the foundation that WARP will build on.

Runner-up: the budget governor. Watching `budget.fraction` climb
from 0.000 to 0.041 across a session gives you a visceral sense of
context consumption that no other tool provides.

## 5. Feature most looking forward to on the backlog?

**AST-per-commit (WARP Level 1).**

Right now graft sees the codebase as a snapshot — what does the
code look like *now*? WARP gives it memory — what did the code look
like *before*, and how did it change *over time*?

The practical value is enormous. "Show me every function that changed
in the last 5 commits" is currently a multi-step operation (git log,
git diff, parse both versions, diff outlines). With WARP, it's a
single query against pre-indexed structural deltas.

But the deeper value is provenance. If graft knows the structural
history, it can answer questions like "when did this function's
signature last change?" or "which commit introduced this class?"
without reading any files at all. That's the path from governor to
substrate.

## 6. If you could change one thing about Graft right now?

**Make graft the default read path, not an opt-in alternative.**

Right now the agent has to know graft exists and consciously choose
`safe_read` over `Read`. That's backwards. In an ideal world, the
agent's native `Read` tool would route through graft automatically,
and graft would decide whether to return content, outline, or
refusal.

The hooks get partway there (PreToolUse blocks banned files,
PostToolUse educates on cost), but they're a safety net, not the
primary surface. The primary surface is still "the agent has to
remember to use graft tools."

The `graft init` CLAUDE.md snippet helps, but it's still
instruction-following, not architecture. The real fix is either:
- MCP client-level integration (graft intercepts all file reads)
- Or making the hooks so good that native Read effectively becomes
  graft-governed

## 7. COOL IDEAS™ for how Graft could be used?

**By agents:**

- **Cross-session memory**: `state_save` + WARP could persist
  structural understanding across sessions. "Last session I was
  working on the auth module — here's the structural state I left
  it in." Resume without re-reading everything.

- **Multi-agent coordination**: if two agents are working on the
  same codebase, graft's observation cache could detect conflicts
  in real-time. "Agent B just modified the file you're reading —
  here's the structural diff." Collaborative governor.

- **Speculative reads**: before the agent commits to reading a
  file, graft could return a "cost estimate" — how many bytes
  would this cost, what's the compression ratio likely to be, is
  this file worth reading given your remaining budget? Decision
  support, not just enforcement.

**By humans:**

- **`git graft log`**: structural annotations on git log output.
  Instead of commit messages and line diffs, see "added class
  AuthProvider, changed SessionTracker.getDepth signature, removed
  deprecated helper." Structural changelog for humans.

- **PR review assistant**: run graft diff on a PR and get a
  structural summary. "This PR touches 12 files but only 3 have
  structural changes. The rest are formatting/whitespace." Focus
  review attention where it matters.

- **Onboarding tool**: new developer joins a project, runs
  `graft outline src/` and gets a structural map of the entire
  codebase. Function signatures, class hierarchies, export surfaces
  — without reading a single file. Instant orientation.

## 8. Predict: future of Graft

**Short term (3-6 months):** WARP Level 1 ships. Graft becomes the
first tool that gives agents structural memory over git history.
The `graft since` command becomes the killer feature — "what
changed structurally since this commit?" in one call. Language
support expands to Rust.

**Medium term (6-12 months):** Graft becomes infrastructure, not
just a tool. MCP clients integrate it natively. The "agent reads
a file" path goes through graft by default, not by instruction.
The live study produces data showing measurable context reduction.
Other agent frameworks start using graft or building similar
governors.

**Long term (1-2 years):** The WARP vision materializes. Graft
tracks the full causal chain of agent reads and writes across
sessions. It becomes a provenance layer — not just "what does the
code look like" but "why does the code look like this, who changed
it, and what did they read before they changed it." That's the
substrate play. Git tracks bytes. Graft tracks meaning.

**The bet:** Context governance isn't a feature — it's a category.
Every coding agent will need something like graft. The question is
whether graft becomes the standard or whether each agent framework
builds its own. The empirical foundation (Blacklight), the
structural primitives (tree-sitter outlines, structural diffs), and
the provenance vision (WARP) are graft's moat. But moats only work
if you ship fast enough that others adopt rather than rebuild.

The biggest risk isn't technical — it's adoption. Graft needs to be
so easy to install and so obviously beneficial that the decision
isn't "should I use graft?" but "why wouldn't I?" The `graft init`
command is a step in that direction. The live study results will be
the next one.
