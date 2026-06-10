// ---------------------------------------------------------------------------
// Minimal canonical CBOR (RFC 8949 core deterministic encoding) for the Echo
// wire envelope. Supports the JSON-shaped subset the witness needs: null,
// boolean, safe integers, text strings, arrays, and string-keyed maps with
// keys sorted by their encoded bytes. Floats and tags are out of scope.
// ---------------------------------------------------------------------------

export class CborCodecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CborCodecError";
  }
}

export type CborValue =
  | null
  | boolean
  | number
  | string
  | readonly CborValue[]
  | { readonly [key: string]: CborValue };

export function isCborArray(value: CborValue): value is readonly CborValue[] {
  return Array.isArray(value);
}

const UTF8_ENCODER = new TextEncoder();
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

const MAJOR_UNSIGNED = 0;
const MAJOR_NEGATIVE = 1;
const MAJOR_TEXT = 3;
const MAJOR_ARRAY = 4;
const MAJOR_MAP = 5;
const MAJOR_SIMPLE = 7;
const SIMPLE_FALSE = 20;
const SIMPLE_TRUE = 21;
const SIMPLE_NULL = 22;

function encodeHead(major: number, value: number): number[] {
  if (value < 24) {
    return [(major << 5) | value];
  }
  if (value < 0x100) {
    return [(major << 5) | 24, value];
  }
  if (value < 0x10000) {
    return [(major << 5) | 25, value >>> 8, value & 0xff];
  }
  if (value <= 0xffffffff) {
    return [
      (major << 5) | 26,
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    ];
  }
  throw new CborCodecError(`length ${String(value)} exceeds supported range`);
}

function encodeValue(value: CborValue, out: number[]): void {
  if (value === null) {
    out.push((MAJOR_SIMPLE << 5) | SIMPLE_NULL);
    return;
  }
  if (typeof value === "boolean") {
    out.push((MAJOR_SIMPLE << 5) | (value ? SIMPLE_TRUE : SIMPLE_FALSE));
    return;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new CborCodecError(`unsupported non-integer number: ${String(value)}`);
    }
    if (value >= 0) {
      out.push(...encodeHead(MAJOR_UNSIGNED, value));
    } else {
      out.push(...encodeHead(MAJOR_NEGATIVE, -value - 1));
    }
    return;
  }
  if (typeof value === "string") {
    const bytes = UTF8_ENCODER.encode(value);
    out.push(...encodeHead(MAJOR_TEXT, bytes.length), ...bytes);
    return;
  }
  if (isCborArray(value)) {
    out.push(...encodeHead(MAJOR_ARRAY, value.length));
    for (const item of value) {
      encodeValue(item, out);
    }
    return;
  }
  const entries = Object.entries(value).map(([key, item]) => {
    const keyBytes: number[] = [];
    encodeValue(key, keyBytes);
    return { keyBytes, item };
  });
  entries.sort((a, b) => {
    const min = Math.min(a.keyBytes.length, b.keyBytes.length);
    for (let i = 0; i < min; i += 1) {
      const delta = (a.keyBytes[i] ?? 0) - (b.keyBytes[i] ?? 0);
      if (delta !== 0) {
        return delta;
      }
    }
    return a.keyBytes.length - b.keyBytes.length;
  });
  out.push(...encodeHead(MAJOR_MAP, entries.length));
  for (const entry of entries) {
    out.push(...entry.keyBytes);
    encodeValue(entry.item, out);
  }
}

export function encodeCanonicalCbor(value: CborValue): Uint8Array {
  const out: number[] = [];
  encodeValue(value, out);
  return Uint8Array.from(out);
}

class CborReader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  private take(count: number): Uint8Array {
    if (this.offset + count > this.bytes.length) {
      throw new CborCodecError("unexpected end of CBOR input");
    }
    const slice = this.bytes.subarray(this.offset, this.offset + count);
    this.offset += count;
    return slice;
  }

  private readLength(additional: number): number {
    if (additional < 24) {
      return additional;
    }
    if (additional === 24) {
      return this.take(1)[0] ?? 0;
    }
    if (additional === 25) {
      const b = this.take(2);
      return ((b[0] ?? 0) << 8) | (b[1] ?? 0);
    }
    if (additional === 26) {
      const b = this.take(4);
      // Pure arithmetic: bitwise OR would coerce to signed 32-bit and turn
      // any length with the high bit set negative.
      return (
        (b[0] ?? 0) * 0x1000000 +
        (b[1] ?? 0) * 0x10000 +
        (b[2] ?? 0) * 0x100 +
        (b[3] ?? 0)
      );
    }
    throw new CborCodecError(`unsupported CBOR length encoding: ${String(additional)}`);
  }

  readValue(): CborValue {
    const initial = this.take(1)[0] ?? 0;
    const major = initial >> 5;
    const additional = initial & 0x1f;
    switch (major) {
      case MAJOR_UNSIGNED:
        return this.readLength(additional);
      case MAJOR_NEGATIVE:
        return -this.readLength(additional) - 1;
      case MAJOR_TEXT: {
        const length = this.readLength(additional);
        return UTF8_DECODER.decode(this.take(length));
      }
      case MAJOR_ARRAY: {
        const length = this.readLength(additional);
        const items: CborValue[] = [];
        for (let i = 0; i < length; i += 1) {
          items.push(this.readValue());
        }
        return items;
      }
      case MAJOR_MAP: {
        const length = this.readLength(additional);
        const result: Record<string, CborValue> = {};
        for (let i = 0; i < length; i += 1) {
          const key = this.readValue();
          if (typeof key !== "string") {
            throw new CborCodecError("only text map keys are supported");
          }
          result[key] = this.readValue();
        }
        return result;
      }
      case MAJOR_SIMPLE:
        if (additional === SIMPLE_FALSE) {
          return false;
        }
        if (additional === SIMPLE_TRUE) {
          return true;
        }
        if (additional === SIMPLE_NULL) {
          return null;
        }
        throw new CborCodecError(`unsupported CBOR simple value: ${String(additional)}`);
      default:
        throw new CborCodecError(`unsupported CBOR major type: ${String(major)}`);
    }
  }

  finished(): boolean {
    return this.offset === this.bytes.length;
  }
}

export function decodeCanonicalCbor(bytes: Uint8Array): CborValue {
  let reader: CborReader;
  let value: CborValue;
  try {
    reader = new CborReader(bytes);
    value = reader.readValue();
  } catch (error) {
    if (error instanceof CborCodecError) {
      throw error;
    }
    throw new CborCodecError(String(error));
  }
  if (!reader.finished()) {
    throw new CborCodecError("trailing bytes after CBOR value");
  }
  return value;
}
