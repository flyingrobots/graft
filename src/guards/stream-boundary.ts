// ---------------------------------------------------------------------------
// Stream/Port boundary guards — enforce the Two-Case Rule at runtime
// ---------------------------------------------------------------------------
//
// Law: Streams explore. Ports decide.
//
// Ports return bounded artifacts (Promise<T>). Streams return
// unbounded traversals (AsyncIterable<T>). These two shapes MUST
// NOT cross. A port that returns a stream is a lie. A stream that
// returns a single value is a waste.
//
// These guards make violations throw, not silently misbehave.
// ---------------------------------------------------------------------------

/**
 * Returns true if the value implements the async iterable protocol.
 */
export function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Record<symbol, unknown>)[Symbol.asyncIterator] === "function"
  );
}

/**
 * Throws if the value is an AsyncIterable. Use at port return boundaries
 * to prevent streams from leaking into persistence layers.
 *
 * @param value - The value to check
 * @param context - Description of where the check is (e.g. "FileSystem.readFile()")
 */
export function assertNotStream(value: unknown, context: string): void {
  if (isAsyncIterable(value)) {
    throw new TypeError(
      `${context} produced a stream where a bounded value was required. ` +
      `Ports return artifacts, not traversals.`,
    );
  }
}

/**
 * Throws if the value is NOT an AsyncIterable. Use at stream transform
 * entry points to prevent bounded values from entering traversal pipelines.
 *
 * @param value - The value to check
 * @param context - Description of where the check is (e.g. "BlobWriteTransform.apply()")
 */
export function assertStream(value: unknown, context: string): asserts value is AsyncIterable<unknown> {
  if (!isAsyncIterable(value)) {
    const actual = value === null ? "null"
      : Array.isArray(value) ? "Array"
      : typeof value;
    throw new TypeError(
      `${context} expected AsyncIterable but received ${actual}. ` +
      `Streams traverse, they do not materialize.`,
    );
  }
}

/**
 * Wraps a port method to guard its return value against accidental streams.
 * Use this to retrofit existing ports without modifying their interfaces.
 *
 * @param portName - Name of the port class (for error messages)
 * @param methodName - Name of the method being guarded
 * @param fn - The original method
 */
export function guardPortReturn<TArgs extends unknown[], TReturn>(
  portName: string,
  methodName: string,
  fn: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const result = await fn(...args);
    assertNotStream(result, `${portName}.${methodName}()`);
    return result;
  };
}
