---
title: Graft root path
legend: CORE
status: implementation
---

# Graft root path

## Hill

Graft finds its per-user state from one place. `GRAFT_ROOT_PATH` names the
Graft root; when it is unset, the root is `~/.graft`. Every per-user default
derives from that root, and the home directory is read nowhere else. Moving the
root, for a test suite, a second install or a service account, means setting
`GRAFT_ROOT_PATH`, never changing `HOME`, which git, ssh and gh also read.

The trigger: a test run on another branch wrote graph folders into a
developer's real `~/.graft`, and the first repair redirected `HOME` for
the whole suite. That was rejected: resetting `HOME` is dangerous, and Graft
itself should use its own root variable, in the product as well as in tests.

## Acceptance criteria

- `graftRootPath()` returns `GRAFT_ROOT_PATH` when set, and `<home>/.graft`
  when it is unset or empty. A relative value is refused, because a daemon and
  its clients could resolve it from different working directories. For the
  same reason, on Windows only a drive path (`C:\...`) or a UNC share
  (`\\server\share\...`) is accepted; a rooted path such as `\graft` lands on
  whichever drive is current and is refused.
- The daemon's default root is `<graft root>/daemon`. When a host passes
  `startDaemonServer({ env })`, the Graft root and the Windows pipe key come
  from that `env`, like the daemon's other settings, never from the host's
  `process.env`.
- The Windows daemon pipe name is unchanged while `GRAFT_ROOT_PATH` is unset,
  so an installed daemon is still found; each configured root gets its own pipe.
- No production source reads the home directory outside the resolver
  (`src/adapters/graft-root.ts`).
- The test suite sets `GRAFT_ROOT_PATH` to a private temporary directory and
  leaves `HOME` alone. A test fails if any per-user default resolves inside the
  real home, as named by the account database rather than by `HOME`.

## Playback questions

- Human: if I set `GRAFT_ROOT_PATH=/srv/graft`, does the daemon keep its state
  under `/srv/graft/daemon`?
- Human: after upgrading with the variable unset, does my running daemon still
  answer on the same socket or pipe?
- Agent: can a test anywhere in the suite write into the developer's real
  `~/.graft`?

## Non-goals

- Per-repository `.graft` directories inside worktrees. They belong to the
  repository, not the user, and do not move.
- Where installers put `~/.graft/bin` and `~/.graft/installs`; that is outside
  this repository.
- The per-worktree WARP graph root proposed in PR #249. When it lands it should
  derive from `graftRootPath()` rather than from `HOME`.
