const SYM_ID_PREFIX = "sym:";

export interface SymIdParts {
  readonly filePath: string;
  readonly symbolPath: string;
}

function encodeSegment(segment: string): string {
  return segment.replace(/%/gu, "%25").replace(/:/gu, "%3A");
}

function decodeSegment(segment: string): string {
  return segment.replace(/%3A/giu, ":").replace(/%25/gu, "%");
}

export const SymIdCodec = Object.freeze({
  encode(filePath: string, symbolPath: string): string {
    return `${SYM_ID_PREFIX}${encodeSegment(filePath)}:${encodeSegment(symbolPath)}`;
  },

  decode(symId: string): SymIdParts | null {
    if (!symId.startsWith(SYM_ID_PREFIX)) {
      return null;
    }
    const body = symId.slice(SYM_ID_PREFIX.length);
    const separator = body.lastIndexOf(":");
    if (separator <= 0 || separator === body.length - 1) {
      return null;
    }
    const filePath = decodeSegment(body.slice(0, separator));
    const symbolPath = decodeSegment(body.slice(separator + 1));
    if (filePath.length === 0 || symbolPath.length === 0) {
      return null;
    }
    return {
      filePath,
      symbolPath,
    };
  },

  filePath(symId: string): string | null {
    return this.decode(symId)?.filePath ?? null;
  },

  isSymId(symId: string): boolean {
    return this.decode(symId) !== null;
  },

  isForFile(symId: string, filePath: string): boolean {
    return this.filePath(symId) === filePath;
  },

  filePattern(filePath: string): string {
    return `${SYM_ID_PREFIX}${encodeSegment(filePath)}:*`;
  },

  symbolNamePattern(symbolName: string): string {
    return `${SYM_ID_PREFIX}*:${encodeSegment(symbolName)}`;
  },
});
