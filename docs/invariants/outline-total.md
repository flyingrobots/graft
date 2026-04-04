# Outline extraction is total for supported languages

**Legend:** CORE

If `detectLang(path)` returns a non-null language, then
`extractOutline(source, lang)` must produce a valid
`OutlineResult` with an `entries` array. It may be empty
(no top-level declarations), but it must not throw or
return undefined.

## If violated

`safe_read` returns broken or empty outlines for large files.
Agents lose structural navigation and fall back to raw reads.

## How to verify

- Outline audit tests cover 7 real-world fixture files
- Parser tests cover every node kind (function, class, method,
  interface, type, enum, export)
- Broken/partial source produces `partial: true`, not a crash
