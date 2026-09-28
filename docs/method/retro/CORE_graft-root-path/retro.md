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
  the unchanged pipe key, the suite's isolation, and the rule that only the
  resolver reads the home directory.
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
