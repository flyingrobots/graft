# Release Design: v0.8.0

## Included Work

- Add the top-level `graft review --base <ref> [--head <ref>]`
  structural review summary surface.
- Add structural/reference test coverage reporting through the MCP tool
  and CLI surface.
- Add bounded provenance hints to `git graft enhance --since <ref>`.
- Add symbol-history and dead-symbol review lenses.
- Add review cooldown status detection for automated reviewer loops.
- Add parser-backed structural support for Rust, GraphQL, Python, Go,
  JSON, TOML, and YAML.
- Add lazy parser readiness through `ensureParserReady()`.
- Add Docker Desktop auto-start assistance for the isolated test runner
  on macOS.
- Bound Docker-isolated release test worker concurrency by default while
  preserving explicit `--maxWorkers` overrides.
- Harden MCP invocation/server construction, governed read parity, WARP
  symbol-id handling, Git version checks, and projection-bundle docs.

## Deferred Work

- PR feedback resolution ledger.
- ToolContext injection contract sweep.
- Repo-wide bounded subprocess policy sweep.
- SQL, shell, HCL, Java, C#, C, C++, PHP, Ruby, Swift, Kotlin, and
  Jupyter parser breadth cards.
- GitHub PR-number resolution and automated PR comment posting for
  `graft review`.
- Automatic breaking-change classification.

These remain valid follow-up work, but they are not required to make
v0.8.0 coherent.

## Hills Advanced

- **Review Truth**: Users can inspect structural change signal,
  bounded provenance, symbol history, removed-symbol evidence, and
  structural test-reference signals from local Git ranges.
- **Language Breadth**: The review surface now applies to a wider set
  of practical repositories: TypeScript/JavaScript, Rust, GraphQL,
  Python, Go, JSON, TOML, YAML, and Markdown.
- **Runtime Robustness**: Parser loading, Docker preflight behavior, Git
  version checks, and MCP orchestration are less brittle.

## Sponsored Users

- **PR authors** get compact local evidence before asking for another
  review.
- **Reviewers** get structural signals that help focus attention on
  meaningful changes and obvious test-reference gaps.
- **Agent hosts** get bounded parser-backed context across more file
  types without depending on raw-file reads.
- **Maintainers** get hardened startup and invocation paths before the
  review surfaces grow more transport adapters.

## Version Justification

**Minor** (`0.7.1` to `0.8.0`).

This release adds new documented CLI and MCP review surfaces, new
parser-backed language support, and new package-root parser readiness
capability without intentionally breaking documented behavior.

## Migration

- No migration is required for normal CLI, MCP, or API usage.
- Hosts that need synchronous parser-backed projection immediately after
  import can call `ensureParserReady()` explicitly before synchronous
  structured-buffer use.

## Release Acceptance

This release is ready to tag when all of the following are true:

- `package.json` is bumped to `0.8.0`.
- `CHANGELOG.md` has a dated `0.8.0` section.
- `docs/releases/v0.8.0.md` is final.
- `docs/method/releases/v0.8.0/verification.md` is filled with actual
  preflight evidence.
- `pnpm release:check` passes on the final release commit.
- `main` is exactly synced with `origin/main` before tagging.
- The `v0.8.0` tag is pushed only from the merged main release commit.
