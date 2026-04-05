# guardedPort() factory

The `guardPortReturn` wrapper in src/guards/stream-boundary.ts
wraps one method at a time. A `guardedPort()` factory could wrap
an entire port interface at construction time — every method gets
the assertNotStream guard automatically.

```typescript
const fs = guardedPort("FileSystem", new NodeFileSystem());
// Every method on fs now throws if it returns an AsyncIterable
```

Implementation: Proxy-based. Intercept all method calls, await
the result, run assertNotStream. One line to guard a whole port
instead of per-method wiring.

This becomes especially valuable when WARP ports arrive — each
new port is guarded by default, not by remembering to wire each
method.

Effort: S
