// ---------------------------------------------------------------------------
// JsonCodec port — hexagonal boundary for JSON serialization
// ---------------------------------------------------------------------------

/**
 * Portable JSON codec interface. Core logic imports this port, not
 * JSON.stringify/JSON.parse directly. Implementations control key
 * ordering, whitespace, and determinism.
 */
export interface JsonCodec {
  encode(value: unknown): string;
  decode(data: string): unknown;
}
