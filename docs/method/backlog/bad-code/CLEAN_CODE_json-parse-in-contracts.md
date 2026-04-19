---
title: "JSON.parse in contracts layer (json-object.ts)"
legend: CLEAN_CODE
lane: bad-code
---

# JSON.parse in contracts layer

Source: anti-sludge audit 2026-04-19

`src/contracts/json-object.ts:23` calls `JSON.parse(text)` directly. This file is in the contracts layer (Layer 1) which should not perform encoding/decoding — that's adapter work.

The function `parseJsonTextObject` IS a boundary decoder by nature, but it lives in the wrong layer. It should either:
1. Move to `src/adapters/` where decode operations belong
2. Accept already-parsed `unknown` instead of raw text (remove the JSON.parse, make callers do it)

Effort: S
