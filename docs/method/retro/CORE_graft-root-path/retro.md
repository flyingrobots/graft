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
records that decision as made; nothing in the implementation was changed to fit
the packet afterwards.

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
- A full local run passed apart from 7 five-second timeouts while another suite
  ran on the same machine; the two failing files outside the four playback
  tests known to time out locally passed 36 of 36 when rerun alone.
