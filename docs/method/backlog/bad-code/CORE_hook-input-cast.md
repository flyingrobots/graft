# as HookInput cast in parseHookInput

`src/hooks/shared.ts` — `parseHookInput()` returns `{ ... } as HookInput`
at the end of the function. The runtime validation above guarantees
correctness, but the cast bypasses the type system.

The root cause: TypeScript doesn't narrow `Record<string, unknown>` index
access through control flow. After `typeof obj["session_id"] !== "string"`
guard, `obj["session_id"]` is still `unknown`.

## Fix options

1. Use a Zod schema to parse and validate in one step
2. Build a typed intermediate with explicit assignments
3. Accept the cast (runtime validation is the real safety)

Effort: S
