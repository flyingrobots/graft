# What I've Been Up To

_A project update covering mid-March through mid-April 2026._

---

## The Short Version

Four releases shipped in one week. Three of them — bijou v5.0.0, METHOD v2.0.0, and graft v0.5.0 — are core infrastructure for the ecosystem. The fourth, [The Opposite Type](https://github.com/flyingrobots/the-opposite-type), is a complete Seinfeld episode about a man who announces he's switching back to plain JavaScript. It compiles emotionally, if not literally.

Behind those releases, the larger story is that the pieces of this system are starting to find each other. Echo, Wesley, warp-ttd, git-warp, and graft have always shared vocabulary — strands, braids, worldlines, witnesses, neighborhoods — but until recently, each repo defined those nouns independently. That changed this cycle. A new repo called **Continuum** now owns the shared invariants, and the other projects are aligning to it.

---

## What Shipped

### bijou v5.0.0

bijou is the TUI framework that everything else renders through. v5 is a major release focused on theming, markdown rendering, and performance:

- **Theme selection**: host applications can now declare a theme set and bijou resolves it automatically. There's a custom theme authoring guide and a one-line selection API.
- **Markdown improvements**: table fitting, marquee slice caching, visible-width-aware inline wrapping, and ANSI lint compliance for framed runs.
- **Performance tooling**: `npm run perf` entry point and CI gradient benchmark lanes.
- **Dogfood-driven docs**: the entire documentation surface was overhauled from agent backlog guidance through to MCP README examples.

The release went through four intermediate versions (v4.4.0, v4.4.1, v4.5.0, v5.0.0) in rapid succession — each one caught by review feedback, tightened, and re-cut. v4.5.0 added structured MCP output modes and pipeline observability hooks. v5 landed the theme system and merged today.

### METHOD v2.0.0

METHOD is the development process framework. v1 shipped in early April; v2 followed a week later with substantial new capabilities:

- **`method doctor`**: SHA-locked health receipts for release-gate verification. The doctor checks directory structure, frontmatter validity, and repo self-discipline, then produces a receipt you can re-execute as a gate.
- **`method spike`**: a new command (and MCP tool) for timeboxed exploratory work.
- **Human-in-the-loop witness verification**: cycle close now walks through executable verification instructions and produces a conversational retro.
- **Pre-commit hooks**: reference docs auto-regenerate on commit.
- **Self-critique cycle**: a fresh-eyes review surfaced 14 code review findings (CRITICAL through NIT), all resolved before release.

The v2 release also flattened 38 legacy design docs, elevated PROCESS and RELEASE to signpost status, and rewrote the GUIDE with Mermaid diagrams.

### graft v0.5.0

graft is the code-intelligence layer — it watches repositories and produces structural outlines, activity views, and now between-commit diffs:

- **Between-commit activity view**: see what changed between any two commits as a structured summary, exposed through both CLI and MCP.
- **Concurrent agent model**: graft now understands same-repo concurrency — multiple agents can work in the same repo with proper session isolation and daemon liveness tracking.
- **Cross-session handoff**: workspace guidance that carries context across agent sessions.

graft is also the first repo actively dogfooding warp's patch storage. Its own AST is stored as a stream of CBOR-encoded patches in `refs/warp/graft-ast/writers/graft` — a parallel ref namespace inside its own git repo. Over 600 patches accumulated in this window. The tool is eating its own output.

---

## The Kernel: Echo

Echo is the Rust kernel at the center of the system. This cycle's work landed two major pieces:

**Strand contracts** (Cycle 0004): strand types, a registry, and contract tests — the first formally tested invariant boundary in the kernel. The STRAND-CONTRACT and FIXED-TIMESTEP invariant documents are now checked by CI. This was TDD in the strict sense: RED tests committed first, then GREEN implementation, then review feedback from CodeRabbit addressed in a follow-up pass.

**Braid geometry and settlement** (on the `braids` branch): neighborhood sites published from braid geometry, base-worldline strand settlement, and settlement outputs exported through the Wasm ABI. The design docs define echo's continuum alignment, strand parity path, and braid geometry publication contract.

On the `tech-writing` branch (which runs ahead of main), the work goes further: structured rewrite binders, a dynamic footprint binding runtime, and a public native rule authoring seam. The kernel is growing toward a surface where external rule authors can participate — but the seam is deliberately narrow.

---

## The Generator: Wesley

Wesley is the code generator and protocol compiler. It takes specs and produces typed families, registries, and API surfaces. Recent work:

- **Observer specs to plans**: Wesley can now compile observer specifications into execution plans and generate family operation registries from them.
- **WARPspace**: TOML is now the primary config format. Wesley can bootstrap a warpspace, stage node and other runtimes from a manifest, and output structured footprint grammars.
- **Echo integration**: the `generator-echo` module emits slot-aware and footprint-bounded rewrite APIs, with proofs consumed by the echo kernel's binding resolver.
- **Release v0.1.0**: Wesley's first tagged release shipped this cycle, anchoring the protocol surface.

---

## The Engine: git-warp

git-warp is the CRDT/graph engine — the largest and most active repo in the ecosystem. Two threads dominated this cycle:

**The TypeScript migration** (Cycle 0013): git-warp has been a JSDoc-typed JavaScript project. The SSTS (Systems Style TypeScript) manifesto was written, 93 source files were mapped into 11 migration batches with dependency graphs, and every "god file" got a kill plan. The migration is in planning/early execution — the backlog is scored, the sludge is audited, the hedge language is killed. Plans commit, not hedge.

**Trie storage** (Cycles 0027–0028 on `release/v17.0.0`): git-warp now has a Git-native trie storage layer. `TrieLeaf` and `TrieBranch` value objects with CBOR codecs, a `GitTrieStoreAdapter` for leaf and branch I/O, nibble-name parsers, and `TrieGeometry` with split/merge predicates. Integration tests validate against real git. This is the foundation for efficient content-addressable set operations stored directly in git's object model.

The release/v17.0.0 branch has 932 commits and is still accumulating — the TypeScript migration and trie storage need to converge before it ships.

---

## The Design Spine: Continuum

Continuum is new. It started as an older repo that was checkpointed, salvaged, and reset into a METHOD spine on April 10. Since then, 50 commits — all design documents, zero implementation code.

What it defines:

- **Shared noun ownership**: which repo owns which concept (strand, braid, witness, worldline, neighborhood, settlement, proof, receipt).
- **One-graph two-temperature invariants**: the model that separates hot (mutable, local) state from cold (immutable, shared) state within a single graph structure.
- **Settlement contract family**: how echo, wesley, and warp-ttd produce and consume proofs.
- **Admission and versioning doctrine**: the rules for entering and versioning the shared namespace.
- **Focus boundary structure**: how attention narrows from the full graph to a working neighborhood.

Continuum also produced a **newcomer onboarding path** and a **continuum-demo** repo (8 commits) that closes a local echo → git-warp → echo loop as a proof of concept.

This is intentionally specification-only. The implementations live in the other repos. Continuum's job is to freeze the contracts they share.

---

## The Supporting Cast

**think** (v0.7.0): the thought-capture CLI gained MCP doctor tools, extended health checks, a graph v4 enrichment schema, auto-tags, semantic parsing, and annotation commands. The `release/next` branch is deep into an enrichment pipeline — 65 cycles and counting — that adds semantic classification, topic graph nodes, and LLM-assisted analysis to captured thoughts. Also: splash-to-browse transitions with plum fade-ins, because even a CLI deserves a moment.

**git-cas**: the content-addressable store adopted METHOD's planning model, gained a relay agent with vault lifecycle commands, ran a 9-part documentation truth review (tr-003 through tr-014), and rewrote its README from scratch with animated SVG logo variants. The TUI got its own theme, treemap drilldown, and refs browser.

**warp-ttd**: the visual time-travel debugger is in a worldline view rethink (Cycle 0014). The bijou app frame migration and lane graph renderer work landed. Earlier cycles defined design vocabulary, effect emission protocols, navigator views, writer-id receipts, and debugger sessions. The protocol publication boundary is being codified.

**eddit** (formerly jedit): a brand-new editor, 7 commits old. Initial editor scaffolding, METHOD cycles, graft integration (drawer on the right side), and pane focus management. Early days.

**git-cms**: released v1.2.1 with a repeatable blog media capture pipeline, sandbox hardening, and review lanes. Quiet but functional.

---

## The Process

METHOD is visible everywhere. Graft alone ran cycles 0005 through 0043 in this window — 39 named cycles, each with a design doc, a branch, a retro, and a close. Echo ran 4 cycles. git-warp ran 0010–0013 plus 0027–0028. Think ran 65. Method itself ran cycles 0029–0039 and then dogfooded its own v2 release process.

Every repo has a `tech-writing` branch that runs slightly ahead of main, carrying documentation overhauls and manifest refreshes. These get merged into release branches as part of the cut.

The cadence is: pull a cycle from the backlog, write a design doc, open a cycle branch, work it to hill-met (the point where the hard uncertainty is resolved), close the retro, merge. Repeat. The commit messages tell the story — `docs(method): close cycle 0004 — strand contract` is both a bookmark and a proof of process.

---

## What's Ahead

- **git-warp v17.0.0**: the TypeScript migration and trie storage need to ship. This is the biggest open item.
- **Echo braids merge**: the braid geometry and settlement work on the `braids` branch needs to land on main.
- **Continuum bootstrap**: the spec is frozen; the warpspace bootstrap prototype exists; now it needs to produce a real runtime loop.
- **Think enrichment pipeline**: 65 cycles of enrichment design are queued on `release/next` — auto-tags, semantic parsing, annotations, and the full graph v4 schema.
- **eddit**: the editor is a blank canvas. Graft integration, hot text surface, and optic handoff are on the backlog.

---

## By the Numbers

~4,000 developer-authored commits across 13 active repos in 40 days. Four releases. 39 completed cycles in graft alone. Zero surviving WIP commits. One Seinfeld episode about TypeScript. The penguin compiled emotionally, if not literally.
