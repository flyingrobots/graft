const SYM_ID_PREFIX = "sym:";

export interface SymIdParts {
  readonly filePath: string;
  readonly symbolPath: string;
}

export const SymIdCodec = Object.freeze({
  encode(filePath: string, symbolPath: string): string {
    return `${SYM_ID_PREFIX}${filePath}:${symbolPath}`;
  },

  decode(symId: string): SymIdParts | null {
    if (!symId.startsWith(SYM_ID_PREFIX)) {
      return null;
    }
    const body = symId.slice(SYM_ID_PREFIX.length);
    const separator = body.lastIndexOf(":");
    if (separator < 0) {
      return null;
    }
    return {
      filePath: body.slice(0, separator),
      symbolPath: body.slice(separator + 1),
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
});
