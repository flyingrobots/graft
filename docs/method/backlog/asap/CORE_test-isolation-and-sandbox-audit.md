# Audit the test suite for local machine state leakage

No test should depend on the developer's local repository state,
filesystem layout, MCP config, or previously indexed data.

All tests that exercise non-mocked APIs need to run in a controlled,
constrained environment such as `/tmp` test repos or a Docker-isolated
sandbox. If a test passes only because the local machine already has
state, it is not a trustworthy test.

Audit targets:
- Tests that implicitly use `process.cwd()`
- Tests that read from the real repository instead of a fixture repo
- Tests that depend on an existing WARP graph, git history, or local
  config
- Tests that invoke non-mocked network or external process behavior

Exit criteria:
- Every such test is either sandboxed or rewritten to use mocks
- The suite documents which tests are integration-by-design and how
  their sandbox is constructed
- CI proves the suite passes from a clean environment with no local
  warm state
