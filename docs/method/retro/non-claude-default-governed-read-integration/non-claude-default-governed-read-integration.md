---
title: "Non-Claude default-governed read integration Retro"
---

# Non-Claude default-governed read integration Retro

Design: `docs/design/0047-non-claude-default-governed-read-integration/non-claude-default-governed-read-integration.md`
Outcome: hill met: Codex bootstrap now seeds AGENTS.md alongside MCP config, setup docs distinguish governed-read posture by client, and remaining non-Codex bootstrap parity work is explicit in backlog
Drift check: yes

## Summary

Cycle 0047 tightened the non-Claude bootstrap path without pretending
that non-Claude clients now have true native-read interception. The
operator-visible ship is that `graft init --write-codex-mcp` now writes
or merges both `.codex/config.toml` and `AGENTS.md`, giving Codex the
MCP server wiring plus a repo-local instruction layer that tells it to
prefer graft reads.

The docs now expose an explicit client posture matrix instead of
implying that "MCP available" means "default-governed". Claude remains
the only client with a real read guardrail today. Codex now has the
strongest non-Claude bootstrap path. The remaining non-Codex parity
question was pushed into backlog as a cool idea rather than being left
implicit.

## Playback Witness

- `docs/method/retro/0047-non-claude-default-governed-read-integration/witness/verification.md`

## Drift

- None recorded.

## New Debt

- `docs/method/backlog/bad-code/CLEAN_CODE_cli-init-bootstrap-composition.md`
- `docs/method/backlog/bad-code/CLEAN_CODE_cli-init-test-fixtures.md`
- `docs/method/backlog/bad-code/CLEAN_CODE_hook-read-test-fixtures.md`

## Cool Ideas

- `docs/method/backlog/cool-ideas/SURFACE_non-codex-instruction-bootstrap-parity.md`

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged

Notes:
- consumed `SURFACE_non-claude-default-governed-read-integration`
- rolled `docs/method/next-release-ranked-queue.md` forward so
  observability is now the next ranked release item
- kept the remaining non-Codex bootstrap parity question explicit in
  backlog instead of leaving it as a doc caveat
