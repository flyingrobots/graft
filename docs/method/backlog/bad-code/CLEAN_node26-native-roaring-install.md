---
title: "Make the npm install path tolerate unavailable native Roaring binaries"
feature: release
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 1
effort: S
status: open
reported: 2026-09-11
owner: flyingrobots
---

# Make the npm install path tolerate unavailable native Roaring binaries

Installing published `@flyingrobots/graft@0.14.0` with normal npm lifecycle
scripts on Node 26.0.0, Darwin ARM64, failed before the executable was ready.
The transitive `roaring@2.7.0` install requested
`roaring-v2.7.0-node-v147-darwin-arm64-unknown.tar.gz` from its GitHub release;
that request returned 404. Its source-build fallback then failed against V8:

```text
src/cpp/object-wrap.h:26:25: error: no matching member function for call to 'GetAlignedPointerFromInternalField'
src/cpp/RoaringBitmap32-main.h:114:11: error: no member named 'SetAlignedPointerInInternalFields' in 'v8::Object'
src/cpp/main.cpp:19:36: error: no member named 'GetIsolate' in 'v8::Object'
```

The reproduction used an owned new version directory:

```sh
npm install --prefix "$HOME/.graft/installs/0.14.0" \
  --omit=dev --save-exact @flyingrobots/graft@0.14.0
```

The deployment recovered with `--ignore-scripts`, matching Graft's existing
pnpm `onlyBuiltDependencies: []` policy. WARP's `roaring-wasm` fallback passed
a bitmap serialization round trip, and the installed MCP server passed the
isolated parser/read/outline smoke check. This is a verified local workaround,
not evidence that ordinary npm installation succeeds on Node 26.

Resolve the dependency installation behavior or explicitly narrow and document
the supported installation/runtime combination. Prefer preserving WARP's
portable fallback when native acceleration is unavailable. Test the public
npm installation path in an owned clean prefix, with scripts enabled, on the
declared supported Node/macOS combinations. Verify bitmap operations and a
Graft request after installation. Do not treat a successful `--version` call
alone as bitmap validation.

Evidence: [v0.14.0 deployment witness](../../releases/v0.14.0/verification.md)
and its retained installed-package smoke command. Reassess before the next
release; ownership remains `flyingrobots`.
