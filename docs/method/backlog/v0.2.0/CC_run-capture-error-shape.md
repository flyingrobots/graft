# run-capture error response shape inconsistent with success

Success returns `{ output, totalLines, tailedLines, logPath, truncated }`.
Error returns `{ error, output, stderr }` — missing `totalLines`,
`tailedLines`, and `truncated`.

## Location

- `src/mcp/tools/run-capture.ts` catch block

## Fix

Add `totalLines`, `tailedLines`, and `truncated` to the error response
so consumers can destructure the same keys regardless of success/failure.

## Legend

CLEAN_CODE
