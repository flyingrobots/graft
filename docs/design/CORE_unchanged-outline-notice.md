---
title: "Unchanged outline notice"
legend: CORE
status: design
backlog: docs/method/backlog/cool-ideas/CORE_unchanged-outline-notice.md
---

# Unchanged outline notice

**Sponsor human:** James
**Sponsor agent:** Claude

## Hill

When an agent asks `file_outline` for a file whose bytes it has already
received, in the same consumer context and context epoch, Graft returns a
compact notice with the jump table instead of the full outline. Suppression
only happens when a client hook has acknowledged the earlier delivery. A client
without hooks always gets the full outline. Any consumer can get the full
outline back with `resend: true`.

## Current state

- `RepoWorkspace.fileOutline` (`src/operations/repo-workspace.ts`) returns the
  full cached outline with `cacheHit: true`. The cache saves parsing, not
  context.
- `ObservationCache` lives on the `WorkspaceSlice`. `WorkspaceRouter` creates a
  slice per binding, and there is one router per MCP transport session (one
  stdio process per client; one `createGraftServer` per daemon session). Two
  agents on **separate** MCP connections therefore do not share a cache today.
  Agents that share **one** connection do, such as a parent and its subagents.
  The cache cannot tell them apart.
- `safe_read` already suppresses unchanged rereads (`REREAD_UNCHANGED`, outline
  in place of content), on the same cache-hit evidence. A cache hit also
  happens after a different tool filled the cache, and after a response that
  never reached the model. Tracked separately in
  [bad-code](../method/backlog/bad-code/CORE_reread-suppression-trusts-cache-as-delivery.md).
- Cache identity is a 32-bit FNV-1a hash
  ([bad-code](../method/backlog/bad-code/CORE_observation-cache-32-bit-content-hash.md)).
  That is acceptable for a parse memo, but too weak to decide that a consumer
  already holds some bytes.

## Decisions

1. **Compact notice, not a bare one.** A suppressed response keeps the jump
   table, so a consumer that lost the outline still has correct line ranges
   for `read_range`.
2. **Explicit resend.** `file_outline` accepts `resend: true`, which always
   returns the full current projection and records a new delivery.
3. **Context epochs from client hooks.** Compaction, clear and session start
   move the consumer to a new epoch. Deliveries from earlier epochs never
   suppress.
4. **Opt-in through hooks.** No acknowledgement means no suppression. Installing
   the hooks is the opt-in. There is no separate config flag, and the hook
   records the client's consumer identity as part of the acknowledgement.
5. **No chat copy.** The response carries structured status only. The user's
   "you already have it in your context" wording is not product text.
6. **Delivery is separate from caching.** The parse memo answers "have these
   bytes been parsed?". A new delivery ledger answers "has this consumer, in
   this epoch, received this projection of these bytes?". Only the ledger
   drives suppression.
7. **Two client families from the start.** Claude Code and Gemini CLI both
   expose tool-result, compaction and session-start hooks. Hook inputs are
   normalized through a client adapter, so the ledger doesn't depend on any one
   client.

## Model

### Consumer

A consumer is `(client, clientSessionId, agentId?)`, as reported by the client
hook payload. `agentId` is present when the client distinguishes subagents.
The transport session ID is not a consumer identity. It only tells the server
which consumers can receive a response on that connection.

### Delivery ledger

A record for each consumer:

```text
(consumer, epoch, path, projection="file_outline") -> { contentHash, deliveryId, ackedAt }
```

- `contentHash` is SHA-256 of the observed bytes. It is not the FNV
  cache key.
- `deliveryId` is opaque and minted by the server per full response. It
  encodes the issuing transport session.
- An entry exists only after a hook acknowledges `deliveryId`. Getting the
  result back from `ctx.respond` is not acknowledgement.

### Acknowledgement and epoch protocol

1. Each server transport session draws a random 128-bit **ledger key** `k`
   when it starts. A full `file_outline` response carries
   `delivery: { id, ledger: k, contentHash }`. `id` is random as well. The
   transport session ID is never exposed, because the daemon's authorization
   boundary depends on it not being guessable.
2. The client's tool-result hook (Claude `PostToolUse`, Gemini `AfterTool`),
   matched to Graft's `file_outline` tool, reads `delivery` from the tool
   response. It appends an `ack` line `{ consumer, epoch, deliveryId,
   contentHash, path }` to the ledger log `<graft root>/ledgers/<k>.jsonl`.
3. The client's compaction and session-start hooks (Claude `PreCompact` and
   `SessionStart` with `compact`/`clear`; Gemini `PreCompress` and
   `SessionStart`) append an `epoch` line to the consumer's epoch log,
   `<graft root>/consumers/<client>/<clientSessionId>[/<agentId>].jsonl`.
   That gives one file per user and per agent.
4. On each `file_outline` request, the server reads its own ledger log. That
   tells it which consumers have used this transport and what each one
   acknowledged. It then reads those consumers' epoch logs to find their
   current epochs.
5. Each hook writes a single line under `PIPE_BUF` with `O_APPEND`, so lines
   from concurrent hooks don't interleave. Each log has a byte cap. Once a log
   reaches the cap, hooks stop appending, so suppression stops and full
   responses resume. A full log can never cause suppression.
6. The server owns cleanup. A repo-local stdio server deletes `k`'s log when
   it exits. The daemon deletes it when the session is reaped. Consumer epoch
   logs expire on a TTL.

**Why files rather than the daemon socket.** The ledger lives with the
server that issued the delivery, and the hook has to reach that server.
Repo-local stdio is the default runtime. That server is a child of the client
and is reachable only through the client's own stdin and stdout, so a hook
can't talk to it. Daemon-backed stdio (`graft serve --runtime daemon`) exists
but is opt-in. Requiring it would make this feature daemon-only. A per-user
file mailbox works the same way for both runtimes, needs no daemon, and fails
safe. A later optimization could let a daemon session accept the same events
on its existing same-user socket. The file format stays the contract either
way.

### Suppression rule

When a request on transport `T` asks for `path` with observed bytes `B`, the
response is the compact notice only when all of these hold:

- policy has admitted the read. Refusal is evaluated first, as today;
- `resend` is not true;
- at least one consumer is known on `T`;
- **every** consumer known on `T` has a ledger entry for `path` in its current
  epoch with `contentHash == sha256(B)`.

Otherwise the full projection is returned with a new `delivery`. Requiring
every consumer is the conservative choice when consumers share a connection.
The remaining case is a consumer the server has never seen, such as a brand-new
subagent whose first call arrives before any ack. It may get a notice wrongly,
and decisions 1 and 2 cover that cost.

## Response contract

The `file_outline` output schema gains a third union variant. The existing
variants gain an optional `delivery`, which is backward compatible.

```text
{ path, status: "unchanged_since_delivery", jumpTable, actual,
  delivery: { id, priorDeliveryId, contentHash, deliveredAt },
  resend: { argument: "resend", value: true } }
```

- It has no `outline` field. An empty `outline` would look like a file with no
  symbols, which is the fabrication that cycle 0027 removed.
- It has no `projection` field. The MCP handler uses `"projection" in result`
  to detect refusal.
- `resend` is structured guidance. Tests assert it, not prose.

## Playback questions

### Agent

- First outline of a file: full outline and jump table? **Must be yes.**
- Same bytes again after my hook acked it: compact notice with the jump table?
  **Must be yes.**
- File changed: full current outline? **Must be yes.**
- After compaction or clear: full outline on the next request? **Must be yes.**
- Lost it and the epoch didn't move: `resend: true` returns it? **Must be yes.**
- A parent and subagent on one connection: does either get a notice for an
  outline only the other received? **Must be no** for consumers the server has
  seen; a never-seen consumer is the named residual risk.

### Operator

- Without hooks installed, is every response identical to today plus an
  optional `delivery`? **Must be yes.**
- Does a refusal still win over a notice after a policy change? **Must be yes.**
- Does a cache filled by `safe_read` alone ever cause a notice? **Must be no.**
- Do Claude and Gemini hook payloads produce the same ledger events?
  **Must be yes.**

## Acceptance criteria

- First delivery, same-bytes repeat after ack, changed bytes, new epoch, a
  different consumer, policy refusal, a cache filled by another operation, an
  unacked (failed) delivery, and `resend: true` each produce the specified
  variant.
- Suppression never happens unless an ack exists in the current epoch.
- The ledger is keyed by consumer, so two consumers on one transport keep
  separate records.
- The ack and epoch events from the Claude and Gemini adapters normalize to the
  same events, tested with recorded payload fixtures for each client.
- The consumer log has a byte cap.
- The MCP, CLI and API output schemas stay in step.
- `docs/SETUP.md` documents the hook installation for both clients.

## Test strategy

- Unit tests on the ledger and suppression rule, with injected events (no
  filesystem).
- Unit tests on the client hook adapters, using recorded Claude and Gemini
  payload fixtures.
- An integration test through the MCP handler with a hook-written consumer log
  in a temporary Graft root (`GRAFT_ROOT_PATH`), covering the acceptance
  matrix.
- Assertions are on `status`, field presence, `delivery` IDs and the absence of
  `outline`, never on message wording.

## Non-goals

- Changing `safe_read`'s existing reread suppression. A follow-on cycle moves it
  onto the same ledger.
- Replacing the FNV parse-memo key.
- Pushing the hot working set back into context after compaction
  ([cool idea](../method/backlog/cool-ideas/CORE_epoch-working-set-rehydration.md)).
- Proving that the outline is still in the model's context. Graft can prove
  delivery only.
- Clients without hooks (Codex, Cursor, others). They stay in full-response
  mode.

## Proposed PR split

1. **Ledger, notice, resend, Claude adapter.** One PR is enough for the whole
   feature to work for Claude Code users, and it is correct without the next PR.
2. **Gemini CLI adapter.** Hook payload normalization, fixtures and setup docs.
   Its prerequisite is PR 1, which defines the event format.

## Open questions

- Gemini CLI hook event names and payload fields must be checked against its
  current docs at RED time. The names above are the expected ones.
- Subagents are separate consumers (decided). Still unconfirmed: whether
  Claude Code's and Gemini CLI's hook payloads identify the subagent that made
  an MCP tool call. If a client doesn't, that client's subagents fold into the
  parent consumer, and decisions 1 and 2 cover the cost.
- The numeric byte caps and the epoch-log TTL.
