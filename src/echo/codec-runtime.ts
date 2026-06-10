// SPDX-License-Identifier: Apache-2.0
// Minimal deterministic codec helpers — little-endian binary encoding.
//
// This is a method-for-method TypeScript mirror of echo-wasm-abi::codec (Rust).
// Wire layout is identical: same field order, same type widths, same endianness.
//
// Canonicalization contract for f32 (matches F32Scalar::new in warp-math):
//   NaN (any variant)  → 0x7fc00000 (positive quiet NaN)
//   subnormal          → +0.0  (0x00000000)
//   -0.0               → +0.0
//   all other values   pass through unchanged

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

const INITIAL_CAPACITY = 256;
const U8_MAX = 0xff;
const U16_MAX = 0xffff;
const U32_MAX = 0xffffffff;
const I32_MIN = -0x80000000;
const I32_MAX = 0x7fffffff;

function assertUint(name: string, v: number, max: number): void {
    if (!Number.isInteger(v) || v < 0 || v > max) {
        throw new CodecError(`${name} ${String(v)} is out of range`);
    }
}

function assertInt32(v: number): void {
    if (!Number.isInteger(v) || v < I32_MIN || v > I32_MAX) {
        throw new CodecError(`i32 ${String(v)} is out of range`);
    }
}

export class Writer {
    private buf: Uint8Array;
    private view: DataView;
    private pos: number;

    constructor() {
        this.buf = new Uint8Array(INITIAL_CAPACITY);
        this.view = new DataView(this.buf.buffer);
        this.pos = 0;
    }

    private reserve(n: number): void {
        const needed = this.pos + n;
        if (needed <= this.buf.length) return;
        let next = this.buf.length * 2;
        while (next < needed) next *= 2;
        const grown = new Uint8Array(next);
        grown.set(this.buf);
        this.buf = grown;
        this.view = new DataView(this.buf.buffer);
    }

    writeBytes(bytes: Uint8Array): void {
        this.reserve(bytes.length);
        this.buf.set(bytes, this.pos);
        this.pos += bytes.length;
    }

    writeU8(v: number): void {
        assertUint('u8', v, U8_MAX);
        this.reserve(1);
        this.buf[this.pos] = v;
        this.pos += 1;
    }

    writeU16Le(v: number): void {
        assertUint('u16', v, U16_MAX);
        this.reserve(2);
        this.view.setUint16(this.pos, v, /* littleEndian */ true);
        this.pos += 2;
    }

    writeU32Le(v: number): void {
        assertUint('u32', v, U32_MAX);
        this.reserve(4);
        this.view.setUint32(this.pos, v, /* littleEndian */ true);
        this.pos += 4;
    }

    writeI32Le(v: number): void {
        assertInt32(v);
        this.reserve(4);
        this.view.setInt32(this.pos, v, /* littleEndian */ true);
        this.pos += 4;
    }

    /**
     * Canonicalize `v` identically to `F32Scalar::new()` / `canonicalize_f32()`
     * in Rust, then write 4 bytes LE.
     *
     * Caller contract: `v` must already be an exact f32-representable value.
     * Do not feed f64 intermediate results into this method.
     */
    writeF32Le(v: number): void {
        this.reserve(4);
        this.view.setFloat32(this.pos, canonicalizeF32(v), /* littleEndian */ true);
        this.pos += 4;
    }

    /**
     * 1 byte: 0x00 = false, 0x01 = true. Takes the literal byte value
     * directly rather than a `boolean` because the quality gate forbids
     * boolean parameters (no flag-shaped function signatures). Callers
     * with a runtime `boolean` should write `w.writeBool(v ? 1 : 0)`.
     */
    writeBool(v: 0 | 1): void {
        this.writeU8(v);
    }

    /**
     * Write a length-prefixed UTF-8 string (u32 LE length + bytes, no null
     * terminator). Caller must ensure the string is NFC-normalized before
     * encoding if cross-platform digest stability is required.
     */
    writeString(v: string): void {
        const bytes = new TextEncoder().encode(v);
        this.writeU32Le(bytes.length);
        this.writeBytes(bytes);
    }

    /** Presence tag (0x00 = null) + encoded payload when present. */
    writeOption<T>(v: T | null, encode: (w: Writer, v: T) => void): void {
        if (v === null) {
            this.writeU8(0x00);
        } else {
            this.writeU8(0x01);
            encode(this, v);
        }
    }

    /** u32 LE element count + each element encoded inline. */
    writeList<T>(vs: readonly T[], encode: (w: Writer, v: T) => void): void {
        this.writeU32Le(vs.length);
        for (const v of vs) {
            encode(this, v);
        }
    }

    finish(): Uint8Array {
        return this.buf.slice(0, this.pos);
    }
}

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------

export class CodecError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CodecError';
    }
}

export class Reader {
    private readonly view: DataView;
    private pos: number;

    constructor(bytes: Uint8Array) {
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        this.pos = 0;
    }

    /** Number of bytes left to consume from the underlying buffer. */
    remaining(): number {
        return this.view.byteLength - this.pos;
    }

    private take(n: number): number {
        const start = this.pos;
        if (start + n > this.view.byteLength) {
            throw new CodecError('buffer too short');
        }
        this.pos += n;
        return start;
    }

    readU8(): number {
        const at = this.take(1);
        return this.view.getUint8(at);
    }

    readU16Le(): number {
        const at = this.take(2);
        return this.view.getUint16(at, /* littleEndian */ true);
    }

    readU32Le(): number {
        const at = this.take(4);
        return this.view.getUint32(at, /* littleEndian */ true);
    }

    readI32Le(): number {
        const at = this.take(4);
        return this.view.getInt32(at, /* littleEndian */ true);
    }

    readF32Le(): number {
        const at = this.take(4);
        return this.view.getFloat32(at, /* littleEndian */ true);
    }

    readBool(): boolean {
        const tag = this.readU8();
        if (tag === 0x00) return false;
        if (tag === 0x01) return true;
        throw new CodecError(`invalid bool tag: 0x${tag.toString(16).padStart(2, '0')}`);
    }

    readString(): string {
        const len = this.readU32Le();
        const at = this.take(len);
        const slice = new Uint8Array(
            this.view.buffer,
            this.view.byteOffset + at,
            len,
        );
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(slice);
        } catch {
            throw new CodecError('invalid utf-8');
        }
    }

    readOption<T>(decode: (r: Reader) => T): T | null {
        const tag = this.readU8();
        if (tag === 0x00) return null;
        if (tag === 0x01) return decode(this);
        throw new CodecError(`invalid option tag: 0x${tag.toString(16).padStart(2, '0')}`);
    }

    readList<T>(decode: (r: Reader) => T): T[] {
        const count = this.readU32Le();
        const out: T[] = [];
        for (let i = 0; i < count; i++) {
            out.push(decode(this));
        }
        return out;
    }
}

// ---------------------------------------------------------------------------
// F32 canonicalization
// ---------------------------------------------------------------------------

// Shared DataView for bit-manipulation of f32 values.
const _f32Buf = new ArrayBuffer(4);
const _f32View = new DataView(_f32Buf);

/** Canonical quiet-NaN bit pattern (matches `F32Scalar` in warp-math). */
const F32_CANONICAL_NAN_BITS = 0x7fc0_0000;

/**
 * Canonicalize a number as an f32, matching `canonicalize_f32()` in Rust.
 *
 * - NaN (any) → 0x7fc00000 (positive quiet NaN)
 * - subnormal → +0.0
 * - -0.0 → +0.0
 * - all other values pass through unchanged
 *
 * JavaScript has no f32 type. This function reads the float32 bit pattern
 * written by `DataView.setFloat32` (which narrows the f64 to the nearest f32),
 * then applies the canonicalization rules above.
 */
export function canonicalizeF32(v: number): number {
    // Write as f32 to capture the narrowed bit pattern.
    _f32View.setFloat32(0, v, /* littleEndian */ false);
    const bits = _f32View.getUint32(0, /* littleEndian */ false);

    const exponent = (bits >>> 23) & 0xff;
    const mantissa = bits & 0x007f_ffff;

    // NaN: exponent all-1s, mantissa non-zero.
    if (exponent === 0xff && mantissa !== 0) {
        _f32View.setUint32(0, F32_CANONICAL_NAN_BITS, /* littleEndian */ false);
        return _f32View.getFloat32(0, /* littleEndian */ false);
    }

    // Subnormal: exponent zero, mantissa non-zero. → +0.0
    if (exponent === 0 && mantissa !== 0) {
        return 0;
    }

    // -0.0: sign bit set, exponent zero, mantissa zero. → +0.0
    if (bits === 0x8000_0000) {
        return 0;
    }

    // All other values (normal, ±Infinity, +0.0) pass through.
    return _f32View.getFloat32(0, /* littleEndian */ false);
}
