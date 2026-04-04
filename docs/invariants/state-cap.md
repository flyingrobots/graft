# State cap is enforced

**Legend:** CORE

`state_save` rejects payloads exceeding 8 KB. The cap is
enforced before writing to disk.

## If violated

Agents can persist unbounded data, consuming disk and creating
a side channel for context that bypasses the governor.

## How to verify

- state-save tests assert rejection of oversized payloads
- The cap is checked on the serialized byte length, not string length
