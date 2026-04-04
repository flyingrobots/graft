# Task Pair Calibration Notes

Justification for why each matched pair contains comparable tasks.

## Pair P01: T01 (GRAFTIGNORE_MATCH) ↔ T02 (STALE_CACHE)

Comparable because: both add a new reason code to the policy
engine, requiring reads of policy/types.ts, evaluate.ts, and
associated test files. Similar file count (~5-8), similar file
sizes, same repo. Both require understanding the existing reason
code pattern and extending it. Neither requires understanding
WARP, hooks, or the parser.

Difference: T02 also touches the cache module, making it slightly
broader in scope. Mitigated by comparable difficulty rating (both M).

## Pair P02: T03 (run_capture tail=0) ↔ T04 (read_range start=end)

Comparable because: both are edge-case bugfixes on bounded tool
operations. Similar file count (~3-5), similar investigation
pattern (read the tool handler, understand the edge case, fix it,
add a test). Both are S difficulty.

Difference: different tool handlers (run-capture.ts vs read-range.ts).
Handlers are similar in size and complexity.

## Pair P03: T05 (Rust detection) ↔ T06 (Python detection)

Comparable because: structurally identical tasks — add a language
to detectLang, handle the graceful fallback in outline extraction,
add tests. Same files touched, same pattern, same difficulty.
This is the tightest match in the bank.

Difference: none meaningful. This pair exists to validate the
protocol on near-identical tasks.

## Pair P04: T07 (session depth docs) ↔ T08 (receipt loop docs)

Comparable because: both are investigation tasks that require
reading source code and producing accurate technical documentation.
Similar read profile (2-5 files, mostly reading). Both are S
difficulty. Both are negative controls — investigation tasks with
minimal large-file retrieval where graft's governance should
provide less benefit.

Difference: T07 touches session/tracker.ts (more complex logic),
T08 touches mcp/receipt.ts (simpler but self-referential). Both
require understanding a specific algorithm from source.

## Pair P05: T09 (metrics interface) ↔ T10 (cache interface)

Comparable because: both extract a port interface from a concrete
class following the same hexagonal architecture pattern already
established in the codebase (FileSystem port, JsonCodec port).
Similar file count (~5-8), similar refactoring pattern. Both M
difficulty. Holdout pair — not used during pilot tuning.

Difference: T10's ObservationCache has more methods than T09's
MetricsLogger, making it slightly more complex. Mitigated by
comparable difficulty rating.
