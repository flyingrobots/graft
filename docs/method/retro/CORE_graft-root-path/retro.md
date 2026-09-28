---
title: "Graft root path retro"
cycle: CORE_graft-root-path
design_doc: docs/design/CORE_graft-root-path.md
outcome: implementation-validated-review-open
drift_check: yes
---

# Graft root path retro

## Outcome

`GRAFT_ROOT_PATH` now decides Graft's per-user root, falling back to
`~/.graft`. The resolver is `src/adapters/graft-root.ts`; the daemon's default
root and Windows pipe key derive from it. The test suite sets the variable to a
temporary directory through `test/setup-graft-root.ts` and does not touch
`HOME`. No installed daemon or release was changed.

## Process drift

The design packet was written after the implementation, from a decision made in
conversation, which the design-packets-first rule does not allow. The packet
records that decision as made.

## Evidence

- `test/unit/adapters/graft-root.test.ts`: the resolver cases, the daemon root,
  the unchanged pipe key, the suite's isolation, and (after review) a
  behavioural check that no per-user default reads the home directory once
  `GRAFT_ROOT_PATH` is set. Until review round 1 this item was a source-text
  scan; see below.
- RED was observed three ways: the module missing; the isolation test failing
  with the setup file removed; the home-read rule catching a leftover
  `os.homedir` default in `src/mcp/daemon-bootstrap.ts`, which was then moved
  into the resolver.
- `test/unit/release/path-ops-boundary-allowlist.test.ts` now lists the new
  adapter as an allowed `node:path` importer.
- A full local run passed apart from 7 timeouts (six at five seconds, one at
  thirty) while another suite ran on the same machine; the two failing files outside the four playback
  tests known to time out locally passed 36 of 36 when rerun alone.

## Review round 1

Codex left eight threads on PR #261. Each repair below has its own commit, a
regression observed failing before the fix, and the graft-root and allowlist
tests, lint and typecheck green after it.

- Windows rooted paths: `\graft` passed `path.isAbsolute` on Windows while its
  drive depends on the process. The resolver now takes the platform, and on
  win32 accepts only a drive or UNC root. RED: with the platform seam in place
  but the old `isAbsolute` check, the test accepted `\graft`.
- Legacy Windows pipe name: the test checked only the intermediate key. It now
  asserts the full pipe name for an unset root against a vector produced by
  running origin/main's resolver (c2a297a4) with platform win32 and a fixture
  home. `resolveSocketPath` takes an optional platform so the win32 branch runs
  on any host. Calibration: making the unset key `<home>\.graft`, and
  truncating the digest to 16 characters, each failed it.
- Injected environment: `startDaemonServer({ env })` resolved its root and
  Windows pipe key from `process.env`. It now resolves both from the injected
  `env`. RED: the integration test found no `daemon/sessions` under the
  injected root, and the pipe for an injected root changed with the ambient
  variable. `ensureDaemonReady` and `graft daemon inspect` take no injected
  environment and spawn or run with `process.env`, so they are unchanged.
- Windows root spellings: `C:\Graft`, `c:\graft` and `C:/GRAFT/` name one
  directory but hashed to different pipes. A configured root's pipe key is now
  canonicalized on win32 (separators, trailing separator, ASCII case); the
  unset key is still the raw home directory. RED: four spellings gave four
  pipes.
- HOME check: the harness test asserted `HOME` equals the account database's
  home, which is false in a sandbox or container where the setup is still
  correct. The setup now records `HOME` before it runs, and the test compares
  against that. RED: with `HOME` pointed at a scratch directory for the run, the
  old assertion failed; the new one passed there and failed when the setup was
  mutated to reassign `HOME` (reverted byte for byte, never committed).
- Windows temp directory: "outside the real home" is false on Windows, where
  `os.tmpdir()` sits inside the user profile. The test now requires the root
  and daemon root to equal the setup's own temporary directory exactly, a
  stronger oracle on every platform. RED (modelled on macOS, nothing written
  under the home): with the old test's home set to the temp directory's parent,
  it failed. Calibration: a resolver that ignored the setup's root failed the
  new test.
- Home-read guard (two threads, one design, one commit): the guard was a
  regex over the text of every file in `src`, run in the test suite. It
  asserted implementation text, which TESTING_STANDARDS.md rule 2 and
  AGENTS.md rule out; a comment naming `homedir` failed it while an aliased
  or computed read could pass; and it was an unbudgeted recursive scan in the
  test gate (rule 9). It is replaced by two checks. `pnpm lint` now carries the
  boundary on the syntax tree, following the repository's existing
  import-boundary rules in `eslint.config.js`; comments cannot trip it and it
  adds no traversal of its own. A small unit test exercises every function
  that computes a per-user default with `GRAFT_ROOT_PATH` set and
  `os.homedir` and `os.userInfo` spied, and requires no call and a result
  under the configured root. Calibration: the lint rule rejected nine read
  forms (namespace, alias, computed literal, named import, destructured
  import, `env.HOME`, `env["HOME"]`, destructured `HOME`,
  `userInfo().homedir`) and passed a comment naming them; the unit test failed
  (4 calls) with `defaultDaemonRoot` reverted to its original `os.homedir()`
  default. Deletion criterion for the scan: every non-comment match of its
  regex is a form the lint rule rejects. Blind spots: a computed property
  name (`os["home" + "dir"]`), `Reflect.get`, or a variable key on
  `process.env`; and a new per-user default must be added to the unit test's
  list by hand. `test/unit/release/path-ops-boundary-allowlist.test.ts`
  remains a source scan; this PR only added one allowlist entry to it.
