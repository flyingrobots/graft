// Pure canonical JSON + SHA-256 review digests for application-layer contracts.

type ReviewJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly ReviewJsonValue[]
  | { readonly [key: string]: ReviewJsonValue };

export function canonicalJsonSha256Review(domain: string, value: unknown): string {
  return `sha256:${sha256Utf8Hex(canonicalJsonEncode([domain, value]))}`;
}

function canonicalJsonEncode(value: unknown): string {
  return JSON.stringify(normalizeCanonicalJson(value));
}

function normalizeCanonicalJson(value: unknown, seen = new WeakSet()): ReviewJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON input must contain only finite numbers");
    }
    return value;
  }
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  ) {
    throw new TypeError("Canonical JSON input must be JSON data");
  }

  if (seen.has(value)) {
    throw new TypeError("Canonical JSON input must not contain circular data");
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const output: ReviewJsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw new TypeError("Canonical JSON input arrays must not contain holes");
        }
        output.push(normalizeCanonicalJson(value[index], seen));
      }
      return output;
    }
    const proto = Object.getPrototypeOf(value) as unknown;
    if (proto !== Object.prototype && proto !== null) {
      throw new TypeError("Canonical JSON input must contain only plain objects");
    }
    const record = value as Record<string, unknown>;
    const sorted = Object.create(null) as Record<string, ReviewJsonValue>;
    for (const key of Object.keys(record).sort()) {
      const item = record[key];
      if (item === undefined) {
        throw new TypeError("Canonical JSON input object fields must not be undefined");
      }
      Object.defineProperty(sorted, key, {
        enumerable: true,
        value: normalizeCanonicalJson(item, seen),
      });
    }
    return sorted;
  } finally {
    seen.delete(value);
  }
}

const SHA256_K = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256Utf8Hex(input: string): string {
  const source = new TextEncoder().encode(input);
  let paddedLength = source.length + 1 + 8;
  while (paddedLength % 64 !== 0) {
    paddedLength += 1;
  }

  const padded = new Uint8Array(paddedLength);
  padded.set(source);
  padded[source.length] = 0x80;
  new DataView(padded.buffer).setBigUint64(paddedLength - 8, BigInt(source.length) * 8n, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const words = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const byteOffset = offset + index * 4;
      words[index] = (
        ((padded[byteOffset] ?? 0) << 24) |
        ((padded[byteOffset + 1] ?? 0) << 16) |
        ((padded[byteOffset + 2] ?? 0) << 8) |
        (padded[byteOffset + 3] ?? 0)
      ) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const w15 = words[index - 15] ?? 0;
      const w2 = words[index - 2] ?? 0;
      const s0 = rotateRight(w15, 7) ^ rotateRight(w15, 18) ^ (w15 >>> 3);
      const s1 = rotateRight(w2, 17) ^ rotateRight(w2, 19) ^ (w2 >>> 10);
      words[index] = ((words[index - 16] ?? 0) + s0 + (words[index - 7] ?? 0) + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + (SHA256_K[index] ?? 0) + (words[index] ?? 0)) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
}

function rotateRight(value: number, bits: number): number {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}
