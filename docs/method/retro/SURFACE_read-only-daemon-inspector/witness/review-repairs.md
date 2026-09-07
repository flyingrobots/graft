# PR #254 review repairs

## Optional undefined fields — P2

Review: [CodeRabbit thread](https://github.com/flyingrobots/graft/pull/254#discussion_r3952013844).
Base: `13a66297`.

The public request schema accepts optional fields explicitly set to undefined.
The client serialized those own properties into literal `undefined` query
values. For identity selectors this could produce a misleading complete empty
inventory; an undefined limit could cause refusal.

Four parameterized tests observe the request at the real local HTTP boundary.
The independent oracle is absence of the undefined field with defined identity
and limit parameters preserved. Each test requires exactly one received request.

RED on the unfixed client:

```sh
pnpm exec vitest run test/integration/mcp/daemon-inspection.test.ts -t 'omits an undefined'
```

All four cases failed at the query-parameter assertion. The actual request
contained `sessionId=undefined`, `workspaceId=undefined`, `repoId=undefined`, or
`limit=undefined` respectively. This was an assertion failure, not a setup error.

The client now skips undefined values before string conversion. The design
packet and public API documentation explicitly state that contract.

GREEN/VERIFY: the four-file inspection suite passed 27 tests, including all four
regressions; typecheck and lint passed.

## Empty query delimiter — P5

The compatibility test required the incidental trailing `?`, although its
contract is one request to `/inspect/v1` without an MCP/health fallback.
Temporarily omitting an empty delimiter in the client made the old test fail:
expected `/inspect/v1?`, received `/inspect/v1`. The revised test checks request
cardinality and the parsed pathname. It passed with the delimiter omitted; the
temporary client change was then restored and the revised test passed with the
original client too. No runtime behavior changed for this repair.
